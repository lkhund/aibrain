import assert from 'node:assert/strict';
import test from 'node:test';
import { shiftMetrics } from './metrics';
import { countWorkingDays } from './time';

test('lateness shortens the day without creating overtime', () => {
  const metrics = shiftMetrics('09:00', '18:00', '09:28', '18:00');
  assert.equal(metrics.late, 28);
  assert.equal(metrics.early, 0);
  assert.equal(metrics.scheduled, 480);
  assert.equal(metrics.actual, 452);
  assert.equal(metrics.overtime, 0);
});

test('staying past the shift counts overtime after the lunch hour', () => {
  const metrics = shiftMetrics('09:00', '18:00', '09:00', '20:30');
  assert.equal(metrics.overtime, 150);
  assert.equal(metrics.late, 0);
});

test('leaving before the shift end is an early leave', () => {
  const metrics = shiftMetrics('09:00', '18:00', '09:00', '16:40');
  assert.equal(metrics.early, 80);
  assert.equal(metrics.actual, 400);
});

test('working days skip weekends and holidays', () => {
  const holidays = new Set(['2026-10-14']);
  assert.equal(countWorkingDays('2026-10-01', '2026-10-31', holidays), 21);
  assert.equal(countWorkingDays('2026-10-27', '2026-10-30', holidays), 4);
});
