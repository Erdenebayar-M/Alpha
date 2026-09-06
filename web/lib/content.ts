/** Page copy, transcribed from the Figma design (file CO08jDXzqSImiVJLDsC18v). */

export const nav = {
  links: [
    { label: "Нүүр", href: "#top" },
    { label: "Үнэ", href: "#une" },
  ],
  auth: {
    loginLabel: "Нэвтрэх",
    registerLabel: "Бүртгүүлэх",
  },
} as const;

export const storeBadges = {
  downloadLabel: "Татаж авах",
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

export interface ChoiceOption {
  readonly id: string;
  readonly label: string;
}

// Register-child flow, step 1 (Figma node 1218:13205, card 1218:13843).
export const registerChild = {
  ageLabel: "Нас",
  ages: [5, 6, 7, 8],
  ageSuffix: "нас",
  genderLabel: "Хүйс",
  genders: [
    { id: "boy", label: "Хөвгүүн" },
    { id: "girl", label: "Охин" },
  ],
  gradeLabel: "Анги",
  grades: [
    { id: "preschool", label: "Сургуулийн өмнөх" },
    { id: "grade1", label: "1-р анги" },
    { id: "grade2", label: "2-р анги" },
    { id: "grade3", label: "3-р анги" },
  ],
  continueLabel: "Үргэлжлүүлэх",
} as const satisfies {
  ageLabel: string;
  ages: readonly number[];
  ageSuffix: string;
  genderLabel: string;
  genders: readonly ChoiceOption[];
  gradeLabel: string;
  grades: readonly ChoiceOption[];
  continueLabel: string;
};

// Register-child flow, step 2 (Figma node 1218:13643, card 1218:13786).
// Choices transcribed verbatim from the design, including the third option's
// Latin "o" (бороo vs. бороо/боро) — likely a Figma typo, but CLAUDE.md
// forbids inventing or "correcting" vocabulary. The design marks no answer
// as correct, so none is recorded here.
export const diagnostic = {
  eyebrow: "СОНСООД ЗӨВ ҮГИЙГ СОНГООРОЙ",
  question: "Аль үгийг зөв бичсэн бэ?",
  audioSrc: "/audio/boroo.mp3",
  audioHint: "Дууг сонсох",
  choices: ["бороо", "боро", "бороo"],
  skipLabel: "Алгасах",
  nextLabel: "Дараагийнх",
  // TODO: no Figma node for the post-diagnostic state — confirm copy with design.
  doneMessage: "Баярлалаа! Таны мэдээллийг хүлээн авлаа.",
} as const;
