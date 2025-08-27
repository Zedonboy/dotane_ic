# AI Chat Sidebar

A retractable AI chat sidebar that provides intelligent assistance for note-taking and content creation.

## Features

### 🧠 AI Modes
- **Deep Think**: Advanced reasoning and analysis
- **RoadMap**: Strategic planning and guidance  
- **Public Note Knowledge**: Access to public notes database

### 💬 Chat Interface
- Real-time conversation with AI assistant
- Message history with timestamps
- Loading indicators during AI processing
- Support for Enter key to send messages

### 📎 Note Attachment
- Attach your personal notes to conversations
- Search through your notes library
- Add public notes via URL
- Visual indicators for attached notes

### 🎛️ Retractable Design
- Collapsible sidebar (12px width when collapsed)
- Overlay design that doesn't affect main layout
- Smooth animations and transitions
- Toggle button in header
- Mobile-responsive design

## Usage

### Desktop
1. Click the **MessageSquare** icon in the header to toggle the AI chat sidebar
2. Select an AI mode from the dropdown
3. Type your message and press Enter or click Send
4. Attach notes using the paperclip icon if needed

### Mobile
1. Open the mobile menu (three dots)
2. Select "Show AI Chat" or "Hide AI Chat"
3. Use the same interface as desktop

### AI Modes

#### Deep Think
Best for:
- Complex problem analysis
- Critical thinking exercises
- Detailed explanations
- Philosophical discussions

#### RoadMap
Best for:
- Project planning
- Goal setting
- Step-by-step guidance
- Strategic decision making

#### Public Note Knowledge
Best for:
- Research assistance
- Knowledge base queries
- Cross-referencing information
- Learning from public content

## Technical Implementation

### Components
- `AIChatSidebar`: Main sidebar component
- Integrated into `NoteApp.tsx` main layout
- Uses existing UI components from the design system

### State Management
- Local state for messages, input, and UI state
- Props for notes data and collapse state
- Responsive to mobile/desktop layouts

### Styling
- Tailwind CSS with custom transitions
- Consistent with existing design system
- Dark/light theme support
- Responsive breakpoints

## Future Enhancements

- [ ] Real AI integration (currently simulated)
- [ ] Message persistence
- [ ] Voice input support
- [ ] File upload capabilities
- [ ] Custom AI prompts
- [ ] Conversation export
- [ ] Multi-language support
