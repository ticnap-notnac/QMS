import nodemailer from 'nodemailer'
import logger from '../utils/logger.js'
import { supabase } from '../lib/supabase.js'

// Create reusable transporter object using SMTP transport
let transporter = null

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
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
 * @param {string} toEmail 
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

    const mailOptions = {
      from: process.env.SMTP_FROM || `"QFlow Automated Alerts" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `QFlow Alert: ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">QFlow System Alert</h2>
          <p style="font-size: 16px; color: #334155; margin-top: 20px;"><strong>${title}</strong></p>
          <p style="font-size: 15px; color: #475569; line-height: 1.5; background: #f8fafc; padding: 15px; border-radius: 6px;">
            ${message}
          </p>
          <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
            You can view this by logging into your QFlow dashboard.<br>
            Please do not reply to this automated message.
          </p>
        </div>
      `,
    }

    // If SMTP is configured, send it. Otherwise, mock it in console.
    if (transporter) {
      const info = await transporter.sendMail(mailOptions)
      logger.info(`Notification email sent successfully to ${toEmail} [MessageId: ${info.messageId}]`)
    } else {
      logger.info(`[MOCK EMAIL] To: ${toEmail} | Subject: ${mailOptions.subject} | Body: ${message}`)
    }

  } catch (error) {
    logger.error(`Failed to send notification email: ${error.message}`)
  }
}
