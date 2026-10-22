const {
  hourMultiplier,
  dayMultiplier,
  trafficMultiplier,
  localTimeParts,
} = require('../../src/shared/trafficPatterns');

describe('hourMultiplier', () => {
  test('0 during closed hours (2am)', () => {
    expect(hourMultiplier(2 * 60)).toBe(0.0);
  });

  test('1.0 at the morning peak (8am)', () => {
    expect(hourMultiplier(8 * 60)).toBe(1.0);
  });

  test('0.9 at the evening peak (6pm)', () => {
    expect(hourMultiplier(18 * 60)).toBe(0.9);
  });

  test('0 after closing (11:30pm)', () => {
    expect(hourMultiplier(23 * 60 + 30)).toBe(0.0);
  });
});

describe('dayMultiplier', () => {
  test('Monday is the busiest day (1.0)', () => {
    expect(dayMultiplier(1)).toBe(1.0);
  });

  test('Sunday is the quietest day (0.45)', () => {
    expect(dayMultiplier(0)).toBe(0.45);
  });
});

describe('trafficMultiplier', () => {
  test('combines hour and day multipliers for a known timestamp (Monday 8am IST)', () => {
    const mondayMorning = new Date('2026-10-19T08:00:00+05:30');
    expect(trafficMultiplier(mondayMorning)).toBeCloseTo(1.0 * 1.0, 5);
  });

  test('is 0 overnight regardless of day (Sunday 2am IST)', () => {
    const sundayNight = new Date('2026-10-18T02:00:00+05:30');
    expect(trafficMultiplier(sundayNight)).toBe(0);
  });

  test('realistic time distribution: weekday evening traffic exceeds weekend afternoon traffic', () => {
    const tuesdayEvening = new Date('2026-10-20T18:00:00+05:30');
    const saturdayAfternoon = new Date('2026-10-24T15:00:00+05:30');
    expect(trafficMultiplier(tuesdayEvening)).toBeGreaterThan(trafficMultiplier(saturdayAfternoon));
  });
});

describe('localTimeParts', () => {
  test('resolves minuteOfDay and dayOfWeek in a fixed timezone, independent of process TZ', () => {
    const date = new Date('2026-10-21T14:30:00+05:30'); // Wednesday 14:30 IST
    const { minuteOfDay, dayOfWeek } = localTimeParts(date, 'Asia/Kolkata');
    expect(minuteOfDay).toBe(14 * 60 + 30);
    expect(dayOfWeek).toBe(3); // Wednesday
  });
});
