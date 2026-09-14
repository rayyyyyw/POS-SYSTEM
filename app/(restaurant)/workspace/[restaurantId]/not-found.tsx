import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="space-y-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Restaurant unavailable</h1>
      <p className="text-sm text-muted-foreground">
        We couldn’t find a restaurant available to your account.
      </p>
      <Button asChild variant="outline">
        <Link href="/workspace">Your restaurants</Link>
      </Button>
    </div>
  );
}
