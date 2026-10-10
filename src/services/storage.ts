import { Announcement, CategoryId, CityId, AnnouncementStatus } from '../types';
import { INITIAL_ANNOUNCEMENTS } from '../data/initialAnnouncements';

const STORAGE_KEY = 'datanews_kg_announcements_2026_v1';
const FAVORITES_KEY = 'datanews_kg_favorites_v1';
const ADMIN_AUTH_KEY = 'datanews_kg_admin_auth_v1';

export class StorageService {
  // Get all announcements
  static getAnnouncements(): Announcement[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ANNOUNCEMENTS));
        return INITIAL_ANNOUNCEMENTS;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If stored data has legacy 2025 dates, upgrade to fresh 2026 dataset
        const hasLegacy2025 = parsed.some((item: any) => typeof item.startDate === 'string' && item.startDate.includes('2025'));
        if (hasLegacy2025) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ANNOUNCEMENTS));
          return INITIAL_ANNOUNCEMENTS;
        }
        return parsed;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ANNOUNCEMENTS));
      return INITIAL_ANNOUNCEMENTS;
    } catch (e) {
      console.error('Failed to load announcements from localStorage', e);
      return INITIAL_ANNOUNCEMENTS;
    }
  }

  // Save all announcements
  static saveAnnouncements(items: Announcement[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save announcements to localStorage', e);
    }
  }

  // Get by ID
  static getAnnouncementById(id: string): Announcement | undefined {
    const list = this.getAnnouncements();
    return list.find((item) => item.id === id);
  }

  // Create new announcement
  static createAnnouncement(item: Omit<Announcement, 'id' | 'publishedAt' | 'updatedAt'>): Announcement {
    const list = this.getAnnouncements();
    const now = new Date().toISOString();
    const newId = 'ann-' + Date.now();
    const newAnnouncement: Announcement = {
      ...item,
      id: newId,
      publishedAt: now,
      updatedAt: now,
    };
    list.unshift(newAnnouncement);
    this.saveAnnouncements(list);
    return newAnnouncement;
  }

  // Update existing announcement
  static updateAnnouncement(id: string, updates: Partial<Announcement>): Announcement | null {
    const list = this.getAnnouncements();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const updated: Announcement = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    this.saveAnnouncements(list);
    return updated;
  }

  // Delete announcement
  static deleteAnnouncement(id: string): boolean {
    const list = this.getAnnouncements();
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length !== list.length) {
      this.saveAnnouncements(filtered);
      return true;
    }
    return false;
  }

  // Change announcement status (e.g. active -> archived)
  static setStatus(id: string, status: AnnouncementStatus): Announcement | null {
    return this.updateAnnouncement(id, { status });
  }

  // Reset to default sample announcements
  static resetToDefaults(): Announcement[] {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ANNOUNCEMENTS));
    return INITIAL_ANNOUNCEMENTS;
  }

  // Favorites
  static getFavorites(): string[] {
    try {
      const data = localStorage.getItem(FAVORITES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static toggleFavorite(id: string): string[] {
    const favs = this.getFavorites();
    const index = favs.indexOf(id);
    let next: string[];
    if (index > -1) {
      next = favs.filter((item) => item !== id);
    } else {
      next = [...favs, id];
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    return next;
  }

  // Admin Auth
  static isAdminAuthenticated(): boolean {
    return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  }

  static loginAdmin(password: string): boolean {
    // Demo admin password: 'admin' or 'admin123'
    if (password === 'admin123' || password === 'admin' || password === 'datanews') {
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
      return true;
    }
    return false;
  }

  static logoutAdmin(): void {
    localStorage.removeItem(ADMIN_AUTH_KEY);
  }
}
