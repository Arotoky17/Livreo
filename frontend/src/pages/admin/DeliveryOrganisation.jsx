import { useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardList, Route, X } from 'lucide-react';
import { Badge, Dialog, Empty, Panel } from '../../components/ui/PortalUI.jsx';
import { dateTime, matches, money } from '../../utils/adminMetrics.js';
import '../../styles/DeliveryOrganisation.css';

const localDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Indian/Antananarivo' });
const byQueue = (a, b) =>
  (a.routePosition ?? Infinity) - (b.routePosition ?? Infinity) ||
  new Date(a.assignedAt) - new Date(b.assignedAt) ||
  (a.id < b.id ? -1 : 1);

function DeliverySummary({ delivery, showCustomer = false }) {
  const { order } = delivery;
  const payment = order.paymentMethod === 'PREPAID' ? 'Déjà payé' : `${money(order.totalAmount)} à encaisser`;
  const detail = delivery.completedAt && delivery.status === 'LIVREE' ? dateTime(delivery.completedAt) : payment;
  return <span className="tour-summary">
    <span><strong>{delivery.trackingCode}</strong>{showCustomer && ` · ${order.customerName}`}</span>
    <small>{order.deliveryAddress} · {detail}</small>
  </span>;
}

export default function DeliveryOrganisation({ deliveries, drivers, query, now, busy, onAction, onDetails }) {
  const [selected, setSelected] = useState([]);
  const [driverId, setDriverId] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const today = localDay.format(now);
  const waiting = deliveries.filter(({ status }) => ['VALIDEE', 'REPROGRAMMEE'].includes(status));
  const visible = (delivery) => matches(query, delivery.trackingCode, delivery.order.customerName, delivery.order.deliveryAddress);
  const selection = waiting.filter((delivery) => selected.includes(delivery.id));
  const inProgress = deliveries.filter(({ status }) => status === 'AFFECTEE' || status === 'EN_ROUTE');
  const finishedToday = deliveries.filter((delivery) => delivery.completedAt && delivery.status === 'LIVREE' &&
    localDay.format(new Date(delivery.completedAt)) === today);
  const driverIds = new Set(drivers.map((driver) => driver.id));
  const groups = [...drivers, ...new Map([...inProgress, ...finishedToday]
    .filter((delivery) => delivery.deliveryPerson && !driverIds.has(delivery.deliveryPersonId))
    .map((delivery) => [delivery.deliveryPersonId, delivery.deliveryPerson])).values()];
  const pendingReset = inProgress.some((delivery) => delivery.status === 'AFFECTEE' && delivery.assignedAt &&
    delivery.routePosition !== null && localDay.format(new Date(delivery.assignedAt)) === today);

  return <>
    <div className="tour-toolbar">
      <button className="adm-secondary-button" disabled={busy || !pendingReset}
        onClick={() => setConfirmation({ action: 'reset' })}>Réinitialiser l’ordre du jour</button>
    </div>
    <div className="tour-board">
      <Panel title="À affecter" icon={ClipboardList} action={<span className="tour-count">{waiting.length} à affecter</span>}>
        <div className="tour-list">
          {waiting.filter(visible).map((delivery) => <label key={delivery.id} className="tour-card tour-option">
            <input type="checkbox" checked={selected.includes(delivery.id)} disabled={busy}
              onChange={(event) => setSelected(event.target.checked ? [...selected, delivery.id] : selected.filter((id) => id !== delivery.id))} />
            <DeliverySummary delivery={delivery} showCustomer />
          </label>)}
          {!waiting.some(visible) && <Empty>Aucune commande à affecter.</Empty>}
        </div>
        <form className="tour-assign adm-form" onSubmit={async (event) => {
          event.preventDefault();
          if (await onAction({ action: 'assign', driverId, ids: selection.map(({ id }) => id) }, 'Sélection affectée au livreur.')) setSelected([]);
        }}>
          <label>Livreur<select value={driverId} required disabled={busy || !drivers.length} onChange={(event) => setDriverId(event.target.value)}>
            <option value="">Sélectionner un livreur actif</option>
            {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.nom} · {inProgress.filter((delivery) => delivery.deliveryPersonId === driver.id).length} courses</option>)}
          </select></label>
          {selection.length > 100 && <p role="status">Sélectionnez jusqu’à 100 commandes par affectation.</p>}
          <button className="adm-primary-button" disabled={busy || !selection.length || selection.length > 100 || !drivers.some(({ id }) => id === driverId)}>
            Affecter la sélection{selection.length > 0 && ` (${selection.length})`}
          </button>
        </form>
      </Panel>
      <div className="tour-drivers">
        {groups.map((driver) => {
          const queue = inProgress.filter((delivery) => delivery.deliveryPersonId === driver.id && delivery.status === 'AFFECTEE').sort(byQueue);
          const current = inProgress.filter((delivery) => delivery.deliveryPersonId === driver.id && delivery.status === 'EN_ROUTE').sort(byQueue);
          const completed = finishedToday.filter((delivery) => delivery.deliveryPersonId === driver.id)
            .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
          const route = [...completed, ...current, ...queue];
          return <Panel key={driver.id} title={driver.nom} icon={Route}
            action={route.length > 0 && <Badge status={current.length ? 'EN_ROUTE' : queue.length ? 'AFFECTEE' : 'LIVREE'} />}>
            <ol className="tour-list">
              {route.map((delivery, index) => {
                if (query && !visible(delivery) && !matches(query, driver.nom)) return null;
                const position = queue.indexOf(delivery);
                return <li key={delivery.id} className="tour-card">
                  <span className="tour-number">{index + 1}</span>
                  <button className="tour-detail" onClick={() => onDetails(delivery.order)}>
                    <DeliverySummary delivery={delivery} />
                  </button>
                  {position < 0 ? <Badge status={delivery.status} /> : <div className="tour-controls">
                    {[[ChevronUp, 'up', -1, 'Monter'], [ChevronDown, 'down', 1, 'Descendre']].map(([Icon, direction, offset, label]) => {
                      const adjacent = queue[position + offset];
                      return <button key={direction} className="adm-icon-button" disabled={busy || !adjacent}
                        aria-label={`${label} ${delivery.trackingCode}`}
                        onClick={() => onAction({ action: 'move', driverId: driver.id, id: delivery.id, adjacentId: adjacent.id, direction }, 'Ordre de passage enregistré.')}>
                        <Icon size={16} />
                      </button>;
                    })}
                    <button className="adm-icon-button" disabled={busy} aria-label={`Retirer ${delivery.trackingCode}`}
                      onClick={() => setConfirmation({ action: 'remove', driverId: driver.id, id: delivery.id })}><X size={16} /></button>
                  </div>}
                </li>;
              })}
            </ol>
            {!route.some((delivery) => !query || visible(delivery) || matches(query, driver.nom)) && <Empty>Aucune course à afficher.</Empty>}
          </Panel>;
        })}
        {!groups.length && <Panel title="Tournées" icon={Route}><Empty>Ajoutez un livreur actif pour organiser les courses.</Empty></Panel>}
      </div>
    </div>
    {confirmation && <Dialog title={confirmation.action === 'reset' ? 'Réinitialiser l’ordre du jour' : 'Retirer la course'} onClose={() => { if (!busy) setConfirmation(null); }}>
      <div className="adm-form">
        <p>{confirmation.action === 'reset' ? 'Les courses affectées aujourd’hui et encore en attente reprendront leur ordre d’affectation.' : 'Cette course reviendra dans la liste des commandes à affecter.'}</p>
        <div className="adm-dialog-actions">
          <button className="adm-secondary-button" disabled={busy} onClick={() => setConfirmation(null)}>Annuler</button>
          <button className="adm-primary-button" disabled={busy} onClick={async () => {
            const message = confirmation.action === 'reset' ? 'Ordre du jour réinitialisé.' : 'Course retirée de la tournée.';
            if (await onAction(confirmation, message)) setConfirmation(null);
          }}>Confirmer</button>
        </div>
      </div>
    </Dialog>}
  </>;
}
