const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const path = require("path");
const fs = require("fs");

const { localdb } = require("../../config.json");
const { updateJSON } = require("../../func/JSON");

const showManagersCommand = new SlashCommandBuilder()
  .setName("manage-managers")
  .setDescription("Manage managers for your pockets.");

// Helper function to create add managers modal
function createAddManagersModal(slashCommand, pocketId) {
  const modal = new ModalBuilder()
    .setCustomId(`client.${slashCommand.toJSON().name}.add_managers_modal`)
    .setTitle("Add Managers");

  const managersInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.managers`)
    .setLabel("Manager IDs (comma-separated)")
    .setPlaceholder("e.g., 1119201709034582107,940014157045067776")
    .setStyle(TextInputStyle.Paragraph);

  const pocketData = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.pocket_data`)
    .setLabel("Pocket Data (DO NOT CHANGE IT)")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(JSON.stringify({ pocketId }))
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(managersInput);
  const secondActionRow = new ActionRowBuilder().addComponents(pocketData);

  modal.addComponents(firstActionRow, secondActionRow);

  return modal;
}

// Helper function to create navigation buttons
function createNavigationButtons(includeCancel = true) {
  const buttons = [];
  if (includeCancel) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    );
  }
  return new ActionRowBuilder().addComponents(buttons);
}

// Helper function to handle collector timeout
async function handleCollectorTimeout(reply, collector) {
  if (reply?.deletable) {
    await reply.delete().catch(console.error);
  }
  collector.stop();
}

module.exports = {
  data: showManagersCommand,
  instanceAdmin: true,
  channelLimit: false,

  /**
   * @param {import('discord.js').Interaction} interaction
   * @param {*} clientId
   * @param {*} _
   */
  async execute(interaction, clientId, extInteractionId) {
    await interaction.deferReply();

    try {
      // Handle modal submissions
      if (
        interaction.customId !== undefined &&
        extInteractionId.includes("modal")
      ) {
        const result = await handleModalSubmit(
          interaction,
          clientId,
          extInteractionId
        );
        if (result) {
          return;
        }
      }

      const userId = interaction.user.id;
      const filter = (i) => i.user.id === userId;

      // Read pockets.json
      const pocketsPath = path.join(process.env.APP_DIR, localdb.pockets);
      const pocketsData = JSON.parse(fs.readFileSync(pocketsPath, "utf8"));

      // Filter pockets where user is owner or manager
      const filtered = Object.entries(pocketsData).filter(([pid, pocket]) => {
        if (!pocket) return false;
        const managers = Array.isArray(pocket.managers) ? pocket.managers : [];
        return managers.includes(userId) || pocket.owner_id === userId;
      });

      if (filtered.length === 0) {
        await interaction.editReply({
          content: "You are not a manager or owner of any pockets.",
          ephemeral: true,
        });
        return;
      }

      // Create a select menu for pockets
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("pocket_select")
          .setPlaceholder("Select a pocket")
          .addOptions(
            filtered.map(([pid, pocket]) => ({
              label: pocket.name || pid,
              value: pid,
              description: `Owner: ${
                pocket.owner_id === userId ? "You" : `<@${pocket.owner_id}>`
              }`,
            }))
          )
      );

      const globalReply = await interaction.editReply({
        content: "Please select a pocket to manage its managers:",
        components: [row],
        fetchReply: true,
      });

      const collector = globalReply.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      collector.on("collect", async (interactionCollect) => {
        switch (interactionCollect.customId) {
          case "pocket_select":
            const pocketId = interactionCollect.values[0];
            const pocket = pocketsData[pocketId];

            // Create buttons for managing managers
            const actionRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("add_managers")
                .setLabel("Add Managers")
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId("delete_managers")
                .setLabel("Delete Managers")
                .setStyle(ButtonStyle.Danger)
            );

            const embed = new EmbedBuilder()
              .setTitle(`Managers for ${pocket.name || pocketId}`)
              .setColor(0x4e9af1)
              .addFields(
                {
                  name: "Owner",
                  value: `<@${pocket.owner_id}>`,
                },
                {
                  name: "Managers",
                  value:
                    Array.isArray(pocket.managers) && pocket.managers.length > 0
                      ? pocket.managers.map((id) => `<@${id}>`).join(", ")
                      : "None",
                }
              );

            await interactionCollect.deferUpdate();
            await interactionCollect.editReply({
              embeds: [embed],
              components: [actionRow, createNavigationButtons()],
            });
            break;

          case "add_managers":
            const addManagersModal = createAddManagersModal(
              showManagersCommand,
              interactionCollect.message.embeds[0].title.split(" for ")[1]
            );
            await interactionCollect.showModal(addManagersModal);
            break;

          case "delete_managers":
            const pocketToDelete =
              interactionCollect.message.embeds[0].title.split(" for ")[1];
            const pocketData = pocketsData[pocketToDelete];

            // Filter out owner from managers list
            const managersToDelete = Array.isArray(pocketData.managers)
              ? pocketData.managers.filter((id) => id !== pocketData.owner_id)
              : [];

            if (managersToDelete.length === 0) {
              await interactionCollect.reply({
                content: "There are no managers to delete.",
                ephemeral: true,
              });
              return;
            }

            const deleteRow = new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId("delete_managers_select")
                .setPlaceholder("Select managers to delete")
                .setMinValues(1)
                .setMaxValues(managersToDelete.length)
                .addOptions(
                  managersToDelete.map((id) => ({
                    label: `User ${id}`,
                    value: id,
                    description: `Manager ID: ${id}`,
                  }))
                )
            );

            await interactionCollect.deferUpdate();
            await interactionCollect.editReply({
              content: "Select managers to delete:",
              components: [deleteRow, createNavigationButtons()],
              embeds: [],
            });
            break;

          case "delete_managers_select":
            const selectedManagers = interactionCollect.values;
            const pocketToUpdate =
              interactionCollect.message.content.split(" for ")[1];

            // Update managers list
            const updatedManagers = pocketsData[pocketToUpdate].managers.filter(
              (id) => !selectedManagers.includes(id)
            );

            pocketsData[pocketToUpdate].managers = updatedManagers;

            // Save changes
            fs.writeFileSync(pocketsPath, JSON.stringify(pocketsData, null, 2));

            const successEmbed = new EmbedBuilder()
              .setTitle("Managers Updated")
              .setColor(0x00ff00)
              .addFields(
                { name: "Pocket", value: pocketToUpdate },
                {
                  name: "Removed Managers",
                  value: selectedManagers.map((id) => `<@${id}>`).join(", "),
                },
                {
                  name: "Remaining Managers",
                  value:
                    updatedManagers.length > 0
                      ? updatedManagers.map((id) => `<@${id}>`).join(", ")
                      : "None",
                }
              );

            await interactionCollect.deferUpdate();
            await interactionCollect.editReply({
              embeds: [successEmbed],
              components: [createNavigationButtons()],
            });
            break;

          case "cancel":
            await interactionCollect.deferUpdate();
            await interactionCollect.editReply({
              content: "Operation cancelled.",
              embeds: [],
              components: [],
            });
            return;
        }
      });

      collector.on("end", async (collected, reason) => {
        try {
          if (reason === "time") {
            await handleCollectorTimeout(globalReply, collector);
            await interaction.editReply({
              content: "Selection timed out.",
              components: [],
            });
          }
        } catch (error) {}
      });
    } catch (error) {
      console.error("Error in show-managers:", error);
      await interaction.editReply(
        "There was an error while fetching your pocket managers information."
      );
    }
  },
};

