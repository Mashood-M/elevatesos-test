import Blockquote from "@tiptap/extension-blockquote";

/** Blockquote that preserves data-callout for info/warning/success/error styles. */
export const CalloutBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      callout: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-callout"),
        renderHTML: (attributes) => {
          if (!attributes.callout) return {};
          return { "data-callout": attributes.callout as string };
        },
      },
    };
  },
});
