/**
 * Central place for every external/app link on the marketing site.
 * Real URLs (App Store, Google Play, login/register, download) were not
 * provided yet — swap the "#" placeholders below when they're available.
 */
export const siteConfig = {
  name: "ОРто",
  description:
    "5-7 насны хүүхдийн Монгол хэлний зөв бичих чадварыг тодорхойлж, түвшинд нь тохирсон суралцах төлөвлөгөө санал болгодог хөгжлийн үнэлгээ.",
  url: "https://orto.mn",

  assessmentUrl: "/register-child",
  // The homepage's existing pricing anchor, reused as a cross-page nav
  // destination from other routes (e.g. /landing-new's "Үнэ" link).
  pricingUrl: "/#une",

  // TODO: replace with the real destinations.
  appUrl: "#",
  loginUrl: "#",
  registerUrl: "#",
  appStoreUrl: "#",
  playStoreUrl: "#",
} as const;
