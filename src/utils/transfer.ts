/**
 * «Перенос публикаций»: разбор файла резервной копии в браузере и деление на части для отправки на сервер.
 * Правило отбора то же, что на сервере (api/_lib/transfer.ts): только настоящие одобренные публикации.
 */
type Hash = Record<string, string>;
export interface TransferPlan {
  items: Hash;
  images: Hash;
  hidden: Hash;
  checked: Hash;
  weather: { official?: string; days?: string };
  /** сколько публикаций в файле и сколько не подходит (тест, черновик, отклонено, снято) */
  total: number;
  excluded: number;
  /** фото, на которые ссылаются публикации, но их нет в файле (копия скачана без фото) */
  missingImages: number;
}

const SKIP_STATUS = ['pending', 'rejected', 'withdrawn'];

export const isTransferable = (raw: string): boolean => {
  try {
    const a = JSON.parse(raw) as Record<string, unknown>;
    const title = a.title as { ru?: string } | undefined;
    if (!a || typeof a.id !== 'string' || !title?.ru || typeof a.startDate !== 'string' || typeof a.category !== 'string') return false;
    if (a.testMaterial) return false;
    return !SKIP_STATUS.includes(String(a.moderationStatus || ''));
  } catch {
    return false;
  }
};

const imageIdsOf = (raw: string): string[] => {
  const ids = new Set<string>();
  for (const m of raw.matchAll(/\/api\/image\?id=(img-[A-Za-z0-9_-]+)/g)) ids.add(m[1]);
  return [...ids];
};

const hash = (v: unknown): Hash => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Hash) : {});

export const planTransfer = (backup: unknown): TransferPlan => {
  const b = backup as { format?: string; data?: Record<string, unknown> };
  if (!b || b.format !== 'datanews-backup' || !b.data) throw new Error('Это не файл резервной копии DataNews');
  const ann = hash(b.data['dn:ann']);
  const allImages = hash(b.data['dn:img']);
  const items: Hash = {};
  const images: Hash = {};
  let missingImages = 0;
  for (const [id, raw] of Object.entries(ann)) {
    if (!isTransferable(raw)) continue;
    items[id] = raw;
    for (const img of imageIdsOf(raw)) {
      if (allImages[img]) images[img] = allImages[img];
      else missingImages++;
    }
  }
  const total = Object.keys(ann).length;
  const official = typeof b.data['dn:weather:official'] === 'string' ? (b.data['dn:weather:official'] as string) : undefined;
  const days = typeof b.data['dn:weather:official:days'] === 'string' ? (b.data['dn:weather:official:days'] as string) : undefined;
  return {
    items,
    images,
    hidden: hash(b.data['dn:ann:hidden']),
    checked: hash(b.data['dn:ann:checked']),
    weather: { official, days },
    total,
    excluded: total - Object.keys(items).length,
    missingImages,
  };
};

/** Делит словарь на части, каждая не больше maxChars (по длине JSON), чтобы запрос не превышал лимит сервера */
export const chunkEntries = (entries: Hash, maxChars = 1_500_000): Hash[] => {
  const out: Hash[] = [];
  let cur: Hash = {};
  let size = 0;
  for (const [k, v] of Object.entries(entries)) {
    const len = k.length + v.length + 8;
    if (size > 0 && size + len > maxChars) {
      out.push(cur);
      cur = {};
      size = 0;
    }
    cur[k] = v;
    size += len;
  }
  if (size > 0) out.push(cur);
  return out;
};
