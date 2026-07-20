import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("--- PRINTING ALL DEALS DETAILS ---");
  const dealsCol = collection(db, 'deals');
  const snap = await getDocs(dealsCol);
  snap.forEach((doc) => {
    console.log(`Deal ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
    console.log("--------------------------------");
  });
  
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
