import { useEffect, useState } from 'react';
import { api, getToken, API_URL } from './api.js';

// The organization's name and uploaded logo, for the sidebar.
// The settings page fires 'org-brand-changed' after a save so the sidebar updates without a reload.
export const BRAND_EVENT = 'org-brand-changed';
export const brandChanged = () => window.dispatchEvent(new Event(BRAND_EVENT));

async function loadBrand() {
  const org = await api('/organization');
  let logo = '';
  if (org.has_logo) {
    const res = await fetch(`${API_URL}/api/organization/logo`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) logo = URL.createObjectURL(await res.blob());
  }
  return { name: org.name || '', logo };
}

export function useOrgBrand(enabled) {
  const [brand, setBrand] = useState({ name: '', logo: '' });

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    let current = '';
    const refresh = () =>
      loadBrand()
        .then((b) => {
          if (!alive) return b.logo && URL.revokeObjectURL(b.logo);
          if (current) URL.revokeObjectURL(current);
          current = b.logo;
          setBrand(b);
        })
        .catch(() => {});
    refresh();
    window.addEventListener(BRAND_EVENT, refresh);
    return () => {
      alive = false;
      window.removeEventListener(BRAND_EVENT, refresh);
      if (current) URL.revokeObjectURL(current);
    };
  }, [enabled]);

  return brand;
}
