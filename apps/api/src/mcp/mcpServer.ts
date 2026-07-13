import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getSettingsInfo, updateSettings } from '../services/settingsService.js';
import { listWorkspaces } from '../services/workspaceService.js';
import { listNotes, getNote, createNote, updateContent, searchNotes } from '../services/noteService.js';
import { listDrawings, getDrawing, saveScene, createDrawing } from '../services/drawingService.js';
import { listResources, getResourceFilePath } from '../services/resourceService.js';
import fs from 'fs';

export function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'ticks-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

// Define tools
const TOOLS = [
  {
    name: 'list_workspaces',
    description: 'Lists all available workspaces.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_notes',
    description: 'Lists all notes that the user has permitted the agent to access.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'read_note',
    description: 'Reads the complete text content of a permitted note.',
    inputSchema: {
      type: 'object',
      properties: {
        note_id: { type: 'string', description: 'The unique ID of the note' },
        workspace_id: { type: 'string', description: 'The workspace ID where the note is located' },
      },
      required: ['note_id', 'workspace_id'],
    },
  },
  {
    name: 'search_notes',
    description: 'Performs a full-text search across all permitted notes.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search term or keyword' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_note',
    description: 'Creates a new note in a workspace. The newly created note is automatically permitted.',
    inputSchema: {
      type: 'object',
      properties: {
        workspace_id: { type: 'string', description: 'The workspace ID to create the note in' },
        title: { type: 'string', description: 'The title of the note' },
        content: { type: 'string', description: 'The initial markdown content of the note' },
      },
      required: ['workspace_id', 'title'],
    },
  },
  {
    name: 'update_note',
    description: 'Overwrites the complete markdown content of a permitted note.',
    inputSchema: {
      type: 'object',
      properties: {
        note_id: { type: 'string', description: 'The unique ID of the note' },
        workspace_id: { type: 'string', description: 'The workspace ID where the note is located' },
        content: { type: 'string', description: 'The new markdown content' },
      },
      required: ['note_id', 'workspace_id', 'content'],
    },
  },
  {
    name: 'patch_note',
    description: 'Replaces a specific target block of text inside a permitted note with replacement text.',
    inputSchema: {
      type: 'object',
      properties: {
        note_id: { type: 'string', description: 'The unique ID of the note' },
        workspace_id: { type: 'string', description: 'The workspace ID where the note is located' },
        target_text: { type: 'string', description: 'The exact text block to search for and replace' },
        replacement_text: { type: 'string', description: 'The new text to replace the target block' },
      },
      required: ['note_id', 'workspace_id', 'target_text', 'replacement_text'],
    },
  },
  {
    name: 'read_drawing',
    description: 'Reads the Excalidraw JSON canvas data associated with a permitted note.',
    inputSchema: {
      type: 'object',
      properties: {
        note_id: { type: 'string', description: 'The unique ID of the note' },
        workspace_id: { type: 'string', description: 'The workspace ID' },
      },
      required: ['note_id', 'workspace_id'],
    },
  },
  {
    name: 'write_drawing',
    description: 'Overwrites or creates Excalidraw JSON canvas data associated with a permitted note.',
    inputSchema: {
      type: 'object',
      properties: {
        note_id: { type: 'string', description: 'The unique ID of the note' },
        workspace_id: { type: 'string', description: 'The workspace ID' },
        drawing_data: { type: 'string', description: 'The raw JSON string of the Excalidraw scene/elements' },
      },
      required: ['note_id', 'workspace_id', 'drawing_data'],
    },
  },
  {
    name: 'read_resource',
    description: 'Reads/fetches resource metadata or text/content associated with a permitted note.',
    inputSchema: {
      type: 'object',
      properties: {
        note_id: { type: 'string', description: 'The unique ID of the note' },
        workspace_id: { type: 'string', description: 'The workspace ID' },
        resource_id: { type: 'string', description: 'The unique ID of the resource' },
      },
      required: ['note_id', 'workspace_id', 'resource_id'],
    },
  },
];

// Register list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const currentSettings = getSettingsInfo();
  const permitted = currentSettings.mcp_permitted_tools || [];
  const filtered = TOOLS.filter(t => permitted.includes(t.name));
  return { tools: filtered };
});

// Helper: check if a note is permitted
function isNotePermitted(noteId: string): boolean {
  const currentSettings = getSettingsInfo();
  return currentSettings.mcp_permitted_notes.includes(noteId);
}

