const puppeteer = require('puppeteer');
const noblox = require('noblox.js')
const got = require('got');
const utils = require('wobbychip-utils');

const WEBHOOK_URL = '';
const ROBLOX_URL = 'https://www.roblox.com';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DISPLAY_NAME = 'overkill';

(async () => {
    while(1) {
        const browser = await puppeteer.launch({
            headless: false,
            args: [
                '--allow-running-insecure-content',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-web-security',
                '--no-default-browser-check',
            ],
        });

        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0);
        await page.setViewport({ width: 0, height: 0});
        const client = await page.target().createCDPSession();
        await goto(page, ROBLOX_URL, { waitUntil: 'networkidle2' });

        var username = '';
        var password = utils.generateString(20, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');

        await (await page.$('.cookie-btn')).click();
        await page.select('#MonthDropdown', MONTHS[Math.floor(Math.random() * MONTHS.length)]);
        await page.select('#DayDropdown', String(utils.randomRange(10, 28)));
        await page.select('#YearDropdown', String(utils.randomRange(1922, 2004)));

        do {
            username = utils.generateString(20, 'lI');
            await (await page.$('#signup-username')).click({ clickCount: 3 });
            await (await page.$('#signup-username')).type(username);
            await utils.Wait(1000);
        } while ((await page.$eval('#signup-usernameInputValidation', (e) => e.innerHTML)) != '');

        await (await page.$('#signup-password')).type(password);
        await (await page.$('.icon-password-show')).click();
        await (await page.$('#MaleButton')).click();
        (await page.$('#signup-button')).click();

        var error_timeout = setTimeout(async () => {
            try {
                await page.evaluate(() => $('#fc-iframe-wrap')[0] ? null : $('#GeneralErrorText')[0].click());
                if ((await page.$eval('#GeneralErrorText', (e) => e.innerHTML)) == '') { return; }
                console.log('Maximum account limit generation per day exceeded.');
                await browser.close();
            } catch (e) {}
        }, 5000);

        var captcha_interval = setInterval(async () => {
            try {
                await page.evaluate(() => $('#fc-iframe-wrap')[0]?.contentWindow?.$('#CaptchaFrame')[0]?.contentWindow?.document?.querySelector('#home_children_button')?.click());
            } catch (e) {}
        }, 500);

        try { await page.waitForNavigation(); } catch (e) {}
        clearTimeout(error_timeout);
        clearInterval(captcha_interval);
        if (!browser.isConnected()) { process.exit(); }

        const ROBLOSECURITY = (await client.send('Network.getAllCookies')).cookies.filter((e) => e.name == '.ROBLOSECURITY')[0].value;
        console.log(`${username}:${password}`);
        await got.post(WEBHOOK_URL, { json: { username: 'Roblox Account Generator', content: `\`\`\`${username}:${password}\`\`\`` }});

        await changeDisplayName(ROBLOSECURITY, DISPLAY_NAME);
        await noblox.setCookie(ROBLOSECURITY);
        try { await noblox.buy('398633812'); } catch (e) {}
        try { await noblox.buy('7074764'); } catch (e) {}
        try { await noblox.buy('62234425'); } catch (e) {}
        await noblox.setWearingAssets([398633812, 7074764, 62234425]);
        await noblox.setAvatarBodyColors(1003, 1003, 1003, 1003, 1003, 1003);
        await browser.close();
    }
})();

async function goto(page, url, options) {
    try {
        await page.goto(url, options)
    } catch (e) {
        await page.close();
        await goto(page, url, options);
    }
}

async function changeDisplayName(ROBLOSECURITY, displayName) {
    let UserId = (await got.get('https://www.roblox.com/mobileapi/userinfo', { headers: { cookie: `.ROBLOSECURITY=${ROBLOSECURITY}` }}).json()).UserID;
    let token = (await got.post('https://auth.roblox.com/v2/logout', { headers: { cookie: `.ROBLOSECURITY=${ROBLOSECURITY}`, }, throwHttpErrors: false })).headers['x-csrf-token'];

    await got.patch(`https://users.roblox.com/v1/users/${UserId}/display-names`, {
        json: {
            newDisplayName: displayName
        },
        headers: {
            cookie: `.ROBLOSECURITY=${ROBLOSECURITY}`,
            'x-csrf-token': token,
    }});
}