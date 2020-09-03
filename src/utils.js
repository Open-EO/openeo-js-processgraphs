const CommonUtils = require('@openeo/js-commons/src/utils.js');

/**
 * Utilities
 * 
 * @class
 */
class Utils extends CommonUtils {

	/**
	 * Checks whether a value contains references (from_parameter, from_node).
	 * 
	 * Doesn't return references from ProcessGraph objects if checkCallbacks is set to true.
	 * 
	 * @param {*} value 
	 * @param {boolean} checkProcess - Set to `false` to not check for refs in a process if provided as value.
	 * @param {boolean} checkCallbacks - Set to `true` to also check for refs in callbacks. Only applies if `checkProcess` is true.
	 * @returns {boolean}
	 */
	static containsRef(value, checkProcess = true, checkCallbacks = false) {
		let type = Utils.getType(value);
		switch(type) {
			case 'result':
			case 'parameter':
				return true;
			case 'callback':
				if (checkProcess && Utils.containsRef(value.process_graph, checkCallbacks, checkCallbacks)) {
					return true;
				}
				break;
			case 'array':
			case 'object':
				for(let key in value) {
					if (Utils.containsRef(value[key], checkProcess, checkCallbacks)) {
						return true;
					}
				}
		}
		return false;
	}

	/**
	 * Returns all distinct references (from_parameter, from_node) contained in a value.
	 * 
	 * Doesn't return references from ProcessGraph objects if checkCallbacks is set to true.
	 * 
	 * @param {*} value 
	 * @param {boolean} getFromProcess - Set to `false` to not get refs from a process if provided as value.
	 * @param {boolean} getFromCallbacks - Set to `true` to also include refs in callbacks. Only applies if `getFromProcess` is true.
	 * @returns {boolean}
	 */
	static getRefs(value, getFromProcess = true, getFromCallbacks = false) {
		var store = [];
		var type = Utils.getType(value);
		switch(type) {
			case 'result':
			case 'parameter':
				store.push(value);
				break;
			case 'callback':
				if (getFromProcess) {
					store = store.concat(Utils.getRefs(value.process_graph, getFromCallbacks, getFromCallbacks));
				}
				break;
			case 'array':
			case 'object':
				for(var key in value) {
					store = store.concat(Utils.getRefs(value[key], getFromProcess, getFromCallbacks));
				}
				break;
		}
		return Utils.unique(store, true);
	}

	/**
	 * Returns the type of the value.
	 * 
	 * Similar to typeof, but gives more details for objects (array, parameter, callback, result, null, object).
	 * 
	 * @param {*} value 
	 * @returns {string}
	 */
	static getType(value) {
		const ProcessGraph = require('./processgraph');
		if (typeof value === 'object') {
			if (value === null) {
				return 'null';
			}
			else if (Array.isArray(value)) {
				return 'array';
			}
			else if(value.hasOwnProperty("process_graph") || value instanceof ProcessGraph) {
				return 'callback';
			}
			else if(value.hasOwnProperty("from_node")) {
				return 'result';
			}
			else if(value.hasOwnProperty("from_parameter")) {
				return 'parameter';
			}
			else {
				return 'object';
			}
		}
		return (typeof value);
	}

}

module.exports = Utils;