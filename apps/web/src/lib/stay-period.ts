export interface BookedRange {
  startDate: string;
  endDate: string;
}

// API dates use midnight UTC. Compare calendar days without converting to the browser's timezone.
export function stayOverlaps(ranges: BookedRange[], start: string, end: string) {
  return ranges.some(range => range.startDate.slice(0, 10) < end && range.endDate.slice(0, 10) > start);
}

export function stayQuote(start: string | null, end: string | null, rate: number, cleaning: number) {
  if (!start || !end || end <= start) return null;
  const nights = (Date.parse(end) - Date.parse(start)) / 86_400_000;
  const total = Math.round((rate * nights + cleaning) * 100) / 100;
  return { nights, total };
}
