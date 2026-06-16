# TaskTide

A modern freelancing platform with intelligent job matching, secure escrow payments, and gamification features.

## Features

- **Intelligent Matching**: TF-IDF based algorithm for connecting jobs with freelancers
- **Secure Payments**: Integrated Khalti and Stripe payment gateways with escrow system
- **Real-time Communication**: Socket.io powered chat and notifications
- **Reputation System**: Trust scores and badge system for users
- **Dispute Resolution**: Admin panel for handling disputes
- **Gamification**: Leaderboards and achievements

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Socket.io Client

### Backend
- Node.js / Express
- MongoDB
- Socket.io
- Jest for testing

## Getting Started

### Prerequisites
- Node.js 16+
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies for client and server
3. Configure environment variables
4. Run the development servers

```bash
# Client
cd client
npm install
npm run dev

# Server
cd server
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and configure your variables:

```
MONGODB_URI=mongodb://localhost:27017/tasktide
JWT_SECRET=your_secret_key
PORT=5000
```

## Documentation

See the `docs/` folder for:
- Architecture overview
- API reference
- Matching algorithm details
- Payment flow documentation

## Testing

```bash
cd server
npm test
```

## License

MIT - see LICENSE file for details
