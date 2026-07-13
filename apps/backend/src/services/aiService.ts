import { getMistralApiKey } from './settingsService.js';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MODEL = 'mistral-small-latest';

const FAITHFULNESS_RULE =
  'Stay strictly faithful to the source text. Never invent facts, names, ' +
  "numbers, or claims that aren't in it. If something is ambiguous or " +
  'missing, say so instead of guessing.';

const SYSTEM_CONTEXT =
  'You are the AI companion inside Ticks, a modern, local-first markdown ' +
  'note-taking and knowledge management desktop application. Ticks helps users learn ' +
  'from docs, blogs, PDFs, and technical articles by letting them capture text, organize ' +
  'material, and use AI utilities to edit and process notes.';

export const PROMPTS: Record<string, string> = {
  summarize: `Summarize the following text concisely. ${FAITHFULNESS_RULE}`,
  explain: `Explain the following text in simple, plain terms, as if to someone new to the subject. ${FAITHFULNESS_RULE}`,
  'key-points': `Extract the key points from the following text as a concise Markdown bulleted list. ${FAITHFULNESS_RULE}`,
  questions: `Write quiz questions (no answers) that test understanding of the following text, as a Markdown numbered list. ${FAITHFULNESS_RULE}`,
  flashcards: `Turn the following text into flashcards. Format each as 'Q: ...' then 'A: ...' on the next line, separated by blank lines. ${FAITHFULNESS_RULE}`,
  checklist: `Convert the following text into an actionable Markdown checklist (\`- [ ] ...\` items). ${FAITHFULNESS_RULE}`,
  table: `Convert the following text into a Markdown table with sensible columns for its content. ${FAITHFULNESS_RULE}`,
  expand: `Expand the following text with more detail and explanation, without changing its meaning. ${FAITHFULNESS_RULE}`,
  shorten: `Shorten the following text as much as possible while preserving its full meaning. ${FAITHFULNESS_RULE}`,
  examples: `Add concrete, illustrative examples to the following text. ${FAITHFULNESS_RULE}`,
  'process-resource': `Summarize the following external source material faithfully, preserving its key facts and structure so it can be referenced later. ${FAITHFULNESS_RULE}`,
  format: `Reformat the following text as a clean, beautiful Markdown document. Add appropriate Markdown elements such as headers, bold text, lists, task lists, and code blocks to structure it nicely. Do not summarize or expand it. Do not change the meaning. Do not include any introductory or concluding remarks. Return ONLY the reformatted Markdown content.`
};

export const REWRITE_MODES = new Set(['expand', 'shorten', 'examples', 'format']);

function stylePrompt(styleExamples: string[]): string {
  if (!styleExamples || styleExamples.length === 0) {
    return `Rewrite the following text to improve clarity and flow. ${FAITHFULNESS_RULE}`;
  }
  const examplesBlock = styleExamples.map((ex, i) => `Example ${i + 1}:\n${ex}`).join('\n\n');
  return (
    'Rewrite the following text to match the writing style demonstrated ' +
    `in these examples from the user (tone, sentence length, phrasing):\n\n` +
    `${examplesBlock}\n\n` +
    `Only match the *style* — do not copy their content. ${FAITHFULNESS_RULE}`
  );
}

function resolvePrompt(action: string, styleExamples?: string[]): string {
  let prompt = '';
  if (action === 'style') {
    prompt = stylePrompt(styleExamples || []);
  } else if (action in PROMPTS) {
    prompt = PROMPTS[action];
  } else {
    throw new Error(`Unknown AI action: ${action}`);
  }
  return `${SYSTEM_CONTEXT}\n\nTask:\n${prompt}`;
}

export async function openActionStream(
  action: string,
  text: string,
  styleExamples?: string[],
  resourceContext?: string
): Promise<Response> {
  const apiKey = getMistralApiKey();
  if (!apiKey) {
    throw new Error('MISTRAL_NOT_CONFIGURED');
  }

  let systemPrompt = resolvePrompt(action, styleExamples);
  let userContent = text;
  if (resourceContext) {
    systemPrompt =
      `${systemPrompt} The user has attached reference material below for additional context ` +
      'and accuracy — use it to inform your answer where relevant, but perform the task only ' +
      'on the primary text, not on the reference material itself.';
    userContent = `Primary text:\n${text}\n\n---\nAttached reference material (context only):\n${resourceContext}`;
  }

  const response = await fetch(MISTRAL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      stream: true
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 429) {
      throw new Error('MISTRAL_RATE_LIMIT');
    }
    throw new Error(`MISTRAL_API_ERROR: ${response.status} - ${errorBody}`);
  }

  return response;
}

export async function* iterContentDeltas(response: Response): AsyncGenerator<string> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6).trim();
        if (payload === '[DONE]') break;
        try {
          const chunk = JSON.parse(payload);
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            yield delta;
          }
        } catch (e) {
          // Ignore parse errors on partial or invalid chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function runAction(action: string, text: string, styleExamples?: string[]): Promise<string> {
  const response = await openActionStream(action, text, styleExamples);
  let result = '';
  for await (const chunk of iterContentDeltas(response)) {
    result += chunk;
  }
  return result;
}
