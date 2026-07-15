import { motion } from 'framer-motion'
import { Download, BookOpen, ChevronRight, CheckCircle2, Shield, Zap } from 'lucide-react'

function App() {
  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 font-sans selection:bg-stone-700">
      {/* Navigation */}
      <nav className="border-b border-stone-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-stone-200 text-stone-900 flex items-center justify-center font-bold text-xl">
              t
            </div>
            <span className="font-semibold text-lg tracking-tight">Ticks</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <a href="#features" className="text-stone-400 hover:text-stone-100 transition-colors">Features</a>
            <a href="#docs" className="text-stone-400 hover:text-stone-100 transition-colors">Documentation</a>
            <a href="#download" className="bg-stone-200 text-stone-900 px-4 py-2 rounded-full hover:bg-white transition-colors flex items-center gap-2">
              <Download size={16} />
              <span>Get Ticks</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <section className="pt-32 pb-20 px-6 relative overflow-hidden">
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
              <button className="bg-stone-200 text-stone-900 px-8 py-3.5 rounded-full font-medium hover:bg-white transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 group shadow-xl shadow-white/5">
                <Download size={18} />
                Download for Linux
              </button>
              <button className="px-8 py-3.5 rounded-full font-medium border border-stone-700 hover:bg-stone-800 transition-all flex items-center gap-2 group">
                <BookOpen size={18} className="text-stone-400 group-hover:text-stone-200 transition-colors" />
                Read the Docs
              </button>
            </motion.div>
          </div>
        </section>

        {/* Features Preview */}
        <section id="features" className="py-24 px-6 border-t border-stone-800/50 bg-stone-900/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl font-semibold">Everything you need, nothing you don't.</h2>
              <p className="text-stone-400">Crafted with attention to detail for an unmatched writing experience.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Shield,
                  title: 'Local-First',
                  description: 'Your data stays on your machine. Fast, secure, and available offline by default.'
                },
                {
                  icon: Zap,
                  title: 'Lightning Fast',
                  description: 'Built with native performance in mind. Open your notes instantly, zero lag.'
                },
                {
                  icon: CheckCircle2,
                  title: 'Cozy Aesthetics',
                  description: 'Carefully selected typography and warm colors that are easy on the eyes.'
                }
              ].map((feature, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  key={feature.title} 
                  className="p-6 rounded-2xl bg-stone-800/50 border border-stone-700/50 hover:bg-stone-800 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-stone-700/50 flex items-center justify-center mb-6 text-stone-200">
                    <feature.icon size={24} />
                  </div>
                  <h3 className="text-xl font-medium mb-3">{feature.title}</h3>
                  <p className="text-stone-400 leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Docs Promo */}
        <section id="docs" className="py-24 px-6">
          <div className="max-w-4xl mx-auto bg-stone-800 rounded-3xl p-8 md:p-12 border border-stone-700 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-stone-700 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 text-center md:text-left">
                <h2 className="text-3xl font-semibold">Master your workflow</h2>
                <p className="text-stone-400 max-w-md">
                  Dive into our comprehensive documentation. Learn keyboard shortcuts, markdown tricks, and how to set up Dropbox sync.
                </p>
              </div>
              <button className="shrink-0 bg-stone-200 text-stone-900 px-6 py-3 rounded-full font-medium hover:bg-white transition-all flex items-center gap-2 group">
                Go to Documentation
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800 py-12 px-6 text-center text-stone-500 text-sm">
        <p>© {new Date().getFullYear()} Ticks. Crafted for focus.</p>
      </footer>
    </div>
  )
}

export default App
