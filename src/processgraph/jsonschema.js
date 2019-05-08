const ajv = require('ajv');

module.exports = class JsonSchemaValidator {

	constructor() {
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
			return e.errors.map(e => e.message);
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

	validateBandName() {
		return true; // ToDo
	}

	validateBoundingBox() {
		return true; // ToDo
	}

	validateCallback() {
		return true; // ToDo
	}

	validateCollectionId(data) {
		return true; // ToDo
	}

	validateEpsgCode() {
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
	
	async validateJobId() {
		return true; // ToDo
	}
	
	validateKernel() {
		return true; // ToDo
	}
	
	validateOutputFormat(data) {
		return true; // ToDo
	}
	
	validateOutputFormatOptions() {
		return true; // ToDo
	}
	
	async validateProcessGraphId() {
		return true; // ToDo
	}
	
	validateProcessGraphVariables() {
		return true; // ToDo
	}

	validateProjDefinition() {
		return true; // ToDo
	}
	
	validateRasterCube() {
		return true; // ToDo
	}
	
	validateTemporalInterval() {
		return true; // ToDo
	}
	
	validateTemporalIntervals() {
		return true; // ToDo
	}

	validateVectorCube() {
		return true; // ToDo
	}

	// Checks whether the valueSchema is compatible to the paramSchema.
	// So would a value compatible with valueSchema be accepted by paramSchema?
	static isSchemaCompatible(paramSchema, valueSchema) {
		return true; // ToDo: Implement
	}

}