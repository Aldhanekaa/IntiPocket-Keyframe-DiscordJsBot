// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === "production" ? ".env" : ".env.development";
require("dotenv").config({ path: envFile });

/**
 * @type {Record<string, BotProperty>}
 */
const Bot = require("./bot-sdk");

const { Client, GatewayIntentBits } = require("discord.js");

const bot_activities = [
  { name: "Running Backups!", activity: "Playing" },
  { name: "Encrypting Files..", activity: "Playing" },
];

const bot_config = {
  client_id: "1126371419509506069",
  guild_id_owner: "1112375480545443910",
  activities: bot_activities,
  addons: {
    imageRecognition: true,
    custom_prompts: 2,
    longResponse: true,
    discordBotTraining: true,
  },
};

process.env.APP_DIR = __dirname;
// Set the timezone to UTC+7 Asia/Jakarta
process.env.TZ = "Asia/Jakarta";
console.log(
  `[INFO] Timezone set to ${process.env.TZ} (${new Date().toString()})`
);

const app = new Bot(
  bot_config["client_id"],
  bot_config,
  process.env.DISCORD_BOT_TOKEN
);
