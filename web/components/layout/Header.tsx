import Logo from "@/components/brand/Logo";
import Button from "@/components/ui/Button";
import MobileNav from "@/components/layout/MobileNav";
import { nav } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

interface HeaderProps {
  /** Prefixes the logo and nav-link hashes so they resolve back to the
   *  homepage's sections from another route (e.g. "/" from
   *  /register-child). Home renders with the default "", keeping its
   *  same-page smooth-scroll hashes untouched. */
  basePath?: string;
}

/** Transparent header sitting directly on the hero sky (Figma: node
 *  1195:6227 has no fill and no border — the sky gradient behind it reads
 *  straight through). `z-10` keeps it above the hero's bled-up background. */
export default function Header({ basePath = "" }: HeaderProps) {
  return (
    <header className="relative z-10">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 md:px-10 lg:px-20">
        <a href={`${basePath}#top`} aria-label="ОРто, нүүр хуудас">
          <Logo />
        </a>

        <nav aria-label="Үндсэн цэс" className="hidden items-center gap-6 lg:flex">
          <ul className="flex items-center gap-6">
            {nav.links.map((link) => (
              <li key={link.href}>
                <a
                  href={`${basePath}${link.href}`}
                  className="text-[13px] font-extrabold text-text-nav transition-colors hover:text-text-nav-strong"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-[5px]">
            <Button variant="navOutline" href={siteConfig.loginUrl}>
              Нэвтрэх
            </Button>
            <Button variant="navSolid" href={siteConfig.registerUrl}>
              Бүртгүүлэх
            </Button>
          </div>
        </nav>

        <MobileNav basePath={basePath} />
      </div>
    </header>
  );
}
