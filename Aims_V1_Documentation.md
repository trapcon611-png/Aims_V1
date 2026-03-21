AIMS Institute AMS - Technical Documentation (v1.3)

1. Executive Summary

AIMS Institute ERP is a full-stack, enterprise-grade academic management system designed to streamline operations for coaching institutes. It acts as a central nervous system connecting Directors, Faculty, Students, and Parents.

The system has evolved into a highly modular Micro-Component Architecture on the frontend to ensure scalability and maintainability, while the backend utilizes a structured NestJS architecture with strict Role-Based Access Control (RBAC).

Key Differentiators:

AI-Powered Exam Generation: Generates balanced question papers instantly via external AI integration.

Resilient Exam Engine: Offline support, strict 3-strike anti-cheat mechanisms, hyper-accurate time-tracking, and native LaTeX rendering.

Web Push Notifications: System-level alerts for Students/Parents (Service Worker + VAPID).

Financial Intelligence & Payments: Daily collection tracking, automated installment math, GST-compliant invoicing, and a bulletproof Razorpay integration with Webhook fallbacks.

2. System Architecture

2.1 Tech Stack

Frontend: Next.js 14 (App Router), Tailwind CSS v4 (Design System with bg-linear-to-br), Lucide React (Icons), Recharts (Analytics).

Backend: NestJS (Node.js framework), Passport.js (Auth), Web-Push (Notifications).

Database: PostgreSQL 16 managed via Prisma ORM.

Infrastructure: Dockerized containers orchestrated via Docker Compose (Frontend, Backend, Database).

AI Service: Hosted Inference API (Python/FastAPI) for semantic search and paper generation.

Payment Gateway: Razorpay (Client-side checkout + Backend HMAC SHA256 Webhook Verification).

2.2 Security Architecture

Authentication: JWT (JSON Web Tokens) with stateless validation.

Authorization: Custom @Roles() decorator guarding endpoints.

Payment Security: * Cryptographic HMAC SHA256 signature verification on all Razorpay callbacks and webhooks.

Idempotent database writing (prevents double-charging if frontend and webhook both fire).

Data Integrity: Transaction-safe operations (prisma.$transaction) for admissions, bulk question imports, and exam submissions.

Input Sanitization: Recursive sanitization middleware to prevent Postgres 0x00 (Null Byte) injection attacks from AI data.

3. Project Structure (Detailed Micro-Service Layout)

The project follows a Domain-Driven Design, splitting responsibilities clearly across portals.

3.1 Frontend (aims_institute_app/)

The frontend is split into four distinct portals, each with its own local service layer and component library.

app/
├── admin/                  # [Portal] Academic Admin (Teachers & Staff)
│   ├── components/         # Micro-components
│   │   ├── AttendancePanel.tsx
│   │   ├── DashboardStats.tsx
│   │   ├── ExamManager.tsx
│   │   ├── LatexRenderer.tsx
│   │   ├── QuestionChecker.tsx
│   │   └── ResultsAnalytics.tsx
│   ├── services/           # adminApi.ts (Direct backend calls)
│   └── page.tsx            # Main Controller
│
├── director/               # [Portal] Director Console (Management)
│   ├── components/         # Micro-components
│   │   ├── AccountsPanel.tsx
│   │   ├── AdmissionsPanel.tsx
│   │   ├── BatchesPanel.tsx
│   │   ├── ContentPanel.tsx
│   │   ├── DirectorBackground.tsx
│   │   ├── InvoiceModal.tsx
│   │   └── StudentDirectoryPanel.tsx
│   ├── services/           # directorApi.ts
│   └── page.tsx            # Dashboard Orchestrator
│
├── student/                # [Portal] Student Learning Hub
│   ├── components/         # Micro-components
│   │   ├── DashboardHome.tsx
│   │   ├── ExamHeader.tsx
│   │   ├── ExamListPanel.tsx
│   │   ├── QuestionPalette.tsx
│   │   ├── QuestionView.tsx
│   │   ├── ResourcesPanel.tsx
│   │   ├── ResultsPanel.tsx
│   │   └── StudentLogin.tsx
│   ├── exam/[examId]/      # Secure Exam Room
│   │   ├── import-questions/route.ts # Next.js API Route for Bulk AI JSON Injection
│   │   └── page.tsx        # Active Exam Engine (No Layout, Fullscreen)
│   ├── services/           # studentApi.ts
│   └── page.tsx            # Student Dashboard Main View
│
├── parent/                 # [Portal] Parent Monitoring
│   ├── components/         # Micro-components
│   │   ├── InvoiceModal.tsx
│   │   ├── NotificationsPanel.tsx
│   │   ├── ParentLogin.tsx
│   │   └── StudentCard.tsx # Financial Hub & Razorpay Checkout logic
│   ├── services/           # parentApi.ts
│   └── page.tsx            # Main View
│
├── components/             # Global Shared Components
│   └── HyperSpeed/         # Custom WebGL/Three.js landing page animations
│
├── public/
│   └── sw.js               # Service Worker for Push Notifications
└── lib/
    └── prisma.ts           # Global Prisma Client (for internal Next.js API routes)


