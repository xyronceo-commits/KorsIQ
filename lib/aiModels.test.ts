import assert from 'node:assert/strict';
import {
  buildGenerateConfigForAttempt,
  buildModelChain,
  DEFAULT_HEAVY_MODEL,
  HeavyModelGuard,
  isIncompleteHeavyResponse,
  isPermanentModelError,
  lowerThinkingLevel,
  resolveHeavyModel,
  resolveHeavyThinkingLevel,
  resolveHeavyTimeoutMs,
} from './aiModels';

const chainConfig = {
  fastPrimary: 'gemini-3.5-flash',
  fallbacks: ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-flash'],
  heavyModel: 'gemini-4-argon',
};

// 1. Fast chain never contains the heavy model
{
  const fastChain = buildModelChain('fast', chainConfig, true);
  assert.ok(!fastChain.includes('gemini-4-argon'));
  assert.deepEqual(fastChain, ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite']);

  // Even if heavyModel accidentally appeared in fallbacks, fast chain excludes it
  const fastWithHeavyInFallbacks = buildModelChain(
    'fast',
    {
      fastPrimary: 'gemini-3.5-flash',
      fallbacks: ['gemini-4-argon', 'gemini-2.5-flash'],
      heavyModel: 'gemini-4-argon',
    },
    true
  );
  assert.deepEqual(fastWithHeavyInFallbacks, ['gemini-3.5-flash', 'gemini-2.5-flash']);
}

// 2. Heavy chain order and de-duplication
{
  const heavyChain = buildModelChain(
    'heavy',
    {
      fastPrimary: 'gemini-3.5-flash',
      fallbacks: ['', 'gemini-3.6-flash', 'gemini-4-argon', 'gemini-3.5-flash', '  '],
      heavyModel: 'gemini-4-argon',
    },
    true
  );
  assert.deepEqual(heavyChain, ['gemini-4-argon', 'gemini-3.5-flash', 'gemini-3.6-flash']);
}

// 3. Heavy unavailable (cooldown active)
{
  const heavyChain = buildModelChain('heavy', chainConfig, false);
  assert.deepEqual(heavyChain, ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite']);
}

// 4. Heavy disabled (empty heavyModel)
{
  const heavyChain = buildModelChain(
    'heavy',
    { ...chainConfig, heavyModel: '' },
    true
  );
  assert.deepEqual(heavyChain, ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite']);
}

// 5. resolveHeavyModel defaults and each "off" value (any case)
{
  assert.equal(resolveHeavyModel({}), DEFAULT_HEAVY_MODEL);
  assert.equal(resolveHeavyModel({ GEMINI_HEAVY_MODEL: '' }), DEFAULT_HEAVY_MODEL);
  assert.equal(resolveHeavyModel({ GEMINI_HEAVY_MODEL: 'gemini-4-hydrogen' }), 'gemini-4-hydrogen');

  for (const offValue of ['off', 'OFF', 'none', 'None', 'false', 'FALSE', '0', 'disabled', 'DISABLED', ' Off ']) {
    assert.equal(
      resolveHeavyModel({ GEMINI_HEAVY_MODEL: offValue }),
      '',
      `Expected "${offValue}" to disable heavy model`
    );
  }
}

// 6. Cooldown expiry with an injected clock
{
  let now = 1_000_000;
  const guard = new HeavyModelGuard(10 * 60 * 1000, () => now);
  assert.equal(guard.isAvailable(), true);

  guard.trip();
  assert.equal(guard.isAvailable(), false);

  now += 9 * 60 * 1000 + 59_999;
  assert.equal(guard.isAvailable(), false);

  now += 1;
  assert.equal(guard.isAvailable(), true);
}

// 7. Permanent vs temporary errors
{
  assert.equal(isPermanentModelError({ status: 404, message: 'Model not found' }), true);
  assert.equal(isPermanentModelError({ status: 403, message: 'Forbidden' }), true);
  assert.equal(isPermanentModelError({ status: 400, message: 'Invalid argument' }), true);
  assert.equal(isPermanentModelError({ status: 401, message: 'Unauthorized' }), true);
  assert.equal(isPermanentModelError(new Error('This model requires a paid tier account')), true);
  assert.equal(isPermanentModelError(new Error('API key not valid. Please pass a valid API key.')), true);
  assert.equal(isPermanentModelError(new Error('Billing must be enabled')), true);

  assert.equal(isPermanentModelError({ status: 429, message: 'Too Many Requests' }), false);
  assert.equal(isPermanentModelError({ status: 503, message: 'Service Unavailable' }), false);
  assert.equal(isPermanentModelError({ status: 500, message: 'Internal Server Error' }), false);
  const abortErr = new Error('The operation was aborted');
  abortErr.name = 'AbortError';
  assert.equal(isPermanentModelError(abortErr), false);
  assert.equal(isPermanentModelError(new Error('Request timeout')), false);
}

// 8. Addendum: Heavy attempt never receives sampling params; thinking level passed ONLY on heavy attempts
{
  const controller = new AbortController();
  const baseConfig = {
    systemInstruction: 'Be helpful',
    temperature: 0.35,
    topP: 0.9,
    topK: 40,
    thinkingBudget: 1024,
    responseMimeType: 'application/json',
  };

  const heavyCfg = buildGenerateConfigForAttempt(baseConfig, {
    isHeavyAttempt: true,
    thinkingLevel: 'medium',
    abortSignal: controller.signal,
  });
  assert.equal('temperature' in heavyCfg, false);
  assert.equal('topP' in heavyCfg, false);
  assert.equal('topK' in heavyCfg, false);
  assert.equal('thinkingBudget' in heavyCfg, false);
  assert.deepEqual(heavyCfg.thinkingConfig, { thinkingLevel: 'MEDIUM' });
  assert.equal(heavyCfg.abortSignal, controller.signal);
  assert.equal(heavyCfg.systemInstruction, 'Be helpful');

  const fastCfg = buildGenerateConfigForAttempt(baseConfig, {
    isHeavyAttempt: false,
    thinkingLevel: 'medium',
  });
  assert.equal(fastCfg.temperature, 0.35);
  assert.equal(fastCfg.topP, 0.9);
  assert.equal(fastCfg.topK, 40);
  assert.equal('thinkingConfig' in fastCfg, false);

  // maxOutputTokens on heavy attempt is >= 32768 if set, or unset if undefined
  const heavyWithSmallMax = buildGenerateConfigForAttempt(
    { maxOutputTokens: 4096 },
    { isHeavyAttempt: true, thinkingLevel: 'low' }
  );
  assert.equal(heavyWithSmallMax.maxOutputTokens, 32768);

  const heavyWithoutMax = buildGenerateConfigForAttempt(
    {},
    { isHeavyAttempt: true, thinkingLevel: 'low' }
  );
  assert.equal(heavyWithoutMax.maxOutputTokens, undefined);
}

// 9. Timeout and thinking level helpers
{
  assert.equal(resolveHeavyTimeoutMs({}), 35_000);
  assert.equal(resolveHeavyTimeoutMs({ GEMINI_HEAVY_TIMEOUT_MS: '1000' }), 5_000);
  assert.equal(resolveHeavyTimeoutMs({ GEMINI_HEAVY_TIMEOUT_MS: '25000' }), 25_000);

  assert.equal(resolveHeavyThinkingLevel({}), 'low');
  assert.equal(resolveHeavyThinkingLevel({ GEMINI_HEAVY_THINKING_LEVEL: 'medium' }), 'medium');
  assert.equal(resolveHeavyThinkingLevel({ GEMINI_HEAVY_THINKING_LEVEL: 'HIGH' }), 'high');
  assert.equal(resolveHeavyThinkingLevel({ GEMINI_HEAVY_THINKING_LEVEL: 'medium' }, 'low'), 'low');

  assert.equal(lowerThinkingLevel('high'), 'medium');
  assert.equal(lowerThinkingLevel('medium'), 'low');
  assert.equal(lowerThinkingLevel('low'), null);

  assert.equal(isIncompleteHeavyResponse('', 'STOP'), true);
  assert.equal(isIncompleteHeavyResponse('Short', 'MAX_TOKENS'), true);
  assert.equal(
    isIncompleteHeavyResponse('This is a complete academic paragraph with sufficient content.', 'STOP'),
    false
  );
}

console.log('All aiModels tests passed!');
