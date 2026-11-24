export default function StatisticValue({ value, progress, format = Math.round }) {
  if (value == null) return '—';
  const finalValue = format(value);
  if (progress === 1) return finalValue;
  return <span aria-label={String(finalValue)} role="img"><span aria-hidden="true">{format(Math.round(value * progress))}</span></span>;
}
