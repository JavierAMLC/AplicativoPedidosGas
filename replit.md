# Primax Gas — Gestión de Pedidos

App web de toma de pedidos para distribuidora de gas Primax. Diseñada para operar en llamadas telefónicas: registro rápido de clientes y pedidos, tablero Kanban del día, y notificación por WhatsApp al repartidor.

## Run & Operate

- `pnpm --filter @workspace/primax run dev` — frontend (puerto asignado por $PORT)
- `pnpm --filter @workspace/api-server run dev` — API server (puerto 8080)
- `pnpm run typecheck` — typecheck completo
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks y Zod schemas desde OpenAPI
- `pnpm --filter @workspace/db run push` — aplicar cambios de schema a la BD (solo dev)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Wouter
- API: Express 5 + Zod validation
- DB: PostgreSQL + Drizzle ORM
- Codegen: Orval (desde OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — contrato API (fuente de verdad)
- `lib/db/src/schema/` — tablas Drizzle (`customers.ts`, `orders.ts`)
- `artifacts/api-server/src/routes/` — rutas Express (`customers.ts`, `orders.ts`)
- `artifacts/primax/src/` — frontend React

## Product

- **Tablero (`/`)**: Kanban 3 columnas (Pendiente / En camino / Entregado), estadísticas del día, avance de estado en 1 clic, botón WhatsApp con mensaje prellenado.
- **Nuevo Pedido (`/nuevo`)**: Búsqueda en tiempo real de clientes, autocompletado de dirección/referencia, selección rápida de producto y pago, campo condicional de vuelto en efectivo.
- **BD de clientes**: historial persistente; al crear un pedido se guarda o actualiza el cliente automáticamente.
- **WhatsApp**: genera URL `wa.me/?text=...` con plantilla formateada (📦 NUEVO PEDIDO DE GAS).

## Architecture decisions

- El pedido crea o actualiza el cliente automáticamente por teléfono — no hay paso separado de registro.
- `orders/summary/today` es un endpoint separado para las estadísticas del dashboard.
- `GET /orders` filtra por fecha (default: hoy) y opcionalmente por status.
- La ruta `/orders/summary/today` debe declararse **antes** de `/orders/:id` en Express para que no colisione.

## User preferences

_Poblar según instrucciones explícitas del usuario._

## Gotchas

- Siempre correr `pnpm run typecheck:libs` después de cambiar `lib/db/src/schema/` y antes del typecheck de artifacts.
- Los valores `numeric` de Drizzle regresan como `string` desde pg — convertir con `Number()` en el route handler.
