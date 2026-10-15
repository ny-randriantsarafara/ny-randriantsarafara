import { expect, it } from 'vitest';
import { measureCompletion } from './timed-completion.ts';

it('includes delayed response body consumption after headers', async () => {
  let duration = 0;
  const result = await measureCompletion(
    async () => {
      const response = new Response(
        new ReadableStream({
          start(controller) {
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode('{"ok":true}'));
              controller.close();
            }, 25);
          },
        })
      );
      return response.json();
    },
    (milliseconds) => {
      duration = milliseconds;
    }
  );
  expect(result).toEqual({ ok: true });
  expect(duration).toBeGreaterThanOrEqual(20);
});
