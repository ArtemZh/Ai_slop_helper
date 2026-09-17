/* Переключение пометки происхождения прямо в модуле.
   Работает только на локальном сервере: в сданной работе скрипт не делает ничего.
   Клик по рейке или иконке слева от блока перебирает типы по кругу и шлёт
   изменение на /api/prov, который пишет и в prov-map.json, и в сам модуль. */
(function () {
  var local = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  if (!local) return;

  var TYPES = ['fact', 'hyp', 'mine', 'todo', 'redo', 'del'];

  /* Подписи берём из prov-i18n.js — он знает язык страницы по атрибуту lang.
     Свой список остаётся запасным: если файл не подключён, пульт работает,
     просто подписи будут украинскими. Раньше список был только здесь, и в нём
     пять подписей были русскими, а redo — украинской. */
  function name(type) {
    return window.PROV_I18N ? window.PROV_I18N.label(type).toLowerCase() : FALLBACK[type];
  }
  var FALLBACK = { fact: 'перевірено', hyp: 'гіпотеза', mine: 'мій висновок',
                   todo: 'доробити', redo: 'переробити · ai slop', del: 'видалити' };
  var ICONS = {
    fact: '<path d="M6 4.5h8l4.5 4.5v6"/><path d="M14 4.5V9h4.5"/><path d="M6 4.5v17h6"/><path d="M9 10h5M9 13.5h6M9 17h3"/><path d="M14.5 18.5l2.5 2.5 4.5-5"/>',
    hyp: '<circle cx="13" cy="13" r="8.5" stroke-dasharray="3 3.4"/><path d="M13 9.4v4.2"/><path d="M13 17.1h.01"/>',
    mine: '<path d="M5.5 4.5v17"/><path d="M5.5 13h9"/><path d="M11 8.5l4 4.5-4 4.5"/><path d="M18.5 13h2.5"/>',
    todo: '<path d="M17.5 4.8l3.7 3.7L9.6 20.2l-4.6.9.9-4.6z"/><path d="M15.2 7.1l3.7 3.7"/>',
    redo: '<path d="M21 13a8 8 0 1 1-2.6-5.9"/><path d="M21 4.5V9h-4.5"/>',
    del: '<path d="M5.5 8h15"/><path d="M10 8V5.5h6V8"/><path d="M7.5 8l1 12.5h9L18.5 8"/><path d="M11 11.5v6M15 11.5v6"/>'
  };
  var SVG = '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.5" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

  var css = document.createElement('style');
  css.textContent =
    '.prov[data-prov] > .ic{cursor:pointer;transition:color .15s}' +
    '.prov[data-prov] > .ic:hover{color:var(--amber)}' +
    '.prov-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:99;' +
    'background:rgba(0,0,0,.86);color:#fff;font-size:13px;padding:9px 15px;border-radius:8px;' +
    'opacity:0;transition:opacity .2s;pointer-events:none}' +
    '.prov-toast.on{opacity:1}';
  document.head.appendChild(css);

  var toast = document.createElement('div');
  toast.className = 'prov-toast';
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(toast); });
  var t;
  function say(text) {
    toast.textContent = text; toast.classList.add('on');
    clearTimeout(t); t = setTimeout(function () { toast.classList.remove('on'); }, 1800);
  }

  document.addEventListener('click', function (e) {
    var ic = e.target.closest('.prov[data-prov] > .ic');
    if (!ic) return;
    var box = ic.parentElement, id = box.getAttribute('data-prov');
    var cur = TYPES.filter(function (x) { return box.classList.contains(x); })[0] || 'hyp';
    var next = TYPES[(TYPES.indexOf(cur) + 1) % TYPES.length];
    fetch('/api/prov', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, type: next })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.error) throw new Error(j.error);
      TYPES.forEach(function (x) { box.classList.remove(x); });
      box.classList.add(j.type);
      ic.innerHTML = SVG + ICONS[j.type] + '</svg>';
      say(id + ' → ' + name(j.type));
    }).catch(function (err) { say('не сохранилось: ' + err.message); });
  });
})();
