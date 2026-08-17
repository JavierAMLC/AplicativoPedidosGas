# Primax Gas — Gestión de Pedidos

App web de toma de pedidos para distribuidora de gas Primax. Diseñada para operar en llamadas telefónicas: registro rápido de clientes y pedidos, tablero Kanban del día, y notificación por WhatsApp al repartidor.

## Run & Operate

- `pnpm --filter @workspace/primax run dev` — frontend (puerto asignado por $PORT)
- `pnpm --filter @workspace/api-server run dev` — API server (puerto 8080)
- `pnpm run typecheck` — typecheck completo
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks y Zod schemas desde OpenAPI
- `pnpm --filter @workspace/db run push` — aplicar cambios de schema a la BD (solo dev)
- Required env: `MYSQL_URL` — MySQL connection string (Railway public host)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Wouter
- API: Express 5 + Zod validation
- DB: MySQL + Drizzle ORM (`mysql2`)
- Codegen: Orval (desde OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — contrato API (fuente de verdad)
- `lib/db/src/schema/` — tablas Drizzle (`customers.ts`, `orders.ts`)
- `artifacts/api-server/src/routes/` — rutas Express (`customers.ts`, `orders.ts`)
- `artifacts/primax/src/` — frontend React

## Product

- **Tablero (`/`)**: Kanban 3 columnas con scroll interno para listas grandes (Pendiente / En camino / Entregado), estadísticas del día, avance de estado en 1 clic, edición/cancelación y botón WhatsApp con mensaje prellenado.
- **Nuevo Pedido (`/nuevo`)**: Búsqueda en tiempo real de clientes, autocompletado de dirección/referencia, selección rápida de producto, cantidad de balones, pago y campo condicional de vuelto en efectivo.
- **Historial (`/historial`)**: Consulta de pedidos por fecha, búsqueda, totales del día y descarga CSV.
- **BD de clientes**: historial persistente; al crear un pedido se guarda o actualiza el cliente automáticamente.
- **WhatsApp**: genera URL `wa.me/<destino>?text=...` con plantilla formateada (📦 NUEVO PEDIDO DE GAS), cantidad, destinatario configurable y número remitente como referencia.

## Architecture decisions

- El pedido crea o actualiza el cliente automáticamente por teléfono — no hay paso separado de registro.
- `orders/summary/today` es un endpoint separado para las estadísticas del dashboard.
- `GET /orders` filtra por fecha calendario de Perú (default: hoy) y opcionalmente por status.
- La ruta `/orders/summary/today` debe declararse **antes** de `/orders/:id` en Express para que no colisione.

## User preferences

_Poblar según instrucciones explícitas del usuario._

## Gotchas

- Siempre correr `pnpm run typecheck:libs` después de cambiar `lib/db/src/schema/` y antes del typecheck de artifacts.
- Los valores `decimal` de Drizzle MySQL regresan como `string` — convertir con `Number()` en el route handler.
- Los timestamps se guardan en UTC; los límites de día de pedidos se calculan en horario calendario de Perú (UTC-5) en el servidor.
