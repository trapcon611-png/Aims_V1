// --- SMART API RESOLVER ---
const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:3001`;
  return 'http://localhost:3001';
};

const API_URL = getApiUrl();

// --- 401 INTERCEPTOR ---
const fetchWithAuth = async (url: string, options: any = {}) => {
  const res = await fetch(url, options);
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('student_token');
      localStorage.removeItem('parent_token');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('director_session');
      localStorage.removeItem('aims_token'); 
      
      alert('Session Expired: Your security token is invalid or has expired. Please log in again.');
      window.location.reload(); 
    }
    throw new Error('Unauthorized');
  }
  return res;
};

export const studentApi = {
  // --- AUTH HELPERS ---
  getToken() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('student_token') || localStorage.getItem('accessToken') || localStorage.getItem('aims_token') || '';
  },

  async login(username: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Invalid Credentials');
    }
    const data = await res.json();
    
    if (data.user && data.user.role !== 'STUDENT') {
        throw new Error('Invalid Credentials: Not a student account.');
    }
    
    data.token = data.access_token || data.token || data.accessToken;
    return data;
  },

  async getProfile(token: string) {
    try {
        const res = await fetchWithAuth(`${API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) { return null; }
  },

  // ✨ FIX: Routed to official Backend '/exams' controller
  async getExams(token: string) {
    try {
      const res = await fetchWithAuth(`${API_URL}/exams`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  },

  // ✨ FIX: Routed to official Backend '/exams/my-attempts' controller
  async getResults(token: string) {
    try {
      const res = await fetchWithAuth(`${API_URL}/exams/my-attempts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) return [];
      
      const attempts = await res.json();
      if (!Array.isArray(attempts)) return [];
      
      return attempts.map((attempt: any) => {
        // Correct extraction using answers mapped to their nested question objects
        const questionsList = attempt.answers?.map((a: any) => a.question).filter(Boolean) || [];
        
        const answersMap = new Map();
        if (Array.isArray(attempt.answers)) {
            attempt.answers.forEach((a: any) => answersMap.set(a.questionId, a));
        }

        const questionMetrics = questionsList.map((question: any, idx: number) => {
            const userAnswer = answersMap.get(question.id);
            
            let status: 'CORRECT' | 'WRONG' | 'SKIPPED' = 'SKIPPED';
            let selectedOption = null;
            let timeTaken = 0;
            let marksAwarded = 0;

            if (userAnswer) {
                selectedOption = userAnswer.selectedOption;
                if (selectedOption) {
                    status = userAnswer.isCorrect ? 'CORRECT' : 'WRONG';
                }
                timeTaken = userAnswer.timeTaken || 0;
                marksAwarded = userAnswer.marksAwarded || 0;
            }

            let options = question.options;
            if (typeof options === 'string') {
                try { options = JSON.parse(options); } catch (e) {}
            }

            return {
                id: idx + 1, 
                status: status,
                timeSpent: timeTaken,
                viewCount: 1, 
                subject: question.subject || 'General',
                questionText: question.questionText || 'Question text not available',
                questionImage: question.questionImage, 
                type: question.type,
                options: options || {},
                selectedOption: selectedOption,
                correctOption: question.correctOption, 
                marks: marksAwarded,
                
                explanation: question.questionBank?.explanation || question.explanation || question.solution, 
                solutionImage: question.solutionImage
            };
        });

        return {
            id: attempt.id,
            examId: attempt.examId, 
            examTitle: attempt.exam?.title || 'Unknown Exam',
            examType: attempt.exam?.tags?.[0] || attempt.exam?.examType || 'JEE Main',
            score: attempt.totalScore || 0,
            totalMarks: attempt.exam?.totalMarks || 0,
            rank: attempt.rank || '-', 
            date: attempt.submittedAt || attempt.startedAt || new Date().toISOString(),
            analytics: {
                questions: questionMetrics 
            }
        };
      });
    } catch (e) { 
        console.error("Result parsing error:", e);
        return []; 
    }
  },
  
  // --- STUDY MATERIAL & NOTICES ---
  async getResources(token: string) {
     try {
      const res = await fetchWithAuth(`${API_URL}/student/resources`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; } 
  },

  async getNotices(token: string) {
    try {
      const res = await fetchWithAuth(`${API_URL}/student/notices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  },

  // --- EXAM TAKING ENGINE ---
  // ✨ FIX: Routed to official Backend '/exams/:id/attempt'
  async startAttempt(examId: string, token: string) {
    const res = await fetchWithAuth(`${API_URL}/exams/${examId}/attempt`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!res.ok) {
        if (res.status === 404) throw new Error("Exam not found or not active.");
        if (res.status === 403) throw new Error("Access denied.");
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to start exam.");
    }
    return await res.json();
  },

  // ✨ FIX: Routed to official Backend '/exams/:id/submit'
  async submitAttempt(examId: string, answers: any[], token: string) {
      const res = await fetchWithAuth(`${API_URL}/exams/${examId}/submit`, {
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

export const loginStudent = async (identifier: string, password: string) => {
  return await studentApi.login(identifier, password);
};