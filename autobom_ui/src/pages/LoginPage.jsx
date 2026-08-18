import React from "react"
import {
  Anchor,
  Button,
  PasswordInput,
  Stack,
  TextInput
} from "@mantine/core"
import { useTranslation } from "react-i18next"
import { signInWithEmail, signUpWithEmail } from "../lib/auth.js"
import { useLoader } from "../lib/loaders.js"
import { cn, materialCardClass } from "../lib/index.js"


export default function LoginPage() {
  const { t } = useTranslation()
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

  let submitLabel = t("create_account")
  if (busy) submitLabel = t("please_wait")
  if (!busy && isSignIn) submitLabel = t("sign_in")

  let switchLabel = t("already_have_an_account_sign_in")
  if (isSignIn) switchLabel = t("need_an_account_sign_up")

  let subtitle = t("create_an_account")
  if (isSignIn) subtitle = t("sign_in_to_your_catalogue")

  let passwordAutoComplete = "new-password"
  if (isSignIn) passwordAutoComplete = "current-password"

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className={cn(materialCardClass({ ready: true }), "w-full max-w-[24rem]")}>
        <h1 className="m-0 text-lg font-medium text-gray-800">Autobom</h1>
        <p className="m-0 mt-1 text-xs leading-4 text-gray-500">{subtitle}</p>
        <form className="mt-4" onSubmit={onSubmit}>
          <Stack gap="sm">
            <TextInput
              label={t("email")}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
              disabled={busy}
            />
            <PasswordInput
              label={t("password")}
              autoComplete={passwordAutoComplete}
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
              minLength={6}
              disabled={busy}
            />
            <Button
              type="submit"
              color="brand"
              radius="xl"
              loading={busy}
              mt={4}
            >
              {submitLabel}
            </Button>
          </Stack>
        </form>
        <Anchor
          component="button"
          type="button"
          size="sm"
          mt="sm"
          disabled={busy}
          onClick={() => setMode(isSignIn ? "signUp" : "signIn")}
        >
          {switchLabel}
        </Anchor>
      </div>
    </div>
  )
}
