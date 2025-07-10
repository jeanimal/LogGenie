# LogGenie - Cybersecurity Log Analysis Platform

LogGenie is a web application designed to assist cybersecurity operations analysts in finding potential threats in companies' telemetry logs. The platform provides powerful tools for log upload, analysis, visualization, and AI-powered anomaly detection.

## Features

- **Authentication**: Secure login using Replit Auth ⚠️ *Requires Replit environment - cannot run standalone* ([see details](#authentication-considerations))
- **Log Management**: Upload and view security logs with pagination (supports CSV and TXT formats)
- **Analytics**: Statistical summaries and visualization charts
- **Anomaly Detection**: AI-powered threat detection with OpenAI integration
- **Multi-tenant**: Support for multiple companies and log types
- **Professional UI**: Clean, responsive cybersecurity-focused interface

## Technology Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Shadcn/ui component library
- Wouter for routing
- TanStack Query for data fetching
- Recharts for data visualization

### Backend
- Express.js with TypeScript
- Replit Auth for authentication
- PostgreSQL database with Drizzle ORM
- Session management with PostgreSQL storage
- OpenAI integration for anomaly detection
- Modular log parser system (extensible for multiple log types)
- RESTful API design

### DevOps
- Docker support for containerized deployment
- Development and production configurations
- Health checks and monitoring

## AI-Powered Anomaly Detection

LogGenie includes sophisticated AI-powered anomaly detection using OpenAI's GPT-4o model to identify potential cybersecurity threats in log data.

### How It Works

The anomaly detection system analyzes uploaded logs using advanced language models to identify:

- **Blocked requests** indicating potential attack attempts
- **Unusual destination URLs** or suspicious domains  
- **High-risk categories** like malware and phishing sites
- **Suspicious traffic patterns** and volume anomalies
- **Geographic and temporal anomalies** in access patterns
- **Protocol and encoding irregularities**

### Detection Results

Each analysis provides:
- **Anomaly classifications** with severity levels (low, medium, high, critical)
- **Threat categories** (malware, phishing, data exfiltration, brute force, etc.)
- **Specific indicators** explaining why each log entry is suspicious
- **Recommended actions** for security teams
- **Confidence scores** for each detected anomaly
- **Summary insights** with common patterns and overall recommendations

### Detection options in the UI

On the anomaly detection screen, users can control the data to be analyzed:
- **Time Range** - Filter logs by time period (24h, 7d, 30d, or all)
- **Company Filter** - Analyze logs from specific organizations

The user can also control the following options related to the AI model:
- **Temperature** (0.0-2.0) - Controls AI creativity vs. consistency (default: 0.2 for focused analysis)
- **Max Tokens** - Response length limit (default: 2000).  More tokens are correlated with better responses but are more costly for AI usage.

### Prompt Management System

Under the hood, the AI system uses a modular prompt architecture that allows non-technical users to modify AI behavior without touching application code.

The core prompts are stored in the `/prompts` directory:

- **`anomaly-detection-system.txt`** - Core system prompt defining the AI's role and analysis methodology
- **`anomaly-detection-user-template.txt`** - User prompt template with variable substitution for dynamic content

The user prompt template supports dynamic content injection:
- `{{logCount}}` - Number of logs being analyzed
- `{{timeRange}}` - Time period for the analysis
- `{{logData}}` - JSON-formatted log entries

### Example API Usage

```bash
# Detect anomalies in recent logs
curl -X POST http://localhost:3000/api/anomalies/detect \
  -H "Content-Type: application/json" \
  -d '{
    "timeRange": "24h",
    "companyId": 1,
    "temperature": 0.2,
    "maxTokens": 2000
  }'
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- Replit Auth configuration (for Replit deployment)

### Environment Variables

Create a `.env` file with the following variables:

```env
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your-session-secret-key
REPLIT_DOMAINS=your-replit-domain.com
ISSUER_URL=https://replit.com/oidc
REPL_ID=your-repl-id
OPENAI_API_KEY=your-openai-api-key

# Mock Authentication (for Docker development only)
MOCK_AUTH=false
```

## Local Development with Docker

> **⚠️ Authentication Limitation**: While LogGenie can be built and run with Docker, it currently uses Replit Auth for authentication. This means that Docker deployments outside of Replit will not be able to authenticate users, making the application non-functional for actual use. The application can be migrated to Google OAuth in the future to enable standalone Docker deployments.

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd loggenie
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Application: http://localhost:3000 (authentication will not work outside Replit)
   - Database: PostgreSQL on localhost:5432

### Docker Setup Options

#### Option 1: Docker Compose (Recommended)

The project includes a `docker-compose.yml` file with the following configuration:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:5000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/loggenie
      - SESSION_SECRET=your-secret-key-here
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=loggenie
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  postgres_data:
```

#### Option 2: Standalone Docker Container

1. **Build the Docker image**
   ```bash
   docker build -t loggenie .
   ```

2. **Run PostgreSQL database**
   ```bash
   docker run -d \
     --name loggenie-db \
     -e POSTGRES_DB=loggenie \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=password \
     -p 5432:5432 \
     postgres:15
   ```

3. **Run the application**
   ```bash
   docker run -d \
     --name loggenie-app \
     -p 3000:5000 \
     -e NODE_ENV=development \
     -e DATABASE_URL=postgresql://postgres:password@loggenie-db:5432/loggenie \
     -e SESSION_SECRET=your-secret-key \
     --link loggenie-db:db \
     loggenie
   ```

### Database Setup

#### For Docker Development
The Docker setup automatically initializes the database with tables and sample data using the `init.sql` script.

#### For Replit Development
```bash
# Install dependencies
npm install

# Push database schema
npm run db:push
```

The application will automatically create the necessary database tables. Docker containers include sample data for immediate testing.

### Running Tests

The application includes initial unit tests for log parsing functionality, with room for expansion to cover additional components.

#### Prerequisites for Testing
Tests use Vitest framework and are already configured with proper TypeScript support.

#### Run All Tests
```bash
# Run all tests once
npx vitest run

# Run tests in watch mode for development
npx vitest

# Run tests with coverage
npx vitest run --coverage
```

#### Run Specific Test Files
```bash
# Run only the ZScaler parser tests
npx vitest run server/tests/zscalerParser.test.ts --config vitest.config.ts

# Run tests matching a pattern
npx vitest run --run "*parser*"
```


### Development Mode

For local development without Docker:

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start PostgreSQL (using Docker)
docker run -d \
  --name postgres-dev \
  -e POSTGRES_DB=loggenie \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

### Authentication Considerations

#### Production Authentication
LogGenie uses **Replit Auth** for production authentication on the Replit platform:

- ✅ **Works perfectly** on Replit platform
- ✅ **Secure OAuth flow** with session management
- ✅ **Automatic user provisioning** and profile management

#### Docker Development Authentication
For Docker development, LogGenie includes **secure mock authentication**:

- ✅ **Mock authentication** bypasses Replit Auth when `MOCK_AUTH=true`
- ✅ **Development-only** - only works when `NODE_ENV=development`
- ✅ **Automatic user creation** - creates "Docker Developer" test user
- ✅ **Full functionality** - all features work identically to production

#### Security Design
The authentication system is designed with multiple safety layers:

- **Environment isolation** - Mock auth only activates in development mode
- **Double condition check** - Requires both `NODE_ENV=development` AND `MOCK_AUTH=true`
- **Production protection** - Replit production never sets `MOCK_AUTH=true`
- **Clear logging** - Authentication mode is logged on startup

#### Docker Usage
To enable mock authentication for Docker development:

```bash
# Set environment variables in docker-compose.yml
NODE_ENV=development
MOCK_AUTH=true

# Then access /api/login to automatically authenticate as test user
```

#### Docker Troubleshooting
If you see the login screen when using Docker:

1. **Check Environment Variables**: Ensure `MOCK_AUTH=true` is set in `docker-compose.yml`
2. **Verify Logs**: Check Docker logs with `docker compose logs app | grep AUTH`
   - Should show: `[AUTH DEBUG] NODE_ENV: development, MOCK_AUTH: true, USE_MOCK_AUTH: true`
   - Should show: `[MOCK AUTH] Using mock authentication for Docker development`
3. **Manual Authentication**: Click "Sign in with Authentication" button to trigger mock login
4. **Direct Login**: Visit `http://localhost:3000/api/login` directly in your browser
5. **Container Restart**: If needed, restart with `docker compose restart app`

**Expected Docker Behavior:**
- Login screen appears initially (normal)
- Clicking "Sign in with Authentication" redirects to dashboard
- No real credentials required
- Creates test user: "Docker Developer" (docker-dev@example.com)

**If Mock Auth is Not Working:**
- Check logs show `MOCK_AUTH: undefined` → Environment variable not set
- Ensure `docker-compose.yml` has `MOCK_AUTH=true` under `environment` section
- Restart Docker containers: `docker compose down && docker compose up -d`

**If File Upload Fails with "column user_id does not exist":**
- This indicates outdated database schema in Docker
- Apply database migration: `docker compose exec db psql -U postgres -d loggenie -f /docker-entrypoint-initdb.d/docker-migration.sql`
- Or recreate containers: `docker compose down -v && docker compose up -d`

**Common Issues Fixed:**
- ✅ Session cookies now work with HTTP (Docker development)
- ✅ Mock authentication user structure matches API endpoints
- ✅ File upload functionality works with both authentication methods
- ✅ Debug logging helps identify authentication flow issues
- ✅ Compatible with both development and production environments

#### Future Migration Option
The application can be migrated from Replit Auth to **Google OAuth** to enable:

- ✅ Standalone Docker deployments  
- ✅ External hosting capabilities
- ✅ Enterprise deployment options

### Production Deployment

#### Environment Configuration

For production deployment on Replit, ensure these environment variables are set:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=strong-random-secret-key
REPLIT_DOMAINS=your-domain.com
ISSUER_URL=https://replit.com/oidc
REPL_ID=your-repl-id
PORT=5000
```

#### Build and Deploy

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Health Checks

The application includes health check endpoints:

- **Application Health**: `GET /health`
- **Database Health**: `GET /api/health/db`

### Monitoring and Logs

#### Docker Logs
```bash
# View application logs
docker logs loggenie-app

# View database logs
docker logs loggenie-db

# Follow logs in real-time
docker logs -f loggenie-app
```

## API Documentation

### Authentication Endpoints

- `GET /api/auth/user` - Get current user information
- `GET /api/login` - Initiate login flow
- `GET /api/logout` - Logout and clear session

### Log Management Endpoints

- `GET /api/logs` - Get paginated logs with filtering
- `POST /api/upload` - Upload log files
- `GET /api/companies` - Get available companies
- `GET /api/log-types` - Get supported log types

### Analytics Endpoints

- `GET /api/analytics/stats` - Get log statistics
- `GET /api/analytics/top-ips` - Get top source IPs
- `POST /api/analytics/anomalies` - Detect anomalies in logs


## Database Schema

### Core Tables

- `users` - User authentication and profile data
- `companies` - Multi-tenant company organizations
- `log_types` - Configurable log type definitions
- `zscaler_logs` - ZScaler web proxy log entries
- `log_uploads` - Upload tracking and metadata
- `sessions` - Session storage for authentication

### Sample Data

The application starts with an empty database. Sample ZScaler logs are available in the `sample_logs/` directory for testing purposes.
These samples were generated by prompting ChatGPT to generate AScaler web proxy logs, telling it to produce either benign logs or logs with threats.  There is one
file of "labels" for the threats that ChatGPT generated.

Please contact the author if you have more realistic sample logs, especially with real threats.

## Security Considerations

- All routes require authentication except landing page
- Session-based authentication with secure cookies
- File upload validation and size limits (10MB)
- SQL injection protection via Drizzle ORM
- CORS configuration for production deployment

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Review the application logs
- Open an issue in the repository
