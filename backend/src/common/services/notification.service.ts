import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { getSmsProvider } from "../../modules/auth/sms.provider.js";

export async function sendDiagnosticsNotification(
  phone: string,
  email: string,
  failedCount: number,
  failures: string[]
) {
  const text = `Внимание! Автодиагностика Centr Radius Service провалилась. Обнаружено ошибок: ${failedCount}. Первые ошибки: ${failures.join("; ")}`;
  
  console.log(`[notification] Diagnostics failure notification triggered. Errors: ${failedCount}`);

  // 1. Send SMS
  try {
    const smsProvider = getSmsProvider();
    const smsRes = await smsProvider.sendCustomSms(phone, text);
    console.log(`[notification] SMS alert sent: success=${smsRes.success}`);
  } catch (smsErr) {
    console.error("[notification] Failed to send SMS alert:", smsErr);
  }

  // 2. Send Email
  if (!env.smtpEnabled) {
    console.log("[notification] SMTP is disabled. Skipping email alert.");
    return;
  }

  if (!env.smtpUser || !env.smtpPassword) {
    console.warn("[notification] SMTP credentials are not configured. Skipping email alert.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPassword
      }
    });

    const mailOptions = {
      from: env.smtpFrom,
      to: email,
      subject: "🚨 Ошибка автодиагностики Centr Radius Service",
      text: `${text}\n\nПожалуйста, проверьте состояние логов бэкенда на Render.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[notification] Email alert sent. Message ID: ${info.messageId}`);
  } catch (emailErr) {
    console.error("[notification] Failed to send email alert:", emailErr);
  }
}
