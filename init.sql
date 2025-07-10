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
  name VARCHAR NOT NULL UNIQUE,
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
  user_id TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  action VARCHAR NOT NULL,
  category VARCHAR,
  response_time INTEGER,
  company_id INTEGER REFERENCES companies(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create log_uploads table
CREATE TABLE IF NOT EXISTS log_uploads (
  id SERIAL PRIMARY KEY,
  file_name VARCHAR NOT NULL,
  file_size INTEGER NOT NULL,
  log_type_id INTEGER REFERENCES log_types(id),
  company_id INTEGER REFERENCES companies(id),
  format VARCHAR NOT NULL,
  record_count INTEGER NOT NULL,
  uploaded_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial data
INSERT INTO companies (name) VALUES ('dev') ON CONFLICT DO NOTHING;
INSERT INTO log_types (name, table_name) VALUES ('ZScaler Web Proxy Log', 'zscaler_logs') ON CONFLICT DO NOTHING;

-- Insert some sample log data for testing
INSERT INTO zscaler_logs (timestamp, source_ip, user_id, destination_url, action, category, response_time, company_id) VALUES
('2025-07-04 00:18:52', '192.168.1.100', 'user1', 'https://www.google.com/search?q=cybersecurity+trends', 'ALLOW', 'Search Engines', 150, 1),
('2025-07-04 00:19:15', '192.168.1.101', 'user2', 'https://www.facebook.com/login', 'BLOCK', 'Social Media', 80, 1),
('2025-07-04 00:19:45', '192.168.1.102', 'user3', 'https://twitter.com/home', 'ALLOW', 'Social Media', 200, 1),
('2025-07-04 00:20:12', '192.168.1.103', 'user4', 'https://malicious-site.com/exploit', 'BLOCK', 'Malware', 50, 1),
('2025-07-04 00:20:35', '192.168.1.104', 'user5', 'https://github.com/login', 'ALLOW', 'Development', 300, 1),
('2025-07-04 00:21:10', '192.168.1.105', 'user6', 'https://phishing-site.evil.com/login', 'BLOCK', 'Phishing', 45, 1),
('2025-07-04 00:21:30', '192.168.1.106', 'user7', 'https://stackoverflow.com/questions', 'ALLOW', 'Development', 180, 1),
('2025-07-04 00:22:15', '192.168.1.107', 'user8', 'https://suspicious-download.com/payload.exe', 'BLOCK', 'Malware', 25, 1)
ON CONFLICT DO NOTHING;

-- Print completion message
SELECT 'Database initialized successfully!' as message;