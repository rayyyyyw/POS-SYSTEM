import { ArrowUpRight, CircleDot, Store, UsersRound, UtensilsCrossed } from "lucide-react";

export function RestaurantVision() {
  return (
    <figure className="relative mx-auto w-full max-w-[540px]">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-[#e9eee2] p-5 sm:p-7">
        <div className="flex items-center justify-between text-[10px] font-medium tracking-[0.14em] text-[#53624c] uppercase">
          <span>Built around your restaurant</span>
          <span className="flex items-center gap-1.5"><CircleDot className="size-3" aria-hidden="true" />Our vision</span>
        </div>
        <div className="relative my-6 flex aspect-[1.28] items-center justify-center overflow-hidden rounded-2xl bg-[#173e2c] sm:my-7" aria-hidden="true">
          <div className="absolute -top-20 -left-24 size-72 rounded-full border border-white/10" />
          <div className="absolute -top-7 -left-11 size-48 rounded-full border border-white/10" />
          <div className="absolute -right-24 -bottom-24 size-80 rounded-full border border-white/10" />
          <div className="absolute -right-10 -bottom-10 size-52 rounded-full border border-white/10" />
          <span className="absolute top-5 left-5 text-[9px] font-medium tracking-[0.18em] text-white/45 uppercase">People. Service. Possibility.</span>
          <div className="absolute top-11 right-6 h-24 w-14 rotate-[15deg] rounded-md border border-white/10 bg-white/5 p-3 sm:top-12 sm:right-9 sm:h-28 sm:w-16">
            <div className="h-1 w-5 rounded bg-white/40" /><div className="mt-3 h-px w-full bg-white/15" /><div className="mt-2 h-px w-full bg-white/15" /><div className="mt-2 h-px w-2/3 bg-white/15" /><div className="mt-4 h-1 w-4 rounded bg-green-200/50" />
          </div>
          <div className="relative flex size-40 items-center justify-center rounded-full border-[9px] border-[#eceede] bg-[#f8f7ec] shadow-[0_15px_45px_#001d1950] sm:size-48 sm:border-[11px]">
            <div className="flex size-[83%] flex-col items-center justify-center rounded-full border border-[#d8dcc7]">
              <UtensilsCrossed className="size-8 text-[#426346] sm:size-9" strokeWidth={1.4} />
              <span className="mt-3 text-[10px] font-semibold tracking-[0.2em] text-[#426346] uppercase">Your restaurant</span>
            </div>
          </div>
          <div className="absolute bottom-7 left-4 flex -rotate-6 items-center gap-2.5 rounded-xl border border-white/30 bg-[#fbfaf2] p-3 shadow-lg sm:bottom-8 sm:left-6">
            <span className="flex size-8 items-center justify-center rounded-full bg-[#e7edde] text-primary"><UsersRound className="size-4" /></span>
            <div><p className="text-[10px] font-semibold text-[#25412d]">People at the center</p><p className="mt-0.5 text-[9px] text-[#7d8674]">Individual accounts. One team.</p></div>
          </div>
          <span className="absolute right-5 bottom-5 flex size-8 items-center justify-center rounded-full border border-white/20 text-green-200"><ArrowUpRight className="size-4" /></span>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#d4ddca] bg-white/65 px-4 py-3.5">
          <div className="flex items-center gap-3"><Store className="size-5 text-primary" aria-hidden="true" /><div><p className="text-xs font-semibold text-[#294032]">A foundation for your next chapter</p><p className="mt-1 text-[10px] leading-4 text-[#6e7a65]">Starting with accounts &amp; restaurant onboarding</p></div></div>
          <span className="hidden size-6 shrink-0 items-center justify-center rounded-full bg-[#e8eedf] text-primary min-[430px]:flex"><ArrowUpRight className="size-3" aria-hidden="true" /></span>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">Our product direction. Restaurant operations tools are planned.</figcaption>
    </figure>
  );
}
