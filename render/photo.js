// Подготовка портрета в браузере: обрезка в квадрат по центру, не больше 800 px и не больше 200 КБ (JPEG).
// Общая для редактора и сайта семьи (родные присылают фото в дополнении). RodPhoto.prepare(file) → Promise<dataURL>.
(function (root) {
  var MAX_SIDE = 800, MAX_BYTES = 200 * 1024;

  function load(file) {
    return new Promise(function (ok, fail) {
      if (!file) return fail(new Error('Файл не выбран'));
      if (!/^image\/(jpeg|png)$/.test(file.type)) return fail(new Error('Нужна фотография JPG или PNG. Фото с iPhone (HEIC) сохраните как JPG.'));
      if (file.size > 25 * 1024 * 1024) return fail(new Error('Файл больше 25 МБ'));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); ok(img); };
      img.onerror = function () { URL.revokeObjectURL(url); fail(new Error('Не удалось открыть картинку')); };
      img.src = url;
    });
  }
  function bytes(dataUrl) { return Math.floor((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4); }

  function prepare(file) {
    return load(file).then(function (img) {
      var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(w, h);
      if (s < 40) throw new Error('Картинка слишком маленькая');
      var side = Math.min(MAX_SIDE, s), out;
      for (var round = 0; round < 6; round++) {
        var c = document.createElement('canvas'); c.width = c.height = side;
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, side, side);   // прозрачный PNG — на белом
        g.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, side, side);
        for (var q = 0.86; q >= 0.5; q -= 0.08) { out = c.toDataURL('image/jpeg', q); if (bytes(out) <= MAX_BYTES) return out; }
        side = Math.round(side * 0.8);
      }
      if (bytes(out) <= MAX_BYTES) return out;
      throw new Error('Не получилось сжать фото до 200 КБ');
    });
  }

  // скан документа: PDF — без изменений (до 3 МБ), фото документа — до 1600 px по длинной стороне и ~700 КБ, без обрезки
  function prepareDoc(file) {
    if (!file) return Promise.reject(new Error('Файл не выбран'));
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      if (file.size > 3 * 1024 * 1024) return Promise.reject(new Error('PDF больше 3 МБ — сохраните его с меньшим разрешением'));
      return new Promise(function (ok, fail) { var r = new FileReader(); r.onload = function () { ok({data: String(r.result).replace(/^data:[^;]*;/, 'data:application/pdf;'), t: 'pdf'}); }; r.onerror = function () { fail(new Error('Не удалось прочитать файл')); }; r.readAsDataURL(file); });
    }
    return load(file).then(function (img) {
      var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, 1600 / Math.max(w, h)), out;
      for (var round = 0; round < 5; round++) {
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        for (var q = 0.85; q >= 0.5; q -= 0.1) { out = c.toDataURL('image/jpeg', q); if (bytes(out) <= 700 * 1024) return {data: out, t: 'img'}; }
        k *= 0.8;
      }
      return {data: out, t: 'img'};
    });
  }

  root.RodPhoto = {prepare: prepare, prepareDoc: prepareDoc, MAX_BYTES: MAX_BYTES};
})(typeof self !== 'undefined' ? self : this);
