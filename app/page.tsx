import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CalendarClock,
  Check,
  CreditCard,
  Globe2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { SiteFooter } from "@/components/marketing/site-footer";
import { LiveInbox } from "@/components/marketing/live-inbox";
import { FlagMarquee } from "@/components/marketing/flag-marquee";
import { ServiceMarquee } from "@/components/marketing/service-marquee";

export default async function LandingPage() {
  // Everyone sees the homepage, signed in or not. The nav swaps to a link
  // into the app for anyone with a session rather than bouncing them.
  const user = await getAuthenticatedUser();
  const signedIn = Boolean(user);

  return (
    <div className="min-h-screen bg-background">
      {/* ---------------------------------------------------------------- */}
      {/* Nav                                                              */}
      {/* ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-6 px-5">
          <Link href="/" className="flex shrink-0 items-center gap-1">
            <Image src="/logo-icon.png" alt="5" width={28} height={28} priority />
            <span className="lp-display text-[17px] font-semibold text-foreground">number</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-7 md:flex">
            {[
              ["Services", "#services"],
              ["How it works", "#how"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-[13.5px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {signedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3.5 py-1.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-700"
              >
                Go to dashboard
                <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-primary-600 px-3.5 py-1.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden px-5 pb-16 pt-14 sm:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-10%] h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-70 blur-[100px]"
          style={{
            background:
              "radial-gradient(45% 45% at 50% 50%, rgba(5,150,105,0.16), transparent 72%)",
          }}
        />

        <div className="relative mx-auto grid max-w-[1180px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 shadow-sm">
              <span className="lp-blink h-1.5 w-1.5 rounded-full bg-primary-600" />
              <span className="text-[12.5px] text-muted-foreground">
                Live numbers in 69 countries
              </span>
            </div>

            <h1 className="lp-display mt-6 text-[40px] font-bold leading-[1.06] text-foreground sm:text-[56px]">
              Get a number.
              <br />
              Get your code.
            </h1>

            <p className="mt-5 max-w-[50ch] text-[15.5px] leading-relaxed text-muted-foreground">
              Real SIM-backed numbers for verifying WhatsApp, Telegram, Instagram and 200 more
              services. Pick one, receive the SMS, move on. Or rent a number and keep it for weeks.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {signedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="group inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-3 text-[14.5px] font-semibold text-white shadow-[0_10px_28px_-12px_rgba(5,150,105,0.9)] transition-colors hover:bg-primary-700"
                  >
                    Buy a number
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/rent"
                    className="rounded-lg border border-border bg-white px-5 py-3 text-[14.5px] font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Rent a number
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="group inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-3 text-[14.5px] font-semibold text-white shadow-[0_10px_28px_-12px_rgba(5,150,105,0.9)] transition-colors hover:bg-primary-700"
                  >
                    Start verifying
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-lg border border-border bg-white px-5 py-3 text-[14.5px] font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    I have an account
                  </Link>
                </>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-primary-600" />
                Pay only when the code arrives
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-primary-600" />
                From $1, no subscription
              </span>
            </div>
          </div>

          <LiveInbox />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Countries + live numbers                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-y border-border bg-muted/40 py-11">
        <p className="mb-5 text-center text-[12.5px] font-medium text-muted-foreground">
          Numbers available from 69 countries
        </p>
        <FlagMarquee />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Two ways to buy                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="lp-display max-w-[20ch] text-[30px] font-bold leading-tight text-foreground sm:text-[36px]">
            Two ways to get a number
          </h2>
          <p className="mt-3 max-w-[56ch] text-[15px] text-muted-foreground">
            One code and you&apos;re done, or a number that stays yours for weeks.
          </p>

          <div className="mt-9 grid gap-4 md:grid-cols-2">
            {[
              {
                icon: Zap,
                title: "Activation",
                copy: "A number for one service, one time. The code lands in seconds and the number releases itself afterwards. Cheapest way to verify a single account.",
                points: [
                  "From a few cents per number",
                  "200+ services supported",
                  "Nothing charged if no code arrives",
                ],
              },
              {
                icon: CalendarClock,
                title: "Rental",
                copy: "Keep one number for a week or a month and receive unlimited messages on it. For accounts you need to log back into, or re-verify later.",
                points: [
                  "Unlimited SMS for the whole period",
                  "Extend before it expires",
                  "Full message history kept",
                ],
              },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.title}
                  className="rounded-2xl border border-border bg-white p-6 shadow-[0_2px_10px_-4px_rgba(15,32,60,0.08)]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600/10">
                    <Icon size={18} className="text-primary-600" />
                  </span>
                  <h3 className="lp-display mt-4 text-[20px] font-semibold text-foreground">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{c.copy}</p>
                  <ul className="mt-5 space-y-2">
                    {c.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-[13.5px] text-foreground">
                        <Check size={15} className="mt-0.5 shrink-0 text-primary-600" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works — a real sequence, so numbered                       */}
      {/* ---------------------------------------------------------------- */}
      <section id="how" className="border-t border-border bg-muted/40 px-5 py-20">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="lp-display text-[30px] font-bold leading-tight text-foreground sm:text-[36px]">
            Three steps, about a minute
          </h2>

          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "Add funds",
                d: "Top up by card, bank transfer or USSD. Any amount from $1, and no subscription.",
              },
              {
                n: "2",
                t: "Pick a service",
                d: "Choose the app you're verifying and a country. Live stock and the exact price show before you buy.",
              },
              {
                n: "3",
                t: "Receive the code",
                d: "Your number appears instantly. Paste it into the app you're signing up for and the SMS lands here.",
              },
            ].map((s) => (
              <li key={s.n}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white">
                  <span className="lp-display text-[14px] font-semibold">{s.n}</span>
                </div>
                <h3 className="lp-display mt-4 text-[17px] font-semibold text-foreground">{s.t}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Services                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section id="services" className="px-5 py-20">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="lp-display text-[30px] font-bold leading-tight text-foreground sm:text-[36px]">
            Verify almost anything
          </h2>
          <p className="mt-3 max-w-[56ch] text-[15px] text-muted-foreground">
            Messaging apps, marketplaces, exchanges, banking, delivery, gaming. If it sends an SMS
            code, there&apos;s probably a number for it.
          </p>
        </div>

        <div className="mt-9">
          <ServiceMarquee />
        </div>

        <div className="mx-auto mt-7 max-w-[1180px]">
          <span className="inline-flex rounded-lg border border-primary-600/25 bg-primary-600/10 px-3 py-1.5 text-[13px] font-medium text-primary-700">
            + 200 more services
          </span>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Why                                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-border px-5 py-20">
        <div className="mx-auto grid max-w-[1180px] gap-9 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: ShieldCheck,
              t: "Real SIMs, not VOIP",
              d: "Numbers come from actual mobile operators, so services accept them instead of rejecting them as virtual.",
            },
            {
              icon: Zap,
              t: "Codes in seconds",
              d: "Messages appear the moment they arrive. No refreshing, no waiting on a support ticket.",
            },
            {
              icon: CreditCard,
              t: "Pay how you want",
              d: "Card, bank transfer or USSD. Your balance is held in dollars so prices never shift under you.",
            },
            {
              icon: Globe2,
              t: "69 countries",
              d: "From the UK and US to Nigeria, India and the Philippines. Pick the region a service expects.",
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.t}>
                <Icon size={19} className="text-primary-600" />
                <h3 className="lp-display mt-3.5 text-[16px] font-semibold text-foreground">
                  {f.t}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{f.d}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* FAQ                                                               */}
      {/* ---------------------------------------------------------------- */}
      <section id="faq" className="border-t border-border bg-muted/40 px-5 py-20">
        <div className="mx-auto max-w-[760px]">
          <h2 className="lp-display text-[30px] font-bold leading-tight text-foreground sm:text-[36px]">
            Questions
          </h2>

          <div className="mt-8 divide-y divide-border">
            {[
              {
                q: "What happens if the code never arrives?",
                a: "You're not charged for a number that never receives anything. Cancel it and the money stays in your wallet.",
              },
              {
                q: "Can I reuse a number later?",
                a: "Activation numbers are one-time — once the code arrives, the number is released. If you need to keep receiving messages, rent a number instead.",
              },
              {
                q: "How do I pay from outside Nigeria?",
                a: "Cards issued anywhere work. You're charged the naira equivalent and your bank converts it at their rate.",
              },
              {
                q: "Is there a minimum top-up?",
                a: "One dollar. There's no maximum and no subscription — your balance sits there until you spend it.",
              },
              {
                q: "Which countries can I get numbers from?",
                a: "69 at the moment, including the UK, US, Nigeria, India, Indonesia, the Philippines and most of Europe. Stock changes constantly, so the dashboard shows what's live right now.",
              },
              {
                q: "Can I use these numbers for my bank?",
                a: "No. Numbers are recycled once your order ends, so someone else could later receive messages sent to them. Keep them away from banking, government services and email recovery.",
              },
            ].map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-foreground marker:hidden">
                  {f.q}
                  <span className="shrink-0 text-[18px] leading-none text-muted-foreground transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2.5 max-w-[62ch] text-[14px] leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* CTA                                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-border px-5 py-20">
        <div className="mx-auto max-w-[620px] text-center">
          <h2 className="lp-display text-[32px] font-bold leading-tight text-foreground sm:text-[38px]">
            {signedIn ? "Pick up where you left off" : "Your number is waiting"}
          </h2>
          <p className="mx-auto mt-3.5 max-w-[46ch] text-[15px] text-muted-foreground">
            {signedIn
              ? "Your wallet and numbers are in the dashboard."
              : "Create an account, add a dollar, and verify whatever you came here to verify."}
          </p>
          <Link
            href={signedIn ? "/dashboard" : "/signup"}
            className="group mt-7 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_28px_-12px_rgba(5,150,105,0.9)] transition-colors hover:bg-primary-700"
          >
            {signedIn ? "Open dashboard" : "Create free account"}
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
