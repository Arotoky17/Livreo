import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Package, MapPin, CheckCircle2, AlertCircle, RefreshCw, Truck, Phone, ShieldCheck, ArrowRight } from 'lucide-react';
import MapComponent from '../../components/delivery/MapComponent.jsx';
import api from '../../services/api.js';
import { money, dateTime } from '../../utils/adminMetrics.js';
import '../../styles/AdminDashboard.css';
import '../../styles/Portals.css';

const messages = {
  VALIDEE: 'Livraison en pr?paration',
  AFFECTEE: 'Livraison en pr?paration',
  EN_ROUTE: 'Livraison en cours',
  LIVREE: 'Livraison termin?e',
  ECHEC: 'Livraison non effectu?e',
  REPROGRAMMEE: 'Livraison ? reprogrammer',
  ANNULEE: 'Livraison annul?e',
};

export default function PublicTrackingPage() {
  const [params, setParams] = useSearchParams();
  const requested = (params.get('code') ?? '').trim().toUpperCase();
  const [draft, setDraft] = useState({ forCode: requested, value: requested });
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ code: null, tracking: null, error: '', at: null, checkedAt: 0 });
  const input = draft.forCode === requested ? draft.value : requested;
  useEffect(() => {
    if (!requested) return;
    const controller = new AbortController();
    let pending = false;
    async function fetchTracking() {
      if (pending || controller.signal.aborted) return;
      pending = true;
      try {
        const response = await api.get(`/tracking/${encodeURIComponent(requested)}`, { signal: controller.signal, timeout: 12000 });
        if (!controller.signal.aborted) setResult({ code: requested, tracking: response.data.tracking, error: '', at: new Date(), checkedAt: Date.now() });
      } catch (error) {
        if (!controller.signal.aborted) setResult((previous) => ({ code: requested, tracking: previous.code === requested && ![404, 400].includes(error.response?.status) ? previous.tracking : null, error: error.response?.data?.message || 'Actualisation impossible. Vérifiez votre connexion. Les dernières informations reçues peuvent être anciennes.', at: previous.code === requested ? previous.at : null, checkedAt: Date.now() }));
      } finally { pending = false; }
    }
    void fetchTracking();
    const timer = setInterval(() => { if (!document.hidden) void fetchTracking(); }, 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [requested, version]);
  const tracking = requested && result.code === requested ? result.tracking : null;
  const deliveryPerson = tracking?.deliveryPerson;
  const phone = deliveryPerson?.telephone?.trim();
  const error = result.code === requested ? result.error : '';
  const location = tracking?.status === 'EN_ROUTE' ? tracking.currentLocation : null;
  const outdated = !!location && (location.isOutdated || result.checkedAt - new Date(location.recordedAt).getTime() > 180000);
  const markers = location ? [{ lat: location.latitude, lng: location.longitude, title: tracking.deliveryPerson?.nom ?? 'Livreur Livreo', details: `Dernier signal : ${dateTime(location.recordedAt)}`, isOutdated: outdated }] : [];
  const loading = !!requested && result.code !== requested;

  function retry() {
    if (!tracking) setResult((previous) => ({ ...previous, code: null, error: '' }));
    setVersion((previous) => previous + 1);
  }
  return <main className="admin-app public-tracking"><div className="tracking-container">
    <section className="tracking-search-card"><div><span className="tracking-label"><ShieldCheck size={16} />Sans compte · Suivi sécurisé par code</span><h1>Suivez votre commande</h1><p>Entrez le code transmis par votre vendeur pour connaître l’état de votre livraison.</p><form onSubmit={(event) => { event.preventDefault(); const code = input.trim().toUpperCase(); if (!code) return; if (code === requested) retry(); else setParams({ code }); }}><label><Search size={19} /><span className="sr-only">Code de suivi</span><input required aria-label="Code de suivi" value={input} onChange={(event) => setDraft({ forCode: requested, value: event.target.value })} placeholder="Code de suivi : LIV-XXXXX" autoComplete="off" spellCheck={false} /></label><button className="adm-primary-button" type="submit"><Search size={18} />Suivre</button></form></div><div className="tracking-package-art" aria-hidden="true"><MapPin /><Package /><span><CheckCircle2 size={21} />Votre colis, en toute confiance</span></div></section>
    {loading && <p className="adm-feedback" role="status">Recherche de votre livraison…</p>}
    {error && <div className="adm-feedback error" role="alert"><AlertCircle size={19} /><span>{error}</span><button onClick={retry}>Réessayer</button></div>}
    {tracking && <section className="tracking-result adm-panel"><div className="tracking-result-main"><div className={`tracking-result-icon ${['ECHEC', 'ANNULEE'].includes(tracking.status) ? 'failed' : ''}`}>{tracking.status === 'EN_ROUTE' ? <Truck size={28} /> : ['ECHEC', 'ANNULEE'].includes(tracking.status) ? <AlertCircle size={28} /> : <CheckCircle2 size={28} />}</div><h2>{messages[tracking.status] ?? 'Suivi de votre commande'}</h2><p>Code : <strong>{tracking.trackingCode}</strong></p>{deliveryPerson && <div className="tracking-driver">
      <strong>Livreur : {deliveryPerson.nom}</strong>
      {phone && <a href={`tel:${phone.replace(/[^+0-9]/g, '')}`}><Phone size={16} aria-hidden="true" />{phone}</a>}
    </div>}<div className="tracking-update"><RefreshCw size={13} />Actualisé le {dateTime(result.at)} · Toutes les 15 s</div>{tracking.failureReason && <p className="adm-feedback error">Motif : {tracking.failureReason}</p>}</div><div className="tracking-result-map"><MapComponent markers={markers} height="340px" /><p><MapPin size={15} />{location ? `Dernière position : ${dateTime(location.recordedAt)}` : tracking.status === 'LIVREE' ? 'Livraison terminée : le partage GPS est arrêté.' : 'La carte sera mise à jour quand le livreur démarrera la course et transmettra sa position.'}</p>{outdated && <div className="tracking-old-signal" role="status"><AlertCircle size={16} />Signal ancien de plus de 3 minutes. Cette position n’est pas en temps réel.</div>}</div></section>}
    {!tracking && !loading && <section className="adm-panel tracking-empty-map"><div><h2><MapPin size={19} />Carte de suivi</h2><p>La position de votre livreur s’affichera ici pendant la livraison, lorsqu’un signal GPS sera disponible.</p></div><MapComponent markers={[]} height="300px" /></section>}
    {tracking && <section className="tracking-information adm-panel"><div><h3><Package size={18} />Votre livraison</h3><dl><div><dt>Destinataire</dt><dd>{tracking.recipient}</dd></div><div><dt>Adresse</dt><dd>{tracking.deliveryAddress} · {tracking.zoneName}</dd></div>{tracking.deliveryDetails && <div><dt>Repère</dt><dd>{tracking.deliveryDetails}</dd></div>}<div><dt>Paiement</dt><dd>{tracking.paymentMethod === 'PREPAID' ? 'Déjà payé au vendeur' : `À la réception : ${money(tracking.totalAmount)}`}</dd></div></dl><p className="portal-muted">{tracking.items.map((item) => `${item.quantity} × ${item.productName}`).join(', ')}</p></div></section>}
    <footer className="tracking-footer"><span><ShieldCheck size={16} />Seules les informations associées à votre code sont affichées.</span><Link to="/">Retour à l’accueil<ArrowRight size={15} /></Link></footer>
  </div></main>;
}

