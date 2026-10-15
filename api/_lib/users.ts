import type { PublicUser } from '../../src/types';

export const USERS_KEY = 'dn:users';

export interface StoredUser extends PublicUser {
  salt: string;
  hash: string;
}

export const toPublic = ({ salt: _s, hash: _h, ...u }: StoredUser): PublicUser => u;
