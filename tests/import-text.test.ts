// Помощник импорта: даты из официальных сообщений (в т. ч. на кыргызском) и строка-штамп публикации
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseNotice } from '../src/utils/importText';

describe('помощник импорта: даты', () => {
  it('кыргызская дата «2026-жылдын 29-октябрында» и время «саат 18:00гө»', () => {
    const r = parseNotice('Бишкекте жылуулук берүү иштери уланууда\n2026-жылдын 29-октябрында ... Саат 18:00гө карата 1 870 үй жылытуу системасына кошулду.', '', '', '2026-11-04');
    assert.equal(r.draft.startDate, '2026-10-29T18:00');
    assert.equal(r.draft.allDay, false);
    assert.ok(!r.missing.some((m) => m.startsWith('год в тексте не указан')), 'год взят из «2026-жылдын»');
    assert.equal(r.draft.category, 'repairs');
  });

  it('строка-штамп публикации «03.11.2026 18:34» не становится датой и временем события', () => {
    const r = parseNotice('В Бишкеке изменена схема движения автобусного маршрута № 37\n03.11.2026 18:34\nС 31 октября 2026 года автобус № 37 будет курсировать по обновлённой схеме', '', '', '2026-11-04');
    assert.equal(r.draft.startDate, '2026-10-31T00:00');
    assert.equal(r.draft.allDay, true, 'времени в тексте нет — весь день');
    assert.equal(r.draft.endDate, undefined);
    assert.equal(r.draft.category, 'roads');
  });

  it('русские даты по-прежнему: «17–18 октября с 09:00 до 17:00»', () => {
    const r = parseNotice('Отключение света 17–18 октября 2026 г. с 09:00 до 17:00 по ул. Ленина', '', '', '2026-10-01');
    assert.equal(r.draft.startDate, '2026-10-17T09:00');
    assert.equal(r.draft.endDate, '2026-10-18T17:00');
  });

  it('спорт определяется по словам «спартакиада», «соревнования»', () => {
    assert.equal(parseNotice('В Бишкеке прошла спартакиада среди пенсионеров').draft.category, 'sport');
  });
});
