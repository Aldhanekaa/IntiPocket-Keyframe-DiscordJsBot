const { SlashCommandBuilder } = require("discord.js");


const fs = require("fs");
const path = require("path");

const commandsArr = [];

/**
 * @type {Record<string, string>}
 */
const commands = {};

const training = new SlashCommandBuilder()
  .setName("super-admin")
  .setDescription("admin command")
  .addSubcommand((subCommand) =>
    subCommand
      .setName("set-key")
      .setDescription("Set secret bot key.")
      .addStringOption((option) =>
        option.setName("key1").setDescription("set your token")
      )
      .addStringOption((option) =>
        option.setName("key2").setDescription("set your token")
      )
  )
  .addSubcommandGroup((subcommandGroup) =>
    subcommandGroup
      .setName("command-permission")
      .setDescription("Set command permission")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("unset-admin-command-permission")
          .setDescription("Set Training Permission")
          .addStringOption((option) => {
            const commandFiles = fs
              .readdirSync("./commands/")
              .filter((file) => file.endsWith(".js"));

            // console.log(commandFiles);
            if (commandsArr.length == 0) {
              for (const file of commandFiles) {
                if (file == "bots-settings.js" || file == "instance-admin.js") {
                  continue;
                } else if (file == "super-admin.js") {
                  commandsArr.push({
                    name: "super-admin",
                    value: "super-admin",
                  });
                  commands["super-admin"] = file;
                  continue;
                }
                const command = require(`./${file}`);

                if (command.admin == false) {
                  continue;
                }

                commandsArr.push({
                  name: command.data.name,
                  value: command.data.name,
                });
                commands[command.data.name] = file;
                // console.log('commandData' + command.data.name);
              }
            }

            return option
              .setName("command")
              .setDescription("Select command")
              .addChoices(...commandsArr)
              .setRequired(true);
          })
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription(
                "Select user that will have access to train the bot"
              )
          )
          .addRoleOption((option) =>
            option
              .setName("role")
              .setDescription(
                "Select role that will have access to train this bot"
              )
          )
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription("Select channel for training the bot")
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("set-admin-command-permission")
          .setDescription("Set Training Permission")
          .addStringOption((option) => {
            return option
              .setName("command")
              .setDescription("Select command")
              .addChoices(...commandsArr)
              .setRequired(true);
          })
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription(
                "Select user that will have access to train the bot"
              )
          )
          .addRoleOption((option) =>
            option
              .setName("role")
              .setDescription(
                "Select role that will have access to train this bot"
              )
          )
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription("Select channel for training the bot")
          )
      )
  );
module.exports = {
  data: training,
  instanceAdmin: false,
  channelLimit: true,

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
    const commandsPath = path.join(projectFolder, "commands", "super-admin");
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
