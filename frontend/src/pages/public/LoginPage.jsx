import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, PackageSearch } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import Logo from '../../components/navigation/Logo.jsx';
import '../../styles/LoginPage.css';

const destinationByRole = {
  ADMIN: '/admin',
  DELIVERY: '/delivery',
  SELLER: '/seller',
};

export default function LoginPage() {
  const [params] = useSearchParams();
  const { state } = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');
    try {
      const account = await login(email.trim(), password);
      navigate(destinationByRole[account.role] ?? '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Connexion impossible. Vérifiez vos identifiants et votre connexion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-content">
        <header className="login-header">
          <Link className="login-back" to="/">
            <ArrowLeft size={16} aria-hidden="true" /> Accueil
          </Link>
        </header>

        <section className="login-form-panel" aria-labelledby="login-title">
          <Logo className="login-brand" />
          <h1 id="login-title">Connexion</h1>
          <p className="login-intro">Connectez-vous à votre espace Livreo.</p>

          {error && (
            <p className="login-notice login-notice--error" role="alert">
              <AlertCircle size={18} aria-hidden="true" /> {error}
            </p>
          )}
          {params.has('expired') && !error && (
            <p className="login-notice" role="status">Votre session a expiré. Reconnectez-vous.</p>
          )}

          {state?.passwordChanged && !error && (
            <p className="login-notice" role="status">Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe.</p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="login-control">
              <label htmlFor="login-email">Adresse e-mail</label>
              <div className="login-field">
                <Mail size={19} aria-hidden="true" />
                <input id="login-email" name="email" type="email" required value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="vous@exemple.mg" autoComplete="username" />
              </div>
            </div>

            <div className="login-control">
              <label htmlFor="login-password">Mot de passe</label>
              <div className="login-field">
                <LockKeyhole size={19} aria-hidden="true" />
                <input id="login-password" name="password" type={visible ? 'text' : 'password'} required
                  value={password} onChange={(event) => setPassword(event.target.value)}
                  placeholder="Votre mot de passe" autoComplete="current-password" />
                <button type="button" className="login-password-toggle" onClick={() => setVisible(!visible)}
                  aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-controls="login-password">
                  {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Connexion en cours…' : 'Se connecter'}
              <ArrowRight size={19} aria-hidden="true" />
            </button>
          </form>

          <p className="login-help">Vos accès sont fournis par l’administrateur de Livreo.</p>
        </section>

        <footer className="login-footer">
          <Link to="/tracking">
            <PackageSearch size={19} aria-hidden="true" /> Suivre mon colis
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </footer>
      </div>

    </div>
  );
}
