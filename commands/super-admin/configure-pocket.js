const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const path = require("path");
const fs = require("fs");

const { localdb } = require("../../config.json");

// Add this at the top with other helper functions
const MENU_TYPES = {
  POCKET_SELECT: "pocket_select",
  MAIN_MENU: "main_menu",
  FILE_BACKUPS_MENU: "file_backups_menu",
  DB_BACKUPS_MENU: "db_backups_menu",
  DATABASES_MENU: "databases_menu",
  VPS_CREDENTIALS: "vps_credentials",
  VPS_CONNECTION: "vps_connection",
  DB_CREDENTIALS: "db_credentials",
  DB_CONNECTION: "db_connection",
  ADD_DATABASES: "add_databases",
  DELETE_DATABASES: "delete_databases",
  VIEW_CONFIG: "view_config",
  CONFIGURE_BACKUPS: "configure_backups",
  SET_SIZE_LIMIT: "set_size_limit",
  SET_RETENTIONS: "set_retentions",
  PUBLIC_KEY: "public_key",
  SET_CREDITS: "set_credits",
};

// Helper function to create file-backups configuration modal
function createFileBackupsModal(
  slashCommand,
  pocketId,
  streamId,
  title = "Configure File Backups",
  customId = "file_backups_modal"
) {
  const modal = new ModalBuilder()
    .setCustomId(`super-admin.${slashCommand.toJSON().name}.${customId}`)
    .setTitle(title);

  const vpsIpInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.vps_ipaddress`)
    .setLabel("VPS IP Address")
    .setPlaceholder("e.g., 139.59.96.4")
    .setStyle(TextInputStyle.Short);

  const vpsUsernameInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.vps_username`)
    .setLabel("VPS Username")
    .setPlaceholder("e.g., root")
    .setStyle(TextInputStyle.Short);

  const vpsPortInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.vps_port`)
    .setLabel("VPS Port")
    .setPlaceholder("e.g., 22")
    .setStyle(TextInputStyle.Short);

  const streamData = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.stream_data`)
    .setLabel("Stream Data (DO NOT CHANGE IT)")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(JSON.stringify({ pocketId, streamId }))
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(vpsIpInput);
  const secondActionRow = new ActionRowBuilder().addComponents(
    vpsUsernameInput
  );
  const thirdActionRow = new ActionRowBuilder().addComponents(vpsPortInput);
  const fourthActionRow = new ActionRowBuilder().addComponents(streamData);

  modal.addComponents(
    firstActionRow,
    secondActionRow,
    thirdActionRow,
    fourthActionRow
  );

  return modal;
}

// Helper function to create db-backups configuration modal
function createDbBackupsModal(
  slashCommand,
  pocketId,
  streamId,
  title = "Configure Database Backups",
  customId = "db_backups_modal"
) {
  const modal = new ModalBuilder()
    .setCustomId(`super-admin.${slashCommand.toJSON().name}.${customId}`)
    .setTitle(title);

  const usernameInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.username`)
    .setLabel("Database Username")
    .setPlaceholder("e.g., doadmin")
    .setStyle(TextInputStyle.Short);

  const passwordInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.password`)
    .setLabel("Database Password")
    .setPlaceholder("e.g., AVNS_MctxWArgFkh2A7OJGsE")
    .setStyle(TextInputStyle.Short);

  const databasesInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.databases`)
    .setLabel("Databases (comma-separated)")
    .setPlaceholder("e.g., dummy_company, defaultdb")
    .setStyle(TextInputStyle.Short);

  const hostInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.host`)
    .setLabel("Database Host")
    .setPlaceholder("e.g., yourdbname.db.ondigitalocean.com")
    .setStyle(TextInputStyle.Short);

  const portInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.port`)
    .setLabel("Database Port")
    .setPlaceholder("e.g., 25060")
    .setStyle(TextInputStyle.Short);

  const streamData = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.stream_data`)
    .setLabel("Stream Data (DO NOT CHANGE IT)")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(JSON.stringify({ pocketId, streamId }))
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(usernameInput);
  const secondActionRow = new ActionRowBuilder().addComponents(passwordInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(databasesInput);
  const fourthActionRow = new ActionRowBuilder().addComponents(hostInput);
  const fifthActionRow = new ActionRowBuilder().addComponents(portInput);
  const sixthActionRow = new ActionRowBuilder().addComponents(streamData);

  modal.addComponents(
    firstActionRow,
    secondActionRow,
    thirdActionRow,
    fourthActionRow,
    fifthActionRow,
    sixthActionRow
  );

  return modal;
}

