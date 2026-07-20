import emailjs from '@emailjs/browser'

export interface EmailParams {
  to_email: string
  recipient_name: string
  subject: string
  message: string
  deal_number: string
  deal_title: string
  action_url: string
}

/**
 * Sends a workflow notification email via EmailJS.
 * Automatically falls back to console logging in demo mode or if credentials are missing.
 */
export async function sendWorkflowEmail(params: EmailParams): Promise<boolean> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
  const templateId = import.meta.env.VITE_EMAILJS_WORKFLOW_TEMPLATE_ID || import.meta.env.VITE_EMAILJS_TEMPLATE_ID
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

  if (!serviceId || !templateId || !publicKey) {
    console.warn('⚠️ EmailJS credentials missing in .env. Logged email details:', params)
    return false
  }

  try {
    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: params.to_email,
        email: params.to_email, // Add this fallback to support both {{to_email}} and {{email}} in template settings
        to_name: params.recipient_name,
        recipient_name: params.recipient_name,
        subject: params.subject,
        message: params.message,
        deal_number: params.deal_number,
        deal_title: params.deal_title,
        action_url: params.action_url,
      },
      publicKey
    )
    console.log(`✓ Workflow notification email sent successfully to: ${params.to_email}`)
    return true
  } catch (err) {
    console.error('Failed to send workflow notification email via EmailJS:', err)
    return false
  }
}
