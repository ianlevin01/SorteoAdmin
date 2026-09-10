# SorteoAdmin

Panel de administración de la plataforma de sorteos. React + Vite.

Le pega a la **misma API** (`SorteoApi`), a los endpoints `/api/admin/*`. Solo entran
usuarios con rol `admin` (los DNIs de `ADMIN_DNIS` en la API, o marcados con
`npm run make-admin`).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5182
```

En dev, `/api` se proxea al backend local (`http://localhost:4001`).

## Deploy en Vercel

1. Importar el repo `SorteoAdmin`.
2. **Environment Variables** → `VITE_API_URL` = `https://renattosorteo.online` (tipo *Config*, sin `/api`).
3. `vercel.json` ya trae el build + rewrite de SPA.
4. **Domains** → `admin.renattosorteo.com`.
5. En la API, agregar ese dominio a `CORS_ORIGIN`.

## Qué hace

- **Sorteos**: listado, crear/editar (título, premio, imágenes, opciones de chances,
  total de números, fecha, estado, destacado), métricas por sorteo.
- Comprobantes en revisión → *próximamente*.

## Estructura

```
src/
  components/   Layout (sidebar), Button, Field
  pages/        Login, Raffles, RaffleForm, RaffleDetail
  hooks/        useAdmin (queries/mutations)
  context/      AuthContext (login admin-only)
  lib/          api (incluye uploadImage), format, queryClient
  styles/       tokens.css, global.css  (compartidos con el front)
```
