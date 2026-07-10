import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import DrawingEmbed from '../drawings/DrawingEmbed'
import { useSettings } from '../settings/SettingsContext'
import { isLightTheme } from '../settings/themeUtils'

interface MarkdownPreviewProps {
  content: string
  workspaceId: string
  noteId: string
}

const DRAWING_SCHEME = 'drawing://'

function MarkdownPreview({
  content,
  workspaceId,
  noteId
}: MarkdownPreviewProps): React.JSX.Element {
  const { settings } = useSettings()
  const isLight = isLightTheme(settings?.theme)
  const proseClass = isLight ? 'prose' : 'prose-invert'

  return (
    <div className={`${proseClass} prose h-full max-w-none overflow-auto px-6 py-4`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        // react-markdown's default urlTransform strips unrecognised URI
        // schemes (XSS hardening) — drawing:// embeds need an exception.
        urlTransform={(url) => (url.startsWith(DRAWING_SCHEME) ? url : defaultUrlTransform(url))}
        components={{
          img: ({ src, alt }) => {
            if (typeof src === 'string' && src.startsWith(DRAWING_SCHEME)) {
              return (
                <DrawingEmbed
                  workspaceId={workspaceId}
                  noteId={noteId}
                  drawingId={src.slice(DRAWING_SCHEME.length)}
                  title={alt || 'Drawing'}
                />
              )
            }
            return <img src={src} alt={alt} />
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownPreview
