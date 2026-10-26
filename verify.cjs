const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync(__dirname+'/dist/app.js','utf8').split("$('#board').ondblclick=")[0];
const context=vm.createContext({console,localStorage:{getItem:()=>null},document:{querySelector:()=>null}});vm.runInContext(code,context);
const run=s=>vm.runInContext(s,context);
assert(run(`barcode({color:'#000000'},'7501234567893').svg.includes('7501234567893')`));
assert(run(`!!barcode({},'7501234567890').error`));
assert(run(`barcode({color:'#000000'},'750123456789').svg.includes('7501234567893')`));
assert(run(`!!barcode({},'ABC').error`));
assert(run(`!!barcode({format:'code39',color:'#000000'},'SKU-123').svg`));
assert.deepEqual(JSON.parse(run(String.raw`JSON.stringify(parseCSV('producto,precio\r\n"Jabón, oliva",149\r\n"Vela ""natural""",249'))`)),[['producto','precio'],['Jabón, oliva','149'],['Vela "natural"','249']]);
assert.equal(run(`val('{{producto}} #{{numero}}',{producto:'Jabón'},2)`),'Jabón #0003');
assert(run(`svgDoc().includes('width="100mm"')`));
assert(run(`svgDoc({...state,elements:[el('text',1,1,20,5,'<script>')]}).includes('&lt;script&gt;')`));
assert.throws(()=>run(`validate({...state,w:0})`));
assert.throws(()=>run(`validate({...state,elements:[el('image',1,1,10,10,'',{src:'https://example.com/track'})]})`));
for(const t of ['product','shipping','price','stock'])assert(run(`svgDoc({w:templates.find(t=>t.id==='${t}').w,h:templates.find(t=>t.id==='${t}').h,bg:'#ffffff',elements:templates.find(t=>t.id==='${t}').elements()}).includes('<svg')`));
// Layout must wrap consistently for the canvas, SVG export and print.
assert(run(`textLines(el('text',0,0,12,30,'',{size:3}), 'uno dos tres cuatro').length > 1`));
assert(run(`textLines(el('text',0,0,10,30,'',{size:3}), 'ABCDEFGHIJKLMN').every(l=>measureText(l.text,{size:3})<=10)`));
assert.equal(run(`textLines(el('text',0,0,50,30), 'uno\\ndos').length`),2);
assert(run(`textSVG(el('text',0,0,40,20,'',{align:'center'}),'Hola').includes('text-anchor="middle"')`));
assert(run(`textSVG(el('text',0,0,40,20,'',{align:'right'}),'Hola').includes('x="40"')`));
assert(run(`textSVG(el('text',0,0,14,30,'',{align:'justify'}),'uno dos tres cuatro').includes('<text x="')`));
assert.deepEqual(JSON.parse(run(`JSON.stringify(centeredPosition({w:20,h:10},100,60))`)),{x:40,y:25});
assert.deepEqual(JSON.parse(run(`JSON.stringify(resizedBounds({x:5,y:7,w:20,h:10},10,5))`)),{w:30,h:15,x:5,y:7});
assert(run(`resizedBounds({x:5,y:7,w:20,h:10},-100,-100).w===1`));
assert(run(`resizedBounds({x:5,y:7,w:20,h:10},-100,-100).h===.5`));
// For rotated elements the opposite corner stays fixed while resizing.
assert(run(`(()=>{const a={x:5,y:7,w:20,h:10},b=resizedBounds(a,8,12,35),r=35*Math.PI/180;const anchor=o=>({x:o.x+o.w/2-Math.cos(r)*o.w/2+Math.sin(r)*o.h/2,y:o.y+o.h/2-Math.sin(r)*o.w/2-Math.cos(r)*o.h/2});return Math.abs(anchor(a).x-anchor(b).x)<1e-8&&Math.abs(anchor(a).y-anchor(b).y)<1e-8})()`));
// Text fit uses the entire physical sticker width, regardless of its old box.
assert(run(`(()=>{const e=el('text',20,12,15,8,'BODEGA',{size:4}),f=fitTextToSticker(e,{w:100,h:60});return f.x===5&&f.w===90&&Math.abs(measureText('BODEGA',{...e,...f})-90)<1e-8})()`));
assert(run(`(()=>{const e=el('text',20,12,15,8,'{{producto}}',{size:4}),f=fitTextToSticker(e,{w:80,h:50},{producto:'CAFÉ MOLIDO'});return f.x===4&&f.w===72&&Math.abs(measureText('CAFÉ MOLIDO',{...e,...f})-72)<1e-8})()`));
assert(run(`fitTextToSticker(el('text',0,0,10,5,''),{w:100,h:60})===null`));
assert(run(`(()=>{const f=fitTextToSticker(el('text',1,1,10,5,'A'),{w:100,h:10});return f.h<=10&&f.y>=0})()`));
// Fit leaves proportional padding even on small labels and multiline text.
assert(run(`(()=>{const f=fitTextToSticker(el('text',0,0,5,3,'A'),{w:10,h:10});return f.x===.5&&f.w===9&&f.y>=.5&&f.y+f.h<=9.5})()`));
assert(run(`(()=>{const f=fitTextToSticker(el('text',0,0,5,3,'UNO\\nDOS'),{w:100,h:40});return f.x===5&&f.w===90&&f.y>=2&&f.y+f.h<=38})()`));
assert(run(`(()=>{const e=el('text',0,0,50,10,'Texto');setTextSize(e,24);return Math.abs(e.size-24*25.4/72)<1e-9&&textSizeInPoints(e)===24})()`));
assert(run(`(()=>{const e=el('text',0,0,20,2,'Línea larga');setTextSize(e,36);return e.h>=textLines(e,e.text).length*e.size*1.2})()`));
assert(run(`(()=>{const e=el('text',0,0,50,10,'Texto'),size=e.size;return !setTextSize(e,NaN)&&!setTextSize(e,0)&&!setTextSize(e,1001)&&e.size===size})()`));
// Print output has physical page dimensions and contains no editor chrome.
const printEl=run(`el('text',5,6,90,30,'BODEGA\\nASEO',{size:8,align:'center'})`);
const sampleDoc={name:'Bodega',w:100,h:60,bg:'#ffffff',elements:[printEl]};
context.sampleDoc=sampleDoc;
assert(run(`buildPrintJob(sampleDoc,[{}],2).pages===2`));
assert(run(`buildPrintJob(sampleDoc,[{}],5).pages===5`));
assert(run(`(buildPrintJob(sampleDoc,[{}],4).html.match(/class="print-label"/g)||[]).length===4`));
assert.throws(()=>run(`buildPrintJob(sampleDoc,[{}],501)`));
assert.throws(()=>run(`buildPrintJob(sampleDoc,[{}],0)`));
assert.throws(()=>run(`buildPrintJob({...sampleDoc,elements:[el('text',1,1,20,10,'{{missing}}')]},[{}],1)`));
assert(run(`(()=>{const job=buildPrintJob({...sampleDoc,elements:[el('text',1,1,40,10,'{{producto}} {{numero}}')]},[{producto:'A'},{producto:'B'}],2);return job.total===4&&job.pages===4&&job.html.includes('A 0001')&&job.html.includes('B 0002')})()`));
const printHTML=run(`printDocument(buildPrintJob(sampleDoc,[{}],1),'Bodega')`);
assert(printHTML.includes('@page{size:auto;margin:0}'));
assert(!printHTML.includes('grid-template-columns'));
assert(!fs.readFileSync(__dirname+'/dist/index.html','utf8').includes('print-paper'));
assert(printHTML.includes('width:100mm!important;height:60mm!important'));
assert(!/resize-handle|class="element|selected|id="board|canvas-area|top-ruler|<script/.test(printHTML));
assert(printHTML.includes('text-anchor="middle"'));
// Orientation rotates the complete design reversibly, with exact physical dimensions.
assert(run(`(()=>{const doc={w:100,h:60,elements:[el('text',5,10,90,8,'Bodega',{rotation:25})]},before=JSON.stringify(doc);orientLabel(doc,'portrait');return doc.w===60&&doc.h===100&&doc.elements[0].rotation===115&&doc.elements[0].text==='Bodega'&&orientLabel(doc,'portrait')===false&&(orientLabel(doc,'landscape'),JSON.stringify(doc)===before)})()`));
assert(run(`(()=>{const e=el('text',5,10,40,10,'Hola'),doc={w:100,h:60,elements:[e]},before=JSON.stringify(e);orientLabel(doc,'portrait',false);return doc.w===60&&doc.h===100&&JSON.stringify(e)===before})()`));
assert(run(`(()=>{const doc={w:60,h:60,elements:[]};return orientLabel(doc,'portrait')===false&&doc.w===60&&doc.h===60})()`));
assert(run(`(()=>{const doc={w:100,h:60,bg:'#ffffff',elements:[el('text',5,10,90,8,'Bodega')]};orientLabel(doc,'portrait');const job=buildPrintJob(doc,[{}],1);return job.css.includes('@page{size:auto')&&job.css.includes('width:60mm!important;height:100mm!important')&&job.html.includes('width="60mm" height="100mm"')&&job.html.includes('rotate(90')})()`));
// Vertical alignment uses the same offset in the canvas, inline editor and SVG print output.
assert.equal(run(`textVerticalOffset(el('text',0,0,50,20,'',{size:4,valign:'top'}),'Hola')`),0);
assert.equal(run(`textVerticalOffset(el('text',0,0,50,20,'',{size:4,valign:'middle'}),'Hola')`),7.6);
assert.equal(run(`textVerticalOffset(el('text',0,0,50,20,'',{size:4,valign:'bottom'}),'Hola')`),15.2);
assert.equal(run(`textVerticalOffset(el('text',0,0,50,2,'',{size:4,valign:'bottom'}),'Hola')`),0);
assert(run(`textSVG(el('text',0,0,50,20,'',{size:4,valign:'middle'}),'Hola').includes('y="11.12"')`));
// Table resizing preserves retained cells and fills new cells without sharing row arrays.
run(`let testTable=el('table',3,4,80,24,'',{rows:2,cols:2,cells:[['Campo','Valor'],['Lote','001']],header:true,valign:'middle'});`);
assert(run(`(()=>{const e=clone(testTable);resizeTable(e,3,3);e.cells[2][0]='Nuevo';return e.cells[0][0]==='Campo'&&e.cells[1][1]==='001'&&e.cells[2][1]===''&&e.cells[1][0]==='Lote'})()`));
assert(run(`(()=>{const e=clone(testTable);resizeTable(e,1,1);return e.rows===1&&e.cols===1&&e.cells.length===1&&e.cells[0][0]==='Campo'})()`));
assert.throws(()=>run(`resizeTable(clone(testTable),0,2)`));
assert.throws(()=>run(`resizeTable(clone(testTable),2,11)`));
assert(run(`tableSVG(testTable,{},0).includes('data-cell="1,1"')`));
assert(run(`tableSVG({...testTable,cells:[['<script>','Valor'],['Lote','001']]},{},0).includes('&lt;script&gt;')`));
assert(run(`tableSVG({...testTable,cells:[['Campo','Valor'],['{{producto}}','{{numero}}']]},{producto:'CAFÉ'},2).includes('CAFÉ')`));
assert(run(`tableSVG({...testTable,cells:[['Campo','Valor'],['{{producto}}','{{numero}}']]},{producto:'CAFÉ'},2).includes('0003')`));
assert(run(`validate({...sampleDoc,elements:[clone(testTable)]}).elements[0].cells[1][1]==='001'`));
assert.throws(()=>run(`validate({...sampleDoc,elements:[{...clone(testTable),rows:3}]})`));
assert.throws(()=>run(`validate({...sampleDoc,elements:[{...clone(testTable),valign:'invalid'}]})`));
assert(run(`buildPrintJob({...sampleDoc,elements:[clone(testTable)]},[{}],2).html.includes('data-cell="1,1"')`));
assert.throws(()=>run(`buildPrintJob({...sampleDoc,elements:[{...clone(testTable),cells:[['Campo','Valor'],['{{missing}}','001']]}]},[{}],1)`));
assert(run(`tableProperties({...testTable,cells:[['<b>','Valor'],['Lote','001']]}).includes('&lt;b&gt;')`));
// Physical track sizes are preserved as weights across table resizing, storage and print.
assert(run(`(()=>{const e=clone(testTable);resizeTableTrack(e,'col',0,12,[40,40]);const t=tableTracks(e);return t.cols[0]===52&&t.cols[1]===28&&e.w===80&&e.cells[1][1]==='001'})()`));
assert(run(`(()=>{const e=clone(testTable);resizeTableTrack(e,'row',0,-100,[12,12]);const t=tableTracks(e);return t.rows[0]===1&&t.rows[1]===23})()`));
assert(run(`(()=>{const e=clone(testTable);resizeTableTrack(e,'col',0,12,[40,40]);e.w=160;return tableTracks(e).cols[0]===104&&tableTracks(e).cols[1]===56})()`));
assert(run(`(()=>{const e=clone(testTable);resizeTableTrack(e,'col',0,12,[40,40]);resizeTable(e,3,3);return e.colSizes.length===3&&e.colSizes[0]===52&&e.colSizes[1]===28&&e.colSizes[2]===40&&e.cells[1][1]==='001'})()`));
assert(run(`(()=>{const e={...clone(testTable),colSizes:[3,1],rowSizes:[1,3]},box=tableCellBox(e,1,1);return box.x===60&&box.y===6&&box.w===20&&box.h===18})()`));
assert(run(`(()=>{const e={...clone(testTable),colSizes:[3,1],rowSizes:[1,3]},cell=tableCellAt(e,65,10);return cell.row===1&&cell.col===1})()`));
assert(run(`(()=>{const doc=validate({...sampleDoc,elements:[{...clone(testTable),colSizes:[3,1],rowSizes:[1,3]}]});return doc.elements[0].colSizes[0]===3&&svgDoc(doc).includes('translate(60 6)')})()`));
assert.throws(()=>run(`validate({...sampleDoc,elements:[{...clone(testTable),colSizes:[0,1]}]})`));
assert.throws(()=>run(`validate({...sampleDoc,elements:[{...clone(testTable),rowSizes:[1]}]})`));
assert(run(`elementContent(testTable).includes('data-table-axis="col"')`));
assert(run(`!buildPrintJob({...sampleDoc,elements:[clone(testTable)]},[{}],1).html.includes('table-col-grip')`));
assert(run(`Math.abs(localDelta(10,0,90).y+10)<1e-8`));
// Black is shared by screen/export/print; only the former default green is migrated.
assert.equal(run(`el('text',0,0,10,5).color`),'#000000');
assert.equal(run(`validate({...sampleDoc,elements:[el('text',0,0,10,5,'Hola',{color:'#182c21'})]}).elements[0].color`),'#000000');
assert.equal(run(`validate({...sampleDoc,elements:[el('text',0,0,10,5,'Hola',{color:'#ff0000'})]}).elements[0].color`),'#ff0000');
assert(run(`svgDoc({...sampleDoc,elements:[el('text',0,0,10,5,'Hola')]}).includes('fill="#000000"')`));
// Full view fit accounts for both dimensions, including tall and very small viewports.
assert(run(`(()=>{const d={w:100,h:60},b={width:245,height:100},k=fittedScale(d,b);return d.w*k<=b.width&&d.h*k<=b.height})()`));
assert(run(`(()=>{const d={w:60,h:150},b={width:400,height:120},k=fittedScale(d,b);return d.w*k<=b.width&&d.h*k<=b.height})()`));
assert(run(`fittedScale({w:100,h:60},{width:300,height:100},'width')===3`));
assert(run(`fittedScale({w:100,h:60},{width:1,height:1})>0`));
const fakeInput={style:{},setAttribute(){},remove(){this.removed=true},focus(){},select(){},setSelectionRange(){}};
const fakeNode={classList:{add(){}},append(){}};
context.document.createElement=tag=>tag==='canvas'?{getContext:()=>null}:fakeInput;
context.document.querySelector=selector=>selector==='#canvas-area'?{clientWidth:590}:fakeNode;
assert.equal(run(`fitWidth=true;zoom=1;scale()`),5);
assert.equal(run(`state.h=200;scale()`),5); // Width fit ignores label height.
run(`state.h=60;fitWidth=false;render=()=>{};persist=()=>{};history=[];future=[];`);
run(`startInlineEdit(state.elements[0]);activeEditor.input.value='Texto editado';finishInlineEdit()`);
assert.equal(run(`state.elements[0].text`),'Texto editado');assert.equal(run(`history.length`),1);
run(`startInlineEdit(state.elements[0]);activeEditor.input.value='Cancelar';finishInlineEdit(false)`);
assert.equal(run(`state.elements[0].text`),'Texto editado');assert.equal(run(`history.length`),1);
run(`startInlineEdit(state.elements[0]);activeEditor.input.value='Escape';activeEditor.input.onkeydown({key:'Escape',stopPropagation(){},preventDefault(){}})`);
assert.equal(run(`state.elements[0].text`),'Texto editado');
run(`startInlineEdit(state.elements[0]);activeEditor.input.value='Confirmado';activeEditor.input.onkeydown({key:'Enter',ctrlKey:true,stopPropagation(){},preventDefault(){}})`);
assert.equal(run(`state.elements[0].text`),'Confirmado');assert.equal(run(`activeEditor`),null);
// Double-click cell editing uses the cell's own canvas rectangle and commits one undo step.
run(`let directTable=el('table',0,0,80,24,'',{rows:2,cols:2,cells:[['Campo','Valor'],['Lote','001']],header:true,colSizes:[3,1],rowSizes:[1,3]});state.elements.push(directTable);history=[];`);
run(`startInlineEdit(directTable,undefined,{row:1,col:1});activeEditor.input.value='Nuevo lote';finishInlineEdit()`);
assert.equal(run(`directTable.cells[1][1]`),'Nuevo lote');assert.equal(run(`history.length`),1);
assert.equal(run(`history[0].elements.find(e=>e.id===directTable.id).cells[1][1]`),'001');
run(`startInlineEdit(directTable,undefined,{row:1,col:1});activeEditor.input.value='Cancelar';finishInlineEdit(false)`);
assert.equal(run(`directTable.cells[1][1]`),'Nuevo lote');assert.equal(run(`history.length`),1);
run(`startInlineEdit(directTable,undefined,{row:0,col:0});activeEditor.input.value='Cabecera';activeEditor.input.onkeydown({key:'Tab',stopPropagation(){},preventDefault(){}})`);
assert.equal(run(`directTable.cells[0][0]`),'Cabecera');assert.equal(run(`activeEditor.cell.col`),1);
run(`activeEditor.input.onkeydown({key:'Tab',shiftKey:true,stopPropagation(){},preventDefault(){}})`);
assert.equal(run(`activeEditor.cell.col`),0);run(`finishInlineEdit(false)`);
// A divider drag keeps the total width fixed and is recorded as a single undo action.
const dragNode={setPointerCapture(){},innerHTML:''};context.dragNode=dragNode;
run(`history=[];fitWidth=false;fitScreen=false;zoom=1;beginTableTrackResize({clientX:0,clientY:0,pointerId:1},dragNode,directTable,'col',0)`);
dragNode.onpointermove({clientX:10,clientY:0});dragNode.onpointermove({clientX:20,clientY:0});
assert.equal(run(`history.length`),1);assert(run(`Math.abs(tableTracks(directTable).cols.reduce((a,b)=>a+b)-80)<1e-8`));
assert(run(`tableTracks(directTable).cols[0]>60`));dragNode.onpointerup();
// Grid controls the actual sticker overlay and its spacing tracks zoom.
const gridState={},gridBoard={classList:{toggle(name,value){gridState[name]=value}},style:{setProperty(name,value){gridState[name]=value}}};
const previousQuery=context.document.querySelector;context.document.querySelector=id=>id==='#board'?gridBoard:previousQuery(id);
run(`applyGrid(true,4)`);assert.equal(gridState['show-grid'],true);assert.equal(gridState['--grid-step'],'20px');
run(`applyGrid(false,4)`);assert.equal(gridState['show-grid'],false);context.document.querySelector=previousQuery;
// Exercise the visible toolbar controls with the selected element.
const controls=Object.fromEntries(['#text-toolbar','#font-smaller','#font-larger','#font-points','#text-bold','#toolbar-fit-text'].map(id=>[id,{innerHTML:''}]));
const alignButtons=['left','center','right','justify'].map(a=>({dataset:{textAlign:a}}));
const verticalButtons=['top','middle','bottom'].map(a=>({dataset:{textValign:a}}));
controls['#text-toolbar'].querySelectorAll=selector=>selector==='[data-text-valign]'?verticalButtons:alignButtons;
context.document.querySelector=id=>controls[id]||fakeNode;
run(`selected=state.elements[0].id;state.elements[0].size=12*MM_PER_PT;renderTextToolbar()`);
assert(controls['#text-toolbar'].innerHTML.includes('aria-label="Centrar texto"'));
assert(controls['#text-toolbar'].innerHTML.includes('value="12"'));
controls['#font-larger'].onclick();assert.equal(run(`textSizeInPoints(state.elements[0])`),13);
run(`renderTextToolbar()`);controls['#font-smaller'].onclick();assert.equal(run(`textSizeInPoints(state.elements[0])`),12);
alignButtons[1].onclick();assert.equal(run(`state.elements[0].align`),'center');
controls['#font-points'].onchange({target:{value:'24'}});assert.equal(run(`textSizeInPoints(state.elements[0])`),24);
controls['#toolbar-fit-text'].onclick();assert.equal(run(`state.elements[0].x`),5);assert.equal(run(`state.elements[0].w`),90);
verticalButtons[1].onclick();assert.equal(run(`state.elements[0].valign`),'middle');
run(`renderTextToolbar()`);assert(controls['#text-toolbar'].innerHTML.includes('aria-label="Centrar verticalmente"'));
verticalButtons[2].onclick();assert.equal(run(`state.elements[0].valign`),'bottom');
run(`selected=null;renderTextToolbar()`);assert(controls['#text-toolbar'].innerHTML.includes('Selecciona un texto'));assert(controls['#text-toolbar'].innerHTML.includes('disabled'));
// Tables created in the editor are editable without rebuilding the cell input panel.
run(`addElement('table')`);
assert(run(`state.elements.find(e=>e.id===selected).type==='table'`));
assert(run(`state.elements.find(e=>e.id===selected).rows===3`));
const tableInput={dataset:{tableCell:'1,1'},value:'Editado'},tableDimension={dataset:{tableDimension:'cols'},value:'3'};
controls['#properties']={querySelectorAll:selector=>selector==='[data-table-cell]'?[tableInput]:[tableDimension]};
controls['#undo']={};controls['#redo']={};
run(`let editedTable=state.elements.find(e=>e.id===selected);wireTableProperties(editedTable)`);
tableInput.onchange();assert.equal(run(`editedTable.cells[1][1]`),'Editado');
tableDimension.onchange();assert.equal(run(`editedTable.cols`),3);assert.equal(run(`editedTable.cells[1][1]`),'Editado');
assert(run(`JSON.parse(JSON.stringify(editedTable)).cells[1][1]==='Editado'`));
console.log('Comprobaciones correctas: códigos, CSV, SVG, plantillas, alineación, ajuste de líneas, centrado, resize rotado, ajuste al ancho, edición directa tablas, alineación vertical e impresión con papel del sistema.');
