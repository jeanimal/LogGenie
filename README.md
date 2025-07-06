# LogGenie - Cybersecurity Log Analysis Platform

LogGenie is a comprehensive web application designed to assist cybersecurity operations analysts in finding potential threats in companies' telemetry logs. The platform provides powerful tools for log upload, analysis, visualization, and AI-powered anomaly detection.

## Features

- **Authentication**: Secure login using Replit Auth
- **Log Management**: Upload and view security logs with pagination
- **Analytics**: Statistical summaries and visualization charts
- **Anomaly Detection**: AI-powered threat detection (LLM integration ready)
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
- RESTful API design

### DevOps
- Docker support for containerized deployment
- Development and production configurations
- Health checks and monitoring

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
```

## Local Development with Docker

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
   - Application: http://localhost:3000
   - Database: PostgreSQL on localhost:5432

### Docker Setup Options

#### Option 1: Docker Compose (Recommended)

Create a `docker-compose.yml` file:

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

The application includes comprehensive unit tests for critical components, particularly the log parsing functionality.

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

#### Test Coverage
The current test suite includes:
- **ZScaler Parser Tests**: 18 test cases covering CSV and TXT format parsing
  - Valid log parsing for both formats
  - Edge cases (empty content, invalid formats, malformed data)
  - Multi-word category handling
  - Response time parsing and validation
  - Data type conversion and schema validation

#### Test Structure
```
server/tests/
├── zscalerParser.test.ts    # Parser unit tests
└── ...                     # Additional test files
```

#### Adding New Tests
When adding new functionality:
1. Create test files in `server/tests/` directory
2. Use `.test.ts` extension for test files
3. Import from relative paths using the configured aliases
4. Follow existing test patterns for consistency

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

### Production Deployment

#### Environment Configuration

For production deployment, ensure these environment variables are set:

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

### Troubleshooting

#### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :3000
   
   # Kill the process or use a different port
   docker run -p 3001:5000 loggenie
   ```

2. **Database Connection Issues**
   ```bash
   # Check database container status
   docker ps | grep postgres
   
   # Test database connection
   docker exec -it loggenie-db psql -U postgres -d loggenie
   ```

3. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER ./uploads
   chmod 755 ./uploads
   ```

## API Documentation

### Authentication Endpoints

- `GET /api/auth/user` - Get current user information
- `GET /api/login` - Initiate login flow
- `GET /api/logout` - Logout and clear session

### Log Management Endpoints

- `GET /api/logs` - Get paginated logs with filtering
- `POST /api/logs/upload` - Upload log files
- `GET /api/companies` - Get available companies
- `GET /api/log-types` - Get supported log types

### Analytics Endpoints

- `GET /api/analytics/stats` - Get log statistics
- `GET /api/analytics/top-ips` - Get top source IPs
- `POST /api/analytics/anomalies` - Detect anomalies in logs

### Sample API Requests

```bash
# Get logs with pagination
curl "http://localhost:3000/api/logs?page=1&limit=20&company=1"

# Upload a log file
curl -X POST \
  -F "file=@sample.csv" \
  -F "companyId=1" \
  -F "logTypeId=1" \
  http://localhost:3000/api/logs/upload

# Get analytics statistics
curl "http://localhost:3000/api/analytics/stats"
```

## Database Schema

### Core Tables

- `users` - User authentication and profile data
- `companies` - Multi-tenant company organizations
- `log_types` - Configurable log type definitions
- `zscaler_logs` - ZScaler web proxy log entries
- `log_uploads` - Upload tracking and metadata
- `sessions` - Session storage for authentication

### Sample Data

The application includes 110 sample ZScaler web proxy logs for testing and demonstration purposes.

## Security Considerations

- All routes require authentication except landing page
- Session-based authentication with secure cookies
- File upload validation and size limits (10MB)
- SQL injection protection via Drizzle ORM
- CORS configuration for production deployment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Docker Troubleshooting

### Error: "Cannot find package 'vite' imported from /app/dist/index.js"

This error means you're running an old Docker image. Follow these steps exactly:

```bash
# 1. Stop and remove ALL existing containers
docker stop loggenie-app loggenie-db 2>/dev/null || true
docker rm loggenie-app loggenie-db 2>/dev/null || true

# 2. Remove the old image completely
docker rmi loggenie 2>/dev/null || true

# 3. Clean up any dangling images
docker system prune -f

# 4. Rebuild the image with the new Dockerfile (use --no-cache!)
docker build -t loggenie . --no-cache

# 5. Start fresh containers
docker run -d \
  --name loggenie-db \
  -e POSTGRES_DB=loggenie \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15

# 6. Wait for database to be ready
sleep 10

# 7. Start the application
docker run -d \
  --name loggenie-app \
  -p 3000:5000 \
  -e NODE_ENV=development \
  -e DATABASE_URL=postgresql://postgres:password@loggenie-db:5432/loggenie \
  -e SESSION_SECRET=your-secret-key \
  --link loggenie-db:db \
  loggenie

# 8. Check if it's working
docker logs loggenie-app
```

**Alternative: Use Docker Compose**
```bash
docker-compose down --volumes
docker-compose build --no-cache
docker-compose up -d
```

## Support

For support and questions:
- Check the troubleshooting section above
- Review the application logs
- Open an issue in the repository
