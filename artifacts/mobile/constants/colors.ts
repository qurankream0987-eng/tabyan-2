// Native adapter for the shared design tokens. Keep the JSON copy inside the
// Mobile artifact because Metro cannot bundle workspace files outside its root.
import tokens from "./tokens.json";

export type DesignTokens = typeof tokens;

export default tokens;
