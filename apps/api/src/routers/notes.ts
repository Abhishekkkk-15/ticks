import { Router } from 'express';
import {
  listNotes,
  searchNotes,
  createNote,
  listRecent,
  listTrash,
  getNote,
  renameNote,
  updateContent,
  setFlags,
  setFolder,
  setTags,
  duplicateNote,
  moveNote,
  restoreNote,
  purgeNote,
  trashNote,
  listFolders,
  createFolder,
  deleteFolder,
  listTags
} from '../services/noteService.js';
import { getGitStatus, syncGit } from '../services/gitService.js';

const router = Router();

// GET /workspaces/:workspace_id/notes
router.get('/workspaces/:workspace_id/notes', (req, res, next) => {
  try {
    const workspaceId = req.params.workspace_id;
    const q = req.query.q as string | undefined;
    const favoriteOnly = req.query.favorite_only === 'true';
    const pinnedOnly = req.query.pinned_only === 'true';

    if (q !== undefined) {
      const notes = searchNotes(workspaceId, q, favoriteOnly, pinnedOnly);
      return res.json(notes);
    }
    const notes = listNotes(workspaceId, favoriteOnly, pinnedOnly);
    res.json(notes);
  } catch (err) {
    next(err);
  }
});

// POST /workspaces/:workspace_id/notes
router.post('/workspaces/:workspace_id/notes', (req, res, next) => {
  try {
    const note = createNote(req.params.workspace_id, req.body);
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

// POST /workspaces/:workspace_id/notes/import
router.post('/workspaces/:workspace_id/notes/import', (req, res, next) => {
  try {
    const note = createNote(req.params.workspace_id, {
      title: req.body.title,
      content: req.body.content
    });
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

// GET /workspaces/:workspace_id/notes/recent
router.get('/workspaces/:workspace_id/notes/recent', (req, res, next) => {
  try {
    const notes = listRecent(req.params.workspace_id);
    res.json(notes);
  } catch (err) {
    next(err);
  }
});

// GET /workspaces/:workspace_id/notes/trash
router.get('/workspaces/:workspace_id/notes/trash', (req, res, next) => {
  try {
    const notes = listTrash(req.params.workspace_id);
    res.json(notes);
  } catch (err) {
    next(err);
  }
});

// GET /workspaces/:workspace_id/notes/:note_id
router.get('/workspaces/:workspace_id/notes/:note_id', (req, res, next) => {
  try {
    const note = getNote(req.params.workspace_id, req.params.note_id);
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// PATCH /workspaces/:workspace_id/notes/:note_id
router.patch('/workspaces/:workspace_id/notes/:note_id', (req, res, next) => {
  try {
    const note = renameNote(req.params.workspace_id, req.params.note_id, req.body.title);
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// PUT /workspaces/:workspace_id/notes/:note_id/content
router.put('/workspaces/:workspace_id/notes/:note_id/content', (req, res, next) => {
  try {
    const note = updateContent(req.params.workspace_id, req.params.note_id, req.body.content);
    
    // Auto-sync in the background if enabled
    getGitStatus(req.params.workspace_id)
      .then((status) => {
        if (status.initialized && status.auto_sync_on_save && status.remote_url) {
          syncGit(req.params.workspace_id).catch((err) => {
            console.error(`[backend] Auto-sync failed for workspace ${req.params.workspace_id}:`, err);
          });
        }
      })
      .catch((err) => {
        console.error('[backend] Failed to fetch git status for auto-sync:', err);
      });

    res.json(note);
  } catch (err) {
    next(err);
  }
});

// PATCH /workspaces/:workspace_id/notes/:note_id/flags
router.patch('/workspaces/:workspace_id/notes/:note_id/flags', (req, res, next) => {
  try {
    const note = setFlags(
      req.params.workspace_id,
      req.params.note_id,
      req.body.favorite,
      req.body.pinned
    );
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// PATCH /workspaces/:workspace_id/notes/:note_id/folder
router.patch('/workspaces/:workspace_id/notes/:note_id/folder', (req, res, next) => {
  try {
    const note = setFolder(req.params.workspace_id, req.params.note_id, req.body.folder);
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// PATCH /workspaces/:workspace_id/notes/:note_id/tags
router.patch('/workspaces/:workspace_id/notes/:note_id/tags', (req, res, next) => {
  try {
    const note = setTags(req.params.workspace_id, req.params.note_id, req.body.tags);
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// POST /workspaces/:workspace_id/notes/:note_id/duplicate
router.post('/workspaces/:workspace_id/notes/:note_id/duplicate', (req, res, next) => {
  try {
    const note = duplicateNote(req.params.workspace_id, req.params.note_id);
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

// POST /workspaces/:workspace_id/notes/:note_id/move
router.post('/workspaces/:workspace_id/notes/:note_id/move', (req, res, next) => {
  try {
    const note = moveNote(req.params.workspace_id, req.params.note_id, req.body.target_workspace_id);
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// POST /workspaces/:workspace_id/notes/:note_id/restore
router.post('/workspaces/:workspace_id/notes/:note_id/restore', (req, res, next) => {
  try {
    const note = restoreNote(req.params.workspace_id, req.params.note_id);
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// DELETE /workspaces/:workspace_id/notes/:note_id/permanent
router.delete('/workspaces/:workspace_id/notes/:note_id/permanent', (req, res, next) => {
  try {
    purgeNote(req.params.workspace_id, req.params.note_id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// DELETE /workspaces/:workspace_id/notes/:note_id (soft-delete)
router.delete('/workspaces/:workspace_id/notes/:note_id', (req, res, next) => {
  try {
    trashNote(req.params.workspace_id, req.params.note_id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /workspaces/:workspace_id/folders
router.get('/workspaces/:workspace_id/folders', (req, res, next) => {
  try {
    const folders = listFolders(req.params.workspace_id);
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

// POST /workspaces/:workspace_id/folders
router.post('/workspaces/:workspace_id/folders', (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) throw { status: 422, message: 'Folder name is required' };
    createFolder(req.params.workspace_id, name);
    res.status(201).json({ success: true, name });
  } catch (err) {
    next(err);
  }
});

// DELETE /workspaces/:workspace_id/folders
router.delete('/workspaces/:workspace_id/folders', (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) throw { status: 422, message: 'Folder name is required' };
    deleteFolder(req.params.workspace_id, name);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /workspaces/:workspace_id/tags
router.get('/workspaces/:workspace_id/tags', (req, res, next) => {
  try {
    const tags = listTags(req.params.workspace_id);
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

export default router;
