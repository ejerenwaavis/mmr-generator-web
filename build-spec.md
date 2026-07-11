===== PROJECT STRUCTURE FOUNDATION =====
TARGET HOST: Namecheap cPanel — CloudLinux Passenger (Node.js)
AUTHOR: Avis Ejerenwa | ACED Division

CORE RULE: Single-folder, full-stack Node.js application.
The server (app.js) serves EVERYTHING — static files, views, and API.
There is NO separate frontend/backend split. NO dist/ folder. NO Vite/React/Next
unless explicitly requested. One folder, one startup file, zero confusion.

──────────────────────────────────────────
FOLDER STRUCTURE:
──────────────────────────────────────────
/my-app                       ← PassengerAppRoot points HERE
  /models                     ← data shapes only, no logic
      User.js
      Session.js
      (add as needed)
  /views                      ← EJS templates, no business logic
    /components
        header.ejs
        footer.ejs
        modal.ejs
    /pages
        index.ejs
        login.ejs
        dashboard.ejs
        (add as needed)
  /public                     ← static assets only, no server logic
    /css
        style.css
    /js
        main.js
    /images
  app.js                      ← PassengerStartupFile — ALL routing + logic
  package.json
  .env                        ← local dev only, NEVER committed
  .gitignore

──────────────────────────────────────────
app.js REQUIRED SETUP (in this order):
──────────────────────────────────────────
  1. import express, dotenv, mongoose, etc.
  2. const app = express()
  3. app.set('trust proxy', 1)         ← CRITICAL for Namecheap Passenger
  4. app.set('view engine', 'ejs')
  5. app.set('views', './views')
  6. Security middleware (helmet, cors)
  7. app.use(express.json())
  8. app.use(express.static('public'))
  9. Health check: app.get('/health', ...)
  10. All routes (GET, POST, PATCH, DELETE)
  11. 404 catch-all: app.use((req, res) => res.status(404).render('pages/404'))
  12. Error handler
  13. app.listen(process.env.PORT || 3000)

  The PORT must come from process.env — Passenger injects it at runtime.

──────────────────────────────────────────
SECURITY (no rate limiter):
──────────────────────────────────────────
  Do NOT add express-rate-limit or any rate limiting middleware.
  Behind Namecheap's Passenger proxy, rate limiters see the proxy IP
  for ALL users, causing the entire app to share one bucket and lock
  everyone out. This has been tested and confirmed broken.

  Security is enforced through these layers instead:
  - helmet         → secure HTTP headers
  - cors           → origin restriction
  - bcrypt (12+)   → password hashing
  - JWT            → stateless session tokens (short-lived access + refresh)
  - TOTP 2FA       → multi-factor authentication on every account
  - input validation (express-validator) → sanitize all user input

  If rate limiting is ever needed in the future, it MUST:
  - Use app.set('trust proxy', 1) so req.ip is the real client IP
  - Key by authenticated user ID, NOT by req.ip alone
  - Be tested on Namecheap before going to production

──────────────────────────────────────────
.htaccess RULES:
──────────────────────────────────────────
  - There is ONE .htaccess file, in the project root
  - It is AUTO-MANAGED by Namecheap Passenger — do NOT edit it manually
  - It MUST be in .gitignore so git pull never overwrites Passenger's config
  - Do NOT create a second .htaccess anywhere (/public, /views, etc.)
  - When Passenger starts the app, it writes this into .htaccess:

    # DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION BEGIN
    PassengerAppRoot "/home/USERNAME/my-app"
    PassengerBaseURI "/"
    PassengerNodejs "/home/USERNAME/nodevenv/my-app/22/bin/node"
    PassengerAppType node
    PassengerStartupFile app.js
    # DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END

  - Env vars are set inside cPanel Node.js app manager OR in the
    .htaccess env block — NOT hardcoded in app.js
  - If git pull ever breaks the app (API returns 404), the fix is:
    cPanel → Setup Node.js App → Stop → Start (regenerates .htaccess)

──────────────────────────────────────────
.gitignore MUST INCLUDE:
──────────────────────────────────────────
  node_modules/
  .env
  .htaccess
  *.log
  .DS_Store
  Thumbs.db

──────────────────────────────────────────
DEPLOYMENT (git pull model):
──────────────────────────────────────────
  Local:  code → test → git push origin main
  Server: cPanel Terminal → cd ~/my-app → git pull origin main
  Deps:   cPanel → Setup Node.js App → Run NPM Install (only if deps changed)
  Restart: cPanel → Setup Node.js App → Stop → Start

  No build step on server. No npm run build. No Vite. What you push is what runs.

──────────────────────────────────────────
STRICT RULES:
──────────────────────────────────────────
  1. No separate /frontend and /backend folders. One root.
  2. No build tools (Vite, Webpack, Parcel) unless I explicitly ask.
  3. No /dist folder. /public IS the static folder.
  4. app.js is the single entry point. Passenger calls it directly.
  5. express.static('public') replaces any need for a second web server.
  6. One .htaccess file only. In the root. In .gitignore. Hands off.
  7. Any route that returns HTML: res.render('pages/whatever')
  8. Any route that returns data: res.json({ ... })
  9. Models = data shape definitions only. No API calls, no logic.
  10. Views = presentation only. No data transformation or fetching.
  11. Keep app.js under ~500 lines. If it grows past that, split into
      route files ONLY when I ask — not preemptively.
  12. app.set('trust proxy', 1) is ALWAYS set. Non-negotiable.
  13. Do NOT add rate limiters. They break behind Passenger proxy.
  14. If I ask for a subdomain app later:
      New subdomain = new folder = its own app.js + its own Passenger config.
      They do NOT share files, folders, or node_modules.

──────────────────────────────────────────
NAMECHEAP cPANEL SETUP CHECKLIST:
──────────────────────────────────────────
  □ Domains → Create subdomain → Document root = my-app/
  □ Setup Node.js App → Create:
    - Node version: 22
    - App mode: Production
    - App root: my-app
    - App URL: subdomain.domain.com
    - Startup file: app.js
  □ Environment Variables → Set in cPanel (MONGODBURI, NODE_ENV, etc.)
  □ Run NPM Install
  □ Start App
  □ Test: https://subdomain.domain.com/health → {"status":"ok"}

──────────────────────────────────────────
STACK DEFAULTS (override only if I ask):
──────────────────────────────────────────
  Runtime  : Node.js 22
  Framework: Express
  Templates: EJS
  Database : MongoDB via Mongoose (or flat JSON if no DB needed)
  CSS      : Tailwind CSS via CDN (Play CDN for simple apps, or CLI build
             for larger apps — output to /public/css/tailwind.css)
  UI goal  : Visually polished, animated, modern. Use Tailwind transitions,
             animations, gradients, and hover effects generously. Make it beautiful.
  Auth     : JWT + TOTP 2FA (ask me before choosing a different auth strategy)
  Env vars : dotenv for local, cPanel env manager for production

──────────────────────────────────────────
WHEN I ASK FOR REACT/VITE (SPA mode):
──────────────────────────────────────────
  If I explicitly ask for a React or Vite frontend, adapt as follows:
  - Still ONE folder. app.js still serves everything.
  - Build output goes to /public (NOT a separate /dist)
  - app.js serves: express.static('public') + API routes
  - SPA fallback: app.get('*', (req, res) => res.sendFile('public/index.html'))
  - API routes registered BEFORE the wildcard catch-all
  - Build locally, commit /public output, push. No build on server.
  - .htaccess still in .gitignore. Passenger still manages it.

=========================================