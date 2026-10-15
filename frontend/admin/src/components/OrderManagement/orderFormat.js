import { formatCustomerName, formatCurrency as formatInr } from '@/lib/utils';

const EMPTY = '—';

// Missing or non-numeric amounts render as "—" rather than "₹NaN".
export const formatCurrency = (amount) => {
  const value = Number(amount);
  if (amount === null || amount === undefined || !Number.isFinite(value)) return EMPTY;
  return formatInr(value);
};

export const formatDate = (dateString) => {
  const date = dateString ? new Date(dateString) : null;
  if (!date || Number.isNaN(date.getTime())) return EMPTY;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// The amount the customer actually pays (after coupon discounts).
export const payableAmount = (order) => order.finalAmount ?? order.totalAmount ?? 0;

export const itemCount = (order) =>
  (order.products || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

// userId is populated by the API; it is null when the customer was deleted.
export const getCustomer = (order) => {
  const user = order.userId && typeof order.userId === 'object' ? order.userId : null;
  if (!user) return { exists: false, name: 'Deleted customer', email: '', phone: '' };
  return {
    exists: true,
    name: formatCustomerName(user) || user.email || 'Unnamed customer',
    email: user.email || '',
    phone: user.phone || '',
  };
};

export const orderStatusClass = (status) =>
  status === 'Delivered' ? 'bg-green-200 text-green-800' :
  status === 'Processing' ? 'bg-yellow-200 text-yellow-800' :
  status === 'Shipped' ? 'bg-blue-200 text-blue-800' :
  'bg-red-200 text-red-800';

export const paymentStatusClass = (status) =>
  status === 'Completed' ? 'bg-green-100 text-green-800' :
  status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
  'bg-red-100 text-red-800';
