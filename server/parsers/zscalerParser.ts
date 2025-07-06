import { insertZscalerLogSchema, type InsertZscalerLog } from "@shared/schema";

export function parseLogFile(content: string, format: string, companyId: number): InsertZscalerLog[] {
  const logs: InsertZscalerLog[] = [];
  const lines = content.split('\n').filter(line => line.trim());

  if (format === 'csv') {
    // Skip header row if present
    const dataLines = lines.slice(1);
    
    for (const line of dataLines) {
      const fields = line.split(',').map(field => field.trim().replace(/"/g, ''));
      
      // Expected CSV format: timestamp, ip_address, user_id, url, action, category, response_time
      if (fields.length >= 5) {
        try {
          const log = insertZscalerLogSchema.parse({
            timestamp: new Date(fields[0] || new Date().toISOString()),
            sourceIp: fields[1] || '0.0.0.0',
            userId: fields[2] || 'unknown',
            destinationUrl: fields[3] || 'unknown',
            action: fields[4] || 'UNKNOWN',
            category: fields[5] || 'Other',
            responseTime: fields[6] ? parseInt(fields[6]) : null,
            companyId,
          });
          logs.push(log);
        } catch (error) {
          console.warn('Skipping invalid log entry:', fields, error);
        }
      }
    }
  } else if (format === 'txt') {
    // Parse text format ZScaler logs
    // Expected format: timestamp sourceIp userId destinationUrl action category responseTime
    // Example: 2025-06-15 23:48:09.144866 203.146.68.57 user35 http://example1.com/page2 ALLOW Malware 57ms
    // Example: 2025-06-15 21:42:09.144884 124.110.59.72 user41 http://example5.com/login ALLOW Social Media 493ms
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        // Split the line into parts
        const parts = line.trim().split(/\s+/);
        
        if (parts.length >= 7) {
          // Parse timestamp (date + time)
          const timestamp = `${parts[0]} ${parts[1]}`;
          const sourceIp = parts[2];
          const userId = parts[3];
          const destinationUrl = parts[4];
          const action = parts[5];
          
          // Response time is always the last part (ends with 'ms')
          const responseTimePart = parts[parts.length - 1];
          const hasResponseTime = responseTimePart.endsWith('ms');
          const responseTime = hasResponseTime 
            ? parseInt(responseTimePart.replace('ms', '')) 
            : null;
          
          // Category is everything between action and response time (or end if no response time)
          const categoryEndIndex = hasResponseTime ? parts.length - 1 : parts.length;
          const categoryParts = parts.slice(6, categoryEndIndex);
          const category = categoryParts.length > 0 ? categoryParts.join(' ') : 'Other';
          
          const log = insertZscalerLogSchema.parse({
            timestamp: new Date(timestamp),
            sourceIp,
            userId,
            destinationUrl,
            action,
            category,
            responseTime,
            companyId,
          });
          logs.push(log);
        } else {
          console.warn('Skipping invalid text log line (insufficient parts):', line);
        }
      } catch (error) {
        console.warn('Skipping invalid text log entry:', line, error);
      }
    }
  }

  return logs;
}