import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Smartphone, Monitor, Apple, Globe, Share2, PlusSquare, MoreVertical, Download } from 'lucide-react'
import { usePwaInstall } from '@/hooks/use-pwa-install'

type DeviceTab = 'android' | 'ios' | 'desktop'

interface InstallGuideProps {
  open: boolean
  onClose: () => void
}

export function InstallGuide({ open, onClose }: InstallGuideProps) {
  const [activeTab, setActiveTab] = useState<DeviceTab>('android')
  const { canInstall, install, isInstalled } = usePwaInstall()

  const tabs: { id: DeviceTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'android', label: 'Android', icon: Smartphone },
    { id: 'ios', label: 'iPhone', icon: Apple },
    { id: 'desktop', label: 'Desktop', icon: Monitor },
  ]

  const steps: Record<DeviceTab, { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }[]> = {
    android: [
      { icon: Globe, title: 'Open in Chrome', desc: 'Make sure you are viewing this page in Google Chrome on your Android phone.' },
      { icon: MoreVertical, title: 'Tap the menu (⋮)', desc: 'Tap the three-dot menu at the top-right corner of Chrome.' },
      { icon: Download, title: 'Tap "Add to Home Screen"', desc: 'Select "Add to Home Screen" or "Install App" from the menu.' },
      { icon: Smartphone, title: 'Done!', desc: 'PriceDesk icon will appear on your home screen just like any other app.' },
    ],
    ios: [
      { icon: Share2, title: 'Tap the Share button', desc: 'Open this page in Safari and tap the Share icon (box with arrow) at the bottom of the screen.' },
      { icon: PlusSquare, title: 'Tap "Add to Home Screen"', desc: 'Scroll down in the share sheet and tap "Add to Home Screen".' },
      { icon: Smartphone, title: 'Confirm & Add', desc: 'Tap "Add" in the top-right corner to confirm.' },
      { icon: Smartphone, title: 'Done!', desc: 'PriceDesk icon will appear on your iPhone home screen.' },
    ],
    desktop: [
      { icon: Globe, title: 'Open in Chrome or Edge', desc: 'Make sure you are using Google Chrome or Microsoft Edge on your computer.' },
      { icon: Download, title: 'Click the Install icon', desc: 'Look for a small install icon (⊕ or computer icon) in the address bar on the right side.' },
      { icon: Monitor, title: 'Click "Install"', desc: 'A dialog will appear — click the "Install" button to confirm.' },
      { icon: Monitor, title: 'Done!', desc: 'PriceDesk will open as its own window and appear in your taskbar and Start menu.' },
    ],
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl">

              {/* Header */}
              <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-6 pb-5">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                      <img
                        src="https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png"
                        alt="PriceDesk"
                        className="h-7 w-7 rounded object-contain"
                      />
                    </div>
                    <div>
                      <h2 className="font-bold text-white text-base leading-tight">Install PriceDesk</h2>
                      <p className="text-xs text-white/70 mt-0.5">Add to your device for quick access</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* One-click install for supported browsers */}
                {canInstall && (
                  <button
                    onClick={async () => { await install(); onClose() }}
                    className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-violet-700 hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg"
                  >
                    <Download className="h-4 w-4" />
                    Install Now — One Click
                  </button>
                )}

                {isInstalled && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-500/20 border border-green-400/30 px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-green-400" />
                    <p className="text-xs text-green-200 font-medium">PriceDesk is already installed on this device</p>
                  </div>
                )}
              </div>

              {/* Manual instructions */}
              <div className="p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  Manual Installation Guide
                </p>

                {/* Device Tabs */}
                <div className="flex gap-1 rounded-xl bg-muted/40 p-1 mb-5">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Steps */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    {steps[activeTab].map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 border border-violet-500/20">
                          <span className="text-[11px] font-bold text-violet-500">{i + 1}</span>
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-sm font-semibold text-foreground leading-tight">{step.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="border-t border-border/50 px-5 py-3 bg-muted/20">
                <p className="text-[11px] text-muted-foreground text-center">
                  If you uninstall, just visit the website again and repeat these steps.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
