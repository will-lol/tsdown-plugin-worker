import MagicString from "magic-string";
import type { Plugin } from "rolldown";
import { type ImportSpecifier, init, parse } from "es-module-lexer";
import type { WorkerPluginOptions } from "./types";

export function workerPostPlugin(options: WorkerPluginOptions): Plugin {
  const { format } = options;

  return {
    name: "tsdown:worker-post",
    transform: {
      filter: {
        code: "import.meta",
      },
      order: "post",
      async handler(code: string, id: string) {
        if (format === "iife") {
          await init;

          let imports: readonly ImportSpecifier[];
          try {
            imports = parse(code)[0];
          } catch {
            return;
          }

          let injectedImportMeta = false;
          let s: MagicString | undefined;

          for (const { s: start, e: end, d: dynamicIndex } of imports) {
            if (dynamicIndex === -2) {
              const prop = code.slice(end, end + 4);
              if (prop === ".url") {
                s ||= new MagicString(code);
                s.overwrite(start, end + 4, "self.location.href");
              } else {
                s ||= new MagicString(code);
                if (!injectedImportMeta) {
                  s.prepend(
                    "const _importMeta = { url: self.location.href };\n",
                  );
                  injectedImportMeta = true;
                }
                s.overwrite(start, end, "_importMeta");
              }
            }
          }

          if (!s) return;

          return {
            code: s.toString(),
            map: s.generateMap({ hires: "boundary", source: id }),
          };
        }
      },
    },
  };
}
