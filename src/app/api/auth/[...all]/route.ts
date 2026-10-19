import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { withBase } from "@/lib/urls";

const handler = toNextJsHandler(auth);

// Next strips the basePath from req.url, but Better Auth routes on the full
// path (its basePath is /connextlearning/api/auth), so put it back.
function withBasePath(req: Request) {
  const url = new URL(req.url);
  url.pathname = withBase(url.pathname);
  return new Request(url, req);
}

export const GET = (req: Request) => handler.GET(withBasePath(req));
export const POST = (req: Request) => handler.POST(withBasePath(req));
