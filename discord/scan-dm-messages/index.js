const readlineSync = require('readline-sync');
const Discord = require('discord.js');
const https = require('https');
const path = require('path');
const fs = require('fs');
const client = new Discord.Client();

var BaseDir = new String();
var token = readlineSync.question('Token: ');


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


//Scan DM messages
async function ScanDMMessages(channel) {
    var Counter = 0;
    let loop = true;
    let LastID;

    console.log(`Starting scanning messages in dm with ${channel.recipient.tag}`);
    var CurrentDir = BaseDir + '\\' + channel.recipient.tag.replace(/[/\\?%*:|"<>]/g, '-');
    CreateDir(CurrentDir);

    //Read all messages in channel and delete that we own
    while (loop) {
        const options = {limit: 100};
        if (LastID) {
            options.before = LastID;
        }

        //Get last 100 messages, if error then no access
        const messages = await channel.fetchMessages(options);

        try {
            LastID = messages.last().id; //If error then last message
        } catch(error) {
            loop = false;
        }

        //Go trougth every message and check for file
        for (const message of messages) {
            for (const embed of message[1].embeds) {
                if (embed.url && embed.url.includes('cdn.discordapp.com/attachments/')) {
        
                    FileName = `${CurrentDir}\\${path.basename(embed.url)}_ID_${message[1].id}${path.parse(embed.url).ext}`;
                    if (!fs.existsSync(FileName)) {
                        await Download(embed.url, FileName);
                        console.log(`Downloaded ${path.basename(embed.url)} with ID: ${message[1].id} from ${channel.recipient.tag}`);
                    } else {
                        console.log(`Already exists ${path.basename(embed.url)} with ID: ${message[1].id} from ${channel.recipient.tag}`);
                    }
                }
            }

            attachments = message[1].attachments.array();

            if (attachments.length > 0) {
                FileName = `${CurrentDir}\\${attachments[0].filename}_ID_${message[1].id}${path.parse(attachments[0].filename).ext}`;
                if (!fs.existsSync(FileName)) {
                    await Download(attachments[0].url, FileName);
                    console.log(`Downloaded ${attachments[0].filename} with ID: ${message[1].id} from ${channel.recipient.tag}`);
                } else {
                    console.log(`Already exists ${attachments[0].filename} with ID: ${message[1].id} from ${channel.recipient.tag}`);
                }
            }
        }

        //Print count of scanned messages
        Counter += messages.array().length;
        process.stdout.write(`Scanned ${Counter} messages in dm with ${channel.recipient.tag}\r`)
    }

    DeleteDir(CurrentDir);
    console.log(`Finished scanning messages in dm with ${channel.recipient.tag}\n`);
}


//When logged in with token
client.on('ready', async () => {
    //Set title
    process.title = `Logged in as ${client.user.tag}!`;

    //Set base dir and create it
    BaseDir = client.user.tag;
    CreateDir(BaseDir);

    console.log(`Starting scanning messages on the account -> ${client.user.tag}`);

    //Go trougth every dm and scan messages
    for (const channel of client.channels) {
        if (channel[1].type == 'dm') {
            await ScanDMMessages(channel[1]);
        }
    }

    //Go trougth every friend and scan messages
    for (const friend of client.user.friends) {
        channelDM = await friend[1].createDM();
        await ScanDMMessages(channelDM);
    }

    console.log(`Finished scanning messages on the account -> ${client.user.tag}`);
})

client.login(token);