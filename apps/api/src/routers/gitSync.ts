import { Router } from 'express';
import { getGitStatus, configureGitRemote, syncGit } from '../services/gitService.js';

const router = Router();

// GET /workspaces/:workspace_id/sync/git
router.get('/workspaces/:workspace_id/sync/git', async (req, res, next) => {
  try {
    const status = await getGitStatus(req.params.workspace_id);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// POST /workspaces/:workspace_id/sync/git/configure
router.post('/workspaces/:workspace_id/sync/git/configure', async (req, res, next) => {
  try {
    const syncConfig = {
      remote_url: req.body.remote_url,
      branch: req.body.branch,
      auto_sync_on_save: req.body.auto_sync_on_save,
      author_name: req.body.author_name,
      author_email: req.body.author_email
    };
    const status = await configureGitRemote(req.params.workspace_id, syncConfig);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// POST /workspaces/:workspace_id/sync/git/sync
router.post('/workspaces/:workspace_id/sync/git/sync', async (req, res, next) => {
  try {
    const result = await syncGit(req.params.workspace_id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