3.2 Backend (aims_backend/)

The backend is modularized to prevent logic coupling. Every module has its own Controller, Service, and DTOs.

src/
├── auth/                   # Login & JWT Strategy (jwt.strategy.ts, roles.guard.ts)
├── erp/                    # Core Admin/Director Logic (Global Ledger, Enquiry Management)
├── batches/                # Batch CRUD and Configuration
├── finance/                # Fee Collection & Expense Tracking
├── payment/                # Razorpay Order Creation & Webhook Catcher
│   ├── payment.controller.ts
│   └── payment.service.ts
├── student/                # Student-Specific Logic (Exam Taking, Dashboard data)
├── parent/                 # Parent-Specific Logic (Child Tracking, Result Aggregation)
├── exams/                  # Exam Scheduling & Marking Logic
├── notices/                # Web-Push Notification dispatch logic
├── resources/              # Study Material Uploads & Management
├── users/                  # User CRUD (Students, Parents, Admins, Directors)
├── prisma/                 # Database Schema, Migrations, and Seed Scripts
└── app.module.ts           # Root Module


4. Module Capabilities

4.1 Director Console

Dashboard: Live SVG Trend Charts (7-day view) for Enquiries, Admissions, and Fee Collection.

Admissions Engine: Creates Student, Parent, and Profile records in a single transaction.

Installment Calculator: Auto-generates due dates and partial payment math based on the selected fee plan.

Fee Management: Generates GST receipts, tracks pending dues, and records modes of payment.

Content & Notifications:

Targeting: Send notices to "Batch", "Individual Student", or "Specific Parent".

Push: Triggers system-level notifications via VAPID keys.

4.2 Student Portal

Exam Room:

Anti-Cheat (Strict): Detects tab switching/blur events via visibilitychange. Issues 2 warnings; the 3rd strike forcefully auto-submits the exam payload to the server.

Offline Mode: Local timer logic handles network drops gracefully. Caches answers to localStorage.

Time Tracking: Hyper-accurate time-spent tracking per question. Captures the exact seconds spent on the final question right before submission lock.

Renderer: Full LaTeX support for Math/Physics equations and native Markdown image support for biology diagrams.

Analytics: Subject-wise breakdown, time-spent analysis per question, and comparison against top rankers.

4.3 Academic Admin

Question Repository: Fetches questions based on Topic/Difficulty via AI Generator.

Approval Workflow: Teachers review AI output before saving to the internal bank. Respects dynamic negative marking payloads.

Exam Scheduler: Set start times, duration, and publishing status. Dashboard mathematically guards exams to keep them 'Live' until the duration fully expires (even if a student is late).

4.4 Parent Portal

Financial Transparency: View full fee history, download receipts, check upcoming installments.

Payment Gateway Integration: * Native Razorpay checkout popup.

Frontend payment.failed event catchers to gracefully unfreeze the UI and alert the parent if a bank drops the transaction.

Performance: Real-time access to child's exam results and attendance.

5. Database Schema (Key Features)

5.1 Push Notifications

To support "Closed Browser" notifications.

