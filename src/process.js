const JsonSchemaValidator = require('./jsonschema');
const ProcessGraphError = require('./error');
const ProcessGraphNode = require('./node');
const ProcessGraph = require('./processgraph');

module.exports = class BaseProcess {

	constructor(spec) {
		this.spec = spec; // Keep original specification data

		// Make properties easily accessible 
		Object.assign(this, spec);
		// Convert parameters to object
		if (Array.isArray(this.parameters)) {
			let params = {};
			for(var param of this.parameters) {
				params[param.name] = param;
			}
			this.parameters = params;
		}
		else {
			this.parameters = {};
		}

	}

	async validate(node) {
		// Check for arguments we don't support and throw error
		let unsupportedArgs = node.getArgumentNames().filter(name => !(name in this.parameters));
		if (unsupportedArgs.length > 0) {
			throw new ProcessGraphError('ProcessArgumentUnsupported', {
				process: this.id,
				arguments: unsupportedArgs
			});
		}

		let validator = node.getProcessGraph().getJsonSchemaValidator();
		// Validate against JSON Schema
		for(let name in this.parameters) {
			let param = this.parameters[name];

			let arg = node.getRawArgument(name);
			if (await this.validateArgument(arg, node, name, param)) {
				continue;
			}

			// Validate against JSON schema
			let errors = await validator.validateValue(arg, param.schema);
			if (errors.length > 0) {
				throw new ProcessGraphError('ProcessArgumentInvalid', {
					process: this.id,
					argument: name,
					reason: errors
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
						process: this.id,
						argument: parameterName
					});
				}
				// Parameter not set, nothing to validate against
				return true;
			case 'parameter':
				var cbParam = node.getProcessGraph().getCallbackParameter(arg.from_parameter);
				if (cbParam) {
					return JsonSchemaValidator.isSchemaCompatible(param.schema, cbParam);
				}
				// Parameter not set, nothing to validate against
				return true;
			case 'result':
				try {
					var pg = node.getProcessGraph();
					var process_id = pg.getNode(arg.from_node).process_id;
					var process = pg.getProcess(process_id);
					return JsonSchemaValidator.isSchemaCompatible(param.schema, process.returns.schema);
				} catch (e) {}
				break;
			case 'array':
			case 'object':
				// ToDo: Check how we can validate arrays and objects that have references to callback arguments and node results in them...
				// See issue https://github.com/Open-EO/openeo-js-processgraphs/issues/2
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