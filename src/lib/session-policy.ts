// Remember the account, never its password. Existing account/session-version
// checks still revoke suspended accounts, password resets and signed-out devices.
export const REMEMBERED_SESSION_SECONDS = 90 * 24 * 60 * 60;
