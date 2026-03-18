"use client";

import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface UploadResponse {
  url: string;
  publicId: string;
}

interface ImageUploaderProps {
  folder?: string;
  multiple?: boolean;
  onUploaded: (urls: string[]) => void;
  label?: string;
  className?: string;
}

export function ImageUploader({
  folder = "delivro",
  multiple = false,
  onUploaded,
  label = "Upload image",
  className = "",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>("");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    const selected = Array.from(files);
    const uploadedUrls: string[] = [];

    try {
      for (const file of selected) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", folder);

        const res = await api.post<UploadResponse>("/api/upload", fd);
        uploadedUrls.push(res.url);
      }

      onUploaded(uploadedUrls);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Upload failed";
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple={multiple}
          onChange={(e) => void handleFiles(e.target.files)}
          className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-700"
          disabled={uploading}
        />
        {uploading && <span className="text-xs text-slate-500">Uploading...</span>}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <p className="mt-1 text-[11px] text-slate-400">PNG, JPG, WebP, GIF up to 5MB each</p>
    </div>
  );
}
