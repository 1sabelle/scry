import { addDays, daysBetween } from './dates.js';
import { averageMood } from './days.js';

// Fewer days than this on either side and a mood comparison says more about chance than the habit.
export const MIN_DAYS_TO_COMPARE = 3;

// The timeframes patterns can be viewed over, ending today. All time has no fixed length.
export const TIMEFRAMES = [
  { id: 'week', label: 'Past week', dayCount: 7 },
  { id: 'month', label: 'Past month', dayCount: 30 },
  { id: '3-months', label: 'Past 3 months', dayCount: 91 },
  { id: '6-months', label: 'Past 6 months', dayCount: 182 },
  { id: 'year', label: 'Past year', dayCount: 365 },
  { id: 'all-time', label: 'All time', dayCount: null },
];

// How many days the timeframe covers, ending `today`. All time reaches back to the first logged day.
export function timeframeDayCount(timeframe, days, today) {
  if (timeframe.dayCount !== null) return timeframe.dayCount;
  const firstLoggedDate = Object.keys(days).sort()[0];
  return firstLoggedDate ? Math.max(daysBetween(firstLoggedDate, today) + 1, 1) : 1;
}

// The `dayCount` days ending `today`, split into periods few enough to show side by side:
// single days up to three months, weeks up to a year, 30-day stretches beyond that.
// Each period is a list of dates, oldest first; the oldest period reaches back past the
// timeframe's start rather than being cut short.
export function periodsEnding(today, dayCount) {
  const periodLength = dayCount <= 91 ? 1 : dayCount <= 366 ? 7 : 30;
  const periodCount = Math.ceil(dayCount / periodLength);
  const firstDate = addDays(today, -(periodCount * periodLength - 1));
  return Array.from({ length: periodCount }, (_, period) =>
    Array.from({ length: periodLength }, (_, i) => addDays(firstDate, period * periodLength + i)),
  );
}

// The average mood across all check-ins on the given dates, or null.
export function averageMoodOn(days, dates) {
  return mean(dates.flatMap((date) => (days[date]?.checkIns ?? []).map((checkIn) => checkIn.mood)));
}

// For each active habit: the average mood on days it was done versus days it was not.
// Only days with a check-in from `since` on count, starting from the first day the habit
// was done, so days before you started a habit don't count against it.
export function compareMoodByHabit(days, habits, since) {
  const datesWithMood = Object.keys(days).filter((date) => date >= since && averageMood(days[date]) !== null).sort();
  return habits
    .filter((habit) => !habit.archived)
    .map((habit) => {
      const firstDoneOn = datesWithMood.find((date) => days[date].habitsDone.includes(habit.id));
      const comparedDates = firstDoneOn ? datesWithMood.filter((date) => date >= firstDoneOn) : [];
      const doneMoods = [];
      const skippedMoods = [];
      for (const date of comparedDates) {
        const mood = averageMood(days[date]);
        if (days[date].habitsDone.includes(habit.id)) doneMoods.push(mood);
        else skippedMoods.push(mood);
      }
      const hasEnoughDays = doneMoods.length >= MIN_DAYS_TO_COMPARE && skippedMoods.length >= MIN_DAYS_TO_COMPARE;
      return {
        habit,
        doneCount: doneMoods.length,
        skippedCount: skippedMoods.length,
        moodWhenDone: mean(doneMoods),
        moodWhenSkipped: mean(skippedMoods),
        hasEnoughDays,
      };
    });
}

// How often each emotion was picked in check-ins over the `dayCount` days ending `today`, most frequent first.
export function countEmotions(days, emotions, today, dayCount) {
  const counts = new Map();
  for (let i = 0; i < dayCount; i++) {
    for (const checkIn of days[addDays(today, -i)]?.checkIns ?? []) {
      for (const emotionId of checkIn.emotions) counts.set(emotionId, (counts.get(emotionId) ?? 0) + 1);
    }
  }
  return emotions
    .filter((emotion) => counts.has(emotion.id))
    .map((emotion) => ({ emotion, count: counts.get(emotion.id) }))
    .sort((a, b) => b.count - a.count);
}

// The average mood across all check-ins over the `dayCount` days ending `today`, or null.
export function averageMoodOver(days, today, dayCount) {
  const moods = [];
  for (let i = 0; i < dayCount; i++) for (const checkIn of days[addDays(today, -i)]?.checkIns ?? []) moods.push(checkIn.mood);
  return mean(moods);
}

function mean(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}
