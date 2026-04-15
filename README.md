# prosemirror-languagetool

A [ProseMirror](https://prosemirror.net/) plugin for grammar and spelling checking using [LanguageTool](https://languagetool.org/).

Highlights errors with colored wavy underlines (red for misspellings, orange for grammar issues). Optionally shows a popup with correction suggestions that can be applied with a click.

[Live Demo](https://furqansoftware.github.io/prosemirror-languagetool/)

## Install

```bash
npm install prosemirror-languagetool
```

## Usage

```javascript
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema } from "prosemirror-schema-basic";
import { grammarPlugin } from "prosemirror-languagetool";

const view = new EditorView(document.getElementById("editor"), {
  state: EditorState.create({
    schema,
    plugins: [
      grammarPlugin({
        languageToolCheckURL: "https://api.languagetoolplus.com/v2/check",
        language: "en-US",
      }),
    ],
  }),
});
```

Include the stylesheet for error decorations:

```javascript
import "prosemirror-languagetool/style/prosemirror.css";
```

Or link it directly:

```html
<link rel="stylesheet" href="prosemirror-languagetool/style/prosemirror.css">
```

## Options

| Option | Type | Required | Description |
|---|---|---|---|
| `languageToolCheckURL` | `string` | Yes | URL to the LanguageTool `/v2/check` endpoint. |
| `language` | `string` | Yes | Language code (e.g. `"en-US"`, `"de-DE"`). |
| `languageToolCheck` | `(text: string, language: string) => Promise<CheckResponse>` | No | Custom check function. Overrides the default HTTP request. |
| `actionPopup` | `boolean` | No | Enable a click-to-fix popup on highlighted errors. Defaults to `false`. |

### Action popup

When `actionPopup` is enabled, clicking on a highlighted error shows a popup with the error message and up to 5 replacement suggestions. Clicking a suggestion applies the fix. The popup dismisses on click outside or pressing Escape.

```javascript
grammarPlugin({
  languageToolCheckURL: "https://api.languagetoolplus.com/v2/check",
  language: "en-US",
  actionPopup: true,
});
```

### Custom check function

You can provide a `languageToolCheck` function to control how the API is called (e.g. to route requests through a proxy or add authentication):

```javascript
grammarPlugin({
  languageToolCheckURL: "https://api.languagetoolplus.com/v2/check",
  language: "en-US",
  languageToolCheck: async (text, language) => {
    const resp = await fetch("/api/grammar-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
    });
    return resp.json();
  },
});
```

The function must return a promise that resolves to a `CheckResponse` object matching the [LanguageTool API response format](https://languagetool.org/http-api/swagger-ui/#!/default/post_check).

## Styling

The plugin applies CSS classes to decorated text:

| Class | Used for |
|---|---|
| `ProseMirror-grammar-red` | Misspellings |
| `ProseMirror-grammar-orange` | Grammar issues |

The default stylesheet renders these as colored wavy underlines. You can override the styles to customize the appearance.

## Behavior

- Linting is debounced by 1 second after the last edit.
- In-flight requests are aborted when a new check is triggered.
- Code blocks are excluded from linting.
- The browser's built-in spellcheck is disabled on the editor to avoid duplicate annotations.

## API

### `grammarPlugin(options: PluginOptions): Plugin`

Creates and returns a ProseMirror plugin.

### `CheckResponse`

TypeScript type for the LanguageTool API response. Re-exported for use with the `languageToolCheck` option.

## License

BSD-3-Clause
