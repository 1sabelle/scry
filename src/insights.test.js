import { describe, expect, it } from 'vitest';
import { averageMoodOver, compareMoodByHabit, countEmotions, recentWeekDates } from './insights.js';

const walk = { id: 'walk', name: 'Walk', reflectionPrompt: '', archived: false };

function day(mood, habitsDone = [], emotions = []) {
  return { checkIns: [{ id: `c${mood}`, time: '12:00', mood, emotions, note: '' }], habitsDone, journal: [] };
}

describe('compareMoodByHabit', () => {
  it('compares mood on done and skipped days from the first day the habit was done', () => {
    const days = {
      '2026-11-01': day(1), // before the habit started: ignored
      '2026-11-02': day(5, ['walk']),
      '2026-11-03': day(4, ['walk']),
      '2026-11-04': day(2),
      '2026-11-05': day(3, ['walk']),
      '2026-11-06': day(2),
      '2026-11-07': day(2),
    };
    const [comparison] = compareMoodByHabit(days, [walk]);
    expect(comparison).toMatchObject({ doneCount: 3, skippedCount: 3, moodWhenDone: 4, moodWhenSkipped: 2, hasEnoughDays: true });
  });

  it('says when there are too few days to compare', () => {
    const [comparison] = compareMoodByHabit({ '2026-11-02': day(5, ['walk']) }, [walk]);
    expect(comparison.hasEnoughDays).toBe(false);
  });

  it('leaves out archived habits', () => {
    expect(compareMoodByHabit({}, [{ ...walk, archived: true }])).toEqual([]);
  });
});

describe('recentWeekDates', () => {
  it('covers whole Monday-to-Sunday weeks ending with this week', () => {
    const dates = recentWeekDates('2026-11-26', 2); // a Thursday
    expect(dates[0]).toBe('2026-11-16');
    expect(dates.at(-1)).toBe('2026-11-29');
    expect(dates).toHaveLength(14);
  });
});

describe('countEmotions and averageMoodOver', () => {
  const days = {
    '2026-11-26': day(4, [], ['calm', 'tired']),
    '2026-11-25': day(2, [], ['tired']),
    '2026-11-01': day(1, [], ['sad']),
  };

  it('counts emotions within the window, most frequent first', () => {
    expect(countEmotions(days, '2026-11-26', 7)).toEqual([
      { emotion: 'tired', count: 2 },
      { emotion: 'calm', count: 1 },
    ]);
  });

  it('averages mood within the window', () => {
    expect(averageMoodOver(days, '2026-11-26', 7)).toBe(3);
    expect(averageMoodOver({}, '2026-11-26', 7)).toBeNull();
  });
});
