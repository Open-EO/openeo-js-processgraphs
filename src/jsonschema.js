const ajv = require('ajv');
const Utils = require('@openeo/js-commons/src/utils.js');
const keywords = require('./keywords');

var geoJsonSchema = require("../assets/GeoJSON.json");
var subtypeSchemas = require("../assets/openeo-api/subtype-schemas.json");

module.exports = class JsonSchemaValidator {

	constructor() {
		this.ajv = new ajv({
			schemaId: 'auto',
			format: 'full',
			addUsedSchema: false
		});
		// Add subtype + GeoJSON schemas
		this.ajv.addSchema(geoJsonSchema);
		// Add openEO specific keywords
		this.ajv.addKeyword('parameters', Object.assign(keywords.parameters, {
			valid: true,
			errors: true
		}));
		this.ajv.addKeyword('subtype', Object.assign(keywords.subtype, {
			validate: async (subtype, data, schema) => await this.validateSubtype(subtype, data, schema),
			async: true,
			errors: true
		}));

		this.fileFormats = {
			input: null,
			output: null
		};
		this.epsgCodes = null;
	}

	getFunctionName(subtype) {
		// compute the function name (camelCase), e.g. for `band-name` it will be `validateBandName`
		return "validate" + subtype.replace(/(^|\-)(\w)/g, (a, b, char) => char.toUpperCase());
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
	async getTypeForValue(types, value) {
		var potentialTypes = [];
		for(var i in types) {
			var errors = await this.validateValue(value, types[i]);
			if (errors.length === 0) {
				potentialTypes.push(String(i));
			}
		}
		return potentialTypes.length > 1 ? potentialTypes : potentialTypes[0];
	}

	makeSchema(schema, $async = false) {
		schema = Utils.deepClone(schema);

		// Make array of schemas to a anyOf schema
		if (Array.isArray(schema)) {
			schema = {
				anyOf: schema
			};
		}

		// Set applicable JSON Schema draft version if not already set
		if (typeof schema.$schema === 'undefined') {
			schema.$schema = "http://json-schema.org/draft-07/schema#";
		}

		// Set async execution
		if ($async) {
			schema.$async = true;
			if (Utils.isObject(schema.definitions)) {
				for(let key in schema.definitions) {
					schema.definitions[key].$async = true;
				}
			}
		}

		return schema;
	}

	async validateValue(value, schema) {
		schema = this.makeSchema(schema, true);

		try {
			await this.ajv.validate(schema, value);
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

/*	validateSchema(schema) {
		schema = this.makeSchema(schema);
		let result = this.ajv.compile(schema);
		return result.errors || [];
	} */

	async validateSubtype(subtype, data, schema) {
		if (typeof subtypeSchemas.definitions[subtype] !== 'undefined') {
			schema = this.makeSchema(subtypeSchemas, true);
			// Make the schema for this subtype the default schema to be checked
			Object.assign(schema, subtypeSchemas.definitions[subtype]);
			// Remove subtype to avoid recursion
			delete schema.subtype;
		}
		else {
			schema = this.makeSchema(schema, true);
		}

		let validated = await this.ajv.validate(schema, data);
		let funcName = this.getFunctionName(subtype);
		if (validated && typeof this[funcName] === 'function') {
			return await this[funcName](data);
		}
		else {
			return validated;
		}
	}

	// Expects API compatible file formats (see GET /file_formats).
	setFileFormats(fileFormats) {
		for(let io of ['input', 'output']) {
			this.fileFormats[io] = {};
			if (!Utils.isObject(fileFormats[io])) {
				continue;
			}
			for (let key in fileFormats[io]) {
				this.fileFormats[io][key.toUpperCase()] = fileFormats[io][key];
			}
		}
	}

	setEpsgCodes(epsgCodes) {
		this.epsgCodes = epsgCodes.map(v => parseInt(v, 10));
	}

	async validateEpsgCode(data) {
		if (Array.isArray(this.epsgCodes)) {
			if (this.epsgCodes.includes(data)) {
				return true;
			}
		}
		// Rough check for valid numbers as we don't want to maintain a full epsg code list in this repo.
		else if (data >= 2000) {
			return true;
		}

		throw new ajv.ValidationError([{
			message: "Invalid EPSG code '" + data + "' specified."
		}]);
	}
	
	async validateInputFormat(data) {
		if (Utils.isObject(this.fileFormats.input) && !(data.toUpperCase() in this.fileFormats.input)) {
			throw new ajv.ValidationError([{
				message: "Input format  '" + data + "' not supported."
			}]);
		}
		return true;
	}
	
	async validateOutputFormat(data) {
		if (Utils.isObject(this.fileFormats.output) && !(data.toUpperCase() in this.fileFormats.output)) {
			throw new ajv.ValidationError([{
				message: "Output format  '" + data + "' not supported."
			}]);
		}
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

	async validateTemporalInterval(data) {
		if (data[0] === null && data[1] === null) {
			throw new ajv.ValidationError([{
				message: "Temporal interval must not be open on both ends."
			}]);
		}
		else if (data[0] !== null && data[1] !== null) {
			let date1 = new Date(data[0]);
			let date2 = new Date(data[1]);
			if (date2.getTime() < date1.getTime()) {
				throw new ajv.ValidationError([{
					message: "The second timestamp can't be before the first timestamp."
				}]);
			}
		}
		return true;
	}
	
	async validateTemporalIntervals(data) {
		for(let interval of data) {
			// throws if invalid
			await this.validateTemporalInterval(interval);
		}
		return true;
	}

	// Checks whether the valueSchema is compatible to the paramSchema.
	// So would a value compatible with valueSchema be accepted by paramSchema?
	// allowValueAsElements: If true, it checks whether the valueSchema would be allowed as part of an array or object. For example number could be allowed as part of an array of numbers.
	static isSchemaCompatible(paramSchema, valueSchema, strict = false, allowValueAsElements = false) {
		var paramSchemas = JsonSchemaValidator.convertSchemaToArray(paramSchema);
		var valueSchemas = JsonSchemaValidator.convertSchemaToArray(valueSchema);

		var compatible = paramSchemas.filter(ps => {
			for(var i in valueSchemas) {
				var vs = valueSchemas[i];
				if (typeof ps.type !== 'string' || (!strict && typeof vs.type !== 'string')) { // "any" type is always compatible
					return true;
				}
				else if (ps.type === vs.type || (allowValueAsElements && (ps.type === 'array' || ps.type === 'object')) || (ps.type === 'number' && vs.type === 'integer') || (!strict && ps.type === 'integer' && vs.type === 'number')) {
					if (ps.type === 'array' && Utils.isObject(ps.items) && Utils.isObject(vs.items))  {
						if (allowValueAsElements && JsonSchemaValidator.isSchemaCompatible(ps.items, vs, strict)) {
							return true;
						}
						else if (JsonSchemaValidator.isSchemaCompatible(ps.items, vs.items, strict)) {
							return true;
						}
					}
					else if (ps.type === 'object' && Utils.isObject(ps.properties) && Utils.isObject(vs.properties)) {
						// ToDo: Check properties, required properties etc.
						// If allowValueAsElements is true, all types are allowed to be part of the object.
						return true;
					}
					// Check subtypes
					else if (!strict && (typeof ps.subtype !== 'string' || typeof vs.subtype !== 'string')) {
						return true;
					}
					else if (typeof ps.subtype !== 'string') { // types without subtype always accepts the same type with a subtype
						return true;
					}
					else if (ps.subtype === vs.subtype) {
						return true;
					}
				}
			}
			return false;
		});

		return compatible.length > 0;
	}

	static convertSchemaToArray(originalSchema) {
		var schemaArray = [];
		if (!originalSchema || typeof originalSchema !== 'object') {
			return schemaArray;
		}

		// ToDo: schema.not and schema.allOf is not supported - see also class constructor of ProcessSchema in processSchema.js of openeo-web-editor.
		if (Array.isArray(originalSchema.oneOf)) {
			schemaArray = originalSchema.oneOf;
		}
		else if (Array.isArray(originalSchema.anyOf)) {
			schemaArray = originalSchema.anyOf;
		}
		else if (!Array.isArray(originalSchema)) {
			schemaArray = [originalSchema];
		}
		else {
			schemaArray = originalSchema;
		}

		let splitMultiTypeSchemas = function(schema) {
			return schema.type.map(type => Object.assign({}, schema, {type: type}));
		};

		let schemas = [];
		for(let schema of schemaArray) {
			if (!Utils.isObject(schema)) {
				continue;
			}
			if (Array.isArray(schema.type)) {
				schemas = schemas.concat(splitMultiTypeSchemas(schema));
			}
			else {
				schemas.push(schema);
			}
		}

		return schemas;
	}

};