"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ClipboardCheck,
  Home,
  LogOut,
  Menu,
  Settings2,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import type { MemberRole, RestaurantStatus } from "@/generated/prisma/enums";
import {
  canAccessRestaurant,
  restaurantNavigation,
} from "@/lib/domain/restaurant/policies";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Membership = {
  id: string;
  role: MemberRole;
  restaurant: { id: string; name: string; status: RestaurantStatus };
};
type Props = {
  restaurant: Membership["restaurant"];
  role: MemberRole;
  user: { name: string; email: string };
  memberships: Membership[];
  children: ReactNode;
};
const icons = {
  overview: Home,
  onboarding: ClipboardCheck,
  teamRead: Users,
  settingsRead: Settings2,
};
const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

export function RestaurantShell({
  restaurant,
  role,
  user,
  memberships,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const root = `/workspace/${restaurant.id}`;
  const navigation = (close?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="px-5 py-7">
        <Link href={root} className="flex items-center gap-3 font-semibold">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-5" aria-hidden="true" />
          </span>
          <span>Restaurant workspace</span>
        </Link>
        <p className="mt-3 text-xs text-muted-foreground">POS System</p>
      </div>
      <nav aria-label="Restaurant navigation" className="flex-1 space-y-1 px-3">
        {restaurantNavigation
          .filter((item) =>
            canAccessRestaurant(role, restaurant.status, item.permission),
          )
          .map((item) => {
            const href = root + item.segment,
              selected = pathname === href,
              Icon = icons[item.permission];
            return (
              <Link
                key={item.segment}
                href={href}
                onClick={close}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm",
                  selected
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
      </nav>
      <div className="space-y-3 border-t p-5">
        <p className="break-words text-sm font-medium">{user.name}</p>
        <p className="break-all text-xs text-muted-foreground">{user.email}</p>
        <Badge variant="outline">{label(role)}</Badge>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start px-0"
          >
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen">
      <a
        href="#restaurant-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:bg-card focus:p-3"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card lg:block">
        {navigation()}
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-20 items-center gap-3 border-b bg-card px-4 py-3 sm:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open restaurant navigation"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Restaurant navigation</SheetTitle>
                <SheetDescription>
                  Navigate your restaurant account.
                </SheetDescription>
              </SheetHeader>
              {navigation(() => setOpen(false))}
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{restaurant.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {label(role)} workspace
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {label(restaurant.status)}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Switch restaurant"
              >
                <ArrowLeftRight aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="max-h-80 w-72 overflow-y-auto"
            >
              <DropdownMenuLabel>Your restaurants</DropdownMenuLabel>
              {memberships.map((member) => (
                <DropdownMenuItem asChild key={member.id}>
                  <Link
                    href={`/workspace/${member.restaurant.id}`}
                    className="flex-col items-start"
                  >
                    <span className="max-w-full break-words">
                      {member.restaurant.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {label(member.role)} · {label(member.restaurant.status)}
                      {member.restaurant.id === restaurant.id
                        ? " · Current"
                        : ""}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem asChild>
                <Link href="/workspace">All memberships</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main
          id="restaurant-content"
          tabIndex={-1}
          className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8 sm:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
