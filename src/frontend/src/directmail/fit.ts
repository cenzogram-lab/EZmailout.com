/**
 * Overflow fitting shared by the React renderer and static/print renders.
 *
 *  - `[data-fittext][data-fit-base="<px>"]` elements have their font-size
 *    reduced (down to 55%) until they stop overflowing their own box
 *    (used with `-webkit-line-clamp` headlines).
 *  - `[data-fitbox]` elements have their first child zoomed down (to 50%)
 *    until the box stops overflowing vertically. Inner boxes are fitted
 *    before outer ones, and a step that makes no progress (an overflow zoom
 *    cannot cure, e.g. a rotated badge poking out) is reverted.
 *
 * `fitRuntime` is deliberately self-contained (no imports, no closures over
 * module scope) so `FIT_SCRIPT` can inline it into a static HTML page via
 * `Function.prototype.toString()`.
 */
export function fitRuntime(
  root: ParentNode & { matches?: (s: string) => boolean },
): void {
  const ownMatch = (sel: string) =>
    typeof root.matches === "function" && root.matches(sel)
      ? [root as unknown as HTMLElement]
      : [];
  const all = (sel: string) => [
    ...ownMatch(sel),
    ...Array.from(root.querySelectorAll<HTMLElement>(sel)),
  ];

  // 1. headlines & other clamped text — shrink font-size while a line is being clamped.
  // Tight line-heights let glyphs overhang the line box, so scrollHeight is always a
  // little larger than clientHeight; only a difference of half a line means a hidden line.
  const textOverflow = (el: HTMLElement) => {
    const lh =
      Number.parseFloat(getComputedStyle(el).lineHeight) ||
      Number.parseFloat(getComputedStyle(el).fontSize) * 1.1;
    return (
      el.scrollHeight - el.clientHeight > lh * 0.5 ||
      el.scrollWidth - el.clientWidth > 2
    );
  };
  for (const el of all("[data-fittext]")) {
    const base =
      Number.parseFloat(el.dataset.fitBase || "") ||
      Number.parseFloat(getComputedStyle(el).fontSize);
    el.style.fontSize = `${base}px`;
    let size = base;
    let guard = 0;
    while (textOverflow(el) && size > base * 0.55 && guard < 24) {
      size *= 0.96;
      el.style.fontSize = `${size}px`;
      guard++;
    }
  }

  // 2. whole columns / panels — deepest first so inner fits don't fight outer ones
  const depth = (el: Element) => {
    let d = 0;
    for (let n: Element | null = el; n; n = n.parentElement) d++;
    return d;
  };
  // Content that spills past the inner box's content edge into its own padding does
  // not register as overflow of the outer box, so the children are measured against
  // the inner's content-box bottom too. getBoundingClientRect() is in page px whatever
  // the zoom; offsetHeight / computed padding are in the inner's own CSS px.
  const innerOverflow = (inner: HTMLElement) => {
    const r = inner.getBoundingClientRect();
    if (!inner.offsetHeight || !r.height) return 0;
    const scale = r.height / inner.offsetHeight;
    const cs = getComputedStyle(inner);
    const contentBottom =
      r.bottom -
      ((Number.parseFloat(cs.paddingBottom) || 0) +
        (Number.parseFloat(cs.borderBottomWidth) || 0)) *
        scale;
    let maxBottom = Number.NEGATIVE_INFINITY;
    for (const ch of Array.from(inner.children)) {
      const cr = ch.getBoundingClientRect();
      if (cr.height > 0) maxBottom = Math.max(maxBottom, cr.bottom);
    }
    return maxBottom === Number.NEGATIVE_INFINITY
      ? 0
      : maxBottom - contentBottom;
  };
  const boxOverflow = (outer: HTMLElement, inner: HTMLElement) =>
    Math.max(outer.scrollHeight - outer.clientHeight, innerOverflow(inner));
  const boxes = all("[data-fitbox]").sort((a, b) => depth(b) - depth(a));
  for (const outer of boxes) {
    const inner = outer.firstElementChild as HTMLElement | null;
    if (!inner) continue;
    const min = Number.parseFloat(outer.dataset.fitMin || "") || 0.5;
    inner.style.removeProperty("zoom");
    let z = 1;
    let guard = 0;
    let prev = boxOverflow(outer, inner);
    while (prev > 1 && z > min && guard < 30) {
      const next = Math.max(min, +(z - 0.03).toFixed(3));
      inner.style.setProperty("zoom", String(next));
      const now = boxOverflow(outer, inner);
      if (now >= prev) {
        // no progress — this overflow is not something zoom can fix; undo
        if (z === 1) inner.style.removeProperty("zoom");
        else inner.style.setProperty("zoom", String(z));
        break;
      }
      z = next;
      prev = now;
      guard++;
    }
  }
}
