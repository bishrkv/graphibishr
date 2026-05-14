const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3001;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DATA_FILE = path.join(DATA_DIR, 'works.json');
const INDEX_FILE = path.join(ROOT_DIR, 'index.html');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]\n', 'utf8');
  }
}

async function readWorks() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeWorks(works) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(works, null, 2) + '\n', 'utf8');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath)
    .then((content) => {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    })
    .catch(() => {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/works') {
    try {
      const works = await readWorks();
      return sendJson(res, 200, works);
    } catch (error) {
      return sendJson(res, 500, { error: 'Failed to read works data.' });
    }
  }

  if (req.method === 'PUT' && url.pathname === '/api/works') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) req.destroy();
    });
    req.on('end', async () => {
      try {
        const works = JSON.parse(body);
        if (!Array.isArray(works)) {
          return sendJson(res, 400, { error: 'Expected an array of work items.' });
        }
        await writeWorks(works);
        return sendJson(res, 200, { ok: true, count: works.length });
      } catch (error) {
        return sendJson(res, 400, { error: 'Invalid JSON payload.' });
      }
    });
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return sendFile(res, INDEX_FILE);
  }

  if (req.method === 'GET') {
    const assetPath = path.join(ROOT_DIR, decodeURIComponent(url.pathname.replace(/^\//, '')));
    if (assetPath.startsWith(ROOT_DIR)) {
      try {
        await fs.access(assetPath);
        return sendFile(res, assetPath);
      } catch {
        // fall through to SPA response
      }
    }
  }

  if (req.method === 'GET') {
    return sendFile(res, INDEX_FILE);
  }

  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`Portfolio server running on http://localhost:${PORT}`);
  const url = `http://localhost:${PORT}`;

  if (process.platform === 'win32') {
    exec(`start chrome "${url}"`, { shell: true }, (chromeError) => {
      if (!chromeError) return;
      exec(`start "" "${url}"`, { shell: true });
    });
    return;
  }

  const openCommand = process.platform === 'darwin'
    ? `open "${url}"`
    : `xdg-open "${url}"`;

  exec(openCommand, { shell: true });
});
