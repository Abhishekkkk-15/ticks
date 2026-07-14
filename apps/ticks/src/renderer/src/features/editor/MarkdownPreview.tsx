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
  onChange?: (value: string) => void
}

const DRAWING_SCHEME = 'drawing://'
const NOTE_SCHEME = 'note://'

function MarkdownPreview({
  content,
  workspaceId,
  noteId,
  onChange
}: MarkdownPreviewProps): React.JSX.Element {
  const { settings } = useSettings()
  const isLight = isLightTheme(settings?.theme)
  const proseClass = isLight ? 'prose' : 'prose-invert'

  return (
    <div className={`${proseClass} prose h-full max-w-none overflow-auto px-6 py-4`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        urlTransform={(url) =>
          url.startsWith(DRAWING_SCHEME) || url.startsWith(NOTE_SCHEME)
            ? url
            : defaultUrlTransform(url)
        }
        components={{
          input: ({ node, checked, type, disabled, ...props }) => {
            if (type === 'checkbox') {
              return (
                <input
                  {...props}
                  type="checkbox"
                  checked={checked}
                  disabled={!onChange}
                  onChange={(e) => {
                    if (!onChange || !node?.position) return
                    const isChecked = e.target.checked
                    const lineIndex = node.position.start.line - 1
                    const lines = content.split('\n')
                    const line = lines[lineIndex]
                    if (line !== undefined) {
                      if (isChecked) {
                        lines[lineIndex] = line.replace(/\[ \]/, '[x]')
                      } else {
                        lines[lineIndex] = line.replace(/\[[xX]\]/, '[ ]')
                      }
                      onChange(lines.join('\n'))
                    }
                  }}
                  className={onChange ? 'cursor-pointer' : ''}
                />
              )
            }
            return <input type={type} checked={checked} disabled={disabled} {...props} />
          },
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
          },
          a: ({ href, children }) => {
            if (typeof href === 'string' && href.startsWith(NOTE_SCHEME)) {
              const targetNoteId = href.slice(NOTE_SCHEME.length)
              return (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    window.dispatchEvent(
                      new CustomEvent('note:open', {
                        detail: { workspaceId, noteId: targetNoteId }
                      })
                    )
                  }}
                  className="text-amber-500 hover:text-amber-400 font-semibold underline cursor-pointer"
                >
                  {children}
                </a>
              )
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownPreview
