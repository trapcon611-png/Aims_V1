AIMS Institute V1 - Technical Documentation

1. Executive Summary

AIMS V1 is a comprehensive Academic ERP (Enterprise Resource Planning) system designed for coaching institutes. It unifies academic management, examination systems, student performance tracking, and financial operations into a single platform.

The system is built with a modern, scalable tech stack, utilizing Next.js for the frontend interfaces (Student, Parent, Admin, Director) and NestJS for a robust backend API, all orchestrated via Docker. It features a unique AI-powered Exam Generator that integrates with an external AI service to automate question paper creation.

2. System Architecture

The application follows a Monolithic Service Architecture deployed via containers, with plans to transition specific modules (Exam Generation) into Microservices.

2.1 Core Components

Frontend (Next.js 14+):

Portals:

Student Portal: Exam taking, Result analysis, Resource access.

Parent Portal: Fee tracking, Performance monitoring, Attendance view.

Academic Admin: Question bank management, Exam scheduling, Result publishing.

Director Console: Financial overview, Staff management, Global settings.

Rendering: Server-Side Rendering (SSR) for SEO and performance, Client-Side Rendering (CSR) for interactive dashboards.

Styling: Tailwind CSS with a custom "Glassmorphism" and "Neural" aesthetic.

Backend (NestJS):

API Layer: RESTful API endpoints secured with JWT Guards.

Business Logic: Modular services for Auth, Exams, Finance, ERP.

ORM: Prisma ORM for type-safe database interactions.

Database (PostgreSQL 15):

Relational data model handling Users, Roles, Exams, Questions, Attempts, and Finances.

AI Service (External):

Endpoint: https://prishaa-question-paper.hf.space

Function: Generates question papers based on difficulty/topic configuration and provides semantic search capabilities.

2.2 Docker Orchestration

The system is containerized using docker-compose.

aims_frontend_container: Runs on Port 3000. Connects to Backend via internal Docker network.

aims_backend_container: Runs on Port 3001. Connects to Postgres via internal Docker network.

aims_db_container: Runs Postgres on Port 5432.

3. Database Schema

The core data structure is defined in prisma/schema.prisma.

Key Models

User: Central identity with Role-Based Access Control (STUDENT, PARENT, TEACHER, SUPER_ADMIN).

StudentProfile: Links User to Batch, Parent, and Fee/Attendance records.

Exam: Represents a scheduled test. Contains metadata like duration, totalMarks, and examType (JEE/NEET).

Question: The fundamental unit. Stores text, images, options (JSON), and the correct answer. Linked to specific Exams.

TestAttempt: A student's session for an exam. Tracks status (IN_PROGRESS, SUBMITTED), score, and individual Answer records.

FeeRecord: Tracks individual payments linked to a Student.

Attendance: Daily records linked to Batches and Students.

4. API Endpoints

4.1 Authentication (/auth)

POST /auth/login: Authenticates user, returns JWT access token.

GET /auth/profile: Returns current user details based on token.

4.2 Exams Module (/exams, /erp/exams)

POST /erp/exams: Create a new Exam draft (Admin).

GET /erp/exams: List all exams (Admin/Staff).

POST /student/exam/:id/import-questions: (Critical) Imports questions from the AI/External source into the local DB.

POST /exams/:id/attempt: Starts an exam session for a student. Checks for existing attempts.

POST /exams/:id/submit: Submits answers, calculates score immediately, and closes the attempt.

GET /exams/my-attempts: Returns result history for the logged-in student.

GET /exams/student-attempts?studentId=...: Returns results for a specific student (Parent/Admin view).

4.3 Finance Module (/finance)

GET /finance/my-summary: Returns fee status, paid history, and pending installments for a Parent's children.

5. Deployment Guide (VPS)

Prerequisites

Ubuntu VPS (2GB+ RAM recommended).

Docker & Docker Compose installed.

Git installed.

Step-by-Step Deployment

Clone Repository:

git clone [https://github.com/your-repo/Aims_V1.git](https://github.com/your-repo/Aims_V1.git)
cd Aims_V1


Configure Environment:

Edit docker-compose.yml to set your VPS IP Address in NEXT_PUBLIC_API_URL.

Ensure DATABASE_URL is consistent across services.

Build & Run:

docker compose up --build -d


Initialize Database:
Wait for containers to start, then run the schema push:

docker exec -it aims_backend_container npx prisma db push


Seed Data (Optional):
To create default Admin/Student accounts:

docker exec -it aims_backend_container npx ts-node prisma/seed.ts


6. Future Roadmap & Required Updates

Based on the current analysis, the following updates are scheduled for Aims V1.1:

6.1 Admin Panel: Question Checker Microservice

Goal: Decouple question verification from the main admin flow.

Feature: A dedicated tab where teachers review AI-generated/ database (fecteched from external api) questions before they are available for exams. They can rate difficulty (Easy/Med/Hard) and edit text/images.

Tech: Separate NestJS module or standalone service.

6.2 MCQ Option & Answer Fix

Issue: External API sometimes returns numerical indices (1, 2, 3, 4) for correct answers, while the UI expects letters (a, b, c, d).

Fix: Implement a robust mapper in the Import API (route.ts) to normalize 1 -> a, 2 -> b, etc., and ensure options are always stored as a consistent JSON object { "a": "...", "b": "..." }.

6.3 Director Panel: Fee Record Lock Fix

Issue: The Fee Record/Invoice view is currently showing empty or locked data.

Fix: The FinanceService needs to be audited to ensure it correctly aggregates FeeRecord data and that the ParentProfile relation correctly links to StudentProfile for fetching these records. The installmentSchedule JSON structure in Prisma needs strict typing.

6.4 Microservice Transition

Goal: Split the Academic Admin Panel.

Plan:

Service A (Exam Engine): Handles Exam Creation, Question Bank, and Paper Generation.

Service B (Result Engine): Dedicated to heavy analytics, rank generation, and report card creation.

Service C (Core ERP): User management, Batches, Attendance.

Document Generated: February 15, 2026
Version: 1.0.0