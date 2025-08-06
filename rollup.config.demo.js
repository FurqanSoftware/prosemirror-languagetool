import typescript from "@rollup/plugin-typescript";
import babel from "@rollup/plugin-babel";
import serve from "rollup-plugin-serve";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "demo/demo.js",
  output: {
    dir: "demo/dist",
    format: "es",
  },
  plugins: [
    typescript({
      lib: ["es2018", "dom"],
    }),
    babel({
      babelHelpers: "bundled",
    }),
    nodeResolve(),
    commonjs(),
    serve("./demo"),
  ],
};
