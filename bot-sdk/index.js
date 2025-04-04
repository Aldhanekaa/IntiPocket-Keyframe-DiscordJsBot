const {
  Client,
  GatewayIntentBits,
  Collection,
  EmbedBuilder,
} = require("discord.js");
const path = require("path");
const fs = require("fs");

const DeployDiscordBotCommand = require("../events/deployCommands");
// const decodeTimestamp = require('../func/decodeTimestamp');
const {
  localdb,
  edited_channel_log,
  deleted_channel_log,
} = require("../config.json");

const {
  sendWebhookEmbed,
} = require("../messaging/broadcasting/console-sender");
const hasForbiddenPhrase = require("../func/hasForbiddenPhrase");
const handleUserMessage = require("../func/userMessageHandler");

const decodeTimestamp = require("../func/decodeTimestamp");
const IsMentionOnlyChannelFunc = require("../func/isMentionOnlyChannel");

/**
 *
 * @param {string} name
 * @returns {number}
 */
function DecideActivity(name) {
  switch (name) {
    case "Competing":
      return 5;
    case "Custom":
      return 4;
    case "Listening":
      return 2;
    case "Playing":
      return 0;
    case "Streaming":
      return 1;
    case "Watching":
      return 3;
    default:
      return 0;
      break;
  }
}

class Bot {
  /**
   * @type {string}
   */
  guildIdOwner;
  /**
   * @type {string}
   */
  clientId;
  /**
   * @type {string}
   */
  botToken;

  /**
   * @type {Client}
   */
  client;

  /**
   * @type {Array<import('../main').Activity>}
   */
  activities;

  currentActivity = 0;

  /**
   * @type {Bard}
   */
  Bard;

  /**
   * @type {import('../main').BotProperty}
   */
  bot;

  /**
   * @type {Collection}
   */
  cooldowns;
  /**
   * @type {number}
   */
  cooldownDuration;

  /**
   * @type {AdvancedChatbot | undefined}
   */
  chatBot;

  /**
   * @type {AdvancedChatBotTrainingSDK | undefined}
   */
  trainBot;

  /**
   * @type {string}
   */
  botStatus = "";

  /**
   * @type {NodeJS.Timer}
   */
  activityInterval;

