const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

const { localdb } = require("../../config.json");
const { updateJSON } = require("../../func/JSON");

// Add getLocalDBPath function
const getLocalDBPath = (...paths) =>
  path.join(process.env.APP_DIR, "../IntiPocket-LocalDB", ...paths);

const slashCommand = new SlashCommandBuilder()
  .setName("make-a-backup")
  .setDescription("Perform a manual backup of your pocket");

module.exports = {
  data: slashCommand,
  instanceAdmin: true,
  channelLimit: false,

  /**
   * @param {import('discord.js').Interaction} interaction
   * @param {*} clientId
   * @param {*} _
   */
  async execute(interaction, clientId, _) {
    await interaction.deferReply();

    try {
      const userId = interaction.user.id;
      const filter = (i) => i.user.id === userId;

      // Read pockets.json
      const pocketsPath = getLocalDBPath(localdb.pockets);
      const pocketsData = JSON.parse(fs.readFileSync(pocketsPath, "utf8"));

      // Get all pockets that the user has access to
      const accessiblePockets = Object.entries(pocketsData)
        .filter(
          ([_, pocket]) =>
            pocket.owner_id === userId || pocket.managers.includes(userId)
        )
        .map(([id, pocket]) => ({
          label: `${id} (${pocket.type})`,
          value: id,
        }));

      if (accessiblePockets.length === 0) {
        await interaction.editReply("You don't have any pockets.");
        return;
      }

      // Create a select menu for pockets
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("pocket_select")
          .setPlaceholder("Select a pocket to backup")
          .addOptions(accessiblePockets)
      );

      // Create cancel button
      const cancelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("cancel_backup")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Danger)
      );

      const embed = new EmbedBuilder()
        .setTitle("Make a Backup")
        .setColor(0x0099ff)
        .setDescription("Please select a pocket to perform a backup:")
        .addFields({
          name: "Note",
          value: "This will use one backup credit from your pocket.",
        });

      const reply = await interaction.editReply({
        embeds: [embed],
        components: [row, cancelRow],
        fetchReply: true,
      });

      const collector = reply.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      collector.on("collect", async (interactionCollect) => {
        if (interactionCollect.customId === "cancel_backup") {
          await interactionCollect.message.delete().catch(console.error);
          await interactionCollect.reply({
            content: "Backup process cancelled.",
            ephemeral: true,
          });
          return;
        }

        if (interactionCollect.customId === "pocket_select") {
          const pocketId = interactionCollect.values[0];
          const pocket = pocketsData[pocketId];

          // Delete the previous reply
          await interactionCollect.message.delete().catch(console.error);

          // Send initial "please wait" message
          const waitEmbed = new EmbedBuilder()
            .setTitle("Backup in Progress")
            .setColor(0x0099ff)
            .setDescription("Executing scripts, please wait...")
            .addFields({ name: "Pocket ID", value: pocketId, inline: true });

          const waitMessage = await interactionCollect.reply({
            embeds: [waitEmbed],
            ephemeral: true,
            fetchReply: true,
          });

          // Check backup credits
          if (!pocket.backup_config || pocket.backup_config.credits <= 0) {
            // Delete the wait message
            // await waitMessage.delete().catch(console.error);

            const embed = new EmbedBuilder()
              .setTitle("Backup Failed - No Credits")
              .setColor(0xff0000)
              .setDescription(
                "You have no backup credits remaining. Please purchase more credits to continue making backups."
              )
              .addFields(
                { name: "Pocket ID", value: pocketId, inline: true },
                { name: "Credits", value: "0", inline: true }
              );
            await interactionCollect.editReply({
              embeds: [embed],
              ephemeral: true,
            });
            return;
          }

          // Read streams.json
          const streamsPath = getLocalDBPath(localdb.streams);
          const streamsData = JSON.parse(fs.readFileSync(streamsPath, "utf8"));

          // Find associated stream
          const stream = Object.values(streamsData).find(
            (s) => s.pocketId === pocketId
          );
          if (!stream) {
            // Delete the wait message
            // await waitMessage.delete().catch(console.error);

            await interactionCollect.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Backup Failed")
                  .setColor(0xff0000)
                  .setDescription(
                    "No stream configuration found for this pocket."
                  )
                  .addFields({
                    name: "Pocket ID",
                    value: pocketId,
                    inline: true,
                  }),
              ],
              ephemeral: true,
            });
            return;
          }

          // Read vps_pockets.json to get VPS data
          const vpsPocketsPath = getLocalDBPath("vps_pockets.json");
          const vpsPocketsData = JSON.parse(
            fs.readFileSync(vpsPocketsPath, "utf8")
          );

          // Get VPS data for this pocket
          const vpsData = vpsPocketsData[pocket.vps_id];
          if (!vpsData) {
            // Delete the wait message
            // await waitMessage.delete().catch(console.error);

            await interactionCollect.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Backup Failed")
                  .setColor(0xff0000)
                  .setDescription("No VPS configuration found for this pocket.")
                  .addFields({
                    name: "Pocket ID",
                    value: pocketId,
                    inline: true,
                  }),
              ],
              ephemeral: true,
            });
            return;
          }

          // Create backup configuration with exact same format as [pocketId].json
          const backupConfig = {
            pocketId: pocket.pocketId,
            vps_id: pocket.vps_id,
            destination_path: pocket.destination_path,
            pocket_vps_id: {
              bot_host: vpsData.bot_host,
              vps_id: vpsData.vps_id,
              vps_username: vpsData.vps_username,
              vps_ipaddress: vpsData.vps_ipaddress,
              vps_port: vpsData.vps_port,
              pockets: vpsData.pockets || [],
              public_key: vpsData.public_key,
            },
            stream: {
              pocketId: stream.pocketId,
              vps_ipaddress: stream.vps_ipaddress,
              vps_port: stream.vps_port,
              source_path: stream.source_path,
              type: stream.type,
              "db-backups": stream["db-backups"] || {
                db: "",
                username: "",
                pwd: "",
                databases: [],
                host: "",
                port: "",
              },
              pocket_vps_publickey_already_configured:
                stream.pocket_vps_publickey_already_configured || true,
            },
          };

          // Create manual-backups directory if it doesn't exist
          const manualBackupsDir = getLocalDBPath("manual-backups");
          if (!fs.existsSync(manualBackupsDir)) {
            fs.mkdirSync(manualBackupsDir, { recursive: true });
          }

          // Save backup configuration
          const backupConfigPath = path.join(
            manualBackupsDir,
            `${pocketId}.json`
          );
          fs.writeFileSync(
            backupConfigPath,
            JSON.stringify(backupConfig, null, 2)
          );

          // Run the Go manual-backup script
          const scriptPath = path.join(
            process.env.APP_DIR,
            "../IntiPocket-Server",
            "manual-backup",
            "manual-backup.go"
          );

          try {
            const { stdout, stderr } = await execPromise(
              `go run ${scriptPath} ${pocketId}`,
              { cwd: path.join(process.env.APP_DIR, "../IntiPocket-Server") }
            );

            if (stderr) {
              console.error("Go script error:", stderr);
              // Delete the wait message
              //   await waitMessage.delete().catch(console.error);

              if (stderr.includes("exceeds the limit")) {
                const embed = new EmbedBuilder()
                  .setTitle("Backup Failed - Credits Exceeded")
                  .setColor(0xff0000)
                  .setDescription(
                    "You have no backup credits remaining. Please purchase more credits to continue making backups."
                  )
                  .addFields(
                    { name: "Pocket ID", value: pocketId, inline: true },
                    {
                      name: "Error",
                      value: "Backup size exceeds the limit",
                      inline: true,
                    }
                  );
                await interactionCollect.editReply({
                  embeds: [embed],
                  ephemeral: true,
                });
              } else {
                await interactionCollect.editReply({
                  embeds: [
                    new EmbedBuilder()
                      .setTitle("Backup Failed")
                      .setColor(0xff0000)
                      .setDescription(`Failed to perform backup: ${stderr}`)
                      .addFields({
                        name: "Pocket ID",
                        value: pocketId,
                        inline: true,
                      }),
                  ],
                  ephemeral: true,
                });
              }

              // Delete the backup configuration file
              try {
                fs.unlinkSync(backupConfigPath);
              } catch (error) {
                console.error("Error deleting backup config file:", error);
              }
              return;
            }

            // Read the comms file to get the backup result
            const commsPath = getLocalDBPath("comms", `${pocketId}.json`);

            if (fs.existsSync(commsPath)) {
              const commsData = JSON.parse(fs.readFileSync(commsPath, "utf8"));

              // If backup was successful, update the credits
              if (commsData.code === 200) {
                // Update the pocket data with decreased credits
                const updatedPocketData = {
                  ...pocketsData,
                  [pocketId]: {
                    ...pocketsData[pocketId],
                    backup_config: {
                      ...pocketsData[pocketId].backup_config,
                      credits: pocketsData[pocketId].backup_config.credits - 1,
                    },
                  },
                };

                // Update pockets.json with the new data
                await updateJSON(pocketsPath, updatedPocketData);

                // Update the local pocketsData to reflect the change
                pocketsData[pocketId] = updatedPocketData[pocketId];
              }

              // Delete the wait message
              //   await waitMessage.delete().catch(console.error);

              const embed = new EmbedBuilder()
                .setTitle(
                  commsData.code === 200 ? "Backup Successful" : "Backup Failed"
                )
                .setColor(commsData.code === 200 ? 0x00ff00 : 0xff0000)
                .setDescription(
                  commsData.code === 200
                    ? "Database backup completed successfully"
                    : "Database backup failed"
                )
                .addFields(
                  { name: "Pocket ID", value: pocketId, inline: true },
                  {
                    name: "Status Code",
                    value: commsData.code.toString(),
                    inline: true,
                  }
                );

              if (commsData.data && commsData.data.destination_path) {
                embed.addFields({
                  name: "Destination",
                  value: commsData.data.destination_path,
                  inline: true,
                });
              }

              // Add remaining credits to the embed if backup was successful
              if (commsData.code === 200) {
                embed.addFields({
                  name: "Remaining Credits",
                  value: pocketsData[pocketId].backup_config.credits.toString(),
                  inline: true,
                });
              }

              await interactionCollect.editReply({
                embeds: [embed],
                ephemeral: true,
              });

              // Delete the backup configuration file
              try {
                fs.unlinkSync(backupConfigPath);
              } catch (error) {
                console.error("Error deleting backup config file:", error);
              }
            } else {
              // Delete the wait message
              //   await waitMessage.delete().catch(console.error);

              await interactionCollect.editReply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("Backup Status Unknown")
                    .setColor(0xffa500)
                    .setDescription(
                      "Backup completed but no status information was found."
                    )
                    .addFields({
                      name: "Pocket ID",
                      value: pocketId,
                      inline: true,
                    }),
                ],
                ephemeral: true,
              });

              // Delete the backup configuration file
              try {
                fs.unlinkSync(backupConfigPath);
              } catch (error) {
                console.error("Error deleting backup config file:", error);
              }
            }
          } catch (error) {
            console.error("Error running manual-backup script:", error);
            // // Delete the wait message
            // await waitMessage.delete().catch(console.error);

            await interactionCollect.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Backup Error")
                  .setColor(0xff0000)
                  .setDescription(
                    "There was an error while performing the backup. Please try again later."
                  )
                  .addFields({
                    name: "Pocket ID",
                    value: pocketId,
                    inline: true,
                  }),
              ],
              ephemeral: true,
            });

            // Delete the backup configuration file
            try {
              fs.unlinkSync(backupConfigPath);
            } catch (error) {
              console.error("Error deleting backup config file:", error);
            }
          }
        }
      });

      collector.on("end", async (collected, reason) => {
        if (reason === "time") {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setTitle("Selection Timed Out")
                .setColor(0xff0000)
                .setDescription(
                  "No pocket was selected within the time limit."
                ),
            ],
            components: [],
          });
        }
      });
    } catch (error) {
      console.error("Error in make-a-backup:", error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Error")
            .setColor(0xff0000)
            .setDescription(
              "There was an error while performing the backup. Please try again later."
            ),
        ],
        components: [],
      });
    }
  },
};
