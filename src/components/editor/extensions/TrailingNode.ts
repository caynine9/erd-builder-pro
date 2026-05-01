import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const TrailingNode = Extension.create({
  name: 'customTrailingNode',
  addOptions() {
    return {
      node: 'paragraph',
      notAfter: ['paragraph'],
      extraAfter: ['image', 'table', 'taskList'],
    };
  },
  addProseMirrorPlugins() {
    const pluginKey = new PluginKey(this.name);
    return [
      new Plugin({
        key: pluginKey,
        appendTransaction: (transactions, oldState, newState) => {
          const { doc, tr, schema } = newState;
          const { node, notAfter, extraAfter = [] } = this.options;
          const nodeType = schema.nodes[node];

          if (!nodeType) {
            return;
          }

          const lastChild = doc.lastChild;

          if (!lastChild || notAfter.includes(lastChild.type.name)) {
            return;
          }

          return tr.insert(doc.content.size, nodeType.create());
        },
      }),
    ];
  },
});
