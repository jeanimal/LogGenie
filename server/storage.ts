import {
  users,
  companies,
  logTypes,
  zscalerLogs,
  logUploads,
  type User,
  type UpsertUser,
  type Company,
  type LogType,
  type ZscalerLog,
  type LogUpload,
  type InsertCompany,
  type InsertLogType,
  type InsertZscalerLog,
  type InsertLogUpload,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, and, gte, lte, sql, min, max } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Company operations
  getCompanies(): Promise<Company[]>;
  getCompanyById(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // Log type operations
  getLogTypes(): Promise<LogType[]>;
  getLogTypeById(id: number): Promise<LogType | undefined>;
  createLogType(logType: InsertLogType): Promise<LogType>;
  
  // ZScaler log operations
  getZscalerLogs(options: {
    page: number;
    limit: number;
    companyId?: number;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ logs: ZscalerLog[]; total: number }>;
  createZscalerLog(log: InsertZscalerLog): Promise<ZscalerLog>;
  createZscalerLogs(logs: InsertZscalerLog[]): Promise<ZscalerLog[]>;
  
  // Log upload operations
  getLogUploads(): Promise<LogUpload[]>;
  createLogUpload(upload: InsertLogUpload): Promise<LogUpload>;
  
  // Analytics operations
  getLogStats(companyId?: number): Promise<{
    totalLogs: number;
    recentUploads: number;
    anomalies: number;
    companies: number;
    blockedRequests: number;
    uniqueIPs: number;
    highRiskEvents: number;
  }>;
  
  getTopSourceIPs(limit: number): Promise<Array<{
    sourceIp: string;
    eventCount: number;
    riskScore: number;
    status: string;
  }>>;
  
  // Timeline operations
  getLogTimestampRange(companyId?: number): Promise<{
    earliestTimestamp: string | null;
    latestTimestamp: string | null;
    totalLogs: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async getCompanyById(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async getLogTypes(): Promise<LogType[]> {
    return await db.select().from(logTypes);
  }

  async getLogTypeById(id: number): Promise<LogType | undefined> {
    const [logType] = await db.select().from(logTypes).where(eq(logTypes.id, id));
    return logType || undefined;
  }

  async createLogType(logType: InsertLogType): Promise<LogType> {
    const [created] = await db.insert(logTypes).values(logType).returning();
    return created;
  }

  async getZscalerLogs(options: {
    page: number;
    limit: number;
    companyId?: number;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ logs: ZscalerLog[]; total: number }> {
    const { page, limit, companyId, action, startDate, endDate } = options;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    if (companyId) {
      whereConditions.push(eq(zscalerLogs.companyId, companyId));
    }
    if (action) {
      whereConditions.push(eq(zscalerLogs.action, action));
    }
    if (startDate) {
      whereConditions.push(gte(zscalerLogs.timestamp, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(zscalerLogs.timestamp, endDate));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [logs, totalResult] = await Promise.all([
      db
        .select()
        .from(zscalerLogs)
        .where(whereClause)
        .orderBy(desc(zscalerLogs.timestamp))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(zscalerLogs)
        .where(whereClause)
    ]);

    return {
      logs,
      total: totalResult[0].count,
    };
  }

  async createZscalerLog(log: InsertZscalerLog): Promise<ZscalerLog> {
    const [created] = await db.insert(zscalerLogs).values(log).returning();
    return created;
  }

  async createZscalerLogs(logs: InsertZscalerLog[]): Promise<ZscalerLog[]> {
    return await db.insert(zscalerLogs).values(logs).returning();
  }

  async getLogUploads(): Promise<LogUpload[]> {
    return await db.select().from(logUploads).orderBy(desc(logUploads.createdAt));
  }

  async createLogUpload(upload: InsertLogUpload): Promise<LogUpload> {
    const [created] = await db.insert(logUploads).values(upload).returning();
    return created;
  }

  async getLogStats(companyId?: number): Promise<{
    totalLogs: number;
    recentUploads: number;
    anomalies: number;
    companies: number;
    blockedRequests: number;
    uniqueIPs: number;
    highRiskEvents: number;
  }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    let whereConditions = companyId ? [eq(zscalerLogs.companyId, companyId)] : [];

    const [
      totalLogsResult,
      recentUploadsResult,
      companiesResult,
      blockedRequestsResult,
      uniqueIPsResult,
      highRiskEventsResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(zscalerLogs).where(whereConditions.length > 0 ? and(...whereConditions) : undefined),
      db.select({ count: count() }).from(logUploads).where(gte(logUploads.createdAt, oneDayAgo)),
      db.select({ count: count() }).from(companies),
      db.select({ count: count() }).from(zscalerLogs).where(and(eq(zscalerLogs.action, 'BLOCKED'), ...(whereConditions.length > 0 ? whereConditions : []))),
      db.selectDistinct({ sourceIp: zscalerLogs.sourceIp }).from(zscalerLogs).where(whereConditions.length > 0 ? and(...whereConditions) : undefined),
      db.select({ count: count() }).from(zscalerLogs).where(and(eq(zscalerLogs.action, 'FLAGGED'), ...(whereConditions.length > 0 ? whereConditions : []))),
    ]);

    return {
      totalLogs: totalLogsResult[0].count,
      recentUploads: recentUploadsResult[0].count,
      anomalies: 0, // Anomalies are detected on-demand, not stored persistently
      companies: companiesResult[0].count,
      blockedRequests: blockedRequestsResult[0].count,
      uniqueIPs: uniqueIPsResult.length,
      highRiskEvents: highRiskEventsResult[0].count,
    };
  }

  async getTopSourceIPs(limit: number): Promise<Array<{
    sourceIp: string;
    eventCount: number;
    riskScore: number;
    status: string;
  }>> {
    const result = await db
      .select({
        sourceIp: zscalerLogs.sourceIp,
        eventCount: count(),
      })
      .from(zscalerLogs)
      .groupBy(zscalerLogs.sourceIp)
      .orderBy(desc(count()))
      .limit(limit);

    return result.map(row => ({
      ...row,
      riskScore: Math.random() * 10, // Placeholder calculation
      status: row.eventCount > 20 ? 'High Risk' : row.eventCount > 10 ? 'Medium Risk' : 'Low Risk',
    }));
  }

  async getLogTimestampRange(companyId?: number): Promise<{
    earliestTimestamp: string | null;
    latestTimestamp: string | null;
    totalLogs: number;
  }> {
    // Use a simpler approach by getting all logs first
    const logs = await this.getZscalerLogs({
      page: 1,
      limit: 999999, // Get all logs
      companyId,
    });
    
    if (logs.logs.length === 0) {
      return {
        earliestTimestamp: null,
        latestTimestamp: null,
        totalLogs: 0,
      };
    }
    
    const timestamps = logs.logs.map(log => new Date(log.timestamp));
    const earliest = new Date(Math.min(...timestamps.map(d => d.getTime())));
    const latest = new Date(Math.max(...timestamps.map(d => d.getTime())));
    
    return {
      earliestTimestamp: earliest.toISOString(),
      latestTimestamp: latest.toISOString(),
      totalLogs: logs.total,
    };
  }
}

export const storage = new DatabaseStorage();
