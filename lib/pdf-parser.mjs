import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import manifest from '../server-data/source-manifest.json' with { type: 'json' };
import { classifySubject } from './subject-classifier.mjs';

const GROUPS = ['運動防護基礎科學', '運動防護專業科學'];
const ANSWER_RE = /^(?:[ABCD](?:\s*(?:或|\/|、)\s*[ABCD])?|送分|BONUS)$/i;

function norm(s='') {
  return String(s).replace(/\u00a0/g,' ').replace(/[\t ]+/g,' ').trim();
}
function normalizeAnswerCell(s='') {
  const x = norm(s).replace(/[.。]/g,'').replace(/\s+/g,'').toUpperCase();
  if (/送分|BONUS/.test(x)) return ['BONUS'];
  const m = x.match(/[ABCD]/g);
  return m ? [...new Set(m)] : [];
}
function chineseNumToSession(x) {
  return ({'一':'1','二':'2','1':'1','2':'2'})[x] || '';
}
function detectExam(text, fallbackExpected=[]) {
  let m = text.match(/(10[0-9]|11[0-9])\s*[-－]\s*([12])/);
  if (m) return `${m[1]}-${m[2]}`;
  m = text.match(/(10[0-9]|11[0-9])\s*年(?:度)?\s*第\s*([一二12])\s*次/);
  if (m) return `${m[1]}-${chineseNumToSession(m[2])}`;
  m = text.match(/(10[0-9]|11[0-9])\s*年度\s*第([一二])次/);
  if (m) return `${m[1]}-${chineseNumToSession(m[2])}`;
  return fallbackExpected.length === 1 ? fallbackExpected[0] : '';
}
function detectGroup(text) {
  if (/基礎科學|運動防護基礎/.test(text)) return GROUPS[0];
  if (/專業科學|運動防護專業/.test(text)) return GROUPS[1];
  return '';
}
function groupItemsToLines(items) {
  const rows=[];
  for (const it of items) {
    const str=norm(it.str);
    if (!str) continue;
    const x=it.transform?.[4] ?? 0;
    const y=it.transform?.[5] ?? 0;
    let row=rows.find(r => Math.abs(r.y-y) < 2.2);
    if (!row) { row={y,items:[]}; rows.push(row); }
    row.items.push({str,x,y});
  }
  rows.sort((a,b)=>b.y-a.y);
  return rows.map(r=>{
    r.items.sort((a,b)=>a.x-b.x);
    return {...r, text:norm(r.items.map(i=>i.str).join(' '))};
  });
}
function optionFromLine(text) {
  let m=text.match(/^\s*\(?([A-Da-d])\)?\s*[.、)]\s*(.+)$/);
  if (!m) m=text.match(/^\s*\(([A-Da-d])\)\s*(.+)$/);
  return m ? {letter:m[1].toUpperCase(), text:norm(m[2])} : null;
}
function questionFromLine(text, mode) {
  const re = mode==='inline-answer'
    ? /^\s*([ABCD])?\s*(\d{1,3})\s*[.、)]\s*(.*)$/i
    : /^\s*(\d{1,3})\s*[.、)]\s*(.*)$/;
  const m=text.match(re);
  if (!m) return null;
  if (mode==='inline-answer') return {answer:m[1]?.toUpperCase()||'', number:Number(m[2]), text:norm(m[3])};
  return {answer:'', number:Number(m[1]), text:norm(m[2])};
}
function isHeaderOrNoise(text) {
  return /^(?:第\s*\d+\s*頁|共\s*\d+\s*頁|運動防護員|姓名|准考證|注意事項|試題說明|請選出|考試時間)/.test(text) || /術科.*試題/.test(text);
}
function finalizeQuestion(q, out, source) {
  if (!q || !q.exam || !q.group || !q.number || q.number>100) return;
  const optionKeys=Object.keys(q.options);
  const corr=manifest.corrections.find(c=>c.exam===q.exam && c.group===q.group && c.number===q.number);
  const accepted = corr ? corr.acceptedAnswers : (q.answer ? [q.answer] : []);
  let status = corr?.status || (accepted.length ? 'official-pdf' : 'needs-review');
  if (![2,4].includes(optionKeys.length)) status='needs-review';
  if (!accepted.length) status='needs-review';
  if (!accepted.includes('BONUS') && accepted.some(a=>!q.options[a])) status='needs-review';
  const fullText=[q.text,...Object.values(q.options)].join(' ');
  const cls=classifySubject(fullText,q.group);
  out.push({
    id:`O-${q.exam}-${q.group.includes('基礎')?'B':'P'}-${String(q.number).padStart(3,'0')}`,
    type:'academic', year:Number(q.exam.split('-')[0]), session:q.exam.split('-')[1]||'', exam:q.exam,
    group:q.group, subject:cls.subject, subjectConfidence:cls.confidence, subjectClassification:'system',
    number:q.number, text:norm(q.text), options:q.options, acceptedAnswers:accepted,
    explanation: corr ? `本題答案依官方更正公告：${accepted.includes('BONUS')?'送分':accepted.join(' 或 ')}。學理詳解需經人工複核後再發布。` : `本題目前以官方公布答案「${accepted.join(' 或 ')}」計分；學理詳解尚待人工逐題複核。`,
    sourceKind:'official-pdf', sourceUrl:source.url, correctionNotice:corr?.notice||'',
    verificationStatus:status, official:true, autoScored:status!=='needs-review',
    integrity:{optionCount:optionKeys.length,hasOfficialAnswer:accepted.length>0,subjectNeedsReview:cls.subject.startsWith('未分類')}
  });
}

