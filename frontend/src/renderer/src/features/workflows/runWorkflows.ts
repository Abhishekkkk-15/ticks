import { getNote, updateNoteContent } from '../notes/api'
import { streamAiAction, streamAiRewrite, isRewriteMode, stripMarkdownWrappers } from '../ai/api'
import type { AiAction } from '../ai/api'
import type { Workflow, WorkflowOutputMode, WorkflowScope, WorkflowTrigger } from '../settings/types'

export const WORKFLOW_ACTIONS: { id: string; label: string }[] = [
  { id: 'summarize', label: 'Summarize' },
  { id: 'explain', label: 'Explain simply' },
  { id: 'key-points', label: 'Key points' },
  { id: 'questions', label: 'Quiz questions' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'checklist', label: 'To checklist' },
  { id: 'table', label: 'To table' },
  { id: 'expand', label: 'Expand' },
  { id: 'shorten', label: 'Shorten' },
  { id: 'examples', label: 'Add examples' },
  { id: 'style', label: 'Rewrite in my style' },
  { id: 'format', label: 'Format with AI' }
]

export const WORKFLOW_SCOPE_LABELS: Record<WorkflowScope, string> = {
  full_note: 'Entire note',
  selection: 'Selected text (fallback: full note)',
  clipboard: 'Copied / pasted text',
  new_text: 'New text only (since last run)'
}

export const WORKFLOW_OUTPUT_MODE_LABELS: Record<WorkflowOutputMode, string> = {
  append: 'Append to note',
  replace: 'Replace note content',
  review: 'Review before applying'
}

// Default scopes that make sense per trigger — used to pre-fill the UI picker.
export const DEFAULT_SCOPE_FOR_TRIGGER: Record<WorkflowTrigger, WorkflowScope> = {
  on_save: 'new_text',
  shortcut: 'selection',
  on_copy: 'clipboard',
  on_paste: 'clipboard'
}

const ACTION_LABELS: Record<string, string> = Object.fromEntries(
  WORKFLOW_ACTIONS.map((a) => [a.id, a.label])
)

interface RunWorkflowsContext {
  workspaceId: string
  noteId: string
  /** Full current note content — always required. */
  content: string
  /** Text the user has highlighted in the editor (may be empty string). */
  selectedText?: string
  /** Text that was just copied or pasted (only set for on_copy/on_paste). */
  clipboardText?: string
}

/** Payload sent with the workflow:review-pending event. */
export interface WorkflowReviewPayload {
  workflowId: string
  workflowName: string
  chainLabel: string
  noteId: string
  workspaceId: string
  /** The AI-generated result text. */
  result: string
  /** The note content at the moment the workflow ran (to build diffs against). */
  originalContent: string
}

/**
 * localStorage key for the per-workflow-per-note content snapshot.
 * Stored after each successful run so the next run can diff against it.
 */
function snapshotKey(workflowId: string, noteId: string): string {
  return `workflow-snapshot:${workflowId}:${noteId}`
}

/**
 * Extract the text that was appended/added after the common prefix.
 * Simple and fast for the typical note-taking pattern of writing at the end.
 * Falls back to the full content if nothing has been added.
 */
function extractNewText(previous: string, current: string): string {
  if (!previous) return current // first run
  let i = 0
  const minLen = Math.min(previous.length, current.length)
  while (i < minLen && previous[i] === current[i]) i++
  const added = current.slice(i).trim()
  return added || current // fallback: nothing new → full note
}

/**
 * Resolve the actual text to feed into the workflow based on its scope.
 * Falls back gracefully so there's always something to send to the AI.
 */
function resolveInput(workflow: Workflow, ctx: RunWorkflowsContext): string {
  switch (workflow.scope) {
    case 'selection':
      return ctx.selectedText?.trim() ? ctx.selectedText : ctx.content
    case 'clipboard':
      return ctx.clipboardText?.trim() ? ctx.clipboardText : ctx.content
    case 'new_text': {
      const prev = localStorage.getItem(snapshotKey(workflow.id, ctx.noteId)) ?? ''
      return extractNewText(prev, ctx.content)
    }
    case 'full_note':
    default:
      return ctx.content
  }
}

/** Persist content to the note and fire the sync event for open editors. */
async function commitToNote(
  workspaceId: string,
  noteId: string,
  updatedContent: string
): Promise<void> {
  await updateNoteContent(workspaceId, noteId, updatedContent)
  window.dispatchEvent(
    new CustomEvent('note:content-updated', {
      detail: { noteId, content: updatedContent }
    })
  )
}

export async function runWorkflows(
  trigger: WorkflowTrigger,
  workflows: Workflow[],
  context: RunWorkflowsContext
): Promise<void> {
  const matches = workflows.filter((w) => w.trigger === trigger)
  for (const workflow of matches) {
    await runWorkflow(workflow, context)
  }
}

async function runSingleAction(
  action: string,
  text: string,
  noteContext: { workspaceId: string; noteId: string }
): Promise<string> {
  let resultText = ''
  const onChunk = (chunk: string): void => {
    resultText += chunk
  }
  if (isRewriteMode(action)) {
    await streamAiRewrite(text, action, onChunk, undefined, noteContext)
  } else {
    await streamAiAction(action as AiAction, text, onChunk, undefined, noteContext)
  }
  return stripMarkdownWrappers(resultText)
}

// Chains the workflow's actions like n8n: each step's output becomes the
// next step's input, and only the final step's result is applied to the note.
export async function runWorkflow(workflow: Workflow, context: RunWorkflowsContext): Promise<void> {
  const noteContext = { workspaceId: context.workspaceId, noteId: context.noteId }

  // Pick what text to send to the AI based on the workflow's scope setting.
  const initialInput = resolveInput(workflow, context)

  let stepInput = initialInput
  for (const action of workflow.actions) {
    stepInput = await runSingleAction(action, stepInput, noteContext)
  }
  const finalResult = stepInput

  const chainLabel = workflow.actions.map((a) => ACTION_LABELS[a] ?? a).join(' → ')
  const outputMode: WorkflowOutputMode = workflow.output_mode ?? 'append'

  if (outputMode === 'review') {
    // Don't write anything — fire an event for the NoteEditor to show the review panel.
    window.dispatchEvent(
      new CustomEvent<WorkflowReviewPayload>('workflow:review-pending', {
        detail: {
          workflowId: workflow.id,
          workflowName: workflow.name,
          chainLabel,
          noteId: context.noteId,
          workspaceId: context.workspaceId,
          result: finalResult,
          originalContent: context.content
        }
      })
    )
    return
  }

  // Build the updated note content for append / replace modes.
  const detail = await getNote(context.workspaceId, context.noteId)
  const scopeNote =
    workflow.scope === 'selection' && context.selectedText?.trim()
      ? ' [selection]'
      : workflow.scope === 'clipboard' && context.clipboardText?.trim()
        ? ' [clipboard]'
        : workflow.scope === 'new_text'
          ? ' [new text]'
          : ''

  let updated: string
  if (outputMode === 'replace') {
    updated = finalResult.endsWith('\n') ? finalResult : finalResult + '\n'
  } else {
    // append (default)
    const separator = detail.content.endsWith('\n') || detail.content === '' ? '' : '\n\n'
    updated = `${detail.content}${separator}**${chainLabel}${scopeNote} (${workflow.name}):**\n${finalResult}\n`
  }

  await commitToNote(context.workspaceId, context.noteId, updated)

  // Snapshot the current content so the next new_text run can diff against it.
  if (workflow.scope === 'new_text') {
    localStorage.setItem(snapshotKey(workflow.id, context.noteId), updated)
  }
}
