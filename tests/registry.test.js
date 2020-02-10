const PROCESSES = require('./assets/processes.json');

const BaseProcess = require('../src/process');
const ProcessRegistry = require('../src/registry');

describe('Registry Tests', () => {

	var registry;
	test('Initialize', () => {
		registry = new ProcessRegistry();
		expect(registry.count()).toBe(0);
		registry.addFromResponse({processes: PROCESSES});
		expect(registry.count()).toBe(PROCESSES.length);
	});

	var processName = "absolute";
	test('Get process', () => {
		var absolute = registry.get(processName);
		expect(absolute).toBeInstanceOf(BaseProcess);
		expect(absolute.id).toBe(processName);

		var x = registry.get("unknown-process");
		expect(x).toBeNull();
	});

	test('Get specification', () => {
		var absoluteSchema = registry.getSpecification(processName);
		expect(absoluteSchema.id).toBe(processName);

		var x2 = registry.getSpecification("unknown-process");
		expect(x2).toBeNull();

		var x3 = registry.getSpecification(null);
		expect(x3).toBeNull();
	});

	test('Get specifications', () => {
		var schemas = registry.getProcessSpecifications();
		expect(Array.isArray(schemas)).toBe(true);
		expect(schemas.length).toBe(PROCESSES.length);
	});

  });