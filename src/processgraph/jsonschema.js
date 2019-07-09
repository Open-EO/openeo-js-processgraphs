const ajv = require('ajv');
const Utils = require('../utils');

module.exports = class JsonSchemaValidator {

	constructor() {
		var ajvOptions = {
			schemaId: 'auto',
			format: 'full',
			formats: {
				// See issue https://github.com/Open-EO/openeo-js-commons/issues/4 for information on why ajv doesn't support non-string validation
				'band-name': {type: 'string', async: true, validate: this.validateBandName.bind(this)},
				'bounding-box': {type: 'object', async: true, validate: this.validateBoundingBox.bind(this)}, // Currently not supported by ajv 6.10
				'callback': {type: 'object', async: true, validate: this.validateCallback.bind(this)}, // Currently not supported by ajv 6.10
				'collection-id': {type: 'string', async: true, validate: this.validateCollectionId.bind(this)},
				'epsg-code': {type: 'integer', async: true, validate: this.validateEpsgCode.bind(this)}, // Currently not supported by ajv 6.10
				'geojson': {type: 'object', async: true, validate: this.validateGeoJson.bind(this)}, // Currently not supported by ajv 6.10
				'job-id': {type: 'string', async: true, validate: this.validateJobId.bind(this)},
				'kernel': {type: 'array', async: true, validate: this.validateKernel.bind(this)}, // Currently not supported by ajv 6.10
				'output-format': {type: 'string', async: true, validate: this.validateOutputFormat.bind(this)},
				'output-format-options': {type: 'array', async: true, validate: this.validateOutputFormatOptions.bind(this)}, // Currently not supported by ajv 6.10
				'process-graph-id': {type: 'string', async: true, validate: this.validateProcessGraphId.bind(this)},
				'process-graph-variables': {type: 'array', async: true, validate: this.validateProcessGraphVariables.bind(this)}, // Currently not supported by ajv 6.10
				'proj-definition': {type: 'string', async: true, validate: this.validateProjDefinition.bind(this)},
				'raster-cube': {type: 'object', async: true, validate: this.validateRasterCube.bind(this)}, // Currently not supported by ajv 6.10
				'temporal-interval': {type: 'array', async: true, validate: this.validateTemporalInterval.bind(this)}, // Currently not supported by ajv 6.10
				'temporal-intervals': {type: 'array', async: true, validate: this.validateTemporalIntervals.bind(this)}, // Currently not supported by ajv 6.10
				'vector-cube': {type: 'object', async: true, validate: this.validateVectorCube.bind(this)} // Currently not supported by ajv 6.10
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

		this.outputFormats = null;
		this.geoJsonValidator = null;
	}

	async validateJson(json, schema) {
		 // Make sure we don't alter the process registry
		var clonedSchema = Object.assign({}, schema);
		clonedSchema.$async = true;
		if (typeof clonedSchema.$schema === 'undefined') {
			// Set applicable JSON Schema draft version if not already set
			clonedSchema.$schema = "http://json-schema.org/draft-07/schema#";
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
		if (typeof schema.$schema === 'undefined') {
			schema = Object.assign({}, schema); // Make sure we don't alter the process registry
			schema.$schema = "http://json-schema.org/draft-07/schema#";
		}
	
		let result = this.ajv.compile(schema);
		return result.errors || [];
	}

	// Pass the content of https://geojson.org/schema/GeoJSON.json
	setGeoJsonSchema(schema) {
		var gjv = new ajv();
		this.geoJsonValidator = gjv.compile(schema);
	}

	// Expects API compatible output formats (see GET /output_formats).
	setOutputFormats(outputFormats) {
		this.outputFormats = {};
		for (var key in outputFormats) {
			this.outputFormats[key.toUpperCase()] = outputFormats[key];
		}
	}

	/* istanbul ignore next */
	async validateBandName(/*data*/) {
		// Can't validate band name without knowing/loading the data.
		// => To be overridden by end-user application.
		return true;
	}

	/* istanbul ignore next */
	async validateBoundingBox(/*data*/) {
		// Nothing to validate, schema is (usually) delivered by processes.
		return true;
	}

	/* istanbul ignore next */
	async validateCallback(/*data*/) {
		// This should be checked by process graph parsing automatically.
		// Otherwise to be overridden by end-user application.
		return true;
	}

	/* istanbul ignore next */
	async validateCollectionId(/*data*/) {
		// To be overridden by end-user application.
		return true;
	}

	async validateEpsgCode(data) {
		// Rough check for valid numbers as we don't want to maintain a full epsg code list in this repo.
		// Fully validation to be implemented by end-user application by overriding this method.
		if (data >= 2000) {
			return true;
		}
		
		throw new ajv.ValidationError([{
			message: "Invalid EPSG code specified."
		}]);
	}

	async validateGeoJson(data) {
		if (this.geoJsonValidator !== null) {
			if (!this.geoJsonValidator(data)) {
				throw new ajv.ValidationError(ajv.errors);
			}
			return true;
		}
		else {
			// A very rough GeoJSON validation if no GeoJSON schema is available.
			if (typeof data.type !== 'string') {
				throw new ajv.ValidationError([{
					message: "Invalid GeoJSON specified (no type property)."
				}]);
			}

			switch(data.type) {
				case "Point":
				case "MultiPoint":
				case "LineString":
				case "MultiLineString":
				case "Polygon":
				case "MultiPolygon":
					if (!Array.isArray(data.coordinates)) {
						throw new ajv.ValidationError([{
							message: "Invalid GeoJSON specified (Geometry has no valid coordinates member)."
						}]);
					}
					return true;
				case "GeometryCollection":
					if (!Array.isArray(data.geometries)) {
						throw new ajv.ValidationError([{
							message: "Invalid GeoJSON specified (GeometryCollection has no valid geometries member)."
						}]);
					}
					return true;
				case "Feature":
					if (data.geometry !== null && !Utils.isObject(data.geometry)) {
						throw new ajv.ValidationError([{
							message: "Invalid GeoJSON specified (Feature has no valid geometry member)."
						}]);
					}
					if (data.properties !== null && !Utils.isObject(data.properties)) {
						throw new ajv.ValidationError([{
							message: "Invalid GeoJSON specified (Feature has no valid properties member)."
						}]);
					}
					return true;
				case "FeatureCollection":
					if (!Array.isArray(data.features)) {
						throw new ajv.ValidationError([{
							message: "Invalid GeoJSON specified (FeatureCollection has no valid features member)."
						}]);
					}
					return true;
				default:
					throw new ajv.ValidationError([{
						message: "Invalid GeoJSON type specified."
					}]);
			}
		}
	}

	/* istanbul ignore next */
	async validateJobId(/*data*/) {
		// To be overridden by end-user application
		return true;
	}

	/* istanbul ignore next */
	async validateKernel(/*data*/) {
		// ToDo? / To be overridden by end-user application
		return true;
	}
	
	async validateOutputFormat(data) {
		if (Utils.isObject(this.outputFormats) && !(data.toUpperCase() in this.outputFormats)) {
			throw new ajv.ValidationError([{
				message: "Output format not supported."
			}]);
		}
		return true;
	}

	/* istanbul ignore next */
	async validateOutputFormatOptions(/*data*/) {
		// This depends on the output format specified and can't be fully validated without knowning the chosen output format.
		return true;
	}

	/* istanbul ignore next */
	async validateProcessGraphId(/*data*/) {
		// To be overridden by end-user application
		return true;
	}

	/* istanbul ignore next */
	async validateProcessGraphVariables(/*data*/) {
		// Nothing to validate against...
		return true;
	}

	async validateProjDefinition(data) {
		// To be overridden by end-user application, just doing a very basic check here.
		if (!data.toLowerCase().includes("+proj")) {
			throw new ajv.ValidationError([{
				message: "Invalid PROJ string specified (doesn't contain '+proj')."
			}]);
		}
		return true;
	}

	/* istanbul ignore next */
	async validateRasterCube(/*data*/) {
		// This is usually a reference to a process result as we haven't specified any JSON encoding for raster cubes.
		return true;
	}

	async validateTemporalInterval(/*data*/) {
		// ToDo: Fully check against schema, most is already checked by JSON Schemas itself, but check for example that 
		// both can't be null at the same time or the first element is > the second element.
		return true;
	}
	
	async validateTemporalIntervals(data) {
		var invalid = data.filter(x => !this.validateTemporalInterval(x));
		return invalid.length === 0;
	}

	/* istanbul ignore next */
	async validateVectorCube(/*data*/) {
		// This is usually a reference to a process result as we haven't specified any JSON encoding for raster cubes.
		return true;
	}

	// Checks whether the valueSchema is compatible to the paramSchema.
	// So would a value compatible with valueSchema be accepted by paramSchema?
	static isSchemaCompatible(/*paramSchema, valueSchema*/) {
		return true; // ToDo: Implement
	}

	/**
	 * Returns the indices of provided JSON Schemas that the provided values matches against.
	 * 
	 * Returns a single index if a single type is mathcing.
	 * Returns undefined if no valid type is found.
	 * Returns an array of indices if multiple types are found.
	 * 
	 * @param {Array} types - Array of JSON schemas
	 * @param {*} value - A value
	 * @return {(string[]|string|undefined)} - Returns matching indices, see description.
	 */
	static async getTypeForValue(types, value) {
		var validator = new JsonSchemaValidator();
		var potentialTypes = [];
		for(var i in types) {
			var errors = await validator.validateJson(value, types[i]);
			if (errors.length === 0) {
				potentialTypes.push(String(i));
			}
		}
		return potentialTypes.length > 1 ? potentialTypes : potentialTypes[0];
	}

};