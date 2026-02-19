AIMS Institute AMS - Technical Documentation (v1.2)

1. Executive Summary

AIMS Institute ERP is a full-stack, enterprise-grade academic management system designed to streamline operations for coaching institutes. It acts as a central nervous system connecting Directors, Faculty, Students, and Parents.

The system has evolved into a Micro-Component Architecture on the frontend to ensure scalability and maintainability, while the backend utilizes a modular NestJS structure with strict Role-Based Access Control (RBAC).

Key Differentiators:

AI-Powered Exam Generation: Generates balanced question papers instantly via external AI integration.

Resilient Exam Engine: Offline support, anti-cheat mechanisms, and LaTeX rendering.

Web Push Notifications: System-level alerts for Students/Parents (Service Worker + VAPID).

Financial Intelligence: Daily collection tracking, installment management, and GST-compliant invoicing.

2. System Architecture

2.1 Tech Stack

Frontend: Next.js 14 (App Router), Tailwind CSS (Design System), Lucide React (Icons), Recharts (Analytics).

Backend: NestJS (Node.js framework), Passport.js (Auth), Web-Push (Notifications).

Database: PostgreSQL 16 managed via Prisma ORM.

Infrastructure: Dockerized containers orchestrated via Docker Compose.

AI Service: Hosted Inference API (Python/FastAPI) for semantic search and paper generation.

2.2 Security Architecture

Authentication: JWT (JSON Web Tokens) with stateless validation.

Authorization: Custom @Roles() decorator guarding endpoints.

Data Integrity: Transaction-safe operations (prisma.$transaction) for admissions and exam submissions.

Input Sanitization: Recursive sanitization middleware to prevent Postgres 0x00 (Null Byte) injection attacks from AI data.

3. Project Structure (Updated)

The project follows a Domain-Driven Design.

3.1 Frontend (aims_institute_app/)

The frontend is split into four distinct portals, each with its own local service layer and component library.

app/
├── admin/                  # [Portal] Academic Admin
│   ├── components/         # Micro-components (QuestionChecker, ExamManager)
│   ├── services/           # adminApi.ts (Direct backend calls)
│   └── page.tsx            # Main Controller
├── director/               # [Portal] Director Console
│   ├── components/         # AdmissionsPanel, AccountsPanel, ContentPanel
│   ├── services/           # directorApi.ts
│   └── page.tsx            # Dashboard Orchestrator
├── student/                # [Portal] Student Learning Hub
│   ├── components/         # ExamView, ResultAnalysis, DashboardHome
│   ├── services/           # studentApi.ts
│   ├── exam/[id]/          # Secure Exam Room (No Layout, Fullscreen)
│   └── page.tsx            # Student Dashboard
├── parent/                 # [Portal] Parent Monitoring
│   ├── components/         # StudentCard, InvoiceModal
│   ├── services/           # parentApi.ts
│   └── page.tsx            # Main View
├── public/
│   └── sw.js               # Service Worker for Push Notifications
└── ...


3.2 Backend (aims_backend/)

The backend is modularized to prevent logic coupling.

src/
├── auth/                   # Login & JWT Strategy
├── erp/                    # Core Admin/Director Logic (Fees, Batches, Questions)
├── student/                # Student-Specific Logic (Exam Taking, Results)
├── parent/                 # Parent-Specific Logic (Child Tracking)
├── prisma/                 # Database Schema & Seeds
└── app.module.ts           # Root Module


4. Module Capabilities

4.1 Director Console

Dashboard: Live SVG Trend Charts (7-day view) for Enquiries, Admissions, and Fee Collection.

Admissions Engine:

Creates Student, Parent, and Profile records in a single transaction.

Installment Calculator: Auto-generates due dates based on plan.

Fee Management: Generates GST receipts, tracks pending dues.

Content & Notifications:

Targeting: Send notices to "Batch", "Individual Student", or "Specific Parent".

Push: Triggers system-level notifications via VAPID keys.

4.2 Student Portal

Exam Room:

Anti-Cheat: Detects tab switching/blur events. Auto-submits after 3 warnings.

Offline Mode: Local timer logic handles network drops gracefully.

Renderer: Full LaTeX support for Math/Physics equations and image support for Biology.

Analytics:

Subject-wise breakdown.

Time-spent analysis per question.

Comparison against top rankers.

4.3 Academic Admin

Question Repository:

AI Generator: Fetches questions based on Topic/Difficulty.

Approval Workflow: Teachers review AI output before saving to the internal bank.

Exam Scheduler: Set start times, duration, and publishing status.

4.4 Parent Portal

Financial Transparency: View full fee history, download receipts, check upcoming installments.

Performance: Real-time access to child's exam results and attendance.

5. Database Schema (Key Updates)

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

Supports rich text and complex options.

model Question {
  id            String  @id @default(uuid())
  questionText  String  // Supports LaTeX
  options       Json    // Stores {a: "...", b: "..."}
  correctOption String
  questionImage String?
  // ...
}

model TestAttempt {
  id           String @id @default(uuid())
  scoreDetails Json?  // Stores granular question-wise stats
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

6.3 ERP Core (/erp)

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

DATABASE_URL="postgresql://user:pass@localhost:5432/aims_db"
NEXT_PUBLIC_API_URL="[https://api.aimsinstitute.com](https://api.aimsinstitute.com)"
# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY="<Generated Key>"
VAPID_PRIVATE_KEY="<Generated Key>"
