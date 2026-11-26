import {describe,expect,it} from "vitest";
import {parseEggOperationalAnalysis} from "../../server/eggOperationalAnalysis";

const valid={
  observation:"The source check succeeded.",hypothesis:"A real signal may be present.",
  nextStep:"Compare the next closed day.",confidence:"low",
  limitations:["The denominator is unknown."],evidenceGaps:[],scenarios:[],
};
describe("EGG autonomous research response validation",()=>{
  it("preserves valid plain or fenced provider JSON",()=>{
    for(const raw of [JSON.stringify(valid),"```json\n"+JSON.stringify(valid)+"\n```"])
      expect(parseEggOperationalAnalysis(raw)).toEqual({ok:true,data:valid});
  });
  it("reports malformed JSON without retaining raw data",()=>{
    expect(parseEggOperationalAnalysis("PRIVATE contextual model text"))
      .toEqual({ok:false,issues:[{path:"$",code:"invalid_json"}]});
  });
  it("reports bounded validation diagnostics without storing rejected text",()=>{
    const candidate={...valid, limitations:[],scenarios:[{
      id:"minimum",approach:"PRIVATE details ".repeat(40),prerequisite:"Enough sample data",
      costUah:null,costEvidence:"unknown",sourceRef:null,nextValidation:"Verify upcoming signals",
    }]};
    const result=parseEggOperationalAnalysis(JSON.stringify(candidate));
    expect(result).toEqual({ok:false,issues:[
      {path:"limitations",code:"too_small"},{path:"scenarios.0.approach",code:"too_big"},
    ]});
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
  });
});
