import { Router } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { mcpServer } from '../mcp/mcpServer.js';
import { getSettingsInfo } from '../services/settingsService.js';

const router = Router();

// Store active transport sessions by session ID
const activeTransports = new Map<string, SSEServerTransport>();

// GET /mcp/sse - Client establishes SSE stream connection
router.get('/mcp/sse', async (req, res, next) => {
  try {
    const currentSettings = getSettingsInfo();
    if (!currentSettings.mcp_enabled) {
      return res.status(403).json({ error: 'MCP Server is disabled in settings.' });
    }

    const transport = new SSEServerTransport('/mcp/message', res);
    const sessionId = transport.sessionId;
    activeTransports.set(sessionId, transport);

    transport.onclose = () => {
      activeTransports.delete(sessionId);
      console.log(`[mcp] Connection closed for session ${sessionId}`);
    };

    console.log(`[mcp] New connection established for session ${sessionId}`);
    await transport.start();
    await mcpServer.connect(transport);
  } catch (err) {
    next(err);
  }
});

// POST /mcp/message - Client sends messages (JSON-RPC requests) to the server
router.post('/mcp/message', async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    if (typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid sessionId parameter.' });
    }

    const transport = activeTransports.get(sessionId);
    if (!transport) {
      return res.status(404).json({ error: `No active SSE transport found for session ${sessionId}` });
    }

    await transport.handlePostMessage(req, res);
  } catch (err) {
    next(err);
  }
});

export default router;
