const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://76.13.247.225:3001';

export const studentApi = {
  // --- AUTH HELPERS ---
  getToken() {
    if (typeof window === 'undefined') return '';
    // Check possible storage keys to be safe
    return localStorage.getItem('student_token') || localStorage.getItem('accessToken') || '';
  },

  async login(username: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid Credentials');
    return await res.json();
  },

  async getProfile(token: string) {
    try {
        const res = await fetch(`${API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) { return null; }
  },

  // --- EXAM LIST ---
  async getExams(token: string) {
    try {
      const res = await fetch(`${API_URL}/student/exams`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  },

  // --- RESULT ANALYTICS (CRITICAL UPDATE) ---
  async getResults(token: string) {
    try {
      const res = await fetch(`${API_URL}/student/results`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) return [];
      
      const attempts = await res.json();
      if (!Array.isArray(attempts)) return [];
      
      return attempts.map((attempt: any) => {
        // 1. Get the master list of questions from the exam definition
        // This ensures we show "Skipped" questions too, not just the ones answered.
        const questionsList = attempt.exam?.questions || [];
        
        // 2. Create a Map of user answers for fast lookup
        const answersMap = new Map();
        if (Array.isArray(attempt.answers)) {
            attempt.answers.forEach((a: any) => answersMap.set(a.questionId, a));
        }

        // 3. Map over QUESTIONS to build metrics
        const questionMetrics = questionsList.map((question: any, idx: number) => {
            const userAnswer = answersMap.get(question.id);
            
            let status: 'CORRECT' | 'WRONG' | 'SKIPPED' = 'SKIPPED';
            let selectedOption = null;
            let timeTaken = 0;
            let marksAwarded = 0;

            if (userAnswer) {
                selectedOption = userAnswer.selectedOption;
                // If they selected something, check if correct
                if (selectedOption) {
                    status = userAnswer.isCorrect ? 'CORRECT' : 'WRONG';
                }
                timeTaken = userAnswer.timeTaken || 0;
                marksAwarded = userAnswer.marksAwarded || 0;
            }

            // Safely parse JSON options if they come as a string
            let options = question.options;
            if (typeof options === 'string') {
                try { options = JSON.parse(options); } catch (e) {}
            }

            return {
                id: idx + 1, 
                status: status,
                timeSpent: timeTaken,
                viewCount: 1, // Placeholder
                subject: question.subject || 'General',
                questionText: question.questionText || 'Question text not available',
                questionImage: question.questionImage, 
                type: question.type,
                options: options || {},
                selectedOption: selectedOption,
                correctOption: question.correctOption, 
                marks: marksAwarded
            };
        });

        return {
            id: attempt.id,
            examId: attempt.examId, 
            examTitle: attempt.exam?.title || 'Unknown Exam',
            score: attempt.totalScore || 0,
            totalMarks: attempt.exam?.totalMarks || 0,
            rank: attempt.rank || '-', 
            date: attempt.submittedAt || attempt.startedAt || new Date().toISOString(),
            analytics: {
                questions: questionMetrics // This array is now fully populated
            }
        };
      });
    } catch (e) { 
        console.error("Result parsing error:", e);
        return []; 
    }
  },
  
  // --- STUDY MATERIAL ---
  async getResources(token: string) {
     try {
      const res = await fetch(`${API_URL}/student/resources`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; } 
  },

  // --- NOTICES ---
  async getNotices(token: string) {
    try {
      const res = await fetch(`${API_URL}/student/notices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  },

  // --- EXAM TAKING ENGINE ---
  async startAttempt(examId: string, token: string) {
    const res = await fetch(`${API_URL}/student/exam/${examId}/attempt`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!res.ok) {
        if (res.status === 404) throw new Error("Exam not found or not active.");
        if (res.status === 403) throw new Error("Access denied.");
        // Try to get error message from backend
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to start exam.");
    }
    return await res.json();
  },

  async submitExam(examId: string, answers: any[], token: string) {
      const res = await fetch(`${API_URL}/student/exam/${examId}/submit`, {
          method: 'POST',
          headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ answers })
      });

      if (!res.ok) throw new Error("Submission failed. Please try again.");
      return await res.json();
  }
};