// Helper function to create managers modal
function createManagersModal(
  slashCommand,
  pocketId,
  title = "Configure Managers",
  customId = "managers_modal"
) {
  const modal = new ModalBuilder()
    .setCustomId(`super-admin.${slashCommand.toJSON().name}.${customId}`)
    .setTitle(title);

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

// Helper function to create VPS credentials modal
function createVPSCredentialsModal(
  slashCommand,
  pocketId,
  streamId,
  title = "Configure VPS Credentials",
  customId = "vps_credentials_modal"
) {
  const modal = new ModalBuilder()
    .setCustomId(`super-admin.${slashCommand.toJSON().name}.${customId}`)
    .setTitle(title);

  const usernameInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.vps_username`)
    .setLabel("VPS Username")
    .setPlaceholder("e.g., root")
    .setStyle(TextInputStyle.Short);

  const passwordInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.vps_password`)
    .setLabel("VPS Password")
    .setPlaceholder("Enter VPS password")
    .setStyle(TextInputStyle.Short);

  const streamData = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.stream_data`)
    .setLabel("Stream Data (DO NOT CHANGE IT)")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(JSON.stringify({ pocketId, streamId }))
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(usernameInput);
  const secondActionRow = new ActionRowBuilder().addComponents(passwordInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(streamData);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  return modal;
}

// Helper function to create VPS connection modal
function createVPSConnectionModal(
  slashCommand,
  pocketId,
  streamId,
  title = "Configure VPS Connection",
  customId = "vps_connection_modal"
) {
  const modal = new ModalBuilder()
    .setCustomId(`super-admin.${slashCommand.toJSON().name}.${customId}`)
    .setTitle(title);

  const ipInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.vps_ipaddress`)
    .setLabel("VPS IP Address")
    .setPlaceholder("e.g., 139.59.96.4")
    .setStyle(TextInputStyle.Short);

  const portInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.vps_port`)
    .setLabel("VPS Port")
    .setPlaceholder("e.g., 22")
    .setStyle(TextInputStyle.Short);

  const streamData = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.stream_data`)
    .setLabel("Stream Data (DO NOT CHANGE IT)")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(JSON.stringify({ pocketId, streamId }))
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(ipInput);
  const secondActionRow = new ActionRowBuilder().addComponents(portInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(streamData);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  return modal;
}

// Helper function to create DB credentials modal
function createDBCredentialsModal(
  slashCommand,
  pocketId,
  streamId,
  title = "Configure Database Credentials",
  customId = "db_credentials_modal"
) {
  const modal = new ModalBuilder()
    .setCustomId(`super-admin.${slashCommand.toJSON().name}.${customId}`)
    .setTitle(title);

  const usernameInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.username`)
    .setLabel("Database Username")
    .setPlaceholder("e.g., doadmin")
    .setStyle(TextInputStyle.Short);

  const passwordInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.password`)
    .setLabel("Database Password")
    .setPlaceholder("Enter database password")
    .setStyle(TextInputStyle.Short);

  const streamData = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.stream_data`)
    .setLabel("Stream Data (DO NOT CHANGE IT)")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(JSON.stringify({ pocketId, streamId }))
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(usernameInput);
  const secondActionRow = new ActionRowBuilder().addComponents(passwordInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(streamData);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  return modal;
}

// Helper function to create DB connection modal
function createDBConnectionModal(
  slashCommand,
  pocketId,
  streamId,
  title = "Configure Database Connection",
  customId = "db_connection_modal"
) {
  const modal = new ModalBuilder()
    .setCustomId(`super-admin.${slashCommand.toJSON().name}.${customId}`)
    .setTitle(title);

  const hostInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.host`)
    .setLabel("Database Host")
    .setPlaceholder(
      "e.g., db-mysql-sgp1-31575-do-user-8634560-0.l.db.ondigitalocean.com"
    )
    .setStyle(TextInputStyle.Short);

  const portInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.port`)
    .setLabel("Database Port")
    .setPlaceholder("e.g., 25060")
    .setStyle(TextInputStyle.Short);

  const streamData = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.stream_data`)
    .setLabel("Stream Data (DO NOT CHANGE IT)")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(JSON.stringify({ pocketId, streamId }))
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(hostInput);
  const secondActionRow = new ActionRowBuilder().addComponents(portInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(streamData);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  return modal;
}

// Helper function to create add databases modal
function createAddDatabasesModal(
  slashCommand,
  pocketId,
  streamId,
  title = "Add Databases",
  customId = "add_databases_modal"
) {
  const modal = new ModalBuilder()
    .setCustomId(`super-admin.${slashCommand.toJSON().name}.${customId}`)
    .setTitle(title);

  const databasesInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.databases`)
    .setLabel("Database Names (comma-separated)")
    .setPlaceholder("e.g., dummy_company, defaultdb")
    .setStyle(TextInputStyle.Paragraph);

  const streamData = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.stream_data`)
    .setLabel("Stream Data (DO NOT CHANGE IT)")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(JSON.stringify({ pocketId, streamId }))
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(databasesInput);
  const secondActionRow = new ActionRowBuilder().addComponents(streamData);

  modal.addComponents(firstActionRow, secondActionRow);

  return modal;
}

