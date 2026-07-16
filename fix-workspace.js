const fs = require('fs');
const path = require('path');

const root = '/mnt/c/Users/USE05/AILearningWorkspace';
const workspacesDir = path.join(root, 'workspaces');

function fixWorkspace(workspaceDir) {
  const notesDir = path.join(workspaceDir, 'notes');
  const drawingsDir = path.join(workspaceDir, 'drawings');
  
  // 1. Resolve conflicted copies
  function resolveConflicts(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.includes('(Conflicted Copy)')) {
        const fullPath = path.join(dir, file);
        const originalPath = path.join(dir, file.replace(' (Conflicted Copy)', ''));
        // We will prefer the conflicted copy (from Dropbox) because it's usually the older/more complete one 
        // compared to the empty one Ticks auto-created.
        fs.copyFileSync(fullPath, originalPath);
        fs.unlinkSync(fullPath);
        console.log(`Resolved conflict: ${originalPath}`);
      }
    }
  }

  resolveConflicts(workspaceDir); // config.json, folders.jsonl, drawings.jsonl
  resolveConflicts(notesDir);
  resolveConflicts(drawingsDir);
  resolveConflicts(root); // backend.log, settings.json, window-state.json

  // 2. Regenerate notes.jsonl if missing
  const notesMetadataPath = path.join(workspaceDir, 'notes.jsonl');
  let existingNotes = [];
  if (fs.existsSync(notesMetadataPath)) {
    const lines = fs.readFileSync(notesMetadataPath, 'utf8').split('\n').filter(Boolean);
    existingNotes = lines.map(line => JSON.parse(line));
  }

  const existingIds = new Set(existingNotes.map(n => n.id));
  const newNotes = [];

  if (fs.existsSync(notesDir)) {
    const mdFiles = fs.readdirSync(notesDir).filter(f => f.endsWith('.md') && !f.includes('Conflicted Copy'));
    for (const file of mdFiles) {
      const id = file.replace('.md', '');
      if (existingIds.has(id)) continue;

      const content = fs.readFileSync(path.join(notesDir, file), 'utf8');
      const firstLine = content.split('\n')[0].replace(/^#*\s*-*\s*\[?\]?\s*/, '').trim() || 'Untitled Note';
      
      const stat = fs.statSync(path.join(notesDir, file));
      
      newNotes.push({
        id,
        title: firstLine,
        folder_id: null,
        favorite: false,
        pinned: false,
        trashed: false,
        created_at: stat.birthtime.toISOString(),
        updated_at: stat.mtime.toISOString()
      });
      console.log(`Recreated metadata for note: ${firstLine}`);
    }
  }

  if (newNotes.length > 0) {
    const lines = newNotes.map(n => JSON.stringify(n)).join('\n') + '\n';
    fs.appendFileSync(notesMetadataPath, lines);
    console.log(`Added ${newNotes.length} notes to notes.jsonl`);
  }
}

if (fs.existsSync(workspacesDir)) {
  const workspaces = fs.readdirSync(workspacesDir);
  for (const ws of workspaces) {
    const wsPath = path.join(workspacesDir, ws);
    if (fs.statSync(wsPath).isDirectory()) {
      console.log(`Fixing workspace: ${ws}`);
      fixWorkspace(wsPath);
    }
  }
}

console.log('Done!');
