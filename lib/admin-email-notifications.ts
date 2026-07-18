import nodemailer from 'nodemailer'

export const ADMIN_NOTIFICATION_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL || 'loolyyb@gmail.com'

type AdminEmailDetail = {
  label: string
  value: unknown
}

type AdminEmailInput = {
  kind: string
  subject: string
  title: string
  details?: AdminEmailDetail[]
  message?: string | null
  actionPath?: string | null
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function smtpReady() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  )
}

export async function notifyAdminByEmail(input: AdminEmailInput) {
  if (!smtpReady()) {
    console.warn(`Notification admin non envoyée (${input.kind}) : SMTP non configuré.`)
    return false
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://rencontrelovehotel.com'
  ).replace(/\/$/, '')
  const actionUrl = input.actionPath
    ? `${baseUrl}${input.actionPath.startsWith('/') ? input.actionPath : `/${input.actionPath}`}`
    : null
  const details = (input.details || []).filter(detail => detail.value !== undefined && detail.value !== null && detail.value !== '')

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@rencontrelovehotel.com',
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `[LHR Admin] ${input.subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#211127">
          <h2>${escapeHtml(input.title)}</h2>
          ${details.map(detail => `<p><strong>${escapeHtml(detail.label)} :</strong> ${escapeHtml(detail.value)}</p>`).join('')}
          ${input.message ? `<div style="white-space:pre-wrap;border-left:4px solid #ce0067;padding:12px;background:#f9eef6">${escapeHtml(input.message)}</div>` : ''}
          ${actionUrl ? `<p><a href="${escapeHtml(actionUrl)}">Ouvrir dans l’administration</a></p>` : ''}
        </div>
      `,
      text: [
        input.title,
        ...details.map(detail => `${detail.label} : ${String(detail.value)}`),
        input.message || null,
        actionUrl ? `Administration : ${actionUrl}` : null
      ].filter(Boolean).join('\n')
    })

    return true
  } catch (error) {
    console.error(`Notification admin non envoyée (${input.kind}) :`, error)
    return false
  }
}
