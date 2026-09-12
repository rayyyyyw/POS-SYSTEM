import { z } from "zod";
export const email = z.string().trim().toLowerCase().email().max(254);
export const id = z.string().min(1).max(100);
export const name = z.string().trim().min(2).max(100);
export const restaurantInput = z.object({
  name, slug: z.string().trim().toLowerCase().min(2).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  city: z.string().trim().max(100).default(""), email: z.union([email, z.literal("")]).default(""),
  phone: z.string().trim().max(40).default(""),
});
export const createRestaurantInput = restaurantInput.extend({ ownerEmail: email, ownerName: name, requestId: z.string().max(100).optional() });
export const updateRestaurantInput = restaurantInput.extend({ id, version: z.coerce.number().int().nonnegative() });
export const lifecycleInput = z.object({ id, version: z.coerce.number().int().nonnegative(), status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "ARCHIVED"]), reason: z.string().trim().min(3).max(500) });
export const invitationInput = z.object({ restaurantId: id, email, role: z.enum(["OWNER", "MANAGER", "CASHIER"]) });
export const settingsInput = z.object({ name, supportEmail: z.union([email, z.literal("")]), timezone: z.enum(["Asia/Manila", "UTC"]), dateFormat: z.enum(["DMY", "YMD"]), version: z.coerce.number().int().nonnegative() });
export const accessInput = z.object({ name, email, restaurantName: name, city: name, consent: z.literal("on"), website: z.string().max(0).default("") });
