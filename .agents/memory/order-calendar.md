---
name: Calendario de pedidos
description: Regla de zona horaria para listar y resumir pedidos por día.
---

Los pedidos usan timestamps UTC en MySQL, pero el negocio opera con días calendario de Perú (UTC-5). Las consultas de “hoy” e historial deben convertir el día peruano a límites UTC en el servidor; no deben depender de la fecha local enviada por el navegador.

**Why:** El navegador y el servidor pueden estar en zonas horarias distintas; enviar `yyyy-MM-dd` calculado en el cliente hizo que pedidos recién creados desaparecieran del tablero.

**How to apply:** Para cualquier endpoint de pedidos por fecha, calcular el rango `[05:00 UTC del día, 05:00 UTC del día siguiente]` y usarlo tanto en listados como en resúmenes.