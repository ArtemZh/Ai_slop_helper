# -*- coding: utf-8 -*-
"""Локальный сервер хаба с возможностью менять пометки происхождения.

Отдаёт папку размеченного сайта (PROV_SITE) как статический сервер плюс:
  GET  /api/prov          вся карта
  POST /api/prov          {"id": "03-2-1", "type": "todo"} — пишет в JSON и в HTML
  GET  /api/comments      все замечания
  POST /api/comments      {"id": "03-2-1", "text": "переписать"} — добавить замечание
                          {"id": "03-2-1", "drop": 0} — убрать отработанное

Запуск:  python3 prov_server.py [порт]     по умолчанию 8742
Только для локальной работы: слушает 127.0.0.1.
"""
import json, os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
import prov_apply, comments
HUB = prov_apply.HUB   # один источник пути на оба модуля

ASSETS = os.path.join(ROOT, 'assets')


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=HUB, **kw)

    def translate_path(self, path):
        # /assets/... лежит рядом со скриптами, а не внутри размечаемого сайта
        clean = path.split('?')[0].split('#')[0]
        if clean.startswith('/assets/'):
            rel = clean[len('/assets/'):].lstrip('/')
            full = os.path.normpath(os.path.join(ASSETS, rel))
            if full.startswith(ASSETS):
                return full
        return super().translate_path(path)

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        # правки должны быть видны сразу, без ручного сброса кеша
        if self.path.endswith(('.html', '.css', '.js')):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        if self.path.split('?')[0] == '/api/prov':
            return self._json(prov_apply.load())
        if self.path.split('?')[0] == '/api/comments':
            return self._json(comments.load())
        return super().do_GET()

    def do_POST(self):
        route = self.path.split('?')[0]
        if route not in ('/api/prov', '/api/comments'):
            return self._json({'error': 'нет такого адреса'}, 404)
        n = int(self.headers.get('Content-Length', 0))
        try:
            req = json.loads(self.rfile.read(n) or b'{}')
            if route == '/api/prov':
                rec = prov_apply.set_type(req['id'], req['type'])
                return self._json({'ok': True, 'id': req['id'], 'type': rec['type']})
            # замечания: пришёл drop — убираем отработанное, иначе добавляем новое
            if 'drop' in req:
                comments.drop(req['id'], req['drop'])
                notes = comments.load().get(req['id'], [])
            else:
                notes = comments.add(req['id'], req.get('text'))
            return self._json({'ok': True, 'id': req['id'], 'notes': notes})
        except Exception as e:
            return self._json({'error': str(e)}, 400)

    def log_message(self, fmt, *args):
        if 'api/prov' in (args[0] if args else ''):
            sys.stderr.write('%s\n' % (fmt % args))

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] in ('-h', '--help'):
        print(__doc__.strip()); sys.exit(0)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8742
    print('http://127.0.0.1:%d/  ← %s' % (port, HUB))
    print('карта: %s' % prov_apply.MAP)
    try:
        ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
    except KeyboardInterrupt:
        print('\nзупинено')
