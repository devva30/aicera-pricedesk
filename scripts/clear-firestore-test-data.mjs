import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore'
import dotenv from 'dotenv'

dotenv.config()

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const COLLECTIONS_TO_CLEAR = [
  'deal_audit',
  'deals',
  'quotes',
  'orders',
  'notifications',
  'sales_targets',
  'customers',
  'invites',
  'password_resets',
]

async function clearTestData() {
  console.log('🚀 Batch clearing test data from Firestore (EXCEPT users collection)...')

  for (const collName of COLLECTIONS_TO_CLEAR) {
    try {
      const colRef = collection(db, collName)
      const snap = await getDocs(colRef)
      console.log(`Collection: ${collName} (${snap.size} docs)`)
      
      if (snap.empty) continue

      let batch = writeBatch(db)
      let count = 0

      for (const docSnap of snap.docs) {
        batch.delete(doc(db, collName, docSnap.id))
        count++
        if (count % 400 === 0) {
          await batch.commit()
          batch = writeBatch(db)
        }
      }
      await batch.commit()
      console.log(`  ✓ Successfully deleted ${snap.size} documents from '${collName}'`)
    } catch (err) {
      console.error(`  ✕ Error clearing collection '${collName}':`, err.message || err)
    }
  }

  console.log('🎉 Done! All dummy/test data has been cleared from Firestore. Users collection remains intact.')
  process.exit(0)
}

clearTestData().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
