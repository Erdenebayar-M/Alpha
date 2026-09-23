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
_Avoid_: using "featured" for a ranked or computed list — a future popularity ranking is a different thing and needs its own name

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

**Colour** (Өнгө):
An author's choice of colour in an **Article**'s **Body**, in one of three places: a *text colour* on some words, a *highlight* behind some words, or a *background* on a whole text **Block** (paragraph, subheading, list, quote, callout). Words carry a text colour or a highlight, never both; links are never coloured; a subheading is coloured as a whole. A Colour is either one from the **Palette** or a custom colour the author picks freely.
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

## Relationships

- An **Article** belongs to exactly one **Category**
- An **Article** has one **Body**, made of one or more **Blocks**
- A text **Block** may carry a **Colour**; image, video, link card and divider **Blocks** never do
- A text **Block** may carry a **Text alignment**; image, video, link card and divider **Blocks** never do, and it is unrelated to the **Content column**
- Only **Published** Articles appear on the site
- Every **Published** Article has a **Thumbnail**; a Draft may not yet
- At most one Article is the **Featured article**, and it is always **Published**
- A **Collection** holds exercises, advice, or **Articles**
- The **Diagnostic** is reachable from the nav, a pill, and its own card, but is never a **Category**
- Every content row lines up with the **Content column**
