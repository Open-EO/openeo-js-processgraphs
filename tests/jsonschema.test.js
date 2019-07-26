const JsonSchemaValidator = require('../src/processgraph/jsonschema');
const geoJsonSchemaFull = require('./GeoJSON.json');

describe('JSON Schema Validator Tests', () => {

	process.on('unhandledRejection', r => console.log(r));

	var v;
	var errors;
	beforeAll(() => {
		v = new JsonSchemaValidator();
	});

	var epsgSchema = {
		"type": "integer",
		"format": "epsg-code"
	};
	test('epsg-code', async () => {
		errors = await v.validateJson(2000, epsgSchema);
		expect(errors.length).toBe(0);
		errors = await v.validateJson(7099, epsgSchema);
		expect(errors.length).toBe(0);
		errors = await v.validateJson(32766, epsgSchema);
		expect(errors.length).toBe(0);
		errors = await v.validateJson(69036405, epsgSchema);
		expect(errors.length).toBe(0);
/*		errors = await v.validateJson(0, epsgSchema);
		expect(errors.length).toBeGreaterThan(0);
		errors = await v.validateJson(-4326, epsgSchema);
		expect(errors.length).toBeGreaterThan(0); */
	});

	var geoJsonSchema = {
		"type": "object",
		"format": "geojson"
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
	test('geojson (simple)', async () => {
		errors = await v.validateJson(geoJsonExampleSuccessPoint, geoJsonSchema);
		expect(errors).toEqual([]);
		errors = await v.validateJson(geoJsonExampleSuccessPolygon, geoJsonSchema);
		expect(errors).toEqual([]);
		errors = await v.validateJson(geoJsonExampleSuccessGeomColl, geoJsonSchema);
		expect(errors).toEqual([]);
		errors = await v.validateJson(geoJsonExampleSuccessFeature, geoJsonSchema);
		expect(errors).toEqual([]);
		errors = await v.validateJson(geoJsonExampleSuccessFeatureCollection, geoJsonSchema);
		expect(errors).toEqual([]);
/*		errors = await v.validateJson(geoJsonExampleFail1, geoJsonSchema);
		expect(errors.length).toBeGreaterThan(0);
		errors = await v.validateJson(geoJsonExampleFail2, geoJsonSchema);
		expect(errors.length).toBeGreaterThan(0);
		errors = await v.validateJson(geoJsonExampleFail3, geoJsonSchema);
		expect(errors.length).toBeGreaterThan(0); */
	});
	test('geojson (full)', async () => {
		v.setGeoJsonSchema(geoJsonSchemaFull);
		errors = await v.validateJson(geoJsonExampleSuccessPoint, geoJsonSchema);
		expect(errors).toEqual([]);
		errors = await v.validateJson(geoJsonExampleSuccessPolygon, geoJsonSchema);
		expect(errors).toEqual([]);
		errors = await v.validateJson(geoJsonExampleSuccessGeomColl, geoJsonSchema);
		expect(errors).toEqual([]);
		errors = await v.validateJson(geoJsonExampleSuccessFeature, geoJsonSchema);
		expect(errors).toEqual([]);
		errors = await v.validateJson(geoJsonExampleSuccessFeatureCollection, geoJsonSchema);
		expect(errors).toEqual([]);
/*		errors = await v.validateJson(geoJsonExampleFail1, geoJsonSchema);
		expect(errors.length).toBeGreaterThan(0);
		errors = await v.validateJson(geoJsonExampleFail2, geoJsonSchema);
		expect(errors.length).toBeGreaterThan(0);
		errors = await v.validateJson(geoJsonExampleFail3, geoJsonSchema);
		expect(errors.length).toBeGreaterThan(0);
		errors = await v.validateJson(geoJsonExampleFail4, geoJsonSchema);
		expect(errors.length).toBeGreaterThan(0);
		errors = await v.validateJson(geoJsonExampleFail5, geoJsonSchema);
		expect(errors.length).toBeGreaterThan(0); */
	});

	var outputFormats = {
		"png": {},
		"GTiff": {}
	};
	var outputFormatSchema = {
		"type": "string",
		"format": "output-format"
	};
	test('output-format', async () => {
		v.setOutputFormats(outputFormats);
		errors = await v.validateJson("GTiff", outputFormatSchema);
		expect(errors.length).toBe(0);
		errors = await v.validateJson("PNG", outputFormatSchema);
		expect(errors.length).toBe(0);
		errors = await v.validateJson("png", outputFormatSchema);
		expect(errors.length).toBe(0);
		errors = await v.validateJson("Png", outputFormatSchema);
		expect(errors.length).toBe(0);
		errors = await v.validateJson("jpeg", outputFormatSchema);
		expect(errors.length).toBeGreaterThan(0);
		errors = await v.validateJson("", outputFormatSchema);
		expect(errors.length).toBeGreaterThan(0);
	});

	var projSchema = {
		"type": "string",
		"format": "proj-definition"
	};
	test('proj-definition', async () => {
		errors = await v.validateJson("+proj=utm +zone=32 +datum=WGS84", projSchema);
		expect(errors.length).toBe(0);
		errors = await v.validateJson("+proj=moll +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs", projSchema);
		expect(errors.length).toBe(0);
		errors = await v.validateJson("EPSG:32632", projSchema);
		expect(errors.length).toBeGreaterThan(0);
		errors = await v.validateJson("", projSchema);
		expect(errors.length).toBeGreaterThan(0);
	});

	var numberNullType = {type: ["number","null"]};
	var integerType = {type: "integer"};
	var stringType = {type: "string"};
	var dateTimeType = {type: "string", format: "date-time"};
	var nullType = {type: "null"};
	var arrayOfAny = {type: 'array', items: {}};
	var arrayOfNumbers = {type: 'array', items: {type: 'number'}};
	var arrayOfIntegers = {type: 'array', items: {type: 'integer'}};
	var anyType = {};
	var rasterCubeType = {type: "object",format: "raster-cube"};
	var vectorCubeType = {type: "object",format: "vector-cube"};
	var dataCubeType = {anyOf: [rasterCubeType, vectorCubeType]};

	test('getTypeForValue', async () => {
		expect(await JsonSchemaValidator.getTypeForValue([stringType, nullType], null)).toBe("1");
		expect(await JsonSchemaValidator.getTypeForValue([stringType, nullType], "Test")).toBe("0");
		expect(await JsonSchemaValidator.getTypeForValue([stringType, nullType], 123)).toBeUndefined();
		expect(await JsonSchemaValidator.getTypeForValue({nil: nullType, string: stringType, datetime: dateTimeType}, "2019-01-01T00:00:00Z")).toStrictEqual(["string","datetime"]);
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