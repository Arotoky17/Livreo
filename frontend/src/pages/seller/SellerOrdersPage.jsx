import useStatisticsIntro from '../../hooks/useStatisticsIntro.js';
import StatisticValue from '../../components/ui/StatisticValue.jsx';
import OrderRateRings from '../../components/ui/OrderRateRings.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Plus, FileUp, Truck, Wallet, UserRound, Search, Eye, ArrowRight, CheckCircle2, Package } from 'lucide-react';
import PortalLayout from '../../components/navigation/PortalLayout.jsx';
import { Badge, Empty, Panel, Dialog } from '../../components/ui/PortalUI.jsx';
import ActivityChart from '../../components/ui/ActivityChart.jsx';
import DeliveryProgress from '../../components/delivery/DeliveryProgress.jsx';
import useApiResources from '../../hooks/useApiResources.js';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import OrderImport from './OrderImport.jsx';
import OrderWizard from './OrderWizard.jsx';
import { money, dateTime, statusLabels, dailyActivity, matches, orderPeriodTotals } from '../../utils/adminMetrics.js';
const resources = [['orders', '/orders', 'orders', 'commandes'], ['stats', '/stats', 'stats', 'indicateurs'], ['zones', '/zones', 'zones', 'zones']];
const navigation = [['dashboard', 'Tableau de bord', LayoutDashboard], ['orders', 'Mes commandes', ShoppingCart], ['new', 'Créer une vente', Plus], ['import', 'Importer des commandes', FileUp], ['deliveries', 'Livraisons', Truck], ['payouts', 'Reversements', Wallet], ['profile', 'Mon profil', UserRound]];

