import React, { useState, useEffect } from 'react';
import { ProjectorDisplayView } from './components/ProjectorDisplayView';
import { DedicatedHostPanel } from './components/DedicatedHostPanel';
import { DualDisplayLauncher } from './components/DualDisplayLauncher';

type AppRoute = 'launcher' | 'host' | 'display';

function getRouteFromLocation(): AppRoute {
  if (typeof window === 'undefined') return 'launcher';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (path.startsWith('/host') || hash.includes('host')) {
    return 'host';
  }
  if (path.startsWith('/display') || hash.includes('display')) {
    return 'display';
  }
  return 'launcher';
}

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getRouteFromLocation);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(getRouteFromLocation());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (route: AppRoute) => {
    setCurrentRoute(route);
    const targetUrl = route === 'launcher' ? '/' : `/${route}`;
    try {
      window.history.pushState({}, '', targetUrl);
    } catch {
      window.location.hash = `#/${route}`;
    }
  };

  switch (currentRoute) {
    case 'display':
      return <ProjectorDisplayView />;
    case 'host':
      return <DedicatedHostPanel />;
    case 'launcher':
    default:
      return <DualDisplayLauncher onSelectView={(view) => navigateTo(view as AppRoute)} />;
  }
};

export default App;
