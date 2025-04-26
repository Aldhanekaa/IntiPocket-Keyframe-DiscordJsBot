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
  .setName("super-admin")
  .setDescription("admin command")

  .addSubcommand((subCommand) =>
    subCommand
      .setName("show-streams")
      .setDescription("Show lists of all streams")
  )

  .addSubcommand((subCommand) =>
    subCommand
      .setName("show-pockets-streams")
      .setDescription("Show lists of all pockets and streams")
  )

  .addSubcommandGroup((subcommandGroup) =>
    subcommandGroup
      .setName("inti-pockets")
      .setDescription("Various Inti Pockets Commands")
      .addSubcommand((subcommand) =>
        subcommand.setName("show-vps").setDescription("Show lists of vps")
      )

      .addSubcommand((subcommand) =>
        subcommand
          .setName("new-pockets")
          .setDescription("Set Training Permission")

          .addStringOption((option) => {
            return option
              .setName("backup-type")
              .setDescription("Select command")
              .addChoices([
                {
                  name: "SQL / DB Backups",
                  value: "db-backups",
                },
                {
                  name: "File Backups",
                  value: "file-backups",
                },
              ])
              .setRequired(true);
          })
          .addStringOption((option) => {
            const vps_data = require(path.join(
              process.env.APP_DIR,
              localdb.vps_pockets
            ));
            const vps_lists = Object.keys(vps_data);
            let vps_options = [];

            for (let vps_id of vps_lists) {
              vps_options.push({
                name: vps_id,
                value: vps_id,
              });
            }

            return option
              .setName("vps")
              .setDescription("Select the vps you want the data to backup")
              .addChoices(vps_options)
              .setRequired(true);
          })
          .addUserOption((option) =>
            option
              .setName("owner")
              .setDescription("Select owner that own this pocket")
              .setRequired(true)
          )

          .addStringOption((option) =>
            option
              .setName("description")
              .setDescription("Your description for this Pocket")
              .setRequired(false)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("set-vps-publickey")
          .setDescription("Set vps public key")
          .addStringOption((option) => {
            const vpsPath = path.join(process.env.APP_DIR, localdb.vps_pockets);
            const vpsData = JSON.parse(fs.readFileSync(vpsPath, "utf8"));
            const vpsOptions = Object.keys(vpsData)
              .filter(key => key !== "[vps_id]")
              .map(vpsId => ({
                name: vpsId,
                value: vpsId
              }));
        
            return option
              .setName("vps_id")
              .setDescription("Select the VPS to update")
              .addChoices(...vpsOptions)
              .setRequired(true);
          })
          .addStringOption((option) =>
            option
              .setName("public_key")
              .setDescription("Enter the public key")
              .setRequired(true)
          )
      )
      .addSubcommand((subCommand) =>
        subCommand
          .setName("delete-pocket")
          .setDescription("Delete any pocket (Super Admin only)")
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
        command.execute(interaction, clientId, extInteractionId, BotAddons);
        return;
      }

      //   commands.push(commandJSON);
    }

    interaction.reply("Command not found");
  },
};
