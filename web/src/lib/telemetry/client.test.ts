import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTelemetry } from './client';

const CREDENTIALS = { channelId: '123', readApiKey: 'key' };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockFetchOk(payload: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(payload),
    }),
  );
}

describe('fetchTelemetry failure contract', () => {
  it('returns empty (not an error) when no credentials are configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await fetchTelemetry(null);
    expect(result.response).toEqual({ latest: null, history: [] });
    expect(result.demo).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws on an HTTP error instead of collapsing it into an empty response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) }),
    );
    // Callers keep last-known data on throw; an empty response here would wipe it.
    await expect(fetchTelemetry(CREDENTIALS)).rejects.toThrow('HTTP 500');
  });

  it('throws on a network error instead of swallowing it into empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(fetchTelemetry(CREDENTIALS)).rejects.toThrow('fetch failed');
  });

  it('re-throws a caller-initiated abort unchanged', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')),
    );
    // The caller's signal is already aborted, so fetchTelemetry propagates
    // the abort so the hook can swallow it as a non-error (cleanup),
    // distinct from transient failures.
    const promise = fetchTelemetry(CREDENTIALS, { signal: controller.signal });
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('returns parsed data on a successful fetch', async () => {
    mockFetchOk({
      channel: {
        field1: 'Pack Voltage (V)',
        field2: 'Cell 1 (V)',
        field3: '',
        field4: '',
        field5: '',
        field6: '',
        field7: '',
        field8: '',
      },
      feeds: [
        {
          created_at: new Date().toISOString(),
          entry_id: 1,
          field1: '8.00',
          field2: '4.00',
          field3: null,
          field4: null,
          field5: null,
          field6: null,
          field7: null,
          field8: null,
        },
      ],
    });
    const result = await fetchTelemetry(CREDENTIALS);
    expect(result.demo).toBe(false);
    expect(result.response.latest?.packV).toBe(8);
    expect(result.response.history).toHaveLength(1);
  });

  it('returns synthetic data for a scenario without hitting the network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await fetchTelemetry(null, { scenario: 'empty' });
    expect(result.demo).toBe(true);
    expect(result.response).toEqual({ latest: null, history: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
