/* Reusable activity rendering registry; concepts contain no executable code. MIT. */
(function () {
  'use strict';
  var Q=window.QEVA, U=Q.UI, E=Q.Learning, n=U.node, renderers=new Map();
  function options(options, name, legend) {
    var field=n('fieldset',{class:'answer-options'},[n('legend',{class:'sr-only',text:legend})]);
    options.forEach(function (o) {
      var input=n('input',{type:'radio',name:name,value:o.id,required:true});
      field.appendChild(n('label',{class:'answer-option'},[input,n('span',{text:o.text})]));
    });
    return {element:field,read:function(){var picked=field.querySelector('input:checked');return picked?picked.value:null;}};
  }
  renderers.set('number', function (a, root, prefix) {
    if (a.config.display.length) root.appendChild(n('ol',{class:'sequence-strip','aria-label':'Sequence under the stated rule'},a.config.display.map(function (x) {return n('li',{text:x});})));
    var input=n('input',{id:prefix+'-number',type:'number',step:'any',inputmode:'decimal',required:true,autocomplete:'off'});
    root.appendChild(n('div',{class:'number-answer'},[n('label',{for:input.id,text:'Your prediction'}),input]));
    return function(){return {value:input.value};};
  });
  renderers.set('choice', function (a, root, prefix) {
    var field=options(a.config.options,prefix,a.prompt);root.appendChild(field.element);return function(){return {option:field.read()};};
  });
  renderers.set('classification', function(a,root,prefix){
    var selects={};a.config.items.forEach(function(item){
      var select=n('select',{id:prefix+'-'+item.id,required:true},[n('option',{value:'',text:'Choose a label…'})]);
      a.config.labels.forEach(function(label){select.appendChild(n('option',{value:label.id,text:label.text}));});selects[item.id]=select;
      root.appendChild(n('div',{class:'classification-row'},[n('label',{for:select.id,text:item.text}),select]));
    });
    return function(){var labels={};Object.keys(selects).forEach(function(k){labels[k]=selects[k].value;});return {labels:labels};};
  });
  renderers.set('order',function(a,root){
    var steps=a.config.steps.slice(), list=n('ol',{class:'proof-steps'});root.appendChild(list);
    function draw(focusId,dir){
      list.replaceChildren();steps.forEach(function(step,i){
        var row=n('li',{},[n('p',{text:step.text})]), controls=n('div',{class:'order-controls'});
        [-1,1].forEach(function(delta){
          var button=n('button',{type:'button',class:'small-button',text:delta<0?'↑ Move up':'↓ Move down',disabled:i+delta<0||i+delta>=steps.length,'aria-label':(delta<0?'Move up: ':'Move down: ')+step.text});
          button.dataset.step=step.id;button.dataset.dir=delta;
          button.addEventListener('click',function(){var temp=steps[i+delta];steps[i+delta]=step;steps[i]=temp;draw(step.id,delta);});controls.appendChild(button);
        });row.appendChild(controls);list.appendChild(row);
      });
      if(focusId!==undefined){var b=list.querySelector('[data-step="'+focusId+'"][data-dir="'+dir+'"]');if(b&&b.disabled)b=list.querySelector('[data-step="'+focusId+'"]:not(:disabled)');if(b)b.focus();}
    }
    draw();return function(){return {order:steps.map(function(step){return step.id;})};};
  });
  renderers.set('experiment',function(a,root,prefix){
    var c=a.config, definition=Q.Kernels.definition(c.kernel_ref), runs=[], last=null;
    root.appendChild(n('p',{class:'formula',text:definition.rule}));
    var fields=U.parameters(c.kernel_ref,c.parameters,c.editable,prefix);root.appendChild(fields.element);
    var result=n('div',{class:'experiment-result'}), status=n('p',{class:'readout','aria-live':'polite'}), log=n('ol',{class:'run-comparisons'});
    var run=n('button',{type:'button',class:'button secondary',text:'Run the declared rule'});
    run.addEventListener('click',function(){
      try{
        if(runs.length>=12)throw new Error('This activity retains up to 12 comparison runs. Open a personal lab to continue without discarding evidence.');
        var p=fields.read();last=Q.Kernels.run(c.kernel_ref,p);runs.push(p);U.plot(last,result);
        status.textContent=Q.Kernels.explain(last);
        log.appendChild(n('li',{text:'Run '+runs.length+' · '+Object.keys(p).map(function(k){return k+'='+p[k];}).join(' · ')+' — '+Q.Kernels.explain(last)}));
      }catch(error){status.textContent=error.message;}
    });
    root.appendChild(run);root.appendChild(status);root.appendChild(result);
    root.appendChild(n('details',{},[n('summary',{text:'Compare runs retained in this activity'}),log]));
    var field=options(c.conclusions,prefix+'-conclusion','Interpret the experiment');root.appendChild(n('h4',{text:'What can you conclude?'}));root.appendChild(field.element);
    root.appendChild(n('p',{},[n('a',{class:'inline-link',href:U.url('sandbox/workshop/index.html?kernel='+encodeURIComponent(c.kernel_ref)+'&concept='+encodeURIComponent(a.concept_ref)),text:'Build and preserve your own version →'})]));
    return function(){return {runs:runs.slice(),conclusion:field.read()};};
  });
  function mount(activity, target, onAttempt) {
    target.replaceChildren();target.classList.add('activity');target.dataset.activityRef=E.ref(activity);
    if(!renderers.has(activity.type)){target.appendChild(n('p',{class:'notice',text:'This activity needs a renderer not included in this mirror. Read the static edition.'}));return;}
    var prefix='activity-'+activity.id.split(':').pop(), title=n('h3',{id:prefix+'-title',text:activity.title});
    var form=n('form',{'aria-labelledby':title.id,novalidate:'novalidate'});
    form.appendChild(n('p',{class:'eyebrow',text:activity.stage.toUpperCase()+' · '+activity.type.toUpperCase()}));form.appendChild(title);
    form.appendChild(n('p',{class:'activity-prompt',text:activity.prompt}));
    var read=renderers.get(activity.type)(activity,form,prefix);
    form.appendChild(n('details',{class:'hint'},[n('summary',{text:'A small hint'}),n('p',{text:activity.hint})]));
    var submit=n('button',{type:'submit',class:'button',text:activity.type==='number'?'Test your prediction':'Check the reasoning'});
    form.appendChild(submit);var feedback=n('p',{class:'feedback',role:'status','aria-live':'polite','aria-atomic':'true'});form.appendChild(feedback);
    form.addEventListener('submit',function(event){
      event.preventDefault();
      try{
        var response=read(), assessment=E.assess(activity,response);
        // Persist failures too. A completed rendering or run never awards mastery.
        Q.Local.record(E.ref(activity),response);
        feedback.textContent=assessment.message;feedback.dataset.result=assessment.passed?'pass':'retry';
        target.dataset.passed=assessment.passed?'true':'false';
        if(onAttempt)onAttempt(activity,assessment);
      }catch(error){feedback.textContent='The response was not saved: '+error.message;feedback.dataset.result='retry';}
    });
    target.appendChild(form);
  }
  Q.Activities={mount:mount,register:function(type,renderer){if(renderers.has(type))throw new Error('Renderer already registered.');renderers.set(type,renderer);},types:function(){return Array.from(renderers.keys());}};
}());
