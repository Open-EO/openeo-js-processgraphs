const MigrateProcesses = require('../src/migrate/processes.js');

var legacyProcess03 = {
	"name": "filter_bbox",
	"description": "Drops observations from a collection that are located outside of a given bounding box.",
	"parameters": {
		"imagery": {
			"description": "EO data to process.",
			"required": true,
			"mime_type": "application/data-cube",
			"schema": {
				"type": "object",
				"format": "eodata"
			}
		},
		"extent": {
			"description": "Spatial extent, may include a vertical axis (height or depth).",
			"required": true,
			"schema": {
				"type": "object",
				"format": "spatial_extent"
			}
		},
		"crs": {
			"description": "Reference system",
			"schema": {
				"anyOf": [
					{
						"type": "null"
					},
					{
						"type": "object"
					},
					{
						"type": "string",
						"format": "uri"
					}
				],
				"default": null
			}
		},
		"crs_vertical": {
			"description": "Vertical Reference system",
			"schema": {
				"anyOf": [
					{
						"type": "null",
						"default": null
					},
					{
						"type": "object"
					},
					{
						"type": "string",
						"format": "uri"
					}
				]
			}
		}
	},
	"returns": {
		"description": "Processed EO data.",
		"mime_type": "application/data-cube",
		"schema": {
			"type": "object",
			"format": "eodata"
		}
	},
	"exceptions": {
		"ProcessArgumentUnsupported": {
			"description": "The height or base parameters are set, but not supported."
		}
	},
	"examples": {
		"example1": {
			"summary": "Example #1",
			"description": "...",
			"process_graph": {
				"process_id": "filter_bbox",
				"imagery": {},
				"extent": {
					"west":16.1,
					"south":47.2,
					"east":16.6,
					"north":48.6
				}
			}
		},
		"Another example": {
			"description": "...",
		}
	}
};

var legacyProcess04 = {
	"id": "filter_bbox",
	"description": "Drops observations from a collection that are located outside of a given bounding box.",
	"parameter_order": ["imagery", "extent", "crs", "crs_vertical"],
	"parameters": {
		"imagery": {
			"description": "EO data to process.",
			"required": true,
			"media_type": "application/data-cube",
			"schema": {
				"type": "object",
				"format": "eodata"
			}
		},
		"extent": {
			"description": "Spatial extent, may include a vertical axis (height or depth).",
			"required": true,
			"schema": {
				"type": "object",
				"format": "spatial_extent"
			}
		},
		"crs": {
			"description": "Reference system",
			"schema": {
				"anyOf": [
					{
						"type": "null"
					},
					{
						"type": "object"
					},
					{
						"type": "string",
						"format": "uri"
					}
				],
				"default": null
			}
		},
		"crs_vertical": {
			"description": "Vertical Reference system",
			"schema": {
				"anyOf": [
					{
						"type": "null"
					},
					{
						"type": "object",
						"default": null
					},
					{
						"type": "string",
						"format": "uri"
					}
				]
			}
		}
	},
	"returns": {
		"description": "Processed EO data.",
		"media_type": "application/data-cube",
		"schema": {
			"type": "object",
			"format": "eodata"
		}
	},
	"exceptions": {
		"ProcessArgumentUnsupported": {
			"description": "The height or base parameters are set, but not supported.",
			"message": "The height or base parameters are set, but not supported."
		}
	},
	"examples": [
		{
			"title": "Example #1",
			"description": "...",
			"process_graph": {
				"process_id": "filter_bbox",
				"imagery": {},
				"extent": {
					"west":16.1,
					"south":47.2,
					"east":16.6,
					"north":48.6
				}
			}
		},
		{
			"title": "Another example",
			"description": "...",
		}
	]
};

