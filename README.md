# Cypress-parallel
simple script to allow multi-spec run in parallel for Cypress without using dashboard.

##
*node cyp -c {config} -s {spec] -b {browser} -d {spec2}*
# Usage:
1. npm or yarn add @Chuck-U/Cypress-parallel to your cypress repo
2. configure .env for slackToken, passChannel, failChannel (these are the channel IDs you wish to send to slack.)
3. environment config for cypress is set from your own config.json at ./config/
4. Specs are selected from default Cypress directory.
