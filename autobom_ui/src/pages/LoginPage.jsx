import React from "react"
import {
  Anchor,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title
} from "@mantine/core"
import { signInWithEmail, signUpWithEmail } from "../lib/auth.js"
import { useLoader } from "../lib/loaders.js"


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
    <Center h="100vh" bg="gray.1" px="md">
      <Paper
        w="100%"
        maw={24 * 16}
        p={0}
        bg="transparent"
        shadow="none"
      >
        <Title order={1} size="h3">
          Autobom
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          {isSignIn ? "Sign in to your catalogue" : "Create an account"}
        </Text>
        <form className="mt-4" onSubmit={onSubmit}>
          <Stack gap="sm">
            <TextInput
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
              disabled={busy}
            />
            <PasswordInput
              label="Password"
              autoComplete={isSignIn ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
              minLength={6}
              disabled={busy}
            />
            <Button
              type="submit"
              color="brand"
              loading={busy}
              mt={4}
            >
              {(busy && "Please wait…") || (isSignIn && "Sign in") || "Create account"}
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
          {isSignIn ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </Anchor>
      </Paper>
    </Center>
  )
}
