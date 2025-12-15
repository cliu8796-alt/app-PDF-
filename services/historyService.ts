
import { HistoryItem } from '../types';

const STORAGE_KEY = 'pdf_merger_history';
const MAX_HISTORY_ITEMS = 50;

export const getHistory = (): HistoryItem[] => {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('Failed to load history', e);
    return [];
  }
};

export const addHistoryItem = (item: HistoryItem): HistoryItem[] => {
  try {
    const current = getHistory();
    // 新的在最前，限制数量
    const updated = [item, ...current].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save history', e);
    return [];
  }
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const deleteHistoryItem = (id: string): HistoryItem[] => {
    const current = getHistory();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
};
