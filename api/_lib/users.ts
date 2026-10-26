import type { PublicUser } from '../../src/types';
import { normalizePlan } from '../../src/config/site';
import { hgetJson } from './kv';
import { hashPassword, HttpError, randomId } from './http';

export const USERS_KEY = 'dn:users';

export interface StoredUser extends PublicUser {
  salt: string;
  hash: string;
  /** Выход из аккаунта и новый пароль увеличивают номер — прежние входы перестают действовать */
  sessionVersion?: number;
}

export const toPublic = ({ salt: _s, hash: _h, sessionVersion: _v, ...u }: StoredUser): PublicUser => u;

const clean = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);

export const MIN_PASSWORD = 6;
export const checkPassword = (password: string) => {
  if (password.length < MIN_PASSWORD) throw new HttpError('weak_password', 400, 'Пароль — не короче 6 символов');
};

/**
 * Новая учётная запись пользователя — одна проверка для регистрации и для учётной записи сотрудника,
 * которую создаёт администратор. Роль всегда «пользователь»: ни администратором, ни госорганом
 * такая запись не становится (статус госоргана подтверждает только администратор по заявке).
 * Оплата не подтверждается: доступ к размещению открывает только подтверждение оплаты в панели.
 */
export const newUser = async (body: Record<string, unknown>): Promise<StoredUser> => {
  const email = clean(body.email, 120).toLowerCase();
  const name = clean(body.name, 120);
  const phone = clean(body.phone, 40);
  const password = String(body.password ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError('bad_email', 400, 'Проверьте e-mail');
  if (name.length < 2) throw new HttpError('bad_name', 400, 'Укажите имя');
  if (phone.replace(/\D/g, '').length < 9) throw new HttpError('bad_phone', 400, 'Укажите телефон');
  if (clean(body.organization, 160).length < 2) throw new HttpError('missing_field', 400, 'Укажите организацию или личность');
  checkPassword(password);
  if (await hgetJson(USERS_KEY, email)) throw new HttpError('email_taken', 409, 'Этот e-mail уже зарегистрирован');
  const paymentRef = clean(body.paymentRef, 120);
  return {
    id: randomId('usr'),
    name,
    email,
    phone,
    organization: clean(body.organization, 160) || undefined,
    plan: normalizePlan(body.plan),
    paymentStatus: paymentRef ? 'pending' : 'unpaid',
    paymentRef: paymentRef || undefined,
    createdAt: new Date().toISOString(),
    ...(await hashPassword(password)),
  };
};
