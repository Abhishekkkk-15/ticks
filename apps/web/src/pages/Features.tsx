import { motion } from 'framer-motion'
import { Shield, Zap, CheckCircle2, Cloud, Layout, Pencil } from 'lucide-react'

export function Features() {
  const features = [
    {
      icon: Shield,
      title: 'Local-First Architecture',
      description: 'Your data stays on your machine. Ticks works entirely offline and writes directly to your local file system, ensuring you always own your notes.'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Built with native performance in mind using Electron. Open your workspaces instantly with zero lag, whether you have 10 or 10,000 notes.'
    },
    {
      icon: CheckCircle2,
      title: 'Cozy Aesthetics',
      description: 'Carefully selected typography, syntax highlighting, and warm colors that are easy on the eyes for those late-night writing sessions.'
    },
    {
      icon: Cloud,
      title: 'Dropbox Synchronization',
      description: 'Built-in syncing to Dropbox. Access your notes anywhere by linking your Dropbox account while maintaining the speed of a local app.'
    },
    {
      icon: Layout,
      title: 'Workspace Management',
      description: 'Keep your projects organized. Switch between different workspaces, each acting as an isolated vault for your ideas.'
    },
    {
      icon: Pencil,
      title: 'Excalidraw Integration',
      description: 'Embed drawings right inside your notes or create standalone sketches. Visual thinking is a first-class citizen in Ticks.'
    }
  ]

  return (
    <section className="py-24 px-6 flex-1">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20 space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-stone-100 to-stone-400"
          >
            Everything you need. <br /> Nothing you don't.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-stone-400 max-w-2xl mx-auto"
          >
            Crafted with extreme attention to detail for an unmatched, distraction-free writing experience.
          </motion.p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              key={feature.title} 
              className="p-8 rounded-3xl bg-stone-800/50 border border-stone-700/50 hover:bg-stone-800 transition-colors group"
            >
              <div className="w-14 h-14 rounded-2xl bg-stone-700/50 flex items-center justify-center mb-6 text-stone-200 group-hover:scale-110 transition-transform">
                <feature.icon size={28} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-stone-100">{feature.title}</h3>
              <p className="text-stone-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
