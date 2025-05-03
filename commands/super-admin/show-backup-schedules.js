const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const path = require("path");
const fs = require("fs");

const { localdb } = require("../../config.json");

const slashCommand = new SlashCommandBuilder()
  .setName("show-backup-schedules")
  .setDescription("Show backup schedules for all pockets");

module.exports = {
  data: slashCommand,
  instanceAdmin: true,
  channelLimit: false,

  /**
   * @param {import('discord.js').Interaction} interaction
   * @param {*} clientId
   * @param {*} _
   */
  async execute(interaction, clientId, extInteractionId) {
    await interaction.deferReply();

    try {
      const userId = interaction.user.id;
      const filter = (i) => i.user.id === userId;

      // Read pockets.json to get pocket information
      const pocketsPath = path.join(process.env.APP_DIR, localdb.pockets);
      const pocketsData = JSON.parse(fs.readFileSync(pocketsPath, "utf8"));

      // Get all pockets
      const allPockets = Object.entries(pocketsData).map(([id, pocket]) => ({
        label: `${id} (${pocket.type})`,
        value: id,
      }));

      if (allPockets.length === 0) {
        await interaction.editReply("No pockets found.");
        return;
      }

      // Create a select menu for pockets
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("pocket_select")
          .setPlaceholder("Select a pocket")
          .addOptions(allPockets)
      );

      const reply = await interaction.editReply({
        content: "Please select a pocket to view its backup schedules:",
        components: [row],
        fetchReply: true,
      });

      const collector = reply.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      collector.on("collect", async (interactionCollect) => {
        await interactionCollect.deferUpdate();
        if (interactionCollect.customId === "pocket_select") {
          const pocketId = interactionCollect.values[0];

          // Read backups-time.json
          const backupsTimePath = path.join(
            process.env.APP_DIR,
            localdb["backups-time"]
          );
          let backupsTimeData = {};
          try {
            backupsTimeData = JSON.parse(
              fs.readFileSync(backupsTimePath, "utf8")
            );
          } catch (error) {
            // File doesn't exist or is empty
          }

          const pocketSchedules = backupsTimeData[pocketId]?.schedules || [];

          if (pocketSchedules.length === 0) {
            await interactionCollect.editReply({
              content: `No backup schedules found for pocket ${pocketId}.`,
              components: [],
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle(`Backup Schedules for ${pocketId}`)
            .setColor(0x0099ff)
            .setDescription(
              `Backup Status: ${
                backupsTimeData[pocketId]?.enabled ? "Enabled" : "Disabled"
              }`
            );

          pocketSchedules.forEach((schedule, index) => {
            embed.addFields(
              {
                name: `Schedule ${index + 1}`,
                value: "-------------------",
              },
              { name: "Times", value: schedule.times.join(", ") },
              {
                name: "Days",
                value: schedule.days.join(", ") || "Every day",
              },
              { name: "Timezone", value: schedule.timezone },
              {
                name: "Status",
                value: schedule.enabled ? "Enabled" : "Disabled",
              }
            );
          });

          await interactionCollect.editReply({
            content: "",
            embeds: [embed],
            components: [],
          });
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "time") {
          if (reply?.deletable) {
            await reply.delete().catch(console.error);
          }
          collector.stop();
          interaction.reply({
            content: "Selection timed out.",
            components: [],
          });
        }
      });
    } catch (error) {
      console.error("Error in show-backup-schedules:", error);
      await interaction.editReply(
        "There was an error while fetching backup schedules."
      );
    }
  },
};
