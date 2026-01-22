const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = 3001;

// ============================================================================
// 1. AUTHENTICATION
// ============================================================================

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  // A. Director/Admin Login (Hardcoded as requested)
  if (username === 'admin' && password === 'admin123') {
    return res.json({ 
        user: { username: 'Director', role: 'SUPER_ADMIN' }, 
        access_token: 'admin_secret_token' 
    });
  }
  
  // B. Student/Parent/Teacher Login
  try {
      const user = await prisma.user.findUnique({ 
        where: { username },
        include: { studentProfile: true, parentProfile: true, teacherProfile: true } 
      });

      if (user && user.password === password) {
        // Return appropriate profile data
        let fullName = user.username;
        if(user.role === 'STUDENT') fullName = user.studentProfile?.fullName;
        if(user.role === 'PARENT') fullName = "Parent"; // Simplify for now

        return res.json({ 
          user: { 
            id: user.id, // User UUID
            username: user.username, 
            role: user.role,
            fullName: fullName
          }, 
          access_token: 'user_secret_token' 
        });
      }
  } catch (e) { console.error("Login Error:", e); }
  
  res.status(401).json({ error: 'Invalid Credentials' });
});


// ============================================================================
// 2. DIRECTOR ERP MODULES
// ============================================================================

// --- ADMISSIONS ---
app.post('/erp/admissions', async (req, res) => {
    const { 
        studentName, studentId, studentPassword, studentPhone, 
        batchId, fees, parentId, parentPassword, parentPhone 
    } = req.body;

    try {
        // 1. Create Parent User (if not exists)
        let parentUser = await prisma.user.findUnique({ where: { username: parentId } });
        if (!parentUser) {
            parentUser = await prisma.user.create({
                data: {
                    username: parentId,
                    password: parentPassword,
                    role: 'PARENT',
                    parentProfile: { create: { mobile: parentPhone } }
                }
            });
        }

        // 2. Fetch Parent Profile ID
        const parentProfile = await prisma.parentProfile.findUnique({ where: { userId: parentUser.id } });

        // 3. Create Student User & Profile
        const studentUser = await prisma.user.create({
            data: {
                username: studentId,
                password: studentPassword,
                role: 'STUDENT',
                studentProfile: {
                    create: {
                        fullName: studentName,
                        mobile: studentPhone,
                        feeAgreed: Number(fees),
                        batchId: batchId,
                        parentId: parentProfile?.id
                    }
                }
            }
        });

        res.json({ success: true, studentId: studentUser.id });
    } catch (e) { 
        console.error(e); 
        res.status(500).json({ error: "Admission failed. IDs might be duplicate." }); 
    }
});

// --- STUDENTS DIRECTORY ---
app.get('/erp/students', async (req, res) => {
    try {
        const students = await prisma.studentProfile.findMany({ 
            include: { batch: true, parent: true, feesPaid: true },
            orderBy: { fullName: 'asc' }
        });
        
        const data = students.map(s => {
            const totalPaid = s.feesPaid.reduce((sum, rec) => sum + rec.amount, 0);
            return {
                id: s.id, // StudentProfile ID
                name: s.fullName,
                studentId: s.userId, // Displaying User ID string for reference
                batch: s.batch?.name || 'Unassigned',
                batchId: s.batchId,
                parentId: s.parent?.userId || 'N/A', // Displaying Parent User ID
                parentMobile: s.parent?.mobile || '',
                feeTotal: s.feeAgreed || 0,
                feePaid: totalPaid,
                feeRemaining: (s.feeAgreed || 0) - totalPaid
            };
        });
        res.json(data);
    } catch (e) { res.json([]); }
});

// --- BATCHES ---
app.get('/erp/batches', async (req, res) => {
    try { const b = await prisma.batch.findMany(); res.json(b); } catch(e) { res.json([]); }
});

app.post('/erp/batches', async (req, res) => {
    const { name, startYear, strength } = req.body;
    try {
        const batch = await prisma.batch.create({ data: { name, startYear, strength: Number(strength) } });
        res.json(batch);
    } catch(e) { res.status(500).json({ error: "Failed to create batch" }); }
});

// --- FEES ---
app.post('/erp/fees', async (req, res) => {
    const { studentId, amount, remarks } = req.body;
    try {
        const fee = await prisma.feeRecord.create({
            data: { studentId, amount: Number(amount), remarks, date: new Date() }
        });
        res.json(fee);
    } catch(e) { 
        console.error(e);
        res.status(500).json({ error: "Fee collection failed" }); 
    }
});

