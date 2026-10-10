import { test } from 'node:test';
import assert from 'node:assert/strict';
import WebSystem from '../src/WebSystem.js';
import { GAMEPLAY } from '../src/config.js';

function webFixture() {
  const graphics = { setDepth() { return this; } };
  const spider = { id: 'cyan', body: { position: { x: 0, y: 200 },
    velocity: { x: 18, y: -7 }, constraintImpulse: { x: 2, y: 3 } } };
  const scene = { add: { graphics: () => graphics }, matter: {
    world: { removeConstraint() { spider.body.velocity.x = 0; spider.body.velocity.y = 0; } },
    body: { setVelocity(body, velocity) { body.velocity = velocity; } },
  } };
  const web = new WebSystem(scene, spider);
  web.constraint = { length: 200 }; web.anchor = { x: 0, y: 0 };
  return { web, spider };
}
test('releasing a rope retains exact horizontal and vertical momentum and clears solver impulse', () => {
  const { web, spider } = webFixture(); const previous = { ...spider.body.velocity };
  web.release();
  assert.deepEqual(spider.body.velocity, previous);
  assert.deepEqual(spider.body.constraintImpulse, { x: 0, y: 0 });
  assert.equal(web.attached, false); assert.equal(web.anchor, null);
});
test('taut rope only pulls outward and never cancels a simultaneous jump toward its anchor', () => {
  const { web, spider } = webFixture();
  spider.body.velocity = { x: 0, y: -GAMEPLAY.jumpSpeed }; web.beforeStep();
  assert.equal(web.constraint.stiffness, 0); assert.equal(web.constraint.damping, 0);
  assert.equal(spider.body.velocity.y, -GAMEPLAY.jumpSpeed);
  spider.body.velocity.y = 1; web.beforeStep();
  assert.equal(web.constraint.stiffness, GAMEPLAY.webStiffness);
  assert.equal(web.constraint.damping, GAMEPLAY.webDamping);
  spider.body.position.y = 100; web.beforeStep(); assert.equal(web.constraint.stiffness, 0);
});
