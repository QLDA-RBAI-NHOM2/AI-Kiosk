import type { LatencyMeasurement } from './types.ts';

/** Giữ nguyên missing/invalid; LatencyPanel chịu trách nhiệm trình bày. Không cộng tổng. */
export function mapLatency(measurements: readonly LatencyMeasurement[]) {
  return measurements.map(({ name, valueMs }) => ({ id: name, label: name, valueMs }));
}
