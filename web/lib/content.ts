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

// The homepage's own nav link set (Figma node 1360:8955), passed to Header in
// place of `nav.links` above, which /landing-old uses instead. "Эцэг эхэд" is
// this page itself (Header renders it at 16px with aria-current="page"); the
// other two are existing destinations, sourced from site-config rather than
// repeated here.
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

// The homepage's hero (Figma node 1360:8705). The heading is one text layer
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

// The homepage's Category pills (Figma node 1360:8718), directly under the
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

// The homepage's Featured article (Figma node 1401:22062), directly under the
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

// The homepage's Articles-for-parents grid (Figma node 1371:9792), directly
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

// The homepage's Collections row (Figma node 1401:22290), the page's final
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

// The homepage's Diagnostic card (Figma node 1401:21880), directly under the
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

// Google sign-in, shared by the sign-in and sign-up cards. The button's label
// differs per page (below); both run the same create-or-find flow. The Google
// button and divider render only when GOOGLE_CLIENT_ID is configured.
export const googleAuth = {
  dividerLabel: "Эсвэл", // 7:6122, 7:6756
  iconLetter: "G", // 7:6169, 7:6753
  // Shown back on the originating page after a cancel or error — no frame;
  // wording approved in the ticket.
  failed: "Google-ээр нэвтэрч чадсангүй. Дахин оролдоно уу.",
} as const;

// Sign-in page (Figma frame 7:4257, Orthography file).
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
  googleLabel: "Google-ээр нэвтрэх", // Button 7:6166, label 7:6167
  submitLabel: "Нэвтрэх", // Primary action 7:6149
  // Right password, unconfirmed account — not in the frame; wording drafted for
  // issue #143, awaiting owner approval.
  confirmFirst: (maskedEmail: string) => `Эхлээд имэйлээ баталгаажуулна уу. ${maskedEmail} хаяг руу холбоос илгээсэн.`,
  // After Sign out — not in the frame; wording drafted, awaiting owner approval.
  signedOutNotice: "Та амжилттай гарлаа.",
  errors: {
    invalidEmail: "Имэйл хаяг буруу байна.",
    invalidCredentials: "Имэйл эсвэл нууц үг буруу байна.",
    rateLimited: "Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.",
    // Backend outage or timeout — not in the frame; wording approved by the owner.
    generic: "Алдаа гарлаа. Дахин оролдоно уу.",
  },
} as const;

// Sign-up page (Figma frame 7:6344, Orthography file).
export const signUp = {
  title: "Эцэг эхээр бүртгүүлэх", // heading 7:6749
  googleLabel: "Google-ээр бүртгүүлэх", // Google action 7:6750, label 7:6751
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
  // "Did you mean …?" under the email field for a common domain typo
  // (issue #139). No Figma frame; the suggested address sits where SentToEmail
  // puts one, but as a button rather than static text.
  emailSuggestion: { beforeEmail: "Та ", afterEmail: " гэж бичихийг хүссэн үү?" },
  submitLabel: "Бүртгүүлэх", // Primary action 7:6775
  errors: {
    name: "Нэр дор хаяж 2 тэмдэгттэй байна.",
    email: "Имэйл хаяг буруу байна.",
    // One per Weak password reason (lib/auth/passwordRules.ts), shared with
    // resetPassword. PASSWORD_SIMILAR only arises at Sign up.
    password: {
      PASSWORD_TOO_SHORT: "Нууц үг дор хаяж 8 тэмдэгттэй байна.",
      PASSWORD_TOO_LONG: "Нууц үг хэт урт байна.",
      PASSWORD_PATTERN: "Нэг тэмдэгт давтсан эсвэл дараалсан тоо, үсэг нууц үг болохгүй.",
      PASSWORD_COMMON: "Энэ нууц үг хэт түгээмэл байна. Өөр нууц үг сонгоно уу.",
      PASSWORD_SIMILAR: "Нууц үгэнд нэр эсвэл имэйл хаягаа бүү ашиглаарай.",
    },
    confirmPassword: "Нууц үг таарахгүй байна.",
    duplicateEmail: "Энэ имэйл хаягаар бүртгэл үүссэн байна.",
    duplicateEmailLinkLabel: "Нэвтрэх",
    rateLimited: signIn.errors.rateLimited,
    generic: signIn.errors.generic,
  },
  // After submitting, the form gives way to this in place. No frame of its
  // own: it follows forgotPassword.sent, whose heading and intro it mirrors.
  sent: {
    title: "Имэйлээ шалгана уу",
    // The email sits between the two parts.
    intro: { beforeEmail: "Таны ", afterEmail: " хаяг руу баталгаажуулах холбоос илгээлээ. Бүртгэлээ дуусгахын тулд холбоосыг нээнэ үү. Холбоосын хүчинтэй хугацаа 24 цаг." },
    // Brings the filled-in form back in place — no Figma frame; a mistyped
    // email is the one thing worth fixing without retyping the rest.
    startAgain: { label: "Буруу имэйл үү?", linkLabel: "Дахин эхлэх" },
  },
} as const;

