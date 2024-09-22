const fs = require('fs');
const simpleGit = require('simple-git');
const readlineSync = require("readline-sync");
const utils = require('wobbychip-utils');
const _7zip = require('7zip')['7z'];
const { spawnSync } = require('child_process');

const SPLIT_SIZE = 90*1024*1024;
const MAX_SIZE = 100*1024*1024;
const repository = readlineSync.question('Repository path: ');

function splitFile(filename, not_added) {
    console.log(`File too big (splitting 95M) -> ${filename}`);
    var amount = Math.ceil(utils.getFileSize(`${repository}/${filename}`)/SPLIT_SIZE);
    var result = `${filename.replace(/\.[^/.]+$/, '')}.zip`;
    spawnSync(_7zip, ['a', '-tzip', '-mx0', '-v90m', '-sdel', `${repository}/${result}`, `${repository}/${filename}`]);

    for (var i = 1; i <= amount; i++) {
        not_added.push(`${result}.${utils.pad(i, 3)}`);
    }
}

(async () => {
    var git = simpleGit(repository, { binary: 'git' });
    var not_added = (await git.status()).not_added;
    var current_size = 0;

    for (var i = 0; i < not_added.length; i++) {
        var size = utils.getFileSize(`${repository}/${not_added[i]}`);
        if (size > SPLIT_SIZE) { splitFile(not_added[i], not_added); }
        if (size > SPLIT_SIZE) { continue; }

        current_size += utils.getFileSize(`${repository}/${not_added[i]}`);
        await git.add(not_added[i]);
        console.log(`Added ${not_added[i]}.`);

        if (current_size <= MAX_SIZE) { continue; }
        await git.commit('ㅤ').push(['-u', 'origin', 'master'], () => console.log(`pushed! (${i+1}/${not_added.length})`));
        current_size = 0;
    }

    if (current_size == 0) { return; }
    await git.commit('ㅤ').push(['-u', 'origin', 'master'], () => console.log(`done!`));
})();