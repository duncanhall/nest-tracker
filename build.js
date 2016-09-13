'use strict';

let argv = require('yargs').argv;
if (!argv.u) exitWithError('Username not set.');
if (!argv.p) exitWithError('Password not set.');
if (!argv.r) exitWithError('AWS region not set.');

const rimraf = require('rimraf');
const fs = require('fs');
const archiver = require('archiver');
const output = fs.createWriteStream('./nest-tracker.zip');
const archive = archiver('zip');
const ENV_CONTENTS = `USERNAME=${argv.u}\nPASSWORD=${argv.p}\nAWS_REGION=${argv.r}`;

function exitWithError(error) {
  console.error(error);
  process.exit(1);
}

function cleanupTempFiles() {
  rimraf('./.tmp', function tmpRemoved() {
      console.log('Build complete!');
  });
}

output.on('close', cleanupTempFiles);
archive.pipe(output);
archive
  .directory('./.tmp/lib/node_modules/nest-tracker/node_modules', 'node_modules')
  .append(fs.createReadStream('./index.js'), {name: 'index.js'})
  .append(ENV_CONTENTS, {name: '.env'})
  .finalize();
