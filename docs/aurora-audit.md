# Aurora Glass audit

Base: `opportunity-os-hosted` at `7a47f5fa09c8961041b9ca4bee380b0c2ff1f809`.
Clean fresh checkout. Repository is public and the connected owner has admin/push rights.
The profile README and default `main` branch are outside this change.

## Screens and contracts

- Public `/`: password login only; no private records rendered. Rate limiting and secure session backend remain intact.
- Owner `/`: Jinja shell, hash routes for Today, Discover, Saved, Applications, Inbox, Calendar and Settings. `/api/v3` supplies real records, eligibility evidence, preparation, history, receipts, calendar, mail classifications and reports. All mutations require the existing CSRF token.
- Owner `/classic`: original overview, opportunity radar, discovery, tracking, recruiter CRM, Gmail/outreach, resume vault, source registry, application tools and settings. Existing IDs, API paths and consent controls must survive.
- `/api/autoapply`: prepared tasks, profile readiness, receipts and explicit submission safeguards. Preparation and outreach are never application acknowledgements.
- Both `static/glass.css` and `static/glass-classic.css` exist and are tracked at the base revision. The suspected missing references are not reproducible. Assets will be kept and versioned correctly.

## Findings and implementation direction

The previous design stacks large glass overrides on independent base styles, repeats dense card metadata, and buries useful tools in Settings. Primary navigation lacks a real command palette, desktop collapse, account menu and visible automation queue. Applications have only a table, with analytics nested in settings.

Aurora uses shared local-font tokens, a quiet sidebar, persistent location bar, intentional opaque data surfaces and selective glass on chrome. Today leads with recorded metrics and a focused next-action brief. Discovery uses compact decision cards with evidence in details. Table/board views retain real backend stages; acknowledgements remain evidence labels, never invented stages. Queue and analytics become primary destinations. Supporting tools remain integrated with the same backend.

## Verification baseline

112 existing tests passed before implementation with workspace-local pytest temporary storage. Browser QA uses an isolated SQLite database with synthetic records and disabled external discovery/sending. Production private data and the approved resume are not copied into the checkout or screenshots.
