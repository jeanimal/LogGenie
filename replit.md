# LogGenie - Cybersecurity Log Analysis Platform

## Overview

LogGenie is a comprehensive web application designed to assist cybersecurity operations analysts in finding potential threats in companies' telemetry logs. The platform provides secure log management, analytics, and AI-powered anomaly detection capabilities with a professional cybersecurity-focused interface.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Styling**: Tailwind CSS with Shadcn/ui component library for consistent, professional UI
- **Routing**: Wouter for lightweight client-side routing
- **Data Management**: TanStack Query for efficient server state management and caching
- **Visualization**: Recharts for analytics charts and data visualization
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript for REST API endpoints
- **Authentication**: Replit Auth with session-based authentication
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Storage**: PostgreSQL-backed session storage using connect-pg-simple
- **File Upload**: Multer middleware for handling log file uploads (10MB limit)
- **Development**: Hot reload and development middleware integration

### Database Design
- **ORM**: Drizzle with PostgreSQL dialect for schema management
- **Session Management**: Dedicated sessions table for Replit Auth
- **Multi-tenant**: Companies table for organizational separation
- **Log Types**: Configurable log types with associated table mappings
- **Log Storage**: Specialized tables for different log formats (ZScaler logs)
- **Audit Trail**: Upload tracking with metadata and timestamps

## Key Components

### Authentication & Authorization
- **Provider**: Replit Auth with OpenID Connect
- **Session Management**: Server-side sessions stored in PostgreSQL
- **Default Access**: All users default to "dev" company environment
- **Route Protection**: All application routes require authentication

### Log Management
- **Upload System**: Multi-format file upload (CSV support)
- **Company Filtering**: Logs associated with specific companies
- **Log Type Classification**: Configurable log types (ZScaler Web Proxy, etc.)
- **Pagination**: Configurable page sizes (20, 50, 100 records)
- **Metadata Tracking**: Upload timestamps, file info, and user attribution

### Analytics & Visualization
- **Statistical Summaries**: Comprehensive log analytics with charts
- **Data Visualization**: Interactive charts using Recharts library
- **Performance Metrics**: Log volume, trends, and distribution analysis
- **Real-time Updates**: Live dashboard with current statistics

### Anomaly Detection
- **AI Integration**: OpenAI GPT-4o integration for intelligent threat analysis
- **Configurable Analysis**: Multiple sensitivity levels and time ranges
- **Threat Detection**: Cybersecurity-focused anomaly identification
- **Results Management**: Structured anomaly reporting and visualization
- **Prompt Management**: Modular system prompts stored in `/prompts` directory

## Data Flow

### Authentication Flow
1. User accesses application → Redirected to Replit Auth
2. Successful authentication → Session created in PostgreSQL
3. User data stored/updated in users table
4. Subsequent requests authenticated via session cookies

### Log Upload Flow
1. User selects company and log type → File uploaded via multipart form
2. File validation and processing → Log records parsed and stored
3. Upload metadata recorded → Success confirmation to user
4. Analytics updated → Dashboard refreshes with new data

### Data Retrieval Flow
1. Frontend requests data via TanStack Query → API endpoints with pagination
2. Database queries with filtering → Results cached on client
3. Real-time updates through query invalidation → UI automatically refreshes

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **wouter**: Lightweight routing
- **multer**: File upload handling

### Development Dependencies
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Backend bundling for production

### Authentication Dependencies
- **openid-client**: OpenID Connect client for Replit Auth
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

## Deployment Strategy

### Development Environment
- **Vite Dev Server**: Hot reload and HMR for frontend development
- **Express Middleware**: Integrated development server with API routes
- **Database**: Direct PostgreSQL connection with Drizzle migrations
- **Replit Integration**: Native Replit Auth and development tooling

### Production Environment
- **Build Process**: Vite frontend build + ESBuild backend bundling
- **Static Assets**: Compiled frontend served by Express
- **Database**: Production PostgreSQL with connection pooling
- **Session Management**: Persistent sessions with configurable TTL (1 week)
- **Container Support**: Docker configuration for external deployment

### Database Management
- **Schema Management**: Drizzle migrations in `/migrations` directory
- **Initial Data**: Seed data for companies, log types, and sample logs
- **Backup Strategy**: PostgreSQL-native backup and restore capabilities

