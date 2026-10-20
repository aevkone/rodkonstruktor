(function(){
  var $ = function(id){ return document.getElementById(id); };
  var page = $('page'), c = $('canvas'), sc = $('scroller');
  // «А+ Крупно»: шрифт на четверть крупнее, без засечек, чёрным по белому; выбор запоминается
  var bt = $('bigText');
  function big(on, save){
    document.documentElement.classList.toggle('big', on);
    if (bt) { bt.setAttribute('aria-pressed', on); bt.textContent = on ? 'А− Обычно' : 'А+ Крупно'; }
    if (save) try { localStorage.setItem('bigText', on ? '1' : '0'); } catch(e) {}
  }
  try { big(localStorage.getItem('bigText') === '1', false); } catch(e) {}
  if (bt) bt.onclick = function(){ big(!document.documentElement.classList.contains('big'), true); };
  FamilyTree.draw(c, window.FAMILY_ENTRIES);

  // цифры на первом экране: один раз плавно дорастают до значения
  var counted = false;
  function count(el, n){
    if (!el) return;
    if (counted || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = n; return; }
    var t0 = performance.now() + 400, D = 900;
    (function step(t){ var k = Math.min(1, Math.max(0, (t - t0) / D)); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); })(performance.now());
  }
  function facts(){ var s = window.FAMILY_STATS || {}; if (s.people) count($('fPeople'), s.people); if (s.generations) count($('fGens'), s.generations); counted = true; }
  facts();

  // сколько фамилий в древе: Кочергин/Кочергина → один род; новые фамилии от родных тоже считаются
  function clans(){
    var P = window.FAMILY_PEOPLE || {}, set = {};
    Object.keys(P).forEach(function(id){
      String(P[id].sur || '').split('-').forEach(function(w){
        w = w.trim().toLowerCase(); if (!w || /\s/.test(w)) return;
        var m = w.match(/^(.+?)(ский|ская|цкий|цкая|ин|ина|ын|ына|ов|ова|ев|ева|ёв|ёва)$/);
        if (m) set[m[1] + m[2].replace(/а$/, '').replace('ская', 'ский').replace('цкая', 'цкий')] = 1;
        else if (!/[аеёиоуыэюяй]$/.test(w)) set[w] = 1;
      });
    });
    var n = Object.keys(set).length, el = $('fFams'), wd = $('fFamsWord');
    if (el && n) el.textContent = n;
    if (wd && n) { var a = n % 10, b = n % 100; wd.textContent = a === 1 && b !== 11 ? 'фамилия' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'фамилии' : 'фамилий'; }
  }

  // масштаб схемы: целиком и три ступени увеличения (в долях ширины схемы)
  var LEVELS = [0, .36, .5, .8], NAMES = ['Целиком', 'Читаемо', 'Крупно', 'Очень крупно'], level = 0;
  var lastW = 0;
  function levelPx(n){ var s = c.querySelector('svg'); return Math.round((s ? s.viewBox.baseVal.width : 7200) * LEVELS[n]); }
  function setLevel(n, keepCenter){
    n = Math.max(0, Math.min(LEVELS.length - 1, n));
    var before = c.offsetWidth, mid = (sc.scrollLeft + sc.clientWidth / 2) / (before || 1);
    level = n; lastW = 0;
    c.style.width = n ? levelPx(n) + 'px' : '';
    c.classList.toggle('big', n > 0);
    $('zoomLevel').textContent = NAMES[n];
    $('zoomOut').disabled = n === 0; $('zoomIn').disabled = n === LEVELS.length - 1;
    if (keepCenter !== false) sc.scrollLeft = mid * c.offsetWidth - sc.clientWidth / 2;
    try { localStorage.setItem('zoomLevel', String(n)); } catch(e) {}
    mini();
  }
  $('zoomIn').onclick = function(){ setLevel(level + 1); };
  $('zoomOut').onclick = function(){ setLevel(level - 1); };

  // мини-карта: где мы сейчас на большой схеме
  var mm = $('minimap'), mmIn = $('mmIn'), mmView = $('mmView');
  function mini(){
    mm.hidden = level === 0;
    if (mm.hidden) return;
    var w = c.offsetWidth || 1;
    mmView.style.left = (sc.scrollLeft / w * 100) + '%';
    mmView.style.width = Math.min(100, sc.clientWidth / w * 100) + '%';
  }
  sc.addEventListener('scroll', mini, {passive: true});
  mm.addEventListener('click', function(e){
    var r = mm.getBoundingClientRect(), f = (e.clientX - r.left) / r.width;
    sc.scrollTo({left: f * c.offsetWidth - sc.clientWidth / 2, behavior: 'smooth'});
  });

  // копии схемы в лупе и мини-карте скрыты от экранного диктора и от Tab
  function quiet(copy){ copy.setAttribute('aria-hidden', 'true'); copy.querySelectorAll('[tabindex]').forEach(function(n){ n.removeAttribute('tabindex'); }); }

  // лупа — только для мыши
  var lens = $('lens'), lin = $('lensIn'), lb = $('lensbtn'), copy = null, on = true;
  function src(){ return c.querySelector('svg'); }
  var lastFound = null, lineOn = false, lineDir = 'up';
  window.refreshLens = function(){
    if (lastFound) { var f = c.querySelector('.node[data-pid="' + lastFound + '"]'); if (f) { f.classList.add('found'); if (lineOn && !f.closest('svg').classList.contains('has-line')) lineage(lastFound, lineDir); } }
    lin.textContent = ''; copy = src().cloneNode(true); quiet(copy); lin.appendChild(copy); lastW = 0;
    mmIn.textContent = ''; var m = src().cloneNode(true); m.removeAttribute('id'); quiet(m); mmIn.appendChild(m);
    if (level && Math.abs(c.offsetWidth - levelPx(level)) > 1) setLevel(level, true); // ширина схемы изменилась после перерисовки
    facts();
    clans();
    if (window.familyRelist) window.familyRelist();   // список поколений — после каждой перерисовки (новые записи родных)
  };
  window.refreshLens();
  lb.onclick = function(){ on = !on; lb.setAttribute('aria-pressed', on); if (!on) lens.hidden = true;
    try { localStorage.setItem('lens', on ? '1' : '0'); } catch(e) {} };
  try { var ls = localStorage.getItem('lens'); if (ls === '0' || (ls === null && matchMedia('(pointer: coarse)').matches && innerWidth < 700)) lb.onclick(); } catch(e) {}   // на телефоне лупа мешает прокрутке, на планшете — включена

  // подсказка лупы исчезает после первого использования
  function hideLensHint(){ document.querySelectorAll('.lens-hint.mouse-only').forEach(function(h){ h.classList.add('seen'); }); }
  try { if (localStorage.getItem('lensSeen')) hideLensHint(); } catch(e) {}

  // лупа: одно обновление на кадр, ширину копии меняем только при смене масштаба
  var pend = null, raf = 0;
  var touching = false;
  function move(e){
    if (!on || !copy || (e.pointerType !== 'mouse' && !touching)) return;
    if (!move.seen) { move.seen = 1; try { localStorage.setItem('lensSeen', '1'); } catch(er) {} setTimeout(hideLensHint, 4000); }
    pend = e; if (!raf) raf = requestAnimationFrame(frame);
  }
  function frame(){
    raf = 0; var e = pend; if (!e) return;
    var s = src(), r = s.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) { lens.hidden = true; return; }
    var vb = s.viewBox.baseVal.width, z = Math.max(1.3, (level ? 1.1 : .7) * vb / r.width);
    lens.hidden = false; var R = lens.offsetWidth / 2, w = Math.round(r.width * z);
    if (w !== lastW) { copy.style.width = w + 'px'; lastW = w; }
    lens.style.transform = 'translate(' + (e.clientX - R) + 'px,' + (e.clientY - R) + 'px)';
    lin.style.transform = 'translate(' + (R - x * z) + 'px,' + (R - y * z) + 'px)';
  }
  c.addEventListener('pointermove', move);
  c.addEventListener('pointerleave', function(){ if (!touching) { pend = null; lens.hidden = true; } });
  c.addEventListener('pointerdown', function(e){
    if (on && e.pointerType !== 'mouse') { touching = true; move(e); return; }
    pend = null; lens.hidden = true;
  });
  addEventListener('pointerup', function(){ if (touching) { touching = false; setTimeout(function(){ if (!touching) lens.hidden = true; }, 1200); } });
  // пока лупа включена, палец водит лупой, а не листает схему
  c.addEventListener('touchmove', function(e){ if (on && touching) e.preventDefault(); }, {passive: false});

  // на телефоне по умолчанию «Крупно», если масштаб ещё не выбирали
  var coarse = matchMedia('(pointer: coarse)').matches;
  var svg0 = c.querySelector('svg'), vbw = svg0 ? svg0.viewBox.baseVal.width : 7200;
  var def = coarse ? 2 : (sc.clientWidth * 35 / vbw < 12 ? 1 : 0);
  try { var saved = localStorage.getItem('zoomLevel'); setLevel(saved !== null ? +saved : def, false); } catch(e) { setLevel(def, false); }
  if (coarse && level > 0) { var first = c.querySelector('.node[data-pid]'); if (first) { var fr = first.getBoundingClientRect(), sr0 = sc.getBoundingClientRect(); sc.scrollLeft += fr.left - sr0.left - 24; mini(); } }

  // «Ваша линия»: от найденного человека вверх к предкам; dir = 'down' — вниз к потомкам
  function lineage(pid, dir){
    if (dir === 'down') return descent(pid);
    var svg = c.querySelector('svg'); if (!svg) return;
    svg.querySelectorAll('.lineage,.anc').forEach(function(n){ n.classList.remove('lineage', 'anc'); n.style.removeProperty('--d'); });
    var q = [[pid, 0]], seen = {}, depth = 0, top = pid; seen[pid] = 1;
    while (q.length) {
      var it = q.shift();
      svg.querySelectorAll('path.kin[data-kid="' + it[0] + '"]').forEach(function(p){
        p.classList.add('lineage'); p.style.setProperty('--d', it[1]);
        (p.getAttribute('data-par') || '').split(' ').forEach(function(a){
          if (a && !seen[a]) {
            seen[a] = 1; q.push([a, it[1] + 1]);
            if (it[1] + 1 > depth) { depth = it[1] + 1; top = a; }
            var n = svg.querySelector('.node[data-pid="' + a + '"]'); if (n) { n.classList.add('anc'); n.style.setProperty('--d', it[1] + 1); }
          }
        });
      });
    }
    svg.classList.toggle('has-line', depth > 0);
    var note = $('lineNote');
    if (note) {
      note.hidden = !depth;
      var P = (window.FAMILY_PEOPLE || {})[top] || {};
      note.querySelector('span').textContent = 'Ваша линия: ' + depth + ' поколен' + (depth === 1 ? 'ие' : depth < 5 ? 'ия' : 'ий') + ', самый ранний предок — ' + ((P.sur ? P.sur + ' ' : '') + (P.name || '')).trim();
    }
  }
  // потомки: от человека вниз по линиям «родитель → ребёнок»; остальное приглушается
  function descent(pid){
    var svg = c.querySelector('svg'); if (!svg) return;
    svg.querySelectorAll('.lineage,.anc').forEach(function(n){ n.classList.remove('lineage', 'anc'); n.style.removeProperty('--d'); });
    var q = [[pid, 0]], seen = {}, depth = 0, count = 0; seen[pid] = 1;
    while (q.length) {
      var it = q.shift();
      svg.querySelectorAll('path.kin[data-par]').forEach(function(p){
        if ((' ' + p.getAttribute('data-par') + ' ').indexOf(' ' + it[0] + ' ') < 0) return;
        var k = p.getAttribute('data-kid'); p.classList.add('lineage'); p.style.setProperty('--d', it[1]);
        if (k && !seen[k]) {
          seen[k] = 1; count++; q.push([k, it[1] + 1]); if (it[1] + 1 > depth) depth = it[1] + 1;
          var n = svg.querySelector('.node[data-pid="' + k + '"]'); if (n) { n.classList.add('anc'); n.style.setProperty('--d', it[1] + 1); }
        }
      });
    }
    svg.classList.toggle('has-line', depth > 0);
    var note = $('lineNote');
    if (note) {
      note.hidden = !depth;
      var P = (window.FAMILY_PEOPLE || {})[pid] || {};
      note.querySelector('span').textContent = 'Потомки: ' + ((P.sur ? P.sur + ' ' : '') + (P.name || '')).trim() + ' — ' + count + ' чел., ' + depth + ' поколен' + (depth === 1 ? 'ие' : depth < 5 ? 'ия' : 'ий');
    }
  }
  // показать только линию человека: dir 'up' — предки, 'down' — потомки (кнопки в карточке)
  window.familyLine = function(pid, dir){
    if (typeof mode !== 'undefined' && mode === 'list' && window.familySetMode) window.familySetMode('scheme');
    window.familyFocus(pid, {noOpen: true, dir: dir});   // перелёт к человеку и нужная линия
    var note = $('lineNote'); if (note && !note.hidden) note.scrollIntoView({block: 'nearest'});
  };
  // ветвь в легенде: нажатие приглушает остальные, повторное — снимает
  [].forEach.call(document.querySelectorAll('.legend [data-br]'), function(b){
    b.onclick = function(){
      var svg = c.querySelector('svg'); if (!svg) return;
      var on = svg.getAttribute('data-br') !== b.dataset.br;
      if (on) svg.setAttribute('data-br', b.dataset.br); else svg.removeAttribute('data-br');
      [].forEach.call(document.querySelectorAll('.legend [data-br]'), function(x){ x.setAttribute('aria-pressed', String(on && x === b)); });
    };
  });
  // «Историческая память»: показать только людей с отметкой (на схеме — приглушить остальных, в списке — скрыть)
  [].forEach.call(document.querySelectorAll('.mk-filter [data-mk]'), function(b){
    b.onclick = function(){
      var svg = c.querySelector('svg'), on = b.getAttribute('aria-pressed') !== 'true';
      [svg, tl].forEach(function(x){ if (!x) return; if (on) x.setAttribute('data-mk', b.dataset.mk); else x.removeAttribute('data-mk'); });
      [].forEach.call(document.querySelectorAll('.mk-filter [data-mk]'), function(x){ x.setAttribute('aria-pressed', String(on && x === b)); });
    };
  });
  $('lineOff').onclick = function(){ lineOn = false; var s = c.querySelector('svg'); if (s) s.classList.remove('has-line'); $('lineNote').hidden = true; window.refreshLens(); };

  // перелёт к человеку: увеличить, плавно прокрутить, подсветить, открыть карточку
  var focusTimer, RM = matchMedia('(prefers-reduced-motion: reduce)').matches, BH = RM ? 'auto' : 'smooth';
  window.familyFocus = function(pid, opts){
    clearTimeout(focusTimer);
    if (typeof mode !== 'undefined' && mode === 'list') {
      var t = tl.querySelector('.tl-card[data-pid="' + pid + '"]'); if (!t) return;
      tl.querySelectorAll('.tl-card.found').forEach(function(n){ n.classList.remove('found'); });
      t.classList.add('found'); t.scrollIntoView({block: 'center', behavior: BH}); t.focus({preventScroll: true});
      if (!(opts && opts.noOpen)) focusTimer = setTimeout(function(){ if (window.familyOpen) window.familyOpen(pid); }, RM ? 300 : 900);
      return;
    }
    if (level < 2) setLevel(2, false);
    requestAnimationFrame(function(){
      var g = c.querySelector('.node[data-pid="' + pid + '"]'); if (!g) return;
      var r = g.getBoundingClientRect(), sr = sc.getBoundingClientRect();
      sc.scrollTo({left: sc.scrollLeft + (r.left + r.width / 2) - (sr.left + sr.width / 2), behavior: BH});
      window.scrollTo({top: window.scrollY + r.top - innerHeight / 2 + r.height / 2, behavior: BH});
      c.querySelectorAll('.node.found').forEach(function(n){ n.classList.remove('found'); });
      g.classList.add('found'); lastFound = pid; lineOn = true; lineDir = opts && opts.dir === 'down' ? 'down' : 'up'; lineage(pid, lineDir); window.refreshLens();
      if (opts && opts.noOpen) return;
      focusTimer = setTimeout(function(){ if (window.familyOpen) window.familyOpen(pid); }, RM ? 600 : 2400);
      sc.addEventListener('pointerdown', function(){ clearTimeout(focusTimer); }, {once: true, passive: true});
    });
  };

  // поиск по имени
  var inp = $('findInput'), list = $('findList'), hits = [], cur = -1;
  function norm(s){ return String(s || '').toLowerCase().replace(/ё/g, 'е'); }
  function search(q){
    var words = norm(q).split(/\s+/).filter(Boolean), P = window.FAMILY_PEOPLE || {}, out = [];
    if (!words.length) return out;
    Object.keys(P).forEach(function(id){
      var p = P[id], hay = norm([p.sur, p.name, p.group ? p.note : ''].join(' '));
      if (words.every(function(w){ return hay.indexOf(w) >= 0; })) out.push(id);
    });
    return out;
  }
  function show(){
    var P = window.FAMILY_PEOPLE || {};
    var all = search(inp.value); hits = all.slice(0, 8); cur = hits.length ? 0 : -1; list.textContent = '';
    inp.removeAttribute('aria-activedescendant');
    if (!inp.value.trim()) { list.hidden = true; inp.setAttribute('aria-expanded', 'false'); $('findStatus').textContent = ''; return; }
    if (!hits.length) {
      var e = document.createElement('li'); e.className = 'none'; e.textContent = 'Никого не нашли. Попробуйте только фамилию или только имя.'; list.appendChild(e);
      if (window.familyAddMe && $('notMe')) {
        var am = document.createElement('li'); am.className = 'none add-me';
        var ab = document.createElement('button'); ab.type = 'button'; ab.className = 'link-btn'; ab.textContent = 'Меня нет в древе — добавить себя';
        ab.addEventListener('pointerdown', function(ev){ ev.preventDefault(); });
        ab.onclick = function(){ hideList(); window.familyAddMe(); };
        am.appendChild(ab); list.appendChild(am);
      }
    }
    hits.forEach(function(id, i){
      var p = P[id], li = document.createElement('li');
      li.setAttribute('role', 'option'); li.id = 'hit' + i; li.setAttribute('aria-selected', i === cur);
      var b = document.createElement('b'); b.textContent = ((p.sur ? p.sur + ' ' : '') + p.name).trim(); li.appendChild(b);
      if (p.dates) { var d = document.createElement('span'); d.textContent = p.dates; li.appendChild(d); }
      li.addEventListener('pointerdown', function(ev){ ev.preventDefault(); });
      li.addEventListener('mousedown', function(ev){ ev.preventDefault(); });
      li.addEventListener('click', function(){ pick(id); });
      list.appendChild(li);
    });
    if (all.length > 8) { var m = document.createElement('li'); m.className = 'none'; m.textContent = 'Найдено ' + all.length + ', показаны первые 8. Добавьте имя или отчество'; list.appendChild(m); }
    list.hidden = false;
    inp.setAttribute('aria-expanded', String(!list.hidden));
    if (cur >= 0) inp.setAttribute('aria-activedescendant', 'hit' + cur);
    $('findStatus').textContent = all.length ? 'Найдено: ' + all.length : 'Никого не нашли';
  }
  function hideList(){ list.hidden = true; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); }
  function pick(id){ hideList(); inp.blur(); window.familyFocus(id); }
  inp.addEventListener('input', show);
  inp.addEventListener('focus', function(){ if (inp.value) show(); });
  inp.addEventListener('blur', function(){ setTimeout(hideList, 150); });
  inp.addEventListener('keydown', function(e){
    if (e.key === 'Escape') { hideList(); return; }
    if (list.hidden || !hits.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); cur = (cur + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length;
      [].forEach.call(list.children, function(li, i){ if (li.id) li.setAttribute('aria-selected', i === cur); });
      inp.setAttribute('aria-activedescendant', 'hit' + cur); var a = $('hit' + cur); if (a) a.scrollIntoView({block: 'nearest'});
    }
  });
  $('finder').addEventListener('submit', function(e){ e.preventDefault(); if (!hits.length) show(); if (hits.length) pick(hits[Math.max(0, cur)]); else inp.focus(); });

  // полоса прочитанного и появление блоков
  var bar = $('progress');
  function prog(){ var h = document.documentElement, m = h.scrollHeight - h.clientHeight; bar.style.transform = 'scaleX(' + (m > 0 ? h.scrollTop / m : 0) + ')'; }
  addEventListener('scroll', prog, {passive: true}); prog();
  var blocks = [].slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reveal-on');
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, {threshold: .05, rootMargin: '0px 0px 10% 0px'});
    blocks.forEach(function(b){ io.observe(b); });
    setTimeout(function(){ blocks.forEach(function(b){ b.classList.add('in'); }); }, 2500);
  } else blocks.forEach(function(b){ b.classList.add('in'); });

  // древо показывается сразу целиком; «как росло» — только по кнопке и не на слабых устройствах
  var treeSec = $('tree');
  treeSec.classList.add('tree-done');
  var conn = navigator.connection || {}, weak = conn.saveData || (navigator.hardwareConcurrency || 8) <= 4 || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (weak) $('replay').hidden = true;
  function playTree(){ treeSec.classList.remove('tree-play', 'tree-done'); void treeSec.offsetWidth; treeSec.classList.add('tree-play'); }
  $('replay').onclick = function(){ page.classList.remove('play'); void page.offsetWidth; page.classList.add('play'); playTree(); };

  // режим «Список»: поколения сверху вниз крупными карточками — основной вид на телефоне
  var tl = $('treeList'), mode = 'scheme';
  function card(id){
    var M = window.FAMILY_MODEL, P = window.FAMILY_PEOPLE || {}, p = P[id] || {}, mp = M.P[id] || {}, B = window.FAMILY_BASE || {};
    var col = (B.colors || {})[mp.fam], br = (B.branchNames || {})[mp.fam];
    var b = document.createElement('button'); b.type = 'button'; b.className = 'tl-card' + (mp.fam === 'i' ? ' inlaw' : '') + (mp.added ? ' added' : '');
    b.setAttribute('data-pid', id); if (col) b.style.setProperty('--c', col);
    if (p.photo) { var im = document.createElement('img'); im.className = 'tl-photo'; im.src = p.photo; im.alt = ''; im.loading = 'lazy'; b.appendChild(im); b.classList.add('has-photo'); }
    var h = document.createElement('span'); h.className = 'tl-name'; h.textContent = ((p.sur ? p.sur + ' ' : '') + (p.name || '')).trim(); b.appendChild(h);
    if (p.dates) { var d = document.createElement('span'); d.className = 'tl-dates'; d.textContent = p.dates; b.appendChild(d); }
    var note = p.group ? p.note : (mp.lines || [])[3];
    if (note) { var n = document.createElement('span'); n.className = 'tl-note'; n.textContent = note; b.appendChild(n); }
    var K = B.markKinds || {}, mk = (p.marks || []).filter(function(x, i, a){ return K[x.k] && a.map(function(y){ return y.k; }).indexOf(x.k) === i; });
    if (mk.length) {
      var ms = document.createElement('span'); ms.className = 'tl-marks';
      mk.forEach(function(x){ b.classList.add('mk-' + x.k); ms.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" class="mk-' + x.k + '" role="img" aria-label="' + K[x.k].label.replace(/"/g, '') + '"><path d="' + K[x.k].d + '"/></svg>'); });
      b.appendChild(ms);
    }
    var bl = document.createElement('span'); bl.className = 'tl-branch'; bl.textContent = br || 'вошли в род браком'; b.appendChild(bl);
    b.onclick = function(){ if (window.familyOpen) window.familyOpen(id); };
    return b;
  }
  function buildList(){
    var M = window.FAMILY_MODEL; if (!M) return;
    var P = M.P, C = M.C.filter(function(c){ return c.kind !== 'sib'; }), byGen = {}, spouseOf = {};
    C.forEach(function(c){ if (c.a) spouseOf[c.a] = 1; if (c.b) spouseOf[c.b] = 1; });
    M.order.forEach(function(id){ (byGen[P[id].gen] = byGen[P[id].gen] || []).push(id); });
    var ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'], gens = Object.keys(byGen).map(Number).sort(function(a, b){ return a - b; });
    var P2 = window.FAMILY_PEOPLE || {}, nm = function(id){ var p = P2[id] || {}; return ((p.sur ? p.sur + ' ' : '') + (p.name || '')).trim(); };
    tl.textContent = '';
    gens.forEach(function(g){
      var sec = document.createElement('section'); sec.className = 'tl-gen';
      var h = document.createElement('h3'); h.textContent = (ROMAN[g] || g + 1) + ' поколение'; sec.appendChild(h);
      var used = {};
      C.filter(function(c){ return P[c.a] && P[c.a].gen === g; }).forEach(function(c){
        var u = document.createElement('div'); u.className = 'tl-unit';
        var row = document.createElement('div'); row.className = 'tl-pair';
        [c.a, c.b].forEach(function(id){ if (id && P[id]) { row.appendChild(card(id)); used[id] = 1; } });
        if (c.b) { var r = document.createElement('span'); r.className = 'tl-ring' + (c.kind === 'ex' ? ' ex' : ''); r.textContent = c.kind === 'ex' ? 'бывший брак' : 'брак'; row.insertBefore(r, row.children[1]); }
        u.appendChild(row);
        if (c.kids.length) {
          var k = document.createElement('div'); k.className = 'tl-kids'; k.appendChild(document.createTextNode('Дети: '));
          c.kids.forEach(function(id, i){
            var a = document.createElement('button'); a.type = 'button'; a.className = 'tl-link'; a.textContent = nm(id);
            a.onclick = function(){ window.familyFocus(id, {noOpen: true}); };
            k.appendChild(a); if (i < c.kids.length - 1) k.appendChild(document.createTextNode(', '));
          });
          u.appendChild(k);
        }
        sec.appendChild(u);
      });
      byGen[g].forEach(function(id){ if (!used[id] && !spouseOf[id]) { var u = document.createElement('div'); u.className = 'tl-unit'; u.appendChild(card(id)); sec.appendChild(u); } });
      tl.appendChild(sec);
    });
  }
  function setMode(m, save){
    mode = m;
    treeSec.classList.toggle('mode-list', m === 'list');
    tl.hidden = m !== 'list';
    $('modeList').setAttribute('aria-pressed', m === 'list'); $('modeScheme').setAttribute('aria-pressed', m !== 'list');
    if (m === 'list') { buildList(); lens.hidden = true; }
    if (save) try { localStorage.setItem('treeMode', m); } catch(e) {}
  }
  window.familySetMode = function(m){ setMode(m, false); };   // линия предков/потомков видна только на схеме
  $('modeList').onclick = function(){ setMode('list', true); };
  $('modeScheme').onclick = function(){ setMode('scheme', true); };
  var savedMode = null; try { savedMode = localStorage.getItem('treeMode'); } catch(e) {}
  setMode(savedMode || (innerWidth < 700 || window.FAMILY_SLOW ? 'list' : 'scheme'), false);
  // облегчённый режим: шрифты подгружаем, когда страница уже показана; плашка — как вернуть обычный вид
  if (window.FAMILY_SLOW) {
    $('replay').hidden = true;
    var late = function(){ [].forEach.call(document.querySelectorAll('link[data-late]'), function(l){ l.media = 'all'; }); };
    if (document.readyState === 'complete') setTimeout(late, 1500); else addEventListener('load', function(){ setTimeout(late, 1500); });
    var note = document.createElement('p'); note.className = 'slow-note'; note.setAttribute('role', 'status');
    note.innerHTML = '<span>Облегчённый режим: медленный интернет.</span> <button type="button" class="link-btn" id="slowOff">Обычный вид</button>';
    document.body.insertBefore(note, document.body.firstChild);
    $('slowOff').onclick = function(){ try { localStorage.setItem('siteLite', '0'); localStorage.removeItem('treeMode'); } catch(e) {} var u = new URL(location.href); u.searchParams.delete('lite'); location.replace(u.toString()); };
  }
  window.familyRelist = function(){ if (mode === 'list') buildList(); };
})();
