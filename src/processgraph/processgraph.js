const ErrorList = require('../errorlist');
const ProcessGraphError = require('./error');
const ProcessGraphNode = require('./node');
const Utils = require('../utils');

const VARIABLE_TYPES = ['string', 'number', 'boolean', 'array', 'object'];

module.exports = class ProcessGraph {

	constructor(jsonProcessGraph, processRegistry) {
		this.json = Utils.mergeDeep({}, jsonProcessGraph);
		this.processRegistry = processRegistry;
		this.nodes = [];
		this.startNodes = {};
		this.resultNode = null;
		this.childrenProcessGraphs = [];
		this.parentNode = null;
		this.parentParameterName = null;
		this.variables = {};
		this.parsed = false;
		this.validated = false;
		this.errors = new ErrorList();
		this.parameters = {};
	}

	// Important: This avoids circular reference errors
	toJSON() {
		return this.json;
	}

	createNodeInstance(json, id, parent) {
		return new ProcessGraphNode(json, id, parent);
	}

	createProcessGraphInstance(json) {
		return new ProcessGraph(json, this.processRegistry);
	}

	setParent(node, parameterName) {
		this.parentNode = node;
		this.parentParameterName = parameterName;
	}

	isValid() {
		return this.validated && this.errors.count() === 0;
	}

	addError(error) {
		this.errors.add(error);
	}

	parse() {
		if (this.parsed) {
			return;
		}

		for(let id in this.json) {
			this.nodes[id] = this.createNodeInstance(this.json[id], id, this);
		}

		for(let id in this.nodes) {
			var node = this.nodes[id];

			if (node.isResultNode) {
				if (this.resultNode !== null) {
					throw this.parentNode ? new ProcessGraphError('MultipleResultNodesCallback', {node_id: this.parentNode.id, process_id: this.parentNode.process_id}) : new ProcessGraphError('MultipleResultNodes');
				}
				this.resultNode = node;
			}

			this.parseArguments(id, node);
		}

		if (!this.findStartNodes()) {
			throw this.parentNode ? new ProcessGraphError('StartNodeMissingCallback', {node_id: this.parentNode.id, process_id: this.parentNode.process_id}) : new ProcessGraphError('StartNodeMissing');
		}
		if (this.resultNode === null) {
			throw this.parentNode ? new ProcessGraphError('ResultNodeMissingCallback', {node_id: this.parentNode.id, process_id: this.parentNode.process_id}) : new ProcessGraphError('ResultNodeMissing');
		}

		this.parsed = true;
	}

	async validate(throwOnErrors = true) {
		if (this.validated) {
			return null;
		}

		this.validated = true;

		// Parse
		try {
			this.parse();
		} catch (error) {
			this.addError(error);
		}

		// Validate
		await this.validateNodes(this.getStartNodes(), throwOnErrors);
		return this.errors;
	}

	async execute(parameters = null) {
		await this.validate();
		this.reset();
		this.setParameters(parameters);
		await this.executeNodes(this.getStartNodes());
		return this.getResultNode();
	}

	async validateNodes(nodes, throwsOnErrors, previousNode = null) {
		if (nodes.length === 0) {
			return;
		}

		var promises = nodes.map(async (node) => {
			// Validate this node after all dependencies are available
			if (!node.solveDependency(previousNode)) {
				return;
			}

			// Get process and validate
			try {
				await this.validateNode(node);
			} catch (e) {
				if (e instanceof ErrorList) {
					this.errors.merge(e);
					if (throwsOnErrors) {
						throw e.first();
					}
				}
				else {
					this.addError(e);
					if (throwsOnErrors) {
						throw e;
					}
				}
			}
			await this.validateNodes(node.getNextNodes(), throwsOnErrors, node);
		});

		await Promise.all(promises);
	}

	async validateNode(node) {
		var process = this.getProcess(node);
		return await process.validate(node);
	}

	async executeNodes(nodes, previousNode = null) {
		if (nodes.length === 0) {
			return;
		}

		var promises = nodes.map(async (node) => {
			// Execute this node after all dependencies are available
			if (!node.solveDependency(previousNode)) {
				return;
			}

			var result = await this.executeNode(node);
			node.setResult(result);

			// Execute next nodes in chain
			await this.executeNodes(node.getNextNodes(), node);

		});

		return Promise.all(promises);
	}

	async executeNode(node) {
		var process = this.getProcess(node);
		return await process.execute(node);
	}

	parseArguments(nodeId, node, args) {
		if (typeof args === 'undefined') {
			args = node.arguments;
		}
		for(var argumentName in args) {
			var arg = args[argumentName];
			var type = ProcessGraphNode.getType(arg);
			switch(type) {
				case 'result':
					this.connectNodes(node, arg.from_node);
					break;
				case 'variable':
					this.parseVariable(arg);
					break;
				case 'callback':
					arg.callback = this.createProcessGraph(arg.callback, node, argumentName);
					break;
				case 'callback-argument':
					this.parseCallbackArgument(node, arg.from_argument);
					break;
				case 'array':
				case 'object':
					this.parseArguments(nodeId, node, arg);
					break;
			}
		}
	}

	parseCallbackArgument(/*node, name*/) {
		// ToDo: Parse callback argument
	}

	createProcessGraph(json, node, argumentName) {
		var pg = this.createProcessGraphInstance(json);
		pg.setParent(node, argumentName);
		pg.parse();
		this.childrenProcessGraphs.push(pg);
		return pg;
	}

	parseVariable(variable) {
		// Check whether the variable id is valid
		if (typeof variable.variable_id !== 'string') {
			throw new ProcessGraphError('VariableIdInvalid');
		}
		var obj = {};

		// Check whether the data type is valid
		if (typeof variable.type !== 'undefined' && !VARIABLE_TYPES.includes(variable.type)) {
			throw new ProcessGraphError('VariableTypeInvalid', variable);
		}
		obj.type = typeof variable.type !== 'undefined' ? variable.type : 'string';

		// Check whether the defult value has the correct data type
		var defaultType = ProcessGraphNode.getType(variable.default);
		if (defaultType !== 'undefined') {
			if (defaultType !== obj.type) {
				throw new ProcessGraphError('VariableDefaultValueTypeInvalid', variable);
			}
			else {
				obj.value = variable.default;
			}
		}
	}

	setParameters(parameters) {
		if (typeof parameters === 'object' && parameters !== null) {
			this.parameters = parameters;
		}
	}

	getParameter(name) {
		return this.parameters[name];
	}

	setVariableValues(variables) {
		for(var i in variables) {
			this.setVariable(i, variables[i]);
		}
	}

	setVariableValue(id, value) {
		if (typeof this.variables[id] !== 'object') {
			this.variables[id] = {};
		}
		this.variables[id].value = value;
	}

	getVariableValue(id) {
		var variable = this.variables[id];
		if (typeof variable !== 'object' || typeof variable.value === 'undefined') {
			throw new ProcessGraphError('VariableValueMissing', {variable_id: id});
		}
		var type = ProcessGraphNode.getType(variable.value);
		if (type !== variable.type) {
			throw new ProcessGraphError('VariableValueTypeInvalid', {variable_id: id, type: variable.type});
		}

		return this.variables[id].value;
	}

	connectNodes(node, prevNodeId) {
		var prevNode = this.nodes[prevNodeId];
		if (typeof prevNode === 'undefined') {
			throw new ProcessGraphError('ReferencedNodeMissing', {node_id: prevNodeId});
		}
		node.addPreviousNode(prevNode);
		prevNode.addNextNode(node);
	}

	findStartNodes() {
		var found = false;
		for(var id in this.nodes) {
			var node = this.nodes[id];
			if (node.isStartNode()) {
				this.startNodes[id] = node;
				found = true;
			}
		}
		return found;
	}

	reset() {
		for(var id in this.nodes) {
			this.nodes[id].reset();
		}
		this.childrenProcessGraphs.forEach(child => child.reset());
	}

	getResultNode() {
		return this.resultNode;
	}

	getStartNodes() {
		return Object.values(this.startNodes);
	}

	getStartNodeIds() {
		return Object.keys(this.startNodes);
	}

	getNode(nodeId) {
		return this.nodes[nodeId];
	}

	getNodes() {
		return this.nodes;
	}

	getJson() {
		return this.json;
	}

	getErrors() {
		return this.errors;
	}

	getProcess(node) {
		var process = this.processRegistry.get(node.process_id);
		if (process === null) {
			throw new ProcessGraphError('ProcessUnsupported', {process: node.process_id});
		}
		return process;
	}

	getCallbackParameters() {
		if (!this.parentNode || !this.parentParameterName) {
			return {};
		}

		var process = this.getProcess(this.parentNode);
		var schema = process.schema.parameters[this.parentParameterName].schema;
		if (Utils.isObject(schema.parameters)) {
			return schema.parameters;
		}

		// ToDo: If a process parameter supports multiple different callbacks, i.e. reduce with either an array of two separate values, this
		// can't be separated accordingly and we just return all potential values. So it might happen that people get a successful validation
		// but they used the wrong callback parameters.

		var cbParams = {};
		var choice = schema.anyOf || schema.oneOf || schema.allOf;
		if (Array.isArray(choice)) {
			for(let i in choice) {
				var p = choice[i];
				if (Utils.isObject(p.parameters)) {
					Object.assign(cbParams, p.parameters);
				}
			}
		}

		return cbParams;
	}

};