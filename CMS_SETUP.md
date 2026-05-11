# Adora CMS setup

The blog uses Decap CMS to create Markdown files in `_posts`. The public `blog.html` reads those files through the GitHub Contents API, so it works on GitHub Pages without a static-site generator.

## Fix "Failed to load config.yml"

Do not open `admin/index.html` through `file://`. Browsers block Decap CMS from fetching `admin/config.yml` from the local filesystem because `file://` pages do not behave like a normal HTTP origin.

Run a local web server from the project folder instead:

```powershell
cd "C:\Users\sheik\OneDrive\Desktop\adora site"
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/admin/
```

Alternative if you prefer Node:

```powershell
npx serve . -l 8000
```

The admin UI can load over localhost, but editing/publishing posts still requires GitHub authentication. Until OAuth or Git Gateway is configured, Decap can read the config but cannot commit changes to the repo.

## Owner placeholders to replace

1. In `admin/config.yml`, replace `YOUR_GITHUB_USERNAME/YOUR_REPO_NAME`.
2. In `blog.html`, replace `YOUR_GITHUB_USERNAME` and `YOUR_REPO_NAME` in `window.ADORA_BLOG_CONFIG`.
3. In `index.html`, `contact.html`, and `blog.html`, replace `YOUR_EMAIL_PLACEHOLDER`.
4. In each page, replace `YOUR_CLOUDFLARE_WORKER_URL` after deploying the worker.

## OAuth options

Decap CMS needs OAuth before it can commit to GitHub.

Option A, GitHub Pages: deploy a Decap-compatible OAuth proxy, then set `base_url` and `auth_endpoint` in `admin/config.yml`. The OAuth app callback should point to the proxy callback URL, not directly to `file://` or your local file.

Option B, Netlify auth service: host the site on Netlify or use Netlify Identity + Git Gateway, then change the backend to `name: git-gateway`.

After OAuth is connected, visit `/admin/`, sign in, and create/edit/delete posts. New posts are committed into `_posts`.

## GitHub Pages blog loading

`js/cms.js` fetches `_posts` from the public GitHub API. This requires the repository to be public or the requests will need an authenticated API layer. Unauthenticated public API calls are rate-limited by GitHub, which is usually acceptable for a small marketing site.


---
title: "How we cut cost-per-lead by 60% for a Sydney plumber"
date: "2026-05-11"
excerpt: "A local trades business was spending $800/month with zero trackable leads. Here's exactly what we changed."
image: "assets/uploads/case-study-plumber.jpg"
---

## The situation

Sydney-based plumber, 8 years in business...