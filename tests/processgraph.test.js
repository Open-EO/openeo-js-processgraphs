const ProcessGraphEVI = require('./processgraph-evi.json');
const PROCESSES = require('./processes.json');

const BaseProcess = require('../src/processgraph/process');
const ProcessGraph = require('../src/processgraph/processgraph');
const ProcessRegistry = require('../src/processgraph/registry');

describe('Process Graph Tests', () => {

	process.on('unhandledRejection', r => console.log(r));

	var registry;
	beforeAll(() => {
		registry = new ProcessRegistry();
		registry.addFromResponse({processes: PROCESSES});
	});

	test('Registry', () => {
		expect(registry.count()).toEqual(PROCESSES.length);

		var processName = "absolute";
		var absolute = registry.get(processName);
		expect(absolute).toBeInstanceOf(BaseProcess);
		expect(absolute.schema.id).toBe(processName);

		var x = registry.get("unknown-process");
		expect(x).toBeNull();

		var schemas = registry.getProcessSchemas();
		expect(Array.isArray(schemas)).toBe(true);
		expect(schemas.length).toBe(PROCESSES.length);
	});

	test('Parser & Validator > Fails', async () => {
		try {
			var pg = new ProcessGraph({}, registry);
			var errors = await pg.validate(false);
			expect(errors.count()).toBeGreaterThan(0);
		} catch(e) {
			expect(e).toBeNull();
		}
	});

	test('Parser & Validator > EVI', async () => {
		try {
			var pg = new ProcessGraph(ProcessGraphEVI, registry);
			var errors = await pg.validate(false);
			if (errors.count() > 0) {
				console.log(errors.getMessage());
			}
			expect(errors.count()).toBe(0);
		} catch(e) {
			expect(e).toBeNull();
		}
	});

  });