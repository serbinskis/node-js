const readlineSync = require('readline-sync');
const Discord = require('discord.js');
const client = new Discord.Client();

const prefix = '>';
const token = readlineSync.question('Token: ');


//Replace user mention with text
function replaceUserMentions(message, content) {
    for (var key of message.mentions.users) {
        content = content.replace(new RegExp(`<@!${key[0]}>`, 'g'), `**${"`@"}${key[1].tag}${"`"}**`);
        content = content.replace(new RegExp(`<@${key[0]}>`, 'g'), `**${"`@"}${key[1].tag}${"`"}**`);
    }

    return content;
}


//Replace role mention with text
function replaceRoleMentions(message, content) {
    for (var key of message.mentions.roles) {
        content = content.replace(new RegExp(`<@&${key[0]}>`, 'g'), `**${"`@"}${key[1].name}${"`"}**`);
    }

    return content;
}


//Replace channel mention with text
function replaceChannelMentions(message, content) {
    for (var key of message.mentions.channels) {
        content = content.replace(new RegExp(`<#${key[0]}>`, 'g'), `**${"`#"}${key[1].name}${"`"}**`);
    }

    return content;
}


//Copy message to webhook
async function copyMessage(message, webhookClient) {
    if (message.type != 'DEFAULT') { return; }
    var attachments = message.attachments.array();
    var files = [];

    for (var i = 0; i < attachments.length; i++) {
        const attachment = new Discord.Attachment(attachments[i].url);
        files.push(attachment);
    }

    var messageContent = message.content;
    messageContent = replaceUserMentions(message, messageContent)
    messageContent = replaceRoleMentions(message, messageContent)
    messageContent = replaceChannelMentions(message, messageContent)
    messageContent = messageContent.replace(/@everyone/g, '**`@everyone`**');
    messageContent = messageContent.replace(/@here/g, '**`@here`**');

    var options = {};
    var messageTitle = message.webhookID ? message.author.name : message.author.tag;
    options.username = messageTitle ? messageTitle.substring(0, 79) : 'unknown';
    options.avatarURL = message.author.displayAvatarURL;

    if (message.author.bot && (message.embeds.length > 0)) {
        options.embeds = message.embeds;
    }

    if (files.length > 0) {
        options.files = files;
    }

    await webhookClient.send(messageContent, options).catch(() => console.log(`Send error -> message ID: ${message.id}, channel: ${message.channel.name}`));
}


//Copy channel to webhook
async function copyChannel(channel, webhookClient) {
    var counter = 0;
    var loop = true;
    var lastId = '0';

    console.log(`Starting copying messages in ${channel.name}`);

    //Read all messages in channel
    while (loop) {
        //Get last 100 messages, if error then no access
        var messages = await channel.fetchMessages({ limit: 100, after: lastId }).catch(() => {
            console.log(`No access to the channel ${channel.name}\n`);
            loop = false;
        });

        if (!loop) { return; }
        messages = new Map([...messages].reverse());

        try {
            lastId = Array.from(messages.values()).pop().id; //If error then last message
        } catch(e) {
            loop = false;
        }

        //Go trougth every message and copy it
        for (const message of messages) {
            await copyMessage(message[1], webhookClient);
            var messageDate = new Date(message[1].createdTimestamp).toLocaleString();
            process.stdout.write(`Copied ${counter+++1} messages in ${channel.name} [${messageDate}]${' '.repeat(10)}\r`);
        }
    }

    console.log(`Finished scanning messages in ${channel.name}\n`);
}


client.on('ready', async () => {
    console.log('\n'.repeat(100));
    process.title = `Logged in as ${client.user.tag}!`;
});


client.on('message', async message => {
    if (message.author.id != client.user.id) { return; }

    if (message.content.startsWith(prefix)) {
        const args = message.content.slice(prefix.length).split(/ +/);

        if (args[0] == 'copy') {
            var splitted = args[1].split('/');
            var webhookClient = new Discord.WebhookClient(splitted[5], splitted[6]);
            await message.delete();
            return copyChannel(message.channel, webhookClient);
        }
    }
})


//Login with token
client.login(token);