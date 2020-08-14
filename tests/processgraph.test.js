const PROCESSES = require('./assets/processes.json');

const ProcessGraph = require('../src/processgraph');
const ProcessRegistry = require('../src/registry');
const BaseProcess = require('../src/process');

process.on('unhandledRejection', r => console.log(r));

class Queue {
	constructor() {
		this.list = [];
	}
	push(e) {
		this.list.push(e);
	}
	clear() {
		this.list = [];
	}
	all() {
		return this.list;
	}
}

class ProcessImpl extends BaseProcess {
	constructor(spec, queue) {
		super(spec);
		this.queue = queue;
	}
	async execute(node) {
		this.queue.push(node.id);

		// Execute callbacks
		let args = node.getArgumentNames().filter(arg => node.getArgumentType(arg) === 'callback');
		for(var name of args) {
			let callback = node.getArgument(name);
			await callback.execute(callback.getCallbackParameters());
		}

		return node.id;
	}
}

class LoadImpl extends ProcessImpl {
	async execute(node) {
		let res = await super.execute(node);

		// Execute properties callbacks
		let filters = node.getArgument("properties");
		if (Array.isArray(filters)) {
			for(var key in filters) {
				await filters[key].execute({value: 123});
			}
		}

		return res;
	}
}

var registry;
describe('Process Graph Tests', () => {

	const q = new Queue();
	beforeAll(() => {
		registry = new ProcessRegistry(PROCESSES.map(p => p.id === 'load_collection' ? new LoadImpl(p, q) : new ProcessImpl(p, q)));
	});

	test('Parser > Empty process throws by default', async () => {
		var pg = new ProcessGraph(null, registry);
		expect(() => pg.parse()).toThrow();
		var pg = new ProcessGraph({}, registry);
		expect(() => pg.parse()).toThrow();
	});

	test('Parser > Empty process allowed', async () => {
		var pg = new ProcessGraph({}, registry);
		pg.allowEmpty();
		expect(() => pg.parse()).not.toThrow();
	});

	test('Parser > Invalid process graph throws', async () => {
		var pg = new ProcessGraph({process_graph: null}, registry);
		expect(() => pg.parse()).toThrow();
	});

	test('Parser > Empty process graph throws', async () => {
		var pg = new ProcessGraph({process_graph: {}}, registry);
		expect(() => pg.parse()).toThrow();
	});

	test('Parser > Multiple result nodes throw', async () => {
		let absNode = {
			process_id: "absolute",
			arguments: {
				x: -1
			},
			result: true
		};
		var pg = new ProcessGraph({
			process_graph: {
				"abs1": absNode,
				"abs2": absNode
			}
		}, registry);
		expect(() => pg.parse()).toThrow();
	});

	test('Parser > No result node throws', async () => {
		let absNode = {
			process_id: "absolute",
			arguments: {
				x: -1
			}
		};
		var pg = new ProcessGraph({
			process_graph: {
				"abs1": absNode,
				"abs2": absNode
			}
		}, registry);
		expect(() => pg.parse()).toThrow();
	});

	test('Parser > Throw on circular refs', async () => {
		var pg = new ProcessGraph({
			process_graph: {
				"abs1": {
					process_id: "absolute",
					arguments: {
						x: {
							from_node: "abs2"
						}
					}
				},
				"abs2": {
					process_id: "absolute",
					arguments: {
						x: {
							from_node: "abs1"
						}
					},
					result: true
				}
			}
		}, registry);
		expect(() => pg.parse()).toThrow();
	});

	const ProcessGraphEVI = require('./assets/evi.json');
	test('Parse > parse EVI without registry', async () => {
		var pg = new ProcessGraph(ProcessGraphEVI);
		expect(() => pg.parse()).not.toThrow();
		expect(pg.getStartNodeIds()).toEqual(["dc"]);
	});

	test('Validator > validate EVI with registry', async () => {
		var pg = new ProcessGraph(ProcessGraphEVI, registry);
		var errors = await pg.validate(false);
		expect(errors.getAll()).toEqual([]);
		expect(pg.isValid()).toBe(true);
		expect(pg.getErrors()).toStrictEqual(errors);
		expect(pg.getStartNodeIds()).toEqual(["dc"]);
		expect(pg.toJSON()).toStrictEqual(ProcessGraphEVI);
		expect(pg.getNodeCount()).toBe(4);
	});

	const ProcessGraphInvalidArgs = require('./assets/invalid_args.json');
	test('Validator > throw on invalid argument in object', async () => {
		await validateFailsWith(ProcessGraphInvalidArgs, "The argument 'spatial_extent' in process 'load_collection' is invalid");
	});

	const ProcessGraphParamInObj = require('./assets/param_in_obj_arg.json');
	test('Validator > not throw on parameter in object', async () => {
		await validateSucceeds(ProcessGraphParamInObj);
	});

	const ProcessGraphUndefinedParam = require('./assets/undefined_param.json');
	test('Validator > do NOT allow undefined param', async () => {
		var pg = new ProcessGraph(ProcessGraphUndefinedParam, registry);
		pg.allowUndefinedParameters(false);
		await validateFailsWith(pg, "Invalid parameter 'cid' requested in the process");
	});
	test('Validator > allow undefined param', async () => {
		var pg = new ProcessGraph(ProcessGraphUndefinedParam, registry);
		pg.allowUndefinedParameters();
		await validateSucceeds(pg);
	});
	test('Validator > Fill parameters for undefined parameter refs', async () => {
		var pg = new ProcessGraph(ProcessGraphUndefinedParam, registry);
		pg.fillUndefinedParameters();
		await pg.validate();
		let param = pg.getParameter('cid');
		expect(param).not.toBeNull();
		expect(param).toHaveProperty('name');
		expect(param).toHaveProperty('description');
		expect(param).toHaveProperty('schema');
		expect(param.name).toBe('cid');
	});

	test('Validator > Argument unsupported throws', async () => {
		let pg = {
			process_graph: {
				"abs1": {
					process_id: "absolute",
					arguments: {
						z: -1
					},
					result: true
				}
			}
		};
		await validateFailsWith(pg, "Process 'absolute' does not support the following arguments: z");
	});

	test('Validator > Missing argument throws', async () => {
		let pg = {
			process_graph: {
				"abs1": {
					process_id: "absolute",
					arguments: {},
					result: true
				}
			}
		};
		await validateFailsWith(pg, "Process 'absolute' requires argument 'x'.");
	});

	let missingProcess = {
		process_graph: {
			"foobar": {
				process_id: "foo",
				arguments: {},
				result: true
			}
		}
	};
	test('Validator > Process missing', async () => {
		await validateFailsWith(missingProcess, "Process 'foo' is not supported.");
	});

	test('Validator > Validate callbacks', async () => {
		let pg = {
			process_graph: {
				"apply": {
					process_id: "apply",
					arguments: {
						data: {},
						process: missingProcess
					},
					result: true
				}
			}
		};
		await validateFailsWith(pg, "Process 'foo' is not supported.");
	});

/*	const ProcessGraphLoadCol = require('./assets/load_collection_properties.json');
	test('Executor > execute load_collection properties', async () => {
		var pg = new ProcessGraph(ProcessGraphLoadCol, registry);
		q.clear();
		var resultNode = await pg.execute();
		expect(pg.isValid()).toBe(true);
		expect(pg.getErrors().count()).toEqual(0);
		expect(resultNode.getResult()).toEqual(resultNode.id);
		expect(q.all()).toEqual(["load_collection", "cc", "pf"]);
	}); */

	test('Executor > execute EVI with registry', async () => {
		var pg = new ProcessGraph(ProcessGraphEVI, registry);
		q.clear();
		var resultNode = await pg.execute();
		expect(pg.isValid()).toBe(true);
		expect(pg.getErrors().count()).toEqual(0);
		expect(resultNode.getResult()).toEqual(resultNode.id);
		expect(q.all()).toEqual(["dc", "evi", "blue", "nir", "red", "p2", "p1", "sub", "sum", "div", "p3", "mintime", "min", "save"]);
	});

});

async function validateFailsWith(pg, msg) {
	if (!(pg instanceof ProcessGraph)) {
		pg = new ProcessGraph(pg, registry);
	}
	try {
		await pg.validate();
	}
	catch (error) {
		expect(error.message).toContain(msg);
	}
	expect(pg.isValid()).toBeFalsy();
}

async function validateSucceeds(pg) {
	if (!(pg instanceof ProcessGraph)) {
		pg = new ProcessGraph(pg, registry);
	}
	try {
		await pg.validate();
	}
	catch (error) {
		console.log(error.stack);
		expect(error).toBeUndefined();
	}
	expect(pg.isValid()).toBeTruthy();
}