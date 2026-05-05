-- Sin club (id_club nulo, sin fila en clubes o nombre vacío): vigentes → Abierto; post hasta → Finalizado.
-- No compiten en Abierto/Cerrado por club.

WITH eligible AS (
    SELECT e.id_exposicion, e.id_club, e.desde
    FROM web.exposiciones e
    INNER JOIN web.clubes c ON c.id_club = e.id_club
    WHERE (e.hasta IS NULL OR e.hasta >= CURRENT_DATE)
      AND TRIM(COALESCE(c.club::text, '')) <> ''
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
            WHEN (
                e2.id_club IS NULL
                OR cl.id_club IS NULL
                OR TRIM(COALESCE(cl.club::text, '')) = ''
            ) THEN
                CASE
                    WHEN e2.hasta IS NOT NULL AND e2.hasta < CURRENT_DATE THEN 3
                    ELSE 1
                END
            WHEN e2.hasta IS NOT NULL AND e2.hasta < CURRENT_DATE THEN 3
            WHEN r.cnt = 1 THEN 1
            WHEN r.rn = 1 THEN 1
            ELSE 2
        END AS id_estado
    FROM web.exposiciones e2
    LEFT JOIN web.clubes cl ON cl.id_club = e2.id_club
    LEFT JOIN ranked r ON r.id_exposicion = e2.id_exposicion
) t
WHERE e.id_exposicion = t.id_exposicion
    AND e.id_estado IS DISTINCT FROM t.id_estado;
