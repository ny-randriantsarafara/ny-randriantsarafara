import { describe, expect, it, vi } from 'vitest';
import { verifyFreeRoute } from './evaluation-safety.ts';

describe('evaluation spending gate', () => {
  it('rejects paid routes and invalid caps before fetching', async () => {
    const transport = vi.fn<typeof fetch>();
    await expect(verifyFreeRoute('paid-model', 1, transport)).rejects.toThrow(':free');
    await expect(verifyFreeRoute('route:free', 61, transport)).rejects.toThrow('1..60');
    expect(transport).not.toHaveBeenCalled();
  });
  it('checks every advertised category, including non-token prices', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'unit-test-only');
    try {
      const transport = vi.fn<typeof fetch>(async () =>
        Response.json({
          data: [{ id: 'route:free', pricing: { prompt: '0', completion: '0', image: '0.01' } }],
        })
      );
      await expect(verifyFreeRoute('route:free', 1, transport)).rejects.toThrow('Every advertised');
      expect(transport).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it('refuses to interpret a dollar balance as free request quota', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'unit-test-only');
    try {
      const transport = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          Response.json({
            data: [{ id: 'route:free', pricing: { prompt: '0', completion: '0', request: '0' } }],
          })
        )
        .mockResolvedValueOnce(
          Response.json({ data: { limit_remaining: 100, is_free_tier: true, usage_daily: 0 } })
        );
      await expect(verifyFreeRoute('route:free', 1, transport)).rejects.toThrow('request quota');
      expect(transport).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

it('accepts the documented authenticated free request counter', async () => {
  vi.stubEnv('OPENROUTER_API_KEY', 'unit-test-only');
  try {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          data: [{ id: 'route:free', pricing: { prompt: '0', completion: '0', request: '0' } }],
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          data: { free_model_daily_requests: { used: 12, limit: 1000, remaining: 988 } },
        })
      );
    await expect(verifyFreeRoute('route:free', 60, transport)).resolves.toBeUndefined();
    expect(transport).toHaveBeenCalledTimes(2);
  } finally {
    vi.unstubAllEnvs();
  }
});
