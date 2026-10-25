/**
 * DataNews — передача писем редакционной почты (datanews.kg7@gmail.com) во «Входящие материалы» сайта.
 *
 * Скрипт ТОЛЬКО передаёт письма на проверку редактору. Он не публикует новости и не может их публиковать:
 * сайт сохраняет письмо во «Материалы из почты», а черновик и публикацию делает редактор в панели.
 *
 * Секреты в этом файле НЕ хранятся. Их берут из «Свойств скрипта» (Project Settings → Script Properties):
 *   INGEST_URL     — адрес приёма: https://<Preview-адрес ветки>/api/sources?mail=ingest
 *   INGEST_SECRET  — то же значение, что MAIL_INGEST_SECRET в Vercel (Preview)
 *   VERCEL_BYPASS  — секрет Vercel «Protection Bypass for Automation» (нужен, пока Preview закрыт входом Vercel)
 *
 * Функции для ручного запуска (таймер НЕ создаётся автоматически):
 *   checkSetup()   — проверить, что свойства заданы (значения не выводятся)
 *   dryRun()       — показать в журнале, что было бы отправлено по 3 последним письмам; НИЧЕГО не отправляет и не меняет
 *   processTest()  — отправить только письма с темой «ТЕСТ DataNews» (до 3 штук)
 *   processNew()   — отправить новые письма за 3 дня (для будущего таймера; запускать только после успешного теста)
 *
 * Защита: каждый запрос подписан HMAC-SHA256 (время + одноразовая строка + тело), подпись живёт 5 минут.
 * Повторы: обработанные письма запоминаются (свойство PROCESSED_IDS) и получают ярлык «DataNews/обработано»;
 * сайт к тому же сам не принимает одно письмо дважды.
 */

var TEST_SUBJECT = 'ТЕСТ DataNews';
var LABEL_DONE = 'DataNews/обработано';
var LABEL_ERROR = 'DataNews/ошибка';
var MAX_IMAGE_BYTES = 2000000; // фото крупнее не пересылаются — редактор возьмёт их из письма
var MAX_TOTAL_IMAGE_B64 = 3000000; // все фото одного письма вместе (лимит размера запроса)
var MAX_PDF_BYTES = 10000000;
var MAX_TEXT = 50000;
var PROCESSED_KEEP = 400;
// Служебные письма — не новости
var SKIP_SENDERS = /@(accounts\.google\.com|google\.com|email\.claude\.com|anthropic\.com)>?$/i;

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
  if (!/^https:\/\/[^\s]+\/api\/sources\?mail=ingest$/.test(url)) {
    Logger.log('INGEST_URL: не задан или неверный формат (нужно https://…/api/sources?mail=ingest)');
    ok = false;
  } else Logger.log('INGEST_URL: задан');
  if (!secret) {
    Logger.log('INGEST_SECRET: не задан');
    ok = false;
  } else if (secret.length < 32) {
    Logger.log('INGEST_SECRET: задан, но короче 32 символов');
    ok = false;
  } else Logger.log('INGEST_SECRET: задан');
  Logger.log(bypass ? 'VERCEL_BYPASS: задан' : 'VERCEL_BYPASS: не задан (нужен, если Preview закрыт входом Vercel)');
  Logger.log(ok ? 'Настройки в порядке.' : 'Исправьте настройки в Project Settings → Script Properties.');
  return ok;
}

/** Показать, что было бы отправлено. Ничего не отправляет, ярлыков не ставит, файлов не создаёт. */
function dryRun() {
  var threads = GmailApp.search('in:inbox newer_than:30d', 0, 3);
  if (!threads.length) Logger.log('Во «Входящих» за 30 дней писем нет.');
  threads.forEach(function (t) {
    var m = t.getMessages()[t.getMessageCount() - 1];
    var payload = buildPayload_(m, false);
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
                  return a.name + ' (' + a.mimeType + ', ' + a.size + ' байт' + (a.data ? ', будет передано' : a.mimeType === 'application/pdf' ? ', будет извлечён текст' : ', не передаётся') + ')';
                })
                .join('; ')
            : 'нет'),
        '  Служебное (не будет отправлено): ' + (SKIP_SENDERS.test(payload.from) ? 'да' : 'нет'),
        '  Размер запроса: ~' + JSON.stringify(payload).length + ' знаков',
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
  return process_('in:inbox newer_than:3d', 20, false);
}

