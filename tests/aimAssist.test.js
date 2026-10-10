import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webTarget } from '../src/aimAssist.js';

function box(x, y, width = 10, height = 10) {
  const body = { vertices: [{ x, y }, { x: x + width, y },
    { x: x + width, y: y + height }, { x, y: y + height }] };
  body.parts = [body]; return body;
}
const start = { x: 0, y: 0 }, direction = { x: 1, y: 0 };
test('assist prefers exact first surface over a nearer neighboring surface', () => {
  const wall = box(200, -5), neighbor = box(80, 2);
  const ray = webTarget([neighbor, wall], start, direction);
  assert.equal(ray.hit.body, wall); assert.equal(ray.angle, 0);
});
test('assist chooses smallest angular correction then nearest candidate', () => {
  const near = box(100, 3, 10, 6), far = box(200, -12, 10, 6);
  const ray = webTarget([far, near], start, direction);
  assert.equal(ray.hit.body, near);
  assert.ok(Math.abs(ray.angle) <= 10 * Math.PI / 180);
});
test('assist cannot reach outside the cone or beyond maximum range', () => {
  assert.equal(webTarget([box(100, 60)], start, direction).hit, null);
  assert.equal(webTarget([box(900, -5)], start, direction).hit, null);
});
test('first wall blocks distant anchors including an unusably close wall', () => {
  const wall = box(10, -100, 10, 200), far = box(200, -5);
  const ray = webTarget([far, wall], start, direction);
  assert.equal(ray.hit.body, wall); assert.equal(ray.angle, 0);
});
