-- Manual database fix for Docker
-- Run this directly in the Docker PostgreSQL container

-- First, check current schema
\d zscaler_logs

-- Drop the table completely and recreate with correct schema
DROP TABLE IF EXISTS zscaler_logs CASCADE;

CREATE TABLE zscaler_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  source_ip VARCHAR NOT NULL,
  user_id TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  action VARCHAR NOT NULL,
  category VARCHAR,
  response_time INTEGER,
  company_id INTEGER REFERENCES companies(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample data
INSERT INTO zscaler_logs (timestamp, source_ip, user_id, destination_url, action, category, response_time, company_id) VALUES
('2025-07-04 00:18:52', '192.168.1.100', 'user001', 'https://www.google.com/search?q=cybersecurity+trends', 'ALLOW', 'Search Engines', 120, 1),
('2025-07-04 00:19:15', '192.168.1.101', 'user002', 'https://www.facebook.com/login', 'BLOCK', 'Social Media', 85, 1),
('2025-07-04 00:19:45', '192.168.1.102', 'user003', 'https://twitter.com/home', 'ALLOW', 'Social Media', 200, 1),
('2025-07-04 00:20:12', '192.168.1.103', 'user004', 'https://malicious-site.com/exploit', 'BLOCK', 'Malware', 50, 1),
('2025-07-04 00:20:35', '192.168.1.104', 'user005', 'https://github.com/login', 'ALLOW', 'Development', 180, 1);

-- Verify the fix
\d zscaler_logs
SELECT COUNT(*) FROM zscaler_logs;

-- Show success message
SELECT 'Database schema fixed successfully!' as message;