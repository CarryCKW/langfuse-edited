import type { NextApiRequest, NextApiResponse } from "next";
import * as fs from "fs/promises";
import * as path from "path";
import { env } from "@/src/env.mjs";
import { logger } from "@langfuse/shared/src/server";

/**
 * 本地文件存储服务 API
 * 用于在开发环境中替代 MinIO/S3 的预签名 URL 功能
 *
 * 仅在 LANGFUSE_USE_LOCAL_FILE_STORAGE=true 时启用
 *
 * 访问格式: /api/public/files/{bucket}/{path}?expires={timestamp}
 * 上传格式: /api/public/files/upload/{bucket}/{path}?expires={timestamp}
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // 仅在本地文件存储模式下可用
  // if (env.LANGFUSE_USE_LOCAL_FILE_STORAGE !== "true") {
  //   return res.status(404).json({
  //     error: "Local file storage not enabled",
  //     message:
  //       "Set LANGFUSE_USE_LOCAL_FILE_STORAGE=true to enable this feature",
  //   });
  // }

  const { path: filePath, expires, download } = req.query;
  const method = req.method;

  if (!filePath || !Array.isArray(filePath)) {
    return res.status(400).json({ error: "Invalid file path" });
  }

  // 检查是否是上传请求
  const isUpload = filePath[0] === "upload";
  const actualPath = isUpload ? filePath.slice(1) : filePath;

  if (actualPath.length < 2) {
    return res
      .status(400)
      .json({ error: "Path must include bucket and file path" });
  }

  // 检查过期时间
  if (expires && Number(expires) < Date.now()) {
    return res.status(410).json({ error: "Link expired" });
  }

  // 构建文件路径
  const basePath = "./langfuse-storage";
  // const basePath = env.LANGFUSE_LOCAL_STORAGE_PATH || "./langfuse-storage";
  const bucket = actualPath[0];
  const fileParts = actualPath.slice(1);
  const fullPath = path.join(basePath, bucket, ...fileParts);

  // 安全检查：防止路径遍历攻击
  const resolvedPath = path.resolve(fullPath);
  const resolvedBase = path.resolve(basePath);
  if (!resolvedPath.startsWith(resolvedBase)) {
    logger.warn(`Path traversal attempt detected: ${filePath.join("/")}`);
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    if (isUpload) {
      // 处理上传请求
      return await handleUpload(req, res, fullPath);
    } else {
      // 处理下载/访问请求
      return await handleDownload(req, res, fullPath, download === "true");
    }
  } catch (err: any) {
    logger.error("Error in files API:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * 处理文件下载
 */
async function handleDownload(
  req: NextApiRequest,
  res: NextApiResponse,
  fullPath: string,
  asAttachment: boolean,
) {
  try {
    // 获取文件信息
    const stats = await fs.stat(fullPath);

    if (!stats.isFile()) {
      return res.status(404).json({ error: "File not found" });
    }

    // 读取文件
    const fileBuffer = await fs.readFile(fullPath);

    // 根据扩展名设置 Content-Type
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = getContentType(ext);

    // 设置响应头
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", stats.size);
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600",
    );

    if (asAttachment) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${path.basename(fullPath)}"`,
      );
    }

    // 返回文件
    return res.status(200).send(fileBuffer);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ error: "File not found" });
    }
    throw err;
  }
}

/**
 * 处理文件上传
 */
async function handleUpload(
  req: NextApiRequest,
  res: NextApiResponse,
  fullPath: string,
) {
  if (req.method !== "PUT" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 确保目录存在
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    // 获取请求体
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);

    // 写入文件
    await fs.writeFile(fullPath, body);

    logger.info(`File uploaded via API: ${fullPath}`);

    return res.status(200).json({
      success: true,
      path: fullPath,
      size: body.length,
    });
  } catch (err) {
    logger.error("Upload failed:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}

/**
 * 根据文件扩展名获取 Content-Type
 */
function getContentType(ext: string): string {
  const contentTypeMap: Record<string, string> = {
    ".json": "application/json",
    ".csv": "text/csv",
    ".jsonl": "application/x-ndjson",
    ".txt": "text/plain",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".ts": "application/typescript",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".gz": "application/gzip",
    ".xml": "application/xml",
    ".yaml": "text/yaml",
    ".yml": "text/yaml",
  };

  return contentTypeMap[ext] || "application/octet-stream";
}
