const ErrorList = require('./errorlist');
const JsonSchemaValidator = require('./jsonschema');
const ProcessGraphError = require('./error');
const ProcessGraphNode = require('./node');
const Utils = require('./utils');
const ProcessUtils = require('@openeo/js-commons/src/processUtils.js');

/**
 * Process parser, validator and executor.
 * 
 * @class
 */
class ProcessGraph {

	// ToDo: Also parse and validate other parts of the process, e.g. id, parameters, etc.

	constructor(process, processRegistry = null, jsonSchemaValidator = null) {
		this.process = process;
		this.nodes = {};
		this.startNodes = [];
		this.resultNode = null;
		this.children = [];
		this.parentNode = null;
		this.parentParameterName = null;
		this.parsed = false;
		this.validated = false;
		this.errors = new ErrorList();
		this.arguments = {};
		// Sub process graphs need to copy these:
		this.processRegistry = processRegistry;
		this.jsonSchemaValidator = jsonSchemaValidator;
		this.allowEmptyGraph = false;
		this.fillParameters = true;
		this.allowUndefinedParameterRefs = true;
	}

	toJSON() {
		return this.process;
	}

	getJsonSchemaValidator() {
		if (this.jsonSchemaValidator === null) {
			this.jsonSchemaValidator = this.createJsonSchemaValidatorInstance();
		}
		this.jsonSchemaValidator.setProcessGraphParser(this);
		return this.jsonSchemaValidator;
	}

	createJsonSchemaValidatorInstance() {
		return new JsonSchemaValidator();
	}

	createNodeInstance(nodeObj, id, parent) {
		return new ProcessGraphNode(nodeObj, id, parent);
	}

	createProcessGraphInstance(process) {
		let pg = new ProcessGraph(process, this.processRegistry, this.getJsonSchemaValidator());
		return this.copyProcessGraphInstanceProperties(pg);
	}