function process_(query, limit, testOnly) {
  if (!checkSetup()) return { sent: 0, stopped: 'setup' };
  var processed = loadProcessed_();
  var threads = GmailApp.search(query, 0, limit);
  var sent = 0;
  for (var i = 0; i < threads.length; i++) {
    var msgs = threads[i].getMessages();
    for (var j = 0; j < msgs.length; j++) {
      var m = msgs[j];
      if (processed.indexOf(m.getId()) >= 0) continue;
      if (testOnly && m.getSubject().indexOf(TEST_SUBJECT) < 0) continue;
      if (SKIP_SENDERS.test(m.getFrom())) continue;
      var r = send_(buildPayload_(m, true));
      if (r.code === 200 && (r.result === 'stored' || r.result === 'already')) {
        processed.push(m.getId());
        saveProcessed_(processed);
        label_(threads[i], LABEL_DONE);
        sent++;
        Logger.log('Принято сайтом: «' + m.getSubject() + '» — ' + r.result + (r.status ? ' (' + r.status + ')' : ''));
      } else if (r.code === 503 || r.code === 401 || r.code === 403) {
        // Приём выключен, не настроен, закрыт защитой Vercel или неверная подпись — остановка без ярлыков: письма уйдут позже
        Logger.log('Остановлено: сайт ответил ' + r.code + ' ' + (r.error || '') + (r.message ? ' — ' + r.message : ''));
        return { sent: sent, stopped: r.error || String(r.code) };
      } else {
        label_(threads[i], LABEL_ERROR);
        Logger.log('Ошибка для «' + m.getSubject() + '»: ' + r.code + ' ' + (r.error || '') + (r.message ? ' — ' + r.message : '') + '. Письмо будет отправлено снова при следующем запуске.');
      }
    }
  }
  Logger.log('Готово. Отправлено писем: ' + sent);
  return { sent: sent };
}

/** Данные одного письма. withPdf=false — без преобразования PDF (для сухого прогона) */
function buildPayload_(m, withPdf) {
  var text = m.getPlainBody() || '';
  var attachments = [];
  var imageBudget = MAX_TOTAL_IMAGE_B64;
  m.getAttachments({ includeInlineImages: true, includeAttachments: true }).forEach(function (a) {
    var type = (a.getContentType() || '').toLowerCase();
    var item = { name: a.getName(), mimeType: type, size: a.getSize() };
    if (/^image\/(jpeg|png|webp)$/.test(type) && a.getSize() <= MAX_IMAGE_BYTES) {
      var b64 = Utilities.base64Encode(a.getBytes());
      if (b64.length <= imageBudget) {
        item.data = b64;
        imageBudget -= b64.length;
      }
    } else if (type === 'application/pdf' && withPdf && a.getSize() <= MAX_PDF_BYTES) {
      item.text = pdfText_(a);
    }
    attachments.push(item);
  });
  return {
    messageId: m.getId(),
    threadId: m.getThread().getId(),
    rfcMessageId: m.getHeader('Message-ID') || '',
    from: m.getFrom(),
    subject: m.getSubject() || '',
    receivedAt: m.getDate().toISOString(),
    text: text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) : text,
    authResults: m.getHeader('Authentication-Results') || '',
    permalink: m.getThread().getPermalink(),
    attachments: attachments,
  };
}

/**
 * Текст PDF через временное преобразование в Google Документ (расширенная служба Drive должна быть включена).
 * Временный документ сразу удаляется. Если служба не включена или PDF — скан без текста, вернётся пустая строка.
 */
function pdfText_(att) {
  var id = '';
  try {
    var file = Drive.Files.create({ name: 'datanews-temp-' + Date.now(), mimeType: 'application/vnd.google-apps.document' }, att.copyBlob(), { ocrLanguage: 'ru' });
    id = file.id;
    return DocumentApp.openById(id).getBody().getText().slice(0, 20000);
  } catch (e) {
    Logger.log('Текст PDF «' + att.getName() + '» не извлечён (включена ли служба Drive?)');
    return '';
  } finally {
    if (id) {
      try {
        Drive.Files.remove(id);
      } catch (e2) {
        Logger.log('Не удалось удалить временный документ — удалите «datanews-temp-…» в Google Диске вручную');
      }
    }
  }
}

/** Подписанная отправка. В журнал не пишутся ни секреты, ни заголовки запроса. */
function send_(payload) {
  var p = props_();
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
  var res = UrlFetchApp.fetch(p.getProperty('INGEST_URL'), {
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
    data = { error: code === 401 || code === 403 ? 'vercel_protection_or_auth' : 'not_json' };
  }
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

function label_(thread, name) {
  var l = GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
  thread.addLabel(l);
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
