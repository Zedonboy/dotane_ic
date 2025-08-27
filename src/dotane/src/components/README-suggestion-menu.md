# Custom Suggestion Menu with Categorized Items

This implementation provides a custom slash menu for BlockNote that organizes suggestion items into categories based on their `group` attribute.

## Features

- **Categorized Items**: Items are automatically grouped by their `group` attribute
- **Rich Item Display**: Each item can have a title, subtext, badge (icon), and aliases
- **Responsive Design**: Menu adapts to different screen sizes
- **Keyboard Navigation**: Full keyboard support for navigation
- **Custom Styling**: Styled to match your application's theme

## Usage

### 1. Basic Setup

The custom suggestion menu is already integrated into the `NoteEditor` component. It will appear when you type `/` in the editor.

### 2. Creating Suggestion Items

To create suggestion items with categories, use the `DefaultSuggestionItem` type:

```typescript
type DefaultSuggestionItem = {
  title: string;           // Display name
  onItemClick: () => void; // Action to perform when clicked
  subtext?: string;        // Optional description
  badge?: string;          // Optional icon/emoji
  aliases?: string[];      // Optional search aliases
  group?: string;          // Category name (defaults to "Other")
};
```

### 3. Example Items

```typescript
const suggestionItems = [
  {
    title: "Paragraph",
    subtext: "Add a paragraph block",
    badge: "📝",
    group: "Text Blocks",
    onItemClick: () => {
      editor.insertBlocks([{ type: "paragraph" }], editor.getTextCursorPosition().block);
    },
    aliases: ["p", "text"]
  },
  {
    title: "Image",
    subtext: "Insert an image",
    badge: "🖼️",
    group: "Media",
    onItemClick: () => {
      const url = prompt("Enter image URL:");
      if (url) {
        editor.insertBlocks([{ type: "image", props: { url } }], editor.getTextCursorPosition().block);
      }
    },
    aliases: ["img", "picture", "photo"]
  }
];
```

### 4. Group Categories

Items are automatically organized into these categories:

- **Text Blocks**: Headings, paragraphs, quotes
- **Media**: Images, videos, audio
- **Lists**: Bullet lists, numbered lists, checklists
- **Code**: Code blocks, inline code
- **Tables**: Data tables
- **Other**: Dividers, custom blocks

Items without a `group` attribute will be placed in the "Other" category.

### 5. Customization

#### Styling

The menu uses Tailwind CSS classes and can be customized by modifying the `CustomSlashMenu` component in `note-editor.tsx`.

#### Adding New Categories

To add new categories, simply assign a new `group` value to your suggestion items:

```typescript
{
  title: "Custom Block",
  group: "Custom Category",
  // ... other properties
}
```

#### Icons/Badges

You can use emojis, text, or custom icons as badges:

```typescript
badge: "🚀"        // Emoji
badge: "H1"        // Text
badge: "📊"        // Symbol
```

### 6. Integration with BlockNote

The custom menu is integrated using the `SuggestionMenuController`:

```typescript
<BlockNoteView 
  editor={editor}
  slashMenu={false}  // Disable default slash menu
>
  <SuggestionMenuController
    triggerCharacter="/"
    suggestionMenuComponent={CustomSlashMenu}
  />
</BlockNoteView>
```

### 7. Example Implementation

See `suggestion-menu-example.tsx` for a complete example of how to create suggestion items with different categories and actions.

## Styling

The menu includes responsive design and theme support:

- **Light/Dark Mode**: Automatically adapts to your theme
- **Responsive**: Works on mobile and desktop
- **Accessibility**: Full keyboard navigation and screen reader support
- **Custom CSS**: Additional styles in `index.css`

## Troubleshooting

### Menu Not Appearing
- Ensure `slashMenu={false}` is set on BlockNoteView
- Check that SuggestionMenuController is properly configured
- Verify the trigger character is correct

### Items Not Grouping
- Make sure each item has a `group` property
- Check that the group names match exactly (case-sensitive)

### Styling Issues
- Verify Tailwind CSS is properly configured
- Check that the custom CSS classes are being applied
- Ensure theme variables are defined in your CSS 