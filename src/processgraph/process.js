const JsonSchemaValidator = require('./jsonschema');
const ProcessGraphError = require('./error');
const ProcessGraphNode = require('./node');
const ProcessGraph = require('./processgraph');
const Utils = require('../utils');

module.exports = class BaseProcess {

	constructor(schema, validator = null) {
		this.schema = schema;
		if (validator === null) {
			this.jsonSchema = new JsonSchemaValidator();
		}
		else {
			this.jsonSchema = validator;
		}
	}

	async validate(node) {
		// Check for arguments we don't support and throw error
		var unsupportedArgs = node.getArgumentNames().filter(name => (typeof this.schema.parameters[name] === 'undefined'));
		if (unsupportedArgs.length > 0) {
			throw new ProcessGraphError('ProcessArgumentUnsupported', {
				process: this.schema.id,
				argument: unsupportedArgs[0]
			});
		}

		// Validate against JSON Schema
		for(let name in this.schema.parameters) {
			let param = this.schema.parameters[name];

			let arg = node.getRawArgument(name);
			if (await this.validateArgument(arg, node, name, param)) {
				continue;
			}

			// Validate against JSON schema
			let errors = await this.jsonSchema.validateJson(arg, param.schema);
			if (errors.length > 0) {
				throw new ProcessGraphError('ProcessArgumentInvalid', {
					process: this.schema.id,
					argument: name,
					reason: errors.join("; ")
				});
			}
		}
	}

	async validateArgument(arg, node, parameterName, param) {
		let argType = ProcessGraphNode.getType(arg);
		if (arg instanceof ProcessGraph) {
			await arg.validate(true);
			return true;
		}
		switch(argType) {
			// Check whether parameter is required
			case 'undefined':
				if (param.required) {
					throw new ProcessGraphError('ProcessArgumentRequired', {
						process: this.schema.id,
						argument: parameterName
					});
				}
				return true; // Parameter not set, nothing to validate against
			case 'callback-argument':
				var cbParams = node.getProcessGraph().getCallbackParameters();
				if (Utils.isObject(cbParams) && cbParams.hasOwnProperty(arg.from_argument)) {
					return JsonSchemaValidator.isSchemaCompatible(param.schema, cbParams[arg.from_argument]);
				}
				else {
					throw new ProcessGraphError('CallbackArgumentInvalid', {
						argument: arg.from_argument,
						node_id: node.id,
						process_id: this.schema.id
					});
				}
			case 'variable':
				var variableSchema = {
					type: arg.type || 'string'
				};
				return JsonSchemaValidator.isSchemaCompatible(param.schema, variableSchema);
			case 'result':
				try {
					var pg = node.getProcessGraph();
					var process_id = pg.getNode(arg.from_node).process_id;
					var process = pg.getProcess(process_id);
					return JsonSchemaValidator.isSchemaCompatible(param.schema, process.schema.returns.schema);
				} catch (e) {}
				break;
			case 'array':
			case 'object':
				for(var i in arg) {
					await this.validateArgument(arg[i], node, parameterName);
				}
				return true; // ToDo: Remove this and check how we can validate arrays and objects that have references to callback arguments, variables and node results in them...
				break;
		}

		return false;
	}

	async execute(node) {
		throw "execute not implemented yet";
	}

	test() {
		// Run the tests from the examples
		throw "test not implemented yet";
	}

};