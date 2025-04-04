const path = require('path');

const {
  localdb: { cmds_permissions },
} = require('../config.json');

/**
 *
 * @param {string} commandName
 * @param {string} clientId
 * @returns {undefined|{userIds:Array<string>; roleIds: Array<string>; channIds: Array<string>}}
 */
async function findPermissions(commandName, clientId) {
  var projectFolder = path.dirname(path.resolve(__dirname));

  const permissions = require(path.join(projectFolder, cmds_permissions));

  if (permissions[clientId]) {
    if (permissions[clientId][commandName]) {
      return permissions[clientId][commandName];
    }
  }

  return undefined;
}

module.exports = findPermissions;