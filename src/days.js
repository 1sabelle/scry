// A day holds the mood check-ins and habits done logged on that date.
// Days are stored by ISO date ("2026-11-26"); a day with nothing logged is not stored at all.

export const MOODS = [
  { level: 1, label: 'awful' },
  { level: 2, label: 'low' },
  { level: 3, label: 'okay' },
  { level: 4, label: 'good' },
  { level: 5, label: 'great' },
];
export const MOOD_LEVELS = MOODS.map((mood) => mood.level);

export const EMOTIONS = [
  'calm', 'content', 'grateful', 'hopeful', 'proud', 'excited', 'loved', 'focused',
  'tired', 'bored', 'lonely', 'anxious', 'stressed', 'overwhelmed', 'frustrated', 'sad',
];

export const EMPTY_DAY = { checkIns: [], habitsDone: [] };

export function isEmptyDay(day) {
  return day.checkIns.length === 0 && day.habitsDone.length === 0;
}

export function moodLabel(level) {
  return MOODS.find((mood) => mood.level === level)?.label;
}

// The mean mood of the day's check-ins, or null when there are none.
export function averageMood(day) {
  const checkIns = day?.checkIns ?? [];
  if (checkIns.length === 0) return null;
  return checkIns.reduce((sum, checkIn) => sum + checkIn.mood, 0) / checkIns.length;
}

export function byTime(a, b) {
  return a.time.localeCompare(b.time);
}

// Replaces the entry with the same id, or adds it; keeps the list in time order.
export function upsertById(list, entry) {
  const others = list.filter((existing) => existing.id !== entry.id);
  return [...others, entry].sort(byTime);
}

export function newId() {
  return crypto.randomUUID();
}
