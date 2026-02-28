# ScoreXI — Complete Deployment Guide

## Prerequisites
- Node.js 18+
- Git
- MongoDB Atlas account (free)
- Vercel account (free)
- Google Cloud Console account (free, for OAuth)

---

## Step 1: MongoDB Atlas Setup

1. Go to https://cloud.mongodb.com → Create free account
2. **Create a cluster**: Choose M0 (free tier) → Any region
3. **Create a database user**:
   - Security → Database Access → Add New User
   - Username: `scorexi-user`
   - Password: generate a strong password (save it!)
   - Role: `readWriteAnyDatabase`
4. **Allow network access**:
   - Security → Network Access → Add IP Address
   - For Vercel: Add `0.0.0.0/0` (allow all) — Vercel uses dynamic IPs
5. **Get connection string**:
   - Databases → Connect → Drivers → Node.js
   - Copy: `mongodb+srv://scorexi-user:<password>@cluster0.xxxxx.mongodb.net/scorexi`
   - Replace `<password>` with your actual password

### Create Indexes (run once after first deployment)
```javascript
// In MongoDB Atlas → Browse Collections → Shell (or Compass)
db.players.createIndex({ name: "text" })
db.players.createIndex({ username: 1 })
db.matches.createIndex({ status: 1, visibility: 1, createdAt: -1 })
db.matches.createIndex({ "teamA.name": "text", "teamB.name": "text", title: "text" })
db.balls.createIndex({ inningsId: 1, totalBallsInInnings: 1 })
db.balls.createIndex({ matchId: 1, inningsNumber: 1 })
```

---

## Step 2: Google OAuth Setup

1. Go to https://console.cloud.google.com
2. Create a new project: `scorexi`
3. APIs & Services → OAuth Consent Screen:
   - User Type: External
   - App name: ScoreXI
   - Add scopes: `email`, `profile`, `openid`
4. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (dev)
     - `https://your-scorexi.vercel.app/api/auth/callback/google` (prod)
5. Copy **Client ID** and **Client Secret**

---

## Step 3: Deploy to Vercel

### 3a. Push code to GitHub
```bash
git init
git add .
git commit -m "feat: ScoreXI initial MVP"
git remote add origin https://github.com/yourusername/scorexi.git
git push -u origin main
```

### 3b. Connect to Vercel
1. Go to https://vercel.com → Import Git Repository
2. Select your `scorexi` repo
3. Framework Preset: **Next.js** (auto-detected)
4. Build Command: `npm run build`
5. Output Directory: `.next`

### 3c. Add Environment Variables
In Vercel → Project → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `MONGODB_URI` | `mongodb+srv://scorexi-user:PASSWORD@cluster0.xxx.mongodb.net/scorexi` |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` — paste result |
| `NEXTAUTH_URL` | `https://your-scorexi.vercel.app` |
| `GOOGLE_CLIENT_ID` | From Google Console |
| `GOOGLE_CLIENT_SECRET` | From Google Console |
| `NEXT_PUBLIC_APP_URL` | `https://your-scorexi.vercel.app` |
| `NEXT_PUBLIC_APP_NAME` | `ScoreXI` |

### 3d. Deploy
Click **Deploy**. Vercel builds and deploys automatically.
Every `git push` to `main` triggers a new deployment.

---

## Step 4: Custom Domain (Optional)

1. Vercel → Project → Settings → Domains
2. Add your domain: `scorexi.com`
3. Add DNS records at your registrar:
   - Type: `A`, Value: `76.76.21.21`
   - Type: `CNAME www`, Value: `cname.vercel-dns.com`
4. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` env vars to new domain
5. Update Google OAuth redirect URI to `https://scorexi.com/api/auth/callback/google`

---

## Step 5: SEO Checklist

- [ ] Submit sitemap: https://search.google.com/search-console → Add `https://scorexi.com/sitemap.xml`
- [ ] Verify site in Google Search Console
- [ ] Check Core Web Vitals with PageSpeed Insights
- [ ] Open Graph image: create `/public/og-image.png` (1200×630px)
- [ ] Test mobile-friendliness: https://search.google.com/test/mobile-friendly

---

## Step 6: Google AdSense (Monetization Day 1)

1. Apply at https://adsense.google.com
2. Add site domain, get approval (takes 1-2 weeks)
3. Once approved, get your Publisher ID (`ca-pub-XXXXXXXX`)
4. Add to `src/app/layout.tsx`:
```html
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX"
  crossOrigin="anonymous"
/>
```
5. Place ad units on: homepage, match list, scorecard page (not on scoring page — distracts users)

---

## Local Development

```bash
# Clone and install
git clone https://github.com/yourusername/scorexi.git
cd scorexi
npm install

# Setup environment
cp .env.example .env.local
# Fill in your MONGODB_URI and other values

# Run dev server
npm run dev
# Open http://localhost:3000
```

---

## Architecture Overview

```
scorexi/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── matches/route.ts     ← List/Create matches
│   │   │   ├── match/[id]/
│   │   │   │   ├── route.ts         ← Get/Update match
│   │   │   │   └── ball/route.ts    ← Save/Undo ball
│   │   │   └── players/route.ts     ← Search players
│   │   ├── match/[id]/              ← Public scorecard view
│   │   ├── scoring/[id]/            ← Live scoring interface
│   │   ├── new-match/               ← Match creation wizard
│   │   ├── matches/                 ← Match listing
│   │   ├── layout.tsx               ← Root layout + SEO
│   │   └── globals.css              ← Design system
│   ├── components/
│   │   ├── layout/AppShell.tsx      ← Mobile/Desktop nav
│   │   ├── scoring/
│   │   │   ├── ScoringPanel.tsx     ← Ball-by-ball input
│   │   │   ├── ScorecardView.tsx    ← Innings scorecard
│   │   │   └── PlayerSearchInput.tsx← Typeahead player add
│   │   └── match/
│   │       └── MatchListClient.tsx  ← Match list + search
│   ├── models/
│   │   ├── Player.ts  Match.ts  Innings.ts  Ball.ts  User.ts
│   ├── lib/
│   │   ├── db.ts      ← MongoDB connection pooling
│   │   └── utils.ts   ← Cricket math, rate limiting, helpers
│   └── types/index.ts ← All TypeScript types
```

---

## Performance Notes

- **Ball saves**: ~1ms per write. 120 balls/match = trivial load.
- **Polling**: 4s interval × 50 viewers = 750 req/min. Atlas free handles 500 connections.
- **Pagination**: Always limit=10. Never load all matches.
- **Indexes**: Created on startup. Queries are O(log n).
- **CDN**: Vercel serves static assets globally. JS/CSS cached at edge.

## Scaling Path

| Users | Action |
|---|---|
| 0–1,000 | Free tier (Atlas M0 + Vercel Hobby) |
| 1,000–10,000 | Atlas M10 ($57/mo) + Vercel Pro ($20/mo) |
| 10,000+ | Atlas M30 + Redis for rate limiting + WebSockets for live |

---

## Security Checklist

- [x] HTTPS enforced (Vercel default)
- [x] Security headers (X-Frame-Options, CSP, HSTS)
- [x] Rate limiting on all API routes
- [x] Input sanitization with Zod validation
- [x] Share tokens are 64-char hex (256-bit entropy)
- [x] MongoDB field validation via Mongoose schemas
- [x] No sensitive data in JWT payload
- [ ] Enable MongoDB Atlas IP allowlist (once Vercel Pro with static IPs)
- [ ] Add CAPTCHA to match creation (Phase 2, when spam occurs)
