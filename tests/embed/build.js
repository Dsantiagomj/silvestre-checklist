import { execSync } from "node:child_process";

// Los mismos builds de los embebidos que se publican (el Silvestre, el Hielos, el hub de
// los checklists, el inicio y
// «La eterna cosecha»), en una carpeta aparte (EMBED_OUT) para no pisar dist/ si a
// la vez corre la suite principal
export default function build() {
  const env = { ...process.env, EMBED_OUT: process.env.EMBED_OUT || ".embed-test" };
  execSync("npm run build:embed", { stdio: "inherit", env });
  execSync("npm run build:embed:hielos", { stdio: "inherit", env });
  execSync("npm run build:hub", { stdio: "inherit", env });
  execSync("npm run build:inicio", { stdio: "inherit", env });
  execSync("npm run build:cosecha", { stdio: "inherit", env });
}
