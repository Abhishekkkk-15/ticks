import { Router } from 'express';
import {
  listWorkspaces,
  createWorkspace,
  renameWorkspace,
  deleteWorkspace,
  exportWorkspace,
  importWorkspace
} from '../services/workspaceService.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get('/workspaces', (req, res, next) => {
  try {
    const workspaces = listWorkspaces();
    res.json(workspaces);
  } catch (err) {
    next(err);
  }
});

router.post('/workspaces', (req, res, next) => {
  try {
    const workspace = createWorkspace(req.body);
    res.status(201).json(workspace);
  } catch (err) {
    next(err);
  }
});

router.patch('/workspaces/:workspace_id', (req, res, next) => {
  try {
    const workspace = renameWorkspace(req.params.workspace_id, req.body.name);
    res.json(workspace);
  } catch (err) {
    next(err);
  }
});

router.delete('/workspaces/:workspace_id', (req, res, next) => {
  try {
    deleteWorkspace(req.params.workspace_id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/workspaces/:workspace_id/export', (req, res, next) => {
  try {
    const buffer = exportWorkspace(req.params.workspace_id);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.workspace_id}.zip"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.post('/workspaces/import', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      throw { status: 400, message: 'No file uploaded' };
    }
    const name = req.body.name || 'Imported Workspace';
    const workspace = importWorkspace(req.file.buffer, name);
    res.status(201).json(workspace);
  } catch (err) {
    next(err);
  }
});

export default router;
