import { DAILY_LINES } from './days.js';

// One optional line each for the selected day: something to be grateful for and a success. Saved as you type.
export default function DailyLines({ day, onChange }) {
  return (
    <div className="daily-lines">
      {DAILY_LINES.map((line) => (
        <label key={line.field} className="daily-line">
          <span className="daily-line-label">{line.label}</span>
          <input
            value={day[line.field]}
            placeholder={line.placeholder}
            onChange={(e) => onChange({ [line.field]: e.target.value })}
            onBlur={() => day[line.field] !== day[line.field].trim() && onChange({ [line.field]: day[line.field].trim() })}
          />
        </label>
      ))}
    </div>
  );
}
