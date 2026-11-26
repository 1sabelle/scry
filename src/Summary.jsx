import { averageMood, moodLabel } from './days.js';
import { averageMoodOver } from './insights.js';

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function describeMood(mood) {
  return mood === null ? '-' : moodLabel(Math.round(mood));
}

export default function Summary({ data, today }) {
  const todayLog = data.days[today];
  const todayMood = averageMood(todayLog);
  const weekMood = averageMoodOver(data.days, today, 7);
  const activeHabits = data.habits.filter((habit) => !habit.archived);
  const habitsDoneToday = activeHabits.filter((habit) => todayLog?.habitsDone.includes(habit.id)).length;
  const checkInCount = todayLog?.checkIns.length ?? 0;

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
      <div className="stat habits">
        <span className="label">Habits today</span>
        <span className="value">{activeHabits.length === 0 ? '-' : `${habitsDoneToday} of ${activeHabits.length}`}</span>
        <span className="detail">{activeHabits.length === 0 ? 'Add habits under Settings' : 'done'}</span>
      </div>
    </section>
  );
}
