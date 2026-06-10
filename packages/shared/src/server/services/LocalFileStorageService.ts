import { Readable } from "stream";
import * as fs from "fs/promises";
import * as path from "path";
import { createReadStream, createWriteStream, existsSync, mkdirSync } from "fs";
import { pipeline } from "stream/promises";
import { logger } from "../logger";
import { StorageService, UploadFile, UploadWithSignedUrl } from "./StorageService";

/**
 * 本地文件存储服务
 * 用于开发环境替代 MinIO/S3，将文件存储在本地文件系统
 */
export class LocalFileStorageService implements StorageService {
  private basePath: string;
  private bucketName: string;
  private baseUrl: string;

  constructor(params: {
    basePath: string;
    bucketName: string;
    baseUrl?: string;
  }) {
    this.basePath = path.resolve(params.basePath);
    this.bucketName = params.bucketName;
    this.baseUrl = params.baseUrl || "http://localhost:3000/api/public/files";

    // 确保基础目录存在
    this.ensureBucketDir();
  }

  /**
   * 确保存储桶目录存在
   */
  private ensureBucketDir(): void {
    const bucketPath = path.join(this.basePath, this.bucketName);
    if (!existsSync(bucketPath)) {
      mkdirSync(bucketPath, { recursive: true });
      logger.info(`Created local storage bucket directory: ${bucketPath}`);
    }
  }

  /**
   * 获取文件的完整本地路径
   */
  private getFilePath(fileName: string): string {
    // 安全检查：防止路径遍历攻击
    const normalizedPath = path.normalize(fileName).replace(/^(\.\.(\/|\\|$))+/, "");
    return path.join(this.basePath, this.bucketName, normalizedPath);
  }

  /**
   * 确保文件的父目录存在
   */
  private async ensureParentDir(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  /**
   * 上传文件
   */
  async uploadFile(params: UploadFile): Promise<void> {
    const { fileName, data } = params;
    const filePath = this.getFilePath(fileName);

    try {
      await this.ensureParentDir(filePath);

      if (typeof data === "string") {
        await fs.writeFile(filePath, data, "utf-8");
      } else if (data instanceof Readable) {
        const writeStream = createWriteStream(filePath);
        await pipeline(data, writeStream);
      } else {
        throw new Error("Unsupported data type. Must be Readable or string.");
      }

      logger.debug(`File uploaded to local storage: ${filePath}`);
    } catch (err) {
      logger.error(`Failed to upload file to local storage: ${fileName}`, err);
      throw new Error(`Failed to upload file to local storage: ${fileName}`);
    }
  }

  /**
   * 上传文件并返回访问 URL
   */
  async uploadWithSignedUrl(
    params: UploadWithSignedUrl,
  ): Promise<{ signedUrl: string }> {
    await this.uploadFile(params);
    const url = await this.getSignedUrl(
      params.fileName,
      params.expiresInSeconds,
    );
    return { signedUrl: url };
  }

  /**
   * 上传 JSON 数据
   */
  async uploadJson(
    filePath: string,
    body: Record<string, unknown>[],
  ): Promise<void> {
    const content = JSON.stringify(body, null, 2);
    await this.uploadFile({
      fileName: filePath,
      fileType: "application/json",
      data: content,
    });
  }

  /**
   * 下载文件内容
   */
  async download(filePath: string): Promise<string> {
    const fullPath = this.getFilePath(filePath);

    try {
      const content = await fs.readFile(fullPath, "utf-8");
      return content;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        logger.error(`File not found in local storage: ${filePath}`);
        throw new Error(`File not found: ${filePath}`);
      }
      logger.error(
        `Failed to download file from local storage: ${filePath}`,
        err,
      );
      throw new Error(
        `Failed to download file from local storage: ${filePath}`,
      );
    }
  }

  /**
   * 列出指定前缀下的所有文件
   */
  async listFiles(
    prefix: string,
  ): Promise<{ file: string; createdAt: Date }[]> {
    const dirPath = this.getFilePath(prefix);

    try {
      const results: { file: string; createdAt: Date }[] = [];

      // 检查目录是否存在
      try {
        await fs.access(dirPath);
      } catch {
        return results; // 目录不存在，返回空数组
      }

      // 递归遍历目录
      const walkDir = async (dir: string, relativePath: string) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = relativePath
            ? `${relativePath}/${entry.name}`
            : entry.name;

          if (entry.isDirectory()) {
            await walkDir(fullPath, relPath);
          } else if (entry.isFile()) {
            const stats = await fs.stat(fullPath);
            // 使用 Unix 风格的路径分隔符
            const normalizedPrefix = prefix.endsWith("/")
              ? prefix
              : `${prefix}/`;
            results.push({
              file: `${normalizedPrefix}${relPath}`,
              createdAt: stats.mtime,
            });
          }
        }
      };

      await walkDir(dirPath, "");
      return results;
    } catch (err) {
      logger.error(
        `Failed to list files from local storage: ${prefix}`,
        err,
      );
      throw new Error(
        `Failed to list files from local storage: ${prefix}`,
      );
    }
  }

  /**
   * 获取文件的访问 URL
   * 注意：本地存储通过 API 端点提供文件访问
   */
  async getSignedUrl(
    fileName: string,
    ttlSeconds: number,
    asAttachment?: boolean,
  ): Promise<string> {
    const expires = Date.now() + ttlSeconds * 1000;
    const encodedBucket = encodeURIComponent(this.bucketName);
    const encodedPath = encodeURIComponent(fileName);
    const downloadParam = asAttachment ? "&download=true" : "";

    return `${this.baseUrl}/${encodedBucket}/${encodedPath}?expires=${expires}${downloadParam}`;
  }

  /**
   * 获取上传 URL
   */
  async getSignedUploadUrl(params: {
    path: string;
    ttlSeconds: number;
    sha256Hash: string;
    contentType: string;
    contentLength: number;
  }): Promise<string> {
    const expires = Date.now() + params.ttlSeconds * 1000;
    const encodedBucket = encodeURIComponent(this.bucketName);
    const encodedPath = encodeURIComponent(params.path);

    return `${this.baseUrl}/upload/${encodedBucket}/${encodedPath}?expires=${expires}`;
  }

  /**
   * 删除文件
   */
  async deleteFiles(paths: string[]): Promise<void> {
    const deletePromises = paths.map(async (filePath) => {
      const fullPath = this.getFilePath(filePath);

      try {
        await fs.unlink(fullPath);
        logger.debug(`Deleted file from local storage: ${filePath}`);
      } catch (err: any) {
        if (err.code === "ENOENT") {
          // 文件不存在，忽略错误
          logger.debug(
            `File not found during deletion (ignored): ${filePath}`,
          );
        } else {
          logger.error(
            `Failed to delete file from local storage: ${filePath}`,
            err,
          );
          throw new Error(
            `Failed to delete file from local storage: ${filePath}`,
          );
        }
      }
    });

    await Promise.all(deletePromises);
  }
}
