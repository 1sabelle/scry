import { describe, expect, it } from 'vitest';
import { searchWriting } from './search.js';

describe('searchWriting', () => {
  const days = {
    '2026-11-25': {
      checkIns: [{ id: 'c1', time: '09:00', mood: 3, emotions: [], activities: [], note: 'Coffee with Sam' }],
      habitsDone: [],
      gratitude: 'Good coffee',
      success: '',
    },
    '2026-11-26': {
      checkIns: [{ id: 'c2', time: '20:00', mood: 4, emotions: [], activities: [], note: 'Quiet evening' }],
      habitsDone: [],
      gratitude: '',
      success: 'Skipped the coffee',
    },
  };

  it('finds notes, gratitudes and successes ignoring case, newest day first', () => {
    expect(searchWriting(days, 'COFFEE')).toEqual([
      { id: '2026-11-26-success', date: '2026-11-26', label: 'Daily success', text: 'Skipped the coffee' },
      { id: 'c1', date: '2026-11-25', label: '09:00', text: 'Coffee with Sam' },
      { id: '2026-11-25-gratitude', date: '2026-11-25', label: 'Grateful for', text: 'Good coffee' },
    ]);
  });

  it('finds nothing for a blank query', () => {
    expect(searchWriting(days, '  ')).toEqual([]);
  });
});
