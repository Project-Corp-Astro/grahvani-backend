# 11. Media Service — Storage Configuration & Migration Guide

> **Last Updated:** 2026-02-24
> **Service:** `media-service` (port 3007)
> **Database Schema:** `app_media` (tables: `files`, `file_variants`)

---

## Overview

The Media Service stores uploaded files (images, documents, audio, etc.) using a **Storage Adapter Pattern**. This means the service code stays the same — only **environment variables** change when you switch between storage backends.

```
┌─────────────────────────────────────────────────────────────────┐
│                     STORAGE ADAPTER PATTERN                     │
├─────────────┬───────────────────┬───────────────────────────────┤
│  Adapter    │  When to use      │  Cost                         │
├─────────────┼───────────────────┼───────────────────────────────┤
│  local      │  Laptop / VPS     │  Free (limited by disk size)  │
│  s3 (AWS)   │  Production       │  ~$0.023/GB storage + egress  │
│  s3 (R2)    │  Production       │  ~$0.015/GB storage, $0 egress│
└─────────────┴───────────────────┴───────────────────────────────┘

Zero code changes needed between any of these. Only env vars.
```

---

## Current Setup (Where We Are Now)

**Storage:** Local disk on your laptop
**Path:** `./uploads` (auto-created inside `media-service/` folder)
**Adapter:** `local`

### Active Environment Variables

```env
# These are the ONLY storage-related vars active right now
STORAGE_ADAPTER=local
STORAGE_LOCAL_PATH=./uploads
```

### What Happens When You Upload a File

1. File arrives via `POST /api/v1/media/upload`
2. Image files → auto-converted to WebP, 4 variants generated (thumb, small, medium, large)
3. Files saved to `./uploads/{bucket}/{tenantId}/{fileId}.webp`
4. Metadata saved to `app_media.files` + `app_media.file_variants` tables
5. Public URL returned → `http://localhost:3007/uploads/{bucket}/{tenantId}/{fileId}.webp`

---

## Migration Path 1: Local Laptop → VPS (Hostinger / KVM4)

> **When:** You're deploying media-service to your Hostinger VPS for the first time
> **Difficulty:** Easy
> **Downtime:** None (new service deployment)
> **Code Changes:** None

### Step-by-Step

#### 1. SSH to VPS and Create the Uploads Folder

```bash
ssh root@<VPS_IP>

# Create the uploads directory
mkdir -p /var/uploads

# Set proper ownership (the Docker container runs as UID 1001)
chown -R 1001:1001 /var/uploads
```

#### 2. Create the `app_media` Schema in Production PostgreSQL

```bash
# On the VPS, exec into the PostgreSQL container
docker exec -it <postgres-container-id> psql -U grahvani -d grahvani

# Inside psql:
CREATE SCHEMA IF NOT EXISTS app_media;
\q
```

> The PostgreSQL container name / UUID is available in Coolify dashboard and in the root `.env` file under Section 10.

#### 3. Create Coolify App for Media Service

1. Go to **Coolify Dashboard**
2. **Create New Application** → Docker → GitHub
3. Set:
   - **Repository:** `Project-Corp-Astro/grahvani-backend`
   - **Branch:** `main`
   - **Dockerfile:** `Dockerfile.media`
   - **Port:** `3007`
   - **Domain:** `api-media.grahvani.in`
   - **Memory Limit:** `1024m`
4. **Copy the UUID** from the URL

#### 4. Add GitHub Secret

Go to GitHub → `grahvani-backend` repo → Settings → Secrets → Actions:
- **Name:** `COOLIFY_MEDIA_UUID`
- **Value:** The UUID from step 3

#### 5. Set Environment Variables in Coolify

The media-service uses the **same shared env vars** (JWT, Redis, DB host, internal key) as all other services. Copy those values from any existing service in Coolify (e.g., auth-service or client-service).

**Shared vars (same values as other services — copy from Coolify):**

| Variable | Note |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Same as auth/user/client services |
| `JWT_REFRESH_SECRET` | Same as auth/user/client services |
| `INTERNAL_SERVICE_KEY` | Same as all services |
| `REDIS_URL` | Same Redis connection string as all services |

**Media-specific vars (NEW — only these are unique to media-service):**

