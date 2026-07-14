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
  on_capture: 'clipboard',
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
  /** Range of the selected text in the document. */
  selectionRange?: { from: number; to: number } | null
  /** Text that was just captured or pasted (only set for on_capture/on_paste). */
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
  selectionRange?: { from: number; to: number } | null
}


/**
 * localStorage key for the per-workflow-per-note content snapshot.
 * Stored after each successful run so the next run can diff against it.
 */
function snapshotKey(workflowId: string, noteId: string): string {
  return `workflow-snapshot:${workflowId}:${noteId}`
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
  for (const w of matches) {
    // Override scope based purely on trigger to simplify user experience
    const effectiveScope =
      w.trigger === 'on_save' ? 'new_text' :
      w.trigger === 'shortcut' ? 'selection' :
      (w.trigger === 'on_capture' || w.trigger === 'on_paste') ? 'clipboard' :
      w.scope

    let inputText = ''
    if (effectiveScope === 'new_text') {
      const lastSnapshot = localStorage.getItem(snapshotKey(w.id, context.noteId)) || ''
      if (lastSnapshot.length > 0 && context.content.startsWith(lastSnapshot)) {
        inputText = context.content.slice(lastSnapshot.length)
      } else {
        inputText = context.content
      }
    } else if (effectiveScope === 'selection') {
      inputText = context.selectedText && context.selectedText.length > 0 ? context.selectedText : context.content
    } else if (effectiveScope === 'clipboard') {
      inputText = context.clipboardText || ''
    } else {
      inputText = context.content
    }

    if (!inputText.trim()) {
      console.warn(`[Workflows] Skipping ${w.name}: no input text available for scope ${effectiveScope}.`)
      continue
    }

    try {
      await processWorkflow(w, inputText, context, effectiveScope)
    } catch (err) {
      console.error(err)
    }
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
export async function processWorkflow(
  workflow: Workflow,
  inputText: string,
  context: RunWorkflowsContext,
  effectiveScope: string
): Promise<void> {
  const noteContext = { workspaceId: context.workspaceId, noteId: context.noteId }

  let stepInput = inputText
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
  
  let baseContent = detail.content
  if (effectiveScope === 'clipboard' && context.clipboardText && !baseContent.includes(context.clipboardText)) {
    // If the DB is stale and hasn't saved the appended capture text yet, 
    // fall back to the in-memory content which we know has it.
    baseContent = context.content
  }

  const scopeNote =
    effectiveScope === 'selection' && context.selectedText?.trim()
      ? ' [selection]'
      : effectiveScope === 'clipboard' && context.clipboardText?.trim()
        ? ' [clipboard]'
        : effectiveScope === 'new_text'
          ? ' [new text]'
          : ''

  let updated: string
  if (outputMode === 'replace') {
    if (effectiveScope === 'selection' && context.selectionRange) {
      // Replace just the selection
      updated =
        baseContent.slice(0, context.selectionRange.from) +
        finalResult +
        baseContent.slice(context.selectionRange.to)
    } else if (effectiveScope === 'clipboard' && context.clipboardText) {
      // Replace the last occurrence of the clipboard text (which we just appended)
      const lastIndex = baseContent.lastIndexOf(context.clipboardText)
      if (lastIndex !== -1) {
        // Also try to replace the `> ` if it was a capture format
        const textToReplace = workflow.trigger === 'on_capture' ? `> ${context.clipboardText}\n` : context.clipboardText
        const formatIndex = baseContent.lastIndexOf(textToReplace)
        
        if (formatIndex !== -1) {
          updated =
            baseContent.slice(0, formatIndex) +
            finalResult +
            baseContent.slice(formatIndex + textToReplace.length)
        } else {
          updated =
            baseContent.slice(0, lastIndex) +
            finalResult +
            baseContent.slice(lastIndex + context.clipboardText.length)
        }
      } else {
        // Fallback if not found for some reason
        updated = finalResult.endsWith('\n') ? finalResult : finalResult + '\n'
      }
    } else {
      // Full note replacement (e.g. on_save / full_note)
      updated = finalResult.endsWith('\n') ? finalResult : finalResult + '\n'
    }
  } else {
    // append (default)
    const separator = baseContent.endsWith('\n') || baseContent === '' ? '' : '\n\n'
    updated = `${baseContent}${separator}**${chainLabel}${scopeNote} (${workflow.name}):**\n${finalResult}\n`
  }

  await commitToNote(context.workspaceId, context.noteId, updated)

  // Snapshot the current content so the next new_text run can diff against it.
  if (effectiveScope === 'new_text') {
    localStorage.setItem(snapshotKey(workflow.id, context.noteId), updated)
  }
}

export async function runDirectAiAction(
  actionId: string,
  actionLabel: string,
  text: string,
  context: {
    workspaceId: string
    noteId: string
    selectionRange?: { from: number; to: number } | null
  }
): Promise<void> {
  const noteContext = { workspaceId: context.workspaceId, noteId: context.noteId }

  let resultText = ''
  const onChunk = (chunk: string): void => {
    resultText += chunk
  }
  if (isRewriteMode(actionId)) {
    await streamAiRewrite(text, actionId, onChunk, undefined, noteContext)
  } else {
    await streamAiAction(actionId as AiAction, text, onChunk, undefined, noteContext)
  }

  const finalResult = stripMarkdownWrappers(resultText)

  // Trigger Review Panel
  window.dispatchEvent(
    new CustomEvent<WorkflowReviewPayload>('workflow:review-pending', {
      detail: {
        workflowId: `direct-${actionId}`,
        workflowName: actionLabel,
        chainLabel: actionLabel,
        noteId: context.noteId,
        workspaceId: context.workspaceId,
        result: finalResult,
        originalContent: text,
        selectionRange: context.selectionRange
      }
    })
  )
}