## Recent Changes

- July 04, 2025: Complete LogGenie cybersecurity platform implemented
  - Full-stack application with React frontend and Express backend
  - Replit Auth integration with session management
  - PostgreSQL database with 110 sample ZScaler web proxy logs
  - Professional cybersecurity-focused UI with sidebar navigation
  - Complete CRUD operations for log management and analytics
  - AI-ready anomaly detection with LLM integration endpoints
  - Docker containerization for external deployment (VERIFIED WORKING)
  - Comprehensive README with Docker setup instructions
  - Fixed SelectItem errors and TypeScript issues in View Logs page
  - Resolved Docker Vite import errors with simplified tsx-based approach
  - Fixed file upload functionality by properly handling FormData in apiRequest function
  - Enhanced anomaly detection page with comprehensive AI analysis display
  - Added AI-powered log summarization with detailed insights and recommendations
  - All AI features now fully functional with OpenAI integration (VERIFIED WORKING)
  - Added "View Details" functionality to display actual log entries for each detected anomaly
  - Created modular prompt management system with dedicated prompts directory
  - Extracted LLM system prompts to external files for easier maintenance and modification
  - Enhanced anomaly detection to support multiple log IDs per anomaly for comprehensive threat analysis
  - Updated UI to display log count badges and handle grouped suspicious activities
  - Fixed "View Details" rendering to properly show expanded log information for multi-log anomalies
  - Implemented flexible multi-level sorting system allowing users to sort by multiple criteria in priority order
  - Added dynamic sort criteria management with add/remove functionality (up to 4 criteria)
  - Implemented comprehensive export report functionality with JSON format download
  - Removed schedule analysis button and enhanced clear all functionality
  - Added configurable AI parameters (temperature and max_tokens) to anomaly detection UI
  - Set default AI settings: temperature=0.2 (focused), max_tokens=2000 (standard)
  - Implemented interactive timeline filter on View Logs page replacing static date range inputs
  - Added dual-handle range slider allowing independent control of start and end times
  - Created timeline API endpoint providing earliest/latest timestamps and total log counts
  - Fixed View Logs page routing from `/view` to `/view-logs` for consistent navigation
  - Completed URL-based filtering with shareable links, bookmarkable filters, and browser navigation support
  - All filter changes (company, timeline, pagination, page size) now sync to URL parameters automatically
  - Removed unused test_logs.csv file - application uses programmatically generated sample data
  - Removed automatic generation of random sample logs when server starts
  - Updated log parsing to handle actual CSV data instead of generating random data
  - Application now starts with empty database requiring manual log uploads
  - Added comprehensive admin panel with database management functionality
  - Implemented log deletion by company or all companies with confirmation dialogs
  - Added admin navigation link to sidebar with Settings icon
  - Created secure admin API endpoints for bulk log deletion operations
  - Fixed admin panel layout structure with proper sidebar integration and authentication
  - Resolved DOM nesting warnings in confirmation dialogs for better HTML validation
  - Fixed analytics anomaly count to correctly show 0 since anomalies are detected on-demand, not stored persistently
  - Added documentation clarifying that log deletion automatically cleans anomaly detection since it's real-time
  - Removed Analysis Type dropdown and always do full analysis on detection page
  - Removed Sensitivity dropdown and always use medium/balanced sensitivity
  - Streamlined detection UI from 5 columns to 3 columns for cleaner interface
  - Removed unused summarizeLogs function and /api/logs/summarize endpoint to clean up codebase
  - Removed "Generate AI Summary" button and AI summary display section from Summarize page
  - Simplified Summarize page to focus on statistical analytics and top IPs table
  - Corrected ZScaler logs database schema to match actual CSV format
  - Updated schema fields: timestamp, sourceIp, userId, destinationUrl, action, category, responseTime
  - Removed old fields: riskLevel, userAgent, bytesTransferred, responseCode
  - Updated View Logs page table headers and display to show new fields
  - Fixed anomaly detection API to use new schema fields
  - Updated analytics queries to use action-based risk assessment instead of riskLevel

## Changelog

- July 04, 2025: Initial setup and complete implementation

## User Preferences

Preferred communication style: Simple, everyday language.