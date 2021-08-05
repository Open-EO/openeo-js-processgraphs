const PROCESSES = require('../tests/assets/processes.json');

const BaseProcess = require('../src/process');
const ProcessRegistry = require('../src/registry');

describe('Registry Tests', () => {

	var registry;
	test('Initialize', () => {
		registry = new ProcessRegistry();
		expect(registry.count()).toBe(0);
		registry.addAll(PROCESSES);
		expect(registry.count()).toBe(PROCESSES.length);
	});

	test('Get process', () => {
		var processName = "absolute";
		var absolute = registry.get(processName);
		expect(absolute).toBeInstanceOf(BaseProcess);
		expect(absolute.id).toBe(processName);

		var x = registry.get("unknown-process");
		expect(x).toBeNull();
	});

	test('Get specifications', () => {
		var schemas = registry.toJSON();
		expect(Array.isArray(schemas)).toBe(true);
		expect(schemas.length).toBe(PROCESSES.length);
	});

	test('Get all specifications', () => {
		expect(registry.all()).toEqual(PROCESSES.map(p => new BaseProcess(p)));
	});

	class absolute {
		constructor() {
			this.spec = registry.get("absolute");
		}
		toJSON() {
			return this.spec;
		}
	}

	test('Add invalid specifications individually', () => {
		expect(() => registry.add(null)).toThrowError();
		expect(() => registry.add({description: "Test"})).toThrowError();
	});

	test('Add specifications individually via toJSON', () => {
		let registry2 = new ProcessRegistry();
		registry2.add(new absolute());
		var process = registry.get("absolute");
		expect(process.id).toBe("absolute");
	});

  });