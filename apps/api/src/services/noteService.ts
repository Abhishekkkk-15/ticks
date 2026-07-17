import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { readJsonl, writeJsonl } from '../utils/fileDb.js';
import { getWorkspaceDir } from './workspaceService.js';
import { Note, NoteCreate, NoteDetail, NoteListItem } from '@ticks/types';

const METADATA_FILENAME = 'notes.jsonl';
const SNIPPET_LENGTH = 140;

function metadataPath(workspaceDir: string): string {
  return path.join(workspaceDir, METADATA_FILENAME);
}

function notePath(workspaceDir: string, noteId: string): string {
  return path.join(workspaceDir, 'notes', `${noteId}.md`);
}

// In TS we want to export the _read_all function so drawingService can import it
export function readAllNotes(workspaceDir: string): any[] {
  return readJsonl(metadataPath(workspaceDir));
}

function writeAllNotes(workspaceDir: string, entries: any[]): void {
  writeJsonl(metadataPath(workspaceDir), entries);
}

function sortNotes(entries: any[]): any[] {
  // Sort by updated_at desc, then by pinned desc
  return [...entries]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
}

function findNote(entries: any[], noteId: string): any {
  const entry = entries.find(e => e.id === noteId);
  if (!entry) {
    throw { status: 404, message: 'Note not found' };
  }
  return entry;
}

function makeSnippet(content: string, query: string): string {
  let cleanContent = content.replace(/\s+/g, ' ');
  if (!cleanContent) return '';
  if (!query) return cleanContent.slice(0, SNIPPET_LENGTH);

  const idx = cleanContent.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return cleanContent.slice(0, SNIPPET_LENGTH);

  const start = Math.max(0, idx - Math.floor(SNIPPET_LENGTH / 3));
  const end = Math.min(cleanContent.length, start + SNIPPET_LENGTH);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < cleanContent.length ? '…' : '';
  return `${prefix}${cleanContent.slice(start, end)}${suffix}`;
}

function toListItem(workspaceDir: string, entry: any, query = ''): NoteListItem {
  const filePath = notePath(workspaceDir, entry.id);
  const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  return {
    ...entry,
    snippet: makeSnippet(content, query)
  };
}

export function noteExists(workspaceId: string, noteId: string): boolean {
  const workspaceDir = getWorkspaceDir(workspaceId);
  return readAllNotes(workspaceDir).some(e => e.id === noteId);
}

export function listNotes(workspaceId: string, favoriteOnly = false, pinnedOnly = false): NoteListItem[] {
  const workspaceDir = getWorkspaceDir(workspaceId);
  let entries = sortNotes(readAllNotes(workspaceDir).filter(e => !e.trashed));
  if (favoriteOnly) {
    entries = entries.filter(e => e.favorite);
  }
  if (pinnedOnly) {
    entries = entries.filter(e => e.pinned);
  }
  return entries.map(e => toListItem(workspaceDir, e));
}

export function searchNotes(workspaceId: string, query: string, favoriteOnly = false, pinnedOnly = false): NoteListItem[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return listNotes(workspaceId, favoriteOnly, pinnedOnly);
  }

  const workspaceDir = getWorkspaceDir(workspaceId);
  const lowerQuery = trimmedQuery.toLowerCase();
  const matches: any[] = [];

  for (const entry of readAllNotes(workspaceDir)) {
    if (entry.trashed) continue;
    if (favoriteOnly && !entry.favorite) continue;
    if (pinnedOnly && !entry.pinned) continue;

    if (entry.title.toLowerCase().includes(lowerQuery)) {
      matches.push(entry);
      continue;
    }

    const filePath = notePath(workspaceDir, entry.id);
    const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    if (content.toLowerCase().includes(lowerQuery)) {
      matches.push(entry);
    }
  }

  return sortNotes(matches).map(e => toListItem(workspaceDir, e, trimmedQuery));
}

export function listRecent(workspaceId: string, limit = 20): NoteListItem[] {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllNotes(workspaceDir).filter(e => e.opened_at && !e.trashed);
  entries.sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime());
  return entries.slice(0, limit).map(e => toListItem(workspaceDir, e));
}

