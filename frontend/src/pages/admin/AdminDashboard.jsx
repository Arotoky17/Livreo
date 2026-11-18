import { Badge, Empty, Panel, Dialog } from '../../components/ui/PortalUI.jsx';
import ActivityChart from '../../components/ui/ActivityChart.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Truck, Store, MapPin, Wallet, Banknote, Bell, LogOut, Menu, Search, ChevronDown, CalendarDays, CheckCircle2, ArrowRight, Eye, Plus, X, RefreshCw, AlertCircle, Route, ShieldCheck, BarChart3, ChevronLeft, ChevronRight, CircleHelp } from 'lucide-react';
import api from '../../services/api.js';
import Logo from '../../components/navigation/Logo.jsx';
import MapComponent from '../../components/delivery/MapComponent.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { money, dateTime, statusLabels, matches, dailyActivity, sellerBalances } from '../../utils/adminMetrics.js';
import '../../styles/AdminDashboard.css';

const navigation = [
  ['dashboard', 'Tableau de bord', LayoutDashboard], ['orders', 'Commandes', ShoppingCart],
  ['dispatch', 'Affectations', Route], ['drivers', 'Livreurs', Truck], ['sellers', 'Vendeurs', Store],
  ['map', 'Carte GPS', MapPin], ['zones', 'Zones & tarifs', MapPin], ['collections', 'Encaissements', Wallet],
  ['payouts', 'Reversements', Banknote], ['activity', 'Activité récente', Bell],
];
const resources = [
  ['stats', '/stats', 'stats', 'indicateurs'], ['orders', '/orders', 'orders', 'commandes'],
  ['deliveries', '/deliveries', 'deliveries', 'livraisons'], ['live', '/deliveries/live-map', 'deliveries', 'positions GPS'],
  ['users', '/users', 'users', 'comptes'], ['zones', '/zones', 'zones', 'zones'],
];
const initialData = Object.fromEntries(resources.map(([key]) => [key, null]));
const assignable = ['VALIDEE', 'AFFECTEE', 'REPROGRAMMEE'];
const pageSize = 10;

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const section = navigation.some(([key]) => key === params.get('section')) ? params.get('section') : 'dashboard';
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [failures, setFailures] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [days, setDays] = useState(7);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState('');
  const requestId = useRef(0), detailRequest = useRef(0), activeRequest = useRef(null);
  const abortPending = useCallback(() => activeRequest.current?.abort(), []);
  const loadData = useCallback(async () => {
    const id = ++requestId.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const results = await Promise.allSettled(resources.map(([, url]) => api.get(url, { signal: controller.signal })));
    if (id !== requestId.current || controller.signal.aborted) return;
    const next = {}, errors = [];
    results.forEach((result, index) => {
      const [key, , field, label] = resources[index];
      if (result.status === 'fulfilled') next[key] = result.value.data[field]; else errors.push(label);
    });
    setData((previous) => ({ ...previous, ...next })); setFailures(errors); setUpdatedAt(new Date()); setLoading(false);
  }, []);
  useEffect(() => {
    void loadData();
    const interval = setInterval(() => { if (!document.hidden) void loadData(); }, 15000);
    return () => { clearInterval(interval); abortPending(); };
  }, [loadData, abortPending]);
  const refresh = () => { setLoading(true); void loadData(); };
  const go = (key) => { setParams(key === 'dashboard' ? {} : { section: key }); setQuery(''); setStatus(''); setPage(1); setSidebarOpen(false); };
  const closeModal = useCallback(() => { if (!busy) { setModal(null); setActionError(''); } }, [busy]);
  const openModal = (value) => { setActionError(''); setModal(value); };
  async function mutate(request, message, close = true) {
    setBusy(true); setActionError(''); setNotice(null);
    try { await request(); if (close) setModal(null); setNotice({ type: 'success', text: message }); await loadData(); }
    catch (error) { const text = error.response?.data?.message || 'L’action a échoué. Vérifiez la connexion et réessayez.'; if (close) setActionError(text); else setNotice({ type: 'error', text }); }
    finally { setBusy(false); }
  }
  async function showOrder(order) {
    const id = ++detailRequest.current;
    setDetail(null); setDetailError(''); openModal({ kind: 'detail', order });
    try { const response = await api.get(`/orders/${order.id}`); if (id === detailRequest.current) setDetail(response.data.order); }
    catch (error) { if (id === detailRequest.current) setDetailError(error.response?.data?.message || 'Impossible de charger la commande.'); }
  }
  const orders = data.orders ?? [], deliveries = data.deliveries ?? [], users = data.users ?? [], zones = data.zones ?? [];
  const activeDrivers = users.filter((account) => account.role === 'DELIVERY' && account.isActive);
  const pending = orders.filter((order) => order.status === 'EN_ATTENTE').length;
  const now = updatedAt?.getTime() ?? 0;
  const buckets = dailyActivity(orders, deliveries, days, now), recentBuckets = dailyActivity(orders, deliveries, 7, now);
  const balances = sellerBalances(deliveries);
  const live = data.live ?? [];
  const markers = live.filter((delivery) => delivery.gpsLogs?.length).map((delivery) => {
    const log = delivery.gpsLogs[0];
    return { lat: log.latitude, lng: log.longitude, title: delivery.deliveryPerson?.nom ?? 'Livreur', details: `${delivery.trackingCode} · ${delivery.order?.deliveryAddress ?? ''}`, isOutdated: now - new Date(log.recordedAt).getTime() > 180000 };
  });
  const freshCount = new Set(live.filter((delivery) => delivery.gpsLogs?.[0] && now - new Date(delivery.gpsLogs[0].recordedAt).getTime() <= 180000).map((delivery) => delivery.deliveryPerson?.id).filter(Boolean)).size;
  const activity = [
    ...orders.filter((order) => order.status === 'EN_ATTENTE').map((order) => ({ id: `order-${order.id}`, at: order.createdAt, status: 'EN_ATTENTE', order, text: `Nouvelle commande de ${order.seller?.nom ?? 'vendeur'} pour ${order.customerName}.` })),
    ...deliveries.map((delivery) => ({ id: delivery.id, at: delivery.updatedAt, status: delivery.status, order: delivery.order, text: `${delivery.trackingCode} · ${statusLabels[delivery.status]}${delivery.status === 'ECHEC' && delivery.failureReason ? ` : ${delivery.failureReason}` : ''}${delivery.status === 'AFFECTEE' && delivery.deliveryPerson ? ` · ${delivery.deliveryPerson.nom}` : ''}` })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));
  const filteredOrders = orders.filter((order) => (!status || order.status === status) && matches(query, order.id, order.customerName, order.customerPhone, order.seller?.nom, order.deliveryAddress, order.delivery?.trackingCode));
  const filteredDeliveries = deliveries.filter((delivery) => (!status || delivery.status === status) && matches(query, delivery.trackingCode, delivery.order?.customerName, delivery.deliveryPerson?.nom, delivery.order?.deliveryAddress));
  const personRole = section === 'drivers' ? 'DELIVERY' : 'SELLER';
  const filteredUsers = users.filter((account) => account.role === personRole && matches(query, account.nom, account.email, account.telephone));
  const heading = navigation.find(([key]) => key === section)?.[1];
  const firstName = user?.nom?.split(' ')[0] ?? 'Admin';
  function orderTable(rows, preview = false) {
    return <div className="adm-table-scroll"><table className="adm-table"><thead><tr><th>Commande</th><th>Client</th><th>Vendeur</th><th>Montant</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{rows.map((order) => <tr key={order.id}><td><strong className="adm-reference">{order.delivery?.trackingCode ?? `CMD-${order.id.slice(0, 8).toUpperCase()}`}</strong><small>{dateTime(order.createdAt)}</small></td><td>{order.customerName}{!preview && <small>{order.customerPhone}<br />{order.deliveryAddress}</small>}</td><td>{order.seller?.nom ?? '—'}</td><td className="adm-nowrap">{money(order.totalAmount)}</td><td><Badge status={order.status} /></td><td><div className="adm-row-actions"><button className="adm-icon-button" title="Voir la commande et son historique" onClick={() => showOrder(order)}><Eye size={16} /></button>{!preview && order.status === 'EN_ATTENTE' && <button className="adm-small-button" disabled={busy} onClick={() => mutate(() => api.patch(`/orders/${order.id}/validate`), 'Commande validée. Le code de suivi est disponible.', false)}>Valider</button>}</div></td></tr>)}</tbody></table>{!rows.length && <Empty>{data.orders === null ? 'Commandes indisponibles. Réessayez le chargement.' : 'Aucune commande ne correspond à votre recherche.'}</Empty>}</div>;
  }
  function mapPanel(full = false) {
    return <Panel title="Suivi des livreurs en temps réel" icon={MapPin} className="adm-map-panel" action={<span className="adm-online"><span />GPS récent : {freshCount}</span>}><div className="adm-map-wrap"><MapComponent markers={markers} height={full ? '480px' : '258px'} zoom={12} showLayerToggle={full} />{!markers.length && <div className="adm-map-caption">{data.live === null ? 'Positions GPS indisponibles' : 'Aucun signal GPS reçu pour les livraisons en cours'}</div>}</div>{full && <div className="adm-map-list">{live.map((delivery) => <div key={delivery.id}><strong>{delivery.deliveryPerson?.nom ?? 'Non affectée'}</strong><span>{delivery.trackingCode}</span><span>{delivery.gpsLogs[0] ? `${dateTime(delivery.gpsLogs[0].recordedAt)}${now - new Date(delivery.gpsLogs[0].recordedAt).getTime() > 180000 ? ' · Signal ancien' : ' · Signal récent'}` : 'En attente de signal'}</span></div>)}</div>}</Panel>;
  }
  function activityList(all = false) {
    const rows = activity.filter((item) => matches(query, item.text)).slice(0, all ? 50 : 5);
    return <div className="adm-activity">{rows.map((item) => <button key={item.id} className="adm-activity-item" onClick={() => showOrder(item.order)}><span className={`adm-event-icon status-${item.status}`}>{item.status === 'LIVREE' ? <CheckCircle2 size={17} /> : item.status === 'ECHEC' ? <AlertCircle size={17} /> : <ShoppingCart size={17} />}</span><span>{item.text}<small>{dateTime(item.at)}</small></span><ChevronRight size={15} /></button>)}{!rows.length && <Empty>Aucune activité disponible.</Empty>}</div>;
  }
  return (
    <div className={`admin-app ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {sidebarOpen && <button className="adm-sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-label="Fermer le menu" />}
      <aside className={`adm-sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Navigation administrateur">
        <div className="adm-brand"><Logo /><span>Livraison · Suivi · Confiance</span></div>
        <nav>{navigation.map(([key, label, Icon]) => <button key={key} className={section === key ? 'active' : ''} onClick={() => go(key)} aria-current={section === key ? 'page' : undefined}><Icon size={18} /><span>{label}</span>{key === 'orders' && pending > 0 && <b>{pending}</b>}</button>)}</nav>
        <button className="adm-logout" onClick={() => { logout(); navigate('/login'); }}><LogOut size={18} />Déconnexion</button>
        <div className="adm-sidebar-footer"><ShieldCheck size={26} /><strong>Administrateur</strong><span>Gestion des livraisons Livreo</span><div className="adm-city" aria-hidden="true">▂ ▃ ▆ ▄ ▂ ▅ ▃ ▆ ▂</div></div>
        <Link className="adm-back-home" to="/">Retour à l’accueil<ArrowRight size={14} /></Link>
      </aside>
      <div className="adm-workspace">
        <header className="adm-topbar"><button className="adm-icon-button adm-menu-toggle" onClick={() => { if (window.matchMedia('(max-width: 767px)').matches) setSidebarOpen(!sidebarOpen); else setCollapsed(!collapsed); }} aria-label="Afficher ou masquer le menu"><Menu size={20} /></button><form className="adm-search" onSubmit={(event) => { event.preventDefault(); if (section === 'dashboard') { setParams({ section: 'orders' }); setPage(1); } }}><Search size={18} /><input aria-label="Rechercher dans la section" placeholder={['drivers', 'sellers'].includes(section) ? 'Rechercher un nom, un email, un téléphone…' : 'Rechercher une commande, un livreur…'} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />{query && <button type="button" onClick={() => { setQuery(''); setPage(1); }} aria-label="Effacer la recherche"><X size={15} /></button>}</form><div className="adm-topbar-right"><button className="adm-notification adm-icon-button" onClick={() => go('activity')} aria-label="Voir l’activité récente"><Bell size={20} />{pending > 0 && <b>{pending}</b>}</button><div className="adm-profile"><span className="adm-avatar">{firstName.slice(0, 1).toUpperCase()}</span><span>{firstName}<small>Administrateur</small></span><ChevronDown size={14} /></div></div></header>
        <main className="adm-main">
          <div className="adm-page-heading"><div><span className="adm-eyebrow">ESPACE ADMINISTRATION</span><h1>{section === 'dashboard' ? <><span className="adm-wave" aria-hidden="true">👋</span>Bonjour {firstName} !</> : heading}</h1><p>{section === 'dashboard' ? 'Voici un aperçu de votre activité.' : 'Organisez et suivez vos livraisons au même endroit.'}</p></div><div className="adm-heading-actions"><span className="adm-date"><CalendarDays size={16} />{updatedAt ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Indian/Antananarivo', day: 'numeric', month: 'long', year: 'numeric' }).format(updatedAt) : 'Chargement…'}</span><button className="adm-icon-button" disabled={loading || busy} onClick={refresh} aria-label="Actualiser les données"><RefreshCw className={loading ? 'adm-spinning' : ''} size={18} /></button></div></div>
          {loading && !updatedAt && <p className="adm-feedback" role="status">Chargement des données Livreo…</p>}
          {failures.length > 0 && <div className="adm-feedback error" role="alert"><AlertCircle size={18} /><span>Chargement impossible : {failures.join(', ')}. Les dernières données disponibles sont conservées.</span><button onClick={refresh} disabled={loading}>Réessayer</button></div>}
          {notice && <div className={`adm-feedback ${notice.type}`} role="status">{notice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{notice.text}</span><button className="adm-icon-button" onClick={() => setNotice(null)} aria-label="Fermer le message"><X size={15} /></button></div>}
          {section === 'dashboard' && <>
            <div className="adm-metrics">{[
              { title: 'Total commandes', value: data.stats?.totalOrders, caption: `${pending} en attente de validation`, icon: ShoppingCart, tone: 'blue', field: 'orders', color: '#0860f5' },
              { title: 'Livraisons en cours', value: data.stats?.inRouteDeliveries, caption: `${freshCount} livreur(s) avec GPS récent`, icon: Truck, tone: 'green', field: 'started', color: '#22c55e' },
              { title: 'Livraisons terminées', value: data.stats?.completedDeliveries, caption: `${data.stats?.failedDeliveries ?? '—'} livraison(s) en échec`, icon: CheckCircle2, tone: 'purple', field: 'delivered', color: '#a855f7' },
              { title: 'Montant encaissé', value: data.stats ? money(data.stats.totalCollected) : null, caption: `Frais : ${data.stats ? money(data.stats.totalDeliveryFees) : '—'}`, icon: Wallet, tone: 'orange', field: 'collected', color: '#f59e0b' },
            ].map(({ title, value, caption, icon: Icon, tone, field, color }) => <section className={`adm-metric tone-${tone}`} key={title}><span className="adm-metric-icon"><Icon size={25} /></span><div><h2>{title}</h2><strong>{value ?? '—'}</strong><p>{caption}</p></div>{data.orders && data.deliveries && <ActivityChart compact buckets={recentBuckets} field={field} color={color} chartId={`spark-${tone}`} />}</section>)}</div>
            <div className="adm-dashboard-grid"><Panel title="Évolution des commandes" icon={BarChart3} action={<div className="adm-periods">{[7, 30, 90].map((period) => <button key={period} className={days === period ? 'active' : ''} onClick={() => setDays(period)} aria-pressed={days === period}>{period}j</button>)}</div>}><div className="adm-chart-legend"><span><i />Commandes</span><span><i />Livraisons terminées</span></div>{data.orders && data.deliveries ? <ActivityChart buckets={buckets} /> : <Empty>Les données du graphique ne sont pas disponibles.</Empty>}</Panel>{mapPanel()}<Panel title="Dernières commandes" icon={ShoppingCart} className="adm-recent-orders" action={<button className="adm-text-button" onClick={() => go('orders')}>Voir tout<ArrowRight size={14} /></button>}>{orderTable(filteredOrders.slice(0, 5), true)}</Panel><Panel title="Activité récente" icon={Bell} action={<button className="adm-text-button" onClick={() => go('activity')}>Voir tout<ArrowRight size={14} /></button>}>{activityList()}</Panel></div>
          </>}
          {section === 'orders' && <Panel title="Gestion des commandes" icon={ShoppingCart} action={<span className="adm-muted">{filteredOrders.length} commande(s)</span>}><div className="adm-toolbar"><label>Statut<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Tous les statuts</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button className="adm-secondary-button" onClick={() => go('dispatch')}><Route size={16} />Affecter les livraisons</button></div>{orderTable(filteredOrders.slice((page - 1) * pageSize, page * pageSize))}<div className="adm-pagination"><span>{filteredOrders.length} résultat(s) · Page {page} sur {Math.max(1, Math.ceil(filteredOrders.length / pageSize))}</span><button className="adm-icon-button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Page précédente"><ChevronLeft size={18} /></button><button className="adm-icon-button" disabled={page * pageSize >= filteredOrders.length} onClick={() => setPage(page + 1)} aria-label="Page suivante"><ChevronRight size={18} /></button></div></Panel>}
          {section === 'dispatch' && <Panel title="Organisation et affectation des courses" icon={Route}><div className="adm-toolbar"><label>Statut<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tous les statuts</option>{Object.entries(statusLabels).filter(([key]) => key !== 'EN_ATTENTE').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><span className="adm-muted">Ajoutez les consignes du trajet lors de l’affectation.</span></div><div className="adm-table-scroll"><table className="adm-table"><thead><tr><th>Livraison</th><th>Client et destination</th><th>Livreur</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{filteredDeliveries.map((delivery) => <tr key={delivery.id}><td><strong>{delivery.trackingCode}</strong><small>{delivery.notes}</small></td><td>{delivery.order?.customerName}<small>{delivery.order?.deliveryAddress} · {delivery.order?.zone?.nom}</small></td><td>{delivery.deliveryPerson?.nom ?? 'Non affectée'}</td><td><Badge status={delivery.status} /></td><td><div className="adm-row-actions">{assignable.includes(delivery.status) && <button className="adm-small-button" disabled={busy || !activeDrivers.length} onClick={() => openModal({ kind: 'assign', delivery })}>{delivery.deliveryPerson ? 'Réaffecter' : 'Affecter'}</button>}{delivery.status === 'ECHEC' && <button className="adm-small-button" disabled={busy} onClick={() => openModal({ kind: 'reprogram', delivery })}>Reprogrammer</button>}<button className="adm-icon-button" title="Voir le détail" onClick={() => showOrder(delivery.order)}><Eye size={16} /></button></div></td></tr>)}</tbody></table>{!filteredDeliveries.length && <Empty>Aucune livraison à afficher.</Empty>}</div>{!activeDrivers.length && <p className="adm-inline-note">Créez ou activez un compte livreur pour affecter une course.</p>}</Panel>}
          {['drivers', 'sellers'].includes(section) && <Panel title={section === 'drivers' ? 'Équipe de livraison' : 'Comptes vendeurs'} icon={section === 'drivers' ? Truck : Store} action={<button className="adm-primary-button" onClick={() => openModal({ kind: 'user', role: personRole })}><Plus size={16} />{section === 'drivers' ? 'Ajouter un livreur' : 'Ajouter un vendeur'}</button>}><div className="adm-table-scroll"><table className="adm-table"><thead><tr><th>Nom</th><th>Contact</th><th>{section === 'drivers' ? 'Courses en cours / affectées' : 'Commandes'}</th><th>Compte</th><th>Action</th></tr></thead><tbody>{filteredUsers.map((account) => <tr key={account.id}><td><div className="adm-person"><span className="adm-avatar small">{account.nom.slice(0, 1)}</span><strong>{account.nom}</strong></div></td><td>{account.email}<small>{account.telephone || 'Téléphone non renseigné'}</small></td><td>{section === 'drivers' ? deliveries.filter((delivery) => delivery.deliveryPersonId === account.id && ['AFFECTEE', 'EN_ROUTE'].includes(delivery.status)).length : orders.filter((order) => order.sellerId === account.id).length}</td><td><span className={`adm-badge ${account.isActive ? 'status-LIVREE' : 'status-ECHEC'}`}><span />{account.isActive ? 'Actif' : 'Suspendu'}</span></td><td><button className="adm-secondary-button" disabled={busy} onClick={() => openModal({ kind: 'toggle', account })}>{account.isActive ? 'Suspendre' : 'Activer'}</button></td></tr>)}</tbody></table>{!filteredUsers.length && <Empty>Aucun compte à afficher.</Empty>}</div></Panel>}
          {section === 'map' && mapPanel(true)}
          {section === 'zones' && <Panel title="Zones de livraison et frais associés" icon={MapPin} action={<button className="adm-primary-button" onClick={() => openModal({ kind: 'zone' })}><Plus size={16} />Ajouter une zone</button>}><div className="adm-zone-grid">{zones.filter((zone) => matches(query, zone.nom, zone.description)).map((zone) => <article className="adm-zone" key={zone.id}><span className="adm-zone-icon"><MapPin size={24} /></span><h3>{zone.nom}</h3><p>{zone.description || 'Zone de livraison active'}</p><strong>{money(zone.fraisLivraison)}</strong><small>Frais par livraison</small></article>)}</div>{!zones.length && <Empty>Aucune zone disponible.</Empty>}</Panel>}
          {section === 'collections' && <Panel title="Encaissements à la livraison" icon={Wallet} action={<span className="adm-total">{data.stats ? money(data.stats.totalCollected) : '—'}</span>}><p className="adm-inline-note">Montants effectivement déclarés par les livreurs pour les livraisons terminées.</p><div className="adm-table-scroll"><table className="adm-table"><thead><tr><th>Livraison</th><th>Livreur</th><th>Vendeur</th><th>Encaissé</th><th>Frais</th><th>Montant vendeur</th><th>Date</th></tr></thead><tbody>{deliveries.filter((delivery) => delivery.status === 'LIVREE' && delivery.collectedAmount != null && matches(query, delivery.trackingCode, delivery.deliveryPerson?.nom, delivery.order?.seller?.nom)).map((delivery) => <tr key={delivery.id}><td><button className="adm-text-button" onClick={() => showOrder(delivery.order)}>{delivery.trackingCode}</button></td><td>{delivery.deliveryPerson?.nom ?? '—'}</td><td>{delivery.order?.seller?.nom ?? '—'}</td><td>{money(delivery.collectedAmount)}</td><td>{money(delivery.order.deliveryFee)}</td><td>{money(delivery.sellerPayout ?? Math.max(0, delivery.collectedAmount - delivery.order.deliveryFee))}</td><td>{dateTime(delivery.completedAt)}</td></tr>)}</tbody></table>{!deliveries.some((delivery) => delivery.status === 'LIVREE' && delivery.collectedAmount != null) && <Empty>Aucun encaissement enregistré.</Empty>}</div></Panel>}
          {section === 'payouts' && <Panel title="Montants calculés pour les vendeurs" icon={Banknote}><div className="adm-inline-note"><CircleHelp size={18} /><span>Calcul : montant encaissé moins frais de livraison. L’enregistrement des versements effectués n’est pas encore disponible ; ces montants ne constituent pas un état des paiements.</span></div><div className="adm-table-scroll"><table className="adm-table"><thead><tr><th>Vendeur</th><th>Livraisons encaissées</th><th>Montant encaissé</th><th>Frais</th><th>Montant calculé</th></tr></thead><tbody>{balances.filter((row) => matches(query, row.name)).map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.count}</td><td>{money(row.collected)}</td><td>{money(row.fees)}</td><td><strong className="adm-blue">{money(row.due)}</strong></td></tr>)}</tbody></table>{!balances.length && <Empty>Aucun montant vendeur calculé.</Empty>}</div></Panel>}
          {section === 'activity' && <Panel title="Derniers changements et commandes reçues" icon={Bell}><p className="adm-inline-note">Dernier état des livraisons. L’historique horodaté complet est consultable dans le détail de chaque commande.</p>{activityList(true)}</Panel>}
          <footer className="adm-workspace-footer"><span>Livreo · Administration des livraisons</span><span>{updatedAt ? `Dernière actualisation : ${dateTime(updatedAt)}` : 'Connexion aux données…'} · Actualisation toutes les 15 s</span></footer>
        </main>
      </div>
      {modal && <Dialog title={{ detail: 'Détail de la commande', assign: 'Affecter une livraison', user: modal.role === 'DELIVERY' ? 'Nouveau livreur' : 'Nouveau vendeur', zone: 'Nouvelle zone de livraison', toggle: modal.account?.isActive ? 'Suspendre le compte' : 'Activer le compte', reprogram: 'Reprogrammer la livraison' }[modal.kind]} onClose={closeModal}>
        {actionError && <p className="adm-feedback error" role="alert">{actionError}</p>}
        {modal.kind === 'detail' && <div className="adm-order-detail">{detailError ? <p className="adm-feedback error" role="alert">{detailError}</p> : !detail ? <p role="status">Chargement de la commande…</p> : <><div className="adm-detail-top"><strong>{detail.delivery?.trackingCode ?? `CMD-${detail.id.slice(0, 8).toUpperCase()}`}</strong><Badge status={detail.status} /></div><dl><div><dt>Client</dt><dd>{detail.customerName} · {detail.customerPhone}</dd></div><div><dt>Destination</dt><dd>{detail.deliveryAddress}<br />{detail.deliveryDetails}</dd></div><div><dt>Vendeur</dt><dd>{detail.seller?.nom}</dd></div><div><dt>Livreur</dt><dd>{detail.delivery?.deliveryPerson?.nom ?? 'Non affecté'}</dd></div><div><dt>Paiement</dt><dd>{detail.paymentMethod === 'PREPAID' ? 'Prépayé' : 'À la réception'}</dd></div><div><dt>Total / frais</dt><dd>{money(detail.totalAmount)} / {money(detail.deliveryFee)}</dd></div>{detail.delivery?.collectedAmount != null && <div><dt>Encaissé</dt><dd>{money(detail.delivery.collectedAmount)}</dd></div>}{detail.delivery?.failureReason && <div><dt>Motif d’échec</dt><dd>{detail.delivery.failureReason}</dd></div>}{detail.delivery?.notes && <div><dt>Consignes</dt><dd>{detail.delivery.notes}</dd></div>}</dl><h3>Articles</h3><ul className="adm-items">{detail.items.map((item) => <li key={item.id}><span>{item.quantity} × {item.productName}</span><strong>{money(item.totalPrice)}</strong></li>)}</ul><h3>Historique horodaté</h3><ol className="adm-timeline"><li><span />Commande enregistrée<small>{dateTime(detail.createdAt)}</small></li>{[...(detail.delivery?.statusHistories ?? [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((event) => <li key={event.id}><span /><strong>{statusLabels[event.status] ?? event.status}</strong><small>{dateTime(event.createdAt)}{event.changedBy ? ` · ${event.changedBy.nom}` : ''}</small>{event.comment && <p>{event.comment}</p>}</li>)}</ol>{detail.delivery?.trackingCode && <Link className="adm-primary-button" to={`/tracking?code=${encodeURIComponent(detail.delivery.trackingCode)}`}>Ouvrir le suivi client<ArrowRight size={16} /></Link>}</>}</div>}
        {modal.kind === 'assign' && <form className="adm-form" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); void mutate(() => api.patch(`/deliveries/${modal.delivery.id}/assign`, { deliveryPersonId: values.get('deliveryPersonId'), notes: values.get('notes') }), 'Livraison affectée au livreur.'); }}><p><strong>{modal.delivery.trackingCode}</strong> · {modal.delivery.order.customerName}<br />{modal.delivery.order.deliveryAddress}</p><label>Livreur actif<select name="deliveryPersonId" required defaultValue={activeDrivers.some((driver) => driver.id === modal.delivery.deliveryPersonId) ? modal.delivery.deliveryPersonId : ''}><option value="" disabled>Sélectionner un livreur</option>{activeDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.nom} · {driver.telephone || 'Sans téléphone'}</option>)}</select></label><label>Consignes pour le trajet<textarea name="notes" rows={3} defaultValue={modal.delivery.notes ?? ''} placeholder="Ordre de passage, point de rendez-vous…" /></label><button className="adm-primary-button" disabled={busy || !activeDrivers.length}>{busy ? 'Affectation…' : 'Confirmer l’affectation'}</button></form>}
        {modal.kind === 'user' && <form className="adm-form" onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); void mutate(() => api.post('/users', { ...values, role: modal.role }), 'Compte créé avec succès.'); }}><label>Nom complet<input name="nom" required maxLength={120} autoComplete="name" /></label><label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Téléphone<input name="telephone" type="tel" autoComplete="tel" /></label><label>Mot de passe initial<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label><button className="adm-primary-button" disabled={busy}>{busy ? 'Création…' : 'Créer le compte'}</button></form>}
        {modal.kind === 'zone' && <form className="adm-form" onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); void mutate(() => api.post('/zones', { ...values, fraisLivraison: Number(values.fraisLivraison) }), 'Zone de livraison ajoutée.'); }}><label>Nom de la zone<input name="nom" required maxLength={120} /></label><label>Description<textarea name="description" rows={3} /></label><label>Frais de livraison (Ar)<input name="fraisLivraison" type="number" min="0" step="1" required /></label><button className="adm-primary-button" disabled={busy}>{busy ? 'Création…' : 'Ajouter la zone'}</button></form>}
        {modal.kind === 'toggle' && <div className="adm-form"><p>{modal.account.isActive ? 'Suspendre' : 'Réactiver'} le compte de <strong>{modal.account.nom}</strong> ? {modal.account.isActive && 'La connexion sera bloquée jusqu’à sa réactivation.'}</p><div className="adm-dialog-actions"><button className="adm-secondary-button" disabled={busy} onClick={closeModal}>Annuler</button><button className="adm-primary-button" disabled={busy} onClick={() => mutate(() => api.patch(`/users/${modal.account.id}/toggle-status`), `Compte ${modal.account.isActive ? 'suspendu' : 'activé'}.`)}>{busy ? 'Enregistrement…' : 'Confirmer'}</button></div></div>}
        {modal.kind === 'reprogram' && <form className="adm-form" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); void mutate(() => api.patch(`/deliveries/${modal.delivery.id}/status`, { status: 'REPROGRAMMEE', comment: values.get('comment') }), 'Livraison à reprogrammer. Vous pouvez maintenant l’affecter.'); }}><p>{modal.delivery.trackingCode} · Motif d’échec : <strong>{modal.delivery.failureReason}</strong></p><label>Décision et consignes<textarea name="comment" required rows={3} /></label><button className="adm-primary-button" disabled={busy}>{busy ? 'Enregistrement…' : 'Confirmer la reprogrammation'}</button></form>}
      </Dialog>}
    </div>
  );
}



