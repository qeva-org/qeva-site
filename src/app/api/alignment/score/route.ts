import { NextRequest, NextResponse } from 'next/server';
    // Local minimal score (mirrors @qeva/runtime/src/core/tgir-score.ts)
    type NodeType = "Goal"|"Task"|"Data"|"Transform"|"Metric"|"Deliverable"|"Constraint"|"Test";
    type EdgeType = "refines"|"requires"|"produces"|"evaluates"|"contradicts"|"cites"|"owned_by"|"typed_as";
    interface Node { id: string; type: NodeType; label: string; properties?: Record<string,unknown> }
    interface Edge { from: string; to: string; type: EdgeType }
    interface TGIR { nodes: Node[]; edges: Edge[] }

    function computeScore(tgir: TGIR){
      const ids = new Set(tgir.nodes.map(n=>n.id));
      const dangling = tgir.edges.filter(e=>!ids.has(e.from) || !ids.has(e.to)).length;
      const hasDeliv = tgir.nodes.some(n=>n.type==="Deliverable");
      const cites = tgir.edges.filter(e=>e.type==="cites").length;
      const evidence = hasDeliv ? (cites>0 ? 1 : 0) : 1;
      const constraints = tgir.nodes.filter(n=>n.type==="Constraint");
      const tests = tgir.nodes.filter(n=>n.type==="Test");
      const constraintPass = constraints.length===0 ? 1 :
        constraints.filter(c=>c.properties && c.properties['required']===false).length / constraints.length;
      const testPass = tests.length===0 ? 1 :
        tests.filter(t=>t.properties && t.properties['pass']===true).length / tests.length;
      const structureCompleteness = tgir.edges.length === 0 ? 1 : 1 - dangling / tgir.edges.length;
      const goalMatch = 0.7; // TODO: wire real lexical+host prior
      const humanity = 0.8; // TODO: MI proxy

      const w = {wG:1,wC:1,wT:1,wS:1,wE:1,wH:1};
      const score01 = (
        w.wG*goalMatch + w.wC*constraintPass + w.wT*testPass +
        w.wS*structureCompleteness + w.wE*evidence + w.wH*humanity
      ) / Object.values(w).reduce((a,b)=>a+b,0);

      const diffs: string[] = [];
      if (structureCompleteness<1) diffs.push("Fix dangling edges or missing nodes.");
      if (hasDeliv && cites===0) diffs.push("Add at least one citation (cites edge) for deliverables.");
      if (constraints.length>0 && constraintPass<1) diffs.push("Some constraints marked required are unmet.");
      if (tests.length>0 && testPass<1) diffs.push("Some tests are failing or unspecified.");
      return {
        score: Math.round(score01*100),
        components: {goalMatch, constraintPass, testPass, structureCompleteness, evidence, humanity},
        diffs
      };
    }

    export async function POST(req: NextRequest){
      try{
        const { tgir } = await req.json();
        if (!tgir || !Array.isArray(tgir.nodes) || !Array.isArray(tgir.edges)){
        }
        const res = computeScore(tgir);
        return NextResponse.json({ ok: true, ...res });
      } catch (err:any){
        return NextResponse.json({ ok: false, error: err.message }, {status: 400});
      }
    }
