# Prompt 17 Design System Foundation

## Visual Direction

- Premium clean service UI with controlled glassmorphism.
- Light background (`#F8FAFC`), translucent surfaces, soft depth.
- Mobile-first spacing/touch targets and role-aware visual density:
  - client: softer glass and larger cards
  - admin: more structure + compact data blocks
  - super_admin: function-first with table-heavy layout

## Design Tokens

Implemented in:

- `web/src/design/tokens.ts`
- `mobile/src/shared/design/tokens.ts`

Includes:

- colors (primary, semantic status, text, glass surfaces)
- spacing scale: `4, 8, 12, 16, 24, 32`
- radius scale: `8, 12, 16, 20`
- shadow presets
- typography scale

## Core UI Kit

Mobile runtime components:

- `GlassCard`
- `AppButton` (`primary`, `secondary`, `ghost`, `destructive`)
- `AppInput`
- `StatusBadge`
- chat atoms:
  - `ChatBubble`
  - `TypingIndicator`

Web foundation contracts:

- `web/src/design/components.ts`
- `web/src/design/key-screens.ts`

## Updated Key Screens

Mobile examples implemented:

- Client map card with glass container and action hierarchy
  - `mobile/src/modules/map/client/ClientMapCard.tsx`
- Branch details bottom sheet in glass style
  - `mobile/src/modules/map/client/BranchBottomSheet.tsx`
- Fullscreen map metadata card/status
  - `mobile/src/modules/map/client/ClientMapScreen.tsx`
- Admin branches list (structured rows + status badges)
  - `mobile/src/modules/branches/admin/AdminBranchesListScreen.tsx`
- Admin branch form (sectioned glass cards + clean inputs/buttons)
  - `mobile/src/modules/branches/admin/BranchFormScreen.tsx`

Web key-screen definitions by role:

- client / admin / super_admin screen examples in:
  - `web/src/design/key-screens.ts`

## Motion & Accessibility Notes

- Motion is subtle (fast fades/press states), no aggressive transitions.
- Blur is used only on surfaces, not overused in dense data zones.
- Text contrast uses dark text on light translucent surfaces.
- Action controls are sized for mobile touch ergonomics.

## Self-Review

- Blur overload: no (limited to card surfaces).
- Contrast risk: low in current token palette; primary text remains `#0F172A`.
- Component consistency: improved via shared tokens and button/input/card primitives.
