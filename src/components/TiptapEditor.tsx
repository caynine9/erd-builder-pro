import React, { useRef, useEffect } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import ImageResize from 'tiptap-extension-resize-image';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { Table } from '@tiptap/extension-table';
import { TableHeader } from '@tiptap/extension-table-header';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import { SmartTableRow, SmartTableCell, SmartTableEngine } from '../lib/tiptap/smart-table';
import TiptapLink from '@tiptap/extension-link';
import TiptapImage from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { Underline as UnderlineIcon, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { Calendar as UICalendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge as UIBadge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CalendarPicker } from "./CalendarPicker"

import {
  Check,
  ChevronRight,
  ChevronDown,
  Search,
  BookOpen,
  Database,
  Trash2,
  Share2,
  X,
  PanelRight,
  ChevronFirst,
  Bold,
  Italic,
  Strikethrough,
  Pilcrow,
  Link,
  Palette,
  Code,
  Code2,
  Smile,
  Type,
  ListTree,
  Tag,
  Copy
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { copyMarkdownToClipboard } from '../lib/markdownUtils';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Mark, Extension, Node, mergeAttributes, RawCommands } from '@tiptap/core';
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state';
import { compressImage } from '../lib/image-compression';
import { cn } from '@/lib/utils';
import { SlashMenu } from './SlashMenu';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { NoteImporter } from '../lib/importers/note-importer';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"



const LucideIconExtension = Node.create({
  name: 'lucideIcon',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      name: {
        default: 'HelpCircle',
      },
      color: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-lucide-name]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-lucide-name': HTMLAttributes.name, 'data-lucide-icon': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props) => {
      const { name, color } = props.node.attrs;
      // @ts-ignore
      const IconComponent = LucideIcons[name] || LucideIcons.HelpCircle;

      return (
        <NodeViewWrapper className="inline-flex items-center align-middle ml-0.5 mr-1.5 leading-none translate-y-[-1px]">
          <IconComponent 
            size={18} 
            strokeWidth={2} 
            fill="currentColor"
            fillOpacity={0.2}
            style={{ color: props.node.attrs.color || 'currentColor' }}
            className={`transition-colors duration-200 ${props.selected ? 'opacity-50' : 'opacity-100'}`}
          />
        </NodeViewWrapper>
      );
    });
  },
});

const IconSpaceReset = Extension.create({
  name: 'iconSpaceReset',
  addKeyboardShortcuts() {
    return {
      'Space': () => {
        const { state } = this.editor;
        const { selection } = state;
        const { $from } = selection;

        // Check if there is a lucideIcon before the cursor
        const nodeBefore = $from.nodeBefore;
        if (nodeBefore && nodeBefore.type.name === 'lucideIcon') {
          this.editor.commands.unsetColor();
        }

        return false; // Let the space be inserted normally
      },
    };
  },
});

interface TiptapEditorProps {
  content: string;
  onChange?: (content: string) => void;
  isReadOnly?: boolean;
}

interface HeadingInfo {
  text: string;
  level: number;
  pos: number;
}

