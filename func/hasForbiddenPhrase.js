const forbiddenPhrases = require('../localdb/forbidden-phrases.json');

/**
 *
 * @param {string} messageContent
 * @returns {boolean}
 */
// Function to check if a message matches any forbidden phrase
function hasForbiddenPhrase(messageContent) {
  for (const phrase of forbiddenPhrases) {
    if (messageContent.toLowerCase().includes(phrase.toLowerCase())) {
      return true;
    }
  }
  return false;
}
module.exports = hasForbiddenPhrase;