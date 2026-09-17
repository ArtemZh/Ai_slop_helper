# -*- coding: utf-8 -*-
"""prov-map.json → HTML. Направление одно: JSON источник правды, HTML следствие.

  python3 prov_apply.py              применить всё
  python3 prov_apply.py 03-2-1 todo  сменить один блок и применить

Где искать разметку и карту — PROV_SITE и PROV_MAP (см. README).
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
# Папка с размеченными HTML и файл карты. Проект не привязан к одному сайту:
# путь задаётся переменными окружения, значения по умолчанию — для запуска из корня.
HUB  = os.path.abspath(os.environ.get('PROV_SITE', os.path.join(ROOT, 'site')))
MAP  = os.path.abspath(os.environ.get('PROV_MAP', os.path.join(ROOT, 'prov-map.json')))
TYPES = ('fact', 'hyp', 'mine', 'todo', 'redo', 'del')

ICONS = {
 'fact':'<path d="M6 4.5h8l4.5 4.5v6"/><path d="M14 4.5V9h4.5"/><path d="M6 4.5v17h6"/><path d="M9 10h5M9 13.5h6M9 17h3"/><path d="M14.5 18.5l2.5 2.5 4.5-5"/>',
 'hyp':'<circle cx="13" cy="13" r="8.5" stroke-dasharray="3 3.4"/><path d="M13 9.4v4.2"/><path d="M13 17.1h.01"/>',
 'mine':'<path d="M5.5 4.5v17"/><path d="M5.5 13h9"/><path d="M11 8.5l4 4.5-4 4.5"/><path d="M18.5 13h2.5"/>',
 'todo':'<path d="M17.5 4.8l3.7 3.7L9.6 20.2l-4.6.9.9-4.6z"/><path d="M15.2 7.1l3.7 3.7"/>',
 'redo':'<path d="M21 13a8 8 0 1 1-2.6-5.9"/><path d="M21 4.5V9h-4.5"/>',
 'del':'<path d="M5.5 8h15"/><path d="M10 8V5.5h6V8"/><path d="M7.5 8l1 12.5h9L18.5 8"/><path d="M11 11.5v6M15 11.5v6"/>',
}
SVG = ('<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.5" '
       'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>')

def load():
    return json.load(io.open(MAP, encoding='utf-8'))

def save(m):
    json.dump(m, io.open(MAP, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

def apply_all(m=None):
    """Проставляет классы и иконки по карте. Возвращает число изменённых блоков."""
    m = m or load()
    by_file = {}
    for pid, rec in m.items():
        by_file.setdefault(rec['file'], {})[pid] = rec['type']
    changed = 0
    for fname, ids in by_file.items():
        path = os.path.join(HUB, fname)
        s = io.open(path, encoding='utf-8').read()
        out = s
        for pid, typ in ids.items():
            i = out.find('data-prov="%s"' % pid)
            if i < 0:
                print('нет блока %s в %s' % (pid, fname)); continue
            start = out.rfind('<', 0, i)
            end = out.index('>', i)
            tag = out[start:end + 1]
            cm = re.search(r'class="([^"]*)"', tag)
            if cm is None:
                # У блока может не быть class вовсе — тогда атрибут заводится.
                # Разметке достаточно одного data-prov, остальное дело карты.
                newtag = tag[:-1].rstrip() + ' class="prov %s">' % typ
            else:
                cls = [c for c in cm.group(1).split() if c not in TYPES]
                if 'prov' not in cls:
                    cls.insert(0, 'prov')
                if typ not in cls:
                    cls.insert(cls.index('prov') + 1, typ)
                newtag = tag[:cm.start(1)] + ' '.join(cls) + tag[cm.end(1):]
            # иконка — первый потомок
            rest = out[end + 1:]
            im = re.match(r'\s*<span class="ic"[^>]*>.*?</span>', rest, re.S)
            icon = '<span class="ic" aria-hidden="true">%s</span>' % (SVG % ICONS[typ])
            if im:
                rest = icon + rest[im.end():]
            else:
                rest = icon + rest
            new = out[:start] + newtag + rest
            if new != out:
                out = new; changed += 1
        if out != s:
            io.open(path, 'w', encoding='utf-8').write(out)
    return changed

def set_type(pid, typ):
    if typ not in TYPES:
        raise ValueError('неизвестный тип ' + typ)
    m = load()
    if pid not in m:
        raise KeyError('нет блока ' + pid)
    m[pid]['type'] = typ
    save(m); apply_all(m)
    return m[pid]

def usage():
    print(__doc__.strip())
    print('\nPROV_SITE = %s\nPROV_MAP  = %s' % (HUB, MAP))

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] in ('-h', '--help'):
        usage(); sys.exit(0)
    if len(sys.argv) == 3:
        print(set_type(sys.argv[1], sys.argv[2]))
    else:
        print('обновлено блоков:', apply_all())
