import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Relative base so the build works at user.github.io/<repo>/ without hardcoding the repo name.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
