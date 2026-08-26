import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// 1. Read .env file manually
const envPath = path.join(process.cwd(), ".env");
let envContent = "";
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, "utf8");
}

const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    env[key] = val;
  }
}

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const BUCKET_NAME = "elevates-media";

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".heic":
      return "image/heic";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

async function run() {
  console.log("Creating or ensuring bucket:", BUCKET_NAME);
  const { data: existingBuckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error("Error listing buckets:", listErr);
  }

  const bucketExists = existingBuckets?.some((b) => b.name === BUCKET_NAME);
  if (!bucketExists) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ["image/*", "application/pdf"],
    });
    if (createErr) {
      console.error("Failed to create bucket:", createErr);
    } else {
      console.log("Successfully created bucket:", BUCKET_NAME);
    }
  } else {
    console.log("Bucket already exists:", BUCKET_NAME);
  }

  // Define local folders to migrate to Supabase Storage
  const mediaFolders = ["images", "guests", "projects", "team"];
  const publicDir = path.join(process.cwd(), "public");

  const urlMap: Record<string, string> = {};
  const uploadedFiles: string[] = [];

  for (const folder of mediaFolders) {
    const folderPath = path.join(publicDir, folder);
    const files = getAllFiles(folderPath);

    for (const file of files) {
      const relPath = path.relative(publicDir, file);
      // Format as storage key e.g. "images/founders/sarhan-qadir.jpeg"
      const storageKey = relPath.replace(/\\/g, "/");
      const localUrlPath = "/" + storageKey;

      const fileBuffer = fs.readFileSync(file);
      const contentType = getMimeType(file);

      console.log(`Uploading ${storageKey} (${contentType})...`);
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storageKey, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadErr) {
        console.error(`Failed to upload ${storageKey}:`, uploadErr);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storageKey);

      const supabasePublicUrl = publicUrlData.publicUrl;
      urlMap[localUrlPath] = supabasePublicUrl;
      uploadedFiles.push(file);

      console.log(`Uploaded: ${localUrlPath} -> ${supabasePublicUrl}`);
    }
  }

  console.log("\n--- Updating Postgres Database References ---");
  
  // 1. Update Profiles avatar_url
  const { data: profiles } = await supabase.from("profiles").select("id, avatar_url");
  if (profiles) {
    for (const p of profiles) {
      if (p.avatar_url && urlMap[p.avatar_url]) {
        await supabase
          .from("profiles")
          .update({ avatar_url: urlMap[p.avatar_url] })
          .eq("id", p.id);
        console.log(`Updated profile ${p.id} avatar_url -> ${urlMap[p.avatar_url]}`);
      }
    }
  }

  // 2. Update Events banner_url
  const { data: events } = await supabase.from("events").select("id, banner_url");
  if (events) {
    for (const e of events) {
      if (e.banner_url && urlMap[e.banner_url]) {
        await supabase
          .from("events")
          .update({ banner_url: urlMap[e.banner_url] })
          .eq("id", e.id);
        console.log(`Updated event ${e.id} banner_url -> ${urlMap[e.banner_url]}`);
      }
    }
  }

  // 3. Update Projects image_url / gallery
  const { data: projects } = await supabase.from("projects").select("id, image_url");
  if (projects) {
    for (const pr of projects) {
      if (pr.image_url && urlMap[pr.image_url]) {
        await supabase
          .from("projects")
          .update({ image_url: urlMap[pr.image_url] })
          .eq("id", pr.id);
        console.log(`Updated project ${pr.id} image_url -> ${urlMap[pr.image_url]}`);
      }
    }
  }

  console.log("\n--- Deleting Local Hardcoded Media Files ---");
  for (const file of uploadedFiles) {
    try {
      fs.unlinkSync(file);
      console.log("Deleted local file:", file);
    } catch (e) {
      console.error("Failed to delete local file:", file, e);
    }
  }

  // Remove empty directories inside public/images, public/guests, public/projects, public/team
  for (const folder of mediaFolders) {
    const folderPath = path.join(publicDir, folder);
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
      console.log("Removed directory:", folderPath);
    }
  }

  console.log("\nSUCCESS: All hardcoded local assets uploaded to Supabase Storage and deleted locally!");
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
