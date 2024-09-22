const fs = require('fs');
const basename = require('path').basename;
const ffmpeg_installer = require('@ffmpeg-installer/ffmpeg');
const ffprobe_static = require('ffprobe-static');
const ffmpeg = require('fluent-ffmpeg');
const jimp = require("jimp");
const child_process = require('child_process');
const wutils = require('wobbychip-utils');
const { isMainThread, parentPort, Worker, workerData } = require('worker_threads');

const getVideoSize = async (path) => {
    ffmpeg.setFfmpegPath(ffmpeg_installer.path);
    ffmpeg.setFfprobePath(ffprobe_static.path);

    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(path, (err, data) => {
            if (err) { return reject(err); }

            for (const stream of data.streams) {
                if (stream.width) { return resolve({ width: stream.width, height: stream.height }); }
            }
       });
   });
}

async function extractFrames(path, callback) {
    var dimensions = await getVideoSize(path);
    var delimiter = Buffer.from("89504E47", "hex");
    var buffer = Buffer.alloc(0);
    var filename = basename(path);
    var queue = [];
    var frame_i = 0;
    var flipper = 0;

    const ffmpeg_child = child_process.spawn(ffmpeg_installer.path, [
        //'-hwaccel', 'cuda', '-c:v', 'h264_cuvid',
        '-i', path, '-vcodec', 'png', '-f', 'rawvideo',
        '-s', `${dimensions.width}x${dimensions.height}`,
        '-vf', `select=not(mod(n-1\\,10))`, '-vsync', '0', 'pipe:1'
    ]);

    ffmpeg_child.stderr.on('data', (data) => {
        console.log(data.toString());
    });

    ffmpeg_child.stdout.on('data', (data) => {
        buffer = Buffer.concat([buffer, data]);
        //data.fill(0); return data.slice(0, 0);

        while (true) {
            const start = buffer.indexOf(delimiter);
            if (start < 0) { break; }
            const end = buffer.indexOf(delimiter, start + delimiter.length);
            if (end < 0) { break; }

            frame_i++;
            var raw_buffer = buffer.slice(start, end);
            buffer = buffer.slice(end);

            //flipper = (flipper+1)%20;
            //if (flipper != 0) { continue; }

            jimp.read(raw_buffer, (err, jimp_image) => {
                if (err) { return; }
                try { jimp_image = jimp_image.crop(0, 40, 1280, 680).contrast(1); } catch { return; }
                jimp_image.raw_buffer = raw_buffer;
                jimp_image.frame_i = frame_i;
                queue.push(jimp_image);
            });
        }

        while (queue.length > 1) {
            callback(queue.shift(), queue[0], filename);
        }
    });

    return new Promise((resolve) => { ffmpeg_child.on('close', resolve); });
}

async function parseFrame(image1, image2, filename) {    
    //var diff = jimp.diff(image1_clone, image2_clone).percent;
    try { var diff = jimp.distance(image1, image2); } catch { return; }
    var filename = `.\\images\\${filename}_${image1.frame_i}.png`;
    console.log(`[${filename}] diff: ${diff.toFixed(5)}, frame: ${image1.frame_i}`)
    if ((diff < 0.02) || fs.existsSync(filename)) { return; }

    try {
        fs.writeFileSync(filename, image1.raw_buffer);
    } catch(error) { console.error(error); }
}

(async () => {
    if (isMainThread) {
        var workers = 0;
        setInterval(() => process.title = `Workers: ${workers}/10`, 100);
        try { fs.mkdirSync("images"); } catch {}

        for (var filename of fs.readdirSync("Tapo").filter(e => e.includes(".mp4")).reverse()) {
            while (workers >= 10) { await wutils.Wait(1); }
            workers++;
            var worker = new Worker(__filename, { workerData: { path: `Tapo/${filename}` }});
            worker.on('exit', (code) => workers--);
        }

        while (workers > 0) { await wutils.Wait(1); }
    }

    if (!isMainThread && workerData.path) {
        await extractFrames(workerData.path, parseFrame);
        fs.renameSync(workerData.path, workerData.path.replace('.mp4', '.bak'));
        process.exit(0);
    }

    //await extractFrames('1706202261873.mp4', parseFrame);
    //await extractFrames('20240616_054855_tp00411.mp4', parseFrame);
    //while (true) { await wutils.Wait(1); }
})();