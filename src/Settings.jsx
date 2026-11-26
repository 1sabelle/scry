import { useState } from 'react';
import { newId } from './days.js';
import { todayIso } from './dates.js';
import { parseData } from './storage.js';

// A habit's name may be cleared while typing; one left empty gets this name so it stays valid.
const UNNAMED_HABIT = 'Unnamed habit';

export default function Settings({ data, onReplace }) {
  return (
    <details className="settings">
      <summary>Settings and data</summary>
      <HabitSettings data={data} onReplace={onReplace} />
      <PromptSettings data={data} onReplace={onReplace} />
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
    onReplace({ ...data, habits: [...data.habits, { id: newId(), name, reflectionPrompt: '', archived: false }] });
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
      <p className="hint">The reflection prompt is offered in the journal for that habit. Leave it empty for a general one.</p>
      {data.habits.map((habit) => (
        <div key={habit.id} className={`habit-setting ${habit.archived ? 'is-archived' : ''}`}>
          <input
            value={habit.name}
            onChange={(e) => updateHabit(habit.id, { name: e.target.value })}
            onBlur={() => !habit.name.trim() && updateHabit(habit.id, { name: UNNAMED_HABIT })}
            aria-label="Habit name"
          />
          <input
            className="wide"
            placeholder="Reflection prompt (optional)"
            value={habit.reflectionPrompt}
            onChange={(e) => updateHabit(habit.id, { reflectionPrompt: e.target.value })}
            aria-label={`Reflection prompt for ${habit.name}`}
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

function PromptSettings({ data, onReplace }) {
  const [newText, setNewText] = useState('');
  const removePrompt = (id) => onReplace({ ...data, prompts: data.prompts.filter((prompt) => prompt.id !== id) });

  function addPrompt() {
    const text = newText.trim();
    if (!text) return;
    onReplace({ ...data, prompts: [...data.prompts, { id: newId(), text }] });
    setNewText('');
  }

  return (
    <div className="settings-group">
      <h3>Journal prompts</h3>
      {data.prompts.map((prompt) => (
        <div key={prompt.id} className="prompt-setting">
          <input
            className="wide"
            value={prompt.text}
            onChange={(e) => onReplace({ ...data, prompts: data.prompts.map((p) => (p.id === prompt.id ? { ...p, text: e.target.value } : p)) })}
            onBlur={() => !prompt.text.trim() && removePrompt(prompt.id)}
            aria-label="Prompt"
          />
          <button onClick={() => removePrompt(prompt.id)}>Remove</button>
        </div>
      ))}
      <form className="add-row" onSubmit={(e) => { e.preventDefault(); addPrompt(); }}>
        <input className="wide" placeholder="New prompt" value={newText} onChange={(e) => setNewText(e.target.value)} />
        <button type="submit" disabled={!newText.trim()}>Add prompt</button>
      </form>
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
