const { Message, GuildManager } = require('discord.js');
const hasForbiddenPhrase = require('./hasForbiddenPhrase');

/**
 *
 * @param {Message} message
 * @param {GuildManager} guilds
 * @param {import("../main").Addons} addons
 * @param {string} imageFileLocation
 * @param {string} imageFileName
 * @returns {number|{content: string; imageFileLocation: {imageFileLocation: string; fileName:string; } }}
 */
async function handleUserMessage(
  message,
  guilds,
  addons,
  imageFileLocation,
  imageFileName
) {
  let replyToString = ``;

  message.channel.sendTyping();

  if (hasForbiddenPhrase(message.content)) {
    message.delete();
    return 204;
  }
  // console.log('MESSAGE ', message);

  let attachment = undefined;

  if (message.attachments.size > 0) {
    attachment = message.attachments.first();
  }

  // User is repling to an image
  if (!attachment && message.reference != null) {
    const referenceTo = await message.channel.messages.fetch(
      message.reference.messageId
    );

    // set image attachment
    attachment = referenceTo.attachments.first();
  }

  let embed = undefined;

  // User is replying to a message
  if (message.reference) {
    const referenceTo = await message.channel.messages.fetch(
      message.reference.messageId
    );

    attachment = referenceTo.attachments.first();

    if (referenceTo.content != '') {
      replyToString = `
\n*REPLY TO (Discord Message)*\n${referenceTo.content} \n`;
    } else if (referenceTo.content == '' && referenceTo.embeds.length > 0) {
      embed = referenceTo.embeds[0];
      if (embed.image) {
        attachment = embed.image;
        attachment.contentType = 'image/jpeg';
      }
      replyToString = `
\n*REPLY TO (Discord Embed)* 
title : ${embed.title}
description : ${embed.description}\n
`;
    }
  }

  console.log('attachmentx TO 2', attachment, replyToString, embed);

  let authorname = message.author.username;
  let guild = await guilds.cache.get(message.guildId);

  // message.interaction.user
  let member = await guild.members.fetch(message.author);
  authorname = member.nickname ?? member.nickname;

  if (attachment) {
    if (addons.imageRecognition == false) {
      message.reply({
        content: '',
        embeds: [
          {
            title: '⚠️ `Image Recognition` Addons Needed ⚠️',
            description:
              "Sorry, unfortunately you can't try this feature on this bot yet, you can try Image Recognition feature on our community server https://discord.gg/intiserver, then choose Asix AI channel.\n_Owner of this bot may need to buy `Image Recognition` Addons from Inti Server_",
            color: 0xffff00,
          },
        ],
      });

      if (embed == undefined) return 204;
    }
    const attachmentUrl = attachment.url;

    if (
      !['image/jpeg', 'image/png', 'image/jpg'].includes(attachment.contentType)
    ) {
      message.reply({
        content: '',
        embeds: [
          {
            title: `Invalid File Format`,
            color: 0xff0000,
          },
        ],
      });

      return 204;
    }

    const imageRes = await fetch(attachmentUrl);
    const imageBuffer = await imageRes.arrayBuffer();
    imageFileName = 'attachment_name';

    // console.log('IMAGE  ', imageFileName, imageBuffer);


    // console.log('ATTACHMENT ', imageFileLocation);
  }

  const discordUrlRegex =
    /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;
  const match = message.content.match(discordUrlRegex);
  let msgContent = message.content;

  if (match) {
    msgContent = msgContent.replaceAll(
      /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/gim,
      ''
    );
    const guildId = match[1];
    const channelId = match[2];
    const messageId = match[3];

    let guild = await guilds.fetch({
      guild: guildId,
    });
    // console.log('guild ', guild, guild.get(guildId), guildId);

    // console.log('guild ', guild);

    const channel = await guild.channels.fetch(channelId);
    // console.log('channel ', channel);

    const message = await channel.messages.fetch(messageId);
    replyToString += `
/** REPLY TO (Discord Message) **/ \n${message.content} \n/** END OF REPLY **/\n`;
  }

  msgContent.replace('!nofancylist', '');

  // console.log(imageFileLocation, msgContent);

  return {
    content: `
${authorname} <@${message.author.id}> <#${message.channelId}> : ${msgContent}
${replyToString}
`
  };
}

module.exports = handleUserMessage;