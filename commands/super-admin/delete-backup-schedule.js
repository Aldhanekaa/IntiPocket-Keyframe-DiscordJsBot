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
  .setName("delete-backup-schedule")
  .setDescription("Delete backup schedules for a pocket");

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
        content: "Please select a pocket to delete its backup schedules:",
        components: [row],
        fetchReply: true,
      });

      const collector = reply.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      collector.on("collect", async (interactionCollect) => {
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

          // Create schedule options for multi-select
          const scheduleOptions = pocketSchedules.map((schedule, index) => ({
            label: `Schedule ${index + 1}`,
            description: `${schedule.times.join(", ")} on ${
              schedule.days.join(", ") || "Every day"
            } (${schedule.timezone})`,
            value: index.toString(),
          }));

          // Create multi-select menu for schedules
          const scheduleRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("schedule_select")
              .setPlaceholder("Select schedules to delete")
              .setMinValues(1)
              .setMaxValues(scheduleOptions.length)
              .addOptions(scheduleOptions)
          );

          await interactionCollect.deferUpdate();

          await interactionCollect.editReply({
            content: `Select the backup schedules you want to delete for pocket ${pocketId}:`,
            components: [scheduleRow],
          });

          // Handle schedule selection
          const scheduleCollector =
            interactionCollect.message.createMessageComponentCollector({
              filter,
              time: 60000,
            });

          scheduleCollector.on("collect", async (scheduleInteraction) => {
            if (scheduleInteraction.customId === "schedule_select") {
              const selectedIndices = scheduleInteraction.values.map(Number);

              // Sort indices in descending order to avoid index shifting issues
              selectedIndices.sort((a, b) => b - a);

              // Remove selected schedules
              for (const index of selectedIndices) {
                pocketSchedules.splice(index, 1);
              }

              // Update backups-time.json
              backupsTimeData[pocketId].schedules = pocketSchedules;
              fs.writeFileSync(
                backupsTimePath,
                JSON.stringify(backupsTimeData, null, 2)
              );

              const embed = new EmbedBuilder()
                .setTitle("Schedules Deleted")
                .setColor(0x00ff00)
                .setDescription(
                  `Successfully deleted ${selectedIndices.length} schedule(s) for pocket ${pocketId}`
                );

              if (pocketSchedules.length > 0) {
                embed.addFields({
                  name: "Remaining Schedules",
                  value: pocketSchedules.length.toString(),
                });
              } else {
                embed.addFields({
                  name: "Status",
                  value: "No schedules remaining",
                });
              }

              await scheduleInteraction.deferUpdate();

              await scheduleInteraction.editReply({
                content: "",
                embeds: [embed],
                components: [],
              });
              return;
            }
          });

          scheduleCollector.on("end", async (collected, reason) => {
            try {
              if (reason === "time") {
                if (interactionCollect.message?.deletable) {
                  await interactionCollect.message
                    .delete()
                    .catch(console.error);
                }
                scheduleCollector.stop();
                await interactionCollect.editReply({
                  content: "Selection timed out.",
                  components: [],
                });
              }
            } catch (error) {}
          });
        }
      });

      collector.on("end", async (collected, reason) => {
        try {
          if (reason === "time") {
            if (reply?.deletable) {
              await reply.delete().catch(console.error);
            }
            collector.stop();
            await interaction.editReply({
              content: "Selection timed out.",
              components: [],
            });
          }
        } catch (error) {}
      });
    } catch (error) {
      console.error("Error in delete-backup-schedule:", error);
      await interaction.editReply(
        "There was an error while deleting backup schedules."
      );
    }
  },
};
