import {describe,it,expect} from "vitest";
import {eggCanonicalRedirect} from "../../components/egg/EggStablePreview";

const legacy="project-a4e09c64-fce9-40-git-e8febd-kolesnikovuno-jpgs-projects.vercel.app";
const deployed="project-a4e09c64-fce9-4015-a358-ceb6b53fe078-8gg3esf0j.vercel.app";
const loc=(hostname:string,pathname="/ru/egg",search="?project=01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9&start=author",hash="")=>({
  hostname,pathname,search,hash,protocol:"https:",
});
describe("EGG canonical browser session",()=>{
  it("routes old branch project links to stable EGG without losing project, locale or author route",()=>{
    expect(eggCanonicalRedirect(loc(legacy))).toBe(
      "https://egg.kolesnikov.studio/ru/egg?project=01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9&start=author"
    );
    expect(eggCanonicalRedirect(loc(deployed))).toBe(
      "https://egg.kolesnikov.studio/ru/egg?project=01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9&start=author"
    );
  });
  it("moves Supabase magic-link fragment to canonical origin before a client consumes it",()=>{
    const fragment="#access_token=a_test_token&refresh_token=a_test_refresh&token_type=bearer";
    expect(eggCanonicalRedirect(loc(legacy,"/egg/connect","",fragment)))
      .toBe("https://egg.kolesnikov.studio/egg/connect"+fragment);
    expect(eggCanonicalRedirect(loc(legacy,"/egg/connect","?code=a_test_pkce","")))
      .toBe("https://egg.kolesnikov.studio/egg/connect?code=a_test_pkce");
  });
  it("leaves unrelated sites, non-EGG paths, and canonical URLs untouched",()=>{
    expect(eggCanonicalRedirect(loc("egg.kolesnikov.studio"))).toBeNull();
    expect(eggCanonicalRedirect(loc("unrelated.vercel.app"))).toBeNull();
    expect(eggCanonicalRedirect(loc("project-a4e09c64-fce9-4015-a358-ceb6b53fe078-evil.vercel.app.evil.com"))).toBeNull();
    expect(eggCanonicalRedirect(loc(legacy,"/unocalc"))).toBeNull();
    expect(eggCanonicalRedirect({...loc(legacy),protocol:"http:"})).toBeNull();
  });
});