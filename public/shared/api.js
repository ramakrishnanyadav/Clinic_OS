const API_BASE = 'http://localhost:3000/api';

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export const api = {
  config: () => request('/config'),
  queue: {
    init: (clinicId, doctorId) => request('/queue/init', { method: 'POST', body: JSON.stringify({ clinicId, doctorId }) }),
    getToday: (clinicId, doctorId) => request(`/queue/today/${doctorId}?clinicId=${clinicId}`),
    callNext: (queueId) => request('/queue/call-next', { method: 'PATCH', body: JSON.stringify({ queueId }) })
  },
  patients: {
    register: (data) => request('/patients', { method: 'POST', body: JSON.stringify(data) }),
    lookup: (phone, clinicId) => request(`/patients/lookup?phone=${phone}&clinicId=${clinicId}`),
    addEmergency: (queueId, name) => request('/patients/emergency', { method: 'POST', body: JSON.stringify({ queueId, name }) }),
    setLeaveMode: (id, phone, notifyAtToken) => request(`/patients/${id}/leave-mode`, { method: 'PATCH', body: JSON.stringify({ phone, notifyAtToken }) }),
    markDone: (id) => request(`/patients/${id}/done`, { method: 'PATCH' })
  },
  stats: {
    getToday: (clinicId) => request(`/stats/today?clinicId=${clinicId}`)
  }
};
