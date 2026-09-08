declare module "bidi-js" {
  type EmbeddingLevels = {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  };

  type Bidi = {
    getEmbeddingLevels: (text: string, explicitDirection?: "ltr" | "rtl") => EmbeddingLevels;
    getReorderSegments: (
      text: string,
      embeddingLevels: EmbeddingLevels,
      start?: number,
      end?: number,
    ) => Array<[number, number]>;
  };

  export default function bidiFactory(): Bidi;
}
