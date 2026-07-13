import { uploadFileResource } from '../resources/api'

export function getClipboardImageFile(clipboardData: DataTransfer): File | null {
  const item = Array.from(clipboardData.items).find((i) => i.type.startsWith('image/'))
  return item?.getAsFile() ?? null
}

// Reuses the same upload-then-embed flow as the toolbar's "Insert Image"
// button (uploadFileResource -> generic resource file URL -> Markdown embed),
// just triggered from a paste event instead of a file picker.
export async function uploadPastedImage(
  workspaceId: string,
  noteId: string,
  file: File
): Promise<string> {
  const buffer = await file.arrayBuffer()
  const data = new Uint8Array(buffer)
  const ext = file.type.split('/')[1] || 'png'
  // Clipboard image files are usually named "image.png" with no useful
  // info, so give pasted images a distinct, collision-resistant name.
  const filename =
    file.name && file.name !== 'image.png' ? file.name : `pasted-image-${Date.now()}.${ext}`
  const resource = await uploadFileResource(workspaceId, noteId, 'file', filename, filename, data)
  const baseUrl = await window.api.getApiBaseUrl()
  const url = `${baseUrl}/workspaces/${workspaceId}/notes/${noteId}/resources/${resource.id}/file`
  return `![${filename}](${url})`
}
