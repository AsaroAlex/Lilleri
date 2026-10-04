# Online development preview with Codex and Railway

Checked against Railway's official documentation on 2026-10-04 (Europe/Rome).

Codex remains the editing workspace. Railway runs this repository at a stable HTTPS address. Each tested change is committed and pushed to the connected development branch; Railway rebuilds and redeploys it automatically. This is a commit/deploy loop, not hot reload from the Codex filesystem. Refresh the preview after a successful deployment. A volume-backed service briefly goes offline during redeployment to keep one database writer.

The root Dockerfile uses the repository's Node 22.22.0 and pnpm 10.28.0 toolchain, runs `pnpm preview:build` to compile the API and export the financial web UI, then starts `tools/preview/run.mjs`. Startup validates the compiled synthetic API and serves the exported assets. Metro, Next and build watchers stay in the development workflow; the hosted runtime starts only the API, loopback asset server and same-origin gateway. Local `pnpm dev:cloud` retains its normal build/watch behavior. It serves the actual Expo financial application, with `/api` on the same origin. The financial preview does not start the Next project page. No provider, production database, domain purchase or Mac installation is needed. This remains a shared synthetic development instance, without public banking identity or live bank connections.

## One-time account setup

1. Open [Railway](https://railway.com/) and sign in using the GitHub account that can access `AsaroAlex/Lilleri`. Give the Railway GitHub application access to this repository.
2. Create a project from the GitHub repository `AsaroAlex/Lilleri`. Use **one service** with the repository root; the root `Dockerfile` is detected automatically.
3. In the service's source settings, select branch `claude/admiring-hypatia-yzh6nq` and enable automatic deployments. Enable **Wait for CI**: the repository already runs checks on pushes to this branch.
4. Add these service variables:

   ```dotenv
   NODE_ENV=development
   PORT=8080
   RAILWAY_DEPLOYMENT_DRAINING_SECONDS=30
   ```

5. Attach a persistent volume to this service, mounted at **`/data`**. The Dockerfile uses `/data/database` for PGlite and `/data/recovery/<archive-identity>/` for the independent key vault and erasure journal. Keep all three across deployments. Keep one replica; do not add a second service or process that opens this archive.
6. Set the healthcheck path to **`/api/health`** and the healthcheck timeout to **300 seconds**. Leave `DEV_PUBLIC_ORIGIN` unset for this initial setup: Railway's health probe uses its own hostname. The gateway continues to check browser Origin and fetch metadata for application requests.
7. Under service networking, generate a Railway HTTPS domain with target port **8080**. Wait for a successful deployment, then open the generated link from the Mac.

Share the generated application URL and deployment status in the Codex chat. Do not send passwords, API tokens, database contents or key-vault files. The account owner performs account creation and any billing decision. The connected Railway plugin can inspect and configure the existing service and follow its deployments.

The Dockerfile must remain portable: Railway Metal accepts cache mounts but rejects `RUN --mount=type=secret`. Keep managed Codex proxy certificates in a temporary local validation Dockerfile, with the CA supplied only as a build secret. Do not commit that validation file or copy session certificates into the deployed image. Keep TLS verification enabled in both environments.

## Cost and resource limits

Railway's current trial provides $5 in one-time credits and a 1 GB RAM limit; Free provides $1 monthly credits and 0.5 GB RAM. The running development supervisor was observed using approximately **1.3 GB RSS** across API, Metro and Next before build/compile peaks. A real Docker test with a **1 GiB limit** started the prepared API, then was killed for insufficient memory during the first browser bundle compilation. Use **at least 2 GB runtime memory** for this configuration; Free/Trial is not a working fit. Skipping redundant startup compilation does not remove the browser bundler's memory needs.

The earlier development supervisor reached approximately **1.85 GB** on Railway while compiling the frontend on 2026-10-04. The compiled preview measured approximately **0.55 GB total RSS locally** after the same eight browser flows; deployed memory has not yet been measured. Its memory cap remains **3 GB** until deployed usage is verified. The cap is a limit; metered consumption determines resource charges.

Hobby starts at **$5/month**, includes $5 of resource usage and charges additional usage above that amount. Current published RAM usage is $10/GB/month and CPU is $20/vCPU/month; this development service running continuously can exceed the $5 subscription. Review the dashboard's estimate and budget controls before activating a paid service. No subscription or payment has been activated by the repository work.

## Acceptance after the URL exists

- Open the app and inspect browser console/network errors; API requests must use the same HTTPS origin under `/api`.
- Create an invented manual account and transaction, refresh, and confirm exact amounts persist.
- Redeploy the same commit with the same `/data` volume; confirm both the financial records and encrypted source data can still be opened.
- Publish a small visible interface change from Codex; confirm CI passes and Railway deploys that exact commit before checking the same URL again.
- Test a downloaded export. Only the gateway is public; the internal API, local identity and diagnostics remain unavailable directly.

The local/cloud Codex instance keeps its own archive. Railway starts a separate synthetic archive; do not copy personal financial records or key material into it. The preview is ready only after these deployed checks pass.

## Verified preview — 2026-10-04

[Lilleri demo](https://lilleri-production.up.railway.app/) is deployed from fix commit `199f8f8`. Railway observed SUCCESS for deployment `fa15d61b` and redeployment `6975da48`. Public health, HTML, Expo bundle and demo API requests returned200. A fresh API read after redeployment preserved the original synthetic connection and all five account balances on `/data`.

The same source passed13 launcher tests and all8 interactive browser checks against a new isolated local archive, including manual amounts, reload persistence, language settings and ZIP export verification; no console or page errors were observed. Public interactive writes and downloads still need user testing on the shared preview. Full evidence is in [railway-preview-validation.json](railway-preview-validation.json). This is a synthetic development preview; live banking and production MVP requirements remain open.

## Compiled preview increment — 2026-10-04

Commit `3efd4ab` reached Railway SUCCESS (`7dc1df94`). Runtime logs confirm the compiled app started on8080. Fresh public health and demo requests returned200; the original connection and all five exact account balances remained unchanged. Local evidence includes three asset-boundary tests, the required API/shared builds and all eight browser flows without console or page errors. The runtime uses the existing `/data/database` and recovery namespace unchanged.

## References

- [GitHub automatic deployment and Wait for CI](https://docs.railway.com/guides/github-autodeploys)
- [Dockerfile detection](https://docs.railway.com/guides/dockerfiles)
- [Volumes and single-writer deployment](https://docs.railway.com/reference/volumes)
- [Healthcheck hostname and port](https://docs.railway.com/guides/healthchecks)
- [HTTPS domain generation](https://docs.railway.com/guides/public-networking)
- [Deployment variables](https://docs.railway.com/variables/reference)
- [Current plans and usage pricing](https://docs.railway.com/reference/pricing/plans)

Railway's legacy `railway.toml`/`railway.json` configuration is marked deprecated in its current documentation, so this setup uses a Dockerfile and supported service settings.
