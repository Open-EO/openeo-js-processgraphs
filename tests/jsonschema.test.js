const JsonSchemaValidator = require('../src/jsonschema');
const epsg = require('epsg-index/all.json');
const Utils = require('@openeo/js-commons/src/utils.js');

process.on('unhandledRejection', r => console.log(r));

var errors;
async function expectSuccess(validator, value, schema) {
	errors = await validator.validateValue(value, schema);
	expect(errors).toEqual([]);
}

async function expectError(validator, value, schema) {
	errors = await validator.validateValue(value, schema);
	expect(errors.length).toBeGreaterThan(0);
}

describe('JSON Schema Validator Tests', () => {

	var v;
	beforeEach(() => {
		v = new JsonSchemaValidator();
	});

	var schema = [
		{type: 'string'},
		{type: 'null'}
	];
	var expectedSchema = {
		$schema: "http://json-schema.org/draft-07/schema#",
		anyOf: [
			{type: 'string'},
			{type: 'null'}
		]
	};
	test('makeSchema', async () => {
		let updatedSchema = v.makeSchema(schema);
		expect(updatedSchema).toEqual(expectedSchema);
		// Make sure the original objects stays as it was
		expect(schema).toEqual([
			{type: 'string'},
			{type: 'null'}
		]);
	});

	var epsgSchema = {
		"type": "integer",
		"subtype": "epsg-code"
	};
	test('epsg-code without list', async () => {
		await expectSuccess(v, 2000, epsgSchema);
		await expectSuccess(v, 3857, epsgSchema);
		await expectSuccess(v, 32766, epsgSchema);
		await expectSuccess(v, 69036405, epsgSchema);
		await expectError(v, 0, epsgSchema);
		await expectError(v, -4326, epsgSchema);
	});
	test('epsg-code with list', async () => {
		v.setEpsgCodes(Object.keys(epsg));
		await expectSuccess(v, 2000, epsgSchema);
		await expectSuccess(v, 3857, epsgSchema);
		await expectSuccess(v, 32766, epsgSchema);
		await expectSuccess(v, 4903, epsgSchema);
		await expectError(v, 69036405, epsgSchema); // Deprecated in EPSG code list, use 4903 instead
		await expectError(v, 0, epsgSchema);
		await expectError(v, -4326, epsgSchema);
	});

	var geoJsonSchema = {
		"type": "object",
		"subtype": "geojson"
	};
	var geoJsonExampleSuccessPoint = {
		"type": "Point",
		"coordinates": [7.0069, 51.1623]
	};
	var geoJsonExampleSuccessPolygon = {
		"type": "Polygon",
		"coordinates": [
			[[35, 10], [45, 45], [15, 40], [10, 20], [35, 10]],
			[[20, 30], [35, 35], [30, 20], [20, 30]]
		]
	};
	var geoJsonExampleSuccessGeomColl = {
		"type": "GeometryCollection",
		"geometries": [
			{
				"type": "Point",
				"coordinates": [40, 10]
			},
			{
				"type": "LineString",
				"coordinates": [
					[10, 10], [20, 20], [10, 40]
				]
			}
		]
	};
	var geoJsonExampleSuccessFeature = {
		"type": "Feature",
		"geometry": {
			"type": "Point",
			"coordinates": [7.0069, 51.1623]
		},
		"properties": {
			"prop": "value"
		}
	};
	var geoJsonExampleSuccessFeatureCollection = {
		"type": "FeatureCollection",
		"features": []
	};
	var geoJsonExampleFail1 = {
		"type": "FeatureCollection"
	};
	var geoJsonExampleFail2 = {
		"type": "POINT",
		"coordinates": [7.0069, 51.1623]
	};
	var geoJsonExampleFail3 = {
		"type": "Feature",
		"geometry": {
			"type": "Point",
			"coordinates": [7.0069, 51.1623]
		}
	};
	var geoJsonExampleFail4 = {
		"type": "Polygon",
		"coordinates": [7.0069, 51.1623]
	};
	var geoJsonExampleFail5 = Object.assign({}, geoJsonExampleSuccessFeatureCollection, {properties: {}});

	test('geojson', async () => {
		try {
			await expectSuccess(v, geoJsonExampleSuccessPoint, geoJsonSchema);
			await expectSuccess(v, geoJsonExampleSuccessPolygon, geoJsonSchema);
			await expectSuccess(v, geoJsonExampleSuccessGeomColl, geoJsonSchema);
			await expectSuccess(v, geoJsonExampleSuccessFeature, geoJsonSchema);
			await expectSuccess(v, geoJsonExampleSuccessFeatureCollection, geoJsonSchema);
			await expectError(v, geoJsonExampleFail1, geoJsonSchema);
			await expectError(v, geoJsonExampleFail2, geoJsonSchema);
			await expectError(v, geoJsonExampleFail3, geoJsonSchema);
			await expectError(v, geoJsonExampleFail4, geoJsonSchema);
// Currently not properly covered by the official GeoJSON schema
//			await expectError(v, geoJsonExampleFail5, geoJsonSchema);
		} catch (error) {
			expect(error).toBeUndefined();
		}
	});

	var formats = {
		"png": {},
		"GTiff": {}
	};
	var fileFormats = {
		input: formats,
		output: formats
	};
	var outputFormatSchema = {
		"type": "string",
		"subtype": "output-format"
	};
	test('output-format', async () => {
		// No file formats set => succeed always
		await expectSuccess(v, "GTiff", outputFormatSchema);
		await expectSuccess(v, "jpeg", outputFormatSchema);
		v.setFileFormats(fileFormats);
		await expectSuccess(v, "GTiff", outputFormatSchema);
		await expectSuccess(v, "PNG", outputFormatSchema);
		await expectSuccess(v, "png", outputFormatSchema);
		await expectSuccess(v, "Png", outputFormatSchema);
		await expectError(v, "jpeg", outputFormatSchema);
		await expectError(v, "", outputFormatSchema);
	});
	var inputFormatSchema = {
		"type": "string",
		"subtype": "input-format"
	};
	test('input-format', async () => {
		// File formats set but invalid => fail always
		v.setFileFormats({input: null, output: formats});
		await expectError(v, "GTiff", inputFormatSchema);
		await expectError(v, "jpeg", inputFormatSchema);
		v.setFileFormats(fileFormats);
		await expectSuccess(v, "GTiff", inputFormatSchema);
		await expectSuccess(v, "PNG", inputFormatSchema);
		await expectSuccess(v, "png", inputFormatSchema);
		await expectSuccess(v, "Png", inputFormatSchema);
		await expectError(v, "jpeg", inputFormatSchema);
		await expectError(v, "", inputFormatSchema);
	});

	var projSchema = {
		"type": "string",
		"subtype": "proj-definition"
	};
	test('proj-definition', async () => {
		await expectSuccess(v, "+proj=utm +zone=32 +datum=WGS84", projSchema);
		await expectSuccess(v, "+proj=moll +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs", projSchema);
		await expectError(v, "EPSG:32632", projSchema);
		await expectError(v, "", projSchema);
	});

	var temporalIntervalSchema = {
		"type": "array",
		"subtype": "temporal-interval"
	};
	test('temporal-interval', async () => {
		await expectSuccess(v, ["2020-01-01T00:00:00Z", "2020-01-01T00:00:00Z"], temporalIntervalSchema);
		await expectSuccess(v, ["10:00:00Z", "12:00:00Z"], temporalIntervalSchema);
		await expectSuccess(v, ["2020-01-01", null], temporalIntervalSchema);
		await expectError(v, [], temporalIntervalSchema);
		await expectError(v, [null, null], temporalIntervalSchema);
		await expectError(v, ["2021-01-01", "2020-01-01"], temporalIntervalSchema);
	});

	var temporalIntervalsSchema = {
		"type":  "array",
		"subtype": "temporal-intervals"
	};
	test('temporal-intervals', async () => {
		await expectSuccess(v, [["2020-01-01T00:00:00Z", "2020-01-01T00:00:00Z"]], temporalIntervalsSchema);
		await expectError(v, [], temporalIntervalsSchema);
		await expectError(v, ["2020-01-01", null], temporalIntervalsSchema);
		await expectError(v, [[null, null], ["2020-01-01T00:00:00Z", "2020-01-01T00:00:00Z"]], temporalIntervalsSchema);
	});

	var numberNullType = {type: ["number","null"]};
	var integerType = {type: "integer"};
	var stringType = {type: "string"};
	var dateTimeType = {type: "string", subtype: "date-time", format: "date-time"};
	var nullType = {type: "null"};
	var arrayOfAny = {type: 'array', items: {}};
	var arrayOfNumbers = {type: 'array', items: {type: 'number'}};
	var arrayOfIntegers = {type: 'array', items: {type: 'integer'}};
	var anyType = {};
	var rasterCubeType = {type: "object", subtype: "raster-cube"};
	var vectorCubeType = {type: "object", subtype: "vector-cube"};
	var dataCubeType = [rasterCubeType, vectorCubeType];
	var load_collection_spatial_extent = [
		{"title":"Bounding Box","type":"object","subtype":"bounding-box","required":["west","south","east","north"],"properties":{"west":{"description":"West (lower left corner, coordinate axis 1).","type":"number"},"south":{"description":"South (lower left corner, coordinate axis 2).","type":"number"},"east":{"description":"East (upper right corner, coordinate axis 1).","type":"number"},"north":{"description":"North (upper right corner, coordinate axis 2).","type":"number"},"base":{"description":"Base (optional, lower left corner, coordinate axis 3).","type":["number","null"],"default":null},"height":{"description":"Height (optional, upper right corner, coordinate axis 3).","type":["number","null"],"default":null},"crs":{"description":"Coordinate reference system of the extent specified as EPSG code or PROJ definition. Whenever possible, it is recommended to use EPSG codes instead of PROJ definitions. Defaults to `4326` (EPSG code 4326) unless the client explicitly requests a different coordinate reference system.","schema":{"title":"EPSG Code","type":"integer","subtype":"epsg-code","examples":[3857],"default":4326}}}},
		{"title":"GeoJSON Polygon(s)","type":"object","subtype":"geojson"},
		{"type":"null"}
	];

	test('getTypeForValue', async () => {
		expect(await v.getTypeForValue([stringType, nullType], null)).toBe("1");
		expect(await v.getTypeForValue([stringType, nullType], "Test")).toBe("0");
		expect(await v.getTypeForValue([stringType, nullType], 123)).toBeUndefined();
		expect(await v.getTypeForValue({nil: nullType, string: stringType, datetime: dateTimeType}, "2019-01-01T00:00:00Z")).toStrictEqual(["string","datetime"]);

		expect(await v.getTypeForValue(load_collection_spatial_extent, {"west":-2.7634,"south":43.0408,"east":-1.121,"north":43.8385})).toBe("0");
		expect(await v.getTypeForValue(load_collection_spatial_extent, {"type": "Polygon","coordinates": [[[100.0, 0.0],[101.0, 0.0],[101.0, 1.0],[100.0, 1.0],[100.0, 0.0]]]})).toBe("1");
		expect(await v.getTypeForValue(load_collection_spatial_extent, null)).toBe("2");
	});

	test('isSchemaCompatible', async () => {
		expect(await JsonSchemaValidator.isSchemaCompatible(numberNullType, integerType)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(integerType, numberNullType)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(integerType, numberNullType, true)).toBeFalsy();
		expect(await JsonSchemaValidator.isSchemaCompatible(numberNullType, nullType)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(nullType, numberNullType)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(stringType, dateTimeType)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(stringType, dateTimeType, true)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(dateTimeType, stringType)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(dateTimeType, stringType, true)).toBeFalsy();
		expect(await JsonSchemaValidator.isSchemaCompatible(dateTimeType, dateTimeType)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(arrayOfNumbers, arrayOfIntegers)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(arrayOfIntegers, arrayOfNumbers)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(arrayOfIntegers, arrayOfNumbers, true)).toBeFalsy();
		expect(await JsonSchemaValidator.isSchemaCompatible(arrayOfIntegers, arrayOfAny)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(arrayOfIntegers, arrayOfAny, true)).toBeFalsy();
		expect(await JsonSchemaValidator.isSchemaCompatible(arrayOfAny, arrayOfIntegers)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(numberNullType, anyType)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(numberNullType, anyType, true)).toBeFalsy();
		expect(await JsonSchemaValidator.isSchemaCompatible(anyType, numberNullType)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(dataCubeType, nullType)).toBeFalsy();
		expect(await JsonSchemaValidator.isSchemaCompatible(dataCubeType, rasterCubeType)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(dataCubeType, vectorCubeType)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(rasterCubeType, dataCubeType)).toBeTruthy();
		expect(await JsonSchemaValidator.isSchemaCompatible(rasterCubeType, vectorCubeType)).toBeFalsy();
		expect(await JsonSchemaValidator.isSchemaCompatible(arrayOfNumbers, numberNullType, false, false)).toBeFalsy();
		expect(await JsonSchemaValidator.isSchemaCompatible(arrayOfNumbers, numberNullType, false, true)).toBeTruthy();
	});

  });