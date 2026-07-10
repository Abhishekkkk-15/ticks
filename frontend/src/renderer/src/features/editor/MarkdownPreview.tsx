import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import DrawingEmbed from '../drawings/DrawingEmbed'

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
  return (
    <div className="prose prose-invert h-full max-w-none overflow-auto px-6 py-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        // react-markdown's default urlTransform strips unrecognized URI
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
