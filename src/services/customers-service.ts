import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth-store'
import { MOCK_CUSTOMERS, persistMockCustomers, type Customer } from '@/lib/mock-data'

export async function fetchCustomers(): Promise<Customer[]> {
  if (useAuthStore.getState().isDemo) {
    return [...MOCK_CUSTOMERS]
  }
  
  const colRef = collection(db, 'customers')
  const snap = await getDocs(colRef)
  const list: Customer[] = []
  snap.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() } as Customer)
  })
  return list
}

export async function saveCustomer(customer: Customer): Promise<Customer> {
  if (useAuthStore.getState().isDemo) {
    const idx = MOCK_CUSTOMERS.findIndex(c => c.id === customer.id)
    if (idx !== -1) {
      MOCK_CUSTOMERS[idx] = customer
    } else {
      MOCK_CUSTOMERS.push(customer)
    }
    persistMockCustomers()
    return customer
  }
  
  await setDoc(doc(db, 'customers', customer.id), {
    name: customer.name,
    created_at: customer.created_at || new Date().toISOString()
  })
  return customer
}

export async function deleteCustomer(id: string): Promise<void> {
  if (useAuthStore.getState().isDemo) {
    const idx = MOCK_CUSTOMERS.findIndex(c => c.id === id)
    if (idx !== -1) {
      MOCK_CUSTOMERS.splice(idx, 1)
    }
    persistMockCustomers()
    return
  }
  
  await deleteDoc(doc(db, 'customers', id))
}
