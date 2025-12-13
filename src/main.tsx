/**
 * IMPORTANT:
 * React Scan must run before React (and ReactDOM) imports execute.
 * We do that by initializing React Scan here, then dynamically importing the real app bootstrap.
 */

import { scan } from 'react-scan/all-environments';

function getReactScanEnabled(): boolean {
  const params = new URLSearchParams(window.location.search);
  const scanParam = params.get('scan')?.toLowerCase();
  if (scanParam === '1' || scanParam === 'true' || scanParam === 'on') return true;
  if (scanParam === '0' || scanParam === 'false' || scanParam === 'off') return false;

  // Local override: set to "1" / "0"
  const stored = localStorage.getItem('tavern.reactScan.enabled')?.toLowerCase();
  if (stored === '1' || stored === 'true' || stored === 'on') return true;
  if (stored === '0' || stored === 'false' || stored === 'off') return false;

  // Default: on in dev, off in prod unless forced by query/localStorage.
  return import.meta.env.DEV;
}

try {
  const enabled = getReactScanEnabled();
  scan({
    enabled,
    showToolbar: true,
  });
} catch (err) {
  // If react-scan fails for any reason, don't take the whole app down.
  console.warn('[tavern] React Scan failed to initialize:', err);
}

// Load the actual React app AFTER react-scan has had a chance to hijack devtools.
void import('./bootstrap');
