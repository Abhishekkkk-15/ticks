import { Router } from 'express';
import {
  listWorkspaces,
  createWorkspace,
  renameWorkspace,
  deleteWorkspace
} from '../services/workspaceService.js';

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

export default router;
