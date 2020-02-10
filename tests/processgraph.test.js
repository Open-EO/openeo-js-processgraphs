const ProcessGraphEVILegacy = require('./assets/0.4/evi.json');
const ProcessGraphEVI = require('./assets/1.0/evi.json');
const PROCESSES = require('./assets/processes.json');

const ProcessGraph = require('../src/processgraph');
const ProcessRegistry = require('../src/registry');

process.on('unhandledRejection', r => console.log(r));

describe('Process Graph Tests', () => {

	var registry;
	beforeAll(() => {
		registry = new ProcessRegistry();
		registry.addFromResponse({processes: PROCESSES});
	});

	test('Parser & Validator > Fails', async () => {
		try {
			var pg = new ProcessGraph({}, registry);
			var errors = await pg.validate(false);
			expect(errors.count()).toBeGreaterThan(0);
			expect(pg.isValid()).toBe(false);
			expect(pg.getErrors()).toStrictEqual(errors);
			expect(pg.toJSON()).toStrictEqual({});
		} catch(e) {
			expect(e).toBeNull();
		}
	});

	test('Parser & Validator > EVI with legacy graph', async () => {
		var pg = ProcessGraph.fromLegacy(ProcessGraphEVILegacy, registry, "0.4.0");
		var errors = await pg.validate(false);
		if (errors.count() > 0) {
			console.log(errors.getMessage());
		}
		expect(errors.count()).toBe(0);
		expect(pg.isValid()).toBe(true);
		expect(pg.getErrors()).toStrictEqual(errors);
		expect(pg.getStartNodeIds()).toEqual(["dc"]);
		expect(pg.toJSON()).toStrictEqual(ProcessGraphEVI);
	});

	test('Parser & Validator > EVI', async () => {
		var pg = new ProcessGraph(ProcessGraphEVI, registry);
		var errors = await pg.validate(false);
		if (errors.count() > 0) {
			console.log(errors.getMessage());
		}
		expect(errors.count()).toBe(0);
		expect(pg.isValid()).toBe(true);
		expect(pg.getErrors()).toStrictEqual(errors);
		expect(pg.getStartNodeIds()).toEqual(["dc"]);
		expect(pg.toJSON()).toStrictEqual(ProcessGraphEVI);
	});

  });