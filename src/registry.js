const BaseProcess = require('./process');
const Utils = require('./utils');

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
		this.processes[process.id] = new BaseProcess(process);
	}

	count() {
		return Utils.size(this.processes);
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

	getSchema(id) {
		var p = this.get(id);
		return p !== null ? p.schema : null;
	}

	getProcessSchemas() {
		return Object.values(this.processes).map(impl => impl.schema);
	}

};