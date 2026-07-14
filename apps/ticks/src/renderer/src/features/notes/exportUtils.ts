import { marked } from 'marked'
import { exportToSvg } from '@excalidraw/excalidraw'


export async function exportNoteContent(
  note: { title?: string },
  content: string,
  format: 'html' | 'pdf',
  workspaceId: string,
  noteId: string
) {
  let processedContent = content

  // 1. Process drawings: ![Drawing](drawing://drawingId)
  const drawingRegex = /!\[([^\]]*)\]\(drawing:\/\/([^)]+)\)/g
  const drawingMatches = [...processedContent.matchAll(drawingRegex)]
  
  for (const match of drawingMatches) {
    const fullMatch = match[0]
    const altText = match[1]
    const drawingId = match[2]
    
    try {
      const backendUrl = await window.api.getApiBaseUrl()
      const fetchUrl = `${backendUrl}/workspaces/${workspaceId}/notes/${noteId}/drawings/${drawingId}`
      
      const res = await fetch(fetchUrl)
      if (res.ok) {
        const jsonText = await res.text()
        const drawingData = JSON.parse(jsonText)
        
        // Render drawing to SVG
        const scene = drawingData.scene || { elements: [], appState: {}, files: {} }
        const svg = await exportToSvg({
          elements: scene.elements || [],
          appState: scene.appState || {},
          files: scene.files || {},
          exportPadding: 20
        })
        
        // Convert SVG element to string
        const serializer = new XMLSerializer()
        const svgString = serializer.serializeToString(svg)
        
        // URL encode the SVG (better than base64 for SVGs and won't fail on large strings)
        const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
        
        processedContent = processedContent.replace(fullMatch, `![${altText}](${dataUri})`)
      }
    } catch (e) {
      console.error(`Failed to inline drawing ${drawingId}`, e)
    }
  }

  // 2. Process local images
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
  const imageMatches = [...processedContent.matchAll(imageRegex)]
  
  for (const match of imageMatches) {
    const fullMatch = match[0]
    const altText = match[1]
    const url = match[2]
    
    // Skip already embedded or external links
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      continue
    }
    
    try {
      const backendUrl = await window.api.getApiBaseUrl()
      const fetchUrl = `${backendUrl}/resources?uri=${encodeURIComponent(url)}`
      
      const res = await fetch(fetchUrl)
      if (res.ok) {
        const blob = await res.blob()
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        processedContent = processedContent.replace(fullMatch, `![${altText}](${base64})`)
      }
    } catch (e) {
      console.error(`Failed to inline image ${url}`, e)
    }
  }

  // Convert to HTML using marked
  const rawHtml = await marked.parse(processedContent)

  // Wrap in a stylish dark/light compatible template
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${note.title || 'Untitled Note'}</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #1a1a1a;
      --border: #e5e5e5;
      --code-bg: #f5f5f5;
      --link: #2563eb;
    }
    
    /* Auto-switch to dark mode for PDF generation if preferred */
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0a0a0a;
        --text: #ededed;
        --border: #262626;
        --code-bg: #171717;
        --link: #60a5fa;
      }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.7;
      color: var(--text);
      background: var(--bg);
      max-width: 850px;
      margin: 0 auto;
      padding: 40px 30px;
    }
    
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
      line-height: 1.25;
    }
    
    h1 { font-size: 2em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
    
    img, svg {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      display: block;
      margin: 1.5em auto;
    }
    
    pre {
      background: var(--code-bg);
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      border: 1px solid var(--border);
    }
    
    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.85em;
      background: var(--code-bg);
      padding: 0.2em 0.4em;
      border-radius: 4px;
    }
    
    pre code {
      background: transparent;
      padding: 0;
      border-radius: 0;
    }
    
    blockquote {
      margin: 1.5em 0;
      padding-left: 1em;
      border-left: 4px solid var(--border);
      color: opacity: 0.8;
      font-style: italic;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1.5em 0;
    }
    
    th, td {
      border: 1px solid var(--border);
      padding: 8px 12px;
      text-align: left;
    }
    
    th {
      background: var(--code-bg);
    }
    
    a {
      color: var(--link);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    
    .task-list-item {
      list-style-type: none;
      margin-left: -1.5em;
    }
    .task-list-item input {
      margin-right: 0.5em;
    }
  </style>
</head>
<body>
  ${rawHtml}
</body>
</html>`

  const safeTitle = (note.title || 'Untitled').replace(/[^\w\s-]/g, '')
  if (format === 'html') {
    await window.api.exportHtml(`${safeTitle}.html`, fullHtml)
  } else {
    await window.api.exportPdf(`${safeTitle}.pdf`, fullHtml)
  }
}
