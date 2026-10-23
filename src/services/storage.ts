const FAVORITES_KEY = 'datanews_kg_favorites_v1';

/** Избранное хранится только в браузере посетителя */
export class StorageService {
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
    const next = favs.includes(id) ? favs.filter((item) => item !== id) : [...favs, id];
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      /* приватный режим */
    }
    return next;
  }
}
