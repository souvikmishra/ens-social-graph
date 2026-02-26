# Deployment

## Vercel Environment Variables
Add these in Vercel → Project Settings → Environment Variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `ALCHEMY_RPC_URL`

## Deploy Steps
1. Push this repo to GitHub
2. Import project in Vercel
3. Add the 3 env vars above with your values
4. Deploy — build command is already set to `prisma generate && next build`
