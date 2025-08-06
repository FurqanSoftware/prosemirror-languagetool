import { Plugin, PluginKey, PluginView } from "prosemirror-state";
import type { Node } from "prosemirror-model";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import type { CheckResponse, Match } from "./languagetool";
import { debounce } from "./fn";

interface PluginState {
  lint: ((chunks: Chunk[]) => void) | null;
  decorationSet: DecorationSet;
}

interface PluginOptions {
  languageToolCheckURL: string;
  languageToolCheck?(text: string, language: string): Promise<CheckResponse>;
  language: string;
}

const pluginKey = new PluginKey("grammar");

export const grammarPlugin = (options: PluginOptions) =>
  new Plugin<PluginState>({
    key: pluginKey,
    state: {
      init(): PluginState {
        return {
          lint: null,
          decorationSet: DecorationSet.empty,
        };
      },
      apply(tr, value, oldState, newState) {
        const { doc } = newState;
        if (tr.docChanged && value.lint) {
          value.lint(extractChunks(doc));
          value = {
            ...value,
            decorationSet: value.decorationSet.map(tr.mapping, doc),
          };
        }
        const meta = tr.getMeta(pluginKey);
        if (meta) {
          if (meta.lint) {
            value = { ...value, lint: meta.lint };
          }
          if (meta.decorations) {
            value = {
              ...value,
              decorationSet: DecorationSet.create(doc, [...meta.decorations]),
            };
          }
        }
        return value;
      },
    },
    props: {
      attributes: {
        spellcheck: "false",
      },
      decorations(state) {
        return this.getState(state)?.decorationSet;
      },
    },
    view(view) {
      if (pluginKey.getState(view.state).lint) return {};
      const lint = debounce(makeLinter(view, options), 1000);
      view.dispatch(
        view.state.tr.setMeta(pluginKey, {
          lint,
        }),
      );
      if (view.state.doc.textContent.trim() != "")
        lint(extractChunks(view.state.doc));
      return {};
    },
  });

interface ChunkMarkup {
  type: "markup";
  markup: string;
}

interface ChunkText {
  type: "text";
  text: string;
  pos: any;
}

type Chunk = ChunkMarkup | ChunkText;

const extractChunks = (doc: Node): Chunk[] => {
  const chunks: Chunk[] = [];
  doc.descendants((node: Node, pos: number) => {
    if (node.type.name === "code_block") {
      return false;
    } else if (node.type.name === "paragraph") {
      chunks.push({ type: "markup", markup: "<p>" });
    } else if (node.isText) {
      chunks.push({
        type: "text",
        text: node.text!,
        pos,
      });
    }
  });
  return chunks;
};

interface Mapping {
  from: number;
  to: number;
  pos: number;
}

const makeDecorations = (matches: Match[], mapping: Mapping[]) => {
  const decorations: Decoration[] = [];
  matches.forEach((match) => {
    const map = mapping.find(
      (m) => match.offset >= m.from && match.offset < m.to,
    );
    if (!map) {
      return;
    }
    const from = map.pos + match.offset - map.from;
    const { title, color } = processMatch(match);
    const deco = Decoration.inline(from, from + match.length, {
      class: `ProseMirror-grammar ProseMirror-grammar-${color}`,
      title,
    });
    decorations.push(deco);
  });
  return decorations;
};

const processMatch = (match: Match) => {
  let title = match.message,
    color = "orange";
  switch (match.rule.issueType) {
    case "misspelling":
      color = "red";
      if (match.replacements.length > 0) {
        title = `${match.message} Did you mean to type "${match.replacements[0].value}?"`;
      }
      break;
  }
  return { title, color };
};

const makeLinter = (
  view: EditorView,
  { languageToolCheckURL, languageToolCheck, language }: PluginOptions,
) => {
  let aborter: AbortController | null;

  return (chunks: Chunk[]) => {
    const mapping: Mapping[] = [];
    const text = chunks
      .map((chunk, i) => {
        const from = mapping.length === 0 ? 0 : mapping[mapping.length - 1].to;
        let text = "";
        let pos = 0;
        if (chunk.type == "markup") {
          if (chunk.markup === "<p>") text = i === 0 ? "" : "\n\n";
        } else {
          ({ text, pos } = chunk);
        }
        mapping.push({
          from,
          to: from + text.length,
          pos: pos,
        });
        return text;
      })
      .join("");

    aborter?.abort();
    aborter = new AbortController();
    (languageToolCheck
      ? languageToolCheck(text, language)
      : fetch(languageToolCheckURL, {
          method: "POST",
          body: new URLSearchParams({
            text,
            language,
          }),
          signal: aborter.signal,
        }).then((resp) => resp.json())
    )
      .then(({ matches }) => {
        view.dispatch(
          view.state.tr.setMeta(pluginKey, {
            decorations: makeDecorations(matches, mapping),
          }),
        );
      })
      .finally(() => {
        aborter = null;
      });
  };
};
