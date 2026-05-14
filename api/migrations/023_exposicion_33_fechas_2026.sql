-- Ajuste de fechas y alineación año/mes para exposición 33 (entorno desplegado).
-- Idempotente: reejecutar vuelve a dejar los mismos valores.

UPDATE web.exposiciones
SET
  desde          = DATE '2026-05-20',
  hasta          = DATE '2026-06-10',
  ano            = 2026,
  id_mes         = 5,
  cerrado_manual = false
WHERE id_exposicion = 33;
