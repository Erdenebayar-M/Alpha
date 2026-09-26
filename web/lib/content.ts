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
  /** Set on the three Category pills, absent on the Оношилгоо shortcut. */
  readonly category?: Category;
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
    { label: "Унших", href: siteConfig.categoryUrls.reading, category: "Унших" },
    { label: "Зөв бичих", href: siteConfig.categoryUrls.orthography, category: "Зөв бичих" },
    { label: "Оношилгоо", href: siteConfig.assessmentUrl },
    { label: "Үсэглэх", href: siteConfig.categoryUrls.spellingOut, category: "Үсэглэх" },
  ],
} as const satisfies { navLabel: string; items: readonly CategoryPill[] };

// The three literacy areas an Article is tagged with (see web/CONTEXT.md's
// Category glossary entry) — Оношилгоо is deliberately excluded, since it is
// a Diagnostic shortcut rather than a Category.
export type Category = "Унших" | "Зөв бичих" | "Үсэглэх";

// The backend's Article `category` values (shared ARTICLE_CATEGORIES) and the
// Category each one is shown as.
export const categoryByApiValue = {
  READING: "Унших",
  ORTHOGRAPHY: "Зөв бичих",
  SPELLING: "Үсэглэх",
} as const satisfies Record<string, Category>;
export type ArticleCategoryValue = keyof typeof categoryByApiValue;

export interface Article {
  readonly category: Category;
  readonly title: string;
  readonly excerpt: string;
  readonly href: string;
}

// /landing-new's Featured article (Figma node 1401:22062), directly under the
// Category pills — the one Published Article staff have promoted (see
// web/CONTEXT.md). Modelled as an Article rather than a one-off shape so the
// Articles-for-parents grid (a future ticket) can reuse the same interface.
export const featuredArticle = {
  heading: "Онцлох нийтлэл",
  article: {
    category: "Зөв бичих",
    title: "Хүүхэд яагаад нэг үгийг дахин дахин өөрөөр бичдэг вэ?",
    excerpt:
      "Хүүхэд нэг үгийг өчигдөр зөв бичсэн атлаа өнөөдөр буруу бичихэд “мэдэж байгаа мөртлөө анхаарсангүй” гэж бодох амархан...",
    href: siteConfig.featuredArticleUrl,
  },
  // Accessible name for the illustration (ORto, the хойн/хонь word clouds and
  // arrow, and the books — nodes 1401:22076, 1401:22282), which carries no
  // on-canvas text of its own beyond the two words it's demonstrating.
  artLabel: "ОРто, «хойн» гэдэг үгийг «хонь» гэж дахин дахин буруу бичсэн, дэргэд нь ном үүрсэн байгаа зураг",
  readMoreLabel: (title: string) => `«${title}» нийтлэлийг унших`,
} as const satisfies {
  heading: string;
  article: Article;
  artLabel: string;
  readMoreLabel: (title: string) => string;
};

export interface ArticleCardCopy {
  readonly label: string;
  readonly title: string;
  readonly href: string;
}

// /landing-new's Articles-for-parents grid (Figma node 1371:9792), directly
// under the Featured article — three more Articles for parents to browse
// (see web/CONTEXT.md's Article entry). Unlike the Featured article, each
// card's own face shows a generic "Завгүй" eyebrow label rather than a
// Category badge, so this doesn't model cards as `Article`s (no `category`
// or `excerpt` is on canvas) — just the `label`/`title`/`href` Figma
// actually shows. "Завгүй"/"Lorum" are Figma's own placeholders, repeated
// verbatim per card rather than invented per-card copy.
//
// `items` is typed as an exact 3-tuple (not `readonly ArticleCardCopy[]`) so
// that ArticlesGrid.tsx's own per-card `art` config — a same-length tuple
// zipped to this one by index — fails to typecheck the moment the two drift
// out of sync, rather than reading `undefined` off the end of a shorter
// array at render.
export const articlesGrid = {
  heading: "Эцэг эхчүүдэд туслах нийтлэлүүд",
  items: [
    { label: "Завгүй", title: "Lorum", href: siteConfig.articleUrl },
    { label: "Завгүй", title: "Lorum", href: siteConfig.articleUrl },
    { label: "Завгүй", title: "Lorum", href: siteConfig.articleUrl },
  ],
} as const satisfies { heading: string; items: readonly [ArticleCardCopy, ArticleCardCopy, ArticleCardCopy] };

export interface CollectionCardCopy {
  readonly title: string;
  readonly subtitle: string;
  readonly href: string;
}

