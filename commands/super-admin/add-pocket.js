const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle,
} = require("discord.js");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const fs = require("fs");

const { localdb } = require("../../config.json");
const { updateJSON } = require("../../func/JSON");
const IDGenerator = require("../../func/idGenerator");

// Default credentials
const DB_Credentials = {
  username: "intipocket",
  password: "intipocket123",
};

// Helper functions
function createCredentialModal(
  slashCommand,
  pocketData,
  inputs,
  title = "Database Credential",
  customId = "credentialModal"
) {
  const modal = new ModalBuilder()
    .setCustomId(`super-admin.${slashCommand.toJSON().name}.${customId}`)
    .setTitle(title);

  const rows = inputs.map((input) =>
    new ActionRowBuilder().addComponents(input)
  );

  const pocketStreamData = new TextInputBuilder()
    .setCustomId(`${slashCommand.name}.pocket_data`)
    .setLabel("Pocket Data")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(JSON.stringify(pocketData))
    .setRequired(true);

  rows.push(new ActionRowBuilder().addComponents(pocketStreamData));
  modal.addComponents(rows);

  return modal;
}

// Default configurations
const DEFAULT_CONFIG = {
  VPS_USERNAME: "intipocket",
  VPS_PASSWORD: "intipocket123",
  DEFAULT_PORT: "22",
  DEFAULT_SOURCE_PATH: "/",
  DEFAULT_DB: "mysql",
};

// Utility functions
const getLocalDBPath = (...paths) =>
  path.join(process.env.APP_DIR, "../IntiPocket-LocalDB", ...paths);
const getServerPath = (...paths) =>
  path.join(process.env.APP_DIR, "../IntiPocket-Server", ...paths);

async function createPocketConfig(pocketData, credentials = {}) {
  const pocketId = IDGenerator.generateCustomId("POCKET", 12);
  const vpsPocketsData = require(path.join(
    process.env.APP_DIR,
    localdb.vps_pockets
  ));
  const vpsPocketData = vpsPocketsData[pocketData.vps_id];

  console.log("createPocketConfig");
  console.log(`pocketData ${JSON.stringify(pocketData)}`);
  console.log(`credentials ${JSON.stringify(credentials)}`);

  return {
    pocketId,
    vps_id: pocketData.vps_id,
    destination_path: `/backups/${pocketData.vps_id}`,
    owner_id: pocketData.owner_id,
    description: pocketData.description,
    type: pocketData.type,
    pocket_vps_id: {
      ...vpsPocketData,
      vps_port: credentials.vps_port || DEFAULT_CONFIG.DEFAULT_PORT,
    },
    stream: {
      pocketId,
      vps_username: credentials.vps_username,
      vps_pwd: credentials.vps_pwd,
      vps_ipaddress: credentials.vps_ipaddress,
      vps_port: credentials.vps_port || DEFAULT_CONFIG.DEFAULT_PORT,
      source_path:
        credentials.source_path || DEFAULT_CONFIG.DEFAULT_SOURCE_PATH,
      type: pocketData.type,
      "db-backups": {
        db: pocketData["db-backups"].db,
        username: credentials.db_username,
        pwd: credentials.db_pwd,
        databases: credentials.db_databases || [],
      },
      public_key: credentials.public_key,
    },
  };
}

async function setupPocket(pocketConfig, interaction) {
  const configPath = getLocalDBPath(
    "queues-config",
    `${pocketConfig.pocketId}.json`
  );
  await fs.writeFileSync(configPath, JSON.stringify(pocketConfig, null, 4));

  const setupScriptPath = getServerPath("ssh", "setup.go");

  await interaction.reply(`Executing Scripts..`);

  try {
    const { stdout, stderr } = await execPromise(
      `go run ${setupScriptPath} ${pocketConfig.pocketId}`,
      { cwd: path.join(process.env.APP_DIR, "../IntiPocket-Server") }
    );
    console.log(`Setup.go stdout: ${stdout}`);
    if (stderr) console.error(`Setup.go stderr: ${stderr}`);

    await interaction.editReply(
      `Successfully created pocket configuration and setup SSH connection for ${pocketConfig.pocketId}`
    );

    return true;
  } catch (error) {
    await handleSetupError(error, pocketConfig, interaction);
    return false;
  }
}

