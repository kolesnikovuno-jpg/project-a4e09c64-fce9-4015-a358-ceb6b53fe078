import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it} from "vitest";

const css=readFileSync(resolve(process.cwd(),"src/index.css"),"utf8");
const radial=readFileSync(resolve(process.cwd(),"src/components/egg/EggRadialMenu.tsx"),"utf8");

describe("EGG continuous transparent full-screen canvas",()=>{
 it("opens each workspace over the full viewport while retaining the right text zone",()=>{
  expect(css).toContain("inset: 0 !important;\n    width: 100% !important;");
  expect(css).toContain("padding-left: var(--egg-stage-width) !important;");
  expect(css).toContain("padding-top: var(--egg-stage-height) !important;");
  expect(css).toContain("height: 100dvh !important;");
 });
 it("does not reintroduce the opaque editor surface removed for this design",()=>{
  expect(css).not.toContain("/* EGG / exclusive workspace switch.");
  expect(css).toContain("/* EGG / continuous full-screen canvas");
  const layer=css.slice(css.indexOf("/* EGG / continuous full-screen canvas"));
  expect(layer).toContain("background: transparent !important;");
  expect(layer).toContain("background-color: transparent !important;");
  expect(layer).toContain("background-image: none !important;");
  // A full-viewport transparent layer must not block the Egg's pointer input.
  expect(layer).toContain("pointer-events: none;");
  expect(layer).toContain("pointer-events: auto;");
 });
 it("keeps the Egg, radial navigation and EGG brand above the active editor",()=>{
  const layer=css.slice(css.indexOf("/* EGG / continuous full-screen canvas"));
  expect(layer).toMatch(/\[data-testid="egg-left-stage"\]\s*\{\s*z-index:\s*130 !important/);
  expect(layer).toMatch(/\[data-testid="egg-menu-overlay"\]\s*\{\s*z-index:\s*145 !important/);
  expect(layer).toMatch(/main > header\s*\{\s*z-index:\s*150 !important/);
  expect(radial).toContain('data-testid="egg-menu-overlay"');
 });
});
