//#region tests/fixtures/_shared/simple-worker.ts?worker&inline
const jsContent = "//#region tests/fixtures/_shared/simple-worker.ts\nself.onmessage = (event) => {\n	self.postMessage(`Echo: ${event.data}`);\n};\n\n//#endregion";
const blob = typeof self !== "undefined" && self.Blob && new Blob(["URL.revokeObjectURL(import.meta.url);", jsContent], { type: "text/javascript;charset=utf-8" });
function WorkerWrapper(options) {
	let objURL;
	try {
		objURL = blob && (self.URL || self.webkitURL).createObjectURL(blob);
		if (!objURL) throw "";
		const worker = new Worker(objURL, {
			type: "module",
			name: options?.name
		});
		worker.addEventListener("error", () => {
			(self.URL || self.webkitURL).revokeObjectURL(objURL);
		});
		return worker;
	} catch (e) {
		return new Worker("data:text/javascript;charset=utf-8," + encodeURIComponent(jsContent), {
			type: "module",
			name: options?.name
		});
	}
}

//#endregion
//#region tests/fixtures/inline/input.ts
function createWorker() {
	return new WorkerWrapper();
}

//#endregion
export { createWorker };