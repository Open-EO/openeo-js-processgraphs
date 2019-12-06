const Utils = require('./utils.js');

var FeatureList = {
	// Manual assignment of the endpoints above to individual features.
	// A functionality is considered supported when ALL of the corresponding endpoints are supported.
	features: {
		'Basic functionality': [
			'get /collections',
			'get /collections/{}',
			'get /processes',
			'get /file_formats'
		],
		'Authenticate with HTTP Basic': [       // TODO: Remove later because this auth method should not be used
			'get /credentials/basic',
	//		'get /me'                           // not necessarily needed (just outputs metadata)
		],
		'Authenticate with OpenID Connect': [   // TODO: Remove later because the user doesn't care HOW the auth works
			'get /credentials/oidc',
	//		'get /me'                           // not necessarily needed (just outputs metadata)
		],
		'Batch processing': [
			'get /jobs',
			'post /jobs',
			'get /jobs/{}',
	//		'patch /jobs/{}',                   // not necessarily needed (can be achieved by deleting and re-creating)
			'delete /jobs/{}',
			'get /jobs/{}/logs',
			'get /jobs/{}/results',
			'post /jobs/{}/results',
	// 		'delete /jobs/{}/results'           // not necessarily needed (can be deleted by deleting the entire job)
		],
		'Estimate processing costs': [
			'get /jobs/{}/estimate'
		],
		'Preview processing results': [
			'post /result'
		],
		'Secondary web services': [
			'get /service_types',
			'get /services',
			'post /services',
			'get /services/{}',
	//		'patch /services/{}',               // not necessarily needed (can be achieved by deleting and re-creating)
			'delete /services/{}',
			'get /services/{}/logs'
		],
		'File storage': [
			'get /files/{}',
			'get /files/{}/{}',
			'put /files/{}/{}',
			'delete /files/{}/{}'
		],
		'Stored process graphs': [
			'get /process_graphs',
			'post /process_graphs',
			'get /process_graphs/{}',
	// 		'patch /process_graphs/{}',         // not necessarily needed (can be achieved by deleting and re-creating)
			'delete /process_graphs/{}'
		],
		'Validate process graphs': [
			'post /validation',
		],
		'Notifications and monitoring': [
			'get /subscription'
		],
		'User defined functions (UDF)': [
			'get /udf_runtimes'
		]
	},
	
	legacyFeatures: {
		'post /result': {
			'post /preview': ["0.3.*"]
		},
		'get /file_formats': {
			'get /output_formats': ["0.3.*", "0.4.*"]
		}
	},

	getListForVersion(version) {
		var list = {};
		for(var feature in this.features) {
			list[feature] = [];
			for(var i in this.features[feature]) {
				var endpoint = this.findLegacyEndpoint(version, this.features[feature][i]);
				list[feature].push(endpoint);
			}
		}
		return list;
	},

	findLegacyEndpoint(version, endpoint, method = null) {
		if (method !== null) {
			endpoint = this.endpointToString(method, endpoint);
		}
		if (typeof this.legacyFeatures[endpoint] === 'object') {
			var legacy = this.legacyFeatures[endpoint];
			for(var legacyEndpoint in legacy) {
				for(var i in legacy[legacyEndpoint]) {
					var legacyVersion = legacy[legacyEndpoint][i];
					if (Utils.compareVersion(version, legacyVersion) === 0) {
						return legacyEndpoint;
					}
				}
			}
		}
		return endpoint;
	},

	getFeatures() {
		return Object.keys(this.features);
	},

	getFeatureCount() {
		return Object.keys(this.features).length;
	},

	endpointsToStringList(endpoints) {
		var list = [];
		for(let i in endpoints) {
			for(let j in endpoints[i].methods) {
				list.push(this.endpointToString(endpoints[i].methods[j], endpoints[i].path));
			}
		}
		return list;
	},

	endpointToString(method, path) {
		// allow arbitrary parameter names => don't care about content in curly brackets
		let request = method + ' ' + path.replace(/{[^}]+}/g, '{}');
		return request.toLowerCase();
	},
	
	getReport(endpoints, version, convert = true) {
		var supportedFeatureCount = 0;
		var supportedEndpoints = convert ? this.endpointsToStringList(endpoints) : endpoints;
		var status = this.getListForVersion(version);
		// Assign each functionality a supported flag (0 = none, 1 = partially, 2 = fully)
		Object.keys(status).forEach(key => {
			let requiredEndpoints = status[key];
			// Get a list of unsupported, but required endpoints
			let unsupported = requiredEndpoints.filter(requiredEndpoint => !supportedEndpoints.includes(requiredEndpoint));
			switch(unsupported.length) {
				// No unsupported endpoints => fully supported
				case 0:
					status[key] = 2;
					supportedFeatureCount++;
					break;
				// All endpoints are unsupported
				case requiredEndpoints.length:
					status[key] = 0;
					break;
				// Some endpoints are supported => partially supported
				default:
					status[key] = 1;
			}
		});

		return {
			count: supportedFeatureCount,
			list: status
		};
	}

};

module.exports = FeatureList;