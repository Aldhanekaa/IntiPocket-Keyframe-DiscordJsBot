const { SlashCommandBuilder } = require("discord.js");
const { localdb } = require("../config.json");

const fs = require("fs");
const path = require("path");

const commandsArr = [];
const vps_lists = [];

/**
 * @type {Record<string, string>}
 */
const commands = {};

const training = new SlashCommandBuilder()
  .setName("client")
  .setDescription("client command")
  .addSubcommand((subCommand) =>
    subCommand
      .setName("show-streams")
      .setDescription("Show lists of all streams")
  )
  .addSubcommand((subCommand) =>
    subCommand
      .setName("show-backup-schedules")
      .setDescription("Show lists of all backup schedules")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("make-a-backup")
      .setDescription("Perform a manual backup of your pocket")
  )

  .addSubcommand((subCommand) =>
    subCommand
      .setName("configure-pocket")
      .setDescription("Configure your pocket")
  )
  .addSubcommand((subCommand) =>
    subCommand
      .setName("delete-pocket")
      .setDescription("Delete one of your pockets")
  )
  .addSubcommand((subCommand) =>
    subCommand
      .setName("manage-managers")
      .setDescription("Manage managers of your pockets")
  )
  .addSubcommand((subCommand) =>
    subCommand
      .setName("show-managers")
      .setDescription(
        "Show list of pockets you manage or own, and their managers."
      )
  )
  .addSubcommand((subCommand) =>
    subCommand
      .setName("configure-backups-time")
      .setDescription("Configure your backups time")
  )
  .addSubcommand((subCommand) =>
    subCommand
      .setName("show-pockets-streams")
      .setDescription("Show lists of your pockets and streams")
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
  async execute(interaction, clientId, extInteractionId, BotAddons) {
    var projectFolder = path.dirname(path.resolve(__dirname));

    let subcommand = undefined;
    let subcommandGroupName = "";

    try {
      subcommand = interaction.options.getSubcommand();
      subcommandGroupName = interaction.options.getSubcommandGroup();

      console.log(subcommand, subcommandGroupName);
      console.log(`interaction.customId ${interaction.customId}`);
    } catch (error) {
      if (
        interaction.customId !== undefined &&
        String(interaction.customId).includes(".")
      ) {
        const interactionCustomIds = interaction.customId.split(".");
        subcommand = interactionCustomIds[1];
      }
    }

    // Grab all the command files from the commands directory you created earlier
    const commandsPath = path.join(projectFolder, "commands", "client");
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
        command.execute(interaction, clientId, extInteractionId, BotAddons);
        return;
      }

      //   commands.push(commandJSON);
    }

    interaction.reply("Command not found");
  },
};
