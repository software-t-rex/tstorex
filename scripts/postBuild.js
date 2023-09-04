#!/usr/bin/env node
import path from 'path';
import { readFileSync, writeFileSync, cpSync } from 'fs';
import { exit } from 'process';
import { execSync } from 'child_process';
const rootDir = path.resolve(path.dirname(import.meta.url).replace("file://", ""), '../');
const distDir = path.resolve(rootDir, 'dist');

const version = execSync('git describe --tags --abbrev=0', {cwd: rootDir}).toString("utf8").trim()
const filesToCopy = [
    'LICENSE',
    'README.md',
]

console.log(`\x1b[1mPreparing dist \x1b[33mpackage.json@\x1b[5m${version}\x1b[0m`)
let pkgJSON = JSON.parse(readFileSync(path.resolve(rootDir, 'package.json'), 'utf8'));
// replace some properties for dist inside package json
pkgJSON = {
    // first line is just for ordering fields like we want
    ...{name:"", version:"", description:"", type:"", module:"", main:"", exports:"", scripts:""},
    ...pkgJSON, 
    version,
    "type": "module",
    "module": "index.js",
    "main": "index.cjs",
    "exports": {
        "./package.json": "./package.json",
        ".": {
            "types": "./index.d.ts",
            "import": "./index.js",
            "require": "./index.cjs"
        },
        "./recipes": {
            "types": "./recipes.d.ts",
            "import": "./recipes.js",
            "require": "./recipes.cjs"
        }
    },
}
writeFileSync(distDir + '/package.json', JSON.stringify(pkgJSON, null, 2), 'utf8');
console.log(`\x1b[32mSaved to ${distDir}/package.json\x1b[0m`)
console.log('\x1b[1mcopy some files\x1b[0m')
filesToCopy.forEach(file => {
    const dest = path.resolve(distDir,  file)
    console.log('- ' + dest.replace(/.*\/dist\//, 'dist/'))
    cpSync(path.resolve(rootDir, file), dest);
});
console.log('\x1b[1mPackaging\x1b[0m')
const pckgFile = execSync('pnpm pack', {cwd: distDir});
console.log(`\x1b[32mSaved to dist/${pckgFile.toString("utf8").trim()}\x1b[0m`)
