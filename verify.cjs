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
// Cell formatting overrides only that cell, including unbolding a header.
assert(run(`(()=>{const e=clone(testTable);setCellFormat(e,{row:0,col:0},'bold',false);setCellFormat(e,{row:1,col:1},'color','#ff0000');return !cellTextStyle(e,0,0).bold&&cellTextStyle(e,0,1).bold&&cellTextStyle(e,1,1).color==='#ff0000'&&cellTextStyle(e,1,0).color==='#000000'})()`));
assert(run(`(()=>{const e=clone(testTable);setCellFormat(e,{row:1,col:1},'font','Georgia');setCellFormat(e,{row:1,col:1},'size',5);setCellFormat(e,{row:1,col:1},'valign','bottom');resizeTable(e,3,3);return cellTextStyle(e,1,1).font==='Georgia'&&cellTextStyle(e,1,1).size===5&&cellTextStyle(e,1,1).valign==='bottom'&&Object.keys(e.cellFormats[2][2]).length===0&&e.cellFormats[2][1]!==e.cellFormats[2][2]})()`));
assert(run(`(()=>{const e=clone(testTable);setCellFormat(e,{row:1,col:1},'font','Georgia');setCellFormat(e,{row:1,col:1},'color','#ff0000');const d=validate(JSON.parse(JSON.stringify({...sampleDoc,elements:[e]})));const svg=svgDoc(d);return svg.includes('font-family="Georgia"')&&svg.includes('fill="#ff0000"')&&d.elements[0].cellFormats[1][1].font==='Georgia'})()`));
assert.throws(()=>run(`validate({...sampleDoc,elements:[{...clone(testTable),cellFormats:[[{size:-1},{}],[{},{}]]}]})`));
assert.throws(()=>run(`validate({...sampleDoc,elements:[{...clone(testTable),cellFormats:[[{font:'BadFont'},{}],[{},{}]]}]})`));
assert.throws(()=>run(`validate({...sampleDoc,elements:[{...clone(testTable),cellFormats:[[{color:'red'},{}],[{},{}]]}]})`));
assert.throws(()=>run(`validate({...sampleDoc,elements:[{...clone(testTable),cellFormats:[[{},{}]]}]})`));
assert.throws(()=>run(`validate({...sampleDoc,elements:[{...clone(testTable),cellFormats:[[null,{}],[{},{}]]}]})`));
assert(run(`(()=>{const e=clone(testTable);setCellFormat(e,{row:1,col:1},'size',8);setCellFormat(e,{row:1,col:1},'color','#ff0000');applyTextFormat({e,cell:null},'size',4);return cellTextStyle(e,1,1).size===4&&cellTextStyle(e,0,0).size===4&&cellTextStyle(e,1,1).color==='#ff0000'})()`));
assert(run(`(()=>{const e=clone(testTable),w=e.w,h=e.h;fitCellText(e,{row:1,col:1});const style=cellTextStyle(e,1,1);return measureText(e.cells[1][1],style)<=style.w+1e-8&&style.size*1.2<=style.h+1e-8&&e.w===w&&e.h===h})()`));
assert(run(`(()=>{const e=clone(testTable);applyTextFormat({e,cell:null},'bold',false);return !cellTextStyle(e,0,0).bold&&!cellTextStyle(e,0,1).bold&&!cellTextStyle(e,1,0).bold})()`));
// Cell text turns independently of the table and uses swapped layout dimensions.
assert(run(`(()=>{const e=clone(testTable),before=cellTextStyle(e,1,1);setCellFormat(e,{row:1,col:1},'textRotation',90);const after=cellTextStyle(e,1,1);return after.w===before.h&&after.h===before.w&&after.textRotation===90&&(e.rotation||0)===0&&cellTextStyle(e,1,0).textRotation===0})()`));
assert(run(`(()=>{const e=clone(testTable);setCellFormat(e,{row:1,col:1},'textRotation',270);const job=buildPrintJob({...sampleDoc,elements:[e]},[{}],1);return job.html.includes('rotate(270)')&&job.html.includes('data-cell="1,1"')})()`));
assert(run(`(()=>{const e=clone(testTable);setCellFormat(e,{row:1,col:1},'textRotation',90);fitCellText(e,{row:1,col:1});const style=cellTextStyle(e,1,1);return style.textRotation===90&&style.size*1.2<=style.h+1e-8&&measureText(e.cells[1][1],style)<=style.w+1e-8})()`));
assert(run(`(()=>{const e=clone(testTable);setCellFormat(e,{row:1,col:1},'textRotation',90);const doc=validate(JSON.parse(JSON.stringify({...sampleDoc,elements:[e]})));return doc.elements[0].cellFormats[1][1].textRotation===90})()`));
assert.throws(()=>run(`validate({...sampleDoc,elements:[{...clone(testTable),textRotation:45}]})`));
assert.throws(()=>run(`validate({...sampleDoc,elements:[{...clone(testTable),cellFormats:[[{textRotation:45},{}],[{},{}]]}]})`));
assert(run(`(()=>{const e=el('text',5,5,50,10,'Hola'),target={e,cell:null,style:e};rotateTextTarget(target,90);rotateTextTarget(target,-90);return e.rotation===0})()`));
assert(run(`(()=>{const e=el('text',5,5,50,10,'Hola'),target={e,cell:null,style:e};for(let i=0;i<4;i++)rotateTextTarget(target,90);return e.rotation===0})()`));
assert(run(`(()=>{const e=el('text',5,5,50,10,'Hola',{rotation:90}),f=fitTextToSticker(e,{w:60,h:100});return f.rotation===90&&f.w===90&&f.h<=54&&Math.abs(f.x+f.w/2-30)<1e-8&&Math.abs(f.y+f.h/2-50)<1e-8})()`));
// Overflowing and rotated objects remain inside the editable stage, with room for handles.
assert(run(`(()=>{const e=el('text',-15,26,90,48,'TU TEXTO'),doc={w:60,h:100,elements:[e]},b=editingBounds(doc),stage=canvasStage(doc,4);return b.left===-15&&b.right===75&&stage.width===380&&stage.left===70&&stage.left+e.x*4===10})()`));
assert(run(`(()=>{const e=el('text',-15,26,90,48,'TU TEXTO',{rotation:90}),b=rotatedElementBounds(e);return Math.abs(b.left-6)<1e-8&&Math.abs(b.top-5)<1e-8&&Math.abs(b.right-54)<1e-8&&Math.abs(b.bottom-95)<1e-8})()`));
assert(run(`(()=>{const doc={w:60,h:100,elements:[el('text',-30,-20,120,40,'Fuera',{rotation:35}),el('rect',80,110,20,30)]},k=3,stage=canvasStage(doc,k);return doc.elements.every(e=>{const b=rotatedElementBounds(e);return stage.left+b.left*k>=9.999&&stage.top+b.top*k>=9.999&&stage.left+b.right*k<=stage.width-9.999&&stage.top+b.bottom*k<=stage.height-9.999})})()`));
assert(run(`(()=>{const doc={w:60,h:100,elements:[el('text',-15,26,90,48,'TU TEXTO')]},extent=editingBounds(doc),bounds={width:450,height:350},k=fittedScale(extent,bounds);return extent.w*k<=bounds.width&&extent.h*k<=bounds.height})()`));
assert(run(`(()=>{const doc={...sampleDoc,elements:[el('text',-25,5,90,40,'Fuera')]};return svgDoc(doc).includes('overflow="hidden"')&&svgDoc(doc).includes('translate(-25 5)')&&!buildPrintJob(doc,[{}],1).html.includes('resize-handle')})()`));
// Formatting ranges touches every cell in the selected row/column, preserving neighbors.
assert(run(`(()=>{const e=clone(testTable),cell={row:1,col:0,scope:'row'};applyTextFormat({e,cell},'size',5);return cellTextStyle(e,1,0).size===5&&cellTextStyle(e,1,1).size===5&&cellTextStyle(e,0,0).size===e.size})()`));
assert(run(`(()=>{const e=clone(testTable),cell={row:0,col:1,scope:'col'};applyTextFormat({e,cell},'color','#ff0000');return cellTextStyle(e,0,1).color==='#ff0000'&&cellTextStyle(e,1,1).color==='#ff0000'&&cellTextStyle(e,1,0).color==='#000000'})()`));
assert.equal(run(`tableRangeCells(testTable,{row:1,col:0,scope:'row'}).length`),2);
assert.equal(run(`tableRangeCells(testTable,null).length`),4);
// Inserting preserves existing content/styles; deleting restores the original grid.
assert(run(`(()=>{const e=clone(testTable);setCellFormat(e,{row:0,col:0},'color','#ff0000');mutateTableTrack(e,'col',1);const good=e.cols===3&&e.w===120&&e.cells[0][1]===''&&e.cells[0][2]==='Valor'&&e.cellFormats[0][1].color==='#ff0000'&&e.cellFormats[0][1]!==e.cellFormats[0][0];mutateTableTrack(e,'col',1,'delete');return good&&e.cols===2&&e.w===80&&e.cells[0][1]==='Valor'})()`));
assert(run(`(()=>{const e={...clone(testTable),rowSizes:[1,3]};mutateTableTrack(e,'row',1);const good=e.rows===3&&e.h===30&&e.cells[2][1]==='001'&&tableTracks(e).rows[2]===18;mutateTableTrack(e,'row',1,'delete');return good&&e.h===24&&e.cells[1][1]==='001'})()`));
assert.throws(()=>run(`mutateTableTrack({...clone(testTable),rows:1,cells:[['A','B']]},'row',0,'delete')`));
assert.throws(()=>run(`mutateTableTrack(clone(testTable),'row',0,'invalid')`));
assert.throws(()=>run(`(()=>{const e=clone(testTable);resizeTable(e,10,2);mutateTableTrack(e,'row',10)})()`));
// Full-track resizing changes only that track and expands the total table extent.
assert(run(`(()=>{const e=clone(testTable);setSingleTrackSize(e,'col',0,50);return e.w===90&&tableTracks(e).cols[0]===50&&tableTracks(e).cols[1]===40&&e.h===24})()`));
assert(run(`(()=>{const e=clone(testTable);setSingleTrackSize(e,'row',1,20);return e.h===32&&tableTracks(e).rows[0]===12&&tableTracks(e).rows[1]===20&&e.w===80})()`));
assert(run(`(()=>{const e={...clone(testTable),rotation:90},origin=o=>{const p=localDelta(-o.w/2,-o.h/2,-o.rotation);return {x:o.x+o.w/2+p.x,y:o.y+o.h/2+p.y}},before=origin(e);setSingleTrackSize(e,'col',0,60);const after=origin(e);return Math.abs(before.x-after.x)<1e-8&&Math.abs(before.y-after.y)<1e-8})()`));
assert.throws(()=>run(`setSingleTrackSize(clone(testTable),'row',1,0)`));
assert(run(`tableHandles(testTable).includes('data-table-action="insert-col"')&&tableHandles(testTable).includes('data-table-action="select-row"')`));
assert(run(`!buildPrintJob({...sampleDoc,elements:[clone(testTable)]},[{}],1).html.includes('data-table-action')`));
assert(run(`(()=>{const e=clone(testTable);mutateTableTrack(e,'row',1);applyTextFormat({e,cell:{row:1,col:0,scope:'row'}},'bold',true);return validate(JSON.parse(JSON.stringify({...sampleDoc,elements:[e]}))).elements[0].cellFormats[1][1].bold})()`));
// Automatic fields use local time, preserve CSV overrides and keep the existing counter.
assert.equal(run(`withVariableClock(new Date(2026,0,2,3,4,5),()=>val('{{fecha}} {{fecha_iso}} {{hora}} {{fecha_hora}} {{dia}} {{mes}} {{anio}} {{año}} {{numero}}',{},2))`),'02/01/2026 2026-01-02 03:04 02/01/2026 03:04 02 01 2026 2026 0003');
assert.equal(run(`withVariableClock(new Date(2026,0,2),()=>val('{{fecha}} {{numero}}',{fecha:'Fecha CSV',numero:'9999'},0))`),'Fecha CSV 0001');
assert.equal(run(`val('{{constructor}} {{desconocido}}')`),'{{constructor}} {{desconocido}}');
assert(run(`(()=>{const original=automaticFields,seen=[];automaticFields=()=>{seen.push(variableClock);return original()};try{const doc={...sampleDoc,elements:[el('text',0,0,50,20,'{{fecha}} {{hora}} {{numero}}')]};const job=buildPrintJob(doc,[{},{}],2);return job.total===4&&!job.html.includes('{{fecha}}')&&seen.every(value=>value&&value===seen[0])&&variableClock===null}finally{automaticFields=original}})()`));
assert(run(`(()=>{const date=new Date(2026,0,2);return withVariableClock(date,()=>{try{buildPrintJob({...sampleDoc,elements:[el('text',0,0,20,10,'{{missing}}')]},[{}],1)}catch{}return variableClock===date})&&variableClock===null})()`));
const fakeInput={style:{},setAttribute(){},remove(){this.removed=true},focus(){},select(){},setSelectionRange(){}};
const fakeNode={classList:{add(){},remove(){}},append(){}};
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
const controls=Object.fromEntries(['#text-toolbar','#font-smaller','#font-larger','#font-points','#text-bold','#toolbar-fit-text','#text-font','#text-ink','#format-entire-table','#text-turn-left','#text-turn-right','#text-turn-reset','#range-track-size','#range-add-track','#range-delete-track'].map(id=>[id,{innerHTML:''}]));
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
// Selecting a table cell enables the same toolbar and isolates formatting changes.
run(`activeCell={id:editedTable.id,row:1,col:1};renderTextToolbar()`);
assert(controls['#text-toolbar'].innerHTML.includes('Celda 2 · 2'));
controls['#font-points'].onchange({target:{value:'18'}});
assert(run(`Math.abs(cellTextStyle(editedTable,1,1).size-18*MM_PER_PT)<1e-9`));
assert(run(`cellTextStyle(editedTable,1,0).size===editedTable.size`));
run(`renderTextToolbar()`);controls['#text-font'].onchange({target:{value:'Georgia'}});
run(`renderTextToolbar()`);controls['#text-ink'].onchange({target:{value:'#ff0000'}});
run(`renderTextToolbar()`);controls['#text-bold'].onclick();
assert.equal(run(`cellTextStyle(editedTable,1,1).font`),'Georgia');
assert.equal(run(`cellTextStyle(editedTable,1,1).color`),'#ff0000');
assert.equal(run(`cellTextStyle(editedTable,1,1).bold`),true);
alignButtons[1].onclick();verticalButtons[2].onclick();
assert.equal(run(`cellTextStyle(editedTable,1,1).align`),'center');
assert.equal(run(`cellTextStyle(editedTable,1,1).valign`),'bottom');
run(`startInlineEdit(editedTable,undefined,{row:1,col:1})`);
assert(fakeInput.style.cssText.includes('font-family:Georgia'));
assert(fakeInput.style.cssText.includes('color:#ff0000'));
assert(fakeInput.style.cssText.includes('text-align:center'));
run(`finishInlineEdit(false);renderTextToolbar()`);
controls['#format-entire-table'].onclick();assert.equal(run(`activeCell`),null);
run(`renderTextToolbar()`);assert(controls['#text-toolbar'].innerHTML.includes('Tabla completa'));
controls['#font-points'].onchange({target:{value:'14'}});
assert(run(`Math.abs(cellTextStyle(editedTable,1,1).size-14*MM_PER_PT)<1e-9`));
assert(run(`Math.abs(cellTextStyle(editedTable,1,0).size-14*MM_PER_PT)<1e-9`));
assert.equal(run(`cellTextStyle(editedTable,1,1).color`),'#ff0000');
// Rotation buttons operate on a selected cell and the inline editor mirrors the rotation.
run(`activeCell={id:editedTable.id,row:1,col:1};renderTextToolbar()`);
controls['#text-turn-right'].onclick();assert.equal(run(`cellTextStyle(editedTable,1,1).textRotation`),90);
assert.equal(run(`cellTextStyle(editedTable,1,0).textRotation`),0);
run(`renderTextToolbar()`);controls['#text-turn-left'].onclick();assert.equal(run(`cellTextStyle(editedTable,1,1).textRotation`),0);
run(`renderTextToolbar()`);controls['#text-turn-right'].onclick();run(`renderTextToolbar()`);
assert(controls['#text-toolbar'].innerHTML.includes('>90°</button>'));
run(`startInlineEdit(editedTable,undefined,{row:1,col:1})`);assert.equal(fakeInput.style.transform,'rotate(90deg)');run(`finishInlineEdit(false);renderTextToolbar()`);
controls['#text-turn-reset'].onclick();assert.equal(run(`cellTextStyle(editedTable,1,1).textRotation`),0);
run(`activeCell=null;renderTextToolbar()`);controls['#text-turn-right'].onclick();
assert.equal(run(`cellTextStyle(editedTable,0,0).textRotation`),90);assert.equal(run(`cellTextStyle(editedTable,1,1).textRotation`),90);
// A saved design with cell formats must survive application startup, not just import.
const persisted=JSON.parse(run(`JSON.stringify({...sampleDoc,name:'Tabla guardada',elements:[editedTable]})`));
const reloaded=vm.createContext({console,localStorage:{getItem:key=>key==='labela-current'?JSON.stringify(persisted):null},document:{querySelector:()=>null}});
vm.runInContext(code,reloaded);
assert.equal(vm.runInContext(`state.name`,reloaded),'Tabla guardada');
assert.equal(vm.runInContext(`state.elements[0].cellFormats[1][1].color`,reloaded),'#ff0000');
// Saved designs keep stable identities across rename, autosave, copies and reloads.
const workspaceStorage=new Map();
const libraryFixture={name:'Mi etiqueta',w:60,h:100,bg:'#ffffff',template:'basic-text',elements:[{id:777,type:'text',x:5,y:5,w:50,h:20,text:'BODEGA',size:6,color:'#000000',bold:false,align:'center',rotation:0}]};
workspaceStorage.set('labela-current',JSON.stringify(libraryFixture));workspaceStorage.set('labela-library',JSON.stringify([libraryFixture]));
workspaceStorage.set('labela-view',JSON.stringify({tab:'library',filter:'Mis diseños',query:'bodega',zoom:1.4,fitWidth:false,fitScreen:false,grid:false,selected:777,scroll:{canvas:{top:120,left:30},left:{top:70,left:0},right:{top:140,left:0}},copies:2,rotateDesign:false,csv:{rows:[{producto:'Lejía'}],fields:['producto'],record:0}}));
function workspaceHarness(storage){
 const nodes={'#saved':{textContent:''},'#grid':{checked:true},'#copies':{value:1},'#rotate-design':{checked:true},'#canvas-area':{scrollTop:0,scrollLeft:0,clientWidth:590,clientHeight:500},'.left':{scrollTop:0,scrollLeft:0},'.right':{scrollTop:0,scrollLeft:0},'#docname':{value:''}};
 const ctx=vm.createContext({console,setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},document:{querySelector:key=>nodes[key]||null,querySelectorAll:()=>[],createElement:()=>({getContext:()=>null})}});
 vm.runInContext(code,ctx);vm.runInContext(`render=()=>{};renderLeft=()=>{};toast=()=>{};`,ctx);
 return {ctx,nodes,eval:script=>vm.runInContext(script,ctx)};
}
const workspace=workspaceHarness(workspaceStorage),wr=workspace.eval;
assert.equal(wr(`state.elements[0].id`),777); // Existing IDs must survive reload so selection restores correctly.
wr(`let restored=restoreWorkspace();restoreScroll(restored)`);
assert.equal(wr(`state.name`),'Mi etiqueta');assert.equal(wr(`state.savedId`),'legacy-0');
assert.equal(wr(`tab`),'library');assert.equal(wr(`filter`),'Mis diseños');assert.equal(wr(`zoom`),1.4);assert.equal(wr(`selected`),777);
assert.equal(workspace.nodes['#grid'].checked,false);assert.equal(workspace.nodes['#copies'].value,2);assert.equal(workspace.nodes['#rotate-design'].checked,false);
assert.equal(workspace.nodes['#canvas-area'].scrollTop,120);assert.equal(workspace.nodes['#canvas-area'].scrollLeft,30);assert.equal(workspace.nodes['.right'].scrollTop,140);
assert.equal(wr(`rows[0].producto`),'Lejía');assert.equal(wr(`csvFields[0]`),'producto');
assert(wr(`renameSavedDesign('legacy-0','Bodega aseo')`));assert.equal(wr(`state.name`),'Bodega aseo');assert.equal(wr(`getLibrary()[0].name`),'Bodega aseo');
wr(`state.elements[0].text='Nuevo texto';persist()`);assert.equal(wr(`getLibrary()[0].elements[0].text`),'Nuevo texto');assert.equal(wr(`getLibrary().length`),1);
wr(`renameCurrentDesign(' <Bodega & aseo> ')`);assert.equal(wr(`getLibrary()[0].name`),'<Bodega & aseo>');
assert(wr(`savedTemplateCards(getLibrary()).includes('&lt;Bodega &amp; aseo&gt;')`));assert(wr(`savedTemplateCards(getLibrary()).includes('data-saved-template="legacy-0"')`));
wr(`saveLibraryDesign()`);assert.equal(wr(`getLibrary().length`),1);
wr(`saveLibraryDesign(true)`);assert.equal(wr(`getLibrary().length`),2);assert.notEqual(wr(`state.savedId`),'legacy-0');
wr(`renameSavedDesign('legacy-0','Original')`);assert.equal(wr(`state.name`),'<Bodega & aseo>');assert.equal(wr(`getLibrary()[0].name`),'Original');
assert.equal(wr(`renameSavedDesign('legacy-0','   ')`),false);assert.equal(wr(`getLibrary()[0].name`),'Original');
wr(`loadLibraryDesign('legacy-0')`);assert.equal(wr(`state.name`),'Original');assert.equal(wr(`state.savedId`),'legacy-0');assert.equal(wr(`fitScreen`),true);assert.equal(workspace.nodes['#canvas-area'].scrollTop,0);
wr(`selected=777;tab='elements';zoom=1.7;fitScreen=false;query='Último';persist()`);
const reopened=workspaceHarness(workspaceStorage);reopened.eval(`let restored=restoreWorkspace();restoreScroll(restored)`);
assert.equal(reopened.eval(`state.name`),'Original');assert.equal(reopened.eval(`state.savedId`),'legacy-0');assert.equal(reopened.eval(`state.elements[0].text`),'Nuevo texto');
assert.equal(reopened.eval(`tab`),'elements');assert.equal(reopened.eval(`zoom`),1.7);assert.equal(reopened.eval(`query`),'Último');assert.equal(reopened.eval(`selected`),777);
wr(`deleteLibraryDesign('legacy-0')`);assert.equal(wr(`state.savedId`),undefined);assert.equal(wr(`state.name`),'Original');assert.equal(wr(`getLibrary().length`),1);
assert.equal(wr(`safeView({zoom:99,tab:'bad',filter:'bad',csv:{rows:[{a:1}],fields:['a']}}).zoom`),1);
assert.equal(wr(`safeView({tab:'bad'}).tab`),'templates');assert.equal(wr(`safeView({csv:{rows:[{a:1}],fields:['a']}}).csv.rows.length`),0);
workspace.ctx.localStorage.setItem=()=>{throw Error('quota')};assert.equal(wr(`renameSavedDesign(getLibrary()[0].savedId,'No guardar')`),false);
wr(`persist()`);assert(workspace.nodes['#saved'].textContent.includes('No se pudo guardar'));
// Pending inline edits must commit before formatting or history changes replace the document.
run(`renderLeft=()=>{};activeEditor=null;history=[];future=[];selected=state.elements[0].id;state.elements[0].text='Antes';state.elements[0].bold=false;startInlineEdit(state.elements[0]);activeEditor.input.value='Editado';change(()=>state.elements[0].bold=true)`);
assert.equal(run(`state.elements[0].text`),'Editado');assert.equal(run(`state.elements[0].bold`),true);assert.equal(run(`history.length`),2);
run(`stepHistory('undo')`);assert.equal(run(`state.elements[0].text`),'Editado');assert.equal(run(`state.elements[0].bold`),false);
run(`stepHistory('undo')`);assert.equal(run(`state.elements[0].text`),'Antes');
run(`stepHistory('redo')`);assert.equal(run(`state.elements[0].text`),'Editado');
run(`history=[];future=[];startInlineEdit(state.elements[0]);activeEditor.input.value='Pendiente';stepHistory('undo')`);
assert.equal(run(`state.elements[0].text`),'Editado');assert.equal(run(`activeEditor`),null);
run(`stepHistory('redo')`);assert.equal(run(`state.elements[0].text`),'Pendiente');
// Range selection exposes shared formatting and exact millimeter sizes in the toolbar.
run(`let rangeTable=el('table',0,0,80,24,'',{rows:2,cols:2,cells:[['A','B'],['C','D']],header:false});state.elements.push(rangeTable);selectTableRange(rangeTable,'row',1);renderTextToolbar()`);
assert(controls['#text-toolbar'].innerHTML.includes('Fila 2'));
controls['#font-points'].onchange({target:{value:'18'}});
assert(run(`Math.abs(cellTextStyle(rangeTable,1,0).size-18*MM_PER_PT)<1e-9&&Math.abs(cellTextStyle(rangeTable,1,1).size-18*MM_PER_PT)<1e-9&&cellTextStyle(rangeTable,0,0).size===rangeTable.size`));
controls['#range-track-size'].onchange({target:{value:'22'}});assert.equal(run(`rangeTable.h`),34);assert.equal(run(`tableTracks(rangeTable).rows[0]`),12);
run(`renderTextToolbar()`);controls['#range-add-track'].onclick();assert.equal(run(`rangeTable.rows`),3);assert.equal(run(`activeCell.row`),2);
run(`renderTextToolbar()`);controls['#range-delete-track'].onclick();assert.equal(run(`rangeTable.rows`),2);assert.equal(run(`rangeTable.h`),34);
run(`selectTableRange(rangeTable,'col',1);renderTextToolbar()`);assert(controls['#text-toolbar'].innerHTML.includes('Columna B'));
controls['#text-ink'].onchange({target:{value:'#ff0000'}});assert.equal(run(`cellTextStyle(rangeTable,0,1).color`),'#ff0000');assert.equal(run(`cellTextStyle(rangeTable,1,1).color`),'#ff0000');assert.equal(run(`cellTextStyle(rangeTable,1,0).color`),'#000000');
run(`executeTableControl({dataset:{tableAction:'insert-col',index:'1'}},rangeTable,null,null)`);assert.equal(run(`rangeTable.cols`),3);assert.equal(run(`rangeTable.cells[0][2]`),'B');
run(`executeTableControl({dataset:{tableAction:'select-col',index:'2'}},rangeTable,null,null)`);assert.equal(run(`activeCell.scope`),'col');assert.equal(run(`activeCell.col`),2);
run(`addElement('date')`);assert.equal(run(`state.elements.find(e=>e.id===selected).text`),'{{fecha}}');
run(`addElement('time')`);assert.equal(run(`state.elements.find(e=>e.id===selected).text`),'{{hora}}');
const rangeStorage=new Map(),rangeDocument=JSON.parse(run(`JSON.stringify({name:'Rango',w:100,h:60,bg:'#ffffff',elements:[rangeTable]})`)),rangeId=rangeDocument.elements[0].id;
rangeStorage.set('labela-current',JSON.stringify(rangeDocument));rangeStorage.set('labela-view',JSON.stringify({selected:rangeId,activeCell:{id:rangeId,row:0,col:1,scope:'col'}}));
const rangeReload=workspaceHarness(rangeStorage);rangeReload.eval(`restoreWorkspace()`);assert.equal(rangeReload.eval(`activeCell.scope`),'col');assert.equal(rangeReload.eval(`activeCell.col`),1);
console.log('Comprobaciones correctas: códigos, CSV, SVG, plantillas, alineación, ajuste de líneas, centrado, resize rotado, ajuste al ancho, edición directa tablas, alineación vertical impresión, filas/columnas y campos automáticos.');
