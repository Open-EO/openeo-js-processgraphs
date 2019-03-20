
const MigrateCapabilities = require('./migrate/capabilities.js');
const MigrateCollections = require('./migrate/collections.js');
const MigrateProcesses = require('./migrate/processes.js');
const FeatureList = require('./featurelist.js');
const Utils = require('./utils.js');

module.exports = {
	MigrateCapabilities,
	MigrateCollections,
	MigrateProcesses,
	FeatureList,
	Utils
};