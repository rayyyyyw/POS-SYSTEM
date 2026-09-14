import "server-only";
import { restaurantSettingsInput } from "@/lib/validation/restaurant";
import { DomainError } from "@/lib/domain/policies";
import { transaction, audit } from "@/lib/server/transaction";
import { assertRestaurantAccess } from "../access";

export async function saveRestaurantSettings(actorId: string, raw: unknown) {
  const { restaurantId, version, name, city, email, phone, ...settings } =
    restaurantSettingsInput.parse(raw);
  await transaction(async (tx) => {
    const { user } = await assertRestaurantAccess(
      tx,
      actorId,
      restaurantId,
      "settingsWrite",
    );
    const before = await tx.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      select: {
        name: true,
        city: true,
        email: true,
        phone: true,
        settings: true,
      },
    });
    const changed = await tx.restaurant.updateMany({
      where: { id: restaurantId, version },
      data: { name, city, email, phone, version: { increment: 1 } },
    });
    if (!changed.count)
      throw new DomainError(
        "Restaurant settings changed since you opened this form. Reload before saving.",
      );
    await tx.restaurantSettings.upsert({
      where: { restaurantId },
      create: { restaurantId, ...settings },
      update: settings,
    });
    const oldValues = {
      name: before.name,
      city: before.city,
      email: before.email,
      phone: before.phone,
      ...before.settings,
    };
    const newValues = { name, city, email, phone, ...settings };
    const changes = Object.entries(newValues)
      .filter(
        ([key, value]) => oldValues[key as keyof typeof oldValues] !== value,
      )
      .map(([key]) => key);
    await audit(
      tx,
      user,
      "Restaurant settings updated",
      `Updated fields: ${changes.join(", ") || "none"}. Currency ${before.settings?.currencyCode ?? "unset"} → ${settings.currencyCode}; timezone ${before.settings?.timezone ?? "unset"} → ${settings.timezone}.`,
      restaurantId,
    );
    if (!before.settings)
      await audit(
        tx,
        user,
        "Restaurant setup started",
        "Regional settings saved for the first time.",
        restaurantId,
      );
  });
}
