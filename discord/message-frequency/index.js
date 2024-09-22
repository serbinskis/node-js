const readlineSync = require('readline-sync');
const Discord = require('discord.js');
const client = new Discord.Client();

var token = readlineSync.question('Token: ');
var ServerID = readlineSync.question('Server ID: ');
var ChannelID = readlineSync.question('Channel ID: ');
var AmountOfDays = Number(readlineSync.question('Amount of last days: '));

client.on('ready', async () => {
    for (var i = 0; i != 100; i++) { console.log('') }
    console.log(`Logged in as ${client.user.tag}!`)

    const guild = client.guilds.get(ServerID);
    const channel = guild.channels.get(ChannelID);
    const CurrentTimestamp = new Date().valueOf();

    var MessageSum = 0;
    var MessageFrequency = new Map();
    let ExitLoop = false;
    let last_id;

    //Count message frequency
    while (true) {
        const options = { limit: 100 };
        if (last_id) {
            options.before = last_id;
        }

        const messages = await channel.fetchMessages(options);
        last_id = messages.last().id;

        messages.forEach(message => {
            if (!message.author.bot) {
                DaysTimestap = (CurrentTimestamp - message.createdTimestamp) / (1000 * 60 * 60 * 24)
                if (DaysTimestap <= AmountOfDays) {
                    if (!MessageFrequency.has(message.author.id)) {
                        MessageFrequency.set(message.author.id, 1);
                        MessageSum = MessageSum + 1;
                    } else {
                        MessageFrequency.set(message.author.id, MessageFrequency.get(message.author.id) + 1);
                        MessageSum = MessageSum + 1;
                    }
                } else {
                    ExitLoop = true;
                }
            }
        })

        if (ExitLoop) { break; }
    }

    //Sort map
    MessageFrequency[Symbol.iterator] = function* () {
        yield* [...this.entries()].sort((a, b) => a[1] - b[1]);
    }

    //Dsiplay result
    for (let [key, value] of MessageFrequency) {
        const user = client.users.get(key);
        console.log(Math.round(value/MessageSum*100) + '% | ' + value + ' -> ' + user.tag);
    }

    //Dsiplay info
    console.log(`\n${guild.name} -> Member Count: ${guild.memberCount}`);
    console.log(`${guild.name} -> Total Messages: ${MessageSum}`);
    console.log(`Member message frequency in last ${AmountOfDays} days.`);
})

client.login(token)
