import nodemailer from 'nodemailer'
import { env } from '../config/env'
import { HttpError } from '../utils/httpError'
import { logEvent } from './observability'

type OperatorInvite = {
  recipientEmail: string
  recipientName: string
  accountLabel: 'driver' | 'restaurant'
  setupCode?: string
  setupUrl: string
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] || character)
}

function createTransporter() {
  const { host, port, secure, user, pass } = env.smtp

  if (!host || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: secure || port === 465,
    auth: { user, pass },
  })
}

export function assertEmailDeliveryAvailable() {
  const transporter = createTransporter()
  const from = env.smtp.from

  if (env.isProduction && (!env.smtp.enabled || !transporter || !from)) {
    throw new HttpError(503, 'Email delivery is not configured. Please try again later.')
  }
}

async function deliverEmail(message: Parameters<NonNullable<ReturnType<typeof createTransporter>>['sendMail']>[0]) {
  const transporter = createTransporter()
  const from = env.smtp.from

  if (!env.smtp.enabled || !transporter || !from) {
    if (env.isProduction) {
      throw new HttpError(503, 'Email delivery is not configured. Please try again later.')
    }
    return false
  }

  try {
    await transporter.sendMail(message)
    return true
  } catch (error) {
    logEvent('error', 'email_delivery_failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
    })
    throw new HttpError(503, 'Email delivery is temporarily unavailable. Please try again later.')
  }
}

