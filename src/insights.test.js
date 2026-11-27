import { describe, expect, it } from 'vitest';
import {
  TIMEFRAMES,
  averageMoodOver,
  compareMoodByHabit,
  countEmotions,
  isNeutralMood,
  medianMoodOn,
  periodsEnding,
  streakEnding,
  timeframeDayCount,
} from './insights.js';

const walk = { id: 'walk', name: 'Walk', archived: false };

function day(mood, habitsDone = [], emotions = []) {
  return { checkIns: [{ id: `c${mood}`, time: '12:00', mood, emotions, note: '' }], habitsDone, gratitude: '', success: '' };
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
    const [comparison] = compareMoodByHabit(days, [walk], '2026-01-01');
    expect(comparison).toMatchObject({ doneCount: 3, skippedCount: 3, moodWhenDone: 4, moodWhenSkipped: 2, hasEnoughDays: true });
  });

  it('ignores days before the timeframe starts', () => {
    const days = { '2026-11-01': day(5, ['walk']), '2026-11-02': day(1) };
    const [comparison] = compareMoodByHabit(days, [walk], '2026-11-02');
    expect(comparison).toMatchObject({ doneCount: 0, skippedCount: 0 });
  });

  it('says when there are too few days to compare', () => {
    const [comparison] = compareMoodByHabit({ '2026-11-02': day(5, ['walk']) }, [walk], '2026-01-01');
    expect(comparison.hasEnoughDays).toBe(false);
  });

  it('leaves out archived habits', () => {
    expect(compareMoodByHabit({}, [{ ...walk, archived: true }], '2026-01-01')).toEqual([]);
  });
});

describe('periodsEnding', () => {
  it('uses single days up to three months', () => {
    const periods = periodsEnding('2026-11-26', 7);
    expect(periods).toHaveLength(7);
    expect(periods[0]).toEqual(['2026-11-20']);
    expect(periods.at(-1)).toEqual(['2026-11-26']);
  });

  it('uses weeks ending today up to a year, reaching back to fill the oldest week', () => {
    const periods = periodsEnding('2026-11-26', 365);
    expect(periods).toHaveLength(53);
    expect(periods.every((dates) => dates.length === 7)).toBe(true);
    expect(periods.at(-1).at(-1)).toBe('2026-11-26');
  });

  it('uses 30-day stretches beyond a year', () => {
    const periods = periodsEnding('2026-11-26', 400);
    expect(periods).toHaveLength(14);
    expect(periods[0]).toHaveLength(30);
  });
});

describe('timeframeDayCount', () => {
  const allTime = TIMEFRAMES.find((timeframe) => timeframe.id === 'all-time');

  it('uses the fixed length of a timeframe', () => {
    expect(timeframeDayCount(TIMEFRAMES[0], {}, '2026-11-26')).toBe(7);
  });

  it('reaches back to the first logged day for all time', () => {
    expect(timeframeDayCount(allTime, { '2026-11-20': day(3), '2026-11-24': day(3) }, '2026-11-26')).toBe(7);
  });
});

describe('countEmotions and averageMoodOver', () => {
  const days = {
    '2026-11-26': day(4, [], ['calm', 'tired']),
    '2026-11-25': day(2, [], ['tired']),
    '2026-11-01': day(1, [], ['sad']),
  };

  it('counts emotions within the window, most frequent first', () => {
    const calm = { id: 'calm', name: 'calm', archived: false };
    const tired = { id: 'tired', name: 'worn out', archived: true };
    expect(countEmotions(days, [calm, tired], '2026-11-26', 7)).toEqual([
      { emotion: tired, count: 2 },
      { emotion: calm, count: 1 },
    ]);
  });

  it('takes the median mood across all check-ins on the given dates', () => {
    expect(medianMoodOn(days, ['2026-11-25', '2026-11-26'])).toBe(3);
    expect(medianMoodOn({ ...days, '2026-11-24': day(5) }, ['2026-11-24', '2026-11-25', '2026-11-26'])).toBe(4);
    expect(medianMoodOn(days, ['2026-11-24'])).toBeNull();
  });

  it('counts a median strictly between low and good as neutral', () => {
    expect([2, 2.5, 3, 3.5, 4].map(isNeutralMood)).toEqual([false, true, true, true, false]);
  });

  it('averages mood within the window', () => {
    expect(averageMoodOver(days, '2026-11-26', 7)).toBe(3);
    expect(averageMoodOver({}, '2026-11-26', 7)).toBeNull();
  });
});

describe('streakEnding', () => {
  const checkedIn = (logged) => logged.checkIns.length > 0;
  const days = { '2026-11-23': day(3), '2026-11-24': day(3), '2026-11-25': day(3) };

  it('counts back from yesterday while today is not done yet', () => {
    expect(streakEnding(days, '2026-11-26', checkedIn)).toBe(3);
  });

  it('includes today once it is done', () => {
    expect(streakEnding({ ...days, '2026-11-26': day(3) }, '2026-11-26', checkedIn)).toBe(4);
  });

  it('is zero after a missed yesterday', () => {
    expect(streakEnding(days, '2026-11-27', checkedIn)).toBe(0);
  });
});
