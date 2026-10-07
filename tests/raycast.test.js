import { test } from 'node:test';
import assert from 'node:assert/strict';
import { raycast } from '../src/raycast.js';

function polygon(vertices, extras = {}) {
  const body = { vertices: vertices.map(([x, y]) => ({ x, y })), ...extras };
  body.parts = [body];
  return body;
}

test('anchors on the nearest exact surface independent of body order', () => {
  const near = polygon([[10, -5], [15, -5], [15, 5], [10, 5]]);
  const far = polygon([[30, -5], [40, -5], [40, 5], [30, 5]]);
  const hit = raycast([far, near], { x: 0, y: 0 }, { x: 100, y: 0 });
  assert.equal(hit.body, near);
  assert.equal(hit.x, 10);
  assert.equal(hit.y, 0);
  assert.deepEqual(hit.normal, { x: -1, y: -0 });
});

test('inclined faces return exact impact and upward ground normal', () => {
  const slope = polygon([[0, 20], [20, 10], [20, 30], [0, 40]]);
  const hit = raycast([slope], { x: 10, y: 0 }, { x: 10, y: 50 });
  assert.equal(hit.x, 10);
  assert.equal(hit.y, 15);
  assert.ok(hit.normal.y < -0.45);
});

test('does not exceed ray reach or attach to sensors', () => {
  const solid = polygon([[60, -5], [70, -5], [70, 5], [60, 5]]);
  const sensor = polygon([[10, -5], [20, -5], [20, 5], [10, 5]], { isSensor: true });
  assert.equal(raycast([solid, sensor], { x: 0, y: 0 }, { x: 50, y: 0 }), null);
});

test('supports compound bodies without hitting their convex parent hull', () => {
  const parent = polygon([[10, -20], [50, -20], [50, 20], [10, 20]]);
  parent.parts = [parent, polygon([[30, -5], [40, -5], [40, 5], [30, 5]])];
  assert.equal(raycast([parent], { x: 0, y: 0 }, { x: 100, y: 0 }).x, 30);
});
