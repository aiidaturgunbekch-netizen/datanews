/**
 * DataNews — передача писем редакционной почты (datanews.kg7@gmail.com) во «Материалы из почты» сайта.
 *
 * МИНИМАЛЬНЫЕ ПРАВА (файл appsscript.json):
 *   https://www.googleapis.com/auth/gmail.readonly          — только чтение писем (через встроенную службу Gmail API);
 *   https://www.googleapis.com/auth/script.external_request — отправка данных на сайт (только по адресу INGEST_URL).
 * Скрипт не отправляет, не удаляет, не перемещает и не изменяет письма, не ставит ярлыков,
 * не обращается к Google Диску и Документам. GmailApp, MailApp, DriveApp, DocumentApp здесь не используются.
 *
 * Скрипт ТОЛЬКО передаёт письма на проверку редактору. Публиковать он не может: сайт сохраняет письмо
 * во «Материалы из почты», а черновик и публикацию делает администратор в панели («Модерация» → «Одобрить»).
 *
 * Секреты в этом файле НЕ хранятся. Их берут из «Свойств скрипта» (Настройки проекта → Свойства скрипта):
 *   INGEST_URL     — адрес приёма: https://<Preview-адрес ветки>/api/sources?mail=ingest
 *   INGEST_SECRET  — то же значение, что MAIL_INGEST_SECRET в Vercel (Preview)
 *   VERCEL_BYPASS  — секрет Vercel «Protection Bypass for Automation» (нужен, пока Preview закрыт входом Vercel)
 *
 * Функции для ручного запуска (таймер НЕ создаётся автоматически):
 *   checkSetup()   — проверить, что свойства заданы (значения не выводятся)
 *   dryRun()       — показать в журнале, что было бы отправлено по 3 последним письмам; НИЧЕГО не отправляет
 *   processTest()  — отправить только письма с темой «ТЕСТ DataNews» (до 3 штук)
 *   processNew()   — отправить новые письма за 3 дня (для будущего таймера; запускать только после успешного теста)
 *
 * Обрабатываются текст письма и фотографии JPG/PNG/WEBP. PDF на этом этапе НЕ обрабатываются:
 * сайт получает только название и размер PDF, редактор открывает письмо в Gmail.
 *
 * Защита: каждый запрос подписан HMAC-SHA256 (время + одноразовая строка + тело), подпись живёт 5 минут.
 * Повторы: обработанные письма запоминаются в свойстве PROCESSED_IDS; сайт к тому же сам не принимает одно письмо дважды.
 */

