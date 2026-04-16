import { getAvatarFromS3 } from "#server/utils/s3";

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, "path");

  if (!path) {
    throw createError({ statusCode: 400, message: "Missing avatar path" });
  }

  try {
    const { body, contentType } = await getAvatarFromS3(path);

    if (!body) {
      throw createError({ statusCode: 404, message: "Avatar not found" });
    }

    setResponseHeaders(event, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    });

    return body;
  } catch (error: any) {
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) {
      throw createError({ statusCode: 404, message: "Avatar not found" });
    }
    throw error;
  }
});
