import { describe, it, expect } from 'vitest';
import { parseLogFile } from '../parsers/zscalerParser';

describe('ZScaler Parser', () => {
  const companyId = 1;

  describe('CSV Format Parsing', () => {
    it('should parse valid CSV logs correctly', () => {
      const csvContent = `timestamp,sourceIp,userId,destinationUrl,action,category,responseTime
2025-06-15T23:48:09.144866Z,203.146.68.57,user35,http://example1.com/page2,ALLOW,Malware,57
2025-06-15T21:42:09.144884Z,124.110.59.72,user41,http://example5.com/login,ALLOW,Social Media,493`;

      const logs = parseLogFile(csvContent, 'csv', companyId);

      expect(logs).toHaveLength(2);
      
      expect(logs[0]).toEqual({
        timestamp: new Date('2025-06-15T23:48:09.144866Z'),
        sourceIp: '203.146.68.57',
        userId: 'user35',
        destinationUrl: 'http://example1.com/page2',
        action: 'ALLOW',
        category: 'Malware',
        responseTime: 57,
        companyId: 1,
      });

      expect(logs[1]).toEqual({
        timestamp: new Date('2025-06-15T21:42:09.144884Z'),
        sourceIp: '124.110.59.72',
        userId: 'user41',
        destinationUrl: 'http://example5.com/login',
        action: 'ALLOW',
        category: 'Social Media',
        responseTime: 493,
        companyId: 1,
      });
    });

    it('should handle CSV with missing optional fields', () => {
      const csvContent = `timestamp,sourceIp,userId,destinationUrl,action
2025-06-15T23:48:09.144866Z,203.146.68.57,user35,http://example1.com/page2,ALLOW`;

      const logs = parseLogFile(csvContent, 'csv', companyId);

      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual({
        timestamp: new Date('2025-06-15T23:48:09.144866Z'),
        sourceIp: '203.146.68.57',
        userId: 'user35',
        destinationUrl: 'http://example1.com/page2',
        action: 'ALLOW',
        category: 'Other',
        responseTime: null,
        companyId: 1,
      });
    });

    it('should handle CSV with quoted fields', () => {
      const csvContent = `timestamp,sourceIp,userId,destinationUrl,action,category,responseTime
"2025-06-15T23:48:09.144866Z","203.146.68.57","user35","http://example1.com/page2","ALLOW","Malware","57"`;

      const logs = parseLogFile(csvContent, 'csv', companyId);

      expect(logs).toHaveLength(1);
      expect(logs[0].sourceIp).toBe('203.146.68.57');
      expect(logs[0].category).toBe('Malware');
    });

    it('should skip invalid CSV lines', () => {
      const csvContent = `timestamp,sourceIp,userId,destinationUrl,action,category,responseTime
2025-06-15T23:48:09.144866Z,203.146.68.57,user35,http://example1.com/page2,ALLOW,Malware,57
invalid,line
2025-06-15T21:42:09.144884Z,124.110.59.72,user41,http://example5.com/login,ALLOW,Social Media,493`;

      const logs = parseLogFile(csvContent, 'csv', companyId);

      expect(logs).toHaveLength(2);
      expect(logs[0].userId).toBe('user35');
      expect(logs[1].userId).toBe('user41');
    });
  });

  describe('TXT Format Parsing', () => {
    it('should parse simple text logs correctly', () => {
      const txtContent = `2025-06-15 23:48:09.144866 203.146.68.57 user35 http://example1.com/page2 ALLOW Malware 57ms`;

      const logs = parseLogFile(txtContent, 'txt', companyId);

      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual({
        timestamp: new Date('2025-06-15 23:48:09.144866'),
        sourceIp: '203.146.68.57',
        userId: 'user35',
        destinationUrl: 'http://example1.com/page2',
        action: 'ALLOW',
        category: 'Malware',
        responseTime: 57,
        companyId: 1,
      });
    });

    it('should parse text logs with multi-word categories', () => {
      const txtContent = `2025-06-15 21:42:09.144884 124.110.59.72 user41 http://example5.com/login ALLOW Social Media 493ms`;

      const logs = parseLogFile(txtContent, 'txt', companyId);

      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual({
        timestamp: new Date('2025-06-15 21:42:09.144884'),
        sourceIp: '124.110.59.72',
        userId: 'user41',
        destinationUrl: 'http://example5.com/login',
        action: 'ALLOW',
        category: 'Social Media',
        responseTime: 493,
        companyId: 1,
      });
    });

    it('should parse text logs with complex multi-word categories', () => {
      const txtContent = `2025-06-16 08:15:22.123456 192.168.1.100 user22 https://secure.example.com/api BLOCK Suspicious Activity Detection 1200ms`;

      const logs = parseLogFile(txtContent, 'txt', companyId);

      expect(logs).toHaveLength(1);
      expect(logs[0].category).toBe('Suspicious Activity Detection');
      expect(logs[0].action).toBe('BLOCK');
      expect(logs[0].responseTime).toBe(1200);
    });

    it('should handle text logs without response time', () => {
      const txtContent = `2025-06-16 08:15:22.123456 192.168.1.100 user22 https://secure.example.com/api BLOCK Malware`;

      const logs = parseLogFile(txtContent, 'txt', companyId);

      expect(logs).toHaveLength(1);
      expect(logs[0].category).toBe('Malware');
      expect(logs[0].responseTime).toBeNull();
    });

    it('should handle multiple text log entries', () => {
      const txtContent = `2025-06-15 23:48:09.144866 203.146.68.57 user35 http://example1.com/page2 ALLOW Malware 57ms
2025-06-15 21:42:09.144884 124.110.59.72 user41 http://example5.com/login ALLOW Social Media 493ms
2025-06-16 08:15:22.123456 192.168.1.100 user22 https://secure.example.com/api BLOCK Suspicious Activity 1200ms`;

      const logs = parseLogFile(txtContent, 'txt', companyId);

      expect(logs).toHaveLength(3);
      expect(logs[0].category).toBe('Malware');
      expect(logs[1].category).toBe('Social Media');
      expect(logs[2].category).toBe('Suspicious Activity');
    });

    it('should skip invalid text lines', () => {
      const txtContent = `2025-06-15 23:48:09.144866 203.146.68.57 user35 http://example1.com/page2 ALLOW Malware 57ms
invalid line with insufficient parts
2025-06-15 21:42:09.144884 124.110.59.72 user41 http://example5.com/login ALLOW Social Media 493ms`;

      const logs = parseLogFile(txtContent, 'txt', companyId);

      expect(logs).toHaveLength(2);
      expect(logs[0].userId).toBe('user35');
      expect(logs[1].userId).toBe('user41');
    });

    it('should handle empty lines in text format', () => {
      const txtContent = `2025-06-15 23:48:09.144866 203.146.68.57 user35 http://example1.com/page2 ALLOW Malware 57ms

2025-06-15 21:42:09.144884 124.110.59.72 user41 http://example5.com/login ALLOW Social Media 493ms`;

      const logs = parseLogFile(txtContent, 'txt', companyId);

      expect(logs).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const logs = parseLogFile('', 'csv', companyId);
      expect(logs).toHaveLength(0);
    });

    it('should handle unknown format', () => {
      const logs = parseLogFile('some content', 'unknown', companyId);
      expect(logs).toHaveLength(0);
    });

    it('should handle content with only whitespace', () => {
      const logs = parseLogFile('   \n  \n  ', 'txt', companyId);
      expect(logs).toHaveLength(0);
    });

    it('should apply correct companyId to all logs', () => {
      const txtContent = `2025-06-15 23:48:09.144866 203.146.68.57 user35 http://example1.com/page2 ALLOW Malware 57ms
2025-06-15 21:42:09.144884 124.110.59.72 user41 http://example5.com/login ALLOW Social Media 493ms`;

      const logs = parseLogFile(txtContent, 'txt', 99);

      expect(logs).toHaveLength(2);
      expect(logs[0].companyId).toBe(99);
      expect(logs[1].companyId).toBe(99);
    });
  });

  describe('Data Type Validation', () => {
    it('should convert response time to number', () => {
      const txtContent = `2025-06-15 23:48:09.144866 203.146.68.57 user35 http://example1.com/page2 ALLOW Malware 123ms`;

      const logs = parseLogFile(txtContent, 'txt', companyId);

      expect(logs[0].responseTime).toBe(123);
      expect(typeof logs[0].responseTime).toBe('number');
    });

    it('should convert timestamp to Date object', () => {
      const txtContent = `2025-06-15 23:48:09.144866 203.146.68.57 user35 http://example1.com/page2 ALLOW Malware 57ms`;

      const logs = parseLogFile(txtContent, 'txt', companyId);

      expect(logs[0].timestamp).toBeInstanceOf(Date);
      expect(logs[0].timestamp.getFullYear()).toBe(2025);
    });

    it('should handle invalid timestamps gracefully', () => {
      const csvContent = `timestamp,sourceIp,userId,destinationUrl,action,category,responseTime
invalid-timestamp,203.146.68.57,user35,http://example1.com/page2,ALLOW,Malware,57`;

      const logs = parseLogFile(csvContent, 'csv', companyId);

      // Invalid entries should be skipped due to schema validation
      expect(logs).toHaveLength(0);
    });
  });
});