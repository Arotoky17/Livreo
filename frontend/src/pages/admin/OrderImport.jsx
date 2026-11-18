import { useState } from 'react';
import { FileUp, Plus, Trash2 } from 'lucide-react';
import api from '../../services/api.js';
import { money } from '../../utils/adminMetrics.js';
import { normalizeOrderItems } from '../../utils/deliveryRules.js';
import { importNumber, matchingId, parsePastedOrders, paymentValue, readOrderFile } from '../../utils/orderImport.js';

const example = 'Client : Client test\nTéléphone : 0340000000\nAdresse : Analakely\nArticle : T-shirt | 2 | 15000';
const template = 'Référence;Client;Téléphone;Adresse;Article;Quantité;Prix;Zone;Vendeur;Paiement\r\n';
const fields = [
  ['reference', 'Référence'],
  ['customerName', 'Client'],
  ['customerPhone', 'Téléphone'],
  ['deliveryAddress', 'Adresse'],
  ['deliveryDetails', 'Repère'],
  ['notes', 'Notes'],
];
const itemFields = [['productName', 'Article'], ['quantity', 'Quantité'], ['unitPrice', 'Prix unitaire (Ar)']];

export default function OrderImport({ sellers, zones, onImported }) {
  const [source, setSource] = useState('');
  const [orders, setOrders] = useState([]);
  const [duplicates, setDuplicates] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function loadRows(rows) {
    if (!rows.length || rows.length > 50) throw new Error('Chargez de 1 à 50 commandes à la fois.');
    if (rows.some((order) => order.items.length > 30)) throw new Error('Chaque commande accepte au maximum 30 articles.');
    setOrders(rows.map((order, id) => ({
      ...order,
      id,
      zoneId: order.zoneName ? matchingId(order.zoneName, zones) : zones.length === 1 ? zones[0].id : '',
      sellerId: order.sellerName ? matchingId(order.sellerName, sellers) : sellers.length === 1 ? sellers[0].id : '',
      paymentMethod: paymentValue(order.payment),
    })));
    setDuplicates(null);
  }

  async function loadFile(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      loadRows(await readOrderFile(file));
    } catch (err) {
      setError(err.message || 'Le fichier n’a pas pu être lu.');
    } finally {
      setBusy(false);
    }
  }

  function loadText() {
    setError('');
    try {
      loadRows(parsePastedOrders(source));
    } catch (err) {
      setError(err.message);
    }
  }

  function update(id, transform) {
    setOrders((previous) => previous.flatMap((order) => order.id === id ? transform(order) : order));
    setDuplicates(null);
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || !orders.length) return;
    setBusy(true);
    setError('');
    try {
      const payload = orders.map((order, index) => {
        try {
          const items = normalizeOrderItems(order.items.map((item) => ({
            ...item, quantity: importNumber(item.quantity), unitPrice: importNumber(item.unitPrice),
          })));
          if (!order.customerName?.trim() || !order.customerPhone?.trim() || !order.deliveryAddress?.trim() ||
              !order.zoneId || !order.sellerId || !order.paymentMethod) {
            throw new Error('Complétez le client, le téléphone, l’adresse, la zone, le vendeur et le paiement.');
          }
          return {
            ...Object.fromEntries(fields.map(([field]) => [field, order[field]?.trim() ?? ''])),
            zoneId: order.zoneId, sellerId: order.sellerId, paymentMethod: order.paymentMethod, items,
          };
        } catch (err) {
          throw new Error(`Commande ${index + 1} · ${err.message}`);
        }
      });
      const request = { orders: payload, preview: duplicates === null };
      if (new Blob([JSON.stringify(request)]).size > 100 * 1024) {
        throw new Error('Ce lot est trop volumineux. Importez les commandes en plusieurs lots.');
      }
      const { data } = await api.post('/orders/import', request);
      if (duplicates === null) setDuplicates(data.duplicates);
      else onImported(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'L’import n’a pas pu être terminé.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-panel order-wizard">
      <div className="wizard-form">
        <h2>Fichier ou texte</h2>
        <p className="portal-muted">CSV ou première feuille d’un classeur Excel .xlsx. Utilisez une ligne par article et répétez la référence pour regrouper les articles d’une commande. Dans Excel, définissez la colonne Téléphone au format Texte.</p>
        <label className="import-input">Fichier de commandes
          <input type="file" accept=".csv,.xlsx" disabled={busy} onChange={loadFile} />
        </label>
        <a className="adm-text-button" download="modele-commandes.csv"
          href={`data:text/csv;charset=utf-8,%EF%BB%BF${encodeURIComponent(template)}`}>Télécharger le modèle CSV</a>
        <label className="import-input">Texte des commandes
          <textarea rows={5} value={source} onChange={(event) => setSource(event.target.value)}
            maxLength={100000} placeholder={example} disabled={busy} />
        </label>
        <p className="portal-muted">Collez un tableau avec ses en-têtes ou du texte comme dans l’exemple. Séparez les commandes par une ligne vide. Les lignes non reconnues sont conservées dans les notes pour compléter l’aperçu.</p>
        <button className="adm-secondary-button" type="button" disabled={busy || !source.trim()} onClick={loadText}>
          <FileUp size={16} />Lire le texte
        </button>
      </div>

      {error && <p className="adm-feedback error" role="alert">{error}</p>}
      {orders.length > 0 && (
        <form className="wizard-form" onSubmit={submit}>
          <h2>Aperçu · {orders.length} commande(s)</h2>
          <p className="portal-muted">Corrigez les champs avant l’import. Sans mode de paiement indiqué, le paiement à la réception est présélectionné.</p>
          <fieldset disabled={busy} className="import-orders">
            {orders.map((order, index) => {
              const total = order.items.reduce((sum, item) => sum + importNumber(item.quantity) * importNumber(item.unitPrice), 0);
              const zone = zones.find((entry) => entry.id === order.zoneId);
              return (
                <section key={order.id} className="import-order" aria-labelledby={`import-order-${order.id}`}>
                  <div className="import-order-heading">
                    <h3 id={`import-order-${order.id}`}>Commande {index + 1}</h3>
                    {duplicates?.includes(index) && <span className="adm-muted">Doublon ignoré</span>}
                    <button type="button" className="adm-icon-button" aria-label={`Retirer la commande ${index + 1}`}
                      onClick={() => update(order.id, () => [])}><Trash2 size={16} /></button>
                  </div>
                  <div className="wizard-fields">
                    {fields.map(([field, label]) => {
                      const Input = field === 'notes' ? 'textarea' : 'input';
                      return <label key={field}>{label}
                        <Input value={order[field] ?? ''} onChange={(event) => update(order.id, (row) => ({ ...row, [field]: event.target.value }))} />
                      </label>;
                    })}
                    <label>Zone
                      <select value={order.zoneId} onChange={(event) => update(order.id, (row) => ({ ...row, zoneId: event.target.value }))}>
                        <option value="">{order.zoneName ? `Zone à identifier · ${order.zoneName}` : 'Sélectionner une zone'}</option>
                        {zones.map((entry) => <option key={entry.id} value={entry.id}>{entry.nom}</option>)}
                      </select>
                    </label>
                    <label>Vendeur
                      <select value={order.sellerId} onChange={(event) => update(order.id, (row) => ({ ...row, sellerId: event.target.value }))}>
                        <option value="">{order.sellerName ? `Vendeur à identifier · ${order.sellerName}` : 'Sélectionner un vendeur'}</option>
                        {sellers.map((entry) => <option key={entry.id} value={entry.id}>{entry.nom}</option>)}
                      </select>
                    </label>
                    <label>Paiement
                      <select value={order.paymentMethod} onChange={(event) => update(order.id, (row) => ({ ...row, paymentMethod: event.target.value }))}>
                        <option value="">Sélectionner le paiement</option>
                        <option value="CASH_ON_DELIVERY">Paiement à la réception</option>
                        <option value="PREPAID">Déjà payé au vendeur</option>
                      </select>
                    </label>
                  </div>
                  <div className="import-items">
                    {order.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="import-item">
                        {itemFields.map(([field, label]) => (
                          <label key={field}>{label}
                            <input value={item[field]} inputMode={field === 'productName' ? 'text' : 'decimal'}
                              onChange={(event) => update(order.id, (row) => ({
                                ...row,
                                items: row.items.map((entry, position) => position === itemIndex ? { ...entry, [field]: event.target.value } : entry),
                              }))} />
                          </label>
                        ))}
                        <button type="button" className="adm-icon-button" aria-label={`Retirer l’article ${itemIndex + 1}`}
                          onClick={() => update(order.id, (row) => ({ ...row, items: row.items.filter((_, position) => position !== itemIndex) }))}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="adm-secondary-button" disabled={order.items.length >= 30}
                    onClick={() => update(order.id, (row) => ({ ...row, items: [...row.items, { productName: '', quantity: '1', unitPrice: '' }] }))}>
                    <Plus size={16} />Ajouter un article
                  </button>
                  <p className="adm-muted">{Number.isFinite(total) && zone ? `Total livraison comprise · ${money(total + zone.fraisLivraison)}` : 'Total après vérification des articles et de la zone'}</p>
                </section>
              );
            })}
          </fieldset>
          <div className="wizard-footer">
            <div>{duplicates !== null && <p role="status">{orders.length - duplicates.length} à importer · {duplicates.length} doublon(s)</p>}</div>
            <button className="adm-primary-button" type="submit" disabled={busy || duplicates?.length === orders.length}>
              {busy ? 'Traitement…' : duplicates === null ? 'Vérifier le lot' : 'Importer et valider'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
