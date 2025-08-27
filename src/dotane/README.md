# Dotane.io - Decentralized Notes

A modern note-taking application built with React, TypeScript, and Vite. This project provides a decentralized note-taking platform with a beautiful, responsive interface.

## Features

- 📝 Rich text editing with BlockNote
- 🎨 Dark/Light theme support
- 📱 Responsive design
- 🔧 Customizable settings
- 📊 Note organization with notebooks
- 🚀 Fast development with Vite

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Rich Text Editor**: BlockNote
- **Icons**: Lucide React

## Getting Started

### Prerequisites

Make sure you have Node.js installed on your system. You can use any package manager (npm, yarn, or pnpm).

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dotane
```

2. Install dependencies:
```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm
pnpm install
```

3. Start the development server:
```bash
# Using npm
npm run dev

# Using yarn
yarn dev

# Using pnpm
pnpm dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # UI components
│   ├── ui/             # shadcn/ui components
│   └── ...             # Custom components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── types/              # TypeScript type definitions
├── App.tsx             # Main App component
├── NoteApp.tsx         # Note application logic
├── main.tsx            # React entry point
└── index.css           # Global styles
```

## Development

This project was converted from Next.js to Vite for faster development experience. The conversion includes:

- Custom theme provider (replacing next-themes)
- Vite configuration with React plugin
- Updated TypeScript configuration
- Removed Next.js specific code and dependencies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
