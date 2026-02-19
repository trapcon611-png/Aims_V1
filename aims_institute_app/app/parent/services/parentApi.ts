const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const parentApi = {
  getToken() {
    if (typeof window === 'undefined') return '';
    const session = localStorage.getItem('parent_session');
    if (session) {
        try {
            const parsed = JSON.parse(session);
            return parsed.token || '';
        } catch (e) { return ''; }
    }
    return '';
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

  async getFinancials(token: string) { 
    const res = await fetch(`${API_URL}/parent/my-summary`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    }); 
    if (!res.ok) throw new Error('Failed to load data'); 
    return await res.json(); 
  },

  async getStudentResults(token: string, userId: string) {
      try {
        const res = await fetch(`${API_URL}/parent/student-attempts?studentId=${userId}`, { 
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(!res.ok) return [];
        return await res.json();
      } catch(e) { return []; }
  },

  // --- ADDED THIS MISSING METHOD ---
  async getNotices(token: string) {
      try {
        const res = await fetch(`${API_URL}/parent/notices`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(!res.ok) return [];
        return await res.json();
      } catch(e) { return []; }
  }
};