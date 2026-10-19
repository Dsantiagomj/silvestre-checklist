import { execSync } from "node:child_process";

// El mismo build del embebido que se publica, en una carpeta aparte (EMBED_OUT) para no
// pisar dist/ si a la vez corre la suite principal
export default function build() {
  execSync("npm run build:embed", {
    stdio: "inherit",
    env: { ...process.env, EMBED_OUT: process.env.EMBED_OUT || ".embed-test" },
  });
}
