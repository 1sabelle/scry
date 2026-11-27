import { describe, expect, it } from 'vitest';
import { countPicks, findOptionByName, normaliseOptionName, upsertById } from './days.js';

describe('upsertById', () => {
  it('orders entries through a day that starts after midnight', () => {
    const late = { id: 'late', time: '01:30' };
    const evening = { id: 'evening', time: '22:00' };
    const morning = { id: 'morning', time: '08:00' };
    expect(upsertById([late, evening], morning, '04:00').map((entry) => entry.id)).toEqual(['morning', 'evening', 'late']);
    expect(upsertById([late, evening], morning, '00:00').map((entry) => entry.id)).toEqual(['late', 'morning', 'evening']);
  });
});

describe('normaliseOptionName', () => {
  it('lowercases and tidies the spacing', () => {
    expect(normaliseOptionName('  Screen   Time ')).toBe('screen time');
  });
});

describe('findOptionByName', () => {
  const options = [{ id: 'a', name: 'happy' }, { id: 'b', name: 'Screen time' }];

  it('matches whatever the case or spacing', () => {
    expect(findOptionByName(options, 'Happy')?.id).toBe('a');
    expect(findOptionByName(options, ' screen  TIME')?.id).toBe('b');
  });

  it('returns null for a new name', () => {
    expect(findOptionByName(options, 'hap')).toBeNull();
  });
});

describe('countPicks', () => {
  it('counts each check-in that picked an option', () => {
    const checkIn = (emotions) => ({ emotions, activities: [] });
    const days = { '2026-11-01': { checkIns: [checkIn(['a', 'b']), checkIn(['a'])] }, '2026-11-02': { checkIns: [checkIn(['a'])] } };
    expect(countPicks(days, 'emotions')).toEqual(new Map([['a', 3], ['b', 1]]));
  });
});
