const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");

const { localdb } = require("../../config.json");

const slashCommand = new SlashCommandBuilder()
  .setName("set-vps-publickey")
  .setDescription("Set vps public key")
  .addStringOption((option) => {
    const vpsPath = path.join(process.env.APP_DIR, localdb.vps_pockets);
    const vpsData = JSON.parse(fs.readFileSync(vpsPath, "utf8"));
    const vpsOptions = Object.keys(vpsData)
      .filter(key => key !== "[vps_id]")
      .map(vpsId => ({
        name: vpsId,
        value: vpsId
      }));

    return option
      .setName("vps_id")
      .setDescription("Select the VPS to update")
      .addChoices(...vpsOptions)
      .setRequired(true);
  })
  .addStringOption((option) =>
    option
      .setName("public_key")
      .setDescription("Enter the public key")
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
      const vpsId = interaction.options.getString("vps_id");
      const publicKey = interaction.options.getString("public_key");

      // Read vps_pockets.json
      const vpsPath = path.join(process.env.APP_DIR, localdb.vps_pockets);
      const vpsData = JSON.parse(fs.readFileSync(vpsPath, "utf8"));

      // Update the public key for the selected VPS
      if (vpsData[vpsId]) {
        vpsData[vpsId].public_key = publicKey;
        
        // Write the updated data back to the file
        fs.writeFileSync(vpsPath, JSON.stringify(vpsData, null, 2));

        const embed = new EmbedBuilder()
          .setTitle("VPS Public Key Updated")
          .setColor(0x00ff00)
          .addFields(
            { name: "VPS ID", value: vpsId, inline: true },
            { name: "Status", value: "Successfully updated", inline: true }
          );

        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply("VPS ID not found.");
      }
    } catch (error) {
      console.error("Error in set-vps-publickey:", error);
      await interaction.editReply(
        "There was an error while updating the VPS public key."
      );
    }
  },
};
