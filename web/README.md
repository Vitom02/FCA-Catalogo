# Aplicación web (React + Vite)

Interfaz del catálogo FCA: login, listado de exposiciones y anotación de ejemplares.

## Comandos

```bash
cd web
npm install
npm run dev
```

Arrancá también la API en esta misma máquina (`cd api`, ver `api/README.md`) en el puerto **3001**.

Compilación de producción: `npm run build` (genera `web/dist`).

## Acceso desde el celular (misma Wi‑Fi)

Si el navegador dice que **no pudo establecer una conexión segura**:

1. **Usá HTTP, no HTTPS** en la barra de dirección: escribí algo como  
   `http://192.168.0.xx:5173` (la IP de tu PC en la red local y el puerto que muestra `npm run dev`).  
   Un certificado autofirmado o abrir HTTPS sin TLS correcto también dispara ese error.
2. El front en desarrollo ahora usa el **proxy de Vite** (`/api` → API en `:3001`), así las peticiones no van a `localhost:3001` del teléfono.
3. Asegurate de que Windows no bloquee entrantes para Node (firewall).
4. Si definiste `VITE_API_URL=http://localhost:3001`, desde el celular **no funcionará**: borrá esa variable o apuntala a la IP de tu PC, pej.  
   `VITE_API_URL=http://192.168.0.xx:3001`.

Más opciones en `.env.development.example`.

## VPS / servidor público (ej. puerto personalizado)

Publicaste la web en una URL tipo `http://tu-servidor:9090/` (por ejemplo el [catálogo en Dattaweb](http://vps-5583475-x.dattaweb.com:9090/)):

1. El **frontend compilado** debe llamar al API en ese **mismo origen** bajo **`/api/...`** (proxy Nginx/Ingress hacia Node), como en `deploy/nginx.conf` del repo — o bien definís **`VITE_API_URL`** al construir (`npm run build` / Docker build) apuntando a la URL base pública donde responda la API.

2. Si en el celular aparece «conexión segura» o fallo SSL pero vos usás **`http:`**: muchas veces el hosting **redirige a HTTPS** sin cert válido para ese nombre, o el navegador abre **`https://`** igual. Probá **`http`** explícito; para producción serio conviene HTTPS con Let's Encrypt.

3. **Contenido mixto**: página en **`https`** y API en **`http`** puede ser bloqueada; en ese caso HTTPS para ambos.

