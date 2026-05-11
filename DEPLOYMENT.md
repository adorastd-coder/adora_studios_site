# Adora deployment notes

## 1. Spacing cleanup

`index.html` now uses a consistent section rhythm:

- `.hero` is roughly 56-64px vertically on desktop.
- `.pain`, `.section`, and `.cta-section` are around 64px on desktop.
- `footer` uses normal padding only: no chat-related `padding-bottom: calc(...)`.
- The chat controls are `position: fixed`, so they float over the page and do not push the footer down.

Deploy by committing `index.html`.

## 2. Contact page blank fix

The likely blank-page cause was AOS dependency on the main content. If the AOS CDN failed or was blocked, `[data-aos]` content could remain invisible.

`contact.html` was rewritten so the hero, note, and audit form render normally without AOS. The AOS script is still loaded for consistency, but the critical contact content does not depend on it.

Owner placeholders:

- Replace `YOUR_EMAIL_PLACEHOLDER` in the audit form and owner chat form.
- Replace `YOUR_CLOUDFLARE_WORKER_URL` once the worker is deployed.
- FormSubmit requires email confirmation the first time a new destination email is used. After replacing `YOUR_EMAIL_PLACEHOLDER`, submit a test message immediately and click the confirmation link in the email so future messages can go through.

## 3. Decap CMS on GitHub Pages

Files added:

- `admin/index.html`
- `admin/config.yml`
- `js/cms.js`
- `_posts/*.md`
- `CMS_SETUP.md`

Setup steps:

1. Commit and push all files to GitHub.
2. In `admin/config.yml`, replace `YOUR_GITHUB_USERNAME/YOUR_REPO_NAME`.
3. In `blog.html`, replace the same placeholders in `window.ADORA_BLOG_CONFIG`.
4. After deploying, pre-create the `assets/uploads/` folder so Decap CMS has a media folder available. Keep `assets/uploads/.gitkeep` committed if the folder would otherwise be empty.
5. Test the admin over HTTP, not `file://`:
   - `cd "C:\Users\sheik\OneDrive\Desktop\adora site"`
   - `python -m http.server 8000`
   - Open `http://localhost:8000/admin/`
6. Set up OAuth for Decap CMS:
   - GitHub Pages option: deploy a Decap-compatible OAuth proxy and set `base_url` / `auth_endpoint` in `admin/config.yml`.
   - Netlify option: move hosting to Netlify or use Netlify Identity + Git Gateway, then change the backend to `name: git-gateway`.
7. Visit `/admin/`, sign in, and create/edit/delete posts.

The public blog reads Markdown files from the GitHub Contents API. The repository must be public unless you add a private authenticated API layer.

## 4. Groq worker

Worker setup:

1. Deploy `groq-worker.js` as a Cloudflare Worker.
2. Add worker secret `GROQ_API_KEY`.
3. Add `ALLOWED_ORIGIN` with your exact site origin, for example `https://adoraagency.com`. The worker now requires this value and returns a configuration error if it is missing. Do not deploy it with a wildcard origin.
4. Optional: add `GROQ_MODEL` if you want to override `llama-3.3-70b-versatile`.
5. Copy the worker URL into `GROQ_WORKER_URL` in `index.html`, `contact.html`, and `blog.html`.

Recommended Cloudflare hardening:

- Add a WAF/rate-limit rule for the worker route.
- Consider Turnstile if spam becomes a problem.
- Keep the Groq key only in Cloudflare secrets, never in client-side HTML.
