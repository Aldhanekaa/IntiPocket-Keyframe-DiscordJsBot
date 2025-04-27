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

const { localdb } = require("../../config.json");

const slashCommand = new SlashCommandBuilder()
  .setName("set-stream-publickey")
  .setDescription("Set the public key for a stream")
  .addStringOption((option) =>
    option
      .setName("public_key")
      .setDescription("The public key to set")
      .setRequired(true)
  );

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
      const publicKey = interaction.options.getString("public_key");

      // Read streams.json
      const streamsPath = path.join(process.env.APP_DIR, localdb.streams);
      const streamsData = JSON.parse(fs.readFileSync(streamsPath, "utf8"));

      // Read pockets.json to get pocket information
      const pocketsPath = path.join(process.env.APP_DIR, localdb.pockets);
      const pocketsData = JSON.parse(fs.readFileSync(pocketsPath, "utf8"));

      // Get all streams that the user has access to
      const accessibleStreams = Object.entries(streamsData)
        .filter(([_, stream]) => {
          const pocket = pocketsData[stream.pocketId];
          return (
            pocket &&
            (pocket.owner_id === userId || pocket.managers?.includes(userId))
          );
        })
        .map(([id, stream]) => ({
          label: `${id} (${stream.type})`,
          value: id,
        }));

      if (accessibleStreams.length === 0) {
        await interaction.editReply("You don't have access to any streams.");
        return;
      }

      // Create a select menu for streams with cancel button
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("stream_select")
          .setPlaceholder("Select a stream")
          .addOptions(accessibleStreams)
      );

      const cancelButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("cancel")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Danger)
      );

      const response = await interaction.editReply({
        content: "Please select a stream to update its public key:",
        components: [row, cancelButton],
      });

      // Wait for user to select a stream
      const filter = (i) => i.user.id === userId;
      const collector = response.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "cancel") {
          await i.update({
            content: "Operation cancelled.",
            components: [],
          });
          collector.stop();
          return;
        }

        if (i.customId === "stream_select") {
          const streamId = i.values[0];
          const stream = streamsData[streamId];

          // Create confirmation buttons
          const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("confirm")
              .setLabel("Confirm")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId("cancel")
              .setLabel("Cancel")
              .setStyle(ButtonStyle.Danger)
          );

          // Show confirmation message
          await i.update({
            content: `Are you sure you want to update the public key for stream ${streamId} (${stream.type})?`,
            components: [confirmRow],
          });

          // Wait for confirmation
          const confirmationFilter = (i) => i.user.id === userId;
          const confirmationCollector =
            i.message.createMessageComponentCollector({
              filter: confirmationFilter,
              time: 60000,
            });

          confirmationCollector.on("collect", async (confirmation) => {
            if (confirmation.customId === "confirm") {
              // Update the public key
              streamsData[streamId].public_key = publicKey;

              // Save the changes
              fs.writeFileSync(
                streamsPath,
                JSON.stringify(streamsData, null, 4)
              );

              // Create success embed
              const embed = new EmbedBuilder()
                .setTitle("Public Key Updated")
                .setColor(0x00ff00)
                .addFields(
                  { name: "Stream ID", value: streamId, inline: true },
                  { name: "New Public Key", value: publicKey, inline: false }
                );

              await confirmation.update({
                content: "",
                embeds: [embed],
                components: [],
              });
            } else if (confirmation.customId === "cancel") {
              await confirmation.update({
                content: "Operation cancelled.",
                components: [],
              });
            }
            confirmationCollector.stop();
            collector.stop();
          });

          confirmationCollector.on("end", (collected, reason) => {
            if (reason === "time") {
              i.message.edit({
                content: "Confirmation timed out.",
                components: [],
              });
            }
          });
        }
      });

      collector.on("end", (collected, reason) => {
        if (reason === "time") {
          interaction.editReply({
            content: "Selection timed out.",
            components: [],
          });
        }
      });
    } catch (error) {
      console.error("Error in set-stream-publickey:", error);
      await interaction.editReply(
        "There was an error while updating the public key."
      );
    }
  },
};
