/** Host-LLM Archivist executor. No classifier, network endpoint or credentials. */
export class Archivist {
  constructor({call,checkpoint,session_id,client_id='chatgpt'}) {
    this.call=call;this.checkpoint=checkpoint;this.session=session_id;this.client=client_id;this.seq=0;
  }
  async invoke(name,extra={}) {
    const request={schema_version:'numeric-mcp-v1',memory_contract_version:'numeric-core-user-memory-v1',
      client_id:this.client,session_id:this.session,request_id:`${this.session}-${++this.seq}`,...extra};
    // Persist the exact write before transmission. An uncertain result stops execution;
    // recovery replays this payload, never constructs a new write request.
    if(name==='submit') await this.checkpoint({event:'pending',tool:name,request});
    const raw=await this.call(name,request);
    const result=raw.structuredContent ?? raw;
    if(raw.isError || result.error) throw Error('Core rejected request: '+JSON.stringify(result));
    if(name==='submit') {
      await this.checkpoint({event:'receipt',request_id:request.request_id,result});
      if(result.status!=='COMMITTED') throw Error('Uncommitted operation: '+JSON.stringify(result));
    }
    return result;
  }
  async page(query,extra={}) {
    const rows=[];let cursor;let epoch;
    do {
      const r=await this.invoke('retrieve',{query,...(cursor?{cursor}:extra)});
      if(epoch!==undefined && epoch!==r.graph_epoch) throw Error('Graph changed during pagination');
      epoch=r.graph_epoch;this.epoch=epoch;
      const slots=r.candidate_valid_mask?.flatMap((v,i)=>v?[i]:[]) ?? r.candidates?.map(x=>x.slot);
      if(!slots) throw Error('Missing valid slots');
      if(slots.length) {
        const read=await this.invoke('read',{read_id:r.read_id,selected_slots:slots});
        if(read.status==='REJECTED') throw Error('Stale read');
        rows.push(...read.facts);
      }
      cursor=r.next_cursor;
    } while(cursor);
    return rows;
  }
  async collect({sources=true}={}) {
    const rows=await this.page('Archivist complete framework review');
    if(sources) for(const fact of rows) {
      const selected=await this.select([fact]);
      fact.sources=[];
      for(const handle of selected.facts[0].evidence_handles) {
        const r=await this.invoke('read',{read_id:selected.read_id,selected_slots:[0],view:'source',evidence_handle:handle});
        if(r.facts[0].source.status!=='AVAILABLE') throw Error('Original evidence unavailable');
        fact.sources.push(r.facts[0].source.source_text);
      }
    }
    return {graph_epoch:this.epoch,facts:rows};
  }
  async select(facts) {
    if(!facts.length || facts.length>8) throw Error('Selection size');
    const query='numeric-selection-v1:'+JSON.stringify({graph_epoch:this.epoch,
      facts:facts.map(f=>({fact_id:f.fact_id,revision:f.revision}))});
    const r=await this.invoke('retrieve',{query});
    const read=await this.invoke('read',{read_id:r.read_id,selected_slots:facts.map((_,i)=>i)});
    if(read.status==='REJECTED') throw Error('Stale selection');
    return {...read,read_id:r.read_id};
  }
  async members(category) {
    const selected=await this.select([category]);
    return this.page('numeric-members-v1',{read_id:selected.read_id,selected_slots:[0]});
  }
  async apply(plan,baseline) {
    if(plan.schema_version!=='archivist-plan-v1' || !plan.owner_instruction?.trim() || !plan.framework?.trim()) throw Error('Invalid plan');
    const nodes=new Map(baseline.facts.map(f=>[f.fact_id,f]));
    const known=new Set(nodes.keys());const definitions=new Set();
    for(const c of plan.categories) {
      if(!c.key || definitions.has(c.key) || !c.members?.length || !c.reason?.trim() ||
         !['life_domain','memory_type','entity_class','entity','subdomain'].includes(c.dimension) ||
         !c.label?.trim() || c.label!==c.label.trim() || c.label.length>256) throw Error('Invalid category plan');
      if(c.members.some(id=>!known.has(id))) throw Error('Unknown or forward member reference');
      definitions.add(c.key);known.add(c.key);
    }
    const keys=new Map();const categories=new Map();const receipts=[];
    for(const c of plan.categories) {
      if(keys.has(c.key) || !c.members?.length || !c.reason?.trim()) throw Error('Invalid category');
      keys.set(c.key,c);
      for(const id of c.members) if(!nodes.has(id)&&!keys.has(id)) throw Error('Unknown member '+id);
      let category=baseline.facts.find(f=>f.node_kind==='category' && f.framework===plan.framework &&
        f.category_dimension===c.dimension && f.value.toLowerCase()===c.label.toLowerCase());
      const wanted=[...new Set(c.members)].map(id=>categories.get(id)??nodes.get(id));
      if(!category) {
        const first=wanted.slice(0,8);const selected=await this.select(first);
        const menu=await this.invoke('menu',{read_id:selected.read_id,selected_slots:first.map((_,i)=>i)});
        if(menu.capabilities?.category_creation!=='archivist-category-v1') throw Error('Core lacks category admission');
        const blank=menu.blank_node_valid_mask?.findIndex(Boolean);
        if(blank===undefined || blank<0) throw Error('No permitted blank slot');
        const r=await this.invoke('submit',{menu_id:menu.menu_id,outcome:'PROPOSE',reason:null,consent:true,
          proposal:{operation:1,target_slot:null,member_slots:first.map((_,i)=>i),source_slots:[],blank_slots:[menu.blank_node_slots[blank]],endpoint_slot:null,relation_slot:null,edge_action:0},
          candidate:{value:c.label,source_text:JSON.stringify({schema_version:'archivist-category-v1',framework:plan.framework,
            dimension:c.dimension,reason:c.reason,owner_instruction:plan.owner_instruction})}});
        this.epoch=r.graph_epoch;receipts.push(r);
        category={fact_id:r.category_id,revision:1,node_kind:'category',value:c.label,framework:plan.framework,category_dimension:c.dimension};
      }
      categories.set(c.key,category);nodes.set(category.fact_id,category);
      const existing=new Set((await this.members(category)).map(f=>f.fact_id));
      for(const member of wanted) if(!existing.has(member.fact_id)) {
        const selected=await this.select([member,category]);
        const menu=await this.invoke('menu',{read_id:selected.read_id,selected_slots:[0,1]});
        if(menu.capabilities?.core_relation_codes?.PART_OF!==1) throw Error('Missing PART_OF code');
        const r=await this.invoke('submit',{menu_id:menu.menu_id,outcome:'PROPOSE',reason:null,consent:true,
          proposal:{operation:4,target_slot:0,member_slots:[],source_slots:[],blank_slots:[],endpoint_slot:1,relation_slot:1,edge_action:0}});
        this.epoch=r.graph_epoch;receipts.push(r);existing.add(member.fact_id);
      }
      const actual=new Set((await this.members(category)).map(f=>f.fact_id));
      if(wanted.some(f=>!actual.has(f.fact_id))) throw Error('Membership readback failed');
    }
    const after=await this.collect({sources:true});
    for(const before of baseline.facts.filter(f=>f.node_kind!=='category')) {
      const current=after.facts.find(f=>f.fact_id===before.fact_id);
      if(!current || current.value!==before.value || current.revision!==before.revision ||
        JSON.stringify(current.sources)!==JSON.stringify(before.sources)) throw Error('Original fact or evidence changed');
    }
    return {categories:[...categories.values()],receipts,after};
  }
}
