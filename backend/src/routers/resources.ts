import { Router } from 'express';
import multer from 'multer';
import {
  listResources,
  createUrlResource,
  createFileResource,
  getResourceFilePath,
  deleteResource,
  processResource
} from '../services/resourceService.js';

const router = Router();
const upload = multer();

// GET /workspaces/:workspace_id/notes/:note_id/resources
router.get('/workspaces/:workspace_id/notes/:note_id/resources', (req, res, next) => {
  try {
    const resources = listResources(req.params.workspace_id, req.params.note_id);
    res.json(resources);
  } catch (err) {
    next(err);
  }
});

// POST /workspaces/:workspace_id/notes/:note_id/resources (Create URL resource)
router.post('/workspaces/:workspace_id/notes/:note_id/resources', (req, res, next) => {
  try {
    const resource = createUrlResource(req.params.workspace_id, req.params.note_id, req.body);
    
    // Spawn background task without awaiting it
    processResource(req.params.workspace_id, resource.id).catch(err => {
      console.error(`[backend] Error running background processResource for ${resource.id}:`, err);
    });

    res.status(201).json(resource);
  } catch (err) {
    next(err);
  }
});

// POST /workspaces/:workspace_id/notes/:note_id/resources/upload (Multipart upload)
router.post(
  '/workspaces/:workspace_id/notes/:note_id/resources/upload',
  upload.single('file'),
  (req, res, next) => {
    try {
      if (!req.file) {
        throw { status: 400, message: 'No file uploaded' };
      }
      const resource = createFileResource(
        req.params.workspace_id,
        req.params.note_id,
        req.body.type,
        req.body.title,
        req.file.originalname,
        req.file.buffer
      );
      res.status(201).json(resource);
    } catch (err) {
      next(err);
    }
  }
);

// GET /workspaces/:workspace_id/notes/:note_id/resources/:resource_id/file
router.get('/workspaces/:workspace_id/notes/:note_id/resources/:resource_id/file', (req, res, next) => {
  try {
    const filePath = getResourceFilePath(req.params.workspace_id, req.params.resource_id);
    if (!filePath) {
      throw { status: 404, message: 'Resource file not found' };
    }
    // Express res.sendFile automatically sets the appropriate mime-type headers
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

// DELETE /workspaces/:workspace_id/notes/:note_id/resources/:resource_id
router.delete('/workspaces/:workspace_id/notes/:note_id/resources/:resource_id', (req, res, next) => {
  try {
    deleteResource(req.params.workspace_id, req.params.resource_id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
