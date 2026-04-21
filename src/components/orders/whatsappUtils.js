// src/components/orders/whatsappUtils.js
//
// ✅ FIX 31: WhatsApp Click-to-Chat integration
//
// Free solution — koi API key nahi chahiye
// wa.me link se WhatsApp khulta hai pre-filled message ke saath
//
// Company number: 911313088 (Guru Welding Workshop)

const COMPANY_NAME   = "Guru Welding Workshop";
const COMPANY_PHONE  = "911313088"; // Call/WA number

// ─── Phone number sanitize ────────────────────────────────────────
// Indian numbers: leading 0 hata, +91 ya 91 hata, sirf 10 digits rakho
const sanitizePhone = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  // 10 digit Indian number
  if (digits.length === 10) return `91${digits}`;
  // Already has 91 prefix (12 digits)
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  // Has 0 prefix (11 digits)
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return null; // invalid
};

// ─── wa.me link builder ───────────────────────────────────────────
export const buildWALink = (phone, message) => {
  const num = sanitizePhone(phone);
  if (!num) return null;
  const encoded = encodeURIComponent(message.trim());
  return `https://wa.me/${num}?text=${encoded}`;
};

// ─── Message: Order Fully Complete ───────────────────────────────
// Jab order pehli baar complete ho ya fully paid ho
export const buildCompletedMessage = ({ customer, payment, orders = [] }) => {
  const name         = customer?.name || "Customer";
  const totalAmount  = Number(payment?.totalAmount  || 0);
  const received     = Number(payment?.finalAmount  || payment?.receivedAmount || 0);
  const due          = Number(payment?.dueAmount    || 0);
  const date         = payment?.completedDate
    ? new Date(payment.completedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const orderLines = orders
    .slice(0, 5) // max 5 lines — message zyada lamba na ho
    .map((o, i) => {
      const dim = (o.height && o.width) ? `${o.height}×${o.width} ft` : "";
      const type = o.itemType || o.orderType || "";
      return `  ${i + 1}. ${[type, dim].filter(Boolean).join(" — ")}`;
    })
    .join("\n");

  const moreOrders = orders.length > 5 ? `\n  ...aur ${orders.length - 5} aur items` : "";

  const paymentLine = due > 0
    ? `💳 *Received:* ₹${received.toLocaleString("en-IN")}\n⚠️ *Due Baaki:* ₹${due.toLocaleString("en-IN")}`
    : `✅ *Fully Paid:* ₹${received.toLocaleString("en-IN")}`;

  return `🏭 *${COMPANY_NAME}*
━━━━━━━━━━━━━━━━━━━━

Namaste *${name}* ji! 🙏

Aapka kaam complete ho gaya hai.

📦 *Order Details:*
${orderLines}${moreOrders}

💰 *Payment Summary:*
  Total: ₹${totalAmount.toLocaleString("en-IN")}
  ${paymentLine}

📅 Date: ${date}

${due > 0
  ? `⚠️ Remaining due ₹${due.toLocaleString("en-IN")} jaldi clear karein.`
  : `🎉 Shukriya! Payment poori ho gayi hai.`}

Humse dobara kaam karwane ke liye shukriya! 🙏
📞 *${COMPANY_NAME}*: ${COMPANY_PHONE}`;
};

// ─── Message: Due Payment Received ───────────────────────────────
// Jab customer partial due pay kare
export const buildDuePaymentMessage = ({ customer, received, newDue, totalSaleAmount, totalReceived }) => {
  const name    = customer?.name || "Customer";
  const date    = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const paidPct = totalSaleAmount > 0
    ? Math.round((totalReceived / totalSaleAmount) * 100)
    : 0;

  const statusLine = newDue <= 0
    ? `🎉 *Poora payment receive ho gaya! Shukriya!*`
    : `⚠️ *Baaki due: ₹${newDue.toLocaleString("en-IN")}* — please jaldi clear karein`;

  return `🏭 *${COMPANY_NAME}*
━━━━━━━━━━━━━━━━━━━━

Namaste *${name}* ji! 🙏

Aapka payment receive ho gaya hai ✅

💳 *Payment Update:*
  Aaj mila:   ₹${Number(received).toLocaleString("en-IN")}
  Kul mila:   ₹${Number(totalReceived).toLocaleString("en-IN")}
  Total order: ₹${Number(totalSaleAmount).toLocaleString("en-IN")}
  Progress:   ${paidPct}% paid

${statusLine}

📅 Date: ${date}

Shukriya! 🙏
📞 *${COMPANY_NAME}*: ${COMPANY_PHONE}`;
};