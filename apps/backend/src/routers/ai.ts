import { Router, Response } from 'express';
import { openActionStream, iterContentDeltas } from '../services/aiService.js';
import { getResourceContext } from '../services/resourceService.js';
import { getStyleExamples } from '../services/settingsService.js';

const router = Router();

async function handleStream(
  res: Response,
  action: string,
  text: string,
  styleExamples?: string[],
  workspaceId?: string | null,
  noteId?: string | null
): Promise<void> {
  if (!text || !text.trim()) {
    res.status(422).json({ detail: 'Text cannot be empty' });
    return;
  }

  let resourceContext = '';
  if (workspaceId && noteId) {
    try {
      resourceContext = getResourceContext(workspaceId, noteId);
    } catch (e) {
      console.warn(`[backend] Failed to load resource context for ${workspaceId}/${noteId}:`, e);
    }
  }

  try {
    const response = await openActionStream(action, text, styleExamples, resourceContext);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const delta of iterContentDeltas(response)) {
      res.write(delta);
    }
    res.end();
  } catch (err: any) {
    if (err.message === 'MISTRAL_NOT_CONFIGURED') {
      res.status(422).json({ detail: 'No Mistral API key configured' });
      return;
    }
    if (err.message === 'MISTRAL_RATE_LIMIT') {
      res.status(429).json({ detail: 'Mistral API rate limit exceeded' });
      return;
    }
    if (err.message && err.message.startsWith('MISTRAL_API_ERROR')) {
      res.status(502).json({ detail: err.message });
      return;
    }
    console.error(`[backend] Error streaming AI action ${action}:`, err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

router.post('/ai/summarize', async (req, res) => {
  await handleStream(
    res,
    'summarize',
    req.body.text,
    undefined,
    req.body.workspace_id,
    req.body.note_id
  );
});

router.post('/ai/explain', async (req, res) => {
  await handleStream(
    res,
    'explain',
    req.body.text,
    undefined,
    req.body.workspace_id,
    req.body.note_id
  );
});

router.post('/ai/key-points', async (req, res) => {
  await handleStream(
    res,
    'key-points',
    req.body.text,
    undefined,
    req.body.workspace_id,
    req.body.note_id
  );
});

router.post('/ai/questions', async (req, res) => {
  await handleStream(
    res,
    'questions',
    req.body.text,
    undefined,
    req.body.workspace_id,
    req.body.note_id
  );
});

router.post('/ai/flashcards', async (req, res) => {
  await handleStream(
    res,
    'flashcards',
    req.body.text,
    undefined,
    req.body.workspace_id,
    req.body.note_id
  );
});

router.post('/ai/checklist', async (req, res) => {
  await handleStream(
    res,
    'checklist',
    req.body.text,
    undefined,
    req.body.workspace_id,
    req.body.note_id
  );
});

router.post('/ai/table', async (req, res) => {
  await handleStream(
    res,
    'table',
    req.body.text,
    undefined,
    req.body.workspace_id,
    req.body.note_id
  );
});

router.post('/ai/rewrite', async (req, res) => {
  await handleStream(
    res,
    req.body.mode, // expand, shorten, examples, format
    req.body.text,
    undefined,
    req.body.workspace_id,
    req.body.note_id
  );
});

router.post('/ai/style', async (req, res) => {
  const styleExamples = getStyleExamples();
  await handleStream(
    res,
    'style',
    req.body.text,
    styleExamples,
    req.body.workspace_id,
    req.body.note_id
  );
});

export default router;
