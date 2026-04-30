import TurndownService from 'turndown';
import { toast } from 'sonner';

export function getMarkdownFromHtml(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
  });

  // Custom rule for Task Lists (GFM standard)
  turndownService.addRule('taskList', {
    filter: (node) => 
      node.nodeName === 'LI' && 
      node.parentElement?.getAttribute('data-type') === 'taskList',
    replacement: (content, node) => {
      const checked = (node as HTMLElement).getAttribute('data-checked') === 'true';
      return `- [${checked ? 'x' : ' '}] ${content.trim()}\n`;
    }
  });

  // Custom rule for Tables (GFM standard)
  turndownService.addRule('table', {
    filter: 'table',
    replacement: (content) => `\n\n${content}\n\n`
  });

  turndownService.addRule('tableRow', {
    filter: 'tr',
    replacement: (content, node) => {
      let separator = '';
      const parent = node.parentElement;
      
      // If this is the first row of a header or the first row of a table (fallback)
      // we need to add the Markdown table separator line (|---|---|...)
      const isHeaderRow = parent?.nodeName === 'THEAD' || 
                         (!parent?.querySelector('thead') && node === parent?.firstElementChild);

      if (isHeaderRow) {
        const cellCount = (node as HTMLElement).querySelectorAll('th, td').length;
        separator = '|' + '---|'.repeat(cellCount) + '\n';
      }
      
      return '|' + content + '\n' + separator;
    }
  });

  turndownService.addRule('tableCell', {
    filter: ['th', 'td'],
    replacement: (content) => ` ${content.trim()} |`
  });

  return turndownService.turndown(html);
}

export async function copyMarkdownToClipboard(html: string) {
  try {
    const markdown = getMarkdownFromHtml(html);
    await navigator.clipboard.writeText(markdown);
    toast.success('Markdown copied to clipboard');
  } catch (error) {
    console.error('Failed to copy markdown:', error);
    toast.error('Failed to copy markdown');
  }
}
