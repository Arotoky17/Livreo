import { useState } from 'react';

const storageKey = 'livreo-portal-theme';

export default function usePortalTheme() {
  const [dark, setDark] = useState(() => {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  function toggleTheme() {
    window.localStorage.setItem(storageKey, dark ? 'light' : 'dark');
    setDark(!dark);
  }

  return { dark, toggleTheme };
}

