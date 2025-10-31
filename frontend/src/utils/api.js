import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const API = `${BACKEND_URL}/api`;

// Configure axios to always send credentials (cookies)
axios.defaults.withCredentials = true;

// Add request interceptor to include token from localStorage if available
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const api = {
  // Process endpoints
  analyzeDocument: async (text, inputType) => {
    const res = await axios.post(`${API}/process/analyze`, { 
      text, 
      inputType
    });
    return res.data;
  },

  parseProcess: async (text, inputType, additionalContext = null, contextAnswers = null) => {
    const res = await axios.post(`${API}/process/parse`, { 
      text, 
      inputType,
      additionalContext,
      contextAnswers
    });
    return res.data;
  },

  createProcess: async (process) => {
    const res = await axios.post(`${API}/process`, process);
    return res.data;
  },

  getProcesses: async (workspaceId = null) => {
    const params = workspaceId ? `?workspace_id=${workspaceId}` : '';
    const res = await axios.get(`${API}/process${params}`);
    return res.data;
  },

  searchProcesses: async (query, workspaceId = null, status = null) => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (workspaceId) params.append('workspace_id', workspaceId);
    if (status) params.append('status', status);
    
    const queryString = params.toString();
    const url = `${API}/process/search${queryString ? '?' + queryString : ''}`;
    console.log('🌐 Search API call:', url);
    
    const res = await axios.get(url);
    console.log('🌐 Search API response:', res.data);
    return res.data;
  },

  getProcess: async (id) => {
    const res = await axios.get(`${API}/process/${id}`);
    return res.data;
  },

  updateProcess: async (id, process) => {
    const res = await axios.put(`${API}/process/${id}`, process);
    return res.data;
  },

  deleteProcess: async (id) => {
    const res = await axios.delete(`${API}/process/${id}`);
    return res.data;
  },

  publishProcess: async (id) => {
    const res = await axios.patch(`${API}/process/${id}/publish`);
    return res.data;
  },

  unpublishProcess: async (id) => {
    const res = await axios.patch(`${API}/process/${id}/unpublish`);
    return res.data;
  },

  // Process Intelligence
  getProcessIntelligence: async (id) => {
    const res = await axios.get(`${API}/process/${id}/intelligence`);
    return res.data;
  },

  // Workspace APIs
  getWorkspaces: async () => {
    const res = await axios.get(`${API}/workspaces`);
    return res.data;
  },

  createWorkspace: async (workspace) => {
    const res = await axios.post(`${API}/workspaces`, workspace);
    return res.data;
  },

  updateWorkspace: async (id, workspace) => {
    const res = await axios.put(`${API}/workspaces/${id}`, workspace);
    return res.data;
  },

  deleteWorkspace: async (id) => {
    const res = await axios.delete(`${API}/workspaces/${id}`);
    return res.data;
  },

  moveProcessToWorkspace: async (processId, workspaceId) => {
    const res = await axios.patch(`${API}/process/${processId}/move`, { workspaceId });
    return res.data;
  },

  generateIdealState: async (id) => {
    const res = await axios.post(`${API}/process/${id}/ideal-state`);
    return res.data;
  },

  // Chat endpoint
  chat: async (history, message) => {
    const res = await axios.post(`${API}/chat`, { history, message });
    return res.data;
  },

  // Comment endpoints
  createComment: async (comment) => {
    const res = await axios.post(`${API}/comment`, comment);
    return res.data;
  },

  getComments: async (processId) => {
    const res = await axios.get(`${API}/comment/${processId}`);
    return res.data;
  },

  // Upload endpoint
  uploadDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${API}/upload`, formData);
    return res.data;
  },

  // Transcribe audio endpoint
  transcribeAudio: async (audioBlob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    const res = await axios.post(`${API}/transcribe`, formData);
    return res.data;
  },

  // Authentication endpoints
  signup: async (email, password, name) => {
    const res = await axios.post(`${API}/auth/signup`, { email, password, name });
    return res.data;
  },

  login: async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password }, {
      withCredentials: true  // Important for cookies
    });
    return res.data;
  },

  googleSession: async (sessionId) => {
    const res = await axios.post(`${API}/auth/google/session`, { session_id: sessionId }, {
      withCredentials: true
    });
    return res.data;
  },

  getMe: async () => {
    const res = await axios.get(`${API}/auth/me`, {
      withCredentials: true
    });
    return res.data;
  },

  logout: async () => {
    const res = await axios.post(`${API}/auth/logout`, {}, {
      withCredentials: true
    });
    return res.data;
  },

  // Share endpoints
  createShare: async (processId, accessLevel, expiresInDays = null) => {
    const res = await axios.post(`${API}/process/${processId}/share`, {
      accessLevel,
      expiresInDays
    });
    return res.data;
  },

  getShares: async (processId) => {
    const res = await axios.get(`${API}/process/${processId}/shares`);
    return res.data;
  },

  revokeShare: async (token) => {
    const res = await axios.delete(`${API}/share/${token}`);
    return res.data;
  },

  getSharedProcess: async (token) => {
    const res = await axios.get(`${API}/view/${token}`);
    return res.data;
  },

  // Node editing
  updateNode: async (processId, nodeId, nodeData) => {
    const res = await axios.patch(`${API}/process/${processId}/node/${nodeId}`, nodeData);
    return res.data;
  },

  reorderNodes: async (processId, nodeIds) => {
    const res = await axios.patch(`${API}/process/${processId}/reorder`, { nodeIds });
    return res.data;
  },

  addNode: async (processId, nodeData) => {
    const res = await axios.post(`${API}/process/${processId}/node`, nodeData);
    return res.data;
  },

  deleteNode: async (processId, nodeId) => {
    const res = await axios.delete(`${API}/process/${processId}/node/${nodeId}`);
    return res.data;
  },

  // AI Refinement
  refineProcess: async (processId, message) => {
    const res = await axios.post(`${API}/process/${processId}/refine`, { message });
    return res.data;
  }
};
