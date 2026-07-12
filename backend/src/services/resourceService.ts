import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { readJsonl, writeJsonl } from '../utils/fileDb.js';
import { getWorkspaceDir } from './workspaceService.js';
import { noteExists } from './noteService.js';
import { runAction } from './aiService.js';
import { Resource, ResourceCreate, ResourceType } from '../types/resource.js';

const METADATA_FILENAME = 'resources.jsonl';
const FETCH_TIMEOUT_MS = 10000;
const RESOURCE_CONTEXT_CHAR_LIMIT = 3000;

function metadataPath(workspaceDir: string): string {
  return path.join(workspaceDir, METADATA_FILENAME);
}

function resourceDir(workspaceDir: string, resourceId: string): string {
  return path.join(workspaceDir, 'resources', resourceId);
}

function readAllResources(workspaceDir: string): any[] {
  return readJsonl(metadataPath(workspaceDir));
}

function writeAllResources(workspaceDir: string, entries: any[]): void {
  writeJsonl(metadataPath(workspaceDir), entries);
}

function findResource(entries: any[], resourceId: string): any {
  const entry = entries.find(e => e.id === resourceId);
  if (!entry) {
    throw { status: 404, message: 'Resource not found' };
  }
  return entry;
}

function requireNote(workspaceId: string, noteId: string): void {
  if (!noteExists(workspaceId, noteId)) {
    throw { status: 404, message: 'Note not found' };
  }
}

export function listResources(workspaceId: string, noteId: string): Resource[] {
  requireNote(workspaceId, noteId);
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllResources(workspaceDir).filter(e => e.note_id === noteId);
  return entries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function getResourceContext(workspaceId: string, noteId: string): string {
  const resources = listResources(workspaceId, noteId).filter(r => r.status === 'completed');
  if (resources.length === 0) return '';

  const workspaceDir = getWorkspaceDir(workspaceId);
  const blocks: string[] = [];

  for (const resource of resources) {
    const dir = resourceDir(workspaceDir, resource.id);
    let textPath = path.join(dir, 'summary.txt');
    if (!fs.existsSync(textPath)) {
      textPath = path.join(dir, 'content.txt');
    }
    if (!fs.existsSync(textPath)) continue;

    const text = fs.readFileSync(textPath, 'utf8').trim().slice(0, RESOURCE_CONTEXT_CHAR_LIMIT);
    if (text) {
      blocks.push(`### ${resource.title}\n${text}`);
    }
  }

  return blocks.join('\n\n');
}

export function createUrlResource(workspaceId: string, noteId: string, data: ResourceCreate): Resource {
  requireNote(workspaceId, noteId);
  const title = data.title.trim();
  if (!title) {
    throw { status: 422, message: 'Resource title cannot be empty' };
  }

  const workspaceDir = getWorkspaceDir(workspaceId);
  const resourceId = crypto.randomUUID().replace(/-/g, '');
  const now = new Date().toISOString();

  const entry = {
    id: resourceId,
    note_id: noteId,
    type: data.type,
    source: data.source,
    title,
    status: 'queued' as const,
    error: null as string | null,
    created_at: now,
    updated_at: now
  };

  const entries = readAllResources(workspaceDir);
  entries.push(entry);
  writeAllResources(workspaceDir, entries);

  fs.mkdirSync(resourceDir(workspaceDir, resourceId), { recursive: true });

  return entry;
}

export function createFileResource(
  workspaceId: string,
  noteId: string,
  resourceType: ResourceType,
  title: string,
  filename: string,
  fileData: Buffer
): Resource {
  requireNote(workspaceId, noteId);
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw { status: 422, message: 'Resource title cannot be empty' };
  }

  const workspaceDir = getWorkspaceDir(workspaceId);
  const resourceId = crypto.randomUUID().replace(/-/g, '');
  const now = new Date().toISOString();

  const entry = {
    id: resourceId,
    note_id: noteId,
    type: resourceType,
    source: filename,
    title: trimmedTitle,
    status: 'completed' as const,
    error: null as string | null,
    created_at: now,
    updated_at: now
  };

  const entries = readAllResources(workspaceDir);
  entries.push(entry);
  writeAllResources(workspaceDir, entries);

  const dir = resourceDir(workspaceDir, resourceId);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(filename);
  fs.writeFileSync(path.join(dir, `original${ext}`), fileData);

  return entry;
}

export function getResourceFilePath(workspaceId: string, resourceId: string): string | null {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const dir = resourceDir(workspaceDir, resourceId);
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir);
  const originalFile = files.find(f => f.startsWith('original.'));
  return originalFile ? path.join(dir, originalFile) : null;
}

export function deleteResource(workspaceId: string, resourceId: string): void {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllResources(workspaceDir);
  const entry = entries.find(e => e.id === resourceId);
  if (entry) {
    const index = entries.indexOf(entry);
    if (index > -1) {
      entries.splice(index, 1);
    }
    writeAllResources(workspaceDir, entries);
  }
  const dir = resourceDir(workspaceDir, resourceId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function setStatus(workspaceId: string, resourceId: string, status: string, error: string | null = null): void {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllResources(workspaceDir);
  const entry = findResource(entries, resourceId);
  entry.status = status;
  entry.error = error;
  entry.updated_at = new Date().toISOString();
  writeAllResources(workspaceDir, entries);
}

function htmlUnescape(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

async function fetchAndExtract(urlStr: string): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  
  try {
    const response = await fetch(urlStr, {
      headers: { 'User-Agent': 'AILearningWorkspace/0.1' },
      signal: controller.signal
    });
    clearTimeout(id);

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const buffer = await response.arrayBuffer();
    // Default to utf-8
    const decoder = new TextDecoder('utf-8');
    const raw = decoder.decode(buffer);

    if (contentType.includes('text/html')) {
      let text = raw.replace(/<(script|style)[\s\S]*?>[\s\S]*?<\/\1>/gi, ' ');
      text = text.replace(/<[^>]+>/g, ' ');
      text = htmlUnescape(text);
      text = text.replace(/[ \t]+/g, ' ');
      return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
    }

    return raw;
  } catch (err: any) {
    clearTimeout(id);
    throw err;
  }
}

export async function processResource(workspaceId: string, resourceId: string): Promise<void> {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entry = findResource(readAllResources(workspaceDir), resourceId);
  const url = entry.source;

  setStatus(workspaceId, resourceId, 'reading');
  let text = '';
  try {
    setStatus(workspaceId, resourceId, 'processing');
    text = await fetchAndExtract(url);
  } catch (err: any) {
    setStatus(workspaceId, resourceId, 'failed', err.message || String(err));
    return;
  }

  const dir = resourceDir(workspaceDir, resourceId);
  fs.writeFileSync(path.join(dir, 'content.txt'), text, 'utf8');

  try {
    const summary = await runAction('process-resource', text);
    fs.writeFileSync(path.join(dir, 'summary.txt'), summary, 'utf8');
  } catch (err) {
    console.error(`[backend] AI summary failed for resource ${resourceId}:`, err);
  }

  setStatus(workspaceId, resourceId, 'completed');
}
