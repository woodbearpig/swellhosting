import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

const SiteContext = createContext({ site: null, refresh: () => {} });

export const SiteProvider = ({ children }) => {
  const [site, setSite] = useState(null);

  const refresh = async () => {
    try {
      const { data } = await api.get('/site-content');
      setSite(data);
    } catch (e) {
      console.warn('Failed to load site content', e);
    }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <SiteContext.Provider value={{ site, refresh }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => useContext(SiteContext);
