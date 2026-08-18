import { spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import _ from "lodash"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")

const DOCKER_BY_SERVICE = {
  product_scraper: ["text_analyzer"],
  product_analyzer: ["image_analyzer", "text_analyzer", "embedding_analyzer"],
  scene_embeddings: ["embedding_analyzer"],
  scene_crops: ["scene_analyzer"],
  trellis_converter: ["trellis"],
  colada_converter: ["colada"]
}

const COMPOSE_BY_DOCKER = {
  text_analyzer: "services/text_analyzer/docker-compose.yml",
  image_analyzer: "services/image_analyzer/docker-compose.yml",
  embedding_analyzer: "services/embedding_analyzer/docker-compose.yml",
  scene_analyzer: "services/scene_analyzer/docker-compose.yml",
  trellis: "services/trellis/docker-compose.yml",
  colada: "services/colada/docker-compose.yml"
}

const readEnvValue = (key) => {
  const text = fs.readFileSync(path.join(ROOT, ".env"), "utf8")
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq < 0) continue
    const name = trimmed.slice(0, eq).trim()
    if (name !== key) continue
    return trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
  }
}

const serviceNames = _.compact(_.map(_.split(readEnvValue("SERVICES_ENABLED"), ","), _.trim))

for (const name of serviceNames) {
  if (!DOCKER_BY_SERVICE[name]) {
    console.error(`Unknown service in SERVICES_ENABLED: ${name}`)
    process.exit(1)
  }
}

const dockerStacks = _.uniq(_.flatMap(serviceNames, (name) => DOCKER_BY_SERVICE[name]))

if (!serviceNames.length) {
  console.log("SERVICES_ENABLED is empty — starting server with no ticker services")
} else {
  console.log(`Services: ${serviceNames.join(", ")}`)
  console.log(`Docker: ${dockerStacks.join(", ") || "(none)"}`)
}

for (const stack of dockerStacks) {
  const composeFile = COMPOSE_BY_DOCKER[stack]
  console.log(`\n→ docker compose -f ${composeFile} up -d --build`)
  const result = spawnSync(
    "docker",
    ["compose", "-f", composeFile, "up", "-d", "--build"],
    { cwd: ROOT, stdio: "inherit" }
  )
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log("\n→ npm run server")
const child = spawn("npm", ["run", "server"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true
})

child.on("exit", (code) => process.exit(code ?? 0))
