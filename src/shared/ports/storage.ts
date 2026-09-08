export type StoredObject = {
  bucket: string;
  key: string;
  mime: string;
  bytes: number;
};

export type ObjectStorage = {
  putPrivate(input: {
    mime: string;
    body: Uint8Array;
  }): Promise<StoredObject>;
  signedUrl(key: string, expiresSeconds: number): Promise<string>;
};
