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
      // Clear all possible token names just to be safe
      localStorage.removeItem('student_token');
      localStorage.removeItem('parent_token');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('director_session');
      
      alert('Session Expired: Your security token is invalid or has expired. Please log in again.');
      window.location.reload(); // ✅ THE FIX: Reloads the current page instead of kicking to root
    }
    throw new Error('Unauthorized');
  }
  return res;
};

// --- BULLETPROOF JSON PARSER ---
// Safely prevents "Unexpected end of JSON input" crashes system-wide
const parseJsonSafely = async (res: Response, fallback: any = null) => {
    const text = await res.text();
    if (!text || text.trim() === '') return fallback;
    try {
        return JSON.parse(text);
    } catch (e) {
        return fallback;
    }
};

export const directorApi = {
  getToken() {
    if (typeof window === 'undefined') return '';
    const session = localStorage.getItem('director_session');
    if (session) {
        try {
            const parsed = JSON.parse(session);
            return parsed.token || '';
        } catch (e) { return ''; }
    }
    return '';
  },

  async login(username: string, password: string) {
    const response = await fetch(`${API_URL}/auth/login`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ username, password }) 
    });
    if (!response.ok) throw new Error('Invalid Credentials');
    
    const data = await parseJsonSafely(response);
    if (!data) throw new Error('Invalid Credentials');
    
    data.token = data.access_token || data.token || data.accessToken;
    return data;
  },

  // --- ACADEMIC & ADMISSIONS ---
  async registerStudent(data: any) {
    const res = await fetchWithAuth(`${API_URL}/erp/admissions`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` }, 
        body: JSON.stringify(data) 
    });
    
    // 1. If backend correctly threw a 409 ConflictException, extract the real error message
    if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = 'Admission failed. Please check the data and try again.';
        try {
            const errObj = JSON.parse(errorText);
            if (errObj.message) errorMessage = errObj.message;
        } catch (e) {
            if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
    }

    // 2. CRITICAL FALLBACK: If the backend returned a 201 Success but the body is completely empty,
    // it means a duplicate was caught but 'return null' was triggered! We catch the empty text here.
    const text = await res.text();
    if (!text || text.trim() === '') {
        throw new Error('Student ID or Parent ID already exists! Please use unique credentials.');
    }

    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
  },
  
  // 🚀 UPGRADED: Server-Side Pagination & Search
  async getStudents(page: number = 1, limit: number = 20, search: string = '', batch: string = '') { 
      try { 
          // Build the query string securely
          const queryParams = new URLSearchParams({
              page: page.toString(),
              limit: limit.toString(),
              search: search,
              batch: batch
          }).toString();

          const res = await fetchWithAuth(`${API_URL}/erp/students?${queryParams}`, { 
              headers: { 'Authorization': `Bearer ${this.getToken()}` } 
          }); 
          
          if (!res.ok) return { data: [], meta: { total: 0, totalPages: 0 } }; 
          
          // Return the full paginated object (data + meta)
          return await parseJsonSafely(res, { data: [], meta: { total: 0, totalPages: 0 } }); 
      } catch (e) { 
          return { data: [], meta: { total: 0, totalPages: 0 } }; 
      } 
  },

  async getBatches() { 
      try { 
          const res = await fetchWithAuth(`${API_URL}/erp/batches`, { 
              headers: { 'Authorization': `Bearer ${this.getToken()}` } 
          }); 
          if (!res.ok) return []; 
          return await parseJsonSafely(res, []);
      } catch (e) { 
          return []; 
      } 
  },

  async createBatch(data: any) { 
      const res = await fetchWithAuth(`${API_URL}/erp/batches`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` }, 
          body: JSON.stringify(data) 
      }); 
      if (!res.ok) throw new Error('Failed to save batch'); 
      return await parseJsonSafely(res); 
  },
  
  async updateBatch(id: string, data: any) {
      const res = await fetchWithAuth(`${API_URL}/erp/batches/${id}`, { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` }, 
          body: JSON.stringify(data) 
      }); 
      if (!res.ok) throw new Error('Failed to update batch'); 
      return await parseJsonSafely(res); 
  },

  // --- FINANCE ---
  async getExpenses() { 
      try { 
          const res = await fetchWithAuth(`${API_URL}/erp/expenses`, { 
              headers: { 'Authorization': `Bearer ${this.getToken()}` }
          }); 
          if (!res.ok) return []; 
          const data = await parseJsonSafely(res, []); 
          return data.map((d: any) => ({ ...d, date: new Date(d.date).toLocaleDateString() })); 
      } catch (e) { 
          return []; 
      } 
  },

  async createExpense(data: any) { 
      const res = await fetchWithAuth(`${API_URL}/erp/expenses`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` }, 
          body: JSON.stringify(data) 
      }); 
      if (!res.ok) throw new Error('Failed to save expense'); 
      return await parseJsonSafely(res); 
  },

  async deleteExpense(id: string) { 
      const res = await fetchWithAuth(`${API_URL}/erp/expenses/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.getToken()}` }
      }); 
      if (!res.ok) throw new Error('Failed to delete expense'); 
      return await parseJsonSafely(res); 
  },
  
  async collectFee(data: any) { 
      const res = await fetchWithAuth(`${API_URL}/erp/fees`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` }, 
          body: JSON.stringify(data) 
      }); 
      if (!res.ok) throw new Error('Failed to record fee'); 
      return await parseJsonSafely(res); 
  },

  async getSummary() { 
      try { 
          const res = await fetchWithAuth(`${API_URL}/erp/summary`, { 
              headers: { 'Authorization': `Bearer ${this.getToken()}` }
          }); 
          if (!res.ok) return { revenue: 0, expenses: 0, profit: 0 }; 
          const data = await parseJsonSafely(res, { revenue: 0, expenses: 0, profit: 0 }); 
          return { revenue: data.revenue || 0, expenses: data.expenses || 0, profit: data.profit || 0 }; 
      } catch (e) { 
          return { revenue: 0, expenses: 0, profit: 0 }; 
      } 
  },

  async getFeeHistory(token?: string) {
      try {
          const authToken = token || this.getToken();
          const res = await fetchWithAuth(`${API_URL}/erp/fees`, { 
              headers: { 'Authorization': `Bearer ${authToken}` } 
          });
          if (!res.ok) return [];
          return await parseJsonSafely(res, []);
      } catch (e) { 
          return []; 
      }
  },

  // --- CRM ---
  async getEnquiries() { 
      try { 
          const res = await fetchWithAuth(`${API_URL}/erp/enquiries`, { 
              headers: { 'Authorization': `Bearer ${this.getToken()}` } 
          }); 
          if (!res.ok) return []; 
          return await parseJsonSafely(res, []); 
      } catch (e) { 
          return []; 
      } 
  },

  async createEnquiry(data: any) { 
      const res = await fetchWithAuth(`${API_URL}/erp/enquiries`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` }, 
          body: JSON.stringify(data) 
      }); 
      if (!res.ok) throw new Error('Failed to create enquiry'); 
      return await parseJsonSafely(res); 
  },

  async updateEnquiryStatus(id: string, status: string, followUpCount?: number) { 
      const res = await fetchWithAuth(`${API_URL}/erp/enquiries/${id}/status`, { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` }, 
          body: JSON.stringify({ status, followUpCount }) 
      }); 
      if (!res.ok) throw new Error('Failed to update enquiry'); 
      return await parseJsonSafely(res); 
  },

  // --- CONTENT ---
  async getResources() { 
      try { 
          const res = await fetchWithAuth(`${API_URL}/erp/resources`, { 
              headers: { 'Authorization': `Bearer ${this.getToken()}` } 
          }); 
          if (!res.ok) return []; 
          return await parseJsonSafely(res, []); 
      } catch (e) { 
          return []; 
      } 
  },

  async createResource(data: any) { 
      const res = await fetchWithAuth(`${API_URL}/erp/resources`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` }, 
          body: JSON.stringify(data) 
      }); 
      if (!res.ok) throw new Error('Failed to create resource'); 
      return await parseJsonSafely(res); 
  },

  async deleteResource(id: string) { 
      await fetchWithAuth(`${API_URL}/erp/resources/${id}`, { 
          method: 'DELETE', 
          headers: { 'Authorization': `Bearer ${this.getToken()}` } 
      }); 
  },

  async getNotices() { 
      try { 
          const res = await fetchWithAuth(`${API_URL}/erp/notices`, { 
              headers: { 'Authorization': `Bearer ${this.getToken()}` } 
          }); 
          if (!res.ok) return []; 
          return await parseJsonSafely(res, []); 
      } catch (e) { 
          return []; 
      } 
  },

  async createNotice(data: any) { 
      const res = await fetchWithAuth(`${API_URL}/erp/notices`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` }, 
          body: JSON.stringify(data) 
      }); 
      if (!res.ok) throw new Error('Failed to create notice'); 
      return await parseJsonSafely(res); 
  },

  async deleteNotice(id: string) { 
      await fetchWithAuth(`${API_URL}/erp/notices/${id}`, { 
          method: 'DELETE', 
          headers: { 'Authorization': `Bearer ${this.getToken()}` } 
      }); 
  },

  // --- ACADEMICS ---
  async getExams() { 
      try { 
          const res = await fetchWithAuth(`${API_URL}/erp/exams`, { 
              headers: { 'Authorization': `Bearer ${this.getToken()}` } 
          }); 
          if (!res.ok) return []; 
          return await parseJsonSafely(res, []); 
      } catch (e) { 
          return []; 
      } 
  }
};