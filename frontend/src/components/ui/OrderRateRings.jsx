import StatisticValue from './StatisticValue.jsx';

const formatPercent = (value) => `${Math.round(value)} %`;

export default function OrderRateRings({ totals, includeWaiting = false, progress = 1 }) {
  const metrics = [
    { label: 'Taux de livraison', count: totals.delivered, detail: 'livr?es', tone: 'delivered' },
    ...(includeWaiting ? [{ label: '? affecter', count: totals.waiting, detail: '? affecter', tone: 'waiting' }] : []),
  ];

  return <div className="order-rate-grid">
    {metrics.map(({ label, count, detail, tone }) => {
      const percent = totals.total ? Math.round(100 * count / totals.total) : null;
      return <div key={tone} className={`order-rate order-rate-${tone}`}>
        <div className="order-rate-gauge">
          <svg viewBox="0 0 72 72" aria-hidden="true">
            <circle className="order-rate-track" cx="36" cy="36" r="30" />
            {percent > 0 && <circle className="order-rate-fill" cx="36" cy="36" r="30"
              pathLength="100" strokeDasharray="100" strokeDashoffset={100 - percent * progress}
              transform="rotate(-90 36 36)" />}
          </svg>
          <strong><StatisticValue value={percent} progress={progress} format={formatPercent} /></strong>
        </div>
        <div><h3>{label}</h3><p>{totals.total ? `${count} ${detail} sur ${totals.total}` : 'Aucune commande sur la p?riode'}</p></div>
      </div>;
    })}
  </div>;
}
