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
	 * @param {*} value 
	 * @param {boolean} checkCallbacks - Set to `true` to also check for refs in callbacks.
	 * @returns {boolean}
	 */
	static containsRef(value, checkCallbacks = false, depth = 0) {
		let type = Utils.getType(value);
		switch(type) {
			case 'result':
			case 'parameter':
				return true;
			case 'callback':
				if ((depth === 0 || checkCallbacks) && Utils.containsRef(value.process_graph, checkCallbacks, depth+1)) {
					return true;
				}
				break;
			case 'array':
			case 'object':
				for(let key in value) {
					if (Utils.containsRef(value[key], checkCallbacks, depth)) {
						return true;
					}
				}
		}
		return false;
	}

	/**
	 * Returns all distinct references (from_parameter, from_node) contained in a value.
	 * 
	 * @param {*} value 
	 * @param {boolean} getFromCallbacks - Set to `true` to also include refs in callbacks.
	 * @returns {boolean}
	 */
	static getRefs(value, getFromCallbacks = false, depth = 0) {
		var store = [];
		var type = Utils.getType(value);
		switch(type) {
			case 'result':
			case 'parameter':
				store.push(value);
				break;
			case 'callback':
				if (depth === 0 || getFromCallbacks) {
					store = store.concat(Utils.getRefs(value.process_graph, getFromCallbacks, depth+1));
				}
				break;
			case 'array':
			case 'object':
				for(var key in value) {
					store = store.concat(Utils.getRefs(value[key], getFromCallbacks , depth));
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