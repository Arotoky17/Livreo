import { useState } from 'react';

export default function Avatar({ user, className = '' }) {
  const [failed, setFailed] = useState(null);
  const url = user?.avatarUrl;
  return <span className={`adm-avatar profile-avatar ${className}`}>
    {url && url !== failed ? <img src={url} alt={`Photo de ${user?.nom ?? 'profil'}`} onError={() => setFailed(url)} /> : user?.nom?.slice(0, 1).toUpperCase() ?? '?'}
  </span>;
}
