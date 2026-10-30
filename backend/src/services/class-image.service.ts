import { createHash, randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { pool } from "../database/pool.js";
import { AppError } from "../errors/app-error.js";

const MAX_BYTES = 5 * 1024 * 1024;
const FOLDER = "badminton/classes";

const credentials = () => {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new AppError(
      503,
      "IMAGE_UPLOAD_UNAVAILABLE",
      "Image upload is not configured",
    );
  }
  return {
    cloud: env.CLOUDINARY_CLOUD_NAME,
    key: env.CLOUDINARY_API_KEY,
    secret: env.CLOUDINARY_API_SECRET,
  };
};

export const validateClassImage = (body: Buffer, mime: string): string => {
  if (!Buffer.isBuffer(body) || !body.length)
    throw new AppError(400, "IMAGE_REQUIRED", "Image is required");
  if (body.length > MAX_BYTES)
    throw new AppError(413, "IMAGE_TOO_LARGE", "Image must be at most 5 MB");
  const jpeg = body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const png = body
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    body.toString("ascii", 0, 4) === "RIFF" &&
    body.toString("ascii", 8, 12) === "WEBP";
  if (
    (mime === "image/jpeg" && jpeg) ||
    (mime === "image/png" && png) ||
    (mime === "image/webp" && webp)
  )
    return mime;
  throw new AppError(415, "UNSUPPORTED_IMAGE", "Use a JPEG, PNG or WebP image");
};

const signedForm = (
  fields: Record<string, string>,
  file?: Buffer,
  mime?: string,
) => {
  const { key, secret } = credentials();
  const signature = createHash("sha1")
    .update(
      `${Object.entries(fields)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => `${name}=${value}`)
        .join("&")}${secret}`,
    )
    .digest("hex");
  const form = new FormData();
  Object.entries(fields).forEach(([name, value]) => form.set(name, value));
  form.set("api_key", key);
  form.set("signature", signature);
  if (file && mime)
    form.set(
      "file",
      new Blob([new Uint8Array(file)], { type: mime }),
      "class-image",
    );
  return form;
};

const uploadImage = async (body: Buffer, mime: string) => {
  const { cloud } = credentials();
  const fields = {
    folder: FOLDER,
    public_id: randomUUID(),
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`,
    {
      method: "POST",
      body: signedForm(fields, body, mime),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok)
    throw new AppError(
      502,
      "IMAGE_UPLOAD_FAILED",
      "Image provider rejected the upload",
    );
  const result = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
  };
  if (
    !result.secure_url?.startsWith("https://res.cloudinary.com/") ||
    !result.public_id?.startsWith(`${FOLDER}/`)
  ) {
    throw new AppError(
      502,
      "IMAGE_UPLOAD_FAILED",
      "Image provider returned an invalid response",
    );
  }
  return { url: result.secure_url, publicId: result.public_id };
};

const destroyImage = async (publicId: string) => {
  const { cloud } = credentials();
  const fields = {
    public_id: publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/destroy`,
    {
      method: "POST",
      body: signedForm(fields),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) throw new Error("Image provider rejected deletion");
};

export const replaceClassImage = async (
  classId: string,
  body: Buffer,
  mime: string,
) => {
  validateClassImage(body, mime);
  const existing = await pool.query<{ image_public_id: string | null }>(
    "SELECT image_public_id FROM classes WHERE id = $1",
    [classId],
  );
  if (!existing.rows[0])
    throw new AppError(404, "CLASS_NOT_FOUND", "Class not found");
  const oldId = existing.rows[0].image_public_id;
  const uploaded = await uploadImage(body, mime);
  try {
    const result = await pool.query(
      "UPDATE classes SET image_url = $2, image_public_id = $3 WHERE id = $1 AND image_public_id IS NOT DISTINCT FROM $4",
      [classId, uploaded.url, uploaded.publicId, oldId],
    );
    if (!result.rowCount)
      throw new AppError(
        409,
        "IMAGE_CHANGED",
        "Class image changed; please retry",
      );
  } catch (error) {
    await destroyImage(uploaded.publicId).catch(() => undefined);
    throw error;
  }
  if (oldId && oldId !== uploaded.publicId)
    await destroyImage(oldId).catch(() => undefined);
  return { imageUrl: uploaded.url };
};