	copyProcessGraphInstanceProperties(pg) {
		pg.allowEmptyGraph = this.allowEmptyGraph;
		pg.fillParameters = this.fillParameters;
		pg.allowUndefinedParameterRefs = this.allowUndefinedParameterRefs;
		return pg;
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

	allowUndefinedParameters(allow = true) {
		this.allowUndefinedParameterRefs = allow;
	}

	fillUndefinedParameters(fill = true) {
		if (fill) {
			this.allowUndefinedParameterRefs = true;
		}
		this.fillParameters = fill;
	}

	allowEmpty(allow = true) {
		this.allowEmptyGraph = allow;
	}

	parse() {
		if (this.parsed) {
			return;
		}

		const makeError = (errorId) => {
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

		if (!Utils.isObject(this.process)) {
			throw makeError('ProcessMissing');
		}

		if (Utils.size(this.process.process_graph) === 0) {
			if (this.allowEmptyGraph) {
				this.parsed = true;
				return;
			}
			else {
				throw makeError('ProcessGraphMissing');
			}
		}

		this.nodes = Utils.mapObjectValues(this.process.process_graph, (pg, id) => this.createNodeInstance(pg, id, this));

		for(let id in this.nodes) {
			var node = this.nodes[id];
			if (node.isResultNode) {
				if (this.resultNode !== null) {
					throw makeError('MultipleResultNodes');
				}
				this.resultNode = node;
			}

			this.parseNodeArguments(id, node);
		}
		if (this.resultNode === null) {
			throw makeError('ResultNodeMissing');
		}

		// Find/Cache start nodes, only possible after parseNodeArguments have been called for all nodes
		// Sort nodes to ensure a consistent execution order
		this.startNodes = Object.values(this.nodes).filter(node => node.isStartNode()).sort((a,b) => a.id.localeCompare(b.id));
		if (this.startNodes.length === 0) {
			throw makeError('StartNodeMissing');
		}

		this.parsed = true;
	}

	async validate(throwOnErrors = true) {
		if (this.validated) {
			if (throwOnErrors && this.errors.count() > 0) {
				throw this.errors.first();
			}
			else {
				return this.errors;
			}
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
		this.allowUndefinedParameters(false);
		await this.validate();
		this.reset();
		this.setArguments(parameters);
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
		if (process) {
			return await process.validate(node);
		}
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

		return await Promise.all(promises);
	}

	async executeNode(node) {
		var process = this.getProcess(node);
		return await process.execute(node);
	}

	parseNodeArguments(nodeId, node, args) {
		if (typeof args === 'undefined') {
			args = node.arguments;
		}
		for(var argumentName in args) {
			var arg = args[argumentName];
			var type = Utils.getType(arg);
			switch(type) {
				case 'result':
					this.connectNodes(node, arg.from_node);
					break;
				case 'callback':
					args[argumentName] = this.createProcessGraph(arg, node, argumentName);
					break;
				case 'parameter':
					if (this.fillParameters && !this.hasParameter(arg.from_parameter) && !this.getCallbackParameter(arg.from_parameter)) {
						this.addParameter(arg.from_parameter);
					}
					break;
				case 'array':
				case 'object':
					this.parseNodeArguments(nodeId, node, arg);
					break;
			}
		}
	}

	createProcessGraph(process, node, argumentName) {
		var pg = this.createProcessGraphInstance(process);
		pg.setParent(node, argumentName);
		pg.parse();
		this.children.push(pg);
		return pg;
	}

	addParameter(name, description = '', schema = {}) {
		if (!Array.isArray(this.process.parameters)) {
			this.process.parameters = [];
		}
		this.process.parameters.push({
			name, description, schema
		});
	}

	hasParameterDefault(name) {
		return this.getParameterDefault(name) !== undefined;
	}

	getParameterDefault(name) {
		let param = this.getParameter(name);
		if (param !== null) {
			return param.default;
		}
		return undefined;
	}

	hasParameter(name) {
		return this.getParameter(name) !== null;
	}

	getParameters() {
		return Array.isArray(this.process.parameters) ? this.process.parameters : [];
	}

	getParameter(name) {
		return this.getParameters().find(p => p.name === name) || null;
	}

	setArguments(args) {
		if (typeof args === 'object' && args !== null) {
			this.arguments = args;
		}
	}

	hasArgument(name) {
		return typeof this.arguments[name] !== 'undefined';
	}

	getArgument(name) {
		return this.arguments[name];
	}

	connectNodes(node, prevNodeId) {
		var prevNode = this.nodes[prevNodeId];
		if (typeof prevNode === 'undefined') {
			throw new ProcessGraphError('ReferencedNodeMissing', {node_id: prevNodeId});
		}
		node.addPreviousNode(prevNode);
		prevNode.addNextNode(node);
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
		return this.startNodes;
	}

	getStartNodeIds() {
		return this.startNodes.map(node => node.id);
	}

	getNode(nodeId) {
		return nodeId in this.nodes ? this.nodes[nodeId] : null;
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

	/**
	 * Gets the process for the given process ID or node.
	 * 
	 * @param {ProcessGraphNode|string} id 
	 * @returns {object|null}
	 * @throws {ProcessGraphError} - ProcessUnsupported
	 */
	getProcess(id) {
		if (this.processRegistry === null) {
			return null;
		}
		if (id instanceof ProcessGraphNode) {
			id = id.process_id;
		}
		var process = this.processRegistry.get(id);
		if (process === null) {
			throw new ProcessGraphError('ProcessUnsupported', {process: id});
		}
		return process;
	}

	getParentProcessId() {
		if(this.getParentNode()) {
			return this.getParentNode().process_id;
		}
		return null;
	}

	getParentProcess() {
		if (this.processRegistry === null) {
			return null;
		}
		return this.processRegistry.get(this.getParentProcessId());
	}

	getCallbackParameter(name) {
		let cbParams = this.getCallbackParameters();
		return cbParams.find(p => p.name === name) || null;
	}

	getCallbackParameters() {		
		return ProcessUtils.getCallbackParametersForProcess(this.getParentProcess(), this.parentParameterName);
	}

}

module.exports = ProcessGraph;