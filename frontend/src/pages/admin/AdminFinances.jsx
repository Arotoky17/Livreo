import { useState } from 'react';
import { Banknote, CalendarDays, ChevronLeft, ChevronRight, Download, Eye, List, Search, Store, Truck, Wallet } from 'lucide-react';
import { Empty } from '../../components/ui/PortalUI.jsx';
import { dateTime, matches, money, sellerBalances } from '../../utils/adminMetrics.js';
import '../../styles/AdminFinances.css';

const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Indian/Antananarivo', year: 'numeric', month: '2-digit', day: '2-digit',
});
const pageSize = 5;
const periods = [['all', 'Toute la période'], ['month', 'Ce mois-ci'], ['30', '30 derniers jours'], ['7', '7 derniers jours']];
const collectionHeaders = ['Date', 'Livraison', 'Livreur', 'Vendeur', 'Montant', 'Frais', 'Net à reverser', 'Statut'];
const payoutHeaders = ['Vendeur', 'Livraisons encaissées', 'Montant encaissé', 'Frais', 'Net à reverser'];

function exportCsv(name, headers, rows) {
  const escape = (value) => {
    const cell = String(value ?? '');
    const safe = typeof value === 'string' && /^[\s\uFEFF]*[=+\-@]/.test(cell) ? "'" + cell : cell;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const csv = [headers, ...rows].map((row) => row.map(escape).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name + '.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminFinances({ deliveries, section, onSection, onDetails, query, now }) {
  const [period, setPeriod] = useState('all');
  const [driver, setDriver] = useState('');
  const [seller, setSeller] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const payouts = section === 'payouts';
  const today = dateFormat.format(now);
  const firstDay = period === 'month' ? today.slice(0, 7) + '-01'
    : period === 'all' ? '' : dateFormat.format(now - (Number(period) - 1) * 86400000);
  const collected = (deliveries ?? []).filter((entry) => entry.status === 'LIVREE' && entry.collectedAmount != null && entry.order);
  const drivers = new Map(collected.filter((entry) => entry.deliveryPerson).map((entry) => [entry.deliveryPerson.id, entry.deliveryPerson.nom]));
  const sellers = new Map(collected.filter((entry) => entry.order.seller).map((entry) => [entry.order.seller.id, entry.order.seller.nom]));
  const filtered = collected.filter((entry) => (
    (!firstDay || (entry.completedAt && dateFormat.format(new Date(entry.completedAt)) >= firstDay))
    && (!driver || driver === entry.deliveryPerson?.id)
    && (!seller || seller === entry.order.seller?.id)
    && [query, search].every((term) => matches(term, entry.trackingCode, entry.deliveryPerson?.nom, entry.order.seller?.nom))
  )).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  const balances = sellerBalances(filtered);
  const totals = balances.reduce((sum, row) => ({
    collected: sum.collected + row.collected, fees: sum.fees + row.fees, due: sum.due + row.due,
  }), { collected: 0, fees: 0, due: 0 });
  const collectionRows = filtered.map((entry) => ({
    id: entry.id, order: entry.order,
    cells: [dateTime(entry.completedAt), entry.trackingCode, entry.deliveryPerson?.nom ?? '—', entry.order.seller?.nom ?? '—',
      Number(entry.collectedAmount), Number(entry.order.deliveryFee),
      Number(entry.sellerPayout ?? Math.max(0, entry.collectedAmount - entry.order.deliveryFee)), 'Encaissé'],
  }));
  const payoutRows = balances.map((entry) => ({
    id: entry.id, cells: [entry.name, entry.count, entry.collected, entry.fees, entry.due],
  }));
  const rows = payouts ? payoutRows : collectionRows;
  const headers = payouts ? payoutHeaders : collectionHeaders;
  const lastPage = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, lastPage);
  const offset = (currentPage - 1) * pageSize;

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  return <div className="adm-finances">
    <div className="fin-metrics">
      {[[Wallet, 'Total encaissé', totals.collected, 'blue'], [Truck, 'Frais de livraison', totals.fees, 'violet'],
        [Banknote, 'Montant à reverser', totals.due, 'green'], [Store, 'Vendeurs concernés', balances.length, 'teal']].map(([Icon, label, value, tone]) =>
        <section key={label} className={`fin-metric fin-${tone}`}>
          <span className="fin-metric-icon"><Icon size={20} /></span>
          <div><h2>{label}</h2><strong>{deliveries == null ? '—' : tone === 'teal' ? value : money(value)}</strong></div>
        </section>)}
    </div>
    <div className="fin-toolbar">
      <nav className="fin-switch" aria-label="Finances">
        {[['collections', 'Encaissements', Wallet, collectionRows.length], ['payouts', 'Reversements', Banknote, payoutRows.length]].map(([key, label, Icon, count]) =>
          <button type="button" key={key} aria-current={section === key ? 'page' : undefined} onClick={() => { onSection(key); setPage(1); }}><Icon size={15} />{label}<span>{count}</span></button>)}
      </nav>
      <div className="fin-filters">
        <label><CalendarDays size={15} /><span>Période</span><select value={period} onChange={(event) => updateFilter(setPeriod, event.target.value)}>{periods.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label><Truck size={15} /><span>Livreur</span><select value={driver} onChange={(event) => updateFilter(setDriver, event.target.value)}><option value="">Tous</option>{[...drivers].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label><Store size={15} /><span>Vendeur</span><select value={seller} onChange={(event) => updateFilter(setSeller, event.target.value)}><option value="">Tous</option>{[...sellers].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <button type="button" className="adm-primary-button" disabled={!rows.length} onClick={() => exportCsv(section === 'collections' ? 'encaissements' : 'reversements', headers, rows.map((row) => row.cells))}><Download size={15} />Exporter CSV</button>
      </div>
    </div>
    <section className="adm-panel fin-table">
      <header className="fin-table-heading">
        <h2><List size={20} />{payouts ? 'Reversements par vendeur' : 'Liste des encaissements'}</h2>
        <label className="fin-search"><Search size={16} /><input aria-label="Rechercher dans les finances" placeholder={payouts ? 'Rechercher un vendeur…' : 'Rechercher un encaissement…'} value={search} onChange={(event) => updateFilter(setSearch, event.target.value)} /></label>
      </header>
      {payouts && <p className="fin-note">Montants calculés à partir des encaissements. Les reversements effectués ne sont pas enregistrés dans Livreo.</p>}
      <div className="adm-table-scroll">
        <table className="adm-table">
          <thead><tr><th scope="col">#</th>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}{!payouts && <th scope="col">Actions</th>}</tr></thead>
          <tbody>{rows.slice(offset, offset + pageSize).map((row, index) => <tr key={row.id}>
            <td>{offset + index + 1}</td>
            {row.cells.map((cell, column) => <td key={headers[column]} className="adm-nowrap">
              {!payouts && column === 1 ? <span className="fin-code">{cell}</span>
                : !payouts && column === 7 ? <span className="fin-status">{cell}</span>
                : (payouts ? column >= 2 : column >= 4) ? money(cell) : cell}
            </td>)}
            {!payouts && <td><button type="button" className="fin-detail" onClick={() => onDetails(row.order)} aria-label={`Détails de la livraison ${row.cells[1]}`}><Eye size={15} />Détails</button></td>}
          </tr>)}</tbody>
        </table>
      </div>
      {!rows.length && <Empty>{deliveries == null ? 'Données financières indisponibles.' : 'Aucun résultat pour ces filtres.'}</Empty>}
      {rows.length > 0 && <footer className="fin-pagination">
        <span>Résultats {offset + 1} à {Math.min(offset + pageSize, rows.length)} sur {rows.length}</span>
        <div><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Page précédente"><ChevronLeft size={16} /></button><span>Page {currentPage} sur {lastPage}</span><button type="button" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)} aria-label="Page suivante"><ChevronRight size={16} /></button></div>
      </footer>}
    </section>
  </div>;
}
