const MigrateCollections = require('../src/migrate/collections.js');

var legacyMinimalCollection = {
	"name": "Sentinel-2A",
	"description": "...",
	"license": "proprietary",
	"extent": {
		"spatial": [180,-56,-180,83],
		"temporal": ["2015-06-23T00:00:00Z",null]
	},
	"links": []
};

var expectedMinimalCollection = {
	"stac_version": "0.6.1",
	"id": "Sentinel-2A",
	"description": "...",
	"license": "proprietary",
	"extent": {
		"spatial": [180,-56,-180,83],
		"temporal": ["2015-06-23T00:00:00Z",null]
	},
	"links": [],
	"properties": {}
};

var legacyBandCollection = Object.assign({}, legacyMinimalCollection, {
	"eo:bands": {
		"B1": {}
	}
});

var expectedBandCollection = Object.assign({}, expectedMinimalCollection, {
	"properties": {
		"eo:bands": [
			{
				"name": "B1"
			}
		]
	}
});

var legacyCollection = Object.assign({}, legacyMinimalCollection, {
	"title": "Sentinel-2A MSI L1C",
	"keywords": [
		"copernicus"
	],
	"provider": [
		{
			"name": "European Space Agency (ESA)",
			"url": "https://sentinel.esa.int/web/sentinel/user-guides/sentinel-2-msi"
		}
	],
	"links": [
		{
			"rel": "self",
			"href": "https://openeo.org/api/collections/Sentinel-2A"
		},
		{
			"rel": "license",
			"href": "https://scihub.copernicus.eu/twiki/pub/SciHubWebPortal/TermsConditions/Sentinel_Data_Terms_and_Conditions.pdf"
		},
		{
			"rel": "about",
			"href": "https://earth.esa.int/web/sentinel/user-guides/sentinel-2-msi/product-types/level-1c",
			"title": "ESA Sentinel-2 MSI Level-1C User Guide"
		}
	],
	"properties": {},
	"sci:citation": "Copernicus Sentinel data [Year]",
	"eo:epsg": 32632,
	"eo:platform": "sentinel-2a",
	"eo:constellation": "sentinel-2",
	"eo:bands": {
		"B1": {
			"common_name": "coastal",
			"resolution": 10,
			"wavelength": 0.4
		}
	}
});

var expectedCollection = Object.assign({}, expectedMinimalCollection, {
	"title": "Sentinel-2A MSI L1C",
	"keywords": [
		"copernicus"
	],
	"providers": [
		{
			"name": "European Space Agency (ESA)",
			"url": "https://sentinel.esa.int/web/sentinel/user-guides/sentinel-2-msi"
		}
	],
	"links": [
		{
			"rel": "self",
			"href": "https://openeo.org/api/collections/Sentinel-2A"
		},
		{
			"rel": "license",
			"href": "https://scihub.copernicus.eu/twiki/pub/SciHubWebPortal/TermsConditions/Sentinel_Data_Terms_and_Conditions.pdf"
		},
		{
			"rel": "about",
			"href": "https://earth.esa.int/web/sentinel/user-guides/sentinel-2-msi/product-types/level-1c",
			"title": "ESA Sentinel-2 MSI Level-1C User Guide"
		}
	],
	"properties": {
		"sci:citation": "Copernicus Sentinel data [Year]",
		"eo:epsg": 32632,
		"eo:platform": "sentinel-2a",
		"eo:constellation": "sentinel-2",
		"eo:bands": [
			{
				"name": "B1",
				"common_name": "coastal",
				"gsd": 10,
				"center_wavelength": 0.4
			}
		]
	}
});

describe('Basic Collection Migration Tests', () => {
	test('Migrate Collection', () => {
		expect(() => MigrateCollections.convertCollectionToLatestSpec({})).toThrow("No version specified");
		expect(MigrateCollections.convertCollectionToLatestSpec({}, "0.3.0")).toEqual({});
		// Test that a legacy collection gets converted
		expect(MigrateCollections.convertCollectionToLatestSpec(legacyMinimalCollection, "0.3.0")).toEqual(expectedMinimalCollection);
		expect(MigrateCollections.convertCollectionToLatestSpec(legacyBandCollection, "0.3.0")).toEqual(expectedBandCollection);
		expect(MigrateCollections.convertCollectionToLatestSpec(legacyCollection, "0.3.1")).toEqual(expectedCollection);
		// Test that a collection following the latest spec doesn't change at all
		expect(MigrateCollections.convertCollectionToLatestSpec(expectedCollection, "0.4.0")).toEqual(expectedCollection);
		expect(MigrateCollections.convertCollectionToLatestSpec(expectedCollection, "0.4.1")).toEqual(expectedCollection);
	});
});