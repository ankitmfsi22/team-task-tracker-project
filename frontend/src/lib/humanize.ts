// "IN_PROGRESS" -> "In progress"; the TODO status reads as two words: "To do".
export function humanize(value: string): string {
  const text = value === 'TODO' ? 'to do' : value.toLowerCase().replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
