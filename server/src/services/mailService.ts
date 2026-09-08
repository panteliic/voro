import nodemailer from 'nodemailer'
import { env } from '../config/env'
import { HttpError } from '../utils/httpError'
import { logEvent } from './observability'

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
