import { averageMood, moodLabel } from './days.js';
import { averageMoodOver, streakEnding } from './insights.js';

// Streak lengths worth looking forward to; within a few days of one, the summary says so.
const STREAK_MILESTONES = [3, 7, 14, 30, 50, 75, 100, 150, 200, 300, 365];
const DAYS_TO_MILESTONE_SHOWN = 3;

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function describeMood(mood) {
  return mood === null ? '-' : moodLabel(Math.round(mood));
}

// A nudge under the streak: the next milestone when it is close, or what keeps the streak going.
function describeStreak(streak, hasCheckedInToday) {
  if (streak === 0) return 'Check in to start one';
  const nextMilestone = STREAK_MILESTONES.find((milestone) => milestone > streak);
  const daysToMilestone = nextMilestone - streak;
  if (daysToMilestone <= DAYS_TO_MILESTONE_SHOWN) return `${plural(daysToMilestone, 'more day')} to ${nextMilestone}`;
  return hasCheckedInToday ? 'Checked in today' : 'Check in today to keep it';
}

export default function Summary({ data, today }) {
  const todayLog = data.days[today];
  const todayMood = averageMood(todayLog);
  const weekMood = averageMoodOver(data.days, today, 7);
  const activeHabits = data.habits.filter((habit) => !habit.archived);
  const habitsDoneToday = activeHabits.filter((habit) => todayLog?.habitsDone.includes(habit.id)).length;
  const checkInCount = todayLog?.checkIns.length ?? 0;
  const checkInStreak = streakEnding(data.days, today, (day) => day.checkIns.length > 0);

  return (
    <section className="summary">
      <div className={`stat ${todayMood !== null ? `mood-${Math.round(todayMood)}` : ''}`}>
        <span className="label">Today</span>
        <span className="value">{describeMood(todayMood)}</span>
        <span className="detail">{checkInCount === 0 ? 'No check-ins yet' : plural(checkInCount, 'check-in')}</span>
      </div>
      <div className={`stat ${weekMood !== null ? `mood-${Math.round(weekMood)}` : ''}`}>
        <span className="label">Last 7 days</span>
        <span className="value">{describeMood(weekMood)}</span>
        <span className="detail">{weekMood === null ? 'Nothing logged' : `Average ${weekMood.toFixed(1)} of 5`}</span>
      </div>
      <div className="stat streak">
        <span className="label">Check-in streak</span>
        <span className="value">{checkInStreak === 0 ? '-' : plural(checkInStreak, 'day')}</span>
        <span className="detail">{describeStreak(checkInStreak, checkInCount > 0)}</span>
      </div>
      <div className="stat habits">
        <span className="label">Habits today</span>
        <span className="value">{activeHabits.length === 0 ? '-' : `${habitsDoneToday} of ${activeHabits.length}`}</span>
        <span className="detail">{activeHabits.length === 0 ? 'Add habits under Settings' : 'done'}</span>
      </div>
    </section>
  );
}
