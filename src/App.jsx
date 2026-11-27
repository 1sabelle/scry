import { useEffect, useState } from 'react';
import { EMPTY_DAY, isEmptyDay } from './days.js';
import { todayIso } from './dates.js';
import { loadData, saveData } from './storage.js';
import Summary from './Summary.jsx';
import Calendar from './Calendar.jsx';
import { CheckInForm, CheckInList, useCheckInDraft } from './CheckIns.jsx';
import DailyLines from './DailyLines.jsx';
import Habits from './Habits.jsx';
import Patterns from './Patterns.jsx';
import Search from './Search.jsx';
import Settings from './Settings.jsx';
import Starfield from './Starfield.jsx';

export default function App() {
  const [data, setData] = useState(loadData);
  const [selectedDate, setSelectedDate] = useState(() => todayIso(data.dayStartTime));
  const [saveFailed, setSaveFailed] = useState(false);
  const today = todayIso(data.dayStartTime);
  const selectedDay = data.days[selectedDate] ?? EMPTY_DAY;
  const isToday = selectedDate === today;
  const checkInDraft = useCheckInDraft(selectedDate, isToday, selectedDay.checkIns, data.dayStartTime, (checkIns, addedOptions) => {
    setData((current) => ({
      ...current,
      emotions: [...current.emotions, ...addedOptions.emotions],
      activities: [...current.activities, ...addedOptions.activities],
    }));
    updateSelectedDay({ checkIns });
  });

  useEffect(() => {
    setSaveFailed(!saveData(data));
  }, [data]);

  // Applies `change` to the selected day's log; a day left empty is removed.
  function updateSelectedDay(change) {
    setData((current) => {
      const day = { ...EMPTY_DAY, ...current.days[selectedDate], ...change };
      const days = { ...current.days };
      if (isEmptyDay(day)) delete days[selectedDate];
      else days[selectedDate] = day;
      return { ...current, days };
    });
  }

  return (
    <div className="app">
      <Starfield />
      <header>
        <h1>
          <img className="wordmark" src="/scry-wordmark.svg" alt="Scry" width={80} height={50} />
        </h1>
        {saveFailed && <p className="warning">Could not save to browser storage. Export your data to keep it.</p>}
      </header>
      <Summary data={data} today={today} />
      <Search days={data.days} onSelect={setSelectedDate} />
      <main className="layout">
        <Calendar days={data.days} today={today} selectedDate={selectedDate} onSelect={setSelectedDate} />
        <CheckInList checkIns={selectedDay.checkIns} emotions={data.emotions} activities={data.activities} checkInDraft={checkInDraft} />
        <section className="day-panel">
          <CheckInForm date={selectedDate} days={data.days} emotions={data.emotions} activities={data.activities} checkInDraft={checkInDraft} />
          <DailyLines day={selectedDay} onChange={updateSelectedDay} />
          <Habits
            habits={data.habits}
            days={data.days}
            today={today}
            isToday={isToday}
            habitsDone={selectedDay.habitsDone}
            onChange={(habitsDone) => updateSelectedDay({ habitsDone })}
          />
        </section>
      </main>
      <Patterns data={data} today={today} onSelect={setSelectedDate} />
      <Settings data={data} onReplace={setData} />
      <footer>Everything stays in this browser. Nothing is sent anywhere.</footer>
    </div>
  );
}
