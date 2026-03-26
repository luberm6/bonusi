# Role-Based UI Structure (Phase 13)

## Web

- Route matrix by role with per-screen loading/empty/error state spec.
- Sidebar grouping:
  - client: quick access only
  - admin: operations + profile
  - super_admin: operations + profile + governance
- Role-aware layout model built after login role resolution.

Key files:

- `web/src/navigation/web-routes.ts`
- `web/src/navigation/web-sidebar.ts`
- `web/src/layouts/role-aware-layout-contract.ts`

## Mobile

- Role-based navigation model:
  - client: practical tabs (`home`, `visits`, `chat`, `profile`)
  - admin: tabs + operational drawer
  - super_admin: admin navigation + governance drawer entries
- Post-login resolver maps role to default route and navigation container model.

Key files:

- `mobile/src/app/navigation/mobile-routes.ts`
- `mobile/src/app/navigation/role-navigation-resolver.ts`

## Reusable UI plan

- Defined reusable components blueprint for shell, async states, lists/forms, quick actions, map card and chat dock.

Key file:

- `web/src/shared/ui/reusable-components-plan.ts`

## UX risks / weak points

- Admin drawer depth can grow quickly; should be grouped/collapsible in visual implementation.
- Client home can become overloaded; quick actions must stay capped and prioritized.
- Role switches during active session require hard navigation reset to avoid stale screen access.
- Async state consistency must be enforced by shared components, otherwise UX drifts between modules.
