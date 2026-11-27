import { describe, expect, it } from 'vitest';
import { DEFAULT_EMOTIONS } from './days.js';
import { parseData } from './storage.js';

const habit = { id: 'h1', name: 'Walk', archived: false };

describe('parseData', () => {
  it('keeps valid data and fills in optional fields', () => {
    const { data, errors } = parseData({
      habits: [{ id: 'h1', name: 'Walk' }],
      days: {
        '2026-11-20': {
          checkIns: [{ id: 'c1', time: '08:30', mood: 4 }],
          habitsDone: ['h1'],
        },
      },
    });
    expect(errors).toEqual([]);
    expect(data.habits).toEqual([habit]);
    expect(data.dayStartTime).toBe('00:00');
    expect(data.days['2026-11-20']).toEqual({
      checkIns: [{ id: 'c1', time: '08:30', mood: 4, emotions: [], note: '' }],
      habitsDone: ['h1'],
      gratitude: '',
      success: '',
    });
  });

  it('drops the journal, prompts and reflection prompts of data saved while the journal existed', () => {
    const { data, errors } = parseData({
      habits: [{ id: 'h1', name: 'Walk', reflectionPrompt: 'How was it?' }],
      prompts: [{ id: 'p1', text: 'Why?' }],
      days: {
        '2026-11-20': { checkIns: [], habitsDone: ['h1'], journal: [{ id: 'j1', time: '21:00', text: 'Nice day' }] },
        '2026-11-21': { checkIns: [], habitsDone: [], journal: [{ id: 'j2', time: '21:00', text: 'Only words' }] },
      },
    });
    expect(errors).toEqual([]);
    expect(data).toEqual({
      habits: [habit],
      emotions: DEFAULT_EMOTIONS,
      dayStartTime: '00:00',
      days: { '2026-11-20': { checkIns: [], habitsDone: ['h1'], gratitude: '', success: '' } },
    });
  });

  it('reports every problem in one pass and keeps the valid entries', () => {
    const { data, errors } = parseData({
      habits: [habit],
      days: {
        '2026-02-30': { checkIns: [] },
        '2026-11-20': {
          checkIns: [
            { id: 'c1', time: '25:00', mood: 9, emotions: ['smug'] },
            { id: 'c2', time: '09:00', mood: 3 },
          ],
          habitsDone: ['h1', 'gone'],
        },
      },
    });
    expect(errors).toEqual([
      '2026-02-30: "2026-02-30" is not a date in YYYY-MM-DD format.',
      '2026-11-20 checkIns[0]: time "25:00" is not a time in HH:MM format.',
      '2026-11-20 checkIns[0]: mood "9" is not one of 1, 2, 3, 4, 5.',
      '2026-11-20 checkIns[0]: emotion "smug" is not the id of an emotion.',
      '2026-11-20: habitsDone "gone" is not the id of a habit.',
    ]);
    expect(data.days['2026-11-20'].checkIns.map((checkIn) => checkIn.id)).toEqual(['c2']);
    expect(data.days['2026-11-20'].habitsDone).toEqual(['h1']);
  });

  it('gives data saved before emotions were editable the default emotions', () => {
    const { data, errors } = parseData({ days: { '2026-11-20': { checkIns: [{ id: 'c1', time: '08:00', mood: 3, emotions: ['calm'] }] } } });
    expect(errors).toEqual([]);
    expect(data.emotions).toEqual(DEFAULT_EMOTIONS);
    expect(data.days['2026-11-20'].checkIns[0].emotions).toEqual(['calm']);
  });

  it('checks check-in emotions against the saved emotions', () => {
    const { data, errors } = parseData({
      emotions: [{ id: 'e1', name: 'cosy' }],
      days: { '2026-11-20': { checkIns: [{ id: 'c1', time: '08:00', mood: 3, emotions: ['e1'] }, { id: 'c2', time: '09:00', mood: 3, emotions: ['calm'] }] } },
    });
    expect(errors).toEqual(['2026-11-20 checkIns[1]: emotion "calm" is not the id of an emotion.']);
    expect(data.emotions).toEqual([{ id: 'e1', name: 'cosy', archived: false }]);
    expect(data.days['2026-11-20'].checkIns.map((checkIn) => checkIn.id)).toEqual(['c1']);
  });

  it('keeps a day that only has a gratitude, and checks the start of day', () => {
    const { data, errors } = parseData({
      dayStartTime: '4am',
      days: {
        '2026-11-20': { gratitude: 'Sunshine', success: 7 },
      },
    });
    expect(errors).toEqual([
      'dayStartTime: "4am" is not a time in HH:MM format, so the day starts at 00:00.',
      '2026-11-20: success "7" is not text.',
    ]);
    expect(data.dayStartTime).toBe('00:00');
    expect(data.days).toEqual({ '2026-11-20': { checkIns: [], habitsDone: [], gratitude: 'Sunshine', success: '' } });
  });

  it('drops days left with nothing valid', () => {
    const { data } = parseData({ days: { '2026-11-20': { checkIns: [{ id: 'c1', time: '08:00', mood: 0 }] } } });
    expect(data.days).toEqual({});
  });

  it('rejects data without days', () => {
    expect(() => parseData({ logs: {} })).toThrow('Expected an object with a "days" field.');
  });
});
