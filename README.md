# @ecommaps/storefront-kit

Framework-agnostic commerce logic primitives for Ecommaps storefront applications.

![npm version](https://img.shields.io/npm/v/@ecommaps/storefront-kit)

## 1. Positioning

Use this package for reusable business logic that should not depend on:
- Next.js
- React
- AI SDK

This package is intended for server actions, API routes, workers, and backend services.

## 2. Installation

```bash
pnpm add @ecommaps/storefront-kit
```

## 3. Public API

### Variant resolution

- `resolveVariantSelection(product, input)`
- `variantMatchesColorAndSize(product, variant, color, size)`

Behavior:
- supports multilingual color/size synonyms
- enforces exact size semantics (prevents wrong size fallback)
- returns `requires_selection` when match is ambiguous

### Normalizers

- `normalizeProductCard(product)`
- `normalizeCartSummary(cart)`

### Promotions

- `classifyPromotionStatus(promotion, context)`
- `promotionStatusLabel(status)`

## 4. Usage example

```ts
import {
  resolveVariantSelection,
  normalizeProductCard,
  normalizeCartSummary,
  classifyPromotionStatus,
} from "@ecommaps/storefront-kit";

const selection = resolveVariantSelection(product, {
  variant_id: undefined,
  color: "red",
  size: "L",
});

const card = normalizeProductCard(product);
const cart = normalizeCartSummary(rawCart);

const promoState = classifyPromotionStatus(
  { code: "DISCOUNT20", min_order_amount: 5000 },
  { enteredCode: "DISCOUNT20", cartTotal: 7000, explicitValidationPassed: true },
);
```

## 5. Compatibility

- Runtime: Node.js 20+
- No UI framework dependency
- Semver-stable function contracts
