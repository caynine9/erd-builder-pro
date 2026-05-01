import React from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Link, Palette, Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Editor } from '@tiptap/react';

interface TextBubbleMenuProps {
  editor: Editor;
  openLinkDialog: () => void;
}

export function TextBubbleMenu({ editor, openLinkDialog }: TextBubbleMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="textMenu"
      shouldShow={({ editor, state }) => {
        return editor.isFocused && editor.isEditable && !state.selection.empty;
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
      </TooltipProvider>
    </BubbleMenu>
  );
}
