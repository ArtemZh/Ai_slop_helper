/* Подписи типов на трёх языках плюс сборка легенды.
 *
 * Раньше подписи жили в двух местах: в NAMES внутри prov-edit.js и руками
 * в разметке легенды на каждой странице. Оттуда и разъезд — в пульте пять
 * подписей были русскими, а redo остался украинским.
 *
 * Теперь источник один. Язык берётся из атрибута lang у <html>, поэтому
 * страница ничего не настраивает: поставила lang="ru" — получила русские
 * подписи и в пульте, и в легенде.
 *
 * Файл подключается перед prov-edit.js. Если его нет, пульт откатывается
 * на встроенные украинские подписи и продолжает работать.
 */
(function () {
  'use strict';

  var TYPES = ['fact', 'hyp', 'mine', 'todo', 'redo', 'del'];

  var L = {
    uk: {
      fact: 'Перевірено', hyp: 'Гіпотеза', mine: 'Мій висновок',
      todo: 'Доробити', redo: 'Переробити · ai slop', del: 'Видалити',
      hint: {
        fact: 'узято з відкритих джерел або надано власником',
        hyp: 'припущення або тлумачення',
        mine: 'судження власника з його досвіду',
        todo: 'тут потрібна ще робота',
        redo: 'написав асистент і не підкріпив джерелом',
        del: 'блок під зніс'
      },
      legendTitle: 'Як читати помітки зліва від тексту'
    },
    ru: {
      fact: 'Проверено', hyp: 'Гипотеза', mine: 'Мой вывод',
      todo: 'Доработать', redo: 'Переделать · ai slop', del: 'Удалить',
      hint: {
        fact: 'взято из открытых источников или дано владельцем',
        hyp: 'допущение или толкование',
        mine: 'суждение владельца из его опыта',
        todo: 'здесь нужна ещё работа',
        redo: 'написал ассистент и не подкрепил источником',
        del: 'блок под снос'
      },
      legendTitle: 'Как читать пометки слева от текста'
    },
    en: {
      fact: 'Verified', hyp: 'Hypothesis', mine: 'Author’s call',
      todo: 'Needs work', redo: 'Redo · ai slop', del: 'Delete',
      hint: {
        fact: 'taken from public sources or supplied by the owner',
        hyp: 'an assumption or reading',
        mine: 'the owner’s own judgement',
        todo: 'more work needed here',
        redo: 'written by the assistant, no source behind it',
        del: 'block to be removed'
      },
      legendTitle: 'How to read the marks left of the text'
    }
  };

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

  function lang(code) {
    var c = (code || document.documentElement.lang || 'uk').slice(0, 2).toLowerCase();
    return L[c] ? c : 'uk';
  }

  window.PROV_I18N = {
    TYPES: TYPES,
    ICONS: ICONS,
    lang: lang,

    /* Подпись типа: PROV_I18N.label('redo') → «Переделать · ai slop» */
    label: function (type, code) { return L[lang(code)][type] || type; },
    hint: function (type, code) { return L[lang(code)].hint[type] || ''; },

    icon: function (type) { return SVG + (ICONS[type] || '') + '</svg>'; },

    /* Легенда целиком. Раньше её писали руками в каждом документе — из-за
       этого подписи и разъезжались с пультом. Порядок типов постоянный:
       сначала три, что остаются в сданной работе, потом три рабочих. */
    legendHTML: function (code, types) {
      var c = lang(code), list = types || TYPES;
      return '<div class="provleg" aria-label="' + L[c].legendTitle + '">' +
        list.map(function (t) {
          return '<div class="' + t + '"><span class="ln"></span>' +
            '<span class="ic">' + window.PROV_I18N.icon(t) + '</span>' +
            '<span><b>' + L[c][t] + '</b> — ' + L[c].hint[t] + '</span></div>';
        }).join('') + '</div>';
    }
  };
})();