function extractTableAnswers(lines) {
  // 10 rows × 10 columns. Each printed row is q1/11/.../91, q2/12/.../92, etc.
  const rows=[];
  for (const line of lines) {
    const cells=[];
    for (const it of line.items) {
      const a=normalizeAnswerCell(it.str);
      if (a.length && ANSWER_RE.test(norm(it.str).replace(/[.。]/g,''))) cells.push({x:it.x,ans:a});
    }
    if (cells.length>=8) {
      cells.sort((a,b)=>a.x-b.x);
      rows.push(cells.slice(0,10));
    }
  }
  if (rows.length < 10) return null;
  const selected=rows.slice(0,10);
  const map=new Map();
  selected.forEach((row,r)=>row.forEach((cell,c)=>{
    map.set(c*10+r+1, cell.ans);
  }));
  return map;
}

export async function parseOfficialPdf(arrayBuffer, source) {
  const data = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);
  const doc=await pdfjsLib.getDocument({data, useWorkerFetch:false, isEvalSupported:false, useSystemFonts:true}).promise;
  const pages=[];
  let totalText=0;
  for (let p=1;p<=doc.numPages;p++) {
    const page=await doc.getPage(p);
    const tc=await page.getTextContent();
    totalText += tc.items.length;
    const lines=groupItemsToLines(tc.items);
    pages.push({number:p,lines,text:lines.map(l=>l.text).join('\n')});
  }
  if (totalText < 120 || source.parseMode?.startsWith('scan')) {
    return {sourceKey:source.key, status:'manual-review-required', reason:'PDF文字層不足或來源標記為掃描檔，為避免誤判答案，不進行自動計分匯入。', numPages:doc.numPages, totalTextItems:totalText, items:[]};
  }

  const out=[];
  const answerMaps=new Map(); // `${exam}|${group}` => Map(question, answers)
  let activeExam = source.expectedExams?.length===1 ? source.expectedExams[0] : '';
  let activeGroup='';
  let current=null;
  let currentOption='';

  // Pass 1: detect official answer tables for every era. Older annual PDFs can contain
  // both inline answer marks and a separate 10×10 answer table; when present, the table wins.
  for (const page of pages) {
    const exam=detectExam(page.text,source.expectedExams) || activeExam;
    const group=detectGroup(page.text);
    if (/解\s*答|答案/.test(page.text) && group) {
      const map=extractTableAnswers(page.lines);
      if (map) answerMaps.set(`${exam}|${group}`,map);
    }
  }

  // Pass 2: question bodies
  for (const page of pages) {
    const pageExam=detectExam(page.text,source.expectedExams);
    if (pageExam) activeExam=pageExam;
    const pageGroup=detectGroup(page.text);
    if (pageGroup) activeGroup=pageGroup;
    if (/術科.*(?:試題|測驗|評分)/.test(page.text) && !pageGroup) {
      finalizeQuestion(current,out,source); current=null; currentOption=''; activeGroup='';
      continue;
    }
    for (const line of page.lines) {
      const lineExam=detectExam(line.text,source.expectedExams); if (lineExam) activeExam=lineExam;
      const lineGroup=detectGroup(line.text); if (lineGroup) { finalizeQuestion(current,out,source); current=null; currentOption=''; activeGroup=lineGroup; continue; }
      if (!activeGroup || isHeaderOrNoise(line.text)) continue;
      const qhit=questionFromLine(line.text,source.parseMode);
      if (qhit && qhit.number>=1 && qhit.number<=100) {
        finalizeQuestion(current,out,source);
        current={exam:activeExam,group:activeGroup,number:qhit.number,text:qhit.text,options:{},answer:qhit.answer};
        currentOption='';
        continue;
      }
      if (!current) continue;
      const ohit=optionFromLine(line.text);
      if (ohit) {
        current.options[ohit.letter]=ohit.text; currentOption=ohit.letter; continue;
      }
      if (line.text && !/^\s*[ABCD]\s*$/i.test(line.text)) {
        if (currentOption && current.options[currentOption]) current.options[currentOption]=norm(current.options[currentOption]+' '+line.text);
        else current.text=norm(current.text+' '+line.text);
      }
    }
    // Avoid spilling beyond q100 into practical pages.
    if (current?.number===100) { finalizeQuestion(current,out,source); current=null; currentOption=''; activeGroup=''; }
  }
  finalizeQuestion(current,out,source);

  // Apply table answers and corrections after all bodies parsed.
  for (const q of out) {
    const corr=manifest.corrections.find(c=>c.exam===q.exam && c.group===q.group && c.number===q.number);
    if (corr) {
      q.acceptedAnswers=corr.acceptedAnswers; q.verificationStatus=corr.status; q.correctionNotice=corr.notice; q.autoScored=true;
      q.explanation=`本題答案依官方更正公告：${q.acceptedAnswers.includes('BONUS')?'送分':q.acceptedAnswers.join(' 或 ')}。學理詳解需經人工複核後再發布。`;
    } else if (answerMaps.has(`${q.exam}|${q.group}`) && answerMaps.get(`${q.exam}|${q.group}`).get(q.number)?.length) {
      // Prefer the explicitly printed official answer table over any layout-derived inline prefix.
      q.acceptedAnswers=answerMaps.get(`${q.exam}|${q.group}`).get(q.number)||[];
      q.verificationStatus=q.acceptedAnswers.length && [2,4].includes(Object.keys(q.options).length) ? 'official-pdf':'needs-review';
      q.autoScored=q.verificationStatus!=='needs-review';
      q.integrity.hasOfficialAnswer=q.acceptedAnswers.length>0;
      q.explanation=q.acceptedAnswers.length ? `本題目前以官方公布答案「${q.acceptedAnswers.join(' 或 ')}」計分；學理詳解尚待人工逐題複核。` : '官方答案未能由PDF安全解析；本題暫不計分。';
    }
    if (!q.acceptedAnswers?.includes('BONUS') && q.acceptedAnswers?.some(a=>!q.options[a])) { q.verificationStatus='needs-review'; q.autoScored=false; }
  }

  // Keep best duplicate if parser sees same q more than once.
  const best=new Map();
  for (const q of out) {
    const prev=best.get(q.id);
    const score=(q.autoScored?10:0)+Object.keys(q.options).length+(q.text?.length?1:0);
    const prevScore=prev ? ((prev.autoScored?10:0)+Object.keys(prev.options||{}).length+(prev.text?.length?1:0)) : -1;
    if (score>prevScore) best.set(q.id,q);
  }
  const items=[...best.values()].sort((a,b)=>a.exam.localeCompare(b.exam)||a.group.localeCompare(b.group)||a.number-b.number);
  const byExam={};
  for (const q of items) {
    byExam[q.exam]??={}; byExam[q.exam][q.group]??={count:0,scored:0,needsReview:0};
    byExam[q.exam][q.group].count++;
    if (q.autoScored) byExam[q.exam][q.group].scored++; else byExam[q.exam][q.group].needsReview++;
  }
  const expectedGroups=Object.fromEntries((source.expectedExams||[]).flatMap(e=>GROUPS.map(g=>[`${e}|${g}`,100])));
  const integrity=[];
  for (const [key,expected] of Object.entries(expectedGroups)) {
    const [exam,group]=key.split('|'); const stat=byExam[exam]?.[group]||{count:0,scored:0,needsReview:0};
    integrity.push({exam,group,expected,count:stat.count,scored:stat.scored,needsReview:stat.needsReview,complete:stat.count===expected && stat.scored===expected});
  }
  return {sourceKey:source.key,status:items.length?'parsed':'manual-review-required',numPages:doc.numPages,totalTextItems:totalText,items,integrity};
}
