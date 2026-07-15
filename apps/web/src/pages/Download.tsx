import { motion } from 'framer-motion'
import { Download as DownloadIcon, Apple, Monitor } from 'lucide-react'

export function Download() {
  return (
    <section className="py-24 px-6 flex-1 flex flex-col justify-center items-center">
      <div className="max-w-3xl mx-auto text-center space-y-8 mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-stone-100 to-stone-400"
        >
          Get Ticks
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-stone-400"
        >
          Join the early preview. Fast, local-first note-taking available on Linux today.
        </motion.p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
        {/* Linux - Primary */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-8 rounded-3xl bg-stone-800 border-2 border-stone-600 relative overflow-hidden flex flex-col"
        >
          <div className="absolute top-0 right-0 p-3 bg-stone-700 text-xs font-bold tracking-wide rounded-bl-xl text-stone-200">
            CURRENT RELEASE
          </div>
          <div className="w-16 h-16 rounded-2xl bg-stone-700 flex items-center justify-center mb-6 text-stone-200">
            <Monitor size={32} />
          </div>
          <h3 className="text-2xl font-bold mb-2">Linux</h3>
          <p className="text-stone-400 mb-8">AppImage version. Works on Ubuntu, Fedora, Arch, and more.</p>
          
          <button className="mt-auto bg-stone-200 text-stone-900 px-6 py-3 rounded-full font-medium hover:bg-white transition-all flex items-center justify-center gap-2">
            <DownloadIcon size={18} />
            Download AppImage
          </button>
        </motion.div>

        {/* Windows */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-8 rounded-3xl bg-stone-900/50 border border-stone-800 flex flex-col opacity-75"
        >
          <div className="w-16 h-16 rounded-2xl bg-stone-800 flex items-center justify-center mb-6 text-stone-500">
            <Monitor size={32} />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-stone-300">Windows</h3>
          <p className="text-stone-500 mb-8">Coming soon in beta. Currently being optimized for native UI controls.</p>
          
          <button disabled className="mt-auto bg-stone-800 text-stone-500 px-6 py-3 rounded-full font-medium cursor-not-allowed">
            Coming Soon
          </button>
        </motion.div>

        {/* macOS */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-8 rounded-3xl bg-stone-900/50 border border-stone-800 flex flex-col opacity-75"
        >
          <div className="w-16 h-16 rounded-2xl bg-stone-800 flex items-center justify-center mb-6 text-stone-500">
            <Apple size={32} />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-stone-300">macOS</h3>
          <p className="text-stone-500 mb-8">Coming soon. Universal build for Apple Silicon and Intel.</p>
          
          <button disabled className="mt-auto bg-stone-800 text-stone-500 px-6 py-3 rounded-full font-medium cursor-not-allowed">
            Coming Soon
          </button>
        </motion.div>
      </div>
    </section>
  )
}
