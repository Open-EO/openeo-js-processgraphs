const JsonSchemaValidator = require('../src/jsonschema');
const Utils = require('../src/utils');
const epsg = require('epsg-index/all.json');

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
		expect(Utils.size(v.epsgCodes)).toBe(0);
		v.setEpsgCodes(null);
		expect(Utils.size(v.epsgCodes)).toBe(0);

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

	test('input/output-format', async() => {
		expect(v.fileFormats).toHaveProperty("input");
		expect(v.fileFormats).toHaveProperty("output");
		expect(Utils.size(v.fileFormats.input)).toBe(0);
		expect(Utils.size(v.fileFormats.output)).toBe(0);
		v.setFileFormats(null);
		expect(Utils.size(v.fileFormats.input)).toBe(0);
		expect(Utils.size(v.fileFormats.output)).toBe(0);
	});

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

	var collectionSchema = {
		"type": "string",
		"subtype": "collection-id"
	};
	test('collection-id', async () => {
		// No collections set => succeed always
		await expectSuccess(v, "S1", collectionSchema);
		// Invalid collections set => succeed always
		v.setCollections("invalid");
		await expectSuccess(v, "S1", collectionSchema);
		// Proper usage...
		v.setCollections(["S2", "S1"]);
		await expectSuccess(v, "S2", collectionSchema);
		await expectSuccess(v, "S1", collectionSchema);
		await expectError(v, "S3", collectionSchema);
		v.setCollections([{id: "S2"}, {id: "S1"}]);
		await expectSuccess(v, "S2", collectionSchema);
		await expectSuccess(v, "S1", collectionSchema);
		await expectError(v, "S3", collectionSchema);
	});

	var runtimeSchema = {
		"type": "string",
		"subtype": "udf-runtime"
	};
	var udfRuntimes = {
		"R": {
			"title": "R v3.x for Statistical Computing",
			"description": "R programming language with `Rcpp` and `rmarkdown` extensions installed.",
			"type": "language",
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
						},
						"rmarkdown": {
							"version": "1.7.0",
							"links": [
								{
									"href": "https://cran.r-project.org/web/packages/rmarkdown/index.html",
									"rel": "about"
								}
							]
						}
					}
				}
			}
		}
	};
	test('udf-runtime', async () => {
		// No collections set => succeed always
		await expectSuccess(v, "R", runtimeSchema);
		// Invalid collections set => succeed always
		v.setUdfRuntimes("invalid");
		await expectSuccess(v, "R", runtimeSchema);
		// Proper usage...
		v.setUdfRuntimes(udfRuntimes);
		await expectSuccess(v, "R", runtimeSchema);
		await expectError(v, "Python", runtimeSchema);
	});

	var wkt2Value = 'GEOGCRS["WGS 84",DATUM["World Geodetic System 1984",ELLIPSOID["WGS 84",6378137,298.257223563,LENGTHUNIT["metre",1]]],PRIMEM["Greenwich",0,ANGLEUNIT["degree",0.0174532925199433]],CS[ellipsoidal,2],AXIS["geodetic latitude (Lat)",north,ORDER[1],ANGLEUNIT["degree",0.0174532925199433]],AXIS["geodetic longitude (Lon)",east,ORDER[2],ANGLEUNIT["degree",0.0174532925199433]],ID["EPSG",4326]]';
	var wkt1Value = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AXIS["Latitude",NORTH],AXIS["Longitude",EAST],AUTHORITY["EPSG","4326"]]';
	var projValue = "+proj=moll +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs";
	var projSchema = {
		"type": "string",
		"subtype": "proj-definition"
	};
	test('proj-definition', async () => {
		await expectSuccess(v, "+proj=utm +zone=32 +datum=WGS84", projSchema);
		await expectSuccess(v, projValue, projSchema);
		await expectSuccess(v, projValue.toUpperCase(), projSchema);
		await expectError(v, wkt1Value, projSchema);
		await expectError(v, wkt2Value, projSchema);
		await expectError(v, "EPSG:32632", projSchema);
		await expectError(v, "", projSchema);
	});

	var wkt2Schema = {
		"type": "string",
		"subtype": "wkt2-definition"
	};
	test('wkt2-definition', async () => {
		await expectSuccess(v, wkt2Value, wkt2Schema);
		await expectSuccess(v, wkt2Value.toLowerCase(), wkt2Schema);
		await expectError(v, wkt1Value, wkt2Schema);
		await expectError(v, projValue, wkt2Schema);
		await expectError(v, "EPSG:32632", wkt2Schema);
		await expectError(v, "", wkt2Schema);
	});

	// Web Editor references
	var refFromNodeSchema = {
		type: 'object',
		group: 'References',
		subtype: 'from_node:1',
		isRef: 'from_node',
		from_node: '1',
		title: 'Output of #1',
		required: ["from_node"],
		properties: {
			from_node: {
				type: "string",
				const: "1"
			}
		},
		additionalProperties: false
	};
	test('ref-from_node', async () => {
		await expectSuccess(v, {from_node: "1"}, refFromNodeSchema);
		await expectError(v, {from_node: "1", foo: "bar"}, refFromNodeSchema);
		await expectError(v, {from_node: 1}, refFromNodeSchema);
		await expectError(v, {}, refFromNodeSchema);
		await expectError(v, "", refFromNodeSchema);
	});


	var pgSchema = {
		"type": "object",
		"subtype": "process-graph"
	};
	const ProcessGraphEVI = require('./assets/evi.json');
	const invalidPg = {
		process_graph: {
			"123": {
				process_id: "absolute",
				arguments: {}
			}
		}
	};
	test('process-graph', async () => {
		await expectSuccess(v, ProcessGraphEVI, pgSchema);
		await expectError(v, invalidPg, pgSchema);
		await expectError(v, {}, pgSchema);
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
	var dateType = {type: "string", subtype: "date", format: "date"};
	var temporalTypes = [dateTimeType, dateType];
	var temporalIntervalType = {
		"type": "array",
		"subtype": "temporal-interval",
		"uniqueItems": true,
		"minItems": 2,
		"maxItems": 2,
		"items": {
			"anyOf": [
				{
					"type": "string",
					"format": "date-time",
					"subtype": "date-time"
				},
				{
					"type": "string",
					"format": "date",
					"subtype": "date"
				},
				{
					"type": "null"
				}
			]
		}
	};
	var nullType = {type: "null"};
	var arrayOfAny = {type: 'array', items: {}};
	var arrayOfNumbers = {type: 'array', items: {type: 'number'}};
	var arrayOfIntegers = {type: 'array', items: {type: 'integer'}};
	var anyType = {};
	var dataCubeType = {type: "object", subtype: "datacube"};
	var dataCubeTypeXYT = {type: "object", subtype: "datacube", dimensions: [{type: 'spatial', 'axis': 'x'}, {type: 'spatial', 'axis': 'y'}, {type: 'temporal'}]};
	var dataCubeTypeGeom = {type: "object", subtype: "datacube", dimensions: [{type: 'geometry'}]};
	var dataCubeTypeT = {type: "object", subtype: "datacube", dimensions: [{type: 'temporal'}]};
	var legacyRasterCubeType = {type: "object", subtype: "raster-cube"};
	var legacyVectorCubeType = {type: "object", subtype: "vector-cube"};
	var legacyDataCubeTypes = [legacyRasterCubeType, legacyVectorCubeType];

	var schemaTests = [
		// parameter schema, value schema, expected result, strict mode?, allow value as elements?
		[numberNullType, integerType, true],
		[integerType, numberNullType, true],
		[integerType, numberNullType, true, false],
		[numberNullType, nullType, true],
		[nullType, numberNullType, true],
		[stringType, dateTimeType, true],
		[stringType, dateTimeType, true, true],
		[dateTimeType, stringType, true],
		[dateTimeType, stringType, true, false],
		[dateTimeType, dateTimeType, true],
		[dateTimeType, dateType, false],
		[dateType, dateTimeType, false],
		[temporalIntervalType, dateTimeType, false],
		[temporalIntervalType, dateType, false],
		[temporalIntervalType, temporalTypes, false],
		[temporalIntervalType, dateTimeType, true, false, true],
		[temporalIntervalType, dateType, true, false, true],
		[temporalIntervalType, temporalTypes, true, false, true],
		[arrayOfNumbers, arrayOfIntegers, true],
		[arrayOfIntegers, arrayOfNumbers, true],
		[arrayOfIntegers, arrayOfNumbers, true, false],
		[arrayOfIntegers, arrayOfAny, true],
		[arrayOfIntegers, arrayOfAny, true, false],
		[arrayOfAny, arrayOfIntegers, true],
		[numberNullType, anyType, true],
		[numberNullType, anyType, true, false],
		[anyType, numberNullType, true],
		[arrayOfNumbers, numberNullType, false, false, false],
		[arrayOfNumbers, numberNullType, true, false, true],
		[dataCubeType, nullType, false],
		[legacyDataCubeTypes, nullType, false],
		[dataCubeType, legacyRasterCubeType, true],
		[dataCubeType, legacyVectorCubeType, true],
		[dataCubeType, dataCubeType, true],
		[dataCubeType, dataCubeTypeGeom, true],
		[dataCubeType, dataCubeTypeT, true],
		[dataCubeType, dataCubeTypeXYT, true],
		[dataCubeTypeXYT, legacyRasterCubeType, true],
		[dataCubeTypeXYT, legacyVectorCubeType, true],
		[dataCubeTypeXYT, dataCubeType, true],
		[dataCubeTypeXYT, dataCubeTypeT, true],
		[dataCubeTypeXYT, dataCubeTypeXYT, true],
		[dataCubeTypeXYT, dataCubeTypeGeom, true],
		[dataCubeTypeGeom, legacyRasterCubeType, true],
		[dataCubeTypeGeom, legacyVectorCubeType, true],
		[dataCubeTypeGeom, dataCubeType, true],
		[dataCubeTypeGeom, dataCubeTypeT, true],
		[dataCubeTypeGeom, dataCubeTypeXYT, true],
		[dataCubeTypeGeom, dataCubeTypeGeom, true],
		[dataCubeTypeT, legacyRasterCubeType, true],
		[dataCubeTypeT, legacyVectorCubeType, true],
		[dataCubeTypeT, dataCubeType, true],
		[dataCubeTypeT, dataCubeTypeT, true],
		[dataCubeTypeT, dataCubeTypeXYT, true],
		[dataCubeTypeT, dataCubeTypeGeom, true],
		[legacyRasterCubeType, legacyRasterCubeType, true],
		[legacyRasterCubeType, legacyVectorCubeType, false],
		[legacyRasterCubeType, dataCubeType, true],
		[legacyRasterCubeType, dataCubeTypeT, true],
		[legacyRasterCubeType, dataCubeTypeXYT, true],
		[legacyRasterCubeType, dataCubeTypeGeom, true],
		[legacyVectorCubeType, legacyRasterCubeType, false],
		[legacyVectorCubeType, legacyVectorCubeType, true],
		[legacyVectorCubeType, dataCubeType, true],
		[legacyVectorCubeType, dataCubeTypeT, true],
		[legacyVectorCubeType, dataCubeTypeXYT, true],
		[legacyVectorCubeType, dataCubeTypeGeom, true],
	];

	test.each(schemaTests)('isSchemaCompatible: %o and %o => %p', async (param, value, expected, strict = false, allowValueAsElements = false) => {
		expect(await JsonSchemaValidator.isSchemaCompatible(param, value, strict, allowValueAsElements)).toBe(expected);
	});

});