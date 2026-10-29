// Shared by build.mjs and legal.mjs. Kept in its own file so those two never import each other.
export const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
