import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeOrderItems, completionValues, gpsDeliveryIds } from '../src/utils/deliveryRules.js';

test('an order requires named items with positive integer quantities and nonnegative prices', () => {
  assert.deepEqual(normalizeOrderItems([{ productName: ' Robe ', quantity: '2', unitPrice: '15000' }]), [{ productName: 'Robe', quantity: 2, unitPrice: 15000 }]);
  for (const item of [
    { productName: ' ', quantity: 1, unitPrice: 100 },
    { productName: 'Robe', quantity: -1, unitPrice: 100 },
    { productName: 'Robe', quantity: 1.5, unitPrice: 100 },
    { productName: 'Robe', quantity: 1, unitPrice: '' },
    { productName: 'Robe', quantity: 1, unitPrice: -10 },
  ]) assert.throws(() => normalizeOrderItems([item]));
  assert.throws(() => normalizeOrderItems([]));
});

test('prepaid deliveries do not record a second collection', () => {
  assert.deepEqual(completionValues({ paymentMethod: 'PREPAID' }, '15000'), {});
});

test('cash on delivery requires an actual amount, including a valid explicit zero', () => {
  const order = { paymentMethod: 'CASH_ON_DELIVERY' };
  assert.deepEqual(completionValues(order, '15000'), { collectedAmount: 15000 });
  assert.deepEqual(completionValues(order, '0'), { collectedAmount: 0 });
  for (const value of ['', ' ', null, undefined, -1, 'NaN', Infinity]) assert.throws(() => completionValues(order, value));
});

test('GPS targets only the connected driver’s active deliveries', () => {
  const deliveries = [
    { id: 'b', deliveryPersonId: 'driver', status: 'EN_ROUTE' },
    { id: 'a', deliveryPersonId: 'driver', status: 'EN_ROUTE' },
    { id: 'done', deliveryPersonId: 'driver', status: 'LIVREE' },
    { id: 'pending', deliveryPersonId: 'driver', status: 'AFFECTEE' },
    { id: 'other', deliveryPersonId: 'someone-else', status: 'EN_ROUTE' },
  ];
  assert.equal(gpsDeliveryIds(deliveries, { id: 'driver', role: 'DELIVERY' }), 'a|b');
  assert.equal(gpsDeliveryIds(deliveries, { id: 'driver', role: 'ADMIN' }), '');
  assert.equal(gpsDeliveryIds([], { id: 'driver', role: 'DELIVERY' }), '');
});
