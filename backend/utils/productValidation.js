const { PRODUCT_MESSAGES } = require("../constants/messages");

const isBlank = (value) =>
  value === undefined || value === null || String(value).trim() === "";

// Price must be a finite number greater than 0 (numeric strings are accepted,
// matching what the admin forms send and what Mongoose casts).
const isValidPrice = (value) =>
  !isBlank(value) && Number.isFinite(Number(value)) && Number(value) > 0;

// Stock must be a whole number >= 0; 0 means out of stock.
const isValidQuantity = (value) =>
  !isBlank(value) && Number.isInteger(Number(value)) && Number(value) >= 0;

const getVariantsError = (variants) => {
  if (!Array.isArray(variants)) return PRODUCT_MESSAGES.INVALID_VARIANTS;
  for (let index = 0; index < variants.length; index++) {
    const variant = variants[index] || {};
    if (isBlank(variant.sku)) return PRODUCT_MESSAGES.variantSkuRequired(index);
    if (!isValidPrice(variant.price))
      return PRODUCT_MESSAGES.variantInvalidPrice(index);
    if (!isValidQuantity(variant.availableQuantity)) {
      return PRODUCT_MESSAGES.variantInvalidQuantity(index);
    }
  }
  return null;
};

// Returns an error message, or null when the payload is valid. With
// `partial: true` (updates) only the fields present in the payload are checked.
const getProductPayloadError = (payload, { partial = false } = {}) => {
  if (
    (!partial || payload.price !== undefined) &&
    !isValidPrice(payload.price)
  ) {
    return PRODUCT_MESSAGES.INVALID_PRICE;
  }
  if (!partial && !isValidQuantity(payload.availableQuantity)) {
    return PRODUCT_MESSAGES.INVALID_QUANTITY;
  }
  // Variants stay optional, as in the schema, but are checked whenever sent.
  if (payload.variants !== undefined) {
    return getVariantsError(payload.variants);
  }
  return null;
};

module.exports = { getProductPayloadError };
