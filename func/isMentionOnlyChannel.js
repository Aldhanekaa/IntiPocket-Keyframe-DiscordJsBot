const { localdb } = require('../config.json');
const path = require('path');
/**
 * @param {string} channelId
 * @returns {boolean}
 */
function isMentionOnlyChannel(channelId, clientId) {
  /**
   * @type {Record<string, import('../main').BotProperty>}
   */
  const bots = require(path.join(process.env.APP_DIR, localdb.bots));

  // console.log(bots, clientId, bots[clientId]);
  return bots[clientId].mention_only_channels.includes(channelId);
}

module.exports = isMentionOnlyChannel;