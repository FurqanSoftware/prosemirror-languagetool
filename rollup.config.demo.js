import typescript from "@rollup/plugin-typescript";
import serve from "rollup-plugin-serve";
import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
  input: "demo/demo.js",
  output: {
    dir: "demo/dist",
    format: "es",
  },
  plugins: [
    typescript({
      compilerOptions: {
        declaration: false,
        outDir: "./demo/dist",
      },
    }),
    nodeResolve(),
    serve("./demo"),
  ],
};
