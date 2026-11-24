import { useState } from 'react';
import { Plus, Trash2, ArrowLeft, ArrowRight, CheckCircle2, Package, MapPin, ClipboardCheck } from 'lucide-react';
import api from '../../services/api.js';
import { normalizeOrderItems } from '../../utils/deliveryRules.js';
import { money } from '../../utils/adminMetrics.js';
import '../../styles/Portals.css';

const initialForm = { customerName: '', customerPhone: '', deliveryAddress: '', deliveryDetails: '', zoneId: '', paymentMethod: 'CASH_ON_DELIVERY', notes: '' };
const initialItem = () => ({ productName: '', quantity: 1, unitPrice: '' });
export default function OrderWizard({ zones, onCreated, onCancel }) {
  const [step, setStep] = useState(0), [form, setForm] = useState(initialForm), [items, setItems] = useState([initialItem()]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const zone = zones.find((entry) => entry.id === form.zoneId);
  const products = items.reduce((total, item) => total + Number(item.quantity) * Number(item.unitPrice), 0);
  const fee = zone?.fraisLivraison ?? 0;
  const change = (name, value) => setForm((previous) => ({ ...previous, [name]: value }));
  const changeItem = (index, name, value) => setItems((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, [name]: value } : item));
  async function submit(event) {
    event.preventDefault(); setError('');
    try { normalizeOrderItems(items); } catch (err) { setError(err.message); return; }
    if (step === 1 && (!form.customerName.trim() || !form.customerPhone.trim() || !form.deliveryAddress.trim() || !zone)) { setError('Renseignez le nom, le téléphone, l’adresse et la zone de livraison.'); return; }
    if (step < 2) { setStep(step + 1); return; }
    if (busy) return;
    setBusy(true);
    try {
      await api.post('/orders', {
        ...form,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        deliveryAddress: form.deliveryAddress.trim(),
        items: normalizeOrderItems(items),
      });
      onCreated();
    } catch (err) { setError(err.response?.data?.message || 'La commande n’a pas pu être enregistrée. Réessayez.'); }
    finally { setBusy(false); }
  }
  return <section className="adm-panel order-wizard"><div className="wizard-progress" aria-label="Étape de la commande">{[[Package, 'Articles'], [MapPin, 'Livraison'], [ClipboardCheck, 'Confirmation']].map(([Icon, label], index) => <div key={label} className={step >= index ? 'active' : ''} aria-current={step === index ? 'step' : undefined}><span>{step > index ? <CheckCircle2 size={17} /> : index + 1}</span><Icon size={15} /><strong>{label}</strong></div>)}</div>
    {error && <p className="adm-feedback error" role="alert">{error}</p>}
    <form className="wizard-form" onSubmit={submit}>
      <div className="wizard-step" key={step}>
        {step === 0 && <><h2>Articles de la commande</h2><p className="portal-muted">Saisissez les articles à livrer.</p><div className="wizard-items">{items.map((item, index) => <div className="wizard-item" key={index}><span className="wizard-product-icon"><Package size={26} /></span><label className="wizard-product-name">Article<input required value={item.productName} placeholder="Nom de l’article" onChange={(event) => changeItem(index, 'productName', event.target.value)} maxLength={160} /></label><label>Prix unitaire (Ar)<input required type="number" min="0" step="1" value={item.unitPrice} onChange={(event) => changeItem(index, 'unitPrice', event.target.value)} /></label><label>Quantité<input required type="number" min="1" step="1" value={item.quantity} onChange={(event) => changeItem(index, 'quantity', event.target.value)} /></label><button type="button" className="adm-icon-button" disabled={items.length === 1} onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Supprimer l’article ${index + 1}`}><Trash2 size={17} /></button></div>)}</div><button className="adm-secondary-button" type="button" onClick={() => setItems([...items, initialItem()])}><Plus size={16} />Ajouter un article</button></>}
        {step === 1 && <><h2>Client et adresse de livraison</h2><div className="wizard-fields"><label>Nom du client<input value={form.customerName} required onChange={(event) => change('customerName', event.target.value)} autoComplete="name" /></label><label>Téléphone<input type="tel" value={form.customerPhone} required onChange={(event) => change('customerPhone', event.target.value)} autoComplete="tel" /></label><label className="full">Adresse de livraison<textarea value={form.deliveryAddress} required onChange={(event) => change('deliveryAddress', event.target.value)} rows={2} autoComplete="street-address" /></label><label>Zone de livraison<select required value={form.zoneId} onChange={(event) => change('zoneId', event.target.value)}><option value="" disabled>Sélectionner une zone</option>{zones.map((entry) => <option key={entry.id} value={entry.id}>{entry.nom} · {money(entry.fraisLivraison)}</option>)}</select></label><p className="full portal-muted">Coordonnées facultatives. Renseignez les deux valeurs pour afficher la destination sur la carte du livreur.</p>
          <label>Mode de paiement<select value={form.paymentMethod} onChange={(event) => change('paymentMethod', event.target.value)}><option value="CASH_ON_DELIVERY">Paiement à la réception</option><option value="PREPAID">Déjà payé au vendeur</option></select></label><label className="full">Repère ou indication complémentaire<input value={form.deliveryDetails} onChange={(event) => change('deliveryDetails', event.target.value)} /></label><label className="full">Notes<textarea value={form.notes} rows={2} onChange={(event) => change('notes', event.target.value)} /></label></div>{!zones.length && <p className="adm-feedback error">Aucune zone disponible. L’administrateur doit en créer une avant la saisie d’une commande.</p>}</>}
        {step === 2 && <><h2>Vérifiez votre commande</h2><div className="wizard-confirm"><div><h3>Destinataire</h3><strong>{form.customerName}</strong><p>{form.customerPhone}</p><p>{form.deliveryAddress}</p><p>{zone?.nom} {form.deliveryDetails && `· ${form.deliveryDetails}`}</p><small>{form.paymentMethod === 'PREPAID' ? 'Déjà payé au vendeur : aucun encaissement prévu à la remise.' : 'Montant à encaisser à la réception.'}</small></div><div><h3>Articles</h3>{items.map((item, index) => <p key={index}>{item.quantity} × {item.productName}<strong>{money(Number(item.quantity) * Number(item.unitPrice))}</strong></p>)}<p>Frais de livraison<strong>{money(fee)}</strong></p></div></div><p className="portal-muted">La livraison sera disponible pour affectation dès l’enregistrement.</p></>}
      </div>
      <div className="wizard-footer"><div><small>{step === 0 ? 'Total des articles' : 'Total avec livraison'}</small><strong>{money(products + (step === 0 ? 0 : fee))}</strong></div><div>{step > 0 ? <button type="button" className="adm-secondary-button" disabled={busy} onClick={() => { setStep(step - 1); setError(''); }}><ArrowLeft size={16} />Retour</button> : <button type="button" className="adm-secondary-button" onClick={onCancel}>Annuler</button>}<button className="adm-primary-button" disabled={busy}>{busy ? 'Enregistrement…' : step === 2 ? 'Enregistrer la vente' : 'Suivant'}<ArrowRight size={16} /></button></div></div>
    </form>
  </section>;
}
