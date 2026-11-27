import { useState } from 'react';
import { newId } from './days.js';
import { todayIso } from './dates.js';
import { parseData } from './storage.js';

// A habit's name may be cleared while typing; one left empty gets this name so it stays valid.
// Emotions and activities get "Unnamed emotion" and "Unnamed activity" the same way.
const UNNAMED_HABIT = 'Unnamed habit';

export default function Settings({ data, onReplace }) {
  return (
    <details className="settings">
      <summary>Settings and data</summary>
      <HabitSettings data={data} onReplace={onReplace} />
      <OptionSettings data={data} onReplace={onReplace} title="Emotions" optionsField="emotions" singular="emotion" />
      <OptionSettings data={data} onReplace={onReplace} title="Activities" optionsField="activities" singular="activity" />
      <DayStartSettings data={data} onReplace={onReplace} />
      <DataSettings data={data} onReplace={onReplace} />
    </details>
  );
}

function HabitSettings({ data, onReplace }) {
  const [newName, setNewName] = useState('');
  const updateHabit = (id, change) =>
    onReplace({ ...data, habits: data.habits.map((habit) => (habit.id === id ? { ...habit, ...change } : habit)) });

  function addHabit() {
    const name = newName.trim();
    if (!name) return;
    onReplace({ ...data, habits: [...data.habits, { id: newId(), name, archived: false }] });
    setNewName('');
  }

  // Deleting a habit also removes it from every day it was ticked off. Archiving keeps that history.
  function deleteHabit(habit) {
    const doneDayCount = Object.values(data.days).filter((day) => day.habitsDone.includes(habit.id)).length;
    if (!confirm(`Delete "${habit.name}" and its ${doneDayCount} logged days? Archive it instead to keep the history.`)) return;
    const days = {};
    for (const [date, day] of Object.entries(data.days)) days[date] = { ...day, habitsDone: day.habitsDone.filter((id) => id !== habit.id) };
    onReplace({ ...data, habits: data.habits.filter((h) => h.id !== habit.id), days });
  }

  return (
    <div className="settings-group">
      <h3>Habits</h3>
      {data.habits.map((habit) => (
        <div key={habit.id} className={`habit-setting ${habit.archived ? 'is-archived' : ''}`}>
          <input
            value={habit.name}
            onChange={(e) => updateHabit(habit.id, { name: e.target.value })}
            onBlur={() => !habit.name.trim() && updateHabit(habit.id, { name: UNNAMED_HABIT })}
            aria-label="Habit name"
          />
          <button onClick={() => updateHabit(habit.id, { archived: !habit.archived })}>{habit.archived ? 'Restore' : 'Archive'}</button>
          <button onClick={() => deleteHabit(habit)}>Delete</button>
        </div>
      ))}
      <form className="add-row" onSubmit={(e) => { e.preventDefault(); addHabit(); }}>
        <input placeholder="New habit" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="submit" disabled={!newName.trim()}>Add habit</button>
      </form>
    </div>
  );
}

// The emotions or activities a check-in can pick, kept in `data[optionsField]` and in each check-in's field of the same name.
function OptionSettings({ data, onReplace, title, optionsField, singular }) {
  const [newName, setNewName] = useState('');
  const options = data[optionsField];
  const updateOption = (id, change) =>
    onReplace({ ...data, [optionsField]: options.map((option) => (option.id === id ? { ...option, ...change } : option)) });

  function addOption() {
    const name = newName.trim();
    if (!name) return;
    onReplace({ ...data, [optionsField]: [...options, { id: newId(), name, archived: false }] });
    setNewName('');
  }

  // Deleting an option also removes it from every check-in it was picked in. Archiving keeps that history.
  function deleteOption(option) {
    const pickedCount = Object.values(data.days)
      .flatMap((day) => day.checkIns)
      .filter((checkIn) => checkIn[optionsField].includes(option.id)).length;
    if (!confirm(`Delete "${option.name}" and remove it from ${pickedCount} check-ins? Archive it instead to keep the history.`)) return;
    const days = {};
    for (const [date, day] of Object.entries(data.days))
      days[date] = {
        ...day,
        checkIns: day.checkIns.map((checkIn) => ({ ...checkIn, [optionsField]: checkIn[optionsField].filter((id) => id !== option.id) })),
      };
    onReplace({ ...data, [optionsField]: options.filter((o) => o.id !== option.id), days });
  }

  return (
    <div className="settings-group">
      <h3>{title}</h3>
      <p className="hint">Renaming {article(singular)} {singular} renames it in past check-ins too.</p>
      {options.map((option) => (
        <div key={option.id} className={`option-setting ${option.archived ? 'is-archived' : ''}`}>
          <input
            value={option.name}
            onChange={(e) => updateOption(option.id, { name: e.target.value })}
            onBlur={() => !option.name.trim() && updateOption(option.id, { name: `Unnamed ${singular}` })}
            aria-label={`Name of the ${singular}`}
          />
          <button onClick={() => updateOption(option.id, { archived: !option.archived })}>{option.archived ? 'Restore' : 'Archive'}</button>
          <button onClick={() => deleteOption(option)}>Delete</button>
        </div>
      ))}
      <form className="add-row" onSubmit={(e) => { e.preventDefault(); addOption(); }}>
        <input placeholder={`New ${singular}`} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="submit" disabled={!newName.trim()}>Add {singular}</button>
      </form>
    </div>
  );
}

function article(word) {
  return /^[aeiou]/.test(word) ? 'an' : 'a';
}

function DayStartSettings({ data, onReplace }) {
  return (
    <div className="settings-group">
      <h3>Start of day</h3>
      <p className="hint">Check-ins before this time count towards the day before, so a late night stays part of the evening it belongs to.</p>
      <input
        type="time"
        value={data.dayStartTime}
        onChange={(e) => e.target.value && onReplace({ ...data, dayStartTime: e.target.value })}
        aria-label="Start of day"
      />
    </div>
  );
}

function DataSettings({ data, onReplace }) {
  const [importMessages, setImportMessages] = useState([]);

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `scry-${todayIso()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function importData(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      const { data: imported, errors } = parseData(JSON.parse(await file.text()));
      const dayCount = Object.keys(imported.days).length;
      if (!confirm(`Replace your current data with ${dayCount} logged days from "${file.name}"?`)) return;
      onReplace(imported);
      setImportMessages([`Imported ${dayCount} days.`, ...errors.map((error) => `Skipped ${error}`)]);
    } catch (error) {
      setImportMessages([`Could not read "${file.name}": ${error.message}`]);
    }
  }

  return (
    <div className="settings-group">
      <h3>Data</h3>
      <p className="hint">Your data is stored only in this browser. Export it regularly as a backup.</p>
      <div className="data-actions">
        <button onClick={exportData}>Export JSON</button>
        <label className="button">
          Import JSON
          <input type="file" accept="application/json,.json" onChange={importData} hidden />
        </label>
      </div>
      {importMessages.length > 0 && (
        <ul className="import-messages">
          {importMessages.map((message, i) => (
            <li key={i}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
