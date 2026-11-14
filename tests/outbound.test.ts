import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.DATANEWS_MEMORY_KV = '1';
const { outboundKind, outboundNetwork } = await import('../src/services/analytics');
const { CONTACTS, telegramUrl } = await import('../src/config/contacts');
const { default: track } = await import('../api/track');
const { hgetJson, cmd } = await import('../api/_lib/kv');
const { K, dayKey } = await import('../api/_lib/stats');

const own = [CONTACTS.whatsappUrl, CONTACTS.instagramUrl, telegramUrl(), CONTACTS.telegramPhoneUrl];

describe('переходы в соцсети', () => {
  it('сеть определяется по адресу ссылки', () => {
    assert.equal(outboundNetwork('https://www.instagram.com/data.news.kg/'), 'instagram');
    assert.equal(outboundNetwork('https://instagram.com/opera.ballet.teatr'), 'instagram');
    assert.equal(outboundNetwork('https://wa.me/996990000365'), 'whatsapp');
    assert.equal(outboundNetwork('https://api.whatsapp.com/send?text=x'), 'whatsapp');
    assert.equal(outboundNetwork('https://t.me/share/url?url=x'), 'telegram');
    assert.equal(outboundNetwork('https://www.meteo.kg/ru/forecast'), null);
    assert.equal(outboundNetwork('https://instagram.com.evil.example/'), null, 'похожий чужой домен — не Instagram');
  });

  it('цель: написать DataNews / поделиться / организатор', () => {
    assert.equal(outboundKind(CONTACTS.instagramUrl, own), 'contact');
    assert.equal(outboundKind(`${CONTACTS.whatsappUrl}?text=Здравствуйте`, own), 'contact', 'обсудить рекламу — тоже контакт с редакцией');
    assert.equal(outboundKind('https://wa.me/?text=Новость', own), 'share');
    assert.equal(outboundKind('https://t.me/share/url?url=https://datanews.kg', own), 'share');
    assert.equal(outboundKind('https://instagram.com/opera.ballet.teatr', own), 'other');
  });

  it('сервер считает переход по сети и цели за день; неизвестную сеть не принимает', async () => {
    const post = (body: unknown) =>
      track(new Request('http://localhost/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.99.0.1' }, body: JSON.stringify(body) }));
    assert.equal((await post({ out: 'instagram', kind: 'contact' })).status, 200);
    assert.equal((await post({ out: 'instagram', kind: 'contact' })).status, 200);
    assert.equal((await post({ out: 'telegram', kind: 'share' })).status, 200);
    assert.equal((await post({ out: 'facebook', kind: 'contact' })).status, 400);
    const day = dayKey(new Date());
    const m = (await cmd<string[]>('HGETALL', K.out(day))) || [];
    const map = Object.fromEntries(Array.from({ length: m.length / 2 }, (_, i) => [m[i * 2], Number(m[i * 2 + 1])]));
    assert.equal(map['instagram|contact'], 2);
    assert.equal(map['telegram|share'], 1);
    void hgetJson;
  });
});
