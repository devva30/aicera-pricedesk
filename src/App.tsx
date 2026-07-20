import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import { Provider } from 'react-redux'
import { App as CapApp } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import { isNative } from '@/lib/capacitor'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AppLayout } from '@/components/layout/app-layout'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { LoginPage } from '@/pages/auth/login-page'
import { SignupPage } from '@/pages/auth/signup-page'
import { AcceptInvitePage } from '@/pages/auth/accept-invite-page'
import { ForgotPasswordPage } from '@/pages/auth/forgot-password-page'
import { ResetPasswordPage } from '@/pages/auth/reset-password-page'
import { DashboardPage } from '@/pages/dashboard/dashboard-page'
import { DealsListPage } from '@/pages/deals/deals-list-page'
import { DealNewPage } from '@/pages/deals/deal-new-page'
import { DealDetailPage } from '@/pages/deals/deal-detail-page'
import { DealEditPage } from '@/pages/deals/deal-edit-page'
import { OrdersListPage } from '@/pages/orders/orders-list-page'
import { OrderNewPage } from '@/pages/orders/order-new-page'
import { OrderDetailPage } from '@/pages/orders/order-detail-page'
import { DeliveryChallansPage } from '@/pages/orders/delivery-challans-page'
import { QueuePage } from '@/pages/queue/queue-page'
import { AdminUsersPage } from '@/pages/admin/admin-users-page'
import { AdminSettingsPage } from '@/pages/admin/admin-settings-page'
import { AdminAnalyticsPage } from '@/pages/admin/admin-analytics-page'
import { AuditLogPage } from '@/pages/admin/audit-log-page'
import { AdminToolsPage } from '@/pages/admin/admin-tools'
import { AdminTargetsPage } from '@/pages/admin/admin-targets-page'
import { ProfilePage } from '@/pages/auth/profile-page'
import { IncentivePage } from '@/pages/incentive/incentive-page'
import { QuotesPage } from '@/pages/quotes/quotes-page'
import { QuoteNewPage } from '@/pages/quotes/quote-new-page'
import { ReportsPage } from '@/pages/reports/reports-page'
import { useAuthStore } from '@/stores/auth-store'
import { useThemeStore } from '@/stores/theme-store'
import { store } from '@/store'
import { Toaster } from 'sonner'
import 'sonner/dist/styles.css'
import { PWAUpdatePrompt } from '@/components/pwa/pwa-update-prompt'

function AppRoutes() {
  const initialize = useAuthStore((s) => s.initialize)
  const applyTheme = useThemeStore((s) => s.applyTheme)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    initialize()
    applyTheme()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [initialize, applyTheme])

  useEffect(() => {
    if (user && user.id) {
      import('@/services/notifications')
        .then((mod) => {
          mod.registerPushNotifications(user.id).catch(console.error)
        })
        .catch((err) => console.error('Failed to import notifications service', err))
    }
  }, [user])

  useEffect(() => {
    if (isNative) {
      SplashScreen.hide().catch(console.warn)

      const backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
        if (location.pathname === '/dashboard' || location.pathname === '/login' || !canGoBack) {
          CapApp.exitApp()
        } else {
          navigate(-1)
        }
      })

      return () => {
        backListener.then((l) => l.remove())
      }
    }
  }, [navigate, location])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/login/*" element={<Navigate to="/login" replace />} />
      <Route path="/admin-login" element={<Navigate to="/login" replace />} />
      <Route path="/sales-rep-login" element={<Navigate to="/login" replace />} />
      <Route path="/finance-login" element={<Navigate to="/login" replace />} />
      <Route path="/technical-login" element={<Navigate to="/login" replace />} />
      <Route path="/sales-head-login" element={<Navigate to="/login" replace />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="deals" element={<DealsListPage />} />
        <Route
          path="deals/new"
          element={
            <ProtectedRoute roles={['sales_rep', 'admin']}>
              <DealNewPage />
            </ProtectedRoute>
          }
        />
        <Route path="deals/:id" element={<DealDetailPage />} />
        <Route
          path="deals/:id/edit"
          element={
            <ProtectedRoute roles={['sales_rep', 'admin']}>
              <DealEditPage />
            </ProtectedRoute>
          }
        />
        <Route path="quotes/:id" element={<DealDetailPage />} />
        <Route
          path="quotes/:id/edit"
          element={
            <ProtectedRoute roles={['sales_rep', 'admin']}>
              <QuoteNewPage />
            </ProtectedRoute>
          }
        />

        {/* Orders Routes */}
        <Route
          path="orders"
          element={
            <ProtectedRoute roles={['sales_rep', 'finance', 'sales_head', 'ops', 'admin']}>
              <OrdersListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/new"
          element={
            <ProtectedRoute roles={['sales_rep', 'finance', 'admin']}>
              <OrderNewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/challans"
          element={
            <ProtectedRoute roles={['sales_rep', 'finance', 'sales_head', 'ops', 'admin']}>
              <DeliveryChallansPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:id"
          element={
            <ProtectedRoute roles={['sales_rep', 'finance', 'sales_head', 'ops', 'admin']}>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="queue/technical"
          element={
            <ProtectedRoute roles={['technical', 'admin']}>
              <QueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="queue/finance"
          element={
            <ProtectedRoute roles={['finance', 'admin']}>
              <QueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="queue/sales-head"
          element={
            <ProtectedRoute roles={['sales_head', 'admin']}>
              <QueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="incentive"
          element={
            <ProtectedRoute roles={['sales_rep', 'sales_head', 'admin', 'ops']}>
              <IncentivePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute roles={['sales_rep', 'sales_head', 'admin', 'ops']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="quotes"
          element={
            <ProtectedRoute roles={['sales_rep', 'sales_head', 'admin']}>
              <QuotesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="quotes/new"
          element={
            <ProtectedRoute roles={['sales_rep', 'admin']}>
              <QuoteNewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/audit"
          element={
            <ProtectedRoute roles={['admin']}>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/settings"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/analytics"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/tools"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminToolsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/targets"
          element={
            <ProtectedRoute roles={['admin', 'sales_head']}>
              <AdminTargetsPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

import { OfflineIndicator } from '@/components/pwa/offline-indicator'

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PWAUpdatePrompt />
        <HashRouter>
          <AppRoutes />
          <OfflineIndicator />
          <Toaster richColors position="top-right" duration={1500} />
        </HashRouter>
      </Provider>
    </ErrorBoundary>
  )
}
