import type { PromotionClassification, PromotionContext, PromotionLike, PromotionStatus } from "./types";

function isDateInFuture(value?: string | null): boolean {
  if (!value) return false;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return false;
  return t > Date.now();
}

function isDateInPast(value?: string | null): boolean {
  if (!value) return false;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return false;
  return t < Date.now();
}

export function classifyPromotionStatus(
  promotion: PromotionLike,
  context: PromotionContext = {},
): PromotionClassification {
  const code = typeof promotion.code === "string" && promotion.code.trim() ? promotion.code.trim() : null;
  const enteredCode = typeof context.enteredCode === "string" && context.enteredCode.trim()
    ? context.enteredCode.trim()
    : null;

  if (code && enteredCode && code.toLowerCase() !== enteredCode.toLowerCase()) {
    return { status: "invalid_code", reason: "entered_code_mismatch" };
  }

  if (isDateInFuture(promotion.starts_at)) {
    return { status: "eligible_with_conditions", reason: "not_started_yet" };
  }

  if (isDateInPast(promotion.expires_at)) {
    return { status: "eligible_with_conditions", reason: "expired" };
  }

  const minOrder = typeof promotion.min_order_amount === "number" ? promotion.min_order_amount : null;
  const cartTotal = typeof context.cartTotal === "number" ? context.cartTotal : null;
  if (minOrder !== null && cartTotal !== null && cartTotal < minOrder) {
    return { status: "eligible_with_conditions", reason: "min_order_not_met" };
  }

  if (code && !enteredCode) {
    return { status: "code_required", reason: "manual_code_required" };
  }

  if (enteredCode && context.explicitValidationPassed === false) {
    return { status: "invalid_code", reason: "validation_failed" };
  }

  const status: PromotionStatus = "applied_now";
  return { status, reason: "eligible_now" };
}

export function promotionStatusLabel(status: PromotionStatus): string {
  switch (status) {
    case "applied_now":
      return "مطبق الآن";
    case "eligible_with_conditions":
      return "متاح بشروط";
    case "code_required":
      return "يتطلب كود";
    case "invalid_code":
      return "كود غير صالح";
    default:
      return "متاح";
  }
}