```env
PORT=3007

# Database — same host/user/password as other services, only schema differs
MEDIA_DATABASE_URL=postgres://<user>:<password>@<postgres-container-id>:5432/grahvani?search_path=app_media,public
MEDIA_DIRECT_URL=postgres://<user>:<password>@<postgres-container-id>:5432/grahvani?search_path=app_media,public

# Storage — VPS local disk
STORAGE_ADAPTER=local
STORAGE_LOCAL_PATH=/var/uploads
```

> **Tip:** For `MEDIA_DATABASE_URL`, copy `AUTH_DATABASE_URL` from the auth-service Coolify config and just replace `app_auth` with `app_media`.

#### 6. Update API Gateway in Coolify

In the **API Gateway** Coolify app, add this env var:

```env
MEDIA_SERVICE_URL=http://<media-service-container-id>:3007
```

> The container ID is assigned by Coolify after creating the app. You can find it in the Coolify dashboard URL or app settings.

#### 7. Push Prisma Schema to Create Tables

After the schema is created (step 2), push the table definitions:

```bash
# From your laptop (if DB is accessible via SSH tunnel or public access)
npx prisma db push --schema=services/media-service/prisma/schema.prisma
```

#### 8. Push to Git and Deploy

```bash
git add .
git commit -m "feat: add media-service"
git push origin main
```

The CI/CD pipeline will auto-deploy. Verify:

```bash
curl https://api-media.grahvani.in/health
```

### What Changes (Summary)

| Variable | Laptop | VPS |
|---|---|---|
| `STORAGE_ADAPTER` | `local` | `local` ← **same** |
| `STORAGE_LOCAL_PATH` | `./uploads` | `/var/uploads` ← **only this changes** |

**`STORAGE_ADAPTER` stays `local` on VPS.** The adapter is the same (saving to disk). Only the path changes because on VPS the uploads should go to a dedicated directory (`/var/uploads`), not inside the app folder.

---

## Migration Path 2: VPS Disk → AWS S3

> **When:** VPS disk is filling up, or you need CDN/global distribution
> **Difficulty:** Easy
> **Downtime:** None (just restart the service)
> **Code Changes:** None

### Prerequisites

1. **AWS Account** with S3 access
2. Create an S3 bucket (e.g., `grahvani-media`)
3. Create an IAM user with S3 permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
       "Resource": ["arn:aws:s3:::grahvani-media", "arn:aws:s3:::grahvani-media/*"]
     }]
   }
   ```
4. Get the **Access Key ID** and **Secret Access Key**

### Step-by-Step

#### 1. Update Coolify Env Vars (Media Service)

**Remove:**
```env
STORAGE_ADAPTER=local
STORAGE_LOCAL_PATH=/var/uploads
```

**Add:**
```env
STORAGE_ADAPTER=s3
S3_ENDPOINT=https://s3.ap-south-1.amazonaws.com
S3_BUCKET=grahvani-media
S3_ACCESS_KEY=AKIA_YOUR_ACCESS_KEY_HERE
S3_SECRET_KEY=YOUR_SECRET_KEY_HERE
S3_REGION=ap-south-1
S3_PUBLIC_URL=https://grahvani-media.s3.ap-south-1.amazonaws.com
```

#### 2. Restart the Media Service

In Coolify → Media Service → click **Restart**.

That's it. No code changes, no deployment, no git push needed.

#### 3. Verify

```bash
# Health check
curl https://api-media.grahvani.in/health

# Upload a test file
curl -X POST https://api-media.grahvani.in/api/v1/media/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-image.jpg" \
  -F "bucket=general"
```

### What Changes (Summary)

| Variable | VPS Disk | AWS S3 |
|---|---|---|
| `STORAGE_ADAPTER` | `local` | `s3` ← **changed** |
| `STORAGE_LOCAL_PATH` | `/var/uploads` | *(remove — not needed)* |
| `S3_ENDPOINT` | *(not set)* | `https://s3.ap-south-1.amazonaws.com` ← **new** |
| `S3_BUCKET` | *(not set)* | `grahvani-media` ← **new** |
| `S3_ACCESS_KEY` | *(not set)* | Your AWS key ← **new** |
| `S3_SECRET_KEY` | *(not set)* | Your AWS secret ← **new** |
| `S3_REGION` | *(not set)* | `ap-south-1` ← **new** |
| `S3_PUBLIC_URL` | *(not set)* | S3 bucket URL ← **new** |

### Cost Estimate (AWS S3)

