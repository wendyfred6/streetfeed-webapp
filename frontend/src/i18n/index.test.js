import { describe, it, expect } from 'vitest';
import { t } from './index.js';

describe('t', () => {
  it('interpolates {var} placeholders', () => {
    // "welcome" isn't in the dictionary, so falls back to the key itself —
    // this still exercises the interpolation regex without depending on
    // specific dictionary content that may change.
    expect(t('hello {name}', { name: 'Wendy' })).toBe('hello Wendy');
  });

  it('falls back to the key when no dictionary entry exists', () => {
    expect(t('this_key_does_not_exist')).toBe('this_key_does_not_exist');
  });
});
