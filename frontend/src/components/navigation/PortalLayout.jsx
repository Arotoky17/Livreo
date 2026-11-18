import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, LogOut, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import Logo from './Logo.jsx';
import Avatar from '../profile/Avatar.jsx';
import '../../styles/AdminDashboard.css';
import '../../styles/Portals.css';

export default function PortalLayout({ title, subtitle, navigation, section, onSection, onRefresh, action, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const role = user?.role === 'DELIVERY' ? 'Livreur' : user?.role === 'ADMIN' ? 'Administrateur' : 'Vendeur';
  return <div className={`admin-app role-portal ${collapsed ? 'sidebar-collapsed' : ''}`}>
    {open && <button className="adm-sidebar-overlay" onClick={() => setOpen(false)} aria-label="Fermer le menu" />}
    <aside className={`adm-sidebar ${open ? 'is-open' : ''}`} aria-label={`Navigation ${role}`}>
      <div className="adm-brand"><Logo /><span>Livraison · Suivi · Confiance</span></div>
      <nav>{navigation.map(([key, label, Icon]) => <button key={key} className={section === key ? 'active' : ''} aria-current={section === key ? 'page' : undefined} onClick={() => { onSection(key); setOpen(false); }}><Icon size={18} />{label}</button>)}</nav>
      <button className="adm-logout" onClick={() => { logout(); navigate('/login'); }}><LogOut size={18} />Déconnexion</button>
      <div className="adm-sidebar-footer"><ShieldCheck size={26} /><strong>Espace {role.toLowerCase()}</strong><span>{user?.nom}</span><div className="adm-city" aria-hidden="true">▂ ▃ ▆ ▄ ▂ ▅ ▃ ▆ ▂</div></div>
      <Link className="adm-back-home" to="/">Retour à l’accueil<ArrowRight size={14} /></Link>
    </aside>
    <div className="adm-workspace"><header className="adm-topbar"><button className="adm-icon-button" aria-label="Afficher ou masquer le menu" onClick={() => { if (window.matchMedia('(max-width: 767px)').matches) setOpen(!open); else setCollapsed(!collapsed); }}><Menu size={20} /></button><span className="portal-topbar-label">Espace {role.toLowerCase()}</span><div className="adm-topbar-right">{onRefresh && <button className="adm-icon-button" onClick={onRefresh} aria-label="Actualiser"><RefreshCw size={18} /></button>}<button type="button" className="adm-profile" onClick={() => { onSection('profile'); setOpen(false); }} aria-label="Ouvrir mon profil"><Avatar user={user} /><span>{user?.nom}<small>{role}</small></span></button></div></header>
      <main className="adm-main"><div className="adm-page-heading"><div><span className="adm-eyebrow">LIVREO · {role.toUpperCase()}</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>{children}</main>
    </div>
  </div>;
}


