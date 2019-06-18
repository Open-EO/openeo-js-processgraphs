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
	}

};

module.exports = Utils;