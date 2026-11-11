"use client";

import { useActionState, useState } from "react";
import { signIn } from "@/app/admin/actions";
import { Icon } from "@/components/site/Icon";
import { inputClass, labelClass, primaryButton } from "./ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.error && (
        <p role="alert" className="flex items-start gap-2 border border-destructive/40 bg-red-50 px-3 py-2 text-sm text-red-900">
          <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={`${inputClass} mt-1`}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <div className="relative mt-1">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-0 top-0 grid size-11 place-items-center text-secondary"
          >
            <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
          </button>
        </div>
      </div>
      <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
