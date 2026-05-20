const {
  calculateStars,
  calculateXp,
  calculateStreak,
  decideBadges,
} = require('../../src/services/progress');

describe('calculateStars', () => {
  test('returns 3 stars for a perfect run', () => {
    expect(calculateStars(3, 3)).toBe(3);
    expect(calculateStars(10, 10)).toBe(3);
  });

  test('returns 2 stars for 70%–99% accuracy', () => {
    expect(calculateStars(7, 10)).toBe(2);
    expect(calculateStars(8, 10)).toBe(2);
    expect(calculateStars(9, 10)).toBe(2);
  });

  test('returns 1 star for accuracy below 70%', () => {
    expect(calculateStars(6, 10)).toBe(1);
    expect(calculateStars(0, 10)).toBe(1);
    expect(calculateStars(1, 3)).toBe(1);
  });

  test('handles 0 total defensively', () => {
    expect(calculateStars(0, 0)).toBe(1);
  });
});

describe('calculateXp', () => {
  test('awards 10 XP per correct answer', () => {
    expect(calculateXp(0, 1)).toBe(0);
    expect(calculateXp(2, 1)).toBe(20);
    expect(calculateXp(5, 2)).toBe(50);
  });

  test('adds 5 XP bonus for a 3-star run', () => {
    expect(calculateXp(3, 3)).toBe(35);
    expect(calculateXp(10, 3)).toBe(105);
  });

  test('no bonus for 2 or 1 stars', () => {
    expect(calculateXp(2, 2)).toBe(20);
    expect(calculateXp(2, 1)).toBe(20);
  });
});

describe('calculateStreak', () => {
  const today = new Date('2026-04-15T10:30:00');

  test('first ever activity → streak = 1', () => {
    const r = calculateStreak(0, null, today);
    expect(r.newStreak).toBe(1);
    expect(r.touchLastActive).toBe(true);
  });

  test('same calendar day → streak unchanged', () => {
    const lastActive = new Date('2026-04-15T08:00:00');
    const r = calculateStreak(5, lastActive, today);
    expect(r.newStreak).toBe(5);
    expect(r.touchLastActive).toBe(false);
  });

  test('exactly one day later → streak + 1', () => {
    const lastActive = new Date('2026-04-14T22:00:00');
    const r = calculateStreak(5, lastActive, today);
    expect(r.newStreak).toBe(6);
    expect(r.touchLastActive).toBe(true);
  });

  test('two or more days later → streak resets to 1', () => {
    const lastActive = new Date('2026-04-13T10:00:00');
    const r = calculateStreak(5, lastActive, today);
    expect(r.newStreak).toBe(1);
    expect(r.touchLastActive).toBe(true);
  });

  test('streak across midnight: 23:00 yesterday → 01:00 today still counts as 1 day', () => {
    const lastActive = new Date('2026-04-14T23:00:00');
    const earlyToday = new Date('2026-04-15T01:00:00');
    const r = calculateStreak(2, lastActive, earlyToday);
    expect(r.newStreak).toBe(3);
  });
});

describe('decideBadges', () => {
  test('first lesson ever → awards first_lesson', () => {
    const out = decideBadges({
      wasFirstCompletion: true,
      totalXpAfter: 30,
      streakAfter: 1,
      allUnitLessonsDone: false,
      alreadyEarnedIds: new Set(),
    });
    expect(out).toContain('first_lesson');
  });

  test('passing 100 XP → awards xp_100', () => {
    const out = decideBadges({
      wasFirstCompletion: false,
      totalXpAfter: 105,
      streakAfter: 1,
      allUnitLessonsDone: false,
      alreadyEarnedIds: new Set(),
    });
    expect(out).toEqual(['xp_100']);
  });

  test('streak hits 3 → awards streak_3', () => {
    const out = decideBadges({
      wasFirstCompletion: false,
      totalXpAfter: 50,
      streakAfter: 3,
      allUnitLessonsDone: false,
      alreadyEarnedIds: new Set(),
    });
    expect(out).toEqual(['streak_3']);
  });

  test('finishing every lesson in unit → awards unit_done', () => {
    const out = decideBadges({
      wasFirstCompletion: false,
      totalXpAfter: 50,
      streakAfter: 1,
      allUnitLessonsDone: true,
      alreadyEarnedIds: new Set(),
    });
    expect(out).toEqual(['unit_done']);
  });

  test('does not re-award badges already earned', () => {
    const out = decideBadges({
      wasFirstCompletion: true,
      totalXpAfter: 200,
      streakAfter: 5,
      allUnitLessonsDone: true,
      alreadyEarnedIds: new Set(['first_lesson', 'xp_100', 'streak_3', 'unit_done']),
    });
    expect(out).toEqual([]);
  });

  test('returns multiple badges at once when several conditions are met', () => {
    const out = decideBadges({
      wasFirstCompletion: true,
      totalXpAfter: 100,
      streakAfter: 1,
      allUnitLessonsDone: false,
      alreadyEarnedIds: new Set(),
    });
    expect(out).toEqual(expect.arrayContaining(['first_lesson', 'xp_100']));
    expect(out).toHaveLength(2);
  });
});
