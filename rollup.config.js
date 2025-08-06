import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: {
    dir: "dist",
    format: "es",
  },
  plugins: [typescript()],
  external: ["prosemirror-state", "prosemirror-view", "prosemirror-model"],
};
