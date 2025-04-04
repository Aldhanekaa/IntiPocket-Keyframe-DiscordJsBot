const { SlashCommandBuilder } = require("discord.js");

const fs = require("fs");
const path = require("path");

// const commands = []

const moderatorCommandBuilder = new SlashCommandBuilder()
  .setName("moderator")
  .setDescription("moderator command")
  .addSubcommandGroup((subcommandGroup) =>
    subcommandGroup
      .setName("blacklist-ai")
      .setDescription("Manage the blacklist")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("add")
          .setDescription("Add a user to the blacklist")
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("User to blacklist")
              .setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName("case")
              .setDescription("Related Violation Group")
              .setRequired(true)
              .addChoices(
                {
                  name: "Discord's Community Guidelines",
                  value: "Discord's Community Guidelines",
                },
                {
                  name: "Misleading Information & Unresponsible Statement",
                  value: "Misleading Information & Unresponsible Statement",
                },
                { name: "Links Sharing", value: "Links Sharing" },
                { name: "Mention", value: "Mention" },
                { name: "Bot's Persuading", value: "Bot's Persuading" },
                {
                  name: "Harassment, Etchics, and Chat Attitudes",
                  value: "Harassment, Etchics, and Chat Attitudes",
                },
                { name: "Excessive Use & Spam", value: "Excessive Use & Spam" },
                { name: "Impersonation", value: "Impersonation" },
                { name: "Punishment Evading", value: "Punishment Evading" },
                { name: "Custom (Please Specify)", value: "Another Reason" }
              )
          )
          .addStringOption((option) =>
            option
              .setName("reason")
              .setDescription("Reason for blacklisting")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("remove")
          .setDescription("Remove a user from the blacklist")
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("User to remove from the blacklist")
              .setRequired(true)
          )
      )
  )
  .addSubcommand((subCommand) =>
    subCommand
      .setName("mute")
      .setDescription("Mute bot on the spot (on current channel)")
  )
  .addSubcommand((subCommand) =>
    subCommand
      .setName("unmute")
      .setDescription("Unmute bot on the spot (on current channel)")
      .addBooleanOption((option) =>
        option
          .setName("mention-only")
          .setDescription("Only reply when the bot mentioned by a user.")
          .setRequired(false)
      )
  )
  .addSubcommand((subCommand) =>
    subCommand
      .setName("refresh-bot")
      .setDescription("Refresh Bot to deploy new changes in ")
  );
module.exports = {
  data: moderatorCommandBuilder,
  instanceAdmin: false,
  channelLimit: true,
  admin: true,

  /**
   *
   * @param {import('discord.js').Interaction} interaction
   * @param {string} clientId
   * @param {string} extInteractionId
   * @param {string|undefined} extInteractionId

   */
  async execute(
    interaction,
    clientId,
    extInteractionId,
    BotAddons
  ) {
    var projectFolder = path.dirname(path.resolve(__dirname));

    const subcommand = interaction.options.getSubcommand();
    let subcommandGroupName = interaction.options.getSubcommandGroup();

    // Grab all the command files from the commands directory you created earlier
    const commandsPath = path.join(projectFolder, "commands", "moderator");
    // console.log(commandsPath);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      const commandJSON = command.data.toJSON();
      //   console.log(commandJSON.name, subcommand, command.execute);

      if (
        commandJSON.name == subcommand ||
        commandJSON.name == subcommandGroupName
      ) {
        command.execute(
          interaction,
          clientId,
          extInteractionId,
          BotAddons
        );
        return;
      }

      //   commands.push(commandJSON);
    }

    interaction.reply("Command not found");
  },
};
