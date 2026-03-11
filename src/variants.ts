import type { ProductLike, VariantSelectionInput, VariantSelectionResult } from "./types";
import { asRecord, normalizeWord, stringOrNull, toNumber } from "./utils";

const EQUIVALENTS: Record<string, string[]> = {
  red: ["red", "أحمر", "احمر"],
  blue: ["blue", "أزرق", "ازرق", "bleu"],
  black: ["black", "أسود", "اسود", "noir"],
  white: ["white", "أبيض", "ابيض", "blanc"],
  green: ["green", "أخضر", "اخضر"],
  yellow: ["yellow", "أصفر", "اصفر"],
  pink: ["pink", "وردي"],
  purple: ["purple", "بنفسجي"],
  orange: ["orange", "برتقالي"],
  brown: ["brown", "بني"],
  grey: ["grey", "gray", "رمادي"],
  xs: ["xs", "x-small", "xsmall"],
  s: ["s", "small", "صغير"],
  m: ["m", "medium", "متوسط"],
  l: ["l", "large", "كبير"],
  xl: ["xl", "x-large", "xlarge", "كبير جدا", "كبير جدًا"],
  xxl: ["xxl", "xx-large", "xxlarge"],
};

const OPTION_KEY_EQUIVALENTS: Record<"color" | "size", string[]> = {
  color: ["color", "colour", "لون", "اللون"],
  size: ["size", "taille", "مقاس", "المقاس", "قياس"],
};

const SIZE_CANONICAL_KEYS = new Set(["xs", "s", "m", "l", "xl", "xxl", "small", "medium", "large", "xlarge", "xxlarge"]);

function expandEquivalents(value?: string): string[] {
  if (!value) return [];
  const token = normalizeWord(value);

  for (const group of Object.values(EQUIVALENTS)) {
    const normalized = group.map(normalizeWord);
    if (normalized.includes(token)) return normalized;
  }

  return [token];
}

function valuesEquivalent(value: string, expected: string): boolean {
  const left = expandEquivalents(value);
  const right = expandEquivalents(expected);
  return right.some((target) => left.some((candidate) => candidate === target || candidate.includes(target) || target.includes(candidate)));
}

function valuesEquivalentExact(value: string, expected: string): boolean {
  const left = expandEquivalents(value);
  const right = expandEquivalents(expected);
  return right.some((target) => left.some((candidate) => candidate === target));
}

function looksLikeSizeValue(value: string): boolean {
  return expandEquivalents(value).some((token) => SIZE_CANONICAL_KEYS.has(token));
}

function normalizeOptionKey(value: string): string {
  const token = normalizeWord(value).replace(/\s+/g, "");
  for (const [canonical, aliases] of Object.entries(OPTION_KEY_EQUIVALENTS)) {
    const normalizedAliases = aliases.map((alias) => normalizeWord(alias).replace(/\s+/g, ""));
    if (normalizedAliases.includes(token)) return canonical;
  }
  return token;
}

function extractVariantImageUrls(variant: unknown): string[] {
  const record = asRecord(variant);
  const possibleSources = [record.image_url, record.image, record.images, record.media, record.gallery];
  const urls: string[] = [];

  for (const source of possibleSources) {
    if (!source) continue;
    if (typeof source === "string") {
      urls.push(source);
      continue;
    }
    if (Array.isArray(source)) {
      for (const item of source) {
        if (typeof item === "string") {
          urls.push(item);
        } else {
          const image = asRecord(item);
          const maybeUrl =
            (typeof image.url === "string" && image.url) ||
            (typeof image.src === "string" && image.src) ||
            (typeof image.image_url === "string" && image.image_url);
          if (maybeUrl) urls.push(maybeUrl);
        }
      }
      continue;
    }
    const image = asRecord(source);
    const maybeUrl =
      (typeof image.url === "string" && image.url) ||
      (typeof image.src === "string" && image.src) ||
      (typeof image.image_url === "string" && image.image_url);
    if (maybeUrl) urls.push(maybeUrl);
  }

  return urls.filter(Boolean);
}

function normalizeVariantOptions(product: ProductLike, variant: unknown): Record<string, string> {
  const variantRecord = asRecord(variant);
  const rawOptions = variantRecord.option_values ?? variantRecord.options;

  if (!rawOptions) return {};

  if (typeof rawOptions === "object" && !Array.isArray(rawOptions)) {
    const entries = Object.entries(rawOptions as Record<string, unknown>);
    return Object.fromEntries(
      entries
        .map(([key, value]) => [key, String(value)])
        .filter(([, value]) => value.trim().length > 0),
    );
  }

  if (Array.isArray(rawOptions)) {
    const optionNames = Array.isArray(product.options)
      ? product.options.map((opt, idx) => {
          const optionRecord = asRecord(opt);
          const name = optionRecord.name;
          if (typeof name === "string" && name.trim()) return name;
          return `option_${idx + 1}`;
        })
      : [];

    const mapped = rawOptions
      .map((value, idx) => {
        if (value === null || value === undefined) return null;
        return [optionNames[idx] ?? `option_${idx + 1}`, String(value)] as const;
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry && entry[1].trim().length > 0));

    return Object.fromEntries(mapped);
  }

  return {};
}

function extractProductOptions(product: ProductLike) {
  return Array.isArray(product.options)
    ? product.options.map((opt) => {
        const record = asRecord(opt);
        const values = record.values;
        return {
          name: typeof record.name === "string" ? record.name : null,
          values: Array.isArray(values)
            ? values.map((v) => String(v))
            : typeof values === "string"
              ? values.split(",").map((v) => v.trim()).filter(Boolean)
              : [],
        };
      })
    : [];
}

