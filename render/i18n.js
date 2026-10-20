// Английский интерфейс сайта семьи (P2-4): переключатель RU/EN; переводятся только подписи интерфейса (по словарю),
// семейное содержимое — имена, рассказы, записи родных — остаётся как есть. Имена — из поля «Имя латиницей», если оно заполнено.
(function () {
  var LANG = window.FAMILY_LANG === 'en' ? 'en' : 'ru';
  var D = {
    'надёжно': 'reliable', 'вероятно': 'probable', 'предположение': 'assumption',
    'Древо': 'Family tree', 'Фамилии рода': 'Family surnames', 'Дополнения от родных': 'Additions from relatives',
    'Кто видит сайт и как исправить запись': 'Who can see this site and how to correct a record', 'Кто видит сайт': 'Who can see this site',
    'Что удалось найти в архивах': 'What was found in the archives', 'Находки в архивах': 'Archive findings', 'Что запросить дальше': 'What to request next',
    'Как дополнить древо': 'How to add to the tree', 'Сайт семьи': 'Family website', 'человек': 'people', 'поколений': 'generations', 'фамилий': 'surnames',
    'поколение': 'generation', 'поколения': 'generations', 'Найдите себя или родных': 'Find yourself or your relatives', 'Найти': 'Search',
    'Имя или фамилия': 'First name or surname', 'Меня нет в древе — добавить себя': 'I\'m not in the tree — add myself',
    'Древо интерактивное: каждый может дописать, что знает. Записи проверяет генеалог — составитель древа.': 'The tree is interactive: anyone can add what they know. Entries are reviewed by the genealogist who compiled the tree.',
    'Найдите': 'Find', 'себя, родителей или бабушку с дедушкой': 'yourself, your parents or grandparents', 'Нажмите': 'Tap', 'на карточку человека': 'a person\'s card',
    'Допишите': 'Add', ', что знаете: годы, имена, историю': ' what you know: years, names, stories',
    'Показать только эту ветвь': 'Show only this branch', 'пунктирная рамка — вошли в род браком': 'dashed frame — joined the family by marriage',
    'два кольца — брак': 'two rings — marriage', 'кольца с чертой — бывший брак': 'rings with a line — former marriage', 'бледная пунктирная — человек не установлен': 'pale dashed — person not identified',
    'Список': 'List', 'Схема': 'Chart', 'Вид древа': 'Tree view', 'Целиком': 'Whole tree', 'Уменьшить схему': 'Zoom out', 'Увеличить схему': 'Zoom in', 'Лупа': 'Magnifier',
    'Показать, как росло древо': 'Show how the tree grew', 'Добавить новые сведения в древо': 'Add new information to the tree', 'Человек, история, дата или исправление': 'A person, story, date or correction', 'Человек, история, дата или исправление — запись появится после проверки генеалогом (составителем древа)': 'A person, story, date or correction — your entry will appear after the genealogist who compiled the tree reviews it', 'Человек, история, дата или исправление — запись появится после проверки составителем древа': 'A person, story, date or correction — your entry will appear after the tree compiler reviews it', 'Человек, история, дата или исправление — запись сразу увидят все родные': 'A person, story, date or correction — all relatives will see your entry right away',
    '— запись сразу увидят все родные': '— all relatives will see the entry right away', '— запись появится после проверки генеалогом (составителем древа)': '— the entry will appear after the genealogist reviews it',
    'Режим лупы:': 'Magnifier mode:', 'наведите курсор на древо — под ним появится увеличительное стекло, и любую карточку можно прочитать крупно.': 'hover over the tree — a magnifying glass appears so any card can be read in large print.',
    'Коснитесь человека': 'Tap a person', '— откроется его карточка. Схему можно листать пальцем, а кнопкой': '— their card opens. Swipe to move around the chart, use the button',
    'увидеть её целиком. Включите': 'to see it whole. Turn on the', 'Лупу': 'Magnifier', 'и ведите пальцем — под ним появится увеличение.': 'and slide your finger to magnify.',
    'Показать всё древо': 'Show the whole tree', 'Схема древа, листайте вбок стрелками': 'Family tree chart, scroll sideways with the arrow keys',
    'Tab — по людям, стрелки — по родству: ↑ родители, ↓ дети, ← → супруги и соседи, Enter — открыть': 'Tab — between people, arrows — by kinship: ↑ parents, ↓ children, ← → spouses and siblings, Enter — open',
    'Первое упоминание': 'First mention', 'Здесь появляется всё, что родственники добавляют на семейном сайте.': 'Everything relatives add on the family website appears here.',
    'Что': 'What', 'Источник': 'Source', 'Результат': 'Result', 'составитель древа': 'tree compiler',
    'Сайт закрыт паролем.': 'The site is password-protected.', 'Открыть его могут только те, кому составитель дал ссылку и пароль.': 'Only people who received the link and password from the compiler can open it.',
    'Сайт открывается по ссылке.': 'The site opens via a link.', 'Пароля нет: увидеть древо может любой, у кого есть ссылка.': 'There is no password: anyone with the link can see the tree.',
    'Поисковики могут найти сайт.': 'Search engines can find the site.', 'Так решил составитель.': 'The compiler chose this.', 'В поисковиках сайта нет': 'The site is not in search engines',
    '— он закрыт от Яндекса и Google.': '— it is hidden from Yandex and Google.', 'Годы рождения живых скрыты.': 'Birth years of living people are hidden.',
    'Записи родных появляются сразу': 'Entries from relatives appear right away', ', с пометкой «не проверено». Записи о живых людях составитель проверяет перед публикацией.': ', marked "not verified". Entries about living people are reviewed by the compiler first.',
    'Записи родных уходят составителю на проверку': 'Entries from relatives go to the compiler for review', 'и появляются на сайте после неё.': 'and appear on the site afterwards.',
    'За данные отвечает': 'Responsible for the data:', '. Чтобы исправить или убрать сведения о себе, откройте свою карточку и нажмите «Это я — скройте мои данные» или напишите составителю.': '. To correct or remove information about yourself, open your card and press "This is me — hide my data", or write to the compiler.',
    'Показать предков': 'Show ancestors', 'Показать потомков': 'Show descendants', '🔊 Прочитать вслух': '🔊 Read aloud', '⏹ Остановить чтение': '⏹ Stop reading', 'Поделиться карточкой': 'Share this card',
    'Закрыть': 'Close', 'Родные': 'Relatives', 'Это я — скройте мои данные': 'This is me — hide my data',
    'Отметьте, что скрыть на сайте. Запрос увидит только составитель древа, он ответит в течение 10 рабочих дней.': 'Choose what to hide on the site. Only the compiler will see the request and will reply within 10 working days.',
    'Годы жизни': 'Years of life', 'Занятие и место': 'Occupation and place', 'Всю карточку (останется только «жив(а)»)': 'The whole card (only "living" will remain)',
    'Контакт для ответа': 'Contact for a reply', 'почта или телефон': 'email or phone', 'Комментарий (по желанию)': 'Comment (optional)',
    'Согласен(на) на обработку моих данных по': 'I agree to the processing of my data under the', 'политике': 'privacy policy', 'Отправить запрос': 'Send request',
    'Дополнения': 'Additions', 'Мои записи': 'My entries', '✓ Запись отправлена': '✓ Entry sent', 'Добавить ещё': 'Add another', 'Добавить': 'Add',
    'Шаг 1 из 2 — о ком запись': 'Step 1 of 2 — who it is about', 'Что вы добавляете': 'What are you adding', 'Воспоминание или история': 'A memory or story',
    'Факт: даты, места, работа, награды': 'A fact: dates, places, work, awards', 'Исправление ошибки': 'A correction', 'Нового родственника': 'A new relative', 'Фотографию этого человека': 'A photo of this person',
    'Фотография': 'Photo', 'Фото сначала увидит составитель древа; на сайте оно появится после проверки. Присылайте фото с согласия человека на снимке.': 'The compiler will see the photo first; it appears on the site after review. Send photos with the consent of the person in them.',
    'Кем приходится этому человеку': 'Relation to this person', '— выберите —': '— choose —', 'сын': 'son', 'дочь': 'daughter', 'муж': 'husband', 'жена': 'wife', 'отец': 'father', 'мать': 'mother',
    'брат': 'brother', 'сестра': 'sister', 'внук': 'grandson', 'внучка': 'granddaughter', 'другое': 'other', 'Второй родитель': 'Other parent', 'Фамилия, имя, отчество': 'Full name',
    'У живых родственников год рождения не пишите.': 'Do not enter birth years for living relatives.', 'Место жительства': 'Place of residence', 'Род занятий': 'Occupation',
    'Далее — что вы знаете': 'Next — what you know', 'Шаг 2 из 2 — что вы знаете': 'Step 2 of 2 — what you know', '← назад': '← back', 'Что вы знаете': 'What you know',
    '— и откуда: помню сам(а), рассказ бабушки, документ': '— and where from: my own memory, a grandmother\'s story, a document',
    '🎙 Записать рассказ голосом': '🎙 Record a story by voice', '🎙 Записать заново': '🎙 Record again', '⏹ Остановить запись': '⏹ Stop recording', 'удалить запись': 'delete recording',
    'До 5 минут. Перед отправкой можно прослушать. Запись сначала услышит составитель древа.': 'Up to 5 minutes. You can listen before sending. The compiler hears it first.',
    'Готово — прослушайте перед отправкой.': 'Done — listen before sending.', 'Нет доступа к микрофону — разрешите его в браузере.': 'No microphone access — allow it in your browser.',
    'Приложить скан документа': 'Attach a document scan', '— по желанию: метрика, справка, письмо (PDF или фото, до 3 МБ)': '— optional: a record, certificate, letter (PDF or photo, up to 3 MB)',
    'Кто вы': 'Who you are', 'Подпись будет видна рядом с записью. Телефон и почту здесь не пишите.': 'Your signature is shown next to the entry. Do not enter a phone or email here.',
    'Например: Анна, внучка Павла': 'For example: Anna, Pavel\'s granddaughter', 'Как с вами связаться': 'How to contact you', '— по желанию': '— optional',
    'Увидит только составитель древа — если захочет уточнить. На сайте не показывается.': 'Only the compiler sees it, in case they need to ask. It is not shown on the site.',
    'Вношу сведения с согласия этого человека (или это я сам(а))': 'I add this with the person\'s consent (or it is me)', 'Черновик сохранён на этом устройстве.': 'Draft saved on this device.',
    'Сохранить': 'Save', 'Сохраняю': 'Saving', '✓ Сохранено': '✓ Saved', 'Дополнять древо можно на семейном сайте.': 'You can add to the tree on the family website.', 'Кто увидит вашу запись': 'Who will see your entry',
    'жив(а)': 'living', 'Перейти к древу': 'Skip to the tree', 'А+ Крупно': 'A+ Large', 'А− Обычно': 'A− Normal', 'О данных на этом сайте': 'About the data on this site',
    'Политика обработки персональных данных': 'Privacy policy', 'Соглашение': 'Terms', 'Составитель древа:': 'Tree compiler:', 'Сделано в Родконструкторе': 'Made with Rodkonstruktor',
    'Читаемо': 'Readable', 'Крупно': 'Large', 'Очень крупно': 'Very large', 'вошли в род браком': 'joined by marriage', 'бывший брак': 'former marriage', 'брак': 'marriage', 'Дети:': 'Children:',
    'Воспоминание': 'Memory', 'Факт': 'Fact', 'Исправление': 'Correction', 'Новый родственник': 'New relative', 'Без привязки к человеку': 'Not linked to a person',
    'Нет интернета. Текст сохранён на телефоне — отправьте, когда появится связь': 'No internet. The text is saved on your phone — send it when you are back online',
    'Сеть очень медленная, сервер не ответил за 20 секунд': 'The network is very slow; the server did not answer within 20 seconds', 'Нет связи с сайтом. Проверьте интернет': 'Cannot reach the site. Check your internet connection',
    'Сайт временно не отвечает': 'The site is temporarily unavailable', 'на проверке': 'under review', 'принято': 'accepted', 'не принято': 'not accepted', 'внесено в древо': 'added to the tree',
    'со слов родных · проверено': 'from relatives · verified', 'со слов родных · не проверено': 'from relatives · not verified', 'Без подписи': 'Unsigned',
    'Дополнения от родных видны на семейном сайте.': 'Additions from relatives are visible on the family website.', 'Станьте первым, кто допишет историю семьи': 'Be the first to add to the family story',
    'Например: где работал дедушка, как познакомились бабушка с дедушкой, чья это фотография.': 'For example: where grandfather worked, how grandparents met, whose photo this is.',
    'Добавить воспоминание': 'Add a memory', 'Показать ещё': 'Show more', 'Дополнений к этому человеку пока нет.': 'No additions about this person yet.', 'Общих дополнений пока нет.': 'No general additions yet.',
    'Родители': 'Parents', 'Супруг(а)': 'Spouse', 'Дети': 'Children', 'Братья и сёстры': 'Siblings', 'по документам': 'documented', 'косвенно': 'indirect', 'со слов родных': 'from relatives',
    'Сведения и источники': 'Facts and sources', 'Историческая память': 'Historical memory', 'Историческая память:': 'Historical memory:', 'Участник войны': 'War veteran', 'Участники войны': 'War veterans', 'Погиб(ла) или пропал(а) без вести на войне': 'Killed or missing in action', 'Погибшие и пропавшие': 'Killed and missing', 'Награда': 'Award', 'Награждённые': 'Awarded', 'Репрессирован(а)': 'Victim of repression', 'Репрессированные': 'Victims of repression', 'Реабилитирован(а)': 'Rehabilitated', 'Реабилитированные': 'Rehabilitated', 'Другая отметка': 'Other note', 'Другие отметки': 'Other notes', 'Сведения': 'Facts', 'Документы': 'Documents', 'Документ': 'Document', 'Общие сведения': 'General', 'Дополнение к древу': 'Addition to the tree',
    'Добавьте человека, историю или документ, который не относится к одной карточке.': 'Add a person, story or document that does not belong to a single card.',
    'Рождение': 'Birth', 'Крещение': 'Baptism', 'Смерть': 'Death', 'Погребение': 'Burial', 'Сословие, статус': 'Social status', 'Варианты написания': 'Spelling variants',
    'Отметьте, что скрыть.': 'Choose what to hide.', 'Оставьте почту или телефон для ответа.': 'Leave an email or phone for the reply.', 'Отметьте согласие на обработку ваших данных.': 'Please agree to the processing of your data.',
    '✓ Запрос отправлен составителю древа. Он ответит по указанному контакту.': '✓ The request has been sent to the compiler, who will reply to the contact provided.',
    'Выберите, кем человек приходится.': 'Choose the relation.', 'Впишите хотя бы имя родственника.': 'Enter at least the relative\'s first name.', 'Отметьте, что вносите сведения с согласия этого человека.': 'Confirm you have the person\'s consent.',
    'Откройте карточку человека, чьё это фото.': 'Open the card of the person in the photo.', 'Выберите фотографию.': 'Choose a photo.', 'Напишите пару слов — что вы знаете.': 'Write a few words about what you know.',
    '✓ Запись отправлена составителю древа': '✓ Entry sent to the tree compiler', '✓ Запись сохранена': '✓ Entry saved',
    'Составитель проверит её и добавит на сайт. Статус — в блоке «Мои записи»: «на проверке», «принято» или «не принято».': 'The compiler will review it and add it to the site. See the status under "My entries": under review, accepted or not accepted.',
    'Человек уже стоит в общем древе, его видят все родные.': 'The person is already in the shared tree; all relatives can see them.', 'Дополнение уже видят все родные.': 'All relatives can already see the addition.',
    '✓ Ссылка скопирована — отправьте её родным.': '✓ Link copied — send it to your relatives.', 'Сайт под паролем: пароль сообщите отдельно.': 'The site is password-protected: share the password separately.',
    'Скопируйте ссылку:': 'Copy the link:', '— не знаю —': '— not sure —', 'не установлено': 'not identified', 'новое': 'new', 'Семейный архив': 'Family archive',
    'Облегчённый режим: медленный интернет.': 'Lite mode: slow connection.', 'Обычный вид': 'Normal view',
    'В форме есть неотправленный текст. Закрыть? Черновик останется на этом устройстве — его можно будет дописать и отправить позже.': 'The form has unsent text. Close it? The draft stays on this device and you can finish it later.'
  };
  var RX = [
    [/^Ваша линия: (\d+) поколени[еяй], самый ранний предок — (.+)$/, 'Your line: $1 generations, earliest ancestor — $2'],
    [/^Потомки: (.+) — (\d+) чел\., (\d+) поколени[еяй]$/, 'Descendants of $1: $2 people, $3 generations'],
    [/^Найдено: (\d+)$/, 'Found: $1'], [/^Найдено (\d+), показаны первые 8\. Добавьте имя или отчество$/, 'Found $1, showing the first 8. Add a first name or patronymic'],
    [/^Никого не нашли.*$/, 'Nobody found. Try only a surname or only a first name.'],
    [/^(\d+) из 20 000 знаков$/, '$1 of 20,000 characters'], [/^● (\d+):(\d+) из 5:00$/, '● $1:$2 of 5:00'],
    [/^✓ Черновик сохранён на этом устройстве · (.+)$/, '✓ Draft saved on this device · $1'],
    [/^Не отправилось: (.+)$/, 'Not sent: $1'], [/^Не сохранилось: (.+)\. Текст остался в черновике — попробуйте ещё раз\.$/, 'Not saved: $1. The text is kept as a draft — try again.'],
    [/^✓ Запись отправлена составителю древа — (.+)$/, '✓ Entry sent to the tree compiler — $1'],
    [/^Составитель: (.+)$/, 'Compiler: $1'], [/^Портрет: (.+)$/, 'Portrait: $1'],
    [/^(\d+) поколени[еяй]$/, '$1 generations'], [/^(.+) поколение$/, 'Generation $1'],
    [/^Сайт семьи (.+) · составитель — (.+)$/, 'Family website · compiled by $2']
  ];
  function tr(s) {
    var t = String(s), k = t.trim(); if (!k || !/[А-Яа-яЁё]/.test(k)) return null;
    if (D[k] != null) return t.replace(k, D[k]);
    for (var i = 0; i < RX.length; i++) if (RX[i][0].test(k)) return t.replace(k, k.replace(RX[i][0], RX[i][1]));
    return null;
  }
  // семейное содержимое не переводим: имена на схеме, рассказы, подробности, записи родных, тексты генеалога
  var SKIP = 'svg,script,style,.p-bio,.e-text,.e-name,.p-name,.p-sur,.mine-text,.mine-comment,.rich,.fam,.families,.text-sec,.arch td,.p-facts dd,.doc-t,.doc-s,.find-list,.tl-name,.tl-note,.hero h1,.hero .sub,.p-meta';
  function walk(root) {
    if (!root || (root.nodeType === 1 && root.closest && root.closest(SKIP))) return;
    if (root.nodeType === 3) { var v = tr(root.nodeValue); if (v != null && v !== root.nodeValue) root.nodeValue = v; return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) ['placeholder', 'aria-label', 'title'].forEach(function (a) { var x = root.getAttribute(a); if (x) { var y = tr(x); if (y != null) root.setAttribute(a, y); } });
    if (root.nodeType === 1 && /^(INPUT|TEXTAREA)$/.test(root.tagName)) return;   // у полей — только подсказки, введённый текст не трогаем
    for (var c = root.firstChild; c; c = c.nextSibling) walk(c);
  }
  function apply() {
    document.documentElement.lang = 'en'; walk(document.body);
    new MutationObserver(function (ms) { ms.forEach(function (m) { if (m.type === 'characterData') walk(m.target); else m.addedNodes.forEach(walk); if (m.type === 'attributes') walk(m.target); }); })
      .observe(document.body, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title']});
    var c0 = window.confirm, p0 = window.prompt;
    window.confirm = function (m) { return c0.call(window, tr(m) || m); };
    window.prompt = function (m, v) { return p0.call(window, tr(m) || m, v); };
  }
  // переключатель RU / EN: выбор запоминается на устройстве, ?lang=en в адресе — для ссылки
  function toggle() {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'lang-toggle'; b.textContent = LANG === 'en' ? 'RU' : 'EN';
    b.setAttribute('aria-label', LANG === 'en' ? 'Русская версия сайта' : 'English version of the site'); b.setAttribute('lang', LANG === 'en' ? 'ru' : 'en');
    b.onclick = function () {
      var next = LANG === 'en' ? 'ru' : 'en'; try { localStorage.setItem('siteLang', next); } catch (e) {}
      var u = new URL(location.href); u.searchParams.delete('lang'); if (next === 'en') u.searchParams.set('lang', 'en'); location.replace(u.toString());
    };
    var big = document.getElementById('bigText'); if (big && big.parentNode) big.parentNode.insertBefore(b, big.nextSibling); else document.body.appendChild(b);
  }
  window.RodI18n = {t: function (s) { return LANG === 'en' ? (tr(s) || s) : s; }, lang: LANG};
  function init() { toggle(); if (LANG === 'en') apply(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
