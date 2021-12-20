var Cypress = require('cypress');
const axios = require('axios');
const minimist = require('minimist');
const fs = require('fs-extra');
const axiosRetry = require('axios-retry');
var _ = require('lodash');
var args = minimist(process.argv.slice(2),
    {

        alias: {
            e: 'environment',
            s: 'spec'
        }
    });

axiosRetry(axios, {
    retryDelay: (retryCount) => {
        return retryCount * 1000;
    }
});



/**
 *
 * @param {string} environment environment file to use (app, staging)
 * @param {string} spec spec name (devTest, payments, Basicworkflow, myCar, Workflow1, adminpartner)
 * @param {string} browser chrome, electron or firefox
 */
function runTests(environment, spec) {
    console.log(`Now running ${spec} on ${environment} environment`);
    if (!environment || !spec) {
        console.log('missing params');
        console.log('\nOops\nOops\nOops\nOops\nOops\nOops\nOops\nOops\nOops\nOops')
    }
    var dTime = new Date();


    const args = {
        "configFile": environment === 'local' ? './local.json' : `./config/${environment}.json`,
        "spec": `cypress/integration/${spec}`,
        "browser": 'chrome',
        "headless": true,
        "reporter": 'spec',
        "chromeWebSecurity": false,
        "reporterOptions": {
            "toConsole": true
        }
    };

    return new Promise((accept, reject) => {

        Cypress.run(args).then(results => {
            if (results.stats === 'failed') {
                console.error(results.message)
                notifyError(results.error);
                return process.exit(1)

            }
            try {
                var runs = results.runs[0];

                //[1].runs[0].reporterStats

                var storeData = fs.readJSONSync(`./stores/${spec.split('.')[0]}.json`)
                    // var runStat = {
                    //     get titles(stat) {
                    //         yield Object.keys(stat)
                    //     }
                    // }

                    let testFails = results.runs[0].tests.filter(test => test.state === "failed").map(test => {
                         return { "name": test.title[2], "state": test.state, "error": test.displayError.toString().split(')\n')[0] } 
                })

                // let testFails = results.runs[0].tests.map((val) => {
                //     let tests = [];
                //     tests += `:x: ${val.title[2]}`;
                //     return tests
                // }).filter(runs => runs.slice(0, 6) == "failed");
                var runStat = {};
                Object.assign(runStat, { "stats": results.runs[0].reporterStats }, { "failed": testFails, "test": results.runs[0].spec.name.split('.')[0] });

                runs.storeId = storeData.storeId





                if (results.runs[0].stats.failures > 0) {
                    //           runs = Object.assign(runs, { "failedTests": testFails })
                    //     console.log('failures occured', runs)
                    runs.failedTests = [testFails];
                    runs.storeId = storeData.storeId

                    accept(runs)
                }
                else {
                    console.log(runs)
                    accept(runs)
                }
                //     fs.appendFileSync(`./stores/${spec.split('.')[0]}.json`, `,${JSON.stringify(runs)}`)


            } catch (e) {
                console.log('error', e.message)
                reject(runs)
                throw e;
            }

        }).catch((err) => {

            console.error(err.message)
            process.exit(1)
        })


    })
}



exports.runTests = runTests;
/**
 *
 * @param {object} res
 * @returns
 */
const isPending = (res, slackNote) => {
    console.log('isPending() fired initially')
    try {
        if (res.reporterStats.failures >= 1 || res.reporterStats.skipped > 1) {
            console.log('isPending hit a condition to trigger')
            let pending = res.tests
                .filter(val => val.state === "failed").map((entry) => {

                    return `Test: ${entry.title[entry.title.length - 1]} - *(${entry.state})* \n
                    error: ${entry.displayError.toString()} \r \n`

                }).join().toString();


            //.map((entry) => { let message = ''; return message += `title: ${entry.title[entry.title.length - 1]}, state: ${entry.state}\n ` })
            //res.tests.filter((value => value["state"] == "failed")).pop()
            //res.tests.filter((val => val["state"] == "failed")).map((test) => test.title).join('\n')


            return pending

        }
        else {
            return '';

        }
    } catch (err) {
        console.log('isPending failed with the following error', err.message)
        return '';
    }


}

exports.isPending = isPending;

function processResults(results) {
    try {

        let spec = results.spec.name.toString()
        stats = results.stats;

        return {
            "TestGroup": ` ${spec.split('.')[0]} spec\n`,
            "Environment": ` ${args.e} server \n`,
            "stats": [JSON.stringify(results.stats, null, "\n")],
            "Notes": `${isPending(results).toString()} \n`,
            "_id": ` ${results.storeId}\n`
        }


    }

    catch (e) {
        console.error('Process results error', e)
        console.error('Process results error', e.message);

    }
}

exports.processResults = processResults;

/**
 *
 * @param {object} reportResult
 *
 * returns a stringified result
 *
 */
function joinResults(reportResult) {


    var fullResults;
    for (const [key, value] of Object.entries(reportResult)) {

        fullResults = fullResults.concat(`${key}: ${value}`, `\n`);
    }


    if (fullResults && (typeof fullResults) === 'string') {
        return fullResults
    }
    else {
        return null
    }


}
exports.joinResults = joinResults;


/**
 *
 * @param {object} result test result for slack message
 * @param {String} reportTarget .env loaded target for slack to report to.
 */

function notifySlack(result, reportTarget) {
    // console.log('preTransformed', result.length)
    console.log(reportTarget)
    // let report = JSON.stringify(result[0]);

    let report = "";
    for (var i = 0; i < result.length; i++) {
        for (const [key, value] of Object.entries(result[i])) {
            report = report.concat([key.toString() + ":" + value.toString() + "\n"])

        }
    }
    /*    class results{
           constructor(val,i,report) {
               let headers = ["result1", "result2", "result3"].join(',')

           }

           add(val, i) {
               for (const l = 0; l < i; l++) {
                   line += val
               }


           }
   } */

    var options = {
        method: 'POST',
        url: reportTarget,
        headers: {
            'content-type': 'application/json'
        },

        data: {
            "text": report,
            "emoji": true

        },

    };

    axios(options).then((parsedBody) => {
        console.log(parsedBody.data)
        process.exit(0)
    }).catch(function (err) {
        console.error(err)
        process.exit(1)
    })


}
exports.notifySlack = notifySlack;
function notifyError(result) {
    // console.log('preTransformed', result.length)
    // let report = JSON.stringify(result[0]);


    /*    class results{
           constructor(val,i,report) {
               let headers = ["result1", "result2", "result3"].join(',')

           }

           add(val, i) {
               for (const l = 0; l < i; l++) {
                   line += val
               }


           }
   } */

    var options = {
        method: 'POST',
        url: process.env.slackProd,
        headers: {
            'content-type': 'application/json'
        },

        data: {
            "text": result.toString(),
            "emoji": true

        },

    };

    axios(options).then((parsedBody) => {
        console.log(parsedBody.data)
        return;
    }).catch(function (err) {
        console.error(err)
        return;
    })


}

exports.notifyError = notifyError;

