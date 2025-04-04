/**
 *
 * @param {Client} client
 * @param {string} title
 * @param {string} message
 * @param {"default"|"error"|"success"|"action"} status
 * @param {string} staffGuildId
 * @returns
 */
const sendWebhookEmbed = async (
    client,
    title,
    message,
    status = 'default',
    staffGuildId = ''
  ) => {
    const { EmbedBuilder, Client } = require('discord.js');
    const { webhook, guildId } = require('../../config.json');
    if (client.guilds == undefined) {
      return;
    }
    const guild = await client.guilds.cache.get(`${guildId}`);
    const webhookChannel = await guild.channels.fetch(webhook.channel_id);
  
    // New EmbedBuilder
    const embedWebhook = new EmbedBuilder().setTitle(title);
  
    switch (status) {
      case 'default':
        embedWebhook.setColor(0x3db9ff).setDescription(message);
  
        break;
      case 'error':
        embedWebhook
          .setColor(0xff0000)
          .setDescription('```' + message + '```' + `\n**${guild.name}**`);
        client.users.send('940014157045067776', {
          embeds: [embedWebhook],
        });
  
      default:
        break;
    }
  
    // Send message to webhook channel.
    return webhookChannel.send({
      embeds: [embedWebhook],
    });
    return;
  };
  
  module.exports = {
    sendWebhookEmbed,
  };