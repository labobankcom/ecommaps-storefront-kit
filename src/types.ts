export type JsonRecord = Record<string, unknown>;

export type ProductLike = {
  id?: string;
  slug?: string;
  name?: string;
  description?: string | null;
  price?: number | string | null;
  base_price?: number | string | null;
  compare_at_price?: number | string | null;
  currency?: string | null;
  images?: unknown;
  options?: unknown;
  variants?: unknown;
  inventory_quantity?: number | string | null;
  in_stock?: boolean;
  is_active?: boolean | null;
};

export type VariantSelectionInput = {
  variant_id?: string;
  color?: string;
  size?: string;
};

export type SelectionSource = "none" | "variant_id" | "preferences";

export type VariantSelectionResult = {
  variant_id: string | null;
  resolved_variant_id: string | null;
  requires_selection: boolean;
  selection_source: SelectionSource;
  reason?: string;
  available_options?: Array<{ name: string | null; values: string[] }>;
  variants_preview?: Array<{
    id: string | null;
    title: string | null;
    sku: string | null;
    price: number | null;
    compare_at_price: number | null;
    inventory_quantity: number | null;
    in_stock: boolean | null;
    options: Record<string, string>;
    image: string | null;
    images: string[];
  }>;
};

export type NormalizedProductCard = {
  id?: string;
  slug?: string;
  name?: string;
  description?: string | null;
  price: number | null;
  compare_at_price: number | null;
  currency: string;
  available: boolean;
  image: string | null;
  images: string[];
};

export type NormalizedCartSummary = {
  cart_id: string | null;
  items_count: number;
  subtotal: number;
  currency: string;
  items: Array<{
    item_id: string | null;
    product_id: string | null;
    variant_id: string | null;
    name: string | null;
    quantity: number;
    unit_price: number | null;
    subtotal: number | null;
    image: string | null;
    currency: string;
  }>;
};

export type PromotionLike = {
  code?: string | null;
  min_order_amount?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  promotion_type?: string | null;
};

export type PromotionStatus = "applied_now" | "eligible_with_conditions" | "code_required" | "invalid_code";

export type PromotionClassification = {
  status: PromotionStatus;
  reason: string;
};

export type PromotionContext = {
  cartTotal?: number;
  enteredCode?: string;
  explicitValidationPassed?: boolean | null;
};
