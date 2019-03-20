const MigrateCapabilities = require('../src/migrate/capabilities.js'); 

var legacyCapability =  {
	"version":"0.3.1", 
	"endpoints":[ {
			"path":"/processes", 
			"methods":[
				"GET"
			]
		}
	],
	"billing": {
		"currency": "USD",
		"default_plan": "free",
		"plans": [
			{
				"name": "free",
				"description": "Free plan. Calculates one tile per second and a maximum amount of 100 tiles per hour.",
				"url": "http://openeo.org/plans/free-plan"
			},
			{
				"name": "business",
				"description": "Premium business plan.",
				"url": "http://openeo.org/plans/business-plan"
			}
		]
	}
};

var emptyCapability =  {
	"api_version": "0.4.0",
	"backend_version": "Unknown",
	"title": "Unknown",
	"description": "No description provided.",
	"endpoints": []
};

var expectedCapability = Object.assign({}, emptyCapability,  {
	"endpoints": [
		{
			"path":"/processes", 
			"methods":[
				"GET"
			]
		}
	],
	"billing": {
		"currency": "USD",
		"default_plan": "free",
		"plans": [
			{
				"name": "free",
				"description": "Free plan. Calculates one tile per second and a maximum amount of 100 tiles per hour.",
				"paid": false,
				"url": "http://openeo.org/plans/free-plan"
			},
			{
				"name": "business",
				"description": "Premium business plan.",
				"paid": true,
				"url": "http://openeo.org/plans/business-plan"
			}
		]
	}
});

var invalidCapability =  {
	"backend_version": "0.4.0",
	"endpoints":[]
};

var expectedInvalidCapability = Object.assign({}, emptyCapability, invalidCapability);

var expectedOutputFormats = {
	"GTiff": {
		"gis_data_types":["raster"]
	}, 
	"GeoPackage": {
		"gis_data_types":["raster", "vector"], 
		"parameters": {
			"gis_data_type": {
				"type":"string", 
				"enum":["raster", "vector"], 
				"required":true
			}, 
			"version": {
				"type":"string", 
				"description":"Set GeoPackage version. In AUTO mode, this will be equivalent to 1.2 starting with GDAL 2.3.", 
				"enum":["auto", "1", "1.1", "1.2"], 
				"default":"auto"
			}
		}
	}
}

var legacyOutputFormats =  {
	"default":"GTiff", 
	"formats": expectedOutputFormats
}

var serviceTypes = {
	"WMS": {
		"parameters": {
			"version": {
				"type": "string",
				"description": "The WMS version to use.",
				"default": "1.3.0",
				"enum": ["1.1.1","1.3.0"]
			}
		},
		"attributes": {
			"layers": {
				"type": "array",
				"description": "Array of layer names.",
				"example": ["roads","countries","water_bodies"]
			}
		},
		"variables": [
			{
				"variable_id": "layer",
				"type": "string",
				"desctiption": "The layer name.",
				"default": "roads"
			},
			{
				"variable_id": "spetial_extent_west",
				"type": "number"
			},
			{
				"variable_id": "spetial_extent_east",
				"type": "number"
			},
			{
				"variable_id": "spetial_extent_north",
				"type": "number"
			},
			{
				"variable_id": "spetial_extent_south",
				"type": "number"
			}
		],
		"links": [
			{
				"href": "https://www.opengeospatial.org/standards/wms",
				"rel": "about",
				"title": "OGC Web Map Service Standard"
			}
		]
	}
}

describe('Basic Capabilities Migration Tests', () =>  {
	test('Guess Api Versions', () =>  {
		expect(MigrateCapabilities.guessApiVersion(legacyCapability)).toBe("0.3.1"); 
		expect(MigrateCapabilities.guessApiVersion(emptyCapability)).toBe("0.4.0"); 
	}); 
	test('Migrate Capabilities', () =>  {
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec({})).toEqual(emptyCapability);
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec(invalidCapability)).toEqual(expectedInvalidCapability); 
		// Test that legacy capabilities get converted
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec(legacyCapability)).toEqual(expectedCapability); 
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec(legacyCapability, "0.3.1")).toEqual(expectedCapability); 
		// Test that capabilities following the latest spec doesn't change at all
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec(expectedCapability)).toEqual(expectedCapability);
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec(expectedCapability, "0.4.0")).toEqual(expectedCapability);
	});
	test('Migrate Billing Info', () => {
		expect(MigrateCapabilities.convertBillingToLatestSpec({}, "0.3.0")).toEqual({});
		// Test that legacy endpoints get converted
		expect(MigrateCapabilities.convertBillingToLatestSpec(legacyCapability.billing, "0.3.1")).toEqual(expectedCapability.billing);
		// Test that endpoints following the latest spec doesn't change at all
		expect(MigrateCapabilities.convertBillingToLatestSpec(expectedCapability.billing, "0.4.0")).toEqual(expectedCapability.billing); 
	});
	test('Migrate Endpoints', () => {
		expect(MigrateCapabilities.convertEndpointsToLatestSpec([], "0.3.0")).toEqual([]);
		// Test that legacy endpoints get converted
		expect(MigrateCapabilities.convertEndpointsToLatestSpec(legacyCapability.endpoints, "0.3.1")).toEqual(expectedCapability.endpoints);
		// Test that endpoints following the latest spec doesn't change at all
		expect(MigrateCapabilities.convertEndpointsToLatestSpec(expectedCapability.endpoints, "0.4.0")).toEqual(expectedCapability.endpoints); 
	});
	test('Migrate Output Formats', () => {
		expect(MigrateCapabilities.convertOutputFormatsToLatestSpec({}, "0.3.0")).toEqual({});
		// Test that legacy output formats get converted
		expect(MigrateCapabilities.convertOutputFormatsToLatestSpec(legacyOutputFormats, "0.3.1")).toEqual(expectedOutputFormats);
		// Test that output formats following the latest spec doesn't change at all
		expect(MigrateCapabilities.convertOutputFormatsToLatestSpec(expectedOutputFormats, "0.4.0")).toEqual(expectedOutputFormats); 
	}); 
	test('Migrate Service Types', () =>  {
		expect(MigrateCapabilities.convertServiceTypesToLatestSpec({}, "0.3.0")).toEqual({});
		// Test that legacy service types gets converted
		expect(MigrateCapabilities.convertServiceTypesToLatestSpec(serviceTypes, "0.3.1")).toEqual(serviceTypes); // Nothing has changed, don't change anything
		// Test that service types following the latest spec doesn't change at all
		expect(MigrateCapabilities.convertServiceTypesToLatestSpec(serviceTypes, "0.4.0")).toEqual(serviceTypes);
	});
});