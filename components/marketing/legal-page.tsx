import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/marketing/site-footer";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-[820px] items-center gap-4 px-5">
          <Link href="/" className="flex shrink-0 items-center gap-1">
            <Image src="/logo-icon.png" alt="5" width={26} height={26} />
            <span className="lp-display text-[16px] font-semibold text-foreground">number</span>
          </Link>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[820px] px-5 py-14">
        <h1 className="lp-display text-[34px] font-bold leading-tight text-foreground">{title}</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">Last updated {updated}</p>

        <div className="legal mt-10 space-y-8">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}

/** One section of a legal document. */
export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="lp-display text-[19px] font-semibold text-foreground">{heading}</h2>
      <div className="mt-3 space-y-3 text-[14.5px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