// Helper: auto-whitelist a new note
function permitNote(noteId: string) {
  const currentSettings = getSettingsInfo();
  if (!currentSettings.mcp_permitted_notes.includes(noteId)) {
    const updatedNotes = [...currentSettings.mcp_permitted_notes, noteId];
    updateSettings({ mcp_permitted_notes: updatedNotes });
  }
}

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const currentSettings = getSettingsInfo();
  
  if (!currentSettings.mcp_enabled) {
    throw new Error('MCP server is disabled by the user.');
  }
  
  if (!currentSettings.mcp_permitted_tools.includes(name)) {
    throw new Error(`Tool "${name}" is not permitted by the user.`);
  }

  try {
    switch (name) {
      case 'list_workspaces': {
        const list = listWorkspaces();
        return {
          content: [{ type: 'text', text: JSON.stringify(list, null, 2) }],
        };
      }
      
      case 'list_notes': {
        const permittedIds = currentSettings.mcp_permitted_notes;
        const allWorkspaces = listWorkspaces();
        const results: any[] = [];
        
        for (const ws of allWorkspaces) {
          const notes = listNotes(ws.id);
          for (const note of notes) {
            if (permittedIds.includes(note.id)) {
              results.push({
                id: note.id,
                title: note.title,
                workspace_id: ws.id,
                workspace_name: ws.name,
                updated_at: note.updated_at,
                folder: note.folder,
                tags: note.tags,
              });
            }
          }
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
        };
      }

      case 'read_note': {
        const { note_id, workspace_id } = args as { note_id: string; workspace_id: string };
        if (!isNotePermitted(note_id)) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Access denied. Note "${note_id}" is not permitted.` }],
          };
        }
        const note = getNote(workspace_id, note_id);
        return {
          content: [{ type: 'text', text: note.content }],
        };
      }

      case 'search_notes': {
        const { query } = args as { query: string };
        const permittedIds = currentSettings.mcp_permitted_notes;
        const allWorkspaces = listWorkspaces();
        const results: any[] = [];
        
        for (const ws of allWorkspaces) {
          const notes = searchNotes(ws.id, query);
          for (const note of notes) {
            if (permittedIds.includes(note.id)) {
              results.push({
                id: note.id,
                title: note.title,
                workspace_id: ws.id,
                workspace_name: ws.name,
                snippet: note.content.substring(0, 200),
              });
            }
          }
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
        };
      }

      case 'create_note': {
        const { workspace_id, title, content } = args as { workspace_id: string; title: string; content?: string };
        const note = createNote(workspace_id, { title, content: content || '' });
        permitNote(note.id);
        return {
          content: [{ type: 'text', text: `Note created successfully.\nID: ${note.id}\nTitle: ${note.title}` }],
        };
      }

      case 'update_note': {
        const { note_id, workspace_id, content } = args as { note_id: string; workspace_id: string; content: string };
        if (!isNotePermitted(note_id)) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Access denied. Note "${note_id}" is not permitted.` }],
          };
        }
        updateContent(workspace_id, note_id, content);
        return {
          content: [{ type: 'text', text: `Note "${note_id}" updated successfully.` }],
        };
      }

      case 'patch_note': {
        const { note_id, workspace_id, target_text, replacement_text } = args as {
          note_id: string;
          workspace_id: string;
          target_text: string;
          replacement_text: string;
        };
        if (!isNotePermitted(note_id)) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Access denied. Note "${note_id}" is not permitted.` }],
          };
        }
        const note = getNote(workspace_id, note_id);
        if (!note.content.includes(target_text)) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Target text block not found in the note content.` }],
          };
        }
        const newContent = note.content.replace(target_text, replacement_text);
        updateContent(workspace_id, note_id, newContent);
        return {
          content: [{ type: 'text', text: `Note patched successfully.` }],
        };
      }

      case 'read_drawing': {
        const { note_id, workspace_id } = args as { note_id: string; workspace_id: string };
        if (!isNotePermitted(note_id)) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Access denied. Note "${note_id}" is not permitted.` }],
          };
        }
        const drawings = listDrawings(workspace_id, note_id);
        if (drawings.length === 0) {
          return {
            content: [{ type: 'text', text: `No drawings found for note "${note_id}".` }],
          };
        }
        const fullDrawing = getDrawing(workspace_id, drawings[0].id);
        return {
          content: [{ type: 'text', text: JSON.stringify(fullDrawing, null, 2) }],
        };
      }

      case 'write_drawing': {
        const { note_id, workspace_id, drawing_data } = args as {
          note_id: string;
          workspace_id: string;
          drawing_data: string;
        };
        if (!isNotePermitted(note_id)) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Access denied. Note "${note_id}" is not permitted.` }],
          };
        }
        
        let sceneObj;
        try {
          sceneObj = JSON.parse(drawing_data);
        } catch {
          return {
            isError: true,
            content: [{ type: 'text', text: `Invalid drawing_data JSON.` }],
          };
        }

        const drawings = listDrawings(workspace_id, note_id);
        let drawingId;
        if (drawings.length === 0) {
          const newDrawing = createDrawing(workspace_id, note_id, 'Note Drawing');
          drawingId = newDrawing.id;
        } else {
          drawingId = drawings[0].id;
        }

        saveScene(workspace_id, drawingId, sceneObj);
        return {
          content: [{ type: 'text', text: `Drawing for note "${note_id}" updated successfully.` }],
        };
      }

      case 'read_resource': {
        const { note_id, workspace_id, resource_id } = args as {
          note_id: string;
          workspace_id: string;
          resource_id: string;
        };
        if (!isNotePermitted(note_id)) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Access denied. Note "${note_id}" is not permitted.` }],
          };
        }
        const resources = listResources(workspace_id, note_id);
        const resource = resources.find(r => r.id === resource_id);
        if (!resource) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Resource "${resource_id}" not found on note "${note_id}".` }],
          };
        }

        const path = getResourceFilePath(workspace_id, resource_id);
        if (path && fs.existsSync(path)) {
          const stat = fs.statSync(path);
          if (stat.size > 10 * 1024 * 1024) {
            return {
              content: [{ type: 'text', text: `Resource is too large to transfer over MCP (${(stat.size / 1024 / 1024).toFixed(2)} MB).` }],
            };
          }
          const content = fs.readFileSync(path);
          const isText = resource.type === 'text' || resource.filename.endsWith('.txt') || resource.filename.endsWith('.md') || resource.filename.endsWith('.json');
          if (isText) {
            return {
              content: [{ type: 'text', text: content.toString('utf-8') }],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: `Binary resource: ${resource.title} (${resource.filename})\nType: ${resource.type}\nBase64 encoded content: ${content.toString('base64').substring(0, 10000)}...`,
                },
              ],
            };
          }
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(resource, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: 'text', text: error.message || String(error) }],
    };
  }
});

  return server;
}
