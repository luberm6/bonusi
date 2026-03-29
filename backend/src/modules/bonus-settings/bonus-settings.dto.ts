import { HttpError } from "../../common/http/error.js";

export type BonusAccrualMode = "percentage" | "fixed";

export type BonusSettingsDto = {
  accrualMode: BonusAccrualMode;
  percentageValue: number | null;
  fixedValue: number | null;
};

function parsePositiveNumber(value: unknown, field: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
    throw new HttpError(400, `${field} must be a number`);
  }
  if (numeric <= 0) {
    throw new HttpError(400, `${field} must be > 0`);
  }
  return numeric;
}

export function parseBonusSettingsDto(body: unknown): BonusSettingsDto {
  if (!body || typeof body !== "object") throw new HttpError(400, "Request body is required");
  const input = body as Record<string, unknown>;
  const mode = input.accrualMode;
  if (mode !== "percentage" && mode !== "fixed") {
    throw new HttpError(400, "accrualMode must be percentage or fixed");
  }

  const percentageValue =
    input.percentageValue === undefined || input.percentageValue === null
      ? null
      : Number(parsePositiveNumber(input.percentageValue, "percentageValue").toFixed(2));
  const fixedValue =
    input.fixedValue === undefined || input.fixedValue === null
      ? null
      : Math.floor(parsePositiveNumber(input.fixedValue, "fixedValue"));

  if (mode === "percentage") {
    if (percentageValue === null) throw new HttpError(400, "percentageValue is required for percentage mode");
    if (fixedValue !== null) throw new HttpError(400, "fixedValue must be empty for percentage mode");
  }

  if (mode === "fixed") {
    if (fixedValue === null) throw new HttpError(400, "fixedValue is required for fixed mode");
    if (percentageValue !== null) throw new HttpError(400, "percentageValue must be empty for fixed mode");
  }

  return {
    accrualMode: mode,
    percentageValue,
    fixedValue
  };
}
