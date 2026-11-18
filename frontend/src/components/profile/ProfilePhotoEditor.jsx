import { useRef, useState } from 'react';
import { Camera, Upload, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { prepareProfilePhoto } from '../../services/profilePhoto.js';
import Avatar from './Avatar.jsx';

export default function ProfilePhotoEditor() {
  const { user, updateProfilePhoto } = useAuth();
  const [preview, setPreview] = useState(null), [preparing, setPreparing] = useState(false), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [success, setSuccess] = useState('');
  const input = useRef(null), selection = useRef(0);
  const busy = preparing || saving;
  async function choose(file) {
    const version = ++selection.current;
    setError(''); setSuccess(''); setPreview(null);
    if (!file) return;
    setPreparing(true);
    try { const result = await prepareProfilePhoto(file); if (version === selection.current) setPreview(result); }
    catch (err) { if (version === selection.current) setError(err.message); }
    finally { if (version === selection.current) setPreparing(false); }
  }
  async function save(remove = false) {
    setSaving(true); setError(''); setSuccess('');
    try { await updateProfilePhoto(remove ? null : preview); setPreview(null); setSuccess(remove ? 'Photo supprimée.' : 'Photo de profil enregistrée.'); }
    catch (err) { setError(err.response?.data?.message || 'La photo n’a pas pu être enregistrée. Réessayez.'); }
    finally { setSaving(false); }
  }
  if (user?.role !== 'DELIVERY') return null;
  return <section className="profile-photo-editor" aria-labelledby="photo-heading">
    <div className="profile-photo-preview"><Avatar user={{ ...user, avatarUrl: preview ?? user.avatarUrl }} className="profile-avatar-large" /><span className="profile-photo-camera"><Camera size={16} /></span></div>
    <div className="profile-photo-controls"><h3 id="photo-heading">Ma photo de profil</h3><p>JPG, PNG ou WebP · 5 Mo maximum. La photo est recadrée au centre et compressée avant l’envoi.</p>
      <input ref={input} className="sr-only" aria-label="Choisir une photo de profil" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
      <div className="profile-photo-actions"><button className="adm-secondary-button" type="button" disabled={busy} onClick={() => input.current?.click()}><Upload size={15} />{preparing ? 'Préparation…' : user.avatarUrl ? 'Changer la photo' : 'Ajouter une photo'}</button>{preview && <><button className="adm-primary-button" type="button" disabled={busy} onClick={() => save()}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button><button className="adm-secondary-button" type="button" disabled={busy} onClick={() => { selection.current++; setPreview(null); }}>Annuler</button></>}{user.avatarUrl && !preview && <button className="profile-photo-remove" type="button" disabled={busy} onClick={() => save(true)}><Trash2 size={15} />Supprimer</button>}</div>
      {preview && <p className="profile-photo-hint">Aperçu : cliquez sur « Enregistrer » pour confirmer.</p>}
      {error && <p className="portal-error-text" role="alert">{error}</p>}{success && <p className="profile-photo-success" role="status"><CheckCircle2 size={15} />{success}</p>}
    </div>
  </section>;
}
