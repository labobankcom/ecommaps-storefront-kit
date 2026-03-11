import type { JsonRecord, NormalizedCartSummary, NormalizedProductCard, ProductLike } from "./types";
import { asRecord, stringOrNull, toNumber } from "./utils";

function extractImageUrls(product: ProductLike): string[] {
  if (!Array.isArray(product.images)) return [];

  return product.images
    .map((img) => {
      if (typeof img === "string") return img;
      const record = asRecord(img);
      const url =
        (typeof record.url === "string" && record.url) ||
        (typeof record.src === "string" && record.src) ||
        (typeof record.image_url === "string" && record.image_url);
      return typeof url === "string" ? url : null;
    })
    .filter((url): url is string => Boolean(url));
}

function isProductAvailable(product: ProductLike): boolean {
  if (product.in_stock === true) return true;

  const inventory = toNumber(product.inventory_quantity);
  if (inventory !== null && inventory > 0) return true;

  if (Array.isArray(product.variants)) {
    return product.variants.some((variant) => {
      const record = asRecord(variant);
      const stock = toNumber(record.inventory_quantity) ?? toNumber(record.stock) ?? toNumber(record.quantity);
      if (stock !== null) return stock > 0;
      if (typeof record.in_stock === "boolean") return record.in_stock;
      return false;
    });
  }

  return false;
}

function productPrice(product: ProductLike): number | null {
  const direct = toNumber(product.price) ?? toNumber(product.base_price);
  if (direct !== null) return direct;

  if (!Array.isArray(product.variants) || product.variants.length === 0) return null;
  for (const variant of product.variants) {
    const record = asRecord(variant);
    const value = toNumber(record.price) ?? toNumber(record.base_price);
    if (value !== null) return value;
  }
  return null;
}

export function normalizeProductCard(product: ProductLike): NormalizedProductCard {
  const price = productPrice(product);
  const images = extractImageUrls(product);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description ?? null,
    price,
    compare_at_price: toNumber(product.compare_at_price),
    currency: product.currency ?? "DZD",
    available: isProductAvailable(product),
    image: images[0] ?? null,
    images,
  };
}

export function normalizeCartSummary(cart: JsonRecord): NormalizedCartSummary {
  const itemsRaw = Array.isArray(cart.items) ? cart.items : [];
  const items = itemsRaw.map((item) => {
    const record = asRecord(item);
    return {
      item_id: stringOrNull(record.id),
      product_id: stringOrNull(record.product_id),
      variant_id: stringOrNull(record.variant_id),
      name: stringOrNull(record.product_name),
      quantity: toNumber(record.quantity) ?? 1,
      unit_price: toNumber(record.product_price),
      subtotal: toNumber(record.subtotal),
      image: stringOrNull(record.product_image),
      currency: "DZD",
    };
  });

  return {
    cart_id: stringOrNull(cart.id),
    items_count: toNumber(cart.items_count) ?? items.length,
    subtotal: toNumber(cart.subtotal) ?? 0,
    currency: "DZD",
    items,
  };
}
