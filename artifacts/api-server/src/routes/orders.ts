import { Router, type IRouter } from "express";
import { eq, and, gte, lt } from "drizzle-orm";
import { db, customersTable, ordersTable } from "@workspace/db";
import {
  ListOrdersQueryParams,
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

type CustomerRow = typeof customersTable.$inferSelect;
type OrderRow = typeof ordersTable.$inferSelect;
type OrderWithCustomerRow = {
  order: OrderRow;
  customer: CustomerRow;
};

function formatOrder(order: OrderRow, customer: CustomerRow) {
  return {
    id: order.id,
    customer,
    product: order.product,
    paymentMethod: order.paymentMethod,
    cashAmount: order.cashAmount != null ? Number(order.cashAmount) : null,
    totalAmount: Number(order.totalAmount),
    status: order.status,
    notes: order.notes ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

router.get("/orders/summary/today", async (req, res): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const rows: OrderRow[] = await db
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
    totalRevenue: rows.reduce<number>((sum, r) => sum + Number(r.totalAmount), 0),
  };

  res.json(summary);
});

router.get("/orders/metrics", async (req, res): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const rows: OrderRow[] = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        gte(ordersTable.createdAt, startOfDay),
        lt(ordersTable.createdAt, endOfDay),
      ),
    );

  const totalOrders = rows.length;
  const totalRevenue = rows.reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const averageOrderValue = totalOrders === 0 ? 0 : totalRevenue / totalOrders;
  const pending = rows.filter((r) => r.status === "pending").length;
  const inTransit = rows.filter((r) => r.status === "in_transit").length;
  const delivered = rows.filter((r) => r.status === "delivered").length;

  const byDay = rows.reduce((acc, row) => {
    const date = row.createdAt.toISOString().slice(0, 10);
    const entry = acc.get(date) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += Number(row.totalAmount);
    acc.set(date, entry);
    return acc;
  }, new Map<string, { count: number; revenue: number }>());

  const ordersByDay = Array.from(byDay.entries()).map(([date, value]) => ({
    date,
    count: value.count,
    revenue: value.revenue,
  }));

  const byMonth = rows.reduce((acc, row) => {
    const month = `${row.createdAt.getFullYear()}-${String(row.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const entry = acc.get(month) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += Number(row.totalAmount);
    acc.set(month, entry);
    return acc;
  }, new Map<string, { count: number; revenue: number }>());

  const ordersByMonth = Array.from(byMonth.entries()).map(([month, value]) => ({
    month,
    count: value.count,
    revenue: value.revenue,
  }));

  res.json({
    totalOrders,
    totalRevenue,
    averageOrderValue,
    pending,
    inTransit,
    delivered,
    ordersByDay,
    ordersByMonth,
  });
});

router.get("/orders", async (req, res): Promise<void> => {
  const query = ListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { date, status, page = 1, limit = 20 } = query.data;
  const safeLimit = Math.min(limit, 100);
  const offset = (page - 1) * safeLimit;

  const targetDate = date ? new Date(date) : new Date();
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

  const rows: OrderWithCustomerRow[] = await db
    .select({
      order: ordersTable,
      customer: customersTable,
    })
    .from(ordersTable)
    .innerJoin(customersTable, eq(ordersTable.customerId, customersTable.id))
    .where(and(...conditions))
    .orderBy(ordersTable.createdAt)
    .limit(safeLimit)
    .offset(offset);

  res.setHeader("X-Page", String(page));
  res.setHeader("X-Limit", String(safeLimit));
  res.json(rows.map((r) => formatOrder(r.order, r.customer)));
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
    // Update customer info to latest
    await db
      .update(customersTable)
      .set({
        name: body.customerName,
        address: body.customerAddress,
        reference: body.customerReference,
      })
      .where(eq(customersTable.id, customerId));
  } else {
    // Try to find existing customer by phone
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
      product: body.product,
      paymentMethod: body.paymentMethod,
      cashAmount: body.cashAmount != null ? String(body.cashAmount) : null,
      totalAmount: String(body.totalAmount),
      status: "pending",
      notes: body.notes ?? null,
    })
    .$returningId();

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderResult.id));

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, customerId));

  res.status(201).json(formatOrder(order, customer));
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

  res.json(formatOrder(row.order, row.customer));
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

  await db
    .update(ordersTable)
    .set({ status: parsed.data.status })
    .where(eq(ordersTable.id, params.data.id));

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

  res.json(formatOrder(row.order, row.customer));
});

export default router;
