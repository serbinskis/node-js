const readlineSync = require('readline-sync');
const Discord = require('discord.js');
const fs = require('fs');

const client = new Discord.Client();
const token = readlineSync.question('Token: ');
const guildId = readlineSync.question('Guild ID: ');
var exclude = [];

do {
    var channelId = readlineSync.question('Exclude channel: ');
    exclude.push(channelId);
} while (channelId != '');


function messageToJSON(message) {
    var cache = [];
    let result = JSON.parse(JSON.stringify(message, function(key, value) {
        if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) { return; }
            cache.push(value);
        }
        return value;
    }));
    cache = null;

    const author = result.author;
    result.author = author.id; 
    delete result.mentions._client;
    delete result.mentions._content;
    delete result.channel;
    return { authorJSON: author, messageJSON: result };
}


async function saveMessages(guildDb, channel, startId) {
    let loop = true;
    let lastId = startId;
    let counter = 0;

    guildDb.channels[channel.id].messages = {};
    console.log(`Starting copying messages in ${channel.name}`);

    while (loop) {
        const options = { limit: 100 };
        if (lastId) { options.before = lastId; }

        var messages = await channel.fetchMessages({ limit: 100, after: lastId }).catch(() => {
            console.log(`No access to the channel ${channel.name}\n`);
            loop = false;
        })

        if (!loop) { return; }
        messages = new Map([...messages].reverse());

        try {
            lastId = Array.from(messages.values()).pop().id;
        } catch(e) {
            loop = false;
        }

        for (const message of messages) {
            const { authorJSON, messageJSON } = messageToJSON(message[1]);
            if (!guildDb.members[authorJSON.id]) { guildDb.members[authorJSON.id] = authorJSON; }
            guildDb.channels[channel.id].messages[message[1].id] = messageJSON;
            var messageDate = new Date(message[1].createdTimestamp).toLocaleString();
            process.stdout.write(`Stored ${counter+++1} messages in ${channel.name} [${messageDate}]${' '.repeat(10)}\r`);
        }
    }

    console.log(`Finished scanning messages in ${channel.name}\n`);
}


async function saveServer(guildId, exlucdeChannels) {
    let guildDb = { members: {}, channels: {} };
    let guild = client.guilds.get(guildId);
    if (!guild) { return guildDb; }

    let channels = guild.channels.filter(c => {
        return (c.type == "text") && !exlucdeChannels.includes(c.id)
    });

    for (const channel of channels) {
        guildDb.channels[channel[1].id] = {
            guild: { id: guild.id },
            id: channel[1].id,
            name: channel[1].name,
            type: channel[1].type,
        }

        await saveMessages(guildDb, channel[1], '0')
    }

    return guildDb;
}


client.on('ready', async () => {
    var database = await saveServer(guildId, exclude);
    fs.writeFileSync('server.json', JSON.stringify(database, null, 2));
    console.log(`Finished saving all messages!`);
    process.exit();
});

client.login(token);