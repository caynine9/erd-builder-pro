import { Extension, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Node } from '@tiptap/pm/model';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';

export const SmartTableRow = TableRow.extend({
  addAttributes() {
    return {
      rowType: {
        default: 'data',
        parseHTML: element => element.getAttribute('data-row-type'),
        renderHTML: attributes => {
          if (attributes.rowType === 'data') return {}; // Keep HTML clean for default
          return {
            'data-row-type': attributes.rowType,
            // Add utility classes for visual feedback
            class: attributes.rowType === 'header' 
              ? 'bg-muted/50 font-semibold border-b-2 border-border/80' 
              : attributes.rowType === 'footer'
              ? 'bg-muted/30 font-semibold border-t-2 border-border/80'
              : ''
          };
        },
      },
    };
  },
});

export const SmartTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      formula: {
        default: null,
        parseHTML: element => element.getAttribute('data-formula'),
        renderHTML: attributes => {
          if (!attributes.formula) return {};
          return {
            'data-formula': attributes.formula,
          };
        },
      },
    };
  },
});

function parseNumber(str: string): number {
  const cleanStr = str.replace(/[^\d.,-]/g, '');
  if (!cleanStr) return 0;
  
  const hasComma = cleanStr.includes(',');
  const hasDot = cleanStr.includes('.');
  let numStr = cleanStr;
  
  if (hasComma && hasDot) {
    if (cleanStr.lastIndexOf(',') > cleanStr.lastIndexOf('.')) {
      numStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else {
      numStr = cleanStr.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = cleanStr.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      numStr = cleanStr.replace(',', '.');
    } else {
      numStr = cleanStr.replace(/,/g, '');
    }
  } else if (hasDot) {
    const parts = cleanStr.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      numStr = cleanStr.replace(/\./g, '');
    }
  }
  return parseFloat(numStr) || 0;
}

function formatNumber(num: number): string {
  if (num === 0) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
}

export const SmartTableEngine = Extension.create({
  name: 'smartTableEngine',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('smartTableEngine'),
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some(tr => tr.docChanged)) {
            return;
          }

          let tr = newState.tr;
          let modified = false;

          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'table') {
              const rows: { node: Node, pos: number, type: string, cells: { node: Node, pos: number, text: string, formula: string | null }[] }[] = [];
              
              node.forEach((rowNode, rowOffset) => {
                const rowPos = pos + 1 + rowOffset;
                const rowType = rowNode.attrs.rowType || 'data';
                const cells: any[] = [];
                
                rowNode.forEach((cellNode, cellOffset) => {
                  const cellPos = rowPos + 1 + cellOffset;
                  const text = cellNode.textContent.trim().toLowerCase();
                  
                  let formula = cellNode.attrs.formula;
                  // Trigger formula if user types =sum or =SUM
                  if (text === '=sum' || text === '=sum()') {
                    formula = 'sum';
                  } else if (text === '' && formula === 'sum') {
                    // Remove formula if user clears the cell
                    formula = null;
                  }

                  // Apply formula attribute change immediately if needed
                  if (formula !== cellNode.attrs.formula) {
                     tr.setNodeMarkup(cellPos, undefined, { ...cellNode.attrs, formula });
                     modified = true;
                  }

                  cells.push({
                    node: cellNode,
                    pos: cellPos,
                    text: cellNode.textContent.trim(),
                    formula: formula
                  });
                });
                
                rows.push({ node: rowNode, pos: rowPos, type: rowType, cells });
              });

              const numCols = Math.max(...rows.map(r => r.cells.length));
              
              for (let colIdx = 0; colIdx < numCols; colIdx++) {
                // Calculate Subtotals (Header rows)
                for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
                  const row = rows[rowIdx];
                  if (row.type === 'header' && row.cells[colIdx]?.formula === 'sum') {
                    let sum = 0;
                    for (let i = rowIdx + 1; i < rows.length; i++) {
                      const targetRow = rows[i];
                      if (targetRow.type === 'header' || targetRow.type === 'footer') break;
                      if (targetRow.type === 'data' && targetRow.cells[colIdx]) {
                        sum += parseNumber(targetRow.cells[colIdx].text);
                      }
                    }
                    
                    const expectedText = formatNumber(sum);
                    const cell = row.cells[colIdx];
                    if (cell.text !== expectedText && cell.formula === 'sum') {
                      const pPos = cell.pos + 1;
                      tr.replaceWith(
                        pPos, 
                        cell.pos + cell.node.nodeSize - 1, 
                        newState.schema.nodes.paragraph.create(null, expectedText ? newState.schema.text(expectedText) : null)
                      );
                      modified = true;
                    }
                  }
                }

                // Calculate Grand Totals (Footer rows)
                for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
                  const row = rows[rowIdx];
                  if (row.type === 'footer' && row.cells[colIdx]?.formula === 'sum') {
                    let sum = 0;
                    for (let i = 0; i < rows.length; i++) {
                      const targetRow = rows[i];
                      // Grand total only sums data rows to avoid double counting
                      if (targetRow.type === 'data' && targetRow.cells[colIdx]) {
                        sum += parseNumber(targetRow.cells[colIdx].text);
                      }
                    }
                    
                    const expectedText = formatNumber(sum);
                    const cell = row.cells[colIdx];
                    if (cell.text !== expectedText && cell.formula === 'sum') {
                      const pPos = cell.pos + 1;
                      tr.replaceWith(
                        pPos, 
                        cell.pos + cell.node.nodeSize - 1, 
                        newState.schema.nodes.paragraph.create(null, expectedText ? newState.schema.text(expectedText) : null)
                      );
                      modified = true;
                    }
                  }
                }
              }
            }
            return true; // continue descending
          });

          return modified ? tr : undefined;
        }
      })
    ];
  }
});
