'use strict';

let argv = require('yargs').argv;
if (!argv.u)  console.error('Username not set.');   return;
if (!argv.p)  console.error('Password not set.');   return;
if (!argv.r)  console.error('AWS region not set.'); return;

const rimraf = require('rimraf');
const fs = require('fs');
const archiver = require('archiver');
const output = fs.createWriteStream('./nest-tracker.zip');
const archive = archiver('zip');
const ENV_CONTENTS = `USERNAME=${argv.u}\nPASSWORD=${argv.p}\nAWS_REGION=${argv.r}`;

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
