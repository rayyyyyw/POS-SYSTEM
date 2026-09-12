import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  Coffee,
  CookingPot,
  Layers3,
  Menu,
  PackageCheck,
  ReceiptText,
  Store,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import { AccessRequestForm } from "@/components/marketing/access-request-form";
import { RestaurantVision } from "@/components/marketing/restaurant-vision";
import { Button } from "@/components/ui/button";

const description =
  "A restaurant POS and management platform in development. Request early access and help shape a simpler way to connect your team, service, and operations.";

export const metadata: Metadata = {
  title: "POS System | Built around your restaurant",
  description,
  openGraph: {
    title: "POS System | Built around your restaurant",
    description,
    type: "website",
    siteName: "POS System",
  },
  twitter: { card: "summary", title: "POS System", description },
};

const navigation = [
  { href: "#features", label: "The platform" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQs" },
];

const capabilities = [
  {
    icon: UsersRound,
    title: "A home for your team",
    description:
      "Individual accounts and restaurant memberships lay the foundation for owners, managers, and cashiers to work together.",
    status: "Account foundation",
    current: true,
  },
  {
    icon: ReceiptText,
    title: "Service that flows",
    description:
      "Connected menus, orders, and payments are planned to bring your front-of-house workflow into one place.",
    status: "Planned",
    current: false,
  },
  {
    icon: PackageCheck,
    title: "A clearer back of house",
    description:
      "Inventory and product tools are planned to help you understand what is on hand and what needs attention.",
    status: "Planned",
    current: false,
  },
  {
    icon: ChartNoAxesCombined,
    title: "See the bigger picture",
    description:
      "Restaurant sales and operational reporting will follow the order and payment tools, using your actual activity.",
    status: "Planned",
    current: false,
  },
];

const steps = [
  {
    number: "01",
    title: "Tell us about your restaurant",
    description:
      "Share a few details and submit an early-access request. It goes to our team for review.",
  },
  {
    number: "02",
    title: "Start with an invitation",
    description:
      "When your request is approved, an invitation connects your individual account to your restaurant.",
  },
  {
    number: "03",
    title: "Help shape what comes next",
    description:
      "Start with account onboarding. Restaurant operations will become available in later releases.",
  },
];

const questions = [
  {
    question: "Can I use POS System to take orders today?",
    answer:
      "Not yet. We are establishing restaurant accounts and onboarding first. Menus, order taking, payments, inventory, and restaurant sales reports are planned for later releases. Early access does not include a working checkout or POS terminal.",
  },
  {
    question: "Who is early access for?",
    answer:
      "Restaurant owners and operators interested in helping shape the product. Whether you run a café, a neighborhood restaurant, or a quick-service kitchen, you can tell us about your business and request access.",
  },
  {
    question: "Will everyone share the restaurant's login?",
    answer:
      "No. Each person uses an individual account connected to a restaurant through a membership. The foundation supports different restaurant roles, keeping personal identity separate from the business account.",
  },
  {
    question: "What happens after I submit a request?",
    answer:
      "Your request is saved for review. Submitting it does not create a restaurant account or guarantee an invitation or launch date. If approved, onboarding begins with an invitation to the email address you provided.",
  },
  {
    question: "How much will it cost?",
    answer:
      "Pricing has not been announced. There is no payment step in the early-access request. Product availability and pricing will be shared before you choose any paid service.",
  },
];

function Brand() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-tight" aria-label="POS System home">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-white">
        <UtensilsCrossed className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="text-lg">POS System<span className="text-primary">.</span></span>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="bg-[#fcfcf8] text-foreground">
      <a href="#main-content" className="sr-only fixed top-3 left-3 z-50 rounded-lg bg-white px-4 py-3 shadow-lg focus:not-sr-only">
        Skip to content
      </a>
      <header className="relative z-20 border-b border-foreground/8 bg-[#fcfcf8]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <Brand />
          <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} className="text-sm text-foreground/70 transition-colors hover:text-primary">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-5 md:flex">
            <Link href="/login" className="text-sm font-medium transition-colors hover:text-primary">Log in</Link>
            <Button asChild className="h-10 rounded-full px-5">
              <a href="#request-access">Request early access <ArrowUpRight className="size-3.5" aria-hidden="true" /></a>
            </Button>
          </div>
          <details className="group md:hidden">
            <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-border [&::-webkit-details-marker]:hidden" aria-label="Open navigation">
              <Menu className="size-5" aria-hidden="true" />
            </summary>
            <nav aria-label="Mobile navigation" className="absolute inset-x-0 top-20 grid gap-1 border-b bg-[#fcfcf8] p-5 shadow-lg">
              {navigation.map((item) => (
                <a key={item.href} href={item.href} className="rounded-lg px-3 py-3 text-sm hover:bg-accent">{item.label}</a>
              ))}
              <Link href="/login" className="rounded-lg px-3 py-3 text-sm hover:bg-accent">Log in</Link>
              <Button asChild className="mt-2 h-11"><a href="#request-access">Request early access <ArrowRight /></a></Button>
            </nav>
          </details>
        </div>
      </header>

      <main id="main-content">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.02fr_1fr] lg:gap-12 lg:px-12 lg:py-24">
          <div>
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-accent-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              Built for restaurants. Taking shape with you.
            </div>
            <h1 className="max-w-xl text-[clamp(2.8rem,5.1vw,4.6rem)] leading-[1.06] font-semibold tracking-[-0.065em]">
              More time for<br />
              <span className="text-primary">what you serve.</span>
            </h1>
            <p className="mt-7 max-w-[29rem] text-base leading-7 text-foreground/65 sm:text-lg sm:leading-8">
              A calmer way to run your restaurant is taking shape. Help us build one home for your team, your service, and everything behind it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild className="h-12 rounded-full px-6 text-sm">
                <a href="#request-access">Request early access <ArrowRight className="ml-1 size-4" /></a>
              </Button>
              <a href="#features" className="inline-flex items-center gap-2 px-2 py-3 text-sm font-medium hover:text-primary">
                Explore the vision <ArrowDown className="size-4" aria-hidden="true" />
              </a>
            </div>
            <p className="mt-5 text-xs leading-5 text-muted-foreground">Early-stage product · Invitation-based onboarding · POS tools coming later</p>
          </div>
          <RestaurantVision />
        </section>

        <section aria-label="Who we are building for" className="border-y border-foreground/8 bg-white/60">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-7 sm:px-8 md:flex-row md:items-center lg:px-12">
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">For the people behind every plate</p>
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm font-medium text-foreground/75 lg:gap-x-12">
              <span className="inline-flex items-center gap-2.5"><Coffee className="size-[18px] text-primary" aria-hidden="true" />Cafés</span>
              <span className="inline-flex items-center gap-2.5"><UtensilsCrossed className="size-[18px] text-primary" aria-hidden="true" />Restaurants</span>
              <span className="inline-flex items-center gap-2.5"><CookingPot className="size-[18px] text-primary" aria-hidden="true" />Quick-service kitchens</span>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="grid gap-5 md:grid-cols-2 md:items-end md:gap-16">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">The platform we are building</p>
              <h2 className="mt-4 max-w-lg text-3xl leading-[1.15] font-semibold tracking-[-0.045em] sm:text-4xl">Your restaurant.<br />A more connected day.</h2>
            </div>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              We are starting with the essentials: restaurant identities, individual accounts, and thoughtful onboarding. The daily operations tools come next.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map(({ icon: Icon, title, description: text, status, current }) => (
              <article key={title} className="flex flex-col rounded-2xl border border-foreground/10 bg-white p-6">
                <span className="mb-7 flex size-11 items-center justify-center rounded-xl bg-accent text-primary"><Icon className="size-5" aria-hidden="true" /></span>
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{text}</p>
                <span className={`mt-6 w-fit rounded-full px-2.5 py-1 text-[11px] font-medium ${current ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{status}</span>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-8 border-y border-foreground/8 bg-[#f1f5ee]">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24 lg:px-12 lg:py-24">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">A considered start</p>
              <h2 className="mt-4 text-3xl leading-[1.15] font-semibold tracking-[-0.045em] sm:text-4xl">Good service starts<br />with a good setup.</h2>
              <p className="mt-5 max-w-sm text-base leading-7 text-foreground/65">We are opening access in stages, with room to learn from the people who will use it every day.</p>
              <a href="#request-access" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">Be part of what comes next <ArrowRight className="size-4" aria-hidden="true" /></a>
            </div>
            <ol className="space-y-8">
              {steps.map((step) => (
                <li key={step.number} className="flex gap-5 sm:gap-7">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-white/70 font-mono text-xs text-primary">{step.number}</span>
                  <div className="border-b border-primary/12 pb-7">
                    <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-foreground/65">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="faq" className="mx-auto grid max-w-7xl scroll-mt-8 gap-8 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24 lg:px-12 lg:py-24">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">A few things to know</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Clear from the start.</h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-muted-foreground">Where the product is today, and what early access means for your restaurant.</p>
          </div>
          <div className="border-t border-foreground/10">
            {questions.map(({ question, answer }) => (
              <details key={question} className="group border-b border-foreground/10 py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-sm font-semibold sm:text-base [&::-webkit-details-marker]:hidden">
                  {question}<ChevronDown className="size-[18px] shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="max-w-xl pr-8 pb-5 text-sm leading-7 text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="request-access" className="scroll-mt-8 px-5 pb-16 sm:px-8 lg:px-12 lg:pb-24">
          <div className="mx-auto grid max-w-[1184px] overflow-hidden rounded-3xl border border-primary/10 bg-white lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative overflow-hidden bg-[#123a29] px-7 py-10 text-white sm:p-12 lg:flex lg:flex-col lg:justify-between">
              <div className="absolute -right-28 -bottom-32 size-96 rounded-full border border-white/10" aria-hidden="true" />
              <div className="absolute -right-16 -bottom-20 size-72 rounded-full border border-white/10" aria-hidden="true" />
              <div className="relative">
                <span className="mb-8 inline-flex size-12 items-center justify-center rounded-2xl border border-white/20 bg-white/5"><Store className="size-6" aria-hidden="true" /></span>
                <p className="text-xs font-medium tracking-[0.16em] text-green-200 uppercase">Let&apos;s build a better everyday</p>
                <h2 className="mt-4 max-w-sm text-3xl leading-[1.12] font-semibold tracking-[-0.045em] sm:text-4xl">Your next chapter<br />starts here.</h2>
                <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">Tell us a little about your restaurant. We will review your request as we prepare the next stage of POS System.</p>
              </div>
              <div className="relative mt-10 space-y-3 text-sm text-white/85">
                <p className="flex items-center gap-3"><Check className="size-4 text-green-200" aria-hidden="true" />No payment details required</p>
                <p className="flex items-center gap-3"><Check className="size-4 text-green-200" aria-hidden="true" />An invitation when your request is approved</p>
              </div>
            </div>
            <div className="p-7 sm:p-12"><AccessRequestForm /></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <div><Brand /><p className="mt-3 text-xs text-muted-foreground">Thoughtfully built for the people behind the service.</p></div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-primary">The platform</a>
            <a href="#faq" className="hover:text-primary">FAQs</a>
            <Link href="/login" className="hover:text-primary">Log in</Link>
          </nav>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Layers3 className="size-3.5" aria-hidden="true" />POS System · Early access</span>
        </div>
      </footer>
    </div>
  );
}
