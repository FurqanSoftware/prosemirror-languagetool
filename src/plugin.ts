import { Plugin, PluginKey } from "prosemirror-state";
import type { Node } from "prosemirror-model";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import type { CheckResponse, Match } from "./languagetool";
import { debounce } from "./fn";

interface ActiveMatch {
  from: number;
  to: number;
  message: string;
  replacements: { value: string }[];
}

interface PluginState {
  lint: ((chunks: Chunk[]) => void) | null;
  decorationSet: DecorationSet;
  activeMatch: ActiveMatch | null;
}

interface PluginOptions {
  languageToolCheckURL: string;
  languageToolCheck?(text: string, language: string): Promise<CheckResponse>;
  language: string;
  actionPopup?: boolean;
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
          activeMatch: null,
        };
      },
      apply(tr, value, oldState, newState) {
        const { doc } = newState;
        if (tr.docChanged && value.lint) {
          value.lint(extractChunks(doc));
          value = {
            ...value,
            decorationSet: value.decorationSet.map(tr.mapping, doc),
            activeMatch: null,
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
          if ("activeMatch" in meta) {
            value = { ...value, activeMatch: meta.activeMatch };
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
      handleClick: options.actionPopup
        ? (view: EditorView, pos: number) => {
            const state = pluginKey.getState(view.state);
            if (!state) return false;
            const decos = state.decorationSet.find(pos, pos);
            const deco = decos.find((d) => d.spec.match);
            if (deco) {
              view.dispatch(
                view.state.tr.setMeta(pluginKey, {
                  activeMatch: {
                    from: deco.from,
                    to: deco.to,
                    message: deco.spec.match.message,
                    replacements: deco.spec.match.replacements,
                  },
                }),
              );
              return true;
            }
            if (state.activeMatch) {
              view.dispatch(
                view.state.tr.setMeta(pluginKey, { activeMatch: null }),
              );
            }
            return false;
          }
        : undefined,
    },
    view(view) {
      let tooltip: HTMLElement | null = null;

      const removeTooltip = () => {
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }
      };

      let onDocMousedown: ((e: MouseEvent) => void) | null = null;
      let onKeydown: ((e: KeyboardEvent) => void) | null = null;

      if (options.actionPopup) {
        onDocMousedown = (e: MouseEvent) => {
          if (tooltip && !tooltip.contains(e.target as globalThis.Node)) {
            view.dispatch(
              view.state.tr.setMeta(pluginKey, { activeMatch: null }),
            );
          }
        };

        onKeydown = (e: KeyboardEvent) => {
          if (
            e.key === "Escape" &&
            pluginKey.getState(view.state)?.activeMatch
          ) {
            view.dispatch(
              view.state.tr.setMeta(pluginKey, { activeMatch: null }),
            );
          }
        };

        document.addEventListener("mousedown", onDocMousedown);
        view.dom.addEventListener("keydown", onKeydown);
      }

      if (!pluginKey.getState(view.state).lint) {
        const lint = debounce(makeLinter(view, options), 1000);
        view.dispatch(
          view.state.tr.setMeta(pluginKey, {
            lint,
          }),
        );
        if (view.state.doc.textContent.trim() != "")
          lint(extractChunks(view.state.doc));
      }

      return {
        update(view) {
          if (!options.actionPopup) return;

          const state = pluginKey.getState(view.state);
          if (!state?.activeMatch) {
            removeTooltip();
            return;
          }

          const { activeMatch } = state;

          removeTooltip();
          tooltip = document.createElement("div");
          tooltip.className = "ProseMirror-lt-popup";

          const msg = document.createElement("div");
          msg.className = "ProseMirror-lt-popup-message";
          msg.textContent = activeMatch.message;
          tooltip.appendChild(msg);

          if (activeMatch.replacements.length > 0) {
            const suggestions = document.createElement("div");
            suggestions.className = "ProseMirror-lt-popup-suggestions";
            activeMatch.replacements.slice(0, 5).forEach(({ value }) => {
              const btn = document.createElement("button");
              btn.className = "ProseMirror-lt-popup-suggestion";
              btn.textContent = value;
              btn.type = "button";
              btn.addEventListener("mousedown", (e) => {
                e.preventDefault();
                view.dispatch(
                  view.state.tr.insertText(
                    value,
                    activeMatch.from,
                    activeMatch.to,
                  ),
                );
                view.focus();
              });
              suggestions.appendChild(btn);
            });
            tooltip.appendChild(suggestions);
          }

          const parent = view.dom.offsetParent || view.dom;
          const parentRect = parent.getBoundingClientRect();
          const coords = view.coordsAtPos(activeMatch.from);
          tooltip.style.left = `${coords.left - parentRect.left}px`;
          tooltip.style.top = `${coords.bottom - parentRect.top + 16}px`;

          parent.appendChild(tooltip);
        },
        destroy() {
          removeTooltip();
          if (onDocMousedown)
            document.removeEventListener("mousedown", onDocMousedown);
          if (onKeydown)
            view.dom.removeEventListener("keydown", onKeydown);
        },
      };
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

const makeDecorations = (
  matches: Match[],
  mapping: Mapping[],
  actionPopup: boolean,
) => {
  const decorations: Decoration[] = [];
  matches.forEach((match) => {
    const map = mapping.find(
      (m) => match.offset >= m.from && match.offset < m.to,
    );
    if (!map) {
      return;
    }
    const from = map.pos + match.offset - map.from;
    const color = match.rule.issueType === "misspelling" ? "red" : "orange";
    const attrs: Record<string, string> = {
      class: `ProseMirror-grammar ProseMirror-grammar-${color}`,
    };
    if (!actionPopup) {
      let title = match.message;
      if (
        match.rule.issueType === "misspelling" &&
        match.replacements.length > 0
      ) {
        title = `${match.message} Did you mean to type "${match.replacements[0].value}"?`;
      }
      attrs.title = title;
    }
    const deco = Decoration.inline(from, from + match.length, attrs, {
      match: {
        message: match.message,
        replacements: match.replacements,
      },
    });
    decorations.push(deco);
  });
  return decorations;
};

const makeLinter = (
  view: EditorView,
  {
    languageToolCheckURL,
    languageToolCheck,
    language,
    actionPopup,
  }: PluginOptions,
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
            decorations: makeDecorations(matches, mapping, !!actionPopup),
          }),
        );
      })
      .finally(() => {
        aborter = null;
      });
  };
};
