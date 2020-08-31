var Cypress = require('cypress');
const rp = require('request-promise');
const minimist = require('minimist');
require('dotenv').config([]);


let args = minimist(process.argv.slice(2), {
    alias: {
        c: 'config',
        s: 'spec',
        b: 'browser',
        d: 'second',
        //     t: 'third'
    }
});
console.log(args)
let param = args.d;
let config = args.c;
let spec = args.s;
let browser = args.b;
/**
 *
 * @param {string} config config file to use (app, staging)
 * @param {string} spec spec name (devTest, payments, Basicworkflow, myCar, Workflow1, adminpartner)
 * @param {string} browser chrome, electron or firefox
 */
async function runTests(config, spec, browser) {
    var stats;
    let channel;
    console.log(`Now running ${spec} on ${config} environment`);

    if (!config || !spec) {
        console.log('missing params');
        process.exit(1);

    }
    var dTime = new Date();

    if (!browser) {

        browser = 'electron';
    }

    try {
        await Cypress.run(
            {
                "configFile": `./config/${config}.json`,
                "spec": `cypress/integration/${spec}.spec.js`,
                "browser": browser,
                "headless": true,
                "reporter": 'list',
                "reporterOptions": {
                    "toConsole": true
                }
            }).then(async (results) => {
                stats = results.runs[0].stats;
                console.log(stats);


                let passRate = `${stats.passes / (stats.tests - stats.pending) * 100}`;

                console.log(passRate, "% passed");

                // Sets a threshold for report options
                if (passRate <= 85) {
                    channel = process.env.failChannel
                    var reportResult = {
                        "spec": `"${spec} testGroup"`,

                        "*environment*": `"${config} server"`,

                        "Failures": `${results.totalFailed}`,
                        "Tests Run": `${stats.tests - stats.pending}`,

                        "Test passing %": `${passRate}`,

                        "Duration (seconds)": stats.wallClockDuration / 1000
                    };
                    if (results.totalFailed >= 5) {
                        let warningResult = { "_Warning_": `:redsiren: *${results.totalFailed}/${results.totalTests}* failed\n ` };
                        Object.assign(reportResult, warningResult);

                    }
                    var reportSend = "";
                    for (const [key, value] of Object.entries(reportResult)) {

                        reportSend = reportSend.concat(`${key}: ${value}`, `\n`);
                    }

                    notifySlack(chanel, reportSend);
                }
                else {

                    channel = process.env.passChannel


                    var reportResult = {
                        "Result": `"${results.startedTestsAt}: ${spec} testGroup ran on ${config} server with no issues"`,
                        "Duration (seconds)": stats.wallClockDuration / 1000
                    };
                    for (const [key, value] of Object.entries(reportResult)) {

                        reportSend = reportSend.concat(`${key}: ${value}`, `\n`);
                    }
                    notifySlack(pchannel, reportResult);
                    console.log(`${spec} on ${config} met threshold`);
                }
            });
    }
    catch (error) {

        console.log('runTests failed with the following error:%d', error);
        throw new Error('Error occured with RunTests', error);

    }

};
runTests(config, spec, browser)
exports.runTests = runTests;
/**
 *
 * @param {object} stats
 * @param {string} spec
 * @param {string} config
 * @param {number} ratio
 */





/**
 *
 * @param {*} channel Slack channel to send to
 * @param {*} result result Object
 */
async function notifySlack(channel, result) {

    var options = {
        method: 'POST',
        uri: 'https://slack.com/api/chat.postMessage',
        headers: {
            'Authorization': `Bearer ${process.env.slackToken}`,
            'Content-Type': 'application/json'

        },

        body: JSON.stringify({
            "channel": `${channel}`,
            "text": `${result}`,
            "emoji": true
        }),
    };



    var response = await rp(options)
        .then((res) => {
            console.log(res.data);

            if (res.statusCode == 200 || 201) {
                console.log('all sent');
                return null;
            }
            else if (response && response.statusCode != 400) {
                console.log('couldn\'t send');
                return false;

            }
        }).catch((err) => {
            console.log("request failed to Slack", err);
            throw new Error('notifySlack', err);
        });

}


exports.notifySlack = notifySlack;