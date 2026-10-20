const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || 'The request could not be completed.');
  }

  return payload;
}

export const api = {
  login: (credentials) => request('/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  getClients: async () => (await request('/clients')).data,
  saveClient: async (client) => {
    const result = await request(client.id ? `/clients/${client.id}` : '/clients', {
      method: client.id ? 'PUT' : 'POST',
      body: JSON.stringify(client),
    });
    return result.data;
  },
  deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),
  getFssaiRecords: async () => (await request('/fssai')).data,
  saveFssaiRecord: async (record) => {
    const result = await request(record.id ? `/fssai/${record.id}` : '/fssai', {
      method: record.id ? 'PUT' : 'POST',
      body: JSON.stringify(record),
    });
    return result.data;
  },
  deleteFssaiRecord: (id) => request(`/fssai/${id}`, { method: 'DELETE' }),
  getWhatsappLogs: async () => (await request('/whatsapp/logs')).logs,
  createWhatsappLog: async (log) => (await request('/whatsapp/log', {
    method: 'POST',
    body: JSON.stringify(log),
  })).log,
  clearWhatsappLogs: () => request('/whatsapp/logs', { method: 'DELETE' }),
};