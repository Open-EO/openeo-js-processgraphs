const Utils = require('./utils');

const MESSAGES = {
	"MultipleResultNodes": "Multiple result nodes specified for process graph.",
	"StartNodeMissing": "No start nodes found for process graph.",
	"ResultNodeMissing": "No result node found for process graph.",
	"MultipleResultNodesCallback": "Multiple result nodes specified for the callback in the process '{process_id}' (node: '{node_id}').",
	"StartNodeMissingCallback": "No start nodes found for the callback in the process '{process_id}' (node: '{node_id}')'.",
	"ResultNodeMissingCallback": "No result node found for the callback in the process '{process_id}' (node: '{node_id}').",
	"ReferencedNodeMissing": "Referenced node '{node_id}' doesn't exist.",
	"NodeIdInvalid": "Invalid node id specified in process graph.",
	"NodeInvalid": "Process graph node '{node_id}' is not a valid object.",
	"ProcessIdMissing": "Process graph node '{node_id}' doesn't contain a process id.",
	"ProcessGraphParameterMissing": "Invalid parameter '{argument}' requested in the process '{process_id}' (node: '{node_id}').",
	"ProcessUnsupported": "Process '{process}' is not supported.",
	"ProcessArgumentUnsupported": "Process '{process}' does not support the following arguments: {arguments}",
	"ProcessArgumentRequired": "Process '{process}' requires argument '{argument}'.",
	"ProcessArgumentInvalid": "The argument '{argument}' in process '{process}' is invalid: {reason}",
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