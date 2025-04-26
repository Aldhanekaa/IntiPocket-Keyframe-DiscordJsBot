/**
 * DO NOT CHANGE THIS FINAL FILE.
 */

const findPermissions = require("../func/findPermissions");
const { Events } = require("discord.js");

module.exports = {
  name: Events.InteractionCreate,

  /**
     *
     * @param {import('discord.js').Interaction} interaction
     * @param {string} clientId
     * @param {string|undefined} extInteractionId
  
     */
  async execute(
    interaction,
    clientId,

    extInteractionId,
    botAddons
  ) {
    // console.log('INT CRE', interaction);
    let commandName;
    let extSplit;

    // console.log('extInteractionId: ' + extInteractionId);

    if (extInteractionId) {
      extSplit = extInteractionId.split(".");
      commandName = extSplit[0];
    } else if (!interaction.isChatInputCommand()) return;

    if (!extInteractionId) {
      commandName = interaction.commandName;
    }

    // console.log(interaction.client.commands);
    const command = interaction.client.commands.get(commandName);

    console.log("commandName " + commandName);
    console.log("command " + command);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    if (extInteractionId) {
      // console.log('EYO c', trainBotSDK);
      await command.execute(interaction, clientId, extInteractionId, botAddons);
      return;
    }

    const userPermissions = await findPermissions(
      interaction.commandName,
      clientId
    );
    // console.log(userPermissions);

    try {
      // console.log('command: ', command);
      if (userPermissions != undefined && commandName != "client") {
        const containRequiredRoles = false;
        const isUserValid = userPermissions.userIds.includes(
          interaction.user.id
        );

        // for loop to check whether user has required role
        for (let i = 0; i < userPermissions.roleIds.length; i++) {
          const role = userPermissions.roleIds[i];

          if (role in interaction.member.roles) {
            containRequiredRoles = true;
            break;
          }
        }

        // console.log(isUserValid, containRequiredRoles);
        if (!containRequiredRoles && !isUserValid) {
          return interaction.reply("You are not allowed to use this command");
        }
        if (!isUserValid && !containRequiredRoles) {
          return interaction.reply("You are not allowed to use this command");
        }

        if (
          userPermissions.channIds != undefined &&
          !userPermissions.channIds.includes(interaction.channelId)
        ) {
          return interaction.reply(
            `You can't use this command in this channel.`
          );
        }
      }

      await command.execute(interaction, clientId, extInteractionId, botAddons);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}`);
      console.error(error);
    }
  },
};
