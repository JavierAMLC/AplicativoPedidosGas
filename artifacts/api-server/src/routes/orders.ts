import { Router, type IRouter } from "express";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { db, customersTable, ordersTable } from "@workspace/db";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatOrder(row: {
  order: typeof ordersTable.$inferSelect;
  customer: typeof customersTable.$inferSelect;
}) {
  return {
    id: row.order.id,
    customer: row.customer,
    product: row.order.product,
    paymentMethod: row.order.paymentMethod,
    cashAmount: row.order.cashAmount != null ? Number(row.order.cashAmount) : null,
    totalAmount: Number(row.order.totalAmount),
    status: row.order.status,
    notes: row.order.notes ?? null,
    createdAt: row.order.createdAt,
    updatedAt: row.order.updatedAt,
  };
}

router.get("/orders/summary/today", async (req, res): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        gte(ordersTable.createdAt, startOfDay),
        lt(ordersTable.createdAt, endOfDay),
      ),
    );

  const summary = {
    totalOrders: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    inTransit: rows.filter((r) => r.status === "in_transit").length,
    delivered: rows.filter((r) => r.status === "delivered").length,
    totalRevenue: rows.reduce((sum, r) => sum + Number(r.totalAmount), 0),
  };

  res.json(summary);
});

router.get("/orders", async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { date, status } = query.data;

  // Default to today if no date provided
  const targetDate = date
    ? new Date(date)
    : new Date();
  const startOfDay = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const conditions = [
    gte(ordersTable.createdAt, startOfDay),
    lt(ordersTable.createdAt, endOfDay),
  ];

  if (status) {
    conditions.push(eq(ordersTable.status, status));
  }

  const rows = await db
    .select({
      order: ordersTable,
      customer: customersTable,
    })
    .from(ordersTable)
    .innerJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
    .where(and(...conditions))
    .orderBy(ordersTable.createdAt);

  res.json(rows.map(formatOrder));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const body = parsed.data;

  let customerId = body.customerId ?? null;

  // If no existing customerId, create or update customer record
  if (!customerId) {
    // Try to find existing customer by phone
    const [existing] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.phone, body.customerPhone))
      .limit(1);

    if (existing) {
      // Update their address/reference with the latest info
      const [updated] = await db
        .update(customersTable)
        .set({
          name: body.customerName,
          address: body.customerAddress,
          reference: body.customerReference,
        })
        .where(eq(customersTable.id, existing.id))
        .returning();
      customerId = updated.id;
    } else {
      const [created] = await db
        .insert(customersTable)
        .values({
          name: body.customerName,
          phone: body.customerPhone,
          address: body.customerAddress,
          reference: body.customerReference,
        })
        .returning();
      customerId = created.id;
    }
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
      customerId,
      product: body.product,
      paymentMethod: body.paymentMethod,
      cashAmount: body.cashAmount != null ? String(body.cashAmount) : null,
      totalAmount: String(body.totalAmount),
      status: "pending",
      notes: body.notes ?? null,
    })
    .returning();

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, customerId));

  res.status(201).json(formatOrder({ order, customer }));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      order: ordersTable,
      customer: customersTable,
    })
    .from(ordersTable)
    .innerJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
    .where(eq(ordersTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(formatOrder(row));
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

  const [order] = await db
    .update(ordersTable)
    .set({ status: parsed.data.status })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, order.customerId));

  res.json(formatOrder({ order, customer }));
});

export default router;
