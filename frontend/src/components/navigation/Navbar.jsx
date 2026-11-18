import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Logo from './Logo.jsx';
import {
  Home,
  Search,
  Info,
  Phone,
  ShieldCheck,
  LogOut,
  Truck,
  Menu,
  X,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAdmin, isDelivery } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);
  const isHome = location.pathname === '/';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (['/admin', '/delivery', '/login'].includes(location.pathname)) return null;

  return (
    <header className={`${isHome ? 'landing-header' : 'sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100'} z-40`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          setMenuOpen(false);
          menuButton.current?.focus();
        }
      }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* 1. Logo fidèle à la maquette */}
        <Logo className={location.pathname === '/' ? 'landing-brand' : ''} />

        {/* 2. Menu central en capsule (Pill Navigation) */}
        <nav id="public-navigation" aria-label="Navigation principale"
          data-open={isHome && menuOpen}
          onClick={(event) => { if (event.target.closest('a')) setMenuOpen(false); }}
          className="hidden md:flex items-center bg-slate-100/80 p-1.5 rounded-full border border-slate-200/60 shadow-inner">
          <Link
            to="/"
            aria-current={location.pathname === '/' ? 'page' : undefined}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              location.pathname === '/'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-blue-600 hover:bg-white/60'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            Accueil
          </Link>

          <Link
            to="/tracking"
            aria-current={location.pathname === '/tracking' ? 'page' : undefined}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              location.pathname === '/tracking'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-blue-600 hover:bg-white/60'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Suivi de commande
          </Link>

          <a
            href="#a-propos"
            onClick={(e) => {
              if (location.pathname !== '/') {
                e.preventDefault();
                navigate('/#a-propos');
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-white/60 transition"
          >
            <Info className="w-3.5 h-3.5" />
            À propos
          </a>

          <a
            href="#contact"
            onClick={(e) => {
              if (location.pathname !== '/') {
                e.preventDefault();
                navigate('/#contact');
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-white/60 transition"
          >
            <Phone className="w-3.5 h-3.5" />
            Contact
          </a>
        </nav>

        {/* 3. Bouton Droit : Connexion Admin / Espace Utilisateur */}
        <div className="flex items-center gap-3">
          {user && !isAdmin ? (
            <div className="flex items-center gap-3">
              {/* Liens rapides selon le rôle */}
              {isDelivery && (
                <Link
                  to="/delivery"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition border border-emerald-200"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Espace Livreur
                </Link>
              )}

              {/* Profil & Déconnexion */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 py-1 px-3 rounded-full">
                <span className="text-xs font-bold text-slate-800">{user.nom.split(' ')[0]}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Se déconnecter"
                  className="text-slate-400 hover:text-red-600 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="landing-login inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-white text-slate-800 border border-slate-200 hover:border-blue-400 shadow-sm hover:shadow transition"
            >
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <ShieldCheck className="w-3 h-3" />
              </div>
              Connexion
            </Link>
          )}
        </div>
        {isHome && (
          <button ref={menuButton} className="landing-menu-toggle" type="button"
            aria-expanded={menuOpen} aria-controls="public-navigation"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={(event) => {
              setMenuOpen(!menuOpen);
              if (!menuOpen && event.detail === 0) {
                requestAnimationFrame(() => document.querySelector('#public-navigation a')?.focus());
              }
            }}>
            {menuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
          </button>
        )}
      </div>
    </header>
  );
}
