const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");

const { localdb } = require("../../config.json");
const { updateJSON } = require("../../func/JSON");

const slashCommand = new SlashCommandBuilder()
  .setName("show-pockets-streams")
  .setDescription("Show all registered pockets and streams");

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

      // Get all pockets except the template
      const allPockets = Object.entries(pocketsData)
        .filter(([key, _]) => key !== "[pocketId]")
        .map(([_, pocket]) => pocket);

      if (allPockets.length === 0) {
        await interaction.editReply("No pockets are configured in the system.");
        return;
      }

      // Create embed for each pocket
      const embeds = allPockets.map((pocket) => {
        // Find associated streams
        const pocketStreams = Object.entries(streamsData)
          .filter(
            ([key, stream]) =>
              key !== "[id]" && stream.pocketId === pocket.pocketId
          )
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
            { name: "VPS ID", value: pocket.vps_id, inline: true },
            {
              name: "Owner",
              value: `<@${pocket.owner_id}>`,
              inline: true,
            }
          );

        // Add managers if any
        if (pocket.managers && pocket.managers.length > 0) {
          embed.addFields({
            name: "Managers",
            value: pocket.managers.map((id) => `<@${id}>`).join(", "),
            inline: true,
          });
        }

        // Add stream information if available
        if (pocketStreams.length > 0) {
          const streamInfo = pocketStreams
            .map((stream) => {
              let info = `VPS: ${stream.vps_username}@${stream.vps_ipaddress}:${stream.vps_port}\n`;
              info += `Source: ${stream.source_path}`;
              if (stream.type === "db-backups") {
                info += `\nDB Type: ${stream["db-backups"].db}`;
                info += `\nDB User: ${stream["db-backups"].username}`;
                info += `\nDatabases: ${
                  stream["db-backups"].databases.length
                    ? stream["db-backups"].databases.join(", ")
                    : "All"
                }`;
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

      // Add summary embed
      const summaryEmbed = new EmbedBuilder()
        .setTitle("System Summary")
        .setColor(0x00ff00)
        .addFields(
          {
            name: "Total Pockets",
            value: allPockets.length.toString(),
            inline: true,
          },
          {
            name: "Total Streams",
            value: Object.keys(streamsData)
              .filter((key) => key !== "[id]")
              .length.toString(),
            inline: true,
          }
        );

      embeds.unshift(summaryEmbed);

      // Send response with embeds
      await interaction.editReply({ embeds });
    } catch (error) {
      console.error("Error in show-pockets-streams:", error);
      await interaction.editReply(
        "There was an error while fetching pockets information."
      );
    }
  },
};
