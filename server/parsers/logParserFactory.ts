import { parseLogFile as parseZScalerLog } from './zscalerParser';
import type { InsertZscalerLog } from '@shared/schema';

export interface LogParserResult {
  logs: InsertZscalerLog[];
  parseErrors?: string[];
}

export function parseLogFile(
  content: string, 
  format: string, 
  companyId: number, 
  logTypeId: number
): LogParserResult {
  // Get log type information to determine parser
  const logType = getLogTypeById(logTypeId);
  
  console.log(`[LogParserFactory] Parsing with logTypeId: ${logTypeId}, found logType:`, logType);
  
  if (!logType) {
    throw new Error(`Unknown log type ID: ${logTypeId}`);
  }

  // Route to appropriate parser based on log type
  switch (logType.name) {
    case 'ZScaler Web Proxy Log':
      console.log(`[LogParserFactory] Using ZScaler parser for format: ${format}, content length: ${content.length}`);
      const logs = parseZScalerLog(content, format, companyId);
      console.log(`[LogParserFactory] ZScaler parser returned ${logs.length} logs`);
      return { logs };
      
    default:
      throw new Error(`No parser available for log type: ${logType.name}`);
  }
}

// Helper function to get log type by ID
// This maps to the log types in the database
function getLogTypeById(logTypeId: number) {
  const logTypes = [
    { id: 1, name: 'ZScaler Web Proxy Log', tableName: 'zscaler_logs' }
    // Add more log types here as they are implemented
  ];
  
  return logTypes.find(type => type.id === logTypeId);
}