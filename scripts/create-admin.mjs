import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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

if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'placeholder-key') {
  console.error("❌ ERROR: VITE_FIREBASE_API_KEY is not configured in .env file.");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Allow overriding via CLI args: --email, --password, --fullname
const argv = process.argv.slice(2)
const argMap = {}
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a.startsWith('--')) {
    const key = a.replace(/^--/, '')
    const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : ''
    argMap[key] = val
    if (val) i++
  }
}

const email = argMap.email || 'admin@pricedeskk.com'
const password = argMap.password || 'AdminPriceDesk2026!'
const fullName = argMap.fullname || 'System Administrator'

console.log(`Connecting to Firebase project: ${firebaseConfig.projectId}...`);
console.log(`Attempting to provision admin account: ${email}...`);

let userId = '';

try {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  userId = userCredential.user.uid;
  console.log(`✓ User registered successfully in Auth! UID: ${userId}`);
} catch (error) {
  if (error.code === 'auth/email-already-in-use') {
    console.log(`✓ Email is already registered in Firebase Authentication.`);
    console.log(`Attempting to sign in to retrieve existing UID...`);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      userId = userCredential.user.uid;
      console.log(`✓ Sign-in successful! UID: ${userId}`);
    } catch (signInError) {
      console.error("❌ FAILED to sign in with existing credentials:", signInError.message);
      process.exit(1);
    }
  } else {
    console.error("❌ FAILED to create user in Auth:", error.message);
    process.exit(1);
  }
}

try {
  console.log("Writing user profile document to Firestore '/users' collection...");
  await setDoc(doc(db, 'users', userId), {
    email: email,
    full_name: fullName,
    role: 'admin',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  console.log("\n=================================================");
  console.log(" 🎉 SUCCESS: Admin Account Created Successfully!");
  console.log("=================================================");
  console.log(` Admin Email:    ${email}`);
  console.log(` Admin Password: ${password}`);
  console.log("=================================================\n");
  process.exit(0);
} catch (error) {
  console.error("\n❌ FAILED to create database record in Firestore:", error.message);
  console.log("\n💡 Help: If you get a NOT_FOUND error, please make sure you have clicked 'Create Database' under the 'Firestore Database' tab in the Firebase Console!");
  process.exit(1);
}
