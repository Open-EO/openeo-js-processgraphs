const BaseProcess = require('./process');
const Utils = require('../utils');

module.exports = class ProcessRegistry {

	constructor() {
		// Keys added to this object must be lowercase!
		this.processes = {};
	}

	addFromResponse(response) {
		for(var i in response.processes) {
			var p = response.processes[i];
			this.processes[p.id] = new BaseProcess(p);
		}
	}

	count() {
		return Utils.size(this.processes);
	}
	
	get(id) {
		var pid = id.toLowerCase();
		if (typeof this.processes[pid] !== 'undefined') {
			return this.processes[pid];
		}
		return null;
	}

	getProcessSchemas() {
		return Object.values(this.processes).map(impl => impl.schema);
	}

};