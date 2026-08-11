import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import fs from "fs"
import path from "path"


export default defineConfig(({ mode }) => {
  const repoRoot = path.resolve(__dirname, "..")
  const { FIREBASE_CONFIG } = loadEnv(mode, repoRoot, "")
  if (!FIREBASE_CONFIG) {
    throw new Error("FIREBASE_CONFIG is required in .env")
  }
  const firebaseConfig = JSON.parse(fs.readFileSync(path.resolve(repoRoot, FIREBASE_CONFIG), "utf8"))

  return {
    plugins: [
      react()
    ],
    // "./" for SketchUp HtmlDialog (file://); "/" for Firebase Hosting and other HTTPS SPAs.
    base: mode === "hosting" ? "/" : "./",
    envDir: repoRoot,
    define: {
      __FIREBASE_CONFIG__: JSON.stringify(firebaseConfig)
    },
    optimizeDeps: {
      esbuildOptions: {
        target: ["es2015", "safari11", "chrome61"]
      }
    },
    build: {
      /**
       * SketchUp HtmlDialog uses an old Chromium. Use the oldest esbuild target set that still
       * builds (full ES5 output would need @vitejs/plugin-legacy + Babel; esbuild cannot lower
       * const/let to var for target "es5" here).
       */
      target: ["es2015", "safari11", "chrome61"],
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          format: "iife",
          inlineDynamicImports: true
        }
      }
    }
  }
})