// Helper function to create delete databases modal
function createDeleteDatabasesModal(
  slashCommand,
  pocketId,
  streamId,
  currentDatabases,
  title = "Delete Databases",
  customId = "delete_databases_modal"
) {
  console.log(
    `custom id : super-admin.${slashCommand.toJSON().name}.${customId}`
  );
  const modal = new ModalBuilder()
    .setCustomId(`super-admin.${slashCommand.toJSON().name}.${customId}`)
    .setTitle(title);

  const databasesInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.databases`)
    .setLabel("Database Names to Delete (comma-separated)")
    .setPlaceholder("e.g., dummy_company, defaultdb")
    .setValue(currentDatabases.join(", "))
    .setStyle(TextInputStyle.Paragraph);

  const streamData = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.stream_data`)
    .setLabel("Stream Data (DO NOT CHANGE IT)")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(JSON.stringify({ pocketId, streamId }))
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(databasesInput);
  const secondActionRow = new ActionRowBuilder().addComponents(streamData);

  modal.addComponents(firstActionRow, secondActionRow);

  return modal;
}

// Helper function to create navigation buttons with optional cancel button
function createNavigationButtons(includeBack = true, includeCancel = false) {
  const buttons = [];
  if (includeBack) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId("back")
        .setLabel("Back")
        .setStyle(ButtonStyle.Secondary)
    );
  }
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

// Add this helper function at the top with other helper functions
async function deletePreviousMessage(interaction) {
  try {
    if (interaction.message?.deletable) {
      await interaction.message.delete().catch(console.error);
    }
  } catch (error) {
    console.error("Error deleting previous message:", error);
  }
}

// Add this helper function at the top with other helper functions
function createBackButton() {
  return new ButtonBuilder()
    .setCustomId("back")
    .setLabel("Back")
    .setStyle(ButtonStyle.Secondary);
}

// Add this helper function for creating public key modal
function createPublicKeyModal(
  slashCommand,
  pocketId,
  streamId,
  title = "Configure Public Key",
  customId = "public_key_modal"
) {
  const modal = new ModalBuilder()
    .setCustomId(`super-admin.${slashCommand.toJSON().name}.${customId}`)
    .setTitle(title);

  const publicKeyInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.public_key`)
    .setLabel("Public Key (Should use ssh-ed25519)")
    .setPlaceholder("e.g., ssh-ed25519 publickey client-test")
    .setStyle(TextInputStyle.Paragraph);

  const streamData = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.stream_data`)
    .setLabel("Stream Data (DO NOT CHANGE IT)")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(JSON.stringify({ pocketId, streamId }))
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(publicKeyInput);
  const secondActionRow = new ActionRowBuilder().addComponents(streamData);

  modal.addComponents(firstActionRow, secondActionRow);

  return modal;
}

// Add this helper function for creating credits modal
function createCreditsModal(
  slashCommand,
  pocketId,
  title = "Set Backup Credits",
  customId = "credits_modal"
) {
  const modal = new ModalBuilder()
    .setCustomId(`super-admin.${slashCommand.toJSON().name}.${customId}`)
    .setTitle(title);

  const creditsInput = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.credits`)
    .setLabel("Number of Backup Credits")
    .setPlaceholder("Enter number of credits (e.g., 10)")
    .setStyle(TextInputStyle.Short);

  const pocketData = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.pocket_data`)
    .setLabel("Pocket Data (DO NOT CHANGE IT)")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(JSON.stringify({ pocketId }))
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(creditsInput);
  const secondActionRow = new ActionRowBuilder().addComponents(pocketData);

  modal.addComponents(firstActionRow, secondActionRow);

  return modal;
}

const slashCommand = new SlashCommandBuilder()
  .setName("configure-pocket")
  .setDescription("Various pocket configuration commands");

