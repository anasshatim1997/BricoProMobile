const BASE_URL = 'http://192.168.1.135:8080/api/v1';

export interface Bid {
  id:             number;
  workerId:       number;
  workerName:     string;
  workerRating:   number;
  workerMissions: number;
  isPremium:      boolean;
  offeredPrice:   number;
  etaMinutes:     number;
  message:        string;
  createdAt:      string;
}

export const bidsApi = {
  getForTask: async (taskId: number, token: string): Promise<Bid[]> => {
    try {
      const res = await fetch(`${BASE_URL}/tasks/${taskId}/bids`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404 || !res.ok) return [];
      return res.json() as Promise<Bid[]>;
    } catch {
      return [];
    }
  },

  submit: (
    taskId: number,
    token:  string,
    body:   { offeredPrice: number; etaMinutes: number; message: string },
  ) =>
    fetch(`${BASE_URL}/tasks/${taskId}/bids`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    }).then(r => r.json()),

  accept: (taskId: number, bidId: number, token: string) =>
    fetch(`${BASE_URL}/tasks/${taskId}/bids/${bidId}/accept`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
};