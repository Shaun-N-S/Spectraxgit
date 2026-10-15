import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrencyForPdf } from '@/lib/utils';

export const downloadInvoice = (orderDetails) => {
  const doc = new jsPDF();

  // Colors and Fonts
  const primaryColor = [0, 0, 0]; // Black for headings
  const secondaryColor = [80, 80, 80]; // Dark gray for text
  const summaryBoxColor = [245, 245, 245]; // Light gray for summary background

  // Header Section
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('INVOICE', 105, 15, { align: 'center' });

  // Company Info in Header
  doc.setFontSize(12);
  doc.text('SPECTRAX Pvt. Ltd.', 14, 20);
  doc.setFontSize(10);
  doc.text('Orion Tech Park, 1234 Innovation Avenue', 14, 25);
  doc.text('Koramangala, Bengaluru - 560095, India', 14, 30);
  doc.text('Website: www.spectrax.com | Email: support@spectrax.com', 14, 35);

  // Invoice Metadata
  let currentY = 50;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Invoice Details', 14, currentY);

  currentY += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`Order ID: ${orderDetails._id || orderDetails.orderId}`, 14, currentY);
  currentY += 5;
  doc.text(
    `Order Date: ${new Date(orderDetails.createdAt || orderDetails.orderDate).toLocaleString()}`,
    14,
    currentY
  );

  // Products Table
  const tableStartY = currentY + 10;
  const tableColumn = ['Product Name', 'Variant', 'Quantity', 'Price'];
  const tableRows = orderDetails.products?.map((item) => [
    item.name,
    item.variant?.name || item.variant?.attributes?.map((attr) => `${attr.value}`).join(', ') || 'N/A',
    item.quantity,
    formatCurrencyForPdf(item.price),
  ]);

  doc.autoTable({
    startY: tableStartY,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
    },
    bodyStyles: {
      textColor: secondaryColor,
      halign: 'center',
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 70 }, // Product Name
      1: { cellWidth: 50 }, // Variant
      2: { cellWidth: 25 }, // Quantity
      3: { cellWidth: 35 }, // Price
    },
    margin: { left: 14, right: 14 },
  });

  // Billing Information
  const billingStartY = doc.lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Billing Information', 14, billingStartY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  const shippingAddress = orderDetails.shippingAddress;
  doc.text(`${shippingAddress?.address}`, 14, billingStartY + 7);
  doc.text(
    `${shippingAddress?.city}, ${shippingAddress?.state} - ${shippingAddress?.pinCode}`,
    14,
    billingStartY + 12
  );
  doc.text(`${shippingAddress?.country}`, 14, billingStartY + 17);

  // Order Summary Section
  const summaryStartY = billingStartY + 25;
  doc.setFillColor(summaryBoxColor[0], summaryBoxColor[1], summaryBoxColor[2]);
  doc.roundedRect(14, summaryStartY, 80, 40, 5, 5, 'F'); // Rounded box for the summary

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Order Summary', 18, summaryStartY + 6);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`Subtotal: ${formatCurrencyForPdf(orderDetails.totalAmount)}`, 18, summaryStartY + 15);
  doc.text(`Coupon Applied: ${orderDetails.coupon?.code || 'None'}`, 18, summaryStartY + 21);
  doc.text(
    `Delivery Charges: ${formatCurrencyForPdf(orderDetails.deliveryCharge)}`,
    18,
    summaryStartY + 27
  );
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Paid: ${formatCurrencyForPdf(orderDetails.finalAmount)}`, 18, summaryStartY + 33);

  // Footer Section
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 275, 210, 20, 'F');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Thank you for shopping with SPECTRAX!', 105, 285, { align: 'center' });

  // Save the PDF
  doc.save(`Invoice_${orderDetails._id || orderDetails.orderId}.pdf`);
};
