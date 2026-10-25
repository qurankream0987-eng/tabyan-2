/**
 * GENERAL follows the next page as soon as a stable canonical match lands
 * there. Requiring the previous visible word to be near page-end blocks
 * legitimate continuation after a pause or skipped tail words.
 */
export function getGeneralRecitationFollowTarget(
  visiblePage: number,
  matchedPage: number,
): number | null {
  return matchedPage === visiblePage + 1 ? matchedPage : null;
}
