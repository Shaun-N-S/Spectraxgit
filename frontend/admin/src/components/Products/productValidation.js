// Validation rules shared by AddProduct and EditProduct, so inline (on change)
// and on-submit validation cannot contradict each other.

const toText = (value) => (value === undefined || value === null ? '' : String(value).trim());

// Specification rules (from the original validateSpecifications).
const SPECIFICATION_RULES = {
  model: { label: 'Model', minLength: 2 },
  series: { label: 'Series', minLength: 2 },
  warranty: { label: 'Warranty' },
  manufacturer: { label: 'Manufacturer', minLength: 2 },
  itemWeight: { label: 'Item weight' },
  dimensions: { label: 'Dimensions' },
  countryOfOrigin: { label: 'Country of origin', minLength: 2 },
};

export const getSpecificationError = (key, value) => {
  const rule = SPECIFICATION_RULES[key];
  if (!rule) return '';
  const text = toText(value);
  if (rule.minLength && text.length < rule.minLength) {
    return `${rule.label} must be at least ${rule.minLength} characters`;
  }
  if (!text) return `${rule.label} is required`;
  return '';
};

// Returns { key: message } for every listed key that fails its rule.
export const validateSpecifications = (specs = {}, keys = Object.keys(SPECIFICATION_RULES)) =>
  keys.reduce((errors, key) => {
    const error = getSpecificationError(key, specs?.[key]);
    return error ? { ...errors, [key]: error } : errors;
  }, {});

// Keys the form shows that have no value yet (used to flag legacy products).
export const getMissingSpecificationLabels = (specs = {}, keys = Object.keys(SPECIFICATION_RULES)) =>
  keys.filter((key) => !toText(specs?.[key])).map((key) => SPECIFICATION_RULES[key].label);

export const getPriceError = (value) => {
  const text = toText(value);
  if (!text) return 'Price is required';
  const price = Number(text);
  return !Number.isFinite(price) || price <= 0 ? 'Price must be greater than 0' : '';
};

// Stock is a whole number; 0 is valid and means "out of stock".
export const getQuantityError = (value) => {
  const text = toText(value);
  if (!text) return 'Quantity is required';
  const quantity = Number(text);
  if (!Number.isInteger(quantity)) return 'Quantity must be a whole number';
  return quantity < 0 ? 'Quantity cannot be negative' : '';
};

// One { sku, price, availableQuantity } error object per variant.
export const validateVariants = (variants = []) =>
  variants.map((variant) => ({
    sku: toText(variant?.sku) ? '' : 'SKU is required',
    price: getPriceError(variant?.price),
    availableQuantity: getQuantityError(variant?.availableQuantity),
  }));

export const hasVariantErrors = (variantErrors) =>
  variantErrors.some((error) => error.sku || error.price || error.availableQuantity);
