/** Page copy, transcribed from the Figma design (file CO08jDXzqSImiVJLDsC18v). */

export const nav = {
  links: [
    { label: "Нүүр", href: "#top" },
    { label: "Үнэ", href: "#une" },
  ],
} as const;

export const hero = {
  badge: "ХҮҮХДИЙН ХӨГЖЛИЙН ҮНЭЛГЭЭ",
  title: "Хүүхдийнхээ зөв бичих чадварыг өнөөдрөөс тодорхойлоорой",
  lead: "5-7 насны хүүхдийн үсэг таних, зөв бичих чадварыг тогтоож, түвшинд нь тохирсон суралцах төлөвлөгөөг санал болгоно.",
  metaChips: [
    { label: "Үнэлгээ 5-8 минут" },
    { label: "Үр дүн 5-8 минут" },
  ],
  cta: "Үнэлгээг эхлүүлэх",
} as const;

export interface PricingPlanContent {
  readonly id: string;
  readonly name: string;
  readonly price: string;
  readonly features: readonly string[];
  readonly featured: boolean;
  readonly badge?: string;
}

export const pricing = {
  eyebrow: "ТӨЛБӨР & ҮЙЛЧИЛГЭЭ",
  heading: "Хүүхэддээ тохирох багцыг сонгоорой",
  description:
    "Үнэлгээ бүрийн дараа дэлгэрэнгүй тайлан, хөгжүүлэх зөвлөмжийг и-мэйлээр хүлээн авах, эсвал апп татан ашиглах боломжтой.",
  plans: [
    {
      id: "standard",
      name: "Стандарт",
      price: "29,900₮",
      features: ["Нэг хүүхдийн үнэлгээ", "Дэлгэрэнгүй үр дүн", "Хувийн зөвлөмж"],
      featured: false,
    },
    {
      id: "smart",
      name: "Смарт",
      badge: "Илүү хямнаттай",
      price: "79,900₮",
      features: ["3 удаагийн үнэлгээ", "Ахицын харьцуулалт", "Дэлгэрэнгүй тайлан"],
      featured: true,
    },
  ],
  ctaLabel: "Багц сонгох",
} as const satisfies {
  eyebrow: string;
  heading: string;
  description: string;
  plans: readonly PricingPlanContent[];
  ctaLabel: string;
};

export const footer = {
  tagline: "5-7 насны хүүхдэд зориулсан Монгол хэлний хөгжлийн үнэлгээ.",
  copyright: `© ${new Date().getFullYear()} Орто`,
} as const;
