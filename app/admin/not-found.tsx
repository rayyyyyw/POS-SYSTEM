import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/page-ui";

export default function AdminNotFound() {
  return (
    <section className="rounded-lg border bg-card py-12">
      <h1 className="sr-only">Record not found</h1>
      <EmptyState
        title="This record wasn't found"
        description="The address does not match a restaurant or user in the sample dataset."
        action={
          <Button asChild>
            <Link href="/admin">Back to dashboard</Link>
          </Button>
        }
      />
    </section>
  );
}
