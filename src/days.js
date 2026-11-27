import { minutesOfDay } from './dates.js';

// A day holds the mood check-ins, habits done, and one optional gratitude and success logged on that date.
// Days are stored by ISO date ("2026-11-26"); a day with nothing logged is not stored at all.

export const MOODS = [
  { level: 1, label: 'awful' },
  { level: 2, label: 'low' },
  { level: 3, label: 'okay' },
  { level: 4, label: 'good' },
  { level: 5, label: 'great' },
];
export const MOOD_LEVELS = MOODS.map((mood) => mood.level);

// The emotions offered until the user edits the list. Their names double as ids, which is what
// check-ins stored before emotions became editable, so those check-ins still point at them.
export const DEFAULT_EMOTIONS = [
  'calm', 'content', 'grateful', 'hopeful', 'proud', 'excited', 'loved', 'focused',
  'tired', 'bored', 'lonely', 'anxious', 'stressed', 'overwhelmed', 'frustrated', 'sad',
].map((name) => ({ id: name, name, archived: false }));

// The activities offered until the user edits the list, picked on a check-in to say what you were doing.
export const DEFAULT_ACTIVITIES = [
  'work', 'study', 'exercise', 'outdoors', 'friends', 'family', 'partner', 'rest', 'chores', 'reading', 'gaming', 'screen time',
].map((name) => ({ id: name, name, archived: false }));

// The two optional lines a day can hold beside its check-ins, by the day's field that stores each.
export const DAILY_LINES = [
  { field: 'gratitude', label: 'Grateful for', placeholder: 'One thing you are grateful for today' },
  { field: 'success', label: 'Daily success', placeholder: 'One thing that went well today' },
];

export const EMPTY_DAY = { checkIns: [], habitsDone: [], gratitude: '', success: '' };

export function isEmptyDay(day) {
  return day.checkIns.length === 0 && day.habitsDone.length === 0 && day.gratitude.trim() === '' && day.success.trim() === '';
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

// Replaces the entry with the same id, or adds it; keeps the list in order through a day that
// starts at `dayStartTime`, so with "04:00" a 01:30 entry comes after the evening's.
export function upsertById(list, entry, dayStartTime) {
  const others = list.filter((existing) => existing.id !== entry.id);
  const minutesIntoDay = (time) => (minutesOfDay(time) - minutesOfDay(dayStartTime) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return [...others, entry].sort((a, b) => minutesIntoDay(a.time) - minutesIntoDay(b.time));
}

const MINUTES_PER_DAY = 24 * 60;

export function newId() {
  return crypto.randomUUID();
}
