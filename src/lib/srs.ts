// A small SM-2 style scheduler. Correct answers push the next review further out,
// misses bring the question back tomorrow and lower its ease.
import { db } from "./db";

const DAY = 86_400_000;

export function recordReview(questionId: string, correct: boolean, now = Date.now()) {
  const row = db().prepare("SELECT * FROM reviews WHERE question_id = ?").get(questionId) as
    | { ease: number; interval_days: number; reps: number; lapses: number }
    | undefined;
  let ease = row?.ease ?? 2.5;
  let interval = row?.interval_days ?? 0;
  let reps = row?.reps ?? 0;
  let lapses = row?.lapses ?? 0;

  if (correct) {
    reps += 1;
    interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(interval * ease);
    ease = Math.min(3.0, ease + 0.05);
  } else {
    reps = 0;
    lapses += 1;
    interval = 1;
    ease = Math.max(1.3, ease - 0.2);
  }
  db()
    .prepare(
      `INSERT INTO reviews(question_id,ease,interval_days,reps,lapses,due_at) VALUES(?,?,?,?,?,?)
       ON CONFLICT(question_id) DO UPDATE SET ease=excluded.ease, interval_days=excluded.interval_days,
       reps=excluded.reps, lapses=excluded.lapses, due_at=excluded.due_at`
    )
    .run(questionId, ease, interval, reps, lapses, now + interval * DAY);
}
