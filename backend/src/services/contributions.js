import { query } from '../db/index.js';

// FRE-403: which Hall of Fame categories a given post qualifies for at the
// moment it's created. "Posts" is generic — every post counts toward it,
// regardless of category. The other three mirror the same category/subType
// combinations the old (query-time) HALL_OF_FAME_TITLES used, tolerating the
// same historical subType aliases postCategoryFlags.js already does — a
// post created through any past version of the composer should still earn
// the right achievement.
export function contributionCategoriesFor(category, subType) {
  const categories = ['posts'];

  const isPackageAccepted = (category === 'bezorging' || category === 'package')
    && ['pakket_aangenomen', 'bezorgd', 'have'].includes(subType);
  if (isPackageAccepted) categories.push('package_hero');

  const isFound = category === 'lostandfound' && subType === 'gevonden';
  if (isFound) categories.push('lost_and_found');

  const isEvent = category === 'evenement' || category === 'event';
  if (isEvent) categories.push('event_organizer');

  return categories;
}

// Recorded once, at post-creation time, and never touched again — this is
// the historical record an achievement is permanently backed by, independent
// of whether the post itself later expires (FRE-402) or is deleted.
export async function recordContributions({ userId, streetId, category, subType }) {
  const keys = contributionCategoriesFor(category, subType);
  for (const key of keys) {
    await query(
      'INSERT INTO contributions (user_id, street_id, category) VALUES ($1, $2, $3)',
      [userId, streetId, key]
    );
  }
}
