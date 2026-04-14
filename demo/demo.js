import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { DOMParser } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import { exampleSetup } from "prosemirror-example-setup";
import { grammarPlugin } from "../src";

const view = new EditorView(document.getElementById("editor"), {
  state: EditorState.create({
    doc: DOMParser.fromSchema(schema).parse(document.getElementById("content")),
    plugins: [
      ...exampleSetup({ schema }),
      grammarPlugin({
        languageToolCheckURL: "https://api.languagetoolplus.com/v2/check",
        language: "en-US",
        // languageToolCheck: (text, language) =>
        //   fetch(
        //     `https://api.languagetoolplus.com/v2/check?` +
        //       new URLSearchParams({
        //         text,
        //         language,
        //       }).toString(),
        //     {
        //       method: "GET",
        //     },
        //   ),
        actionPopup: true,
      }),
    ],
  }),
});
