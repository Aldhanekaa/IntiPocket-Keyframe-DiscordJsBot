const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");

const { localdb } = require("../../config.json");

const slashCommand = new SlashCommandBuilder()
  .setName("show-vps")
  .setDescription("Show all registered VPS configurations");

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
      // Read vps_pockets.json
      const vpsPath = path.join(process.env.APP_DIR, localdb.vps_pockets);
      const vpsData = JSON.parse(fs.readFileSync(vpsPath, "utf8"));

      // Read pockets.json to get related pockets
      const pocketsPath = path.join(process.env.APP_DIR, localdb.pockets);
      const pocketsData = JSON.parse(fs.readFileSync(pocketsPath, "utf8"));

      // Get all VPS configurations except the template
      const allVps = Object.entries(vpsData)
        .filter(([key, _]) => key !== "[vps_id]")
        .map(([vpsId, vps]) => ({ vpsId, ...vps }));

      if (allVps.length === 0) {
        await interaction.editReply(
          "No VPS configurations found in the system."
        );
        return;
      }

      // Create embed for each VPS
      const embeds = allVps.map((vps) => {
        // Find pockets using this VPS
        const relatedPockets = Object.entries(pocketsData)
          .filter(
            ([key, pocket]) =>
              key !== "[pocketId]" && pocket.vps_id === vps.vpsId
          )
          .map(([_, pocket]) => pocket);

        const embed = new EmbedBuilder()
          .setTitle(`VPS: ${vps.vpsId}`)
          .setColor(0x0099ff)
          .addFields(
            {
              name: "IP Address",
              value: vps.vps_ipaddress || "Not set",
              inline: true,
            },
            {
              name: "Port",
              value: vps.vps_port?.toString() || "Not set",
              inline: true,
            },
            {
              name: "Username",
              value: vps.vps_username || "Not set",
              inline: true,
            },
            {
              name: "Public Key",
              value: vps.public_key || "Not set",
              inline: false,
            }
          );

        // Add related pockets information
        if (relatedPockets.length > 0) {
          const pocketsList = relatedPockets
            .map((pocket) => {
              return `${pocket.pocketId} (${pocket.type})\nOwner: <@${pocket.owner_id}>`;
            })
            .join("\n\n");

          embed.addFields({
            name: `Related Pockets (${relatedPockets.length})`,
            value: pocketsList,
          });
        } else {
          embed.addFields({
            name: "Related Pockets",
            value: "No pockets are using this VPS",
          });
        }

        return embed;
      });

      // Add summary embed
      const summaryEmbed = new EmbedBuilder()
        .setTitle("VPS Summary")
        .setColor(0x00ff00)
        .addFields({
          name: "Total VPS Configurations",
          value: allVps.length.toString(),
          inline: true,
        });

      embeds.unshift(summaryEmbed);

      // Send response with embeds
      await interaction.editReply({ embeds });
    } catch (error) {
      console.error("Error in show-vps:", error);
      await interaction.editReply(
        "There was an error while fetching VPS configurations."
      );
    }
  },
};
