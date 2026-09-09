/* Small DOM utilities shared by Learn and the portable laboratory. MIT. */
(function () {
  'use strict';
  var Q = window.QEVA, NS = 'http://www.w3.org/2000/svg';
  function node(tag, props, children) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (key) {
      var value = props[key];
      if (key === 'text') e.textContent = value;
      else if (key === 'class') e.className = value;
      else if (key === 'on') Object.keys(value).forEach(function (ev) { e.addEventListener(ev, value[ev]); });
      else if (key === 'hidden' || key === 'disabled' || key === 'checked' || key === 'open' || key === 'required') e[key] = !!value;
      else if (value !== null && value !== undefined) e.setAttribute(key, String(value));
    });
    (children || []).forEach(function (child) { e.appendChild(typeof child === 'string' ? document.createTextNode(child) : child); });
    return e;
  }
  function svg(tag, props) { var e = document.createElementNS(NS, tag); Object.keys(props || {}).forEach(function (k) { e.setAttribute(k, props[k]); }); return e; }
  function url(path) { return (document.body.dataset.root || '../') + path; }
  function archive(ref) { var parts = ref.split(':').pop().split('@'); return url('archive/index.html#' + parts[0] + '-r' + parts[1]); }
  function download(text, filename) {
    var objectURL = URL.createObjectURL(new Blob([text], {type: 'application/json;charset=utf-8'}));
    var a = node('a', {href: objectURL, download: filename}); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(objectURL); }, 1500);
  }
  function parameters(ref, values, editable, prefix) {
    var fields = Q.Kernels.definition(ref).parameters, inputs = {}, root = node('div', {class: 'lab-parameters'});
    Object.keys(fields).forEach(function (key) {
      var s = fields[key], input = node('input', {id:prefix+'-'+key, type:s.kind === 'integer-string' ? 'text' : 'number', inputmode:s.kind === 'integer-string' ? 'numeric' : 'decimal', value:values[key], min:s.min, max:s.max, step:s.integer ? 1 : 'any', maxlength:s.kind === 'integer-string' ? 30 : null, required:true, disabled:editable && editable.indexOf(key) < 0});
      inputs[key] = input;
      root.appendChild(node('div', {class:'field'}, [node('label', {for:input.id, text:s.label}), input]));
    });
    return {element:root, inputs:inputs, read:function () {
      var p={}; Object.keys(fields).forEach(function (key) {
        var raw=inputs[key].value.trim();
        if (!raw) throw new Error(fields[key].label+' is required; a blank value is not zero.');
        p[key]=fields[key].kind === 'integer-string' ? raw : Number(raw);
      }); return Q.Kernels.validate(ref,p);
    }};
  }
  function number(n) { return Number(n).toLocaleString('en-US', {maximumSignificantDigits:6, useGrouping:false}); }
  function plot(result, target) {
    target.replaceChildren(); var logarithmic=result.kernel_ref === 'qeva:kernel:collatz@1';
    function numeric(v) {
      if (!logarithmic) return v;
      var s=String(v), first=s.slice(0,15); return Math.log10(Number(first))+Math.max(0,s.length-15);
    }
    var rows=result.series, values=[];
    rows.forEach(function (r) { r.slice(1).forEach(function (v) { values.push(numeric(v)); }); });
    var min=Math.min.apply(null, values), max=Math.max.apply(null, values);
    if (result.kernel_ref === 'qeva:kernel:logistic@1') { min=0; max=1; }
    if (min === max) { min-=1; max+=1; }
    var width=720, height=265, left=65, right=16, top=24, bottom=36;
    var x=function (i) {return left+i/Math.max(1,rows.length-1)*(width-left-right);};
    var y=function (v) {return height-bottom-(numeric(v)-min)/(max-min)*(height-top-bottom);};
    var chart=svg('svg',{viewBox:'0 0 '+width+' '+height,role:'img','aria-label':logarithmic ? 'Collatz orbit, vertical axis is approximate base-10 logarithm; exact values are in the table below.' : 'Declared recurrence trajectory. Exact exported numerical values are in the table below.',class:'trajectory'});
    chart.appendChild(svg('path',{d:'M'+left+' '+top+'V'+(height-bottom)+'H'+(width-right),class:'plot-axis'}));
    [min,(min+max)/2,max].forEach(function (tick) {
      var yy=height-bottom-(tick-min)/(max-min)*(height-top-bottom);
      var label=svg('text',{x:left-8,y:yy+4,'text-anchor':'end',class:'plot-label'});label.textContent=number(tick);chart.appendChild(label);
    });
    [0,rows.length-1].forEach(function (n) {var label=svg('text',{x:x(n),y:height-13,'text-anchor':'middle',class:'plot-label'});label.textContent=String(n);chart.appendChild(label);});
    for (var col=1;col<rows[0].length;col+=1) {
      var d=rows.map(function (r,i) {return (i?'L':'M')+x(i).toFixed(3)+' '+y(r[col]).toFixed(3);}).join(' ');
      chart.appendChild(svg('path',{d:d,class:'plot-line'+(col===2?' comparison':'')}));
    }
    target.appendChild(chart);
    target.appendChild(node('p',{class:'plot-key',text:logarithmic ? 'Vertical: log₁₀(value), approximate visual scale. Horizontal: update index. Integer values below are exact.' : 'Horizontal: update index. Vertical: value.'+(rows[0].length===3?' Solid: x₀. Dashed: x₀ + Δ.':'')}));
    var table=node('table',{class:'data-table'}), header=node('tr');
    ['Index','Value'].concat(rows[0].length===3?['Nearby value']:[]).forEach(function(t){header.appendChild(node('th',{scope:'col',text:t}));});
    table.appendChild(node('thead',{},[header])); var body=node('tbody');
    rows.forEach(function (r) {body.appendChild(node('tr',{},r.map(function (v) {return node('td',{text:String(v)});})));});table.appendChild(body);
    target.appendChild(node('details',{class:'data-disclosure'},[node('summary',{text:'Inspect all '+rows.length+' computed states'}),node('div',{class:'table-scroll',tabindex:'0',role:'region','aria-label':'Computed values'},[table])]));
  }
  Q.UI={node:node,url:url,archive:archive,download:download,parameters:parameters,plot:plot};
}());
