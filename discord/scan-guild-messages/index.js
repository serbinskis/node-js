const readlineSync = require('readline-sync');
const Discord = require('discord.js');
const https = require('https');
const path = require('path');
const fs = require('fs');
const client = new Discord.Client();

var BaseDir = new String();
var token = readlineSync.question('Token: ');
var GuildID = readlineSync.question('Guild ID: ');
var AmountOfDays = Number(readlineSync.question('Days (0 Unlimited): '));

//Download file
const Download = (url, saveName) => {
    return new Promise((resolve) => {
        https.get(url, response => {
            if (response.statusCode === 200) {
                const stream = fs.createWriteStream(saveName, {flags: 'w'});
                response.pipe(stream);
                resolve(true);
            } else {
                 resolve(false);
            }
        })
    })
}


//Create directory
function CreateDir(Path) {
    if (!fs.existsSync(Path)){
        fs.mkdirSync(Path, {recursive: true});
    }
}


//Delete directory
function DeleteDir(Path) {
    try {
        fs.rmdirSync(Path);
    } catch(e) {}
}


//Scan guild messages
async function ScanChannelMessages(channel) {
    var Counter = 0;
    let loop = true;
    let LastID;

    console.log(`Starting scanning messages in ${channel.name}`);
    var CurrentDir = BaseDir + '\\' + channel.name.replace(/[/\\?%*:|"<>]/g, '-');
    CreateDir(CurrentDir);

    //Read all messages in channel and delete that we own
    while (loop) {
        const options = {limit: 100};
        if (LastID) {
            options.before = LastID;
        }

        //Get last 100 messages, if error then no access
        const messages = await channel.fetchMessages(options).catch(() => {
            console.log(`No access to the channel ${channel.name}\n`);
            DeleteDir(CurrentDir);
            loop = false;
        });

        if (!loop) {
            return;
        }

        try {
            LastID = messages.last().id; //If error then last message
        } catch(error) {
            loop = false;
        }

        //Go trougth every message and check for file
        for (const message of messages) {
            if (!message[1].author.bot) {
                for (const embed of message[1].embeds) {
                    if (embed.url && embed.url.includes('cdn.discordapp.com/attachments/')) {
            
                        FileName = `${CurrentDir}\\${path.basename(embed.url)}_${message[1].author.username.replace(/[/\\?%*:|"<>]/g, '-')}_ID_${message[1].id}${path.parse(embed.url).ext}`;
                        if (!fs.existsSync(FileName)) {
                            await Download(embed.url, FileName);
                            console.log(`Downloaded ${path.basename(embed.url)} with ID: ${message[1].id} from ${channel.name}`);
                        } else {
                            console.log(`Already exists ${path.basename(embed.url)} with ID: ${message[1].id} from ${channel.name}`);
                        }
                    }
                }

                attachments = message[1].attachments.array();

                if (attachments.length > 0) {
                    FileName = `${CurrentDir}\\${attachments[0].filename}_${message[1].author.username.replace(/[/\\?%*:|"<>]/g, '-')}_ID_${message[1].id}${path.parse(attachments[0].filename).ext}`;
                    if (!fs.existsSync(FileName)) {
                        await Download(attachments[0].url, FileName);
                        console.log(`Downloaded ${attachments[0].filename} with ID: ${message[1].id} from ${channel.name}`);
                    } else {
                        console.log(`Already exists ${attachments[0].filename} with ID: ${message[1].id} from ${channel.name}`);
                    }
                }
            }
        }

        //Print count of scanned messages
        Counter = Counter + messages.array().length;
        process.stdout.write(`Scanned ${Counter} messages in ${channel.name}\r`);

        if (AmountOfDays > 0) {
            var CurrentTimestamp = new Date().valueOf();
            var DaysTimestap = (CurrentTimestamp - messages.last().createdTimestamp) / (1000 * 60 * 60 * 24);
            if (DaysTimestap >= AmountOfDays) { break; }
        }
    }

    DeleteDir(CurrentDir);
    console.log(`Finished scanning messages in ${channel.name}\n`);
}


//When logged in with token
client.on('ready', async () => {
    //Set title
    process.title = `Logged in as ${client.user.tag}!`;

    //Check for guild
    const guild = client.guilds.get(GuildID);

    if (!guild) {
        console.log('Couldn\'t find the guild.');
        process.exit(0);
    }

    //Set base dir and create it
    BaseDir = guild.name.replace(/[/\\?%*:|"<>]/g, '-');
    CreateDir(BaseDir);

    console.log(`Starting scanning messages in the guild -> ${guild.name}\n`);

    for (const channel of guild.channels) {
        if (channel[1].type == 'text') {
            await ScanChannelMessages(channel[1]);
        }
    }

    console.log(`Finished scanning messages in the guild -> ${guild.name}`);
})

client.login(token);