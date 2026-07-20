import type { SalesTarget, SalesSettings, UserRole } from '@/types'
import { DEFAULT_SALES_SETTINGS } from '@/types'
import { useAuthStore } from '@/stores/auth-store'
import { db } from '@/lib/firebase'
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore'

// ─── Storage keys ─────────────────────────────────────────────────────────────

const TARGETS_KEY = 'pricedesk_sales_targets'
const SETTINGS_KEY = 'pricedesk_sales_settings'

// ─── One-time migration: clear stale hardcoded mock targets ───────────────────
// Old targets had fake IDs or placeholder amounts. Remove them on load.
export function clearStaleMockTargets(): void {
  try {
    const raw = localStorage.getItem(TARGETS_KEY)
    if (!raw) return
    const targets: SalesTarget[] = JSON.parse(raw)
    const staleIds = ['target-1', 'target-2', 'target-3']
    if (targets.some((t) => staleIds.includes(t.id) || t.topline_target === 25000000)) {
      localStorage.removeItem(TARGETS_KEY)
    }
  } catch {
    localStorage.removeItem(TARGETS_KEY)
  }
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

let memoryTargetsCache: SalesTarget[] | null = null
let memorySettingsCache: SalesSettings | null = null

function getMockTargets(): SalesTarget[] {
  if (memoryTargetsCache) return memoryTargetsCache
  try {
    const raw = localStorage.getItem(TARGETS_KEY)
    if (!raw) {
      const defaults: SalesTarget[] = [
        {
          id: 'target-arjun',
          salesperson_id: 'demo-sales',
          salesperson_name: 'Arjun Mehta',
          topline_target: 15000000,
          financial_year: 'FY 2026-27',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'target-kavita',
          salesperson_id: 'demo-sales-2',
          salesperson_name: 'Kavita Reddy',
          topline_target: 20000000,
          financial_year: 'FY 2026-27',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'target-rohan',
          salesperson_id: 'demo-sales-3',
          salesperson_name: 'Rohan Verma',
          topline_target: 25000000,
          financial_year: 'FY 2026-27',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
      localStorage.setItem(TARGETS_KEY, JSON.stringify(defaults))
      memoryTargetsCache = defaults
      return defaults
    }
    const parsed = JSON.parse(raw)
    memoryTargetsCache = parsed
    return parsed
  } catch (e) {
    console.error('Failed to load targets from localStorage:', e)
    return []
  }
}

function saveMockTargets(targets: SalesTarget[]) {
  memoryTargetsCache = targets
  try {
    localStorage.setItem(TARGETS_KEY, JSON.stringify(targets))
  } catch (e) {
    console.error('Failed to save targets to localStorage:', e)
  }
}

// ─── Settings (always localStorage — admin config) ────────────────────────────

export function fetchSettings(): SalesSettings {
  if (memorySettingsCache) return memorySettingsCache
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    const settings = raw ? { ...DEFAULT_SALES_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SALES_SETTINGS }
    memorySettingsCache = settings
    return settings
  } catch {
    return { ...DEFAULT_SALES_SETTINGS }
  }
}

export function saveSettings(settings: SalesSettings): void {
  memorySettingsCache = settings
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

// ─── Targets CRUD ─────────────────────────────────────────────────────────────

export async function fetchTargets(_role?: UserRole): Promise<SalesTarget[]> {
  const isDemo = useAuthStore.getState().isDemo

  if (isDemo) {
    return getMockTargets()
  }

  try {
    const snap = await getDocs(collection(db, 'sales_targets'))
    const list: SalesTarget[] = []
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as SalesTarget))
    return list
  } catch (e) {
    console.error('Failed to fetch targets from Firestore:', e)
    return []
  }
}

export async function saveTarget(target: Omit<SalesTarget, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<SalesTarget> {
  const isDemo = useAuthStore.getState().isDemo
  const id = target.id || `target-${Date.now()}`
  const now = new Date().toISOString()

  const newTarget: SalesTarget = {
    ...target,
    id,
    created_at: now,
    updated_at: now,
  }

  if (isDemo) {
    const list = getMockTargets()
    const idx = list.findIndex((t) => t.id === id)
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...newTarget, updated_at: now }
    } else {
      list.push(newTarget)
    }
    saveMockTargets(list)
    return newTarget
  }

  try {
    await setDoc(doc(db, 'sales_targets', id), newTarget)
    return newTarget
  } catch (e) {
    console.error('Failed to save target to Firestore:', e)
    throw e
  }
}

export async function deleteTarget(id: string): Promise<void> {
  const isDemo = useAuthStore.getState().isDemo

  if (isDemo) {
    const list = getMockTargets().filter((t) => t.id !== id)
    saveMockTargets(list)
    return
  }

  try {
    await deleteDoc(doc(db, 'sales_targets', id))
  } catch (e) {
    console.error('Failed to delete target from Firestore:', e)
    throw e
  }
}
