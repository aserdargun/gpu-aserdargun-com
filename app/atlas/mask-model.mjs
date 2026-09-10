// Counts logical lanes only. This model neither executes Triton nor measures a GPU.
export const MASK_MODEL_VERSION = 2;
export function modelMaskedLaunch(n, blockSize, masked) {
  if (!Number.isSafeInteger(n) || n < 1 || n > 1_000_000 ||
      ![128, 256, 512].includes(blockSize) || typeof masked !== "boolean") {
    throw new RangeError("Unsupported mask-model input");
  }
  const programs = Math.ceil(n / blockSize);
  const lanes = programs * blockSize;
  const inactive = lanes - n;
  return { n, blockSize, programs, lanes, inactive, outOfBounds: masked ? 0 : inactive };
}
