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
      
      alert('Session Expired: Your security token is invalid or has expired. Please log in again.');
      window.location.reload(); 
    }
    throw new Error('Unauthorized');
  }
  return res;
};

// --- BULLETPROOF JSON PARSER ---
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
  
  async getStudents(page: number = 1, limit: number = 20, search: string = '', batch: string = '') { 
      try { 
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
          
          return await parseJsonSafely(res, { data: [], meta: { total: 0, totalPages: 0 } }); 
      } catch (e) { 
          return { data: [], meta: { total: 0, totalPages: 0 } }; 
      } 
  },

  async updateStudent(id: string, data: any) {
    const res = await fetchWithAuth(`${API_URL}/erp/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const errorData = await parseJsonSafely(res, { message: 'Failed to update student' });
        throw new Error(errorData.message || 'Failed to update student');
    }
    return await parseJsonSafely(res);
  },

  async deleteStudent(id: string) {
    const res = await fetchWithAuth(`${API_URL}/erp/students/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    if (!res.ok) {
        const errorData = await parseJsonSafely(res, { message: 'Failed to delete student' });
        throw new Error(errorData.message || 'Failed to delete student');
    }
    return await parseJsonSafely(res);
  },

  // --- BRANCHES ---
  async getBranches() {
      try {
          const res = await fetchWithAuth(`${API_URL}/erp/branches`, {
              headers: { 'Authorization': `Bearer ${this.getToken()}` }
          });
          if (!res.ok) return [];
          return await parseJsonSafely(res, []);
      } catch (e) { return []; }
  },

  async createBranch(data: any) {
      const res = await fetchWithAuth(`${API_URL}/erp/branches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
          body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create branch');
      return await parseJsonSafely(res);
  },

  async updateBranch(id: string, data: any) {
      const res = await fetchWithAuth(`${API_URL}/erp/branches/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
          body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update branch');
      return await parseJsonSafely(res);
  },

  async deleteBranch(id: string) {
      const res = await fetchWithAuth(`${API_URL}/erp/branches/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to delete branch');
      return await parseJsonSafely(res);
  },

  // --- BATCHES ---
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

  async deleteBatch(id: string) {
      const res = await fetchWithAuth(`${API_URL}/erp/batches/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to delete batch');
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

  async getPoolStatus() {
      try {
          const res = await fetchWithAuth(`${API_URL}/erp/security/pool-status`, {
              headers: { 'Authorization': `Bearer ${this.getToken()}` }
          });
          if (!res.ok) return { isUnlocked: false };
          return await parseJsonSafely(res, { isUnlocked: false });
      } catch (e) {
          return { isUnlocked: false };
      }
  },

  async deleteFeeRecord(id: string) {
      const res = await fetchWithAuth(`${API_URL}/erp/fees/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to delete fee record');
      return await parseJsonSafely(res);
  },

  async collectFee(data: { studentId: string; amount: number; remarks?: string; paymentMode?: string; transactionId?: string; date?: string; feeBreakdown?: any; bankName?: string }) { 
      const res = await fetchWithAuth(`${API_URL}/erp/fees`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` }, 
          body: JSON.stringify(data) 
      }); 
      if (!res.ok) throw new Error('Failed to record fee'); 
      return await parseJsonSafely(res); 
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

  async requestFeeEdit(feeId: string) {
      const res = await fetchWithAuth(`${API_URL}/erp/fees/${feeId}/request-edit`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${this.getToken()}` }
      });
      if (!res.ok) {
          const err = await parseJsonSafely(res, { message: 'Failed to request edit' });
          throw new Error(err.message || 'Failed to request edit');
      }
      return await parseJsonSafely(res);
  },

  async updateFeeRecord(id: string, data: any) {
      const res = await fetchWithAuth(`${API_URL}/erp/fees/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
          body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update fee record');
      return await parseJsonSafely(res);
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

  async updateEnquiryStatus(id: string, status: string, followUpCount?: number, newRemark?: string) { 
      const res = await fetchWithAuth(`${API_URL}/erp/enquiries/${id}/status`, { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` }, 
          body: JSON.stringify({ status, followUpCount, newRemark }) 
      }); 
      if (!res.ok) throw new Error('Failed to update enquiry'); 
      return await parseJsonSafely(res); 
  },

  async deleteEnquiry(id: string) {
      const res = await fetchWithAuth(`${API_URL}/erp/enquiries/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.getToken()}` }
      });
      if (!res.ok) {
          const errorData = await parseJsonSafely(res, { message: 'Failed to delete enquiry' });
          throw new Error(errorData.message || 'Failed to delete enquiry');
      }
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

  // --- NOTICES ---
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

  // --- ACADEMICS & ATTENDANCE ---
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
  },

  async getAttendanceStats(batchId: string, month?: number, year?: number) {
      try {
          let url = `${API_URL}/erp/academics/attendance?batchId=${batchId}`;
          if (month) url += `&month=${month}`;
          if (year) url += `&year=${year}`;

          const res = await fetchWithAuth(url, {
              headers: { 'Authorization': `Bearer ${this.getToken()}` }
          });
          if (!res.ok) return [];
          return await parseJsonSafely(res, []);
      } catch (e) {
          return [];
      }
  },

  async saveAttendance(data: any) {
      const res = await fetchWithAuth(`${API_URL}/erp/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` },
          body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to save attendance');
      return await parseJsonSafely(res);
  }, 

  // --- WHATSAPP COMMUNICATION HUB ---
  async broadcastWhatsappReminders(payload: { targets: any[], customText: string | null }) {
      const res = await fetchWithAuth(`${API_URL}/whatsapp/broadcast-reminders`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${this.getToken()}` 
          },
          body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
          const errorData = await parseJsonSafely(res, { message: 'Failed to dispatch WhatsApp messages to server' });
          throw new Error(errorData.message || 'Failed to dispatch WhatsApp messages to server');
      }
      
      return await parseJsonSafely(res);
  },
  
  async getWhatsappRules() {
      const res = await fetchWithAuth(`${API_URL}/whatsapp/rules`, {
          headers: { 'Authorization': `Bearer ${this.getToken()}` }
      });
      if (!res.ok) return null;
      return await parseJsonSafely(res);
  },
  
  async updateWhatsappRules(payload: { time: string, daysBefore: number, maxFollowUps: number }) {
      const res = await fetchWithAuth(`${API_URL}/whatsapp/rules`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.getToken()}`
          },
          body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to update automation rules');
      return await parseJsonSafely(res);
  },

  // ✨ NEW: WhatsApp Status API
  async getWhatsappStatus() {
      try {
          const res = await fetchWithAuth(`${API_URL}/whatsapp/status`, {
              headers: { 'Authorization': `Bearer ${this.getToken()}` }
          });
          if (!res.ok) return null;
          return await parseJsonSafely(res);
      } catch (e) {
          return null;
      }
  },

  // ✨ NEW: WhatsApp QR API
  async getWhatsappQr() {
      try {
          const res = await fetchWithAuth(`${API_URL}/whatsapp/qr`, {
              headers: { 'Authorization': `Bearer ${this.getToken()}` }
          });
          if (!res.ok) return null;
          return await parseJsonSafely(res);
      } catch (e) {
          return null;
      }
  },
  // ✨ NEW: WhatsApp Reset API
  async resetWhatsappSession() {
      const res = await fetchWithAuth(`${API_URL}/whatsapp/reset`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.getToken()}` }
      });
      if (!res.ok) throw new Error('Failed to reset WhatsApp session');
      return await parseJsonSafely(res);
  }
};