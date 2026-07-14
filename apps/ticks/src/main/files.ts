import { dialog, BrowserWindow } from 'electron'
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

export async function exportHtmlFile(defaultName: string, content: string): Promise<boolean> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'HTML', extensions: ['html', 'htm'] }]
  })

  if (canceled || !filePath) return false

  await writeFile(filePath, content, 'utf-8')
  return true
}

export async function exportPdfFile(defaultName: string, content: string): Promise<boolean> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })

  if (canceled || !filePath) return false

  // Create an offscreen window
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  
  try {
    // Load the fully self-contained HTML
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(content)}`)
    
    // Give it a tiny bit of time just in case some sync rendering happens
    await new Promise(resolve => setTimeout(resolve, 100))

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4'
    })
    
    await writeFile(filePath, pdfBuffer)
    return true
  } catch (error) {
    console.error('Failed to export PDF:', error)
    return false
  } finally {
    win.destroy()
  }
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

const RESOURCE_FILE_FILTERS = [
  { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'md', 'markdown', 'txt'] }
]

export interface PickedResourceFile {
  name: string
  data: Uint8Array
}

export async function pickResourceFile(): Promise<PickedResourceFile | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: RESOURCE_FILE_FILTERS
  })

  if (canceled || filePaths.length === 0) return null

  const filePath = filePaths[0]
  const buffer = await readFile(filePath)
  return { name: basename(filePath), data: new Uint8Array(buffer) }
}
