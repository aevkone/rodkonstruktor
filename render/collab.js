(function(){
  var API = (window.FAMILY_API || '').trim();
  var KIND = {story:'Воспоминание', fact:'Факт', correction:'Исправление', person:'Новый родственник'};
  var entries = [];
  var current = '';

  var $ = function(id){ return document.getElementById(id); };
  // простой режим проекта: «составитель» вместо «генеалог» (как RodProject.amateur)
  var G = function(s){ if (!window.FAMILY_SIMPLE) return s; var E = {'': 'ь', 'а': 'я', 'у': 'ю', 'ом': 'ем', 'е': 'е', 'и': 'и', 'ов': 'ей', 'ам': 'ям', 'ами': 'ями', 'ах': 'ях'}; return s.replace(/(^|[^А-Яа-яЁё])([Гг])енеалог(ами|ам|ах|ов|ом|а|у|е|и)?(?![А-Яа-яЁё])/g, function(_, p, g, e){ return p + (g === 'Г' ? 'С' : 'с') + 'оставител' + E[e || '']; }); };
  var panel = $('panel'), list = $('panelList'), form = $('addForm'), msg = $('formMsg');
  var feed = $('feed'), ro = !API;
  var FEED_STEP = 20, feedShown = FEED_STEP;

  document.documentElement.classList.toggle('readonly', ro);

  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmt(ts){ try { return new Date(ts).toLocaleDateString('ru-RU', {day:'numeric', month:'long', year:'numeric'}); } catch(e){ return ''; } }
  function personTitle(pid){ var p = (window.FAMILY_PEOPLE || {})[pid]; return p ? ((p.sur ? p.sur + ' ' : '') + p.name).trim() : 'Без привязки к человеку'; }

  // запрос к API: русские ошибки, таймаут 20 секунд, проверка «нет сети»
  function call(method, query, body){
    if (navigator.onLine === false) return Promise.reject(new Error('Нет интернета. Текст сохранён на телефоне — отправьте, когда появится связь'));
    var ctl = window.AbortController ? new AbortController() : null, tm = setTimeout(function(){ if (ctl) ctl.abort(); }, 20000);
    return fetch(API + (query ? (API.indexOf('?') < 0 ? '?' : '&') + query : ''), {method:method, headers:{'Content-Type':'application/json'}, body: body ? JSON.stringify(body) : undefined, signal: ctl ? ctl.signal : undefined})
      .catch(function(e){ throw new Error(e && e.name === 'AbortError' ? 'Сеть очень медленная, сервер не ответил за 20 секунд' : 'Нет связи с сайтом. Проверьте интернет'); })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ if (!r.ok) throw new Error(j.error || (r.status >= 500 ? 'Сайт временно не отвечает' : 'Ошибка ' + r.status)); return j; }); })
      .finally(function(){ clearTimeout(tm); });
  }

  // код устройства: по нему родственник видит статусы своих записей (без входа и без почты)
  function device(){
    var d = null; try { d = localStorage.getItem('rod-device'); } catch(e) {}
    if (!/^[0-9a-f]{32}$/.test(d || '') && window.crypto && crypto.getRandomValues) {
      d = Array.from(crypto.getRandomValues(new Uint8Array(16)), function(b){ return ('0' + b.toString(16)).slice(-2); }).join('');
      try { localStorage.setItem('rod-device', d); } catch(e) {}
    }
    return /^[0-9a-f]{32}$/.test(d || '') ? d : '';
  }
  // «Мои записи»: в карточке — о этом человеке, в общем «Дополнить» — все
  var mineCache = null;
  function hasSent(){ try { return localStorage.getItem('rod-sent:' + API) === '1'; } catch(e) { return false; } }
  function loadMine(force){
    if (ro || !hasSent()) return Promise.resolve([]);
    if (mineCache && !force) return Promise.resolve(mineCache);
    var dv = device(); if (!dv) return Promise.resolve([]);
    return fetch(API.replace(/\/$/, '') + '/mine', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({device: dv})})
      .then(function(r){ return r.ok ? r.json() : {entries: []}; }).then(function(j){ mineCache = j.entries || []; return mineCache; })
      .catch(function(){ return mineCache || []; });
  }
  var ST = {review: ['на проверке', 'st-review'], accepted: ['принято', 'st-ok'], rejected: ['не принято', 'st-no']};
  function renderMine(force){
    var box = $('mine'); if (!box) return;
    var forPid = current;
    loadMine(force).then(function(all){
      if (forPid !== current) return;
      var mineList = all.filter(function(e){ return !forPid || e.person === forPid; });
      box.hidden = !mineList.length; var ul = $('mineList'); ul.textContent = '';
      mineList.forEach(function(e){
        var li = el('li', 'mine-item'), st = ST[e.status] || ST.review;
        var head = el('div', 'mine-head');
        head.appendChild(el('span', 'mine-st ' + st[1], e.merged ? 'внесено в древо' : st[0]));
        head.appendChild(el('span', 'mine-what', (KIND[e.kind] || 'Запись') + (forPid ? '' : ' · ' + (e.personName || personTitle(e.person))) + ' · ' + fmt(e.created)));
        li.appendChild(head);
        var t = e.kind === 'person' ? e.name : e.text; if (t) li.appendChild(el('p', 'mine-text', t));
        if (e.comment) li.appendChild(el('p', 'mine-comment', 'Составитель: ' + e.comment));
        ul.appendChild(li);
      });
    });
  }

  function entryNode(e, showWho){
    var li = el('li', 'entry');
    var head = el('div', 'e-head');
    head.appendChild(el('span', 'e-kind k-' + e.kind, KIND[e.kind] || e.kind));
    head.appendChild(el('span', e.verified ? 'e-ok' : 'e-unv', e.verified ? 'со слов родных · проверено' : 'со слов родных · не проверено'));
    if (showWho) {
      var who = el('button', 'e-who', personTitle(e.person));
      who.type = 'button';
      who.onclick = function(){ openPanel(e.person); };
      head.appendChild(who);
    }
    li.appendChild(head);
    if (e.kind === 'person') {
      var line = [e.relation, e.name].filter(Boolean).join(': ');
      li.appendChild(el('div', 'e-name', line));
      var meta = [e.dates, e.place, e.occupation].filter(Boolean).join(' · ');
      if (meta) li.appendChild(el('div', 'e-meta', meta));
    }
    // голосовое воспоминание: проигрывается с сайта, только после проверки (сервер отдаёт файл лишь из принятых записей)
    if (e.audio && window.FAMILY_FILES) {
      var au = document.createElement('audio'); au.controls = true; au.preload = 'none'; au.src = window.FAMILY_FILES + e.audio + (window.FAMILY_FILE_EXT && window.FAMILY_FILE_EXT[e.audio] ? '.' + window.FAMILY_FILE_EXT[e.audio] : '');
      au.className = 'e-audio'; au.setAttribute('aria-label', 'Рассказ голосом' + (e.author ? ': ' + e.author : ''));
      li.appendChild(au);
    }
    if (e.text) {
      var tx = el('p', 'e-text', e.text);
      if (showWho) { tx.title = 'Нажмите, чтобы развернуть'; tx.onclick = function(){ tx.classList.toggle('open'); }; }
      li.appendChild(tx);
    }
    var foot = el('div', 'e-foot', (e.author || 'Без подписи') + ' · ' + fmt(e.created));
    li.appendChild(foot);
    return li;
  }

  function renderFeed(){
    if (!feed) return;
    feed.textContent = '';
    if (!entries.length) {
      if (ro) { feed.appendChild(el('li', 'empty', 'Дополнения от родных видны на семейном сайте.')); return; }
      var li = el('li', 'empty-cta');
      li.appendChild(el('p', 'ei-title', 'Станьте первым, кто допишет историю семьи'));
      li.appendChild(el('p', 'ei-text', 'Например: где работал дедушка, как познакомились бабушка с дедушкой, чья это фотография.'));
      var b = el('button', 'cta'); b.type = 'button'; b.innerHTML = '<span class="cta-plus" aria-hidden="true">+</span>Добавить воспоминание'; b.onclick = function(){ openPanel(''); };
      li.appendChild(b); feed.appendChild(li); return;
    }
    var rev = entries.slice().reverse();
    rev.slice(0, feedShown).forEach(function(e){ feed.appendChild(entryNode(e, true)); });
    var rest = rev.length - feedShown;
    if (rest > 0) {
      var more = el('li', 'more'), mb = el('button', '', 'Показать ещё ' + Math.min(FEED_STEP, rest) + ' из ' + rest);
      mb.type = 'button'; mb.onclick = function(){ feedShown += FEED_STEP; renderFeed(); };
      more.appendChild(mb); feed.appendChild(more);
    }
  }

  function badge(svg){
    if (!svg) return;
    svg.querySelectorAll('.badge').forEach(function(b){ b.remove(); });
    var counts = {};
    entries.forEach(function(e){ if (e.person) counts[e.person] = (counts[e.person] || 0) + 1; });
    Object.keys(counts).forEach(function(pid){
      var g = svg.querySelector('.node[data-pid="' + pid + '"]'); if (!g) return;
      var r = g.querySelector('.card'); var x = +r.getAttribute('x') + +r.getAttribute('width') - 6, y = +r.getAttribute('y') + 6;
      var ns = 'http://www.w3.org/2000/svg', b = document.createElementNS(ns, 'g'); b.setAttribute('class', 'badge'); b.setAttribute('aria-hidden', 'true');
      var label = counts[pid] > 99 ? '99+' : '+' + counts[pid];
      var c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', label.length > 3 ? 28 : 22);
      var t = document.createElementNS(ns, 'text'); t.setAttribute('x', x); t.setAttribute('y', y + 9); t.textContent = label;
      b.appendChild(c); b.appendChild(t); g.appendChild(b);
    });
  }

  function renderPanel(){
    if (panel.hidden) return;
    list.textContent = '';
    var mine = entries.filter(function(e){ return (e.person || '') === current; });
    if (!mine.length) list.appendChild(el('li', 'empty', current ? 'Дополнений к этому человеку пока нет.' : 'Общих дополнений пока нет.'));
    mine.forEach(function(e){ list.appendChild(entryNode(e, false)); });
  }

  // extra — только что сохранённая запись: ответ GET может прийти из кэша (до 30 с) без неё
  function load(extra){
    if (ro) { renderFeed(); return Promise.resolve(); }
    return call('GET', extra ? 't=' + Date.now() : '').then(function(j){
      entries = j.entries || [];
      if (extra && extra.id && !entries.some(function(e){ return e.id === extra.id; })) entries.push(extra);
      redraw();
      renderFeed(); renderPanel();
    }).catch(function(err){
      if (!feed) return;
      var old = feed.querySelector('.load-err'); if (old) old.remove();
      var li = el('li', 'empty load-err', 'Свежие дополнения не загрузились (' + err.message + '). Показаны сохранённые ранее.');
      feed.insertBefore(li, feed.firstChild);
    });
  }

  var drawnKey = null;
  function redraw(){
    var key = entries.filter(function(e){ return e.kind === 'person'; }).map(function(e){ return e.id; }).join(',');
    var canvas = $('canvas');
    if (key !== drawnKey && window.FamilyTree) {
      // повторная перерисовка — без вступительной анимации
      if (drawnKey !== null) { var ts = $('tree'); ts.classList.remove('tree-play'); ts.classList.add('tree-done'); }
      FamilyTree.draw(canvas, entries);
      hook(canvas.querySelector('svg'));
      drawnKey = key;
    }
    badge(canvas.querySelector('svg'));
    if (window.refreshLens) window.refreshLens();
  }

  // панель человека: плавный вход/выход, фокус внутри, «Назад» на Android закрывает панель
  var lastFocus = null, closeT;
  function siblings(){ return document.querySelectorAll('#page > :not(#panel)'); }
  // родные человека из модели древа: родители, супруги, дети, братья и сёстры
  function relatives(pid){
    var M = window.FAMILY_MODEL; if (!M || !pid) return [];
    var C = M.C.filter(function(c){ return c.kind !== 'sib'; }), out = {par: [], sp: [], kid: [], sib: []};
    C.forEach(function(c){
      if (c.kids.indexOf(pid) >= 0) { [c.a, c.b].forEach(function(x){ if (x) out.par.push(x); }); c.kids.forEach(function(k){ if (k !== pid) out.sib.push(k); }); }
      if (c.a === pid || c.b === pid) { var s = c.a === pid ? c.b : c.a; if (s) out.sp.push(s); c.kids.forEach(function(k){ out.kid.push(k); }); }
    });
    return [['Родители', out.par], ['Супруг(а)', out.sp], ['Дети', out.kid], ['Братья и сёстры', out.sib]].filter(function(g){ return g[1].length; });
  }
  function renderRelatives(pid){
    var box = $('pRel'); box.textContent = '';
    relatives(pid).forEach(function(g){
      var d = document.createElement('div'); d.className = 'p-rel-g';
      var h = document.createElement('span'); h.className = 'p-rel-h'; h.textContent = g[0]; d.appendChild(h);
      g[1].forEach(function(id){
        var P = (window.FAMILY_PEOPLE || {})[id] || {};
        var b = document.createElement('button'); b.type = 'button'; b.className = 'p-rel-a';
        b.textContent = personTitle(id) + (P.dates ? ' · ' + P.dates : '');
        b.onclick = function(){ goRelative(id); };
        d.appendChild(b);
      });
      box.appendChild(d);
    });
  }
  // переход к родственнику: новая запись в истории — «Назад» браузера вернёт к предыдущей карточке
  function goRelative(id){
    try { history.pushState({panel: id}, ''); } catch(e) {}
    openPanel(id, true);
    $('pName').focus();
    if (window.familyFocus) window.familyFocus(id, {noOpen: true});
  }

  // «Сведения и источники»: события с датой и местом; источник и достоверность — если генеалог их не скрыл
  function facts(list){
    var box = $('pFacts'); if (!box) return;
    var withSrc = (window.FAMILY_BASE || {}).showSources !== false, CONF = {doc: 'по документам', ind: 'косвенно', oral: 'со слов родных'};
    list = list.filter(function(f){ return f.text || f.date || f.place || (withSrc && f.src); });
    box.hidden = !list.length; box.textContent = '';
    if (!list.length) return;
    box.appendChild(el('h4', '', withSrc && list.some(function(f){ return f.src || f.conf; }) ? 'Сведения и источники' : 'Сведения'));
    var dl = document.createElement('dl');
    list.forEach(function(f){
      dl.appendChild(el('dt', '', f.k));
      var dd = document.createElement('dd');
      dd.appendChild(document.createTextNode(f.text || [f.date, f.place].filter(Boolean).join(', ')));
      if (withSrc && (f.src || CONF[f.conf])) dd.appendChild(el('small', 'p-src', [f.src, CONF[f.conf]].filter(Boolean).join(' · ')));
      dl.appendChild(dd);
    });
    box.appendChild(dl);
  }

  // «Историческая память»: участие в войне, награды, репрессии и реабилитация — значок, что, год, источник
  function marks(list){
    var box = $('pMarks'); if (!box) return;
    var K = (window.FAMILY_BASE || {}).markKinds || {}, withSrc = (window.FAMILY_BASE || {}).showSources !== false;
    list = list.filter(function(x){ return K[x.k]; });
    box.hidden = !list.length; box.textContent = ''; if (!list.length) return;
    box.appendChild(el('h4', '', 'Историческая память'));
    var ul = el('ul', 'mk-list');
    list.forEach(function(x){
      var li = el('li', 'mk-' + x.k), ic = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      ic.setAttribute('viewBox', '0 0 24 24'); ic.setAttribute('aria-hidden', 'true'); p.setAttribute('d', K[x.k].d); ic.appendChild(p); li.appendChild(ic);
      var t = el('div', 'mk-t'); t.appendChild(el('b', '', K[x.k].label));
      var more = [x.t, x.y ? x.y + ' г.' : ''].filter(Boolean).join(', '); if (more) t.appendChild(document.createTextNode(' — ' + more));
      if (withSrc && x.src) t.appendChild(el('small', 'p-src', x.src));
      li.appendChild(t); ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  // «Документы»: сканы метрик, справок, писем — плитки; открываются в новой вкладке
  function docs(list){
    var box = $('pDocs'); if (!box) return;
    box.hidden = !list.length; box.textContent = ''; if (!list.length) return;
    box.appendChild(el('h4', '', 'Документы'));
    var ul = el('ul', 'doc-grid');
    list.forEach(function(d){
      var li = el('li'), a = document.createElement('a'); a.href = d.url; a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('aria-label', (d.title || 'Документ') + (d.t === 'pdf' ? ' (PDF)' : '') + ' — открыть');
      if (d.t === 'pdf') a.appendChild(el('span', 'doc-pdf', 'PDF')); else { var im = document.createElement('img'); im.src = d.url; im.alt = ''; im.loading = 'lazy'; a.appendChild(im); }
      li.appendChild(a); li.appendChild(el('span', 'doc-t', d.title || 'Документ')); if (d.src) li.appendChild(el('small', 'doc-s', d.src));
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function openPanel(pid, keepHistory){
    clearTimeout(closeT);
    if (panel.hidden) lastFocus = document.activeElement;
    current = pid || '';
    var p = (window.FAMILY_PEOPLE || {})[current];
    $('pSur').textContent = p ? (p.sur || '') : 'Общие сведения';
    var ph = $('pPhoto'); if (ph) { ph.hidden = !(p && p.photo); if (p && p.photo) { ph.src = p.photo; ph.alt = 'Портрет: ' + ((p.sur ? p.sur + ' ' : '') + (p.name || '')).trim(); } else ph.removeAttribute('src'); }
    $('pName').textContent = p ? p.name : 'Дополнение к древу';
    $('pMeta').textContent = p ? [p.dates, p.note].filter(Boolean).join(' · ') : 'Добавьте человека, историю или документ, который не относится к одной карточке.';
    var bio = $('pBio'); bio.hidden = !(p && p.bio); bio.textContent = p && p.bio ? p.bio : '';
    facts(p && p.facts || []);
    marks(p && p.marks || []);
    docs(p && p.docs || []);
    renderRelatives(current);
    var pl = $('pLines'); if (pl) pl.hidden = !current || /^e:/.test(current) || !!((window.FAMILY_BASE || {}).groups || {})[current];
    var sp = $('pSpeak'); if (sp) { sp.hidden = !current || !('speechSynthesis' in window) || /^e:/.test(current); stopSpeak(); }
    var sh = $('pShare'); if (sh) { sh.hidden = ro || !current || /^e:/.test(current); $('pShareMsg').textContent = ''; }
    // адрес карточки — в строке браузера: #p=<код>; «назад» и перезагрузка возвращают к той же карточке
    if (!ro && current && !/^e:/.test(current)) { try { history.replaceState(history.state, '', '#p=' + encodeURIComponent(current)); } catch(e) {} }
    // «Это я»: для живых людей (нет года смерти) — запрос скрыть данные
    var M = window.FAMILY_MODEL, mp = M && M.P[current], me = $('itsMe');
    if (me) {
      var alive = !!(mp && !mp.added && ((window.FAMILY_BASE || {}).living || {})[current]);
      me.hidden = !alive || ro; me.open = false; $('meMsg').textContent = '';
    }
    panel.hidden = false; void panel.offsetWidth; panel.classList.add('open');
    [].forEach.call(siblings(), function(n){ n.inert = true; });
    document.body.classList.add('panel-open');
    if (!keepHistory && (!history.state || history.state.panel === undefined)) { try { history.pushState({panel: current}, ''); } catch(e) {} }
    msg.textContent = ''; msg.className = 'form-msg';
    loadDraft();
    renderPanel();
    form.classList.remove('is-sent'); form.classList.remove('on-step2');
    syncParent2(); setTimeout(grow, 0);
    renderMine();
    if (!keepHistory) setTimeout(function(){ $('panelClose').focus(); }, 30);
    panel.querySelector('.panel-box').scrollTop = 0;
  }
  function hidePanel(){
    stopSpeak();
    if (/^#p=/.test(location.hash)) { try { history.replaceState(history.state, '', location.pathname + location.search); } catch(e) {} }
    panel.classList.remove('open'); document.body.classList.remove('panel-open');
    [].forEach.call(siblings(), function(n){ n.inert = false; });
    clearTimeout(closeT);
    closeT = setTimeout(function(){ if (!panel.classList.contains('open')) panel.hidden = true; }, 220);
    var back = lastFocus && lastFocus !== document.body && document.contains(lastFocus) ? lastFocus : document.querySelector('#canvas .node[data-pid="' + current + '"]');
    if (back && back.focus) back.focus({preventScroll: true});
  }
  function unsent(){ return !ro && !form.classList.contains('is-sent') && ['text','name'].some(function(f){ return form.elements[f] && form.elements[f].value.trim(); }); }
  function closePanel(){
    if (unsent() && !confirm('В форме есть неотправленный текст. Закрыть? Черновик останется на этом устройстве — его можно будет дописать и отправить позже.')) return; if (history.state && history.state.panel !== undefined) history.back(); else hidePanel(); }
  window.addEventListener('popstate', function(){
    var st = history.state;
    if (st && st.panel !== undefined && panel.classList.contains('open') && st.panel !== current) { openPanel(st.panel, true); $('pName').focus(); return; }
    if (panel.classList.contains('open')) hidePanel();
  });
  // после перезагрузки страницы с открытой панелью в истории — начинаем с чистого состояния
  try { if (history.state && history.state.panel !== undefined) history.replaceState(null, ''); } catch(e) {}

  // черновик формы: на случай обрыва связи текст остаётся на устройстве
  var DRAFT = ['kind','relation','parent2','name','dates','place','occupation','text'];
  function draftKey(){ return 'draft:' + (current || '_'); }
  function saveDraft(){
    var d = {}; DRAFT.forEach(function(f){ d[f] = form.elements[f].value; });
    var has = d.text || d.name;
    try { if (has) localStorage.setItem(draftKey(), JSON.stringify(d)); else localStorage.removeItem(draftKey()); } catch(e) {}
    var dn = $('draftNote'); dn.hidden = !has;
    if (has) dn.textContent = '✓ Черновик сохранён на этом устройстве · ' + new Date().toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
  }
  function loadDraft(){
    var d = null; try { d = JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch(e) {}
    DRAFT.forEach(function(f){ if (f !== 'kind' && f !== 'relation') form.elements[f].value = d ? (d[f] || '') : ''; });
    $('fParent2').dataset.want = d && d.parent2 || '';   // список супругов строится позже — выбор восстановим тогда
    if (d) { form.elements.kind.value = d.kind || 'story'; form.elements.relation.value = d.relation || ''; } else form.elements.relation.value = '';
    form.querySelectorAll('[aria-invalid]').forEach(function(f){ f.removeAttribute('aria-invalid'); });
    $('draftNote').hidden = !d; syncKind();
  }
  form.addEventListener('input', function(e){ if (e.target.removeAttribute) e.target.removeAttribute('aria-invalid'); saveDraft(); });
  // поле в фокусе не прячется под клавиатурой телефона
  form.addEventListener('focusin', function(e){ if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) setTimeout(function(){ e.target.scrollIntoView({block: 'center', behavior: 'smooth'}); }, 300); });
  window.familyOpen = function(pid){ openPanel(pid); };

  $('panelClose').onclick = closePanel;
  $('panelBack').onclick = closePanel;
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && panel.classList.contains('open')) closePanel(); });
  var addAny = $('addAny'); if (addAny) addAny.onclick = function(){ openPanel(''); };
  var meForm = $('meForm');
  if (meForm) meForm.addEventListener('submit', function(ev){
    ev.preventDefault();
    var hide = [].slice.call(meForm.querySelectorAll('[name=hide]:checked')).map(function(c){ return c.value; }), m = $('meMsg');
    var data = {kind: 'privacy', person: current, hide: hide, contact: meForm.elements.contact.value, text: meForm.elements.text.value, consentAuthor: meForm.elements.consentAuthor.checked};
    if (!hide.length) { m.className = 'form-msg err'; m.textContent = 'Отметьте, что скрыть.'; return; }
    if (!data.contact.trim()) { m.className = 'form-msg err'; m.textContent = 'Оставьте почту или телефон для ответа.'; return; }
    if (!data.consentAuthor) { m.className = 'form-msg err'; m.textContent = 'Отметьте согласие на обработку ваших данных.'; return; }
    call('POST', '', data).then(function(){ m.className = 'form-msg ok'; m.textContent = '✓ Запрос отправлен составителю древа. Он ответит по указанному контакту.'; meForm.reset(); })
      .catch(function(err){ m.className = 'form-msg err'; m.textContent = 'Не отправилось: ' + err.message; });
  });
  // «Меня нет в древе»: общая карточка, в тексте — что написать, чтобы генеалог поставил человека на место
  window.familyAddMe = function(){
    openPanel('');
    form.elements.kind.value = 'story'; syncKind();
    var t = form.elements.text;
    if (!t.value) t.placeholder = G('Напишите, кто вы и кем приходитесь людям в древе. Например: «Я, Анна Петровна Соколова, 1985 г., дочь Петра Ильича». Генеалог добавит вас на место.');
    setTimeout(function(){ t.focus(); }, 80);
  };
  var notMe = $('notMe'); if (notMe) notMe.onclick = window.familyAddMe;

  // ↑ первый из родителей, ↓ первый ребёнок, ← → супруг на той стороне или сосед по поколению
  function arrowTarget(pid, key){
    var M = window.FAMILY_MODEL; if (!M || !M.P[pid]) return null;
    var me = M.P[pid], C = M.C.filter(function(c){ return c.kind !== 'sib'; });
    if (key === 'ArrowUp') { var pc = C.filter(function(c){ return c.kids.indexOf(pid) >= 0; })[0]; return pc ? pc.a || pc.b : null; }
    if (key === 'ArrowDown') { var own = C.filter(function(c){ return (c.a === pid || c.b === pid) && c.kids.length; })[0]; return own ? own.kids[0] : null; }
    if (key !== 'ArrowLeft' && key !== 'ArrowRight') return null;
    var row = M.order.filter(function(id){ return M.P[id].gen === me.gen; }).sort(function(a, b){ return M.P[a].x - M.P[b].x; });
    var i = row.indexOf(pid) + (key === 'ArrowRight' ? 1 : -1);
    return row[i] || null;
  }

  function hook(svg){
    if (!svg) return;
    svg.querySelectorAll('.node[data-pid]').forEach(function(g){
      g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
      var P = (window.FAMILY_PEOPLE || {})[g.dataset.pid] || {};
      var MP = (window.FAMILY_MODEL || {P: {}}).P[g.dataset.pid] || {}, BN = ((window.FAMILY_BASE || {}).branchNames || {})[MP.fam];
      g.setAttribute('aria-label', personTitle(g.dataset.pid) + (P.dates ? ', ' + P.dates : '') + (BN ? ', ветвь ' + BN : MP.fam === 'i' ? ', вошёл(ла) в род браком' : '') + '. Открыть карточку');
      g.addEventListener('click', function(){ openPanel(g.dataset.pid); });
      g.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(g.dataset.pid); return; }
        var to = arrowTarget(g.dataset.pid, e.key); if (!to) return;
        e.preventDefault();
        var n = svg.querySelector('.node[data-pid="' + to + '"]'); if (n) { n.focus(); n.scrollIntoView({block: 'nearest', inline: 'nearest'}); }
      });
    });
  }
  drawnKey = (window.FAMILY_ENTRIES || []).filter(function(e){ return e.kind === 'person'; }).map(function(e){ return e.id; }).join(',');
  entries = window.FAMILY_ENTRIES || [];
  hook(document.querySelector('#canvas svg'));
  badge(document.querySelector('#canvas svg'));

  // «Показать предков / потомков»: закрыть карточку и оставить на схеме только эту линию
  if ($('pLines')) $('pLines').onclick = function(e){
    var b = e.target.closest('[data-line]'); if (!b || !current || !window.familyLine) return;
    var pid = current; closePanel();
    setTimeout(function(){ window.familyLine(pid, b.dataset.line); }, 260);
  };
  // «Прочитать вслух»: имя, годы, занятие, подробности и сведения — русским голосом браузера
  function stopSpeak(){ try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch(e) {} var b = $('pSpeak'); if (b) { b.setAttribute('aria-pressed', 'false'); b.textContent = '🔊 Прочитать вслух'; } }
  if ($('pSpeak')) $('pSpeak').onclick = function(){
    var b = this; if (b.getAttribute('aria-pressed') === 'true') { stopSpeak(); return; }
    var p = (window.FAMILY_PEOPLE || {})[current]; if (!p) return;
    var parts = [((p.sur ? p.sur + ' ' : '') + (p.name || '')).trim()];
    if (p.dates) parts.push(String(p.dates).replace(/–|—/g, ' — ').replace(/†/g, 'умер в').replace(/~/g, 'около '));
    if (p.note) parts.push(p.note.replace(/·/g, ','));
    (p.facts || []).forEach(function(f){ var t = f.text || [f.date, f.place].filter(Boolean).join(', '); if (t) parts.push(f.k + ': ' + t); });
    if (p.bio) parts.push(p.bio);
    var u = new SpeechSynthesisUtterance(parts.join('. ').replace(/\s+/g, ' ')); u.lang = 'ru-RU'; u.rate = 0.95;
    var ru = (speechSynthesis.getVoices() || []).filter(function(v){ return /^ru/i.test(v.lang); })[0]; if (ru) u.voice = ru;
    u.onend = u.onerror = function(){ stopSpeak(); };
    speechSynthesis.cancel(); speechSynthesis.speak(u);
    b.setAttribute('aria-pressed', 'true'); b.textContent = '⏹ Остановить чтение';
  };

  // «Записать рассказ голосом»: до 5 минут, прослушать перед отправкой
  var voiceBlob = null, rec = null, recT = null, recStart = 0, recStream = null, MAX_REC = 300;
  var canRec = !ro && window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  if ($('vRec') && canRec) form.querySelector('.voicefield').hidden = false;
  function recTime(){ var s = Math.floor((Date.now() - recStart) / 1000); $('vTime').textContent = '● ' + Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2) + ' из 5:00'; if (s >= MAX_REC) stopRec(); }
  function stopRec(){ if (rec && rec.state === 'recording') rec.stop(); clearInterval(recT); if (recStream) recStream.getTracks().forEach(function(t){ t.stop(); }); }
  function clearVoice(){ voiceBlob = null; $('vDone').hidden = true; $('vPlay').removeAttribute('src'); $('vTime').textContent = ''; $('vRec').textContent = '🎙 Записать рассказ голосом'; }
  if ($('vRec')) $('vRec').onclick = function(){
    if (rec && rec.state === 'recording') { stopRec(); return; }
    navigator.mediaDevices.getUserMedia({audio: true}).then(function(stream){
      recStream = stream; var chunks = [];
      var type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].filter(function(t){ return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); })[0];
      rec = new MediaRecorder(stream, type ? {mimeType: type, audioBitsPerSecond: 32000} : {audioBitsPerSecond: 32000});
      rec.ondataavailable = function(e){ if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function(){
        voiceBlob = new Blob(chunks, {type: (rec.mimeType || 'audio/webm').split(';')[0]});
        $('vPlay').src = URL.createObjectURL(voiceBlob); $('vDone').hidden = false;
        $('vRec').textContent = '🎙 Записать заново'; $('vTime').textContent = 'Готово — прослушайте перед отправкой.';
      };
      rec.start(1000); recStart = Date.now(); recT = setInterval(recTime, 500); recTime();
      $('vRec').textContent = '⏹ Остановить запись'; $('vDone').hidden = true;
    }).catch(function(){ $('vTime').textContent = 'Нет доступа к микрофону — разрешите его в браузере.'; });
  };
  if ($('vDel')) $('vDel').onclick = clearVoice;
  function blobToData(b){ return new Promise(function(ok, fail){ var r = new FileReader(); r.onload = function(){ ok(String(r.result).replace(/^data:audio\/([a-z0-9-]+)(;[^,]*)?;base64,/i, function(m, t){ return 'data:audio/' + t + ';base64,'; })); }; r.onerror = fail; r.readAsDataURL(b); }); }

  // «Поделиться карточкой»: на телефоне — системное меню, на компьютере — копирование ссылки
  function shareUrl(id){ return location.origin + location.pathname + '#p=' + encodeURIComponent(id); }
  if ($('pShare')) $('pShare').onclick = function(){
    var url = shareUrl(current), msgEl = $('pShareMsg'), alive = !!((window.FAMILY_BASE || {}).living || {})[current];
    // в тексте — имя только умерших; о живых — без имени (превью и подпись могут уйти в чужой чат)
    var title = document.title, text = alive ? 'Карточка на сайте нашей семьи' : 'Карточка: ' + personTitle(current);
    var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (navigator.share && touch) { navigator.share({title: title, text: text, url: url}).catch(function(){}); return; }
    var done = function(){ msgEl.textContent = '✓ Ссылка скопирована — отправьте её родным.' + (document.documentElement.dataset.locked ? ' Сайт под паролем: пароль сообщите отдельно.' : ''); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function(){ prompt('Скопируйте ссылку:', url); });
    else prompt('Скопируйте ссылку:', url);
  };
  // открыть сайт сразу с карточкой: /s/<адрес>/#p=<код>
  function fromHash(){
    var m = /^#p=([^&]+)/.exec(location.hash || ''); if (!m) return;
    var id = decodeURIComponent(m[1]);
    if (!(window.FAMILY_PEOPLE || {})[id] || (panel.classList.contains('open') && current === id)) return;
    if (window.familyFocus) window.familyFocus(id); else openPanel(id);
  }
  window.addEventListener('hashchange', fromHash);
  setTimeout(fromHash, 400);
  if (document.fonts) document.fonts.ready.then(function(){ drawnKey = null; redraw(); });

  $('sentMore').onclick = function(){ form.classList.remove('is-sent'); $('fText').focus(); };
  var kindSel = $('fKind');
  function syncKind(){ form.classList.toggle('is-person', kindSel.value === 'person'); form.classList.toggle('is-photo', kindSel.value === 'photo'); syncParent2(); }
  // «сын / дочь»: второй родитель — из супругов человека (если их больше одного или есть хотя бы один)
  function syncParent2(){
    var box = form.querySelector('.p2field'), sel = $('fParent2'); if (!box) return;
    var M = window.FAMILY_MODEL, sp = [];
    if (M && current) M.C.forEach(function(c){ if (c.kind !== 'sib' && (c.a === current || c.b === current)) { var o = c.a === current ? c.b : c.a; if (o && sp.indexOf(o) < 0 && !/^e:/.test(o)) sp.push(o); } });
    var show = kindSel.value === 'person' && /^(сын|дочь)$/.test(form.elements.relation.value) && sp.length > 0;
    box.hidden = !show;
    var keep = sel.value || sel.dataset.want || ''; sel.dataset.want = '';
    sel.textContent = '';
    if (sp.length > 1 || !show) sel.appendChild(new Option('— не знаю —', ''));
    sp.forEach(function(id){ sel.appendChild(new Option(personTitle(id), id)); });
    if (keep && sp.indexOf(keep) >= 0) sel.value = keep;
  }
  form.elements.relation.addEventListener('change', syncParent2);
  // текст: поле растёт по мере ввода, счётчик знаков, вставка из Word — без мягких переносов и неразрывных пробелов
  var fText = $('fText');
  function grow(){ fText.style.height = 'auto'; fText.style.height = Math.min(fText.scrollHeight + 2, window.innerHeight * 0.7) + 'px';
    var n = fText.value.length; $('fTextCount').textContent = n > 2500 ? n + ' из 20 000 знаков' : ''; }
  fText.addEventListener('input', grow);
  fText.addEventListener('paste', function(e){
    var t = e.clipboardData && e.clipboardData.getData('text/plain'); if (t == null) return;
    e.preventDefault();
    t = t.replace(/\r\n?/g, '\n').replace(/[\u00ad\u200b\ufeff]/g, '').replace(/[\u00a0\u2007\u202f]/g, ' ').replace(/\t/g, ' ').replace(/[ ]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
    var a = fText.selectionStart, b = fText.selectionEnd;
    fText.setRangeText ? fText.setRangeText(t, a, b, 'end') : (fText.value = fText.value.slice(0, a) + t + fText.value.slice(b));
    fText.dispatchEvent(new Event('input', {bubbles: true}));
  });
  // телефон: два шага — «о ком» → «что вы знаете»
  function step(n){ form.classList.toggle('on-step2', n === 2); var f = n === 2 ? fText : kindSel; setTimeout(function(){ f.focus(); }, 30); }
  $('fNext').onclick = function(){
    if (kindSel.value === 'person' && (!form.elements.relation.value || !form.elements.name.value.trim())) { msg.className = 'form-msg err'; msg.textContent = !form.elements.relation.value ? 'Выберите, кем человек приходится.' : 'Впишите хотя бы имя родственника.'; (form.elements.relation.value ? form.elements.name : form.elements.relation).focus(); return; }
    msg.textContent = ''; step(2);
  };
  $('fBack').onclick = function(){ step(1); };
  kindSel.onchange = syncKind; syncKind();
  try { $('fAuthor').value = localStorage.getItem('author') || ''; } catch(e) {}

  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    if (ro) return;
    var data = {person: current, personName: current ? personTitle(current) : ''};
    ['kind','relation','parent2','name','dates','place','occupation','text','author','website','contact'].forEach(function(f){
      var i = form.elements[f]; data[f] = i ? i.value : '';
    });
    data.consentAuthor = !!(form.elements.consentAuthor && form.elements.consentAuthor.checked);
    data.consentSubject = data.kind === 'person' && !!(form.elements.consentSubject && form.elements.consentSubject.checked);
    if (data.kind !== 'person') { data.relation = ''; data.name = ''; data.dates = ''; data.place = ''; data.occupation = ''; }
    if (!/^(сын|дочь)$/.test(data.relation)) data.parent2 = '';
    var btn = $('fSend');
    var photoFile = data.kind === 'photo' && $('fPhotoR') ? $('fPhotoR').files[0] : null;
    var withVoice = !!voiceBlob && (data.kind === 'story' || data.kind === 'fact');
    var bad = data.kind === 'person' ? (!data.relation && 'fRel') || (!data.name.trim() && 'fName') : data.kind === 'photo' ? (!current && 'fKind') || (!photoFile && 'fPhotoR') : (!data.text.trim() && !withVoice && 'fText');
    if (!bad && data.kind === 'person' && !data.consentSubject) bad = 'consentSubject';
    if (!bad && !data.consentAuthor) bad = 'consentAuthor';
    if (bad) {
      var f = $(bad) || form.elements[bad]; f.setAttribute('aria-invalid', 'true'); msg.className = 'form-msg err';
      msg.textContent = bad === 'consentSubject' ? 'Отметьте, что вносите сведения с согласия этого человека.' : bad === 'consentAuthor' ? 'Отметьте согласие на обработку ваших данных.' : bad === 'fRel' ? 'Выберите, кем человек приходится.' : bad === 'fName' ? 'Впишите хотя бы имя родственника.' : bad === 'fKind' ? 'Откройте карточку человека, чьё это фото.' : bad === 'fPhotoR' ? 'Выберите фотографию.' : 'Напишите пару слов — что вы знаете.';
      f.focus(); return;
    }
    try { localStorage.setItem('author', data.author); } catch(e) {}
    var sentFor = current, sentKey = draftKey(), before = {};
    entries.forEach(function(e){ before[e.id] = 1; });
    // одна и та же отправка после таймаута не создаёт дубль
    var cidKey = 'cid:' + sentKey, cid = null;
    try { cid = localStorage.getItem(cidKey); } catch(e) {}
    if (!cid && window.crypto && crypto.getRandomValues) {
      cid = Array.from(crypto.getRandomValues(new Uint8Array(8)), function(b){ return ('0' + b.toString(16)).slice(-2); }).join('');
      try { localStorage.setItem(cidKey, cid); } catch(e) {}
    }
    if (cid) data.cid = cid;
    var dv = device(); if (dv) data.device = dv;
    btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.classList.remove('done'); btn.textContent = 'Сохраняю';
    msg.className = 'form-msg'; msg.textContent = '';
    // фото сжимаем в браузере до 200 КБ и отправляем вместе с записью
    var docFile = data.kind !== 'photo' && data.kind !== 'person' && $('fDoc') ? $('fDoc').files[0] : null;
    var prep = photoFile ? window.RodPhoto.prepare(photoFile).then(function(u){ data.photo = u; }) : docFile ? window.RodPhoto.prepareDoc(docFile).then(function(d){ data.doc = d.data; }) : Promise.resolve();
    if (withVoice) prep = prep.then(function(){ return blobToData(voiceBlob); }).then(function(a){ data.audio = a; });
    prep.then(function(){ return call('POST', '', data); }).then(function(res){
      try { localStorage.removeItem(sentKey); localStorage.removeItem(cidKey); } catch(e) {}
      var mine = current === sentFor && panel.classList.contains('open');
      if (mine) {
        // понятный экран вместо строки: кому ушло, что будет дальше, где смотреть статус
        var who = (window.FAMILY_GENEALOGIST || '').trim();
        var mod = !!(res && res.moderated);
        document.querySelector('#sentBox .sent-title').textContent = mod ? '✓ Запись отправлена составителю древа' + (who ? ' — ' + who : '') : '✓ Запись сохранена';
        $('sentText').textContent = mod
          ? 'Составитель проверит её и добавит на сайт. Статус — в блоке «Мои записи»: «на проверке», «принято» или «не принято».'
          : data.kind === 'person' ? 'Человек уже стоит в общем древе, его видят все родные.' : 'Дополнение уже видят все родные.';
        form.classList.add('is-sent'); msg.textContent = '';
        try { localStorage.setItem('rod-sent:' + API, '1'); } catch(e) {}
        renderMine(true);
        setTimeout(function(){ $('sentBox').focus({preventScroll: true}); $('sentBox').scrollIntoView({block: 'nearest', behavior: 'smooth'}); }, 30);
        $('draftNote').hidden = true;
        msg.scrollIntoView({block: 'nearest', behavior: 'smooth'});
        ['name','dates','place','occupation','text','contact'].forEach(function(f){ if (form.elements[f]) form.elements[f].value = ''; });
        if ($('fPhotoR')) $('fPhotoR').value = '';
        if ($('fDoc')) $('fDoc').value = '';
        if ($('vRec')) clearVoice();
        btn.classList.add('done'); btn.textContent = '✓ Сохранено';
        setTimeout(function(){ btn.classList.remove('done'); btn.textContent = 'Сохранить'; }, 2200);
      }
      // на сайте с проверкой запись не показываем, пока генеалог её не примет
      return load(res && !res.moderated && res.entry).then(function(){
        if (data.kind !== 'person' || (res && res.moderated)) return;
        var fresh = entries.filter(function(e){ return e.kind === 'person' && !before[e.id]; })[0]; if (!fresh) return;
        setTimeout(function(){
          if (mine && current === sentFor && panel.classList.contains('open')) closePanel();
          var pid = 'e:' + fresh.id, g = document.querySelector('#canvas .node[data-pid="' + pid + '"]');
          if (g) g.classList.add('just-added');
          if (window.familyFocus) window.familyFocus(pid, {noOpen: true});
        }, 1200);
      });
    }).catch(function(err){
      if (current === sentFor) { msg.className = 'form-msg err'; msg.textContent = 'Не сохранилось: ' + err.message + '. Текст остался в черновике — попробуйте ещё раз.'; }
    }).then(function(){
      btn.disabled = false; btn.removeAttribute('aria-busy'); if (!btn.classList.contains('done')) btn.textContent = 'Сохранить';
    });
  });

  window.familyRehook = function(svg){ badge(svg); };
  renderFeed(); // сначала показать снимок, сделанный при сборке
  addEventListener('online', function(){ load(); });
  load();
})();
