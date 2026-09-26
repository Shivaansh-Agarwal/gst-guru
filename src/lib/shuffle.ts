import type { Question } from "./content";

/** Mulberry32: tiny seeded RNG so evals are repeatable. */
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shuffle MCQ options and remap the answer index. True/false keeps its order. */
export function shuffleOptions(q: Question, rand: () => number = Math.random): Question {
  if (q.type !== "mcq" || !q.options || q.answer === undefined) return q;
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, options: order.map((i) => q.options![i]), answer: order.indexOf(q.answer) };
}