// --- EXPENSES ---
app.get('/erp/expenses', async (req, res) => {
    try { const e = await prisma.expense.findMany({ orderBy: { date: 'desc' } }); res.json(e); } catch { res.json([]); }
});

app.post('/erp/expenses', async (req, res) => {
    const { title, category, amount } = req.body;
    try {
        const exp = await prisma.expense.create({ data: { title, category, amount: Number(amount), date: new Date() } });
        res.json(exp);
    } catch { res.status(500).json({ error: "Failed to log expense" }); }
});

app.delete('/erp/expenses/:id', async (req, res) => {
    try { await prisma.expense.delete({ where: { id: req.params.id } }); res.json({ success: true }); } catch { res.status(500).send(); }
});

// --- SUMMARY ---
app.get('/erp/summary', async (req, res) => {
    try {
        const fees = await prisma.feeRecord.aggregate({ _sum: { amount: true } });
        const expenses = await prisma.expense.aggregate({ _sum: { amount: true } });
        const rev = fees._sum.amount || 0;
        const exp = expenses._sum.amount || 0;
        res.json({ revenue: rev, expenses: exp, profit: rev - exp });
    } catch { res.json({ revenue: 0, expenses: 0, profit: 0 }); }
});


// ============================================================================
// 3. EXAM & ACADEMIC SYSTEM
// ============================================================================

// --- QUESTION BANK ---
app.get('/erp/question-bank', async (req, res) => {
    try { const q = await prisma.questionBank.findMany({ orderBy: { createdAt: 'desc' } }); res.json(q); } catch { res.json([]); }
});

app.post('/erp/question-bank', async (req, res) => {
    try {
        const data = req.body;
        // Upsert dummy admin profile to satisfy relation
        const adminProfile = await prisma.teacherProfile.upsert({
            where: { userId: 'admin' },
            update: {},
            create: { 
                userId: 'admin', fullName: 'Director', 
                user: { connectOrCreate: { where: { username: 'admin' }, create: { username: 'admin', password: '123', role: 'SUPER_ADMIN' }}}
            }
        });

        const q = await prisma.questionBank.create({
            data: {
                questionText: data.questionText,
                options: data.options,
                correctOption: data.correctOption,
                subject: data.subject,
                marks: Number(data.marks),
                negative: Number(data.negative),
                difficulty: 'Medium',
                createdById: adminProfile.id
            }
        });
        res.json(q);
    } catch(e) { console.error(e); res.status(500).json({error: "Failed"}); }
});

// --- EXAMS ---
app.get('/erp/exams', async (req, res) => {
    try {
        const exams = await prisma.exam.findMany({
            include: { _count: { select: { questions: true } } },
            orderBy: { scheduledAt: 'desc' }
        });
        res.json(exams);
    } catch { res.json([]); }
});

app.get('/erp/exams/:id', async (req, res) => {
    try {
        const exam = await prisma.exam.findUnique({
            where: { id: req.params.id },
            include: { questions: { orderBy: { orderIndex: 'asc' } } }
        });
        if(!exam) return res.status(404).json({error: "Not Found"});
        res.json(exam);
    } catch { res.status(500).json({error: "Server Error"}); }
});

// Create Exam (Pipeline Logic: IDs -> Questions)
app.post('/erp/exams', async (req, res) => {
    const { title, scheduledAt, durationMin, totalMarks, batchId, questionBankIds } = req.body;
    try {
        const bankQuestions = await prisma.questionBank.findMany({
            where: { id: { in: questionBankIds } }
        });

        // Use a dummy teacher ID if none provided
        const adminProfile = await prisma.teacherProfile.findFirst();

        const newExam = await prisma.exam.create({
            data: {
                title,
                scheduledAt: new Date(scheduledAt),
                durationMin: Number(durationMin),
                totalMarks: Number(totalMarks),
                batchId: batchId || null,
                isPublished: true,
                createdById: adminProfile?.id, 
                questions: {
                    create: bankQuestions.map((q, i) => ({
                        questionText: q.questionText,
                        options: q.options,
                        correctOption: q.correctOption,
                        subject: q.subject,
                        marks: q.marks,
                        negative: q.negative,
                        orderIndex: i,
                        questionBankId: q.id
                    }))
                }
            }
        });
        res.json(newExam);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Exam creation failed" }); 
    }
});

