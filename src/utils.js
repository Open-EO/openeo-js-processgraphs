const compareVersions = require('compare-versions');

var Utils = {

    compareVersion(v1, v2) {
        try {
            return compareVersions(v1, v2);
        } catch (error) {
            return null;
        }
    },

	isObject(obj) {
		return (typeof obj === 'object' && obj === Object(obj) && !Array.isArray(obj));
	},
	
	size(obj) {
		if (typeof obj === 'object' && obj !== null) {
			if (Array.isArray(obj)) {
				return obj.length;
			}
			else {
				return Object.keys(obj).length;
			}
		}
		return 0;
	},

	replacePlaceholders(message, variables = {}) {
		if (typeof message === 'string' && this.isObject(variables)) {
			for(var placeholder in variables) {
				message = message.replace('{' + placeholder + '}', variables[placeholder]);
			}
		}
		return message;
	},

	mergeDeep(target, ...sources) {
		if (!sources.length) {
			return target;
		}
		const source = sources.shift(); 
	  
		if (this.isObject(target) && this.isObject(source)) {
			for (const key in source) {
				if (this.isObject(source[key])) {
					if (!target[key]) {
						target[key] = {};
					}
					this.mergeDeep(target[key], source[key]); 
				}
				else {
					target[key] = source[key];
				}
			}
		}
	  
		return this.mergeDeep(target, ...sources); 
	}

};

module.exports = Utils;