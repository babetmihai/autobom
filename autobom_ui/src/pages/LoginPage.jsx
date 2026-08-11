import React from "react"
import { signInWithEmail, signUpWithEmail } from "../lib/auth.js"
import { useLoader } from "../lib/loaders.js"
import BannerDispatcher from "../lib/banner/BannerDispatcher.jsx"


export default function LoginPage() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [mode, setMode] = React.useState("signIn")

  const signingIn = useLoader("auth.signIn")
  const signingUp = useLoader("auth.signUp")
  const busy = signingIn || signingUp
  const isSignIn = mode === "signIn"

  const onSubmit = (event) => {
    event.preventDefault()
    if (isSignIn) {
      void signInWithEmail(email, password)
      return
    }
    void signUpWithEmail(email, password)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-100 font-sans text-base leading-snug text-neutral-800">
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-4 sm:px-6 sm:py-6">
        <div className="w-full max-w-sm">
          <h1 className="m-0 text-lg font-semibold text-neutral-800">Autobom</h1>
          <p className="m-0 mt-1 text-sm text-neutral-600">
            {isSignIn ? "Sign in to your catalogue" : "Create an account"}
          </p>
          <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
            <label className="flex flex-col gap-1 text-sm text-neutral-700">
              Email
              <input
                className="rounded-md border border-neutral-200 bg-white px-3 py-2 font-[inherit] text-sm"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={busy}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-neutral-700">
              Password
              <input
                className="rounded-md border border-neutral-200 bg-white px-3 py-2 font-[inherit] text-sm"
                type="password"
                autoComplete={isSignIn ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                disabled={busy}
              />
            </label>
            <button className="ab-btn-brand mt-1" type="submit" disabled={busy}>
              {(busy && "Please wait…") || (isSignIn && "Sign in") || "Create account"}
            </button>
          </form>
          <button
            type="button"
            className="mt-3 border-0 bg-transparent p-0 font-[inherit] text-sm text-brand hover:text-brand-dark"
            disabled={busy}
            onClick={() => setMode(isSignIn ? "signUp" : "signIn")}
          >
            {isSignIn ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </main>
      <BannerDispatcher />
    </div>
  )
}
