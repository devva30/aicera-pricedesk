import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PriceDesk error caught by boundary:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null })
    if (window.location.hash !== '#/dashboard') {
      window.location.hash = '#/dashboard'
    } else {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center bg-background text-foreground rounded-2xl border border-border/60 shadow-xs my-4">
          <div className="h-14 w-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-1 max-w-md">
            <h2 className="text-xl font-bold font-display">Something went wrong</h2>
            <p className="text-xs text-muted-foreground">
              An unexpected error occurred while loading this section.
            </p>
            {this.state.error && (
              <p className="text-[11px] font-mono text-red-500/80 bg-red-50 dark:bg-red-950/30 p-2 rounded border border-red-200 dark:border-red-900 mt-2 text-left overflow-auto max-h-24">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Button size="sm" onClick={this.handleReset} className="h-9 px-4 gap-1.5 text-xs font-semibold">
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </Button>
            <Button size="sm" variant="outline" onClick={this.handleGoHome} className="h-9 px-4 gap-1.5 text-xs font-semibold">
              <Home className="h-3.5 w-3.5" />
              Go to Dashboard
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.location.reload()} className="h-9 px-3 text-xs text-muted-foreground">
              Reload App
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