| Item | Rate | 100 GB | 1 TB |
|---|---|---|---|
| Storage | $0.023/GB/month | $2.30 | $23.00 |
| Uploads (PUT) | $0.005/1000 | ~$0.05 | ~$0.50 |
| Downloads (GET) | $0.0004/1000 | ~$0.04 | ~$0.40 |
| **Data Transfer (egress)** | **$0.09/GB** | **$9.00** | **$90.00** |
| **Monthly Total** | | **~$11.40** | **~$114** |

> ⚠️ **Warning:** AWS S3 egress (download) costs can be expensive for media-heavy apps. Consider Cloudflare R2 instead.

---

## Migration Path 3: VPS Disk → Cloudflare R2 (Recommended)

> **When:** Same as S3, but you want **$0 download fees**
> **Difficulty:** Easy (same as S3 — it's S3-compatible)
> **Downtime:** None
> **Code Changes:** None
> **Why R2:** Download bandwidth is FREE. S3 charges $0.09/GB for downloads.

### Prerequisites

1. **Cloudflare Account** (free tier works)
2. Go to Cloudflare Dashboard → R2 → Create bucket → `grahvani-media`
3. Create R2 API token:
   - Go to R2 → Manage R2 API Tokens → Create API Token
   - Permission: Object Read & Write
   - Copy **Access Key ID** and **Secret Access Key**
4. Note your **Account ID** (top-right of Cloudflare dashboard)

### Optional: Custom Domain for R2

To serve files from `https://media.grahvani.in` instead of an ugly R2 URL:

1. In Cloudflare R2 bucket settings → **Custom Domains** → Add `media.grahvani.in`
2. This routes through Cloudflare's CDN (free caching!)

### Step-by-Step

#### 1. Update Coolify Env Vars (Media Service)

**Remove:**
```env
STORAGE_ADAPTER=local
STORAGE_LOCAL_PATH=/var/uploads
```

**Add:**
```env
STORAGE_ADAPTER=s3
S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
S3_BUCKET=grahvani-media
S3_ACCESS_KEY=YOUR_R2_ACCESS_KEY
S3_SECRET_KEY=YOUR_R2_SECRET_KEY
S3_REGION=auto
S3_PUBLIC_URL=https://media.grahvani.in
```

> Replace `YOUR_ACCOUNT_ID` with your actual Cloudflare Account ID.

#### 2. Restart the Media Service

In Coolify → Media Service → click **Restart**. Done.

### What Changes (Summary)

| Variable | VPS Disk | Cloudflare R2 |
|---|---|---|
| `STORAGE_ADAPTER` | `local` | `s3` ← **changed** |
| `STORAGE_LOCAL_PATH` | `/var/uploads` | *(remove)* |
| `S3_ENDPOINT` | *(not set)* | `https://ACCOUNT_ID.r2.cloudflarestorage.com` |
| `S3_BUCKET` | *(not set)* | `grahvani-media` |
| `S3_ACCESS_KEY` | *(not set)* | Your R2 key |
| `S3_SECRET_KEY` | *(not set)* | Your R2 secret |
| `S3_REGION` | *(not set)* | `auto` |
| `S3_PUBLIC_URL` | *(not set)* | `https://media.grahvani.in` |

### Cost Estimate (Cloudflare R2)

| Item | Rate | 100 GB | 1 TB |
|---|---|---|---|
| Storage | $0.015/GB/month | $1.50 | $15.00 |
| Uploads (Class A) | $4.50/million | ~$0.05 | ~$0.45 |
| Downloads (Class B) | $0.36/million | ~$0.04 | ~$0.36 |
| **Data Transfer (egress)** | **$0.00 (FREE!)** | **$0.00** | **$0.00** |
| **Monthly Total** | | **~$1.60** | **~$16** |

> ✅ R2 is **7x cheaper** than S3 at 1TB because download bandwidth is free.

---

## Migrating Existing Files Between Storage Backends

When you switch from local → S3/R2, **existing files on the old storage are NOT automatically moved**. New uploads go to the new backend. For existing files, you have two options:

### Option A: Ignore Old Files (Simplest)

If the service is new and has few uploads, just switch. Old files on VPS disk will still be there but won't be served. This is fine if you're switching early.

### Option B: Migrate Files (If You Have Data)

```bash
# SSH to VPS
ssh root@<VPS_IP>

# Install rclone
apt install rclone -y

# For AWS S3:
rclone sync /var/uploads s3:grahvani-media --progress

# For Cloudflare R2:
rclone sync /var/uploads :s3,provider=Cloudflare,access_key_id=<KEY>,secret_access_key=<SECRET>,endpoint=https://<ACCOUNT_ID>.r2.cloudflarestorage.com:grahvani-media --progress
```

After migration, update the `public_url` column in the `app_media.files` and `app_media.file_variants` tables to point to the new S3/R2 URLs.

---

## Quick Reference: All Storage Variables

```env
# ┌──────────────────────────────────────────────────────────────────────┐
# │  STORAGE VARIABLE REFERENCE                                        │
# ├──────────────────────┬─────────────────────────────────────────────┤
# │  Variable            │  Description                                │
# ├──────────────────────┼─────────────────────────────────────────────┤
# │  STORAGE_ADAPTER     │  "local" or "s3"                            │
# │  STORAGE_LOCAL_PATH  │  Folder path (only when ADAPTER=local)      │
# │  S3_ENDPOINT         │  S3/R2 API URL (only when ADAPTER=s3)       │
# │  S3_BUCKET           │  Bucket name                                │
# │  S3_ACCESS_KEY       │  AWS/R2 Access Key ID                       │
# │  S3_SECRET_KEY       │  AWS/R2 Secret Access Key                   │
# │  S3_REGION           │  AWS region or "auto" for R2                 │
# │  S3_PUBLIC_URL       │  Public base URL for serving files           │
# └──────────────────────┴─────────────────────────────────────────────┘
```

---

## Buckets (File Organization)

Files are organized into logical buckets:

| Bucket | Max Size | Variants | Visibility | Use Case |
|---|---|---|---|---|
| `avatars` | 5 MB | Yes (thumb, small, medium) | Public | User profile photos |
| `client-photos` | 10 MB | Yes (all sizes) | Authenticated | Client birth chart images |
| `reports` | 25 MB | No | Private | Generated PDF reports |
| `branding` | 10 MB | Yes | Public | Tenant logos, banners |
| `imports` | 50 MB | No | Private | CSV/Excel bulk imports |
| `voice-recordings` | 50 MB | No | Private | Consultation recordings |
| `general` | 50 MB | Yes (if image) | Authenticated | Everything else |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/media/upload` | Required | Upload file (multipart form) |
| `GET` | `/api/v1/media` | Required | List files (paginated, filterable) |
| `GET` | `/api/v1/media/:id` | Required | Get file details + variants |
| `PATCH` | `/api/v1/media/:id` | Required | Update visibility/metadata |
| `DELETE` | `/api/v1/media/:id` | Required | Soft delete + storage cleanup |
| `GET` | `/health` | None | Health check |
| `GET` | `/metrics` | None | Prometheus metrics |

### Upload Example

```bash
curl -X POST http://localhost:3007/api/v1/media/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@photo.jpg" \
  -F "bucket=avatars" \
  -F "visibility=public"
```

### Response

```json
{
  "success": true,
  "data": {
    "file": {
      "id": "a1b2c3d4-...",
      "bucket": "avatars",
      "filename": "a1b2c3d4.webp",
      "originalFilename": "photo.jpg",
      "mimeType": "image/webp",
      "size": 45678,
      "status": "ready",
      "publicUrl": "http://localhost:3007/uploads/avatars/tenant123/a1b2c3d4.webp",
      "variants": [
        { "name": "thumb", "width": 100, "height": 100, "size": 3456 },
        { "name": "small", "width": 320, "height": 240, "size": 12345 },
        { "name": "medium", "width": 640, "height": 480, "size": 23456 },
        { "name": "large", "width": 1280, "height": 960, "size": 34567 }
      ]
    }
  }
}
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `SCHEMA app_media not found` | Schema doesn't exist in PostgreSQL | Run `CREATE SCHEMA IF NOT EXISTS app_media;` in psql |
| `Upload fails with 500` | Uploads folder doesn't exist or no permissions | Run `mkdir -p /var/uploads && chown 1001:1001 /var/uploads` |
| `S3 access denied` | Wrong credentials or missing bucket | Check `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and bucket exists |
| `File uploaded but no variants` | Not an image, or Sharp not installed | Check `mimetype` is image/*, Sharp binary is included in Docker |
| `Files not served on VPS` | Gateway not routing to media-service | Check `MEDIA_SERVICE_URL` in gateway env vars |
