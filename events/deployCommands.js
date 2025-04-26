const { REST, Routes } = require("discord.js");

const fs = require("fs");
const path = require("path");

/**
 *
 * @param {(title, message) => void} sendWebhookEmbed
 * @param {string} bot_token
 * @param {string} client_id
 * @param {string} bot_name
 * @param {boolean} admin
 */
async function DeployDiscordBotCommand(
  sendWebhookEmbed,
  bot_token,
  client_id,
  bot_name,
  instanceAdmin
) {
  const commands = [];

  const rest = new REST({ version: "10" }).setToken(bot_token);

  var projectFolder = path.dirname(path.resolve(__dirname));

  // Grab all the command files from the commands directory you created earlier
  const commandsPath = path.join(projectFolder, "commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  // console.log(commandFiles, bot_name);

  // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    const commandJSON = command.data.toJSON();
    // console.log(commandJSON);

    commands.push(commandJSON);
  }
  // console.log(commandFles, commands, bot_name);

  // console.log('Commands ', commands);
  try {
    sendWebhookEmbed(
      `${bot_name} : Starts to Upload Commands`,
      `Started refreshing ${commands.length} application (/) commands.`
    );

    console.log(`client_id ${client_id}`);
    // console.log(`commands ${JSON.stringify(commands)}`)
    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(Routes.applicationCommands(client_id), {
      body: commands,
    });

    sendWebhookEmbed(
      `${bot_name} Reloaded Commands`,
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // process.exit();
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
    // process.exit();
  }
}

module.exports = DeployDiscordBotCommand;
