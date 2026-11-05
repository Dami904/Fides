// @vitest-environment happy-dom
// Every screen, rendered with React into a DOM and fed the recorded fixtures: it loads, shows its content, and says
// nothing failed. The data layer has its own tests (web.test.ts); this one catches a screen that throws or stays blank.
import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import demoJson from '../fixtures/demo.json';
import { App } from '../src/App';
import { fixturesApi, type FidesApi } from '../src/api';
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
async function show(hash: string, api: FidesApi = fixturesApi({ stepDelayMs: 0 })): Promise<HTMLElement> {
  location.hash = hash;
  el = document.createElement('div');
  document.body.appendChild(el);
  root = createRoot(el);
  await act(async () => root!.render(<App api={api} />));
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

describe('the A / B split with a live engine behind it', () => {
  const base = fixturesApi({ stepDelayMs: 0 });
  const clickState = async (page: HTMLElement, label: string) => {
    const b = [...page.querySelectorAll('button, [role="radio"]')].find((x) => x.textContent === label) as HTMLElement;
    await act(async () => b.click());
    for (let i = 0; i < 30 && /Asking the engine now/.test(page.textContent ?? ''); i++) await act(() => new Promise((r) => setTimeout(r, 10)));
  };

  it('shows the answer of the engine as live, and does not describe an outcome the live answer did not reach', async () => {
    const split = await base.getSplit();
    const asked: string[] = [];
    const api: FidesApi = {
      ...base,
      mode: 'live',
      // A live answer that differs from the recording: the detached state refuses instead of asking.
      probeSplit: async (state) => {
        asked.push(state);
        const check = structuredClone(split.states[state].check!);
        if (state === 'detached') check.verdict.decision = 'REFUSE';
        return { check, checkedAt: '2026-11-04T12:34:56.000Z' };
      },
    };
    const page = await show('#/split', api);
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(asked).toContain('attached');
    expect(page.textContent).toMatch(/Live: the engine answered this just now \(12:34:56 UTC\)/);
    await clickState(page, 'Detached');
    expect(asked).toContain('detached');
    expect(page.textContent).toMatch(/Follows from the decision above/);
  });

  it('a run on the real relayer has no unreachable answer: it says so, and the screen does not fall over', async () => {
    const split = await base.getSplit();
    const api: FidesApi = {
      ...base,
      mode: 'live',
      getSplit: async () => ({ ...split, states: { ...split.states, unreachable: { ...split.states.unreachable, check: null } } }),
      probeSplit: async (state) => {
        if (state === 'unreachable') throw new Error('this server uses the real Walrus Memory relayer');
        return { check: split.states[state].check!, checkedAt: '2026-11-04T12:34:56.000Z' };
      },
    };
    const page = await show('#/split', api);
    await clickState(page, 'Unreachable');
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(page.textContent).toMatch(/no honest answer for this state/);
    expect(page.textContent).toMatch(/There is no recorded decision for this state either/);
    expect(page.textContent).not.toMatch(/hit an error/);
    await clickState(page, 'Attached');
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(page.textContent).not.toMatch(/no honest answer/);
  });

  it('a screen that throws shows the error instead of a blank page', async () => {
    const quiet = console.error;
    console.error = () => undefined;
    try {
      const api: FidesApi = { ...base, getSplit: async () => ({}) as never };
      const page = await show('#/split', api);
      await act(() => new Promise((r) => setTimeout(r, 20)));
      expect(page.textContent).toMatch(/This screen hit an error/);
      expect(page.textContent).toMatch(/fixtures|recorded/i); // the shell and its honesty label survive
    } finally {
      console.error = quiet;
    }
  });

  it('a live check that fails says so and keeps the recorded decision', async () => {
    const api: FidesApi = { ...base, mode: 'live', probeSplit: async () => { throw new Error('the shared record cannot be switched off here'); } };
    const page = await show('#/split', api);
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(page.textContent).toMatch(/Live check not available for this state \(the shared record cannot be switched off here\)\. Showing the recorded decision/);
    expect(page.querySelector('.notice.bad')).toBeNull();
  });
});
