@AGENTS.md

# CLAUDE.md (frontend төслийн root-д)

## Project Context

This is the frontend for a Mongolian spelling/dictation learning app
for grades 1-4. Backend exists at ../backend (Prisma + Express).

## Tech Stack

- Next.js 14 App Router
- TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- React Query + Zustand
- react-hook-form + Zod

## Code Standards

- All components use function declaration, not arrow
- Props interfaces end with 'Props' suffix
- Client components marked with 'use client' at top
- Prefer Server Components unless interactivity needed
- No default exports except in app/ folder (Next.js requirement)
- File naming: PascalCase for components, camelCase for utilities

## Visual/UX Guidelines

- Minimum tap target: 44x44px (mobile accessibility)
- Font sizes: text-base minimum for body, text-xs only for metadata
- Animations: use framer-motion, never longer than 300ms
- Loading states: skeleton screens, not spinners
- Mongolian text: use font-mongol class

## Security Rules

- Never log sensitive data (passwords, tokens, PII)
- All API calls go through lib/api/client.ts
- Never use dangerouslySetInnerHTML
- Validate forms with Zod schemas from lib/validators/

## When generating new components

- Check components/ui/ first for existing shadcn components
- Follow tasks/ folder pattern for task type components
- Write at least one test in **tests**/
- Include Storybook story if complex
