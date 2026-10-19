import { createAuthClient } from "better-auth/react";

import { withBase } from "@/lib/urls";

export const authClient = createAuthClient({ basePath: withBase("/api/auth") });