module.exports = {
  data: slashCommand,
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
      const userId = interaction.user.id;
      const filter = (i) => i.user.id === userId;

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
        return;
      }
      // Read pockets.json to get pocket information
      const pocketsPath = path.join(process.env.APP_DIR, localdb.pockets);
      let pocketsData = JSON.parse(fs.readFileSync(pocketsPath, "utf8"));

      // Get all pockets (no filtering for super-admin)
      const accessiblePockets = Object.entries(pocketsData).map(
        ([id, pocket]) => ({
          label: `${id} (${pocket.type})`,
          value: id,
        })
      );

      if (accessiblePockets.length === 0) {
        await interaction.editReply("No pockets found.");
        return;
      }

      // Create a select menu for pockets
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("pocket_select")
          .setPlaceholder("Select a pocket")
          .addOptions(accessiblePockets)
      );

      globalReply = await interaction.editReply({
        content: "Please select a pocket to configure:",
        components: [row],
        fetchReply: true,
      });

      collector = globalReply.createMessageComponentCollector({
        filter,
        time: 60000,
      });

      let pocket = {};
      let pocketId = "";
      let streamData = {};
      let streamId = "";

      collector.on("collect", async (interactionCollect) => {
        // Initialize navigation history if it doesn't exist
        if (!interactionCollect.message.navigationHistory) {
          interactionCollect.message.navigationHistory = [];
        }

        switch (interactionCollect.customId) {
          case "pocket_select":
            pocketId = interactionCollect.values[0];
            pocket = pocketsData[pocketId];

            // Read streams.json to get stream information
            const streamsPath = path.join(process.env.APP_DIR, localdb.streams);
            const streamsData = JSON.parse(
              fs.readFileSync(streamsPath, "utf8")
            );

            // Find the stream for this pocket
            const stream = Object.entries(streamsData).find(
              ([_, s]) => s.pocketId === pocketId
            );
            [streamId, streamData] = stream || [null, null];

            if (!streamData) {
              await interactionCollect.editReply({
                content: `No stream configuration found for pocket ${pocketId}.`,
                components: [
                  new ActionRowBuilder().addComponents(createBackButton()),
                ],
              });
              return;
            }

            // Create buttons based on pocket type
            const actionRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("configure_stream")
                .setLabel(
                  `Config ${
                    pocket.type === "file-backups" ? "File" : "DB"
                  } Settings`
                )
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId("view_config")
                .setLabel("View Current Config")
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId("configure_backups")
                .setLabel("Config Backups")
                .setStyle(ButtonStyle.Success)
            );

            // Add current state to navigation history
            interactionCollect.message.navigationHistory.push({
              type: MENU_TYPES.MAIN_MENU,
              content: `Selected pocket: ${pocketId} (${pocket.type})\nWhat would you like to do?`,
              components: [actionRow, createNavigationButtons(false, true)],
            });

            await interactionCollect.deferUpdate();
            await interactionCollect.editReply(
              interactionCollect.message.navigationHistory[
                interactionCollect.message.navigationHistory.length - 1
              ]
            );
            break;

          case "configure_stream":
            if (pocket.type === "file-backups") {
              // Create buttons for file-backups configuration
              const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId("configure_vps_credentials")
                  .setLabel("Configure VPS Credentials")
                  .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                  .setCustomId("configure_vps_connection")
                  .setLabel("Configure VPS Connection")
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId("configure_public_key")
                  .setLabel("Configure Public Key")
                  .setStyle(ButtonStyle.Success)
              );

              // Add current state to navigation history
              interactionCollect.message.navigationHistory.push({
                type: MENU_TYPES.FILE_BACKUPS_MENU,
                content: `Selected pocket: ${pocketId} (${pocket.type})\nWhat would you like to configure?`,
                components: [actionRow, createNavigationButtons()],
              });

              await interactionCollect.deferUpdate();
              await interactionCollect.editReply(
                interactionCollect.message.navigationHistory[
                  interactionCollect.message.navigationHistory.length - 1
                ]
              );
            } else {
              // Create buttons for db-backups configuration
              const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId("configure_db_credentials")
                  .setLabel("Configure Database Credentials")
                  .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                  .setCustomId("configure_db_connection")
                  .setLabel("Configure Database Connection")
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId("configure_databases")
                  .setLabel("Configure Databases")
                  .setStyle(ButtonStyle.Success)
              );

              // Add current state to navigation history
              interactionCollect.message.navigationHistory.push({
                type: MENU_TYPES.DB_BACKUPS_MENU,
                content: `Selected pocket: ${pocketId} (${pocket.type})\nWhat would you like to configure?`,
                components: [actionRow, createNavigationButtons()],
              });

              await interactionCollect.deferUpdate();
              await interactionCollect.editReply(
                interactionCollect.message.navigationHistory[
                  interactionCollect.message.navigationHistory.length - 1
                ]
              );
            }
            break;

          case "configure_vps_credentials":
            const vpsCredentialsModal = createVPSCredentialsModal(
              slashCommand,
              pocketId,
              streamId
            );
            interactionCollect.message.navigationHistory.push({
              type: MENU_TYPES.VPS_CREDENTIALS,
              modal: vpsCredentialsModal,
            });
            await deletePreviousMessage(interactionCollect);
            await interactionCollect.showModal(vpsCredentialsModal);
            break;

          case "configure_vps_connection":
            const vpsConnectionModal = createVPSConnectionModal(
              slashCommand,
              pocketId,
              streamId
            );
            interactionCollect.message.navigationHistory.push({
              type: MENU_TYPES.VPS_CONNECTION,
              modal: vpsConnectionModal,
            });
            await deletePreviousMessage(interactionCollect);
            await interactionCollect.showModal(vpsConnectionModal);
            break;

          case "configure_db_credentials":
            const dbCredentialsModal = createDBCredentialsModal(
              slashCommand,
              pocketId,
              streamId
            );
            interactionCollect.message.navigationHistory.push({
              type: MENU_TYPES.DB_CREDENTIALS,
              modal: dbCredentialsModal,
            });
            await deletePreviousMessage(interactionCollect);
            await interactionCollect.showModal(dbCredentialsModal);
            break;

          case "configure_db_connection":
            const dbConnectionModal = createDBConnectionModal(
              slashCommand,
              pocketId,
              streamId
            );
            interactionCollect.message.navigationHistory.push({
              type: MENU_TYPES.DB_CONNECTION,
              modal: dbConnectionModal,
            });
            await deletePreviousMessage(interactionCollect);
            await interactionCollect.showModal(dbConnectionModal);
            break;

          case "configure_databases":
            // Create buttons for database management
            const dbActionRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("add_databases")
                .setLabel("Add Databases")
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId("delete_databases")
                .setLabel("Delete Databases")
                .setStyle(ButtonStyle.Danger)
            );

            // Add current state to navigation history
            interactionCollect.message.navigationHistory.push({
              type: MENU_TYPES.DATABASES_MENU,
              content: `Selected pocket: ${pocketId} (${pocket.type})\nWhat would you like to do with databases?`,
              components: [dbActionRow, createNavigationButtons()],
            });

            await interactionCollect.deferUpdate();
            await interactionCollect.editReply(
              interactionCollect.message.navigationHistory[
                interactionCollect.message.navigationHistory.length - 1
              ]
            );
            break;

          case "add_databases":
            const addDatabasesModal = createAddDatabasesModal(
              slashCommand,
              pocketId,
              streamId
            );
            interactionCollect.message.navigationHistory.push({
              type: MENU_TYPES.ADD_DATABASES,
              modal: addDatabasesModal,
            });
            await deletePreviousMessage(interactionCollect);
            await interactionCollect.showModal(addDatabasesModal);
            break;

          case "delete_databases":
            const currentDatabases = streamData["db-backups"].databases || [];
            const deleteDatabasesModal = createDeleteDatabasesModal(
              slashCommand,
              pocketId,
              streamId,
              currentDatabases
            );
            interactionCollect.message.navigationHistory.push({
              type: MENU_TYPES.DELETE_DATABASES,
              modal: deleteDatabasesModal,
            });
            await deletePreviousMessage(interactionCollect);
            await interactionCollect.showModal(deleteDatabasesModal);
            break;

          case "view_config":
            await interactionCollect.deferUpdate();

            const embed = new EmbedBuilder()
              .setTitle(`Current Configuration for ${pocketId}`)
              .setColor(0x0099ff);

            if (pocket.type === "file-backups") {
              embed.addFields(
                {
                  name: "VPS IP Address",
                  value: streamData.vps_ipaddress || "Not set",
                },
                {
                  name: "VPS Username",
                  value: streamData.vps_username || "Not set",
                },
                { name: "VPS Port", value: streamData.vps_port || "Not set" }
              );
            } else {
              embed.addFields(
                {
                  name: "Username",
                  value: streamData["db-backups"].username || "Not set",
                },
                {
                  name: "Host",
                  value: streamData["db-backups"].host || "Not set",
                },
                {
                  name: "Port",
                  value: streamData["db-backups"].port || "Not set",
                },
                {
                  name: "Databases",
                  value:
                    (streamData["db-backups"].databases || []).join(", ") ||
                    "Not set",
                }
              );
            }

            interactionCollect.message.navigationHistory.push({
              type: MENU_TYPES.VIEW_CONFIG,
              content: "",
              embeds: [embed],
              components: [createNavigationButtons(true, false)],
            });

            await interactionCollect.editReply(
              interactionCollect.message.navigationHistory[
                interactionCollect.message.navigationHistory.length - 1
              ]
            );
            break;

          case "configure_backups":
            // Create buttons for backup configuration
            const backupActionRow = new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId("set_size_limit")
                .setPlaceholder("Select size limit")
                .addOptions([
                  {
                    label: "250 MB",
                    value: "250M",
                    description: "250 Megabytes",
                  },
                  { label: "1 GB", value: "1G", description: "1 Gigabyte" },
                  { label: "2 GB", value: "2G", description: "2 Gigabytes" },
                  { label: "5 GB", value: "5G", description: "5 Gigabytes" },
                  { label: "10 GB", value: "10G", description: "10 Gigabytes" },
                  { label: "50 GB", value: "50G", description: "50 Gigabytes" },
                  {
                    label: "100 GB",
                    value: "100G",
                    description: "100 Gigabytes",
                  },
                  {
                    label: "250 GB",
                    value: "250G",
                    description: "250 Gigabytes",
                  },
                ])
            );

            const retentionActionRow = new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId("set_retentions")
                .setPlaceholder("Select backups per week")
                .addOptions([
                  {
                    label: "1 backup/week",
                    value: "1",
                    description: "1 backup per week",
                  },
                  {
                    label: "2 backups/week",
                    value: "2",
                    description: "2 backups per week",
                  },
                  {
                    label: "5 backups/week",
                    value: "5",
                    description: "5 backups per week",
                  },
                  {
                    label: "7 backups/week",
                    value: "7",
                    description: "7 backups per week",
                  },
                  {
                    label: "10 backups/week",
                    value: "10",
                    description: "10 backups per week",
                  },
                  {
                    label: "14 backups/week",
                    value: "14",
                    description: "14 backups per week",
                  },
                  {
                    label: "16 backups/week",
                    value: "16",
                    description: "16 backups per week",
                  },
                  {
                    label: "20 backups/week",
                    value: "20",
                    description: "20 backups per week",
                  },
                  {
                    label: "24 backups/week",
                    value: "24",
                    description: "24 backups per week",
                  },
                  {
                    label: "28 backups/week",
                    value: "28",
                    description: "28 backups per week",
                  },
                  {
                    label: "30 backups/week",
                    value: "30",
                    description: "30 backups per week",
                  },
                ])
            );

            const creditsActionRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("set_credits")
                .setLabel("Set Credits")
                .setStyle(ButtonStyle.Primary)
            );

            // Add current state to navigation history
            interactionCollect.message.navigationHistory.push({
              type: MENU_TYPES.CONFIGURE_BACKUPS,
              content: `Selected pocket: ${pocketId} (${pocket.type})\nConfigure backup settings:\n• Size Limit: Maximum size for each backup\n• Backups per Week: How many backups can be performed in a week\n• Credits: Number of backup operations allowed`,
              components: [
                backupActionRow,
                retentionActionRow,
                creditsActionRow,
                createNavigationButtons(),
              ],
            });

            await interactionCollect.deferUpdate();
            await interactionCollect.editReply(
              interactionCollect.message.navigationHistory[
                interactionCollect.message.navigationHistory.length - 1
              ]
            );
            break;

          case "set_size_limit":
            // Get the selected size limit from the dropdown
            const selectedSizeLimit = interactionCollect.values[0];

            // Update the size limit in backup_config
            pocketsData[pocketId].backup_config = {
              ...pocketsData[pocketId].backup_config,
              size_limit: selectedSizeLimit,
            };

            // Save changes
            fs.writeFileSync(pocketsPath, JSON.stringify(pocketsData, null, 2));

            // Create success embed
            const sizeLimitEmbed = new EmbedBuilder()
              .setTitle("Size Limit Updated")
              .setColor(0x00ff00)
              .addFields(
                { name: "Pocket ID", value: pocketId },
                { name: "New Size Limit", value: selectedSizeLimit },
                { name: "Status", value: "Successfully updated size limit" }
              );

            await interactionCollect.deferUpdate();
            await interactionCollect.editReply({
              embeds: [sizeLimitEmbed],
              components: [createNavigationButtons(true, false)],
            });
            break;

          case "set_retentions":
            // Get the selected retention value from the dropdown
            const selectedRetentions = parseInt(interactionCollect.values[0]);

            // Update the max_backups_per_week in backup_config
            pocketsData[pocketId].backup_config = {
              ...pocketsData[pocketId].backup_config,
              max_backups_per_week: selectedRetentions,
            };

            // Save changes
            fs.writeFileSync(pocketsPath, JSON.stringify(pocketsData, null, 2));

            // Create success embed
            const retentionsEmbed = new EmbedBuilder()
              .setTitle("Backups per Week Updated")
              .setColor(0x00ff00)
              .addFields(
                { name: "Pocket ID", value: pocketId },
                {
                  name: "New Backups per Week",
                  value: `${selectedRetentions} backups`,
                },
                {
                  name: "Status",
                  value: "Successfully updated maximum backups per week",
                }
              );

            await interactionCollect.deferUpdate();

            await interactionCollect.editReply({
              embeds: [retentionsEmbed],
              components: [createNavigationButtons(true, false)],
            });
            break;

          case "set_credits":
            const creditsModal = createCreditsModal(slashCommand, pocketId);
            interactionCollect.message.navigationHistory.push({
              type: MENU_TYPES.SET_CREDITS,
              modal: creditsModal,
            });
            await deletePreviousMessage(interactionCollect);
            await interactionCollect.showModal(creditsModal);
            break;

          case "configure_managers":
            const managersModal = createManagersModal(slashCommand, pocketId);
            interactionCollect.message.navigationHistory.push({
              type: MENU_TYPES.CONFIGURE_MANAGERS,
              modal: managersModal,
            });
            await deletePreviousMessage(interactionCollect);
            await interactionCollect.showModal(managersModal);
            break;

          case "configure_public_key":
            const publicKeyModal = createPublicKeyModal(
              slashCommand,
              pocketId,
              streamId
            );
            interactionCollect.message.navigationHistory.push({
              type: MENU_TYPES.PUBLIC_KEY,
              modal: publicKeyModal,
            });
            await deletePreviousMessage(interactionCollect);
            await interactionCollect.showModal(publicKeyModal);
            break;

          case "back":
            await interactionCollect.deferUpdate();

            // Remove current state from navigation history
            interactionCollect.message.navigationHistory.pop();

            // Go back to previous state
            if (interactionCollect.message.navigationHistory.length > 0) {
              const previousState =
                interactionCollect.message.navigationHistory[
                  interactionCollect.message.navigationHistory.length - 1
                ];
              if (previousState.modal) {
                try {
                  await interactionCollect.showModal(previousState.modal);
                } catch (error) {
                  await interactionCollect.editReply({
                    content:
                      "No previous menu to go back to.\n_This is a bug, please contact the developers_",
                    components: [],
                    embeds: [],
                  });
                }
              } else {
                await interactionCollect.editReply(
                  Object.assign({}, previousState, {
                    embeds: [],
                  })
                );
              }
            } else {
              // If no previous state, just show a message
              await interactionCollect.editReply({
                content: "No previous menu to go back to.",
                components: [],
                embeds: [],
              });
            }
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
      console.error("Error in configure-pocket:", error);
      await interaction.editReply(
        "There was an error while configuring the pocket."
      );
    }
  },
};

