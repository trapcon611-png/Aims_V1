/*
  Warnings:

  - You are about to drop the column `isPYQ` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `topic` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `isCompleted` on the `TestAttempt` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `TestAttempt` table. All the data in the column will be lost.
  - You are about to drop the `Attendance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Expense` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_studentId_fkey";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "isPYQ",
DROP COLUMN "topic";

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "feeAgreed" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "mobile" TEXT;

-- AlterTable
ALTER TABLE "TestAttempt" DROP COLUMN "isCompleted",
DROP COLUMN "startedAt";

-- DropTable
DROP TABLE "Attendance";

-- DropTable
DROP TABLE "Expense";