// /landing-new's Collections row (Figma node 1401:22290), the page's final
// section — five Collections (see web/CONTEXT.md's Collection entry)
// grouping material by theme. Each subtitle states the kind of material the
// Collection holds, per the glossary. Cards 3 and 5 both title "Зөв
// үсэглэх" on purpose (Figma's own copy): the same theme, two different
// Collections (one of exercises, one of 18 articles) — kept verbatim rather
// than deduped, the subtitle is what actually tells them apart.
//
// `items` is typed as an exact 5-tuple (not `readonly CollectionCardCopy[]`)
// so that CollectionsRow.tsx's own per-card `art` config — a same-length
// tuple zipped to this one by index — fails to typecheck the moment the two
// drift out of sync, matching articlesGrid's own tuple above.
export const collectionsRow = {
  heading: "Сэдвээр нь судлаад илүү их ойлголттой болж аваарай",
  items: [
    { title: "Уншихад анхаарах", subtitle: "Дасгалууд", href: siteConfig.collectionUrl },
    { title: "Зөв бичихэд туслах", subtitle: "Дасгалууд", href: siteConfig.collectionUrl },
    { title: "Зөв үсэглэх", subtitle: "Дасгалууд", href: siteConfig.collectionUrl },
    { title: "Эцэг эхэд", subtitle: "Зөвлөмжүүд", href: siteConfig.collectionUrl },
    { title: "Зөв үсэглэх", subtitle: "18 нийтлэл", href: siteConfig.collectionUrl },
  ],
  // Accessible names for the row's prev/next scroll buttons (issue #93) —
  // not in Figma (the design has no button chrome for this row), so this is
  // placeholder-free but still invented UI copy, kept short to match the
  // nav's own terse labelling rather than a full sentence.
  prevLabel: "Өмнөх",
  nextLabel: "Дараах",
} as const satisfies {
  heading: string;
  items: readonly [
    CollectionCardCopy,
    CollectionCardCopy,
    CollectionCardCopy,
    CollectionCardCopy,
    CollectionCardCopy,
  ];
  prevLabel: string;
  nextLabel: string;
};

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

// Sign-in page (Figma frame 7:4257, Orthography file). The Google button and
// the "Эсвэл" divider are drawn in the frame but not shipped yet (see the
// Google sign-in ticket), so their copy is deliberately absent.
export const signIn = {
  title: "Нэвтрэх", // heading 7:6085
  // Corner prompt, "Registration prompt" 7:6082 — reused by every auth card.
  registerPrompt: { label: "Бүртгэлгүй юу?", linkLabel: "Бүртгүүлэх" }, // 7:6083, 7:6084
  // The frame's own label reads "Хэрэглэгчийн нэр эсвэл имэйл хаяг" (7:6132);
  // Parent accounts have no username, so it is relabelled.
  emailLabel: "Имэйл хаяг",
  emailPlaceholder: "hello@tanidomain.com", // 7:6134
  passwordLabel: "Нууц үг", // 7:6264
  passwordPlaceholder: "••••••••", // 7:6267
  forgotPasswordLabel: "Нууц үгээ мартсан уу?", // 7:6265
  submitLabel: "Нэвтрэх", // Primary action 7:6149
  errors: {
    invalidEmail: "Имэйл хаяг буруу байна.",
    invalidCredentials: "Имэйл эсвэл нууц үг буруу байна.",
    rateLimited: "Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.",
    // Backend outage or timeout — not in the frame; wording approved by the owner.
    generic: "Алдаа гарлаа. Дахин оролдоно уу.",
  },
} as const;

// Sign-up page (Figma frame 7:6344, Orthography file). Like the sign-in page,
// the Google button and its divider are not shipped yet, so their copy is
// deliberately absent.
export const signUp = {
  title: "Эцэг эхээр бүртгүүлэх", // heading 7:6749
  // Corner prompt, the sibling of signIn.registerPrompt.
  signInPrompt: { label: "Бүртгэлтэй юу?", linkLabel: "Нэвтрэх" },
  // Field order and grouping are the frame's: Овог and Нэр share one "Field"
  // (7:6759, 10px apart); the rest are 18px apart. `key` is the form-state
  // key; `name` the input name.
  fieldGroups: [
    [
      { key: "surname", name: "surname", type: "text", label: "Овог", placeholder: "Овогоо оруулна уу", autoComplete: "family-name" }, // 7:6760
      { key: "name", name: "name", type: "text", label: "Нэр", placeholder: "Нэрээ оруулна уу", autoComplete: "given-name" }, // 7:6795
    ],
    [{ key: "email", name: "email", type: "email", label: "Имэйл хаяг", placeholder: signIn.emailPlaceholder, autoComplete: "email" }], // 7:6764
    [{ key: "password", name: "password", type: "password", label: "Нууц үг", placeholder: signIn.passwordPlaceholder, autoComplete: "new-password" }], // 7:6768
    [{ key: "confirmPassword", name: "confirmPassword", type: "password", label: "Нууц үгээ давтах", placeholder: signIn.passwordPlaceholder, autoComplete: "new-password" }], // 7:6772
  ],
  submitLabel: "Бүртгүүлэх", // Primary action 7:6775
  errors: {
    name: "Нэр дор хаяж 2 тэмдэгттэй байна.",
    email: "Имэйл хаяг буруу байна.",
    password: "Нууц үг дор хаяж 8 тэмдэгттэй байна.",
    confirmPassword: "Нууц үг таарахгүй байна.",
    duplicateEmail: "Энэ имэйл хаягаар бүртгэл үүссэн байна.",
    duplicateEmailLinkLabel: "Нэвтрэх",
    rateLimited: signIn.errors.rateLimited,
    generic: signIn.errors.generic,
  },
} as const;
