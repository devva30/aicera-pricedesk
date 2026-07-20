import fs from 'fs'
import path from 'path'
import admin from 'firebase-admin'
import nodemailer from 'nodemailer'

const args = process.argv.slice(2)
const argMap = {}
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg.startsWith('--')) {
    const key = arg.slice(2)
    const next = args[i + 1]
    if (next && !next.startsWith('--')) {
      argMap[key] = next
      i++
    } else {
      argMap[key] = 'true'
    }
  }
}

const targetEmail = argMap.email || args[0]
if (!targetEmail) {
  console.error('Usage: node scripts/send-reset-link.mjs --email user@example.com')
  process.exit(1)
}

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve('./serviceAccountKey.json')
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Service account key not found: ' + serviceAccountPath)
  console.error('Please download a Firebase service account JSON and set GOOGLE_APPLICATION_CREDENTIALS or place it at ./serviceAccountKey.json')
  process.exit(1)
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const smtpHost = process.env.SMTP_HOST
const smtpPort = Number(process.env.SMTP_PORT || 587)
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpSecure = process.env.SMTP_SECURE === 'true'

if (!smtpHost || !smtpUser || !smtpPass) {
  console.error('Missing SMTP configuration. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment.')
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
})

const appName = process.env.APP_NAME || 'PriceDesk'
const fromEmail = process.env.FROM_EMAIL || `noreply@${serviceAccount.project_id}.firebaseapp.com`
const resetUrl = process.env.RESET_URL || `https://${serviceAccount.project_id}.firebaseapp.com/login`

async function main() {
  try {
    const link = await admin.auth().generatePasswordResetLink(targetEmail, {
      url: resetUrl,
    })

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${appName} — Password reset</title>
</head>
<body style="font-family:system-ui,Arial,sans-serif;background:#f4f6fb;margin:0;padding:0;">
  <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.08);">
    <div style="background:#0ea5a4;color:#ffffff;padding:28px;text-align:center;">
      <h1 style="margin:0;font-size:24px;">${appName}</h1>
      <p style="margin:8px 0 0;font-size:14px;">Password reset request</p>
    </div>
    <div style="padding:28px;color:#0f172a;">
      <p style="font-size:16px;line-height:1.6;">We received a request to reset the password for <strong>${targetEmail}</strong>. Click the button below to choose a new password.</p>
      <p style="text-align:center;margin:24px 0;"><a href="${link}" style="display:inline-block;padding:14px 24px;background:#0ea5a4;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;">Reset my password</a></p>
      <p style="font-size:14px;color:#475569;line-height:1.6;">If the button does not work, copy and paste the link below into your browser:</p>
      <p style="word-break:break-all;font-size:14px;color:#475569;">${link}</p>
      <p style="font-size:13px;color:#94a3b8;margin-top:24px;">If you did not request this password reset, you can safely ignore this email.</p>
    </div>
    <div style="background:#f8fafc;color:#64748b;padding:18px;text-align:center;font-size:12px;">© ${new Date().getFullYear()} ${appName}. All rights reserved.</div>
  </div>
</body>
</html>`

    const text = `Reset your ${appName} password for ${targetEmail}\n\nOpen this link to reset your password:\n${link}\n\nIf you didn't request this, ignore this message.`

    const info = await transporter.sendMail({
      from: fromEmail,
      to: targetEmail,
      subject: `${appName} — Password reset`,
      text,
      html,
    })

    console.log('Password reset email sent successfully:', info.messageId || info)
  } catch (error) {
    console.error('Failed to send reset link:', error)
    process.exit(1)
  }
}

main()
