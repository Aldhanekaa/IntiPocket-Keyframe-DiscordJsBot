const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");

const { localdb } = require("../../config.json");
const { updateJSON } = require("../../func/JSON");

const slashCommand = new SlashCommandBuilder()
  .setName("show-pockets-streams")
  .setDescription("Show lists of your pockets and streams");

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
      // Read pockets.json
      const pocketsPath = path.join(process.env.APP_DIR, localdb.pockets);
      const pocketsData = JSON.parse(fs.readFileSync(pocketsPath, "utf8"));

      // Read streams.json
      const streamsPath = path.join(process.env.APP_DIR, localdb.streams);
      const streamsData = JSON.parse(fs.readFileSync(streamsPath, "utf8"));

      // Filter pockets where user is owner or manager
      const userId = interaction.user.id;
      const userPockets = Object.entries(pocketsData)
        .filter(
          ([_, pocket]) =>
            pocket.owner_id === userId ||
            (pocket.managers && pocket.managers.includes(userId))
        )
        .map(([_, pocket]) => pocket);

      if (userPockets.length === 0) {
        await interaction.editReply("You don't have any pockets configured.");
        return;
      }

      // Create embed for each pocket
      const embeds = userPockets.map((pocket) => {
        // Find associated streams
        const pocketStreams = Object.entries(streamsData)
          .filter(([_, stream]) => stream.pocketId === pocket.pocketId)
          .map(([_, stream]) => stream);

        const embed = new EmbedBuilder()
          .setTitle(`Pocket: ${pocket.pocketId}`)
          .setColor(0x0099ff)
          .addFields(
            {
              name: "Description",
              value: pocket.description || "No description",
              inline: true,
            },
            { name: "Type", value: pocket.type, inline: true },
            {
              name: "Role",
              value: pocket.owner_id === userId ? "Owner" : "Manager",
              inline: true,
            },
            { name: "VPS ID", value: pocket.vps_id, inline: true }
          );

        // Add stream information if available
        if (pocketStreams.length > 0) {
          const streamInfo = pocketStreams
            .map((stream) => {
              let info = `VPS: ${stream.vps_username}@${stream.vps_ipaddress}:${stream.vps_port}\n`;
              info += `Source: ${stream.source_path}`;
              if (stream.type === "db-backups") {
                info += `\nDB Type: ${stream["db-backups"].db}`;
              }
              return info;
            })
            .join("\n\n");

          embed.addFields({
            name: "Stream Configuration",
            value: `\`\`\`\n${streamInfo}\`\`\``,
          });
        } else {
          embed.addFields({
            name: "Stream Configuration",
            value: "No streams configured",
          });
        }

        return embed;
      });

      // Send response with embeds
      await interaction.editReply({ embeds });
    } catch (error) {
      console.error("Error in show-pockets-streams:", error);
      await interaction.editReply(
        "There was an error while fetching your pockets information."
      );
    }
  },
};
