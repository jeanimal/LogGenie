import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies table
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Log types table
export const logTypes = pgTable("log_types", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  tableName: varchar("table_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ZScaler web proxy logs table
export const zscalerLogs = pgTable("zscaler_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  sourceIp: varchar("source_ip").notNull(),
  destinationUrl: text("destination_url").notNull(),
  action: varchar("action").notNull(), // ALLOWED, BLOCKED, FLAGGED
  riskLevel: varchar("risk_level").notNull(), // LOW, MEDIUM, HIGH
  userAgent: text("user_agent"),
  bytesTransferred: integer("bytes_transferred"),
  responseCode: integer("response_code"),
  category: varchar("category"),
  companyId: integer("company_id").references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Log uploads tracking
export const logUploads = pgTable("log_uploads", {
  id: serial("id").primaryKey(),
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  logTypeId: integer("log_type_id").references(() => logTypes.id),
  companyId: integer("company_id").references(() => companies.id),
  format: varchar("format").notNull(), // csv, txt
  recordCount: integer("record_count").notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type LogType = typeof logTypes.$inferSelect;
export type ZscalerLog = typeof zscalerLogs.$inferSelect;
export type LogUpload = typeof logUploads.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;
export type InsertLogType = typeof logTypes.$inferInsert;
export type InsertZscalerLog = typeof zscalerLogs.$inferInsert;
export type InsertLogUpload = typeof logUploads.$inferInsert;

export const insertLogUploadSchema = createInsertSchema(logUploads).omit({
  id: true,
  createdAt: true,
});

export const insertZscalerLogSchema = createInsertSchema(zscalerLogs).omit({
  id: true,
  createdAt: true,
});
