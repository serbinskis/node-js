const fs = require('fs');
const got = require('got');
const request = require("request");
const cliProgress = require('cli-progress');
const prettyBytes = require('pretty-bytes');
const readlineSync = require("readline-sync");

var anime_code = readlineSync.question("Code: ");
var download_folder = readlineSync.question("Name: ") || "download";
var hdquality = true;

(async () => {
    try {
        var anime_json = await got.post('https://api.animevost.org/v1/info', { form: { id: anime_code }}).json();
        var series = Object.values(JSON.parse(anime_json.data[0].series.replaceAll(`'`, `"`)));
    } catch (e) {
        console.log('Couldn\'t find anime with this code.');
        return;
    }

    if (!fs.existsSync(download_folder)) { fs.mkdirSync(download_folder); }

    for (var i = 0; i < series.length; i++) {
        while(1) {
            var filename = `${download_folder}\\${pad(i+1, String(series.length).length)}.mp4`;
            var url = `http://video.animetop.info/${hdquality ? '720/' : ''}${series[i]}.mp4`;
            if (!fs.existsSync(filename)) { break; }
            if (i >= series.length) { return; } else { i += 1; }
        }

        await new Promise((resolve) => setTimeout(resolve, 100));

        if (await DownloadFile(url, filename) != 0) {
            console.log(`There was error downloading file. (${hdquality ? '720p' : '360p'})`);
            i -= hdquality ? 1 : 0;
            hdquality = !hdquality;
        } else hdquality = true;
    }

    process.exit();
})();

function pad(num, places) {
    return String(num).padStart(places, '0');
}

async function DownloadFile(url, filename) {
    return new Promise(resolve => {
        const progressBar = new cliProgress.SingleBar({
            format: `${filename.split("\\").pop()} -> {bar} {percentage}% | {current_size}/{total_size}`
        }, cliProgress.Presets.shades_classic);
    
        const file = fs.createWriteStream(filename);
        var receivedBytes = 0;       
        var totalBytes = 0;
        request.get(url)

        .on('response', (response) => {    
            totalBytes = parseInt(response.headers['content-length']);
            progressBar.start(totalBytes, 0, {
                current_size: prettyBytes(receivedBytes, {locale: 'de'}),
                total_size: prettyBytes(totalBytes, {locale: 'de'}),
            });

            if (response.statusCode !== 200) {
                try { fs.unlinkSync(filename) } catch(e) {};
                progressBar.stop();
                resolve(1);
            }
        })

        .on('data', (chunk) => {
            receivedBytes += chunk.length;
            progressBar.update(receivedBytes, {
                current_size: prettyBytes(receivedBytes, {locale: 'de'}),
                total_size: prettyBytes(totalBytes, {locale: 'de'}),
            });
        })

        .pipe(file)

        .on('error', () => {
            try { fs.unlinkSync(filename) } catch(e) {};
            progressBar.stop();
            resolve(1);
        });
    
        file.on('finish', () => {
            progressBar.stop();
            file.close();
            resolve(0);
        });
    
        file.on('error', () => {
            try { fs.unlinkSync(filename) } catch(e) {};
            progressBar.stop();
            resolve(1);
        });
    });
}