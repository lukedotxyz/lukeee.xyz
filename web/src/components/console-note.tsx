import { useEffect } from 'react';

declare global {
  interface Window {
    __lukeConsoleShown?: boolean;
    tide?: () => string;
  }
}

export function ConsoleNote() {
  useEffect(() => {
    const summonTide = () => {
      window.dispatchEvent(new Event('luke:tide'));
      return 'the shoreline moved.';
    };

    window.tide = summonTide;

    if (!window.__lukeConsoleShown) {
      console.log(
        '%c LUKE MALONEY ',
        'background:#aebfc0;color:#182020;padding:5px 8px;font:600 12px monospace;letter-spacing:.12em',
      );
      console.log(
        '%csoftware engineer\nx.com/lukedotxyz',
        'color:#718486;font:11px/1.65 monospace',
      );
      console.log(
        '%cthe shoreline has a console.\ntype %ctide()%c and watch closely.',
        'color:#8d8580;font:italic 11px/1.65 monospace',
        'color:#5f7779;font:600 11px monospace',
        'color:#8d8580;font:italic 11px/1.65 monospace',
      );
      window.__lukeConsoleShown = true;
    }

    return () => {
      if (window.tide === summonTide) delete window.tide;
    };
  }, []);

  return null;
}
