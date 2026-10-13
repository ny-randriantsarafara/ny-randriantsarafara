import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { text } from 'node:stream/consumers';

export type HookCall = { authorization: string | undefined; body: unknown };

export type HookResponder = (call: HookCall) => number;

export type HookServer = { close(): Promise<void> };

// Directus reaches the host through host.docker.internal, so the server listens on every
// interface, on the port of PUBLICATION_HOOK_URL. The responder returns the HTTP status.
export async function startHookServer(
  hookUrl: string,
  respond: HookResponder
): Promise<HookServer> {
  const server = createServer(async (request, response) => {
    const body = await text(request);
    const status = respond({ authorization: request.headers.authorization, body: readJson(body) });
    response.writeHead(status).end();
  });
  await listen(server, Number(new URL(hookUrl).port));
  return { close: () => closeServer(server) };
}

function readJson(body: string): unknown {
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed;
  } catch {
    return body;
  }
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => resolve());
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
        return;
      }
      reject(error);
    });
  });
}