// Forgot-password page (Figma frame 7:7189, Orthography file). After a request
// the same card swaps in place to `sent`, which has no frame of its own: it is
// derived from 7:7189 — the heading, intro and action slots keep their places —
// with copy approved in issue #123.
export const forgotPassword = {
  title: "Нууц үгээ мартсан уу?", // heading 7:7601
  // Corner prompt 7:7597 — the same as sign-up's.
  signInPrompt: signUp.signInPrompt, // 7:7598, 7:7599
  intro: "Бүртгэлтэй имэйл хаягаа оруулна уу. Бид нууц үг сэргээх холбоосыг танд илгээнэ.", // 7:7602
  emailLabel: signIn.emailLabel, // 7:7604
  emailPlaceholder: signIn.emailPlaceholder, // 7:7606
  submitLabel: "Сэргээх", // Primary action 7:7608
  backLabel: "← Нэвтрэх хэсэг рүү буцах", // Navigation link 7:7611
  sent: {
    title: "Имэйлээ шалгана уу", // derived from 7:7601
    // Derived from 7:7602; the email sits between the two parts.
    intro: { beforeEmail: "Таны ", afterEmail: " хаяг руу нууц үг сэргээх холбоосыг илгээлээ. Холбоосын хүчинтэй хугацаа 30 минут" },
    resendLabel: "Дахин илгээх", // derived from 7:7608
  },
  errors: {
    invalidEmail: signIn.errors.invalidEmail,
    rateLimited: signIn.errors.rateLimited,
    generic: signIn.errors.generic,
  },
} as const;

// Email confirmation page, reached from the link Sign up emails. No frame of
// its own: it sits in the auth card like the reset-password page. It confirms
// on arrival and moves on, so it mostly shows `confirming`.
export const confirmEmail = {
  title: "Имэйл баталгаажуулах",
  signInPrompt: signUp.signInPrompt,
  confirming: "Имэйл хаягийг баталгаажуулж байна…",
  // An expired, used or unknown link — one message, as the backend gives one code.
  invalid: "Баталгаажуулах холбоосын хугацаа дууссан эсвэл хүчингүй байна.",
  retryLabel: "Дахин оролдох",
  errors: {
    rateLimited: signIn.errors.rateLimited,
    generic: signIn.errors.generic,
  },
} as const;

// Resending the Email confirmation link: under sign-up's "check your email" and
// on the confirmation page's expired-or-used state. No Figma frame; the copy
// follows forgotPassword.sent's resend action.
export const resendConfirmation = {
  label: "Дахин илгээх", // as forgotPassword.sent.resendLabel
  cooldownLabel: (seconds: number) => `Дахин илгээх (${seconds})`,
  prompt: "Шинэ холбоос авахын тулд имэйл хаягаа оруулна уу.",
  emailLabel: signIn.emailLabel,
  emailPlaceholder: signIn.emailPlaceholder,
  // The same whether or not an unconfirmed account has the address.
  sent: "Хэрэв энэ хаяг баталгаажаагүй бүртгэлтэй бол шинэ холбоосыг илгээлээ. Өмнөх холбоос хүчингүй боллоо.",
  errors: {
    invalidEmail: signIn.errors.invalidEmail,
    rateLimited: signIn.errors.rateLimited,
    generic: signIn.errors.generic,
  },
} as const;

