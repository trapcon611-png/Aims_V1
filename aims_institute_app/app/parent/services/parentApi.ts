// --- SMART API RESOLVER ---
// Automatically figures out if you are on localhost, an IP, or a domain, 
// and routes the backend call to port 3001 of that exact same host.
const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
      // e.g., if on http://76.13.247.225:3000, returns http://76.13.247.225:3001
      return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
};

const API_URL = getApiUrl();

// --- 401 INTERCEPTOR ---
const fetchWithAuth = async (url: string, options: any = {}) => {
  const res = await fetch(url, options);
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('parent_session');
      alert('Session Expired: Your security token is invalid or has expired. Please log in again.');
      window.location.href = '/';
    }
    throw new Error('Unauthorized');
  }
  return res;
};

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
    const data = await res.json(); 
    
    // --- CRITICAL 401 FIX ---
    data.token = data.access_token || data.token || data.accessToken;
    
    return data;
  },

  async getFinancials(token: string) { 
    const res = await fetchWithAuth(`${API_URL}/parent/my-summary`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    }); 
    if (!res.ok) throw new Error('Failed to load data'); 
    return await res.json(); 
  },

  async getStudentResults(token: string, userId: string) {
      try {
        const res = await fetchWithAuth(`${API_URL}/parent/student-attempts?studentId=${userId}`, { 
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(!res.ok) return [];
        return await res.json();
      } catch(e) { return []; }
  },

  async getNotices(token: string) {
      try {
        const res = await fetchWithAuth(`${API_URL}/parent/notices`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(!res.ok) return [];
        return await res.json();
      } catch(e) { return []; }
  },

  // --- RAZORPAY PAYMENT METHODS ---

  async createPaymentOrder(token: string, amount: number, receiptId: string) {
    const res = await fetchWithAuth(`${API_URL}/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ amount, receiptId }),
    });
    if (!res.ok) throw new Error('Failed to create order');
    return await res.json();
  },

  // UPDATED: Now passes studentId and amount so the backend can record it securely
  async verifyPayment(token: string, paymentData: { razorpayOrderId: string, razorpayPaymentId: string, signature: string, studentId: string, amount: number }) {
    const res = await fetchWithAuth(`${API_URL}/payment/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(paymentData),
    });
    if (!res.ok) throw new Error('Payment verification failed');
    return await res.json();
  }

  // NOTE: recordFeePayment() has been deleted! The backend creates the fee record automatically upon verification.
};