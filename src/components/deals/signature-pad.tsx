import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PenTool, Type, Eraser } from 'lucide-react'

interface SignaturePadProps {
  isOpen: boolean
  onClose: () => void
  onSave: (signatureBase64: string) => void
}

export function SignaturePad({ isOpen, onClose, onSave }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [typedName, setTypedName] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('font-signature-1')
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>('draw')

  // Setup canvas settings when the canvas mounts
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
  }, [activeTab, isOpen])

  // Get canvas coordinates relative to element
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 }
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }
  }

  // Draw handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const coords = getCoordinates(e)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(coords.x, coords.y)
      setIsDrawing(true)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    const coords = getCoordinates(e)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  // Save Signature
  const handleSave = () => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current
      if (canvas) {
        // Check if canvas is blank
        const blank = document.createElement('canvas')
        blank.width = canvas.width
        blank.height = canvas.height
        
        if (canvas.toDataURL() === blank.toDataURL()) {
          // Canvas is blank
          onClose()
          return
        }

        const dataUrl = canvas.toDataURL('image/png')
        onSave(dataUrl)
      }
    } else {
      if (!typedName.trim()) {
        onClose()
        return
      }

      // Render the text onto a temporary canvas to get a Base64 image
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 150
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#000000'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Apply cursive fonts based on style selection
        let fontName = 'cursive'
        if (selectedStyle === 'font-signature-1') {
          fontName = '"Brush Script MT", cursive'
        } else if (selectedStyle === 'font-signature-2') {
          fontName = '"Lucida Handwriting", cursive'
        } else if (selectedStyle === 'font-signature-3') {
          fontName = 'Georgia, serif'
        }

        ctx.font = `italic 36px ${fontName}`
        ctx.fillText(typedName, canvas.width / 2, canvas.height / 2)
        onSave(canvas.toDataURL('image/png'))
      }
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle>Sign Document</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Provide your digital signature. This signature will be embedded onto the generated commercial proposal quote.
          </p>
        </DialogHeader>

        <div className="w-full mt-4 space-y-4">
          {/* Custom Tabs List */}
          <div className="flex border-b border-border/60 pb-1 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('draw')}
              className={`flex items-center gap-1.5 pb-2 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'draw'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <PenTool className="h-3.5 w-3.5" /> Draw Signature
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('type')}
              className={`flex items-center gap-1.5 pb-2 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'type'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Type className="h-3.5 w-3.5" /> Type Signature
            </button>
          </div>

          {/* Draw Signature Tab Content */}
          {activeTab === 'draw' && (
            <div className="space-y-4">
              <div className="border border-border/80 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-900 relative">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="w-full h-[150px] cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearCanvas}
                  className="absolute right-2 top-2 h-7 w-7 rounded-full bg-white dark:bg-zinc-800 border shadow-sm"
                >
                  <Eraser className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">Draw inside the box using your mouse, trackpad, or touch screen.</p>
            </div>
          )}

          {/* Type Signature Tab Content */}
          {activeTab === 'type' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Input
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Enter your full name"
                  maxLength={40}
                  className="h-10 text-sm animate-in fade-in-50"
                />
              </div>

              {/* Preview with style selectors */}
              {typedName && (
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-muted-foreground">Select Signature Font Style</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'font-signature-1', fontClass: 'font-["Brush_Script_MT",cursive] italic text-2xl', label: 'Cursive 1' },
                      { id: 'font-signature-2', fontClass: 'font-["Lucida_Handwriting",cursive] text-lg', label: 'Cursive 2' },
                      { id: 'font-signature-3', fontClass: 'font-[Georgia,serif] italic text-xl', label: 'Elegant Serif' },
                    ].map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setSelectedStyle(style.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center h-20 transition-all ${
                          selectedStyle === style.id
                            ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary'
                            : 'border-border/60 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <span className={`${style.fontClass} truncate max-w-full text-foreground`}>
                          {typedName}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="h-9 text-xs">
            Cancel
          </Button>
          <Button onClick={handleSave} className="h-9 text-xs">
            Apply Signature
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
