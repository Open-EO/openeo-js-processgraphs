const ProcessGraphEVI = require('./assets/evi.json');
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

	test('Parser & Validator > Empty process throws', async () => {
		var pg = new ProcessGraph({}, registry);
		expect(() => pg.parse()).toThrow();
	});

	test('Parser & Validator > Invalid process graph throws', async () => {
		var pg = new ProcessGraph({process_graph: null}, registry);
		expect(() => pg.parse()).toThrow();
	});

	test('Parser & Validator > Empty process graph fails', async () => {
		try {
			var process = {
				process_graph: {}
			};
			var pg = new ProcessGraph(process, registry);
			var errors = await pg.validate(false);
			expect(errors.count()).toBeGreaterThan(0);
			expect(pg.isValid()).toBe(false);
			expect(pg.getErrors()).toStrictEqual(errors);
			expect(pg.toJSON()).toStrictEqual(process);
		} catch(e) {
			expect(e).toBeNull();
		}
	});

	test('Parser & Validator > parse EVI without registry', async () => {
		var pg = new ProcessGraph(ProcessGraphEVI);
		expect(() => pg.parse()).not.toThrow();
		expect(pg.getStartNodeIds()).toEqual(["dc"]);
	});

	test('Parser & Validator > validate EVI with registry', async () => {
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