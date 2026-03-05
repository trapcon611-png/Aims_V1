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

  async getNotices(token: string) {
      try {
        const res = await fetch(`${API_URL}/parent/notices`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(!res.ok) return [];
        return await res.json();
      } catch(e) { return []; }
  },

  // --- NEW: RAZORPAY PAYMENT METHODS ---

  async createPaymentOrder(token: string, amount: number, receiptId: string) {
    const res = await fetch(`${API_URL}/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ amount, receiptId }),
    });
    if (!res.ok) throw new Error('Failed to create order');
    return await res.json();
  },

  async verifyPayment(token: string, paymentData: any) {
    const res = await fetch(`${API_URL}/payment/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(paymentData),
    });
    if (!res.ok) throw new Error('Payment verification failed');
    return await res.json();
  },

  async recordFeePayment(token: string, data: any) {
    const res = await fetch(`${API_URL}/finance/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        ...data,
        paymentMode: 'RAZORPAY',
        remarks: 'Paid via Parent Portal (Razorpay)',
      }),
    });
    if (!res.ok) throw new Error('Failed to record fee');
    return await res.json();
  }
};