/** Page copy, transcribed from the Figma design (file CO08jDXzqSImiVJLDsC18v). */

import { siteConfig } from "@/lib/site-config";

export interface NavLink {
  readonly label: string;
  readonly href: string;
}

export const nav = {
  links: [
    { label: "Нүүр", href: "#top" },
    { label: "Үнэ", href: "#une" },
  ],
  auth: {
    loginLabel: "Нэвтрэх",
    registerLabel: "Бүртгүүлэх",
  },
} as const satisfies { links: readonly NavLink[]; auth: { loginLabel: string; registerLabel: string } };

// /landing-new's own nav link set (Figma node 1360:8955), passed to Header in
// place of the homepage's `nav.links` above. "Эцэг эхэд" is this page itself
// (Header renders it at 16px with aria-current="page"); the other two are
// existing destinations, sourced from site-config rather than repeated here.
export const landingNav = {
  links: [
    { label: "Эцэг эхэд", href: "#top" },
    { label: "Оношилгоо", href: siteConfig.assessmentUrl },
    { label: "Үнэ", href: siteConfig.pricingUrl },
  ],
} as const satisfies { links: readonly NavLink[] };

export const storeBadges = {
  downloadLabel: "Татаж авах",
} as const;

// /landing-new's hero (Figma node 1360:8705). The heading is one text layer
// authored as two manual lines, kept as a 2-tuple here so the component can
// join them with a <br/> inside a single <h1> rather than relying on wrap.
export const landingHero = {
  badge: "Эцэг эхэд",
  headingLines: [
    "Хүүхдээ илүү сайн ойлгох",
    "Хүүхдийн тань өөртөө итгэх итгэлийг нэмэгдүүлэхэд тусална",
  ] as [string, string],
  lead: "Бага ангийн сурагчид, сургуулийн өмнөх шатны хүүхдүүдэд унших, зөв бичих, суралцахад нь дэмжлэг болох мэдээлэл, судалгаанд суурилсан зөвлөгөө дэмжлэгийг нэг дороос аваарай. ",
  // Accessible name for the <section> landmark — distinct from the visible
  // `badge` text so the two aren't read as the same thing twice.
  sectionLabel: "Эцэг эхэд зориулсан танилцуулга",
  // Accessible name for the cloud + reading-characters illustration
  // (nodes 1360:8712, 1360:8738), which has no on-canvas text of its own.
  artLabel: "Нархан, ОРто хоёр үүл дээр сууж ном уншиж байгаа зураг",
} as const satisfies {
  badge: string;
  headingLines: readonly [string, string];
  lead: string;
  sectionLabel: string;
  artLabel: string;
};

export interface CategoryPill {
  readonly label: string;
  readonly href: string;
}

// /landing-new's Category pills (Figma node 1360:8718), directly under the
// hero. Унших, Зөв бичих and Үсэглэх are Categories (see CONTEXT.md);
// Оношилгоо is not a Category — it's a Diagnostic shortcut, so it links to
// `assessmentUrl` rather than a Category placeholder.
export const categoryPills = {
  // Accessible name for the <nav> landmark grouping the four pills — Figma
  // draws no heading above this row.
  navLabel: "Ангилалын сонголтууд",
  items: [
    { label: "Унших", href: siteConfig.categoryUrls.reading },
    { label: "Зөв бичих", href: siteConfig.categoryUrls.orthography },
    { label: "Оношилгоо", href: siteConfig.assessmentUrl },
    { label: "Үсэглэх", href: siteConfig.categoryUrls.spellingOut },
  ],
} as const satisfies { navLabel: string; items: readonly CategoryPill[] };

// /landing-new's Diagnostic card (Figma node 1401:21880), directly under the
// Category pills. "Оношилгоо" badges the same Diagnostic the "Оношилгоо" nav
// link and pill point at (see CONTEXT.md); "Үнэлгээг эхлүүлэх" is its
// parent-facing CTA wording, matching the homepage's own `hero.cta`.
export const diagnosticCard = {
  badge: "Оношилгоо",
  heading: "Хүүхдийнхээ унших, бичих, үсэглэх чадварыг мэдэхийг хүсч байна уу?",
  body: 'Хүүхэд нэг үгийг өчигдөр зөв бичсэн атлаа өнөөдөр буруу бичихэд "мэдэж байгаа мөртлөө анхаарсангүй" гэж бодох амархан.',
  cta: "Үнэлгээг эхлүүлэх",
} as const satisfies { badge: string; heading: string; body: string; cta: string };

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

// Register-child flow — the three setup steps.
// Gender  node 1218:13205 (card 1268:18752) / selected state 1269:18875
// Name    node 1269:19324 (card 1269:19617)
// Grade   node 1269:19819 (card 1269:20261) / enabled state 1269:20118
//
// The design has no visible heading on any of the three cards, so each step's
// `legend` below exists only as an <fieldset>/<form> accessible name — it is
// rendered sr-only, never drawn. The visible strings (option labels, field
// labels, placeholders) are transcribed from the design as-is.
//
// `grades` is verbatim from node 1269:20305, which jumps preschool -> 2nd year
// with no "1-р анги". Root CLAUDE.md forbids inventing vocabulary, so the gap
// is left as designed rather than filled in.
export const registerChild = {
  genderLegend: "Хүүхдийн хүйс",
  genders: [
    { id: "boy", label: "Эрэгтэй" },
    { id: "girl", label: "Эмэгтэй" },
  ],
  nameLegend: "Хүүхдийн нэр",
  surnameLabel: "Овог",
  surnamePlaceholder: "Батсайхан",
  givenNameLabel: "Нэр",
  givenNamePlaceholder: "Цэцэгмаа",
  gradeLegend: "Хүүхдийн анги",
  grades: [
    { id: "preschool", label: "Сургуулийн өмнөх бэлтгэл" },
    { id: "grade2", label: "2-р анги" },
    { id: "grade3", label: "3-р анги" },
    { id: "grade4", label: "4-р анги" },
  ],
  // The setup CTA is arrow-only in every frame, so this names it for screen
  // readers rather than printing next to the glyph.
  continueLabel: "Үргэлжлүүлэх",
} as const satisfies {
  genderLegend: string;
  genders: readonly ChoiceOption[];
  nameLegend: string;
  surnameLabel: string;
  surnamePlaceholder: string;
  givenNameLabel: string;
  givenNamePlaceholder: string;
  gradeLegend: string;
  grades: readonly ChoiceOption[];
  continueLabel: string;
};

