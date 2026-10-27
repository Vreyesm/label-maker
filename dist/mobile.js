// Keep one set of controls and state when switching between phone and desktop.
(()=>{
 const media=window.matchMedia('(max-width: 1050px)'),panel=$('#mobile-panel'),content=$('#mobile-panel-content'),left=$('.left'),right=$('.right'),workspace=$('.workspace');
 const canvasButton=$('#mobile-canvas'),settingsButton=$('#mobile-settings'),editButton=$('#mobile-edit');
 function updateNavigation(){
  canvasButton.classList.toggle('active',!panel.open);
  document.body.classList.toggle('mobile-panel-open',panel.open);
  document.querySelectorAll('[data-tab]').forEach(button=>button.setAttribute('aria-expanded',String(panel.open&&panel.dataset.panel==='left'&&button.dataset.tab===tab)));
  settingsButton.setAttribute('aria-expanded',String(panel.open&&panel.dataset.panel==='right'));
 }
 function closePanel(){if(panel.open)panel.close();updateNavigation();requestAnimationFrame(()=>render())}
 function openPanel(side,title){
  if(!media.matches)return;finishInlineEdit();panel.dataset.panel=side;$('#mobile-panel-title').textContent=title;
  if(!panel.open)panel.showModal();updateNavigation();
 }
 function syncLayout(){
  closePanel();
  if(media.matches){content.append(left,right);document.querySelectorAll('[data-tab]').forEach(button=>button.setAttribute('aria-haspopup','dialog'))}
  else{workspace.before(left);workspace.after(right);document.querySelectorAll('[data-tab]').forEach(button=>{button.removeAttribute('aria-haspopup');button.removeAttribute('aria-expanded')})}
  requestAnimationFrame(()=>render());
 }
 document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>openPanel('left',button.textContent)));
 settingsButton.onclick=()=>openPanel('right','Configuración');canvasButton.onclick=closePanel;
 $('#mobile-panel-close').onclick=closePanel;
 panel.addEventListener('close',()=>{updateNavigation();requestAnimationFrame(()=>render())});
 panel.addEventListener('click',event=>{if(event.target===panel)closePanel()});
 left.addEventListener('click',event=>{if(event.target.closest('[data-add],[data-template],[data-saved-template],[data-load],#blank'))closePanel()});
 function updateEdit(){const e=state.elements.find(item=>item.id===selected);editButton.disabled=!(e?.type==='text'||(e?.type==='table'&&selectedTableCell(e)));editButton.textContent=activeEditor?'✓ Terminar edición':'✎ Editar texto';}
 editButton.onpointerdown=event=>{if(activeEditor)event.preventDefault()};
 editButton.onclick=()=>{if(activeEditor){finishInlineEdit();return}const e=state.elements.find(item=>item.id===selected);if(e?.type==='text')startInlineEdit(e);else if(e?.type==='table'){const cell=selectedTableCell(e);if(cell)startInlineEdit(e,undefined,{row:cell.row,col:cell.col})}};
 new MutationObserver(updateEdit).observe($('#properties'),{childList:true});updateEdit();
 media.addEventListener('change',syncLayout);syncLayout();
})();
