import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { settings } from './config.js';
import healthRouter from './routers/health.js';
import workspacesRouter from './routers/workspaces.js';
import notesRouter from './routers/notes.js';
import resourcesRouter from './routers/resources.js';
import drawingsRouter from './routers/drawings.js';
import settingsRouter from './routers/settings.js';
import aiRouter from './routers/ai.js';
import gitSyncRouter from './routers/gitSync.js';
import mcpRouter from './routers/mcp.js';
import { syncRouter } from './routers/sync.js';

// Ensure workspaces root directory exists
fs.mkdirSync(settings.workspacesRoot, { recursive: true });

const app = express();

app.use(cors({ origin: settings.corsOrigins.includes('*') ? '*' : settings.corsOrigins }));
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[backend] ${req.method} ${req.path}`);
  next();
});

// Register API routers
app.use(healthRouter);
app.use(workspacesRouter);
app.use(notesRouter);
app.use(resourcesRouter);
app.use(drawingsRouter);
app.use(settingsRouter);
app.use(aiRouter);
app.use(gitSyncRouter);
app.use('/api/sync', syncRouter);

// Global exception and error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err && typeof err.status === 'number') {
    return res.status(err.status).json({ detail: err.message || err.detail || String(err) });
  }
  console.error(`[backend] Unhandled error on ${req.method} ${req.path}:`, err);
  res.status(500).json({ detail: 'Internal server error' });
});

app.listen(settings.port, settings.host, () => {
  console.log(`[backend] ${settings.appName} listening on http://${settings.host}:${settings.port}`);
});

// Start a separate Express instance specifically for the MCP Server on port 8001 (port + 1)
const mcpApp = express();
mcpApp.use(cors({ origin: '*' }));
// Do not use express.json() because the MCP SDK consumes the raw request stream directly.

mcpApp.use((req, res, next) => {
  console.log(`[mcp-server] ${req.method} ${req.path}`);
  next();
});

mcpApp.use(mcpRouter);

mcpApp.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error(`[mcp-server] Unhandled error on ${req.method} ${req.path}:`, err);
  res.status(500).json({ detail: 'Internal server error' });
});

const mcpPort = settings.port + 1;
mcpApp.listen(mcpPort, settings.host, () => {
  console.log(`[mcp-server] MCP Server listening on http://${settings.host}:${mcpPort}`);
});
