# Marketing site (web/)

Vocabulary used on the parent-facing marketing site and how it maps onto the
learner product.

## Language

**Diagnostic** (Оношилгоо):
The short adaptive test a child takes at `/register-child` to establish their spelling level. The same thing is offered to parents as "an assessment" — **Үнэлгээ** is the parent-facing verb phrase for it ("Үнэлгээг эхлүүлэх"), not a separate product.
_Avoid_: treating Assessment / Үнэлгээ and Оношилгоо as two different offerings

**Article** (Нийтлэл):
A piece of parent-facing reading about a child's literacy, written by staff in the admin panel. Every Article belongs to exactly one **Category**, shown as its badge. The site section that lists Articles may be titled "blog", but the thing itself is always an Article.
_Avoid_: Blog, Post, Blog post

**Featured article** (Онцлох нийтлэл):
The one **Published** Article staff have hand-picked to promote. There is at most one at a time: featuring an Article takes the title away from the previous one, and unpublishing the Featured article leaves none. It is an ordinary Article with a promotion, not a separate kind of content.
_Avoid_: using "featured" for a ranked or computed list — a future popularity ranking is a different thing and needs its own name; using "Онцлох" for locked/premium content — being Featured never restricts who can read an Article

**Thumbnail**:
The picture that stands for an **Article** wherever it is listed (article cards, link previews). It is not shown on the Article's own reading page.
_Avoid_: Cover, cover image (a cover sits at the top of the page; a Thumbnail never does)

**Draft** / **Published**:
The two states of an **Article**. A Draft is visible only in the admin panel; a Published Article is visible on the site. An Article's publish date is the first time it was Published and does not move when it is unpublished and republished.

**Unpublish** / **Delete**:
Unpublishing takes a Published Article off the site and returns it to Draft; nothing is lost. Deleting permanently removes a Draft. A Published Article cannot be deleted — it is unpublished first.
_Avoid_: "deleting" a Published Article, archive, trash

**Body**:
An **Article**'s content: an ordered sequence of **Blocks**, freely arranged by the author — there is no fixed article template.

**Block**:
One unit of an Article's **Body** — a paragraph, subheading (дэд гарчиг), list, quote, image, video, link, and so on. Images, videos and subheadings sit between paragraphs wherever the author puts them. Every Block is one of a fixed set of kinds; the site decides how each kind looks, apart from any **Colour** the author gives it.
_Avoid_: Section (that word already means a page section of the site)

**List**:
A text **Block** of one or more items, either *bullet* or *ordered* **style**. Each item's line begins with a **Marker**. Taking an item out of the List (Enter on an empty item, or Backspace right after its **Marker**) turns it into a plain paragraph and splits one List into two List Blocks around it: for an *ordered* List the second one continues numbering from the first (no restart), but carries none of the first's alignment, background, or Marker **Colour** — those are reapplied by hand if wanted.
_Avoid_: assuming a List can hold another Block inside it — an item is text only, never a nested Block

**Marker**:
The bullet or number at the start of a **List** item's line — a real, selectable unit in the editor, not decorative page styling. Its glyph or number is always system-computed from the List's style and item order, never author-typed; only its **Colour** is author-editable, and unset it inherits the surrounding colour rather than a fixed default.
_Avoid_: bullet, list marker (fine in conversation, but "Marker" is the glossary term so it isn't confused with the item's own text)

**Quote**:
A text **Block** that sets off a line of the **Body** as a pull-quote, often opening what follows it (e.g. “Эцэг эх юуг ажиглах вэ?”). Its quotation marks are drawn by the site, never typed by the author; an optional attribution names who said it.
_Avoid_: using a subheading with hand-typed quotation marks for a pull-quote

**Image source**:
Whether an **Article**'s image **Block** was uploaded as a file (stored on R2) or is a pasted link to an external `http(s)` url the server never fetches. Every image Block has one of the two; Blocks stored before this distinction existed are treated as uploaded. Only image Blocks carry it — video Blocks are embeds and link cards are typed by hand, neither has this choice.
_Avoid_: implying the server fetches or validates a linked image's contents — it only checks the url is well-formed

