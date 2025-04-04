const { SlashCommandBuilder } = require('discord.js');
const path = require('path');

const { localdb } = require('../../config.json');
const { updateJSON } = require('../../func/JSON');

const refreshBot = new SlashCommandBuilder()
    .setName('set-key')
    .setDescription('Set secret bot key.')
    .addStringOption((option) =>
        option.setName('key1').setDescription('set your token')
    )
    .addStringOption((option) =>
        option.setName('key2').setDescription('set your token')
    );

module.exports = {
    data: refreshBot,
    instanceAdmin: true,
    channelLimit: false,

    /**
     *
     * @param {import('discord.js').Interaction} interaction
     * @param {*} clientId
     * @param {*} _
     */
    async execute(interaction, clientId, _) {
        const options = interaction.options;
        const botsData = require(path.join(process.env.APP_DIR, localdb.bots));
        console.log(botsData);
        console.log(clientId);
        const botData = botsData[clientId];

        try {
            const PSID = options.getString('key1');
            const PSIDTS = options.getString('key2');

            if (PSID) {
                botData.bard_token.PSID = PSID;
            }

            if (PSIDTS) {
                botData.bard_token.PSIDTS = PSIDTS;
            }

            updateJSON(
                path.join(process.env.APP_DIR, localdb.bots),
                Object.assign({}, botsData, {
                    [clientId]: botData,
                })
            );

            interaction.reply('Edited!');
            return;
        } catch (error) {
            console.log('ERROR ', error);
        }
        return;
    },
};