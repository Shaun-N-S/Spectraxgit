import PropTypes from "prop-types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  formatCurrency,
  formatDate,
  getCustomer,
  orderStatusClass,
  payableAmount,
  paymentStatusClass,
} from "./orderFormat";

// Fields are optional unless the component cannot render without them; the
// API may omit fields or return null (e.g. coupon, deleted customer userId).
const dateValue = PropTypes.oneOfType([
  PropTypes.string,
  PropTypes.instanceOf(Date),
]);

const orderShape = PropTypes.shape({
  userId: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      firstName: PropTypes.string,
      lastName: PropTypes.string,
      email: PropTypes.string,
      phone: PropTypes.string,
    }),
  ]),
  orderDate: dateValue,
  createdAt: dateValue,
  orderStatus: PropTypes.string,
  shippingAddress: PropTypes.shape({
    address: PropTypes.string,
    city: PropTypes.string,
    state: PropTypes.string,
    country: PropTypes.string,
    pinCode: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
  products: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      productId: PropTypes.string,
      variantId: PropTypes.string,
      name: PropTypes.string,
      quantity: PropTypes.number,
      price: PropTypes.number,
      variant: PropTypes.shape({
        attributes: PropTypes.arrayOf(
          PropTypes.shape({
            name: PropTypes.string,
            value: PropTypes.string,
          }),
        ),
      }),
    }),
  ),
  paymentMethod: PropTypes.string,
  paymentStatus: PropTypes.string,
  razorpay: PropTypes.shape({
    orderId: PropTypes.string,
    paymentId: PropTypes.string,
  }),
  totalAmount: PropTypes.number,
  discountAmount: PropTypes.number,
  finalAmount: PropTypes.number,
  coupon: PropTypes.shape({
    code: PropTypes.string,
    discountAmount: PropTypes.number,
  }),
  returnDetails: PropTypes.shape({
    reason: PropTypes.string,
    description: PropTypes.string,
    returnDate: dateValue,
  }),
});

const hasValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
      {title}
    </h3>
    {children}
  </section>
);

Section.propTypes = {
  title: PropTypes.node.isRequired,
  children: PropTypes.node,
};

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-4 text-sm">
    <span className="shrink-0 text-gray-500">{label}</span>
    <span className="min-w-0 text-right font-medium break-words">
      {children}
    </span>
  </div>
);

Row.propTypes = {
  label: PropTypes.node.isRequired,
  children: PropTypes.node,
};

function OrderDetailsSheet({ order, onOpenChange }) {
  if (!order) return null;

  const customer = getCustomer(order);
  const address = order.shippingAddress || {};
  const addressLines = [
    address.address,
    [address.city, address.state].filter(hasValue).join(", "),
    [address.country, address.pinCode].filter(hasValue).join(" - "),
  ].filter(hasValue);
  const products = order.products || [];
  const discount = order.discountAmount || order.coupon?.discountAmount || 0;
  const returnDetails = order.returnDetails || {};

  return (
    <Sheet open={Boolean(order)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pr-8 text-left">
          <div className="flex flex-wrap items-center gap-3">
            <SheetTitle>Order details</SheetTitle>
            {order.orderStatus && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${orderStatusClass(order.orderStatus)}`}
              >
                {order.orderStatus}
              </span>
            )}
          </div>
          <SheetDescription>
            Placed on {formatDate(order.orderDate || order.createdAt)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Section title="Customer">
            <Row label="Name">{customer.name}</Row>
            {customer.exists ? (
              <>
                {customer.email && <Row label="Email">{customer.email}</Row>}
                {customer.phone && <Row label="Phone">{customer.phone}</Row>}
              </>
            ) : (
              <p className="text-sm text-gray-500">
                This customer account no longer exists.
              </p>
            )}
          </Section>

          {addressLines.length > 0 && (
            <Section title="Shipping address">
              <p className="text-sm break-words">
                {addressLines.map((line, index) => (
                  <span key={index} className="block">
                    {line}
                  </span>
                ))}
              </p>
            </Section>
          )}

          {products.length > 0 && (
            <Section title={`Items (${products.length})`}>
              <ul className="divide-y rounded border">
                {products.map((item, index) => {
                  const attributes = (item.variant?.attributes || []).filter(
                    (attr) => hasValue(attr?.name) && hasValue(attr?.value),
                  );
                  return (
                    <li
                      key={item._id || `${item.productId}-${item.variantId}-${index}`}
                      className="p-3 text-sm"
                    >
                      <div className="flex justify-between gap-4">
                        <span className="min-w-0 font-medium break-words">
                          {item.name || "Unnamed product"}
                        </span>
                        {hasValue(item.quantity) && (
                          <span className="whitespace-nowrap">
                            × {item.quantity}
                          </span>
                        )}
                      </div>
                      {attributes.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {attributes
                            .map((attr) => `${attr.name}: ${attr.value}`)
                            .join(", ")}
                        </p>
                      )}
                      {Number.isFinite(item.price) && (
                        <p className="text-xs text-gray-500">
                          Unit price: {formatCurrency(item.price)}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          <Section title="Payment">
            {order.paymentMethod && (
              <Row label="Method">{order.paymentMethod}</Row>
            )}
            {order.paymentStatus && (
              <Row label="Payment status">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${paymentStatusClass(order.paymentStatus)}`}
                >
                  {order.paymentStatus}
                </span>
              </Row>
            )}
            {order.razorpay?.orderId && (
              <Row label="Razorpay order">
                <span className="break-all">{order.razorpay.orderId}</span>
              </Row>
            )}
            {order.razorpay?.paymentId && (
              <Row label="Razorpay payment">
                <span className="break-all">{order.razorpay.paymentId}</span>
              </Row>
            )}
            {Number.isFinite(order.totalAmount) && (
              <Row label="Subtotal">{formatCurrency(order.totalAmount)}</Row>
            )}
            {discount > 0 && (
              <Row
                label={`Discount${order.coupon?.code ? ` (${order.coupon.code})` : ""}`}
              >
                − {formatCurrency(discount)}
              </Row>
            )}
            <Row label="Amount payable">
              {formatCurrency(payableAmount(order))}
            </Row>
          </Section>

          {hasValue(returnDetails.reason) && (
            <Section title="Return">
              <Row label="Reason">{returnDetails.reason}</Row>
              {hasValue(returnDetails.description) && (
                <Row label="Details">{returnDetails.description}</Row>
              )}
              {returnDetails.returnDate && (
                <Row label="Requested">
                  {formatDate(returnDetails.returnDate)}
                </Row>
              )}
            </Section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

OrderDetailsSheet.propTypes = {
  // null/undefined closes the sheet (the component renders nothing)
  order: orderShape,
  onOpenChange: PropTypes.func.isRequired,
};

export default OrderDetailsSheet;
