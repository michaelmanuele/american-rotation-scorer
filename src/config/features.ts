/**
 * Feature flags.
 *
 * Runtime-evaluated (not build-time) so the same JS bundle can behave
 * differently between dev-client and production. We read `__DEV__` (the
 * global React Native / Metro dev flag) so dev builds see all features
 * enabled while production builds ship with unfinished features hidden.
 *
 * When a flag graduates to always-on, delete the flag entirely rather
 * than flipping the default \u2014 dead branches accumulate quickly.
 */

/**
 * Challonge integration (OAuth sign-in, tournament linking, league scoring
 * post-back). Currently blocked on Challonge Sandbox tier visibility; only
 * the app owner can see the app in Challonge's Connect dropdown. Hidden in
 * production so external testers don't see a broken sign-in flow.
 *
 * Turn back on once we hear back from Challonge support and can publish
 * the app publicly, or if the plan shifts to a Bring-Your-Own-API-Key
 * fallback that works for everyone.
 */
export const CHALLONGE_ENABLED: boolean = __DEV__;
