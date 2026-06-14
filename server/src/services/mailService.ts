import nodemailer from 'nodemailer'
import { env } from '../config/env'

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

export async function sendOtpEmail(email: string, code: string) {
  const transporter = createTransporter()
  const from = env.smtp.from

  if (!env.smtp.enabled || !transporter || !from) {
    console.log(`[DEV OTP] ${email}: ${code}`)
    return
  }

  await transporter.sendMail({
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
  const transporter = createTransporter()
  const from = env.smtp.from

  if (!env.smtp.enabled || !transporter || !from) {
    console.log(`[DEV PASSWORD RESET] ${email}: ${code}`)
    return
  }

  await transporter.sendMail({
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
