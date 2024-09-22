const express = require("express");
const youtubedl = require('youtube-dl-exec')
const prettyBytes = require('pretty-bytes');

const app = express();

app.get("/video/*", async function(req, res) {
    if (req.params[0].match(/^([a-z0-9_-]{11})$/i)) {
        res.send(await GetYouTubeVideo(req.params[0]));
    } else {
        res.send('ERROR: Incorrect parameters');
    }
});

app.get("/audio/*", async function(req, res) {
    if (req.params[0].match(/^([a-z0-9_-]{11})$/i)) {
        res.send(await GetYouTubeAudio(req.params[0]));
    } else {
        res.send('ERROR: Incorrect parameters');
    }
});

app.listen(80, function() {
    console.log(`Listening on port: 80`);
});

function GroupBy(array, value) {
    return Array.from(
        array.reduce( 
            (o1, o2) => (o1.get(o2[value]).push(o2), o1), new Map(array.map(o2 => [o2[value], []]))
        ), ([key, v]) => v
    )
}

function GetBestFromGroups(groups, value) {
    var array = [];

    for (const group of groups) {
        var best = group.sort((function(a, b) { return b[value] - a[value]; }))[0]
        array.push({
            dimensions: {w: best.width, h: best.height},
            filesize: best.filesize,
            quality: best.format_note,
            ext: best.ext,
            nosound: (best.acodec == 'none'),
            url: best.url,
        });
    }

    return array;
}

(async () => {
    var a = [{x: 20, y: 'abc'},{x: 1, y: 'abc'}, {x: undefined, y: 'abc'}]
    var result = await GetYouTubeAudio('6SzfcBZJcAs');
    console.log(result);

    for (const item of result) {
        if ((item.vcodec != 'none') && (item.acodec != 'none')) {
            console.log(`abr:${item.abr} - vbr:${item.vbr} - tbr:${item.tbr} - ${item.ext} - ${item.format_note} - v:${item.vcodec} a:${item.acodec} - ${prettyBytes(item.filesize, {locale: 'de'})}`);
        }
    }
})();

async function GetYouTubeVideo(code) {
    try {
        var options = {
            dumpSingleJson: true,
            noWarnings: true,
            ignoreErrors: true,
            noCallHome: true,
            noCheckCertificate: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true,
        }

        var formats = (await youtubedl(`https://youtu.be/${code}`, options)).formats;
        var videos = [];

        for (var i = 0; i < formats.length; i++) {
            if (formats[i].vcodec != 'none' && formats[i].vbr) {
                videos.push(formats[i]);
            }
        }

        return GetBestFromGroups(GroupBy(videos, 'format_note'), 'vbr');
    } catch(e) {
        return e.stderr || e;
    }
}


async function GetYouTubeAudio(code) {
    try {
        var options = {
            dumpSingleJson: true,
            noWarnings: true,
            ignoreErrors: true,
            noCallHome: true,
            noCheckCertificate: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true,
        }

        var formats = (await youtubedl(`https://youtu.be/${code}`, options)).formats;
        var audios = [];

        for (var i = 0; i < formats.length; i++) {
            if ((formats[i].vcodec == 'none') && (formats[i].acodec != 'none') && formats[i].abr) {
                audios.push({
                    filesize: formats[i].filesize,
                    bitrate: formats[i].abr,
                    ext: formats[i].ext,
                    url: formats[i].url,
                });
            }
        }

        return audios;
    } catch(e) {
        return e.stderr || e;
    }
}