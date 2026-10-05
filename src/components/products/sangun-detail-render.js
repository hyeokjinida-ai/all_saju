export function renderSangunDetail(root,d){
 const get=id=>root.querySelector("#"+id);
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const set=(id,value)=>{get(id).textContent=value??'';};
  // Presentation wording only: the analysis still selects each line and year.
  function spoken(text=''){
    const pairs=[
      ['끝낼 때는 분명하게 말하는 편이다. 그런데 마음까지 그 자리에서 정리되지는 않지.','끝이라고 말은 해도,\n혼자 오래 생각하지 않느냐.'],
      ['몸은 누웠는데 머리는 아직 하루를 끝내지 못했다. 지난 대화가 밤이면 다시 떠오르는 편이지.','잠자리에 누워서도,\n지난 대화가 자꾸 떠오르지.'],
      ['네 재주를 꺼내 쓰고,\n새로운 일을 벌이는 때구나.','네 재능을 써서\n새로운 일을 시작할 때구나.'],
      ['스스로 해내는 힘과\n사람들과의 관계가 중요해지는 때다.','네가 직접 나서서\n사람들과 일을 해나갈 때구나.'],
      ['해온 일에서 성과를 내고,\n돈을 챙겨야 할 때구나.','해오던 일로\n돈을 벌 기회가 생기겠구나.'],
      ['맡는 일이 커지고,\n책임도 늘어나는 때구나.','맡은 일이 많아지고,\n책임도 커지겠구나.'],
      ['공부와 자격을 쌓고,\n도움을 받을 사람을 만나는 때구나.','공부나 자격증이 도움이 되겠구나.\n도와줄 사람도 만나고.'],
      ['앞으로 달라지는 흐름을\n네 사주에서 살펴보마.','그때 무엇이 달라지는지,\n네 사주를 더 살펴보마.']
    ];
    let result=pairs.find(([a])=>a===text)?.[1]??text;
    result=result.replace('이대로 이어가도 될까 싶었던 일이 있느냐. 가까운 관계든 맡은 일이든, 더 붙들지 놓아줄지 고민했을 때로 읽힌다.','사람이든 일이든,\n계속할까 그만둘까\n고민하지 않았느냐.');
    return result;
  }
  function lock(label,mask){const row=el('div','personal-lock-row');row.append(el('span','',label));const hidden=el('span','locked-mask',mask);hidden.setAttribute('aria-label','전체 풀이에서 확인');row.append(hidden);return row;}
  function render(d){
    set('customer-name',d.profile.name?d.profile.name+'.':'왔구나.');
    root.querySelector('.name-smoke').classList.toggle('long-name',d.profile.name.length>10);
    set('reading-line-0',spoken(d.reading.lines[0]));
    const past=get('reading-line-1');past.replaceChildren();
    let line=d.reading.lines[1]??'';
    if(d.reading.hasPastCheck&&d.reading.pastYear&&line.startsWith(String(d.reading.pastYear))){
      past.append(el('strong','',d.reading.pastYear+'년.'));
      line=line.replace(new RegExp('^'+d.reading.pastYear+'년[,.]?\\s*'),'');
    }
    past.append(el('p','',spoken(line)));
    root.querySelector('.reading-question').textContent=d.reading.hasPastCheck?'너, 이때 기억나느냐.':'그리고 말이다.';
    set('reading-line-2',spoken(d.reading.lines[2]));
    set('chart-birth',`${d.profile.birthDate.replaceAll('-','.')} · ${d.profile.calendar==='solar'?'양력':'음력'}${d.profile.timeUnknown?'':' · '+d.profile.birthTime}`);
    const pillars=get('chart-pillars');pillars.replaceChildren();pillars.style.gridTemplateColumns=`repeat(${d.chart.columns.length},minmax(0,1fr))`;
    for(const c of d.chart.columns){
      const col=el('article','chart-pillar'+(c.isDay?' is-day':''));col.append(el('h3','',c.isDay?'나 · 날':c.pos));
      col.append(el('p','sip',c.ganSip));
      for(const g of [c.gan,c.ji]){const cell=el('div','chart-glyph',g.char);cell.dataset.element=g.element;cell.append(el('small','',g.read));col.append(cell);}
      col.append(el('p','sip',c.jiSip),el('p','fortune',c.fortune));pillars.append(col);
    }
    set('chart-time-note',d.profile.timeUnknown?'태어난 시각을 몰라 시주는 제외했습니다.':'태어난 해·달·날·시의 사주입니다.');
    const names={wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};
    get('chart-elements').replaceChildren(...d.chart.elements.map(e=>{const n=el('div','',names[e.key]);n.append(el('strong','',String(e.count)));return n;}));
    get('chart-sinsal').replaceChildren(...d.chart.sinsal.map(s=>el('span','',s)));
    get('ref-section-11').hidden=!d.nextDaeun;
    if(d.nextDaeun){set('daeun-year',`너, ${d.nextDaeun.year}년에`);set('daeun-follow',spoken(d.nextDaeun.follow));set('daeun-caution',d.nextDaeun.caution);get('daeun-caution').hidden=!d.nextDaeun.caution;}
    const financial=d.chapters[1]?.items??[];
    const money=[];
    if(financial[0])money.push({label:'돈을 많이 벌 기회는 언제 올까?',mask:financial[0].mask},{label:'돈을 잃기 쉬운 때는 언제일까?',mask:financial[0].mask});
    if(financial[1])money.push({label:'이직은 언제 하는 게 좋을까?',mask:financial[1].mask});
    get('money-locked').replaceChildren(...money.map(x=>lock(x.label,x.mask)));
    get('love-turning').hidden=!d.turningYear;
    if(d.turningYear){set('love-year',d.turningYear.year+'년.');set('love-year-line',`그해, 네 나이 ${d.turningYear.age}세.\n연애에 큰 변화가 보이는구나.`);}
    get('ref-section-17').hidden=!d.partner;
    if(d.partner){
      const photo=get('partner-photo');let fallback=false;
      photo.onerror=()=>{if(!fallback){fallback=true;photo.src=d.partner.legacySrc;}else{photo.hidden=true;}};
      photo.hidden=false;photo.src=d.partner.src;
      set('partner-look',d.partner.lookOpen.replace(/하고$/, '한 인상.').replace(/이며$/, '인 인상.'));
      set('partner-age',d.partner.ageDir);
      get('partner-locked').replaceChildren(lock('그 사람은 어떤 성격일까?','▓▓▓▓▓▓'),lock('우리는 어디서 만나게 될까?','▓▓▓▓'),...d.locked.filter(x=>/인연/.test(x.label)).map(x=>lock('몇 월에 만나게 될까?',x.mask)));
    }
    const chapterTitles=['내 성격과 올해 운세','돈을 벌 때와 이직할 때','만날 사람과 연애할 때','인생이 바뀔 때와 내 고민'];
    const itemText=[
      ['나는 어떤 성격이고, 무엇을 잘할까?','그때 내 삶에는 무슨 일이 있었을까?','올해 잘되는 일과 조심할 일은?'],
      ['언제 돈을 벌고, 언제 손해를 조심해야 할까?','이직이나 계약은 언제 하는 게 좋을까?'],
      ['언제, 어디서 어떤 사람을 만날까?','연애할 때 어떤 행동을 조심해야 할까?'],
      ['그해 내 삶에는 무엇이 달라질까?','지금 내 고민, 어떻게 해야 할까?','내 사주에 맞는 방향과 색은?','이번 주에는 무엇부터 하면 좋을까?']
    ];
    get('personal-chapters').replaceChildren(...d.chapters.map((c,i)=>{
      const section=el('details','personal-chapter');section.append(el('summary','',chapterTitles[i]||c.tag));const list=el('ul');
      c.items.forEach((item,j)=>{const li=el('li');li.append(document.createTextNode(itemText[i]?.[j]??item.main));if(item.peek)li.append(el('span','chapter-value',item.peek));if(item.mask){const mask=el('span','locked-mask',item.mask);mask.setAttribute('aria-label','전체 풀이에서 확인');li.append(mask);}list.append(li);});section.append(list);return section;
    }));
  }

 render(d);
}
