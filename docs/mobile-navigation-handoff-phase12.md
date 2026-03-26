# Mobile Navigation Handoff (Phase 12)

## Implemented

- Navigation handoff service with deep links and fallback chain:
  - Yandex Navigator
  - Apple Maps
  - Google Maps
  - Web Google Maps fallback when no app is available
- Action sheet style picker abstraction for navigator selection.
- React Native launcher + picker adapters.
- Client map integration helper (`ClientMapScreenWithNavigation`) for route button.

## Files

- `mobile/src/shared/navigation/navigation-handoff.ts`
- `mobile/src/shared/navigation/mobile-launchers.ts`
- `mobile/src/modules/map/client/navigation-route-action.ts`
- `mobile/src/modules/map/client/ClientMapScreenWithNavigation.tsx`

## Behavior

- Route button opens navigator selection.
- If selected app is unavailable, service falls back to available app.
- If no supported app available, opens Google Maps web directions URL.
- Coordinates and branch name are encoded into handoff URL.
- Works on mobile; web support is best-effort through web URL fallback.
