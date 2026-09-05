import Logo from "@/components/brand/Logo";
import Button from "@/components/ui/Button";
import { nav, footer } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export default function Footer() {
  return (
    <footer className="bg-hill-band">
      <div className="mx-auto flex h-[84px] max-w-[1440px] flex-col items-center justify-center gap-3 border-t border-border-card bg-white/88 px-5 backdrop-blur-sm sm:flex-row sm:justify-between md:px-10 lg:pl-[123px] lg:pr-20">
        <a href="#top" aria-label="ОРто, нүүр хуудас">
          <Logo />
        </a>

        <nav aria-label="Хөл цэс" className="hidden items-center gap-6 lg:flex">
          <ul className="flex items-center gap-6">
            {nav.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
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
      </div>

      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-2 px-5 py-6 text-center md:flex-row md:justify-between md:px-10 md:text-left lg:pl-[123px] lg:pr-20">
        <p className="text-xs text-text-nav">{footer.tagline}</p>
        <p className="text-xs text-text-nav">{footer.copyright}</p>
      </div>
    </footer>
  );
}
