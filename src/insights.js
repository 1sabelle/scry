import { addDays, weekdayMondayFirst } from './dates.js';
import { averageMood } from './days.js';

// Fewer days than this on either side and a mood comparison says more about chance than the habit.
export const MIN_DAYS_TO_COMPARE = 3;

// For each active habit: the average mood on days it was done versus days it was not.
// Only days with a check-in count, starting from the first day the habit was done,
// so days before you started a habit don't count against it.
export function compareMoodByHabit(days, habits) {
  const datesWithMood = Object.keys(days).filter((date) => averageMood(days[date]) !== null).sort();
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

// The dates of the last `weekCount` whole weeks (Monday to Sunday), ending with the week holding `today`.
export function recentWeekDates(today, weekCount) {
  const lastSunday = addDays(today, 6 - weekdayMondayFirst(today));
  const first = addDays(lastSunday, -(weekCount * 7 - 1));
  return Array.from({ length: weekCount * 7 }, (_, i) => addDays(first, i));
}

// How often each emotion was picked in check-ins over the `dayCount` days ending `today`, most frequent first.
export function countEmotions(days, today, dayCount) {
  const counts = new Map();
  for (let i = 0; i < dayCount; i++) {
    for (const checkIn of days[addDays(today, -i)]?.checkIns ?? []) {
      for (const emotion of checkIn.emotions) counts.set(emotion, (counts.get(emotion) ?? 0) + 1);
    }
  }
  return [...counts].map(([emotion, count]) => ({ emotion, count })).sort((a, b) => b.count - a.count);
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
