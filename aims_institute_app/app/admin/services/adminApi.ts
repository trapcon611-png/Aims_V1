const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://76.13.247.225:3001';
const AI_API_URL = 'https://prishaa-question-paper.hf.space';

export const adminApi = {
  getToken() {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('admin_token') || '';
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

  async seedSystem() {
    const token = this.getToken();
    try {
        const res = await fetch(`${API_URL}/erp/seed`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Seeding failed');
        return await res.json();
    } catch (e) { throw e; }
  },

  // --- AI & QUESTION BANK ---

  async searchQuestionsExternal(query: string, subject: string, difficulty: string) {
    const payload = {
        query: query || "",
        limit: 50,
        use_llm_transform: false
    };
    try {
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
      const res = await fetch(`${API_URL}/erp/questions`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(questionData)
    });
    if (!res.ok) throw new Error('Failed to save question');
    return await res.json();
  },

  async getInternalQuestions() {
    const token = this.getToken();
    try {
        const res = await fetch(`${API_URL}/erp/questions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data.data || []); 
    } catch (e) { return []; }
  },

  async generateAiPaper(payload: any) {
    // 1. Call External AI API
    const res = await fetch(`${AI_API_URL}/generate-paper`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
       const errText = await res.text().catch(() => res.statusText);
       throw new Error(`AI Service Error (${res.status}): ${errText}`);
    }
    
    const data = await res.json();
    
    // Process response locally
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
    const res = await fetch(`${API_URL}/erp/exams`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create exam');
    return await res.json();
  },
  
  async importQuestionsToExam(examId: string, questions: any[]) {
     const token = this.getToken();
     // Route: /erp/exams/:id/import
     const res = await fetch(`${API_URL}/erp/exams/${examId}/import`, {
       method: 'POST',
       headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
       },
       body: JSON.stringify({ questions })
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
        const res = await fetch(`${API_URL}/erp/exams`, { headers: { 'Authorization': `Bearer ${token}` } }); 
        if (!res.ok) return []; 
        return await res.json(); 
    } catch (e) { return []; }
  },

  async deleteExam(id: string) {
    const token = this.getToken();
    const res = await fetch(`${API_URL}/erp/exams/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to delete exam'); 
    return await res.json();
  },

  async getExamById(id: string) {
    const token = this.getToken();
    const res = await fetch(`${API_URL}/erp/exams/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to fetch exam details'); 
    return await res.json();
  },

  // --- MISC & STATS ---

  async getBatches() { 
      const token = this.getToken(); 
      try { 
          const res = await fetch(`${API_URL}/erp/batches`, { headers: { 'Authorization': `Bearer ${token}` } }); 
          if (!res.ok) return []; 
          return await res.json(); 
      } catch (e) { return []; } 
  },

  async getStudents() { 
      const token = this.getToken(); 
      try { 
          const res = await fetch(`${API_URL}/erp/students`, { headers: { 'Authorization': `Bearer ${token}` } }); 
          if(!res.ok) return []; 
          return await res.json(); 
      } catch(e) { return []; } 
  },

  // FIXED: getStats now accepts parameters
  async getStats(exams: any[] = [], questions: any[] = [], studentCount: number = 0) { 
      return { 
          totalExams: exams.length, 
          activeStudents: studentCount, 
          questionBanks: questions.length, 
          avgAttendance: 88 
      }; 
  }, 

  async getExamAnalytics(examId: string) { 
      const token = this.getToken(); 
      const res = await fetch(`${API_URL}/erp/academics/results?examId=${examId}`, { headers: { 'Authorization': `Bearer ${token}` } }); 
      if (!res.ok) return []; 
      return await res.json(); 
  },

  async markAttendance(data: any) { 
      const token = this.getToken(); 
      const res = await fetch(`${API_URL}/erp/attendance`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(data) }); 
      if (!res.ok) throw new Error('Attendance failed'); 
      return await res.json(); 
  },

  async getStudentsByBatch(batchId: string) { 
      const token = this.getToken(); 
      try { 
          const res = await fetch(`${API_URL}/erp/students`, { headers: { 'Authorization': `Bearer ${token}` } }); 
          if(!res.ok) return []; 
          const all = await res.json(); 
          return all.filter((s:any) => s.batchId === batchId || s.batch?.id === batchId); 
      } catch(e) { return []; } 
  },

  async getStudentAttempts(studentId: string) {
      const token = this.getToken();
      const res = await fetch(`${API_URL}/erp/attempts/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed'); 
      return await res.json();
  }
};