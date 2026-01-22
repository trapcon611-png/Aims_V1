import { PrismaClient } from '@prisma/client';

/**
 * This file demonstrates how to see your schema structure in code
 * Run: npx ts-node view-schema.ts
 */

const prisma = new PrismaClient();

async function viewSchema() {
  console.log('📊 DATABASE SCHEMA OVERVIEW\n');
  console.log('='.repeat(60));

  // 1. VIEW ALL USERS
  console.log('\n👥 USERS (with roles):');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    take: 5,
  });
  console.table(users);

  // 2. VIEW TEACHERS
  console.log('\n👨‍🏫 TEACHERS:');
  const teachers = await prisma.teacherProfile.findMany({
    include: {
      user: {
        select: { username: true, role: true },
      },
    },
  });
  console.table(teachers.map(t => ({
    id: t.id,
    name: t.fullName,
    subject: t.subject,
    username: t.user.username,
  })));

  // 3. VIEW STUDENTS
  console.log('\n👨‍🎓 STUDENTS:');
  const students = await prisma.studentProfile.findMany({
    include: {
      user: {
        select: { username: true },
      },
      batch: {
        select: { name: true },
      },
    },
    take: 5,
  });
  console.table(students.map(s => ({
    id: s.id,
    name: s.fullName,
    username: s.user.username,
    batch: s.batch?.name || 'No Batch',
    feeAgreed: s.feeAgreed,
  })));

  // 4. VIEW QUESTION BANK
  console.log('\n📝 QUESTION BANK:');
  const questions = await prisma.questionBank.findMany({
    include: {
      createdBy: {
        select: { fullName: true },
      },
    },
    take: 5,
  });
  console.table(questions.map(q => ({
    id: q.id,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    marks: q.marks,
    createdBy: q.createdBy.fullName,
  })));

  // 5. VIEW EXAMS
  console.log('\n📋 EXAMS:');
  const exams = await prisma.exam.findMany({
    include: {
      createdBy: {
        select: { fullName: true },
      },
      _count: {
        select: {
          questions: true,
          attempts: true,
        },
      },
    },
  });
  console.table(exams.map(e => ({
    id: e.id,
    title: e.title,
    duration: `${e.durationMin} min`,
    totalMarks: e.totalMarks,
    questions: e._count.questions,
    attempts: e._count.attempts,
    createdBy: e.createdBy?.fullName || 'N/A',
    published: e.isPublished,
  })));

  // 6. VIEW TEST ATTEMPTS
  console.log('\n📊 TEST ATTEMPTS:');
  const attempts = await prisma.testAttempt.findMany({
    include: {
      user: {
        include: {
          studentProfile: {
            select: { fullName: true },
          },
        },
      },
      exam: {
        select: { title: true },
      },
    },
    take: 5,
  });
  console.table(attempts.map(a => ({
    id: a.id,
    student: a.user.studentProfile?.fullName || a.user.username,
    exam: a.exam.title,
    status: a.status,
    score: a.totalScore,
    correct: a.correctCount,
    wrong: a.wrongCount,
    skipped: a.skippedCount,
  })));

  // 7. VIEW BATCHES
  console.log('\n📚 BATCHES:');
  const batches = await prisma.batch.findMany({
    include: {
      _count: {
        select: {
          students: true,
          notices: true,
          resources: true,
        },
      },
    },
  });
  console.table(batches.map(b => ({
    id: b.id,
    name: b.name,
    students: b._count.students,
    notices: b._count.notices,
    resources: b._count.resources,
  })));

  // 8. VIEW NOTICES
  console.log('\n📢 NOTICES:');
  const notices = await prisma.notice.findMany({
    include: {
      batch: {
        select: { name: true },
      },
    },
    take: 5,
  });
  console.table(notices.map(n => ({
    id: n.id,
    title: n.title,
    batch: n.batch?.name || 'All Batches',
    date: n.createdAt.toLocaleDateString(),
  })));

  // 9. VIEW RESOURCES
  console.log('\n📚 RESOURCES:');
  const resources = await prisma.resource.findMany({
    include: {
      batch: {
        select: { name: true },
      },
    },
    take: 5,
  });
  console.table(resources.map(r => ({
    id: r.id,
    title: r.title,
    type: r.type,
    batch: r.batch?.name || 'All Batches',
  })));

  // 10. VIEW FINANCE
  console.log('\n💰 FEE RECORDS:');
  const feeRecords = await prisma.feeRecord.findMany({
    include: {
      student: {
        select: { fullName: true },
      },
    },
    take: 5,
  });
  console.table(feeRecords.map(f => ({
    id: f.id,
    student: f.student.fullName,
    amount: f.amount,
    date: f.date.toLocaleDateString(),
    remarks: f.remarks,
  })));

  console.log('\n💸 EXPENSES:');
  const expenses = await prisma.expense.findMany({
    take: 5,
  });
  console.table(expenses.map(e => ({
    id: e.id,
    title: e.title,
    category: e.category,
    amount: e.amount,
    vendor: e.vendor || 'N/A',
  })));

  console.log('\n' + '='.repeat(60));
  console.log('✅ Schema visualization complete!\n');
}

viewSchema()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
