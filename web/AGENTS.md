<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Product Context

`web/` is the marketing site for a Mongolian orthography learning app for
elementary-school children. The audience is **parents**, not children — copy,
tone, and visual decisions should read as trustworthy, educational, simple,
safe, professional, and modern, while keeping some of the playful character
of the kids' app (see `components/brand/`, `components/decor/`).

## Repo Integration

Standalone Next.js app inside the larger monorepo (siblings: `mobile/`,
`backend/`, `shared/`). Not an npm workspace member — install/run from
inside `web/`. Changes here must not touch `mobile/`, `backend/`, `shared/`,
or root config/env files; if a change seems to require that, stop and ask.

## Design Source of Truth

Figma is authoritative. When implementing or changing a section, cite the
Figma node ID in a comment near the code that reproduces it (see the
existing pattern in `globals.css`, `content.ts`, `Header.tsx`). Don't invent
colors, spacing, or copy — pull them from the design or ask.

## Background & Asset Strategy

Decorative visuals follow a cost hierarchy — cheapest technique that
reproduces the design wins:
1. CSS/Tailwind for simple geometry (circles, blobs, gradients, shadows) —
   see `components/decor/`.
2. SVG for illustrations, icons, reusable vector shapes.
3. `next/image` (optimized raster) only for genuinely complex/photographic
   assets, lazy-loaded unless it's the LCP element.

Decorative elements get `pointer-events-none` and must not affect layout or
scroll performance.

## Animation Rules

- `transform`/`opacity` only; no layout-triggering properties.
- Must respect `prefers-reduced-motion` (see `globals.css`) — every new
  animation needs a reduced-motion fallback.
- Keep the number of independently animated elements low; prefer CSS
  animations over JS-driven ones.

## Component & Architecture Rules

- Server Components by default; `"use client"` only where interactivity
  genuinely requires it (see `MobileNav.tsx`, `Reveal.tsx` for the existing
  exceptions).
- No monolithic `page.tsx` — sections go in `components/sections/*`, shared
  pieces in `components/ui/*`.
- Don't add a dependency if native React/CSS/Tailwind/browser APIs suffice.
- Copy lives in `lib/content.ts`; links/config in `lib/site-config.ts` —
  don't hardcode either in components.
- This is a presentation/marketing site: no state management libraries,
  context providers, API layers, or custom hooks unless a section
  genuinely needs one. Reach for React/CSS state (useState, CSS, URL
  params) first.

## Collaboration Norm

Surface reasoning (a sentence or two) before implementing anything that
materially affects UX, performance, accessibility, or visual fidelity
(background rendering approach, animation choices, SVG-vs-image,
client-vs-server, new dependencies). Don't ask for confirmation on small
implementation details.

## Validation Before Calling a Section Done

- Responsive at 320/375/390/430/768/1024/1280/1440/1920px, no horizontal
  overflow.
- No console errors; keyboard nav and visible focus states work; meaningful
  alt text, empty alt on decorative images.
- `npm run lint` and `npm run typecheck` clean.
