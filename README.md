# ⚡ AssetFlow 

AssetFlow is a modern, enterprise-grade Asset & Resource Management System. It enables organizations to effortlessly manage physical assets, coordinate shared resources, schedule maintenance, perform audits, and track employee allocations from a single, centralized platform.

## ✨ Features

- **🔐 Secure Authentication**: Role-based access control (Admin, Asset Manager, Employee).
- **🏢 Organization Management**: Track departments, employees, and custom asset categories.
- **📦 Asset Registry & Lifecycle**: End-to-end tracking of assets from procurement to retirement.
- **👤 Allocation Workflow**: Assign assets to employees or departments and track custody history.
- **📅 Resource Booking**: Shared resource scheduling with built-in conflict detection.
- **🛠️ Maintenance Hub**: Log issues, assign technicians, and track resolution workflows.
- **📋 Auditing System**: Conduct asset audit cycles and automatically generate discrepancy reports.
- **📊 Real-time Dashboard**: Insights, analytics, and key performance indicators at a glance.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 & Vite
- **Styling**: Tailwind CSS v4 (with OKLCH design tokens)
- **Components**: Radix UI, Lucide React
- **Animations**: GSAP (GreenSock)
- **State Management**: TanStack Query (React Query)
- **Forms & Validation**: React Hook Form, Zod

### Backend
- **Runtime**: Node.js & Express.js (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Security**: JWT authentication, bcrypt password hashing
- **Validation**: Zod (End-to-End Type Safety)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ramnivas11/AssetFlow.git
   cd AssetFlow
   ```

2. **Backend Setup:**
   ```bash
   cd assetflow-backend
   npm install
   
   # Copy the example env file and update with your PostgreSQL connection string
   cp .env.example .env
   
   # Run Prisma migrations
   npx prisma migrate dev
   
   # (Optional) Seed the database with admin user and sample data
   npm run seed
   
   # Start the development server
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   # In a new terminal window
   cd assetflow-frontend
   npm install
   
   # Start the Vite development server
   npm run dev
   ```

## 📄 License
This project is developed for learning, portfolio, and hackathon purposes.
