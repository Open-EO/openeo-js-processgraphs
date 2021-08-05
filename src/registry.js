const Process = require('./process');
const CommonProcessRegistry = require('@openeo/js-commons/src/processRegistry');
const Utils = require('./utils');

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

	add(process, namespace = 'backend') {
		if (!Utils.isObject(process)) {
			throw new Error("Invalid process; not an object.");
		}

		let isImpl = process instanceof Process;
		if (!isImpl && typeof process.toJSON === 'function') {
			var json = process.toJSON();
			if (Utils.isObject(json)) {
				process = json;
			}
		}
		if (typeof process.id !== 'string') {
			throw new Error("Invalid process; no id specified.");
		}

		super.add(isImpl ? process : new Process(process), namespace);
	}

	toJSON() {
		return this.all().map(impl => impl.toJSON());
	}

}

module.exports = ProcessRegistry;