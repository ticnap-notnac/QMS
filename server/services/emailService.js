import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import logger from '../utils/logger.js'
import { supabase } from '../lib/supabase.js'

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

let transporter = null

function getTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      family: 4,
      tls: {
        rejectUnauthorized: false,
      },
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return transporter
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * Universal email dispatcher:
 * 1. Uses Resend (HTTPS / port 443) if RESEND_API_KEY is configured (works on Render Free Tier).
 * 2. Falls back to Nodemailer (SMTP) if SMTP_USER & SMTP_PASS are configured.
 * 3. Falls back to mock email in console if neither is configured.
 */
async function dispatchEmail({ to, subject, html, text, fromTitle = 'QFlow System' }) {
  if (!to) {
    logger.warn('Email dispatch skipped: no recipient provided.')
    return null
  }

  const resend = getResendClient()
  if (resend) {
    const fromAddress = process.env.RESEND_FROM || `${fromTitle} <onboarding@resend.dev>`
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    })

    if (error) {
      throw new Error(`Resend error: ${error.message || JSON.stringify(error)}`)
    }

    logger.info(`Email sent successfully via Resend to ${to} [Id: ${data?.id}]`)
    return data
  }

  const activeTransporter = getTransporter()
  if (activeTransporter) {
    const fromAddress = process.env.SMTP_FROM || `"${fromTitle}" <${process.env.SMTP_USER}>`
    const info = await activeTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text,
    })
    logger.info(`Email sent successfully via SMTP to ${to} [MessageId: ${info.messageId}]`)
    return info
  }

  logger.info(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Email skipped because neither RESEND_API_KEY nor SMTP is configured.`)
  return null
}

/**
 * Gets a user's email from the database by user ID
 * @param {string} userId 
 * @returns {Promise<string|null>}
 */
async function getUserEmail(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    if (error || !data) return null
    return data.email
  } catch (err) {
    logger.error(`Error fetching user email: ${err.message}`)
    return null
  }
}

/**
 * Sends a generic notification email
 * @param {string|number} userId 
 * @param {string} title 
 * @param {string} message 
 */
export async function sendNotificationEmail(userId, title, message) {
  try {
    const toEmail = await getUserEmail(userId)

    if (!toEmail) {
      logger.warn(`Could not send email. No email address found for user ID: ${userId}`)
      return
    }

    const safeTitle = escapeHtml(title)
    const safeMessage = escapeHtml(message)
    const subject = `QFlow Alert: ${String(title || '').replace(/[\r\n]+/g, ' ')}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">QFlow System Alert</h2>
        <p style="font-size: 16px; color: #334155; margin-top: 20px;"><strong>${safeTitle}</strong></p>
        <p style="font-size: 15px; color: #475569; line-height: 1.5; background: #f8fafc; padding: 15px; border-radius: 6px;">
          ${safeMessage}
        </p>
        <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
          You can view this by logging into your QFlow dashboard.<br>
          Please do not reply to this automated message.
        </p>
      </div>
    `
    const text = `QFlow System Alert\n\n${title}\n\n${message}\n\nYou can view this by logging into your QFlow dashboard.`

    await dispatchEmail({
      to: toEmail,
      subject,
      html,
      text,
      fromTitle: 'QFlow Automated Alerts',
    })
  } catch (error) {
    logger.error(`Failed to send notification email: ${error.message}`)
  }
}

/**
 * Sends the initial credentials for a newly created user.
 * @param {object} params
 * @param {string} params.toEmail
 * @param {string} params.password
 * @param {string} [params.frontendUrl]
 * @param {string} [params.displayName]
 */
export async function sendNewUserCredentialsEmail({ toEmail, password, frontendUrl, displayName }) {
  try {
    if (!toEmail) {
      logger.warn('Could not send new user credentials email. No recipient email was provided.')
      return
    }

    const targetUrl = frontendUrl || process.env.FRONTEND_URL || 'https://qms-jade.vercel.app'
    const safeDisplayName = escapeHtml(displayName || '')
    const safeEmail = escapeHtml(toEmail)
    const safePassword = escapeHtml(password)
    const safeTargetUrl = escapeHtml(targetUrl)

    const subject = `Your QFlow account has been created`
    const text = `Hello ${displayName || ''},\n\nYour QFlow account has been created.\n\nEmail: ${toEmail}\nPassword: ${password}\n\nSign in here: ${targetUrl}\n\nPlease keep these details secure.`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">Welcome to QFlow!</h2>
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">${safeDisplayName ? `Hello ${safeDisplayName},` : 'Hello,'} your account has been created. Use the credentials below to sign in.</p>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 10px; color: #0f172a; font-size: 14px;"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin: 0; color: #0f172a; font-size: 14px;"><strong>Password:</strong> ${safePassword}</p>
        </div>
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">Sign in here: <a href="${safeTargetUrl}" style="color: #2563eb; text-decoration: none;">${safeTargetUrl}</a></p>
        <p style="font-size: 14px; color: #64748b; margin-top: 24px;">Please keep these details secure.</p>
      </div>
    `

    await dispatchEmail({
      to: toEmail,
      subject,
      html,
      text,
      fromTitle: 'QFlow System',
    })
  } catch (error) {
    logger.error(`Failed to send new user credentials email: ${error.message}`)
  }
}

/**
 * Sends an email notification to Inventory Managers when a QDDR report is closed.
 * @param {object} params
 * @param {string} params.toEmail
 * @param {object} params.qddr
 * @param {string} [params.displayName]
 */
export async function sendQddrClosedEmail({ toEmail, qddr, displayName }) {
  try {
    if (!toEmail) {
      logger.warn('Could not send QDDR closed email. No recipient email provided.')
      return
    }

    const refNo = qddr?.reference_no || `QDDR #${qddr?.id || 'Unknown'}`
    const targetUrl = process.env.FRONTEND_URL || 'https://qms-jade.vercel.app'
    const safeDisplayName = escapeHtml(displayName || 'Inventory Manager')
    const safeRefNo = escapeHtml(refNo)
    const safeTargetUrl = escapeHtml(targetUrl)

    const subject = `QFlow Alert: QDDR ${refNo} Closed - Please Review`
    const text = `Hello ${displayName || 'Inventory Manager'},\n\nThis is a heads up that Quality Defect & Deviation Report ${refNo} has been closed. Please check the system to review the new document.\n\nSign in here: ${targetUrl}\n\nPlease do not reply to this automated message.`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
          QFlow Notification
        </h2>
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
          Hello ${safeDisplayName},
        </p>
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
          This is a heads up that Quality Defect &amp; Deviation Report <strong>${safeRefNo}</strong> has been closed. Please check the system to review the new document.
        </p>
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-top: 20px;">
          <a href="${safeTargetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Open QFlow System
          </a>
        </p>
        <p style="font-size: 13px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          Please do not reply to this automated message.
        </p>
      </div>
    `

    await dispatchEmail({
      to: toEmail,
      subject,
      html,
      text,
      fromTitle: 'QFlow Automated Alerts',
    })
  } catch (error) {
    logger.error(`Failed to send QDDR closed email: ${error.message}`)
  }
}