async function handleSetupError(error, pocketConfig, interaction) {
  console.error(`Error running setup.go: ${error}`);

  try {
    const logPath = getLocalDBPath("logs", `${pocketConfig.pocketId}.log`);
    const logContent = fs.existsSync(logPath)
      ? fs.readFileSync(logPath, "utf8")
      : "No log file found";

    // Delete the corresponding files
    const filesToDelete = [
      getLocalDBPath("queues-config", `${pocketConfig.pocketId}.json`),
      getLocalDBPath("comms", `${pocketConfig.pocketId}.json`),
      logPath,
    ];

    for (const file of filesToDelete) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }

    await interaction.editReply(
      `Failed to when running setup.go: ${error.message}\n\nLog details:\n\`\`\`\n${logContent}\n\`\`\``
    );
  } catch (logError) {
    console.error(`Error reading log file: ${logError}`);
    await interaction.editReply(
      `Failed to setup SSH connection: ${error.message}\n\nCould not read log file: ${logError.message}`
    );
  }
}

async function updatePocketData(pocketConfig, interaction) {
  const commData = require(path.join(
    process.env.APP_DIR,
    localdb.comms,
    `${pocketConfig.pocketId}.json`
  ));

  const pocketsPath = path.join(process.env.APP_DIR, localdb.pockets);
  const pocketsRaw = await fs.promises.readFile(pocketsPath, "utf8");
  const pocketsData = JSON.parse(pocketsRaw);

  const streamsPath = path.join(process.env.APP_DIR, localdb.streams);
  const streamsRaw = await fs.promises.readFile(streamsPath, "utf8");
  const streamsData = JSON.parse(streamsRaw);

  const vpsPocketsPath = path.join(process.env.APP_DIR, localdb.vps_pockets);
  const vpsPocketsRaw = await fs.promises.readFile(vpsPocketsPath, "utf8");
  const vpsPocketsData = JSON.parse(vpsPocketsRaw);

  console.log("vpsPocketsData", localdb.vps_pockets, vpsPocketsData);

  const newPocket = {
    pocketId: pocketConfig.pocketId,
    vps_id: pocketConfig.vps_id,
    destination_path: commData.data.destination_path,
    repo_path: commData.data.repo_path,
    owner_id: pocketConfig.owner_id,
    description: pocketConfig.description,
    type: pocketConfig.type,
    managers: [
      pocketConfig.owner_id,
      "940014157045067776",
      "843626954083270656",
    ],
  };

  const streamId = IDGenerator.generateCustomId("STREAM", 12);
  const newStream = {
    pocketId: pocketConfig.pocketId,
    vps_username: pocketConfig.stream.vps_username,
    vps_ipaddress: pocketConfig.stream.vps_ipaddress,
    vps_port: pocketConfig.stream.vps_port,
    source_path: pocketConfig.stream.source_path,
    type: pocketConfig.type,
    "db-backups": pocketConfig.stream["db-backups"],
    public_key: pocketConfig.stream.public_key,
  };

  await updateJSON(
    path.join(process.env.APP_DIR, localdb.pockets),
    Object.assign({}, pocketsData, {
      [pocketConfig.pocketId]: newPocket,
    })
  );
  await updateJSON(
    path.join(process.env.APP_DIR, localdb.streams),
    Object.assign({}, streamsData, {
      [streamId]: newStream,
    })
  );

  // Add pocketId to the pockets array of the correct VPS in vps_pockets.json
  const vpsId = pocketConfig.vps_id;
  const newVPS = Object.assign({}, vpsPocketsData[vpsId]);
  console.log(`newVPS ${JSON.stringify(newVPS)}`);
  if (!Array.isArray(newVPS.pockets)) {
    newVPS.pockets = [];
  }
  if (!newVPS.pockets.includes(pocketConfig.pocketId)) {
    newVPS.pockets.push(pocketConfig.pocketId);
    await updateJSON(
      path.join(process.env.APP_DIR, localdb.vps_pockets),
      Object.assign({}, vpsPocketsData, {
        [vpsId]: newVPS,
      })
    );
  }

  await interaction.editReply(`Successfully updated data`);
}

const DB_Architectures = [
  {
    label: "MySQL",
    value: "mysql",
  },
];
const slashCommand = new SlashCommandBuilder()
  .setName("new-pockets")
  .setDescription("Set secret bot key.")
  .addStringOption((option) => {
    return option
      .setName("backup-type")
      .setDescription("Select command")
      .addChoices([
        {
          name: "SQL / DB Backups",
          value: "db-backups",
        },
        {
          name: "File Backups",
          value: "file-backups",
        },
      ])
      .setRequired(true);
  })
  .addStringOption((option) => {
    return option
      .setName("vps")
      .setDescription("Select the vps you want the data to backup")
      .addChoices([])
      .setRequired(true);
  })
  .addUserOption((option) =>
    option
      .setName("owner")
      .setDescription("Select owner that own this pocket")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("description")
      .setDescription("Your description for this Pocket")
      .setRequired(false)
  );

