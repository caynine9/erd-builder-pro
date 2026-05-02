import React from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Editor } from '@tiptap/react';

interface TableBubbleMenuProps {
  editor: Editor;
}

export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableMenu"
      updateDelay={0}
      shouldShow={({ editor }) => {
        return editor.isFocused && editor.isActive('table');
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
              Alignment (⌘ ⇧ L/C/R)
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

        <div className="w-[1px] h-4 bg-border mx-0.5 self-center" />

        <DropdownMenu.Root modal={false}>
          <Tooltip>
            <TooltipTrigger 
              render={
                <DropdownMenu.Trigger asChild>
                  <button 
                    className="h-8 w-8 flex items-center justify-center rounded-sm transition-colors hover:bg-accent text-popover-foreground outline-none"
                  >
                    <LucideIcons.Menu className="w-4 h-4" />
                  </button>
                </DropdownMenu.Trigger>
              }
            />
            <TooltipContent side="top" className="text-[10px] py-1 px-2 font-medium">
              Table Options
            </TooltipContent>
          </Tooltip>
          <DropdownMenu.Content className="bg-popover border border-border p-1.5 rounded-lg shadow-lg z-[10000] min-w-[160px] flex flex-col" sideOffset={5} align="end">
            <DropdownMenu.Item
              onSelect={() => {
                const { state } = editor.view;
                const { selection } = state;
                let tablePos = -1;
                state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
                  if (node.type.name === 'table') {
                    tablePos = pos;
                    return false;
                  }
                });
                
                if (tablePos !== -1) {
                  editor.chain().focus().insertContentAt(tablePos, { type: 'paragraph' }).run();
                }
              }}
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-accent focus:bg-accent outline-none"
            >
              <LucideIcons.ArrowUp className="w-4 h-4" />
              <span className="flex-1">Add Paragraph Above</span>
            </DropdownMenu.Item>
            <div className="h-[1px] bg-border my-1" />
            <DropdownMenu.Item
              onSelect={() => editor.chain().focus().addColumnAfter().run()}
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-accent focus:bg-accent outline-none"
            >
              <LucideIcons.Columns className="w-4 h-4" />
              <span className="flex-1">Add Column</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => editor.chain().focus().deleteColumn().run()}
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-accent focus:bg-accent outline-none text-destructive hover:text-destructive focus:text-destructive"
            >
              <LucideIcons.Columns className="w-4 h-4" />
              <span className="flex-1">Delete Column</span>
            </DropdownMenu.Item>
            <div className="h-[1px] bg-border my-1" />
            <DropdownMenu.Item
              onSelect={() => editor.chain().focus().addRowAfter().run()}
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-accent focus:bg-accent outline-none"
            >
              <LucideIcons.Layout className="w-4 h-4" />
              <span className="flex-1">Add Row</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => editor.chain().focus().deleteRow().run()}
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-accent focus:bg-accent outline-none text-destructive hover:text-destructive focus:text-destructive"
            >
              <LucideIcons.Layout className="w-4 h-4" />
              <span className="flex-1">Delete Row</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </TooltipProvider>
    </BubbleMenu>
  );
}
