# Bonuses Foundation (Phase 7)

## Endpoints

- `POST /api/v1/bonuses/accrual`
- `POST /api/v1/bonuses/writeoff`
- `GET /api/v1/bonuses/history?client_id=...`
- `GET /api/v1/bonuses/balance?client_id=...`

## Rules implemented

- Bonus operations are manual and created by `admin/super_admin`.
- Client role can read only own balance/history.
- `writeoff` cannot exceed current balance.
- Optional `visit_id` is validated against `client_id`.
- Writeoff linked to visit applies discount to visit (`discount_amount` and `final_amount` are updated).
- Full operation history stored in `bonus_transactions`.
- Every accrual/writeoff is written to `audit_logs`.

## Integrity

- All mutating operations are transactional.
- Per-client advisory transaction lock prevents concurrent overspending races.
- Balance is calculated from transaction history (`accrual - writeoff`).