const TrailingNode = Extension.create({
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

const ToggleExtension = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'block+',
  addAttributes() {
    return {
      open: { default: true },
      title: { default: 'Toggle Section' }
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="toggle"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle' }), 0];
  },
  addCommands() {
    return {
      setToggle: () => ({ commands }: { commands: RawCommands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { open: true, title: 'Toggle Section' },
          content: [{ type: 'paragraph' }]
        });
      },
    } as any;
  },
  addNodeView() {
    return ReactNodeViewRenderer(({ node, updateAttributes }) => {
      return (
        <NodeViewWrapper className="my-2 border border-border/50 rounded-md bg-muted/5 group overflow-hidden">
          <div
            className="flex items-center gap-2 px-3 py-2 cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors select-none"
            onClick={() => updateAttributes({ open: !node.attrs.open })}
            contentEditable={false}
            suppressContentEditableWarning={true}
          >
            <span className="text-muted-foreground shrink-0 w-4 h-4 flex items-center justify-center">
              {node.attrs.open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
            <input
              value={node.attrs.title}
              onChange={(e) => updateAttributes({ title: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent border-none focus:ring-0 outline-none text-sm font-semibold text-foreground/80 w-full"
              placeholder="Toggle Title..."
            />
          </div>

          <div className={cn("p-2 px-4 border-t border-border/20", node.attrs.open ? "block" : "hidden")}>
            <NodeViewContent className="tiptap-toggle-content outline-none min-h-[1.5rem]" />
          </div>
        </NodeViewWrapper>
      );
    });
  }
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggle: {
      setToggle: () => ReturnType,
    },
    badge: {
      toggleBadge: () => ReturnType,
      setBadgeColor: (color: string) => ReturnType,
    }
  }
}

const Badge = Mark.create({
  name: 'badge',
  inclusive: true,
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: element => element.getAttribute('data-color'),
        renderHTML: attributes => {
          if (!attributes.color) return {};
          return {
            'data-color': attributes.color,
            style: `color: ${attributes.color}`,
          };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-type="badge"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'badge', class: 'tiptap-badge' }), 0];
  },
  addCommands() {
    return {
      toggleBadge: () => ({ commands }) => commands.toggleMark(this.name),
      setBadgeColor: color => ({ commands }) => commands.updateAttributes(this.name, { color: color || null }),
    } as any;
  },
  addKeyboardShortcuts() {
    return {
      ArrowRight: () => {
        const { state } = this.editor;
        const { selection, doc } = state;
        const { $from, empty } = selection;

        if (!empty || !this.editor.isActive('badge')) {
          return false;
        }

        const pos = $from.pos;
        const marks = doc.resolve(pos).marks();
        const hasBadge = marks.some(m => m.type.name === 'badge');
        
        // Check if there's a badge mark at the next position
        const hasBadgeAfter = pos < doc.content.size && doc.resolve(pos + 1).marks().some(m => m.type.name === 'badge');

        if (hasBadge && !hasBadgeAfter) {
          // Move cursor one step out and clear the badge mark
          return this.editor.chain().setTextSelection(pos + 1).unsetMark(this.name).run();
        }

        return false;
      },
    };
  },
});

const CustomKeyboardShortcuts = Extension.create({
  name: 'customKeyboardShortcuts',

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-b': () => this.editor.commands.toggleBadge(),
      'Mod-Alt-B': () => this.editor.commands.toggleBadge(),
      'Mod-Alt-i': () => {
        // Just return true to intercept, maybe trigger slash menu logic later
        return true;
      },
      'Mod-Alt-t': () => {
        this.editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
        return true;
      },
      'Mod-Alt-T': () => {
        this.editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true });
        return true;
      },
    }
  },
});

