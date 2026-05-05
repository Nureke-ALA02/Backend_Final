const DAY_MS = 24 * 60 * 60 * 1000;

function calculateStars(correctCount, totalCount) {
  if (totalCount <= 0) return 1;
  const accuracy = correctCount / totalCount;
  if (accuracy >= 1)   return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
}

function calculateXp(correctCount, stars) {
  const base = correctCount * 10;
  const bonus = stars === 3 ? 5 : 0;
  return base + bonus;
}

function calculateStreak(prevStreak, prevActiveDate, today) {
 
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
