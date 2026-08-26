import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["src/test/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  { ignores: [".next/**", "node_modules/**", "playwright-report/**", "supabase/.temp/**"] },
];

export default eslintConfig;
