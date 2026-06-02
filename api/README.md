# API (servidor)

Backend Node + PostgreSQL (esquema `web`).

## Base de datos

```bash
cd api
npm install
npm run db:migrate
```

### Variedades (CSV en `api/migrations/data/`)

Copiá `variedades.csv` y `ejemplares_variedades.csv` en `api/migrations/data/` (ver `README` en esa carpeta). Otra ruta: variable `VARIEDADES_DIR`.

Tras las migraciones `025` y `026`:

```bash
npm run db:seed-variedades
```

Carga `web.variedades`, `web.ejemplares_variedades` y actualiza `web.ejemplares.id_variedad`. Recarga: `npm run db:seed-variedades -- --force`.

**pgAdmin (local):** `api/scripts/cargar-variedades-local.sql` — editá las rutas `COPY` si los CSV siguen fuera del repo.
