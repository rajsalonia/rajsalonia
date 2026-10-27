# Aurora Glass: product research and design decisions

Research date: 27 October 2026. These are original Opportunity OS decisions drawn from public product documentation and interface examples. No proprietary assets or source code are reused.

## Product references inspected

| Reference | Product evidence | Opportunity OS application |
| --- | --- | --- |
| [Linear 2026 design refresh](https://linear.app/now/behind-the-latest-design-refresh) | Visually inspected the actual sidebar comparison and compact application tab images in a browser. Quiet inactive navigation and separate location/view bars make dense content easier to scan. | Keep navigation subdued; place the current page and primary action above local filters. Use one clear selected state instead of competing gradients. |
| [Linear Custom Views](https://linear.app/docs/custom-views) | Opened and enlarged the real filtered issue-list screenshot. The interface places filter chips over grouped rows and keeps contextual details beside the work. | Make search, stage filters and view selection persistent and understandable. Keep eligibility and employer evidence near application decisions. |
| [Raycast](https://www.raycast.com/) and [Search Bar manual](https://manual.raycast.com/search-bar), [Action Panel](https://manual.raycast.com/action-panel) | Reviewed the public product presentation and official keyboard workflows; inspected the manual in-browser. A consistent search entry and contextual actions reduce navigation effort. | A genuine command/search dialog should support arrow navigation, Enter, Escape and visible shortcuts. Show a clear primary action per result. |
| [Vercel](https://vercel.com/) and [Projects overview](https://vercel.com/docs/projects) | Reviewed the public product and official dashboard hierarchy: overview, current status and detail evidence. | Dashboard metrics lead to the records they summarize. Connection health includes recorded checks, not optimistic status text. |
| [Mobbin web library](https://mobbin.com/discover/apps/web) | Public library entry was reachable, but useful authenticated product galleries were unavailable through the research surface. | No private gallery or paywall was bypassed; no claim of inspecting authenticated Mobbin screens. Use this as a catalogue reference only. |
| [SaaSUI](https://www.saasui.design/), [Tables](https://www.saasui.design/pattern/table), [Dashboards](https://www.saasui.design/pattern/dashboard), [Empty states](https://www.saasui.design/pattern/empty-state) | Visually inspected real application thumbnails in the public table collection: quiet row backgrounds, headers, local filtering and limited accent colors. | Use opaque, readable table surfaces within the glass shell. Put a useful next action in zero-data states; never substitute demo activity for missing records. |

Some guessed documentation URLs returned 404 or were inaccessible: Linear `/docs/issue-views`, Raycast `/core-features`, and Vercel `/docs/dashboard-features`. The working official pages above replaced those paths.

## Existing interface audit

- The current application has two Jinja templates. `workspace.html` is the primary hash-routed workspace; `index.html` serves login and the advanced/classic workspace.
- Primary workspace views are Today, Discover, Saved, Applications, Inbox and Calendar. Profile, source health, analytics/reports, model feedback and advanced-tool links currently sit inside Settings.
- The classic workspace retains recruiter CRM, Gmail review/compose, original resume vault, application packs/auto-apply tools, source capture and backup/restore. These remain functional product screens and must receive consistent visual treatment.
- The inspected checkout contains both `static/glass.css` and `static/glass-classic.css`; the earlier missing-file suspicion does not apply to this revision. Asset rendering checks should establish that both referenced URLs return successfully.
- Existing cards communicate verified/unknown fields, estimated recommendations, source attribution, suggested review dates and genuine employer deadlines separately. Preserve that distinction during simplification.
- Main workspace analytics and advanced application tools deserve direct navigation entries. Avoid making users discover them through a generic Settings destination.

## Original Aurora Glass design system

1. **Canvas and hierarchy.** Midnight navy canvas; restrained violet and cyan ambient edge lighting; a quiet translucent shell; data surfaces with sufficient opacity. Limit blur to navigation, dialogs and select floating surfaces.
2. **Typography.** A system-compatible Inter-style sans stack, clear page title, medium-weight section heading and readable body. Use tabular numerals for metrics and dates. Avoid tiny metadata; wrap source and evidence text safely.
3. **Space.** A consistent 4 px spacing unit; 8–12 px control gaps; 20–28 px panel padding; 24–32 px page gutters. Content grids collapse before card text becomes crowded.
4. **Color meaning.** Indigo identifies primary actions/selection, cyan supports discovery, emerald indicates verified positive state, amber identifies a review concern, and red represents an error or rejection. Labels always accompany color.
5. **Card structure.** Employer identity → role → location/work mode/pay → relevant tags and evidence → one clear primary action. Source and unknown values stay visible. Bookmark uses a real pressed state.
6. **Dense views.** Applications get a readable table and supported stage board. Every stage transition uses the existing backend contract. Email sent, employer acknowledgement and owner-reported submission remain distinct evidence.
7. **Automation trust.** A review queue shows requirements, preparation, authorization and receipts as separate milestones. Never imply unattended applications or employer success from a sent email.
8. **Empty and error states.** Explain what is absent and offer the real next step. Charts derive solely from stored records and show zero-data guidance. Loading skeletons reserve realistic space.
9. **Keyboard and motion.** Visible focus rings, native controls, real dialog semantics, Escape closure and focus return. Fast 120–200 ms feedback and reduced-motion support. No perpetual decorative motion.
10. **Responsive behavior.** Desktop collapsible navigation; mobile drawer with backdrop and focus management; 44 px tap targets; cards and field groups stack at narrow widths. Dense tables may use a labeled contained scroll region without page overflow.

## Navigation proposal

- Workspace: Today, Discover, Saved, My applications.
- Intelligence: Auto-apply queue, Inbox, Calendar, Analytics.
- Account/tools: Profile and settings; links to preserved advanced resume, CRM, review and backup workflows.

The original Flask routes, response shapes, database records, consent rules, authentication and resume bytes are implementation constraints. The redesign changes presentation and discoverability; any new aggregation must state its calculation and limitations.
