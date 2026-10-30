import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

const PASSWORD = 'Password123!';
const RUNS = 20;
const P95_BUDGET_MS = 500;

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return res.headers['set-cookie']?.[0] ?? '';
}

function p95(durationsMs: number[]): number {
  const sorted = [...durationsMs].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1);
  return sorted[index];
}

async function timeRequests(path: string, cookie: string, runs: number): Promise<number[]> {
  const durations: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    const res = await request(app).get(path).set('Cookie', cookie);
    durations.push(performance.now() - start);
    expect(res.status).toBe(200);
  }
  return durations;
}

describe('Dashboard performance smoke (AC-28)', () => {
  let requesterCookie: string;
  let staffCookie: string;

  beforeAll(async () => {
    [requesterCookie, staffCookie] = await Promise.all([
      login('requester1@toktickit.com'),
      login('staff1@toktickit.com'),
    ]);
  });

  it('PERF-01: the Requester dashboard responds with p95 latency under 500ms over 20 consecutive requests', async () => {
    const durations = await timeRequests('/api/dashboard/requester', requesterCookie, RUNS);
    const latency = p95(durations);
    expect(latency, `p95=${latency.toFixed(1)}ms over ${RUNS} runs`).toBeLessThan(P95_BUDGET_MS);
  });

  it('PERF-02: the Staff & Administrator dashboard responds with p95 latency under 500ms over 20 consecutive requests', async () => {
    const durations = await timeRequests('/api/dashboard/staff', staffCookie, RUNS);
    const latency = p95(durations);
    expect(latency, `p95=${latency.toFixed(1)}ms over ${RUNS} runs`).toBeLessThan(P95_BUDGET_MS);
  });
});
