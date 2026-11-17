import React, { useEffect, useState } from 'react';
import { AuthProvider } from './lib/auth';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';

/** Tiny hash router: "#/app" → dashboard, anything else → landing page. */
function useRoute() {
  const read = () => (window.location.hash.startsWith('#/app') ? 'app' : 'landing');
  const [route, setRoute] = useState<'app' | 'landing'>(read);
  useEffect(() => {
    const on = () => { setRoute(read()); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => { if (route === 'app') window.scrollTo(0, 0); }, [route]);
  return route;
}

export default function App() {
  const route = useRoute();
  return (
    <AuthProvider>
      {route === 'app' ? <Dashboard /> : <Landing />}
    </AuthProvider>
  );
}
