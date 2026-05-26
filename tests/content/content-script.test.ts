import { describe, expect, it } from 'vitest';
import { isContentExtractMessage } from '../../src/content/content-script';

describe('content script runtime message guard', () => {
  it('accepts only the content extract message shape', () => {
    expect(isContentExtractMessage({ type: 'content:extract' })).toBe(true);
    expect(isContentExtractMessage({ type: 'scan:start' })).toBe(false);
    expect(isContentExtractMessage(null)).toBe(false);
    expect(isContentExtractMessage(undefined)).toBe(false);
    expect(isContentExtractMessage({})).toBe(false);
  });
});
