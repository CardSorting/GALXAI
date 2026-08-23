import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-this-alias": "off",
      "prefer-const": "off",
      "import/no-anonymous-default-export": "off",
      "react/no-unescaped-entities": "off",
      "react/jsx-no-comment-textnodes": "off"
    },
    ignores: [
      ".next/*",
      "node_modules/*",
      ".wrangler/*",
      "worker-configuration.d.ts",
      "docs/*",
      "scripts/*",
      "supabase/*"
    ]
  }
];

export default eslintConfig;

