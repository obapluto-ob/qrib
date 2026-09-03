# Qrib Team Git and Deployment Guide

This guide explains how team changes reach the production application.

## Repository roles

The production services use the team repository:

```text
GitHub repository: obapluto-ob/qrib
Production branch: main
Frontend: Vercel
Backend: Render
```

Keep your personal fork, if you use one, as a separate remote. Do not confuse the repository owner (`obapluto-ob`) with the GitHub username used for authentication.

## Normal team workflow

Each contributor should work on a branch and merge through a pull request:

```bash
git checkout main
git pull --rebase origin main
git checkout -b feature/short-description

# make and test changes
git add .
git commit -m "Describe the change"
git push -u origin feature/short-description
```

Open a pull request from the feature branch into `main`. After review and merge, Vercel and Render can deploy the new `main` commit.

Do not push directly to `main` unless the team has agreed to do so.

## Check the current repository and branch

Run these commands from the project directory:

```bash
cd /home/emonigatsaucee/Qrib/qrib
git remote -v
git branch -vv
git status -sb
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

The local commit and remote `main` commit should match after synchronization. A clean status looks like:

```text
## main...origin/main
```

## Bring a local branch up to date

Before starting work or merging:

```bash
git checkout main
git fetch origin
git pull --rebase origin main
```

If Git says the local branch is behind, do not force-push. Pull or rebase first, then push normally.

## Merge an approved branch locally

Only merge branches that the team has reviewed:

```bash
git checkout main
git pull --rebase origin main
git merge --no-ff feature/branch-name
git push origin main
```

If a conflict occurs:

```bash
git status
# edit the files marked as conflicted
git add path/to/resolved-file
git commit
git push origin main
```

Do not use `git reset --hard` or `git push --force` unless the repository owner explicitly approves it. Those commands can discard or overwrite team work.

## GitHub authentication with a personal access token

A token is a password replacement. Never paste it into chat, commit it, or put it permanently in a remote URL. If a token is exposed, revoke it immediately and create a replacement.

For HTTPS authentication:

```bash
git remote set-url origin https://github.com/obapluto-ob/qrib.git
git -c credential.helper= -c core.askPass= push origin main
```

When prompted, enter the GitHub username of the account that has write access to `obapluto-ob/qrib`, then paste the token as the password. The token should have access to this repository and `Contents: Read and write` permission.

If Git reports a 403 for a username, the cached credential or token belongs to an account without write access. Create a token from the account that is actually a collaborator, or ask the repository owner to grant that account access.

SSH is another option when an SSH key is registered on the authorized GitHub account:

```bash
git remote set-url origin git@github.com:obapluto-ob/qrib.git
ssh -T git@github.com
git push origin main
```

## Vercel configuration

Vercel should be connected to:

```text
Repository: obapluto-ob/qrib
Production branch: main
Root directory: repository root
Build command: npm run build
Output directory: dist
```

Ensure automatic production deployments are enabled. If environment variables change, redeploy because Vite embeds `VITE_` values during the build.

Required frontend values include:

```text
VITE_API_URL=https://qrib-f4sk.onrender.com
VITE_GOOGLE_CLIENT_ID=<frontend Google client ID>
```

Use the actual deployed backend URL and never commit the `.env` file or secrets.

## Render configuration

Render should be connected to:

```text
Repository: obapluto-ob/qrib
Branch: main
Root directory: backend
Build command: pip install -r requirements.txt
Start command: gunicorn run:app
Auto-deploy: On commit
```

The exact commands must match the service settings currently shown in the Render dashboard. Confirm the health-check path and required backend environment variables there.

Typical backend values include:

```text
DATABASE_URL
JWT_SECRET_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
FRONTEND_URL
CORS_ALLOWED_ORIGINS
```

After changing Render environment variables, manually redeploy the service so the running instance receives them.

## Confirm which code is live

A deployment page identifies the exact Git commit it built. Compare that short SHA with GitHub:

```bash
git show --no-patch --oneline <commit-sha>
git rev-parse origin/main
```

For example, a Render message saying `Deploy live for b2d4d3d` means the backend is running commit `b2d4d3d`, not necessarily the newest commit in your local folder.

Vercel and Render may show different commit SHAs because they are separate services, but both production deployments should normally be built from `main`.

## Force a deployment

First confirm that the correct repository and branch are configured. Then either push a real approved change or use the dashboard's **Redeploy** / **Deploy latest commit** action.

An empty commit can trigger a new Git event, but it does not add code:

```bash
git checkout main
git pull --rebase origin main
git commit --allow-empty -m "Trigger deployment"
git push origin main
```

Use this only when the current `main` commit is already the code that should be deployed.

## Troubleshooting checklist

### No deployment appears

- Confirm the change was pushed to `obapluto-ob/qrib`.
- Confirm the hosting service watches `main`.
- Confirm automatic deployment is enabled.
- Check whether the deployment is filtered or skipped.

### Deployment shows an old commit

- Compare the deployment SHA with `git rev-parse origin/main`.
- Check that the deployment project is not connected to another fork.
- Manually deploy the latest `main` commit after fixing the repository setting.

### Deployment fails

- Open the complete Vercel or Render build log.
- Check the exact failing command and exit status.
- Test the same build locally (`npm run build` for the frontend).
- Check backend start commands and environment variables on Render.

### The new frontend is deployed but looks unchanged

- Use a private browser window or hard refresh.
- Confirm the browser is using the correct Vercel URL.
- Confirm `VITE_API_URL` points to the current Render service.
- Check the browser Network tab for requests to the expected backend.

## Production rule

The reliable path is:

```text
feature branch -> pull request -> obapluto-ob/qrib/main -> Vercel and Render
```

A branch existing on GitHub does not put its code into production. Its commits must be merged into the branch configured for deployment.
