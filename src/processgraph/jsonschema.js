const ajv = require('ajv');
const Utils = require('../utils');

module.exports = class JsonSchemaValidator {

	constructor(options) {
		var ajvOptions = {
			schemaId: 'auto',
			format: 'full',
			formats: {
				'band-name': {type: 'string', validate: this.validateBandName.bind(this)},
				'bounding-box': {type: 'object', validate: this.validateBoundingBox.bind(this)},
				'callback': {type: 'object', validate: this.validateCallback.bind(this)},
				'collection-id': {type: 'string', validate: this.validateCollectionId.bind(this)},
				'epsg-code': {type: 'integer', validate: this.validateEpsgCode.bind(this)},
				'geojson': {type: 'object', validate: this.validateGeoJson.bind(this)},
				'job-id': {type: 'string', async: true, validate: this.validateJobId.bind(this)},
				'kernel': {type: 'array', validate: this.validateKernel.bind(this)},
				'output-format': {type: 'string', validate: this.validateOutputFormat.bind(this)},
				'output-format-options': {type: 'array', validate: this.validateOutputFormatOptions.bind(this)},
				'process-graph-id': {type: 'string', async: true, validate: this.validateProcessGraphId.bind(this)},
				'process-graph-variables': {type: 'array', validate: this.validateProcessGraphVariables.bind(this)},
				'proj-definition': {type: 'string', validate: this.validateProjDefinition.bind(this)},
				'raster-cube': {type: 'object', validate: this.validateRasterCube.bind(this)},
				'temporal-interval': {type: 'array', validate: this.validateTemporalInterval.bind(this)},
				'temporal-intervals': {type: 'array', validate: this.validateTemporalIntervals.bind(this)},
				'vector-cube': {type: 'object', validate: this.validateVectorCube.bind(this)}
			}
		};
		this.ajv = new ajv(ajvOptions);
		this.ajv.addKeyword('parameters', {
			dependencies: [
				"type",
				"format"
			],
			metaSchema: {
				type: "object",
				additionalProperties: {
					type: "object"
				}
			},
			valid: true,
			errors: true
		});

		if (Utils.isObject(options)) {
			this.collectionResolver = options.collectionResolver || null,
			this.jobResolver = options.jobResolver || null;
			this.pgResolver = options.pgResolver || null;
			this.outputFormats = options.outputFormats || null;
		}
	}

	async validateJson(json, schema) {
		 // Make sure we don't alter the process registry
		var clonedSchema = Object.assign({}, schema);
		clonedSchema["$async"] = true;
		if (typeof schema["$schema"] === 'undefined') {
			// Set applicable JSON SChema draft version if not already set
			clonedSchema["$schema"] = "http://json-schema.org/draft-07/schema#";
		}

		try {
			await this.ajv.validate(clonedSchema, json);
			return [];
		} catch (e) {
			if (Array.isArray(e.errors)) {
				return e.errors.map(e => e.message);
			}
			else {
				throw e;
			}
		}
	}

	validateJsonSchema(schema) {
		// Set applicable JSON SChema draft version if not already set
		if (typeof schema["$schema"] === 'undefined') {
			var schema = Object.assign({}, schema); // Make sure we don't alter the process registry
			schema["$schema"] = "http://json-schema.org/draft-07/schema#";
		}
	
		let result = this.ajv.compile(schema);
		return result.errors || [];
	}

	// callback is an async function accepting a single parameter, which is the requested collection id. Must return a boolean (true = found, false = not found).
	setCollectionResolver(callback) {
		this.collectionResolver = callback;
	}

	// callback is an async function accepting a single parameter, which is the requested job id. Must return a boolean (true = found, false = not found).
	setJobResolver(callback) {
		this.jobResolver = callback;
	}

	// callback is an async function accepting a single parameter, which is the requested process graph id. Must return a boolean (true = found, false = not found).
	setStoredProcessGraphResolver(callback) {
		this.pgResolver = callback;
	}

	// Expects API compatible output formats (see GET /output_formats).
	setOutputFormats(outputFormats) {
		this.outputFormats = {};
		for (var key in outputFormats) {
			this.outputFormats[key.toUpperCase()] = outputFormats[key];
		}
	}

	validateBandName(data) {
		return true; // ToDo
	}

	validateBoundingBox(data) {
		return true; // ToDo: Fully check against bounding box schema
	}

	validateCallback(data) {
		return true; // ToDo
	}

	async validateCollectionId(data) {
		if (typeof this.collectionResolver === 'function') {
			return this.collectionResolver(data);
		}
		return true;
	}

	validateEpsgCode(data) {
		return true; // ToDo
	}

	validateGeoJson(data) {
		if (typeof data.type !== 'string') { // ToDo: Fully check against GeoJSON schema
			throw new ajv.ValidationError([{
				message: "Invalid GeoJSON specified (no type property)."
			}]);
		}
		return true;
	}
	
	async validateJobId(data) {
		if (typeof this.jobResolver === 'function') {
			return this.jobResolver(data);
		}
		return true;
	}
	
	validateKernel(data) {
		return true; // ToDo
	}
	
	validateOutputFormat(data) {
		if (Utils.isObject(this.outputFormats) && !(data.toUpperCase() in this.outputFormats)) {
			return false;
		}
		return true;
	}
	
	validateOutputFormatOptions(data) {
		return true; // ToDO: This depends on the output format specified and can't be fully validated without knowning the chosen output format.
	}
	
	async validateProcessGraphId(data) {
		if (typeof this.pgResolver === 'function') {
			return this.pgResolver(data);
		}
	}
	
	validateProcessGraphVariables(data) {
		return true; // ToDo
	}

	validateProjDefinition(data) {
		return true; // ToDo
	}
	
	validateRasterCube(data) {
		return true; // ToDo
	}
	
	validateTemporalInterval(data) {
		return true; // ToDo: Fully check against schema (Array, two elements, both being null or date-time or date or time). Can't be both null...
	}
	
	validateTemporalIntervals(data) {
		return true; // ToDo: Fully chack against schema (Array of the schema above)
	}

	validateVectorCube(data) {
		return true; // ToDo
	}

	// Checks whether the valueSchema is compatible to the paramSchema.
	// So would a value compatible with valueSchema be accepted by paramSchema?
	static isSchemaCompatible(paramSchema, valueSchema) {
		return true; // ToDo: Implement
	}

	static async getTypeForValue(types, value) {
		var validator = new JsonSchemaValidator();
		var potentialTypes = [];
		for(var i in types) {
			var errors = await validator.validateJson(value, types[i]);
			if (errors.length === 0) {
				potentialTypes.push(i);
			}
		}
		return potentialTypes.length > 1 ? potentialTypes : potentialTypes[0]; // Returns undefined if no valid type is found
	}

}