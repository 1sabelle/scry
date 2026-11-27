import { PAST_DAY_TIME, isHabitDone } from './days.js';
import { formatShort, nowTime } from './dates.js';
import { habitFrequency, streakEnding } from './insights.js';

// A streak shows beside a habit from this many days in a row, when looking at today.
const MIN_STREAK_SHOWN = 2;

// Ticks off the selected day's habits, noting the time so the tick shows in the daily log. Habits are added and edited under Settings.
export default function Habits({ habits, days, today, isToday, day, onChange }) {
  const activeHabits = habits.filter((habit) => !habit.archived);

  function toggle(habitId) {
    const habitsDone = isHabitDone(day, habitId)
      ? day.habitsDone.filter((done) => done.habitId !== habitId)
      : [...day.habitsDone, { habitId, time: isToday ? nowTime() : PAST_DAY_TIME }];
    onChange(habitsDone);
  }

  return (
    <fieldset className="habits">
      <legend>Habits</legend>
      {activeHabits.length === 0 ? (
        <p className="empty">No habits yet. Add some under Settings and data.</p>
      ) : (
        <div className="habit-list">
          {activeHabits.map((habit) => {
            const streak = streakEnding(days, today, (streakDay) => isHabitDone(streakDay, habit.id));
            const isDone = isHabitDone(day, habit.id);
            return (
              <button
                key={habit.id}
                className={`habit-row ${isDone ? 'on' : ''}`}
                aria-pressed={isDone}
                onClick={() => toggle(habit.id)}
              >
                <span className="habit-check" aria-hidden="true">{isDone ? '✓' : ''}</span>
                {habit.name}
                <HabitStats frequency={habitFrequency(days, habit.id, today)} streak={isToday && streak >= MIN_STREAK_SHOWN ? streak : null} />
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

// How often the habit is done, over all time and this month.
function HabitStats({ frequency, streak }) {
  const { firstDoneDate, shareOfDaysDone, doneDaysThisMonth } = frequency;
  if (shareOfDaysDone === null) return <span className="habit-stats">not done yet</span>;
  const percentDone = Math.round(shareOfDaysDone * 100);
  return (
    <span className="habit-stats" title={`Done on ${percentDone}% of days since ${formatShort(firstDoneDate)}, and ${doneDaysThisMonth} days this month`}>
      {streak !== null && `${streak}-day streak · `}
      {percentDone}% · {doneDaysThisMonth} this month
    </span>
  );
}
