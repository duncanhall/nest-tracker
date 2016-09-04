'use strict';

let argv = require('yargs').argv;
if (!argv.u || !argv.p) {
    console.log('Username or password not set.');
    return;
}

const rimraf = require('rimraf');
const fs = require('fs');
const archiver = require('archiver');
const output = fs.createWriteStream('./nest-tracker.zip');
const archive = archiver('zip');
const ENV_CONTENTS = `USERNAME=${argv.u}\nPASSWORD=${argv.p}`;

output.on('close', function() {
    rimraf('./.tmp', function tmpRemoved() {
        console.log('Build complete!');
    });
});

archive.pipe(output);

archive
    .directory('./.tmp/lib/node_modules/nest-tracker/node_modules', 'node_modules')
    .append(fs.createReadStream('./index.js'), {name: 'index.js'})
    .append(ENV_CONTENTS, {name: '.env'})
    .finalize();
