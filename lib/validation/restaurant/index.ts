import { z } from "zod";
import { email, id, name } from "@/lib/validation/admin";

const text = (max: number) => z.string().trim().max(max);
const timezone = text(100)
  .min(1)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return !/^[+-]/.test(value);
    } catch {
      return false;
    }
  }, "Choose a valid IANA timezone, such as Asia/Manila.");
const currencies = new Set(Intl.supportedValuesOf("currency"));
const currency = text(3)
  .toUpperCase()
  .refine(
    (value) => currencies.has(value),
    "Choose a supported ISO currency code.",
  );
const locale = text(40)
  .min(2)
  .refine((value) => {
    try {
      return Boolean(new Intl.Locale(value));
    } catch {
      return false;
    }
  }, "Enter a valid locale, such as en or en-PH.");

export const restaurantSettingsInput = z.object({
  restaurantId: id,
  version: z.coerce.number().int().nonnegative(),
  name,
  city: text(100),
  email: z.union([email, z.literal("")]),
  phone: text(40),
  addressLine1: text(200),
  addressLine2: text(200),
  postalCode: text(20),
  countryCode: text(2)
    .toUpperCase()
    .regex(/^$|^[A-Z]{2}$/, "Use a two-letter country code."),
  timezone,
  currencyCode: currency,
  locale,
  serviceMode: z.enum(["QUICK_SERVICE", "TABLE_SERVICE"]),
  defaultOrderType: z.enum(["DINE_IN", "TAKEOUT"]),
  orderNumberPrefix: text(10)
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,10}$/, "Use 1–10 letters or numbers."),
  receiptHeader: text(200),
  receiptFooter: text(300),
});

export const restaurantInvitationInput = z.object({
  restaurantId: id,
  name,
  email,
  role: z.enum(["MANAGER", "CASHIER"]),
});
export const restaurantInvitationTarget = z.object({
  restaurantId: id,
  invitationId: id,
});
export const restaurantMembershipInput = z.object({
  restaurantId: id,
  membershipId: id,
  expectedUpdatedAt: z.string().datetime(),
  role: z.enum(["MANAGER", "CASHIER"]),
  status: z.enum(["ACTIVE", "DISABLED"]),
});
export const restaurantPageInput = z.coerce
  .number()
  .int()
  .min(1)
  .max(100000)
  .catch(1);
