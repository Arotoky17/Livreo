import { MapPin, Navigation, Truck } from 'lucide-react';

// Decorative map only: no real coordinates, delivery data, or network request.
export default function TrackingMapPreview() {
  return (
    <div className="gps-map-modern" role="img" aria-label="Trajet de démonstration avec un départ, un livreur et une destination. Aucune position GPS réelle.">
      <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <pattern id="preview-blocks" width="90" height="75" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
            <rect width="90" height="75" fill="#edf1f5" />
            <rect x="8" y="8" width="31" height="24" rx="5" fill="#e0e6ee" />
            <rect x="45" y="8" width="35" height="24" rx="5" fill="#e4e9f0" />
            <rect x="8" y="39" width="72" height="26" rx="5" fill="#e1e7ef" />
            <path d="M0 0H90M0 0V75" stroke="white" strokeWidth="7" />
          </pattern>
          <linearGradient id="preview-water" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#c4e4f8" /><stop offset="1" stopColor="#a8d5ef" />
          </linearGradient>
          <filter id="preview-shadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0b63f6" floodOpacity=".25" />
          </filter>
        </defs>
        <rect width="600" height="400" fill="url(#preview-blocks)" />
        <path d="M-25 25Q65 38 94 98T183 155Q208 184 187 223T186 312Q201 370 152 430" fill="none" stroke="#d6e8d9" strokeWidth="78" />
        <path d="M-25 25Q65 38 94 98T183 155Q208 184 187 223T186 312Q201 370 152 430" fill="none" stroke="url(#preview-water)" strokeWidth="42" />
        <path d="M395 250Q421 223 454 246L506 278Q531 301 510 337L477 370Q442 385 412 354L384 309Q373 280 395 250Z" fill="#d4e7d7" />
        <g fill="#bed9c4"><circle cx="423" cy="274" r="12" /><circle cx="462" cy="288" r="17" /><circle cx="438" cy="325" r="15" /><circle cx="484" cy="329" r="10" /></g>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-20 220H330L350 140H630M90 420V300H190L230 220M485-20V140L540 225V430M270-20L310 70L350 140" stroke="#d3dce8" strokeWidth="26" />
          <path d="M-20 220H330L350 140H630M90 420V300H190L230 220M485-20V140L540 225V430M270-20L310 70L350 140" stroke="white" strokeWidth="20" />
          <path d="M90 300H190L230 220H330L350 140H485" stroke="#bfd7ff" strokeWidth="17" />
          <path d="M90 300H190L230 220H330L350 140H485" stroke="white" strokeWidth="12" />
          <path d="M90 300H190L230 220H330L350 140H485" stroke="#0b63f6" strokeWidth="7" />
          <path d="M485 140V70" stroke="white" strokeWidth="10" />
          <path d="M485 140V70" stroke="#0b63f6" strokeWidth="5" strokeDasharray="3 9" />
        </g>
        <circle cx="90" cy="300" r="11" fill="white" stroke="#0b63f6" strokeWidth="5" />
        <g transform="translate(485 56)"><path d="M0 26S-17 9-17-3a17 17 0 0 1 34 0C17 9 0 26 0 26Z" fill="#142958" stroke="white" strokeWidth="3" /><circle cy="-3" r="5" fill="white" /></g>
        <circle cx="336" cy="196" r="34" fill="#0b63f6" opacity=".1" />
        <g filter="url(#preview-shadow)"><circle cx="336" cy="196" r="23" fill="#0b63f6" stroke="white" strokeWidth="4" /><Truck x="325" y="185" width="22" height="22" color="white" strokeWidth="2" /></g>
      </svg>
      <div className="gps-map-caption"><span className="gps-map-dot" />Trajet de démonstration</div>
      <span className="gps-compass" aria-hidden="true"><Navigation size={19} />N</span>
      <span className="gps-driver"><span className="gps-driver-avatar"><Truck size={20} /></span><span><strong>Livreur</strong><small>Position illustrative</small></span></span>
      <span className="gps-map-label"><MapPin size={15} />Carte illustrative · sans données GPS</span>
    </div>
  );
}