export function listTrash(workspaceId: string): NoteListItem[] {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllNotes(workspaceDir).filter(e => e.trashed);
  entries.sort((a, b) => new Date(b.trashed_at).getTime() - new Date(a.trashed_at).getTime());
  return entries.map(e => toListItem(workspaceDir, e));
}

export function listFolders(workspaceId: string): string[] {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const folders = new Set<string>();
  
  // Folders from notes
  for (const entry of readAllNotes(workspaceDir)) {
    if (entry.folder) folders.add(entry.folder);
  }
  
  // Explicit folders
  const foldersPath = path.join(workspaceDir, 'folders.jsonl');
  if (fs.existsSync(foldersPath)) {
    for (const f of readJsonl(foldersPath)) {
      if (f.name) folders.add(f.name);
    }
  }
  
  return Array.from(folders).sort();
}

export function createFolder(workspaceId: string, folderName: string): void {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const foldersPath = path.join(workspaceDir, 'folders.jsonl');
  const folders = fs.existsSync(foldersPath) ? readJsonl(foldersPath) : [];
  if (!folders.some(f => f.name === folderName)) {
    folders.push({ name: folderName, created_at: new Date().toISOString() });
    writeJsonl(foldersPath, folders);
  }
}

export function deleteFolder(workspaceId: string, folderName: string): void {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const foldersPath = path.join(workspaceDir, 'folders.jsonl');
  if (fs.existsSync(foldersPath)) {
    const folders = readJsonl(foldersPath).filter(f => f.name !== folderName);
    writeJsonl(foldersPath, folders);
  }
}

export function listTags(workspaceId: string): string[] {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const tags = new Set<string>();
  for (const entry of readAllNotes(workspaceDir)) {
    if (entry.tags) {
      for (const t of entry.tags) tags.add(t);
    }
  }
  return Array.from(tags).sort();
}

export function getNote(workspaceId: string, noteId: string): NoteDetail {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllNotes(workspaceDir);
  const entry = findNote(entries, noteId);
  entry.opened_at = new Date().toISOString();
  writeAllNotes(workspaceDir, entries);
  const filePath = notePath(workspaceDir, noteId);
  const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  return { ...entry, content };
}

export function createNote(workspaceId: string, data: NoteCreate): NoteDetail {
  const title = data.title.trim();
  if (!title) {
    throw { status: 422, message: 'Note title cannot be empty' };
  }

  const workspaceDir = getWorkspaceDir(workspaceId);
  const noteId = crypto.randomUUID().replace(/-/g, '');
  const now = new Date().toISOString();

  const entry = {
    id: noteId,
    title,
    created_at: now,
    updated_at: now,
    favorite: false,
    pinned: false,
    folder: null as string | null,
    tags: [] as string[],
    trashed: false,
    trashed_at: null as string | null,
    opened_at: null as string | null
  };

  const entries = readAllNotes(workspaceDir);
  entries.push(entry);
  writeAllNotes(workspaceDir, entries);

  const filePath = notePath(workspaceDir, noteId);
  fs.writeFileSync(filePath, data.content || '', 'utf8');

  return { ...entry, content: data.content || '' };
}

export function renameNote(workspaceId: string, noteId: string, title: string): Note {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw { status: 422, message: 'Note title cannot be empty' };
  }

  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllNotes(workspaceDir);
  const entry = findNote(entries, noteId);
  entry.title = trimmedTitle;
  entry.updated_at = new Date().toISOString();
  writeAllNotes(workspaceDir, entries);
  return entry;
}

export function updateContent(workspaceId: string, noteId: string, content: string): Note {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllNotes(workspaceDir);
  const entry = findNote(entries, noteId);
  entry.updated_at = new Date().toISOString();
  writeAllNotes(workspaceDir, entries);
  fs.writeFileSync(notePath(workspaceDir, noteId), content, 'utf8');
  return entry;
}

