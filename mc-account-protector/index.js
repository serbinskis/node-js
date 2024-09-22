const fs = require('fs');
const child_process = require('child_process');
const wutils = require('wobbychip-utils');
const Remote = require('wobbychip-utils/remote');
const mineflayer = require('mineflayer');
const gamedig = require('gamedig');
const { v4: uuidv4 } = require('uuid');

process.on('uncaughtException', (e) => {
    console.log(e);
    if (config.remote) { config.remote.sendOutput(e.stack, false); }
});

var config = {
    host: '127.0.0.1',
    ipAddress: '127.0.0.1',
    ipPort: 0,
    track: 'WobbyChip',

    output: true,
    pause: false,
    verbose: false,
}

var remote = {
    title: 'Minecraft Account Protector' + (process.env.DEBUG ? ' (DEBUG)' : ''),
    input: false,
    buttons: [
        {
            id: 'clear-console-button',
            command: 'clear_console',
            title: 'Clear Console',
            enabled: true,
            color: '',
            arguments: {},
            prompts: {},
        },
        {
            id: 'pause',
            command: 'pause',
            title: 'Pause',
            enabled: true,
            color: '',
            arguments: {},
            prompts: {},
        },
        {
            id: 'set-username-button',
            command: 'set_username',
            title: 'Set username',
            enabled: true,
            color: '',
            arguments: { username: '' },
            prompts: {
                username: { promt_text: 'Enter username:', default_value: '', regex: '[\\S\\s]+[\\S]+', },
            },
        },
    ],
}

process.title = remote.title;
config.remote = new Remote(remote, config.ipAddress, config.ipPort, config.output);


(async () => {
    while (!await wutils.isOnline()) { await wutils.Wait(1000); }
    await config.remote.connect({ wait: true });

    //Handle button press
    config.remote.on('press_button', async (button, payload) => {
        var i = remote.buttons.findIndex(e => e.id == button.id);

        if ((button.command == 'clear_console')) {
            config.remote.clearOutput();
        }

        if (button.command == 'pause') {
            config.pause = !config.pause;
            remote.buttons[i].title = config.pause ? 'Unpause' : 'Pause';
            remote.buttons[i].color = config.pause ? '#43B581' : '#7289DA';
            config.remote.sendInfo();
        }

        if (button.command == 'set_username') {
            config.track = payload.username.trim();
            config.remote.sendOutput(`[${new Date().toLocaleString('sv-SE')}] New username set: "${config.track}".\n`, false);
        }
    });
})();


setInterval(async () => {
    if (!wutils.isOnline()) { return; }
    if (config.waiting || config.pause) { return; }
    config.waiting = true;

    var status = await gamedig.query({ type: 'minecraft', host: config.host }).catch(() => {});
    if (!status) { return config.waiting = false; }

    var players = status.players.filter(e => (e.name.toLowerCase() == config.track.toLowerCase()));
    if (players.length <= 0) { return config.waiting = false; }

    config.remote.sendOutput(`[${new Date().toLocaleString('sv-SE')}] Someone logged in as ${config.track}\n`, false);
    var waiting_timer = timer.start(() => { config.waiting = false }, 5000);
    const bot = mineflayer.createBot({ host: config.host, username: config.track });
    bot.once('spawn', () => { timer.finish(waiting_timer); bot.quit(); });
}, 500);



var timer = {
    timers: {},
    start: (cb, gap, id) => {
        var key = id ? id : uuidv4().replace(/-/g, '');
        timer.timers[key] = [setTimeout(() => { timer.finish(key) }, gap), cb];
        return key;
    },
    finish: (id) => {
        if(!timer.timers[id]) { return; };
        clearTimeout(timer.timers[id][0]);
        timer.timers[id][1]();
        delete timer.timers[id];
    },
    stop: (id) => {
        if(!timer.timers[id]) { return; };
        clearTimeout(timer.timers[id][0]);
        delete timer.timers[id];
    },
    change: (id, gap) => {
        if(!timer.timers[id]) { return; };
        clearTimeout(timer.timers[id][0]);
        timer.start(timer.timers[id][1], gap, id);
    }
};