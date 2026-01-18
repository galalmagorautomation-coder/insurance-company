# Insurance Dashboard - Gal Almagor Project

## 📋 Table of Contents
- [Project Overview](#-project-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [Data Flow](#-data-flow)
- [Company & Product Mappings](#-company--product-mappings)
- [Authentication](#-authentication)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

## 🎯 Project Overview

The Insurance Dashboard is a comprehensive management system designed for Gal Almagor insurance agency. It handles data from multiple insurance companies, processes Excel reports, aggregates agent performance data, and provides insights through an interactive dashboard.

### Key Capabilities:
- **Multi-company data processing** (11+ insurance companies)
- **Excel file parsing** for life insurance, elementary insurance, and commission data
- **Agent performance tracking** across multiple insurance products
- **Data aggregation** by product categories (Pension, Risk, Financial, Pension Transfer)
- **Target setting and tracking** for agents
- **Multi-language support** (Hebrew/English)
- **User authentication** with Supabase Auth

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19.1.1
- **Build Tool**: Vite 7.1.7
- **Styling**: TailwindCSS 4.1.16
- **Routing**: React Router DOM 7.9.4
- **Charts**: Recharts 3.3.0
- **Icons**: Lucide React 0.548.0
- **State Management**: React Context API
- **Authentication**: Supabase Auth (@supabase/supabase-js 2.86.0)
- **Excel Parsing**: xlsx 0.18.5

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5.1.0
- **Database**: Supabase (PostgreSQL)
- **File Upload**: Multer 2.0.2
- **Excel Processing**: xlsx 0.18.5
- **Environment**: dotenv 17.2.3
- **CORS**: cors 2.8.5
- **Dev Tools**: nodemon 3.1.10

### Database & Infrastructure
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: 
  - Frontend: Vercel (configured)
  - Backend: Render or similar Node.js hosting

## 📁 Project Structure

```
insurance-dashboard/
├── gal-almagor-backend/           # Backend API server
│   ├── src/
│   │   ├── index.js              # Main server entry point
│   │   ├── config/               # Configuration files
│   │   │   ├── supabase.js       # Supabase client setup
│   │   │   ├── companyMappings.js # Company-specific mappings
│   │   │   ├── productCategoryMappings.js # Product categorization
│   │   │   ├── elementaryMappings.js # Elementary insurance mappings
│   │   │   └── [company]Mapping.js # Individual company mappings
│   │   ├── routes/               # API route handlers
│   │   │   ├── uploadRoutes.js   # File upload endpoints
│   │   │   ├── agentRoutes.js    # Agent CRUD operations
│   │   │   ├── companyRoutes.js  # Company data endpoints
│   │   │   ├── aggregateRoutes.js # Aggregated data endpoints
│   │   │   ├── targetRoutes.js   # Target management
│   │   │   └── goalsRoutes.js    # Goals management
│   │   ├── services/             # Business logic
│   │   │   ├── aggregationService.js # Life insurance aggregation
│   │   │   └── elementaryAggregationService.js # Elementary aggregation
│   │   ├── utils/                # Utility functions
│   │   │   ├── excelParser.js    # Life insurance Excel parser
│   │   │   ├── elementaryExcelParser.js # Elementary Excel parser
│   │   │   └── directAgentsProcessor.js # Commission data processor
│   │   ├── controllers/          # Controller logic (if any)
│   │   └── middleware/           # Custom middleware (if any)
│   ├── package.json
│   └── .env.example
│
└── gal-almagor-frontend/          # Frontend React app
    ├── src/
    │   ├── App.jsx               # Main app component with routing
    │   ├── main.jsx              # React entry point
    │   ├── components/           # Reusable components
    │   │   ├── Header.jsx        # Navigation header
    │   │   └── ProtectedRoute.jsx # Auth route wrapper
    │   ├── pages/                # Page components
    │   │   ├── Login.jsx         # Login page
    │   │   ├── ResetPassword.jsx # Password reset
    │   │   ├── Upload.jsx        # File upload interface
    │   │   ├── Insights.jsx      # Analytics dashboard
    │   │   ├── Agents.jsx        # Agent management
    │   │   └── Targets.jsx       # Target setting
    │   ├── contexts/             # React Context providers
    │   │   ├── AuthContext.jsx   # Authentication state
    │   │   └── LanguageContext.jsx # i18n support
    │   ├── config/               # Configuration
    │   │   ├── api.js            # API endpoints & auth fetch
    │   │   └── supabase.js       # Supabase client
    │   ├── assets/               # Static assets
    │   └── public/
    │       └── images/           # Image assets
    ├── index.html
    ├── vite.config.js
    ├── vercel.json               # Vercel deployment config
    ├── package.json
    └── .env.example
```

## ✨ Features

### 1. File Upload System
- **Life Insurance Data**: Upload Excel files from 11 insurance companies
- **Elementary Insurance**: Process elementary insurance reports
- **Commission Data**: Handle direct agents commission reports
- **Duplicate Detection**: Warns before overwriting existing data
- **Batch Processing**: Handles large datasets (1000+ rows) efficiently

### 2. Agent Management
- Full CRUD operations for agent data
- Multi-company agent assignment
- Company-specific agent ID tracking (e.g., Ayalon ID, Harel ID, etc.)
- Search and filter capabilities
- Pagination for large datasets
- Active/Inactive status tracking
- Insurance type categorization

### 3. Analytics & Insights
- **Performance Metrics**: View aggregated data by product category
- **Time Range Filtering**: Month-to-month or custom date ranges
- **Company Comparison**: Compare performance across insurance companies
- **Visual Charts**: Pie charts and data visualizations using Recharts
- **Export Capabilities**: Download data as Excel files

### 4. Target Management
- Set monthly targets for agents
- Track performance against goals
- Target categories: Pension, Risk, Financial, Pension Transfer
- Historical target tracking

### 5. Multi-language Support
- Hebrew and English interfaces
- RTL (Right-to-Left) support for Hebrew
- Context-based language switching

### 6. Authentication & Security
- Supabase authentication
- Protected routes
- Session management
- Password reset functionality
- Role-based access (planned)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.x or higher ([Download](https://nodejs.org/))
- **npm** or **yarn**: Package manager
- **Git**: Version control
- **Supabase Account**: [Sign up](https://supabase.com/)
- **Code Editor**: VS Code recommended

##  Installation & Setup

### 1. Clone the Repository

```bash
cd /path/to/your/workspace
git clone <repository-url>
cd insurance-dashboard
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd gal-almagor-backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your Supabase credentials
# (See Environment Variables section below)
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd gal-almagor-frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your API URL
# (See Environment Variables section below)
```

### 4. Database Setup

You need to set up the following tables in Supabase:

#### Tables Required:
- `agent_data` - Stores agent information
- `company_data` - Stores insurance company information
- `raw_data` - Stores raw life insurance data from Excel files
- `raw_data_elementary` - Stores raw elementary insurance data
- `aggregated_data` - Stores aggregated life insurance metrics
- `aggregated_data_elementary` - Stores aggregated elementary metrics
- `targets` - Stores agent targets
- `goals` - Stores company/agent goals
- `direct_agents` - Stores commission data

> **Note**: Contact your database administrator for the complete schema or check the Supabase SQL editor for existing table structures.

## 🔐 Environment Variables

### Backend (.env)

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Optional: File Upload Limits
MAX_FILE_SIZE=10485760
```

**Where to find Supabase keys:**
1. Go to your Supabase project dashboard
2. Click on "Project Settings" (gear icon)
3. Navigate to "API" section
4. Copy `Project URL` → `SUPABASE_URL`
5. Copy `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`
6. Copy `anon public key` → `SUPABASE_ANON_KEY`

### Frontend (.env)

```env
# API URL
# Development
VITE_API_URL=http://localhost:3001

# Production (update when deployed)
# VITE_API_URL=https://your-backend-app.onrender.com
```

## 🗄 Database Schema

### Key Tables Overview

#### `agent_data`
Stores agent information with company-specific IDs.

**Key Columns:**
- `id` (UUID, primary key)
- `agent_name` (text)
- `agent_id` (text)
- `company_id` (integer array) - List of company IDs
- `ayalon_agent_id`, `harel_agent_id`, etc. - Company-specific IDs
- `insurance` (boolean) - Works with life insurance
- `elementary` (boolean) - Works with elementary insurance
- `is_active` (text) - Status: employee_gal_amagor, freelancer, etc.
- `department`, `inspector`, `category`
- `phone`, `email`

#### `company_data`
Stores insurance company information.

**Key Columns:**
- `id` (integer, primary key)
- `company_name` (text)
- `insurance_type` (text) - life, elementary, commission

**Company IDs:**
1. Ayalon
2. Altshuler
3. Analyst
4. Hachshara
5. Phoenix
6. Harel
7. Clal
8. Migdal
9. Mediho
10. Mor
11. Menorah

#### `raw_data` (Life Insurance)
Raw data uploaded from Excel files.

**Key Columns:**
- `id` (UUID)
- `company_id` (integer)
- `month` (text) - Format: YYYY-MM
- `agent_number` (text)
- `agent_name` (text)
- `policy_number` (text)
- `product` (text)
- `output` (numeric) - Premium amount

#### `aggregated_data` (Life Insurance)
Aggregated metrics by agent, company, and month.

**Key Columns:**
- `agent_id` (UUID)
- `company_id` (integer)
- `month` (text)
- `pension` (numeric)
- `risk` (numeric)
- `financial` (numeric)
- `pension_transfer` (numeric)
- `total` (numeric)

#### `raw_data_elementary`
Raw elementary insurance data.

**Key Columns:**
- Similar to `raw_data` but for elementary insurance
- `current_gross_premium` (numeric)
- `previous_gross_premium` (numeric)
- `changes` (numeric)

#### `targets`
Monthly targets for agents.

**Key Columns:**
- `agent_id` (UUID)
- `month` (text)
- `pension_target`, `risk_target`, `financial_target`, `pension_transfer_target`

## 📡 API Documentation

### Base URL
- **Development**: `http://localhost:3001/api`
- **Production**: Your deployed backend URL

### Endpoints

#### Upload Routes (`/api/upload`)

**POST** `/api/upload/life-insurance`
- Upload life insurance Excel files
- **Body**: multipart/form-data
  - `file` (required) - Excel file
  - `companyId` (required) - Company ID (1-11)
  - `month` (required) - Format: YYYY-MM
- **Response**: Upload status and aggregation results

**POST** `/api/upload/elementary`
- Upload elementary insurance Excel files
- Similar structure to life insurance

**POST** `/api/upload/direct-agents`
- Upload commission data
- **Body**: multipart/form-data
  - `file` (required)
  - `month` (required)

**GET** `/api/upload/check-existing`
- Check if data exists for company/month
- **Query**: `?companyId=1&month=2024-01`

**DELETE** `/api/upload/life-insurance`
- Delete uploaded life insurance data
- **Body**: `{ companyId, month }`

#### Agent Routes (`/api/agents`)

**GET** `/api/agents`
- Get all agents
- **Query**: `?company_id=1` (optional filter)

**GET** `/api/agents/:id`
- Get single agent by ID

**POST** `/api/agents`
- Create new agent
- **Body**: Agent object with all required fields

**PUT** `/api/agents/:id`
- Update agent
- **Body**: Updated agent fields

**DELETE** `/api/agents/:id`
- Delete agent

#### Company Routes (`/api/companies`)

**GET** `/api/companies`
- Get all companies
- **Query**: `?type=life` (optional: life, elementary, commission)

#### Aggregate Routes (`/api/aggregate`)

**GET** `/api/aggregate/life-insurance`
- Get aggregated life insurance data
- **Query**: 
  - `companyId` (optional)
  - `startMonth` (YYYY-MM)
  - `endMonth` (YYYY-MM)

**GET** `/api/aggregate/elementary`
- Get aggregated elementary data
- Similar query structure

**POST** `/api/aggregate/regenerate`
- Manually trigger aggregation
- **Body**: `{ companyId, month }`

#### Target Routes (`/api/targets`)

**GET** `/api/targets`
- Get all targets
- **Query**: `?agentId=xxx&month=2024-01`

**POST** `/api/targets`
- Create/update target
- **Body**: Target object

**DELETE** `/api/targets/:id`
- Delete target

#### Goals Routes (`/api/goals`)

**GET** `/api/goals`
- Get goals

**POST** `/api/goals`
- Create/update goals

## 🔄 Data Flow

### 1. Upload Process

```
User uploads Excel file
        ↓
Frontend sends multipart/form-data
        ↓
Backend receives file (Multer)
        ↓
Excel parsed (XLSX library)
        ↓
Data mapped based on company config
        ↓
Batch insert to raw_data table (1000 rows/batch)
        ↓
Aggregation service triggered
        ↓
Aggregated data inserted to aggregated_data
        ↓
Response sent to frontend
```

### 2. Aggregation Process

```
Get company configuration
        ↓
Fetch agents for company
        ↓
Get all agent numbers/IDs
        ↓
Fetch raw data for these agents
        ↓
Group by product categories:
  - Pension (קרן פנסיה, קופת גמל)
  - Risk (סיכון)
  - Financial (פיננסי)
  - Pension Transfer (העברת פנסיה)
        ↓
Calculate totals per agent
        ↓
Handle special cases (subtract agents, etc.)
        ↓
Insert/update aggregated_data
```

### 3. Data Retrieval

```
User selects filters (company, date range)
        ↓
Frontend calls aggregate endpoint
        ↓
Backend queries aggregated_data
        ↓
Joins with agent_data for names
        ↓
Returns formatted results
        ↓
Frontend displays in charts/tables
```

## 🏢 Company & Product Mappings

### Product Categories

The system categorizes insurance products into 4 main categories:

1. **PENSION (קרן פנסיה)**: Pension funds, retirement savings
2. **RISK (סיכון)**: Life insurance, disability, critical illness
3. **FINANCIAL (פיננסי)**: Investment products, savings plans
4. **PENSION_TRANSFER (העברת פנסיה)**: Pension transfer products

### Company-Specific Mappings

Each company has a custom mapping configuration in `config/companyMappings.js`. These define:
- Excel column positions
- Product name to category mappings
- Special handling rules
- Header row locations
- Subtract agents (e.g., Menorah)

**Example Companies:**
- **Ayalon**: Columns defined in `ayalonMapping.js`
- **Harel**: Multiple product lines with specific mappings
- **Menorah**: Includes subtract agents feature
- **Altshuler**: Special two-column output format

### Elementary Insurance Mappings

Elementary insurance (car, home, health) has separate mappings defined in `elementaryMappings.js` and company-specific files.

## 🔒 Authentication

### Supabase Auth Flow

1. **Sign Up**: Users create account via email/password
2. **Sign In**: Users authenticate with credentials
3. **Session Management**: JWT tokens stored in localStorage
4. **Protected Routes**: Frontend checks authentication before rendering
5. **Password Reset**: Email-based password recovery

### Frontend Auth Implementation

```jsx
// AuthContext provides:
- user: Current user object
- session: Current session
- signIn(email, password)
- signUp(email, password)
- signOut()
- resetPassword(email)
- updatePassword(newPassword)
```

### Backend Auth (Future Enhancement)

Currently, the backend doesn't verify JWT tokens. To add:

1. Install `@supabase/supabase-js` on backend
2. Create auth middleware
3. Verify JWT on protected routes
4. Extract user from token

##  Deployment

### Frontend (Vercel)

1. **Push to Git**: Ensure code is on GitHub/GitLab
2. **Connect Vercel**: Import project in Vercel dashboard
3. **Configure Build**:
   - Root directory: `gal-almagor-frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Environment Variables**: Add `VITE_API_URL` with production backend URL
5. **Deploy**: Vercel auto-deploys on git push

### Backend (Render/Railway/Heroku)

#### Render Deployment:

1. Create new Web Service
2. Connect repository
3. Configure:
   - **Root Directory**: `gal-almagor-backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Node Version**: 18
4. Add environment variables from `.env`
5. Deploy

#### Important Production Settings:

- Set `NODE_ENV=production`
- Update `ALLOWED_ORIGINS` with frontend URL
- Ensure Supabase credentials are correct
- Enable health checks on `/` endpoint

## 🐛 Troubleshooting

### Common Issues

#### 1. CORS Errors
**Problem**: Frontend can't connect to backend
**Solution**: 
- Ensure backend `ALLOWED_ORIGINS` includes frontend URL
- Check that backend is running
- Verify API_URL in frontend .env

#### 2. Supabase Connection Failed
**Problem**: "Missing Supabase credentials"
**Solution**:
- Verify `.env` file exists in backend
- Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct
- Restart backend server

#### 3. File Upload Timeout
**Problem**: Large Excel files fail to upload
**Solution**:
- Files are processed in batches (1000 rows)
- Check backend logs for specific errors
- Verify Excel file format matches company mapping
- Increase timeout in production hosting settings

#### 4. Aggregation Returns No Data
**Problem**: Uploaded data doesn't show in insights
**Solution**:
- Check that agent has correct company agent ID in agent_data
- Verify month format is YYYY-MM
- Ensure aggregation service completed (check backend logs)
- Manually trigger re-aggregation if needed

#### 5. Authentication Issues
**Problem**: Can't log in or session expires
**Solution**:
- Clear browser localStorage
- Check Supabase authentication settings
- Verify email is confirmed in Supabase dashboard
- Reset password if needed

### Development Tips

1. **Backend Logs**: Use `npm run dev` for auto-reload with nodemon
2. **Frontend Dev**: `npm run dev` starts Vite dev server with HMR
3. **Database Inspection**: Use Supabase Table Editor to verify data
4. **API Testing**: Use Postman or Thunder Client to test endpoints
5. **Debug Aggregation**: Check console logs for detailed aggregation process

### Environment-Specific Issues

#### Development:
- Ensure both servers are running (frontend:5173, backend:3001)
- Check that VITE_API_URL points to `http://localhost:3001`

#### Production:
- Verify environment variables are set in hosting platform
- Check SSL/HTTPS configuration
- Ensure CORS allows production frontend URL
- Monitor server logs for errors

## 📞 Support & Contribution

### Getting Help
- Review this documentation thoroughly
- Check backend console logs for errors
- Inspect network tab in browser DevTools
- Review Supabase logs for database issues

### Development Workflow
1. Create feature branch from `main`
2. Make changes and test locally
3. Commit with clear messages
4. Push and create pull request
5. Deploy after review

### Best Practices
- Keep dependencies updated
- Follow existing code patterns
- Comment complex logic
- Test file uploads with all company formats
- Verify aggregation calculations
- Maintain backward compatibility with existing data

---

##  Additional Notes

### Company ID Reference
Always use these IDs when referencing companies:
- 1: Ayalon
- 2: Altshuler  
- 3: Analyst
- 4: Hachshara
- 5: Phoenix
- 6: Harel
- 7: Clal
- 8: Migdal
- 9: Mediho
- 10: Mor
- 11: Menorah

### Date Format
- Always use `YYYY-MM` format for months (e.g., "2024-01")
- Frontend date inputs automatically format to this

### Excel File Requirements
- Files must match company-specific formats
- Header rows should not be modified
- Agent numbers must match exactly with agent_data records
- Products should use Hebrew names as mapped in config files

---

**Version**: 1.0.0  
**Last Updated**: January 2026  

