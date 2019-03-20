const MigrateProcesses = require('../src/migrate/processes.js');

var legacyProcess = {
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

var expectedProcess = {
	"id": "filter_bbox",
	"description": "Drops observations from a collection that are located outside of a given bounding box.",
	"parameter_order": ["imagery", "extent"],
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

var legacyProcess2 = Object.assign({}, legacyProcess);
legacyProcess2.parameters = Object.assign({}, legacyProcess.parameters);
delete legacyProcess2.parameters.extent;
delete legacyProcess2.examples;

var expectedProcess2 = Object.assign({}, expectedProcess);
expectedProcess2.parameters = Object.assign({}, expectedProcess.parameters);
delete expectedProcess2.parameter_order;
delete expectedProcess2.parameters.extent;
delete expectedProcess2.examples;

describe('Basic Process Migration Tests', () => {
	test('Guess Process Spec Versions', () => {
		expect(MigrateProcesses.guessProcessSpecVersion(legacyProcess)).toBe("0.3");
		expect(MigrateProcesses.guessProcessSpecVersion(expectedProcess)).toBe("0.4");
	});
	test('Migrate Process', () => {
		expect(MigrateProcesses.convertProcessToLatestSpec({})).toEqual({});
		expect(MigrateProcesses.convertProcessToLatestSpec({}, "0.3.0")).toEqual({});
		// Test that a legacy process gets converted
		expect(MigrateProcesses.convertProcessToLatestSpec(legacyProcess)).toEqual(expectedProcess);
		expect(MigrateProcesses.convertProcessToLatestSpec(legacyProcess2)).toEqual(expectedProcess2);
		expect(MigrateProcesses.convertProcessToLatestSpec(legacyProcess, "0.3.1")).toEqual(expectedProcess);
		// Test that a process following the latest spec doesn't change at all
		expect(MigrateProcesses.convertProcessToLatestSpec(expectedProcess)).toEqual(expectedProcess);
		expect(MigrateProcesses.convertProcessToLatestSpec(expectedProcess, "0.4.0")).toEqual(expectedProcess);
	});
});