var TEST_SUBJECT = 'ТЕСТ DataNews';
var MAX_IMAGE_BYTES = 2000000; // фото крупнее не пересылаются — редактор возьмёт их из письма
var MAX_TOTAL_IMAGE_B64 = 3000000; // все фото одного письма вместе (лимит размера запроса)
var MAX_TEXT = 50000;
var PROCESSED_KEEP = 400;
// Служебные письма — не новости
var SKIP_SENDERS = /@(accounts\.google\.com|google\.com|email\.claude\.com|anthropic\.com)>?$/i;
var SKIP_QUERY = ' -from:accounts.google.com -from:google.com -from:email.claude.com -from:anthropic.com';
var INGEST_URL_RE = /^https:\/\/[^\s\/?#]+\/api\/sources\?mail=ingest$/;

function props_() {
  return PropertiesService.getScriptProperties();
}

/** Проверка настроек без вывода значений секретов */
function checkSetup() {
  var p = props_();
  var url = p.getProperty('INGEST_URL') || '';
  var secret = p.getProperty('INGEST_SECRET') || '';
  var bypass = p.getProperty('VERCEL_BYPASS') || '';
  var ok = true;
  if (!INGEST_URL_RE.test(url)) {
    Logger.log('INGEST_URL: не задан или неверный формат (нужно https://…/api/sources?mail=ingest)');
    ok = false;
  } else Logger.log('INGEST_URL: задан');
  if (!secret) {
    Logger.log('INGEST_SECRET: не задан');
    ok = false;
  } else if (secret !== secret.trim()) {
    Logger.log('INGEST_SECRET: есть пробел или перенос строки в начале или конце — удалите их');
    ok = false;
  } else if (secret.length < 32) {
    Logger.log('INGEST_SECRET: задан, но короче 32 символов');
    ok = false;
  } else Logger.log('INGEST_SECRET: задан');
  Logger.log(bypass ? 'VERCEL_BYPASS: задан' : 'VERCEL_BYPASS: не задан (нужен, если Preview закрыт входом Vercel)');
  Logger.log(ok ? 'Настройки в порядке.' : 'Исправьте настройки: Настройки проекта → Свойства скрипта.');
  return ok;
}

/** Показать, что было бы отправлено. Ничего не отправляет и ничего не меняет. */
function dryRun() {
  var ids = listIds_('in:inbox newer_than:30d', 3);
  if (!ids.length) Logger.log('Во «Входящих» за 30 дней писем нет.');
  ids.forEach(function (ref) {
    var msg = Gmail.Users.Messages.get('me', ref.id, { format: 'full' });
    var payload = buildPayload_(msg, false);
    Logger.log(
      [
        '— Письмо: «' + payload.subject + '»',
        '  От: ' + payload.from,
        '  Получено: ' + payload.receivedAt,
        '  Текст: ' + payload.text.length + ' знаков',
        '  Вложения: ' +
          (payload.attachments.length
            ? payload.attachments
                .map(function (a) {
                  return a.name + ' (' + a.mimeType + ', ' + a.size + ' байт, ' + (a.willSend ? 'будет передано' : 'не передаётся') + ')';
                })
                .join('; ')
            : 'нет'),
        '  Служебное (не будет отправлено): ' + (SKIP_SENDERS.test(payload.from) ? 'да' : 'нет'),
      ].join('\n')
    );
  });
  Logger.log('Сухой прогон окончен: на сайт ничего не отправлено.');
}

/** Отправить только тестовые письма с темой «ТЕСТ DataNews» */
function processTest() {
  return process_('subject:"' + TEST_SUBJECT + '" newer_than:7d', 3, true);
}

/** Отправить новые письма за 3 дня (только после успешного теста; таймер включается вручную) */
function processNew() {
  return process_('in:inbox newer_than:3d' + SKIP_QUERY, 20, false);
}

function process_(query, limit, testOnly) {
  if (!checkSetup()) return { sent: 0, stopped: 'setup' };
  var processed = loadProcessed_();
  var ids = listIds_(query, limit);
  var sent = 0;
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i].id;
    if (processed.indexOf(id) >= 0) continue;
    var msg = Gmail.Users.Messages.get('me', id, { format: 'full' });
    var subject = header_(msg, 'Subject');
    if (testOnly && subject.indexOf(TEST_SUBJECT) < 0) continue;
    if (SKIP_SENDERS.test(header_(msg, 'From'))) continue;
    var r = send_(buildPayload_(msg, true));
    if (r.code === 200 && (r.result === 'stored' || r.result === 'already')) {
      processed.push(id);
      saveProcessed_(processed);
      sent++;
      Logger.log('Принято сайтом: «' + subject + '» — ' + r.result + (r.status ? ' (' + r.status + ')' : ''));
    } else if (r.code === 503 || r.code === 401 || r.code === 403) {
      // Приём выключен, не настроен, закрыт защитой Vercel или неверная подпись — остановка: письма уйдут при следующем запуске
      Logger.log('Остановлено: сайт ответил ' + r.code + ' ' + (r.error || '') + (r.message ? ' — ' + r.message : ''));
      return { sent: sent, stopped: r.error || String(r.code) };
    } else {
      Logger.log('Ошибка для «' + subject + '»: ' + r.code + ' ' + (r.error || '') + (r.message ? ' — ' + r.message : '') + '. Письмо будет отправлено снова при следующем запуске.');
    }
  }
  Logger.log('Готово. Отправлено писем: ' + sent);
  return { sent: sent };
}

/** Идентификаторы писем по поиску Gmail (только чтение) */
function listIds_(query, limit) {
  var res = Gmail.Users.Messages.list('me', { q: query, maxResults: limit });
  return (res && res.messages) || [];
}

function header_(msg, name) {
  var hs = (msg.payload && msg.payload.headers) || [];
  var n = name.toLowerCase();
  for (var i = 0; i < hs.length; i++) if (String(hs[i].name).toLowerCase() === n) return String(hs[i].value || '');
  return '';
}

/** Байты из поля Gmail API: строка base64 (web-safe) или массив байтов */
function bytes_(data) {
  if (!data) return [];
  if (typeof data === 'string') return Utilities.base64DecodeWebSafe(data);
  return data;
}

function charsetOf_(part) {
  var ct = '';
  var hs = part.headers || [];
  for (var i = 0; i < hs.length; i++) if (String(hs[i].name).toLowerCase() === 'content-type') ct = String(hs[i].value);
  var m = ct.match(/charset="?([^";\s]+)"?/i);
  return m ? m[1] : 'UTF-8';
}

