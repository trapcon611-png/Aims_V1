import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 10 }, // Ramp up to 10 users quickly
    { duration: '20s', target: 50 }, // Ramp up to 50 users
    { duration: '5s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

const BASE_URL = 'http://localhost:3001';

export default function () {
  // 1. Login
  // Simulating different users
  const username = `student_${__VU}`;
  const password = 'password123';

  const loginPayload = JSON.stringify({ username, password });
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, params);

  check(loginRes, {
    'login status is 200/201': (r) => r.status === 200 || r.status === 201,
    'has access token': (r) => r.json('access_token') !== undefined,
  });

  const token = loginRes.json('access_token');
  const authParams = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  sleep(1); // Think time

  // 2. Get Available Exams
  const examsRes = http.get(`${BASE_URL}/student/exams`, authParams);

  check(examsRes, {
    'exams fetched (200)': (r) => r.status === 200,
    'exams list is not empty': (r) => r.json().length > 0,
  });

  const exams = examsRes.json();
  if (exams.length === 0) return;

  const examId = exams[0].id;

  sleep(1);

  // 3. Start Exam Attempt
  const attemptRes = http.post(`${BASE_URL}/student/exam/${examId}/attempt`, {}, authParams);

  check(attemptRes, {
    'attempt started (200/201)': (r) => r.status === 200 || r.status === 201,
    'questions returned': (r) => r.json('questions') && r.json('questions').length > 0,
  });

  const questions = attemptRes.json('questions');

  // Simulate exam taking duration (shortened for test)
  sleep(2);

  // 4. Submit Answers
  // Randomly answer questions
  const answers = questions.map(q => ({
    questionId: q.id,
    selectedOption: 'a',
    timeTaken: 15
  }));

  const submitPayload = JSON.stringify({ answers });
  const submitRes = http.post(`${BASE_URL}/student/exam/${examId}/submit`, submitPayload, authParams);

  check(submitRes, {
    'submission success (200/201)': (r) => r.status === 200 || r.status === 201,
    'score returned': (r) => r.json('score') !== undefined,
  });
}
