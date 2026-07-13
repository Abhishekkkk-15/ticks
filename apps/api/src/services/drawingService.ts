import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { readJsonl, writeJsonl } from '../utils/fileDb.js';
import { getWorkspaceDir } from './workspaceService.js';
import { noteExists, readAllNotes } from './noteService.js';
import { Drawing, DrawingScene } from '@ticks/types';

const METADATA_FILENAME = 'drawings.jsonl';
const EMPTY_SCENE = { elements: [], appState: {}, files: {} };

function metadataPath(workspaceDir: string): string {
  return path.join(workspaceDir, METADATA_FILENAME);
}

function scenePath(workspaceDir: string, drawingId: string): string {
  return path.join(workspaceDir, 'drawings', `${drawingId}.excalidraw`);
}

function readAllDrawings(workspaceDir: string): any[] {
  return readJsonl(metadataPath(workspaceDir));
}

function writeAllDrawings(workspaceDir: string, entries: any[]): void {
  writeJsonl(metadataPath(workspaceDir), entries);
}

function findDrawing(entries: any[], drawingId: string): any {
  const entry = entries.find(e => e.id === drawingId);
  if (!entry) {
    throw { status: 404, message: 'Drawing not found' };
  }
  return entry;
}

function requireNote(workspaceId: string, noteId: string): void {
  if (!noteExists(workspaceId, noteId)) {
    throw { status: 404, message: 'Note not found' };
  }
}

export function listDrawings(workspaceId: string, noteId: string | null | undefined, includeAll = false): Drawing[] {
  if (noteId !== null && noteId !== undefined) {
    requireNote(workspaceId, noteId);
  }
  const workspaceDir = getWorkspaceDir(workspaceId);
  const rawEntries = readAllDrawings(workspaceDir);
  
  let entries = includeAll
    ? rawEntries
    : rawEntries.filter(e => e.note_id === noteId);

  // Map note titles
  let noteTitles: Record<string, string> = {};
  try {
    const notes = readAllNotes(workspaceDir);
    for (const n of notes) {
      noteTitles[n.id] = n.title;
    }
  } catch (e) {
    // Ignore
  }

  for (const e of entries) {
    if (e.note_id) {
      e.note_title = noteTitles[e.note_id] || null;
    }
  }

  return entries
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function getDrawing(workspaceId: string, drawingId: string): DrawingScene {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entry = findDrawing(readAllDrawings(workspaceDir), drawingId);
  const filePath = scenePath(workspaceDir, drawingId);
  const scene = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : EMPTY_SCENE;
  return { ...entry, scene };
}

export function createDrawing(workspaceId: string, noteId: string | null | undefined, title: string): DrawingScene {
  if (noteId !== null && noteId !== undefined) {
    requireNote(workspaceId, noteId);
  }
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw { status: 422, message: 'Drawing title cannot be empty' };
  }

  const workspaceDir = getWorkspaceDir(workspaceId);
  const drawingId = crypto.randomUUID().replace(/-/g, '');
  const now = new Date().toISOString();

  const entry = {
    id: drawingId,
    note_id: noteId || null,
    title: trimmedTitle,
    created_at: now,
    updated_at: now
  };

  const entries = readAllDrawings(workspaceDir);
  entries.push(entry);
  writeAllDrawings(workspaceDir, entries);

  fs.writeFileSync(scenePath(workspaceDir, drawingId), JSON.stringify(EMPTY_SCENE), 'utf8');

  return { ...entry, scene: EMPTY_SCENE };
}

export function saveScene(workspaceId: string, drawingId: string, scene: Record<string, any>): Drawing {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllDrawings(workspaceDir);
  const entry = findDrawing(entries, drawingId);
  entry.updated_at = new Date().toISOString();
  writeAllDrawings(workspaceDir, entries);
  fs.writeFileSync(scenePath(workspaceDir, drawingId), JSON.stringify(scene), 'utf8');
  return entry;
}

export function renameDrawing(workspaceId: string, drawingId: string, title: string): Drawing {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw { status: 422, message: 'Drawing title cannot be empty' };
  }

  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllDrawings(workspaceDir);
  const entry = findDrawing(entries, drawingId);
  entry.title = trimmedTitle;
  entry.updated_at = new Date().toISOString();
  writeAllDrawings(workspaceDir, entries);
  return entry;
}

export function deleteDrawing(workspaceId: string, drawingId: string): void {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllDrawings(workspaceDir);
  const entry = entries.find(e => e.id === drawingId);
  if (entry) {
    const index = entries.indexOf(entry);
    if (index > -1) {
      entries.splice(index, 1);
    }
    writeAllDrawings(workspaceDir, entries);
  }
  const filePath = scenePath(workspaceDir, drawingId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
