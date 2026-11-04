// @vitest-environment happy-dom
// Every screen, rendered with React into a DOM and fed the recorded fixtures: it loads, shows its content, and says
// nothing failed. The data layer has its own tests (web.test.ts); this one catches a screen that throws or stays blank.
import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import demoJson from '../fixtures/demo.json';
import { App } from '../src/App';
import { fixturesApi } from '../src/api';
import type { DemoFixture } from '../src/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const demo = demoJson as unknown as DemoFixture;

let root: Root | null = null;
let el: HTMLElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  el?.remove();
  root = null;
});

/** Render the app at a route and let the fixtures load. */
async function show(hash: string): Promise<HTMLElement> {
  location.hash = hash;
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
  await act(async () => root!.render(<App api={fixturesApi({ stepDelayMs: 0 })} />));
  for (let i = 0; i < 20 && /\bLoading\./.test(el.textContent ?? ''); i++) await act(() => new Promise((r) => setTimeout(r, 10)));
  return el;
}

describe('every screen renders from the fixtures', () => {
  const pages: [string, string, RegExp][] = [
    ['home', '#/', /Know the merchant before your agent pays/],
    ['feed', '#/feed', /Decision feed/],
    ['one decision', '#/feed/0', /Agent A/],
    ['A and B', '#/split', /A and B, side by side/],
    ['merchants', '#/merchants', /Merchant records/],
    ['one merchant', `#/merchants/${demo.merchants.flaky}`, new RegExp(demo.merchants.flaky.replace(/\./g, '\\.'))],
    ['simulation', '#/simulation', /How often Fides was right/],
  ];
  for (const [name, hash, want] of pages) {
    it(name, async () => {
      const page = await show(hash);
      expect(page.textContent).toMatch(want);
      expect(page.textContent).not.toMatch(/\bLoading\.|could not be loaded|Could not load/);
      expect(page.querySelector('.notice.bad')).toBeNull();
      expect(page.textContent).toMatch(/fixtures|recorded/i); // the honesty label is on every page
    });
  }

  it('an evidence record, and an unknown one is an error, not an empty page', async () => {
    const id = (await fixturesApi().getMerchant(demo.merchants.flaky)).evidence[0]!.id;
    const page = await show(`#/evidence/${id}`);
    expect(page.textContent).toMatch(/The five checks/);
    // Re-verify runs the five checks one by one and ends with a verdict line.
    const button = [...page.querySelectorAll('button')].find((b) => b.textContent === 'Re-verify')!;
    await act(async () => button.click());
    for (let i = 0; i < 50 && !page.querySelector('.verdict-line'); i++) await act(() => new Promise((r) => setTimeout(r, 10)));
    expect(page.querySelectorAll('ol.explain li.pass')).toHaveLength(5);
    expect(page.querySelector('.verdict-line')?.textContent).toBe('Passes every check. It counts.');
    act(() => root?.unmount());
    el?.remove();
    const missing = await show(`#/evidence/${'0'.repeat(64)}`);
    expect(missing.textContent).toMatch(/no record/);
  });
});
