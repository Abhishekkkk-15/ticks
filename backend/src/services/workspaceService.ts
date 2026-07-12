import fs from 'fs';
import path from 'path';
import { settings } from '../config.js';
import { Workspace, WorkspaceCreate } from '../types/workspace.js';

const WORKSPACE_SUBDIRS = ['notes', 'drawings', 'resources', 'assets/images'];
const CONFIG_FILENAME = 'config.json';
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'workspace';
}

function uniqueSlug(baseSlug: string): string {
  let slug = baseSlug;
  let counter = 2;
  while (fs.existsSync(path.join(settings.workspacesRoot, slug))) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

export function getWorkspaceDir(workspaceId: string): string {
  if (!SLUG_PATTERN.test(workspaceId)) {
    throw { status: 404, message: 'Workspace not found' };
  }

  const workspaceDir = path.join(settings.workspacesRoot, workspaceId);
  if (!fs.existsSync(workspaceDir) || !fs.statSync(workspaceDir).isDirectory() || !fs.existsSync(path.join(workspaceDir, CONFIG_FILENAME))) {
    throw { status: 404, message: 'Workspace not found' };
  }

  return workspaceDir;
}

function readConfig(workspaceDir: string): any {
  return JSON.parse(fs.readFileSync(path.join(workspaceDir, CONFIG_FILENAME), 'utf8'));
}

function writeConfig(workspaceDir: string, config: any): void {
  fs.writeFileSync(path.join(workspaceDir, CONFIG_FILENAME), JSON.stringify(config, null, 2), 'utf8');
}

export function listWorkspaces(): Workspace[] {
  const root = settings.workspacesRoot;
  if (!fs.existsSync(root)) return [];

  const entries = fs.readdirSync(root);
  const workspaces: Workspace[] = [];

  for (const entry of entries) {
    const entryDir = path.join(root, entry);
    if (!fs.statSync(entryDir).isDirectory()) continue;

    const configPath = path.join(entryDir, CONFIG_FILENAME);
    if (!fs.existsSync(configPath)) continue;

    try {
      const config = readConfig(entryDir);
      workspaces.push({
        id: entry,
        name: config.name,
        created_at: config.created_at
      });
    } catch (e) {
      continue;
    }
  }

  // Sort workspaces alphabetically by ID/slug name matching Python sorted()
  return workspaces.sort((a, b) => a.id.localeCompare(b.id));
}

export function createWorkspace(data: WorkspaceCreate): Workspace {
  const name = data.name.trim();
  if (!name) {
    throw { status: 422, message: 'Workspace name cannot be empty' };
  }

  const slug = uniqueSlug(slugify(name));
  const workspaceDir = path.join(settings.workspacesRoot, slug);

  for (const subdir of WORKSPACE_SUBDIRS) {
    fs.mkdirSync(path.join(workspaceDir, subdir), { recursive: true });
  }

  const createdAt = new Date().toISOString();
  writeConfig(workspaceDir, { name, created_at: createdAt });

  return { id: slug, name, created_at: createdAt };
}

export function renameWorkspace(workspaceId: string, name: string): Workspace {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw { status: 422, message: 'Workspace name cannot be empty' };
  }

  const workspaceDir = getWorkspaceDir(workspaceId);
  const config = readConfig(workspaceDir);
  config.name = trimmedName;
  writeConfig(workspaceDir, config);

  return { id: workspaceId, name: trimmedName, created_at: config.created_at };
}

export function deleteWorkspace(workspaceId: string): void {
  const workspaceDir = getWorkspaceDir(workspaceId);
  fs.rmSync(workspaceDir, { recursive: true, force: true });
}
