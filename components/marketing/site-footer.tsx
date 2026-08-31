import Link from "next/link";
import Image from "next/image";

/** X and TikTok don't ship with lucide, so they're inlined as paths. */
function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-1.85-2.48V9.75a5.7 5.7 0 1 0 4.94 5.65V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.24-1.48z" />
    </svg>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border px-5 py-12">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/" className="flex items-center gap-1">
              <Image src="/logo-icon.png" alt="5" width={24} height={24} />
              <span className="lp-display text-[15px] font-semibold text-foreground">number</span>
            </Link>
            <p className="mt-3 max-w-[38ch] text-[13px] leading-relaxed text-muted-foreground">
              Virtual numbers for SMS verification. Real SIMs, live stock, pay as you go.
            </p>

            <div className="mt-4 flex items-center gap-2">
              <a
                href="https://www.tiktok.com/@5_numbersms"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="5number on TikTok"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <TikTokIcon />
              </a>
              <a
                href="https://x.com/5numbersms"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="5number on X"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <XIcon />
              </a>
            </div>
          </div>

          <div className="flex gap-14">
            <div>
              <p className="text-[12.5px] font-semibold text-foreground">Product</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/signup" className="text-[13px] text-muted-foreground hover:text-foreground">
                    Create account
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-[13px] text-muted-foreground hover:text-foreground">
                    Log in
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-[12.5px] font-semibold text-foreground">Legal</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/privacy" className="text-[13px] text-muted-foreground hover:text-foreground">
                    Privacy policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-[13px] text-muted-foreground hover:text-foreground">
                    Terms of service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-border pt-6 text-[12.5px] text-muted-foreground">
          © {year} 5number. Numbers are for verifying accounts you own.
        </p>
      </div>
    </footer>
  );
}
