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

export function getSmsProvider(): SmsProvider {
  if (env.smsProvider === "smsc") {
    return new SmscProvider();
  }
  return new MockSmsProvider();
}
