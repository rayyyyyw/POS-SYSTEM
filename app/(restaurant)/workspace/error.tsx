"use client";
import { Button } from "@/components/ui/button";
export default function RestaurantError({ retry }: { retry: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-5 p-8 text-center">
      <h1 className="text-2xl font-semibold">
        We couldn’t load your restaurant
      </h1>
      <p className="text-sm text-muted-foreground">
        Your account data is temporarily unavailable. Please try again.
      </p>
      <Button onClick={retry}>Try again</Button>
    </div>
  );
}
