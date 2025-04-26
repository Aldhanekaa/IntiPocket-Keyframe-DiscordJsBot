const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");

const { localdb } = require("../../config.json");
const { updateJSON } = require("../../func/JSON");

const showManagersCommand = new SlashCommandBuilder()
  .setName("show-managers")
  .setDescription("Show list of pockets you manage or own, and their managers.");

module.exports = {
  data: showManagersCommand,
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

      // Filter pockets where user is owner or manager
      const userId = interaction.user.id;
      const filtered = Object.entries(pocketsData).filter(([pid, pocket]) => {
        if (!pocket) return false;
        const managers = Array.isArray(pocket.managers) ? pocket.managers : [];
        return managers.includes(userId) || pocket.owner_id === userId;
      });
      if (filtered.length === 0) {
        await interaction.editReply({ content: "You are not a manager or owner of any pockets.", ephemeral: true });
        return;
      }
      const embed = new EmbedBuilder()
        .setTitle("Pockets You Manage or Own")
        .setColor(0x4e9af1);
      for (const [pid, pocket] of filtered) {
        embed.addFields({
          name: pocket.name || pid,
          value: `Owner: <@${pocket.owner_id}>, Managers: ${(Array.isArray(pocket.managers) && pocket.managers.length > 0) ? pocket.managers.map(id => `<@${id}>`).join(", ") : "None"}`
        });
      }
      await interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error("Error in show-managers:", error);
      await interaction.editReply(
        "There was an error while fetching your pocket managers information."
      );
    }
  },
};
