import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: { input: { laboratory: "index.html", quiz: "quiz.html" } },
  },
});
