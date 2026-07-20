import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, X, Smartphone } from 'lucide-react'
import { usePwaInstall } from '@/hooks/use-pwa-install'

export function InstallBanner() {
  const { canInstall, install } = usePwaInstall()
  const [dismissed, setDismissed] = useState(false)

  if (!canInstall || dismissed) return null

  const handleInstall = async () => {
    const success = await install()
    if (success) {
      setDismissed(true)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
      >
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-indigo-950/80 backdrop-blur-xl p-5 shadow-2xl shadow-violet-950/20 ring-1 ring-white/10 dark:bg-slate-900/90">
          <div className="absolute -left-16 -top-16 w-32 h-32 bg-violet-600/30 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Smartphone className="h-5 w-5" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-slate-100 dark:text-white">
                Install PriceDesk App
              </h3>
              <p className="mt-1 text-xs text-slate-300 dark:text-slate-400 leading-relaxed">
                Add PriceDesk to your home screen for quick offline access, full-screen mode, and native push notifications.
              </p>
              
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleInstall}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-violet-500 active:scale-95 transition-all shadow-lg shadow-violet-600/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  Install Now
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="rounded-lg border border-slate-700 bg-slate-800/50 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white active:scale-95 transition-all"
                >
                  Maybe Later
                </button>
              </div>
            </div>

            <button
              onClick={() => setDismissed(true)}
              className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
