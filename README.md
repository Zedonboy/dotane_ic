# Dotane - Web3 Note-Taking Platform for InfoFi

<div align="center">
  <img src="src/dotane/public/favicon.ico" alt="Dotane Logo" width="200"/>
  
  **The Future of Knowledge Trading on the Internet Computer**
  
  [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
  [![Internet Computer](https://img.shields.io/badge/Platform-Internet%20Computer-blue)](https://internetcomputer.org/)
  [![Web3](https://img.shields.io/badge/Web3-Enabled-green)](https://web3.foundation/)
</div>

## 🌟 Overview

Dotane is a revolutionary Web3 note-taking platform that ushers in the era of **InfoFi** (Information Finance), where knowledge becomes a tradable asset. Built on the Internet Computer blockchain, Dotane enables authors, scientists, journalists, researchers, and founders to create, share, and monetize their expert insights through a decentralized platform.

### 🎯 Target Audience
- **Authors** - Publish and monetize your writing
- **Scientists** - Share research findings and insights
- **Journalists** - Create premium content with direct monetization
- **Researchers** - Publish academic work with blockchain verification
- **Founders** - Share startup insights and strategies

## 🚀 Key Features

### ✍️ **AI-Assisted Writing**
- **Deep Think Mode** - Advanced reasoning and analysis
- **Roadmap Mode** - Strategic planning and guidance  
- **Knowledge Mode** - Access to public notes database
- Real-time AI chat with streaming responses
- Context-aware suggestions and improvements

### 📝 **Rich Note Editor**
- **BlockNote Integration** - Modern, collaborative editor
- **Multimedia Support** - Images, videos, audio, files
- **Advanced Blocks** - Code blocks, Mermaid diagrams, drawing canvas
- **Premium Features** - Enhanced media capabilities for premium users
- **Real-time Collaboration** - Live editing and sharing

### 🌐 **Web3 Integration**
- **Internet Identity Authentication** - Secure, decentralized identity
- **WalletDirect Protocol** - Seamless wallet connections
- **ICRC Token Payments** - USDC/USDT support for premium features
- **NFT Export** - Convert notes to tradeable NFTs
- **Decentralized Storage** - IPFS-compatible asset storage

### 💰 **Monetization Features**
- **Payment Subscriptions** - Monthly/Yearly premium plans with crypto payments
- **Flat Rate Platform Fee** - Standard fee for note trading transactions
- **Note Trading** - Buy, sell, and trade notes as digital assets
- **Workspace Deployment Fee** - One-time fee for custom workspace setup
- **NFT Note Deployment Fee** - Fee for exporting notes as tradeable NFTs

### 🏢 **Workspace Management**
- **Custom Domains** - Deploy your own branded workspace
- **Multi-workspace Support** - Manage multiple projects
- **Canister Deployment** - Automated infrastructure provisioning
- **Asset Management** - Decentralized file storage and delivery

### 🔒 **Privacy & Security**
- **End-to-End Encryption** - Secure note storage
- **Access Control** - Granular permissions and sharing
- **Blockchain Verification** - Immutable content integrity
- **Anonymous Publishing** - Optional privacy features

## 🏗️ Architecture

### Frontend Stack
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **BlockNote** - Rich text editor
- **Jotai** - State management
- **Vite** - Fast build tooling

### Backend Stack
- **Internet Computer** - Decentralized platform
- **Rust** - High-performance backend
- **Candid** - Interface definition language
- **Stable Structures** - Persistent storage
- **ICRC Ledgers** - Token integration

### Key Canisters
- **`dotane_ic_backend`** - Main application logic
- **`dotane_user_storage`** - User workspace management
- **`dotane_asset_storage`** - Media file storage
- **`internet_identity`** - Authentication service

## 🚀 Getting Started

### Prerequisites
- [DFX](https://internetcomputer.org/docs/current/developer-docs/setup/install/) - Internet Computer SDK
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://rustup.rs/) - For backend development

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/dotane_ic.git
   cd dotane_ic
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start local development**
   ```bash
   # Start the Internet Computer replica
   dfx start --background
   
   # Deploy canisters
   dfx deploy
   
   # Start frontend development server
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:8080
   - Backend: http://localhost:4943

### Environment Setup

Create a `.env` file with the following variables:
```env
DFX_NETWORK=local
CANISTER_ID_DOTANE_IC_BACKEND=your_canister_id
CANISTER_ID_DOTANE_ASSET_STORAGE=your_asset_canister_id
DOTANE_AI_SERVER=http://localhost:3010
```

## 📖 Usage Guide

### Creating Your First Note
1. **Sign in** with Internet Identity
2. **Create a new note** using the rich editor
3. **Add multimedia content** (images, videos, code blocks)
4. **Publish** your note publicly or with restricted access
5. **Monetize** by setting up premium access or NFT export

### AI-Assisted Writing
1. **Open AI Chat** from the sidebar
2. **Choose a mode** (Deep Think, Roadmap, or Knowledge)
3. **Attach notes** for context-aware assistance
4. **Get real-time suggestions** and improvements

### Premium Features
1. **Upgrade to Premium** using USDC/USDT
2. **Access advanced media** upload capabilities
3. **Create custom workspaces** with your domain
4. **Export notes as NFTs** for trading

### Workspace Management
1. **Deploy your workspace** canister
2. **Connect your domain** for branding
3. **Manage multiple projects** in one interface
4. **Control access** and monetization settings

## 🔧 Development

### Project Structure
```
dotane_ic/
├── src/
│   ├── dotane/                 # Frontend application
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # Utility functions
│   │   │   ├── store.ts        # State management
│   │   │   └── types/          # TypeScript definitions
│   │   └── packages/           # Custom BlockNote extensions
│   ├── dotane_ic_backend/      # Main backend canister
│   ├── dotane_user_storage/    # User workspace canister
│   ├── dotane_asset_storage/   # Asset storage canister
│   └── dotane_landing/         # Landing page
├── bin/                        # Compiled WASM files
└── dfx.json                    # DFX configuration
```

### Key Components

#### Frontend Components
- **`NoteApp.tsx`** - Main application component
- **`NoteEditor.tsx`** - Rich text editor with BlockNote
- **`AIChatSidebar.tsx`** - AI assistance interface
- **`PublishModal.tsx`** - Note publishing interface
- **`CryptoPaymentModal.tsx`** - Premium payment handling
- **`WalletDirectModal.tsx`** - Web3 wallet integration

#### Backend Functions
- **Note Management** - CRUD operations for notes
- **User Authentication** - Internet Identity integration
- **Premium Payments** - ICRC token processing
- **Asset Storage** - Decentralized file management
- **AI Integration** - Session management and API calls

### Custom BlockNote Extensions
- **`blocknote-mermaid`** - Mermaid diagram support
- **`blocknote-code`** - Syntax-highlighted code blocks
- **`blocknote-draw`** - Drawing canvas integration

## 🛠️ API Reference

### Authentication
```typescript
// Internet Identity authentication
const client = await AuthClient.create()
await client.login({
  identityProvider: "https://identity.ic0.app",
  onSuccess: () => {
    // Handle successful login
  }
})
```

### Note Operations
```typescript
// Create a new note
const noteId = await createNote(title, content)

// Publish a note
await publishNote(noteId, AccessType.Public)

// Update note content
await updateNote(noteId, newContent)

// Delete a note
await deleteNote(noteId)
```

### Premium Features
```typescript
// Upgrade to premium
const response = await notifyDepositPremiumPayment({
  token_type: TokenType.CKUSDC,
  payment_period: PaymentPeriod.Monthly
})

// Get user balance
const balance = await getBalanceTuple()
```

## 🚧 Roadmap

### Phase 1: Core Features ✅
- [x] Rich text editor with BlockNote
- [x] Internet Identity authentication
- [x] Basic note CRUD operations
- [x] AI-assisted writing
- [x] Premium subscription system

### Phase 2: Web3 Integration ✅
- [x] WalletDirect protocol integration
- [x] ICRC token payments (USDC/USDT)
- [ ] Decentralized asset storage
- [ ] Custom workspace deployment

### Phase 3: Monetization (In Progress)
- [ ] NFT export functionality
- [ ] Note trading marketplace
- [ ] Advanced access controls
- [ ] Revenue sharing system

### Phase 4: Advanced Features (Planned)
- [ ] PDF reader and AI summarizer
- [ ] Image canvas for illustrations
- [ ] Collaborative editing
- [ ] Advanced analytics dashboard
- [ ] Mobile application

### Phase 5: Ecosystem (Future)
- [ ] API for third-party integrations
- [ ] Plugin system for custom extensions
- [ ] Cross-chain compatibility
- [ ] Advanced AI models integration

## 🤝 Contributing

We welcome contributions from the community! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style
- **Frontend**: ESLint + Prettier configuration
- **Backend**: Rust formatting with `cargo fmt`
- **TypeScript**: Strict type checking enabled

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Internet Computer Foundation** - For the decentralized platform
- **BlockNote Team** - For the excellent rich text editor
- **DFX Team** - For the development tools
- **Open Source Community** - For the amazing libraries and tools

## 📞 Support

- **Documentation**: [docs.dotane.io](https://docs.dotane.io)
- **Discord**: [Join our community](https://discord.gg/dotane)
- **Twitter**: [@dotane_io](https://twitter.com/dotane_io)
- **Email**: support@dotane.io

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=your-username/dotane_ic&type=Date)](https://star-history.com/#your-username/dotane_ic&Date)

---

<div align="center">
  <strong>Built with ❤️ on the Internet Computer</strong><br/>
  <em>Empowering creators to monetize knowledge in the Web3 era</em>
</div>
