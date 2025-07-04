import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertLogUploadSchema, insertZscalerLogSchema } from "@shared/schema";
import multer from "multer";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize database with default data
  await initializeDatabase();

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
      const logs = parseLogFile(fileContent, format, parseInt(company));
      
      // Create log records
      const createdLogs = await storage.createZscalerLogs(logs);
      
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

  // Anomaly detection API (stubbed for LLM integration)
  app.post("/api/anomalies/detect", isAuthenticated, async (req, res) => {
    try {
      const { analysisType, sensitivity, timeRange } = req.body;
      
      // TODO: Integrate with LangChain and LLM for actual anomaly detection
      // This is a placeholder response
      const mockAnomalies = [
        {
          id: 1,
          priority: "HIGH",
          sourceIp: "192.168.1.45",
          timestamp: new Date().toISOString(),
          title: "Suspicious Multiple Failed Access Attempts",
          description: "Detected unusual pattern of failed authentication attempts from single IP address. Pattern suggests potential brute force attack or credential stuffing attempt.",
          tags: ["Brute Force", "Authentication", "Failed Login"],
          riskScore: 8.5,
        },
        {
          id: 2,
          priority: "MEDIUM",
          sourceIp: "192.168.1.67",
          timestamp: new Date().toISOString(),
          title: "Unusual Traffic Volume Spike",
          description: "Detected significant increase in outbound traffic volume from this IP address. Pattern deviates from normal baseline by 340%.",
          tags: ["Traffic Analysis", "Volume Spike"],
          riskScore: 6.2,
        },
        {
          id: 3,
          priority: "LOW",
          sourceIp: "192.168.1.23",
          timestamp: new Date().toISOString(),
          title: "Off-Hours Access Pattern",
          description: "User accessing systems outside normal business hours. May indicate legitimate remote work or potential unauthorized access.",
          tags: ["Access Pattern", "Off Hours"],
          riskScore: 3.1,
        },
      ];

      res.json({
        analysisType,
        sensitivity,
        timeRange,
        anomaliesCount: mockAnomalies.length,
        anomalies: mockAnomalies,
      });
    } catch (error) {
      console.error("Error running anomaly detection:", error);
      res.status(500).json({ message: "Failed to run anomaly detection" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to parse log files
function parseLogFile(content: string, format: string, companyId: number) {
  const logs = [];
  const lines = content.split('\n').filter(line => line.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple parsing logic - in real implementation, this would be more sophisticated
    const log = insertZscalerLogSchema.parse({
      timestamp: new Date(),
      sourceIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
      destinationUrl: generateRandomUrl(),
      action: getRandomAction(),
      riskLevel: getRandomRiskLevel(),
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      bytesTransferred: Math.floor(Math.random() * 100000),
      responseCode: getRandomResponseCode(),
      category: getRandomCategory(),
      companyId,
    });

    logs.push(log);
  }

  return logs;
}

// Helper functions for generating sample data
function generateRandomUrl(): string {
  const domains = ['google.com', 'malicious-site.com', 'suspicious-domain.net', 'safe-website.org', 'phishing-attempt.biz'];
  return domains[Math.floor(Math.random() * domains.length)];
}

function getRandomAction(): string {
  const actions = ['ALLOWED', 'BLOCKED', 'FLAGGED'];
  return actions[Math.floor(Math.random() * actions.length)];
}

function getRandomRiskLevel(): string {
  const levels = ['LOW', 'MEDIUM', 'HIGH'];
  return levels[Math.floor(Math.random() * levels.length)];
}

function getRandomResponseCode(): number {
  const codes = [200, 301, 302, 403, 404, 500];
  return codes[Math.floor(Math.random() * codes.length)];
}

function getRandomCategory(): string {
  const categories = ['Business', 'Social Media', 'Malware', 'Phishing', 'Gaming'];
  return categories[Math.floor(Math.random() * categories.length)];
}

// Initialize database with default data
async function initializeDatabase() {
  try {
    // Create default company
    const companies = await storage.getCompanies();
    if (companies.length === 0) {
      await storage.createCompany({ name: 'dev' });
    }

    // Create default log type
    const logTypes = await storage.getLogTypes();
    if (logTypes.length === 0) {
      await storage.createLogType({
        name: 'ZScaler Web Proxy Log',
        tableName: 'zscaler_logs',
      });
    }

    // Create 110 sample ZScaler logs
    const logs = await storage.getZscalerLogs({ page: 1, limit: 1 });
    if (logs.total === 0) {
      const sampleLogs = [];
      for (let i = 0; i < 110; i++) {
        sampleLogs.push({
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
          sourceIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
          destinationUrl: generateRandomUrl(),
          action: getRandomAction(),
          riskLevel: getRandomRiskLevel(),
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          bytesTransferred: Math.floor(Math.random() * 100000),
          responseCode: getRandomResponseCode(),
          category: getRandomCategory(),
          companyId: 1, // Default company ID
        });
      }
      await storage.createZscalerLogs(sampleLogs);
    }
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}
