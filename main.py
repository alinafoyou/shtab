"""ШТАБ — сервер: раздаёт сайт, регистрирует и впускает пользователей, хранит личные данные каждого аккаунта.

База: PostgreSQL, если задан DATABASE_URL (Railway), иначе локальный файл SQLite для разработки.
"""
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
PUBLIC_FILES = {'index.html', 'app.html', 'icon.svg', 'manifest.webmanifest', 'sw.js'}
PUBLIC_DIRS = {'css', 'js', 'demo'}
TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
         '.webmanifest': 'application/manifest+json', '.csv': 'text/csv; charset=utf-8', '.json': 'application/json'}
COOKIE = 'shtab_sid'
SESSION_TTL = 30 * 24 * 3600
MAX_STATE = 5 * 1024 * 1024
EMAIL_RE = re.compile(r'^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$')
DB_URL = os.environ.get('DATABASE_URL', '')


# ---------------- база ----------------
class DB:
    def __init__(self):
        self.pg = DB_URL.startswith('postgres')
        if self.pg:
            import psycopg
            self.psycopg = psycopg
        else:
            self.path = os.environ.get('SQLITE_PATH', str(ROOT / 'local.db'))
            self.lock = threading.Lock()
        for sql in (
            'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, pw_hash TEXT NOT NULL, created_at BIGINT NOT NULL)',
            'CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at BIGINT NOT NULL)',
            'CREATE TABLE IF NOT EXISTS states (user_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at BIGINT NOT NULL)',
        ):
            self.q(sql)

    def q(self, sql, args=(), fetch=None):
        if self.pg:
            with self.psycopg.connect(DB_URL, autocommit=True) as c, c.cursor() as cur:
                cur.execute(sql.replace('?', '%s'), args)
                return cur.fetchone() if fetch == 'one' else cur.fetchall() if fetch == 'all' else None
        with self.lock:
            c = sqlite3.connect(self.path)
            try:
                cur = c.execute(sql, args)
                r = cur.fetchone() if fetch == 'one' else cur.fetchall() if fetch == 'all' else None
                c.commit()
                return r
            finally:
                c.close()


db = None


# ---------------- пароли и сессии ----------------
def hash_pw(pw):
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(pw.encode(), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)
    return f'scrypt$16384$8$1${salt.hex()}${dk.hex()}'


def check_pw(pw, stored):
    try:
        _, n, r, p, salt, dk = stored.split('$')
        got = hashlib.scrypt(pw.encode(), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p), dklen=len(dk) // 2)
        return hmac.compare_digest(got.hex(), dk)
    except (ValueError, TypeError):
        return False


DUMMY_HASH = hash_pw(secrets.token_hex(8))  # чтобы вход с несуществующим email занимал столько же времени
token_hash = lambda t: hashlib.sha256(t.encode()).hexdigest()

# ограничение подбора пароля: не больше 10 неудачных попыток за 15 минут с одного адреса
FAILS, FAILS_LOCK, FAIL_WINDOW, FAIL_LIMIT = {}, threading.Lock(), 15 * 60, 10


def too_many(ip):
    with FAILS_LOCK:
        now = time.time()
        FAILS[ip] = [t for t in FAILS.get(ip, []) if now - t < FAIL_WINDOW]
        return len(FAILS[ip]) >= FAIL_LIMIT


def add_fail(ip):
    with FAILS_LOCK:
        FAILS.setdefault(ip, []).append(time.time())


