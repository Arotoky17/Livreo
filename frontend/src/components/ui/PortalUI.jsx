import { useEffect, useId, useRef } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { statusLabels } from '../../utils/adminMetrics.js';

export function Badge({ status }) {
  return <span className={`adm-badge status-${status}`}><span />{statusLabels[status] ?? status}</span>;
}
export function Empty({ children = 'Aucun résultat pour le moment.' }) {
  return <div className="adm-empty"><ShoppingCart size={28} /><p>{children}</p></div>;
}
export function Panel({ title, icon: Icon, action, className = '', children }) {
  return <section className={`adm-panel ${className}`}><div className="adm-panel-heading"><h2>{Icon && <Icon size={18} />}{title}</h2>{action}</div>{children}</section>;
}
export function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('button, input, select, textarea, a')?.focus();
    function keydown(event) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const elements = [...ref.current.querySelectorAll('button:not(:disabled), input, select, textarea, a[href]')];
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [onClose]);
  return <div className="adm-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={ref} className="adm-modal" role="dialog" aria-modal="true" aria-labelledby={id}><header><h2 id={id}>{title}</h2><button type="button" className="adm-icon-button" onClick={onClose} aria-label="Fermer"><X size={20} /></button></header>{children}</section></div>;
}

