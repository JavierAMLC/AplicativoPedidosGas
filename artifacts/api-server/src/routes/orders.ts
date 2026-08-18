import { Router, type IRouter } from "express";
import { eq, and, gte, lt } from "drizzle-orm";
import { db, customersTable, driversTable, ordersTable } from "@workspace/db";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  UpdateOrderBody,
} from "@workspace/api-zod";

const router: IRouter = Router();
const DAY_MS = 24 * 60 * 60 * 1000;
const PERU_UTC_OFFSET_HOURS = 5;

function getPeruDateString(now = new Date()) {
  const peruNow = new Date(now.getTime() - PERU_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  return [
    peruNow.getUTCFullYear(),
    String(peruNow.getUTCMonth() + 1).padStart(2, "0"),
    String(peruNow.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function getPeruDayBounds(dateString = getPeruDateString()): [Date, Date] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) {
    throw new Error("Invalid date. Expected YYYY-MM-DD.");
  }
  const [, year, month, day] = match;
  const start = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), PERU_UTC_OFFSET_HOURS));
  return [start, new Date(start.getTime() + DAY_MS)];
}

function formatOrder(
  order: typeof ordersTable.$inferSelect,
  customer: typeof customersTable.$inferSelect,
  driver: typeof driversTable.$inferSelect | null = null,
) {
  return {
    id: order.id,
    customer,
    product: order.product,
    quantity: Number(order.quantity),
    paymentMethod: order.paymentMethod,
    cashAmount: order.cashAmount != null ? Number(order.cashAmount) : null,
    totalAmount: Number(order.totalAmount),
    status: order.status,
    driverId: order.driverId ?? null,
    driver: driver
      ? {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          status: driver.status,
          latitude: driver.latitude != null ? Number(driver.latitude) : null,
          longitude: driver.longitude != null ? Number(driver.longitude) : null,
          locationUpdatedAt: driver.locationUpdatedAt,
          createdAt: driver.createdAt,
          updatedAt: driver.updatedAt,
        }
      : null,
    notes: order.notes ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

async function findOrder(id: number) {
  const [row] = await db
    .select({
      order: ordersTable,
      customer: customersTable,
      driver: driversTable,
    })
    .from(ordersTable)
    .innerJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
    .leftJoin(driversTable, eq(ordersTable.driverId, driversTable.id))
    .where(eq(ordersTable.id, id));
  return row;
}

router.get("/orders/summary/today", async (_req, res): Promise<void> => {
  const [startOfDay, endOfDay] = getPeruDayBounds();
  const rows = await db
    .select()
    .from(ordersTable)
    .where(and(gte(ordersTable.createdAt, startOfDay), lt(ordersTable.createdAt, endOfDay)));

  res.json({
    totalOrders: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    inTransit: rows.filter((r) => r.status === "in_transit").length,
    delivered: rows.filter((r) => r.status === "delivered").length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
    totalRevenue: rows
      .filter((r) => r.status !== "cancelled")
      .reduce((sum, r) => sum + Number(r.totalAmount), 0),
  });
});

router.get("/orders", async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { date, status } = query.data;
  let bounds: [Date, Date];
  try {
    bounds = getPeruDayBounds(date);
  } catch {
    res.status(400).json({ error: "La fecha debe tener formato YYYY-MM-DD." });
    return;
  }

  const conditions = [
    gte(ordersTable.createdAt, bounds[0]),
    lt(ordersTable.createdAt, bounds[1]),
  ];
  if (status) {
    conditions.push(eq(ordersTable.status, status));
  }

  const rows = await db
    .select({
      order: ordersTable,
      customer: customersTable,
      driver: driversTable,
    })
    .from(ordersTable)
    .innerJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
    .leftJoin(driversTable, eq(ordersTable.driverId, driversTable.id))
    .where(and(...conditions))
    .orderBy(ordersTable.createdAt);

  res.json(rows.map((r) => formatOrder(r.order, r.customer, r.driver)));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const body = parsed.data;
  let customerId: number;

  if (body.customerId != null) {
    customerId = body.customerId;
    await db
      .update(customersTable)
      .set({
        name: body.customerName,
        address: body.customerAddress,
        reference: body.customerReference,
      })
      .where(eq(customersTable.id, customerId));
  } else {
    const [existing] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.phone, body.customerPhone))
      .limit(1);

    if (existing) {
      await db
        .update(customersTable)
        .set({
          name: body.customerName,
          address: body.customerAddress,
          reference: body.customerReference,
        })
        .where(eq(customersTable.id, existing.id));
      customerId = existing.id;
    } else {
      const [result] = await db
        .insert(customersTable)
        .values({
          name: body.customerName,
          phone: body.customerPhone,
          address: body.customerAddress,
          reference: body.customerReference,
        })
        .$returningId();
      customerId = result.id;
    }
  }

  const [orderResult] = await db
    .insert(ordersTable)
    .values({
      customerId,
      driverId: body.driverId ?? null,
      product: body.product,
      quantity: body.quantity,
      paymentMethod: body.paymentMethod,
      cashAmount: body.cashAmount != null ? String(body.cashAmount) : null,
      totalAmount: String(body.totalAmount),
      status: "pending",
      notes: body.notes ?? null,
    })
    .$returningId();

  const row = await findOrder(orderResult.id);
  if (!row) {
    res.status(500).json({ error: "No se pudo recuperar el pedido creado." });
    return;
  }
  res.status(201).json(formatOrder(row.order, row.customer, row.driver));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const row = await findOrder(params.data.id);
  if (!row) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(formatOrder(row.order, row.customer, row.driver));
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await findOrder(params.data.id);
  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  await db
    .update(ordersTable)
    .set({ status: parsed.data.status })
    .where(eq(ordersTable.id, params.data.id));

  const row = await findOrder(params.data.id);
  if (!row) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(formatOrder(row.order, row.customer, row.driver));
});

router.put("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await findOrder(params.data.id);
  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const body = parsed.data;
  await db
    .update(customersTable)
    .set({
      name: body.customerName,
      phone: body.customerPhone,
      address: body.customerAddress,
      reference: body.customerReference,
    })
    .where(eq(customersTable.id, existing.customer.id));

  await db
    .update(ordersTable)
    .set({
      product: body.product,
      quantity: body.quantity,
      driverId: body.driverId ?? null,
      paymentMethod: body.paymentMethod,
      cashAmount: body.cashAmount != null ? String(body.cashAmount) : null,
      totalAmount: String(body.totalAmount),
      notes: body.notes ?? null,
      status: body.status ?? existing.order.status,
    })
    .where(eq(ordersTable.id, params.data.id));

  const row = await findOrder(params.data.id);
  if (!row) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(formatOrder(row.order, row.customer, row.driver));
});

export default router;