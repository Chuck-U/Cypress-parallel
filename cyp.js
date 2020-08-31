
'use strict';

const minimist = require('minimist');
const util = require('util');
const { runTests } = require("./runTests");
require('dotenv').config()

let args = minimist(process.argv.slice(2), {
    alias: {
        c: 'config',
        s: 'spec',
        b: 'browser',
        d: 'second spec',
        //     t: 'third'
    }
});

let second = args.d;
console.log(second)
if(!second || second == null,undefined) {
    console.log('non parallel run', args)
    runTests(args.c, args.s, args.b);
}
if (args.d) {
    console.log(args.c, args.s, args.b, args.d)


    dualRun(args.c, args.s, args.b, args.d).then((finish) => {
        console.log('finished', finish)
        process.exit(0)
    });

}



/**
 *
 * @param {string} config name of cypress config file, without extension or path
 * @param {*} spec spec name, without path or extension
 * @param {*} browser Chrome, Firefox, electron
 * @param {*} param Second Spec to run
 */
async function dualRun(config, spec, browser, param) {
    let b2 = 'electron';
    try {
        await Promise.all([
            runTest(config, spec, browser),
            runTest(config, param, b2)
        ]);

    }
    catch (err) {

        console.error('error on runs', err);
        throw err;
    }
    process.exit(0);
};

/**
 *
 * @param {string} config Passed environment
 * @param {string} param second spec
 */
async function runTest(config, spec, browser) {
    const spawnFile = util.promisify(require('child_process').spawn);

    try {
        console.log('Test:', config, "environment", spec, ".spec.js")

        const { stdout } = await spawnFile(`node runTests.js`, [`-c ${config} -s ${spec} -b ${browser}`], { shell: true, detached: true });
        console.log(stdout)
    }
    catch (e) {

        console.log(spec, 'test had grass', e)
    }
    ;
    return true
}
/**
 *
 * @param {string} config Passed environment
 * @param {string} param second spec
 */
async function secondRun(config, param) {
    console.log('Test two', config, param)
    const spawnFile = util.promisify(require('child_process').spawn);


    try {
        const { stdout } = await spawnFile(`node cyp.js`, [`-c ${config} -s ${param} -b electron`], { shell: true, detached: true });
        console.log(stdout)

    }
    catch (e) {

        console.log('second test had issues', e);
        throw e
    }
    ;
    return true
}
module.exports = {
    dualRun,
    runTests,
    secondRun,
    runTest


}