import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import '../styles/LoginPage.css';

const dashboardByRole = { ADMIN: '/admin', DELIVERY: '/delivery', SELLER: '/seller' };

export default function ChangePasswordPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const currentPassword = form.get('currentPassword');
    const newPassword = form.get('newPassword');
    if (newPassword !== form.get('confirmation')) {
      setError('Les deux saisies du nouveau mot de passe doivent être identiques.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await api.put('/auth/me/password', { currentPassword, newPassword });
      logout();
      navigate('/login', { replace: true, state: { passwordChanged: true } });
    } catch (err) {
      setError(err.response?.data?.message || 'Le changement a échoué. Réessayez ou reconnectez-vous.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-content">
        <header className="login-header">
          <Link className="login-back" to={dashboardByRole[user.role]}>Retour à mon espace</Link>
        </header>
        <section className="login-form-panel" aria-labelledby="password-title">
          <h1 id="password-title">Changer mon mot de passe</h1>
          <p className="login-intro" id="password-rules">Choisissez au moins 15 caractères (72 octets maximum). Vous devrez ensuite vous reconnecter sur vos appareils.</p>
          {error && <p className="login-notice login-notice--error" role="alert">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="login-control">
              <label htmlFor="currentPassword">Mot de passe actuel</label>
              <div className="login-field">
                <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
              </div>
            </div>
            <div className="login-control">
              <label htmlFor="newPassword">Nouveau mot de passe</label>
              <div className="login-field">
                <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" aria-describedby="password-rules" required />
              </div>
            </div>
            <div className="login-control">
              <label htmlFor="confirmation">Confirmer le nouveau mot de passe</label>
              <div className="login-field">
                <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required />
              </div>
            </div>
            <button type="submit" className="login-submit" disabled={busy}>
              {busy ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
