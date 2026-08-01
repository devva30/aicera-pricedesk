import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Deal, DealStatus } from '@/types'

interface DealsState {
  deals: Deal[]
  selectedDeal: Deal | null
  isLoading: boolean
  filter: {
    status: DealStatus | 'all'
    search: string
  }
}

const initialState: DealsState = {
  deals: [],
  selectedDeal: null,
  isLoading: false,
  filter: { status: 'all', search: '' },
}

const dealsSlice = createSlice({
  name: 'deals',
  initialState,
  reducers: {
    setDeals: (state, action: PayloadAction<Deal[]>) => {
      const incoming = action.payload || []
      const incomingIds = new Set(incoming.map((d) => d.id))
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000

      // Preserve locally added deals created/updated in the last 10 minutes
      // so asynchronous background fetches don't wipe out freshly created items
      const recentLocalDeals = state.deals.filter((d) => {
        if (incomingIds.has(d.id)) return false
        const time = new Date(d.created_at || d.updated_at || Date.now()).getTime()
        return time > tenMinutesAgo
      })

      state.deals = [...recentLocalDeals, ...incoming]
    },
    setSelectedDeal: (state, action: PayloadAction<Deal | null>) => {
      state.selectedDeal = action.payload
    },
    updateDeal: (state, action: PayloadAction<Deal>) => {
      state.deals = state.deals.map((d) =>
        d.id === action.payload.id ? action.payload : d
      )
      if (state.selectedDeal?.id === action.payload.id) {
        state.selectedDeal = action.payload
      }
    },
    addDeal: (state, action: PayloadAction<Deal>) => {
      state.deals = [action.payload, ...state.deals]
    },
    removeDeal: (state, action: PayloadAction<string>) => {
      state.deals = state.deals.filter((d) => d.id !== action.payload)
      if (state.selectedDeal?.id === action.payload) {
        state.selectedDeal = null
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setFilter: (
      state,
      action: PayloadAction<Partial<DealsState['filter']>>
    ) => {
      state.filter = { ...state.filter, ...action.payload }
    },
  },
})

export const {
  setDeals,
  setSelectedDeal,
  updateDeal,
  addDeal,
  removeDeal,
  setLoading,
  setFilter,
} = dealsSlice.actions
export default dealsSlice.reducer
