import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, ShieldCheck, Zap, PackageCheck, Truck, ArrowRight, Radio, MessageCircle, Phone } from 'lucide-react';
import Logo from '../../components/navigation/Logo.jsx';
import TrackingMapPreview from '../../components/home/TrackingMapPreview.jsx';
import { homeConfig } from '../../config/home.js';
import '../../styles/HomePage.css';

const benefits = [
  { icon: Truck, title: 'Livraison organisée', description: 'Des courses coordonnées, de la prise en charge à la livraison.' },
  { icon: MapPin, title: 'Suivi géolocalisé', description: 'La position disponible du livreur sur une carte interactive.' },
  { icon: PackageCheck, title: 'Gestion des commandes', description: 'Vos commandes centralisées pour un suivi plus simple.' },
  { icon: ShieldCheck, title: 'Suivi sécurisé', description: 'Un code de suivi pour consulter votre livraison.' },
];

function ContactLink({ href, children, icon: Icon }) {
  return href ? <a className="landing-button home-secondary" href={href} target={href.startsWith('tel:') ? undefined : '_blank'} rel="noopener noreferrer"><Icon size={20} />{children}<ArrowRight size={17} /></a> : <span className="home-contact-unavailable"><Icon size={20} />{children}<small>Coordonnées à venir</small></span>;
}

export default function HomePage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }, [hash]);

  return (
    <div className="livreo-home">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="hero-art">
          <img src="/images/livreo-background-courier.webp"
            width="1672" height="941" fetchPriority="high"
            alt="Un livreur Livreo pose la main sur son carton, à côté d’un smartphone et devant le Rova d’Antananarivo" />
        </div>
        <svg className="tracking-scenery" viewBox="0 0 1672 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <g id="livreo-village">
              <path d="M0 65 22 48 44 65H38V88H7V65Z M55 50 88 27 120 50H112V88H63V50Z M127 65 149 48 171 65H164V88H134V65Z M186 49 211 32 236 49H231V88H191V49Z M202 31V13H209V4H212V13H219V31Z M246 65 275 46 303 65H297V88H252V65Z" />
              <g fill="#eaf3ff"><path d="M16 70H23V88H16Z M72 57H80V67H72Z M94 57H102V67H94Z M83 75H93V88H83Z M145 70H153V88H145Z M199 57H206V66H199Z M216 57H223V66H216Z M207 75H216V88H207Z M263 70H271V80H263Z M280 70H288V80H280Z" /></g>
              <path d="M318 88Q330 55 326 35H331Q335 62 326 88Z M329 35Q309 17 302 38Q318 30 329 38Q338 12 351 31Q341 30 333 40Q357 29 360 49Q344 37 331 43Q310 35 306 55Q319 43 329 43Z" />
            </g>
          </defs>
          <g fill="#95c5ff" opacity=".9"><use href="#livreo-village" x="170" y="0" /><use href="#livreo-village" x="620" y="8" /><use href="#livreo-village" x="1050" y="0" /><use href="#livreo-village" x="1390" y="8" /></g>
          <path fill="#c8e3ff" d="M0 48Q240 110 570 70T1100 64T1672 46V100H0Z" />
          <path fill="#53aaff" d="M0 70Q300 115 700 75T1200 72T1672 64V100H0Z" />
          <path fill="#2490ff" d="M0 90Q330 38 680 84T1230 74T1672 84V100H0Z" />
          <path fill="#0860f5" d="M0 70Q330 145 720 96T1260 89T1672 50V100H0Z" />
        </svg>
        <div className="hero-copy">
          <span className="landing-label"><Zap size={17} fill="currentColor" aria-hidden="true" />Livraison rapide à Madagascar</span>
          <h1 id="landing-title">Vos commandes<br />en ligne, livrées<br /><span>en toute confiance&nbsp;!
            <svg className="title-underline" viewBox="0 0 260 18" aria-hidden="true"><path d="M3 13 Q130 -4 257 13" /></svg>
          </span></h1>
          <p>Livreo centralise vos commandes et vous permet de suivre votre livraison en temps réel, partout à Madagascar.</p>
        </div>
      </section>

      <section className="landing-benefits" aria-label="Les avantages Livreo">
        {benefits.map(({ icon: Icon, title, description }) => (
          <div className="benefit" key={title}>
            <Icon className="benefit-icon" strokeWidth={2.8} aria-hidden="true" />
            <div><h2>{title}</h2><p>{description}</p></div>
          </div>
        ))}
      </section>

      <section id="a-propos" className="landing-gps" aria-labelledby="gps-title">
        <div className="gps-copy">
          <span className="landing-label"><Radio size={17} />Votre livraison, en toute clarté</span>
          <h2 id="gps-title">Suivez votre livraison <span>en temps réel</span></h2>
          <p>Grâce à Livreo, consultez l’état de votre commande et visualisez la position disponible de votre livreur directement sur une carte interactive.</p>
          <div className="gps-note"><ShieldCheck size={21} /><p>La position s’affiche uniquement lorsque le suivi GPS est actif et qu’une position récente est disponible.</p></div>
          <Link to="/tracking" className="landing-button">Suivre ma commande<ArrowRight size={18} /></Link>
        </div>
        <figure className="gps-preview">
          <div className="gps-preview-heading"><span><MapPin size={17} />Aperçu du suivi</span><span className="gps-example">Illustration</span></div>
          <TrackingMapPreview />
          <figcaption className="gps-status"><span className="gps-status-icon"><PackageCheck size={23} /></span><div><strong>En cours de livraison</strong><span>Exemple de statut · aucune position réelle affichée</span></div></figcaption>
        </figure>
      </section>

      <section id="contact" className="home-section home-direct-contact" aria-labelledby="contact-title"><div><span className="landing-label"><MessageCircle size={17} />Restons proches</span><h2 id="contact-title">Une question sur votre livraison ?</h2><p>Retrouvez nos contacts directs ici. En attendant leur publication, votre vendeur reste votre interlocuteur.</p><div className="home-contact-links"><ContactLink href={homeConfig.contacts.whatsapp} icon={MessageCircle}>WhatsApp</ContactLink><ContactLink href={homeConfig.contacts.messenger} icon={MessageCircle}>Messenger</ContactLink><ContactLink href={homeConfig.contacts.phone ? `tel:${homeConfig.contacts.phone}` : ''} icon={Phone}>Téléphone</ContactLink></div></div></section>

      <footer className="landing-footer">

        <div className="landing-contact">
          <div className="footer-brand"><Logo /><p>Vos commandes et vos livraisons réunies, pour rester plus proches partout à Madagascar.</p></div>
          <nav aria-label="Navigation du pied de page"><h2>Découvrir Livreo</h2><Link to="/">Accueil</Link><Link to="/tracking">Suivi de commande</Link><a href="#a-propos">À propos</a><a href="#contact">Contact</a></nav>
          <div className="footer-spaces"><h2>Gardons le lien</h2><p>Un colis à retrouver ou une course à préparer ?</p><Link className="footer-tracking-link" to="/tracking"><PackageCheck size={18} />Suivre mon colis<ArrowRight size={16} /></Link><Link to="/login">Connexion Livreo<ArrowRight size={15} /></Link></div>
          <div className="footer-bottom"><span>© 2026 Livreo. Tous droits réservés.</span><Link to="/tracking">Une question sur votre colis ? Consultez votre suivi<ArrowRight size={14} /></Link></div>
        </div>
      </footer>
    </div>
  );
}