// Register-child flow — the 9-exercise diagnostic that follows setup.
// Chrome shared by every task card (nodes 1270:22692 … 1255:17752); the
// per-exercise prompts and answer options live in lib/diagnostic-tasks.ts.
export const diagnostic = {
  // "ДАСГАЛ {n}" — the count badge (node 1270:22695), which is also this
  // flow's only progress indicator; the design draws no progress bar.
  countBadge: (position: number) => `ДАСГАЛ ${position}`,
  // The live diagnostic's length is adaptive and unknown up front (see
  // lib/api/task-type-map.ts), so `total` is omitted there and this falls
  // back to a plain ordinal instead of a fraction.
  progressLabel: (position: number, total?: number) =>
    total === undefined ? `${position}-р дасгал` : `${position} / ${total} дасгал`,
  nextLabel: "Үргэлжлүүлэх",
  audioHint: "Дууг сонсох",
  // Speech bubble beside the listening mascot, node 1270:22713/22714.
  audioPrompt: "Намайг дараарай!",
  // TODO: neither the post-diagnostic state nor a renderer-failure state has a
  // Figma node — confirm both with design.
  fallbackMessage: "Энэ дасгалыг харуулж чадсангүй. Дараагийнх руу үргэлжлүүлнэ үү.",
  doneTitle: "Баярлалаа!",
  doneMessage: "Таны мэдээллийг хүлээн авлаа.",

  // Copy for the live-diagnostic screens (lib/api/task-type-map.ts). The
  // backend serves task types the nine-card fixture never anticipated — the
  // writing family above all — so those screens have no Figma node and are
  // built from the same task-* tokens. Their copy still lives here rather than
  // inline in the components, like the rest of this flow's chrome.
  live: {
    /** Under the writing field: how much is expected. */
    wordCount: (count: number) => `${count} үг`,
    sentenceCount: (count: number) => `${count} өгүүлбэр`,
    letterCount: (count: number) => `${count} үсэг`,
    audioMissing: "Дуу ачаалагдсангүй.",
    // Header for a choice task whose prompt is itself the sentence being
    // completed — the sentence moves down into its own panel, so the header
    // needs the instruction the backend never sends. This is TT_1_1's own
    // prompt ("Сонсоод зөв хариултыг сонгоорой.") without the listening half,
    // rather than a new phrasing.
    chooseAnswer: "Зөв хариултыг сонгоорой.",
    dictationPlaceholder: "Сонссоноо бичнэ үү",
    fillPlaceholder: "Дутуу үсэг",
    sentenceFillPlaceholder: "Дутуу үг",
    correctionPlaceholder: "Зассан хувилбар",
    copyPlaceholder: "Хуулж бичнэ үү",
    // Visual memory (TT_7_2) — the word shows, then hides.
    memoryPlaceholder: "Санаж байгаагаа бичнэ үү",
    memoryPrompt: "Одоо санаж бичнэ үү.",
    memoryCountdown: (seconds: number) => `${seconds}`,
    selfCheckPlaceholder: "Засварласан хариу",
    selfCheckYours: "Таны хариу",
    selfCheckModel: "Загвар хариу",
  },

  // Headers and drag instructions for the four live task_types routed to the
  // designed punctuation/capital cards (TT_6_1..TT_6_4 — see
  // lib/api/task-type-map.ts). Those tasks send only the sentence to judge, so
  // the card's own instruction has to come from somewhere: these are the
  // design's exact words for those exact exercises, kept verbatim from the
  // fixture in lib/diagnostic-tasks.ts (nodes 1254:16502, 1255:16722,
  // 1255:16988, 1255:17752) rather than written fresh.
  punctuation: {
    choicePrompt: "Өгүүлбэр дуусахад ямар тэмдэг тавих вэ?",
    capitalPrompt: "Өгүүлбэр юугаар эхлэх вэ?",
    periodPrompt: "Өгүүлбэрийн төгсгөлийг олж тэмдэглэ",
    periodInstruction: "Цэгийг чирч өгүүлбэрийн төгсгөлд тавиарай.",
    commaPrompt: "Таслалыг хаана, хаана тавих вэ?",
    commaInstruction: "Таслалыг чирч зөв байрлалд дарна уу",
  },

  // Result screen (components/register/ResultCard.tsx) — also without a Figma
  // node; see the TODO above.
  result: {
    levelConfidence: (label: string) => `Найдвартай байдал: ${label}`,
    cappedByBank: "Энэ ангийн хамгийн хэцүү даалгавруудыг давсан тул түвшин үүнээс өндөр байж болзошгүй.",
    topErrors: (codes: string) => `Түгээмэл алдаа: ${codes}`,
    dailyMinutes: (minutes: number) => `Өдрийн дасгал: ~${minutes} мин`,
  },
} as const;
