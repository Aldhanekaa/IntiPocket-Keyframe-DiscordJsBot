const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const path = require("path");
const fs = require("fs");

const { localdb } = require("../../config.json");

// Helper function to create credential modal
function createScheduleModal(
  slashCommand,
  pocketId,
  title = "Add Backup Schedule",
  customId = "schedule_modal"
) {
  const modal = new ModalBuilder()
    .setCustomId(`super-admin.${slashCommand.toJSON().name}.${customId}`)
    .setTitle(title);

  const timesInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.times`)
    .setLabel("Backup Times (comma-separated, 24h format)")
    .setPlaceholder("09:00,12:00,15:00")
    .setStyle(TextInputStyle.Short);

  const daysInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.days`)
    .setLabel("Days (comma-separated)")
    .setPlaceholder("monday,wednesday,friday")
    .setStyle(TextInputStyle.Short);

  const timezoneInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.timezone`)
    .setLabel("Timezone")
    .setPlaceholder("Asia/Jakarta")
    .setStyle(TextInputStyle.Short);

  const pocketData = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.pocket_data`)
    .setLabel("Pocket Data (DO NOT CHANGE IT)")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(JSON.stringify({ pocketId }))
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(timesInput);
  const secondActionRow = new ActionRowBuilder().addComponents(daysInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(timezoneInput);
  const fourthActionRow = new ActionRowBuilder().addComponents(pocketData);

  modal.addComponents(
    firstActionRow,
    secondActionRow,
    thirdActionRow,
    fourthActionRow
  );

  return modal;
}

// Add this helper function at the top with other helper functions
function createBackButton() {
  return new ButtonBuilder()
    .setCustomId("back")
    .setLabel("Back")
    .setStyle(ButtonStyle.Secondary);
}

// Helper function to handle collector timeout
async function handleCollectorTimeout(reply, collector) {
  if (reply?.deletable) {
    await reply.delete().catch(console.error);
  }
  collector.stop();
}

const slashCommand = new SlashCommandBuilder()
  .setName("set-auto-backup-time")
  .setDescription("Set the auto backup time for a pocket");

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
      const result = await handleModalSubmit(
        interaction,
        clientId,
        extInteractionId
      );
      if (result) {
        return;
      }
      const userId = interaction.user.id;
      const filter = (i) => i.user.id === userId;

      let globalReply;
      let globalRow;
      let collector;

      // Read pockets.json to get pocket information
      const pocketsPath = path.join(process.env.APP_DIR, localdb.pockets);
      const pocketsData = JSON.parse(fs.readFileSync(pocketsPath, "utf8"));

      // Get all pockets that the user has access to
      const accessiblePockets = Object.entries(pocketsData).map(
        ([id, pocket]) => ({
          label: `${id} (${pocket.type})`,
          value: id,
        })
      );

      if (accessiblePockets.length === 0) {
        await interaction.editReply("You don't have any pockets.");
        return;
      }

      // Create a select menu for pockets
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("pocket_select")
          .setPlaceholder("Select a pocket")
          .addOptions(accessiblePockets)
      );

      globalReply = await interaction.editReply({
        content: "Please select a pocket to configure its backup schedule:",
        components: [row],
        fetchReply: true,
      });

      collector = globalReply.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      collector.on("collect", async (interactionCollect) => {
        if (interactionCollect.customId === "pocket_select") {
          const pocketId = interactionCollect.values[0];

          // Create buttons for different actions
          const pocket = pocketsData[pocketId];
          const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("configure_stream")
              .setLabel(
                `Config ${
                  pocket.type === "file-backups" ? "File" : "DB"
                } Settings`
              )
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("view_config")
              .setLabel("View Current Config")
              .setStyle(ButtonStyle.Secondary),
            // Only show managers button if user is the owner
            ...(pocket.owner_id === userId
              ? [
                  new ButtonBuilder()
                    .setCustomId("configure_managers")
                    .setLabel("Config Managers")
                    .setStyle(ButtonStyle.Success),
                ]
              : [])
          );

          await interactionCollect.deferUpdate();
          await interactionCollect.editReply({
            content: `Selected pocket: ${pocketId}\nWhat would you like to do?`,
            components: [actionRow],
          });

          // Handle button interactions
          const buttonCollector =
            interactionCollect.message.createMessageComponentCollector({
              filter,
              time: 60000,
            });

          buttonCollector.on("collect", async (button) => {
            if (button.customId === "add_schedule") {
              if (globalReply?.deletable) {
                await globalReply.delete().catch(console.error);
              }

              const modal = createScheduleModal(slashCommand, pocketId);
              await button.showModal(modal);
            } else if (button.customId === "view_schedules") {
              await button.deferUpdate();
              // Read and display current schedules
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

              const pocketSchedules =
                backupsTimeData[pocketId]?.schedules || [];

              if (pocketSchedules.length === 0) {
                await button.editReply("No schedules found for this pocket.");
                return;
              }

              const embed = new EmbedBuilder()
                .setTitle(`Backup Schedules for ${pocketId}`)
                .setColor(0x0099ff);

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

              await button.editReply({ embeds: [embed] });
            } else if (button.customId === "toggle_backup") {
              await button.deferUpdate();
              // Toggle backup status
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

              if (!backupsTimeData[pocketId]) {
                backupsTimeData[pocketId] = {
                  enabled: true,
                  schedules: [],
                  notification: {
                    on_success: true,
                    on_failure: true,
                    discord_channel: interaction.channelId,
                  },
                  last_backup: null,
                };
              }

              backupsTimeData[pocketId].enabled =
                !backupsTimeData[pocketId].enabled;
              fs.writeFileSync(
                backupsTimePath,
                JSON.stringify(backupsTimeData, null, 2)
              );

              const status = backupsTimeData[pocketId].enabled
                ? "enabled"
                : "disabled";
              await button.editReply(
                `Backup for pocket ${pocketId} has been ${status}.`
              );
            } else if (button.customId === "configure_managers") {
              // Double check if user is the owner (in case they somehow got the button)
              if (pocket.owner_id !== userId) {
                await interactionCollect.editReply({
                  content: "Only the pocket owner can manage managers.",
                  components: [
                    new ActionRowBuilder().addComponents(createBackButton()),
                  ],
                  embeds: [],
                });
                return;
              }
              // ... rest of the case
            }
          });
        }
      });

      collector.on("end", async (collected, reason) => {
        try {
          if (reason === "time") {
            await handleCollectorTimeout(globalReply, collector);
            await interaction.editReply({
              content: "Selection timed out.",
              components: [],
            });
          }
        } catch (error) {}
      });
    } catch (error) {
      console.error("Error in set-auto-backup-time:", error);
      await interaction.editReply(
        "There was an error while setting the backup time."
      );
    }
  },
};

