import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Truck, MapPin, History, UserRound, Phone, Play, CheckCircle2, XCircle, Eye, ArrowRight, Radio, Package, Search } from 'lucide-react';
import PortalLayout from '../../components/navigation/PortalLayout.jsx';
import { Badge, Empty, Panel, Dialog } from '../../components/ui/PortalUI.jsx';
import MapComponent from '../../components/delivery/MapComponent.jsx';
import DeliveryProgress from '../../components/delivery/DeliveryProgress.jsx';
import useApiResources from '../../hooks/useApiResources.js';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import { completionValues, gpsDeliveryIds } from '../../utils/deliveryRules.js';
import { money, dateTime, matches } from '../../utils/adminMetrics.js';
import useGpsSharing from '../../hooks/useGpsSharing.js';
import ProfilePhotoEditor from '../../components/profile/ProfilePhotoEditor.jsx';
const resources = [['deliveries', '/deliveries', 'deliveries', 'livraisons']];
const navigation = [['dashboard', 'Tableau de bord', LayoutDashboard], ['courses', 'Mes courses', Truck], ['map', 'Carte GPS', MapPin], ['history', 'Historique', History], ['profile', 'Mon profil', UserRound]];

export default function DeliveryDriverPage() {
  const { user } = useAuth();
  const { data, setData, errors, updatedAt, refresh } = useApiResources(resources);
  const [params, setParams] = useSearchParams();
  const section = navigation.some(([key]) => key === params.get('section')) ? params.get('section') : 'dashboard';
  const [selectedId, setSelectedId] = useState(null), [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('');
  const deliveries = data.deliveries ?? [];
  const active = deliveries.filter((delivery) => delivery.status === 'EN_ROUTE');
  const assigned = deliveries.filter((delivery) => delivery.status === 'AFFECTEE');
  const completed = deliveries.filter((delivery) => ['LIVREE', 'ECHEC', 'ANNULEE'].includes(delivery.status));
  const activeIds = gpsDeliveryIds(deliveries, user);
  const gps = useGpsSharing(activeIds);
  const selected = deliveries.find((delivery) => delivery.id === selectedId);
  const next = active[0] ?? assigned[0];
  const now = updatedAt?.getTime() ?? 0;
  const ownPosition = activeIds ? gps.position : null;
  const knownGps = active.flatMap((delivery) => delivery.gpsLogs ?? []).sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))[0];
  const location = ownPosition ?? knownGps;
  const markers = location && active.length ? [{ lat: location.latitude, lng: location.longitude, title: 'Dernière position du livreur', details: `Signal : ${dateTime(location.recordedAt)}`, isOutdated: now - new Date(location.recordedAt).getTime() > 180000 }] : [];
  const closeModal = useCallback(() => { if (!busy) setModal(null); }, [busy]);
  const go = (key) => { setParams(key === 'dashboard' ? {} : { section: key }); setSelectedId(null); setQuery(''); setFilter(''); setError(''); };
  const canAct = (delivery) => user?.role === 'DELIVERY' && delivery.deliveryPersonId === user.id;
  async function changeStatus(delivery, status, values = {}) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api.patch(`/deliveries/${delivery.id}/status`, { status, ...values });
      setData((previous) => ({ ...previous, deliveries: previous.deliveries.map((entry) => entry.id === delivery.id ? { ...entry, status, ...values, ...(status === 'LIVREE' ? { completedAt: new Date().toISOString() } : {}) } : entry) }));
      if (status === 'EN_ROUTE') gps.start();
      if (status !== 'EN_ROUTE' && active.length <= 1) gps.stop();
      setModal(null); setNotice(status === 'EN_ROUTE' ? 'Course démarrée. Autorisez le GPS pour partager votre position.' : status === 'LIVREE' ? 'Livraison confirmée.' : 'Échec enregistré. L’administrateur décidera de la suite.');
      await refresh();
    } catch (err) { setError(err.response?.data?.message || 'La mise à jour a échoué. Vérifiez votre connexion.'); }
    finally { setBusy(false); }
  }
  function actions(delivery) {
    if (!canAct(delivery)) return null;
    return <div className="driver-actions">{delivery.status === 'AFFECTEE' && <button className="adm-primary-button" disabled={busy} onClick={() => changeStatus(delivery, 'EN_ROUTE')}><Play size={16} />Démarrer la course</button>}{delivery.status === 'EN_ROUTE' && <><button className="adm-primary-button" disabled={busy} onClick={() => { setError(''); setModal({ kind: 'complete', delivery }); }}><CheckCircle2 size={17} />Confirmer la remise</button><button className="portal-danger-button" disabled={busy} onClick={() => { setError(''); setModal({ kind: 'fail', delivery }); }}><XCircle size={17} />Déclarer un échec</button></>}</div>;
  }
  function map(full = false, delivery = next) {
    const order = delivery?.order;
    const showPosition = !delivery || ['AFFECTEE', 'EN_ROUTE'].includes(delivery.status);
    const mapMarkers = showPosition ? [...markers] : [];
    const hasDestination = Number.isFinite(order?.destinationLatitude) && Number.isFinite(order?.destinationLongitude);
    if (hasDestination) {
      mapMarkers.push({
        lat: order.destinationLatitude,
        lng: order.destinationLongitude,
        kind: 'destination',
        title: 'Destination',
        details: order.deliveryAddress,
      });
    }
    return (
      <Panel title="Carte de livraison" icon={MapPin}
        action={location && showPosition && <span className="adm-muted">{dateTime(location.recordedAt)}</span>}>
        <div className="portal-map">
          <MapComponent markers={mapMarkers} height={full ? '460px' : '280px'} />
          {order && <p><strong>Destination</strong> · {order.deliveryAddress}</p>}
          {showPosition && !markers.length && <p>La position du livreur s’affiche après réception du GPS pendant une course active.</p>}
        </div>
      </Panel>
    );
  }
  function courseList(rows) {
    return <div className="driver-course-list">{rows.map((delivery) => <article key={delivery.id} className="driver-course"><div><span className="portal-order-icon"><Package size={22} /></span><div><strong>{delivery.trackingCode}</strong><p>{delivery.order.customerName} · {delivery.order.zone?.nom}</p></div><Badge status={delivery.status} /></div><p className="driver-address"><MapPin size={16} />{delivery.order.deliveryAddress}</p><div className="driver-course-bottom"><span>{delivery.order.paymentMethod === 'PREPAID' ? 'Déjà payé · Aucun encaissement prévu' : `À encaisser : ${money(delivery.order.totalAmount)}`}</span><button className="adm-secondary-button" onClick={() => setSelectedId(delivery.id)}><Eye size={15} />Voir les détails</button></div>{delivery.status === 'ECHEC' && <p className="portal-error-text">{delivery.failureReason}</p>}</article>)}{!rows.length && <Empty>{data.deliveries === null ? 'Chargement des courses…' : 'Aucune course à afficher.'}</Empty>}</div>;
  }
  return <PortalLayout title={selected ? 'Détails de la livraison' : section === 'dashboard' ? 'Mes courses' : navigation.find(([key]) => key === section)?.[1]} subtitle="Vos livraisons, vos statuts et votre suivi GPS." navigation={navigation} section={section} onSection={go} onRefresh={refresh}>
    {errors.length > 0 && <div className="adm-feedback error" role="alert">Chargement des courses impossible.<button onClick={refresh}>Réessayer</button></div>}
    {notice && <div className="adm-feedback success" role="status"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice('')}>Fermer</button></div>}
    {error && !modal && <p className="adm-feedback error" role="alert">{error}</p>}
    {activeIds && <section className={`driver-gps ${gps.enabled ? 'enabled' : ''}`}><Radio size={22} /><div><strong>{gps.enabled ? gps.lastSent ? 'Partage GPS actif' : 'GPS : attente du premier signal' : 'Une livraison est en cours'}</strong><p>{gps.lastSent ? `Dernière transmission : ${dateTime(gps.lastSent)} · Fréquence cible : 30 s` : 'Partagez votre position avec l’administrateur et le client.'}</p>{gps.error && <p className="portal-error-text" role="alert">{gps.error}</p>}</div><button className="adm-secondary-button" onClick={gps.enabled ? gps.stop : gps.start}>{gps.enabled ? 'Suspendre le GPS' : 'Activer le GPS'}</button></section>}
    {selected ? <><button className="adm-text-button portal-back" onClick={() => setSelectedId(null)}>← Retour aux courses</button><Panel title={selected.trackingCode} icon={Truck} action={<Badge status={selected.status} />}><div className="driver-detail"><DeliveryProgress status={selected.status} /><dl className="portal-profile"><div><dt>Client</dt><dd>{selected.order.customerName}</dd></div><div><dt>Téléphone</dt><dd><a href={`tel:${selected.order.customerPhone}`}><Phone size={15} />{selected.order.customerPhone}</a></dd></div><div><dt>Adresse</dt><dd>{selected.order.deliveryAddress}<br />{selected.order.deliveryDetails}</dd></div><div><dt>Vendeur</dt><dd>{selected.order.seller?.nom}</dd></div><div><dt>Articles</dt><dd>{selected.order.items.map((item) => `${item.quantity} × ${item.productName}`).join(', ')}</dd></div><div><dt>À encaisser</dt><dd><strong>{selected.order.paymentMethod === 'PREPAID' ? '0 Ar · Prépayé' : money(selected.order.totalAmount)}</strong></dd></div>{selected.notes && <div><dt>Consignes</dt><dd>{selected.notes}</dd></div>}{selected.failureReason && <div><dt>Motif d’échec</dt><dd>{selected.failureReason}</dd></div>}{selected.status === 'LIVREE' && <div><dt>Encaissé</dt><dd>{selected.collectedAmount == null ? 'Non renseigné' : money(selected.collectedAmount)} · {dateTime(selected.completedAt)}</dd></div>}</dl>{actions(selected)}</div></Panel>{map(false, selected)}</> : <>
      {section === 'dashboard' && <><div className="adm-metrics driver-metrics">{[[Package, 'À livrer', assigned.length, 'orange'], [CheckCircle2, 'Livrées', deliveries.filter((delivery) => delivery.status === 'LIVREE').length, 'green'], [Truck, 'En cours', active.length, 'blue']].map(([Icon, label, count, tone]) => <section className={`adm-metric tone-${tone}`} key={label}><span className="adm-metric-icon"><Icon size={23} /></span><div><h2>{label}</h2><strong>{data.deliveries ? count : '—'}</strong></div></section>)}</div><div className="adm-dashboard-grid"><Panel title={active.length ? 'Course en cours' : 'Prochaine livraison'} icon={Truck}>{next ? <div className="driver-next"><strong>{next.trackingCode}</strong><p><MapPin size={16} />{next.order.deliveryAddress}</p><Badge status={next.status} /><button className="adm-primary-button" onClick={() => setSelectedId(next.id)}>Voir les détails<ArrowRight size={16} /></button></div> : <Empty>Aucune course affectée pour le moment.</Empty>}</Panel>{map()}</div></>}
      {['courses', 'history'].includes(section) && <Panel title={section === 'history' ? 'Historique des livraisons' : 'Courses affectées'} icon={Truck}><div className="adm-toolbar"><div className="portal-search"><Search size={17} /><input aria-label="Rechercher une course" placeholder="Code, client, adresse…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select aria-label="Filtrer les courses" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">Tous les statuts</option>{(section === 'history' ? [['LIVREE', 'Livrée'], ['ECHEC', 'Échec'], ['ANNULEE', 'Annulée']] : [['AFFECTEE', 'Affectée'], ['EN_ROUTE', 'En route'], ['REPROGRAMMEE', 'À reprogrammer']]).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>{courseList((section === 'history' ? completed : deliveries.filter((delivery) => !['LIVREE', 'ECHEC', 'ANNULEE'].includes(delivery.status))).filter((delivery) => (!filter || delivery.status === filter) && matches(query, delivery.trackingCode, delivery.order.customerName, delivery.order.deliveryAddress)))}</Panel>}
      {section === 'map' && map(true)}
      {section === 'profile' && <Panel title="Mon profil" icon={UserRound}><ProfilePhotoEditor /><dl className="portal-profile"><div><dt>Nom</dt><dd>{user?.nom}</dd></div><div><dt>Email</dt><dd>{user?.email}</dd></div><div><dt>Téléphone</dt><dd>{user?.telephone || 'Non renseigné'}</dd></div></dl><p className="adm-inline-note">Les informations de votre compte sont gérées par l’administrateur.</p></Panel>}
    </>}
    {modal && <Dialog title={modal.kind === 'complete' ? 'Confirmer la remise du colis' : 'Déclarer un échec'} onClose={closeModal}>{error && <p className="adm-feedback error" role="alert">{error}</p>}<form className="adm-form" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); if (modal.kind === 'complete') { try { const payload = completionValues(modal.delivery.order, values.get('collectedAmount')); void changeStatus(modal.delivery, 'LIVREE', payload); } catch (err) { setError(err.message); } } else { const reason = String(values.get('failureReason')).trim(); if (!reason) { setError('Un motif d’échec est obligatoire.'); return; } void changeStatus(modal.delivery, 'ECHEC', { failureReason: reason }); } }}><p>{modal.delivery.trackingCode} · {modal.delivery.order.customerName}</p>{modal.kind === 'complete' ? modal.delivery.order.paymentMethod === 'PREPAID' ? <p className="adm-feedback">Commande prépayée : aucun encaissement à enregistrer à la remise.</p> : <label>Montant effectivement encaissé (Ar)<input name="collectedAmount" type="number" min="0" step="1" required defaultValue={modal.delivery.order.totalAmount} /></label> : <label>Motif de l’échec<textarea name="failureReason" rows={3} required placeholder="Client absent, adresse incorrecte…" /></label>}<button className="adm-primary-button" disabled={busy}>{busy ? 'Enregistrement…' : modal.kind === 'complete' ? 'Confirmer la livraison' : 'Enregistrer l’échec'}</button></form></Dialog>}
  </PortalLayout>;
}