**Colour** (Өнгө):
An author's choice of colour in an **Article**'s **Body**, in one of four places: a *text colour* on some words, a *highlight* behind some words, a *background* on a whole text **Block** (paragraph, subheading, list, quote, callout), or a *marker colour* on a **List**'s **Marker**. Words carry a text colour or a highlight, never both; links are never coloured; a subheading is coloured as a whole; a Marker's colour is independent of any Colour on its item's words. A Colour is either one from the **Palette** or a custom colour the author picks freely.
_Avoid_: theme, style (the site's own look is not an author's Colour)

**Text alignment**:
A second author-controlled appearance choice in an **Article**'s **Body**, alongside **Colour**: the left/center/right horizontal alignment of a whole text **Block** (paragraph, subheading, list, quote, callout). Image, video, link card and divider **Blocks** never carry it — the site decides their layout, as with everything but **Colour** and Text alignment. Left is the default and is never stored explicitly; only center/right are recorded.
_Avoid_: "alignment" alone, which is ambiguous with the **Content column** — that is a fixed, non-author-editable page-layout rule for how rows line up on the site, unrelated to a Block's own text alignment; justify or any fourth value (only left/center/right are offered)

**Palette**:
The named Colours offered first when colouring: the site's brand colours (blue, indigo, green, navy, violet) followed by gray, brown, orange, yellow, purple, pink and red. A Palette colour is stored by name, so the site can retune its shade later; a custom colour is stored as the exact colour picked.

**Category**:
One of the three literacy areas an **Article** is tagged with: Унших (reading), Зөв бичих (orthography), Үсэглэх (spelling out). Shown as the large pills and as an Article's badge.
_Avoid_: counting Оношилгоо as a Category — its pill and badge are a shortcut into the **Diagnostic**, and no Article is tagged with it

**Collection** (Сэдэв):
A curated group of learning material around one theme ("Уншихад анхаарах", "Эцэг эхэд"), whose contents are exercises (Дасгалууд), advice (Зөвлөмжүүд) or **Articles**. A Collection is not a **Category**: it is curated, and its subtitle states what kind of material it holds.
_Avoid_: Topic, when meaning a Category

**Content column**:
The single horizontal band every content row on the site lines up with — one shared left and right edge running down the page, whatever the row is made of: a card, a row of pills, or bare text on the sky. What sits on the column is the row's *painted* edge, so an unboxed row's text starts where a card's surface would.
_Avoid_: treating each design frame's own x position as that row's alignment; "container"/"wrapper", which name the mechanism rather than the thing

**Parent account** (Эцэг эхийн бүртгэл):
The account a parent holds on the site and in the app. A parent reaches it with an email and password, with Google, or with both. Every child's **Diagnostic** and learning belongs to exactly one Parent account.
_Avoid_: user, member, customer

**Sign up** (Бүртгүүлэх):
Creating a **Parent account**. It is never the child's setup at `/register-child` — that is the start of the **Diagnostic**, which a parent does for their child after signing up.
_Avoid_: register, registration (both already name the child's `/register-child` flow)

**Sign in** (Нэвтрэх):
Entering an existing **Parent account**, by email and password or by Google.
_Avoid_: log in, login

**Password reset** (Нууц үг сэргээх):
A parent who forgot their password asks for a one-time link by email and uses it to set a new one. Completing it signs the account out everywhere else.
_Avoid_: password recovery (nothing is recovered; the old password is replaced)

## Relationships

- An **Article** belongs to exactly one **Category**; on its reading page, that Category's pill is the one shown as current
- An **Article** has one **Body**, made of one or more **Blocks**
- An image **Block** is either uploaded (R2-hosted) or linked (an external url the server never fetches)
- A text **Block** may carry a **Colour**; image, video, link card and divider **Blocks** never do
- A **List** item's **Marker** may carry a **Colour** independently of any Colour on the item's text
- A text **Block** may carry a **Text alignment**; image, video, link card and divider **Blocks** never do, and it is unrelated to the **Content column**
- Only **Published** Articles appear on the site
- Every **Published** Article has a **Thumbnail**; a Draft may not yet
- At most one Article is the **Featured article**, and it is always **Published**
- A **Collection** holds exercises, advice, or **Articles**
- The **Diagnostic** is reachable from the nav, a pill, and its own card, but is never a **Category**
- Every content row lines up with the **Content column**
