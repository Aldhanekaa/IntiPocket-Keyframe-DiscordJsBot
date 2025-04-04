const {
    SlashCommandBuilder,
    CommandInteractionOptionResolver,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const { localdb } = require('../../config.json');
const { ObjKeyArrayValueUpdate, updateJSON } = require('../../func/JSON');

const training = new SlashCommandBuilder()
    .setName('set-admin-command-permission')
    .setDescription('Set Training Permission')
    .addStringOption((option) => {
        return option.setName('command').setDescription('Select command');
    })
    .addUserOption((option) =>
        option
            .setName('user')
            .setDescription('Select user that will have access to train the bot')
    )
    .addRoleOption((option) =>
        option
            .setName('role')
            .setDescription('Select role that will have access to train this bot')
    )
    .addChannelOption((option) =>
        option
            .setName('channel')
            .setDescription('Select channel for training the bot')
    );
module.exports = {
    data: training,
    instanceAdmin: true,
    channelLimit: false,

    /**
     *
     * @param {import('discord.js').Interaction} interaction
     * @param {string} clientId
     */
    async execute(interaction, clientId) {
        /**
         * @type {CommandInteractionOptionResolver}
         */
        const options = interaction.options;

        const cmds_permissions_location = path.join(
            process.env.APP_DIR,
            localdb.cmds_permissions
        );
        const cmds = require(cmds_permissions_location);
        // console.log(cmds);

        const selectedCommand = options.getString('command');
        // console.log(selectedCommand);
        const commandJS = require(`../${selectedCommand}.js`);

        const selectedChannel = options.getChannel('channel');
        const selectedRole = options.getRole('role');
        const selectedUser = options.getUser('user');

        if (commandJS) {
            let cmd = cmds[clientId][selectedCommand];
            // console.log(commandJS, cmd);
            if ('channelLimit' in commandJS && commandJS.channelLimit == true) {
                if (selectedChannel) {
                    cmd = ObjKeyArrayValueUpdate(cmd, 'channIds', selectedChannel.id);
                }
            }

            if (selectedRole) {
                cmd = ObjKeyArrayValueUpdate(cmd, 'roleIds', selectedRole.id);
            }

            if (selectedUser) {
                // console.log('selected user', selectedUser.id, cmd);

                cmd = ObjKeyArrayValueUpdate(cmd, 'userIds', selectedUser.id);
            }

            // console.log(cmd);
            updateJSON(
                cmds_permissions_location,
                Object.assign({}, cmds, {
                    [clientId]: {
                        ...cmds[clientId],
                        [selectedCommand]: cmd,
                    },
                })
            );

            return interaction.reply('Updated permissions!');
        }

        // console.log(options.getRole('role'));
        return interaction.reply('Please Select User/Role/Channel');
    },
};