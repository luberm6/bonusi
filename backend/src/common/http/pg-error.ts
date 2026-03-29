import { HttpError } from "./error.js";

const UNIQUE_VIOLATION_MESSAGES: Record<string, string> = {
  uq_users_phone: "Пользователь с таким телефоном уже существует",
  uq_services_name: "Услуга с таким названием уже существует",
  uq_devices_push_token: "Устройство с таким push token уже зарегистрировано",
  messages_client_msg_dedupe: "Сообщение с таким client_message_id уже существует",
  message_templates_unique_title_per_admin: "Шаблон с таким названием уже существует",
  conversations_unique_pair: "Диалог для этой пары уже существует",
  uq_bonus_transactions_auto_accrual_per_visit: "Автоматическое начисление для этого визита уже существует",
  users_email_key: "Пользователь с таким email уже существует"
};

export function toPgHttpError(error: unknown): HttpError | null {
  const candidate = error as { code?: string; constraint?: string };
  if (candidate?.code !== "23505") {
    return null;
  }

  return new HttpError(
    409,
    UNIQUE_VIOLATION_MESSAGES[candidate.constraint ?? ""] ?? "Запись с такими данными уже существует"
  );
}