// Reset-password page, reached from the emailed link. It has no frame of its
// own: it is derived from frame 7:7189 — the heading and message take the
// forgot-password card's heading and intro slots (7:7600), the fields its
// field slot (7:7603), the action its primary action (7:7608) — with copy
// approved in issue #124.
export const resetPassword = {
  title: "Шинэ нууц үг үүсгэх", // derived from 7:7601
  signInPrompt: signUp.signInPrompt, // 7:7597
  // `key` is the form-state key; `name` the input name.
  fields: [
    { key: "password", name: "password", type: "password", label: "Шинэ нууц үг", placeholder: signIn.passwordPlaceholder, autoComplete: "new-password" },
    { key: "confirmPassword", name: "confirmPassword", type: "password", label: "Нууц үг давтах", placeholder: signIn.passwordPlaceholder, autoComplete: "new-password" },
  ],
  submitLabel: "Хадгалах", // derived from 7:7608
  success: "Нууц үг амжилттай солигдлоо.", // derived from 7:7602
  // An expired, used or unknown link — one message, as the backend gives one code.
  invalid: {
    message: "Холбоосын хугацаа дууссан эсвэл хүчингүй байна.", // derived from 7:7602
    actionLabel: "Шинэ холбоос авах", // derived from 7:7608
  },
  errors: {
    password: signUp.errors.password,
    confirmPassword: signUp.errors.confirmPassword,
    rateLimited: signIn.errors.rateLimited,
    generic: signIn.errors.generic,
  },
} as const;

// Account page (Figma frame 23:11664, Orthography file) — a visual prototype
// (docs/adr/0008-account-page-as-visual-prototype.md): every part of the frame
// is drawn; only the name and email are the parent's own.
export const account = {
  title: "Хувийн мэдээлэл", // heading 23:12088, card title 23:12095
  description: "Таны профайл болон аккаунтын үндсэн тохиргоо.", // 23:12089
  role: "Эцэг эх", // 23:12050
  settingsLabel: "Тохиргоо", // 23:12060 (rendered uppercase)
  surnameLabel: "Овог", // 23:12098
  nameLabel: "Нэр", // 23:12102
  phoneLabel: "Утасны дугаар", // 23:12107
  birthDateLabel: "Төрсөн огноо", // 23:12113
  completionLabel: "Профайл бүрдэлт", // 23:12053
  editLabel: "Засах", // 23:12093
  signOutLabel: "Аккаунтаас гарах", // 23:12083
  // Tab labels: 23:12069, 23:12064, 23:12073, 23:12077
  tabs: {
    dashboard: "Дашбоард",
    children: "Суралцагч хүүхэд",
    security: "Нууцлал ба аюулгүй байдал",
    notifications: "Мэдэгдэл",
  },
  security: {
    title: "Нууцлал ба аюулгүй байдал", // 23:12137
    passwordTitle: "Нууц үг", // 23:12143
    passwordHint: "Сүүлд 3 сарын өмнө шинэчилсэн", // 23:12144
    passwordAction: "Өөрчлөх", // 23:12146
    twoFactorTitle: "Хоёр шатлалт баталгаажуулалт", // 23:12153
    twoFactorHint: "Нэвтрэх бүрд нэмэлт хамгаалалт ашиглана", // 23:12154
  },
  saveHint: "Өөрчлөлт автоматаар хадгалагдана.", // 23:12158
  saveLabel: "Хадгалах", // 23:12162
  // Feedback for the prototype's controls — not in the frame; wording drafted, awaiting owner approval.
  saved: "Хадгалагдлаа",
  passwordSoon: "Нууц үг солих боломж тун удахгүй нэмэгдэнэ.",
  // Coming soon screen — not in the frame; wording drafted, awaiting owner approval.
  comingSoon: {
    headline: (tab: string) => `${tab} тун удахгүй`,
    subtitle: "Бид энэ хуудсыг бэлтгэж байна. Удахгүй эндээс үзэх боломжтой болно.",
  },
  // After Sign in / Sign up — not in the frame; wording drafted, awaiting owner approval.
  welcome: (name: string) => `Тавтай морил, ${name}!`,
} as const;

// Dev-site password gate (proxy.ts, lib/devGate.ts) — dev deploys only, never
// in production, so not in Figma; wording drafted, awaiting owner approval.
export const devGate = {
  title: "Туршилтын хувилбар",
  intro: "Энэ бол хөгжүүлэлтийн туршилтын сайт. Үргэлжлүүлэхийн тулд нууц үгээ оруулна уу.",
  passwordLabel: signIn.passwordLabel,
  submitLabel: "Нэвтрэх",
  wrongPassword: "Нууц үг буруу байна.",
} as const;
