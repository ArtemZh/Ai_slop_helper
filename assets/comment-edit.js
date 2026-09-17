/* Замечания к блокам — в поле справа от текста.
   Работает только на локальном сервере: в сданной работе и на Pages скрипт молчит.

   Замечание не прячется во всплывашку: если оно есть, его видно всё время, рядом
   с блоком, к которому относится. Прятать пометку и показывать вместо неё значок —
   значит заставить перечитывать страницу дважды, чтобы понять, что на ней осталось.
   Кнопка «+» стоит у каждого блока постоянно: если она появляется по наведению,
   её не видно, пока не поводишь мышью по всей странице, — а значит непонятно,
   что комментарий вообще можно оставить.

   Поле справа заводится классом на body — верстка страницы без пульта не меняется. */
(function () {
  var local = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  if (!local) return;

  var DATA = {};

  var css = document.createElement('style');
  css.textContent =
    /* поле под замечания появляется только вместе с пультом */
    '@media (min-width:1180px){' +
      '.cm-on .wrap{max-width:1290px;padding-right:310px}' +
      '.cm-on .topbar .wrap{padding-right:var(--space-lg)}' +
    '}' +
    '.cm-rail{position:absolute;top:0;right:0;width:250px;height:100%;pointer-events:none}' +
    '.cm-note{position:absolute;right:0;width:250px;pointer-events:auto;' +
      'font:400 13.5px/1.5 -apple-system,BlinkMacSystemFont,sans-serif}' +
    '@media (max-width:1179px){.cm-rail{position:static;width:auto;height:auto}' +
      '.cm-note{position:static;width:auto;margin:10px 0 0}}' +
    '.cm-note .item{background:var(--ground-2,#F5F5F7);border-left:3px solid var(--accent,#0071E3);' +
      'border-radius:0 10px 10px 0;padding:9px 11px;margin-bottom:7px;color:var(--ink-1);' +
      'display:flex;gap:8px;align-items:flex-start}' +
    '.cm-note .item time{display:block;color:var(--ink-3);font-size:11px;margin-top:4px}' +
    '.cm-note .x{margin-left:auto;border:0;background:none;color:var(--ink-3);cursor:pointer;' +
      'font-size:15px;line-height:1;padding:0 1px;flex:none}' +
    '.cm-note .x:hover{color:var(--signal-ink,#C7442E)}' +
    '.cm-add{border:1px dashed var(--rule);background:none;color:var(--ink-3);cursor:pointer;' +
      'border-radius:9px;padding:5px 11px;font:600 12px -apple-system,sans-serif;' +
      'transition:color .15s ease,border-color .15s ease}' +
    '.cm-add:hover{color:var(--ink-1);border-color:var(--ink-3)}' +
    '.cm-note textarea{width:100%;min-height:66px;resize:vertical;border:1px solid var(--rule);' +
      'border-radius:9px;padding:8px 9px;font:400 13.5px/1.45 -apple-system,sans-serif;' +
      'background:var(--ground);color:var(--ink-1);box-sizing:border-box}' +
    '.cm-note textarea:focus{outline:0;border-color:var(--accent,#0071E3)}' +
    '.cm-note .hint{color:var(--ink-3);font-size:11px;margin-top:5px}';
  document.head.appendChild(css);

  function esc(s) {
    return s.replace(/[<&]/g, function (c) { return c === '<' ? '&lt;' : '&amp;'; });
  }

  function post(body) {
    return fetch('/api/comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.error) throw new Error(j.error);
      return j;
    });
  }

  function render(box, editing) {
    var id = box.getAttribute('data-prov');
    var notes = DATA[id] || [];
    var note = RAIL.querySelector('[data-for="' + id + '"]');
    if (!note) {
      note = document.createElement('div');
      note.className = 'cm-note';
      note.setAttribute('data-for', id);
      RAIL.appendChild(note);
    }
    note.classList.toggle('has', notes.length > 0);
    note.innerHTML =
      notes.map(function (n, i) {
        return '<div class="item"><span>' + esc(n.text) + '<time>' + n.at + '</time></span>' +
               '<button class="x" data-i="' + i + '" title="прибрати">×</button></div>';
      }).join('') +
      (editing
        ? '<textarea placeholder="Що зробити з цим блоком"></textarea>' +
          '<div class="hint">⌘↵ зберегти · Esc скасувати</div>'
        : '<button class="cm-add" type="button">' + (notes.length ? '+ ще' : '+') + '</button>');

    if (editing) {
      var ta = note.querySelector('textarea');
      ta.focus();
      ta.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          var text = ta.value.trim();
          if (!text) return render(box, false);
          post({ id: id, text: text }).then(function (j) {
            DATA[id] = j.notes; render(box, false); place();
          }).catch(function (err) { alert('не збереглося: ' + err.message); });
        }
        if (e.key === 'Escape') render(box, false);
      });
      ta.addEventListener('blur', function () {
        if (!ta.value.trim()) render(box, false);
      });
    } else {
      note.querySelector('.cm-add').addEventListener('click', function () { render(box, true); place(); });
    }

    note.addEventListener('click', function (e) {
      var x = e.target.closest('.x');
      if (!x) return;
      post({ id: id, drop: +x.dataset.i }).then(function (j) {
        DATA[id] = j.notes; render(box, false); place();
      }).catch(function (err) { alert('не вийшло: ' + err.message); });
    });
  }

  var RAIL, BOXES = [];

  /* Колонка общая, поэтому и вертикаль считается заново: у абзацев разная ширина,
     и привязка к правому краю самого блока давала рваный столбец. */
  function place() {
    var wrapTop = RAIL.parentElement.getBoundingClientRect().top + window.scrollY;
    BOXES.forEach(function (box) {
      var note = RAIL.querySelector('[data-for="' + box.getAttribute('data-prov') + '"]');
      if (!note) return;
      note.style.top = Math.round(box.getBoundingClientRect().top + window.scrollY - wrapTop) + 'px';
    });
  }

  function build() {
    document.body.classList.add('cm-on');
    var wrap = document.querySelector('.wrap:not(.topbar .wrap)');
    var wraps = document.querySelectorAll('.wrap');
    wrap = wraps[wraps.length - 1];
    wrap.style.position = 'relative';
    RAIL = document.createElement('div');
    RAIL.className = 'cm-rail';
    wrap.appendChild(RAIL);
    BOXES = [].slice.call(document.querySelectorAll('.prov[data-prov]'));
    BOXES.forEach(function (box) { render(box, false); });
    place();
    window.addEventListener('resize', place);
    // схемы меняют высоту блоков по клику — столбец должен ехать следом
    document.addEventListener('click', function () { setTimeout(place, 60); });
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { place(); });
      BOXES.forEach(function (b) { ro.observe(b); });
    }
  }

  function start() {
    fetch('/api/comments').then(function (r) { return r.json(); })
      .then(function (j) { DATA = j || {}; build(); })
      .catch(build);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
