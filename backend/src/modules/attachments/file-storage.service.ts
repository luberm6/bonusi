export type UploadFileInput = {
  fileName: string;
  fileType: string;
  size: number;
  content: Buffer;
};

export type UploadFileResult = {
  url: string;
  objectKey: string;
};

export interface FileStorageService {
  upload(input: UploadFileInput): Promise<UploadFileResult>;
  delete(fileUrl: string): Promise<void>;
}
