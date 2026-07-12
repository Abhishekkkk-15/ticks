import { Router } from 'express';
import {
  listDrawings,
  getDrawing,
  createDrawing,
  saveScene,
  renameDrawing,
  deleteDrawing
} from '../services/drawingService.js';

const router = Router();

// --- Note-scoped drawings ---

router.get('/workspaces/:workspace_id/notes/:note_id/drawings', (req, res, next) => {
  try {
    const drawings = listDrawings(req.params.workspace_id, req.params.note_id);
    res.json(drawings);
  } catch (err) {
    next(err);
  }
});

router.post('/workspaces/:workspace_id/notes/:note_id/drawings', (req, res, next) => {
  try {
    const drawing = createDrawing(req.params.workspace_id, req.params.note_id, req.body.title);
    res.status(201).json(drawing);
  } catch (err) {
    next(err);
  }
});

router.get('/workspaces/:workspace_id/notes/:note_id/drawings/:drawing_id', (req, res, next) => {
  try {
    const drawing = getDrawing(req.params.workspace_id, req.params.drawing_id);
    res.json(drawing);
  } catch (err) {
    next(err);
  }
});

router.put('/workspaces/:workspace_id/notes/:note_id/drawings/:drawing_id/scene', (req, res, next) => {
  try {
    const drawing = saveScene(req.params.workspace_id, req.params.drawing_id, req.body.scene);
    res.json(drawing);
  } catch (err) {
    next(err);
  }
});

router.patch('/workspaces/:workspace_id/notes/:note_id/drawings/:drawing_id', (req, res, next) => {
  try {
    const drawing = renameDrawing(req.params.workspace_id, req.params.drawing_id, req.body.title);
    res.json(drawing);
  } catch (err) {
    next(err);
  }
});

router.delete('/workspaces/:workspace_id/notes/:note_id/drawings/:drawing_id', (req, res, next) => {
  try {
    deleteDrawing(req.params.workspace_id, req.params.drawing_id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// --- Workspace-scoped drawings ---

router.get('/workspaces/:workspace_id/drawings', (req, res, next) => {
  try {
    const includeAll = req.query.include_all === 'true';
    const drawings = listDrawings(req.params.workspace_id, null, includeAll);
    res.json(drawings);
  } catch (err) {
    next(err);
  }
});

router.post('/workspaces/:workspace_id/drawings', (req, res, next) => {
  try {
    const drawing = createDrawing(req.params.workspace_id, null, req.body.title);
    res.status(201).json(drawing);
  } catch (err) {
    next(err);
  }
});

router.get('/workspaces/:workspace_id/drawings/:drawing_id', (req, res, next) => {
  try {
    const drawing = getDrawing(req.params.workspace_id, req.params.drawing_id);
    res.json(drawing);
  } catch (err) {
    next(err);
  }
});

router.put('/workspaces/:workspace_id/drawings/:drawing_id/scene', (req, res, next) => {
  try {
    const drawing = saveScene(req.params.workspace_id, req.params.drawing_id, req.body.scene);
    res.json(drawing);
  } catch (err) {
    next(err);
  }
});

router.patch('/workspaces/:workspace_id/drawings/:drawing_id', (req, res, next) => {
  try {
    const drawing = renameDrawing(req.params.workspace_id, req.params.drawing_id, req.body.title);
    res.json(drawing);
  } catch (err) {
    next(err);
  }
});

router.delete('/workspaces/:workspace_id/drawings/:drawing_id', (req, res, next) => {
  try {
    deleteDrawing(req.params.workspace_id, req.params.drawing_id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
