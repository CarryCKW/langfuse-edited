import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import { Readable } from "stream";
import { LocalFileStorageService } from "@langfuse/shared/src/server";

describe("LocalFileStorageService", () => {
  const testBasePath = path.join(__dirname, "..", "..", "test-storage");
  const testBucket = "test-bucket";
  let service: LocalFileStorageService;

  beforeAll(async () => {
    // 创建测试服务实例
    service = new LocalFileStorageService({
      basePath: testBasePath,
      bucketName: testBucket,
      baseUrl: "http://localhost:3000/api/public/files",
    });
  });

  afterAll(async () => {
    // 清理测试目录
    try {
      await fs.rm(testBasePath, { recursive: true, force: true });
    } catch {
      // 忽略错误
    }
  });

  beforeEach(async () => {
    // 清理测试桶中的文件
    const bucketPath = path.join(testBasePath, testBucket);
    try {
      await fs.rm(bucketPath, { recursive: true, force: true });
    } catch {
      // 忽略错误
    }
  });

  describe("uploadFile", () => {
    it("should upload a string file", async () => {
      const fileName = "test-file.txt";
      const content = "Hello, World!";

      await service.uploadFile({
        fileName,
        fileType: "text/plain",
        data: content,
      });

      // 验证文件已创建
      const filePath = path.join(testBasePath, testBucket, fileName);
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      // 验证文件内容
      const savedContent = await fs.readFile(filePath, "utf-8");
      expect(savedContent).toBe(content);
    });

    it("should upload a stream file", async () => {
      const fileName = "test-stream.txt";
      const content = "Stream content";

      const readable = Readable.from([Buffer.from(content)]);

      await service.uploadFile({
        fileName,
        fileType: "text/plain",
        data: readable,
      });

      // 验证文件内容
      const filePath = path.join(testBasePath, testBucket, fileName);
      const savedContent = await fs.readFile(filePath, "utf-8");
      expect(savedContent).toBe(content);
    });

    it("should create nested directories", async () => {
      const fileName = "nested/dir/file.txt";
      const content = "Nested file";

      await service.uploadFile({
        fileName,
        fileType: "text/plain",
        data: content,
      });

      // 验证文件已创建
      const filePath = path.join(testBasePath, testBucket, fileName);
      const savedContent = await fs.readFile(filePath, "utf-8");
      expect(savedContent).toBe(content);
    });
  });

  describe("download", () => {
    it("should download a file", async () => {
      const fileName = "download-test.txt";
      const content = "Download content";

      // 先上传文件
      await service.uploadFile({
        fileName,
        fileType: "text/plain",
        data: content,
      });

      // 下载文件
      const downloaded = await service.download(fileName);
      expect(downloaded).toBe(content);
    });

    it("should throw error for non-existent file", async () => {
      await expect(service.download("non-existent.txt")).rejects.toThrow(
        "File not found",
      );
    });
  });

  describe("listFiles", () => {
    it("should list files with prefix", async () => {
      // 上传多个文件
      await service.uploadFile({
        fileName: "prefix/file1.txt",
        fileType: "text/plain",
        data: "content1",
      });
      await service.uploadFile({
        fileName: "prefix/file2.txt",
        fileType: "text/plain",
        data: "content2",
      });
      await service.uploadFile({
        fileName: "other/file3.txt",
        fileType: "text/plain",
        data: "content3",
      });

      // 列出 prefix/ 下的文件
      const files = await service.listFiles("prefix/");

      expect(files).toHaveLength(2);
      expect(files.map((f) => f.file).sort()).toEqual([
        "prefix/file1.txt",
        "prefix/file2.txt",
      ]);
    });

    it("should return empty array for non-existent prefix", async () => {
      const files = await service.listFiles("non-existent/");
      expect(files).toHaveLength(0);
    });
  });

  describe("deleteFiles", () => {
    it("should delete files", async () => {
      const fileName = "delete-test.txt";

      // 上传文件
      await service.uploadFile({
        fileName,
        fileType: "text/plain",
        data: "to be deleted",
      });

      // 验证文件存在
      const filePath = path.join(testBasePath, testBucket, fileName);
      const existsBefore = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(existsBefore).toBe(true);

      // 删除文件
      await service.deleteFiles([fileName]);

      // 验证文件已删除
      const existsAfter = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(existsAfter).toBe(false);
    });

    it("should not throw error for non-existent files", async () => {
      await expect(
        service.deleteFiles(["non-existent.txt"]),
      ).resolves.not.toThrow();
    });
  });

  describe("uploadJson", () => {
    it("should upload JSON data", async () => {
      const filePath = "data/test.json";
      const data = [
        { id: 1, name: "test1" },
        { id: 2, name: "test2" },
      ];

      await service.uploadJson(filePath, data);

      // 验证文件内容
      const content = await service.download(filePath);
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(data);
    });
  });

  describe("getSignedUrl", () => {
    it("should generate a valid URL", async () => {
      const fileName = "test-file.txt";
      const ttlSeconds = 3600;

      const url = await service.getSignedUrl(fileName, ttlSeconds);

      expect(url).toContain("http://localhost:3000/api/public/files");
      expect(url).toContain(testBucket);
      expect(url).toContain("expires=");
    });

    it("should include download parameter when asAttachment is true", async () => {
      const fileName = "test-file.txt";
      const ttlSeconds = 3600;

      const url = await service.getSignedUrl(fileName, ttlSeconds, true);

      expect(url).toContain("download=true");
    });
  });

  describe("uploadWithSignedUrl", () => {
    it("should upload and return signed URL", async () => {
      const fileName = "signed-url-test.txt";
      const content = "Signed URL content";

      const { signedUrl } = await service.uploadWithSignedUrl({
        fileName,
        fileType: "text/plain",
        data: content,
        expiresInSeconds: 3600,
      });

      // 验证返回了 URL
      expect(signedUrl).toContain("http://localhost:3000/api/public/files");

      // 验证文件已上传
      const downloaded = await service.download(fileName);
      expect(downloaded).toBe(content);
    });
  });

  describe("getSignedUploadUrl", () => {
    it("should generate upload URL", async () => {
      const url = await service.getSignedUploadUrl({
        path: "test-upload.txt",
        ttlSeconds: 3600,
        sha256Hash: "abc123",
        contentType: "text/plain",
        contentLength: 100,
      });

      expect(url).toContain("http://localhost:3000/api/public/files");
      expect(url).toContain("upload/");
      expect(url).toContain("expires=");
    });
  });

  describe("security", () => {
    it("should prevent path traversal attacks", async () => {
      const maliciousPath = "../../../etc/passwd";

      // 尝试上传到恶意路径
      await service.uploadFile({
        fileName: maliciousPath,
        fileType: "text/plain",
        data: "malicious content",
      });

      // 验证文件没有被写入到基础路径之外
      const dangerousPath = path.resolve(testBasePath, "..", "etc", "passwd");
      const exists = await fs
        .access(dangerousPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });
  });
});
