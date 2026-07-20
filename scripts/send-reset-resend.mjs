import fs from 'fs'
import path from 'path'
import admin from 'firebase-admin'

const argv = process.argv.slice(2)
const argMap = {}
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a.startsWith('--')) {
    const k = a.replace(/^--/, '')
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : ''
    argMap[k] = v
    if (v) i++
  }
}

const targetEmail = argMap.email || argv[0]
if (!targetEmail) {
  console.error('Usage: node scripts/send-reset-resend.mjs --email user@example.com')
  process.exit(1)
}

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve('./serviceAccountKey.json')
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Service account key not found at', serviceAccountPath)
  process.exit(1)
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

const RESEND_API_KEY = process.env.RESEND_API_KEY
if (!RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY environment variable. Get one from https://resend.com')
  process.exit(1)
}

async function main() {
  try {
    const link = await admin.auth().generatePasswordResetLink(targetEmail, { url: process.env.RESET_URL || `https://${serviceAccount.project_id}.firebaseapp.com/login` })

    const html = `<!doctype html><html><body style="font-family:system-ui,Arial,sans-serif;">
    <div style="max-width:600px;margin:24px auto;background:#fff;padding:20px;border-radius:12px">
      <h2 style="margin:0 0 8px">Reset your password</h2>
      <p>Click the button below to reset the password for <strong>${targetEmail}</strong>.</p>
      <p style="text-align:center;margin:20px 0"><a href="${link}" style="background:#0ea5a4;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Reset my password</a></p>
      <p style="font-size:13px;color:#666">If the button doesn't work, open this link:<br/><a href="${link}">${link}</a></p>
    </div></body></html>`

    const body = {
      from: process.env.FROM_EMAIL || `noreply@${serviceAccount.project_id}.firebaseapp.com`,
      to: targetEmail,
      subject: `${process.env.APP_NAME || 'PriceDesk'} — Password reset`,
      html,
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Resend API error: ${res.status} ${txt}`)
    }

    const json = await res.json()
    console.log('Resend accepted:', json)
  } catch (err) {
    console.error('Failed to send reset via Resend:', err)
    process.exit(1)
  }
}

main()
