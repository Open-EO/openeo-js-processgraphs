const JsonSchemaValidator = require('./jsonschema');
const ProcessGraphError = require('./error');
const ProcessGraphNode = require('./node');
const ProcessGraph = require('./processgraph');

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
				// No need for further checks, callback argument is validated in processgraph.js: see parseCallbackArgument()
				return JsonSchemaValidator.isSchemaCompatible(param.schema, cbParams[arg.from_argument]);
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
				// ToDo: Check how we can validate arrays and objects that have references to callback arguments, variables and node results in them...
				// See issue https://github.com/Open-EO/openeo-js-commons/issues/5
//				for(var i in arg) {
//					await this.validateArgument(arg[i], node, parameterName, param);
//				}
				return true;
		}

		return false;
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

};