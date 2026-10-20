// Раскладка и отрисовка древа. Базовые люди стоят на заданных местах,
// родственники, добавленные на сайте, встраиваются в общую схему автоматически.
(function(){
  var B = window.FAMILY_BASE;
  if (window.FAMILY_LANG === 'en' && B.latin) Object.keys(B.latin).forEach(function(id){
    var p = B.P[id], w = String(B.latin[id]).split(/\s+/).filter(Boolean); if (!p || !w.length) return;
    p[3] = [w.length > 1 ? w[w.length - 1] : '', w.length > 1 ? w.slice(0, -1).join(' ') : w[0], p[3][2], p[3][3]];
  });
  var G = B.geom, U = G.U, W = G.W, H = G.H, ROW = G.ROW, X0 = G.X0, Y0 = G.Y0;
  var ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  var IN_FAMILY = {'сын':1,'дочь':1,'брат':1,'сестра':1,'внук':1,'внучка':1};

  // даты живых людей (год рождения без года смерти, после 1935) на открытом сайте не показываем
  function showDates(){ return !!window.FAMILY_SHOW_DATES; }
  // у этих людей год рождения показывается открыто — задаётся в проекте (privacy.openDates)
  var OPEN_DATES = B.openDates || {};
  function publicDates(d, id){
    if (showDates() || B.hideLivingDates === false || OPEN_DATES[id] || !d) return d || '';
    var years = String(d).match(/1[89]\d\d|20\d\d/g) || [];
    if (/†/.test(d) || years.length >= 2) return d;
    return years.length && +years[0] >= (B.livingBornAfter || 1935) ? '' : d;
  }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  function splitName(full){
    var w = String(full || '').trim().split(/\s+/);
    if (w.length >= 3) return [w[0], w.slice(1).join(' ')];
    if (w.length === 2 && /(ов|ев|ин|ын|ий|ой|ая|на|ова|ева|ина|ская|ский|ман|ич)$/i.test(w[0])) return [w[0], w[1]];
    return ['', w.join(' ')];
  }

  var GROUPS = B.groups || (B.sib ? {SIB: {list: B.sib.list, sur: B.sib.sur, name: B.sib.name}} : {});
  var GW = (B.group || B.sib || {}).w, GH = (B.group || B.sib || {}).h;
  function famColor(fam){ return (B.colors || {})[fam]; }
  // название ветви для полоски карточки (у вошедших браком и групп — нет)
  function BRN(p){ return p && !p.added && p.fam && p.fam !== 'i' && (B.branchNames || {})[p.fam] && !GROUPS[p.id] ? String((B.branchNames || {})[p.fam]).toUpperCase() : ''; }
  // ряды под высокими групповыми карточками сдвигаются вниз, чтобы не налезать
  var ROW_EXTRA = B.rowExtra || {};

  // геометрия раскладки: «ширина» (breadth) — вдоль ряда поколения, «глубина» (depth) — от предков к потомкам
  var ORI = B.orientation || 'down', K = B.cardScale || 1, SIDE = ORI === 'right';
  var CW = W * K, CH = H * K;                        // карточка на экране
  var UB = SIDE ? (H + 50) * K : U * K;              // шаг колонки вдоль ряда
  var ROWD = SIDE ? (W + 170) * K : ROW * K;         // шаг поколения
  var B0 = SIDE ? 130 : X0, D0 = SIDE ? 150 : Y0;    // поля под подписи поколений
  function screenSize(id){ return GROUPS[id] ? [GW * K, GH * K] : [CW, CH]; }
  function bSize(id){ var s = screenSize(id); return SIDE ? s[1] : s[0]; }
  function dSize(id){ var s = screenSize(id); return SIDE ? s[0] : s[1]; }
  var BD = SIDE ? CW : CH;                            // глубина обычной карточки
  function rowD(g){ var y = D0 + g * ROWD; for (var k = 0; k < g; k++) y += (ROW_EXTRA[k] || 0) * K; return y; }
  var FIELDS = B.fields ? B.fields.reduce(function(o, f){ o[f] = 1; return o; }, {}) : null;
  function show(f){ return !FIELDS || FIELDS[f]; }

  function build(entries){
    var P = {}, order = [];
    Object.keys(B.P).forEach(function(id){
      var p = B.P[id];
      P[id] = {id:id, gen:p[0], x:p[1], fam:p[2], lines:p[3], w: bSize(id), h: dSize(id)};
      order.push(id);
    });
    var C = B.C.map(function(c){ return {a:c[0], b:c[1], kids:c[2].slice(), kind:c[3]}; });
    var links = [];

    function parentCouple(id){ for (var i = 0; i < C.length; i++) if (C[i].kids.indexOf(id) >= 0 && C[i].kind !== 'sib') return C[i]; return null; }
    function ownCouples(id){ return C.filter(function(c){ return (c.a === id || c.b === id) && c.kind !== 'sib'; }); }
    function rowNodes(gen){ return order.filter(function(id){ return P[id].gen === gen; }); }
    function free(gen, x, w, skip){
      var half = w / UB / 2;
      return rowNodes(gen).every(function(id){
        if (id === skip) return true;
        var q = P[id], qh = q.w / UB / 2;
        return x + half + 0.08 <= q.x - qh || x - half - 0.08 >= q.x + qh;
      });
    }
    function place(gen, want){
      for (var d = 0; d <= 12; d += 0.25) {
        if (free(gen, want + d, SIDE ? CH : CW)) return want + d;
        if (d && free(gen, want - d, SIDE ? CH : CW)) return want - d;
      }
      var xs = rowNodes(gen).map(function(id){ return P[id].x; });
      return (xs.length ? Math.max.apply(null, xs) : want) + 1.1;
    }

    (entries || []).filter(function(e){ return e.kind === 'person' && e.name; })
      .sort(function(a, b){ return (a.created || 0) - (b.created || 0); })
      .forEach(function(e){
        var anchor = P[e.person];
        if (!anchor) return;
        var id = 'e:' + e.id, rel = e.relation || 'другое', nm = splitName(e.name);
        var note = [e.occupation, e.place].filter(Boolean).join(' · ');
        var n = {id:id, added:true, author:e.author, fam: IN_FAMILY[rel] ? (anchor.fam === 'i' ? 'k' : anchor.fam) : 'i',
                 lines:[nm[0], nm[1], e.dates || '', note], w:SIDE ? CH : CW, h:BD, rel:rel};
        var gen = anchor.gen, want = anchor.x + 1, pc;

        if (rel === 'сын' || rel === 'дочь') {
          gen = anchor.gen + 1;
          var own = ownCouples(e.person), c = own.filter(function(x){ return e.parent2 && (x.a === e.parent2 || x.b === e.parent2); })[0] || own[own.length - 1];
          if (!c) { c = {a:e.person, b:null, kids:[], kind:''}; C.push(c); }
          var mx = c.b ? (P[c.a].x + P[c.b].x) / 2 : P[c.a].x;
          want = mx + c.kids.length * 0.5 - 0.25;
          c.kids.push(id);
        } else if (rel === 'муж' || rel === 'жена') {
          C.push({a:e.person, b:id, kids:[], kind:''});
        } else if (rel === 'отец' || rel === 'мать') {
          gen = anchor.gen - 1;
          pc = parentCouple(e.person);
          if (pc && !pc.b) { pc.b = id; want = P[pc.a].x + 1; }
          else if (!pc) { C.push({a:id, b:null, kids:[e.person], kind:''}); want = anchor.x; }
          else { gen = anchor.gen; links.push({from:e.person, to:id, label:rel}); }
        } else if (rel === 'брат' || rel === 'сестра') {
          pc = parentCouple(e.person);
          if (pc) pc.kids.push(id);
          else {
            var s = C.filter(function(c){ return c.kind === 'sib' && c.kids.indexOf(e.person) >= 0; })[0];
            if (s) s.kids.push(id); else C.push({a:null, b:null, kids:[e.person, id], kind:'sib'});
          }
        } else if (rel === 'внук' || rel === 'внучка') {
          gen = anchor.gen + 2; want = anchor.x;
          links.push({from:e.person, to:id, label:rel, down:true});
        } else {
          links.push({from:e.person, to:id, label:'родственник'});
        }
        n.gen = gen;
        n.x = place(gen, want);
        P[id] = n; order.push(id);
      });

    // строки и колонки могли уйти в минус — сдвигаем всё
    var minG = Math.min.apply(null, order.map(function(id){ return P[id].gen; }));
    var minX = Math.min.apply(null, order.map(function(id){ return P[id].x - P[id].w / UB / 2; }));
    var dx = minX < -0.5 ? -0.5 - minX : 0;
    order.forEach(function(id){ P[id].gen -= minG; P[id].x += dx; });
    return {P:P, C:C, links:links, order:order};
  }

  function render(m){
    var P = m.P;
    var maxG = Math.max.apply(null, m.order.map(function(id){ return P[id].gen; }));
    var maxB = Math.max.apply(null, m.order.map(function(id){ return P[id].x + P[id].w / UB / 2; }));
    var TOT = rowD(maxG) + BD + 60 + (ROW_EXTRA[maxG] || 0) * K;
    var BTOT = B0 + maxB * UB + 60;
    function bc(id){ return B0 + P[id].x * UB; }
    function dt(id){ return rowD(P[id].gen); }
    function pt(b, d){ return ORI === 'right' ? [d, b] : ORI === 'up' ? [b, TOT - d] : [b, d]; }
    function f1(v){ return (+v).toFixed(1); }
    function path(list){ return list.map(function(q, i){ var p = pt(q[0], q[1]); return (i ? ' L' : 'M') + f1(p[0]) + ',' + f1(p[1]); }).join(''); }
    function marker(c){
      if (!c.b) return [bc(c.a), dt(c.a) + P[c.a].h];
      return [(bc(c.a) + bc(c.b)) / 2, dt(c.a) + BD / 2];
    }
    // уровни шин детей, чтобы линии разных семей не сливались
    var bands = {}, level = [];
    m.C.forEach(function(c, i){
      if (c.kind === 'sib' || !c.kids.length) return;
      var g = P[c.a].gen, xs = c.kids.map(bc).concat([marker(c)[0]]);
      (bands[g] = bands[g] || []).push([Math.min.apply(null, xs), Math.max.apply(null, xs), i]);
    });
    Object.keys(bands).forEach(function(g){
      var placed = [];
      bands[g].sort(function(a, b){ return a[0] - b[0]; }).forEach(function(s){
        var lv = 0;
        while (placed.some(function(p){ return p[2] === lv && !(s[1] < p[0] - 10 || s[0] > p[1] + 10); })) lv++;
        placed.push([s[0], s[1], lv]); level[s[2]] = lv;
      });
    });

    var links = [], rings = [];
    m.C.forEach(function(c, i){
      if (c.kind === 'sib') {
        var ds = Math.min.apply(null, c.kids.map(dt)) - 34, bs = c.kids.map(bc);
        var d = path([[Math.min.apply(null, bs), ds], [Math.max.apply(null, bs), ds]]) + c.kids.map(function(k){ return ' ' + path([[bc(k), ds], [bc(k), dt(k)]]); }).join('');
        links.push('<path class="kin sibl" pathLength="1" style="--g:' + P[c.kids[0]].gen + '" d="' + d + '"/>');
        return;
      }
      var mk = marker(c), mb = mk[0], md = mk[1], g = P[c.a].gen;
      if (c.b) {
        var l = Math.min(bc(c.a), bc(c.b)), r = Math.max(bc(c.a), bc(c.b));
        var lo = l === bc(c.a) ? c.a : c.b, hi = lo === c.a ? c.b : c.a;
        links.push('<path class="wed' + (c.kind === 'ex' ? ' ex' : '') + '" pathLength="1" style="--g:' + g + '" d="' + path([[l + P[lo].w / 2, md], [r - P[hi].w / 2, md]]) + '"/>');
        var r1 = pt(mb - (c.kind === 'ex' ? 5 : 6), md), r2 = pt(mb + (c.kind === 'ex' ? 9 : 6), md);
        var circles = '<circle cx="' + f1(r1[0]) + '" cy="' + f1(r1[1]) + '" r="9"/><circle cx="' + f1(r2[0]) + '" cy="' + f1(r2[1]) + '" r="9"/>';
        if (c.kind === 'ex') {
          var lp = SIDE ? [pt(mb, md)[0], pt(mb, md)[1] - 22] : pt(mb, ORI === 'up' ? md + BD / 2 + 26 : md - BD / 2 - 12);
          rings.push('<g class="ring ex" style="--g:' + g + '">' + circles + '<text class="exl" x="' + f1(lp[0]) + '" y="' + f1(lp[1]) + '">бывший брак</text></g>');
        } else rings.push('<g class="ring" style="--g:' + g + '">' + circles + '</g>');
      }
      var bus = rowD(g) + BD + 50 * K + (ROW_EXTRA[g] || 0) * K + (level[i] || 0) * 24;
      c.kids.forEach(function(k){
        links.push('<path class="kin" data-kid="' + esc(k) + '" data-par="' + esc(c.a) + (c.b ? ' ' + esc(c.b) : '') + '" pathLength="1" style="--g:' + P[k].gen + '" d="' +
          path([[mb, md + (c.b ? 9 : 0)], [mb, bus], [bc(k), bus], [bc(k), dt(k)]]) + '"/>');
      });
    });
    m.links.forEach(function(L){
      var a = L.from, b = L.to, d, lp;
      if (L.down) {
        var mid = dt(a) + P[a].h + (dt(b) - dt(a) - P[a].h) / 2;
        d = path([[bc(a), dt(a) + P[a].h], [bc(a), mid], [bc(b), mid], [bc(b), dt(b)]]);
        lp = pt((bc(a) + bc(b)) / 2, mid); lp[1] -= 10;
      } else {
        var y = dt(a) + BD / 2, l = Math.min(bc(a), bc(b)) + P[a].w / 2, r = Math.max(bc(a), bc(b)) - P[b].w / 2;
        d = path([[l, y], [r, y]]); lp = pt((l + r) / 2, y); lp[1] -= 14;
      }
      links.push('<path class="kin dash" pathLength="1" style="--g:' + P[b].gen + '" d="' + d + '"/><text class="exl" x="' + f1(lp[0]) + '" y="' + f1(lp[1]) + '">' + esc(L.label) + '</text>');
    });

    var nodes = m.order.map(function(id, idx){
      var p = P[id], ss = screenSize(id), w = ss[0], h = ss[1];
      var a = pt(bc(id) - p.w / 2, dt(id)), z = pt(bc(id) + p.w / 2, dt(id) + p.h);
      var left = Math.min(a[0], z[0]), y = Math.min(a[1], z[1]), c = left + w / 2;
      var col = famColor(p.fam);
      var mks = GROUPS[id] ? [] : ((B.marks || {})[id] || []).map(function(x){ return x.k; }).filter(function(k, i, a){ return a.indexOf(k) === i && (B.markKinds || {})[k]; });
      var o = '<g class="node f-' + esc(p.fam) + mks.map(function(k){ return ' mk-' + k; }).join('') + (p.added ? ' added' : '') + ((B.stubs || {})[id] ? ' stub' : '') + (GROUPS[id] ? ' grp' : '') + '" data-pid="' + esc(id) + '" style="--g:' + p.gen + ';--i:' + idx + (col ? ';--c:' + col : '') + '">' +
        '<rect class="card" x="' + f1(left) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '" rx="6"/>' +
        (show('branchMark') ? '<rect class="stripe" x="' + f1(left) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1((BRN(p) ? 24 : 14) * K) + '" rx="2"/>' +
          (BRN(p) ? '<text aria-hidden="true" class="brn" x="' + f1(c) + '" y="' + f1(y + 18 * K) + '">' + esc(BRN(p)) + '</text>' : '') : '');
      if (GROUPS[id]) {
        o += '<text aria-hidden="true" class="sur" x="' + f1(c) + '" y="' + f1(y + 48 * K) + '">' + esc(GROUPS[id].sur) + '</text><text aria-hidden="true" class="note" x="' + f1(c) + '" y="' + f1(y + 82 * K) + '">' + esc(GROUPS[id].name) + '</text>';
        GROUPS[id].list.forEach(function(s, k){
          var tx = left + 40 * K + (k % 2) * (w / 2), ty = y + (140 + Math.floor(k / 2) * 60) * K;
          o += '<text aria-hidden="true" class="sib" x="' + f1(tx) + '" y="' + f1(ty) + '">' + esc(s[0]) + '</text><text aria-hidden="true" class="sibd" x="' + f1(tx) + '" y="' + f1(ty + 28 * K) + '">' + esc(s[1]) + '</text>';
        });
      } else {
        var rows = [], ph = (B.photos || {})[id], tc = c, tmax = '', shift = show('branchMark') && BRN(p) ? 8 * K : 0;
        if (ph) {   // портрет слева в круге, текст — правее
          var D = Math.min(112 * K, h - 34 * K), px = left + 16 * K, py = y + (h - D) / 2 + (show('branchMark') ? 7 * K : 0);
          o += '<clipPath id="ph-' + idx + '"><circle cx="' + f1(px + D / 2) + '" cy="' + f1(py + D / 2) + '" r="' + f1(D / 2) + '"/></clipPath>' +
            '<image class="photo" href="' + esc(ph) + '" x="' + f1(px) + '" y="' + f1(py) + '" width="' + f1(D) + '" height="' + f1(D) + '" preserveAspectRatio="xMidYMid slice" clip-path="url(#ph-' + idx + ')"/>' +
            '<circle class="photo-ring" cx="' + f1(px + D / 2) + '" cy="' + f1(py + D / 2) + '" r="' + f1(D / 2) + '"/>';
          var free = left + 16 * K + D + 8 * K;
          tc = free + (left + w - free) / 2; tmax = ' data-max="' + f1(left + w - free - 16 * K) + '"';
        }
        if (p.lines[0] && show('surname')) rows.push(['sur', p.lines[0], 46]);
        rows.push(['name', p.lines[1], rows.length ? 40 : 56]);
        var dd = show('dates') ? publicDates(p.lines[2], p.id) : '';
        if ((B.stubs || {})[id] && !dd) dd = window.FAMILY_LANG === 'en' ? 'not identified' : 'не установлено';
        if (dd) rows.push(['date', dd, 36]);
        if (p.lines[3] && show('note')) rows.push(['note', p.lines[3], 34]);
        var ty = y + shift;
        rows.forEach(function(r){ ty += r[2] * K; o += '<text aria-hidden="true" class="' + r[0] + ' fit" x="' + f1(tc) + '" y="' + f1(ty) + '"' + tmax + '>' + esc(r[1]) + '</text>'; });
        var nb = (B.numbers || {})[id];
        if (nb) o += '<text aria-hidden="true" class="numtag" x="' + f1(left + 10 * K) + '" y="' + f1(y + ((show('branchMark') ? (BRN(p) ? 24 : 14) : 0) + 18) * K) + '">' + esc(nb) + '</text>';
        if (p.added) o += '<text aria-hidden="true" class="newtag" x="' + f1(left + 14 * K) + '" y="' + f1(y + 34 * K) + '">новое</text>';
        // исторические отметки: круглые значки на верхнем крае карточки, справа налево
        mks.slice(0, 4).forEach(function(k, i){
          var R = 17 * K, cx = left + w - (22 + i * 38) * K, s = 2 * R / 24;
          o += '<g class="mk mk-' + k + '" aria-hidden="true" transform="translate(' + f1(cx - R) + ' ' + f1(y - R) + ') scale(' + s.toFixed(4) + ')"><circle class="mk-bg" cx="12" cy="12" r="12"/><path class="mk-ic" transform="translate(4.2 4.2) scale(.65)" d="' + B.markKinds[k].d + '"/></g>';
        });
      }
      return o + '</g>';
    });

    var gens = '';
    if (B.generationLabels !== false) for (var g = 0; g <= maxG; g++) {
      var gp = SIDE ? [rowD(g) + BD / 2, 80] : pt(70, rowD(g) + BD / 2);
      gens += '<text class="genl" x="' + f1(gp[0]) + '" y="' + f1(gp[1] + 18) + '">' + (ROMAN[g] || g + 1) + '</text>';
    }
    var size = SIDE ? [TOT, BTOT] : [BTOT, TOT];
    return '<svg class="tree ori-' + ORI + '" style="--k:' + K + '" viewBox="0 0 ' + Math.round(size[0]) + ' ' + Math.round(size[1]) + '" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Генеалогическое древо: ' + m.order.length + ' карточек. Нажмите Tab, чтобы перейти по людям">' +
      '<g class="gens" aria-hidden="true">' + gens + '</g><g class="links" aria-hidden="true">' + links.join('') + '</g><g class="rings" aria-hidden="true">' + rings.join('') + '</g><g class="nodes">' + nodes.join('') + '</g></svg>';
  }

  // длинные строки: сначала уменьшаем кегль (не больше чем до 80%), потом обрезаем с многоточием
  function fit(svg){
    svg.querySelectorAll('text.fit').forEach(function(t){
      var card = t.parentNode.querySelector('.card'), max = t.hasAttribute('data-max') ? +t.getAttribute('data-max') : (card ? +card.getAttribute('width') : W * K) - 36 * K, full = t.textContent, len;
      try { len = t.getComputedTextLength(); } catch(e) { return; }
      if (len <= max) return;
      var fs = parseFloat(getComputedStyle(t).fontSize), r = Math.max(.66, max / len);
      t.style.fontSize = (fs * r).toFixed(1) + 'px';
      if (t.getComputedTextLength() <= max) return;
      // имя в родословной не обрезаем: если и после уменьшения не влезает — слегка сжимаем по ширине
      t.setAttribute('textLength', max); t.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    });
  }

  function people(m){
    var out = {};
    m.order.forEach(function(id){
      var p = m.P[id];
      if (GROUPS[id]) out[id] = {group:1, sur:GROUPS[id].sur || '', name:GROUPS[id].name || '', dates:'', note:GROUPS[id].list.map(function(s){ return s[0] + ' ' + s[1]; }).join(', ')};
      else out[id] = {marks:(B.marks || {})[id] || [], docs:(B.docs || {})[id] || [], facts:(B.facts || {})[id] || [], photo:(B.photos || {})[id] || '', bio:(B.bios || {})[id] || '', sur:p.lines[0], name:p.lines[1], dates:publicDates(p.lines[2], id), note:[p.lines[3], p.added ? (p.rel + ' · добавил(а): ' + (p.author || '')) : ''].filter(Boolean).join(' · ')};
    });
    return out;
  }

  window.FamilyTree = {
    draw: function(host, entries){
      var m = build(entries);
      host.innerHTML = render(m);
      var svg = host.querySelector('svg');
      fit(svg);
      window.FAMILY_PEOPLE = people(m);
      window.FAMILY_MODEL = m;
      var stub = B.stubs || {};
      var n = m.order.filter(function(id){ return !stub[id] && !GROUPS[id]; }).length;
      Object.keys(GROUPS).forEach(function(id){ n += GROUPS[id].list.length; });
      var gens = Math.max.apply(null, m.order.map(function(id){ return m.P[id].gen; })) + 1;
      window.FAMILY_STATS = {people: n, generations: gens};
      return svg;
    }
  };
})();
