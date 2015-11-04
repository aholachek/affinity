(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Popover = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var now=require("date-now");module.exports=function(n,u,t){function e(){var p=now()-a;u>p&&p>0?r=setTimeout(e,u-p):(r=null,t||(i=n.apply(o,l),r||(o=l=null)))}var r,l,o,a,i;return null==u&&(u=100),function(){o=this,l=arguments,a=now();var p=t&&!r;return r||(r=setTimeout(e,u)),p&&(i=n.apply(o,l),o=l=null),i}};


},{"date-now":2}],2:[function(require,module,exports){
function now(){return(new Date).getTime()}module.exports=Date.now||now;


},{}],3:[function(require,module,exports){
function parse(e,t){if("string"!=typeof e)throw new TypeError("String expected");t||(t=document);var a=/<([\w:]+)/.exec(e);if(!a)return t.createTextNode(e);e=e.replace(/^\s+|\s+$/g,"");var r=a[1];if("body"==r){var l=t.createElement("html");return l.innerHTML=e,l.removeChild(l.lastChild)}var i=map[r]||map._default,p=i[0],o=i[1],d=i[2],l=t.createElement("div");for(l.innerHTML=o+e+d;p--;)l=l.lastChild;if(l.firstChild==l.lastChild)return l.removeChild(l.firstChild);for(var n=t.createDocumentFragment();l.firstChild;)n.appendChild(l.removeChild(l.firstChild));return n}module.exports=parse;var div=document.createElement("div");div.innerHTML='  <link/><table></table><a href="/a">a</a><input type="checkbox"/>';var innerHTMLBug=!div.getElementsByTagName("link").length;div=void 0;var map={legend:[1,"<fieldset>","</fieldset>"],tr:[2,"<table><tbody>","</tbody></table>"],col:[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"],_default:innerHTMLBug?[1,"X<div>","</div>"]:[0,"",""]};map.td=map.th=[3,"<table><tbody><tr>","</tr></tbody></table>"],map.option=map.optgroup=[1,'<select multiple="multiple">',"</select>"],map.thead=map.tbody=map.colgroup=map.caption=map.tfoot=[1,"<table>","</table>"],map.polyline=map.ellipse=map.polygon=map.circle=map.text=map.line=map.path=map.rect=map.g=[1,'<svg xmlns="http://www.w3.org/2000/svg" version="1.1">',"</svg>"];


},{}],4:[function(require,module,exports){
function Emitter(t){return t?mixin(t):void 0}function mixin(t){for(var e in Emitter.prototype)t[e]=Emitter.prototype[e];return t}module.exports=Emitter,Emitter.prototype.on=Emitter.prototype.addEventListener=function(t,e){return this._callbacks=this._callbacks||{},(this._callbacks[t]=this._callbacks[t]||[]).push(e),this},Emitter.prototype.once=function(t,e){function i(){r.off(t,i),e.apply(this,arguments)}var r=this;return this._callbacks=this._callbacks||{},i.fn=e,this.on(t,i),this},Emitter.prototype.off=Emitter.prototype.removeListener=Emitter.prototype.removeAllListeners=Emitter.prototype.removeEventListener=function(t,e){if(this._callbacks=this._callbacks||{},0==arguments.length)return this._callbacks={},this;var i=this._callbacks[t];if(!i)return this;if(1==arguments.length)return delete this._callbacks[t],this;for(var r,s=0;s<i.length;s++)if(r=i[s],r===e||r.fn===e){i.splice(s,1);break}return this},Emitter.prototype.emit=function(t){this._callbacks=this._callbacks||{};var e=[].slice.call(arguments,1),i=this._callbacks[t];if(i){i=i.slice(0);for(var r=0,s=i.length;s>r;++r)i[r].apply(this,e)}return this},Emitter.prototype.listeners=function(t){return this._callbacks=this._callbacks||{},this._callbacks[t]||[]},Emitter.prototype.hasListeners=function(t){return!!this.listeners(t).length};


},{}],5:[function(require,module,exports){
"use strict";function Popover(t){if(!(this instanceof Popover))return new Popover(t);Emitter.call(this),this.opts=t||{},this.el=domify("string"==typeof t.template?t.template:template);var o=this.opts.className?this.opts.className.split(" "):[];o.forEach(function(t){this.el.classList.add(t)},this),t.button&&this.setButton(this.opts.button)}var domify=require("domify"),debounce=require("debounce"),Emitter=require("emitter-component"),template='<div class="popover">\n  <div class="popover-arrow"></div>\n  <div class="popover-content"></div>\n</div>';module.exports=Popover,Emitter(Popover.prototype),Popover.prototype.show=Popover.prototype.render=function(t){var o=this;return document.body.appendChild(this.el),this.opts.position=this.opts.position||"right",this.position(this.opts.position),requestAnimationFrame(function(){o.el.classList.add(t||"show"),o.emit("shown")}),this._listenOnResize(),this},Popover.prototype.destroy=Popover.prototype.remove=function(){this.button=null,this.el.parentNode.removeChild(this.el),this.emit("removed"),this.off(),window.removeEventListener("resize",this._resizeListener,!1)},Popover.prototype.setContent=function(t){return t="string"==typeof t?domify(t):t,this.el.querySelector(".popover-content").appendChild(t),this},Popover.prototype.setButton=function(t){return t="string"==typeof t?document.querySelector(t):t,this.button=t,this.buttonCoords=this.button.getBoundingClientRect(),this},Popover.prototype.position=function(t){var o,i;return this.el.classList.add("popover-"+t),this._rect=this.el.getBoundingClientRect(),("top"===t||"bottom"===t)&&(o=this._calculateX(),i="top"===t?this.buttonCoords.top-this._rect.height:this.buttonCoords.top+this.buttonCoords.height,this.el.style[this.opts.align||"left"]=o+window.scrollX+"px",this.el.style.top=i+window.scrollY+"px",this._positionArrow("left",this.el.getBoundingClientRect().left)),("right"===t||"left"===t)&&(o="right"===t?this.buttonCoords.left+this.buttonCoords.width:this.buttonCoords.left-this._rect.width,i=this._calculateY(),this.el.style.left=o+window.scrollX+"px",this.el.style.top=i+window.scrollY+"px",this._positionArrow("top",i)),this},Popover.prototype._listenOnResize=function(){var t=this;this._resizeListener=debounce(function(){t.buttonCoords=t.button.getBoundingClientRect(),t.position(t.opts.position)},100),window.addEventListener("resize",this._resizeListener,!1)},Popover.prototype._positionArrow=function(t,o){var i=this.el.querySelector(".popover-arrow");if(i){var e="top"===t?"height":"width",s=this.buttonCoords[t]+this.buttonCoords[e]/2-o;i.style[t]=Math.round(s)+"px"}},Popover.prototype._calculateY=function(){this._rect||(this._rect=this.el.getBoundingClientRect());var t=this._rect.height,o=this.buttonCoords.top+(this.buttonCoords.height-t)/2;return this._autoAlign(o),"top"===this.opts.align&&(o=this.buttonCoords.top),o},Popover.prototype._calculateX=function(){this._rect||(this._rect=this.el.getBoundingClientRect());var t=this._rect.width,o=this.buttonCoords.left+(this.buttonCoords.width-t)/2;return this._autoAlign(o),"left"===this.opts.align&&(o=this.buttonCoords.left),"right"===this.opts.align&&(o=window.innerWidth-(this.buttonCoords.left+this.buttonCoords.width)),o},Popover.prototype._autoAlign=function(t){this._rect||(this._rect=this.el.getBoundingClientRect());var o=this._rect.width,i=this.opts.position,e="top"===i||"bottom"===i;return e&&t+o>window.innerWidth&&(this.opts.align="right"),e&&0>t&&(this.opts.align="left"),!e&&0>t&&(this.opts.align="top"),this};
},{"debounce":1,"domify":3,"emitter-component":4}]},{},[5])(5)
});
