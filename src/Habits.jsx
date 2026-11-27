import { streakEnding } from './insights.js';

// A streak shows on a habit's chip from this many days in a row, when looking at today.
const MIN_STREAK_SHOWN = 2;

// Ticks off the selected day's habits. Habits are added and edited under Settings.
export default function Habits({ habits, days, today, isToday, habitsDone, onChange }) {
  const activeHabits = habits.filter((habit) => !habit.archived);

  function toggle(habitId) {
    onChange(habitsDone.includes(habitId) ? habitsDone.filter((id) => id !== habitId) : [...habitsDone, habitId]);
  }

  return (
    <fieldset className="habits">
      <legend>Habits</legend>
      {activeHabits.length === 0 ? (
        <p className="empty">No habits yet. Add some under Settings and data.</p>
      ) : (
        <div className="chips">
          {activeHabits.map((habit) => {
            const streak = streakEnding(days, today, (day) => day.habitsDone.includes(habit.id));
            return (
              <button
                key={habit.id}
                className={`chip habit-chip ${habitsDone.includes(habit.id) ? 'on' : ''}`}
                aria-pressed={habitsDone.includes(habit.id)}
                onClick={() => toggle(habit.id)}
              >
                <span className="habit-check" aria-hidden="true">{habitsDone.includes(habit.id) ? '✓' : ''}</span>
                {habit.name}
                {isToday && streak >= MIN_STREAK_SHOWN && <span className="count">{streak} days</span>}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
