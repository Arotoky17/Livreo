import { useEffect, useState } from 'react';

export default function useStatisticsIntro(ready) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!ready || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame;
    let start;
    function animate(time) {
      start ??= time;
      const elapsed = Math.min((time - start) / 750, 1);
      setProgress(1 - (1 - elapsed) ** 3);
      if (elapsed < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  return ready && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? progress : 1;
}
