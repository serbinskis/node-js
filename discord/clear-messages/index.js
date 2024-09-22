const readlineSync = require('readline-sync');
const Discord = require('discord.js');
const client = new Discord.Client();

var token = readlineSync.question('Token: ');
var GuildID = readlineSync.question('Guild ID: ');
var DeleteOwn = (readlineSync.question('Delete only own messages (true/false): ') === "true");


//Clear messages in channel
async function ClearMessagesChannel(ChannelID) {
    const guild = client.guilds.get(GuildID); //Get server
    const channel = guild.channels.get(ChannelID); //Get channel
    var Counter = 0;
    let loop = true;
    let LastID;

    //Read all messages in channel and delete that we own
    while (loop) {
        const options = { limit: 100 };
        if (LastID) {
            options.before = LastID;
        }

        //Get last 100 messages, if error then no access
        const messages = await channel.fetchMessages(options).catch(() => {
            console.log(`No access to the channel ${channel.name}\n`);
            loop = false;
        })

        if (!loop) {
            return;
        }

        try {
            LastID = messages.last().id; //If error then last message
        } catch(error) {
            loop = false;
        }

        //Go trougth every message and delete them
        messages.forEach(message => {
            if (message.deletable && (!DeleteOwn || message.author.id == client.user.id)) {
                message.delete().then(msg => {
                    console.log(`Deleted message with id ${message.id} in ${message.channel.name} from user ${message.author.tag}`);
                })
            }
        })

        //Print count of scanned messages
        Counter = Counter + messages.array().length;
        process.stdout.write(`Scanned ${Counter} messages in ${channel.name}\r`);
    }
}


//When logged in with token
client.on('ready', async () => {
    process.title = `Logged in as ${client.user.tag}!`;
    const guild = client.guilds.get(GuildID);

    //If not found server then print error
    if (!guild) {
        console.log(`\nDidn't found the guild on account ${client.user.tag}`);
        process.exit(0);
    }

    console.log(`\nFound the guild "${guild.name}" on account ${client.user.tag}`);
    console.log('Starting message clear in this guild.\n');

    //Go trougth every channel to delete messages
    for (const channel of guild.channels) {
        if (channel[1].type == 'text') {
            await ClearMessagesChannel(channel[1].id);
        }
    }

    //Please wait and dont close app
    console.log('\n\nAll message deletion requests was sent.');
    console.log('Now please wait for all requests to process.');
    console.log('This is due to the discord rate limits.\n');
})

client.login(token);