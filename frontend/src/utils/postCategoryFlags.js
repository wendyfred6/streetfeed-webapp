// Single source of truth for the category/sub-type flags that drive which
// fields NewPostSheet/EditPostSheet show. Previously each component computed
// its own copy of these flags and had drifted apart (see FRE-316): EditPostSheet
// recognized the sub_type aliases 'gezocht'/'search'/'bezorgd'/'have' but not
// the current CategoryPicker keys 'pakket_gezocht'/'pakket_aangenomen' — so
// editing a Package post created through the current picker showed neither
// the single house-number field nor the van/tot house row at all. Both flows
// now tolerate the full historical alias set; the extra aliases are simply
// unreachable in NewPostSheet since CategoryPicker only ever emits the
// current keys.
export function postCategoryFlags(category, subType) {
  const isBezorging   = category === 'bezorging'   || category === 'package';
  const isStraatzaken = category === 'straatzaken' || category === 'works';
  const isMelding     = category === 'melding'      || category === 'incident';
  const isEvenement   = category === 'evenement'    || category === 'event';
  const isAlgemeen    = category === 'algemeen';
  const isLostAndFound = category === 'lostandfound';

  const isGezocht = isBezorging && ['pakket_gezocht', 'gezocht', 'search'].includes(subType);
  const isBezorgd = isBezorging && ['pakket_aangenomen', 'bezorgd', 'have'].includes(subType);

  const hasDateRange = ['straatzaken', 'works', 'blockage', 'container'].includes(category);
  const hasTimeRange = isStraatzaken;
  const hasLink      = ['straatzaken', 'works', 'blockage', 'container', 'waste'].includes(category);

  return { isBezorging, isStraatzaken, isMelding, isEvenement, isAlgemeen, isLostAndFound, isGezocht, isBezorgd, hasDateRange, hasTimeRange, hasLink };
}
