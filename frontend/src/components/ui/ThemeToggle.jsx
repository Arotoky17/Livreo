import { Moon, Sun } from 'lucide-react';
import '../../styles/PortalTheme.css';

export default function ThemeToggle({ dark, toggleTheme }) {
  const label = dark ? 'Activer le mode clair' : 'Activer le mode sombre';
  const Icon = dark ? Sun : Moon;
  return <button type="button" className="adm-icon-button" onClick={toggleTheme}
    title={label} aria-label={label}><Icon size={19} aria-hidden="true" /></button>;
}
