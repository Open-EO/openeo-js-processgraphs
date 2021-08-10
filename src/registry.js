const CommonProcessRegistry = require('@openeo/js-commons/src/processRegistry');

/**
 * Central registry for processes.
 * 
 * Implementation has been moved to @openeo/js-commons.
 * This wrapper here is only available for backward compatibility.
 * 
 * @todo Remove in 2.0.0.
 * @augments CommonProcessRegistry
 * @class
 */
class ProcessRegistry extends CommonProcessRegistry {

}

module.exports = ProcessRegistry;