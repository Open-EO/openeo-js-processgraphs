const Process = require('./process');
const Utils = require('@openeo/js-commons/src/utils.js');

module.exports = class ProcessRegistry {

	constructor() {
		// Keys added to this object must be lowercase!
		this.processes = {};
	}

	addFromResponse(response) {
		for(var i in response.processes) {
			this.add(response.processes[i]);
		}
	}

	add(process) {
		if (typeof process.id !== 'string') {
			throw new Error("Invalid process; no id specified.");
		}
		this.processes[process.id.toLowerCase()] = new Process(process);
	}

	count() {
		return Utils.size(this.processes);
	}

	all() {
		return Object.values(this.processes);
	}
	
	get(id) {
		if (typeof id === 'string') {
			var pid = id.toLowerCase();
			if (typeof this.processes[pid] !== 'undefined') {
				return this.processes[pid];
			}
		}
		return null;
	}

	toJSON() {
		return Object.values(this.processes).map(impl => impl.toJSON());
	}

};