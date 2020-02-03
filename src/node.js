const ProcessGraphError = require('./error');
const Utils = require('./utils');

module.exports = class ProcessGraphNode {

	constructor(json, id, parent) {
		if (typeof id !== 'string' || id.length === 0) {
			throw new ProcessGraphError('NodeIdInvalid');
		}
		if (!Utils.isObject(json)) {
			throw new ProcessGraphError('NodeInvalid', {node_id: id});
		}
		if (typeof json.process_id !== 'string') {
			throw new ProcessGraphError('ProcessIdMissing', {node_id: id});
		}

		this.id = id;
		this.processGraph = parent;
		this.process_id = json.process_id;
		this.arguments = Utils.isObject(json.arguments) ? JSON.parse(JSON.stringify(json.arguments)) : {};
		this.description = json.description || null;
		this.isResultNode = json.result || false;
		this.expectsFrom = [];
		this.passesTo = [];
		this.result = null;
		this.resultsAvailableFrom = [];
	}

	getProcessGraph() {
		return this.processGraph;
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
		var arg = this.arguments[name];
		switch(ProcessGraphNode.getType(arg)) {
			case 'result':
				return arg.from_node;
			case 'callback':
				return arg.callback;
			case 'callback-argument':
				return arg.from_argument;
			default:
				return arg;
		}
	}

	getArgument(name, defaultValue = undefined) {
		if (typeof this.arguments[name] === 'undefined') {
			return defaultValue;
		}
		return this.processArgument(this.arguments[name]);
	}

	processArgument(arg) {
		var type = ProcessGraphNode.getType(arg);
		switch(type) {
			case 'result':
				return this.processGraph.getNode(arg.from_node).getResult();
			case 'callback':
				return arg.callback;
			case 'callback-argument':
				return this.processGraph.getParameter(arg.from_argument);
			case 'variable':
				return this.processGraph.getVariableValue(arg.variable_id);
			case 'array':
			case 'object':
				for(var i in arg) {
					arg[i] = this.processArgument(arg[i]);
				}
				return arg;
			default:
				return arg;
		}
	}

	static getType(obj, reportNullAs = 'null') {
		if (typeof obj === 'object') {
			if (obj === null) {
				return reportNullAs;
			}
			else if (Array.isArray(obj)) {
				return 'array';
			}
			else if(obj.hasOwnProperty("callback")) {
				return 'callback';
			}
			else if(obj.hasOwnProperty("variable_id")) {
				return 'variable';
			}
			else if(obj.hasOwnProperty("from_node")) {
				return 'result';
			}
			else if(obj.hasOwnProperty("from_argument")) {
				return 'callback-argument';
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
		this.result = null;
		this.resultsAvailableFrom = [];
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
		this.result = result;
	}

	getResult() {
		return this.result;
	}

	solveDependency(dependencyNode) {
		if (dependencyNode !== null && this.expectsFrom.includes(dependencyNode)) {
			this.resultsAvailableFrom.push(dependencyNode);
		}
		return (this.expectsFrom.length === this.resultsAvailableFrom.length); // all dependencies solved?
	}

};