// --- What is this file? ---
// Every time the frontend needs data from the backend, it goes through this file.
// This keeps all the "network communication" in one place. If the server URL ever
// changes, you update it once here instead of hunting through every component.

import axios from 'axios';
import type { Item, SearchResult, MediaType, OwnedStatus } from './types';

// axios.create() with no baseURL means all requests use a relative path like
// "/items". In development, Vite's proxy (in vite.config.ts) forwards those
// requests to the backend on port 3001. In production, the backend serves
// everything from the same origin, so relative paths just work.
const api = axios.create();

// ─── Items ────────────────────────────────────────────────────────────────────

export interface ItemFilters {
  type?: MediaType;
  status_owned?: OwnedStatus;
  status_consumed?: 'consumed' | 'not_yet';
  genre?: string;
  q?: string;
}

export async function getItems(filters: ItemFilters = {}): Promise<Item[]> {
  const { data } = await api.get<Item[]>('/items', { params: filters });
  return data;
}

export async function getItem(id: string): Promise<Item> {
  const { data } = await api.get<Item>(`/items/${id}`);
  return data;
}

export async function createItem(payload: Omit<Item, 'id' | 'created_at' | 'updated_at'>): Promise<Item> {
  const { data } = await api.post<Item>('/items', payload);
  return data;
}

export async function updateItem(id: string, patch: Partial<Item>): Promise<Item> {
  const { data } = await api.put<Item>(`/items/${id}`, patch);
  return data;
}

export async function deleteItem(id: string): Promise<void> {
  await api.delete(`/items/${id}`);
}

export async function checkDuplicate(params: {
  api_id: string;
  api_source: string;
  title: string;
  year: number | null;
  type: MediaType;
  platform?: string;
}): Promise<Item | null> {
  try {
    const { data } = await api.get<Item>('/items/duplicate-check', { params });
    return data;
  } catch {
    return null;
  }
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

export async function searchApi(type: MediaType, q: string): Promise<SearchResult[]> {
  const { data } = await api.get<SearchResult[]>('/lookup/search', { params: { type, q } });
  return data;
}