// --- MARKS & ATTEMPTS ---

// Fetch specific exam results (For Director/Admin Analytics)
app.get('/erp/academics/results', async (req, res) => {
    const { examId, batchId } = req.query;
    try {
        // Build filters
        const whereClause = { status: 'SUBMITTED' };
        if (examId) whereClause.examId = examId;
        if (batchId) whereClause.user = { studentProfile: { batchId: batchId } };

        const attempts = await prisma.testAttempt.findMany({
            where: whereClause,
            include: { user: { include: { studentProfile: true } } },
            orderBy: { totalScore: 'desc' }
        });

        const data = attempts.map((a, i) => ({
            id: a.id,
            rank: i + 1,
            studentName: a.user.studentProfile?.fullName || a.user.username,
            physics: a.physics,
            chemistry: a.chemistry,
            maths: a.maths,
            total: a.totalScore
        }));
        res.json(data);
    } catch { res.json([]); }
});

// Fetch attempts for a specific student (For Student Dashboard)
app.get('/erp/attempts/:username', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { username: req.params.username } });
        if(!user) return res.json([]);
        const attempts = await prisma.testAttempt.findMany({
            where: { userId: user.id },
            include: { exam: true },
            orderBy: { submittedAt: 'desc' }
        });
        res.json(attempts);
    } catch { res.json([]); }
});

// Submit Exam / Update Marks
app.post('/erp/marks', async (req, res) => {
    const { studentId, examId, physics, chemistry, maths } = req.body; // Note: studentId here is essentially userId/studentProfileId
    const total = Number(physics) + Number(chemistry) + Number(maths);

    try {
        // Resolve the actual User ID (Frontend might send StudentProfile ID)
        let userId = studentId;
        const studentProfile = await prisma.studentProfile.findUnique({ where: { id: studentId } });
        if (studentProfile) userId = studentProfile.userId;

        // Check for existing attempt
        const existing = await prisma.testAttempt.findFirst({ where: { userId, examId } });
        
        if (existing) {
            const updated = await prisma.testAttempt.update({
                where: { id: existing.id },
                data: { status: 'SUBMITTED', totalScore: total, physics, chemistry, maths, submittedAt: new Date() }
            });
            return res.json(updated);
        }

        const attempt = await prisma.testAttempt.create({
            data: {
                userId,
                examId,
                status: 'SUBMITTED',
                totalScore: total,
                physics, chemistry, maths,
                submittedAt: new Date()
            }
        });
        res.json(attempt);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to save marks" }); 
    }
});

// --- RESOURCES & NOTICES ---
app.get('/erp/resources', async (req, res) => { try{ res.json(await prisma.resource.findMany({ orderBy: { createdAt: 'desc' } })); } catch{ res.json([]); } });
app.post('/erp/resources', async (req, res) => { try{ res.json(await prisma.resource.create({ data: { ...req.body, type: 'VIDEO' } })); } catch{ res.status(500).send(); } });
app.delete('/erp/resources/:id', async (req, res) => { try{ await prisma.resource.delete({ where: { id: req.params.id } }); res.json({success:true}); } catch{ res.status(500).send(); } });

app.get('/erp/notices', async (req, res) => { try{ res.json(await prisma.notice.findMany({ orderBy: { createdAt: 'desc' } })); } catch{ res.json([]); } });
app.post('/erp/notices', async (req, res) => { try{ res.json(await prisma.notice.create({ data: req.body })); } catch{ res.status(500).send(); } });
app.delete('/erp/notices/:id', async (req, res) => { try{ await prisma.notice.delete({ where: { id: req.params.id } }); res.json({success:true}); } catch{ res.status(500).send(); } });

// --- CRM ---
app.get('/erp/enquiries', async (req, res) => { try{ res.json(await prisma.enquiry.findMany({ orderBy: { createdAt: 'desc' } })); } catch{ res.json([]); } });
app.post('/erp/enquiries', async (req, res) => { try{ res.json(await prisma.enquiry.create({ data: req.body })); } catch{ res.status(500).send(); } });
app.patch('/erp/enquiries/:id/status', async (req, res) => { try{ res.json(await prisma.enquiry.update({ where: { id: req.params.id }, data: { status: req.body.status } })); } catch{ res.status(500).send(); } });

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});