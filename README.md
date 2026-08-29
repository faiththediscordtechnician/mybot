# ✨ Cute Chatbot

A cute, login-protected chatbot powered by Claude Haiku running on Railway.

## Features

- 🔐 Password-protected login with bcrypt
- 💬 Real-time chat with Claude Haiku
- 🎨 Cute pastel UI with smooth animations
- 🚀 Ready to deploy on Railway
- 📱 Responsive design

## Prerequisites

- Node.js 18.x or higher
- An Anthropic API key (get it at https://console.anthropic.com)

## Local Setup

1. Clone the repository:
```bash
git clone <repo-url>
cd mybot
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from template:
```bash
cp .env.example .env
```

4. Edit `.env` and add your credentials:
```
ANTHROPIC_API_KEY=your-key-here
JWT_SECRET=your-random-secret-here
NODE_ENV=development
```

5. Run the development server:
```bash
npm run dev
```

6. Visit `http://localhost:8080` and login with password: `password`

## Changing the Password

To generate a new bcrypt hash for a custom password:

```bash
node -e "require('bcrypt').hash('your-new-password', 10).then(h => console.log(h))"
```

Then update `ADMIN_PASSWORD_HASH` in your `.env` file.

## Deploying to Railway

1. Push to GitHub
2. Create a new Railway project
3. Connect your GitHub repository
4. Add environment variables:
   - `ANTHROPIC_API_KEY`
   - `JWT_SECRET` (generate a random string)
   - `ADMIN_PASSWORD_HASH` (bcrypt hash of your password)
   - `NODE_ENV=production`

5. Set the domain to `simile.ca` in Railway settings
6. **IMPORTANT**: Go to Project Settings → GitHub → disable "Require approval for deployments" to enable automatic deployments
7. Deploy!

The app will now automatically deploy on every push to main.

## Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `JWT_SECRET`: Secret key for JWT token signing
- `ADMIN_PASSWORD_HASH`: Bcrypt hash of the login password
- `PORT`: Server port (default: 8080)
- `NODE_ENV`: Environment mode (development/production)

## Tech Stack

- **Backend**: Express.js
- **Auth**: JWT + bcrypt
- **AI**: Anthropic Claude Haiku
- **Frontend**: Vanilla JavaScript with cute CSS
- **Deployment**: Railway

## License

MIT
