const JsonSchemaValidator = require('./jsonschema');
const ProcessGraphError = require('./error');
const ProcessGraph = require('./processgraph');
const ProcessUtils = require('@openeo/js-commons/src/processUtils');
const Utils = require('./utils');

/**
 * Base Process class
 * 
 * @class
 */
class BaseProcess {

	constructor(spec) {
		this.spec = spec; // Keep original specification data

		// Make properties easily accessible 
		Object.assign(this, spec);
	}

	toJSON() {
		return this.spec;
	}

	async validate(node) {
		// Check for arguments we don't support and throw error
		let unsupportedArgs = node.getArgumentNames().filter(name => this.parameters.findIndex(p => p.name === name) === -1);
		if (unsupportedArgs.length > 0) {
			throw new ProcessGraphError('ProcessArgumentUnsupported', {
				process: this.id,
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
						argument: param.name
					});
				}
				else {
					continue;
				}
			}
			let arg = node.getParsedArgument(param.name);
			if (await this.validateArgument(arg, node, param.name, param)) {
				continue;
			}
			throw new ProcessGraphError('ProcessArgumentInvalid', {
				process: this.id,
				argument: param.name,
				reason: "Can't validate argument"
			});
		}
	}

	async validateArgument(arg, node, parameterName, param) {
		let argType = Utils.getType(arg);
		switch(argType) {
			case 'parameter':
				var cbParam = node.getProcessGraph().getCallbackParameter(arg.from_parameter);
				if (cbParam) {
					if (!JsonSchemaValidator.isSchemaCompatible(param.schema, cbParam)) {
						throw new ProcessGraphError('ProcessArgumentInvalid', {
							process: this.id,
							argument: parameterName,
							reason: "Schema for parameter '" + arg.from_parameter + "' not compatible"
						});
					}
					else {
						return true; // Parameter not available, nothing to validate against
					}
				}
				else {
					node.getProcessGraphParameter(arg.from_parameter);
					return true;
				} // jshint ignore:line
			case 'result':
				var pg = node.getProcessGraph();
				var resultNode = pg.getNode(arg.from_node);
				var process = pg.getProcess(resultNode);
				if (JsonSchemaValidator.isSchemaCompatible(param.schema, process.returns.schema)) {
					return true;
				}
				throw new ProcessGraphError('ProcessArgumentInvalid', {
					process: this.id,
					argument: parameterName,
					reason: "Schema for result '" + arg.from_node + "' not compatible"
				});
			case 'array':
			case 'object':
				if (!(arg instanceof ProcessGraph) && Utils.containsRef(arg)) {
					// This tries to at least be compliant to one of the element schemas
					// It's better than validating nothing, but it's still not 100% correct
					let schemas = ProcessUtils.normalizeJsonSchema(param.schema);
					for(var key in arg) {
						let elementSchema = schemas.map(schema =>  ProcessUtils.getElementJsonSchema(schema, key)).filter(schema => Object.keys(schema).length); // jshint ignore:line
						if (elementSchema.length > 0) {
							let validated = 0;
							let lastError = null;
							for(let schema of elementSchema) {
								try {
									// ToDo: Check against JSON schema required property
									await this.validateArgument(arg[key], node, parameterName + "." + key, {schema});
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
					return true;
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
						argument: parameterName,
						reason: errors
					});
				}
		}

		return true;
	}

	/* istanbul ignore next */
	async execute(/*node*/) {
		throw "execute not implemented yet";
	}

	/* istanbul ignore next */
	test() {
		// Run the tests from the examples
		throw "test not implemented yet";
	}

}

module.exports =  BaseProcess;