import {describe,expect,it} from "vitest";
import {eggIdeaLinks,eggSupportLinks} from "../../lib/unocalcEgg3d";

describe("Fixed two-stream EGG 3D connections",()=>{
  it("starts both streams at Idea and does not cross between Commerce and Retail",()=>{
    const idea=eggIdeaLinks({yaw:.32,tilt:.15});
    const support=eggSupportLinks({yaw:.32,tilt:.15});
    expect(idea.map(link=>link.id)).toEqual(["marketing","legal"]);
    expect(support.map(link=>link.id)).toEqual([
      "marketing-design","legal-production","design-test-drive",
      "production-procurement","test-drive-commerce","procurement-retail",
      "commerce-yolk","retail-yolk",
    ]);
    expect(support.map(link=>link.id)).not.toContain("commerce-retail");
    expect(support.every(link=>[link.x1,link.x2,link.y1,link.y2,link.depth].every(Number.isFinite))).toBe(true);
  });
});