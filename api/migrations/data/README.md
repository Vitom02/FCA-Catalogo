# Datos de variedades (CSV)

Copiá acá los dos archivos (mismo formato que en pgAdmin: `;` y cabecera):

| Archivo | Tabla destino |
|---------|----------------|
| `variedades.csv` | `web.variedades` |
| `ejemplares_variedades.csv` | `web.ejemplares_variedades` |

Estos archivos **no** los ejecuta `db:migrate` (solo corre `.sql` de esta carpeta padre).

## Carga

**Local / Docker (recomendado):**

```bash
cd api
npm run db:migrate
npm run db:seed-variedades
```

Recarga desde cero: `npm run db:seed-variedades -- --force`

**Docker:**

```bash
docker compose run --rm api node scripts/migrate.mjs
docker compose run --rm api npm run db:seed-variedades
```

Los CSV van dentro de la imagen API porque están bajo `api/` (el `Dockerfile` hace `COPY . .`).
