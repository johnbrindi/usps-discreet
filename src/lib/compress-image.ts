/** Longest side of a photo after export. Keeps uploads small enough for the chat. */
const MAX_SIDE = 1600;
/** Longest side kept while editing, so rotating and cropping stay fast on phones. */
const EDIT_SIDE = 2400;

/** Crop rectangle as fractions (0–1) of the image's width and height. */
export type CropRect = { x: number; y: number; w: number; h: number };

export const FULL_CROP: CropRect = { x: 0, y: 0, w: 1, h: 1 };

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("That file isn't a photo we can read."));
    el.src = src;
  });
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process that photo.");
  ctx.fillStyle = "#fff"; // transparent PNGs would otherwise turn black in JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

/**
 * Opens a photo the browser can display (including iPhone HEIC in Safari) for editing, scaled down
 * to EDIT_SIDE. Re-encoding also strips EXIF data such as GPS location.
 */
export async function loadPhotoForEditing(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, EDIT_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const { canvas, ctx } = canvasOf(img.naturalWidth * scale, img.naturalHeight * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Rotates a photo a quarter turn clockwise. */
export async function rotatePhoto(src: string): Promise<string> {
  const img = await loadImage(src);
  const { canvas, ctx } = canvasOf(img.naturalHeight, img.naturalWidth);
  ctx.translate(canvas.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

/** Crops a photo, keeping it at editing quality. */
export function cropPhoto(src: string, crop: CropRect) {
  return exportPhoto(src, crop, { maxSide: EDIT_SIDE, quality: 0.92 });
}

/** Crops a photo and encodes it as a JPEG data URL no larger than MAX_SIDE, ready to send. */
export async function exportPhoto(
  src: string,
  crop: CropRect = FULL_CROP,
  { maxSide = MAX_SIDE, quality = 0.82 }: { maxSide?: number; quality?: number } = {},
): Promise<string> {
  const img = await loadImage(src);
  const sw = crop.w * img.naturalWidth;
  const sh = crop.h * img.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const { canvas, ctx } = canvasOf(sw * scale, sh * scale);
  ctx.drawImage(img, crop.x * img.naturalWidth, crop.y * img.naturalHeight, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
