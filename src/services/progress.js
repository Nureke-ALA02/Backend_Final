// Pure functions for the lesson-completion logic.
// No side effects, no DB calls — easy to unit-test.

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Stars based on accuracy:
 *   100%        → 3 stars
 *   ≥ 70%       → 2 stars
 *   otherwise   → 1 star
 * Edge case: totalCount = 0 means no exercises — defensively returns 1.
 */
function calculateStars(correctCount, totalCount) {
  if (totalCount <= 0) return 1;
  const accuracy = correctCount / totalCount;
  if (accuracy >= 1)   return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}

/**
 * XP per lesson:
 *   10 XP × correct answers + 5 XP bonus for a perfect run.
 */
function calculateXp(correctCount, stars) {
  const base = correctCount * 10;
  const bonus = stars === 3 ? 5 : 0;
  return base + bonus;
}

/**
 * Streak update.
 *
 *   prevStreak      — child's current streak count
 *   prevActiveDate  — child.lastActiveDate (Date | null)
 *   today           — usually `new Date()` (passed in to make the function testable)
 *
 * Returns: { newStreak, touchLastActive }
 *   - touchLastActive=false means lastActiveDate stays as-is (already today)
 *   - touchLastActive=true  means caller should set lastActiveDate = today
 */
function calculateStreak(prevStreak, prevActiveDate, today) {
  // Compare calendar days, not 24h windows.
  const todayMid = new Date(today);
  todayMid.setHours(0, 0, 0, 0);

  if (!prevActiveDate) {
    return { newStreak: 1, touchLastActive: true };
  }

  const lastMid = new Date(prevActiveDate);
  lastMid.setHours(0, 0, 0, 0);

  const diffDays = Math.round((todayMid - lastMid) / DAY_MS);

  if (diffDays === 0) {
    return { newStreak: prevStreak, touchLastActive: false };
  }
  if (diffDays === 1) {
    return { newStreak: prevStreak + 1, touchLastActive: true };
  }
  return { newStreak: 1, touchLastActive: true };
}

/**
 * Decide which badge ids to award now.
 *
 *   ctx = {
 *     wasFirstCompletion,   // boolean: did this complete a lesson the child never finished before?
 *     totalXpAfter,         // number: child.xp AFTER xpGained was added
 *     streakAfter,          // number: child.streak AFTER streak update
 *     allUnitLessonsDone,   // boolean: every lesson in the same unit is now completed at least once
 *     alreadyEarnedIds,     // Set<string>: badge ids the child already has
 *   }
 *
 * Returns: string[] — ids of badges to award (does NOT include ones already earned).
 */
function decideBadges(ctx) {
  const out = [];
  const has = (id) => ctx.alreadyEarnedIds.has(id);

  if (ctx.wasFirstCompletion && !has('first_lesson')) out.push('first_lesson');
  if (ctx.totalXpAfter >= 100 && !has('xp_100'))      out.push('xp_100');
  if (ctx.streakAfter >= 3 && !has('streak_3'))       out.push('streak_3');
  if (ctx.allUnitLessonsDone && !has('unit_done'))    out.push('unit_done');

  return out;
}

module.exports = { calculateStars, calculateXp, calculateStreak, decideBadges };
