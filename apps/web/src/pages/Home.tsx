import { motion } from 'framer-motion'
import { Download, BookOpen, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Home() {
  return (
    <>
      <section className="pt-32 pb-20 px-6 relative overflow-hidden flex-1 flex flex-col justify-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-stone-800/30 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-stone-100 to-stone-400"
          >
            Your cozy corner <br /> for thoughts.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-stone-400 max-w-xl mx-auto leading-relaxed"
          >
            A beautifully crafted, local-first note-taking application designed to bring peace to your workflow.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-4 pt-4"
          >
            <Link to="/download" className="bg-stone-200 text-stone-900 px-8 py-3.5 rounded-full font-medium hover:bg-white transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 group shadow-xl shadow-white/5">
              <Download size={18} />
              Download Ticks
            </Link>
            <Link to="/docs" className="px-8 py-3.5 rounded-full font-medium border border-stone-700 hover:bg-stone-800 transition-all flex items-center gap-2 group">
              <BookOpen size={18} className="text-stone-400 group-hover:text-stone-200 transition-colors" />
              Read the Docs
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Quick Docs Promo on Home */}
      <section className="py-24 px-6 border-t border-stone-800/50 bg-stone-900/50 mt-auto">
        <div className="max-w-4xl mx-auto bg-stone-800 rounded-3xl p-8 md:p-12 border border-stone-700 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-stone-700 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
              <h2 className="text-3xl font-semibold">Ready to master your workflow?</h2>
              <p className="text-stone-400 max-w-md">
                Dive into our comprehensive documentation. Learn keyboard shortcuts, markdown tricks, and how to set up Dropbox sync.
              </p>
            </div>
            <Link to="/docs" className="shrink-0 bg-stone-200 text-stone-900 px-6 py-3 rounded-full font-medium hover:bg-white transition-all flex items-center gap-2 group">
              Go to Documentation
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
