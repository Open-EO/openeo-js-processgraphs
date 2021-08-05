const Utils = require('./utils');

const MESSAGES = {
	"MultipleResultNodes": "Multiple result nodes specified for the process.",
	"StartNodeMissing": "No start nodes found for the process.",
	"ResultNodeMissing": "No result node found for the process.",
	"ReferencedNodeMissing": "Referenced process node '{node_id}' doesn't exist.",
	"NodeIdInvalid": "Invalid node id specified in the process.",
	"NodeInvalid": "Process node '{node_id}' is not a valid object.",
	"ProcessIdMissing": "Process node '{node_id}' doesn't contain a process id.",
	"ProcessGraphParameterMissing": "Invalid parameter '{argument}' referenced in process node '{node_id}' (process: {process_id}, namespace: {namespace}).",
	"ProcessUnsupported": "Process '{process}' (namespace: {namespace}) is not supported.",
	"ProcessArgumentUnsupported": "Process '{process}' (namespace: {namespace}) does not support the following arguments: {arguments}",
	"ProcessArgumentRequired": "Process '{process}' (namespace: {namespace}) requires argument '{argument}'.",
	"ProcessArgumentInvalid": "The argument '{argument}' in process '{process}' (namespace: {namespace}) is invalid: {reason}",
	"ProcessGraphMissing": "No process graph specified",
	"ProcessMissing": "No process specified"
};

/**
 * An error class for this library.
 * 
 * @class
 */
class ProcessGraphError extends Error {

	constructor(codeOrMsg, variables = {}) {
		super();
		this.variables = variables;
		if (typeof MESSAGES[codeOrMsg] === 'string') {
			this.code = codeOrMsg;
			this.message = Utils.replacePlaceholders(MESSAGES[codeOrMsg], variables);
		}
		else {
			this.code = codeOrMsg.replace(/[^\w\d]+/g, '');
			this.message = codeOrMsg;
		}
	}

	toJSON() {
		return {
			code: this.code,
			message: this.message
		};
	}

}

module.exports = ProcessGraphError;