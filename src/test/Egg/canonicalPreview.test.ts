import {describe,it,expect} from "vitest";
import {eggCanonicalRedirect} from "../../components/egg/EggStablePreview";

const legacy="project-a4e09c64-fce9-40-git-e8febd-kolesnikovuno-jpgs-projects.vercel.app";
const deployed="project-a4e09c64-fce9-4015-a358-ceb6b53fe078-8gg3esf0j.vercel.app";
const loc=(hostname:string,pathname="/egg/yolk",search="?project=01b3d29f-bfc4-41ed-b31a-2e0db7fa2fe9",hash="")=>({
  hostname,pathname,search,hash,protocol:"https:",
});
describe("EGG preview browser session",()=>{
  it("does not redirect preview project routes to the production site",()=>{
    expect(eggCanonicalRedirect(loc(legacy))).toBeNull();
    expect(eggCanonicalRedirect(loc(deployed))).toBeNull();
  });
  it("does not redirect preview login callbacks with tokens or PKCE codes",()=>{
    const fragment="#access_token=a_test_token&refresh_token=a_test_refresh&token_type=bearer";
    expect(eggCanonicalRedirect(loc(legacy,"/egg/connect","",fragment))).toBeNull();
    expect(eggCanonicalRedirect(loc(deployed,"/egg/connect","?code=a_test_pkce",""))).toBeNull();
  });
  it("leaves unrelated and canonical hosts untouched",()=>{
    expect(eggCanonicalRedirect(loc("egg.kolesnikov.studio"))).toBeNull();
    expect(eggCanonicalRedirect(loc("unrelated.vercel.app"))).toBeNull();
  });
});
