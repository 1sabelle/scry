// Ticks off the selected day's habits. Habits are added and edited under Settings.
export default function Habits({ habits, habitsDone, onChange }) {
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
          {activeHabits.map((habit) => (
            <button
              key={habit.id}
              className={`chip habit-chip ${habitsDone.includes(habit.id) ? 'on' : ''}`}
              aria-pressed={habitsDone.includes(habit.id)}
              onClick={() => toggle(habit.id)}
            >
              <span className="habit-check" aria-hidden="true">{habitsDone.includes(habit.id) ? '✓' : ''}</span>
              {habit.name}
            </button>
          ))}
        </div>
      )}
    </fieldset>
  );
}
