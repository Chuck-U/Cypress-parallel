
'use strict';
const fs = require('fs-extra')
const util = require('util');
const { runTests, notifySlack, processResults } = require("./runTests");
const minimist = require('minimist');
var dotenv = require('dotenv').config([])
var args = minimist(process.argv.slice(2),
    {

        alias: {
            e: 'environment',
            s: 'spec',
            a: 'afterRun',
            r: 'reporter'

        }
    });



function splitSpecs(specParam) {

    specParam.trim()
    var specs = specParam.split(',').map(spec =>
        spec.trim().concat(['.spec.js'])

    )
    return specs

}
/**
 *
 * @param {string} args
 * @returns results.runs[0] Cypress reporter object
 */
async function runSpecs(args) {

   let testGroup = 'devTest,shopChat,payments'
    let dockerEnv = 'local';

    let environment = args.e;
    let results = (typeof process.env.CI != undefined && process.env.CI == 1) ? await Promise.all(splitSpecs(testGroup).map(
        (spec) => runTests(dockerEnv, spec)
    )): await Promise.all(splitSpecs(args.s).map(
        (spec) => runTests(environment, spec)
    ))
        .catch(e => {

            console.log(e);
        }).then(results => {
            let totalResults = [];

            results.map(result => {

                return totalResults.push(processResults(result))


            })

            return totalResults;


        }, (err) => {
            if (err && err.message && err.message.contains('invalid')) {
                console.log(err.message);
                console.error(err.stack);
            }
            return;
        }).then(reportingResult => {
            let reportTarget;
         
            if (args.r) {
                switch (args.e) {
                    case 'app':
                        reportTarget = process.env.slackProd.toString();
                        break;
                    case 'staging':
                        reportTarget = process.env.slackStaging.toString();
                        break;
                    case 'local':
                        reportTarget = process.env.slackStaging.toString();
                        break;
                    default:
                        reportTarget = process.env.slackQA.toString();
                        break;
                }
                console.log('selected url', reportTarget)
                return notifySlack(reportingResult, reportTarget)
            }
            else {
                console.log('results:\n', reportingResult)
            }
        }).catch((error) => {
            console.error('failed with', error)
        })

    return results
};


runSpecs(args).then((result) => {
    if (result) {
        console.log('result' + JSON.stringify(result))
process.exit(0)
    }

}).catch((err) => {
    console.error(err.message);
    console.error(err.stack)
    process.exit(1)

})






