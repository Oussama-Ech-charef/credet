'use strict';

/**
 * Escape the wildcard characters used by SQLite LIKE so a user's search text
 * is always treated as literal text. Pair this with ESCAPE '\'.
 */
function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (character) => `\\${character}`);
}

module.exports = { escapeLike };