export function setFlags(workspaceId: string, noteId: string, favorite: boolean | null | undefined, pinned: boolean | null | undefined): Note {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllNotes(workspaceDir);
  const entry = findNote(entries, noteId);
  if (favorite !== undefined && favorite !== null) entry.favorite = favorite;
  if (pinned !== undefined && pinned !== null) entry.pinned = pinned;
  writeAllNotes(workspaceDir, entries);
  return entry;
}

export function setComments(workspaceId: string, noteId: string, comments: any[]): Note {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllNotes(workspaceDir);
  const entry = findNote(entries, noteId);
  entry.comments = comments;
  writeAllNotes(workspaceDir, entries);
  return entry;
}

export function setFolder(workspaceId: string, noteId: string, folder: string | null | undefined): Note {
  const cleanFolder = folder ? folder.replace(/^\/+|\/+$/g, '').trim() : null;
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllNotes(workspaceDir);
  const entry = findNote(entries, noteId);
  entry.folder = cleanFolder || null;
  entry.updated_at = new Date().toISOString();
  writeAllNotes(workspaceDir, entries);
  return entry;
}

export function setTags(workspaceId: string, noteId: string, tags: string[]): Note {
  const cleaned = Array.from(new Set(tags.map(t => t.trim()).filter(t => t.length > 0))).sort();
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllNotes(workspaceDir);
  const entry = findNote(entries, noteId);
  entry.tags = cleaned;
  entry.updated_at = new Date().toISOString();
  writeAllNotes(workspaceDir, entries);
  return entry;
}

export function duplicateNote(workspaceId: string, noteId: string): NoteDetail {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllNotes(workspaceDir);
  const source = findNote(entries, noteId);
  const filePath = notePath(workspaceDir, noteId);
  const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';

  const now = new Date().toISOString();
  const newId = crypto.randomUUID().replace(/-/g, '');
  const newEntry = {
    id: newId,
    title: `${source.title} (copy)`,
    created_at: now,
    updated_at: now,
    favorite: false,
    pinned: false,
    folder: source.folder,
    tags: [...source.tags],
    trashed: false,
    trashed_at: null as string | null,
    opened_at: null as string | null
  };

  entries.push(newEntry);
  writeAllNotes(workspaceDir, entries);
  fs.writeFileSync(notePath(workspaceDir, newId), content, 'utf8');

  return { ...newEntry, content };
}

export function moveNote(workspaceId: string, noteId: string, targetWorkspaceId: string): Note {
  if (targetWorkspaceId === workspaceId) {
    throw { status: 422, message: 'Note is already in that workspace' };
  }

  const workspaceDir = getWorkspaceDir(workspaceId);
  const targetDir = getWorkspaceDir(targetWorkspaceId);

  const entries = readAllNotes(workspaceDir);
  const entry = findNote(entries, noteId);
  const index = entries.indexOf(entry);
  if (index > -1) {
    entries.splice(index, 1);
  }

  const targetEntries = readAllNotes(targetDir);
  targetEntries.push(entry);

  const srcPath = notePath(workspaceDir, noteId);
  const destPath = notePath(targetDir, noteId);

  fs.renameSync(srcPath, destPath);
  writeAllNotes(workspaceDir, entries);
  writeAllNotes(targetDir, targetEntries);

  return entry;
}

export function trashNote(workspaceId: string, noteId: string): void {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllNotes(workspaceDir);
  const entry = findNote(entries, noteId);
  entry.trashed = true;
  entry.trashed_at = new Date().toISOString();
  writeAllNotes(workspaceDir, entries);
}

export function restoreNote(workspaceId: string, noteId: string): Note {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllNotes(workspaceDir);
  const entry = findNote(entries, noteId);
  entry.trashed = false;
  entry.trashed_at = null;
  writeAllNotes(workspaceDir, entries);
  return entry;
}

export function purgeNote(workspaceId: string, noteId: string): void {
  const workspaceDir = getWorkspaceDir(workspaceId);
  const entries = readAllNotes(workspaceDir);
  const entry = entries.find(e => e.id === noteId);
  if (entry) {
    const index = entries.indexOf(entry);
    if (index > -1) {
      entries.splice(index, 1);
    }
    writeAllNotes(workspaceDir, entries);
  }
  const filePath = notePath(workspaceDir, noteId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
