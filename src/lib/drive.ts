import "server-only";
import { JWT, OAuth2Client } from "google-auth-library";
import { env } from "@/lib/env";
import { SCHOOL_DOMAIN } from "@/lib/constants";

const SCOPES = ["https://www.googleapis.com/auth/drive"];
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

let authClient: JWT | OAuth2Client | undefined;

function getAuthClient() {
  if (authClient) return authClient;
  const e = env();
  if (e.GOOGLE_SERVICE_ACCOUNT_EMAIL && e.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    authClient = new JWT({
      email: e.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // Env vars usually store the PEM with escaped newlines
      key: e.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: SCOPES,
    });
  } else if (e.GOOGLE_DRIVE_REFRESH_TOKEN) {
    const c = new OAuth2Client({ clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET });
    c.setCredentials({ refresh_token: e.GOOGLE_DRIVE_REFRESH_TOKEN });
    authClient = c;
  } else {
    throw new Error("Google Drive is not configured (service account or refresh token required)");
  }
  return authClient;
}

async function token() {
  const { token } = await getAuthClient().getAccessToken();
  if (!token) throw new Error("Could not obtain a Google access token");
  return token;
}

async function driveFetch(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${await token()}`, ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Drive ${init.method ?? "GET"} ${new URL(url).pathname} failed: ${res.status} ${body.slice(0, 300)}`);
  }
  return res;
}

/** Upload a PDF (resumable upload, works for large files). Returns the Drive file id. */
export async function uploadPdfToDrive(name: string, bytes: Uint8Array, description?: string) {
  const init = await driveFetch(`${UPLOAD_API}/files?uploadType=resumable&supportsAllDrives=true&fields=id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "application/pdf",
      "X-Upload-Content-Length": String(bytes.byteLength),
    },
    body: JSON.stringify({
      name,
      mimeType: "application/pdf",
      parents: [env().GOOGLE_DRIVE_FOLDER_ID],
      description: description?.slice(0, 1000),
    }),
  });
  const location = init.headers.get("location");
  if (!location) throw new Error("Google Drive did not return an upload URL");

  const res = await fetch(location, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf", "Content-Length": String(bytes.byteLength) },
    body: Buffer.from(bytes),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google Drive upload failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const { id } = (await res.json()) as { id: string };
  return id;
}

/** Make the file readable by link (whole internet, or only the school domain). */
export async function publishDriveFile(fileId: string) {
  const mode = env().GOOGLE_DRIVE_SHARE_MODE;
  const permission =
    mode === "domain"
      ? { role: "reader", type: "domain", domain: SCHOOL_DOMAIN, allowFileDiscovery: false }
      : { role: "reader", type: "anyone", allowFileDiscovery: false };
  await driveFetch(`${API}/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true&sendNotificationEmail=false`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(permission),
  });
  return driveViewUrl(fileId);
}

export async function deleteDriveFile(fileId: string) {
  try {
    await driveFetch(`${API}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`, { method: "DELETE" });
  } catch (err) {
    // Already gone is fine
    if (!(err instanceof Error && err.message.includes(" 404 "))) throw err;
  }
}

export function driveViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

export function drivePreviewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}
