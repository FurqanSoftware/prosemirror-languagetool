import typescript from "@rollup/plugin-typescript";
import babel from "@rollup/plugin-babel";

export default {
  input: "src/index.ts",
  output: {
    dir: "dist",
    format: "es",
  },
  plugins: [
    typescript({
      lib: ["es2018", "dom"],
    }),
    babel({
      babelHelpers: "bundled",
    }),
  ],
  external: ["prosemirror-state", "prosemirror-view", "prosemirror-model"],
};
