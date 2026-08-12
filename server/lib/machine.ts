import os from "os"
import { MACHINE_ID as ENV_MACHINE_ID } from "./index"

export const MACHINE_ID = (ENV_MACHINE_ID || "").trim() || os.hostname()
