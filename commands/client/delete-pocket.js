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
const { updateJSON, ObjKeyArrayValueDelete } = require("../../func/JSON");

const slashCommand = new SlashCommandBuilder()
  .setName("delete-pocket")
  .setDescription("Delete one of your pockets");

module.exports = {
  data: slashCommand,
  instanceAdmin: false,
  channelLimit: false,

  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Read pockets data

      const pocketsPath = path.join(process.env.APP_DIR, localdb.pockets);
      const pocketsRaw = await fs.promises.readFile(pocketsPath, "utf8");
      const pocketsData = JSON.parse(pocketsRaw);

      // Filter pockets owned by the user
      const userPockets = Object.values(pocketsData).filter(
        (pocket) => pocket.owner_id === interaction.user.id
      );

      if (userPockets.length === 0) {
        await interaction.editReply("You don't have any pockets to delete.");
        return;
      }

      // Create pocket selection menu
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("pocket-select")
        .setPlaceholder("Select a pocket to delete")
        .addOptions(
          userPockets.map((pocket) => ({
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

              let pocketsAll = {};
              let streamsAll = {};
              let vpsPocketsAll = {};
              try {
                pocketsAll = JSON.parse(
                  fs.readFileSync(pocketsFullPath, "utf8")
                );
              } catch {}
              try {
                streamsAll = JSON.parse(
                  fs.readFileSync(streamsFullPath, "utf8")
                );
              } catch {}
              try {
                vpsPocketsAll = JSON.parse(
                  fs.readFileSync(vpsPocketsFullPath, "utf8")
                );
              } catch {}

              // Find the relevant data
              const pocketData = pocketsAll[selectedPocketId] || {};
              // Find the first stream with this pocketId
              let streamData = null;
              for (const streamId in streamsAll) {
                if (streamsAll[streamId].pocketId === selectedPocketId) {
                  streamData = streamsAll[streamId];
                  break;
                }
              }
              // Find the vps object that contains this pocketId
              let vpsObj = null;
              for (const vpsId in vpsPocketsAll) {
                const vps = vpsPocketsAll[vpsId];
                if (
                  Array.isArray(vps.pockets) &&
                  vps.pockets.includes(selectedPocketId)
                ) {
                  vpsObj = vps;
                  break;
                }
              }

              console.log(vpsPocketsAll);

              const queueContent = {
                pocketId: selectedPocketId,
                vps_id: pocketData.vps_id || (vpsObj && vpsObj.vps_id) || null,
                ...pocketData,
                vps: vpsObj,
                stream: streamData,
                timestamp: new Date().toISOString(),
              };

              await fs.writeFileSync(
                queuePath,
                JSON.stringify(queueContent, null, 4)
              );

              // Execute Go delete script first
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
                  content: `Failed to delete pocket: \n\n\u274C **Go script error:**\n\n\`\`\`${stderr}\`\`\``,
                  components: [],
                });
                return;
              }

              // Only proceed to delete data if Go script succeeded
              // Delete from pockets.json
              const vpsId = selectedPocket.vps_id;
              delete pocketsData[selectedPocketId];
              await updateJSON(pocketsPath, pocketsData);

              const streamsPath = path.join(
                process.env.APP_DIR,
                localdb.streams
              );
              const streamsRaw = await fs.promises.readFile(
                streamsPath,
                "utf8"
              );
              const streamsData = JSON.parse(streamsRaw);

              Object.keys(streamsData).forEach((streamId) => {
                if (streamsData[streamId].pocketId === selectedPocketId) {
                  delete streamsData[streamId];
                }
              });

              await updateJSON(streamsPath, streamsData);

              // Update VPS pockets array

              const vpsPocketsPath = path.join(
                process.env.APP_DIR,
                localdb.vps_pockets
              );
              const vpsPocketsRaw = await fs.promises.readFile(
                vpsPocketsPath,
                "utf8"
              );
              const vpsPocketsData = JSON.parse(vpsPocketsRaw);

              let vpsData = vpsPocketsData[vpsId];
              vpsData = ObjKeyArrayValueDelete(
                vpsData,
                "pockets",
                selectedPocketId
              );
              await updateJSON(
                vpsPocketsPath,
                Object.assign({}, vpsPocketsData, {
                  ...vpsPocketsData,
                  [vpsId]: vpsData,
                })
              );

              console.log("Go script output:", stdout);

              // Delete the queue file after all operations
              const queueDeletePath = path.join(
                process.env.APP_DIR,
                localdb["queues-delete"],
                `${selectedPocketId}.json`
              );
              try {
                await fs.promises.unlink(queueDeletePath);
              } catch (err) {
                if (err.code !== "ENOENT") {
                  console.error(
                    `Failed to delete queue file: ${queueDeletePath}`,
                    err
                  );
                }
                // Ignore file-not-found errors
              }

              await confirmation.update({
                content: `Successfully deleted pocket ${selectedPocketId} and updated all associated data.`,
                components: [],
              });
            } catch (error) {
              console.error("Error during pocket deletion:", error);
              await confirmation.update({
                content: `Failed to delete pocket: ${error.message}`,
                components: [],
              });
            }
          } else {
            await confirmation.update({
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
