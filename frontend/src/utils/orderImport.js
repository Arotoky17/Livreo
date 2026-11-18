import Papa from 'papaparse';

const columns = {
  reference: 'reference',
  client: 'customerName',
  telephone: 'customerPhone',
  adresse: 'deliveryAddress',
  repere: 'deliveryDetails',
  zone: 'zoneName',
  vendeur: 'sellerName',
  paiement: 'payment',
  notes: 'notes',
  article: 'productName',
  quantite: 'quantity',
  prix: 'unitPrice',
};
const requiredHeaders = ['client', 'telephone', 'adresse', 'article', 'quantite', 'prix'];
const textAliases = { nom: 'client', 'nom du client': 'client', tel: 'telephone', 'adresse de livraison': 'adresse', produit: 'article' };

function text(value) {
  return String(value ?? '').trim();
}

export function normalizedLabel(value) {
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
}

function tableOrders(matrix) {
  const rows = matrix.filter((row) => row.some((cell) => text(cell)));
  const headers = (rows.shift() ?? []).map(normalizedLabel);
  if (requiredHeaders.some((header) => !headers.includes(header))) {
    throw new Error('La première ligne doit contenir Client, Téléphone, Adresse, Article, Quantité et Prix.');
  }
  if (headers.filter((header) => Object.hasOwn(columns, header)).some((header, index, list) => list.indexOf(header) !== index)) {
    throw new Error('Retirez les en-têtes en double avant de lire le fichier.');
  }
  const byReference = new Map();
  const orders = [];
  rows.forEach((cells, index) => {
    const row = Object.fromEntries(headers.filter((header) => Object.hasOwn(columns, header)).map((header) => [columns[header], text(cells[headers.indexOf(header)])]));
    const { productName, quantity, unitPrice, ...order } = row;
    const item = { productName, quantity, unitPrice };
    const referenceKey = order.reference?.toLowerCase();
    const previous = referenceKey && byReference.get(referenceKey);
    if (previous) {
      for (const [field, value] of Object.entries(order)) {
        if (!value || field === 'reference') continue;
        if (previous[field] && previous[field] !== value) {
          throw new Error(`Ligne ${index + 2} · Les informations ne correspondent pas aux autres lignes de la référence ${order.reference}.`);
        }
        previous[field] = value;
      }
      previous.items.push(item);
    } else {
      const entry = { ...order, items: [item] };
      orders.push(entry);
      if (referenceKey) byReference.set(referenceKey, entry);
    }
  });
  return orders;
}

export function parseDelimitedOrders(source) {
  const parsed = Papa.parse(source, { skipEmptyLines: 'greedy', delimitersToGuess: [';', '\t', ','] });
  if (parsed.errors.length) throw new Error('Le texte délimité est illisible. Vérifiez les séparateurs et les guillemets.');
  return tableOrders(parsed.data);
}

export function parsePastedOrders(source) {
  const trimmed = source.trim();
  if (!trimmed) throw new Error('Collez des commandes ou choisissez un fichier.');
  const header = trimmed.split(/\r?\n/, 1)[0];
  if (header.split(/[;,\t]/).map(normalizedLabel).filter((label) => requiredHeaders.includes(label)).length >= 2) {
    return parseDelimitedOrders(trimmed);
  }

  return trimmed.split(/\r?\n[\t ]*\r?\n/).map((block, index) => {
    const order = { items: [] };
    const unrecognized = [];
    for (const line of block.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const [, label, value] = line.match(/^([^:]+):(.*)$/) ?? [];
      const normalized = normalizedLabel(label);
      const key = Object.hasOwn(textAliases, normalized) ? textAliases[normalized] : normalized;
      const field = Object.hasOwn(columns, key) ? columns[key] : undefined;
      if (!field || field === 'quantity' || field === 'unitPrice') {
        unrecognized.push(line.trim());
        continue;
      }
      if (field === 'productName') {
        const parts = value.split('|').map(text);
        if (parts.length !== 3) throw new Error(`Commande ${index + 1} · Format d’un article : Produit | Quantité | Prix.`);
        const [productName, quantity, unitPrice] = parts;
        order.items.push({ productName, quantity, unitPrice });
      } else {
        order[field] = text(value);
      }
    }
    order.notes = [order.notes, ...unrecognized].filter(Boolean).join('\n');
    return order;
  });
}

export async function readOrderFile(file) {
  if (file.size > 2 * 1024 * 1024) throw new Error('Le fichier doit faire 2 Mo maximum.');
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import('read-excel-file/browser');
    return tableOrders(await readSheet(file));
  }
  if (/\.csv$/i.test(file.name)) return parseDelimitedOrders(await file.text());
  throw new Error('Choisissez un fichier CSV ou Excel .xlsx.');
}

export function matchingId(value, options) {
  const label = normalizedLabel(value);
  const matches = options.filter((option) => [option.id, option.nom, option.email].some((name) => label && normalizedLabel(name) === label));
  return matches.length === 1 ? matches[0].id : '';
}

export function paymentValue(value) {
  const label = normalizedLabel(value);
  if (!label || ['cash_on_delivery', 'a la reception', 'paiement a la reception'].includes(label)) return 'CASH_ON_DELIVERY';
  if (['prepaye', 'prepaid', 'deja paye au vendeur'].includes(label)) return 'PREPAID';
  return '';
}

export function importNumber(value) {
  const amount = text(value).replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  return /^\d+(?:\.\d+)?$/.test(amount) ? Number(amount) : NaN;
}
