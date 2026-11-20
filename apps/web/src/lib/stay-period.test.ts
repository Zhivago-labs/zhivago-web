import assert from 'node:assert/strict';
import test from 'node:test';
import { stayOverlaps, stayQuote } from './stay-period';

test('a quote requires a checkout and charges cleaning once per stay', () => {
  assert.equal(stayQuote('2026-11-21', null, 200, 80), null);
  assert.equal(stayQuote('2026-11-21', '2026-11-21', 200, 80), null);
  assert.deepEqual(stayQuote('2026-11-21', '2026-11-23', 200, 80), { nights: 2, total: 480 });
  assert.deepEqual(stayQuote('2026-12-31', '2027-01-01', 125.55, 0), { nights: 1, total: 125.55 });
});

test('checkout and the following arrival can share a calendar date', () => {
  const ranges = [{ startDate: '2026-11-21T00:00:00.000Z', endDate: '2026-11-23T00:00:00.000Z' }];
  assert.equal(stayOverlaps(ranges, '2026-11-19', '2026-11-21'), false);
  assert.equal(stayOverlaps(ranges, '2026-11-23', '2026-11-24'), false);
  assert.equal(stayOverlaps(ranges, '2026-11-22', '2026-11-24'), true);
});
