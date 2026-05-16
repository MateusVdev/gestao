import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "dist/**", "data/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript").map((c) => ({
    ...c,
    plugins: c.plugins
      ? Object.fromEntries(
          Object.entries(c.plugins).map(([k, p]) => [
            k,
            { ...p, configs: undefined }, // This specifically breaks the circularity in legacy plugins
          ])
        )
      : undefined,
  })),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "warn",
      "no-console": "off",
    },
  },
];

export default eslintConfig;




