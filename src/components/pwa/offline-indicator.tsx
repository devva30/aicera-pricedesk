import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useNetwork } from '@/hooks/use-network'

export function OfflineIndicator() {
  const { isOnline } = useNetwork()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/90 px-4 py-1.5 shadow-lg shadow-red-950/50 backdrop-blur-md"
        >
          <WifiOff className="h-4 w-4 text-red-400 animate-pulse" />
          <span className="text-xs font-medium text-red-200">
            Offline Mode — Read-Only
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
