import { env } from "../../common/config/env.js";

export interface SmsSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<SmsSendResult>;
}

export class MockSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    console.log(`[MockSmsProvider] OTP send requested. Phone: ${phone}, Code: ${code}`);
    return {
      success: true,
      providerMessageId: `mock-msg-${Date.now()}`
    };
  }
}

export class SmscProvider implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    const login = env.smscLogin;
    const password = env.smscPassword;
    const sender = env.smscSender;
    const endpoint = env.smscEndpoint || "https://smsc.ru/sys/send.php";
    const text = `Код входа Centr Radius Service: ${code}. Никому его не сообщайте.`;

    if (!login || !password) {
      console.error("[SmscProvider] SMSC_LOGIN or SMSC_PASSWORD is not configured.");
      return {
        success: false,
        error: "SMS provider is not configured"
      };
    }

    try {
      const params = new URLSearchParams();
      params.append("login", login);
      params.append("psw", password);
      params.append("phones", phone);
      params.append("mes", text);
      params.append("fmt", "3"); // JSON format
      if (sender) {
        params.append("sender", sender);
      }

      if (env.smscDebug) {
        console.log(`[SmscProvider] Sending SMS to ${phone} via SMSC.ru...`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

      const response = await fetch(endpoint, {
        method: env.smscUsePost ? "POST" : "GET",
        headers: env.smscUsePost ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
        body: env.smscUsePost ? params.toString() : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as {
        id?: number;
        cnt?: number;
        error?: string;
        error_code?: number;
      };

      if (data.error) {
        console.error(`[SmscProvider] SMSC.ru returned error code ${data.error_code}: ${data.error}`);
        return {
          success: false,
          error: `SMSC.ru error: ${data.error}`
        };
      }

      if (env.smscDebug) {
        console.log(`[SmscProvider] SMS successfully sent. Message ID: ${data.id}`);
      }

      return {
        success: true,
        providerMessageId: data.id ? String(data.id) : undefined
      };
    } catch (err: any) {
      console.error("[SmscProvider] Failed to send SMS:", err);
      return {
        success: false,
        error: err.name === "AbortError" ? "SMS provider request timeout" : err.message || "Unknown error"
      };
    }
  }
}

export class SmsAeroProvider implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    const email = env.smsaeroEmail;
    const apiKey = env.smsaeroApiKey;
    const sender = env.smsaeroSender || "SMS Aero";
    const endpoint = env.smsaeroEndpoint || "https://gate.smsaero.ru/v2/sms/send";
    const text = `Код входа Centr Radius Service: ${code}. Никому его не сообщайте.`;

    if (!email || !apiKey) {
      console.error("[SmsAeroProvider] SMSAERO_EMAIL or SMSAERO_API_KEY is not configured.");
      return {
        success: false,
        error: "SmsAero provider is not configured"
      };
    }

    try {
      // SmsAero expects numbers to start with country code without plus sign
      const cleanPhone = phone.replace(/\D/g, "");

      const authHeader = "Basic " + Buffer.from(`${email}:${apiKey}`).toString("base64");

      if (env.smsaeroDebug) {
        console.log(`[SmsAeroProvider] Sending SMS to ${cleanPhone} via SmsAero...`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
          "Accept": "application/json"
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: text,
          sign: sender
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        data?: {
          id: number;
        } | null;
        message?: string | null;
      };

      if (!data.success) {
        console.error(`[SmsAeroProvider] SmsAero returned error: ${data.message}`);
        return {
          success: false,
          error: `SmsAero error: ${data.message || "Unknown error"}`
        };
      }

      if (env.smsaeroDebug) {
        console.log(`[SmsAeroProvider] SMS successfully sent. Message ID: ${data.data?.id}`);
      }

      return {
        success: true,
        providerMessageId: data.data?.id ? String(data.data.id) : undefined
      };
    } catch (err: any) {
      console.error("[SmsAeroProvider] Failed to send SMS:", err);
      return {
        success: false,
        error: err.name === "AbortError" ? "SmsAero request timeout" : err.message || "Unknown error"
      };
    }
  }
}

export function getSmsProvider(): SmsProvider {
  if (env.smsProvider === "smsc") {
    return new SmscProvider();
  }
  if (env.smsProvider === "smsaero") {
    return new SmsAeroProvider();
  }
  return new MockSmsProvider();
}
