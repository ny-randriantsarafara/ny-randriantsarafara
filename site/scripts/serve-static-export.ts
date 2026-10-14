import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const outDir = path.join(process.cwd(), 'out');
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);

function contentTypeFor(filePath: string): string {
  if (filePath.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  }
  if (filePath.endsWith('.json')) {
    return 'application/json; charset=utf-8';
  }
  if (filePath.endsWith('.js')) {
    return 'text/javascript; charset=utf-8';
  }
  if (filePath.endsWith('.css')) {
    return 'text/css; charset=utf-8';
  }
  if (filePath.endsWith('.png')) {
    return 'image/png';
  }
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  return 'application/octet-stream';
}

async function resolveFilePath(urlPath: string): Promise<string | null> {
  if (urlPath === '/' || urlPath === '/index.html') {
    return path.join(outDir, 'index.html');
  }
  if (urlPath === '/fr' || urlPath === '/fr/') {
    return path.join(outDir, 'fr.html');
  }
  const relative = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
  const direct = path.join(outDir, relative);
  try {
    await readFile(direct);
    return direct;
  } catch {
    const htmlFallback = path.join(outDir, `${relative}.html`);
    try {
      await readFile(htmlFallback);
      return htmlFallback;
    } catch {
      return null;
    }
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  const filePath = await resolveFilePath(url.pathname);
  if (filePath === null) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  const body = await readFile(filePath);
  response.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
  response.end(body);
});

server.listen(port, () => {
  process.stdout.write(`Static export served at http://127.0.0.1:${port}\n`);
});
