import { describe, expect, it } from 'vitest';
import { getCollectionButtonState } from '../utils/containerCollectionState';

describe('getCollectionButtonState', () => {
  const now = new Date('2026-08-05T12:00:00Z');

  it('24 saatlik döngüde yeşilden kırmızıya ilerler', () => {
    expect(getCollectionButtonState('2026-08-05T11:00:00Z', now).label).toBe('Yeşil');
    expect(getCollectionButtonState('2026-08-05T04:00:00Z', now).label).toBe('Sarı');
    expect(getCollectionButtonState('2026-08-04T22:00:00Z', now).label).toBe('Turuncu');
    expect(getCollectionButtonState('2026-08-04T17:00:00Z', now).label).toBe('Kırmızı');
  });

  it('hiç toplanmamış konteyneri kırmızı gösterir', () => {
    expect(getCollectionButtonState(null, now).label).toBe('Kırmızı');
  });
});
