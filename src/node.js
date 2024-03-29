const ProcessGraphError = require('./error');
const Utils = require('./utils');

/**
 * A Process graph node.
 * 
 * @class
 */
class ProcessGraphNode {

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
		this.namespace = node.namespace || null;
		this.arguments = Utils.isObject(node.arguments) ? Utils.deepClone(node.arguments) : {};
		this.description = node.description || null;
		this.isResultNode = node.result || false;
		this.expectsFrom = []; // From which node do we expect results from
		this.receivedFrom = []; // From which node have received results from so far
		this.passesTo = [];
		this.computedResult = undefined;
	}

	toJSON() {
		let args = Utils.mapObjectValues(this.arguments, arg => Utils.isObject(arg) && typeof arg.toJSON === 'function' ? arg.toJSON() : arg);
		return Object.assign({}, this.source, {
			process_id: this.process_id,
			namespace: this.namespace,
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
		return typeof this.arguments[name] !== 'undefined';
	}

	getArgumentType(name) {
		return Utils.getType(this.getRawArgument(name));
	}

	getRawArgument(name) {
		return Utils.isObject(this.source.arguments) ? this.source.arguments[name] : undefined;
	}

	getParsedArgument(name) {
		return this.arguments[name];
	}

	getArgument(name, defaultValue = undefined) {
		if (typeof this.arguments[name] === 'undefined') {
			return defaultValue;
		}
		return this.evaluateArgument(this.arguments[name]);
	}

	getArgumentRefs(name) {
		return Utils.getRefs(this.getRawArgument(name), false);
	}

	getRefs() {
		return Utils.getRefs(this.source.arguments, false);
	}

	getProcessGraphParameterValue(name) {
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

		if (!this.processGraph.allowUndefinedParameterRefs) {
			throw new ProcessGraphError('ProcessGraphParameterMissing', {
				argument: name,
				node_id: this.id,
				process_id: this.process_id,
				namespace: this.namespace || 'n/a'
			});
		}
	}

	evaluateArgument(arg) {
		var type = Utils.getType(arg);
		switch(type) {
			case 'result':
				return this.processGraph.getNode(arg.from_node).getResult();
			case 'callback':
				return arg;
			case 'parameter':
				return this.getProcessGraphParameterValue(arg.from_parameter);
			case 'array':
			case 'object':
				let copy = type === 'array' ? [] : {};
				for(var i in arg) {
					copy[i] = this.evaluateArgument(arg[i]);
				}
				return copy;
			default:
				return arg;
		}
	}

	isStartNode() {
		return (this.expectsFrom.length === 0);
	}

	addPreviousNode(node) {
		if (!this.expectsFrom.find(other => other.id === node.id)) {
			this.expectsFrom.push(node);
		}
	}

	getPreviousNodes() {
		// Sort nodes to ensure a consistent execution order
		return this.expectsFrom.sort((a,b) => a.id.localeCompare(b.id));
	}

	addNextNode(node) {
		if (!this.passesTo.find(other => other.id === node.id)) {
			this.passesTo.push(node);
		}
	}

	getNextNodes() {
		// Sort nodes to ensure a consistent execution order
		return this.passesTo.sort((a,b) => a.id.localeCompare(b.id));
	}

	reset() {
		this.computedResult = undefined;
		this.receivedFrom = [];
	}

	getDescription() {
		return this.description;
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

}

module.exports = ProcessGraphNode;