function usePayoutDetails(orders, enabled) {
  const signature = orders.filter((order) => order.status === 'LIVREE').map((order) => `${order.id}:${order.updatedAt}`).join('|');
  const [result, setResult] = useState({ signature: null, rows: [], error: '' });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    async function load() {
      const ids = signature ? signature.split('|').map((entry) => entry.split(':')[0]) : [];
      const responses = [];
      for (let index = 0; index < ids.length; index += 4) {
        if (controller.signal.aborted) return;
        responses.push(...await Promise.allSettled(ids.slice(index, index + 4).map((id) => api.get(`/orders/${id}`, { signal: controller.signal }))));
      }
      if (controller.signal.aborted) return;
      setResult({ signature, rows: responses.filter((response) => response.status === 'fulfilled').map((response) => response.value.data.order), error: responses.some((response) => response.status === 'rejected') ? 'Certains détails financiers sont indisponibles. Les totaux ci-dessus proviennent du tableau de bord.' : '' });
    }
    void load();
    return () => controller.abort();
  }, [signature, enabled]);
  return { ...result, loading: enabled && result.signature !== signature };
}
export default function SellerOrdersPage() {
  const { user } = useAuth();
  const { data, errors, updatedAt, refresh } = useApiResources(resources);
  const progress = useStatisticsIntro(Boolean(data.stats));
  const [params, setParams] = useSearchParams();
  const section = navigation.some(([key]) => key === params.get('section')) ? params.get('section') : 'dashboard';
  const [query, setQuery] = useState(''), [status, setStatus] = useState(''), [page, setPage] = useState(1);
  const [success, setSuccess] = useState(''), [detail, setDetail] = useState(null), [detailError, setDetailError] = useState(''), [detailOpen, setDetailOpen] = useState(false);
  const detailRequest = useRef(0);
  const orders = data.orders ?? [];
  const financials = usePayoutDetails(orders, section === 'payouts');
  const rows = orders.filter((order) => (section !== 'deliveries' || !!order.delivery) && (!status || order.status === status) && matches(query, order.customerName, order.customerPhone, order.deliveryAddress, order.delivery?.trackingCode));
  const buckets = dailyActivity(orders, [], 30, updatedAt?.getTime() ?? 0);
  const go = (key) => { setParams(key === 'dashboard' ? {} : { section: key }); setPage(1); setStatus(''); setQuery(''); };
  const closeDetail = useCallback(() => { detailRequest.current++; setDetailOpen(false); }, []);
  async function inspect(order) {
    const request = ++detailRequest.current;
    setDetail(null); setDetailError(''); setDetailOpen(true);
    try { const response = await api.get(`/orders/${order.id}`); if (request === detailRequest.current) setDetail(response.data.order); }
    catch (err) { if (request === detailRequest.current) setDetailError(err.response?.data?.message || 'Le détail de la commande est indisponible.'); }
  }
  function table(entries) {
    return <div className="adm-table-scroll"><table className="adm-table"><thead><tr><th>Commande</th><th>Client</th><th>Articles</th><th>Total / frais</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{entries.map((order) => <tr key={order.id}><td><strong>{order.delivery?.trackingCode ?? `CMD-${order.id.slice(0, 8).toUpperCase()}`}</strong><small>{dateTime(order.createdAt)}</small></td><td>{order.customerName}<small>{order.customerPhone}<br />{order.deliveryAddress}</small></td><td>{order.items.map((item) => `${item.quantity} × ${item.productName}`).join(', ')}</td><td>{money(order.totalAmount)}<small>{order.zone?.nom} · Frais : {money(order.deliveryFee)}</small></td><td><Badge status={order.status} /></td><td><div className="adm-row-actions"><button className="adm-icon-button" onClick={() => inspect(order)} aria-label={`Voir la commande de ${order.customerName}`}><Eye size={17} /></button>{order.delivery?.trackingCode && <Link className="adm-text-button" to={`/tracking?code=${encodeURIComponent(order.delivery.trackingCode)}`}>Suivi<ArrowRight size={14} /></Link>}</div></td></tr>)}</tbody></table>{!entries.length && <Empty>{data.orders === null ? 'Chargement des commandes…' : 'Aucune commande à afficher.'}</Empty>}</div>;
  }
  return <PortalLayout title={section === 'dashboard' ? `Bonjour ${user?.nom?.split(' ')[0] ?? ''} !` : navigation.find(([key]) => key === section)?.[1]} subtitle="Vos ventes en live, de la commande à la livraison." navigation={navigation} section={section} onSection={go} onRefresh={refresh} action={section !== 'new' && <button className="adm-primary-button" onClick={() => go('new')}><Plus size={16} />Créer une vente</button>}>
    {errors.length > 0 && <div className="adm-feedback error" role="alert">Données indisponibles : {errors.join(', ')}.<button onClick={refresh}>Réessayer</button></div>}
    {success && <div className="adm-feedback success" role="status"><CheckCircle2 size={17} />{success}<button onClick={() => setSuccess('')}>Fermer</button></div>}
    {section === 'dashboard' && <><div className="adm-metrics">{[[ShoppingCart, 'Mes commandes', data.stats?.totalOrders, 'blue'], [Truck, 'En livraison', data.stats?.inRouteDeliveries, 'purple'], [CheckCircle2, 'Livrées', data.stats?.completedDeliveries, 'green'], [Wallet, 'Montant vendeur calculé', data.stats?.totalSellerPayout, 'orange', money]].map(([Icon, label, value, tone, format]) => <section className={`adm-metric tone-${tone}`} key={label}><span className="adm-metric-icon"><Icon size={24} /></span><div><h2>{label}</h2><strong><StatisticValue value={value} progress={progress} format={format} /></strong><p>{tone === 'orange' ? 'Encaissements moins frais de livraison' : 'Données de vos commandes'}</p></div></section>)}</div><div className="adm-dashboard-grid"><Panel title="Commandes des 30 derniers jours" icon={ShoppingCart}>{data.orders ? <div><OrderRateRings progress={progress} totals={orderPeriodTotals(orders, buckets)} /><ActivityChart buckets={buckets} showDelivered={false} /></div> : <Empty>Chargement…</Empty>}</Panel><Panel title="Dernières commandes" icon={Package} action={<button className="adm-text-button" onClick={() => go('orders')}>Voir toutes<ArrowRight size={14} /></button>}><div className="portal-recent-list">{orders.slice(0, 5).map((order) => <button key={order.id} onClick={() => inspect(order)}><span className="portal-order-icon"><Package size={19} /></span><span><strong>{order.customerName}</strong><small>{order.delivery?.trackingCode ?? dateTime(order.createdAt)}</small></span><Badge status={order.status} /></button>)}{!orders.length && <Empty>Aucune commande enregistrée.</Empty>}</div></Panel></div></>}
    {['orders', 'deliveries'].includes(section) && <Panel title={section === 'orders' ? 'Historique de mes commandes' : 'Suivi de mes livraisons'} icon={ShoppingCart}><div className="adm-toolbar"><div className="portal-search"><Search size={17} /><input aria-label="Rechercher une commande" placeholder="Client, téléphone, code de suivi…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></div><select aria-label="Filtrer par statut" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Tous les statuts</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>{table(rows.slice((page - 1) * 10, page * 10))}<div className="adm-pagination"><span>{rows.length} résultat(s) · Page {page}</span><button className="adm-secondary-button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédent</button><button className="adm-secondary-button" disabled={page * 10 >= rows.length} onClick={() => setPage(page + 1)}>Suivant</button></div></Panel>}
    {section === 'new' && <OrderWizard key="new-order" zones={data.zones ?? []} onCancel={() => go('orders')} onCreated={() => { setSuccess('Vente enregistrée. La livraison est prête à être affectée.'); go('orders'); void refresh(); }} />}
    {section === 'import' && <OrderImport zones={data.zones ?? []} onImported={({ created, skipped }) => {
      setSuccess(`${created.length} commande(s) importée(s), ${skipped} doublon(s) ignoré(s).`);
      go('orders');
      void refresh();
    }} />}
    {section === 'payouts' && <Panel title="Montants calculés pour vos commandes" icon={Wallet} action={<span className="adm-total">{data.stats ? money(data.stats.totalSellerPayout) : '—'}</span>}><p className="adm-inline-note">Encaissements déclarés moins frais de livraison. L’enregistrement des versements effectués n’est pas encore disponible.</p>{financials.error && <p className="adm-feedback error">{financials.error}</p>}{financials.loading ? <Empty>Chargement des détails financiers…</Empty> : <div className="adm-table-scroll"><table className="adm-table"><thead><tr><th>Commande livrée</th><th>Encaissé</th><th>Frais</th><th>Montant vendeur</th><th>Date</th></tr></thead><tbody>{financials.rows.map((order) => <tr key={order.id}><td>{order.delivery?.trackingCode}</td><td>{order.delivery?.collectedAmount == null ? 'Non renseigné' : money(order.delivery.collectedAmount)}</td><td>{money(order.deliveryFee)}</td><td>{order.delivery?.sellerPayout == null ? 'Non calculé' : money(order.delivery.sellerPayout)}</td><td>{dateTime(order.delivery?.completedAt)}</td></tr>)}</tbody></table>{!financials.rows.length && <Empty>Aucune commande livrée pour le moment.</Empty>}</div>}</Panel>}
    {section === 'profile' && <Panel title="Mon profil" icon={UserRound}><dl className="portal-profile"><div><dt>Nom</dt><dd>{user?.nom}</dd></div><div><dt>Email</dt><dd>{user?.email}</dd></div><div><dt>Téléphone</dt><dd>{user?.telephone || 'Non renseigné'}</dd></div><div><dt>Rôle</dt><dd>Vendeur</dd></div></dl><p className="adm-inline-note">Les comptes sont gérés par l’administrateur. Contactez-le pour modifier vos informations.</p></Panel>}
    {detailOpen && <Dialog title="Détail de votre commande" onClose={closeDetail}>{detailError ? <p className="adm-feedback error" role="alert">{detailError}</p> : !detail ? <Empty>Chargement…</Empty> : <div className="adm-order-detail"><div className="adm-detail-top"><strong>{detail.delivery?.trackingCode ?? 'En attente de validation'}</strong><Badge status={detail.status} /></div><DeliveryProgress status={detail.status} timeline={detail.delivery?.statusHistories} /><dl><div><dt>Client</dt><dd>{detail.customerName} · {detail.customerPhone}</dd></div><div><dt>Adresse</dt><dd>{detail.deliveryAddress} · {detail.zone?.nom}</dd></div><div><dt>Montant total</dt><dd>{money(detail.totalAmount)}</dd></div><div><dt>Frais</dt><dd>{money(detail.deliveryFee)}</dd></div><div><dt>Paiement</dt><dd>{detail.paymentMethod === 'PREPAID' ? 'Prépayé' : 'À la réception'}</dd></div></dl><ul className="adm-items">{detail.items.map((item) => <li key={item.id}><span>{item.quantity} × {item.productName}</span><strong>{money(item.totalPrice)}</strong></li>)}</ul>{detail.delivery?.failureReason && <p className="adm-feedback error">Motif d’échec : {detail.delivery.failureReason}</p>}{detail.delivery?.trackingCode && <Link className="adm-primary-button" to={`/tracking?code=${encodeURIComponent(detail.delivery.trackingCode)}`}>Ouvrir le suivi<ArrowRight size={16} /></Link>}</div>}</Dialog>}
  </PortalLayout>;
}

