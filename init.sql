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
  timestamp TIMESTAMP NOT NULL,
  source_ip VARCHAR NOT NULL,
  destination_url TEXT NOT NULL,
  action VARCHAR NOT NULL,
  risk_level VARCHAR NOT NULL,
  user_agent TEXT,
  bytes_transferred INTEGER,
  response_code INTEGER,
  category VARCHAR,
  company_id INTEGER REFERENCES companies(id),
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
INSERT INTO zscaler_logs (timestamp, source_ip, destination_url, action, risk_level, user_agent, bytes_transferred, response_code, category, company_id) VALUES
('2025-07-04 00:18:52', '192.168.1.100', 'https://www.google.com/search?q=cybersecurity+trends', 'ALLOWED', 'LOW', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 4096, 200, 'Search Engines', 1),
('2025-07-04 00:19:15', '192.168.1.101', 'https://www.facebook.com/login', 'BLOCKED', 'MEDIUM', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 512, 403, 'Social Media', 1),
('2025-07-04 00:19:45', '192.168.1.102', 'https://twitter.com/home', 'ALLOWED', 'LOW', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 2048, 200, 'Social Media', 1),
('2025-07-04 00:20:12', '192.168.1.103', 'https://malicious-site.com/exploit', 'BLOCKED', 'HIGH', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 256, 403, 'Malware', 1),
('2025-07-04 00:20:35', '192.168.1.104', 'https://github.com/login', 'ALLOWED', 'LOW', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 8192, 200, 'Development', 1)
ON CONFLICT DO NOTHING;

-- Print completion message
SELECT 'Database initialized successfully!' as message;