// Add modal interaction handler
async function handleModalSubmit(interaction, clientId, extInteractionId) {
  if (
    interaction.customId !== undefined &&
    extInteractionId.includes("modal")
  ) {
    let pocketData;
    try {
      pocketData = JSON.parse(
        interaction.fields.getTextInputValue(
          `${showManagersCommand.name}.pocket_data`
        )
      );
    } catch (error) {
      console.error("Error parsing pocket data:", error);
      await interaction.editReply({
        content: "Failed to parse pocket data. Please try again.",
        components: [],
        embeds: [],
      });
      return;
    }

    const managers = interaction.fields
      .getTextInputValue(`${showManagersCommand.name}.managers`)
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    // Read pockets.json
    const pocketsPath = path.join(process.env.APP_DIR, localdb.pockets);
    let pocketsData = JSON.parse(fs.readFileSync(pocketsPath, "utf8"));

    // Get current managers
    const currentManagers = pocketsData[pocketData.pocketId].managers || [];

    // Add new managers, avoiding duplicates
    const updatedManagers = [...new Set([...currentManagers, ...managers])];

    // Update managers
    pocketsData[pocketData.pocketId].managers = updatedManagers;

    // Save changes
    fs.writeFileSync(pocketsPath, JSON.stringify(pocketsData, null, 2));

    const embed = new EmbedBuilder()
      .setTitle("Managers Updated")
      .setColor(0x00ff00)
      .addFields(
        { name: "Pocket ID", value: pocketData.pocketId },
        {
          name: "Added Managers",
          value: managers.map((id) => `<@${id}>`).join(", ") || "None",
        },
        {
          name: "All Managers",
          value: updatedManagers.map((id) => `<@${id}>`).join(", ") || "None",
        },
        { name: "Status", value: "Successfully updated managers" }
      );

    await interaction.editReply({
      embeds: [embed],
      components: [createNavigationButtons()],
    });
    return true;
  }

  return false;
}
