const PROCESSES = require('./assets/processes.json');

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
		checkAbsolute(registry);

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

	test('Add specifications individually', () => {
		expect(() => registry.add(null)).toThrowError();
		expect(() => registry.add({description: "Test"})).toThrowError();

		let registry2 = new ProcessRegistry();
		class absolute {
			constructor() {
				this.spec = registry.get("absolute");
			}
			toJSON() {
				return this.spec;
			}
		}
		registry2.add(new absolute());
		checkAbsolute(registry2);
	});

  });

  function checkAbsolute(reg) {
		var processName = "absolute";
		var absolute = reg.get(processName);
		expect(absolute).toBeInstanceOf(BaseProcess);
		expect(absolute.id).toBe(processName);
  }