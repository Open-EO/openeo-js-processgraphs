const ProcessGraphError = require('./error');
const Utils = require('@openeo/js-commons/src/utils.js');

module.exports = class ProcessGraphNode {

	constructor(node, id, parent = null) {
		if (typeof id !== 'string' || id.length === 0) {
			throw new ProcessGraphError('NodeIdInvalid');
		}
		if (!Utils.isObject(node)) {
			throw new ProcessGraphError('NodeInvalid', {node_id: id});
		}
		if (typeof node.process_id !== 'string') {
			throw new ProcessGraphError('ProcessIdMissing', {node_id: id});
		}

		this.id = id;
		this.processGraph = parent;
		this.source = node;
		this.process_id = node.process_id;
		this.arguments = Utils.isObject(node.arguments) ? Utils.deepClone(node.arguments) : {};
		this.description = node.description || null;
		this.isResultNode = node.result || false;
		this.expectsFrom = []; // From which node do we expect results from
		this.receivedFrom = []; // From which node have received results from so far
		this.passesTo = [];
		this.computedResult = null;
	}

	toJSON() {
		let args = Utils.mapObjectValues(this.arguments, arg => Utils.isObject(arg) && typeof arg.toJSON === 'function' ? arg.toJSON() : arg);
		return Object.assign({}, this.source, {
			process_id: this.process_id,
			description: this.description,
			arguments: args,
			result: this.isResultNode
		});
	}

	getProcessGraph() {
		return this.processGraph;
	}

	getParent() {
		if (this.processGraph !== null) {
			return this.processGraph.getParentNode();
		}
		return null;
	}

	getArgumentNames() {
		return Object.keys(this.arguments);
	}

	hasArgument(name) {
		return (name in this.arguments);
	}

	getArgumentType(name) {
		return ProcessGraphNode.getType(this.arguments[name]);
	}

	getRawArgument(name) {
		return this.arguments[name];
	}

	getRawArgumentValue(name) {
		var arg = this.getRawArgument(name);
		switch(ProcessGraphNode.getType(arg)) {
			case 'result':
				return arg.from_node;
			case 'callback':
				return arg;
			case 'parameter':
				return arg.from_parameter;
			default:
				return arg;
		}
	}

	getArgument(name, defaultValue = undefined) {
		if (typeof this.arguments[name] === 'undefined') {
			return defaultValue;
		}
		return this.evaluateArgument(this.arguments[name]);
	}

	getArgumentRefs(name) {
		return ProcessGraphNode.getValueRefs(this.arguments[name]);
	}

	getRefs() {
		return ProcessGraphNode.getValueRefs(this.arguments);
	}

	static getValueRefs(value) {
		var store = [];
		var type = ProcessGraphNode.getType(value);
		switch(type) {
			case 'result':
			case 'parameter':
				store.push(value);
				break;
			case 'callback':
				// ToDo
				break;
			case 'array':
			case 'object':
				for(var i in value) {
					store = store.concat(ProcessGraphNode.getValueRefs(value[i]));
				}
				break;
		}
		return store;
	}

	getProcessGraphParameter(name) {
		// 1. Check local parameter, then check parents
		// 2. Check parents
		// 3. Try to get default value
		// 4. Fail if no value is available
		let defaultValue;
		let pg = this.processGraph;
		do {
			if (pg.hasArgument(name)) {
				return pg.getArgument(name);
			}
			if (pg.hasParameterDefault(name)) {
				defaultValue = pg.getParameterDefault(name);
			}
			pg = pg.getParent();
		} while (pg !== null);

		if (typeof defaultValue !== 'undefined') {
			return defaultValue;
		}
		
		throw new ProcessGraphError('ProcessGraphParameterMissing', {
			argument: name,
			node_id: this.id,
			process_id: this.process_id
		});
	}

	evaluateArgument(arg) {
		var type = ProcessGraphNode.getType(arg);
		switch(type) {
			case 'result':
				return this.processGraph.getNode(arg.from_node).getResult();
			case 'callback':
				return arg;
			case 'parameter':
				return this.getProcessGraphParameter(arg.from_parameter);
			case 'array':
			case 'object':
				for(var i in arg) {
					arg[i] = this.evaluateArgument(arg[i]);
				}
				return arg;
			default:
				return arg;
		}
	}

	static getType(obj, reportNullAs = 'null') {
		const ProcessGraph = require('./processgraph');
		if (typeof obj === 'object') {
			if (obj === null) {
				return reportNullAs;
			}
			else if (Array.isArray(obj)) {
				return 'array';
			}
			else if(obj.hasOwnProperty("process_graph") || obj instanceof ProcessGraph) {
				return 'callback';
			}
			else if(obj.hasOwnProperty("from_node")) {
				return 'result';
			}
			else if(obj.hasOwnProperty("from_parameter")) {
				return 'parameter';
			}
			else {
				return 'object';
			}
		}
		return (typeof obj);
	}

	isStartNode() {
		return (this.expectsFrom.length === 0);
	}

	addPreviousNode(node) {
		this.expectsFrom.push(node);
	}

	getPreviousNodes() {
		return this.expectsFrom;
	}

	addNextNode(node) {
		this.passesTo.push(node);
	}

	getNextNodes() {
		return this.passesTo;
	}

	reset() {
		this.computedResult = null;
		this.receivedFrom = [];
	}

	setDescription(description) {
		if (typeof description === 'string') {
			this.description = description;
		}
		else {
			this.description = null;
		}
	}

	setResult(result) {
		this.computedResult = result;
	}

	getResult() {
		return this.computedResult;
	}

	solveDependency(dependencyNode) {
		if (dependencyNode !== null && this.expectsFrom.includes(dependencyNode)) {
			this.receivedFrom.push(dependencyNode);
		}
		return (this.expectsFrom.length === this.receivedFrom.length); // all dependencies solved?
	}

};