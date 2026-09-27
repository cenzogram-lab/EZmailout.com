/**
 * Text bounds the canister enforces where input enters it. Mirrors
 * `src/backend/lib/inputs.mo` and `mixins/support-api.mo`; change both.
 */
export const MAX_CAMPAIGN_NAME_CHARS = 100;
export const MAX_PRESET_NAME_CHARS = 100;
/** Every line of a recipient or return address, the name included. */
export const MAX_ADDRESS_FIELD_CHARS = 100;
export const MAX_TICKET_SUBJECT_CHARS = 160;
export const MAX_TICKET_MESSAGE_CHARS = 2000;
export const MAX_REDIRECT_URL_CHARS = 2048;
