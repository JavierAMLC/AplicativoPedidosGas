import { Router, type IRouter } from "express";
import { eq, like, or } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import {
  ListCustomersQueryParams,
  CreateCustomerBody,
  GetCustomerParams,
  UpdateCustomerParams,
  UpdateCustomerBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/customers", async (req, res): Promise<void> => {
  const query = ListCustomersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { q } = query.data;

  let customers;
  if (q && q.trim().length > 0) {
    const pattern = `%${q.trim()}%`;
    customers = await db
      .select()
      .from(customersTable)
      .where(
        or(
          like(customersTable.name, pattern),
          like(customersTable.phone, pattern),
        ),
      )
      .orderBy(customersTable.name)
      .limit(20);
  } else {
    customers = await db
      .select()
      .from(customersTable)
      .orderBy(customersTable.name)
      .limit(50);
  }

  res.json(customers);
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [result] = await db
    .insert(customersTable)
    .values(parsed.data)
    .$returningId();

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, result.id));

  res.status(201).json(customer);
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, params.data.id));

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(customer);
});

router.put("/customers/:id", async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .update(customersTable)
    .set(parsed.data)
    .where(eq(customersTable.id, params.data.id));

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, params.data.id));

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(customer);
});

export default router;
