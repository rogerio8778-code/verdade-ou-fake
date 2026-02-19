
import { Lead } from '../types';

// Storage keys for local persistence
const LEADS_KEY = 'vf_leads_database';

/**
 * Internal helper to retrieve all leads from local storage.
 */
const getLeads = (): Lead[] => {
  try {
    const data = localStorage.getItem(LEADS_KEY);
    const parsed = data ? JSON.parse(data) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Erro ao recuperar leads:', e);
    return [];
  }
};

export const storageService = {
  /**
   * Saves a new lead email if it doesn't already exist in the database.
   * @param email The lead's email address.
   * @returns true if saved successfully, false otherwise.
   */
  saveLead: (email: string): boolean => {
    try {
      const leads = getLeads();
      if (leads.some(l => l.email === email)) return false;
      
      const newLead: Lead = {
        email,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(LEADS_KEY, JSON.stringify([...leads, newLead]));
      return true;
    } catch (e) {
      console.error('Erro ao salvar lead:', e);
      return false;
    }
  },

  /**
   * Returns the current list of leads collected.
   */
  getLeads,

  /**
   * Exports all collected leads as a JSON file.
   * Feedback (NPS) data is no longer included as the feature was removed in v1.3.
   */
  exportData: () => {
    try {
      const leads = getLeads();
      const data = { leads, exportDate: new Date().toISOString() };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `dados_verdade_ou_fake_${new Date().getTime()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (e) {
      console.error('Erro ao exportar dados:', e);
    }
  }
};