//#region tests/fixtures/new-url-pattern/input.ts
const worker = new Worker(new URL("simple-worker.js", import.meta.url));
function getWorker() {
	return worker;
}

//#endregion
export { getWorker };