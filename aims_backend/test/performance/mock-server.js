const express = require('express');
const app = express();
const port = 3001;

app.use(express.json());

// Mock Data
const EXAM_ID = "mock-exam-123";
const QUESTION_ID_1 = "q-1";
const QUESTION_ID_2 = "q-2";

// 1. Auth Endpoint
app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`[Mock] Login attempt: ${username}`);

    // Accept any password for load testing
    const token = "mock-jwt-token-" + Date.now();
    res.json({
        access_token: token,
        user: {
            id: "user-" + username,
            username: username,
            role: "STUDENT"
        }
    });
});

// 2. Get Exams
app.get('/student/exams', (req, res) => {
    // console.log(`[Mock] Fetching exams`);
    res.json([
        {
            id: EXAM_ID,
            title: "Mock Load Test Exam",
            durationMin: 180,
            totalMarks: 300,
            scheduledAt: new Date().toISOString()
        }
    ]);
});

// 3. Start Attempt
app.post('/student/exam/:id/attempt', (req, res) => {
    const { id } = req.params;
    // console.log(`[Mock] Starting attempt for exam ${id}`);

    // Simulate some processing delay
    setTimeout(() => {
        res.json({
            attemptId: "attempt-" + Date.now(),
            exam: {
                title: "Mock Load Test Exam",
                duration: 180,
                totalMarks: 300
            },
            questions: [
                {
                    id: QUESTION_ID_1,
                    questionText: "What is 2 + 2?",
                    questionImage: null,
                    options: { a: "3", b: "4", c: "5", d: "6" }, // Mocking JSON options
                    subject: "Maths",
                    topic: "Basic Arithmetic",
                    type: "MCQ",
                    marks: 4,
                    negative: -1
                },
                {
                    id: QUESTION_ID_2,
                    questionText: "What is the capital of France?",
                    questionImage: null,
                    options: { a: "Berlin", b: "Madrid", c: "Paris", d: "Rome" },
                    subject: "GK",
                    topic: "Geography",
                    type: "MCQ",
                    marks: 4,
                    negative: -1
                }
            ],
            serverTime: new Date().toISOString()
        });
    }, 50); // 50ms simulated DB latency
});

// 4. Submit Exam
app.post('/student/exam/:id/submit', (req, res) => {
    const { id } = req.params;
    const { answers } = req.body;
    // console.log(`[Mock] Submitting exam ${id} with ${answers?.length} answers`);

    // Simulate scoring logic delay
    setTimeout(() => {
        res.json({
            success: true,
            score: 8, // Mock score
            message: "Exam submitted successfully"
        });
    }, 100); // 100ms simulated DB latency
});

// Start Server
app.listen(port, () => {
    console.log(`Mock Backend running on port ${port}`);
});
