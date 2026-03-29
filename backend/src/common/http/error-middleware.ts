import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./error.js";

function normalizeDatabaseError(err: unknown) {
  const candidate = err as { code?: string; constraint?: string };
  if (candidate?.code !== "23505") {
    return null;
  }

  const byConstraint: Record<string, string> = {
    uq_users_phone: "Пользователь с таким телефоном уже существует",
    uq_services_name: "Услуга с таким названием уже существует",
    uq_devices_push_token: "Устройство с таким push token уже зарегистрировано",
    messages_client_msg_dedupe: "Сообщение с таким client_message_id уже существует",
    message_templates_unique_title_per_admin: "Шаблон с таким названием уже существует",
    conversations_unique_pair: "Диалог для этой пары уже существует",
    uq_bonus_transactions_auto_accrual_per_visit: "Автоматическое начисление для этого визита уже существует"
  };

  return {
    statusCode: 409,
    message: byConstraint[candidate.constraint ?? ""] ?? "Запись с такими данными уже существует"
  };
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: err.message,
      message: err.message,
      details: err.details ?? null
    });
  }

  const normalizedDbError = normalizeDatabaseError(err);
  if (normalizedDbError) {
    return res.status(normalizedDbError.statusCode).json({
      error: normalizedDbError.message,
      message: normalizedDbError.message,
      details: null
    });
  }

  console.error("[error]", err);
  return res.status(500).json({ error: "Internal server error", message: "Internal server error", details: null });
}
