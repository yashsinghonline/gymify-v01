# Publish Gymify: GitHub, then Vercel

Two parts, about ten minutes, both free. You need a GitHub account and a Vercel account
(sign in to Vercel with GitHub, it saves a step later).

## Part 1: put this folder on GitHub

GitHub's website takes at most 100 files per upload and this folder has about 2,200, so use
the GitHub Desktop app. It needs no commands.

1. Install **GitHub Desktop** from desktop.github.com and sign in.
2. Menu **File → Add local repository**, choose this `gymify-v01` folder.
3. It says the folder is not a repository yet. Click **create a repository**, change nothing,
   click **Create repository**.
4. Click **Publish repository**. Untick **Keep this code private**. Click **Publish repository**.

The code is now at `github.com/<your-name>/gymify-v01`.

Keep it public. The licence asks that people who use your site can get its source, and the
app's About page links to this repository.

<details>
<summary>The same with commands, if you prefer</summary>

Create an empty repository named `gymify-v01` on github.com first (no README), then:

```sh
cd gymify-v01
git init -b main
git add .
git commit -m "Gymify v01"
git remote add origin https://github.com/<your-name>/gymify-v01.git
git push -u origin main
```
</details>

## Part 2: import it in Vercel

1. Open **vercel.com/new**.
2. Under **Import Git Repository** pick `gymify-v01` and click **Import**. If it is not listed,
   click **Adjust GitHub App Permissions** and allow that repository.
3. **Root Directory**: click **Edit**, choose **frontend**, confirm. This is the one setting
   that matters.
4. Leave everything else as it is (Framework shows **Vite**) and click **Deploy**.

After two to four minutes Vercel shows the address, something like
`https://gymify-v01.vercel.app`. That is your public site.

## Afterwards

- **Changing the app.** Edit files, then in GitHub Desktop write a short summary, click
  **Commit to main** and **Push origin**. Vercel rebuilds and republishes by itself.
- **Your own domain.** In Vercel: the project → **Settings → Domains**.

## If the build fails

| The build log says | Do this |
|---|---|
| `GYMIFY: set Root Directory to frontend` | Step 3 was skipped. Project → **Settings → Build and Deployment → Root Directory**: type `frontend`, save, then **Deployments → ⋯ → Redeploy**. |
| `No more than 12 Serverless Functions` | The same cause and the same fix. |
| `bash: ../scripts/build-site.sh: No such file` | In the same settings page switch on **Include files outside the root directory in the Build Step**, then redeploy. |
| `Pictures: the download failed` | Not an error: the site is published without pictures. Redeploy to try again. |

## What the build does

Vercel runs `frontend/vercel.json`, which runs `scripts/build-site.sh`:

- builds the device-only app: no server, no accounts; it starts empty, asks who is training on
  first open and keeps everything in the visitor's browser;
- adds the **Source code** link to your GitHub repository on the About page;
- adds the exercise pictures. They are not in this folder (216 MB), so each build downloads
  them from the project Gymify was made from. To stop depending on that download, run
  `bash scripts/fetch-media.sh --media-only` once and commit the `catalogue/media` folder.

The pictures are not covered by the code's licence. A free, non-commercial site may show them
with the credit the app already carries; anything commercial needs a licence from
gymvisual.com. `NOTICE.md` has the terms. To publish without pictures, add the environment
variable `GYMIFY_MEDIA` with the value `0` in Vercel (Settings → Environment Variables).