# ---------------- HTTP ----------------
class Handler(BaseHTTPRequestHandler):
    server_version = 'shtab'
    sys_version = ''

    # --- помощники ---
    def ip(self):
        fwd = self.headers.get('X-Forwarded-For', '')
        return fwd.split(',')[0].strip() or self.client_address[0]

    def https(self):
        return self.headers.get('X-Forwarded-Proto', '') == 'https'

    def send_json(self, status, obj, cookie=None):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if cookie is not None:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(body)

    def err(self, status, msg):
        self.send_json(status, {'error': msg})

    def cookie(self, token, max_age):
        return f'{COOKIE}={token}; Path=/; Max-Age={max_age}; HttpOnly; SameSite=Lax' + ('; Secure' if self.https() else '')

    def body(self, limit):
        n = int(self.headers.get('Content-Length') or 0)
        if n > limit:
            return None, 'Слишком большой запрос'
        try:
            return json.loads(self.rfile.read(n) or b'{}'), None
        except (ValueError, UnicodeDecodeError):
            return None, 'Неверный формат запроса'

    def session_token(self):
        for part in self.headers.get('Cookie', '').split(';'):
            k, _, v = part.strip().partition('=')
            if k == COOKIE and v:
                return v
        return None

    def current_user(self):
        t = self.session_token()
        if not t:
            return None
        row = db.q('SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?',
                   (token_hash(t), int(time.time())), 'one')
        return {'id': row[0], 'email': row[1], 'name': row[2]} if row else None

    def new_session(self, uid):
        t = secrets.token_urlsafe(32)
        db.q('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', (token_hash(t), uid, int(time.time()) + SESSION_TTL))
        db.q('DELETE FROM sessions WHERE expires_at < ?', (int(time.time()),))
        return self.cookie(t, SESSION_TTL)

    # --- маршруты ---
    def api(self, method, path):
        if method != 'GET' and self.headers.get('X-Shtab') != '1':  # защита от запросов с чужих сайтов
            return self.err(403, 'Запрос отклонён')
        if path == 'me' and method == 'GET':
            u = self.current_user()
            return self.send_json(200, {'user': u}) if u else self.err(401, 'Нужно войти')
        if path == 'register' and method == 'POST':
            return self.register()
        if path == 'login' and method == 'POST':
            return self.login()
        if path == 'logout' and method == 'POST':
            t = self.session_token()
            if t:
                db.q('DELETE FROM sessions WHERE token_hash = ?', (token_hash(t),))
            return self.send_json(200, {'ok': True}, self.cookie('', 0))
        if path == 'state':
            u = self.current_user()
            if not u:
                return self.err(401, 'Нужно войти')
            if method == 'GET':
                row = db.q('SELECT data FROM states WHERE user_id = ?', (u['id'],), 'one')
                return self.send_json(200, {'data': json.loads(row[0]) if row else None})
            if method == 'PUT':
                data, e = self.body(MAX_STATE)
                if e or not isinstance(data, dict) or not isinstance(data.get('data'), dict):
                    return self.err(413 if e == 'Слишком большой запрос' else 400, e or 'Неверный формат данных')
                db.q('INSERT INTO states (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
                     (u['id'], json.dumps(data['data'], ensure_ascii=False), int(time.time())))
                return self.send_json(200, {'ok': True})
        return self.err(404, 'Не найдено')

    def register(self):
        v, e = self.body(10_000)
        if e or not isinstance(v, dict):
            return self.err(400, e or 'Неверный формат запроса')
        email, name, pw = str(v.get('email', '')).strip().lower(), str(v.get('name', '')).strip(), str(v.get('password', ''))
        if not EMAIL_RE.match(email):
            return self.err(400, 'Проверьте email')
        if not 1 <= len(name) <= 80:
            return self.err(400, 'Укажите имя')
        if not 8 <= len(pw) <= 200:
            return self.err(400, 'Пароль должен быть не короче 8 символов')
        if db.q('SELECT 1 FROM users WHERE email = ?', (email,), 'one'):
            return self.err(409, 'Этот email уже зарегистрирован. Войдите.')
        uid = secrets.token_hex(8)
        try:
            db.q('INSERT INTO users (id, email, name, pw_hash, created_at) VALUES (?, ?, ?, ?, ?)', (uid, email, name, hash_pw(pw), int(time.time())))
        except Exception:  # гонка двух одинаковых регистраций
            return self.err(409, 'Этот email уже зарегистрирован. Войдите.')
        self.send_json(200, {'user': {'id': uid, 'email': email, 'name': name}}, self.new_session(uid))

    def login(self):
        ip = self.ip()
        if too_many(ip):
            return self.err(429, 'Слишком много попыток. Попробуйте через 15 минут.')
        v, e = self.body(10_000)
        if e or not isinstance(v, dict):
            return self.err(400, e or 'Неверный формат запроса')
        email, pw = str(v.get('email', '')).strip().lower(), str(v.get('password', ''))
        row = db.q('SELECT id, email, name, pw_hash FROM users WHERE email = ?', (email,), 'one')
        if not check_pw(pw, row[3] if row else DUMMY_HASH) or not row:
            add_fail(ip)
            return self.err(401, 'Неверный email или пароль')
        self.send_json(200, {'user': {'id': row[0], 'email': row[1], 'name': row[2]}}, self.new_session(row[0]))

    def static(self, path):
        rel = 'index.html' if path in ('', '/') else path.lstrip('/')
        parts = rel.split('/')
        ok = (rel in PUBLIC_FILES) or (len(parts) > 1 and parts[0] in PUBLIC_DIRS and '..' not in parts and all(parts))
        f = ROOT / rel
        if not ok or not f.is_file():
            return self.err(404, 'Не найдено')
        data = f.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', TYPES.get(f.suffix, 'application/octet-stream'))
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(data)

    def route(self, method):
        path = urlparse(self.path).path
        try:
            if path.startswith('/api/'):
                return self.api(method, path[5:].strip('/'))
            if method == 'GET':
                return self.static(path)
            return self.err(405, 'Метод не поддерживается')
        except Exception as ex:  # не показываем внутренности наружу
            print('ERROR', method, path, repr(ex), flush=True)
            return self.err(500, 'Ошибка сервера')

    def do_GET(self):
        self.route('GET')

    def do_POST(self):
        self.route('POST')

    def do_PUT(self):
        self.route('PUT')


if __name__ == '__main__':
    db = DB()
    port = int(os.environ.get('PORT', '4173'))
    srv = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    print(f'ШТАБ запущен: http://localhost:{port} · база: {"PostgreSQL" if db.pg else "SQLite (локально)"}', flush=True)
    srv.serve_forever()
