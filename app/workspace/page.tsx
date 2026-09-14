import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, LogOut, UtensilsCrossed } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/server/authorization";
import { getWorkspaceMemberships } from "@/lib/server/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default async function WorkspacePage() {
  const user = await requireUser();
  const memberships = await getWorkspaceMemberships();
  if (user.platformRole === "ADMIN" && memberships.length === 0)
    redirect("/admin");

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-semibold"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <UtensilsCrossed className="size-4" aria-hidden="true" />
            </span>
            POS System
          </Link>
          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              <LogOut aria-hidden="true" /> Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-8 px-5 py-10 sm:px-8 sm:py-14">
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            Your account
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome, {user.name}
          </h1>
          <p className="text-sm text-muted-foreground break-all">
            Signed in as {user.email}
          </p>
        </div>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Your restaurants</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              The restaurant teams connected to your account.
            </p>
          </CardHeader>
          <CardContent>
            {memberships.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <Building2
                  className="mx-auto mb-3 size-7 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="font-medium">No restaurant memberships yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Open your invitation email to join a restaurant. If you
                  expected access, contact the platform administrator.
                </p>
              </div>
            ) : (
              <ul className="divide-y rounded-xl border">
                {memberships.map((membership) => (
                  <li
                    key={membership.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                        <Building2 className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-medium break-words">
                          {membership.restaurant.name}
                        </h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {membership.role.toLowerCase().replaceAll("_", " ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="outline" className="capitalize">
                        {membership.restaurant.status
                          .toLowerCase()
                          .replaceAll("_", " ")}
                      </Badge>
                      <Button asChild variant="outline">
                        <Link href={`/workspace/${membership.restaurant.id}`}>
                          Open workspace
                          <span className="sr-only">
                            {" "}
                            for {membership.restaurant.name}
                          </span>
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <div className="rounded-xl border border-primary/15 bg-accent p-6">
          <h2 className="font-semibold text-accent-foreground">
            One account, your restaurant teams
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-accent-foreground">
            Open a workspace to view setup progress, restaurant settings, and
            team access according to your role. Menus, orders, and POS tools
            will follow in a future release.
          </p>
        </div>
      </main>
    </div>
  );
}
