"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ className, icon }: { className?: string; icon?: React.ReactNode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
      className={className}
    >
      {icon}
      {pending ? "กำลังออก…" : "ออกจากระบบ"}
    </button>
  );
}
