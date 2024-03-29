const JsonSchemaValidator = require('./jsonschema');
const ProcessGraphError = require('./error');
const ProcessUtils = require('@openeo/js-commons/src/processUtils');
const Utils = require('./utils');

/**
 * Base Process class
 * 
 * @class
 */
class BaseProcess {

	constructor(spec) {
		// Make properties easily accessible 
		Object.assign(this, spec);

		if (typeof this.id !== 'string') {
			throw new Error("Invalid process specified, no id given.");
		}
		if (!Array.isArray(this.parameters)) {
			this.parameters = [];
		}
	}

	toJSON() {
		return Utils.omitFromObject(this, ["validate", "validateArgument", "execute", "test"]);
	}

	async validate(node) {
		// Check for arguments we don't support and throw error
		let unsupportedArgs = node.getArgumentNames().filter(name => this.parameters.findIndex(p => p.name === name) === -1);
		if (unsupportedArgs.length > 0) {
			throw new ProcessGraphError('ProcessArgumentUnsupported', {
				process: this.id,
				namespace: this.namespace || 'n/a',
				arguments: unsupportedArgs
			});
		}

		// Validate against JSON Schema
		for(let key in this.parameters) {
			let param = this.parameters[key];

			if (!node.hasArgument(param.name)) {
				if (!param.optional) {
					throw new ProcessGraphError('ProcessArgumentRequired', {
						process: this.id,
						namespace: this.namespace || 'n/a',
						argument: param.name
					});
				}
				else {
					continue;
				}
			}
			let arg = node.getParsedArgument(param.name);
			let rawArg = node.getRawArgument(param.name);
			await this.validateArgument(arg, rawArg, node, param);
		}
	}

	async validateArgument(arg, rawArg, node, param, path = null) {
		if (!path) {
			path = param.name;
		}
		let argType = Utils.getType(arg);
		let pg = node.getProcessGraph();
		switch(argType) {
			case 'parameter':
				// Validate callback parameters (no value available yet)
				let callbackParam = pg.getCallbackParameter(arg.from_parameter);
				if (callbackParam) {
					if (!JsonSchemaValidator.isSchemaCompatible(param.schema, callbackParam.schema)) {
						throw new ProcessGraphError('ProcessArgumentInvalid', {
							process: this.id,
							namespace: this.namespace || 'n/a',
							argument: path,
							reason: "Schema for parameter '" + arg.from_parameter + "' not compatible with reference"
						});
					}
					return;
				}

				// Validate all other parameters
				let value = node.getProcessGraphParameterValue(arg.from_parameter);
				let parameter = pg.getProcessParameter(arg.from_parameter);
				if (Utils.isObject(parameter) && parameter.schema) {
					if (typeof value !== 'undefined') {
						await this.validateArgument(value, rawArg, node, parameter, path);
					}
					if (!JsonSchemaValidator.isSchemaCompatible(param.schema, parameter.schema)) {
						throw new ProcessGraphError('ProcessArgumentInvalid', {
							process: this.id,
							namespace: this.namespace || 'n/a',
							argument: path,
							reason: "Schema for parameter '" + arg.from_parameter + "' not compatible"
						});
					}
				}
				// else: Parameter not available, everything is valid
				break;
			case 'result':
				let resultNode = pg.getNode(arg.from_node);
				let process = pg.getProcess(resultNode);
				if (!JsonSchemaValidator.isSchemaCompatible(param.schema, process.returns.schema)) {
					throw new ProcessGraphError('ProcessArgumentInvalid', {
						process: this.id,
						namespace: this.namespace || 'n/a',
						argument: path,
						reason: "Schema for result '" + arg.from_node + "' not compatible"
					});
				}
				break;
			case 'array':
			case 'object':
				let schemas = ProcessUtils.normalizeJsonSchema(param.schema).filter(schema => ['array', 'object'].includes(schema.type));
				// Check if it is expected to be a process. If yes, do normal validation. Handles the issue discussed in https://github.com/Open-EO/openeo-js-processgraphs/issues/4
				let isProcessGraphSchema = (schemas.length === 1 && schemas[0].subtype === 'process-graph');
				if (Utils.containsRef(rawArg) && !isProcessGraphSchema) {
					// This tries to at least be compliant to one of the element schemas
					// It's better than validating nothing, but it's still not 100% correct
					for(var key in arg) {
						let elementSchema = schemas.map(schema =>  ProcessUtils.getElementJsonSchema(schema, key)).filter(schema => Object.keys(schema).length); // jshint ignore:line
						if (elementSchema.length > 0) {
							let validated = 0;
							let lastError = null;
							for(let schema of elementSchema) {
								try {
									// ToDo: Check against JSON schema required property
									await this.validateArgument(arg[key], rawArg[key], node, {schema}, path + '/' + key);
									validated++;
								} catch (error) {
									lastError = error;
								}
							}
							if (validated === 0 && lastError) {
								throw lastError;
							}
						}
					}
					return;
				}
				else {
					// Use default behavior below, so no break; needed
				} // jshint ignore:line
			default:
				let validator = node.getProcessGraph().getJsonSchemaValidator();
				// Validate against JSON schema
				let errors = await validator.validateValue(arg, param.schema);
				if (errors.length > 0) {
					throw new ProcessGraphError('ProcessArgumentInvalid', {
						process: this.id,
						namespace: this.namespace || 'n/a',
						argument: path,
						reason: errors
					});
				}
		}
	}

	/* istanbul ignore next */
	async execute(/*node*/) {
		throw new Error(`execute not implemented yet for process '${this.id}' (namespace: ${this.namespace || 'n/a'})`);
	}

	/* istanbul ignore next */
	test() {
		// Run the tests from the examples
		throw new Error(`test not implemented yet for process '${this.id}' (namespace: ${this.namespace || 'n/a'})`);
	}

}

module.exports =  BaseProcess;