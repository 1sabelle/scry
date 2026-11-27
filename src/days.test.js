import { describe, expect, it } from 'vitest';
import { upsertById } from './days.js';

describe('upsertById', () => {
  it('orders entries through a day that starts after midnight', () => {
    const late = { id: 'late', time: '01:30' };
    const evening = { id: 'evening', time: '22:00' };
    const morning = { id: 'morning', time: '08:00' };
    expect(upsertById([late, evening], morning, '04:00').map((entry) => entry.id)).toEqual(['morning', 'evening', 'late']);
    expect(upsertById([late, evening], morning, '00:00').map((entry) => entry.id)).toEqual(['late', 'morning', 'evening']);
  });
});
