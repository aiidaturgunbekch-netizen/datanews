/**
 * Вступление и продолжение статьи без повтора.
 * Краткое описание часто — просто начало основного текста (обрезанное «…»). Тогда наверху показываем
 * первое предложение (главное, вход в тему), а под фото — текст со второго предложения, без повтора.
 * Если краткое описание написано отдельно (не совпадает с началом текста) — показываем оба как есть.
 */
const norm = (s: string) =>
  s
    .replace(/(…|\.\.\.)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Конец первого предложения (не раньше minLen символов): точка/!/?/… и дальше пробел и заглавная буква, цифра или кавычка */
const firstSentenceEnd = (text: string, minLen = 40): number => {
  const re = /[.!?…](?=\s+[«"„(A-ZА-ЯЁӨҮҢ0-9—–-])/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const end = m.index + 1;
    if (end < minLen) continue;
    // сокращения перед точкой («ул.», «г.», «им.», «пр.», «т.»): не конец предложения
    const before = text.slice(Math.max(0, m.index - 4), m.index + 1);
    if (/(^|\s)(ул|г|им|пр|т|д|мкр|кв|обл|р-н|көч|ш)\.$/iu.test(before)) continue;
    return end;
  }
  return -1;
};

export const splitLead = (summary: string | undefined, body: string | undefined): { lead: string; rest: string } => {
  const s = (summary || '').trim();
  const b = (body || '').trim();
  if (!b) return { lead: s, rest: '' };
  const sameStart = !s || norm(b).startsWith(norm(s)) || norm(s) === norm(b);
  if (!sameStart) return { lead: s, rest: b };
  const end = firstSentenceEnd(b);
  if (end < 0 || end >= b.length - 1) return { lead: b, rest: '' };
  return { lead: b.slice(0, end).trim(), rest: b.slice(end).trim() };
};
