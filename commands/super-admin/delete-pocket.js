const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const path = require("path");
const fs = require("fs");

const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

const { localdb } = require("../../config.json");
const { updateJSON } = require("../../func/JSON");

// Utility functions
const getLocalDBPath = (...paths) =>
  path.join(process.env.APP_DIR, "../IntiPocket-LocalDB", ...paths);
const getServerPath = (...paths) =>
  path.join(process.env.APP_DIR, "../IntiPocket-Server", ...paths);
const slashCommand = new SlashCommandBuilder()
  .setName("delete-pocket")
  .setDescription("Delete any pocket (Super Admin only)");

module.exports = {
  data: slashCommand,
  instanceAdmin: true,
  channelLimit: false,

  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Read pockets data
      const pocketsPath = path.join(process.env.APP_DIR, localdb.pockets);
      const pocketsData = JSON.parse(fs.readFileSync(pocketsPath, "utf8"));

      // Super admin: show ALL pockets (no filtering)
      const allPockets = Object.values(pocketsData);
      if (allPockets.length === 0) {
        await interaction.editReply("There are no pockets to delete.");
        return;
      }

      // Create pocket selection menu
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("pocket-select")
        .setPlaceholder("Select a pocket to delete")
        .addOptions(
          allPockets.map((pocket) => ({
            label: `${pocket.pocketId} - ${
              pocket.description || "No description"
            }`,
            value: pocket.pocketId,
            description: `Type: ${pocket.type}`,
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const response = await interaction.editReply({
        content: "Please select the pocket you want to delete:",
        components: [row],
      });

      try {
        const pocketSelection = await response.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: 30000,
        });

        const selectedPocketId = pocketSelection.values[0];
        const selectedPocket = pocketsData[selectedPocketId];

        // Create confirmation buttons
        const confirmButton = new ButtonBuilder()
          .setCustomId("confirm-delete")
          .setLabel("Confirm Delete")
          .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
          .setCustomId("cancel-delete")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary);

        const confirmRow = new ActionRowBuilder().addComponents(
          confirmButton,
          cancelButton
        );

        await pocketSelection.update({
          content: `Are you sure you want to delete pocket ${selectedPocketId}?
**Description:** ${selectedPocket.description || "No description"}
**Type:** ${selectedPocket.type}

This action cannot be undone!`,
          components: [confirmRow],
        });

        try {
          const confirmation = await response.awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id,
            time: 30000,
          });

          if (confirmation.customId === "confirm-delete") {
            try {
              // Create queue file for deletion with full pocket, stream, and vps data
              const queuePath = path.join(
                process.env.APP_DIR,
                localdb["queues-delete"],
                `${selectedPocketId}.json`
              );

              // Read all DB files
              const pocketsFullPath = path.join(
                process.env.APP_DIR,
                localdb.pockets
              );
              const streamsFullPath = path.join(
                process.env.APP_DIR,
                localdb.streams
              );
              const vpsPocketsFullPath = path.join(
                process.env.APP_DIR,
                localdb.vps_pockets
              );

              const streamsData = JSON.parse(
                fs.readFileSync(streamsFullPath, "utf8")
              );
              const vpsData = JSON.parse(
                fs.readFileSync(vpsPocketsFullPath, "utf8")
              );

              // Find the stream for this pocket
              let streamObj = null;
              for (const streamId in streamsData) {
                if (streamsData[streamId].pocketId === selectedPocketId) {
                  streamObj = streamsData[streamId];
                  break;
                }
              }

              // Find the VPS for this pocket
              let vpsObj = null;
              for (const vpsId in vpsData) {
                if (
                  vpsData[vpsId].pockets &&
                  vpsData[vpsId].pockets.includes(selectedPocketId)
                ) {
                  vpsObj = vpsData[vpsId];
                  break;
                }
              }
              // If not found, fallback to vps_id field on pocket
              if (
                !vpsObj &&
                selectedPocket.vps_id &&
                vpsData[selectedPocket.vps_id]
              ) {
                vpsObj = vpsData[selectedPocket.vps_id];
              }

              // Prepare queue data
              const queueData = {
                ...selectedPocket,
                vps: vpsObj || {},
                stream: streamObj || {},
              };

              console.log("Delete Queue Data:", queueData);

              fs.writeFileSync(queuePath, JSON.stringify(queueData, null, 2));

              // Run the Go delete-pocket script
              const scriptPath = path.join(
                process.env.APP_DIR,
                "../IntiPocket-Server",
                "delete-pocket",
                "delete-pocket.go"
              );

              const { stdout, stderr } = await execPromise(
                `go run ${scriptPath} ${selectedPocketId}`,
                { cwd: path.join(process.env.APP_DIR, "../IntiPocket-Server") }
              );

              if (stderr) {
                console.error("Go script error:", stderr);
                await confirmation.update({
                  content: `Failed to delete pocket: \n\n6d1 **Go script error:**\n\n\${stderr}\`,
                  components: [],
                });
                return;
              }

              // Only proceed to delete data if Go script succeeded
              // Delete from pockets.json
              const vpsId = selectedPocket.vps_id;
              delete pocketsData[selectedPocketId];
              await updateJSON(pocketsPath, pocketsData);

              // Delete associated stream from streams.json
              const streamsPath = path.join(
                process.env.APP_DIR,
                localdb.streams
              );
              const streamsData2 = JSON.parse(
                fs.readFileSync(streamsPath, "utf8")
              );

              Object.keys(streamsData2).forEach((streamId) => {
                if (streamsData2[streamId].pocketId === selectedPocketId) {
                  delete streamsData2[streamId];
                }
              });

              await updateJSON(streamsPath, streamsData2);

              // Update VPS pockets array
              const vpsPath = path.join(
                process.env.APP_DIR,
                localdb.vps_pockets
              );
              const vpsData2 = JSON.parse(fs.readFileSync(vpsPath, "utf8"));

              if (vpsData2[vpsId] && Array.isArray(vpsData2[vpsId].pockets)) {
                vpsData2[vpsId].pockets = vpsData2[vpsId].pockets.filter(
                  (id) => id !== selectedPocketId
                );
                await updateJSON(vpsPath, vpsData2);
              }

              console.log("Go script output:", stdout);

              // Delete the queue file after all operations
              const queueConfigPath = path.join(
                process.env.APP_DIR,
                localdb["queues-config"],
                `${selectedPocketId}.json`
              );
              try {
                await fs.promises.unlink(queueConfigPath);
              } catch (err) {
                if (err.code !== "ENOENT") {
                  console.error(
                    `Failed to delete queue file: ${queueConfigPath}`,
                    err
                  );
                }
                // Ignore file-not-found errors
              }

              // Delete the corresponding files
              const filesToDelete = [
                getLocalDBPath("queues-delete", `${selectedPocketId}.json`),
                getLocalDBPath("comms-delete", `${selectedPocketId}-comm.json`),
                getLocalDBPath("comms", `${selectedPocketId}.json`),
                getLocalDBPath("logs", `${selectedPocketId}.log`),
              ];

              for (const file of filesToDelete) {
                if (fs.existsSync(file)) {
                  fs.unlinkSync(file);
                }
              }

              // Delete from backups-time.json
              const backupsTimePath = path.join(
                process.env.APP_DIR,
                localdb["backups-time"]
              );
              if (fs.existsSync(backupsTimePath)) {
                const backupsTimeData = JSON.parse(
                  fs.readFileSync(backupsTimePath, "utf8")
                );
                if (backupsTimeData[selectedPocketId]) {
                  delete backupsTimeData[selectedPocketId];
                  await updateJSON(backupsTimePath, backupsTimeData);
                }
              }

              await interaction.editReply({
                content: `Successfully deleted pocket ${selectedPocketId} and updated all associated data.`,
                components: [],
              });
            } catch (error) {
              console.error("Error during pocket deletion:", error);
              await interaction.editReply({
                content: `Failed to delete pocket: ${error.message}`,
                components: [],
              });
            }
          } else {
            await interaction.editReply({
              content: "Pocket deletion cancelled.",
              components: [],
            });
          }
        } catch (error) {
          await interaction.editReply({
            content: "Confirmation timed out. Please try again.",
            components: [],
          });
        }
      } catch (error) {
        await interaction.editReply({
          content: "Pocket selection timed out. Please try again.",
          components: [],
        });
      }
    } catch (error) {
      console.error("Error in delete-pocket command:", error);
      await interaction.editReply({
        content: "An error occurred while trying to delete the pocket.",
        components: [],
      });
    }
  },
};