// Add modal interaction handler
async function handleModalSubmit(interaction, clientId, extInteractionId) {
  if (interaction.customId !== undefined) {
    switch (extInteractionId) {
      case `super-admin.${slashCommand.toJSON().name}.schedule_modal`:
        let pocketData;
        try {
          pocketData = JSON.parse(
            interaction.fields.getTextInputValue(
              `${slashCommand.name}.pocket_data`
            )
          );
        } catch (error) {
          await interaction.editReply(
            "Failed to parse pocket data. Please try again."
          );
          return;
        }

        const times = interaction.fields
          .getTextInputValue(`${slashCommand.name}.times`)
          .split(",")
          .map((t) => t.trim());
        const days = interaction.fields
          .getTextInputValue(`${slashCommand.name}.days`)
          .split(",")
          .map((d) => d.trim().toLowerCase());
        const timezone = interaction.fields
          .getTextInputValue(`${slashCommand.name}.timezone`)
          .trim();

        // Read and update backups-time.json
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

        if (!backupsTimeData[pocketData.pocketId]) {
          backupsTimeData[pocketData.pocketId] = {
            enabled: true,
            schedules: [],
            notification: {
              on_success: true,
              on_failure: true,
              discord_channel: [interaction.channelId],
            },
            last_backup: null,
          };
        }

        backupsTimeData[pocketData.pocketId].schedules.push({
          enabled: true,
          times,
          days,
          timezone,
        });

        fs.writeFileSync(
          backupsTimePath,
          JSON.stringify(backupsTimeData, null, 2)
        );

        const embed = new EmbedBuilder()
          .setTitle("Schedule Added")
          .setColor(0x00ff00)
          .addFields(
            { name: "Pocket ID", value: pocketData.pocketId },
            { name: "Times", value: times.join(", ") },
            { name: "Days", value: days.join(", ") },
            { name: "Timezone", value: timezone }
          );

        await interaction.editReply({ embeds: [embed] });
        return true;
        break;
    }
  }

  return false;
}
