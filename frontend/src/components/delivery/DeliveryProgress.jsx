import { Check } from 'lucide-react';
import { dateTime } from '../../utils/adminMetrics.js';
const stages = [['VALIDEE', 'Validée'], ['AFFECTEE', 'Affectée'], ['EN_ROUTE', 'En route'], ['LIVREE', 'Livrée']];
export default function DeliveryProgress({ status, timeline = [] }) {
  const current = stages.findIndex(([key]) => key === status);
  const lastKnown = Math.max(current, ...timeline.map((event) => stages.findIndex(([key]) => key === event.status)));
  return <ol className="delivery-progress" aria-label="Étapes de la livraison">{stages.map(([key, label], index) => {
    const event = timeline.filter((entry) => entry.status === key).at(-1);
    const done = index <= lastKnown;
    return <li key={key} className={done ? 'done' : ''} aria-current={key === status ? 'step' : undefined}><span>{done ? <Check size={16} /> : index + 1}</span><strong>{label}</strong><small>{event ? dateTime(event.createdAt) : '—'}</small></li>;
  })}</ol>;
}
