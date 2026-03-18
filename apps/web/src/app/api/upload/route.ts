/**
 * POST /api/upload
 * Uploads a file to Cloudinary and returns the secure URL.
 * Accepts multipart/form-data with a "file" field.
 *
 * Optional form fields:
 *   folder  — Cloudinary folder name (default: "delivro")
 *
 * Requires authentication.
 *
 * Returns: { url: string, publicId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth-helpers";

const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function signUpload(params: Record<string, string>): Promise<string> {
  const { createHash } = await import("crypto");
  const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return createHash("sha256").update(`${sorted}${CLOUDINARY_API_SECRET}`).digest("hex");
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  if (!CLOUDINARY_CLOUD) {
    return NextResponse.json({ message: "Image uploads not configured" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ message: "file field is required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { message: "Only JPEG, PNG, WebP and GIF images are allowed" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ message: "File must be smaller than 5 MB" }, { status: 400 });
  }

  const folder = (formData.get("folder") as string | null) ?? "delivro";

  const upload = new FormData();
  upload.append("file", file);

  // Use signed upload if API key + secret are available; fall back to unsigned preset
  if (CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const params: Record<string, string> = { folder, timestamp };
    const signature = await signUpload(params);
    upload.append("api_key", CLOUDINARY_API_KEY);
    upload.append("timestamp", timestamp);
    upload.append("folder", folder);
    upload.append("signature", signature);
  } else if (CLOUDINARY_PRESET) {
    upload.append("upload_preset", CLOUDINARY_PRESET);
    upload.append("folder", folder);
  } else {
    return NextResponse.json({ message: "Image upload credentials not configured" }, { status: 503 });
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;

  let data: { secure_url: string; public_id: string };
  try {
    const res = await fetch(endpoint, { method: "POST", body: upload });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.error?.message ?? "Cloudinary error");
    }
    data = await res.json();
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Upload failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({ url: data.secure_url, publicId: data.public_id });
}
