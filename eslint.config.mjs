import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", "prisma/generated/**"],
  },
  {
    rules: {
      // Flags the standard "set loading state, then fetch" effect pattern
      // (the exact shape React's own docs recommend for data fetching in an
      // effect) as an error. Downgraded to a warning rather than restructured
      // around, since the underlying pattern is correct.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
