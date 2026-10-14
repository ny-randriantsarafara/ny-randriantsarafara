import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

import { createUser, deleteUser } from '@directus/sdk';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { adminClient } from './support/clients.ts';
import { requireEnvironment, testEnvironment } from './support/environment.ts';

const tokenResponse = z.object({ data: z.object({ access_token: z.string() }) });
const tfaResponse = z.object({ data: z.object({ secret: z.string(), otpauth_url: z.string() }) });
const password = randomBytes(24).toString('hex');
const email = `owner-tfa-${randomUUID()}@example.com`;
const userIds: string[] = [];
let token = '';
let otherUserId = '';

async function request(path: string, body: unknown, method = 'POST'): Promise<Response> {
  return fetch(`${testEnvironment.directusUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

async function oneTimePassword(secret: string): Promise<string> {
  const remainingMs = 30_000 - (Date.now() % 30_000);
  if (remainingMs < 5_000) {
    await delay(remainingMs);
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...secret]
    .map((letter) => alphabet.indexOf(letter).toString(2).padStart(5, '0'))
    .join('');
  const bytes = bits.match(/.{8}/g)?.map((byte) => Number.parseInt(byte, 2)) ?? [];
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = (digest.at(-1) ?? 0) & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

beforeAll(async () => {
  for (const accountEmail of [email, `other-${email}`]) {
    const user = await adminClient.request(
      createUser({
        email: accountEmail,
        password,
        role: requireEnvironment(accountEmail === email ? 'OWNER_ROLE_ID' : 'API_ROLE_ID'),
        status: 'active',
      })
    );
    userIds.push(user.id);
  }
  otherUserId = userIds[1] ?? '';
  const response = await request('/auth/login', { email, password });
  expect(response.status).toBe(200);
  token = tokenResponse.parse(await response.json()).data.access_token;
});

afterAll(async () => {
  for (const userId of userIds) {
    await adminClient.request(deleteUser(userId));
  }
});

describe('owner two-factor setup', () => {
  it('enrolls through the Studio endpoints and signs in with an OTP', async () => {
    const generated = await request('/users/me/tfa/generate', { password });
    expect(generated.status).toBe(200);
    const { secret, otpauth_url } = tfaResponse.parse(await generated.json()).data;
    expect(otpauth_url.startsWith('otpauth://totp/')).toBe(true);

    const enabled = await request('/users/me/tfa/enable', {
      secret,
      otp: await oneTimePassword(secret),
    });
    expect(enabled.status).toBe(204);

    const signedIn = await request('/auth/login', {
      email,
      password,
      otp: await oneTimePassword(secret),
    });
    expect(signedIn.status).toBe(200);
    token = tokenResponse.parse(await signedIn.json()).data.access_token;
    const updated = await request('/users/me', { first_name: 'Owner with 2FA' }, 'PATCH');
    expect(updated.status).toBe(200);
  });

  it('cannot update another user', async () => {
    const response = await request(`/users/${otherUserId}`, { first_name: 'Changed' }, 'PATCH');
    expect(response.status).toBe(403);
  });

  it.each(['role', 'status', 'token'])('cannot change its own %s', async (field) => {
    const response = await request('/users/me', { [field]: null }, 'PATCH');
    expect(response.status).toBe(403);
  });
});
