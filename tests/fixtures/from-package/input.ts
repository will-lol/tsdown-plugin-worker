import MonacoEditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';

export function createMonacoWorker() {
  return new MonacoEditorWorker();
}
