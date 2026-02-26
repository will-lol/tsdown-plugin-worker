//#region tests/fixtures/_shared/simple-worker.ts?worker
function WorkerWrapper(options) {
	return new Worker(new URL("simple-worker.js", import.meta.url), {
		type: "module",
		name: options?.name
	});
}

//#endregion
//#region tests/fixtures/basic/input.ts
function createWorker() {
	return new WorkerWrapper();
}

//#endregion
export { createWorker };