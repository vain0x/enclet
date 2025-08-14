#!/bin/sh
set -eu
npm run build-cjs

# https://nodejs.org/api/single-executable-applications.html
node --experimental-sea-config sea-config.json
node -e "require('fs').copyFileSync(process.execPath, 'dist/enclet.exe')"
npx postject dist/enclet.exe NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
