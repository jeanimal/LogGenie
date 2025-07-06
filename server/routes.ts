import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertLogUploadSchema, insertZscalerLogSchema, zscalerLogs, logUploads } from "@shared/schema";
import { db } from "./db";
import { inArray, eq } from "drizzle-orm";
import multer from "multer";
import { parseLogFile } from "./parsers/logParserFactory";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to parse time ranges
function parseTimeRange(timeRange: string): number {
  switch (timeRange) {
    case '1h': return 60 * 60 * 1000;
    case '6h': return 6 * 60 * 60 * 1000;
    case '12h': return 12 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    case '30d': return 30 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000; // Default to 24h
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);



  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Companies API
  app.get("/api/companies", isAuthenticated, async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Log types API
  app.get("/api/log-types", isAuthenticated, async (req, res) => {
    try {
      const logTypes = await storage.getLogTypes();
      res.json(logTypes);
    } catch (error) {
      console.error("Error fetching log types:", error);
      res.status(500).json({ message: "Failed to fetch log types" });
    }
  });

  // Log timestamp range API
  app.get("/api/logs/timeline-range", isAuthenticated, async (req, res) => {
    try {
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;
      const range = await storage.getLogTimestampRange(companyId);
      res.json(range);
    } catch (error) {
      console.error("Error fetching log timeline range:", error);
      res.status(500).json({ message: "Failed to fetch timeline range" });
    }
  });

  // Logs API
  app.get("/api/logs", isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const result = await storage.getZscalerLogs({
        page,
        limit,
        companyId,
        startDate,
        endDate,
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Upload logs API
  app.post("/api/upload", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { company, logType, format } = req.body;
      const userId = req.user.claims.sub;

      // Parse and validate upload data
      const uploadData = insertLogUploadSchema.parse({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        logTypeId: parseInt(logType),
        companyId: parseInt(company),
        format,
        recordCount: 0, // Will be updated after processing
        uploadedBy: userId,
      });

      // Process file content
      const fileContent = req.file.buffer.toString('utf-8');
      const parseResult = parseLogFile(fileContent, format, parseInt(company), parseInt(logType));
      
      // Check if any logs were parsed
      if (parseResult.logs.length === 0) {
        return res.status(400).json({ 
          message: "No valid log entries found in the uploaded file. Please check the file format and content." 
        });
      }
      
      // Create log records
      const createdLogs = await storage.createZscalerLogs(parseResult.logs);
      
      // Update upload record with actual count
      uploadData.recordCount = createdLogs.length;
      const logUpload = await storage.createLogUpload(uploadData);

      res.json({
        message: "File uploaded successfully",
        upload: logUpload,
        recordsCreated: createdLogs.length,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Analytics API
  app.get("/api/analytics/stats", isAuthenticated, async (req, res) => {
    try {
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;
      const stats = await storage.getLogStats(companyId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/analytics/top-ips", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topIPs = await storage.getTopSourceIPs(limit);
      res.json(topIPs);
    } catch (error) {
      console.error("Error fetching top IPs:", error);
      res.status(500).json({ message: "Failed to fetch top IPs" });
    }
  });

  // Anomaly detection API with OpenAI integration
  app.post("/api/anomalies/detect", isAuthenticated, async (req, res) => {
    try {
      const { analysisType, sensitivity = 'medium', timeRange = '24h', companyId, temperature = 0.2, maxTokens = 2000 } = req.body;
      
      // Get logs for analysis
      const logOptions = {
        page: 1,
        limit: analysisType === 'sample' ? 50 : 500, // Limit for cost control
        companyId: companyId ? parseInt(companyId) : undefined,
        // Add time range filtering if needed
        ...(timeRange && timeRange !== 'all' && {
          startDate: new Date(Date.now() - parseTimeRange(timeRange)),
          endDate: new Date()
        })
      };
      
      const { logs } = await storage.getZscalerLogs(logOptions);
      
      if (logs.length === 0) {
        return res.json({
          anomalies: [],
          summary: {
            totalLogsAnalyzed: 0,
            anomaliesFound: 0,
            highestSeverity: 'low',
            commonPatterns: [],
            recommendations: ['No logs available for analysis']
          }
        });
      }

      // Use OpenAI for actual anomaly detection
      const { detectAnomalies } = await import('./openai');
      
      const result = await detectAnomalies({
        logs: logs.map(log => ({
          id: log.id,
          timestamp: log.timestamp.toISOString(),
          sourceIp: log.sourceIp,
          userId: log.userId,
          destinationUrl: log.destinationUrl,
          action: log.action,
          category: log.category || undefined,
          responseTime: log.responseTime || undefined
        })),
        sensitivity: sensitivity as 'low' | 'medium' | 'high',
        timeRange,
        temperature: parseFloat(temperature),
        maxTokens: parseInt(maxTokens)
      });

      res.json(result);
    } catch (error) {
      console.error("Error detecting anomalies:", error);
      res.status(500).json({ 
        message: "Failed to detect anomalies",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get specific log entries by IDs
  app.post("/api/logs/by-ids", isAuthenticated, async (req, res) => {
    try {
      const { logIds } = req.body;
      
      if (!Array.isArray(logIds) || logIds.length === 0) {
        return res.status(400).json({ message: "logIds array is required" });
      }

      const logs = await db
        .select()
        .from(zscalerLogs)
        .where(inArray(zscalerLogs.id, logIds))
        .orderBy(zscalerLogs.timestamp);

      res.json(logs);
    } catch (error) {
      console.error("Error fetching logs by IDs:", error);
      res.status(500).json({ 
        message: "Failed to fetch log entries",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });



  // Admin endpoints for log deletion
  app.delete("/api/admin/delete-all-logs", isAuthenticated, async (req, res) => {
    try {
      // Delete all ZScaler logs
      await db.delete(zscalerLogs);
      
      // Delete all log uploads
      await db.delete(logUploads);
      
      // Note: Anomaly detection is performed on-demand from current logs,
      // so deleting logs automatically removes them from future anomaly analysis
      
      res.json({ 
        message: "All logs have been deleted successfully",
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error deleting all logs:", error);
      res.status(500).json({ 
        message: "Failed to delete logs",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.delete("/api/admin/delete-company-logs/:companyId", isAuthenticated, async (req, res) => {
    try {
      const { companyId } = req.params;
      const companyIdNum = parseInt(companyId);
      
      if (isNaN(companyIdNum)) {
        return res.status(400).json({ message: "Invalid company ID" });
      }
      
      // Delete ZScaler logs for this company
      const deletedLogs = await db
        .delete(zscalerLogs)
        .where(eq(zscalerLogs.companyId, companyIdNum))
        .returning();
      
      // Delete log uploads for this company  
      const deletedUploads = await db
        .delete(logUploads)
        .where(eq(logUploads.companyId, companyIdNum))
        .returning();
      
      // Note: Anomaly detection is performed on-demand from current logs,
      // so deleting logs automatically removes them from future anomaly analysis
      
      res.json({ 
        message: `All logs for company ${companyId} have been deleted successfully`,
        deletedLogs: deletedLogs.length,
        deletedUploads: deletedUploads.length,
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error deleting company logs:", error);
      res.status(500).json({ 
        message: "Failed to delete company logs",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}








