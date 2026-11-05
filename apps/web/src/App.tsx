import { useEffect, useMemo, useState } from 'react';
import { fixturesApi, type FidesApi } from './api';
import { ScreenBoundary, Shell } from './components';
import { parseRoute, type Route } from './lib';
import { Decision } from './screens/Decision';
import { Evidence } from './screens/Evidence';
import { Feed } from './screens/Feed';
import { Home } from './screens/Home';
import { Merchant } from './screens/Merchant';
import { Merchants } from './screens/Merchants';
import { Simulation } from './screens/Simulation';
import { Split } from './screens/Split';

export function App({ api: given }: { api?: FidesApi } = {}) {
  // The one place the data source is chosen. Fixtures now; the live API replaces it without touching a screen.
  const api = useMemo(() => given ?? fixturesApi(), [given]);
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => { setRoute(parseRoute(location.hash)); scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return (
    <Shell api={api} route={route}>
      <ScreenBoundary key={JSON.stringify(route)}>
      {route.name === 'home' && <Home api={api} />}
      {route.name === 'feed' && <Feed api={api} />}
      {route.name === 'decision' && <Decision api={api} index={route.index} />}
      {route.name === 'split' && <Split api={api} />}
      {route.name === 'merchants' && <Merchants api={api} />}
      {route.name === 'merchant' && <Merchant api={api} host={route.host} />}
      {route.name === 'evidence' && <Evidence api={api} id={route.id} />}
      {route.name === 'simulation' && <Simulation api={api} />}
      </ScreenBoundary>
    </Shell>
  );
}
