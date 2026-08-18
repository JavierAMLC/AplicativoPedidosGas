import { mysqlTable, varchar, int, decimal, timestamp } from "drizzle-orm/mysql-core";

export const driversTable = mysqlTable("drivers", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("available"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  locationUpdatedAt: timestamp("location_updated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),
});

export type Driver = typeof driversTable.$inferSelect;