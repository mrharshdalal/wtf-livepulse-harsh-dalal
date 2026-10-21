// Mirrors the hour/day multiplier tables in
// backend/src/db/migrations/004_seed.sql. If the Data Spec's multiplier
// tables ever change, update BOTH files -- they can't share code (one is a
// one-shot SQL seed, the other continuous runtime JS).

function hourMultiplier(minuteOfDay) {
  if (minuteOfDay < 5 * 60 + 30) return 0.0;       // 00:00-05:29
  if (minuteOfDay < 7 * 60) return 0.6;            // 05:30-06:59
  if (minuteOfDay < 10 * 60) return 1.0;           // 07:00-09:59 (peak)
  if (minuteOfDay < 12 * 60) return 0.4;           // 10:00-11:59
  if (minuteOfDay < 14 * 60) return 0.3;           // 12:00-13:59
  if (minuteOfDay < 17 * 60) return 0.2;           // 14:00-16:59
  if (minuteOfDay < 21 * 60) return 0.9;           // 17:00-20:59 (peak)
  if (minuteOfDay < 22 * 60 + 30) return 0.35;     // 21:00-22:30
  return 0.0;                                       // 22:31-23:59
}

const DAY_MULTIPLIERS = [0.45, 1.0, 0.95, 0.9, 0.95, 0.85, 0.7]; // 0=Sun..6=Sat
function dayMultiplier(dayOfWeek) {
  return DAY_MULTIPLIERS[dayOfWeek];
}

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** {minuteOfDay, dayOfWeek} in a FIXED timeZone -- do not use
 *  date.getHours()/getDay(), they depend on process.env.TZ. */
function localTimeParts(date, timeZone = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'short',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  const hour = Number(get('hour')) % 24; // guards ICU's midnight="24" quirk
  const minute = Number(get('minute'));
  return { minuteOfDay: hour * 60 + minute, dayOfWeek: WEEKDAY_INDEX[get('weekday')] };
}

function trafficMultiplier(date, timeZone = 'Asia/Kolkata') {
  const { minuteOfDay, dayOfWeek } = localTimeParts(date, timeZone);
  return hourMultiplier(minuteOfDay) * dayMultiplier(dayOfWeek);
}

module.exports = { hourMultiplier, dayMultiplier, trafficMultiplier, localTimeParts, DAY_MULTIPLIERS };