export async function sendOtpEmail(email: string, code: string) {
  const from = env.smtp.from

  if (!env.smtp.enabled || !createTransporter() || !from) {
    if (env.isProduction) {
      throw new HttpError(503, 'Email delivery is not configured. Please try again later.')
    }
    console.log(`[DEV OTP] ${email}: ${code}`)
    return
  }

  await deliverEmail({
    from,
    to: email,
    subject: 'Your Voro verification code',
    text: `Your Voro verification code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #241813;">
        <h2>Your Voro verification code</h2>
        <p>Use this code to finish creating your account:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #e94d29;">${code}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, code: string) {
  const from = env.smtp.from

  if (!env.smtp.enabled || !createTransporter() || !from) {
    if (env.isProduction) {
      throw new HttpError(503, 'Email delivery is not configured. Please try again later.')
    }
    console.log(`[DEV PASSWORD RESET] ${email}: ${code}`)
    return
  }

  await deliverEmail({
    from,
    to: email,
    subject: 'Your Voro password reset code',
    text: `Your Voro password reset code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #241813;">
        <h2>Your Voro password reset code</h2>
        <p>Use this code to set a new password:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #e94d29;">${code}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  })
}

export async function sendPasswordResetLinkEmail(email: string, resetUrl: string, accountLabel: 'driver' | 'customer' = 'customer') {
  const from = env.smtp.from
  const label = accountLabel === 'driver' ? 'driver' : 'Voro nalog'
  const safeUrl = escapeHtml(resetUrl)

  if (!env.smtp.enabled || !createTransporter() || !from) {
    if (env.isProduction) {
      throw new HttpError(503, 'Email delivery is not configured. Please try again later.')
    }
    console.log(`[DEV PASSWORD RESET LINK] ${email}: ${resetUrl}`)
    return
  }

  await deliverEmail({
    from,
    to: email,
    subject: `Voro — reset lozinke za ${label}`,
    text: `Otvorite link za izbor nove lozinke: ${resetUrl}\nLink važi 60 minuta.`,
    html: `<div style="font-family:Arial,sans-serif;color:#241813;line-height:1.5"><h2>Reset lozinke</h2><p>Kliknite na dugme da izaberete novu lozinku.</p><p><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#e94d29;color:#fff;font-weight:700;text-decoration:none">Postavi novu lozinku</a></p><p>Link važi 60 minuta.</p></div>`,
  })
}

// Accounts for drivers and restaurants are created only by an administrator.
// Invitation delivery must not undo a successfully-created account if SMTP is
// temporarily unavailable: the admin UI still receives the one-time code and
// can send it manually.
export async function sendOperatorInviteEmail(invite: OperatorInvite) {
  const transporter = createTransporter()
  const from = env.smtp.from

  if (!env.smtp.enabled || !transporter || !from) {
    logEvent('warn', 'operator_invite_email_skipped', { accountLabel: invite.accountLabel })
    return false
  }

  const accountName = invite.accountLabel === 'driver' ? 'dostavljača' : 'restorana'
  const recipientName = escapeHtml(invite.recipientName || invite.recipientEmail)
  const setupUrl = escapeHtml(invite.setupUrl)

  try {
    await transporter.sendMail({
      from,
      to: invite.recipientEmail,
      subject: `Voro — aktivirajte nalog ${accountName}`,
      text: [
        `Zdravo ${invite.recipientName || ''},`,
        '',
        `Administrator vam je otvorio Voro nalog ${accountName}.`,
        `Otvorite ovaj link: ${invite.setupUrl}`,
        invite.setupCode ? `Jednokratni kod za podešavanje lozinke: ${invite.setupCode}` : '',
        '',
        'Kod važi 7 dana i prestaje da važi čim postavite lozinku.',
      ].join('\n'),
      html: `
        <div style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#241813;line-height:1.5">
          <h2 style="margin:0 0 12px;color:#e94d29">Dobro došli u Voro</h2>
          <p>Zdravo <strong>${recipientName}</strong>, administrator vam je otvorio nalog ${accountName}.</p>
          <p><a href="${setupUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#e94d29;color:#fff;font-weight:700;text-decoration:none">Postavi lozinku i aktiviraj nalog</a></p>
          ${invite.setupCode ? `<p>Ako otvarate aplikaciju ručno, unesite ovaj jednokratni kod:</p><p style="margin:16px 0;padding:14px;border-radius:8px;background:#fff2ed;color:#c53c1c;font-size:28px;font-weight:700;letter-spacing:5px;text-align:center">${escapeHtml(invite.setupCode)}</p>` : ''}
          <p style="color:#6f625d;font-size:13px">Kod važi 7 dana i može se iskoristiti samo jednom. Ako niste očekivali ovaj poziv, ignorišite poruku.</p>
        </div>
      `,
    })
    return true
  } catch (error) {
    logEvent('error', 'operator_invite_email_failed', {
      accountLabel: invite.accountLabel,
      name: error instanceof Error ? error.name : 'UnknownError',
    })
    return false
  }
}

export async function sendOperatorPasswordResetEmail(input: {
  recipientEmail: string
  recipientName: string
  accountLabel: 'driver' | 'restaurant'
  resetUrl: string
}) {
  const transporter = createTransporter()
  const from = env.smtp.from
  const accountName = input.accountLabel === 'driver' ? 'dostavljača' : 'restorana'
  const recipientName = escapeHtml(input.recipientName || input.recipientEmail)
  const resetUrl = escapeHtml(input.resetUrl)

  if (!env.smtp.enabled || !transporter || !from) {
    if (env.isProduction) {
      throw new HttpError(503, 'Email delivery is not configured. Please try again later.')
    }
    console.log(`[DEV OPERATOR PASSWORD RESET LINK] ${input.recipientEmail}: ${input.resetUrl}`)
    return false
  }

  try {
    await transporter.sendMail({
      from,
      to: input.recipientEmail,
      subject: `Voro — reset lozinke za nalog ${accountName}`,
      text: [
        `Zdravo ${input.recipientName || ''},`,
        '',
        `Administrator je zatražio reset lozinke za vaš Voro nalog ${accountName}.`,
        `Otvorite ovaj link i unesite novu lozinku: ${input.resetUrl}`,
        '',
        'Ako niste očekivali ovaj zahtev, ignorišite poruku.',
      ].join('\n'),
      html: `
        <div style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#241813;line-height:1.5">
          <h2 style="margin:0 0 12px;color:#e94d29">Reset lozinke</h2>
          <p>Zdravo <strong>${recipientName}</strong>, administrator je zatražio reset lozinke za vaš Voro nalog ${accountName}.</p>
          <p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#e94d29;color:#fff;font-weight:700;text-decoration:none">Postavi novu lozinku</a></p>
          <p style="color:#6f625d;font-size:13px">Ako niste očekivali ovaj zahtev, ignorišite poruku.</p>
        </div>
      `,
    })
    return true
  } catch (error) {
    logEvent('error', 'operator_password_reset_email_failed', {
      accountLabel: input.accountLabel,
      name: error instanceof Error ? error.name : 'UnknownError',
    })
    return false
  }
}
