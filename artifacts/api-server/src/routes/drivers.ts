import { Router, type IRouter } from "express";
import { and, eq, gte, lt } from "drizzle-orm";
import { db, driversTable, ordersTable } from "@workspace/db";
import {
  CreateDriverBody,
  GetDriverSettlementQueryParams,
  UpdateDriverBody,
  UpdateDriverLocationBody,
  UpdateDriverLocationParams,
  UpdateDriverParams,
} from "@workspace/api-zod";

const router: IRouter = Router();
const DAY_MS = 24 * 60 * 60 * 1000;
const PERU_UTC_OFFSET_HOURS = 5;

function getPeruDayBounds(dateString: string): [Date, Date] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) throw new Error("Invalid date");
  const [, year, month, day] = match;
  const start = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), PERU_UTC_OFFSET_HOURS));
  return [start, new Date(start.getTime() + DAY_MS)];
}

function formatDriver(driver: typeof driversTable.$inferSelect) {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    status: driver.status,
    latitude: driver.latitude != null ? Number(driver.latitude) : null,
    longitude: driver.longitude != null ? Number(driver.longitude) : null,
    locationUpdatedAt: driver.locationUpdatedAt,
    createdAt: driver.createdAt,
    updatedAt: driver.updatedAt,
  };
}

async function findDriver(id: number) {
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, id));
  return driver;
}

router.get("/drivers", async (_req, res): Promise<void> => {
  const drivers = await db.select().from(driversTable).orderBy(driversTable.name);
  res.json(drivers.map(formatDriver));
});

router.post("/drivers", async (req, res): Promise<void> => {
  const parsed = CreateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [result] = await db.insert(driversTable).values({
    name: parsed.data.name.trim(),
    phone: parsed.data.phone.trim(),
    status: parsed.data.status ?? "available",
  }).$returningId();
  const driver = await findDriver(result.id);
  if (!driver) {
    res.status(500).json({ error: "No se pudo crear el repartidor." });
    return;
  }
  res.status(201).json(formatDriver(driver));
});

router.patch("/drivers/:id", async (req, res): Promise<void> => {
  const params = UpdateDriverParams.safeParse(req.params);
  const parsed = UpdateDriverBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Datos inválidos del repartidor." });
    return;
  }

  const existing = await findDriver(params.data.id);
  if (!existing) {
    res.status(404).json({ error: "Repartidor no encontrado." });
    return;
  }

  await db.update(driversTable).set({
    ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
    ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone.trim() } : {}),
    ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
  }).where(eq(driversTable.id, params.data.id));

  const driver = await findDriver(params.data.id);
  res.json(formatDriver(driver!));
});

router.patch("/drivers/:id/location", async (req, res): Promise<void> => {
  const params = UpdateDriverLocationParams.safeParse(req.params);
  const parsed = UpdateDriverLocationBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Ubicación inválida." });
    return;
  }

  const existing = await findDriver(params.data.id);
  if (!existing) {
    res.status(404).json({ error: "Repartidor no encontrado." });
    return;
  }

  await db.update(driversTable).set({
    latitude: String(parsed.data.latitude),
    longitude: String(parsed.data.longitude),
    locationUpdatedAt: new Date(),
  }).where(eq(driversTable.id, params.data.id));

  const driver = await findDriver(params.data.id);
  res.json(formatDriver(driver!));
});

router.get("/settlements", async (req, res): Promise<void> => {
  const parsed = GetDriverSettlementQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "La liquidación requiere una fecha válida." });
    return;
  }

  let bounds: [Date, Date];
  try {
    bounds = getPeruDayBounds(parsed.data.date);
  } catch {
    res.status(400).json({ error: "La fecha debe tener formato YYYY-MM-DD." });
    return;
  }

  const conditions = [
    gte(ordersTable.createdAt, bounds[0]),
    lt(ordersTable.createdAt, bounds[1]),
    eq(ordersTable.status, "delivered"),
  ];
  if (parsed.data.driverId !== undefined) {
    conditions.push(eq(ordersTable.driverId, parsed.data.driverId));
  }

  const rows = await db
    .select({
      order: ordersTable,
      driver: driversTable,
    })
    .from(ordersTable)
    .leftJoin(driversTable, eq(ordersTable.driverId, driversTable.id))
    .where(and(...conditions));

  const summary = rows.reduce(
    (result, row) => {
      const amount = Number(row.order.totalAmount);
      if (row.order.paymentMethod === "cash") result.cash += amount;
      if (row.order.paymentMethod === "yape_plin") result.yapePlin += amount;
      if (row.order.paymentMethod === "pos_card") result.posCard += amount;
      result.grandTotal += amount;
      result.orders += 1;
      if (!result.driverName && row.driver) {
        result.driverName = row.driver.name;
      }
      return result;
    },
    {
      cash: 0,
      yapePlin: 0,
      posCard: 0,
      grandTotal: 0,
      orders: 0,
      driverName: parsed.data.driverId === undefined ? "Todos los repartidores" : "Sin asignar",
    },
  );

  if (parsed.data.driverId !== undefined && !summary.driverName) {
    const driver = await findDriver(parsed.data.driverId);
    summary.driverName = driver?.name ?? "Repartidor";
  }

  res.json({
    date: parsed.data.date,
    driverId: parsed.data.driverId ?? null,
    driverName: summary.driverName,
    cash: summary.cash,
    yapePlin: summary.yapePlin,
    posCard: summary.posCard,
    grandTotal: summary.grandTotal,
    orders: summary.orders,
  });
});

export default router;