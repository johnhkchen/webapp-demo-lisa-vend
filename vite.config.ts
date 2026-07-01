import { defineConfig } from "vite";
import vinext from "vinext";

// vinext() auto-registers @vitejs/plugin-rsc (the App Router RSC boundary) and
// @vitejs/plugin-react (Fast Refresh + JSX), and resolves the tsconfig `paths`
// alias (@/* → ./*) internally — so no separate plugin wiring is needed here.
// This is the canonical config `vinext init` generates; see
// docs/active/work/T-006-01-02/design.md Decision 1 for why plugin-rsc is not
// imported explicitly.
export default defineConfig({
  plugins: [vinext()],
});