module.exports = {
  data: slashCommand,
  instanceAdmin: true,
  channelLimit: false,

  /**
   *
   * @param {import('discord.js').Interaction} interaction
   * @param {*} clientId
   * @param {*} _
   */
  async execute(interaction, clientId, extInteractionId) {
    const options = interaction.options;
    const botsData = require(path.join(process.env.APP_DIR, localdb.bots));
    console.log(botsData);
    console.log(clientId);
    const botData = botsData[clientId];

    const filter = (i) => i.user.id === interaction.user.id;

    let globalReply;
    let globalRow;
    let collector;

    const PocketStreamData = new TextInputBuilder()
      .setCustomId(`${slashCommand.name}.pocket_data`)
      .setLabel("Pocket-Stream Data (DO NOT CHANGE IT)")
      .setStyle(ButtonStyle.Secondary);

    try {
      const VPS_Stream_Credential_Username_Input = new TextInputBuilder()
        .setCustomId(`${slashCommand.name}.vps_stream_credential_username`)
        .setLabel("VPS Username (Should not a root user)")
        .setStyle(ButtonStyle.Secondary);
      const VPS_Stream_Credential_Password_Input = new TextInputBuilder()
        .setCustomId(`${slashCommand.name}.vps_stream_credential_password`)
        .setLabel("VPS Password (Encrypted)")
        .setStyle(ButtonStyle.Secondary);

      const VPS_Stream_Credential_IpAddress_Input = new TextInputBuilder()
        .setCustomId(`${slashCommand.name}.vps_stream_credential_ipaddress`)
        .setLabel("VPS IP Address")
        .setStyle(ButtonStyle.Secondary);

      const VPS_Stream_PublicKey_Input = new TextInputBuilder()
        .setCustomId(`${slashCommand.name}.vps_stream_credential_publickey`)
        .setLabel("VPS Public Key")
        .setStyle(ButtonStyle.Secondary);

      const VPS_Stream_SourcePath_Input = new TextInputBuilder()
        .setCustomId(`${slashCommand.name}.vps_stream_credential_sourcepath`)
        .setLabel("VPS Source Path")
        .setStyle(ButtonStyle.Secondary);

      // console.log(`extInteractionId ${extInteractionId}`)
      if (interaction.customId !== undefined) {
        switch (extInteractionId) {
          case `super-admin.${slashCommand.toJSON().name}.credentialModal`:
            let db_stream_username;
            let db_stream_pwd;
            let db_stream_databases = undefined;

            let vps_stream_username;
            let vps_stream_pwd;
            let vps_stream_ipaddress;

            let vps_publickey;
            let vps_sourcepath;

            let pocket_stream;
            try {
              pocket_stream = JSON.parse(
                interaction.fields.getTextInputValue(
                  `${slashCommand.name}.pocket_data`
                )
              );
            } catch (error) {
              await interaction.reply(
                "Failed to parse the JSON data. Please try again."
              );
              return;
            }

            try {
              db_stream_username = interaction.fields.getTextInputValue(
                `${slashCommand.name}.db_credential_username`
              );
              db_stream_pwd = interaction.fields.getTextInputValue(
                `${slashCommand.name}.db_credential_password`
              );
            } catch (error) {}

            try {
              db_stream_databases = interaction.fields.getTextInputValue(
                `${slashCommand.name}.db_credential_databases`
              );

              db_stream_databases = db_stream_databases
                .split(",")
                .map((db) => db.trim());
            } catch (error) {}

            try {
              vps_stream_username = interaction.fields.getTextInputValue(
                `${slashCommand.name}.vps_stream_credential_username`
              );

              vps_stream_pwd = interaction.fields.getTextInputValue(
                `${slashCommand.name}.vps_stream_credential_password`
              );
            } catch (error) {}

            try {
              vps_stream_ipaddress = interaction.fields.getTextInputValue(
                `${slashCommand.name}.vps_stream_credential_ipaddress`
              );
            } catch (error) {}

            try {
              vps_publickey = interaction.fields.getTextInputValue(
                `${slashCommand.name}.vps_stream_credential_publickey`
              );
              vps_sourcepath = interaction.fields.getTextInputValue(
                `${slashCommand.name}.vps_stream_credential_sourcepath`
              );
            } catch (error) {}

            let credentials = {
              vps_username:
                vps_stream_username || pocket_stream.stream.vps_username,
              vps_pwd: vps_stream_pwd || pocket_stream.stream.vps_pwd,
              vps_ipaddress:
                vps_stream_ipaddress || pocket_stream.stream.vps_ipaddress,
            };

            console.log(`POCKET STREAM TYPE ${pocket_stream.type}`);
            console.log(
              `vps_publickey ${vps_publickey} ; vps_sourcepath ${vps_sourcepath}`
            );

            // Instead of showing the modal directly, send a button
            const continueButton = new ButtonBuilder()
              .setCustomId("show-vps-modal")
              .setLabel("Continue")
              .setStyle(ButtonStyle.Primary);
            const cancelButton = new ButtonBuilder()
              .setCustomId("cancel-vps-modal")
              .setLabel("Cancel")
              .setStyle(ButtonStyle.Danger);

            if (pocket_stream.type == "db-backups") {
              credentials = Object.assign({}, credentials, {
                db_username:
                  db_stream_username || pocket_stream["db-backups"].username,
                db_pwd: db_stream_pwd || pocket_stream["db-backups"].pwd,
                db_databases:
                  db_stream_databases || pocket_stream["db-backups"].databases,
              });

              try {
                // console.log(`credentials ${JSON.stringify(credentials)}`);
                if (credentials.vps_username == undefined) {
                  const pocket_data = Object.assign({}, pocket_stream, {
                    stream: {
                      ...pocket_stream.stream,
                      vps_username: credentials.vps_username,
                      vps_pwd: credentials.vps_pwd,
                      vps_ipaddress: credentials.vps_ipaddress,
                    },
                    "db-backups": {
                      ...pocket_stream["db-backups"],
                      username: credentials.db_username,
                      pwd: credentials.db_pwd,
                      databases: credentials.db_databases,
                    },
                  });

                  // console.log(`credentials ${JSON.stringify(credentials)}`);
                  // console.log(`pocket_data ${JSON.stringify(pocket_data)}`);

                  const row = new ActionRowBuilder().addComponents(
                    continueButton,
                    cancelButton
                  );

                  let collector =
                    interaction.channel.createMessageComponentCollector({
                      filter,
                      time: 15000,
                    });

                  globalReply = await interaction.reply({
                    content: 'Click "Continue" to enter VPS credentials.',
                    components: [row],
                    fetchReply: true,
                  });

                  collector.on("collect", async (interactionCollect) => {
                    // console.log(interactionCollect.customId);
                    switch (interactionCollect.customId) {
                      case "show-vps-modal":
                        // Create and show modal with VPS credentials inputs
                        const modal = createCredentialModal(
                          slashCommand,
                          pocket_data,
                          [
                            VPS_Stream_Credential_Username_Input,
                            VPS_Stream_Credential_Password_Input,
                            VPS_Stream_Credential_IpAddress_Input,
                          ],
                          "Client VPS Credentials"
                        );

                        if (globalReply?.deletable) {
                          await globalReply.delete().catch(console.error);
                        }

                        await interactionCollect.showModal(modal);
                        break;
                      case "cancel-vps-modal":
                        if (globalReply?.deletable) {
                          await globalReply.delete().catch(console.error);
                        }

                        await interactionCollect.update({
                          content: "Operation cancelled.",
                          components: [],
                          fetchReply: true,
                        });
                        return;
                        break;
                    }
                  });
                } else {
                  const pocketConfig = await createPocketConfig(
                    pocket_stream,
                    credentials
                  );

                  if (await setupPocket(pocketConfig, interaction)) {
                    await updatePocketData(pocketConfig, interaction);
                  }
                }
              } catch (error) {
                console.error("Error in pocket creation:", error);
                await interaction.reply({
                  content: `Failed to create pocket`,
                  ephemeral: true,
                });
              }
            } else if (pocket_stream.type == "file-backups") {
              credentials = Object.assign({}, credentials, {
                public_key: vps_publickey || pocket_stream.stream.public_key,
                source_path: vps_sourcepath || pocket_stream.stream.source_path,
              });

              try {
                if (credentials.public_key == undefined) {
                  const pocket_data = Object.assign({}, pocket_stream, {
                    stream: {
                      ...pocket_stream.stream,
                      vps_username: credentials.vps_username,
                      vps_pwd: credentials.vps_pwd,
                      vps_ipaddress: credentials.vps_ipaddress,
                    },
                  });

                  const row = new ActionRowBuilder().addComponents(
                    continueButton,
                    cancelButton
                  );

                  let collector =
                    interaction.channel.createMessageComponentCollector({
                      filter,
                      time: 15000,
                    });

                  globalReply = await interaction.reply({
                    content: 'Click "Continue" to enter VPS credentials.',
                    components: [row],
                    fetchReply: true,
                  });

                  collector.on("collect", async (interactionCollect) => {
                    // console.log(interactionCollect.customId);
                    switch (interactionCollect.customId) {
                      case "show-vps-modal":
                        // Create and show modal with VPS credentials inputs
                        const modal = createCredentialModal(
                          slashCommand,
                          pocket_data,
                          [
                            VPS_Stream_PublicKey_Input,
                            VPS_Stream_SourcePath_Input,
                          ],
                          "Client VPS Credentials"
                        );

                        if (globalReply?.deletable) {
                          await globalReply.delete().catch(console.error);
                        }

                        await interactionCollect.showModal(modal);
                        break;
                      case "cancel-vps-modal":
                        if (globalReply?.deletable) {
                          await globalReply.delete().catch(console.error);
                        }

                        await interactionCollect.update({
                          content: "Operation cancelled.",
                          components: [],
                          fetchReply: true,
                        });
                        return;
                        break;
                    }
                  });
                } else {
                  const pocketConfig = await createPocketConfig(
                    pocket_stream,
                    credentials
                  );

                  if (await setupPocket(pocketConfig, interaction)) {
                    await updatePocketData(pocketConfig, interaction);
                  }
                }
              } catch (error) {}
            }

            // console.log(`username ${stream_username}`);
            break;

          default:
            break;
        }

        return;
      }

      const backupType = options.getString("backup-type");
      const vps_id = options.getString("vps");
      const owner = options.getUser("owner");
      const owner_id = owner.id;
      const description = options.getString("description");

      const DB_Credential_Username_Input = new TextInputBuilder()
        .setCustomId(`${slashCommand.name}.db_credential_username`)
        .setLabel("DB Username (should not a root user)")
        .setStyle(ButtonStyle.Secondary);
      const DB_Credential_Password_Input = new TextInputBuilder()
        .setCustomId(`${slashCommand.name}.db_credential_password`)
        .setLabel("DB Password (Encrypted)")
        .setStyle(ButtonStyle.Secondary);
      const DB_Credential_Databases_Input = new TextInputBuilder()
        .setCustomId(`${slashCommand.name}.db_credential_databases`)
        .setLabel("DB Databases (comma separated)")
        .setStyle(ButtonStyle.Secondary);

      const useCustom = new ButtonBuilder()
        .setCustomId(`${slashCommand.name}.custom`)
        .setLabel("Use Custom")
        .setStyle(ButtonStyle.Secondary);
      const useDefault = new ButtonBuilder()
        .setCustomId(`${slashCommand.name}.default`)
        .setLabel(`Use Default`)
        .setStyle(ButtonStyle.Primary);
      const cancelButton = new ButtonBuilder()
        .setCustomId(`${slashCommand.name}.cancel`)
        .setLabel(`Cancel`)
        .setStyle(ButtonStyle.Danger);

      const DB_Architecture_Inputs = new StringSelectMenuBuilder()
        .setCustomId(`selectedDBArc`)
        .setPlaceholder("Select DB")
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(DB_Architectures);

      let globalContent = "";

      if (backupType == "db-backups") {
        globalRow = new ActionRowBuilder().addComponents(
          DB_Architecture_Inputs
        );

        globalContent = "Please Select One of The Database Architecture";
      } else {
        globalRow = new ActionRowBuilder().addComponents(
          useCustom,
          useDefault,
          cancelButton
        );

        globalContent =
          '**Select The Client VPS Credentials You Want To Configure.**\nBy using default, the selected database shall have a user called "intipocket" with "intipocket123" as the password';
      }

      collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 15000,
      });
      globalReply = await interaction.reply({
        content: globalContent,
        components: [globalRow],
        fetchReply: true,
      });

      let DB_Credentials = {
        username: "intipocket",
        password: "intipocket123",
      };

      let pocketData = {
        vps_id: "",
        owner_id: "",
        description: "",
        type: "",
        "db-backups": {
          db: "",
          username: undefined,
          password: undefined,
          databases: [],
        },
        stream: {
          pocketId: "",
          vps_username: undefined,
          vps_pwd: undefined,
          vps_ipaddress: undefined,
          type: "",
          public_key: undefined,
          source_path: undefined,
        },
      };

      collector.on("collect", async (interactionCollect) => {
        console.log(interactionCollect.customId);
        pocketData.type = backupType;
        pocketData.vps_id = vps_id;
        pocketData.description = description;
        pocketData.owner_id = owner_id;

        switch (interactionCollect.customId) {
          case DB_Architecture_Inputs.toJSON().custom_id:
            const selectedDB = interactionCollect.values[0];
            console.log(selectedDB);

            pocketData["db-backups"].db = selectedDB;
            console.log(pocketData);

            await interactionCollect.deferUpdate();

            globalRow = new ActionRowBuilder().addComponents(
              useCustom,
              useDefault,
              cancelButton
            );

            interactionCollect.editReply({
              content:
                '**Select The Database Credentials You Want To Configure.**\nBy using default, the selected database shall have a user called "intipocket" with "intipocket123" as the password\nIf you choose custom, the VPS username should be in the format "username@ip"',
              components: [globalRow],
              fetchReply: true,
            });
            break;
          case useCustom.toJSON().custom_id:
            if (backupType == "db-backups") {
              let modal = new ModalBuilder()
                .setCustomId(
                  `super-admin.${slashCommand.toJSON().name}.credentialModal`
                )
                .setTitle("Database Credential");

              const DB_Credential_Username =
                new ActionRowBuilder().addComponents(
                  DB_Credential_Username_Input
                );
              const DB_Credential_Pwd = new ActionRowBuilder().addComponents(
                DB_Credential_Password_Input
              );

              const DB_Credential_Databases =
                new ActionRowBuilder().addComponents(
                  DB_Credential_Databases_Input
                );

              PocketStreamData.setValue(JSON.stringify(pocketData));
              const PocketStream = new ActionRowBuilder().addComponents(
                PocketStreamData
              );

              modal.addComponents(
                DB_Credential_Username,
                DB_Credential_Pwd,
                DB_Credential_Databases,
                PocketStream
              );

              globalReply.delete();

              await interactionCollect.showModal(modal);
            } else {
              // Create and show modal with VPS credentials inputs
              const modal = createCredentialModal(
                slashCommand,
                pocketData,
                [
                  VPS_Stream_Credential_Username_Input,
                  VPS_Stream_Credential_Password_Input,
                  VPS_Stream_Credential_IpAddress_Input,
                ],
                "Client VPS Credentials"
              );

              if (globalReply?.deletable) {
                await globalReply.delete().catch(console.error);
              }

              await interactionCollect.showModal(modal);
            }
            break;

          case useDefault.toJSON().custom_id:
            try {
              let modal;

              if (backupType == "db-backups") {
                // Set default credentials
                pocketData["db-backups"].username = DB_Credentials.username;
                pocketData["db-backups"].password = DB_Credentials.password;

                // Create and show modal with VPS credentials inputs
                modal = createCredentialModal(slashCommand, pocketData, [
                  DB_Credential_Databases_Input,
                ]);
              } else if (backupType == "file-backups") {
                // Set default credentials
                pocketData.stream.vps_username = DB_Credentials.username;
                pocketData.stream.vps_pwd = DB_Credentials.password;

                modal = createCredentialModal(
                  slashCommand,
                  pocketData,
                  [
                    VPS_Stream_Credential_IpAddress_Input,
                    VPS_Stream_PublicKey_Input,
                    VPS_Stream_SourcePath_Input,
                  ],
                  "Client VPS Credentials"
                );
              }

              if (globalReply?.deletable) {
                await globalReply.delete().catch(console.error);
              }

              await interactionCollect.showModal(modal);
            } catch (error) {
              console.error("Error showing credential modal:", error);
              await interactionCollect.reply({
                content: `Failed to show credential form: ${error.message}`,
                ephemeral: true,
              });
            }
            break;
          case cancelButton.toJSON().custom_id:
            if (globalReply?.deletable) {
              await globalReply.delete().catch(console.error);
            }
            await interactionCollect.reply({
              content: "Operation Cancelled.",
              components: [],
              fetchReply: true,
            });
            return;
            break;
        }
      });
    } catch (error) {
      console.error("Error:", error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: `An error occurred: ${error.message}`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `An error occurred: ${error.message}`,
          ephemeral: true,
        });
      }
    }
  },
};
