'use strict';
const $=s=>document.querySelector(s),clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
let fitWidth=false, activeEditor=null;
let seq=0;const el=(type,x,y,w,h,text='',extra={})=>({id:++seq,type,x,y,w,h,text,size:3,color:'#182c21',bold:false,align:'left',rotation:0,...extra});
const templates=[
{id:'product',name:'Producto esencial',category:'Producto',w:100,h:60,desc:'Clara, versátil y lista para tu marca',elements:()=>[el('text',7,6,86,5,'N O R D   /   B O T A N I C A L', {size:2.8,bold:true}),el('line',7,15,86,.3,'',{color:'#9da697'}),el('text',7,21,65,10,'Jabón de oliva',{size:7,bold:true}),el('text',7,33,75,5,'Natural. Artesanal. Hecho con calma.',{size:2.9}),el('text',7,43,38,5,'ACEITE DE OLIVA · 100 g',{size:2.4,bold:true}),el('barcode',61,42,32,12,'7501234567893'),el('text',7,51,45,3,'LOTE 2026-001 · HECHO EN MÉXICO',{size:1.9})]},
{id:'shipping',name:'Envío & logística',category:'Logística',w:100,h:150,desc:'Toda la información en un solo lugar',elements:()=>[el('text',7,7,86,8,'ENVÍO ESTÁNDAR',{size:5,bold:true}),el('text',7,22,86,8,'PEDIDO #000128',{size:3}),el('line',7,36,86,.4),el('text',7,43,86,5,'DESTINATARIO',{size:2.6}),el('text',7,53,86,10,'María García',{size:6,bold:true}),el('text',7,69,86,20,'Av. Reforma 123, Col. Centro\nCiudad de México, CP 06000',{size:3.8}),el('line',7,98,86,.4),el('barcode',10,108,80,25,'7501234567893'),el('text',7,140,86,5,'PAQUETE 1 DE 1 · 0.5 kg',{size:3,align:'center'})]},
{id:'price',name:'Precio minimalista',category:'Producto',w:60,h:40,desc:'El producto y su precio, protagonistas',elements:()=>[el('text',5,4,50,4,'COLECCIÓN ESENCIAL',{size:2.2,bold:true}),el('text',5,11,50,5,'Vela aromática',{size:4}),el('text',5,20,50,10,'$ 249.00',{size:8,bold:true}),el('text',5,33,50,3,'IVA incluido · 180 g',{size:2})]},
{id:'stock',name:'Inventario organizado',category:'Logística',w:80,h:50,desc:'Identifica, escanea y organiza',elements:()=>[el('text',5,5,70,5,'ALMACÉN / A-012',{size:4,bold:true}),el('text',5,15,70,5,'SKU: PRD-000128',{size:3}),el('barcode',5,24,70,15,'7501234567893'),el('text',5,43,70,3,'UBICACIÓN B-04 · LOTE 001',{size:2.4})]}
];
let state={name:'Etiqueta de producto',w:100,h:60,bg:'#ffffff',template:'product',elements:templates[0].elements()},selected=null,tab='templates',filter='Todas',query='',zoom=1,history=[],future=[],rows=[],csvFields=[],record=0;
try{const saved=JSON.parse(localStorage.getItem('labela-current'));if(saved)state=validate(saved)}catch{}seq=Math.max(0,...state.elements.map(e=>e.id));
function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',3200)}
function persist(){try{localStorage.setItem('labela-current',JSON.stringify(state));$('#saved').textContent='● Guardado en este navegador'}catch{$('#saved').textContent='Sin espacio local: descarga tu diseño'}}
function checkpoint(){history.push(clone(state));if(history.length>60)history.shift();future=[]}
function change(fn){checkpoint();fn();render();persist()}
function val(text,row=rows[record]||{},index=record){return String(text).replace(/\{\{([^}]+)\}\}/g,(_,key)=>key.trim()==='numero'?String(index+1).padStart(4,'0'):row[key.trim()]??'{{'+key+'}}')}
// EAN-13 includes a computed check digit; Code 39 supports uppercase identifiers.
function barcode(e,text){let bits='',human=text;const L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'],G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'],P=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
if((e.format||'ean13')==='ean13'){if(!/^\d{12,13}$/.test(text))return {error:'EAN-13: usa 12 o 13 dígitos'};let raw=text.slice(0,12),check=(10-[...raw].reduce((s,n,i)=>s+Number(n)*(i%2?3:1),0)%10)%10;human=raw+check;if(text.length===13&&text!==human)return {error:'Dígito de control incorrecto'};bits='101';for(let i=1;i<7;i++)bits+=(P[+human[0]][i-1]==='L'?L:G)[+human[i]];bits+='01010';for(let i=7;i<13;i++)bits+=L[+human[i]].split('').map(x=>x==='0'?'1':'0').join('');bits+='101';
}else{const chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%*',patterns=[0x034,0x121,0x061,0x160,0x031,0x130,0x070,0x025,0x124,0x064,0x109,0x049,0x148,0x019,0x118,0x058,0x00d,0x10c,0x04c,0x01c,0x103,0x043,0x142,0x013,0x112,0x052,0x007,0x106,0x046,0x016,0x181,0x0c1,0x1c0,0x091,0x190,0x0d0,0x085,0x184,0x0c4,0x0a8,0x0a2,0x08a,0x02a,0x094];human=text.toUpperCase();if(!/^[0-9A-Z .\-$/+%]+$/.test(human))return {error:'Code 39: caracteres no admitidos'};for(const c of '*'+human+'*'){let pattern=patterns[chars.indexOf(c)];for(let i=0;i<9;i++)bits+=(i%2?'0':'1').repeat(pattern&(1<<(8-i))?3:1);bits+='0'}}
let rects='';for(let i=0;i<bits.length;i++)if(bits[i]==='1')rects+=`<rect x="${i+12}" y="0" width="1" height="35"/>`;return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bits.length+24} 45" preserveAspectRatio="none"><rect width="100%" height="100%" fill="white"/><g fill="${esc(e.color)}">${rects}</g><text x="50%" y="43" text-anchor="middle" font-size="8" font-family="Arial" fill="${esc(e.color)}">${esc(human)}</text></svg>`}}
let lastPrintPaper='label';
try{lastPrintPaper=localStorage.getItem('labela-print-paper')||'label'}catch{}
function paperLayout(doc,paper='label'){
 const sheets={a4:[210,297],letter:[215.9,279.4]};
 if(paper==='label')return {w:doc.w,h:doc.h,margin:0,gap:0,cols:1,rows:1,capacity:1,paper};
 if(!sheets[paper])throw Error('Formato de papel no válido.');
 let [w,h]=sheets[paper];const margin=10,gap=3;
 if((doc.w>w-2*margin||doc.h>h-2*margin)&&doc.w<=h-2*margin&&doc.h<=w-2*margin)[w,h]=[h,w];
 const cols=Math.floor((w-2*margin+gap)/(doc.w+gap)),rows=Math.floor((h-2*margin+gap)/(doc.h+gap));
 if(cols<1||rows<1)throw Error('La etiqueta no cabe en esta hoja con 10 mm de margen. Elige otro papel o reduce la etiqueta.');
 return {w,h,margin,gap,cols,rows,capacity:cols*rows,paper};
}
function buildPrintJob(doc,data,count,paper='label'){
 if(!Number.isInteger(count)||count<1||count>500||!data.length||count*data.length>500)throw Error('Elige de 1 a 500 etiquetas por impresión.');
 const layout=paperLayout(doc,paper),labels=[];
 data.forEach((row,index)=>{
  for(const e of doc.elements){
   const value=val(e.text,row,index);
   if(/\{\{[^}]+\}\}/.test(value))throw Error('Hay campos sin datos. Importa un CSV o edita el contenido.');
   if(e.type==='barcode'){const b=barcode(e,value);if(b.error)throw Error(`Registro ${index+1}: ${b.error}`)}
  }
  const label=`<div class="print-label">${svgDoc(doc,row,index)}</div>`;
  for(let copy=0;copy<count;copy++)labels.push(label);
 });
 const pages=[];for(let i=0;i<labels.length;i+=layout.capacity)pages.push(`<section class="print-sheet">${labels.slice(i,i+layout.capacity).join('')}</section>`);
 const css=`@page{size:${layout.w}mm ${layout.h}mm;margin:0}html,body{margin:0!important;padding:0!important;background:white!important;width:auto!important;min-width:0!important;height:auto!important;min-height:0!important}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}.print-sheet{display:grid!important;position:relative!important;width:${layout.w}mm!important;height:${layout.h}mm!important;margin:0!important;padding:${layout.margin}mm!important;grid-template-columns:repeat(${layout.cols},${doc.w}mm);grid-auto-rows:${doc.h}mm;gap:${layout.gap}mm;align-content:start;justify-content:start;overflow:hidden;break-after:page;page-break-after:always}.print-sheet:last-child{break-after:auto;page-break-after:auto}.print-label{display:block!important;position:relative!important;width:${doc.w}mm!important;height:${doc.h}mm!important;margin:0!important;padding:0!important;border:0!important;outline:0!important;box-shadow:none!important;overflow:hidden!important;break-inside:avoid;page-break-inside:avoid;break-after:auto;page-break-after:auto}.print-label>svg{display:block!important;width:${doc.w}mm!important;height:${doc.h}mm!important;margin:0!important;padding:0!important}`;
 return {layout,html:pages.join(''),css,pages:pages.length,total:labels.length};
}
function printDocument(job,name='Etiquetas'){
 return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(name)}</title><style>${job.css}</style></head><body>${job.html}</body></html>`;
}
function currentPrintJob(){finishInlineEdit(true,false);return buildPrintJob(state,rows.length?rows:[{}],+$('#copies').value,lastPrintPaper)}
function updatePrintPreview(){
 const button=$('#confirm-print');
 try{lastPrintPaper=$('#print-paper').value;const job=currentPrintJob();$('#print-summary').textContent=`${job.total} etiquetas de ${state.w} × ${state.h} mm · ${job.pages} ${lastPrintPaper==='label'?'etiquetas individuales':'hojas '+(lastPrintPaper==='a4'?'A4':'carta')}`;$('#print-preview').innerHTML=svgDoc();$('#print-error').textContent='';button.disabled=false;try{localStorage.setItem('labela-print-paper',lastPrintPaper)}catch{}return job}
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
function textSVG(e,text){
 const align=e.align||'left',x=align==='center'?e.w/2:align==='right'?e.w:0;
 return `<svg width="${e.w}" height="${e.h}" viewBox="0 0 ${e.w} ${e.h}" overflow="hidden"><g font-family="${esc(e.font||'Arial')}" font-size="${e.size}" font-weight="${e.bold?700:400}" fill="${esc(e.color)}">${textLines(e,text).map((line,i)=>{
  const y=e.size*.88+i*e.size*1.2;
  if(align==='justify'&&!line.last&&line.text.includes(' ')){
   const words=line.text.split(' '),gap=Math.max(0,(e.w-words.reduce((n,w)=>n+measureText(w,e),0))/(words.length-1));let pos=0;
   return words.map(w=>{const out=`<text x="${pos}" y="${y}">${esc(w)}</text>`;pos+=measureText(w,e)+gap;return out}).join('');
  }
  return `<text x="${x}" y="${y}" text-anchor="${align==='center'?'middle':align==='right'?'end':'start'}">${esc(line.text)}</text>`;
 }).join('')}</g></svg>`;
}
function svgContent(e,row,index){const text=val(e.text,row,index);if(e.type==='barcode'){let b=barcode(e,text);return b.error?`<text x="0" y="3" font-size="2" fill="#b34c3b">${esc(b.error)}</text>`:`<svg width="${e.w}" height="${e.h}" viewBox="0 0 ${e.w} ${e.h}">${b.svg.replace('<svg ',`<svg width="${e.w}" height="${e.h}" `)}</svg>`}if(e.type==='image')return `<image width="${e.w}" height="${e.h}" href="${esc(e.src)}" preserveAspectRatio="xMidYMid meet"/>`;if(e.type==='rect')return `<rect width="${e.w}" height="${e.h}" fill="${e.fill?esc(e.color):'none'}" stroke="${esc(e.color)}" stroke-width=".35"/>`;if(e.type==='line')return `<rect width="${e.w}" height="${e.h}" fill="${esc(e.color)}"/>`;return textSVG(e,text)}
function svgDoc(doc=state,row=rows[record]||{},index=record){return `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.w}mm" height="${doc.h}mm" viewBox="0 0 ${doc.w} ${doc.h}"><rect width="100%" height="100%" fill="${esc(doc.bg)}"/>${doc.elements.map(e=>`<g transform="translate(${e.x} ${e.y}) rotate(${e.rotation||0} ${e.w/2} ${e.h/2})">${svgContent(e,row,index)}</g>`).join('')}</svg>`}
function scale(){const available=Math.max(.2,($('#canvas-area').clientWidth-90)/state.w);return (fitWidth?available:Math.min(5.1,available,430/state.h))*zoom}
function elementContent(e){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${e.w} ${e.h}" width="100%" height="100%">${svgContent(e,rows[record]||{},record)}</svg><span class="resize-handle" title="Arrastra para cambiar el tamaño" aria-label="Redimensionar elemento"></span>`}
function fitTextToSticker(e,doc,row={},index=0){
 const lines=val(e.text,row,index).split('\n'),longest=Math.max(...lines.map(t=>measureText(t,e)));
 if(!longest)return null;
 const margin=doc.w*.05,verticalMargin=doc.h*.05,w=doc.w-2*margin;
 const size=Math.min(e.size*w/longest,(doc.h-2*verticalMargin)/(1.2*lines.length)),h=size*1.2*lines.length;
 return {x:margin,w,size,h,y:Math.max(verticalMargin,Math.min(e.y,doc.h-verticalMargin-h)),rotation:0};
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
 if(!activeEditor)return;const {input,e,original}=activeEditor;activeEditor=null;
 input.onblur=null;const value=input.value;input.remove();
 if(commit&&value!==original){checkpoint();e.text=value;persist()}
 if(redraw)render();
}
function startInlineEdit(e,initial){
 if(e.type!=='text')return;finishInlineEdit();selected=e.id;render();
 const node=$(`[data-id="${e.id}"]`),k=scale(),input=document.createElement('textarea');
 input.className='inline-text';input.setAttribute('aria-label','Editar texto en el lienzo');input.value=initial===undefined?e.text:initial;
 input.style.cssText=`font-family:${e.font||'Arial'};font-size:${e.size*k}px;font-weight:${e.bold?700:400};line-height:1.2;color:${e.color};text-align:${e.align||'left'}`;
 node.classList.add('editing');node.append(input);activeEditor={input,e,original:e.text};
 input.onpointerdown=ev=>ev.stopPropagation();input.ondblclick=ev=>ev.stopPropagation();
 input.onkeydown=ev=>{ev.stopPropagation();if(ev.key==='Escape'){ev.preventDefault();finishInlineEdit(false)}else if(ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey)){ev.preventDefault();finishInlineEdit()}};
 input.onblur=()=>finishInlineEdit();input.focus();if(initial===undefined)input.select();else input.setSelectionRange(input.value.length,input.value.length);
}
function render(){finishInlineEdit(true,false);let k=scale();$('#board').style.width=state.w*k+'px';$('#board').style.height=state.h*k+'px';$('#board').style.background=state.bg;$('#board').innerHTML=state.elements.map(e=>`<div class="element ${e.id===selected?'selected':''}" data-id="${e.id}" style="left:${e.x*k}px;top:${e.y*k}px;width:${e.w*k}px;height:${e.h*k}px;transform:rotate(${e.rotation||0}deg)">${elementContent(e)}</div>`).join('');$('#dimension').textContent=`${state.w} × ${state.h} mm`;$('#canvas-title').textContent=state.name.toUpperCase();$('#top-ruler').innerHTML=Array.from({length:11},(_,i)=>`<span>${+(state.w*i/10).toFixed(1)}</span>`).join('');$('#element-count').textContent=state.elements.length+' elementos';document.querySelectorAll('[data-orientation]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.orientation==='portrait'?state.h>state.w:state.w>=state.h));button.disabled=state.w===state.h});$('#width').value=state.w;$('#height').value=state.h;$('#background').value=state.bg;$('#bgcode').textContent=state.bg.toUpperCase();$('#docname').value=state.name;$('#size').value=[...$('#size').options].some(o=>o.value===state.w+','+state.h)?state.w+','+state.h:'custom';$('#zoomval').textContent=fitWidth?'Ancho':Math.round(zoom*100)+'%';$('#fitwidth').setAttribute('aria-pressed',String(fitWidth));$('#canvas-area').classList.toggle('fit-width',fitWidth);$('#undo').disabled=!history.length;$('#redo').disabled=!future.length;renderProperties()}
function renderLeft(){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));const root=$('#left-content');if(tab==='templates'){root.innerHTML=`<h2>Un buen comienzo.</h2><p class="subtitle">Elige una plantilla y hazla tuya.</p><div class="search"><input id="search" placeholder="Buscar plantillas…" value="${esc(query)}"></div><div class="filters">${['Todas','Producto','Logística'].map(f=>`<button data-filter="${f}" class="${filter===f?'active':''}">${f}</button>`).join('')}</div><div id="template-list"></div><button class="new-template" id="blank">＋ Crear desde cero</button>`;renderTemplateList();$('#search').oninput=e=>{query=e.target.value;renderTemplateList()};root.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;renderLeft()});$('#blank').onclick=()=>{if(!confirm('¿Crear una etiqueta vacía? El diseño actual se reemplazará.'))return;change(()=>{state.elements=[];state.template='blank';state.name='Etiqueta sin título';selected=null});renderLeft()}}
if(tab==='elements'){root.innerHTML=`<h2>Dale forma.</h2><p class="subtitle">Añade un elemento y edita sus propiedades a la derecha.</p><div class="tool-buttons"><button data-add="text"><strong>T</strong>Texto</button><button data-add="barcode"><strong>▥</strong>Código de barras</button><button data-add="image"><strong>▧</strong>Imagen</button><button data-add="rect"><strong>□</strong>Rectángulo</button><button data-add="line"><strong>―</strong>Línea</button><button data-add="number"><strong>01</strong>Consecutivo</button></div><p class="help">Selecciona cualquier elemento para ajustar su posición, tamaño y contenido.</p>`;root.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addElement(b.dataset.add))}
if(tab==='data'){root.innerHTML=`<h2>Diseña una vez.</h2><p class="subtitle">Imprime una etiqueta por cada fila de tu archivo CSV.</p><button class="primary wide" id="csv">↥ Importar CSV</button><button class="wide" id="csv-example">↓ Descargar ejemplo</button><p class="help">Usa campos como <code>{{producto}}</code> en tus textos. Para consecutivos, usa <code>{{numero}}</code>.</p>${rows.length?`<div class="section-label">${rows.length} REGISTROS IMPORTADOS</div><label>Vista previa<select id="record">${rows.map((r,i)=>`<option value="${i}" ${i===record?'selected':''}>Registro ${i+1}: ${esc(Object.values(r)[0])}</option>`).join('')}</select></label><div style="margin-top:20px">${csvFields.map(f=>`<div class="data-row"><span>${esc(f)}</span><code>{{${esc(f)}}}</code></div>`).join('')}</div><button id="clearcsv" class="wide">Quitar datos</button>`:'<div class="empty">Tus datos se procesan en este navegador. No se envían a un servidor.</div>'}`;$('#csv').onclick=()=>pickFile('.csv',async file=>{try{const parsed=parseCSV(await file.text());if(parsed.length<2)throw Error('El CSV debe tener encabezados y al menos una fila.');csvFields=parsed[0].map(x=>x.trim());if(csvFields.some(x=>!x)||new Set(csvFields).size!==csvFields.length)throw Error('Usa encabezados únicos y no vacíos.');rows=parsed.slice(1).filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(csvFields.map((f,i)=>[f,r[i]||''])));if(rows.length>500)throw Error('Máximo 500 filas por lote.');record=0;renderLeft();render();toast('CSV importado: '+rows.length+' registros')}catch(e){rows=[];toast(e.message)}});$('#csv-example').onclick=()=>download('ejemplo-etiquetas.csv','producto,precio,codigo\nJabón de oliva,149.00,7501234567893\nVela aromática,249.00,7501234567886','text/csv');if(rows.length){$('#record').onchange=e=>{record=+e.target.value;render()};$('#clearcsv').onclick=()=>{rows=[];csvFields=[];renderLeft();render()}}}
if(tab==='library'){let lib=getLibrary();root.innerHTML=`<h2>Tus diseños.</h2><p class="subtitle">Guardados en este navegador. Descarga un archivo para llevarlos contigo.</p><button id="store-design" class="primary wide">＋ Guardar diseño actual</button>${lib.length?lib.map((d,i)=>`<div class="saved-item"><b>${esc(d.name)}</b><button data-load="${i}" title="Abrir">↗</button><button data-remove="${i}" title="Eliminar">×</button></div>`).join(''):'<div class="empty">Tu próxima idea empieza aquí.</div>'}`;$('#store-design').onclick=()=>{lib.push(clone(state));try{localStorage.setItem('labela-library',JSON.stringify(lib));renderLeft();toast('Diseño guardado')}catch{toast('Sin espacio local. Descarga el diseño.')}};root.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{change(()=>{state=clone(lib[+b.dataset.load]);selected=null});renderLeft()});root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{lib.splice(+b.dataset.remove,1);localStorage.setItem('labela-library',JSON.stringify(lib));renderLeft()})}}
function renderTemplateList(){$('#template-list').innerHTML=templates.filter(t=>(filter==='Todas'||t.category===filter)&&t.name.toLowerCase().includes(query.toLowerCase())).map(t=>`<button class="template-card ${state.template===t.id?'selected':''}" data-template="${t.id}"><div class="preview">${svgDoc({w:t.w,h:t.h,bg:'#ffffff',elements:t.elements()}, {},0)}</div><b>${t.name}</b><small>${t.w} × ${t.h} mm · ${t.category}</small></button>`).join('');document.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>{const t=templates.find(t=>t.id===b.dataset.template);if(state.elements.length&&!confirm('¿Aplicar esta plantilla? Se reemplazará el diseño actual. Puedes deshacer el cambio.'))return;change(()=>{state={name:t.name,w:t.w,h:t.h,bg:'#ffffff',template:t.id,elements:t.elements()};selected=null;zoom=1});renderLeft()})}
function getLibrary(){try{return JSON.parse(localStorage.getItem('labela-library'))||[]}catch{return []}}
const MM_PER_PT=25.4/72;
function textSizeInPoints(e){return Math.round(e.size/MM_PER_PT*10)/10}
function setTextSize(e,points){
 if(!Number.isFinite(points)||points<1||points>1000)return false;
 e.size=points*MM_PER_PT;
 e.h=Math.max(e.h,textLines(e,val(e.text)).length*e.size*1.2);
 return true;
}
function alignmentIcon(align){
 const widths=align==='justify'?[18,18,18,18]:[18,12,18,12];
 return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">${widths.map((w,i)=>{const x=align==='center'?(24-w)/2:align==='right'?21-w:3;return `<path d="M${x} ${5+i*4.5}h${w}"/>`}).join('')}</svg>`;
}
function renderTextToolbar(){
 const e=state.elements.find(e=>e.id===selected),root=$('#text-toolbar'),disabled=!e||e.type!=='text';
 root.innerHTML=`<span class="text-toolbar-label">Texto</span><div class="font-size-group"><button id="font-smaller" aria-label="Reducir tamaño de letra" title="Reducir tamaño de letra (1 pt)" ${disabled?'disabled':''}>A<small>−</small></button><label class="points-input"><span class="sr-only">Tamaño de letra en puntos</span><input id="font-points" type="number" min="1" max="1000" step="1" value="${disabled?'':textSizeInPoints(e)}" placeholder="—" ${disabled?'disabled':''}><span>pt</span></label><button id="font-larger" aria-label="Aumentar tamaño de letra" title="Aumentar tamaño de letra (1 pt)" ${disabled?'disabled':''}>A<small>+</small></button></div><button id="text-bold" class="bold-button" aria-label="Negrita" title="Negrita" aria-pressed="${!disabled&&e.bold}" ${disabled?'disabled':''}>B</button><span class="toolbar-divider"></span><div class="text-alignment" role="group" aria-label="Alineación del texto">${['left','center','right','justify'].map((align,i)=>`<button data-text-align="${align}" title="${['Alinear a la izquierda','Centrar texto','Alinear a la derecha','Justificar texto'][i]}" aria-label="${['Alinear a la izquierda','Centrar texto','Alinear a la derecha','Justificar texto'][i]}" aria-pressed="${!disabled&&(e.align||'left')===align}" ${disabled?'disabled':''}>${alignmentIcon(align)}</button>`).join('')}</div><span class="toolbar-divider"></span><button id="toolbar-fit-text" title="Ajustar texto al ancho del sticker con 5% de margen a cada lado" ${disabled?'disabled':''}>↔ Ajustar texto</button>${disabled?'<span class="text-toolbar-help">Selecciona un texto</span>':''}`;
 root.onpointerdown=()=>{if(activeEditor){const current=activeEditor.e;finishInlineEdit(true,false);const node=$(`[data-id="${current.id}"]`);node.classList.remove('editing');node.innerHTML=elementContent(current)}};
 if(disabled)return;
 $('#font-smaller').onclick=()=>change(()=>setTextSize(e,Math.max(1,Math.round(textSizeInPoints(e))-1)));
 $('#font-larger').onclick=()=>change(()=>setTextSize(e,Math.min(1000,Math.round(textSizeInPoints(e))+1)));
 $('#font-points').onchange=event=>{const points=+event.target.value;if(!Number.isFinite(points)||points<1||points>1000){toast('El tamaño debe estar entre 1 y 1000 pt.');renderTextToolbar();return}change(()=>setTextSize(e,points))};
 $('#text-bold').onclick=()=>change(()=>e.bold=!e.bold);
 root.querySelectorAll('[data-text-align]').forEach(button=>button.onclick=()=>change(()=>e.align=button.dataset.textAlign));
 $('#toolbar-fit-text').onclick=()=>{const fitted=fitTextToSticker(e,state,rows[record]||{},record);if(fitted)change(()=>Object.assign(e,fitted));else toast('Escribe un texto para ajustar su ancho')};
}
function renderProperties(){renderTextToolbar();const e=state.elements.find(e=>e.id===selected);$('#properties').innerHTML=e?`<section><div class="section-label">${{text:'TEXTO',barcode:'CÓDIGO DE BARRAS',rect:'RECTÁNGULO',image:'IMAGEN',line:'LÍNEA'}[e.type]} <span style="float:right">SELECCIONADO</span></div>${['text','barcode'].includes(e.type)?`<label>Contenido<textarea data-prop="text" rows="${e.type==='text'?3:2}">${esc(e.text)}</textarea></label>`:''}${e.type==='barcode'?`<label class="field">Simbología<select data-prop="format"><option value="ean13" ${e.format!=='code39'?'selected':''}>EAN-13</option><option value="code39" ${e.format==='code39'?'selected':''}>Code 39</option></select></label><p class="small">EAN-13: 12 dígitos calculan el verificador. Code 39: letras y números.</p>`:''}<div class="two"><label>X (mm)<input data-prop="x" type="number" step="0.5" value="${e.x}"></label><label>Y (mm)<input data-prop="y" type="number" step="0.5" value="${e.y}"></label></div><div class="two"><label>Ancho (mm)<input data-prop="w" type="number" min=".5" step=".5" value="${e.w}"></label><label>Alto (mm)<input data-prop="h" type="number" min=".2" step=".5" value="${e.h}"></label></div>${e.type==='text'?`<button class="wide" id="edit-canvas">✎ Editar en el lienzo</button><label class="field">Tipografía<select data-prop="font">${['Arial','Georgia','Courier New'].map(f=>`<option ${e.font===f?'selected':''}>${f}</option>`).join('')}</select></label><label class="field"><input type="checkbox" data-prop="bold" ${e.bold?'checked':''}> Negrita</label>`:''}<div class="two"><label>Rotación °<input data-prop="rotation" type="number" min="-360" max="360" value="${e.rotation||0}"></label><label>Color<input type="color" data-prop="color" value="${e.color}"></label></div>${e.type==='rect'?`<label><input type="checkbox" data-prop="fill" ${e.fill?'checked':''}> Rellenar figura</label>`:''}<div class="two"><button id="center-element" title="Centrar el cuadro horizontal y verticalmente en la etiqueta">Centrar en etiqueta</button><button id="front-element">Al frente</button></div></section>`:`<section><div class="section-label">PROPIEDADES</div><p class="help">Selecciona un elemento de la etiqueta para personalizarlo.</p><button class="wide" id="add-shortcut">＋ Añadir elemento</button></section>`;$('#properties').querySelectorAll('[data-prop]').forEach(input=>input.onchange=()=>{let key=input.dataset.prop,v=input.type==='checkbox'?input.checked:input.type==='number'?+input.value:input.value;if(input.type==='number'&&!Number.isFinite(v))return;if(['w','h','size'].includes(key))v=Math.max(.2,v);change(()=>e[key]=v)});if(e){$('#properties').querySelectorAll('[data-align]').forEach(b=>b.onclick=()=>change(()=>e.align=b.dataset.align));if(e.type==='text'){$('#edit-canvas').onclick=()=>startInlineEdit(e)};$('#center-element').onclick=()=>change(()=>Object.assign(e,centeredPosition(e,state.w,state.h)));$('#front-element').onclick=()=>change(()=>{state.elements=state.elements.filter(x=>x!==e);state.elements.push(e)})}else $('#add-shortcut').onclick=()=>{tab='elements';renderLeft()}}
function addElement(type){if(type==='image'){pickFile('image/png,image/jpeg,image/webp',file=>{if(file.size>3e6)return toast('Usa una imagen de hasta 3 MB.');const reader=new FileReader;reader.onload=()=>{change(()=>{let e=el('image',5,5,25,20,'',{src:reader.result});state.elements.push(e);selected=e.id})};reader.readAsDataURL(file)});return}change(()=>{const e=type==='text'?el('text',5,5,Math.min(65,state.w-10),8,'Tu texto aquí',{size:4}):type==='number'?el('text',5,5,30,7,'N.º {{numero}}',{size:4}):type==='barcode'?el('barcode',5,5,Math.min(50,state.w-10),15,'7501234567893'):type==='line'?el('line',5,5,Math.min(60,state.w-10),.4):el('rect',5,5,25,15);state.elements.push(e);selected=e.id})}
function pickFile(accept,callback){const input=$('#file');input.accept=accept;input.value='';input.onchange=()=>{if(input.files[0])callback(input.files[0])};input.click()}
function download(name,content,type){let url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function parseCSV(text){text=text.replace(/^\uFEFF/,'');const delimiter=(text.split('\n')[0].match(/;/g)||[]).length>(text.split('\n')[0].match(/,/g)||[]).length?';':',';let result=[],row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){let c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===delimiter&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);result.push(row);row=[];cell=''}else cell+=c}if(quoted)throw Error('El CSV contiene comillas sin cerrar.');if(cell||row.length){row.push(cell);result.push(row)}return result}
function validate(d){if(!d||!Array.isArray(d.elements)||d.elements.length>300||!Number.isFinite(d.w)||!Number.isFinite(d.h)||d.w<10||d.h<10||d.w>300||d.h>300||!/^#[0-9a-f]{6}$/i.test(d.bg))throw Error('Archivo de diseño inválido.');d.name=String(d.name||'Diseño importado');d.elements.forEach((e,i)=>{if(!['text','barcode','image','rect','line'].includes(e.type)||!['x','y','w','h','size'].every(k=>Number.isFinite(e[k]))||e.w<=0||e.h<=0||!/^#[0-9a-f]{6}$/i.test(e.color)|| (e.rotation!==undefined&&!Number.isFinite(e.rotation)))throw Error('Elemento inválido en el archivo.');if(e.type==='image'&&!/^data:image\/(png|jpeg|webp);base64,/.test(e.src))throw Error('Formato de imagen no permitido.');e.id=i+1});return d}
$('#board').ondblclick=event=>{const node=event.target.closest('.element');if(node&&!event.target.closest('.resize-handle'))startInlineEdit(state.elements.find(e=>e.id===+node.dataset.id))};
$('#board').onpointerdown=event=>{
 if(event.button!==0||event.target.closest('.inline-text'))return;
 const node=event.target.closest('.element');if(!node){finishInlineEdit();selected=null;render();return}
 const e=state.elements.find(e=>e.id===+node.dataset.id),resizing=!!event.target.closest('.resize-handle');
 selected=e.id;document.querySelectorAll('.element').forEach(n=>n.classList.toggle('selected',+n.dataset.id===selected));renderProperties();
 const start={px:event.clientX,py:event.clientY,x:e.x,y:e.y,w:e.w,h:e.h},k=scale();let moved=false;
 node.setPointerCapture(event.pointerId);
 node.onpointermove=ev=>{
  const dx=(ev.clientX-start.px)/k,dy=(ev.clientY-start.py)/k;
  if(!moved&&Math.hypot(ev.clientX-start.px,ev.clientY-start.py)<3)return;
  if(!moved){checkpoint();moved=true}
  if(resizing)Object.assign(e,resizedBounds(start,dx,dy,e.rotation||0));
  else{e.x=Math.round(Math.max(0,Math.min(Math.max(0,state.w-e.w),start.x+dx))*2)/2;e.y=Math.round(Math.max(0,Math.min(Math.max(0,state.h-e.h),start.y+dy))*2)/2}
  node.style.left=e.x*k+'px';node.style.top=e.y*k+'px';node.style.width=e.w*k+'px';node.style.height=e.h*k+'px';
  if(resizing)node.innerHTML=elementContent(e);
 };
 const finish=()=>{node.onpointermove=null;node.onpointerup=null;node.onpointercancel=null;if(moved){render();persist()}else renderProperties()};
 node.onpointerup=finish;node.onpointercancel=finish;
};
document.querySelectorAll('[data-orientation]').forEach(button=>button.onclick=()=>{
 finishInlineEdit();const direction=button.dataset.orientation;
 if(state.w===state.h||(direction==='portrait'?state.h>state.w:state.w>state.h))return;
 change(()=>{orientLabel(state,direction,$('#rotate-design').checked);zoom=1});
});
$('#fitwidth').onclick=()=>{finishInlineEdit();fitWidth=!fitWidth;zoom=1;render()};
$('#docname').onchange=e=>change(()=>state.name=e.target.value||'Sin título');$('#size').onchange=e=>{if(e.target.value==='custom')return;const [w,h]=e.target.value.split(',').map(Number);change(()=>{state.w=w;state.h=h})};for(const id of ['width','height'])$('#'+id).onchange=e=>{const v=+e.target.value;if(v<10||v>300){toast('El tamaño debe estar entre 10 y 300 mm.');render();return}change(()=>state[id==='width'?'w':'h']=v)};$('#background').onchange=e=>change(()=>state.bg=e.target.value);$('#grid').onchange=e=>$('#canvas-area').classList.toggle('no-grid',!e.target.checked);$('#zoomin').onclick=()=>{fitWidth=false;zoom=Math.min(2,zoom+.1);render()};$('#zoomout').onclick=()=>{fitWidth=false;zoom=Math.max(.3,zoom-.1);render()};$('#undo').onclick=()=>{if(!history.length)return;future.push(clone(state));state=history.pop();selected=null;render();renderLeft();persist()};$('#redo').onclick=()=>{if(!future.length)return;history.push(clone(state));state=future.pop();selected=null;render();renderLeft();persist()};$('#duplicate').onclick=()=>{const e=state.elements.find(x=>x.id===selected);if(e)change(()=>{const n={...clone(e),id:++seq,x:e.x+2,y:e.y+2};state.elements.push(n);selected=n.id});else toast('Selecciona un elemento para duplicarlo')};$('#delete').onclick=()=>{if(selected)change(()=>{state.elements=state.elements.filter(e=>e.id!==selected);selected=null})};document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;renderLeft()});$('#data-shortcut').onclick=()=>{tab='data';renderLeft()};$('#save').onclick=()=>download(state.name+'.labela.json',JSON.stringify(state,null,2),'application/json');$('#open').onclick=()=>pickFile('.json',async f=>{try{if(f.size>12e6)throw Error('El archivo supera 12 MB.');const d=validate(JSON.parse(await f.text()));change(()=>{state=d;seq=Math.max(seq,...d.elements.map(e=>e.id));selected=null});renderLeft();toast('Diseño abierto')}catch(e){toast(e.message)}});$('#exportsvg').onclick=()=>download(state.name+'.svg',svgDoc(),'image/svg+xml');
$('#print').onclick=()=>{finishInlineEdit();$('#print-paper').value=lastPrintPaper;updatePrintPreview();$('#printdialog').showModal()};
$('#print-paper').onchange=updatePrintPreview;
$('#confirm-print').onclick=()=>{const job=updatePrintPreview();if(job)launchPrint(job)};
window.addEventListener('beforeprint',prepareNativePrint);
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='p'){event.preventDefault();$('#print').click()}});
document.addEventListener('keydown',ev=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if((ev.ctrlKey||ev.metaKey)&&ev.key==='z'){ev.preventDefault();$(ev.shiftKey?'#redo':'#undo').click()}if(ev.key==='Delete'||ev.key==='Backspace'){$('#delete').click();ev.preventDefault()}const e=state.elements.find(e=>e.id===selected);if(e&&e.type==='text'&&(ev.key==='Enter'||ev.key==='F2')){ev.preventDefault();startInlineEdit(e);return}if(e&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key)){ev.preventDefault();change(()=>{const n=ev.shiftKey?1:.5;e.x=Math.max(0,e.x+(ev.key==='ArrowRight'?n:ev.key==='ArrowLeft'?-n:0));e.y=Math.max(0,e.y+(ev.key==='ArrowDown'?n:ev.key==='ArrowUp'?-n:0))})}});window.addEventListener('resize',render);renderLeft();render();