var expectedProcess = {
	"id": "filter_bbox",
	"description": "Drops observations from a collection that are located outside of a given bounding box.",
	"parameter_order": ["imagery", "extent", "crs", "crs_vertical"],
	"parameters": {
		"imagery": {
			"description": "EO data to process.",
			"required": true,
			"schema": {
				"type": "object",
				"subtype": "eodata",
				"contentMediaType": "application/data-cube"
			}
		},
		"extent": {
			"description": "Spatial extent, may include a vertical axis (height or depth).",
			"required": true,
			"schema": {
				"type": "object",
				"subtype": "spatial_extent"
			}
		},
		"crs": {
			"description": "Reference system",
			"schema": [
				{
					"type": "null"
				},
				{
					"type": "object"
				},
				{
					"type": "string",
					"format": "uri",
					"subtype": "uri"
				}
			],
			"default": null
		},
		"crs_vertical": {
			"description": "Vertical Reference system",
			"schema": [
				{
					"type": "null"
				},
				{
					"type": "object"
				},
				{
					"type": "string",
					"format": "uri",
					"subtype": "uri"
				}
			],
			"default": null
		}
	},
	"returns": {
		"description": "Processed EO data.",
		"schema": {
			"type": "object",
			"subtype": "eodata",
			"contentMediaType": "application/data-cube"
		}
	},
	"exceptions": {
		"ProcessArgumentUnsupported": {
			"description": "The height or base parameters are set, but not supported.",
			"message": "The height or base parameters are set, but not supported."
		}
	},
	"examples": [
		{
			"title": "Example #1",
			"description": "...",
			"process_graph": {
				"process_id": "filter_bbox",
				"imagery": {},
				"extent": {
					"west":16.1,
					"south":47.2,
					"east":16.6,
					"north":48.6
				}
			}
		},
		{
			"title": "Another example",
			"description": "...",
		}
	]
};

var defaultReturn = {
	description: "",
	schema: {}
};

var onlyId = {
	id: "min"
};

var minimalProcess = Object.assign({}, onlyId, {
	description: "",
	parameters: {},
	returns: defaultReturn
});

var legacyProcess03_2 = Object.assign({}, legacyProcess03);
legacyProcess03_2.parameters = {
	imagery: Object.assign({}, legacyProcess03.parameters.imagery)
}
delete legacyProcess03_2.returns;
delete legacyProcess03_2.examples;

var expectedProcess2 = Object.assign({}, expectedProcess);
expectedProcess2.parameters = {
	imagery: Object.assign({}, expectedProcess.parameters.imagery)
}
expectedProcess2.returns = defaultReturn;
delete expectedProcess2.parameter_order;
delete expectedProcess2.examples;

describe('Basic Process Migration Tests', () => {
	test('Migrate Process > invalid', () => {
		// Pass no version number
		expect(() => MigrateProcesses.convertProcessToLatestSpec({})).toThrow("No version specified");
		// Pass invalid process (no id)
		expect(MigrateProcesses.convertProcessToLatestSpec({}, "0.3.0")).toEqual({});
		expect(MigrateProcesses.convertProcessToLatestSpec({}, "0.4.0")).toEqual({});
	});
	test('Migrate Process > incomplete', () => {
		// Pass just a process id and let it add required fields
		expect(MigrateProcesses.convertProcessToLatestSpec({name: "min", returns: {}}, "0.3.0")).toEqual(minimalProcess);
		expect(MigrateProcesses.convertProcessToLatestSpec(onlyId, "0.4.0")).toEqual(minimalProcess);
	});
	test('Migrate Process > 0.3', () => {
		// Test that a v0.3 process gets converted
		expect(MigrateProcesses.convertProcessToLatestSpec(legacyProcess03, "0.3.1")).toEqual(expectedProcess);
		expect(MigrateProcesses.convertProcessToLatestSpec(legacyProcess03_2, "0.3.0")).toEqual(expectedProcess2);
	});
	test('Migrate Process > 0.4', () => {
		// Test that a v0.4 process gets converted
		expect(MigrateProcesses.convertProcessToLatestSpec(legacyProcess04, "0.4.0")).toEqual(expectedProcess);
		expect(MigrateProcesses.convertProcessToLatestSpec(legacyProcess04, "0.4.1")).toEqual(expectedProcess);
	});
	test('Migrate Process > 1.0', () => {
		// Test that a process following the latest spec doesn't change at all
		expect(MigrateProcesses.convertProcessToLatestSpec(expectedProcess, "1.0.0")).toEqual(expectedProcess);
		expect(MigrateProcesses.convertProcessToLatestSpec(expectedProcess, "1.0.0")).toEqual(expectedProcess);
	});
});