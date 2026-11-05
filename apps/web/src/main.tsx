import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { liveApi } from './api';
import './styles.css';

const root = createRoot(document.getElementById('root')!);
// pnpm web:live sets VITE_FIDES_API. Without it the UI runs on the recorded fixtures.
const base = import.meta.env.VITE_FIDES_API as string | undefined;

if (!base) {
  root.render(<StrictMode><App /></StrictMode>);
} else {
  liveApi(base).then(
    (api) => root.render(<StrictMode><App api={api} /></StrictMode>),
    // Fail loudly: an unreachable live API is shown as that, never quietly replaced by the fixtures.
    (e: Error) =>
      root.render(
        <main className="fatal">
          <div className="notice bad">
            <strong>The live API could not be reached.</strong>
            <p>{e.message}</p>
            <p>Start it with <code>pnpm web:live</code>, or run <code>pnpm web</code> for the recorded fixtures.</p>
          </div>
        </main>,
      ),
  );
}
