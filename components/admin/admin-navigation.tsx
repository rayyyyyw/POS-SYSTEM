"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombined, ChevronDown, ChevronRight, Inbox, LayoutGrid, LogOut, Menu, Settings2, ShieldCheck, Store, Users, type LucideIcon } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/admin/format";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const navigation: { group: string; items: { label: string; href: string; icon: LucideIcon }[] }[] = [
  { group: "Workspace", items: [{ label: "Dashboard", href: "/admin", icon: LayoutGrid }] },
  { group: "Management", items: [{ label: "Restaurants", href: "/admin/restaurants", icon: Store }, { label: "Users", href: "/admin/users", icon: Users }, { label: "Access requests", href: "/admin/requests", icon: Inbox }] },
  { group: "Analytics", items: [{ label: "Reports", href: "/admin/reports", icon: ChartNoAxesCombined }] },
  { group: "System", items: [{ label: "Settings", href: "/admin/settings", icon: Settings2 }] },
];

function Navigation({ onNavigate, platformName }: { onNavigate?: () => void; platformName: string }) {
  const pathname = usePathname();
  return <div className="flex h-full min-h-0 flex-col">
    <div className="px-6 pb-7 pt-7">
      <Link href="/admin" className="flex w-fit items-center gap-3 rounded-md" aria-label={`${platformName} admin dashboard`}>
        <span className="grid size-9 shrink-0 grid-cols-2 gap-1 rounded-lg bg-primary p-2" aria-hidden="true"><span className="rounded-[2px] bg-primary-foreground" /><span className="rounded-[2px] bg-primary-foreground/60" /><span className="col-span-2 rounded-[2px] bg-primary-foreground" /></span>
        <span className="text-lg font-semibold tracking-tight">{platformName}</span>
      </Link>
      <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" aria-hidden="true" />Platform administration</div>
    </div>
    <nav aria-label="Admin navigation" className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">{navigation.map(({ group, items }) => <div key={group}>
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group}</p>
      <ul className="space-y-1">{items.map(({ label, href, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href + "/") || pathname === href;
        return <li key={href}><Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted", active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground hover:bg-sidebar-accent" : "text-sidebar-foreground")}><Icon className="size-[18px]" aria-hidden="true" />{label}{active && <span className="ml-auto size-1.5 rounded-full bg-primary" aria-hidden="true" />}</Link></li>;
      })}</ul>
    </div>)}</nav>
    <div className="mx-5 mb-5 rounded-lg border bg-background p-3.5"><Link href="/" className="text-xs font-medium hover:text-primary hover:underline">View public website ↗</Link><p className="mt-1.5 text-xs leading-5 text-muted-foreground">Manage business accounts and individual access.</p></div>
    <form action={logoutAction} className="border-t p-3"><Button type="submit" variant="ghost" className="w-full justify-start gap-3"><LogOut aria-hidden="true" />Log out</Button></form>
  </div>;
}

export function AdminSidebar({ platformName }: { platformName: string }) {
  return <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-sidebar lg:block"><Navigation platformName={platformName} /></aside>;
}

export function AdminHeader({ profile, platformName }: { profile: { name: string; email: string }; platformName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const section = navigation.flatMap((group) => group.items).find((item) => item.href !== "/admin" && pathname.startsWith(item.href))?.label ?? "Dashboard";
  return <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b bg-card px-4 sm:px-6 lg:px-8">
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation"><Menu aria-hidden="true" /></Button></SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0"><SheetHeader className="sr-only"><SheetTitle>Platform navigation</SheetTitle><SheetDescription>Navigate the admin workspace.</SheetDescription></SheetHeader><Navigation platformName={platformName} onNavigate={() => setOpen(false)} /></SheetContent>
    </Sheet>
    <div className="flex min-w-0 items-center gap-2 text-sm"><span className="hidden text-muted-foreground sm:inline">Workspace</span><ChevronRight className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" /><span className="truncate font-medium">{section}</span></div>
    <div className="ml-auto flex items-center gap-2 sm:gap-4">
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-auto gap-2 px-1.5 py-1" aria-label="Open administrator profile"><span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{initials(profile.name)}</span><span className="hidden text-left leading-4 md:block"><span className="block text-xs font-medium">{profile.name}</span><span className="text-[10px] text-muted-foreground">Platform administrator</span></span><ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64"><DropdownMenuLabel><span className="block">{profile.name}</span><span className="break-all text-xs font-normal text-muted-foreground">{profile.email}</span></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/admin/settings"><Settings2 aria-hidden="true" />Platform settings</Link></DropdownMenuItem><DropdownMenuSeparator /><form action={logoutAction}><button type="submit" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent [&>svg]:size-4"><LogOut aria-hidden="true" />Log out</button></form></DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>;
}