/** Все части письма (вложенные multipart раскрываются) */
function parts_(part, out) {
  out = out || [];
  if (!part) return out;
  out.push(part);
  (part.parts || []).forEach(function (p) {
    parts_(p, out);
  });
  return out;
}

/** Текст письма: text/plain, а если его нет — text/html без разметки */
function textOf_(msg) {
  var all = parts_(msg.payload);
  var pick = function (type) {
    for (var i = 0; i < all.length; i++) {
      var p = all[i];
      if (p.mimeType === type && !p.filename && p.body && p.body.data) {
        return Utilities.newBlob(bytes_(p.body.data)).getDataAsString(charsetOf_(p));
      }
    }
    return '';
  };
  var plain = pick('text/plain');
  if (plain) return plain;
  return pick('text/html')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/** Данные одного письма. withImages=false — без скачивания фото (для сухого прогона) */
function buildPayload_(msg, withImages) {
  var text = textOf_(msg);
  var attachments = [];
  var imageBudget = MAX_TOTAL_IMAGE_B64;
  parts_(msg.payload).forEach(function (p) {
    if (!p.filename) return;
    var type = String(p.mimeType || '').toLowerCase();
    var size = (p.body && p.body.size) || 0;
    var item = { name: p.filename, mimeType: type, size: size };
    var isPhoto = /^image\/(jpeg|png|webp)$/.test(type) && size <= MAX_IMAGE_BYTES;
    if (isPhoto && withImages) {
      var raw = p.body.attachmentId ? Gmail.Users.Messages.Attachments.get('me', msg.id, p.body.attachmentId).data : p.body.data;
      var b64 = Utilities.base64Encode(bytes_(raw));
      if (b64.length <= imageBudget) {
        item.data = b64;
        imageBudget -= b64.length;
      }
    }
    // PDF и другие файлы на этом этапе не обрабатываются — сайт получит только название и размер
    if (!withImages) item.willSend = isPhoto && size * 1.37 <= imageBudget;
    attachments.push(item);
  });
  return {
    messageId: msg.id,
    threadId: msg.threadId,
    rfcMessageId: header_(msg, 'Message-ID'),
    from: header_(msg, 'From'),
    subject: header_(msg, 'Subject'),
    receivedAt: new Date(Number(msg.internalDate)).toISOString(),
    text: text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) : text,
    authResults: header_(msg, 'Authentication-Results'),
    permalink: 'https://mail.google.com/mail/u/0/#all/' + msg.threadId,
    attachments: attachments,
  };
}

/** Подписанная отправка — только по адресу INGEST_URL. В журнал не пишутся ни секреты, ни заголовки запроса. */
function send_(payload) {
  var p = props_();
  var url = p.getProperty('INGEST_URL') || '';
  if (!INGEST_URL_RE.test(url)) return { code: 0, error: 'bad_ingest_url' };
  var body = JSON.stringify(payload);
  var ts = String(Date.now());
  var nonce = Utilities.getUuid().replace(/-/g, '');
  var sig = Utilities.computeHmacSha256Signature(ts + '.' + nonce + '.' + body, p.getProperty('INGEST_SECRET'), Utilities.Charset.UTF_8);
  var headers = {
    'X-DataNews-Timestamp': ts,
    'X-DataNews-Nonce': nonce,
    'X-DataNews-Signature': toHex_(sig),
  };
  var bypass = p.getProperty('VERCEL_BYPASS');
  if (bypass) headers['x-vercel-protection-bypass'] = bypass; // только заголовком, не в адресе
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json; charset=utf-8',
    payload: body,
    headers: headers,
    muteHttpExceptions: true,
    followRedirects: false,
  });
  var code = res.getResponseCode();
  var data = {};
  try {
    data = JSON.parse(res.getContentText());
  } catch (e) {
    data = {};
  }
  if (!data || typeof data !== 'object') data = {};
  if (!data.error && code !== 200) data.error = code === 401 || code === 403 ? 'vercel_protection_or_auth' : 'not_json';
  return { code: code, result: data.result, status: data.status, error: data.error, message: data.message };
}

function toHex_(bytes) {
  return bytes
    .map(function (b) {
      var v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? '0' + v : v;
    })
    .join('');
}

function loadProcessed_() {
  try {
    return JSON.parse(props_().getProperty('PROCESSED_IDS') || '[]');
  } catch (e) {
    return [];
  }
}

function saveProcessed_(ids) {
  props_().setProperty('PROCESSED_IDS', JSON.stringify(ids.slice(-PROCESSED_KEEP)));
}
