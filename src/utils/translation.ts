/**
 * Перевод на кыргызский перед одобрением: без него материал не появится в кыргызской версии сайта
 * (или покажет русский текст). Перевод считается отсутствующим, если поле пустое или совпадает с русским.
 */
type Texts = { ru?: string; kg?: string } | undefined;
interface WithTexts {
  title?: Texts;
  description?: Texts;
}

const lacks = (t: Texts) => {
  const ru = (t?.ru || '').trim();
  const kg = (t?.kg || '').trim();
  return Boolean(ru) && (!kg || kg === ru);
};

/** Каких кыргызских полей не хватает: «заголовок», «текст» */
export const missingKg = (a: WithTexts): string[] => {
  const out: string[] = [];
  if (lacks(a.title)) out.push('заголовок');
  if (lacks(a.description)) out.push('текст');
  return out;
};

export const MODERATION_REMINDER = 'Перед одобрением сверьте дату, время и место с первоисточником.';

/** Спросить подтверждение, если нет кыргызского перевода. true — можно одобрять */
export const confirmApproveWithoutKg = (a: WithTexts): boolean => {
  const miss = missingKg(a);
  if (!miss.length) return true;
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') return false;
  return window.confirm(
    `Нет перевода на кыргызский (${miss.join(', ')}). В кыргызской версии сайта материал будет без перевода.\n\nЛучше сначала нажать «Исправить» и добавить перевод. Всё равно одобрить?`
  );
};
