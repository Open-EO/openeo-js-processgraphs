const MigrateCapabilities = require('../src/migrate/capabilities.js');

var endpoints = [
	{
		"path":"/processes", 
		"methods":[
			"GET"
		]
	},
	{
		"path":"/output_formats", 
		"methods":[
			"GET"
		]
	}
];

var freePlan = {
	"name": "free",
	"description": "Free plan. Calculates one tile per second and a maximum amount of 100 tiles per hour.",
	"url": "http://openeo.org/plans/free-plan"
};
var businessPlan = {
	"name": "business",
	"description": "Premium business plan.",
	"url": "http://openeo.org/plans/business-plan"
};

var billing03 = {
	"currency": "USD",
	"default_plan": "free",
	"plans": [freePlan, businessPlan]
};
var billing04 = {
	"currency": "USD",
	"default_plan": "free",
	"plans": [
		Object.assign({}, freePlan, {paid: false}),
		Object.assign({}, businessPlan, {paid: true}),
	]
};

var legacyCapability03 = {
	"version":"0.3.1", 
	"endpoints":endpoints,
	"billing": billing03
};

var legacyCapability04 = {
	"api_version":"0.4.1",
	"endpoints":endpoints,
	"billing": billing04
};

var emptyCapability =  {
	"api_version": "1.0.0",
	"backend_version": "Unknown",
	"title": "Unknown",
	"description": "",
	"endpoints": [],
	"links": []
};

var expectedCapability = Object.assign({}, emptyCapability,  {
	"endpoints": endpoints,
	"billing": billing04
});
var expectedCapabilityWithOldVersionNumber = Object.assign({}, expectedCapability, {api_version: "0.4.1"});

var invalidCapability =  {
	"backend_version": "1.0.0",
	"endpoints":[]
};

var expectedInvalidCapability = Object.assign({}, emptyCapability, invalidCapability);

var emptyFileFormats = {
	output: {},
	input: {}
};

var legacyOutputFormats04 = {
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
};

var expectedFileFormats = {
	"output": legacyOutputFormats04,
	"input": {}
};

var legacyOutputFormats03 =  {
	"default":"GTiff", 
	"formats": legacyOutputFormats04
};

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
};

var udfRuntimes = {
	"PHP7": {
	  "description": "Just an example how to reference a docker image.",
	  "docker": "openeo/udf-php7",
	  "default": "latest",
	  "tags": [
		"latest",
		"7.3.1"
	  ],
	  "links": [
		{
		  "href": "https://hub.docker.com/openeo/udf-php7/",
		  "rel": "about"
		}
	  ]
	},
	"R": {
	  "description": "R programming language with Rcpp and rmarkdown.",
	  "default": "3.5.2",
	  "versions": {
		"3.1.0": {
		  "libraries": {
			"Rcpp": {
			  "version": "1.0.10",
			  "links": [
				{
				  "href": "https://cran.r-project.org/web/packages/Rcpp/index.html",
				  "rel": "about"
				}
			  ]
			}
		  }
		}
	  }
	}
  };