model PushSubscription {
  id        String   @id @default(uuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
}


5.2 Exam & Questions

Supports rich text, LaTeX, images, and complex stringified options.

model Question {
  id            String  @id @default(uuid())
  questionText  String  // Supports LaTeX
  options       Json    // Stores {a: "...", b: "..."}
  correctOption String
  questionImage String?
  negative      Float   @default(-1) // Supports dynamic negative marking (-2 for JEE Adv)
  // ...
}


5.3 Notification Targeting

model Notice {
  // ...
  studentId String? // Nullable: For specific targeting
  parentId  String? // Nullable: For specific targeting
  batchId   String? // Nullable: For batch broadcast
}


6. API Endpoints Reference

6.1 Student Module (/student)

Method

Endpoint

Description

POST

/student/exam/:id/attempt

Starts an exam session. Returns Qs without answers.

POST

/student/exam/:id/submit

Accepts answers, calculates score, closes session.

GET

/student/results

Returns detailed attempt history with analytics.

POST

/student/subscribe

Registers browser Service Worker for Push.

6.2 Parent Module (/parent)

Method

Endpoint

Description

GET

/parent/my-summary

Returns linked children and their financial status.

GET

/parent/student-attempts

Returns exam results for a specific child.

6.3 Payment Module (/payment)

Method

Endpoint

Description

POST

/payment/create-order

Securely creates a Razorpay Order ID attached to a student. (JWT Guarded)

POST

/payment/verify

Frontend callback to verify HMAC signature and record fee in DB. (JWT Guarded)

POST

/payment/webhook

Public Razorpay Webhook catcher. Validates HMAC signature, checks idempotency, and acts as a secure backup to save FeeRecords if the frontend drops.

6.4 ERP Core (/erp)

Method

Endpoint

Description

POST

/erp/exams/:id/import

Bulk imports questions from AI/JSON to DB (Transaction).

GET

/erp/fees

Returns global fee ledger for Director.

PATCH

/erp/batches/:id

Updates batch details (Fee structures).

7. Deployment & Configuration

7.1 Environment Variables (.env)

Frontend (aims_institute_app/.env):

NEXT_PUBLIC_API_URL="http://your-server-ip:3001"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_live_your_key_here"


Backend (aims_backend/.env):

DATABASE_URL="postgresql://user:pass@localhost:5432/aims_db"
PORT=3001

# Push Notifications (VAPID Keys)
VAPID_SUBJECT="mailto:your-email@domain.com"
VAPID_PUBLIC_KEY="<Generated Key>"
VAPID_PRIVATE_KEY="<Generated Key>"

# Payment Gateway
RAZORPAY_KEY_ID="rzp_live_your_key_here"
RAZORPAY_KEY_SECRET="your_live_secret_key"
RAZORPAY_WEBHOOK_SECRET="your_secure_webhook_password"


8. Server Management Cheat Sheet

1. 🔄 Standard Docker Commands (Rebuilding & Logs)
Use these when you change .env files, update React/NestJS code, or restart the server.

Stop all containers safely:
docker-compose down

Start and Rebuild everything (Crucial after .env changes):
docker-compose up -d --build

Rebuild only one specific container (Faster for frontend UI changes):
docker-compose up -d --build aims_frontend

Watch real-time live logs (Press Ctrl+C to exit):
docker logs -f aims_backend OR docker logs -f aims_frontend

2. 🗄️ Database & Prisma Commands
Use these when managing your schema or running seed scripts.

Push Prisma Schema to the database:
docker exec -it aims_backend npx prisma db push

Run the Database Seed / Backup Restore script:
docker exec -it aims_backend npx ts-node prisma/seed.ts

The "Nuclear Reset" (Wipe the database completely - DANGER):
docker-compose down -v

3. 📦 Backup Management Commands

Check if backup files exist on the physical VPS:
ls -la ~/Aims_V1/backups

Take a Manual Database Backup instantly (Compresses to .sql.gz):
docker exec -t aims_postgres pg_dump -U aims_manual aims_manual | gzip > ~/Aims_V1/backups/manual_backup_$(date +%Y-%m-%d_%H-%M).sql.gz

4. 🌐 File Transfer Command (Local Computer -> VPS)
Run this on your local Windows/Mac terminal to push a backup to your server:
scp your_downloaded_backup.sql.gz root@your_ip_address:~/Aims_V1/backups/