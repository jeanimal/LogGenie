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
