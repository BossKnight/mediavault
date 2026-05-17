## Project Overview
This project is a web and mobile app for cataloging physical media collections of Movies, Video Games, and Books to reduce unwanted purchases and to get recommendations for what to watch, play, or read next.

Primary users are collectors who want easy cataloging and high-quality output.

The product optimizes for:
- visual polish
- clean responsive code
- speed of iteration

Avoid over-engineering. Prefer clarity over cleverness.

## Architecture
- 'features/' contains feature-specific business logic
- 'lib/' contains utilities, API helpers, and shared config
- 'app/' contains routes and server components
- 'types/' contains shared Typescript types

Rules:
- Keep page-level composition in route files
- Keep side effects out of UI components when possible
- Prefer server-side data fetching unless client interactivity is required

## Coding Conventions
- Prefer functional components
- Prefer named exports for shared modules
- Keep components focused and composable
- Extract repeated logic into hooks or helpers
- Prefer descriptive variable names over abbreviations
- Do not leave dead code or commented-out blocks
- Do not use em dashes in comments

## UI and Design Rules
- Prefer spacious layouts and strong visual hierarchy
- Use restrained color usage; rely on typography, spacing, and contrast
- Buttons should have clear primary/secondary hierarchy
- Forms should be short, scannable, and mobile-friendly
- Every interactive element must have visible hover, focus, and disabled states
- Meet accessibility expectations for contrast, labels, and keyboard navigation

## Content Guidelines
- Use concise, confident language
- Prefer short paragraphs and scannable structure
- Avoid jargon

## Testing and Quality
Before considering a task complete:
- run typecheck
- run lint
- run relevant tests for modified logic

Testing rules:
- add unit tests for reusable logic
- do not add heavy test scaffolding for simple presentation sections
- ensure responsive behavior for UI changes
- verify empty, loading, and error states where relevant

## File Placement Rules
- Add reusable primitives to 'components/ui'
- Put shared helpers in 'lib'
- Do not create a new abstraction for one-off usage
- Prefer editing existing components over creating near-duplicates

## Safety Rules
- Do not rename public API routes unless explicitly requested
- Do not change database schema without calling it out clearly
- Do not modify auth flows unless the task requires it
- Preserve backward compatibility for shared components
- Flag major architectural changes before implementing them
