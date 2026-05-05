-- Corrige orden de la regla de estados: Abierto = inicio más temprano por club (desde ASC),
-- no el más tardío. Idempotente para quien ya aplicó 013 con DESC.

WITH ranked AS (
    SELECT
        id_exposicion,
        COUNT(*) OVER (PARTITION BY id_club) AS cnt,
        ROW_NUMBER() OVER (
            PARTITION BY id_club
            ORDER BY desde ASC NULLS LAST, id_exposicion ASC
        ) AS rn
    FROM web.exposiciones
),
target AS (
    SELECT
        id_exposicion,
        CASE
            WHEN cnt = 1 THEN 1
            WHEN rn = 1 THEN 1
            WHEN rn = 2 THEN 2
            ELSE 3
        END AS id_estado
    FROM ranked
)
UPDATE web.exposiciones e
SET id_estado = t.id_estado
FROM target t
WHERE e.id_exposicion = t.id_exposicion
    AND e.id_estado IS DISTINCT FROM t.id_estado;