const CalendarNode = Node.create({
  name: 'calendar',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      date: {
        default: null,
        parseHTML: element => element.getAttribute('data-date'),
        renderHTML: attributes => {
          if (!attributes.date) return {};
          return { 'data-date': attributes.date };
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) return {};
          return { 'data-label': attributes.label };
        },
      },
      allDay: {
        default: true,
        parseHTML: element => element.getAttribute('data-all-day') === 'true',
        renderHTML: attributes => {
          return { 'data-all-day': attributes.allDay ? 'true' : 'false' };
        },
      },
      timeFrom: {
        default: null,
        parseHTML: element => element.getAttribute('data-time-from'),
        renderHTML: attributes => {
          if (!attributes.timeFrom) return {};
          return { 'data-time-from': attributes.timeFrom };
        },
      },
      timeTo: {
        default: null,
        parseHTML: element => element.getAttribute('data-time-to'),
        renderHTML: attributes => {
          if (!attributes.timeTo) return {};
          return { 'data-time-to': attributes.timeTo };
        },
      },
      autoOpen: {
        default: false,
        parseHTML: () => false,
        renderHTML: () => ({}),
      }
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="calendar"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'calendar' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ node, updateAttributes, deleteNode }) => {
      const { date, label, allDay, timeFrom, timeTo, autoOpen } = node.attrs;
      const [isOpen, setIsOpen] = React.useState(autoOpen || false);

      const displayDate = React.useMemo(() => {
        if (label) return label;
        if (!date) return 'Select date...';
        const dateStr = format(new Date(date), 'MMM d, yyyy');
        if (!allDay && timeFrom) {
          return `${dateStr} ${timeFrom.substring(0, 5)}${timeTo ? ` - ${timeTo.substring(0, 5)}` : ''}`;
        }
        return dateStr;
      }, [date, label, allDay, timeFrom, timeTo]);

      const PRESETS = [
        { label: 'Yesterday', value: subDays(new Date(), 1) },
        { label: 'Today', value: new Date() },
        { label: 'Tomorrow', value: addDays(new Date(), 1) },
        { label: 'In 1 week', value: addDays(new Date(), 7) },
        { label: 'In 2 weeks', value: addDays(new Date(), 14) },
      ];

      return (
        <NodeViewWrapper as="span" className="inline-block mx-0.5 align-middle leading-none">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <TooltipProvider delay={200}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <PopoverTrigger
                      render={
                        <span
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer select-none transition-colors hover:text-muted-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(true);
                          }}
                        >
                          {displayDate}
                        </span>
                      }
                    />
                  }
                />
                <TooltipContent side="top" className="text-[10px] py-1 px-2 font-medium">
                  Edit date
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <PopoverContent 
              className="w-auto p-0 z-[10001] shadow-2xl border-border/50 flex flex-col bg-popover" 
              align="center"
              sideOffset={4}
            >
              <ScrollArea 
                className="flex-1 w-full"
                style={{ maxHeight: 'calc(var(--available-height, 85vh) - 16px)' }}
              >
                <CalendarPicker
                  date={date}
                  allDay={allDay}
                  timeFrom={timeFrom}
                  timeTo={timeTo}
                  onSelect={updateAttributes}
                  onDelete={deleteNode}
                />
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </NodeViewWrapper>
      );
    });
  },
});


