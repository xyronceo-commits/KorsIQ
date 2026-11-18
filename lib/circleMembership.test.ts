import assert from 'node:assert/strict';
import { isUserCircle } from './circleMembership';

const ME = 'user-me';
const OTHER = 'user-other';

// someone else's general circle, I have nothing to do with it -> NOT mine (this was the bug)
assert.equal(isUserCircle({ id: 'g1', owner_id: OTHER, members: [{ userId: OTHER }] }, ME), false);
assert.equal(isUserCircle({ id: 'g1', ownerId: OTHER, members: [] }, ME), false);
assert.equal(isUserCircle({ id: 'g1', owner_id: OTHER }, ME), false);
// I own it (database or app naming)
assert.equal(isUserCircle({ id: 'g2', owner_id: ME }, ME), true);
assert.equal(isUserCircle({ id: 'g2', ownerId: ME }, ME), true);
// I am in the members list (object, snake_case object, or plain string entries)
assert.equal(isUserCircle({ id: 'g3', owner_id: OTHER, members: [{ userId: OTHER }, { userId: ME }] }, ME), true);
assert.equal(isUserCircle({ id: 'g3', owner_id: OTHER, members: [{ user_id: ME }] }, ME), true);
assert.equal(isUserCircle({ id: 'g3', owner_id: OTHER, members: [ME] }, ME), true);
// I have a circle_members row
assert.equal(isUserCircle({ id: 'g4', owner_id: OTHER, members: [] }, ME, new Set(['g4'])), true);
assert.equal(isUserCircle({ id: 'g5', owner_id: OTHER, members: [] }, ME, new Set(['g4'])), false);
// bad input never counts as membership
assert.equal(isUserCircle({ id: 'g6', owner_id: OTHER, members: 'nope' as any }, ME), false);
assert.equal(isUserCircle({ id: 'g6', owner_id: OTHER, members: [null, undefined] as any }, ME), false);
assert.equal(isUserCircle({ id: 'g6', owner_id: OTHER }, ''), false);
console.log('circleMembership: all checks passed');
