-- LogGenie Database Initialization Script
-- Creates tables and inserts initial data for Docker environment

-- Create sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create log_types table
CREATE TABLE IF NOT EXISTS log_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  table_name VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create zscaler_logs table
CREATE TABLE IF NOT EXISTS zscaler_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP,
  company_id INTEGER REFERENCES companies(id),
  log_type_id INTEGER REFERENCES log_types(id),
  source_ip VARCHAR,
  destination_ip VARCHAR,
  url VARCHAR,
  user_agent VARCHAR,
  action VARCHAR,
  risk_level VARCHAR,
  response_code INTEGER,
  bytes_sent BIGINT,
  bytes_received BIGINT,
  category VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create log_uploads table
CREATE TABLE IF NOT EXISTS log_uploads (
  id SERIAL PRIMARY KEY,
  filename VARCHAR NOT NULL,
  original_filename VARCHAR NOT NULL,
  company_id INTEGER REFERENCES companies(id),
  log_type_id INTEGER REFERENCES log_types(id),
  upload_date TIMESTAMP DEFAULT NOW(),
  file_size BIGINT,
  records_processed INTEGER DEFAULT 0,
  user_id VARCHAR REFERENCES users(id)
);

-- Insert initial data
INSERT INTO companies (name) VALUES ('dev') ON CONFLICT DO NOTHING;
INSERT INTO log_types (name, table_name) VALUES ('ZScaler Web Proxy Log', 'zscaler_logs') ON CONFLICT DO NOTHING;

-- Insert some sample log data for testing
INSERT INTO zscaler_logs (timestamp, company_id, log_type_id, source_ip, destination_ip, url, user_agent, action, risk_level, response_code, bytes_sent, bytes_received, category) VALUES
('2025-07-04 00:18:52', 1, 1, '192.168.1.100', '142.250.191.14', 'https://www.google.com/search?q=cybersecurity+trends', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'ALLOWED', 'LOW', 200, 1024, 4096, 'Search Engines'),
('2025-07-04 00:19:15', 1, 1, '192.168.1.101', '157.240.12.35', 'https://www.facebook.com/login', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'BLOCKED', 'MEDIUM', 403, 512, 0, 'Social Media'),
('2025-07-04 00:19:45', 1, 1, '192.168.1.102', '104.244.42.129', 'https://twitter.com/home', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'ALLOWED', 'LOW', 200, 768, 2048, 'Social Media'),
('2025-07-04 00:20:12', 1, 1, '192.168.1.103', '54.230.159.166', 'https://malicious-site.com/exploit', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'BLOCKED', 'HIGH', 403, 256, 0, 'Malware'),
('2025-07-04 00:20:35', 1, 1, '192.168.1.104', '72.21.91.29', 'https://github.com/login', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'ALLOWED', 'LOW', 200, 1536, 8192, 'Development')
ON CONFLICT DO NOTHING;

-- Print completion message
SELECT 'Database initialized successfully!' as message;