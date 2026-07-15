import { motion } from 'framer-motion'

export function Docs() {
  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex gap-12">
      {/* Sidebar Navigation */}
      <aside className="w-64 shrink-0 hidden md:block">
        <div className="sticky top-24 space-y-8">
          <div>
            <h4 className="font-semibold text-stone-100 mb-3">Getting Started</h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li><a href="#installation" className="hover:text-stone-200 transition-colors">Installation</a></li>
              <li><a href="#workspaces" className="hover:text-stone-200 transition-colors">Creating Workspaces</a></li>
              <li><a href="#sync" className="hover:text-stone-200 transition-colors">Dropbox Sync</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-stone-100 mb-3">Editor</h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li><a href="#markdown" className="hover:text-stone-200 transition-colors">Markdown Guide</a></li>
              <li><a href="#shortcuts" className="hover:text-stone-200 transition-colors">Keyboard Shortcuts</a></li>
              <li><a href="#drawings" className="hover:text-stone-200 transition-colors">Excalidraw integration</a></li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <motion.article 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 prose prose-invert prose-stone max-w-none"
      >
        <h1 className="text-4xl font-bold tracking-tight mb-8">Documentation</h1>
        
        <section id="installation" className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-stone-200 border-b border-stone-800 pb-2">Installation</h2>
          <p className="text-stone-400 leading-relaxed mb-4">
            Ticks is currently distributed as an AppImage for Linux, making it simple to install and run without dependency issues.
          </p>
          <div className="bg-stone-800 p-4 rounded-xl font-mono text-sm mb-4">
            chmod +x Ticks-0.1.0.AppImage<br />
            ./Ticks-0.1.0.AppImage
          </div>
          <p className="text-stone-400">Windows and macOS versions are in active development.</p>
        </section>

        <section id="workspaces" className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-stone-200 border-b border-stone-800 pb-2">Workspaces</h2>
          <p className="text-stone-400 leading-relaxed mb-4">
            Unlike traditional apps, Ticks uses a "Workspace" model. A workspace is a folder on your computer where all notes, drawings, and metadata are saved locally. You can have unlimited workspaces.
          </p>
          <ul className="list-disc pl-6 text-stone-400 space-y-2">
            <li>Open the app and click "New Workspace".</li>
            <li>Select an empty folder on your hard drive.</li>
            <li>All data inside the app will now be saved in that folder directly.</li>
          </ul>
        </section>

        <section id="sync" className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-stone-200 border-b border-stone-800 pb-2">Dropbox Sync</h2>
          <p className="text-stone-400 leading-relaxed mb-4">
            Because Ticks is local-first, syncing relies on connecting to a cloud provider securely.
          </p>
          <ol className="list-decimal pl-6 text-stone-400 space-y-2">
            <li>Go to the Settings menu (gear icon).</li>
            <li>Select the <strong>Sync</strong> tab.</li>
            <li>Click <strong>Connect to Dropbox</strong> and authorize the application.</li>
            <li>Once authorized, Ticks will seamlessly sync changes up to your Dropbox in real-time.</li>
          </ol>
        </section>
        
        <section id="markdown" className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-stone-200 border-b border-stone-800 pb-2">Markdown Editor</h2>
          <p className="text-stone-400 leading-relaxed mb-4">
            Our editor supports standard GitHub-flavored Markdown. It includes live preview panels and seamless HTML rendering out of the box. Simply use double backticks for code highlighting, or standard markdown shortcuts (like <code>#</code> for headings).
          </p>
        </section>
      </motion.article>
    </div>
  )
}
