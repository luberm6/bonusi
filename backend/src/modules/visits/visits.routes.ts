import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard.js";
import { asyncHandler } from "../../common/http/async-handler.js";
import { pool } from "../../common/db/pool.js";
import { HttpError } from "../../common/http/error.js";
import { parseClientId, parseCreateVisitDto, parseVisitId, parseVisitsFilter } from "./visits.dto.js";
import { createVisit, getClientVisits, getVisitById, listVisits } from "./visits.service.js";

function getParamId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export const visitsRouter = Router();

visitsRouter.post(
  "/visits",
  authGuard,
  asyncHandler(async (req, res) => {
    const dto = parseCreateVisitDto(req.body);
    const payload = await createVisit(req.authUser!, dto);
    res.status(201).json(payload);
  })
);

visitsRouter.get(
  "/visits",
  authGuard,
  asyncHandler(async (req, res) => {
    const filters = parseVisitsFilter(req.query as Record<string, unknown>);
    const payload = await listVisits(req.authUser!, filters);
    res.json(payload);
  })
);

visitsRouter.get(
  "/visits/:id",
  authGuard,
  asyncHandler(async (req, res) => {
    const visitId = parseVisitId(getParamId(req.params.id));
    const payload = await getVisitById(req.authUser!, visitId);
    res.json(payload);
  })
);

visitsRouter.get(
  "/clients/:id/visits",
  authGuard,
  asyncHandler(async (req, res) => {
    const clientId = parseClientId(getParamId(req.params.id));
    const filters = parseVisitsFilter(req.query as Record<string, unknown>);
    const payload = await getClientVisits(req.authUser!, clientId, filters);
    res.json(payload);
  })
);

// Документы из чата, отмеченные мастером "Сохранить в историю ремонта"
visitsRouter.get(
  "/clients/:id/repair-documents",
  authGuard,
  asyncHandler(async (req, res) => {
    const clientId = parseClientId(getParamId(req.params.id));
    const actor = req.authUser!;
    // Клиент видит только свои документы; admin видит любого клиента
    if (actor.role !== "admin" && actor.id !== clientId) {
      throw new HttpError(403, "Access denied");
    }
    const rows = await pool.query(
      `select m.id, m.text, m.created_at, m.sender_id,
              u.email as sender_email,
              coalesce(
                json_agg(
                  json_build_object(
                    'id', a.id,
                    'fileUrl', a.file_url,
                    'fileType', a.file_type,
                    'fileName', a.file_name,
                    'size', a.size
                  ) order by a.created_at
                ) filter (where a.id is not null),
                '[]'
              ) as attachments
       from public.messages m
       join public.users u on u.id = m.sender_id
       left join public.attachments a on a.message_id = m.id
       where m.receiver_id = $1
         and m.is_repair_history = true
       group by m.id, u.email
       order by m.created_at desc
       limit 100`,
      [clientId]
    );
    res.json(rows.rows);
  })
);
