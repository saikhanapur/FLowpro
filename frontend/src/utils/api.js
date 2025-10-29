import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const API = `${BACKEND_URL}/api`;

export const api = {
  // Process endpoints
  parseProcess: async (text, inputType, additionalContext = null) => {
    const res = await axios.post(`${API}/process/parse`, { 
      text, 
      inputType,
      additionalContext 
    });
    return res.data;
  },

  createProcess: async (process) => {
    const res = await axios.post(`${API}/process`, process);
    return res.data;
  },

  getProcesses: async () => {
    const res = await axios.get(`${API}/process`);
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
  }
};