export function TiptapEditor({ content, onChange, isReadOnly = false }: TiptapEditorProps) {
  const [headings, setHeadings] = React.useState<HeadingInfo[]>([]);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  const [selectionVersion, setSelectionVersion] = React.useState(0);
  const [showOutline, setShowOutline] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const compressedFile = await compressImage(file, { maxWidth: 1280, quality: 0.8 });

        const formData = new FormData();
        formData.append('image', compressedFile);
        formData.append('feature', 'notes');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        const data = await response.json();
        
        if (!response.ok) {
          console.error('Upload failed:', data);
          throw new Error(data.error || 'Upload failed');
        }

        if (data.url) {
          // Sanitize URL - remove escaped newlines
          const cleanUrl = data.url.replace(/\\n/g, '').replace(/\\r/g, '').trim();
          
          editor?.chain()
            .focus()
            .setImage({ src: cleanUrl })
            .run();

          editor?.commands.focus('end');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image: ' + (error as Error).message);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const [slashMenu, setSlashMenu] = React.useState<{
    isOpen: boolean;
    query: string;
    range: { from: number; to: number };
    coords: { top: number; left: number; bottom: number };
  }>({
    isOpen: false,
    query: '',
    range: { from: 0, to: 0 },
    coords: { top: 0, left: 0, bottom: 0 }
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const extensions = React.useMemo(() => [
    TextStyle,
    Color,
    Badge,
    ToggleExtension,
    StarterKit.configure({
      link: false,
    }),
    TrailingNode,
    ImageResize.configure({
      inline: false,
    } as any),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: true,
    }),
    SmartTableRow,
    TableHeader,
    SmartTableCell,
    SmartTableEngine,
    TextAlign.configure({
      types: ['heading', 'paragraph', 'tableCell', 'tableHeader'],
    }),
    Placeholder.configure({
      placeholder: "Type '/' for commands or start writing...",
    }),
    TiptapImage.configure({
      inline: true,
      allowBase64: true,
    }),
    LucideIconExtension,
    IconSpaceReset,
    TiptapLink.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary underline cursor-pointer',
      },
    }),
    Underline,
    CalendarNode,
    CustomKeyboardShortcuts,
  ], []);

  const editor = useEditor({
    extensions,
    content,
    editable: !isReadOnly,
    onSelectionUpdate({ editor }) {
      setSelectionVersion(v => v + 1);
      // Close slash menu on selection change if cursor moved away
      setSlashMenu(prev => {
        if (prev.isOpen) return { ...prev, isOpen: false };
        return prev;
      });
    },
    onFocus() {
      setSelectionVersion(v => v + 1);
    },
    onBlur() {
      setSelectionVersion(v => v + 1);
    },
    editorProps: {
      attributes: {
        className: 'tiptap-editor-content focus:outline-none focus:ring-0 border-none outline-none min-h-[500px] pb-[350px] [&_img]:block [&_img]:mx-auto [&_img]:my-6 [&_.tiptap-extension-resize-image]:block [&_.tiptap-extension-resize-image]:mx-auto [&_code]:text-indigo-300',
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        const html = event.clipboardData?.getData('text/html');

        const isMarkdownTable = /\|[\s-]*:?---[:\s-]*\|/.test(text || '');
        const isMarkdownGeneral = text ? /^\s*#|^\s*[-*+] |^\s*\||\[.*\]\(.*\)|(\*\*|__).*(\*\*|__)|`.*`|^\|.*\|/m.test(text) : false;

        // Detect Excel/Sheets/Table paste
        const isTablePaste = html && (
          html.includes('google-sheets-html-origin') || 
          html.includes('office:excel') || 
          html.includes('mso-') || 
          (html.includes('<table') && (html.includes('style=') || html.includes('width=')))
        );

        if (isTablePaste && html) {
          console.log('Excel/Sheets/HTML Table detected, cleaning and importing...');
          (async () => {
            try {
              // Strip all inline styles, classes, and presentation attributes to ensure clean look
              const cleanHtml = DOMPurify.sanitize(html, {
                FORBID_ATTR: ['style', 'class', 'width', 'height', 'bgcolor', 'valign', 'align'],
                ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'p', 'span', 'b', 'i', 'strong', 'em', 'ul', 'ol', 'li'],
                ADD_ATTR: ['colspan', 'rowspan'] // Preserve structural attributes
              });
              
              // Normalize structure via NoteImporter (ensures thead/tbody etc)
              const processedHtml = await NoteImporter.processHtmlForEditor(cleanHtml);
              
              if (editor) {
                editor.commands.insertContent(processedHtml);
              }
            } catch (error) {
              console.error('Error processing table paste:', error);
            }
          })();
          return true;
        }

        // If it's already HTML (but not a spreadsheet table), we usually let Tiptap handle it, 
        // UNLESS it looks like a markdown table (which Tiptap might not parse well from plain text)
        if (html && !isMarkdownTable) return false;

        if (text && (isMarkdownGeneral || isMarkdownTable)) {
          console.log('Markdown detected in paste, converting...');
            // We use an async IIFE because handlePaste expects a boolean return but processing might be async
            (async () => {
              try {
                // Parse markdown to HTML
                const parsedHtml = await marked.parse(text);
                
                // Use NoteImporter's robust processing (handles tables, task lists, etc.)
                const processedHtml = await NoteImporter.processHtmlForEditor(parsedHtml);
                
                // Final sanitize
                const cleanHtml = DOMPurify.sanitize(processedHtml, {
                  ADD_ATTR: ['data-type', 'data-checked'], // Allow Tiptap specific attributes
                  ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td']
                });
                
                if (editor) {
                  editor.commands.insertContent(cleanHtml);
                }
              } catch (error) {
                console.error('Error parsing markdown on paste:', error);
                // Fallback to default paste if parsing fails
                document.execCommand('insertText', false, text);
              }
            })();
            return true; // We handled the paste
        }
        return false;
      }
    },
  });

  useEffect(() => {
    if (editor && typeof content === 'string' && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (onChange) {
        onChange(editor.getHTML());
      }

      const extracted: HeadingInfo[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading' && node.attrs.level <= 5) {
          extracted.push({
            text: node.textContent,
            level: node.attrs.level,
            pos: pos + 1
          });
        }
      });
      setHeadings(extracted);

      // Slash Menu Logic
      const { selection } = editor.state;
      const { $from } = selection;
      
      const textFromStartContent = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
      const slashIndex = textFromStartContent.lastIndexOf('/');

      if (slashIndex !== -1) {
        const query = textFromStartContent.slice(slashIndex + 1);
        const charBeforeSlash = textFromStartContent[slashIndex - 1];
        const isValidBoundary = !charBeforeSlash || /\s/.test(charBeforeSlash) || charBeforeSlash === '\ufffc';
        
        if (isValidBoundary) {
          if (!query.includes(' ')) {
            const from = $from.pos - (textFromStartContent.length - slashIndex);
            const to = $from.pos;
            const coords = editor.view.coordsAtPos(from);
            
            setSlashMenu({ isOpen: true, query, range: { from, to }, coords });
            return;
          }
        }
      }

      setSlashMenu(prev => {
        if (prev.isOpen) return { ...prev, isOpen: false };
        return prev;
      });
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, onChange]);

  const openLinkDialog = () => {
    if (editor) {
      const previousUrl = editor.getAttributes('link').href || '';
      setLinkUrl(previousUrl);
      setIsLinkDialogOpen(true);
    }
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editor) {
      if (linkUrl === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      }
      setIsLinkDialogOpen(false);
    }
  };

  const scrollToHeading = (pos: number) => {
    if (editor) {
      editor.commands.focus(pos);
      setTimeout(() => {
        const domAtPos = editor.view.domAtPos(pos);
        if (domAtPos.node instanceof HTMLElement) {
          domAtPos.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (domAtPos.node.parentElement) {
          domAtPos.node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      <input
        type="file"
        id="tiptap-image-upload"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
      />

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-visible custom-scrollbar bg-neutral-950/50 relative px-4 sm:px-6 md:px-24"
      >
        <div className="max-w-4xl mx-auto my-0 sm:my-12 p-4 sm:p-16 min-h-[calc(100vh-200px)] bg-card border-x border-b sm:border border-border/40 shadow-2xl rounded-none sm:rounded-xl relative tiptap-editor-lined">

          {/* Floating Outline Panel Using Standard Shadcn UI Patterns */}
          <div className="absolute -right-14 top-0 h-full hidden md:block z-40">
            <div className="sticky top-1/2 -translate-y-1/2">
              <TooltipProvider delay={0}>
                <HoverCard openDelay={100} closeDelay={300}>
                  <Tooltip>
                    <TooltipTrigger render={<div className="flex items-center justify-center" />}>
                      <HoverCardTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-10 w-10 rounded-full shadow-lg border border-border/50 bg-background/80 backdrop-blur-sm hover:bg-accent transition-all duration-300"
                        >
                          <ListTree className="w-5 h-5 text-muted-foreground" />
                        </Button>
                      </HoverCardTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Document Outline</p>
                    </TooltipContent>
                  </Tooltip>

                  <HoverCardContent
                    side="left"
                    align="center"
                    sideOffset={15}
                    className="w-[300px] bg-popover/95 backdrop-blur-xl border-border rounded-lg p-5 shadow-2xl"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="text-sm font-semibold tracking-tight">Navigation</h4>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Headings</span>
                      </div>

                      {headings.length > 0 ? (
                        <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                          {headings.map((heading, i) => (
                            <button
                              key={`${heading.pos}-${i}`}
                              onClick={() => scrollToHeading(heading.pos)}
                              className={cn(
                                "text-left transition-all duration-200 py-1.5 px-3 rounded-md hover:bg-accent text-sm font-medium text-foreground/80 hover:text-foreground truncate",
                                heading.level === 1 ? "text-primary font-bold bg-primary/5" :
                                  heading.level === 2 ? "pl-4 text-foreground/70" :
                                    heading.level === 3 ? "pl-7 text-foreground/60 scale-95 origin-left" :
                                      heading.level === 4 ? "pl-10 text-foreground/50 scale-90 origin-left" :
                                        "pl-12 text-foreground/40 scale-90 origin-left"
                              )}
                            >
                              {heading.text}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground/50">
                          <p className="text-xs italic">No headings found</p>
                        </div>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </TooltipProvider>

              <TooltipProvider delay={0}>
                <Tooltip>
                  <TooltipTrigger render={<div className="flex items-center justify-center mt-3" />}>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => editor && copyMarkdownToClipboard(editor.getHTML())}
                      className="h-10 w-10 rounded-full shadow-lg border border-border/50 bg-background/80 backdrop-blur-sm hover:bg-accent transition-all duration-300"
                    >
                      <Copy className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Copy as Markdown</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {editor && !isReadOnly && (
            <BubbleMenu
              editor={editor}
              pluginKey="textMenu"
              shouldShow={({ editor, state }) => {
                return editor.isFocused && editor.isEditable && !state.selection.empty && !editor.isActive('table');
              }}
              {...({ tippyOptions: { duration: 100, zIndex: 9999, placement: 'bottom-start', appendTo: () => document.body } } as any)}
              className="flex gap-1 p-1 bg-popover border border-border shadow-lg rounded-md overflow-hidden"
            >
              <TooltipProvider delay={200}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`h-8 w-8 flex items-center justify-center rounded-sm transition-colors ${editor.isActive('bold') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-popover-foreground'}`}
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                    }
                  />
                  <TooltipContent side="top" className="text-[10px] py-1 px-2 font-medium">
                    Bold (⌘ B)
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`h-8 w-8 flex items-center justify-center rounded-sm transition-colors ${editor.isActive('italic') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-popover-foreground'}`}
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                    }
                  />
                  <TooltipContent side="top" className="text-[10px] py-1 px-2 font-medium">
                    Italic (⌘ I)
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={`h-8 w-8 flex items-center justify-center rounded-sm transition-colors ${editor.isActive('underline') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-popover-foreground'}`}
                      >
                        <UnderlineIcon className="w-4 h-4" />
                      </button>
                    }
                  />
                  <TooltipContent side="top" className="text-[10px] py-1 px-2 font-medium">
                    Underline (⌘ U)
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className={`h-8 w-8 flex items-center justify-center rounded-sm transition-colors ${editor.isActive('strike') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-popover-foreground'}`}
                      >
                        <Strikethrough className="w-4 h-4" />
                      </button>
                    }
                  />
                  <TooltipContent side="top" className="text-[10px] py-1 px-2 font-medium">
                    Strikethrough (⌘ ⇧ X)
                  </TooltipContent>
                </Tooltip>

                <div className="w-[1px] h-4 bg-border mx-0.5 self-center" />

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        className={`h-8 w-8 flex items-center justify-center rounded-sm transition-colors ${editor.isActive('code') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-popover-foreground'}`}
                      >
                        <Code className="w-4 h-4" />
                      </button>
                    }
                  />
                  <TooltipContent side="top" className="text-[10px] py-1 px-2 font-medium">
                    Code (⌘ E)
                  </TooltipContent>
                </Tooltip>

                <div className="w-[1px] h-4 bg-border mx-0.5 self-center" />

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={openLinkDialog}
                        className={`h-8 w-8 flex items-center justify-center rounded-sm transition-colors ${editor.isActive('link') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-popover-foreground text-primary'}`}
                      >
                        <Link className="w-4 h-4" />
                      </button>
                    }
                  />
                  <TooltipContent side="top" className="text-[10px] py-1 px-2 font-medium">
                    Link (⌘ K)
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu.Root modal={false}>
                  <Tooltip>
                    <TooltipTrigger 
                      render={
                        <DropdownMenu.Trigger asChild>
                          <button className="h-8 w-8 flex items-center justify-center rounded-sm transition-colors hover:bg-accent text-popover-foreground">
                            <Palette className="w-4 h-4" />
                          </button>
                        </DropdownMenu.Trigger>
                      }
                    />
                    <TooltipContent side="top" className="text-[10px] py-1 px-2 font-medium">
                      Color
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenu.Content className="bg-popover border border-border p-1.5 rounded-lg shadow-lg z-[10000] min-w-[160px] flex flex-col" sideOffset={5} align="start">
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Theme Colors</div>
                    {[
                      { name: 'Default', value: '' },
                      { name: 'Indigo', value: '#6366f1' },
                      { name: 'Purple', value: '#8b5cf6' },
                      { name: 'Pink', value: '#ec4899' },
                      { name: 'Blue', value: '#3b82f6' },
                      { name: 'Green', value: '#10b981' },
                      { name: 'Orange', value: '#f59e0b' },
                      { name: 'Red', value: '#ef4444' }
                    ].map(({ name, value }) => {
                      const isActive = editor.isActive('lucideIcon') 
                        ? editor.getAttributes('lucideIcon').color === (value || null)
                        : editor.isActive('badge')
                        ? editor.getAttributes('badge').color === (value || null)
                        : (value ? editor.isActive('textStyle', { color: value }) : (!editor.getAttributes('textStyle').color));
                      return (
                        <DropdownMenu.Item
                          key={name}
                          onSelect={() => {
                            if (editor.isActive('lucideIcon')) {
                              editor.chain().focus().updateAttributes('lucideIcon', { color: value || null }).run();
                            } else if (editor.isActive('badge')) {
                              editor.chain().focus().updateAttributes('badge', { color: value || null }).run();
                            } else {
                              if (value) editor.chain().focus().setColor(value).run();
                              else editor.chain().focus().unsetColor().run();
                            }
                          }}
                          className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-accent focus:bg-accent outline-none ${isActive ? 'bg-accent/50' : ''}`}
                        >
                          <div
                            className="w-4 h-4 rounded-sm border border-border/50 shrink-0 flex items-center justify-center font-bold text-white text-[10px]"
                            style={value ? { backgroundColor: value } : { backgroundColor: 'transparent' }}
                          >
                            {!value && <span className="text-foreground">A</span>}
                          </div>
                          <span className="flex-1">{name}</span>
                          {isActive && <Check className="w-3.5 h-3.5 opacity-70" />}
                        </DropdownMenu.Item>
                      )
                    })}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>

                <div className="w-[1px] h-4 bg-border mx-0.5 self-center" />

                <DropdownMenu.Root modal={false}>
                  <Tooltip>
                    <TooltipTrigger 
                      render={
                        <DropdownMenu.Trigger asChild>
                          <button 
                            className="h-8 w-8 flex items-center justify-center rounded-sm transition-colors hover:bg-accent text-popover-foreground outline-none"
                          >
                            {editor.isActive({ textAlign: 'center' }) ? (
                              <LucideIcons.AlignCenter className="w-4 h-4" />
                            ) : editor.isActive({ textAlign: 'right' }) ? (
                              <LucideIcons.AlignRight className="w-4 h-4" />
                            ) : (
                              <LucideIcons.AlignLeft className="w-4 h-4" />
                            )}
                          </button>
                        </DropdownMenu.Trigger>
                      }
                    />
                    <TooltipContent side="top" className="text-[10px] py-1 px-2 font-medium">
                      Alignment
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenu.Content className="bg-popover border border-border p-1.5 rounded-lg shadow-lg z-[10000] min-w-[130px] flex flex-col" sideOffset={5} align="start">
                    {[
                      { name: 'Align Left', value: 'left', icon: LucideIcons.AlignLeft },
                      { name: 'Align Center', value: 'center', icon: LucideIcons.AlignCenter },
                      { name: 'Align Right', value: 'right', icon: LucideIcons.AlignRight }
                    ].map(({ name, value, icon: Icon }) => (
                      <DropdownMenu.Item
                        key={name}
                        onSelect={() => editor.chain().focus().setTextAlign(value).run()}
                        className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-accent focus:bg-accent outline-none ${editor.isActive({ textAlign: value }) ? 'bg-accent/50' : ''}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1">{name}</span>
                        {editor.isActive({ textAlign: value }) && <Check className="w-3.5 h-3.5 opacity-70" />}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </TooltipProvider>
            </BubbleMenu>
          )}

          {editor && !isReadOnly && (
            <BubbleMenu
              editor={editor}
              pluginKey="tableMenu"
              shouldShow={({ editor }) => {
                return editor.isActive('table');
              }}
              {...({ tippyOptions: { duration: 100, zIndex: 9999, placement: 'top', appendTo: () => document.body } } as any)}
              className="flex gap-1 p-1 bg-popover border border-border shadow-lg rounded-md overflow-hidden"
            >
              <TooltipProvider delay={200}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => {
                           const isHeader = editor.getAttributes('tableRow').rowType === 'header';
                           editor.chain().focus().updateAttributes('tableRow', { rowType: isHeader ? 'data' : 'header' }).run();
                        }}
                        className={`h-8 px-2 flex gap-1 items-center justify-center rounded-sm transition-colors ${editor.getAttributes('tableRow').rowType === 'header' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-popover-foreground'}`}
                      >
                        <LucideIcons.Heading className="w-4 h-4" />
                        <span className="text-xs font-medium">Header</span>
                      </button>
                    }
                  />
                  <TooltipContent side="top" className="text-[10px] py-1 px-2 font-medium">
                    Set as Header Row (Subtotal)
                  </TooltipContent>
                </Tooltip>

                <div className="w-[1px] h-4 bg-border mx-0.5 self-center" />

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => {
                           const isFooter = editor.getAttributes('tableRow').rowType === 'footer';
                           editor.chain().focus().updateAttributes('tableRow', { rowType: isFooter ? 'data' : 'footer' }).run();
                        }}
                        className={`h-8 px-2 flex gap-1 items-center justify-center rounded-sm transition-colors ${editor.getAttributes('tableRow').rowType === 'footer' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-popover-foreground'}`}
                      >
                        <LucideIcons.Sigma className="w-4 h-4" />
                        <span className="text-xs font-medium">Footer</span>
                      </button>
                    }
                  />
                  <TooltipContent side="top" className="text-[10px] py-1 px-2 font-medium">
                    Set as Footer Row (Grand Total)
                  </TooltipContent>
                </Tooltip>

                <div className="w-[1px] h-4 bg-border mx-0.5 self-center" />

                <DropdownMenu.Root modal={false}>
                  <Tooltip>
                    <TooltipTrigger 
                      render={
                        <DropdownMenu.Trigger asChild>
                          <button 
                            className="h-8 w-8 flex items-center justify-center rounded-sm transition-colors hover:bg-accent text-popover-foreground outline-none"
                          >
                            {editor.isActive({ textAlign: 'center' }) ? (
                              <LucideIcons.AlignCenter className="w-4 h-4" />
                            ) : editor.isActive({ textAlign: 'right' }) ? (
                              <LucideIcons.AlignRight className="w-4 h-4" />
                            ) : (
                              <LucideIcons.AlignLeft className="w-4 h-4" />
                            )}
                          </button>
                        </DropdownMenu.Trigger>
                      }
                    />
                    <TooltipContent side="top" className="text-[10px] py-1 px-2 font-medium">
                      Alignment
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenu.Content className="bg-popover border border-border p-1.5 rounded-lg shadow-lg z-[10000] min-w-[130px] flex flex-col" sideOffset={5} align="start">
                    {[
                      { name: 'Align Left', value: 'left', icon: LucideIcons.AlignLeft },
                      { name: 'Align Center', value: 'center', icon: LucideIcons.AlignCenter },
                      { name: 'Align Right', value: 'right', icon: LucideIcons.AlignRight }
                    ].map(({ name, value, icon: Icon }) => (
                      <DropdownMenu.Item
                        key={name}
                        onSelect={() => editor.chain().focus().setTextAlign(value).run()}
                        className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-accent focus:bg-accent outline-none ${editor.isActive({ textAlign: value }) ? 'bg-accent/50' : ''}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1">{name}</span>
                        {editor.isActive({ textAlign: value }) && <Check className="w-3.5 h-3.5 opacity-70" />}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </TooltipProvider>
            </BubbleMenu>
          )}

          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none tiptap-editor prose-code:before:content-none prose-code:after:content-none prose-blockquote:before:content-none prose-blockquote:after:content-none">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Link</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLinkSubmit}>
            <DialogBody>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <label htmlFor="url" className="text-sm font-medium">URL</label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {slashMenu.isOpen && (
          <SlashMenu 
            editor={editor}
            query={slashMenu.query}
            range={slashMenu.range}
            coords={slashMenu.coords}
            onClose={() => setSlashMenu(prev => ({ ...prev, isOpen: false }))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default TiptapEditor;
