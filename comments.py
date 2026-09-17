# -*- coding: utf-8 -*-
"""Замечания к блокам: хранение и вывод списком.

Комментарий — вторая колея поверх пометок. Пометка говорит, откуда взят блок;
комментарий говорит, что с ним сделать, и в отличие от типа `todo` в нём есть текст.

  python3 comments.py            показать все замечания
  python3 comments.py 03-2-1     показать замечания одного блока

История не ведётся: отработанное замечание удаляется (drop). Перед удалением
итог показывают пользователю в переписке — файл остаётся чистым, а сверить есть с чем.
"""
import io, json, os, sys, time

import prov_apply

ROOT = os.path.dirname(os.path.abspath(__file__))
FILE = os.path.abspath(os.environ.get('PROV_COMMENTS', os.path.join(ROOT, 'comments.json')))


def load():
    if not os.path.exists(FILE):
        return {}
    return json.load(io.open(FILE, encoding='utf-8'))


def save(c):
    json.dump(c, io.open(FILE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def add(pid, text):
    """Добавляет замечание к блоку. Пустой текст ничего не пишет."""
    text = (text or '').strip()
    if not text:
        raise ValueError('пустой комментарий')
    if pid not in prov_apply.load():
        raise KeyError('нет блока ' + pid)
    c = load()
    c.setdefault(pid, []).append({'text': text, 'at': time.strftime('%Y-%m-%d %H:%M')})
    save(c)
    return c[pid]


def drop(pid, i=None):
    """Убирает отработанное замечание: одно по номеру или все у блока."""
    c = load()
    if pid not in c:
        raise KeyError('нет замечаний у ' + pid)
    if i is None:
        del c[pid]
    else:
        c[pid].pop(i)
        if not c[pid]:
            del c[pid]
    save(c)


def report():
    """Список замечаний вместе с типом и началом текста блока — чтобы понять,
    о чём речь, не открывая страницу."""
    c, m = load(), prov_apply.load()
    if not c:
        return 'замечаний нет'
    out = []
    for pid in sorted(c, key=lambda k: (m.get(k, {}).get('file', ''), k)):
        rec = m.get(pid, {})
        out.append('%s  [%s]  %s' % (pid, rec.get('type', '?'), rec.get('section', '')))
        out.append('    блок: %s' % rec.get('text', '')[:90])
        for i, note in enumerate(c[pid]):
            out.append('    %d) %s  (%s)' % (i, note['text'], note['at']))
        out.append('')
    out.append('всего блоков с замечаниями: %d' % len(c))
    return '\n'.join(out)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] in ('-h', '--help'):
        print(__doc__.strip()); print('\nPROV_COMMENTS = %s' % FILE); sys.exit(0)
    if len(sys.argv) == 2:
        pid = sys.argv[1]
        for i, note in enumerate(load().get(pid, [])):
            print('%d) %s  (%s)' % (i, note['text'], note['at']))
    else:
        print(report())
