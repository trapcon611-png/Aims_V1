// --- SMART API RESOLVER ---
const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:3001`;
  return 'http://localhost:3001';
};

const API_URL = getApiUrl();
const AI_API_URL = 'https://prishaa-question-paper.hf.space';

// --- 401 INTERCEPTOR ---
const fetchWithAuth = async (url: string, options: any = {}) => {
  const res = await fetch(url, options);
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      // Clear all possible token names just to be safe
      localStorage.removeItem('student_token');
      localStorage.removeItem('parent_token');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('director_session');
      localStorage.removeItem('aims_token');
      
      alert('Session Expired: Your security token is invalid or has expired. Please log in again.');
      window.location.reload(); // ✅ THE FIX: Reloads the current page instead of kicking to root
    }
    throw new Error('Unauthorized');
  }
  return res;
};

export const adminApi = {
  getToken() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('admin_token') || '';
  },

  async login(username: string, password: string) {
    // Normal fetch since login naturally expects 401 on bad passwords
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid Credentials');
    const data = await res.json();
    data.token = data.access_token || data.token || data.accessToken;
    return data;
  },

  async seedSystem() {
    const token = this.getToken();
    try {
        const res = await fetchWithAuth(`${API_URL}/erp/seed`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Seeding failed');
        return await res.json();
    } catch (e) { throw e; }
  },

  // --- AI & QUESTION BANK ---
  async searchQuestionsExternal(query: string, subject: string, difficulty: string) {
    const payload = { query: query || "", limit: 50, use_llm_transform: false };
    try {
        // External AI API - DOES NOT USE AUTH WRAPPER
        const res = await fetch(`${AI_API_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.questions || [];
    } catch (e) { return []; }
  },

  async saveToQuestionBank(questionData: any) {
      const token = this.getToken();
      const res = await fetchWithAuth(`${API_URL}/erp/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(questionData)
    });
    if (!res.ok) throw new Error('Failed to save question');
    return await res.json();
  },

  async getInternalQuestions() {
    const token = this.getToken();
    try {
        // Pulls from the updated backend repository endpoint to ensure formatting is consistent
        const res = await fetchWithAuth(`${API_URL}/exams/approved-questions`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) return [];
        const data = await res.json();
        return data.questions || (Array.isArray(data) ? data : (data.data || [])); 
    } catch (e) { return []; }
  },

  async generateAiPaper(payload: any) {
    // External AI API - DOES NOT USE AUTH WRAPPER
    const res = await fetch(`${AI_API_URL}/generate-paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
       const errText = await res.text().catch(() => res.statusText);
       throw new Error(`AI Service Error (${res.status}): ${errText}`);
    }
    
    const data = await res.json();
    
    let allQuestions: any[] = [];
    if (data.sections) {
        Object.keys(data.sections).forEach(sectionKey => {
            const qs = data.sections[sectionKey];
            if (Array.isArray(qs)) {
                const mapped = qs.map((q: any) => {
                    const isInteger = q.question_type === 'integer';
                    let optionsObj: any = {};
                    let correctKey = '';

                    if (isInteger) {
                        correctKey = String(q.correct_answer);
                    } else {
                        const keys = ['a', 'b', 'c', 'd'];
                        if (Array.isArray(q.options)) {
                            q.options.forEach((opt: any, idx: number) => {
                                const val = typeof opt === 'string' ? opt : (opt.text || opt.image || '');
                                if (idx < 4) optionsObj[keys[idx]] = val;
                            });
                        }
                        const ansRaw = String(q.correct_answer);
                        if (!isNaN(Number(ansRaw)) && ansRaw.trim() !== '') {
                             const ansIdx = Number(ansRaw) - 1; 
                             if (ansIdx >= 0 && ansIdx < 4) correctKey = keys[ansIdx];
                             else correctKey = ansRaw; 
                        } else {
                             const matchIdx = keys.findIndex(k => optionsObj[k] === ansRaw);
                             if(matchIdx !== -1) correctKey = keys[matchIdx];
                             else correctKey = ansRaw.toLowerCase();
                        }
                    }

                    return {
                        questionText: q.question_text,
                        questionImage: (q.question_images && q.question_images.length > 0) ? q.question_images[0] : null,
                        solutionImage: null,
                        subject: q.subject || 'General',
                        topic: sectionKey, 
                        difficulty: (data.difficulty || 'medium').toUpperCase(),
                        type: isInteger ? 'INTEGER' : 'MCQ',
                        marks: 4,
                        options: optionsObj,
                        correctOption: correctKey
                    };
                });
                allQuestions = [...allQuestions, ...mapped];
            }
        });
    }
    return { questions: allQuestions };
  },

  // --- EXAM MANAGEMENT ---
  async createExam(data: any) {
    const token = this.getToken();
    const res = await fetchWithAuth(`${API_URL}/admin/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create exam');
    return await res.json();
  },
  
  async importQuestionsToExam(examId: string, questions: any[]) {
      const token = this.getToken();
      
      // Ensures all custom types and topics pass safely to the Next.js API Route
      const payload = {
          questions: questions.map(q => ({
              questionText: q.questionText,
              questionImage: q.questionImage,
              solutionImage: q.solutionImage,
              explanation: q.explanation,
              subject: q.subject,
              topic: q.topic,
              type: q.type,
              difficulty: q.difficulty,
              options: q.options,
              correctOption: q.correctOption,
              marks: q.marks || 4,
              negative: q.negative || -1
          }))
      };

      // Calls the Next.js App Router endpoint directly (port 3000)
      const res = await fetchWithAuth(`/student/exam/${examId}/import-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to save imported questions to DB');
      }
      return await res.json();
  },

  async getExams() {
    const token = this.getToken();
    try { 
        const res = await fetchWithAuth(`${API_URL}/exams`, { headers: { 'Authorization': `Bearer ${token}` } }); 
        if (!res.ok) return []; 
        return await res.json(); 
    } catch (e) { return []; }
  },

  async deleteExam(id: string) {
    const token = this.getToken();
    const res = await fetchWithAuth(`${API_URL}/admin/exams/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to delete exam'); 
    return await res.json();
  },

  async getExamById(id: string) {
    const token = this.getToken();
    const res = await fetchWithAuth(`${API_URL}/exams/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to fetch exam details'); 
    return await res.json();
  },

  // ✨ NEW: Rename Topic Endpoint
  async renameTopic(examType: string, subject: string, oldTopic: string, newTopic: string) {
      const res = await fetchWithAuth(`${API_URL}/exams/rename-topic`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
          body: JSON.stringify({ examType, subject, oldTopic, newTopic })
      });
      if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to rename topic");
      }
      return await res.json();
  },

  // --- MISC & STATS ---
  async getBatches() { 
      const token = this.getToken(); 
      try { 
          const res = await fetchWithAuth(`${API_URL}/batches`, { headers: { 'Authorization': `Bearer ${token}` } }); 
          if (!res.ok) return []; 
          return await res.json(); 
      } catch (e) { return []; } 
  },

  async getStudents() { 
      const token = this.getToken(); 
      try { 
          const res = await fetchWithAuth(`${API_URL}/students`, { headers: { 'Authorization': `Bearer ${token}` } }); 
          if(!res.ok) return []; 
          return await res.json(); 
      } catch(e) { return []; } 
  },

  async getStats(exams: any[] = [], questions: any[] = [], studentCount: number = 0) { 
      let completedExams = 0;
      let upcomingExams = 0;
      const now = new Date();
      
      exams.forEach(e => {
          const scheduled = new Date(e.scheduledAt);
          if (scheduled > now) upcomingExams++;
          else completedExams++;
      });

      return { 
          totalExams: exams.length, 
          activeStudents: studentCount, 
          questionBanks: questions.length, 
          avgAttendance: 88,
          examsConducted: completedExams,
          upcomingExams: upcomingExams
      }; 
  }, 

  async getExamAnalytics(examId: string) { 
      const token = this.getToken(); 
      const res = await fetchWithAuth(`${API_URL}/exams/${examId}/analytics`, { headers: { 'Authorization': `Bearer ${token}` } }); 
      if (!res.ok) return []; 
      return await res.json(); 
  },

  async markAttendance(data: any) { 
      const token = this.getToken(); 
      const res = await fetchWithAuth(`${API_URL}/attendance/mark`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(data) }); 
      if (!res.ok) throw new Error('Attendance failed'); 
      return await res.json(); 
  },

  async getStudentsByBatch(batchId: string) { 
      const token = this.getToken(); 
      try { 
          const res = await fetchWithAuth(`${API_URL}/students`, { headers: { 'Authorization': `Bearer ${token}` } }); 
          if(!res.ok) return []; 
          const all = await res.json(); 
          return all.filter((s:any) => s.batchId === batchId || s.batch?.id === batchId); 
      } catch(e) { return []; } 
  },

  async getStudentAttempts(studentId: string) {
      const token = this.getToken();
      const res = await fetchWithAuth(`${API_URL}/exams/student-attempts?studentId=${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to get student attempts'); 
      return await res.json();
  }
};