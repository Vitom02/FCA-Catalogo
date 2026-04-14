# Estructura del repositorio

Monorepo sencillo: **web** (cliente) y **api** (servidor, pendiente).

## Carpetas principales

| Carpeta | Qué es |
|--------|--------|
| **`web/`** | Aplicación **frontend** (React, Vite). Es la parte que corre en el navegador. |
| **`api/`** | **Backend** reservado para el servicio HTTP y la lógica de servidor (aún vacío). |

## Dentro de `web/src/`

| Carpeta | Contenido |
|---------|------------|
| **`paginas/`** | Pantallas con ruta; ver **`web/src/paginas/README.md`** (subcarpetas por dominio). |
| **`componentes/`** | UI reutilizable; ver **`web/src/componentes/README.md`** (layout vs exposición). |
| **`datos/`** | Datos de demostración y tablas (exposiciones, ejemplares). |
| **`autenticacion/`** | Sesión y login de prueba (`testAuth.js`). |
| **`utilidades/`** | Funciones auxiliares (p. ej. formato de fechas con dayjs). |
| **`App.jsx`** | Raíz de React: rutas y estado global de sesión / filas. |
| **`main.jsx`** | Entrada que monta la app en el DOM. |
| **`index.css`** | Estilos globales. |

Los nombres de archivo en **español** indican la función (por ejemplo `PaginaInicio.jsx`, `Cabecera.jsx`).

### Subcarpetas de `paginas/`

| Subcarpeta | Datos que maneja |
|------------|-------------------|
| **`autenticacion/`** | Credenciales y sesión (login). |
| **`catalogo/`** | Listado y filtros de **exposiciones**. |
| **`exposicion/`** | Detalle de **una** exposición (anotaciones). |

### Subcarpetas de `componentes/`

| Subcarpeta | Rol |
|------------|-----|
| **`layout/`** | Marco global (cabecera). |
| **`exposicion/`** | Flujo de anotación ligado a una expo. |
