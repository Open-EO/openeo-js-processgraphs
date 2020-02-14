const ErrorList = require('./errorlist');
const JsonSchemaValidator = require('./jsonschema');
const ProcessGraphError = require('./error');
const ProcessGraphNode = require('./node');
const { Utils, MigrateProcessGraphs } = require('@openeo/js-commons');

module.exports = class ProcessGraph {

	constructor(processGraph, processRegistry, jsonSchemaValidator = null) {
		// ToDo: Add support to pass full process (incl parameter etc.)
		this.json = processGraph;
		this.processRegistry = processRegistry;
		this.jsonSchemaValidator = jsonSchemaValidator;
		this.nodes = {};
		this.startNodes = {};
		this.resultNode = null;
		this.children = [];
		this.parentNode = null;
		this.parentParameterName = null;
		this.parsed = false;
		this.validated = false;
		this.errors = new ErrorList();
		this.parameters = {};
	}

	static fromLegacy(processGraph, processRegistry, version) {
		processGraph = MigrateProcessGraphs.convertProcessGraphToLatestSpec(processGraph, version);
		return new ProcessGraph(processGraph, processRegistry);
	}

	toJSON() {
		return this.json;
	}

	getJsonSchemaValidator() {
		if (this.jsonSchemaValidator === null) {
			this.jsonSchemaValidator = this.createJsonSchemaValidatorInstance();
		}
		return this.jsonSchemaValidator;
	}

	createJsonSchemaValidatorInstance() {
		return new JsonSchemaValidator();
	}

	createNodeInstance(nodeObj, id, parent) {
		return new ProcessGraphNode(nodeObj, id, parent);
	}

	createProcessGraphInstance(processGraph) {
		return new ProcessGraph(processGraph, this.processRegistry, this.getJsonSchemaValidator());
	}

	getParentNode() {
		return this.parentNode;
	}

	getParent() {
		if (this.parentNode) {
			return this.parentNode.getProcessGraph();
		}
		return null;
	}

	setParent(parent, parameterName) {
		if (parent instanceof ProcessGraphNode) {
			this.parentNode = parent;
		}
		else {
			this.parentNode = null;
		}
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

		var makeError = (errorId) => {
			if (this.getParentProcessId()) {
				return new ProcessGraphError(
					errorId + 'Callback',
					{
						process_id: this.getParentProcessId(),
						node_id: this.parentNode ? this.parentNode.id : 'N/A'
					}
				);
			}
			else {
				return new ProcessGraphError(errorId);
			}
		};

		for(let id in this.nodes) {
			var node = this.nodes[id];

			if (node.isResultNode) {
				if (this.resultNode !== null) {
					throw makeError('MultipleResultNodes');
				}
				this.resultNode = node;
			}

			this.parseArguments(id, node);
		}

		if (!this.findStartNodes()) {
			throw makeError('StartNodeMissing');
		}
		if (this.resultNode === null) {
			throw makeError('ResultNodeMissing');
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
			if (throwOnErrors) {
				throw error;
			}
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

	async validateNodes(nodes, throwOnErrors, previousNode = null) {
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
					if (throwOnErrors) {
						throw e.first();
					}
				}
				else {
					this.addError(e);
					if (throwOnErrors) {
						throw e;
					}
				}
			}
			await this.validateNodes(node.getNextNodes(), throwOnErrors, node);
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
				case 'callback':
					arg.process_graph = this.createProcessGraph(arg.process_graph, node, argumentName);
					break;
				case 'parameter':
					// Nothing to do yet, will be checked at runtime only
					break;
				case 'array':
				case 'object':
					this.parseArguments(nodeId, node, arg);
					break;
			}
		}
	}

	createProcessGraph(json, node, argumentName) {
		var pg = this.createProcessGraphInstance(json);
		pg.setParent(node, argumentName);
		pg.parse();
		this.children.push(pg);
		return pg;
	}

	setParameters(parameters) {
		if (typeof parameters === 'object' && parameters !== null) {
			this.parameters = parameters;
		}
	}

	hasParameterDefault(/*name*/) {
		return false; // Not implemented yet
	}

	getParameterDefault(/*name*/) {
		return null; // Not implemented yet
	}

	hasParameter(name) {
		return typeof this.parameters[name] !== 'undefined';
	}

	getParameter(name) {
		return this.parameters[name];
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
		this.children.forEach(child => child.reset());
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

	getNodeCount() {
		return Utils.size(this.nodes);
	}

	getNodes() {
		return this.nodes;
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

	getParentProcessId() {
		if(this.node) {
			return this.node.process_id;
		}
		return null;
	}

	getParentProcess() {
		return this.processRegistry.get(this.getParentProcessId());
	}

	getCallbackParameter(name) {
		let cbParams = this.getCallbackParameters();
		let result = cbParams.filter(p => p.name === name);
		if (result.length === 1) {
			return result[0];
		}
		return null;
	}

	getCallbackParameters() {
		var process = this.getParentProcess();
		if (!this.parentParameterName || !Utils.isObject(process) || !Array.isArray(process.parameters)) {
			return [];
		}

		var schema = process.parameters.filter(p => p.name === this.parentParameterName);
		if (schema.length === 1 && Array.isArray(schema[0].parameters)) {
			return schema[0].parameters;
		}

		// ToDo: If a process parameter supports multiple different callbacks, i.e. reduce with either an array of two separate values, this
		// can't be separated accordingly and we just return all potential values. So it might happen that people get a successful validation
		// but they used the wrong callback parameters.
		// See issue https://github.com/Open-EO/openeo-js-processgraphs/issues/1

		var cbParams = [];
		var choice = Array.isArray(schema) ? schema : (schema.anyOf || schema.oneOf || schema.allOf);
		if (Array.isArray(choice)) {
			for(let i in choice) {
				var p = choice[i];
				if (Array.isArray(p.parameters)) {
					cbParams = cbParams.concat(p.parameters);
				}
			}
		}

		return cbParams;
	}

};