  /**
   *
   * @param {string} clientId serverId
   * @param {import('../main').BotProperty} bot botId
   */
  constructor(clientId, bot, botToken) {
    this.cooldowns = new Collection();
    this.cooldownDuration = 5000;

    this.clientId = clientId;
    this.guildIdOwner = bot.guild_id_owner;
    this.botToken = botToken;
    this.activities = bot.activities;
    this.bot = bot;

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildEmojisAndStickers,
      ],
    });
    this.client.commands = new Collection();

    this.client.on("ready", async () => {
      console.log(
        "Logged in as " +
        this.client.user.tag +
        " with id " +
        this.client.user.id
      );

      // await deploy_commands(bot_token, clientId);
      this.activityInterval = setInterval(() => {
        // console.log(this.activities);
        if (this.activities.length == 0) {
          return;
        }
        const activity = this.activities[this.currentActivity];
        const activityType = DecideActivity(activity.activity);

        // console.log(this.activities, activityType);

        // console.log("set Interval ", this.client.user.tag);
        this.client.user.setActivity(activity.name, { type: activityType });
        // this.client.user.setActivity(activity.name);

        if (this.currentActivity + 1 < this.activities.length) {
          this.currentActivity += 1;
        } else {
          this.currentActivity = 0;
        }
      }, 10000); // Set the activity every minute (10000ms)

      console.log("Deploying Commands");
      // Deploy Commands
      await DeployDiscordBotCommand(
        (title, message) => {
          sendWebhookEmbed(this.client, title, message);
        },
        this.botToken,
        this.clientId,
        this.client.user.tag,
        this.bot.instanceAdmin
      );
      sendWebhookEmbed(
        `${this.client.user.tag}`,
        `Successfully Deployed Commands`
      );

      /* DEFINE COMMANDS */
      let commandsPath = path.dirname(path.resolve(__dirname));
      commandsPath = path.join(commandsPath, "/commands");
      // console.log(commandsPath);

      const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));
      // console.log(commandFiles);

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if (command.instanceAdmin && this.bot.instanceAdmin) {
          continue;
        }
        if ("data" in command && "execute" in command) {
          // Set a new item in the Collection with the key as the command name and the value as the exported module
          this.client.commands.set(command.data.name, command);
        } else {
          console.log(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
          );
        }
      }

      sendWebhookEmbed(
        this.client,
        `${this.client.user.tag} FINISHED`,
        "FINISHED DEFINE COMMANDS - The Bot is Ready!"
      );
    });

    // Slash command handling
    this.client.on("interactionCreate", async (interaction) => {
      if (interaction.isCommand() || interaction.isModalSubmit()) {
        if (interaction.customId == "choosePrompts.promptModal") {
          this.chatBot.submitPrompts(
            interaction,
            this.clientId,
            this.bot.addons.custom_prompts
          );
          return;
        } else if (interaction.customId == "setKey.keyModal") {
          // this.chatBot.resetToken(interaction, this.clientId);
        }

        console.log('interactionCreate!');
        console.log(interaction.commandName);
        const event = require("../events/interactionCreate");

        // console.log(/)

        event.execute(
          interaction,
          this.clientId,
          interaction.customId,
          this.bot.addons
        );

        // interaction.reply({
        //   content: "",
        //   embeds: [
        //     {
        //       title: this.botStatus,
        //       color: 0xff0000,
        //       description: "hey"
        //     },
        //   ],
        // });

      }
    });

    this.client.on("messageDelete", async (interaction) => {
      const guild = await this.client.guilds.cache.get(
        `${this.bot.guild_id_owner}`
      );
      const webhookChannel = await guild.channels.fetch(deleted_channel_log);

      const exampleEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${interaction.author.username} (${interaction.author.id})`,
          iconURL: interaction.author.avatarURL(),
        })
        .setTitle("Just Deleted a Message!")
        .setDescription(
          `${interaction.content}\n\n<#${interaction.channelId}>\n**${guild.name}**`
        );

      webhookChannel.send({ embeds: [exampleEmbed] });
      return;
    });

    this.client.on("messageUpdate", async (interaction) => {
      try {
        const guild = await this.client.guilds.cache.get(
          `${this.bot.guild_id_owner}`
        );
        const webhookChannel = await guild.channels.fetch(edited_channel_log);

        const exampleEmbed = new EmbedBuilder()
          .setAuthor({
            name: `${interaction.author.username} (${interaction.author.id})`,
            iconURL: interaction.author.avatarURL(),
          })
          .setTitle("Just Edited a Message!")
          .setDescription(
            `**From**\n${interaction.content}\n\n**To**\n${interaction.reactions.message.contents}\n\n\n<#${interaction.channelId}>\n**${guild.name}**`
          );

        webhookChannel.send({ embeds: [exampleEmbed] });
      } catch (err) { }
      return;
    });

    this.client.on("messageCreate", async (message) => {
      // console.log('MESSAGE R ECEIVED : ', message);
      // if (message.stickers )

      if (message.content == "") {
        return;
      }
      if (message.author.bot) return;
      if (
        message.content.toLowerCase().includes("cert") &&
        message.mentions.has(this.client.user)
      )
        return message.reply({
          embeds: [
            {
              title: `Showing Certificate for ${this.client.user.id}`,
              color: 0xffd001,
              image: {
                url: `https://nos.wjv-1.neo.id/gabutnetwork/ai-chatbot-license/${this.client.user.id}.jpg`,
              },
            },
          ],
        });

      if (message.content.startsWith("@")) return;
      if (message.content.startsWith("[!]")) return;
      if (message.content.startsWith(":")) return;
      if (message.content.startsWith(".")) return;
      if (message.content.startsWith("/")) return;

      const user = message.author;



      if (this.cooldowns.has(user.id)) {
        const lastUsage = this.cooldowns.get(user.id);
        const remainingCooldown =
          this.cooldownDuration - (Date.now() - lastUsage);
        if (remainingCooldown > 0) return;
      }
      this.cooldowns.set(user.id, Date.now());

      // const current_timestamp = await decodeTimestamp(message.createdTimestamp);

      let msg;
      try {
        const isChannelAllowed = this.isChannelAllowed(message.channelId);
        // console.log('isChannelAllowed', isChannelAllowed);
        if (isChannelAllowed == false) {
          return;
        }

        if (this.chatBot) {
          const isMentionOnlyChannel = IsMentionOnlyChannelFunc(
            message.channelId,
            this.client.user.id
          );

          // console.log(isMentionOnlyChannel, message.content);
          if (isMentionOnlyChannel) {
            if (!message.content.includes(`<@${this.client.user.id}>`)) {
              return;
            }
          }

          let imageFileLocation = undefined;
          let imageFileName = undefined;

          let msg = await handleUserMessage(
            message,
            this.client.guilds,
            this.bot.addons,
            imageFileLocation,
            imageFileName
          );

          if (msg == 204) {
            return;
          }

          message.channel.sendTyping();
          const botResponse = await this.chatBot.ask(
            msg.content.replace("!nofancylist", ""),
            message.channelId,
            message,
            msg.imageFileLocation.imageFileLocation && msg.imageFileLocation,
            this.bot.addons,
            message.content.startsWith("!nofancylist")
          );
          // console.log(`msg : \n${msg}`);

          if (botResponse == undefined) {
            message.reply({
              content: "",
              embeds: [
                {
                  title: `Bot is still initialising..`,
                  color: 0xff0000,
                },
              ],
            });
            return;
          }
          return;
        }
      } catch (err) {
        // console.log('ERROR', err);
        sendWebhookEmbed(
          this.client,
          `${this.client.user.tag} Unexpected Error with the Database socket!`,
          "```" + err + "```" + `\nMessage :\n${msg}`,
          "error"
        );
        return message.reply({
          embeds: [
            {
              title: `Failed to generate response.`,
              color: 0xff0000,
            },
          ],
        });
      }
    });

    console.log("LOGIN ", this.bot.name, this.botToken);
    this.client.login(this.botToken);
    // this.BardInit('d');
  }

  /**
   * @param {string} channelId
   * @returns {boolean}
   */
  isChannelAllowed(channelId) {
    /**
     * @type {Record<string, import('../main').BotProperty>}
     */
    const bots = require(path.join(process.env.APP_DIR, localdb.bots));

    // console.log(bots, this.clientId);
    return bots[this.clientId].allowed_channels.includes(channelId);
  }

  destroy() {
    clearInterval(this.activityInterval);
    this.activityInterval = undefined;
    this.client.destroy();
    delete this;
  }
}

module.exports = Bot;
