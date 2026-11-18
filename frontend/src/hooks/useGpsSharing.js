import { useEffect, useState } from 'react';
import api from '../services/api.js';

export default function useGpsSharing(activeIds) {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState(null);
  const [lastSent, setLastSent] = useState(null);
  useEffect(() => {
    if (!enabled || !activeIds) return;
    const ids = activeIds.split('|');
    const controller = new AbortController();
    let inFlight = false;
    function send() {
      if (controller.signal.aborted || inFlight) return;
      if (!navigator.geolocation) { setError('La géolocalisation n’est pas disponible dans ce navigateur.'); setEnabled(false); return; }
      if (!window.isSecureContext) { setError('Le partage GPS nécessite HTTPS ou une connexion locale sécurisée.'); setEnabled(false); return; }
      inFlight = true;
      navigator.geolocation.getCurrentPosition(async (result) => {
        if (controller.signal.aborted) return;
        const { latitude, longitude, accuracy, speed, heading } = result.coords;
        const responses = await Promise.allSettled(ids.map((id) => api.post(`/deliveries/${id}/location`, { latitude, longitude, accuracy, speed, heading }, { signal: controller.signal, timeout: 12000 })));
        if (controller.signal.aborted) return;
        inFlight = false;
        const succeeded = responses.filter((response) => response.status === 'fulfilled').length;
        if (succeeded) {
          const at = new Date(); setPosition({ latitude, longitude, accuracy, recordedAt: at }); setLastSent(at);
          setError(succeeded === ids.length ? '' : 'Le signal a été envoyé pour une partie des courses. Actualisez la liste des livraisons.');
        } else setError('Le signal GPS n’a pas pu être transmis. Vérifiez votre connexion.');
      }, (reason) => {
        if (controller.signal.aborted) return;
        inFlight = false;
        setError(reason.code === 1 ? 'Autorisez la géolocalisation dans votre navigateur pour partager votre position.' : 'Position introuvable. Vérifiez votre GPS et réessayez.');
        if (reason.code === 1) setEnabled(false);
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
    }
    send();
    const timer = setInterval(send, 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [enabled, activeIds]);
  return { enabled: enabled && !!activeIds, error, position, lastSent, start: () => { setError(''); setEnabled(true); }, stop: () => setEnabled(false) };
}

