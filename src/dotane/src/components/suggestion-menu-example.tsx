import { BlockNoteEditor } from "@blocknote/core";
import { SuggestionMenuController } from "@blocknote/react";

// Example of how to create suggestion items with groups
export const createSuggestionItems = (editor: BlockNoteEditor) => {
  return [
    // Text Blocks Group
    {
      title: "Paragraph",
      subtext: "Regular text content",
      badge: "Type",
      group: "Text Blocks",
      onItemClick: () => {
        editor.insertBlocks([{ type: "paragraph" }], editor.getTextCursorPosition().block);
      },
      aliases: ["p", "text", "paragraph"]
    },
    {
      title: "Heading 1",
      subtext: "Main page title",
      badge: "Heading1",
      group: "Text Blocks",
      onItemClick: () => {
        editor.insertBlocks([{ type: "heading", props: { level: 1 } }], editor.getTextCursorPosition().block);
      },
      aliases: ["h1", "title", "large", "main"]
    },
    {
      title: "Heading 2",
      subtext: "Section heading",
      badge: "Heading2",
      group: "Text Blocks",
      onItemClick: () => {
        editor.insertBlocks([{ type: "heading", props: { level: 2 } }], editor.getTextCursorPosition().block);
      },
      aliases: ["h2", "subtitle", "medium", "section"]
    },
    {
      title: "Heading 3",
      subtext: "Subsection heading",
      badge: "Heading3",
      group: "Text Blocks",
      onItemClick: () => {
        editor.insertBlocks([{ type: "heading", props: { level: 3 } }], editor.getTextCursorPosition().block);
      },
      aliases: ["h3", "small", "subsection"]
    },
    {
      title: "Quote",
      subtext: "Highlight important text",
      badge: "Quote",
      group: "Text Blocks",
      onItemClick: () => {
        editor.insertBlocks([{ type: "quote" }], editor.getTextCursorPosition().block);
      },
      aliases: ["blockquote", "citation", "highlight"]
    },
    
    // Media Blocks Group
    {
      title: "Image",
      subtext: "Upload or embed an image (Premium)",
      badge: "Image",
      group: "Media",
      onItemClick: () => {
        // You can implement image upload logic here
        const url = prompt("Enter image URL:");
        if (url) {
          editor.insertBlocks([{ type: "image", props: { url } }], editor.getTextCursorPosition().block);
        }
      },
      aliases: ["img", "picture", "photo", "upload"]
    },
    {
      title: "Video",
      subtext: "Embed a video (Premium)",
      badge: "Video",
      group: "Media",
      onItemClick: () => {
        const url = prompt("Enter video URL:");
        if (url) {
          editor.insertBlocks([{ type: "video", props: { url } }], editor.getTextCursorPosition().block);
        }
      },
      aliases: ["vid", "movie", "embed"]
    },
    
    // Lists Group
    {
      title: "Bullet List",
      subtext: "Unordered list with bullets",
      badge: "List",
      group: "Lists",
      onItemClick: () => {
        editor.insertBlocks([{ type: "bulletListItem" }], editor.getTextCursorPosition().block);
      },
      aliases: ["ul", "bullets", "list", "unordered"]
    },
    {
      title: "Numbered List",
      subtext: "Ordered list with numbers",
      badge: "ListOrdered",
      group: "Lists",
      onItemClick: () => {
        editor.insertBlocks([{ type: "numberedListItem" }], editor.getTextCursorPosition().block);
      },
      aliases: ["ol", "numbers", "ordered", "sequence"]
    },
    {
      title: "Check List",
      subtext: "Interactive checklist",
      badge: "CheckSquare",
      group: "Lists",
      onItemClick: () => {
        editor.insertBlocks([{ type: "checkListItem" }], editor.getTextCursorPosition().block);
      },
      aliases: ["todo", "task", "checkbox", "done"]
    },
    
    // Code Group
    {
      title: "Code Block",
      subtext: "Multi-line code with syntax highlighting",
      badge: "Code",
      group: "Code",
      onItemClick: () => {
        editor.insertBlocks([{ type: "codeBlock" }], editor.getTextCursorPosition().block);
      },
      aliases: ["code", "programming", "syntax", "block"]
    },
    {
      title: "Inline Code",
      subtext: "Single line of code",
      badge: "Hash",
      group: "Code",
      onItemClick: () => {
        // This would typically be handled by markdown shortcuts
        editor.insertText("`");
      },
      aliases: ["inline", "snippet", "single"]
    },
    
    // Tables Group
    {
      title: "Table",
      subtext: "Organize data in rows and columns",
      badge: "Table",
      group: "Tables",
      onItemClick: () => {
        editor.insertBlocks([{ type: "table" }], editor.getTextCursorPosition().block);
      },
      aliases: ["grid", "data", "spreadsheet", "matrix"]
    },
    
    // Other Group
    {
      title: "Divider",
      subtext: "Separate content sections",
      badge: "Minus",
      group: "Other",
      onItemClick: () => {
        editor.insertBlocks([{ type: "divider" }], editor.getTextCursorPosition().block);
      },
      aliases: ["hr", "line", "separator", "break"]
    }
  ];
};

// Example usage in a component:
/*
import { createSuggestionItems } from './suggestion-menu-example';

// In your component:
const suggestionItems = createSuggestionItems(editor);

// Then pass these items to your CustomSlashMenu component
<CustomSlashMenu 
  items={suggestionItems}
  selectedIndex={selectedIndex}
  onItemClick={(item) => item.onItemClick()}
/>
*/ 