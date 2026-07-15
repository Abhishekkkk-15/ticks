import { Outlet, Link } from 'react-router-dom'
import { Download } from 'lucide-react'

export function Layout() {
  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 font-sans selection:bg-stone-700 flex flex-col">
      <nav className="border-b border-stone-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-stone-200 text-stone-900 flex items-center justify-center font-bold text-xl">
              t
            </div>
            <span className="font-semibold text-lg tracking-tight">Ticks</span>
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link to="/features" className="text-stone-400 hover:text-stone-100 transition-colors">Features</Link>
            <Link to="/docs" className="text-stone-400 hover:text-stone-100 transition-colors">Documentation</Link>
            <Link to="/download" className="bg-stone-200 text-stone-900 px-4 py-2 rounded-full hover:bg-white transition-colors flex items-center gap-2">
              <Download size={16} />
              <span>Get Ticks</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <footer className="border-t border-stone-800 py-12 px-6 text-center text-stone-500 text-sm mt-auto">
        <p>© {new Date().getFullYear()} Ticks. Crafted for focus.</p>
      </footer>
    </div>
  )
}
