import api from '@/common/utils/api';

export interface MiniAppSummary {
  total: number;
  unique_sessions: number;
  by_event: { event: string; count: string }[];
  by_platform: { platform: string; count: string }[];
}

export interface MiniAppEvent {
  id: string;
  event: string;
  page: string | null;
  zalo_user_id: string | null;
  display_name: string | null;
  meta: Record<string, unknown> | null;
  platform: string;
  session_id: string | null;
  app_version: string | null;
  client_ts: string | null;
  created_at: string;
}

export const miniappApi = {
  getSummary: (from?: string, to?: string) =>
    api.get<MiniAppSummary>('/webhook/miniapp/summary', { params: { from, to } }),

  getRecentEvents: (limit = 50) =>
    api.get<MiniAppEvent[]>('/webhook/miniapp/events', { params: { limit } }),
};