function variantMatchesPreference(
  product: ProductLike,
  variant: unknown,
  preferences: { color?: string; size?: string },
): boolean {
  const options = normalizeVariantOptions(product, variant);
  const normalizedEntries = Object.entries(options).map(([key, value]) => ({
    key: normalizeOptionKey(key),
    value: String(value),
  }));
  const values = normalizedEntries.map((entry) => entry.value);

  const color = preferences.color?.trim();
  const size = preferences.size?.trim();

  const colorCandidates = normalizedEntries.filter((entry) => entry.key === "color").map((entry) => entry.value);
  const sizeCandidates = normalizedEntries.filter((entry) => entry.key === "size").map((entry) => entry.value);

  const colorPool = colorCandidates.length > 0 ? colorCandidates : values;
  const sizePool = sizeCandidates.length > 0 ? sizeCandidates : values.filter((value) => looksLikeSizeValue(value));

  const colorOk = color ? colorPool.some((value) => valuesEquivalent(value, color)) : true;
  const sizeOk = size ? (sizePool.length > 0 ? sizePool : values).some((value) => valuesEquivalentExact(value, size)) : true;

  return colorOk && sizeOk;
}

function normalizeVariant(product: ProductLike, variant: unknown) {
  const record = asRecord(variant);
  const images = extractVariantImageUrls(variant);
  const inventory =
    toNumber(record.inventory_quantity) ??
    toNumber(record.stock) ??
    toNumber(record.quantity);

  return {
    id: stringOrNull(record.id),
    title: stringOrNull(record.title),
    sku: stringOrNull(record.sku),
    price: toNumber(record.price) ?? toNumber(record.base_price),
    compare_at_price: toNumber(record.compare_at_price),
    inventory_quantity: inventory,
    in_stock: typeof record.in_stock === "boolean" ? record.in_stock : (inventory !== null ? inventory > 0 : null),
    options: normalizeVariantOptions(product, variant),
    image: images[0] ?? null,
    images,
  };
}

export function resolveVariantSelection(product: ProductLike, input: VariantSelectionInput): VariantSelectionResult {
  const variants = Array.isArray(product.variants) ? product.variants : [];

  if (variants.length === 0) {
    return {
      variant_id: null,
      resolved_variant_id: null,
      requires_selection: false,
      selection_source: "none",
    };
  }

  const availableOptions = extractProductOptions(product);
  const variantsPreview = variants.slice(0, 8).map((variant) => normalizeVariant(product, variant));
  const selectionFailure = (reason: string, selectionSource: VariantSelectionResult["selection_source"]): VariantSelectionResult => ({
    variant_id: null,
    resolved_variant_id: null,
    requires_selection: true,
    selection_source: selectionSource,
    reason,
    available_options: availableOptions,
    variants_preview: variantsPreview,
  });

  if (!input.variant_id && !input.color && !input.size) {
    return selectionFailure("variant_required", "none");
  }

  if (input.variant_id) {
    const found = variants.find((variant) => String(asRecord(variant).id ?? "") === input.variant_id);
    const hasPreferences = Boolean(input.color || input.size);
    if (found && !hasPreferences) {
      return {
        variant_id: input.variant_id,
        resolved_variant_id: input.variant_id,
        requires_selection: false,
        selection_source: "variant_id",
      };
    }
    if (found && hasPreferences) {
      const variantMatchesRequestedOptions = variantMatchesPreference(product, found, {
        color: input.color,
        size: input.size,
      });
      if (variantMatchesRequestedOptions) {
        return {
          variant_id: input.variant_id,
          resolved_variant_id: input.variant_id,
          requires_selection: false,
          selection_source: "variant_id",
        };
      }
    } else if (!found && !hasPreferences) {
      return selectionFailure("variant_not_found", "variant_id");
    }
  }

  let candidates = variants;
  if (input.color || input.size) {
    candidates = variants.filter((variant) => variantMatchesPreference(product, variant, { color: input.color, size: input.size }));
  }

  if (candidates.length === 0) {
    return selectionFailure("variant_not_matched", "preferences");
  }

  if (candidates.length > 1) {
    const uniqueOptionSignatures = new Set(
      candidates.map((variant) => JSON.stringify(normalizeVariantOptions(product, variant))),
    );
    if (uniqueOptionSignatures.size > 1) {
      return selectionFailure("variant_ambiguous", "preferences");
    }
  }

  const inStock = candidates.find((variant) => {
    const record = asRecord(variant);
    const inventory = toNumber(record.inventory_quantity) ?? toNumber(record.stock) ?? toNumber(record.quantity);
    if (inventory !== null) return inventory > 0;
    if (typeof record.in_stock === "boolean") return record.in_stock;
    return true;
  });

  const selected = asRecord(inStock ?? candidates[0]);
  const selectedId = stringOrNull(selected.id);
  if (!selectedId) {
    return selectionFailure("variant_id_missing", "preferences");
  }

  return {
    variant_id: selectedId,
    resolved_variant_id: selectedId,
    requires_selection: false,
    selection_source: "preferences",
  };
}

export function variantMatchesColorAndSize(product: ProductLike, variant: unknown, color?: string, size?: string): boolean {
  return variantMatchesPreference(product, variant, { color, size });
}
