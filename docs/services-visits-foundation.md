# Services + Visits Foundation (Phase 6)

## Implemented endpoints

- `POST /api/v1/services`
- `GET /api/v1/services`
- `PATCH /api/v1/services/:id`
- `POST /api/v1/visits`
- `GET /api/v1/visits`
- `GET /api/v1/visits/:id`

## Key domain rules enforced

- Visits are created only by `admin` or `super_admin`.
- Visit must reference active client and active branch.
- Visit contains one or more services.
- Service price is snapshotted into `visit_services` on visit creation.
- `total_amount` is sum of visit service totals.
- `final_amount = total_amount - discount_amount`.
- `discount_amount >= 0` and `discount_amount <= total_amount`.
- Visit creation is transactional (visit + visit_services + audit).

## Filtering

`GET /api/v1/visits` supports:

- `clientId`
- `adminId`
- `branchId`
- `dateFrom`
- `dateTo`

## Audit integration

- `service.create`
- `service.update`
- `visit.create`
