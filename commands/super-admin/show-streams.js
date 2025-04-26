const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");

const { localdb } = require("../../config.json");

const slashCommand = new SlashCommandBuilder()
  .setName("show-streams")
  .setDescription("Show lists of all streams");

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
      // Read streams.json
      const streamsPath = path.join(process.env.APP_DIR, localdb.streams);
      const streamsData = JSON.parse(fs.readFileSync(streamsPath, "utf8"));

      // Read pockets.json to get pocket information
      const pocketsPath = path.join(process.env.APP_DIR, localdb.pockets);
      const pocketsData = JSON.parse(fs.readFileSync(pocketsPath, "utf8"));

      // Get all streams except the [streamId] key
      const allStreams = Object.entries(streamsData)
        .filter(([key]) => key !== "[streamId]");

      if (allStreams.length === 0) {
        await interaction.editReply("No streams configured.");
        return;
      }

      // Create embed for each stream
      const embeds = allStreams.map(([streamId, stream]) => {
        // Find associated pocket
        const pocket = pocketsData[stream.pocketId];

        const embed = new EmbedBuilder()
          .setTitle(`Stream: ${streamId}`)
          .setColor(0x0099ff)
          .addFields(
            {
              name: "Pocket ID",
              value: stream.pocketId,
              inline: true,
            },
            {
              name: "Pocket Description",
              value: pocket?.description || "No description",
              inline: true,
            },
            {
              name: "Pocket Owner",
              value: pocket?.owner_id || "Not set",
              inline: true,
            },
            {
              name: "VPS Connection",
              value: `${stream.vps_username}@${stream.vps_ipaddress}:${stream.vps_port}`,
              inline: true,
            },
            {
              name: "Source Path",
              value: stream.source_path,
              inline: true,
            },
            {
              name: "Type",
              value: stream.type,
              inline: true,
            },
            {
              name: "Public Key",
              value: stream.public_key || "Not set",
              inline: false,
            }
          );

        // Add DB information if it's a db-backups type
        if (stream.type === "db-backups" && stream["db-backups"]) {
          embed.addFields({
            name: "Database Type",
            value: stream["db-backups"].db || "Not specified",
            inline: true,
          });
        }

        return embed;
      });

      // Send response with embeds
      await interaction.editReply({ embeds });
    } catch (error) {
      console.error("Error in show-streams:", error);
      await interaction.editReply(
        "There was an error while fetching streams information."
      );
    }
  },
}; 