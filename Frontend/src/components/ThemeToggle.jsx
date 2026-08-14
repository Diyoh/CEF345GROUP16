import React, { useEffect, useState } from 'react';
import { Button } from './ui';

/**
 * Theme toggle. The initial class is applied by the inline script in index.html before
 * first paint, so the page never flashes the wrong background; this only switches it
 * afterwards and records the choice.
 */
export const ThemeToggle = ({ size = 'sm' }) => {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('br-theme', dark ? 'dark' : 'light');
    } catch (e) {
      /* private mode: the choice simply does not persist */
    }
  }, [dark]);

  return (
    <Button
      variant="ghost"
      size={size}
      iconOnly
      onClick={() => setDark((v) => !v)}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      leadingIcon={<i className={dark ? 'fas fa-sun' : 'fas fa-moon'} aria-hidden="true" />}
    />
  );
};
