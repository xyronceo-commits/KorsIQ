import assert from 'node:assert/strict';
import {
  buildModelChain, resolveHeavyModel, HeavyModelGuard, isPermanentModelError,
  DEFAULT_HEAVY_MODEL, BUILT_IN_FALLBACKS
} from './aiModels';

const cfg = { fastPrimary: 'flash-a', fallbacks: ['flash-b', 'flash-a', 'flash-c'], heavyModel: 'argon-x' };

// fast tier never touches the heavy model
assert.deepEqual(buildModelChain('fast', cfg), ['flash-a', 'flash-b', 'flash-c']);
// heavy tier tries the heavy model first, then the fast chain, with no duplicates
assert.deepEqual(buildModelChain('heavy', cfg), ['argon-x', 'flash-a', 'flash-b', 'flash-c']);
// heavy model temporarily unavailable -> fast chain only
assert.deepEqual(buildModelChain('heavy', cfg, false), ['flash-a', 'flash-b', 'flash-c']);
// heavy tier switched off -> behaves like fast
assert.deepEqual(buildModelChain('heavy', { ...cfg, heavyModel: '' }), ['flash-a', 'flash-b', 'flash-c']);

// env parsing
assert.equal(resolveHeavyModel(undefined), DEFAULT_HEAVY_MODEL);
assert.equal(resolveHeavyModel('  '), DEFAULT_HEAVY_MODEL);
assert.equal(resolveHeavyModel('gemini-4-carbon'), 'gemini-4-carbon');
for (const off of ['off', 'OFF', 'none', 'false', '0', 'disabled']) assert.equal(resolveHeavyModel(off), '');

// cooldown guard
let t = 1000;
const guard = new HeavyModelGuard(600_000, () => t);
assert.equal(guard.isAvailable(), true);
guard.trip();
assert.equal(guard.isAvailable(), false);
t += 599_999; assert.equal(guard.isAvailable(), false);
t += 2; assert.equal(guard.isAvailable(), true);

// which errors disable the heavy model
assert.equal(isPermanentModelError({ status: 404 }), true);
assert.equal(isPermanentModelError({ status: 403 }), true);
assert.equal(isPermanentModelError({ status: 400 }), true);
assert.equal(isPermanentModelError({ message: 'models/gemini-4-argon is not found for API version' }), true);
assert.equal(isPermanentModelError({ message: 'This model requires the paid tier' }), true);
assert.equal(isPermanentModelError({ status: 429 }), false);
assert.equal(isPermanentModelError({ status: 503 }), false);
assert.equal(isPermanentModelError({ name: 'AbortError', message: 'The operation was aborted' }), false);

assert.ok(BUILT_IN_FALLBACKS.length > 0);
console.log('aiModels: all checks passed');