// Add modal interaction handler
async function handleModalSubmit(interaction, clientId, extInteractionId) {
  if (
    interaction.customId !== undefined &&
    interaction.customId.includes("modal")
  ) {
    // Parse stream data once at the beginning
    let streamData;
    try {
      streamData = JSON.parse(
        interaction.fields.getTextInputValue(`${slashCommand.name}.stream_data`)
      );
    } catch (error) {
      console.error("Error parsing stream data:", error);
      await interaction.editReply({
        content: "Failed to parse stream data. Please try again.",
        components: [],
        embeds: [],
      });
      return;
    }

    // Read pockets.json
    const pocketsPath = path.join(process.env.APP_DIR, localdb.pockets);
    let pocketsData = JSON.parse(fs.readFileSync(pocketsPath, "utf8"));

    // Handle different modal types
    switch (extInteractionId) {
      case `super-admin.${slashCommand.toJSON().name}.file_backups_modal`:
      case `super-admin.${slashCommand.toJSON().name}.db_backups_modal`:
        // Update stream configuration
        if (extInteractionId.includes("file_backups_modal")) {
          pocketsData[streamData.streamId] = {
            ...pocketsData[streamData.streamId],
            vps_ipaddress: interaction.fields.getTextInputValue(
              `${slashCommand.name}.vps_ipaddress`
            ),
            vps_username: interaction.fields.getTextInputValue(
              `${slashCommand.name}.vps_username`
            ),
            vps_port: interaction.fields.getTextInputValue(
              `${slashCommand.name}.vps_port`
            ),
          };
        } else {
          pocketsData[streamData.streamId]["db-backups"] = {
            ...pocketsData[streamData.streamId]["db-backups"],
            username: interaction.fields.getTextInputValue(
              `${slashCommand.name}.username`
            ),
            pwd: interaction.fields.getTextInputValue(
              `${slashCommand.name}.password`
            ),
            databases: interaction.fields
              .getTextInputValue(`${slashCommand.name}.databases`)
              .split(",")
              .map((d) => d.trim()),
            host: interaction.fields.getTextInputValue(
              `${slashCommand.name}.host`
            ),
            port: interaction.fields.getTextInputValue(
              `${slashCommand.name}.port`
            ),
          };
        }
        break;

      case `super-admin.${slashCommand.toJSON().name}.vps_credentials_modal`:
      case `super-admin.${slashCommand.toJSON().name}.vps_connection_modal`:
        // Update stream configuration based on modal type
        if (extInteractionId.includes("vps_credentials_modal")) {
          pocketsData[streamData.streamId] = {
            ...pocketsData[streamData.streamId],
            vps_username: interaction.fields.getTextInputValue(
              `${slashCommand.name}.vps_username`
            ),
            vps_password: interaction.fields.getTextInputValue(
              `${slashCommand.name}.vps_password`
            ),
          };
        } else {
          pocketsData[streamData.streamId] = {
            ...pocketsData[streamData.streamId],
            vps_ipaddress: interaction.fields.getTextInputValue(
              `${slashCommand.name}.vps_ipaddress`
            ),
            vps_port: interaction.fields.getTextInputValue(
              `${slashCommand.name}.vps_port`
            ),
          };
        }
        break;

      case `super-admin.${slashCommand.toJSON().name}.managers_modal`:
        const managers = interaction.fields
          .getTextInputValue(`${slashCommand.name}.managers`)
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0);

        // Update managers
        pocketsData[pocketData.pocketId].managers = managers;

        // Save changes
        fs.writeFileSync(pocketsPath, JSON.stringify(pocketsData, null, 2));

        const embed = new EmbedBuilder()
          .setTitle("Managers Updated")
          .setColor(0x00ff00)
          .addFields(
            { name: "Pocket ID", value: pocketData.pocketId },
            { name: "Managers", value: managers.join(", ") || "None" },
            { name: "Status", value: "Successfully updated managers" }
          );

        await interaction.editReply({
          embeds: [embed],
          components: [],
        });
        return true;

      case `super-admin.${slashCommand.toJSON().name}.db_credentials_modal`:
      case `super-admin.${slashCommand.toJSON().name}.db_connection_modal`:
      case `super-admin.${slashCommand.toJSON().name}.add_databases_modal`:
      case `super-admin.${slashCommand.toJSON().name}.delete_databases_modal`:
        // Update stream configuration based on modal type
        if (extInteractionId.includes("db_credentials_modal")) {
          pocketsData[streamData.streamId]["db-backups"] = {
            ...pocketsData[streamData.streamId]["db-backups"],
            username: interaction.fields.getTextInputValue(
              `${slashCommand.name}.username`
            ),
            pwd: interaction.fields.getTextInputValue(
              `${slashCommand.name}.password`
            ),
          };
        } else if (extInteractionId.includes("db_connection_modal")) {
          pocketsData[streamData.streamId]["db-backups"] = {
            ...pocketsData[streamData.streamId]["db-backups"],
            host: interaction.fields.getTextInputValue(
              `${slashCommand.name}.host`
            ),
            port: interaction.fields.getTextInputValue(
              `${slashCommand.name}.port`
            ),
          };
        } else if (extInteractionId.includes("add_databases_modal")) {
          const newDatabases = interaction.fields
            .getTextInputValue(`${slashCommand.name}.databases`)
            .split(",")
            .map((d) => d.trim())
            .filter((d) => d.length > 0);

          const currentDatabases =
            pocketsData[streamData.streamId]["db-backups"].databases || [];
          const updatedDatabases = [
            ...new Set([...currentDatabases, ...newDatabases]),
          ];

          pocketsData[streamData.streamId]["db-backups"] = {
            ...pocketsData[streamData.streamId]["db-backups"],
            databases: updatedDatabases,
          };
        } else if (extInteractionId.includes("delete_databases_modal")) {
          const databasesToDelete = interaction.fields
            .getTextInputValue(`${slashCommand.name}.databases`)
            .split(",")
            .map((d) => d.trim())
            .filter((d) => d.length > 0);

          const currentDatabases =
            pocketsData[streamData.streamId]["db-backups"].databases || [];
          const updatedDatabases = currentDatabases.filter(
            (db) => !databasesToDelete.includes(db)
          );

          pocketsData[streamData.streamId]["db-backups"] = {
            ...pocketsData[streamData.streamId]["db-backups"],
            databases: updatedDatabases,
          };
        }
        break;

      case `super-admin.${slashCommand.toJSON().name}.public_key_modal`:
        pocketsData[streamData.streamId] = {
          ...pocketsData[streamData.streamId],
          public_key: interaction.fields.getTextInputValue(
            `${slashCommand.name}.public_key`
          ),
        };
        break;

      case `super-admin.${slashCommand.toJSON().name}.credits_modal`:
        let creditsPocketData;
        try {
          creditsPocketData = JSON.parse(
            interaction.fields.getTextInputValue(
              `${slashCommand.name}.pocket_data`
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

        const credits = parseInt(
          interaction.fields.getTextInputValue(`${slashCommand.name}.credits`)
        );
        if (isNaN(credits) || credits < 0) {
          await interaction.editReply({
            content: "Please enter a valid number of credits (0 or greater).",
            components: [],
            embeds: [],
          });
          return;
        }

        // Update credits in backup_config
        pocketsData[creditsPocketData.pocketId].backup_config = {
          ...pocketsData[creditsPocketData.pocketId].backup_config,
          credits: credits,
        };

        // Save changes
        fs.writeFileSync(pocketsPath, JSON.stringify(pocketsData, null, 2));

        // Create success embed
        const creditsEmbed = new EmbedBuilder()
          .setTitle("Backup Credits Updated")
          .setColor(0x00ff00)
          .addFields(
            { name: "Pocket ID", value: creditsPocketData.pocketId },
            { name: "New Credits", value: `${credits} credits` },
            { name: "Status", value: "Successfully updated backup credits" }
          );

        await interaction.editReply({
          embeds: [creditsEmbed],
          components: [],
        });
        return true;
    }

    // Save changes to pockets.json
    fs.writeFileSync(pocketsPath, JSON.stringify(pocketsData, null, 2));

    // Create success embed
    const embed = new EmbedBuilder()
      .setTitle("Configuration Updated")
      .setColor(0x00ff00)
      .addFields(
        { name: "Pocket ID", value: streamData.pocketId },
        { name: "Stream ID", value: streamData.streamId },
        { name: "Status", value: "Successfully updated configuration" }
      );

    await interaction.editReply({
      embeds: [embed],
      components: [],
    });
    return true;
  }

  return false;
}
