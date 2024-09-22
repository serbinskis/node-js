const HTMLParser = require("node-html-parser");
const got = require("got");
const fs = require('fs');
const puppeteer = require('puppeteer');
const ks = require('node-key-sender');

const anime_link = "https://jut.su/one-piece/";
const download_folder = anime_link.split("/")[3];

(async () => {
    var response = await got(anime_link);
    var dom = HTMLParser.parse(response.body);
    var buttons = dom.querySelectorAll(".the_hildi");
    var hostname = new URL(anime_link).origin;
    var urls = [];

    [].forEach.call(buttons, function(button) {
        if (button.classList.contains("green")) {
            urls.push(button._attrs.href);
        }
    });

    const browser = await puppeteer.launch({
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        headless: false,
    });

    if (!fs.existsSync(download_folder)) { fs.mkdirSync(download_folder); }

    for (var i = 0; i < urls.length; i++) {
        var save_filename = `${pad(i+1, String(urls.length).length+1)}.mp4`

        while (fs.existsSync(`${download_folder}\\${save_filename}`)) {
            i += 1;
            save_filename = `${pad(i+1, String(urls.length).length+1)}.mp4`
        }

        const page = await browser.newPage();
        await goto(page, hostname + urls[i]);
	    await Wait(2000);
        var video_url = await page.evaluate(() => document.querySelectorAll("#my-player_html5_api")[0].children[0].src);
        var download_filename = video_url.split("/")[4].split("?")[0];

        console.log(`${download_filename} -> ${save_filename}`);
        console.log(video_url + "\n");

        await goto(page, video_url, {waitUntil: 'load'});
        await page.evaluate(() => document.getElementsByTagName("video")[0].remove());
        await page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: `${__dirname}\\${download_folder}`});

	    await Wait(500);
        ks.sendCombination(['control', 's']);
        await Wait(1000);
        page.close();

        var files = [""];
        while (files.length != 0) {
            var files = fs.readdirSync(download_folder).filter(function(elm) { return elm.match(/.*\.(crdownload)/ig); });
            await Wait(1000);
        }

        fs.renameSync(`${download_folder}\\${download_filename}`, `${download_folder}\\${save_filename}`);
    }

    process.exit();
})();

async function goto(page, url, options) {
    try {
        await page.goto(url, options)
    } catch (e) {
        await page.close();
        await goto(page, url, options);
    }
}

function pad(num, places) {
    return String(num).padStart(places, '0')
}

async function Wait(milleseconds) {
	return new Promise(resolve => setTimeout(resolve, milleseconds))
}