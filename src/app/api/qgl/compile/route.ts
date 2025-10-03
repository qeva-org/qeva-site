import { NextRequest, NextResponse } from 'next/server';

    // Minimal ASCII QGL compiler (inline) to avoid external deps for the demo.
    type TGIRNodeType = "Goal"|"Task"|"Data"|"Transform"|"Metric"|"Deliverable"|"Constraint"|"Test";
    type TGIREDgeType = "refines"|"requires"|"produces"|"evaluates"|"contradicts"|"cites"|"owned_by"|"typed_as";
    interface Node { id: string; type: TGIRNodeType; label: string; properties?: Record<string,unknown> }
    interface Edge { from: string; to: string; type: TGIREDgeType }
    interface TGIR { nodes: Node[]; edges: Edge[]; $schema?: string }

    function compileQGL(source: string): TGIR {
      const nodes: Node[] = [];
      const edges: Edge[] = [];
      const lines = source.split(/\r?\n/).map(l=>l.trim()).filter(l=>l && !l.startsWith('//'));
      for (const line of lines) {
        if (line.startsWith('edge ')) {
          const m = /^edge\s+(\w[\w\-]*)\s*->\s*(\w[\w\-]*)\s*:\s*(\w+)\s*$/.exec(line);
          if (!m) throw new Error(`Invalid edge syntax: ${line}`);
          edges.push({from:m[1], to:m[2], type: m[3] as any});
          continue;
        }
        const head = /^(goal|task|data|transform|metric|deliverable|constraint|test)\s+(\w[\w\-]*)\s+/.exec(line);
        if (!head) throw new Error(`Invalid statement: ${line}`);
        const kind = head[1]; const id = head[2];
        const rest = line.slice(head[0].length).trim();

        let label = '';
        let props: Record<string, unknown> | undefined;
        let expr: string | undefined;

        if (rest.startsWith('"')) {
          const m2 = /^"([^"]+)"\s*(.*)$/.exec(rest);
          if (!m2) throw new Error(`Unclosed label in: ${line}`);
          label = m2[1];
          const tail = m2[2].trim();
          if (tail.startsWith('{')) props = parseProps(tail);
          else if (tail.startsWith(':=')) expr = tail.slice(2).trim();
          else if (tail.length>0) throw new Error(`Unexpected trailing tokens: ${tail}`);
        } else {
          const m2 = /^(\w[\w\-]*)\s*(.*)$/.exec(rest);
          if (!m2) throw new Error(`Missing label in: ${line}`);
          label = m2[1];
          const tail = m2[2].trim();
          if (tail.startsWith('{')) props = parseProps(tail);
          else if (tail.startsWith(':=')) expr = tail.slice(2).trim();
          else if (tail.length>0) throw new Error(`Unexpected trailing tokens: ${tail}`);
        }

        const node: Node = { id, type: (kind[0].toUpperCase()+kind.slice(1)) as any, label, properties: props };
        if (expr) node.properties = {...(node.properties||{}), expr};
        nodes.push(node);
      }
      return { nodes, edges, $schema: "https://qeva.org/tgir/v0/schema.json" };
    }

    function parseProps(src: string){
      const m = /^\{([\s\S]*)\}\s*$/.exec(src);
      if (!m) throw new Error(`Invalid properties object: ${src}`);
      const body = m[1].trim();
      if (!body) return {};
      const out: Record<string, unknown> = {};
      const parts = body.split(/,(?![^\[\{\(]*[\]\}\)])/).map(s=>s.trim());
      for (const p of parts) {
        const [k, v] = p.split(':').map(x=>x.trim());
        out[k] = parseValue(v);
      }
      return out;
    }
    function parseValue(raw: string): unknown {
      if (/^".*"$/.test(raw)) return raw.slice(1,-1);
      if (/^(true|false)$/.test(raw)) return raw === 'true';
      if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
      if (/^\[.*\]$/.test(raw)) {
        const inner = raw.slice(1,-1).trim();
        if (!inner) return [];
        return inner.split(/,(?![^\[\{\(]*[\]\}\)])/).map(s=>parseValue(s.trim()));
      }
      return raw;
    }

    export async function POST(req: NextRequest){
      try{
        const { source } = await req.json();
        if (typeof source !== 'string' or source.trim()==='') {
          return NextResponse.json({error: 'Body must include non-empty "source" string'}, {status: 400});
        }
        const tgir = compileQGL(source);
        return NextResponse.json({ ok: true, tgir });
      } catch (err:any){
        return NextResponse.json({ ok: false, error: err.message }, {status: 400});
      }
    }
