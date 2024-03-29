const BaseProcess = require('./process');
const ErrorList = require('./errorlist');
const JsonSchemaValidator = require('./jsonschema');
const ProcessGraphError = require('./error');
const ProcessGraphNode = require('./node');
const Utils = require('./utils');
const ProcessUtils = require('@openeo/js-commons/src/processUtils.js');

const processKeys = [
	'id',
	'summary',
	'description',
	'categories',
	'parameters',
	'returns',
	'deprecated',
	'experimental',
	'exceptions',
	'examples',
	'links',
	'process_graph'
];

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
		this.parsed = false;
		this.validated = false;
		this.errors = new ErrorList();
		this.callbackParameters = [];
		// Sub process graphs need to copy these:
		this.processRegistry = processRegistry;
		this.jsonSchemaValidator = jsonSchemaValidator;
		this.arguments = {};
		this.allowEmptyGraph = false;
		this.fillProcessParameters = false;
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

	createProcessInstance(process) {
		return new BaseProcess(process);
	}

	copyProcessGraphInstanceProperties(pg) {
		pg.allowEmptyGraph = this.allowEmptyGraph;
		pg.fillProcessParameters = this.fillProcessParameters;
		pg.allowUndefinedParameterRefs = this.allowUndefinedParameterRefs;
		return pg;
	}

	createChildProcessGraph(process, node, parameterPath = []) {
		var pg = this.createProcessGraphInstance(process);
		pg.setArguments(this.arguments);
		pg.setParentNode(node);
		if (parameterPath.length > 0) {
			let parameterName = parameterPath.shift();
			pg.setCallbackParameters(ProcessUtils.getCallbackParametersForProcess(pg.getParentProcess(), parameterName, parameterPath));
		}
		pg.parse();
		this.children.push(pg);
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

	setParentNode(parent) {
		if (parent instanceof ProcessGraphNode) {
			this.parentNode = parent;
		}
		else {
			this.parentNode = null;
		}
	}

	isValid() {
		return this.validated && this.errors.count() === 0;
	}

	addError(error) {
		this.errors.add(error);
	}

	allowUndefinedParameters(allow = true) {
		if (!allow) {
			this.fillProcessParameters = false;
		}
		this.allowUndefinedParameterRefs = allow;
	}

	fillUndefinedParameters(fill = true) {
		if (fill) {
			this.allowUndefinedParameterRefs = true;
		}
		this.fillProcessParameters = fill;
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
				let hasProcessKey = Object.keys(this.process).find(key => processKeys.includes(key));
				if (Utils.size(this.process) === 0 || hasProcessKey) {
					this.parsed = true;
					return;
				}
			}
			throw makeError('ProcessGraphMissing');
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

	async execute(args = null) {
		this.allowUndefinedParameters(false);
		this.setArguments(args);
		await this.validate();
		this.reset();
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

	parseNodeArguments(nodeId, node, parameterPath = [], args = undefined) {
		if (typeof args === 'undefined') {
			args = node.arguments;
		}
		for(let argumentName in args) {
			let arg = args[argumentName];
			// Make a "path" that consists of the parameter name and the keys of arrays/objects, if applicable.
			let path = parameterPath.concat([argumentName]);
			let type = Utils.getType(arg);
			switch(type) {
				case 'result':
					// Connect the nodes with each other
					var prevNode = this.nodes[arg.from_node];
					if (typeof prevNode === 'undefined') {
						throw new ProcessGraphError('ReferencedNodeMissing', {node_id: arg.from_node});
					}
					node.addPreviousNode(prevNode);
					prevNode.addNextNode(node);
					break;
				case 'callback':
					// Create a new process graph for the callback
					args[argumentName] = this.createChildProcessGraph(arg, node, path);
					break;
				case 'parameter':
					// If we found a parameter and it's not defined yet (includes that it's not a callback parameter) and fillProcessParameters is set to true: Add it to the process spec.
					if (this.fillProcessParameters && !this.hasParameter(arg.from_parameter)) {
						this.addProcessParameter(arg.from_parameter);
					}
					break;
				case 'array':
				case 'object':
					// Parse everything hidden in arrays and objects
					this.parseNodeArguments(nodeId, node, path, arg);
					break;
			}
		}
	}

	setCallbackParameters(parameters) {
		this.callbackParameters = parameters;
	}

	getCallbackParameter(name) {
		return this.getCallbackParameters().find(p => p.name === name) || null;
	}

	getCallbackParameters() {		
		return this.callbackParameters;
	}

	addProcessParameter(name, description = '', schema = {}) {
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

	getProcessParameters(includeUndefined = false) {
		let parameters = Array.isArray(this.process.parameters) ? this.process.parameters.slice(0) : [];
		if (includeUndefined && !this.fillProcessParameters) {
			for (let key in this.nodes) {
				let refs = this.nodes[key].getRefs();
				for(let ref of refs) {
					if (ref.from_parameter && !parameters.find(other => other.name === ref.from_parameter)) { // jshint ignore:line
						parameters.push({
							name: ref.from_parameter,
							description: '',
							schema: {}
						});
					}
				}
			}
		}
		return parameters;
	}

	getProcessParameter(name, includeUndefined = false) {
		return this.getProcessParameters(includeUndefined).find(p => p.name === name) || null;
	}

	getParameter(name) {
		let callbackParam = this.getCallbackParameter(name);
		let processParam = this.getProcessParameter(name);
		if (callbackParam && processParam) {
			// ToDo: Take https://github.com/Open-EO/openeo-api/issues/332 into account
			return Object.assign({}, callbackParam, processParam);
		}
		else if (callbackParam) {
			return callbackParam;
		}
		else if (processParam) {
			return processParam;
		}
		return null;
	}

	setArguments(args) {
		if (Utils.isObject(args)) {
			Object.assign(this.arguments, args);
		}
	}

	hasArgument(name) {
		return typeof this.arguments[name] !== 'undefined';
	}

	getArgument(name) {
		return this.arguments[name];
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
	 * @param {ProcessGraphNode|string} process 
	 * @param {?string} [namespace=null]
	 * @returns {object|null}
	 * @throws {ProcessGraphError} - ProcessUnsupported
	 */
	getProcess(process, namespace = null) {
		if (this.processRegistry === null) {
			return null;
		}
		let id;
		if (process instanceof ProcessGraphNode) {
			id = process.process_id;
			namespace = process.namespace;
		}
		else {
			id = process;
		}
		let spec = this.processRegistry.get(id, namespace);
		if (spec === null) {
			throw new ProcessGraphError('ProcessUnsupported', {process: id, namespace: namespace || 'n/a'});
		}
		return this.createProcessInstance(spec);
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

}

module.exports = ProcessGraph;