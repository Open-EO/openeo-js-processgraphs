const subtypeSchemas = require("../assets/openeo-api/subtype-schemas.json");

module.exports = {
	subtype: {
		metaSchema: {
			type: "string",
			enum: Object.keys(subtypeSchemas.definitions)
		}
	},
	parameters: {
		dependencies: [
			"subtype"
		],
		metaSchema: {
			type: "array",
			items: {
				type: "object",
				required: [
					"name",
					"description",
					"schema"
				],
				properties: {
					name: {
						type: "string",
						pattern: "^\\w+$"
					},
					description: {
						type: "string"
					},
					optional: {
						type: "boolean",
						default: false
					},
					deprecated: {
						type: "boolean",
						default: false
					},
					experimental: {
						type: "boolean",
						default: false
					},
					default: {
						// Any type
					},
					schema: {
						oneOf: [
							{
								"$ref": "http://json-schema.org/draft-07/schema"
							},
							{
								type: "array",
								items: {
									"$ref": "http://json-schema.org/draft-07/schema"
								}
							}
						]
					}
				}
			}
		}
	}
};