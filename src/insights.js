import { addDays, daysBetween } from './dates.js';
import { EMPTY_DAY, averageMood, isHabitDone } from './days.js';

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

// The median mood across all check-ins on the given dates, or null. The median keeps one
// awful check-in from dragging a good stretch into the middle.
export function medianMoodOn(days, dates) {
  const moods = dates.flatMap((date) => (days[date]?.checkIns ?? []).map((checkIn) => checkIn.mood)).sort((a, b) => a - b);
  if (moods.length === 0) return null;
  const middle = Math.floor(moods.length / 2);
  return moods.length % 2 === 1 ? moods[middle] : (moods[middle - 1] + moods[middle]) / 2;
}

// A median strictly between low and good is neutral: shown grey, so the good and bad stretches stand out.
export function isNeutralMood(medianMood) {
  return medianMood > 2 && medianMood < 4;
}

// How many days in a row, ending today, `isKept(day)` holds for. A today that isn't kept yet
// doesn't break the streak: it counts back from yesterday until the day is over.
export function streakEnding(days, today, isKept) {
  let date = isKept(days[today] ?? EMPTY_DAY) ? today : addDays(today, -1);
  let streak = 0;
  while (isKept(days[date] ?? EMPTY_DAY)) {
    streak++;
    date = addDays(date, -1);
  }
  return streak;
}

// For each active habit: the average mood on days it was done versus days it was not.
// Only days with a check-in from `since` on count, starting from the first day the habit
// was done, so days before you started a habit don't count against it.
export function compareMoodByHabit(days, habits, since) {
  const datesWithMood = Object.keys(days).filter((date) => date >= since && averageMood(days[date]) !== null).sort();
  return habits
    .filter((habit) => !habit.archived)
    .map((habit) => {
      const firstDoneOn = datesWithMood.find((date) => isHabitDone(days[date], habit.id));
      const comparedDates = firstDoneOn ? datesWithMood.filter((date) => date >= firstDoneOn) : [];
      const doneMoods = [];
      const skippedMoods = [];
      for (const date of comparedDates) {
        const mood = averageMood(days[date]);
        if (isHabitDone(days[date], habit.id)) doneMoods.push(mood);
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

// For each activity picked in check-ins over the `dayCount` days ending `today`: how often,
// and the average mood of those check-ins. Most picked first.
export function moodByActivity(days, activities, today, dayCount) {
  const moodsByActivityId = new Map();
  for (let i = 0; i < dayCount; i++) {
    for (const checkIn of days[addDays(today, -i)]?.checkIns ?? []) {
      for (const activityId of checkIn.activities) moodsByActivityId.set(activityId, [...(moodsByActivityId.get(activityId) ?? []), checkIn.mood]);
    }
  }
  return activities
    .filter((activity) => moodsByActivityId.has(activity.id))
    .map((activity) => ({ activity, count: moodsByActivityId.get(activity.id).length, averageMood: mean(moodsByActivityId.get(activity.id)) }))
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
