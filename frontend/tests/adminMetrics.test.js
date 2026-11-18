import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dailyActivity, matches, sellerBalances } from '../src/utils/adminMetrics.js';

test('daily chart uses Madagascar dates across the UTC midnight boundary', () => {
  const rows = dailyActivity([
    { createdAt: '2026-11-12T20:59:00Z' },
    { createdAt: '2026-11-12T21:01:00Z' },
    { createdAt: '2026-11-14T10:00:00Z' },
  ], [{ status: 'LIVREE', completedAt: '2026-11-12T21:30:00Z', collectedAmount: 12000 }], 2, Date.parse('2026-11-13T09:00:00Z'));
  assert.deepEqual(rows.map(({ date, orders, delivered, collected }) => ({ date, orders, delivered, collected })), [
    { date: '2026-11-12', orders: 1, delivered: 0, collected: 0 },
    { date: '2026-11-13', orders: 1, delivered: 1, collected: 12000 },
  ]);
});

test('seller balances exclude unfinished and uncollected deliveries and retain a zero payout', () => {
  const order = { sellerId: 'seller-a', seller: { id: 'seller-a', nom: 'Boutique A' }, deliveryFee: 3000 };
  const rows = sellerBalances([
    { status: 'LIVREE', order, collectedAmount: 15000, sellerPayout: 12000 },
    { status: 'LIVREE', order, collectedAmount: 3000, sellerPayout: 0 },
    { status: 'LIVREE', order, collectedAmount: 1000, sellerPayout: null },
    { status: 'EN_ROUTE', order, collectedAmount: 90000, sellerPayout: 87000 },
    { status: 'LIVREE', order, collectedAmount: null },
  ]);
  assert.deepEqual(rows, [{ id: 'seller-a', name: 'Boutique A', count: 3, collected: 19000, fees: 9000, due: 12000 }]);
});

test('search ignores accents, case and extra surrounding spaces', () => {
  assert.equal(matches('  eLISE  ', 'Élise', 'Boutique'), true);
  assert.equal(matches('inconnu', 'Élise'), false);
});
