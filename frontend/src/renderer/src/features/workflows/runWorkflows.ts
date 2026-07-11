import { getNote, updateNoteContent } from '../notes/api'
import { streamAiAction, streamAiRewrite, isRewriteMode } from '../ai/api'
import type { AiAction } from '../ai/api'
import type { Workflow, WorkflowTrigger } from '../settings/types'

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

const ACTION_LABELS: Record<string, string> = Object.fromEntries(
  WORKFLOW_ACTIONS.map((a) => [a.id, a.label])
)

interface RunWorkflowsContext {
  workspaceId: string
  noteId: string
  content: string
}

// Automates what the quick-capture AI buttons in App.tsx already do
// manually: run the action, append the result, persist it, and sync any
// open editor via the same `note:content-updated` event.
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
  return resultText
}

// Chains the workflow's actions like n8n: each step's output becomes the
// next step's input, and only the final step's result gets appended to the
// note (matching a single-action workflow's existing append behavior).
export async function runWorkflow(workflow: Workflow, context: RunWorkflowsContext): Promise<void> {
  const noteContext = { workspaceId: context.workspaceId, noteId: context.noteId }

  let stepInput = context.content
  for (const action of workflow.actions) {
    stepInput = await runSingleAction(action, stepInput, noteContext)
  }
  const finalResult = stepInput

  const detail = await getNote(context.workspaceId, context.noteId)
  const chainLabel = workflow.actions.map((a) => ACTION_LABELS[a] ?? a).join(' → ')
  const separator = detail.content.endsWith('\n') || detail.content === '' ? '' : '\n\n'
  const updated = `${detail.content}${separator}**${chainLabel} (${workflow.name}):**\n${finalResult}\n`
  await updateNoteContent(context.workspaceId, context.noteId, updated)

  window.dispatchEvent(
    new CustomEvent('note:content-updated', {
      detail: { noteId: context.noteId, content: updated }
    })
  )
}
