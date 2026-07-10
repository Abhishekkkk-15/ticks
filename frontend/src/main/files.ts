import { dialog } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { basename, extname } from 'path'

const MARKDOWN_FILTERS = [
  { name: 'Markdown', extensions: ['md', 'markdown'] },
  { name: 'Text', extensions: ['txt'] }
]

export async function exportNoteFile(defaultName: string, content: string): Promise<boolean> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: MARKDOWN_FILTERS
  })

  if (canceled || !filePath) return false

  await writeFile(filePath, content, 'utf-8')
  return true
}

export interface ImportedNoteFile {
  title: string
  content: string
}

export async function importNoteFile(): Promise<ImportedNoteFile | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: MARKDOWN_FILTERS
  })

  if (canceled || filePaths.length === 0) return null

  const filePath = filePaths[0]
  const content = await readFile(filePath, 'utf-8')
  return { title: basename(filePath, extname(filePath)), content }
}
