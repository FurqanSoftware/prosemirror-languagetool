import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
  input: "demo/demo.js",
  output: {
    file: "docs/demo.js",
    format: "es",
  },
  plugins: [
    typescript({
      compilerOptions: {
        declaration: false,
        outDir: "./docs",
      },
    }),
    nodeResolve(),
  ],
};
