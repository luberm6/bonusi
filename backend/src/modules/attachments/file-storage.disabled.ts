import { HttpError } from "../../common/http/error.js";
import type { FileStorageService, UploadFileInput, UploadFileResult } from "./file-storage.service.js";

const FILES_DISABLED_ERROR = "File uploads are disabled";

export class DisabledFileStorageService implements FileStorageService {
  async upload(_input: UploadFileInput): Promise<UploadFileResult> {
    throw new HttpError(403, FILES_DISABLED_ERROR);
  }

  async delete(_fileUrl: string): Promise<void> {
    throw new HttpError(403, FILES_DISABLED_ERROR);
  }
}
