import { Mail, MessageCircle, MessageSquare, Phone } from "lucide-react";
import { getRegion } from "./format";

/* Display labels shared by the payroll and marketing screens. */

export const PAYSLIP_STATUS = { paid: "Paid", partial: "Partial", unpaid: "Unpaid" };

export const PAYMENT_METHOD = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  cheque: "Cheque",
  other: "Other",
};

/** Checkout payment methods (keys stored by the API; "pos" is a card machine). */
export const CHECKOUT_METHODS = [
  ["cash", "Cash"],
  ["pos", "Card"],
  ["bank_transfer", "Bank transfer"],
  ["jazzcash", "JazzCash"],
  ["easypaisa", "Easypaisa"],
  ["gift_card", "Gift card"],
  ["other", "Other"],
];
/** Mobile wallets offered only in their own country. */
const LOCAL_ONLY = { jazzcash: "PK", easypaisa: "PK" };

/** [key, label] pairs without wallets from other countries (labels for past payments still work). */
export const forRegion = (methods) => methods.filter(([key]) => !LOCAL_ONLY[key] || LOCAL_ONLY[key] === getRegion().country);

const METHOD_NAMES = { ...Object.fromEntries(CHECKOUT_METHODS), package: "Package", membership: "Membership", "pay later": "Pay later" };

/** "cash+pos" -> "Cash + Card". */
export const paymentMethodLabel = (summary) =>
  summary
    ? String(summary)
        .split("+")
        .map((m) => METHOD_NAMES[m.trim().toLowerCase()] || m.trim())
        .join(" + ")
    : "—";

export const CHANNELS = {
  email: { label: "Email", icon: Mail },
  sms: { label: "SMS", icon: MessageSquare },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  voice: { label: "Voice call", icon: Phone },
};

export const CAMPAIGN_STATUS = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  completed: "Completed",
  canceled: "Canceled",
};

/** "No visit in 30 days · Gulberg" */
export const audienceLabel = (c) => {
  const who =
    c.audience_type === "inactive"
      ? `No visit in ${c.audience_days} days`
      : c.audience_type === "active"
        ? `Visited in last ${c.audience_days} days`
        : "All clients";
  return c.location_name ? `${who} · ${c.location_name}` : who;
};