describe('Basic Capabilities Migration Tests', () =>  {
	test('Guess Api Versions', () =>  {
		expect(MigrateCapabilities.guessApiVersion({})).toBe("0.3");
		expect(MigrateCapabilities.guessApiVersion({endpoints: endpoints})).toBe("0.4");
		expect(MigrateCapabilities.guessApiVersion({title: "openEO"})).toBe("1.0");
		expect(MigrateCapabilities.guessApiVersion(legacyCapability03)).toBe("0.3.1");
		expect(MigrateCapabilities.guessApiVersion(legacyCapability04)).toBe("0.4.1");
		expect(MigrateCapabilities.guessApiVersion(emptyCapability)).toBe("1.0.0");
	}); 
	test('Migrate Capabilities', () =>  {
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec({})).toEqual(emptyCapability);
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec(invalidCapability)).toEqual(expectedInvalidCapability); 
		// Test that legacy capabilities get converted
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec(legacyCapability03)).toEqual(expectedCapability);
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec(legacyCapability03, "0.3.1")).toEqual(expectedCapability);
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec(legacyCapability04)).toEqual(expectedCapability);
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec(legacyCapability04, null, false)).toEqual(expectedCapabilityWithOldVersionNumber);
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec(legacyCapability04, "0.4.0")).toEqual(expectedCapability); 
		// Test that capabilities following the latest spec doesn't change at all
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec(expectedCapability)).toEqual(expectedCapability);
		expect(MigrateCapabilities.convertCapabilitiesToLatestSpec(expectedCapability, "1.0.0")).toEqual(expectedCapability);
	});
	test('Migrate Billing Info', () => {
		expect(MigrateCapabilities.convertBillingToLatestSpec(1, "0.3.0")).toEqual({});
		expect(MigrateCapabilities.convertBillingToLatestSpec({}, "0.3.0")).toEqual({});
		expect(MigrateCapabilities.convertBillingToLatestSpec({}, "1.0.0")).toEqual({});
		// Test that legacy endpoints get converted
		expect(MigrateCapabilities.convertBillingToLatestSpec(legacyCapability03.billing, "0.3.1")).toEqual(expectedCapability.billing);
		expect(MigrateCapabilities.convertBillingToLatestSpec(legacyCapability04.billing, "0.4.0")).toEqual(expectedCapability.billing); 
		// Test that endpoints following the latest spec doesn't change at all
		expect(MigrateCapabilities.convertBillingToLatestSpec(expectedCapability.billing, "1.0.0")).toEqual(expectedCapability.billing); 
	});
	test('Migrate Endpoints', () => {
		expect(MigrateCapabilities.convertEndpointsToLatestSpec(1, "0.3.0")).toEqual([]);
		expect(MigrateCapabilities.convertEndpointsToLatestSpec([], "0.3.0")).toEqual([]);
		expect(MigrateCapabilities.convertEndpointsToLatestSpec([], "1.0.0")).toEqual([]);
		// Test that legacy endpoints get converted
		expect(MigrateCapabilities.convertEndpointsToLatestSpec(legacyCapability03.endpoints, "0.3.1")).toEqual(expectedCapability.endpoints);
		expect(MigrateCapabilities.convertEndpointsToLatestSpec(legacyCapability04.endpoints, "0.4.0")).toEqual(expectedCapability.endpoints); 
		// Test that endpoints following the latest spec doesn't change at all
		expect(MigrateCapabilities.convertEndpointsToLatestSpec(expectedCapability.endpoints, "1.0.0")).toEqual(expectedCapability.endpoints); 
	});
	test('Migrate File Formats', () => {
		expect(MigrateCapabilities.convertFileFormatsToLatestSpec(1, "0.3.0")).toEqual(emptyFileFormats);
		expect(MigrateCapabilities.convertFileFormatsToLatestSpec({}, "0.3.0")).toEqual(emptyFileFormats);
		expect(MigrateCapabilities.convertFileFormatsToLatestSpec({}, "1.0.0")).toEqual(emptyFileFormats);
		// Check the legacy alias convertOutputFormatsToLatestSpec
		expect(MigrateCapabilities.convertOutputFormatsToLatestSpec({}, "0.4.0")).toEqual(emptyFileFormats);
		// Test that legacy output formats get converted
		expect(MigrateCapabilities.convertFileFormatsToLatestSpec(legacyOutputFormats03, "0.3.1")).toEqual(expectedFileFormats);
		expect(MigrateCapabilities.convertFileFormatsToLatestSpec(legacyOutputFormats04, "0.4.0")).toEqual(expectedFileFormats); 
		// Test that output formats following the latest spec doesn't change at all
		expect(MigrateCapabilities.convertFileFormatsToLatestSpec(expectedFileFormats, "1.0.0")).toEqual(expectedFileFormats); 
	});
	test('Migrate Service Types', () =>  {
		expect(MigrateCapabilities.convertServiceTypesToLatestSpec(1, "0.3.0")).toEqual({});
		expect(MigrateCapabilities.convertServiceTypesToLatestSpec({}, "0.3.0")).toEqual({});
		expect(MigrateCapabilities.convertServiceTypesToLatestSpec({}, "1.0.0")).toEqual({});
		// Test that legacy service types gets converted
		expect(MigrateCapabilities.convertServiceTypesToLatestSpec(serviceTypes, "0.3.1")).toEqual(serviceTypes); // Nothing has changed, don't change anything
		expect(MigrateCapabilities.convertServiceTypesToLatestSpec(serviceTypes, "0.4.0")).toEqual(serviceTypes); // Nothing has changed, don't change anything
		// Test that service types following the latest spec doesn't change at all
		expect(MigrateCapabilities.convertServiceTypesToLatestSpec(serviceTypes, "1.0.0")).toEqual(serviceTypes);
	});
	test('Migrate UDF Runtimes', () =>  {
		expect(MigrateCapabilities.convertUdfRuntimesToLatestSpec(1, "0.3.0")).toEqual({});
		expect(MigrateCapabilities.convertUdfRuntimesToLatestSpec({}, "0.3.0")).toEqual({});
		expect(MigrateCapabilities.convertUdfRuntimesToLatestSpec({}, "1.0.0")).toEqual({});
		// Test that legacy service types gets converted
		expect(MigrateCapabilities.convertUdfRuntimesToLatestSpec(udfRuntimes, "0.3.1")).toEqual(udfRuntimes); // Nothing has changed, don't change anything
		expect(MigrateCapabilities.convertUdfRuntimesToLatestSpec(udfRuntimes, "0.4.0")).toEqual(udfRuntimes); // Nothing has changed, don't change anything
		// Test that service types following the latest spec doesn't change at all
		expect(MigrateCapabilities.convertUdfRuntimesToLatestSpec(udfRuntimes, "1.0.0")).toEqual(udfRuntimes);
	});
});