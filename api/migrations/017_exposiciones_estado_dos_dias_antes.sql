-- Estados por club:
-- Finalizado (3): hasta < CURRENT_DATE.
-- Cerrado (2): desde vigente y CURRENT_DATE >= desde - 2 días (cierra 2 días antes del inicio);
--   o segundo y siguientes torneos “en cola” (solo uno abierto por club).
-- Abierto (1): el primero en orden desde (entre no finalizados y antes del cierre -2d).
-- Sin club (nombre vacío / sin fila club): vigente → Abierto; post hasta → Finalizado.

WITH e2 AS (
    SELECT
        e.id_exposicion,
        e.id_club,
        e.desde,
        e.hasta,
        cl.club
    FROM web.exposiciones e
    LEFT JOIN web.clubes cl ON cl.id_club = e.id_club
),
labeled AS (
    SELECT
        id_exposicion,
        id_club,
        desde,
        hasta,
        club,
        (
            id_club IS NULL
            OR TRIM(COALESCE(club::text, '')) = ''
        ) AS sin_club_valido,
        (
            hasta IS NOT NULL
            AND hasta::date < CURRENT_DATE
        ) AS es_finalizado,
        (
            desde IS NOT NULL
            AND CURRENT_DATE >= (desde::date - 2)
        ) AS cerrado_anticipo
    FROM e2
),
candidatos AS (
    SELECT
        l.id_exposicion,
        l.id_club,
        ROW_NUMBER() OVER (
            PARTITION BY l.id_club
            ORDER BY l.desde ASC NULLS LAST, l.id_exposicion ASC
        ) AS rn
    FROM labeled l
    WHERE NOT l.sin_club_valido
        AND NOT l.es_finalizado
        AND NOT l.cerrado_anticipo
)
UPDATE web.exposiciones e
SET id_estado = t.id_estado
FROM (
    SELECT
        l.id_exposicion,
        CASE
            WHEN l.sin_club_valido THEN
                CASE
                    WHEN l.es_finalizado THEN 3
                    ELSE 1
                END
            WHEN l.es_finalizado THEN 3
            WHEN l.cerrado_anticipo THEN 2
            WHEN c.rn = 1 THEN 1
            ELSE 2
        END AS id_estado
    FROM labeled l
    LEFT JOIN candidatos c ON c.id_exposicion = l.id_exposicion
) t
WHERE e.id_exposicion = t.id_exposicion
    AND e.id_estado IS DISTINCT FROM t.id_estado;
