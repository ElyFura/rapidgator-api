/**
 * RapidGator API - NPM Package Entry Point
 * Dateiname: index.js
 */

const RapidGatorAPI = require('./lib/rapidgator-api');
const utils = require('./lib/utils');

module.exports = {
    RapidGatorAPI,
    utils,
    // Convenience export
    default: RapidGatorAPI
};

// ES6 compatibility
module.exports.default = RapidGatorAPI;
