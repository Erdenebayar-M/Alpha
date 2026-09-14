import Logo from "@/components/brand/Logo";
import Button from "@/components/ui/Button";
import MobileNav from "@/components/layout/MobileNav";
import { nav, type NavLink } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

interface HeaderProps {
  /** Prefixes the logo and nav-link hashes so they resolve back to the
   *  homepage's sections from another route (e.g. "/" from
   *  /register-child). Home renders with the default "", keeping its
   *  same-page smooth-scroll hashes untouched. */
  basePath?: string;
  /** Per-page link set, passed through to the mobile menu unchanged.
   *  Defaults to the homepage's own links. */
  links?: readonly NavLink[];
  /** "spacious" is the landing redesign's 106px header (Figma node
   *  1360:8937): the link/button group moves off the right edge to a fixed
   *  x=501 and the auth buttons switch to auto-height chrome. Default
   *  callers keep today's compact, right-aligned h-20 layout. */
  variant?: "compact" | "spacious";
  /** href of `links` entry that is this page itself — rendered at 16px with
   *  aria-current="page" instead of the usual 14px/13px. */
  activeHref?: string;
}

/** Transparent header sitting directly on the hero sky (Figma: node
 *  1195:6227 has no fill and no border — the sky gradient behind it reads
 *  straight through). `z-10` keeps it above the hero's bled-up background. */
export default function Header({
  basePath = "",
  links = nav.links,
  variant = "compact",
  activeHref,
}: HeaderProps) {
  const spacious = variant === "spacious";

  return (
    <header className="relative z-10">
      <div
        className={
          spacious
            ? "relative mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 md:px-10 lg:h-[106px] lg:px-20"
            : "mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 md:px-10 lg:px-20"
        }
      >
        <a href={`${basePath}#top`} aria-label="ОРто, нүүр хуудас">
          <Logo />
        </a>

        <nav
          aria-label="Үндсэн цэс"
          className={
            spacious
              ? // Figma places this group at y=49 (~13px below the logo's centre
                // line); the owner chose to centre it with the logo instead
                // (top-[35.5px] — the header's own vertical centre) rather than
                // ship the offset as designed.
                "hidden items-center gap-6 lg:absolute lg:left-[501px] lg:top-[35.5px] lg:flex lg:w-[460px]"
              : "hidden items-center gap-6 lg:flex"
          }
        >
          <ul className="flex items-center gap-6">
            {links.map((link) => {
              const isActive = link.href === activeHref;
              return (
                <li key={link.href}>
                  <a
                    href={`${basePath}${link.href}`}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      isActive
                        ? "text-[16px] font-extrabold text-text-nav transition-colors hover:text-text-nav-strong"
                        : spacious
                          ? "text-[14px] font-extrabold text-text-nav transition-colors hover:text-text-nav-strong"
                          : "text-[13px] font-extrabold text-text-nav transition-colors hover:text-text-nav-strong"
                    }
                  >
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-[5px]">
            <Button variant={spacious ? "navOutlineLg" : "navOutline"} href={siteConfig.loginUrl}>
              {nav.auth.loginLabel}
            </Button>
            <Button variant={spacious ? "navSolidLg" : "navSolid"} href={siteConfig.registerUrl}>
              {nav.auth.registerLabel}
            </Button>
          </div>
        </nav>

        <MobileNav basePath={basePath} links={links} />
      </div>
    </header>
  );
}
