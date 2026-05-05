-- Finalizado solo si hasta < CURRENT_DATE (ya pasó el día de fin).
-- Entre vigentes: primera por desde ASC → Abierto; demás → Cerrado.

WITH eligible AS (
    SELECT id_exposicion, id_club, desde
    FROM web.exposiciones
    WHERE hasta IS NULL OR hasta >= CURRENT_DATE
),
ranked AS (
    SELECT
        id_exposicion,
        COUNT(*) OVER (PARTITION BY id_club) AS cnt,
        ROW_NUMBER() OVER (
            PARTITION BY id_club
            ORDER BY desde ASC NULLS LAST, id_exposicion ASC
        ) AS rn
    FROM eligible
)
UPDATE web.exposiciones e
SET id_estado = t.id_estado
FROM (
    SELECT
        e2.id_exposicion,
        CASE
            WHEN e2.hasta IS NOT NULL AND e2.hasta < CURRENT_DATE THEN 3
            WHEN r.cnt = 1 THEN 1
            WHEN r.rn = 1 THEN 1
            ELSE 2
        END AS id_estado
    FROM web.exposiciones e2
    LEFT JOIN ranked r ON r.id_exposicion = e2.id_exposicion
) t
WHERE e.id_exposicion = t.id_exposicion
    AND e.id_estado IS DISTINCT FROM t.id_estado;
