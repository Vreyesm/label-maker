'use strict';
const $=s=>document.querySelector(s),clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const CELL_FORMAT_KEYS=['size','bold','align','valign','font','color','textRotation'];
let fitWidth=false, fitScreen=false, activeEditor=null, activeCell=null, variableClock=null;
let seq=0;const el=(type,x,y,w,h,text='',extra={})=>({id:++seq,type,x,y,w,h,text,size:3,color:'#000000',bold:false,align:'left',rotation:0,...extra});
const templates=[
{id:'basic-text',name:'Solo texto',category:'Básicas',w:100,h:60,desc:'Un texto centrado, sin otros elementos',elements:()=>[el('text',5,6,90,48,'TU TEXTO',{size:12,bold:true,align:'center',valign:'middle'})]},
{id:'basic-vertical',name:'Texto vertical',category:'Básicas',w:60,h:100,desc:'Texto girado 90° en una etiqueta vertical',elements:()=>[el('text',-15,26,90,48,'TU TEXTO',{size:12,bold:true,align:'center',valign:'middle',rotation:90})]},
{id:'product',name:'Producto esencial',category:'Producto',w:100,h:60,desc:'Clara, versátil y lista para tu marca',elements:()=>[el('text',7,6,86,5,'N O R D   /   B O T A N I C A L', {size:2.8,bold:true}),el('line',7,15,86,.3,'',{color:'#9da697'}),el('text',7,21,65,10,'Jabón de oliva',{size:7,bold:true}),el('text',7,33,75,5,'Natural. Artesanal. Hecho con calma.',{size:2.9}),el('text',7,43,38,5,'ACEITE DE OLIVA · 100 g',{size:2.4,bold:true}),el('barcode',61,42,32,12,'7501234567893'),el('text',7,51,45,3,'LOTE 2026-001 · HECHO EN MÉXICO',{size:1.9})]},
{id:'shipping',name:'Envío & logística',category:'Logística',w:100,h:150,desc:'Toda la información en un solo lugar',elements:()=>[el('text',7,7,86,8,'ENVÍO ESTÁNDAR',{size:5,bold:true}),el('text',7,22,86,8,'PEDIDO #000128',{size:3}),el('line',7,36,86,.4),el('text',7,43,86,5,'DESTINATARIO',{size:2.6}),el('text',7,53,86,10,'María García',{size:6,bold:true}),el('text',7,69,86,20,'Av. Reforma 123, Col. Centro\nCiudad de México, CP 06000',{size:3.8}),el('line',7,98,86,.4),el('barcode',10,108,80,25,'7501234567893'),el('text',7,140,86,5,'PAQUETE 1 DE 1 · 0.5 kg',{size:3,align:'center'})]},
{id:'price',name:'Precio minimalista',category:'Producto',w:60,h:40,desc:'El producto y su precio, protagonistas',elements:()=>[el('text',5,4,50,4,'COLECCIÓN ESENCIAL',{size:2.2,bold:true}),el('text',5,11,50,5,'Vela aromática',{size:4}),el('text',5,20,50,10,'$ 249.00',{size:8,bold:true}),el('text',5,33,50,3,'IVA incluido · 180 g',{size:2})]},
{id:'stock',name:'Inventario organizado',category:'Logística',w:80,h:50,desc:'Identifica, escanea y organiza',elements:()=>[el('text',5,5,70,5,'ALMACÉN / A-012',{size:4,bold:true}),el('text',5,15,70,5,'SKU: PRD-000128',{size:3}),el('barcode',5,24,70,15,'7501234567893'),el('text',5,43,70,3,'UBICACIÓN B-04 · LOTE 001',{size:2.4})]}
];
let state={name:'Etiqueta de producto',w:100,h:60,bg:'#ffffff',template:'product',elements:templates.find(t=>t.id==='product').elements()},selected=null,tab='templates',filter='Todas',query='',zoom=1,history=[],future=[],rows=[],csvFields=[],record=0;
try{const saved=JSON.parse(localStorage.getItem('labela-current'));if(saved)state=validate(saved)}catch{}seq=Math.max(0,...state.elements.map(e=>e.id));
function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',3200)}
let viewSaveTimer=null,restoringView=false;
function saveStatus(message){const node=$('#saved');if(node)node.textContent=message}
function viewSnapshot(){
 const position=selector=>{const node=$(selector);return {top:node?.scrollTop||0,left:node?.scrollLeft||0}};
 return {tab,filter,query,zoom,fitWidth,fitScreen,grid:$('#grid')?.checked??true,selected,activeCell,scroll:{canvas:position('#canvas-area'),left:position('.left'),right:position('.right')},copies:+($('#copies')?.value||1),rotateDesign:$('#rotate-design')?.checked??true,csv:{rows,fields:csvFields,record}};
}
function persistView(){
 if(restoringView)return true;
 try{localStorage.setItem('labela-view',JSON.stringify(viewSnapshot()));return true}catch{saveStatus('No se pudo guardar la vista: almacenamiento lleno');return false}
}
function scheduleViewSave(){if(restoringView)return;clearTimeout(viewSaveTimer);viewSaveTimer=setTimeout(persistView,200)}
function persist(){
 try{
  const library=state.savedId?getLibrary():null,index=library?library.findIndex(d=>d.savedId===state.savedId):-1;
  if(state.savedId&&index<0)delete state.savedId;
  localStorage.setItem('labela-current',JSON.stringify(state));
  if(index>=0){library[index]=clone(state);writeLibrary(library);const preview=$(`[data-saved-template="${state.savedId}"] .preview`);if(preview)preview.innerHTML=svgDoc(state,{},0)}
  saveStatus('● Guardado en este navegador');persistView();
 }catch{saveStatus('No se pudo guardar: descarga una copia del diseño')}
}
function safeView(raw){
 const value=raw&&typeof raw==='object'?raw:{},validTab=['templates','elements','data','library'].includes(value.tab)?value.tab:'templates',validFilter=['Todas','Básicas','Producto','Logística','Mis diseños'].includes(value.filter)?value.filter:'Todas';
 const pos=value=>({top:Number.isFinite(value?.top)&&value.top>=0?value.top:0,left:Number.isFinite(value?.left)&&value.left>=0?value.left:0});
 const csv=value.csv,validCSV=csv&&Array.isArray(csv.rows)&&csv.rows.length<=500&&csv.rows.every(row=>row&&typeof row==='object'&&!Array.isArray(row)&&Object.values(row).every(v=>typeof v==='string'))&&Array.isArray(csv.fields)&&csv.fields.every(f=>typeof f==='string');
 return {tab:validTab,filter:validFilter,query:typeof value.query==='string'?value.query.slice(0,100):'',zoom:Number.isFinite(value.zoom)&&value.zoom>=.3&&value.zoom<=2?value.zoom:1,fitWidth:!!value.fitWidth&&!value.fitScreen,fitScreen:!!value.fitScreen,grid:typeof value.grid==='boolean'?value.grid:true,selected:Number.isInteger(value.selected)?value.selected:null,activeCell:value.activeCell,scroll:{canvas:pos(value.scroll?.canvas),left:pos(value.scroll?.left),right:pos(value.scroll?.right)},copies:Number.isInteger(value.copies)&&value.copies>=1&&value.copies<=500?value.copies:1,rotateDesign:typeof value.rotateDesign==='boolean'?value.rotateDesign:true,csv:validCSV?{rows:csv.rows,fields:csv.fields,record:Math.max(0,Math.min(csv.rows.length-1,Number.isInteger(csv.record)?csv.record:0))}:{rows:[],fields:[],record:0}};
}
function restoreWorkspace(){
 let raw={};try{raw=JSON.parse(localStorage.getItem('labela-view'))||{}}catch{}
 const view=safeView(raw);tab=view.tab;filter=view.filter;query=view.query;zoom=view.zoom;fitWidth=view.fitWidth;fitScreen=view.fitScreen;
 selected=state.elements.some(e=>e.id===view.selected)?view.selected:null;activeCell=null;
 const selectedElement=state.elements.find(e=>e.id===selected),cell=view.activeCell;
 if(selectedElement?.type==='table'&&cell&&cell.id===selected&&Number.isInteger(cell.row)&&Number.isInteger(cell.col)&&cell.row>=0&&cell.row<selectedElement.rows&&cell.col>=0&&cell.col<selectedElement.cols)activeCell={id:selected,row:cell.row,col:cell.col,scope:['row','col'].includes(cell.scope)?cell.scope:'cell'};
 rows=view.csv.rows;csvFields=view.csv.fields;record=view.csv.record;
 if($('#grid'))$('#grid').checked=view.grid;if($('#copies'))$('#copies').value=view.copies;if($('#rotate-design'))$('#rotate-design').checked=view.rotateDesign;
 if(!state.savedId){const fingerprint=doc=>JSON.stringify([doc.name,doc.w,doc.h,doc.bg,doc.elements]),matches=getLibrary().filter(doc=>fingerprint(doc)===fingerprint(state));if(matches.length===1)state.savedId=matches[0].savedId}
 return view;
}
function restoreScroll(view){for(const [name,selector] of [['canvas','#canvas-area'],['left','.left'],['right','.right']]){const node=$(selector);if(node){node.scrollTop=view.scroll[name].top;node.scrollLeft=view.scroll[name].left}}}
function setTab(next){finishInlineEdit();tab=next;renderLeft();persistView()}
function flushWorkspace(){
 finishInlineEdit(true,false);
 const input=document.activeElement;
 if(input?.id==='docname'&&input.value.trim())state.name=input.value.trim().slice(0,100);
 else if(input?.matches?.('[data-prop],[data-table-cell],[data-design-name]'))input.dispatchEvent(new Event('change',{bubbles:true}));
 persist();
}
function checkpoint(){history.push(clone(state));if(history.length>60)history.shift();future=[]}
function change(fn){finishInlineEdit(true,false);checkpoint();fn();render();persist()}
function stepHistory(direction){
 finishInlineEdit(true,false);const source=direction==='undo'?history:future,target=direction==='undo'?future:history;
 if(!source.length)return;target.push(clone(state));state=source.pop();selected=null;activeCell=null;render();renderLeft();persist();
}
function automaticFields(now=variableClock||new Date()){
 const pad=value=>String(value).padStart(2,'0'),day=pad(now.getDate()),month=pad(now.getMonth()+1),year=String(now.getFullYear()),hour=pad(now.getHours()),minute=pad(now.getMinutes());
 return {fecha:`${day}/${month}/${year}`,fecha_iso:`${year}-${month}-${day}`,hora:`${hour}:${minute}`,fecha_hora:`${day}/${month}/${year} ${hour}:${minute}`,dia:day,mes:month,anio:year,'año':year};
}
function withVariableClock(now,fn){const previous=variableClock;variableClock=now;try{return fn()}finally{variableClock=previous}}
function val(text,row=rows[record]||{},index=record){
 const fields=automaticFields();return String(text??'').replace(/\{\{([^}]+)\}\}/g,(_,raw)=>{const key=raw.trim();if(key==='numero')return String(index+1).padStart(4,'0');if(Object.prototype.hasOwnProperty.call(row,key))return row[key];return Object.prototype.hasOwnProperty.call(fields,key)?fields[key]:'{{'+raw+'}}'});
}
// EAN-13 includes a computed check digit; Code 39 supports uppercase identifiers.
function barcode(e,text){let bits='',human=text;const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'],G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'],P=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
if((e.format||'ean13')==='ean13'){if(!/^\d{12,13}$/.test(text))return {error:'EAN-13: usa 12 o 13 dígitos'};let raw=text.slice(0,12),check=(10-[...raw].reduce((s,n,i)=>s+Number(n)*(i%2?3:1),0)%10)%10;human=raw+check;if(text.length===13&&text!==human)return {error:'Dígito de control incorrecto'};bits='101';for(let i=1;i<7;i++)bits+=(P[+human[0]][i-1]==='L'?L:G)[+human[i]];bits+='01010';for(let i=7;i<13;i++)bits+=L[+human[i]].split('').map(x=>x==='0'?'1':'0').join('');bits+='101';
}else{const chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%*',patterns=[0x034,0x121,0x061,0x160,0x031,0x130,0x070,0x025,0x124,0x064,0x109,0x049,0x148,0x019,0x118,0x058,0x00d,0x10c,0x04c,0x01c,0x103,0x043,0x142,0x013,0x112,0x052,0x007,0x106,0x046,0x016,0x181,0x0c1,0x1c0,0x091,0x190,0x0d0,0x085,0x184,0x0c4,0x0a8,0x0a2,0x08a,0x02a,0x094];human=text.toUpperCase();if(!/^[0-9A-Z .\-$/+%]+$/.test(human))return {error:'Code 39: caracteres no admitidos'};for(const c of '*'+human+'*'){let pattern=patterns[chars.indexOf(c)];for(let i=0;i<9;i++)bits+=(i%2?'0':'1').repeat(pattern&(1<<(8-i))?3:1);bits+='0'}}
let rects='';for(let i=0;i<bits.length;i++)if(bits[i]==='1')rects+=`<rect x="${i+12}" y="0" width="1" height="35"/>`;return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bits.length+24} 45" preserveAspectRatio="none"><rect width="100%" height="100%" fill="white"/><g fill="${esc(e.color)}">${rects}</g><text x="50%" y="43" text-anchor="middle" font-size="8" font-family="Arial" fill="${esc(e.color)}">${esc(human)}</text></svg>`}}
function buildPrintJob(doc,data,count){return withVariableClock(new Date(),()=>{
 if(!Number.isInteger(count)||count<1||count>500||!data.length||count*data.length>500)throw Error('Elige de 1 a 500 etiquetas por impresión.');
 const labels=[];
 data.forEach((row,index)=>{
  for(const e of doc.elements){
   const contents=e.type==='table'?e.cells.flat():[e.text];
   for(const content of contents)if(/\{\{[^}]+\}\}/.test(val(content,row,index)))throw Error('Hay campos sin datos. Importa un CSV o edita el contenido.');
   if(e.type==='barcode'){const b=barcode(e,val(e.text,row,index));if(b.error)throw Error(`Registro ${index+1}: ${b.error}`)}
  }
  const label=`<section class="print-sheet"><div class="print-label">${svgDoc(doc,row,index)}</div></section>`;
  for(let copy=0;copy<count;copy++)labels.push(label);
 });
 const css=`@page{size:auto;margin:0}html,body{margin:0!important;padding:0!important;background:white!important;width:auto!important;min-width:0!important;height:auto!important;min-height:0!important}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}.print-sheet{display:block!important;position:relative!important;width:${doc.w}mm!important;height:${doc.h}mm!important;margin:0!important;padding:0!important;overflow:hidden;break-after:page;page-break-after:always}.print-sheet:last-child{break-after:auto;page-break-after:auto}.print-label{display:block!important;position:relative!important;width:${doc.w}mm!important;height:${doc.h}mm!important;margin:0!important;padding:0!important;border:0!important;outline:0!important;box-shadow:none!important;overflow:hidden!important;break-inside:avoid;page-break-inside:avoid;break-after:auto;page-break-after:auto}.print-label>svg{display:block!important;width:${doc.w}mm!important;height:${doc.h}mm!important;margin:0!important;padding:0!important}`;
 return {html:labels.join(''),css,pages:labels.length,total:labels.length};
})}
function printDocument(job,name='Etiquetas'){
 return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(name)}</title><style>${job.css}</style></head><body>${job.html}</body></html>`;
}
function currentPrintJob(){finishInlineEdit(true,false);return buildPrintJob(state,rows.length?rows:[{}],+$('#copies').value)}
function updatePrintPreview(){
 const button=$('#confirm-print');
 try{const job=currentPrintJob();$('#print-summary').textContent=`${job.total} etiquetas de ${state.w} × ${state.h} mm · Una etiqueta por página`;$('#print-preview').innerHTML=svgDoc();$('#print-error').textContent='';button.disabled=false;return job}
 catch(error){$('#print-error').textContent=error.message;button.disabled=true;return null}
}
function prepareNativePrint(){
 let style=$('#page-style');if(!style){style=document.createElement('style');style.id='page-style';style.media='print';document.head.append(style)}
 try{const job=currentPrintJob();$('#print-area').innerHTML=job.html;style.textContent=job.css}
 catch(error){$('#print-area').innerHTML=`<p style="font:16px Arial;padding:20px">${esc(error.message)} Cancela esta impresión y revisa la configuración.</p>`;style.textContent='@page{size:auto;margin:10mm}'}
}
function launchPrint(job){
 const old=$('#label-print-frame');if(old)old.remove();
 const frame=document.createElement('iframe');frame.id='label-print-frame';frame.title='Documento de etiquetas para imprimir';frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0';
 const button=$('#confirm-print');button.disabled=true;button.textContent='Preparando…';
 frame.onload=async()=>{
  try{await frame.contentDocument.fonts.ready;frame.contentWindow.onafterprint=()=>frame.remove();$('#printdialog').close();frame.contentWindow.focus();frame.contentWindow.print()}
  catch(error){toast('No se pudo abrir la impresión. Intenta de nuevo.');frame.remove()}
  finally{button.disabled=false;button.textContent='Abrir impresión'}
 };
 frame.srcdoc=printDocument(job,state.name);document.body.append(frame);
}
function measureText(text,e){
 const ctx=measureText.ctx||(measureText.ctx=document.createElement?.('canvas').getContext('2d'));
 if(!ctx)return text.length*e.size*.55;
 ctx.font=`${e.bold?700:400} ${e.size*10}px "${e.font||'Arial'}"`;
 return ctx.measureText(text).width/10;
}
function textLines(e,text){
 const lines=[];
 for(const paragraph of String(text).split('\n')){
  const words=paragraph.trim().split(/\s+/).filter(Boolean);let line='';
  for(const word of words){
   if(line&&measureText(line+' '+word,e)>e.w){lines.push({text:line,last:false});line=''}
   if(measureText(word,e)>e.w){
    if(line){lines.push({text:line,last:false});line=''}
    for(const char of word){if(line&&measureText(line+char,e)>e.w){lines.push({text:line,last:false});line=''}line+=char}
   }else line+=(line?' ':'')+word;
  }
  lines.push({text:line,last:true});
 }
 return lines;
}
function textVerticalOffset(e,text){
 const free=Math.max(0,e.h-textLines(e,text).length*e.size*1.2);
 return e.valign==='middle'?free/2:e.valign==='bottom'?free:0;
}
function selectedTableCell(e){return activeCell&&activeCell.id===e.id&&activeCell.row>=0&&activeCell.row<e.rows&&activeCell.col>=0&&activeCell.col<e.cols?activeCell:null}
function tableRangeCells(e,cell){
 if(cell?.scope==='row')return Array.from({length:e.cols},(_,col)=>({row:cell.row,col}));
 if(cell?.scope==='col')return Array.from({length:e.rows},(_,row)=>({row,col:cell.col}));
 if(cell)return [{row:cell.row,col:cell.col}];
 return e.cells.flatMap((row,r)=>row.map((_,col)=>({row:r,col})));
}
function selectTableRange(e,scope,index){selected=e.id;activeCell={id:e.id,row:scope==='row'?index:0,col:scope==='col'?index:0,scope}}
function normalizedAngle(value=0){return ((value%360)+360)%360}
function cellTextStyle(e,row,col){
 const box=tableCellBox(e,row,col),style={...e,w:box.w-2*box.pad,h:box.h-2*box.pad,bold:!!(e.bold||(e.header&&row===0)),align:e.align||'left',valign:e.valign||'middle',textRotation:e.textRotation||0,...(e.cellFormats?.[row]?.[col]||{})};
 if(normalizedAngle(style.textRotation)%180===90)[style.w,style.h]=[style.h,style.w];
 return style;
}
function rotateTextTarget(target,delta,reset=false){
 if(target.e.type==='text')target.e.rotation=reset?0:normalizedAngle((target.e.rotation||0)+delta);
 else applyTextFormat(target,'textRotation',reset?0:normalizedAngle((target.style.textRotation||0)+delta));
}
function setCellFormat(e,cell,key,value){
 if(!CELL_FORMAT_KEYS.includes(key))throw Error('Formato de celda no válido.');
 if(!e.cellFormats)e.cellFormats=Array.from({length:e.rows},()=>Array.from({length:e.cols},()=>({})));
 e.cellFormats[cell.row][cell.col][key]=value;
}
function formattingTarget(){
 const e=state.elements.find(e=>e.id===selected);if(!e||!['text','table'].includes(e.type))return null;
 const cell=e.type==='table'?selectedTableCell(e):null;
 return {e,cell,style:cell?cellTextStyle(e,cell.row,cell.col):e};
}
function applyTextFormat(target,key,value){
 if(target.cell)tableRangeCells(target.e,target.cell).forEach(cell=>setCellFormat(target.e,cell,key,value));
 else{
  if(key==='size'&&target.e.type==='text')setTextSize(target.e,value/MM_PER_PT);else target.e[key]=value;
  if(target.e.type==='table'){if(key==='bold'){for(let r=0;r<target.e.rows;r++)for(let c=0;c<target.e.cols;c++)setCellFormat(target.e,{row:r,col:c},key,value)}else if(target.e.cellFormats)target.e.cellFormats.forEach(row=>row.forEach(format=>delete format[key]))}
 }
}
function fitCellText(e,cell){
 const style=cellTextStyle(e,cell.row,cell.col),fitted=fitTextToBox({...style,text:e.cells[cell.row][cell.col]},rows[record]||{},record);
 if(fitted)setCellFormat(e,cell,'size',fitted.size);
}
function cellSelectionMarkup(e){
 const cell=selectedTableCell(e);if(!cell||selected!==e.id)return '';const box=tableCellBox(e,cell.row,cell.col);if(cell.scope==='row'){box.x=0;box.w=e.w}else if(cell.scope==='col'){box.y=0;box.h=e.h}
 return `<span class="table-cell-selection" style="left:${box.x/e.w*100}%;top:${box.y/e.h*100}%;width:${box.w/e.w*100}%;height:${box.h/e.h*100}%" aria-hidden="true"></span>`;
}
function cellFromEvent(e,node,event){
 const value=event.target.closest('[data-cell]')?.dataset.cell;if(value){const [row,col]=value.split(',').map(Number);return {row,col}}
 const rect=node.getBoundingClientRect(),k=scale(),point=localDelta((event.clientX-(rect.left+rect.width/2))/k,(event.clientY-(rect.top+rect.height/2))/k,e.rotation||0);
 return tableCellAt(e,point.x+e.w/2,point.y+e.h/2);
}
function validateCellFormats(e){
 if(e.cellFormats===undefined)return;
 if(!Array.isArray(e.cellFormats)||e.cellFormats.length!==e.rows||!e.cellFormats.every(row=>Array.isArray(row)&&row.length===e.cols&&row.every(format=>format&&typeof format==='object'&&!Array.isArray(format)&&Object.entries(format).every(([key,value])=>{
  if(!CELL_FORMAT_KEYS.includes(key))return false;
  if(key==='textRotation')return [0,90,180,270].includes(value);
  if(key==='size')return Number.isFinite(value)&&value>0&&value<=1000;
  if(key==='bold')return typeof value==='boolean';
  if(key==='align')return ['left','center','right','justify'].includes(value);
  if(key==='valign')return ['top','middle','bottom'].includes(value);
  if(key==='font')return ['Arial','Georgia','Courier New'].includes(value);
  return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
 }))))throw Error('Formatos de celda inválidos.');
 e.cellFormats.forEach(row=>row.forEach(format=>{if(format.color?.toLowerCase()==='#182c21')format.color='#000000'}));
}
function tableTracks(e){
 const tracks=(weights,count,total)=>{const values=Array.isArray(weights)&&weights.length===count?weights:Array(count).fill(1),sum=values.reduce((a,b)=>a+b,0);return values.map(v=>v*total/sum)};
 return {cols:tracks(e.colSizes,e.cols,e.w),rows:tracks(e.rowSizes,e.rows,e.h)};
}
function tableCellBox(e,row,col){
 const tracks=tableTracks(e),w=tracks.cols[col],h=tracks.rows[row];
 return {x:tracks.cols.slice(0,col).reduce((a,b)=>a+b,0),y:tracks.rows.slice(0,row).reduce((a,b)=>a+b,0),w,h,pad:Math.min(1,w/8,h/8)};
}
function resizeTable(e,rowCount,colCount){
 if(!Number.isInteger(rowCount)||!Number.isInteger(colCount)||rowCount<1||rowCount>10||colCount<1||colCount>10)throw Error('La tabla admite entre 1 y 10 filas y columnas.');
 for(const [key,count] of [['rowSizes',rowCount],['colSizes',colCount]])if(e[key]){const previous=e[key],average=previous.reduce((a,b)=>a+b,0)/previous.length;e[key]=Array.from({length:count},(_,i)=>previous[i]??average)}
 if(e.cellFormats)e.cellFormats=Array.from({length:rowCount},(_,r)=>Array.from({length:colCount},(_,c)=>({...e.cellFormats?.[r]?.[c]})));
 e.cells=Array.from({length:rowCount},(_,r)=>Array.from({length:colCount},(_,c)=>e.cells?.[r]?.[c]??''));e.rows=rowCount;e.cols=colCount;
}
function resizeTableTrack(e,axis,index,delta,original){
 const values=original.slice(),total=values[index]+values[index+1],minimum=Math.min(1,total/4);
 const first=Math.max(minimum,Math.min(total-minimum,original[index]+delta));
 values[index]=first;values[index+1]=total-first;e[axis==='col'?'colSizes':'rowSizes']=values;
}
function tableSVG(e,row,index){
 return e.cells.map((cells,r)=>cells.map((content,c)=>{
  const box=tableCellBox(e,r,c),cell=cellTextStyle(e,r,c);
  return `<g data-cell="${r},${c}" transform="translate(${box.x} ${box.y})"><rect width="${box.w}" height="${box.h}" fill="${e.header&&r===0?'#f1f1f1':'#ffffff'}" stroke="${esc(e.color)}" stroke-width=".25"/><g transform="translate(${box.w/2} ${box.h/2}) rotate(${cell.textRotation}) translate(${-cell.w/2} ${-cell.h/2})">${textSVG(cell,val(content,row,index))}</g></g>`;
 }).join('')).join('');
}
function updateTableExtent(e,baseline,w,h){
 const radians=(e.rotation||0)*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians),dw=w-baseline.w,dh=h-baseline.h;
 e.x=baseline.x+(c*dw-s*dh-dw)/2;e.y=baseline.y+(s*dw+c*dh-dh)/2;e.w=w;e.h=h;
}
function setSingleTrackSize(e,axis,index,size,baseline={...e,tracks:tableTracks(e)}){
 if(!['row','col'].includes(axis)||!Number.isInteger(index)||index<0||index>=(axis==='col'?e.cols:e.rows))throw Error('Fila o columna no válida.');
 if(!Number.isFinite(size)||size<.5||size>300)throw Error('El tamaño debe estar entre 0,5 y 300 mm.');
 const values=baseline.tracks[axis==='col'?'cols':'rows'].slice();values[index]=size;const total=values.reduce((a,b)=>a+b,0);
 e[axis==='col'?'colSizes':'rowSizes']=values;updateTableExtent(e,baseline,axis==='col'?total:baseline.w,axis==='row'?total:baseline.h);
}
function mutateTableTrack(e,axis,index,operation='insert'){
 const count=axis==='col'?e.cols:e.rows;if(!['insert','delete'].includes(operation)||!['row','col'].includes(axis)||!Number.isInteger(index)||index<0||index>(operation==='insert'?count:count-1))throw Error('Fila o columna no válida.');
 if(operation==='insert'&&count>=10)throw Error('Máximo 10 filas o columnas.');if(operation==='delete'&&count<=1)throw Error('La tabla necesita al menos una fila y una columna.');
 const baseline={...e},tracks=tableTracks(e),sizes=tracks[axis==='col'?'cols':'rows'],reference=Math.max(0,Math.min(count-1,index-1));
 if(axis==='row'){
  if(operation==='insert'){e.cells.splice(index,0,Array(e.cols).fill(''));if(e.cellFormats)e.cellFormats.splice(index,0,e.cellFormats[reference].map(format=>({...format})));e.rows++}
  else{e.cells.splice(index,1);if(e.cellFormats)e.cellFormats.splice(index,1);e.rows--}
 }else{
  e.cells.forEach(row=>operation==='insert'?row.splice(index,0,''):row.splice(index,1));
  if(e.cellFormats)e.cellFormats.forEach(row=>operation==='insert'?row.splice(index,0,{...row[reference]}):row.splice(index,1));
  e.cols+=operation==='insert'?1:-1;
 }
 if(operation==='insert')sizes.splice(index,0,sizes[reference]);else sizes.splice(index,1);
 e[axis==='col'?'colSizes':'rowSizes']=sizes;const total=sizes.reduce((a,b)=>a+b,0);updateTableExtent(e,baseline,axis==='col'?total:e.w,axis==='row'?total:e.h);
 selectTableRange(e,axis,Math.min(index,(axis==='col'?e.cols:e.rows)-1));
}
function tableHeaderControls(e){
 const tracks=tableTracks(e),selection=selectedTableCell(e);let x=0,y=0;
 return tracks.cols.map((w,index)=>{const left=x;x+=w;const letter=String.fromCharCode(65+index);return `<span class="table-column-head ${selection?.scope==='col'&&selection.col===index?'active':''}" style="left:${left/e.w*100}%;width:${w/e.w*100}%"><button type="button" data-table-action="select-col" data-index="${index}" title="Seleccionar columna ${letter}">${letter}</button><button type="button" data-table-action="insert-col" data-index="${index+1}" title="Insertar columna a la derecha de ${letter}" aria-label="Insertar columna a la derecha de ${letter}" ${e.cols>=10?'disabled':''}>+</button><span class="track-size-grip col" data-table-action="resize-col" data-index="${index}" title="Arrastra para cambiar todo el ancho de esta columna"></span></span>`}).join('')+tracks.rows.map((h,index)=>{const top=y;y+=h;return `<span class="table-row-head ${selection?.scope==='row'&&selection.row===index?'active':''}" style="top:${top/e.h*100}%;height:${h/e.h*100}%"><button type="button" data-table-action="select-row" data-index="${index}" title="Seleccionar fila ${index+1}">${index+1}</button><button type="button" data-table-action="insert-row" data-index="${index+1}" title="Insertar fila debajo de ${index+1}" aria-label="Insertar fila debajo de ${index+1}" ${e.rows>=10?'disabled':''}>+</button><span class="track-size-grip row" data-table-action="resize-row" data-index="${index}" title="Arrastra para cambiar todo el alto de esta fila"></span></span>`}).join('');
}
function beginSingleTrackResize(event,node,e,axis,index){
 showTransformFeedback(event,dimensionsText(e));selectTableRange(e,axis,index);const baseline={...e,tracks:tableTracks(e)},original=baseline.tracks[axis==='col'?'cols':'rows'][index],start={x:event.clientX,y:event.clientY},k=scale();let moved=false;
 node.setPointerCapture(event.pointerId);node.onpointermove=ev=>{const dx=ev.clientX-start.x,dy=ev.clientY-start.y;if(!moved&&Math.hypot(dx,dy)<3)return;if(!moved){checkpoint();moved=true}const delta=localDelta(dx/k,dy/k,e.rotation||0),size=Math.max(.5,Math.min(300,Math.round((original+(axis==='col'?delta.x:delta.y))*2)/2));setSingleTrackSize(e,axis,index,size,baseline);node.style.left=e.x*k+'px';node.style.top=e.y*k+'px';node.style.width=e.w*k+'px';node.style.height=e.h*k+'px';node.innerHTML=elementContent(e);showTransformFeedback(ev,`${axis==='col'?'Columna':'Fila'} ${+(tableTracks(e)[axis==='col'?'cols':'rows'][index]).toFixed(2)} mm · ${dimensionsText(e)}`)};
 const finish=()=>{hideTransformFeedback();node.onpointermove=null;node.onpointerup=null;node.onpointercancel=null;if(moved){render();persist()}else renderProperties()};node.onpointerup=finish;node.onpointercancel=finish;
}
function executeTableControl(control,e,event,node){
 if(control.disabled)return;const [action,axis]=control.dataset.tableAction.split('-'),index=+control.dataset.index;
 if(action==='resize'){if(event)beginSingleTrackResize(event,node,e,axis,index);return}
 finishInlineEdit(true,false);
 if(action==='select'){selectTableRange(e,axis,index);render();return}
 try{change(()=>mutateTableTrack(e,axis,index,action==='delete'?'delete':'insert'))}catch(error){toast(error.message)}
}
function tableHandles(e){
 const tracks=tableTracks(e);let x=0,y=0;
 return tableHeaderControls(e)+tracks.cols.slice(0,-1).map((w,i)=>{x+=w;return `<span class="table-col-grip" data-table-axis="col" data-track="${i}" style="left:${x/e.w*100}%" title="Arrastra para ajustar las columnas" aria-label="Ajustar ancho de columnas ${i+1} y ${i+2}"></span>`}).join('')+tracks.rows.slice(0,-1).map((h,i)=>{y+=h;return `<span class="table-row-grip" data-table-axis="row" data-track="${i}" style="top:${y/e.h*100}%" title="Arrastra para ajustar las filas" aria-label="Ajustar alto de filas ${i+1} y ${i+2}"></span>`}).join('');
}
function tableCellAt(e,x,y){
 const tracks=tableTracks(e),index=(values,position)=>{let edge=0;for(let i=0;i<values.length;i++){edge+=values[i];if(position<edge)return i}return values.length-1};
 return {row:index(tracks.rows,Math.max(0,y)),col:index(tracks.cols,Math.max(0,x))};
}
function localDelta(dx,dy,angle){const r=angle*Math.PI/180;return {x:dx*Math.cos(r)+dy*Math.sin(r),y:-dx*Math.sin(r)+dy*Math.cos(r)}}
function beginTableTrackResize(event,node,e,axis,index){
 showTransformFeedback(event,dimensionsText(e));const original=tableTracks(e)[axis==='col'?'cols':'rows'],start={x:event.clientX,y:event.clientY},k=scale();let moved=false;
 node.setPointerCapture(event.pointerId);
 node.onpointermove=ev=>{const dx=ev.clientX-start.x,dy=ev.clientY-start.y;if(!moved&&Math.hypot(dx,dy)<3)return;if(!moved){checkpoint();moved=true}const delta=localDelta(dx/k,dy/k,e.rotation||0);resizeTableTrack(e,axis,index,axis==='col'?delta.x:delta.y,original);node.innerHTML=elementContent(e);showTransformFeedback(ev,`${axis==='col'?'Columna':'Fila'} ${+(tableTracks(e)[axis==='col'?'cols':'rows'][index]).toFixed(2)} mm · ${dimensionsText(e)}`)};
 const finish=()=>{hideTransformFeedback();node.onpointermove=null;node.onpointerup=null;node.onpointercancel=null;if(moved){render();persist()}};
 node.onpointerup=finish;node.onpointercancel=finish;
}
function tableProperties(e){
 return `<div class="table-properties"><div class="two"><label>Filas<input data-table-dimension="rows" type="number" min="1" max="10" value="${e.rows}"></label><label>Columnas<input data-table-dimension="cols" type="number" min="1" max="10" value="${e.cols}"></label></div><label class="field"><input type="checkbox" data-prop="header" ${e.header?'checked':''}> Primera fila como encabezado</label><label class="field">Tamaño del texto (mm)<input type="number" data-prop="size" min=".5" step=".5" value="${e.size}"></label><div class="two"><label>Alineación<select data-prop="align">${['left','center','right','justify'].map((a,i)=>`<option value="${a}" ${(e.align||'left')===a?'selected':''}>${['Izquierda','Centro','Derecha','Justificado'][i]}</option>`).join('')}</select></label><label>Vertical<select data-prop="valign">${['top','middle','bottom'].map((a,i)=>`<option value="${a}" ${(e.valign||'middle')===a?'selected':''}>${['Arriba','Centro','Abajo'][i]}</option>`).join('')}</select></label></div><label>Contenido de las celdas</label><div class="table-cell-scroll"><div class="table-cell-grid" style="grid-template-columns:repeat(${e.cols},minmax(88px,1fr))">${e.cells.map((cells,r)=>cells.map((content,c)=>`<textarea data-table-cell="${r},${c}" aria-label="Fila ${r+1}, columna ${c+1}" placeholder="Fila ${r+1}, col. ${c+1}" rows="2">${esc(content)}</textarea>`).join('')).join('')}</div></div><p class="small">Puedes usar campos CSV como {{producto}} dentro de las celdas. Doble clic en una celda para editarla en el lienzo. Arrastra las líneas interiores para cambiar el ancho de las columnas o el alto de las filas.</p></div>`;
}
function wireTableProperties(e){
 const root=$('#properties');
 root.querySelectorAll('[data-table-dimension]').forEach(input=>input.onchange=()=>{const n=+input.value;if(!Number.isInteger(n)||n<1||n>10){toast('Usa de 1 a 10 filas y columnas.');renderProperties();return}change(()=>resizeTable(e,input.dataset.tableDimension==='rows'?n:e.rows,input.dataset.tableDimension==='cols'?n:e.cols))});
 root.querySelectorAll('[data-table-cell]').forEach(input=>input.onchange=()=>{const [r,c]=input.dataset.tableCell.split(',').map(Number);if(e.cells[r][c]===input.value)return;checkpoint();e.cells[r][c]=input.value;const node=$(`[data-id="${e.id}"]`);if(node)node.innerHTML=elementContent(e);persist();$('#undo').disabled=!history.length;$('#redo').disabled=!future.length});
}
function textBorderMetrics(e){
 if(e.type!=='text'||!e.border)return {stroke:0,inset:0};
 const stroke=Math.min(e.borderWidth??.3,e.w/4,e.h/4);
 return {stroke,inset:Math.min(stroke+.8,e.w/3,e.h/3)};
}
function textLayoutStyle(e){const {inset}=textBorderMetrics(e);return inset?{...e,w:e.w-2*inset,h:e.h-2*inset}:e}
function textBoxSVG(e,text){
 const {stroke,inset}=textBorderMetrics(e);if(!stroke)return textSVG(e,text);
 return `<g data-text-content="true" transform="translate(${inset} ${inset})">${textSVG(textLayoutStyle(e),text)}</g><rect data-text-border="true" x="${stroke/2}" y="${stroke/2}" width="${e.w-stroke}" height="${e.h-stroke}" fill="none" stroke="${esc(e.borderColor||'#000000')}" stroke-width="${stroke}"/>`;
}
function validateTextBorder(e){
 if(e.type!=='text')return;
 if((e.border!==undefined&&typeof e.border!=='boolean')||(e.borderWidth!==undefined&&(!Number.isFinite(e.borderWidth)||e.borderWidth<.1||e.borderWidth>3))||(e.borderColor!==undefined&&(typeof e.borderColor!=='string'||!/^#[0-9a-f]{6}$/i.test(e.borderColor))))throw Error('Borde de texto inválido.');
}
function textBorderProperties(e){
 return `<fieldset class="text-border-properties"><legend>Borde del cuadro</legend><label class="field"><input type="checkbox" data-prop="border" ${e.border?'checked':''}> Mostrar borde</label><div class="two"><label>Grosor (mm)<input data-prop="borderWidth" type="number" min=".1" max="3" step=".1" value="${e.borderWidth??.3}" ${e.border?'':'disabled'}></label><label>Color del borde<input data-prop="borderColor" type="color" value="${e.borderColor||'#000000'}" ${e.border?'':'disabled'}></label></div></fieldset>`;
}
function textSVG(e,text){
 const offset=textVerticalOffset(e,text),align=e.align||'left',x=align==='center'?e.w/2:align==='right'?e.w:0;
 return `<svg width="${e.w}" height="${e.h}" viewBox="0 0 ${e.w} ${e.h}" overflow="hidden"><g font-family="${esc(e.font||'Arial')}" font-size="${e.size}" font-weight="${e.bold?700:400}" fill="${esc(e.color)}">${textLines(e,text).map((line,i)=>{
  const y=offset+e.size*.88+i*e.size*1.2;
  if(align==='justify'&&!line.last&&line.text.includes(' ')){
   const words=line.text.split(' '),gap=Math.max(0,(e.w-words.reduce((n,w)=>n+measureText(w,e),0))/(words.length-1));let pos=0;
   return words.map(w=>{const out=`<text x="${pos}" y="${y}">${esc(w)}</text>`;pos+=measureText(w,e)+gap;return out}).join('');
  }
  return `<text x="${x}" y="${y}" text-anchor="${align==='center'?'middle':align==='right'?'end':'start'}">${esc(line.text)}</text>`;
 }).join('')}</g></svg>`;
}
function svgContent(e,row,index){if(e.type==='table')return tableSVG(e,row,index);const text=val(e.text,row,index);if(e.type==='barcode'){let b=barcode(e,text);return b.error?`<text x="0" y="3" font-size="2" fill="#b34c3b">${esc(b.error)}</text>`:`<svg width="${e.w}" height="${e.h}" viewBox="0 0 ${e.w} ${e.h}">${b.svg.replace('<svg ',`<svg width="${e.w}" height="${e.h}" `)}</svg>`}if(e.type==='image')return `<image width="${e.w}" height="${e.h}" href="${esc(e.src)}" preserveAspectRatio="xMidYMid meet"/>`;if(e.type==='rect')return `<rect width="${e.w}" height="${e.h}" fill="${e.fill?esc(e.color):'none'}" stroke="${esc(e.color)}" stroke-width=".35"/>`;if(e.type==='line')return `<rect width="${e.w}" height="${e.h}" fill="${esc(e.color)}"/>`;return textBoxSVG(e,text)}
function svgDoc(doc=state,row=rows[record]||{},index=record){return `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.w}mm" height="${doc.h}mm" viewBox="0 0 ${doc.w} ${doc.h}" overflow="hidden"><rect width="100%" height="100%" fill="${esc(doc.bg)}"/>${doc.elements.map(e=>`<g transform="translate(${e.x} ${e.y}) rotate(${e.rotation||0} ${e.w/2} ${e.h/2})">${svgContent(e,row,index)}</g>`).join('')}</svg>`}
function rotatedElementBounds(e){
 const radians=(e.rotation||0)*Math.PI/180,c=Math.abs(Math.cos(radians)),s=Math.abs(Math.sin(radians)),w=e.w*c+e.h*s,h=e.w*s+e.h*c,cx=e.x+e.w/2,cy=e.y+e.h/2;
 return {left:cx-w/2,top:cy-h/2,right:cx+w/2,bottom:cy+h/2};
}
function editingBounds(doc){
 let left=0,top=0,right=doc.w,bottom=doc.h;
 for(const e of doc.elements){const b=rotatedElementBounds(e);left=Math.min(left,b.left);top=Math.min(top,b.top);right=Math.max(right,b.right);bottom=Math.max(bottom,b.bottom)}
 return {left,top,right,bottom,w:right-left,h:bottom-top};
}
function canvasStage(doc,k){
 const bounds=editingBounds(doc),padding=40;
 return {width:bounds.w*k+2*padding,height:bounds.h*k+2*padding,left:-bounds.left*k+padding,top:-bounds.top*k+padding};
}
function updateCanvasStage(k){
 const stage=canvasStage(state,k),wrap=$('#canvas-stage'),board=$('#board'),ruler=$('#top-ruler'),dimension=$('#dimension');
 wrap.style.width=stage.width+'px';wrap.style.height=stage.height+'px';board.style.left=stage.left+'px';board.style.top=stage.top+'px';
 ruler.style.left=stage.left+'px';ruler.style.width=state.w*k+'px';ruler.style.right='auto';ruler.style.top='-20px';
 dimension.style.left=stage.left+'px';dimension.style.width=state.w*k+'px';dimension.style.top=(stage.height+8)+'px';dimension.style.bottom='auto';
}
function viewBounds(){
 const area=$('#canvas-area'),style=typeof getComputedStyle==='function'?getComputedStyle(area):null;
 const padding=(key,fallback)=>style?parseFloat(style[key])||0:fallback;
 const controls=80;const width=area.clientWidth-padding('paddingLeft',35)-padding('paddingRight',35)-controls;
 const height=(area.clientHeight??520)-padding('paddingTop',28)-padding('paddingBottom',24)-($('#canvas-caption')?.offsetHeight??12)-($('#canvas-hint')?.offsetHeight??24)-92-(controls-20);
 return {width:Math.max(1,width),height:Math.max(1,height)};
}
function fittedScale(doc,bounds,mode='screen'){const width=bounds.width/doc.w;return Math.max(.001,mode==='width'?width:Math.min(width,bounds.height/doc.h))}
function scale(){const bounds=viewBounds(),extent=editingBounds(state);return (fitWidth?fittedScale(state,bounds,'width'):fitScreen?fittedScale(extent,bounds):Math.min(5.1,fittedScale(state,bounds)))*zoom}
function applyGrid(visible,k=scale()){$('#board').classList.toggle('show-grid',!!visible);$('#board').style.setProperty('--grid-step',`${5*k}px`)}
function elementContent(e){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${e.w} ${e.h}" width="100%" height="100%">${svgContent(e,rows[record]||{},record)}</svg>${e.type==='table'?tableHandles(e)+cellSelectionMarkup(e):''}<button type="button" class="rotate-handle ${e.type==='table'?'table-rotation':''}" title="Arrastra para girar; toca para girar 90°" aria-label="Girar elemento en el lienzo">↻</button><span class="resize-handle" title="Arrastra para cambiar el tamaño" aria-label="Redimensionar elemento"></span>`}
function fitTextToSticker(e,doc,row={},index=0){
 const lines=val(e.text,row,index).split('\n'),longest=Math.max(...lines.map(t=>measureText(t,e)));
 if(!longest)return null;
 const angle=normalizedAngle(e.rotation||0),quarter=angle===90||angle===270;
 const availableWidth=(quarter?doc.h:doc.w)*.9,availableHeight=(quarter?doc.w:doc.h)*.9;
 const size=Math.min(e.size*availableWidth/longest,availableHeight/(1.2*lines.length)),h=size*1.2*lines.length,w=availableWidth;
 const fitted={x:(doc.w-w)/2,w,size,h,y:quarter?(doc.h-h)/2:Math.max(doc.h*.05,Math.min(e.y,doc.h*.95-h)),rotation:angle};
 if(e.border)fitted.size=fitTextToBox({...e,...fitted},row,index)?.size??size;
 return fitted;
}
// Fit font size inside the existing box, preserving position, extent and rotation.
function fitTextToBox(e,row={},index=0){
 e=textLayoutStyle(e);
 const lines=val(e.text,row,index).split('\n'),longest=Math.max(...lines.map(text=>measureText(text,e)));
 if(!longest)return null;
 let size=Math.min(e.size*e.w/longest,e.h/(1.2*lines.length));
 // Browser font metrics round sizes; leave a tiny guard against an extra wrapped line.
 for(let i=0;i<3;i++){const width=Math.max(...lines.map(text=>measureText(text,{...e,size})));if(width<=e.w-.001)break;size*=(e.w-Math.min(.01,e.w*.001))/width}
 return {size};
}
function rotationFromPointer(original,start,current,snap=false){
 const degrees=original+(current-start)*180/Math.PI;
 return normalizedAngle(Math.round(degrees/(snap?15:1))*(snap?15:1));
}
function showTransformFeedback(event,text){
 const badge=$('#transform-feedback');badge.textContent=text;badge.hidden=false;
 const width=badge.offsetWidth,height=badge.offsetHeight;
 badge.style.left=Math.max(8,Math.min(event.clientX+16,window.innerWidth-width-8))+'px';
 badge.style.top=Math.max(8,Math.min(event.clientY+18,window.innerHeight-height-8))+'px';
}
function hideTransformFeedback(){$('#transform-feedback').hidden=true}
function dimensionsText(e){return `${+e.w.toFixed(2)} × ${+e.h.toFixed(2)} mm`}
function beginElementRotation(event,node,e){
 event.preventDefault();finishInlineEdit(true,false);
 const rect=node.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,original=e.rotation||0,start=Math.atan2(event.clientY-cy,event.clientX-cx),point={x:event.clientX,y:event.clientY};let moved=false;
 node.setPointerCapture(event.pointerId);
 showTransformFeedback(event,`${normalizedAngle(original)}°`);
 node.onpointermove=ev=>{
  if(!moved&&Math.hypot(ev.clientX-point.x,ev.clientY-point.y)<3)return;
  if(!moved){checkpoint();moved=true}
  e.rotation=rotationFromPointer(original,start,Math.atan2(ev.clientY-cy,ev.clientX-cx),ev.shiftKey);
  node.style.transform=`rotate(${e.rotation}deg)`;showTransformFeedback(ev,`${e.rotation}°`);
 };
 const finish=ev=>{
  node.onpointermove=null;node.onpointerup=null;node.onpointercancel=null;hideTransformFeedback();
  if(!moved&&ev.type!=='pointercancel'){checkpoint();e.rotation=normalizedAngle(original+90);moved=true}
  render();if(moved)persist();
 };
 node.onpointerup=finish;node.onpointercancel=finish;
}
function orientLabel(doc,direction,rotateContent=true){
 if(!['portrait','landscape'].includes(direction))throw Error('Orientación no válida.');
 if(doc.w===doc.h||(direction==='portrait'?doc.h>doc.w:doc.w>doc.h))return false;
 const oldW=doc.w,oldH=doc.h,clockwise=direction==='portrait';
 if(rotateContent)for(const e of doc.elements){
  const cx=e.x+e.w/2,cy=e.y+e.h/2;
  e.x=(clockwise?oldH-cy:cy)-e.w/2;
  e.y=(clockwise?cx:oldW-cx)-e.h/2;
  e.rotation=(((e.rotation||0)+(clockwise?90:-90))%360+540)%360-180;
 }
 doc.w=oldH;doc.h=oldW;return true;
}
function centeredPosition(e,w,h){return {x:(w-e.w)/2,y:(h-e.h)/2}}
function resizedBounds(start,dx,dy,angle=0){
 const rad=angle*Math.PI/180,c=Math.cos(rad),sn=Math.sin(rad),localX=dx*c+dy*sn,localY=-dx*sn+dy*c;
 const w=Math.max(1,Math.round((start.w+localX)*2)/2),h=Math.max(.5,Math.round((start.h+localY)*2)/2),dw=w-start.w,dh=h-start.h;
 return {w,h,x:start.x+(c*dw-sn*dh-dw)/2,y:start.y+(sn*dw+c*dh-dh)/2};
}
function finishInlineEdit(commit=true,redraw=true){
 if(!activeEditor)return;const {input,e,original,cell}=activeEditor;activeEditor=null;
 input.onblur=null;const value=input.value;input.remove();
 if(commit&&value!==original){checkpoint();if(cell)e.cells[cell.row][cell.col]=value;else e.text=value;persist()}
 if(redraw)render();else{const node=$(`[data-id="${e.id}"]`);if(node){node.classList.remove('editing','editing-cell');node.innerHTML=elementContent(e)}}
}
function startInlineEdit(e,initial,cell=null){
 if(e.type!=='text'&&!(e.type==='table'&&cell))return;finishInlineEdit();selected=e.id;activeCell=cell?{id:e.id,...cell}:null;render();
 const node=$(`[data-id="${e.id}"]`),k=scale(),input=document.createElement('textarea'),box=cell?tableCellBox(e,cell.row,cell.col):null;
 const style=cell?cellTextStyle(e,cell.row,cell.col):textLayoutStyle(e);
 const original=cell?e.cells[cell.row][cell.col]:e.text;
 input.className=cell?'inline-text inline-cell':'inline-text';input.setAttribute('aria-label',cell?`Editar fila ${cell.row+1}, columna ${cell.col+1} en el lienzo`:'Editar texto en el lienzo');input.value=initial===undefined?original:initial;
 input.style.cssText=`font-family:${style.font||'Arial'};font-size:${style.size*k}px;font-weight:${style.bold?700:400};line-height:1.2;color:${style.color};text-align:${style.align||'left'}`;
 if(box){input.style.inset='auto';input.style.left=(box.x+box.w/2-style.w/2)*k+'px';input.style.top=(box.y+box.h/2-style.h/2)*k+'px';input.style.transform=`rotate(${style.textRotation}deg)`;input.style.transformOrigin='center';input.style.width=style.w*k+'px';input.style.height=style.h*k+'px'}
 if(!cell&&e.border){const {inset}=textBorderMetrics(e);input.style.inset=inset*k+'px';input.style.width=style.w*k+'px';input.style.height=style.h*k+'px'}
 node.classList.add(cell?'editing-cell':'editing');node.append(input);activeEditor={input,e,original,cell};
 input.onpointerdown=ev=>ev.stopPropagation();input.ondblclick=ev=>ev.stopPropagation();
 input.onkeydown=ev=>{
  ev.stopPropagation();if(ev.key==='Escape'){ev.preventDefault();finishInlineEdit(false)}
  else if(ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey)){ev.preventDefault();finishInlineEdit()}
  else if(cell&&ev.key==='Tab'){ev.preventDefault();const total=e.rows*e.cols,next=(cell.row*e.cols+cell.col+(ev.shiftKey?-1:1)+total)%total;finishInlineEdit();startInlineEdit(e,undefined,{row:Math.floor(next/e.cols),col:next%e.cols})}
 };
 input.oninput=()=>input.style.paddingTop=textVerticalOffset(style,input.value)*k+'px';input.oninput();input.onblur=()=>finishInlineEdit();input.focus();if(initial===undefined)input.select();else input.setSelectionRange(input.value.length,input.value.length);
}
function render(){finishInlineEdit(true,false);let k=scale();updateCanvasStage(k);$('#board').style.width=state.w*k+'px';$('#board').style.height=state.h*k+'px';$('#board').style.background=state.bg;applyGrid($('#grid').checked,k);$('#board').innerHTML=state.elements.map(e=>`<div class="element ${e.id===selected?'selected':''} ${e.type==='text'&&e.border?'bordered-text':''}" data-id="${e.id}" style="left:${e.x*k}px;top:${e.y*k}px;width:${e.w*k}px;height:${e.h*k}px;transform:rotate(${e.rotation||0}deg)">${elementContent(e)}</div>`).join('');$('#dimension').textContent=`${state.w} × ${state.h} mm`;$('#canvas-title').textContent=state.name.toUpperCase();$('#top-ruler').innerHTML=Array.from({length:11},(_,i)=>`<span>${+(state.w*i/10).toFixed(1)}</span>`).join('');$('#element-count').textContent=state.elements.length+' elementos';document.querySelectorAll('[data-orientation]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.orientation==='portrait'?state.h>state.w:state.w>=state.h));button.disabled=state.w===state.h});$('#width').value=state.w;$('#height').value=state.h;$('#background').value=state.bg;$('#bgcode').textContent=state.bg.toUpperCase();$('#docname').value=state.name;$('#size').value=[...$('#size').options].some(o=>o.value===state.w+','+state.h)?state.w+','+state.h:'custom';$('#zoomval').textContent=fitWidth?'Ancho':fitScreen?'Encajar':Math.round(zoom*100)+'%';$('#fit-screen').setAttribute('aria-pressed',String(fitScreen));$('#fitwidth').setAttribute('aria-pressed',String(fitWidth));$('#canvas-area').classList.toggle('fit-width',fitWidth);$('#canvas-area').classList.toggle('fit-screen',fitScreen);$('#undo').disabled=!history.length;$('#redo').disabled=!future.length;renderProperties();scheduleViewSave()}
function renderLeft(){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));const root=$('#left-content');if(tab==='templates'){root.innerHTML=`<h2>Un buen comienzo.</h2><p class="subtitle">Elige una plantilla y hazla tuya.</p><div class="search"><input id="search" placeholder="Buscar plantillas…" value="${esc(query)}"></div><div class="filters">${['Todas','Mis diseños','Básicas','Producto','Logística'].map(f=>`<button data-filter="${f}" class="${filter===f?'active':''}">${f}</button>`).join('')}</div><div id="template-list"></div><button class="new-template" id="blank">＋ Crear desde cero</button>`;renderTemplateList();$('#search').oninput=e=>{query=e.target.value;renderTemplateList();persistView()};root.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderLeft();persistView()});$('#blank').onclick=()=>{if(!confirm('¿Crear una etiqueta vacía? El diseño actual se reemplazará.'))return;change(()=>{delete state.savedId;state.elements=[];state.template='blank';state.name='Etiqueta sin título';selected=null});renderLeft()}}
if(tab==='elements'){root.innerHTML=`<h2>Dale forma.</h2><p class="subtitle">Añade un elemento y edita sus propiedades a la derecha.</p><div class="tool-buttons"><button data-add="text"><strong>T</strong>Texto</button><button data-add="barcode"><strong>▥</strong>Código de barras</button><button data-add="image"><strong>▧</strong>Imagen</button><button data-add="table"><strong>▦</strong>Tabla</button><button data-add="rect"><strong>□</strong>Rectángulo</button><button data-add="line"><strong>―</strong>Línea</button><button data-add="number"><strong>01</strong>Consecutivo</button><button data-add="date"><strong>▣</strong>Fecha actual</button><button data-add="time"><strong>◷</strong>Hora actual</button></div><p class="help">Selecciona cualquier elemento para ajustar su posición, tamaño y contenido.</p>`;root.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addElement(b.dataset.add))}
if(tab==='data'){root.innerHTML=`<h2>Diseña una vez.</h2><p class="subtitle">Imprime una etiqueta por cada fila de tu archivo CSV.</p><button class="primary wide" id="csv">↥ Importar CSV</button><button class="wide" id="csv-example">↓ Descargar ejemplo</button><p class="help">Usa campos como <code>{{producto}}</code> en tus textos. Campos automáticos: <code>{{fecha}}</code> (día/mes/año), <code>{{fecha_iso}}</code>, <code>{{hora}}</code>, <code>{{fecha_hora}}</code> y <code>{{numero}}</code>. No requieren CSV.</p>${rows.length?`<div class="section-label">${rows.length} REGISTROS IMPORTADOS</div><label>Vista previa<select id="record">${rows.map((r,i)=>`<option value="${i}" ${i===record?'selected':''}>Registro ${i+1}: ${esc(Object.values(r)[0])}</option>`).join('')}</select></label><div style="margin-top:20px">${csvFields.map(f=>`<div class="data-row"><span>${esc(f)}</span><code>{{${esc(f)}}}</code></div>`).join('')}</div><button id="clearcsv" class="wide">Quitar datos</button>`:'<div class="empty">Tus datos se procesan en este navegador. No se envían a un servidor.</div>'}`;$('#csv').onclick=()=>pickFile('.csv',async file=>{try{const parsed=parseCSV(await file.text());if(parsed.length<2)throw Error('El CSV debe tener encabezados y al menos una fila.');csvFields=parsed[0].map(x=>x.trim());if(csvFields.some(x=>!x)||new Set(csvFields).size!==csvFields.length)throw Error('Usa encabezados únicos y no vacíos.');rows=parsed.slice(1).filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(csvFields.map((f,i)=>[f,r[i]||''])));if(rows.length>500)throw Error('Máximo 500 filas por lote.');record=0;renderLeft();render();persistView();toast('CSV importado: '+rows.length+' registros')}catch(e){rows=[];toast(e.message)}});$('#csv-example').onclick=()=>download('ejemplo-etiquetas.csv','producto,precio,codigo\nJabón de oliva,149.00,7501234567893\nVela aromática,249.00,7501234567886','text/csv');if(rows.length){$('#record').onchange=e=>{record=+e.target.value;render();persistView()};$('#clearcsv').onclick=()=>{rows=[];csvFields=[];renderLeft();render();persistView()}}}
if(tab==='library'){
 const library=getLibrary(),linked=library.some(d=>d.savedId===state.savedId);
 root.innerHTML=`<h2>Tus diseños.</h2><p class="subtitle">Cambia el nombre aquí. Tus diseños también aparecen en Plantillas.</p><button id="store-design" class="primary wide">${linked?'✓ Guardar cambios':'＋ Guardar diseño actual'}</button>${linked?'<button id="copy-design" class="wide">＋ Guardar como copia</button>':''}${library.length?library.map(d=>`<div class="saved-item"><div class="saved-design-info"><label class="sr-only" for="design-${esc(d.savedId)}">Nombre del diseño</label><input id="design-${esc(d.savedId)}" data-design-name="${esc(d.savedId)}" maxlength="100" value="${esc(d.name)}" aria-label="Renombrar diseño ${esc(d.name)}"><small>${d.w} × ${d.h} mm${state.savedId===d.savedId?' · Abierto':''}</small></div><button data-load="${esc(d.savedId)}" title="Abrir diseño" aria-label="Abrir ${esc(d.name)}">↗</button><button data-remove="${esc(d.savedId)}" title="Eliminar diseño" aria-label="Eliminar ${esc(d.name)}">×</button></div>`).join(''):'<div class="empty">Tu próxima idea empieza aquí.</div>'}`;
 $('#store-design').onclick=()=>saveLibraryDesign();if($('#copy-design'))$('#copy-design').onclick=()=>saveLibraryDesign(true);
 root.querySelectorAll('[data-load]').forEach(button=>button.onclick=()=>loadLibraryDesign(button.dataset.load));
 root.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>deleteLibraryDesign(button.dataset.remove));
 root.querySelectorAll('[data-design-name]').forEach(input=>{input.onchange=()=>{if(!renameSavedDesign(input.dataset.designName,input.value))input.value=getLibrary().find(d=>d.savedId===input.dataset.designName)?.name||''};input.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();input.blur()}}});
}}
function getLibrary(){
 try{const stored=JSON.parse(localStorage.getItem('labela-library'))||[];if(!Array.isArray(stored))return [];return stored.map((doc,index)=>{const value=validate(doc);if(typeof value.savedId!=='string'||!value.savedId||!/^[-a-zA-Z0-9_]+$/.test(value.savedId))value.savedId='legacy-'+index;return value})}catch{return []}
}
function writeLibrary(library){localStorage.setItem('labela-library',JSON.stringify(library))}
function newDesignId(){return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'design-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}
function refreshDesignNames(){
 const library=getLibrary();document.querySelectorAll('[data-saved-name]').forEach(node=>{const doc=library.find(d=>d.savedId===node.dataset.savedName);if(doc)node.textContent=doc.name});
 document.querySelectorAll('[data-design-name]').forEach(input=>{const doc=library.find(d=>d.savedId===input.dataset.designName);if(doc&&input!==document.activeElement)input.value=doc.name});
}
function saveLibraryDesign(asCopy=false){
 finishInlineEdit(true,false);const library=getLibrary(),index=asCopy?-1:library.findIndex(d=>d.savedId===state.savedId),id=index>=0?state.savedId:newDesignId(),doc={...clone(state),savedId:id};
 try{if(index>=0)library[index]=doc;else library.push(doc);writeLibrary(library);state.savedId=id;persist();renderLeft();toast(index>=0?'Diseño actualizado':'Diseño guardado')}catch{toast('Sin espacio local. Descarga el diseño.')}
}
function renameSavedDesign(id,name){
 name=String(name).trim().slice(0,100);if(!name){toast('Escribe un nombre para el diseño.');return false}
 const library=getLibrary(),doc=library.find(d=>d.savedId===id);if(!doc)return false;
 try{doc.name=name;writeLibrary(library);if(state.savedId===id){checkpoint();state.name=name;render();persist()}refreshDesignNames();return true}catch{toast('No se pudo guardar el nombre.');return false}
}
function renameCurrentDesign(name){
 const clean=String(name).trim().slice(0,100);if(!clean){toast('Escribe un nombre para el diseño.');$('#docname').value=state.name;return}
 change(()=>state.name=clean);refreshDesignNames();
}
function loadLibraryDesign(id){
 finishInlineEdit(true,false);persist();const doc=getLibrary().find(d=>d.savedId===id);if(!doc)return;
 change(()=>{state=clone(doc);selected=null;activeCell=null;zoom=1;fitScreen=true;fitWidth=false;seq=Math.max(seq,...state.elements.map(e=>e.id))});const area=$('#canvas-area');if(area){area.scrollTop=0;area.scrollLeft=0}renderLeft();persistView();
}
function deleteLibraryDesign(id){
 try{writeLibrary(getLibrary().filter(d=>d.savedId!==id));if(state.savedId===id){delete state.savedId;persist()}renderLeft()}catch{toast('No se pudo eliminar el diseño.')}
}
function savedTemplateCards(library){
 return library.map(doc=>`<button class="template-card ${state.savedId===doc.savedId?'selected':''}" data-saved-template="${esc(doc.savedId)}"><div class="preview">${svgDoc(doc,{},0)}</div><b data-saved-name="${esc(doc.savedId)}">${esc(doc.name)}</b><small>${doc.w} × ${doc.h} mm · Mi diseño</small></button>`).join('');
}
function renderTemplateList(){
 const personal=(filter==='Todas'||filter==='Mis diseños')?getLibrary().filter(d=>d.name.toLowerCase().includes(query.toLowerCase())):[],builtins=templates.filter(t=>(filter==='Todas'||t.category===filter)&&t.name.toLowerCase().includes(query.toLowerCase()));
 $('#template-list').innerHTML=(personal.length?'<div class="template-section">MIS DISEÑOS</div>'+savedTemplateCards(personal):'')+(builtins.length?(personal.length?'<div class="template-section">PLANTILLAS</div>':'')+builtins.map(t=>`<button class="template-card ${!state.savedId&&state.template===t.id?'selected':''}" data-template="${t.id}"><div class="preview">${svgDoc({w:t.w,h:t.h,bg:'#ffffff',elements:t.elements()}, {},0)}</div><b>${t.name}</b><small>${t.w} × ${t.h} mm · ${t.category}</small></button>`).join(''):'')+(!personal.length&&!builtins.length?'<div class="empty">No hay diseños para esta búsqueda.</div>':'');
 document.querySelectorAll('[data-saved-template]').forEach(button=>button.onclick=()=>loadLibraryDesign(button.dataset.savedTemplate));
 document.querySelectorAll('[data-template]').forEach(button=>button.onclick=()=>{const t=templates.find(t=>t.id===button.dataset.template);if(state.elements.length&&!confirm('¿Aplicar esta plantilla? Se reemplazará el diseño actual. Puedes deshacer el cambio.'))return;finishInlineEdit();change(()=>{state={name:t.name,w:t.w,h:t.h,bg:'#ffffff',template:t.id,elements:t.elements()};selected=null;activeCell=null;zoom=1});renderLeft()});
}
const MM_PER_PT=25.4/72;
function textSizeInPoints(e){return Math.round(e.size/MM_PER_PT*10)/10}
function setTextSize(e,points){
 if(!Number.isFinite(points)||points<1||points>1000)return false;
 e.size=points*MM_PER_PT;
 for(let i=0;i<3;i++){const style=textLayoutStyle(e),{inset}=textBorderMetrics(e);e.h=Math.max(e.h,textLines(style,val(e.text)).length*e.size*1.2+2*inset)}
 return true;
}
function alignmentIcon(align){
 const widths=align==='justify'?[18,18,18,18]:[18,12,18,12];
 return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">${widths.map((w,i)=>{const x=align==='center'?(24-w)/2:align==='right'?21-w:3;return `<path d="M${x} ${5+i*4.5}h${w}"/>`}).join('')}</svg>`;
}
function verticalAlignmentIcon(align){
 const y=align==='top'?6:align==='middle'?10:14;
 return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 2h18M3 22h18" opacity=".4"/><path d="M5 ${y}h14M5 ${y+4}h14"/></svg>`;
}
function renderTextToolbar(){
 const target=formattingTarget(),e=target?.e,cell=target?.cell,style=target?.style,root=$('#text-toolbar'),disabled=!target;
 const label=cell?.scope==='row'?`Fila ${cell.row+1}`:cell?.scope==='col'?`Columna ${String.fromCharCode(65+cell.col)}`:cell?`Celda ${cell.row+1} · ${cell.col+1}`:e?.type==='table'?'Tabla completa':'Texto';
 const angle=disabled?0:normalizedAngle(e.type==='table'?(style.textRotation||0):(e.rotation||0));
 root.innerHTML=`<span class="text-toolbar-label">${label}</span><select id="text-font" aria-label="Tipografía del texto" title="Tipografía" ${disabled?'disabled':''}>${['Arial','Georgia','Courier New'].map(font=>`<option ${style?.font===font?'selected':''}>${font}</option>`).join('')}</select><div class="font-size-group"><button id="font-smaller" aria-label="Reducir tamaño de letra" title="Reducir tamaño de letra (1 pt)" ${disabled?'disabled':''}>A<small>−</small></button><label class="points-input"><span class="sr-only">Tamaño de letra en puntos</span><input id="font-points" type="number" min="1" max="1000" step="1" value="${disabled?'':textSizeInPoints(style)}" placeholder="—" ${disabled?'disabled':''}><span>pt</span></label><button id="font-larger" aria-label="Aumentar tamaño de letra" title="Aumentar tamaño de letra (1 pt)" ${disabled?'disabled':''}>A<small>+</small></button></div><button id="text-bold" class="bold-button" aria-label="Negrita" title="Negrita" aria-pressed="${!disabled&&!!style.bold}" ${disabled?'disabled':''}>B</button><label class="toolbar-ink" title="Color del texto"><span class="sr-only">Color del texto</span><input id="text-ink" type="color" value="${style?.color||'#000000'}" ${disabled?'disabled':''}></label><span class="toolbar-divider"></span><div class="text-alignment" role="group" aria-label="Alineación del texto">${['left','center','right','justify'].map((align,i)=>`<button data-text-align="${align}" title="${['Alinear a la izquierda','Centrar texto','Alinear a la derecha','Justificar texto'][i]}" aria-label="${['Alinear a la izquierda','Centrar texto','Alinear a la derecha','Justificar texto'][i]}" aria-pressed="${!disabled&&(style.align||'left')===align}" ${disabled?'disabled':''}>${alignmentIcon(align)}</button>`).join('')}</div><span class="toolbar-divider"></span><div class="text-vertical-alignment" role="group" aria-label="Alineación vertical del texto">${['top','middle','bottom'].map((a,i)=>`<button data-text-valign="${a}" aria-label="${['Alinear arriba','Centrar verticalmente','Alinear abajo'][i]}" title="${['Alinear arriba','Centrar verticalmente','Alinear abajo'][i]}" aria-pressed="${!disabled&&(style.valign||(e.type==='table'?'middle':'top'))===a}" ${disabled?'disabled':''}>${verticalAlignmentIcon(a)}</button>`).join('')}</div><span class="toolbar-divider"></span><div class="text-rotation" role="group" aria-label="Girar texto"><button id="text-turn-left" title="Girar texto 90° a la izquierda" aria-label="Girar texto 90° a la izquierda" ${disabled?'disabled':''}>↶ 90°</button><button id="text-turn-right" title="Girar texto 90° a la derecha" aria-label="Girar texto 90° a la derecha" ${disabled?'disabled':''}>↷ 90°</button><button id="text-turn-reset" title="Restablecer giro del texto a 0°" aria-label="Restablecer giro del texto" ${disabled?'disabled':''}>${angle}°</button></div><span class="toolbar-divider"></span><button id="toolbar-fit-box" title="Ajustar al ancho del cuadro conservando su tamaño; limita la letra al alto disponible" ${disabled?'disabled':''}>↔ Ancho del cuadro</button><button id="toolbar-fit-text" title="${e?.type==='table'?'Ajustar texto al espacio de las celdas':'Ajustar texto al ancho del sticker con 5% de margen a cada lado'}" ${disabled?'disabled':''}>↔ Ajustar texto</button>${cell&&['row','col'].includes(cell.scope)?`<label class="track-size-input">${cell.scope==='row'?'Alto de fila':'Ancho de columna'}<span><input id="range-track-size" type="number" min=".5" max="300" step=".5" value="${+tableTracks(e)[cell.scope==='row'?'rows':'cols'][cell.scope==='row'?cell.row:cell.col].toFixed(2)}"> mm</span></label><button id="range-add-track">+ ${cell.scope==='row'?'Fila':'Columna'}</button><button id="range-delete-track" title="Eliminar ${cell.scope==='row'?'fila':'columna'} seleccionada">Eliminar ${cell.scope==='row'?'fila':'columna'}</button>`:''}${cell?'<button id="format-entire-table" title="Aplicar los próximos formatos a toda la tabla">Toda la tabla</button>':''}${disabled?'<span class="text-toolbar-help">Selecciona un texto o una celda</span>':''}`;
 root.onpointerdown=()=>{if(activeEditor)finishInlineEdit(true,false)};
 if(disabled)return;
 const set=(key,value)=>change(()=>applyTextFormat(target,key,value));
 $('#text-font').onchange=event=>set('font',event.target.value);
 $('#text-ink').onchange=event=>set('color',event.target.value);
 $('#font-smaller').onclick=()=>set('size',Math.max(1,Math.round(textSizeInPoints(style))-1)*MM_PER_PT);
 $('#font-larger').onclick=()=>set('size',Math.min(1000,Math.round(textSizeInPoints(style))+1)*MM_PER_PT);
 $('#font-points').onchange=event=>{const points=+event.target.value;if(!Number.isFinite(points)||points<1||points>1000){toast('El tamaño debe estar entre 1 y 1000 pt.');renderTextToolbar();return}set('size',points*MM_PER_PT)};
 $('#text-bold').onclick=()=>set('bold',!style.bold);
 root.querySelectorAll('[data-text-align]').forEach(button=>button.onclick=()=>set('align',button.dataset.textAlign));
 root.querySelectorAll('[data-text-valign]').forEach(button=>button.onclick=()=>set('valign',button.dataset.textValign));
 $('#text-turn-left').onclick=()=>change(()=>rotateTextTarget(target,-90));
 $('#text-turn-right').onclick=()=>change(()=>rotateTextTarget(target,90));
 $('#text-turn-reset').onclick=()=>change(()=>rotateTextTarget(target,0,true));
 if(cell&&['row','col'].includes(cell.scope)){const axis=cell.scope,index=axis==='row'?cell.row:cell.col;$('#range-track-size').onchange=event=>{const size=+event.target.value;if(!Number.isFinite(size)||size<.5||size>300){toast('Usa un tamaño entre 0,5 y 300 mm.');renderTextToolbar();return}change(()=>setSingleTrackSize(e,axis,index,size))};$('#range-add-track').onclick=()=>{try{change(()=>mutateTableTrack(e,axis,index+1,'insert'))}catch(error){toast(error.message)}};$('#range-delete-track').onclick=()=>{try{change(()=>mutateTableTrack(e,axis,index,'delete'))}catch(error){toast(error.message)}}}
 if(cell)$('#format-entire-table').onclick=()=>{activeCell=null;render()};
 $('#toolbar-fit-box').onclick=()=>{
  if(e.type==='table')change(()=>tableRangeCells(e,cell).forEach(position=>fitCellText(e,position)));
  else{const fitted=fitTextToBox(e,rows[record]||{},record);if(fitted)change(()=>Object.assign(e,fitted));else toast('Escribe un texto para ajustar su ancho')}
 };
 $('#toolbar-fit-text').onclick=()=>{
  if(e.type==='table')change(()=>{tableRangeCells(e,cell).forEach(position=>fitCellText(e,position))});
  else{const fitted=fitTextToSticker(e,state,rows[record]||{},record);if(fitted)change(()=>Object.assign(e,fitted));else toast('Escribe un texto para ajustar su ancho')}
 };
}
function renderProperties(){renderTextToolbar();const e=state.elements.find(e=>e.id===selected);$('#properties').innerHTML=e?`<section><div class="section-label">${{text:'TEXTO',barcode:'CÓDIGO DE BARRAS',rect:'RECTÁNGULO',image:'IMAGEN',line:'LÍNEA',table:'TABLA'}[e.type]} <span style="float:right">SELECCIONADO</span></div>${['text','barcode'].includes(e.type)?`<label>Contenido<textarea data-prop="text" rows="${e.type==='text'?3:2}">${esc(e.text)}</textarea></label>`:''}${e.type==='barcode'?`<label class="field">Simbología<select data-prop="format"><option value="ean13" ${e.format!=='code39'?'selected':''}>EAN-13</option><option value="code39" ${e.format==='code39'?'selected':''}>Code 39</option></select></label><p class="small">EAN-13: 12 dígitos calculan el verificador. Code 39: letras y números.</p>`:''}<div class="two"><label>X (mm)<input data-prop="x" type="number" step="0.5" value="${e.x}"></label><label>Y (mm)<input data-prop="y" type="number" step="0.5" value="${e.y}"></label></div><div class="two"><label>Ancho (mm)<input data-prop="w" type="number" min=".5" step=".5" value="${e.w}"></label><label>Alto (mm)<input data-prop="h" type="number" min=".2" step=".5" value="${e.h}"></label></div>${e.type==='table'?tableProperties(e):''}${e.type==='text'?textBorderProperties(e):''}${e.type==='text'?`<button class="wide" id="edit-canvas">✎ Editar en el lienzo</button><label class="field">Tipografía<select data-prop="font">${['Arial','Georgia','Courier New'].map(f=>`<option ${e.font===f?'selected':''}>${f}</option>`).join('')}</select></label><label class="field"><input type="checkbox" data-prop="bold" ${e.bold?'checked':''}> Negrita</label>`:''}<div class="two"><label>Rotación °<input data-prop="rotation" type="number" min="-360" max="360" value="${e.rotation||0}"></label><label>Color<input type="color" data-prop="color" value="${e.color}"></label></div>${e.type==='rect'?`<label><input type="checkbox" data-prop="fill" ${e.fill?'checked':''}> Rellenar figura</label>`:''}<div class="two"><button id="center-element" title="Centrar el cuadro horizontal y verticalmente en la etiqueta">Centrar en etiqueta</button><button id="front-element">Al frente</button></div></section>`:`<section><div class="section-label">PROPIEDADES</div><p class="help">Selecciona un elemento de la etiqueta para personalizarlo.</p><button class="wide" id="add-shortcut">＋ Añadir elemento</button></section>`;$('#properties').querySelectorAll('[data-prop]').forEach(input=>input.onchange=()=>{let key=input.dataset.prop,v=input.type==='checkbox'?input.checked:input.type==='number'?+input.value:input.value;if(input.type==='number'&&!Number.isFinite(v))return;if(key==='borderWidth'&&(v<.1||v>3)){toast('El grosor debe estar entre 0,1 y 3 mm.');renderProperties();return}if(['w','h','size'].includes(key))v=Math.max(.2,v);change(()=>{if(e.type==='table'&&CELL_FORMAT_KEYS.includes(key))applyTextFormat({e,cell:null},key,v);else e[key]=v})});if(e){if(e.type==='table')wireTableProperties(e);$('#properties').querySelectorAll('[data-align]').forEach(b=>b.onclick=()=>change(()=>e.align=b.dataset.align));if(e.type==='text'){$('#edit-canvas').onclick=()=>startInlineEdit(e)};$('#center-element').onclick=()=>change(()=>Object.assign(e,centeredPosition(e,state.w,state.h)));$('#front-element').onclick=()=>change(()=>{state.elements=state.elements.filter(x=>x!==e);state.elements.push(e)})}else $('#add-shortcut').onclick=()=>setTab('elements')}
function addElement(type){if(type==='image'){pickFile('image/png,image/jpeg,image/webp',file=>{if(file.size>3e6)return toast('Usa una imagen de hasta 3 MB.');const reader=new FileReader;reader.onload=()=>{change(()=>{let e=el('image',5,5,25,20,'',{src:reader.result});state.elements.push(e);selected=e.id})};reader.readAsDataURL(file)});return}change(()=>{const e=type==='table'?el('table',state.w*.05,state.h*.05,state.w*.9,Math.min(30,state.h*.7),'',{rows:3,cols:2,header:true,cells:[['Campo','Valor'],['Lote','001'],['Producto','Descripción']],size:Math.min(3,state.h*.7/4.5),valign:'middle'}):type==='text'?el('text',5,5,Math.min(65,Math.max(1,state.w-10)),8,'Tu texto aquí',{size:4}):['date','time'].includes(type)?el('text',5,5,Math.min(50,Math.max(1,state.w-10)),8,type==='date'?'{{fecha}}':'{{hora}}',{size:4}):type==='number'?el('text',5,5,30,7,'N.º {{numero}}',{size:4}):type==='barcode'?el('barcode',5,5,Math.min(50,Math.max(1,state.w-10)),15,'7501234567893'):type==='line'?el('line',5,5,Math.min(60,Math.max(1,state.w-10)),.4):el('rect',5,5,25,15);state.elements.push(e);selected=e.id})}
function pickFile(accept,callback){const input=$('#file');input.accept=accept;input.value='';input.onchange=()=>{if(input.files[0])callback(input.files[0])};input.click()}
function download(name,content,type){let url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function parseCSV(text){text=text.replace(/^\uFEFF/,'');const delimiter=(text.split('\n')[0].match(/;/g)||[]).length>(text.split('\n')[0].match(/,/g)||[]).length?';':',';let result=[],row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){let c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===delimiter&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);result.push(row);row=[];cell=''}else cell+=c}if(quoted)throw Error('El CSV contiene comillas sin cerrar.');if(cell||row.length){row.push(cell);result.push(row)}return result}
function validate(d){if(!d||!Array.isArray(d.elements)||d.elements.length>300||!Number.isFinite(d.w)||!Number.isFinite(d.h)||d.w<10||d.h<10||d.w>300||d.h>300||!/^#[0-9a-f]{6}$/i.test(d.bg))throw Error('Archivo de diseño inválido.');d.name=String(d.name||'Diseño importado');const elementIds=new Set();d.elements.forEach((e,i)=>{if(!['text','barcode','image','rect','line','table'].includes(e.type)||!['x','y','w','h','size'].every(k=>Number.isFinite(e[k]))||e.w<=0||e.h<=0||!/^#[0-9a-f]{6}$/i.test(e.color)|| (e.rotation!==undefined&&!Number.isFinite(e.rotation)))throw Error('Elemento inválido en el archivo.');validateTextBorder(e);if(e.type==='image'&&!/^data:image\/(png|jpeg|webp);base64,/.test(e.src))throw Error('Formato de imagen no permitido.');if(e.type==='table'&&(!Number.isInteger(e.rows)||!Number.isInteger(e.cols)||e.rows<1||e.rows>10||e.cols<1||e.cols>10||!Array.isArray(e.cells)||e.cells.length!==e.rows||!e.cells.every(row=>Array.isArray(row)&&row.length===e.cols&&row.every(cell=>typeof cell==='string'))))throw Error('Tabla inválida en el archivo.');if(e.valign!==undefined&&!['top','middle','bottom'].includes(e.valign))throw Error('Alineación vertical inválida.');if(e.type==='table')for(const [key,count] of [['colSizes',e.cols],['rowSizes',e.rows]])if(e[key]!==undefined&&(!Array.isArray(e[key])||e[key].length!==count||!e[key].every(n=>Number.isFinite(n)&&n>0)||!Number.isFinite(e[key].reduce((a,b)=>a+b,0))))throw Error('Dimensiones de celdas inválidas.');if(e.type==='table'){validateCellFormats(e);if(e.textRotation!==undefined&&![0,90,180,270].includes(e.textRotation))throw Error('Giro de texto de tabla inválido.');}if(e.color.toLowerCase()==='#182c21')e.color='#000000';if(!Number.isInteger(e.id)||e.id<1||elementIds.has(e.id)){let next=i+1;while(elementIds.has(next))next++;e.id=next}elementIds.add(e.id)});return d}
$('#board').ondblclick=event=>{
 const node=event.target.closest('.element');if(!node||event.target.closest('.resize-handle,.rotate-handle,[data-table-axis],[data-table-action],.inline-text'))return;
 const e=state.elements.find(e=>e.id===+node.dataset.id);
 if(e.type==='table'){startInlineEdit(e,undefined,cellFromEvent(e,node,event));
 }else startInlineEdit(e);
};
$('#board').onpointerdown=event=>{
 if(event.button!==0||event.target.closest('.inline-text'))return;
 const control=event.target.closest('[data-table-action]');if(control){event.preventDefault();event.stopPropagation();const parent=control.closest('.element'),table=state.elements.find(e=>e.id===+parent.dataset.id);executeTableControl(control,table,event,parent);return}
 const node=event.target.closest('.element'),track=event.target.closest('[data-table-axis]'),axis=track?.dataset.tableAxis,index=+(track?.dataset.track||0),resizing=!!event.target.closest('.resize-handle'),rotating=!!event.target.closest('.rotate-handle');
 finishInlineEdit(true,false);
 if(!node){selected=null;activeCell=null;render();return}
 const e=state.elements.find(e=>e.id===+node.dataset.id);
 selected=e.id;if(e.type==='table'&&!track&&!resizing&&!rotating)activeCell={id:e.id,...cellFromEvent(e,node,event)};else if(e.type!=='table')activeCell=null;document.querySelectorAll('.table-cell-selection').forEach(mark=>mark.remove());if(e.type==='table')node.insertAdjacentHTML('beforeend',cellSelectionMarkup(e));document.querySelectorAll('.element').forEach(n=>n.classList.toggle('selected',+n.dataset.id===selected));renderProperties();scheduleViewSave();
 if(rotating){beginElementRotation(event,node,e);return}
 if(resizing)showTransformFeedback(event,dimensionsText(e));
 if(track&&e.type==='table'){beginTableTrackResize(event,node,e,axis,index);return}
 const start={px:event.clientX,py:event.clientY,x:e.x,y:e.y,w:e.w,h:e.h},k=scale();let moved=false;
 node.setPointerCapture(event.pointerId);
 node.onpointermove=ev=>{
  const dx=(ev.clientX-start.px)/k,dy=(ev.clientY-start.py)/k;
  if(!moved&&Math.hypot(ev.clientX-start.px,ev.clientY-start.py)<3)return;
  if(!moved){checkpoint();moved=true}
  if(resizing)Object.assign(e,resizedBounds(start,dx,dy,e.rotation||0));
  else{e.x=Math.round((start.x+dx)*2)/2;e.y=Math.round((start.y+dy)*2)/2}
  node.style.left=e.x*k+'px';node.style.top=e.y*k+'px';node.style.width=e.w*k+'px';node.style.height=e.h*k+'px';
  if(resizing){node.innerHTML=elementContent(e);showTransformFeedback(ev,dimensionsText(e))}
 };
 const finish=()=>{hideTransformFeedback();node.onpointermove=null;node.onpointerup=null;node.onpointercancel=null;if(moved){render();persist()}else renderProperties()};
 node.onpointerup=finish;node.onpointercancel=finish;
};
$('#board').onkeydown=event=>{const handle=event.target.closest('.rotate-handle');if(handle&&['Enter',' ','ArrowLeft','ArrowRight','Home'].includes(event.key)){event.preventDefault();event.stopPropagation();const id=+handle.closest('.element').dataset.id,e=state.elements.find(item=>item.id===id);change(()=>e.rotation=event.key==='Home'?0:normalizedAngle((e.rotation||0)+(event.key==='ArrowLeft'?-15:event.key==='ArrowRight'?15:90)));$(`[data-id="${id}"] .rotate-handle`)?.focus();return}const control=event.target.closest('[data-table-action]');if(control&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();const node=control.closest('.element'),e=state.elements.find(e=>e.id===+node.dataset.id);executeTableControl(control,e,null,node)}};
document.querySelectorAll('[data-orientation]').forEach(button=>button.onclick=()=>{
 finishInlineEdit();const direction=button.dataset.orientation;
 if(state.w===state.h||(direction==='portrait'?state.h>state.w:state.w>state.h))return;
 change(()=>{orientLabel(state,direction,$('#rotate-design').checked);zoom=1});
});
$('#fitwidth').onclick=()=>{finishInlineEdit();fitWidth=!fitWidth;fitScreen=false;zoom=1;render()};
$('#fit-screen').onclick=()=>{finishInlineEdit();fitScreen=true;fitWidth=false;zoom=1;render()};
$('#docname').onchange=e=>renameCurrentDesign(e.target.value);$('#size').onchange=e=>{if(e.target.value==='custom')return;const [w,h]=e.target.value.split(',').map(Number);change(()=>{state.w=w;state.h=h})};for(const id of ['width','height'])$('#'+id).onchange=e=>{const v=+e.target.value;if(v<10||v>300){toast('El tamaño debe estar entre 10 y 300 mm.');render();return}change(()=>state[id==='width'?'w':'h']=v)};$('#background').onchange=e=>change(()=>state.bg=e.target.value);$('#grid').onchange=e=>{applyGrid(e.target.checked);persistView()};$('#zoomin').onclick=()=>{fitWidth=false;fitScreen=false;zoom=Math.min(2,zoom+.1);render()};$('#zoomout').onclick=()=>{fitWidth=false;fitScreen=false;zoom=Math.max(.3,zoom-.1);render()};$('#undo').onclick=()=>stepHistory('undo');$('#redo').onclick=()=>stepHistory('redo');$('#duplicate').onclick=()=>{const e=state.elements.find(x=>x.id===selected);if(e)change(()=>{const n={...clone(e),id:++seq,x:e.x+2,y:e.y+2};state.elements.push(n);selected=n.id});else toast('Selecciona un elemento para duplicarlo')};$('#delete').onclick=()=>{if(selected)change(()=>{state.elements=state.elements.filter(e=>e.id!==selected);selected=null})};document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));$('#data-shortcut').onclick=()=>setTab('data');$('#save').onclick=()=>download(state.name+'.labela.json',JSON.stringify(state,null,2),'application/json');$('#open').onclick=()=>pickFile('.json',async f=>{try{if(f.size>12e6)throw Error('El archivo supera 12 MB.');const d=validate(JSON.parse(await f.text()));delete d.savedId;change(()=>{state=d;seq=Math.max(seq,...d.elements.map(e=>e.id));selected=null});renderLeft();toast('Diseño abierto')}catch(e){toast(e.message)}});$('#exportsvg').onclick=()=>download(state.name+'.svg',svgDoc(),'image/svg+xml');
$('#print').onclick=()=>{finishInlineEdit();updatePrintPreview();$('#printdialog').showModal()};
$('#confirm-print').onclick=()=>{const job=updatePrintPreview();if(job)launchPrint(job)};
window.addEventListener('beforeprint',prepareNativePrint);
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='p'){event.preventDefault();$('#print').click()}});
document.addEventListener('keydown',ev=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if((ev.ctrlKey||ev.metaKey)&&ev.key==='z'){ev.preventDefault();$(ev.shiftKey?'#redo':'#undo').click()}if(ev.key==='Delete'||ev.key==='Backspace'){$('#delete').click();ev.preventDefault()}const e=state.elements.find(e=>e.id===selected);if(e&&e.type==='text'&&(ev.key==='Enter'||ev.key==='F2')){ev.preventDefault();startInlineEdit(e);return}if(e&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key)){ev.preventDefault();change(()=>{const n=ev.shiftKey?1:.5;e.x=e.x+(ev.key==='ArrowRight'?n:ev.key==='ArrowLeft'?-n:0);e.y=e.y+(ev.key==='ArrowDown'?n:ev.key==='ArrowUp'?-n:0)})}});window.addEventListener('resize',render);if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>requestAnimationFrame(()=>{if(!activeEditor)render()})).observe($('#canvas-area'));const restoredView=restoreWorkspace();restoringView=true;renderLeft();render();
requestAnimationFrame(()=>requestAnimationFrame(()=>{restoreScroll(restoredView);restoringView=false;persistView()}));
for(const selector of ['#canvas-area','.left','.right'])$(selector)?.addEventListener('scroll',scheduleViewSave,{passive:true});
window.addEventListener('pagehide',flushWorkspace);window.addEventListener('beforeunload',flushWorkspace);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushWorkspace()});
