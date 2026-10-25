/**
 * Резервная копия данных сайта для администратора (файл JSON).
 * В копию входит всё, что вводили люди: публикации и правки, скрытые и сверенные встроенные публикации,
 * жалобы, официальный прогноз, состояние источников, письма редакционной почты и учётные записи организаций.
 * Не входят: хэши паролей и соль (после восстановления пароли задаются заново), адреса push-подписок
 * браузеров и статистика посещений. Фото организаций — только по отдельному запросу (файл может быть большим).
 */
import { cmd } from './kv';
import { ANN_KEY, CHECKED_KEY, HIDDEN_KEY, IMG_KEY } from './announcements';
import { USERS_KEY } from './users';

// dn:mail — входящие письма редакционной почты (временные копии фото dn:mail:att:* не входят, они удаляются сами)
const HASHES = [ANN_KEY, HIDDEN_KEY, CHECKED_KEY, 'dn:reports', 'dn:src:status', 'dn:mail'] as const;
const STRINGS = ['dn:weather:official'] as const;

/** HGETALL отдаёт плоский список [поле, значение, поле, значение, …] */
const toObject = (flat: unknown): Record<string, string> => {
  if (!Array.isArray(flat)) return flat && typeof flat === 'object' ? (flat as Record<string, string>) : {};
  const out: Record<string, string> = {};
  for (let i = 0; i + 1 < flat.length; i += 2) out[String(flat[i])] = String(flat[i + 1]);
  return out;
};

/** Учётная запись без хэша пароля и соли */
export const stripSecrets = (raw: string) => {
  try {
    const { hash: _h, salt: _s, ...rest } = JSON.parse(raw) as Record<string, unknown>;
    return JSON.stringify(rest);
  } catch {
    return null;
  }
};

export const buildBackup = async (includeImages: boolean) => {
  const data: Record<string, Record<string, string> | string | null> = {};
  for (const key of HASHES) data[key] = toObject(await cmd('HGETALL', key));
  for (const key of STRINGS) data[key] = await cmd<string | null>('GET', key);

  const users = toObject(await cmd('HGETALL', USERS_KEY));
  data[USERS_KEY] = Object.fromEntries(
    Object.entries(users)
      .map(([k, v]) => [k, stripSecrets(v)] as const)
      .filter((e): e is readonly [string, string] => e[1] !== null)
  );

  const imageIds = ((await cmd<string[]>('HKEYS', IMG_KEY)) || []).map(String);
  if (includeImages) data[IMG_KEY] = toObject(await cmd('HGETALL', IMG_KEY));

  return {
    format: 'datanews-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    includesImages: includeImages,
    imageIds,
    excluded: ['хэши паролей и соль', 'адреса push-подписок', 'статистика посещений', ...(includeImages ? [] : ['фото организаций (dn:img)'])],
    data,
  };
};
