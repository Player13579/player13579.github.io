/* Generated from server.js by scripts/build-offline-worker.ps1. Do not edit directly. */
(() => {
const module = undefined;
const exports = undefined;
!function(t){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=t();else if("function"==typeof define&&define.amd)define([],t);else{var e;"undefined"!=typeof window?e=window:"undefined"!=typeof global?e=global:"undefined"!=typeof self&&(e=self),e.PF=t()}}(function(){return function t(e,r,i){function n(s,a){if(!r[s]){if(!e[s]){var u="function"==typeof require&&require;if(!a&&u)return u(s,!0);if(o)return o(s,!0);var h=new Error("Cannot find module '"+s+"'");throw h.code="MODULE_NOT_FOUND",h}var l=r[s]={exports:{}};e[s][0].call(l.exports,function(t){var r=e[s][1][t];return n(r?r:t)},l,l.exports,t,e,r,i)}return r[s].exports}for(var o="function"==typeof require&&require,s=0;s<i.length;s++)n(i[s]);return n}({1:[function(t,e){e.exports=t("./lib/heap")},{"./lib/heap":2}],2:[function(t,e){!function(){var t,r,i,n,o,s,a,u,h,l,p,c,f,d,g;i=Math.floor,l=Math.min,r=function(t,e){return e>t?-1:t>e?1:0},h=function(t,e,n,o,s){var a;if(null==n&&(n=0),null==s&&(s=r),0>n)throw new Error("lo must be non-negative");for(null==o&&(o=t.length);o>n;)a=i((n+o)/2),s(e,t[a])<0?o=a:n=a+1;return[].splice.apply(t,[n,n-n].concat(e)),e},s=function(t,e,i){return null==i&&(i=r),t.push(e),d(t,0,t.length-1,i)},o=function(t,e){var i,n;return null==e&&(e=r),i=t.pop(),t.length?(n=t[0],t[0]=i,g(t,0,e)):n=i,n},u=function(t,e,i){var n;return null==i&&(i=r),n=t[0],t[0]=e,g(t,0,i),n},a=function(t,e,i){var n;return null==i&&(i=r),t.length&&i(t[0],e)<0&&(n=[t[0],e],e=n[0],t[0]=n[1],g(t,0,i)),e},n=function(t,e){var n,o,s,a,u,h;for(null==e&&(e=r),a=function(){h=[];for(var e=0,r=i(t.length/2);r>=0?r>e:e>r;r>=0?e++:e--)h.push(e);return h}.apply(this).reverse(),u=[],o=0,s=a.length;s>o;o++)n=a[o],u.push(g(t,n,e));return u},f=function(t,e,i){var n;return null==i&&(i=r),n=t.indexOf(e),-1!==n?(d(t,0,n,i),g(t,n,i)):void 0},p=function(t,e,i){var o,s,u,h,l;if(null==i&&(i=r),s=t.slice(0,e),!s.length)return s;for(n(s,i),l=t.slice(e),u=0,h=l.length;h>u;u++)o=l[u],a(s,o,i);return s.sort(i).reverse()},c=function(t,e,i){var s,a,u,p,c,f,d,g,b,y;if(null==i&&(i=r),10*e<=t.length){if(p=t.slice(0,e).sort(i),!p.length)return p;for(u=p[p.length-1],g=t.slice(e),c=0,d=g.length;d>c;c++)s=g[c],i(s,u)<0&&(h(p,s,0,null,i),p.pop(),u=p[p.length-1]);return p}for(n(t,i),y=[],a=f=0,b=l(e,t.length);b>=0?b>f:f>b;a=b>=0?++f:--f)y.push(o(t,i));return y},d=function(t,e,i,n){var o,s,a;for(null==n&&(n=r),o=t[i];i>e&&(a=i-1>>1,s=t[a],n(o,s)<0);)t[i]=s,i=a;return t[i]=o},g=function(t,e,i){var n,o,s,a,u;for(null==i&&(i=r),o=t.length,u=e,s=t[e],n=2*e+1;o>n;)a=n+1,o>a&&!(i(t[n],t[a])<0)&&(n=a),t[e]=t[n],e=n,n=2*e+1;return t[e]=s,d(t,u,e,i)},t=function(){function t(t){this.cmp=null!=t?t:r,this.nodes=[]}return t.push=s,t.pop=o,t.replace=u,t.pushpop=a,t.heapify=n,t.nlargest=p,t.nsmallest=c,t.prototype.push=function(t){return s(this.nodes,t,this.cmp)},t.prototype.pop=function(){return o(this.nodes,this.cmp)},t.prototype.peek=function(){return this.nodes[0]},t.prototype.contains=function(t){return-1!==this.nodes.indexOf(t)},t.prototype.replace=function(t){return u(this.nodes,t,this.cmp)},t.prototype.pushpop=function(t){return a(this.nodes,t,this.cmp)},t.prototype.heapify=function(){return n(this.nodes,this.cmp)},t.prototype.updateItem=function(t){return f(this.nodes,t,this.cmp)},t.prototype.clear=function(){return this.nodes=[]},t.prototype.empty=function(){return 0===this.nodes.length},t.prototype.size=function(){return this.nodes.length},t.prototype.clone=function(){var e;return e=new t,e.nodes=this.nodes.slice(0),e},t.prototype.toArray=function(){return this.nodes.slice(0)},t.prototype.insert=t.prototype.push,t.prototype.remove=t.prototype.pop,t.prototype.top=t.prototype.peek,t.prototype.front=t.prototype.peek,t.prototype.has=t.prototype.contains,t.prototype.copy=t.prototype.clone,t}(),("undefined"!=typeof e&&null!==e?e.exports:void 0)?e.exports=t:window.Heap=t}.call(this)},{}],3:[function(t,e){function r(t,e,r){this.width=t,this.height=e,this.nodes=this._buildNodes(t,e,r)}var i=t("./Node");r.prototype._buildNodes=function(t,e,r){var n,o,s=new Array(e);for(n=0;e>n;++n)for(s[n]=new Array(t),o=0;t>o;++o)s[n][o]=new i(o,n);if(void 0===r)return s;if(r.length!==e||r[0].length!==t)throw new Error("Matrix size does not fit");for(n=0;e>n;++n)for(o=0;t>o;++o)r[n][o]&&(s[n][o].walkable=!1);return s},r.prototype.getNodeAt=function(t,e){return this.nodes[e][t]},r.prototype.isWalkableAt=function(t,e){return this.isInside(t,e)&&this.nodes[e][t].walkable},r.prototype.isInside=function(t,e){return t>=0&&t<this.width&&e>=0&&e<this.height},r.prototype.setWalkableAt=function(t,e,r){this.nodes[e][t].walkable=r},r.prototype.getNeighbors=function(t,e,r){var i=t.x,n=t.y,o=[],s=!1,a=!1,u=!1,h=!1,l=!1,p=!1,c=!1,f=!1,d=this.nodes;return this.isWalkableAt(i,n-1)&&(o.push(d[n-1][i]),s=!0),this.isWalkableAt(i+1,n)&&(o.push(d[n][i+1]),u=!0),this.isWalkableAt(i,n+1)&&(o.push(d[n+1][i]),l=!0),this.isWalkableAt(i-1,n)&&(o.push(d[n][i-1]),c=!0),e?(r?(a=c&&s,h=s&&u,p=u&&l,f=l&&c):(a=c||s,h=s||u,p=u||l,f=l||c),a&&this.isWalkableAt(i-1,n-1)&&o.push(d[n-1][i-1]),h&&this.isWalkableAt(i+1,n-1)&&o.push(d[n-1][i+1]),p&&this.isWalkableAt(i+1,n+1)&&o.push(d[n+1][i+1]),f&&this.isWalkableAt(i-1,n+1)&&o.push(d[n+1][i-1]),o):o},r.prototype.clone=function(){var t,e,n=this.width,o=this.height,s=this.nodes,a=new r(n,o),u=new Array(o);for(t=0;o>t;++t)for(u[t]=new Array(n),e=0;n>e;++e)u[t][e]=new i(e,t,s[t][e].walkable);return a.nodes=u,a},e.exports=r},{"./Node":5}],4:[function(t,e){e.exports={manhattan:function(t,e){return t+e},euclidean:function(t,e){return Math.sqrt(t*t+e*e)},octile:function(t,e){var r=Math.SQRT2-1;return e>t?r*t+e:r*e+t},chebyshev:function(t,e){return Math.max(t,e)}}},{}],5:[function(t,e){function r(t,e,r){this.x=t,this.y=e,this.walkable=void 0===r?!0:r}e.exports=r},{}],6:[function(t,e,r){function i(t){for(var e=[[t.x,t.y]];t.parent;)t=t.parent,e.push([t.x,t.y]);return e.reverse()}function n(t,e){var r=i(t),n=i(e);return r.concat(n.reverse())}function o(t){var e,r,i,n,o,s=0;for(e=1;e<t.length;++e)r=t[e-1],i=t[e],n=r[0]-i[0],o=r[1]-i[1],s+=Math.sqrt(n*n+o*o);return s}function s(t,e,r,i){var n,o,s,a,u,h,l=Math.abs,p=[];for(s=l(r-t),a=l(i-e),n=r>t?1:-1,o=i>e?1:-1,u=s-a;;){if(p.push([t,e]),t===r&&e===i)break;h=2*u,h>-a&&(u-=a,t+=n),s>h&&(u+=s,e+=o)}return p}function a(t){var e,r,i,n,o,a,u=[],h=t.length;if(2>h)return u;for(o=0;h-1>o;++o)for(e=t[o],r=t[o+1],i=s(e[0],e[1],r[0],r[1]),n=i.length,a=0;n-1>a;++a)u.push(i[a]);return u.push(t[h-1]),u}function u(t,e){var r,i,n,o,a,u,h,l,p,c,f,d=e.length,g=e[0][0],b=e[0][1],y=e[d-1][0],A=e[d-1][1];for(r=g,i=b,a=[[r,i]],u=2;d>u;++u){for(l=e[u],n=l[0],o=l[1],p=s(r,i,n,o),f=!1,h=1;h<p.length;++h)if(c=p[h],!t.isWalkableAt(c[0],c[1])){f=!0;break}f&&(lastValidCoord=e[u-1],a.push(lastValidCoord),r=lastValidCoord[0],i=lastValidCoord[1])}return a.push([y,A]),a}function h(t){if(t.length<3)return t;var e,r,i,n,o,s,a=[],u=t[0][0],h=t[0][1],l=t[1][0],p=t[1][1],c=l-u,f=p-h;for(o=Math.sqrt(c*c+f*f),c/=o,f/=o,a.push([u,h]),s=2;s<t.length;s++)e=l,r=p,i=c,n=f,l=t[s][0],p=t[s][1],c=l-e,f=p-r,o=Math.sqrt(c*c+f*f),c/=o,f/=o,(c!==i||f!==n)&&a.push([e,r]);return a.push([l,p]),a}r.backtrace=i,r.biBacktrace=n,r.pathLength=o,r.interpolate=s,r.expandPath=a,r.smoothenPath=u,r.compressPath=h},{}],7:[function(t,e){function r(t){t=t||{},this.allowDiagonal=t.allowDiagonal,this.dontCrossCorners=t.dontCrossCorners,this.heuristic=t.heuristic||o.manhattan,this.weight=t.weight||1}var i=t("heap"),n=t("../core/Util"),o=t("../core/Heuristic");r.prototype.findPath=function(t,e,r,o,s){var a,u,h,l,p,c,f,d,g=new i(function(t,e){return t.f-e.f}),b=s.getNodeAt(t,e),y=s.getNodeAt(r,o),A=this.heuristic,k=this.allowDiagonal,m=this.dontCrossCorners,v=this.weight,w=Math.abs,x=Math.SQRT2;for(b.g=0,b.f=0,g.push(b),b.opened=!0;!g.empty();){if(a=g.pop(),a.closed=!0,a===y)return n.backtrace(y);for(u=s.getNeighbors(a,k,m),l=0,p=u.length;p>l;++l)h=u[l],h.closed||(c=h.x,f=h.y,d=a.g+(0===c-a.x||0===f-a.y?1:x),(!h.opened||d<h.g)&&(h.g=d,h.h=h.h||v*A(w(c-r),w(f-o)),h.f=h.g+h.h,h.parent=a,h.opened?g.updateItem(h):(g.push(h),h.opened=!0)))}return[]},e.exports=r},{"../core/Heuristic":4,"../core/Util":6,heap:1}],8:[function(t,e){function r(t){i.call(this,t);var e=this.heuristic;this.heuristic=function(t,r){return 1e6*e(t,r)}}var i=t("./AStarFinder");r.prototype=new i,r.prototype.constructor=r,e.exports=r},{"./AStarFinder":7}],9:[function(t,e){function r(t){t=t||{},this.allowDiagonal=t.allowDiagonal,this.dontCrossCorners=t.dontCrossCorners,this.heuristic=t.heuristic||o.manhattan,this.weight=t.weight||1}var i=t("heap"),n=t("../core/Util"),o=t("../core/Heuristic");r.prototype.findPath=function(t,e,r,o,s){var a,u,h,l,p,c,f,d,g=function(t,e){return t.f-e.f},b=new i(g),y=new i(g),A=s.getNodeAt(t,e),k=s.getNodeAt(r,o),m=this.heuristic,v=this.allowDiagonal,w=this.dontCrossCorners,x=this.weight,F=Math.abs,W=Math.SQRT2,N=1,C=2;for(A.g=0,A.f=0,b.push(A),A.opened=N,k.g=0,k.f=0,y.push(k),k.opened=C;!b.empty()&&!y.empty();){for(a=b.pop(),a.closed=!0,u=s.getNeighbors(a,v,w),l=0,p=u.length;p>l;++l)if(h=u[l],!h.closed){if(h.opened===C)return n.biBacktrace(a,h);c=h.x,f=h.y,d=a.g+(0===c-a.x||0===f-a.y?1:W),(!h.opened||d<h.g)&&(h.g=d,h.h=h.h||x*m(F(c-r),F(f-o)),h.f=h.g+h.h,h.parent=a,h.opened?b.updateItem(h):(b.push(h),h.opened=N))}for(a=y.pop(),a.closed=!0,u=s.getNeighbors(a,v,w),l=0,p=u.length;p>l;++l)if(h=u[l],!h.closed){if(h.opened===N)return n.biBacktrace(h,a);c=h.x,f=h.y,d=a.g+(0===c-a.x||0===f-a.y?1:W),(!h.opened||d<h.g)&&(h.g=d,h.h=h.h||x*m(F(c-t),F(f-e)),h.f=h.g+h.h,h.parent=a,h.opened?y.updateItem(h):(y.push(h),h.opened=C))}}return[]},e.exports=r},{"../core/Heuristic":4,"../core/Util":6,heap:1}],10:[function(t,e){function r(t){i.call(this,t);var e=this.heuristic;this.heuristic=function(t,r){return 1e6*e(t,r)}}var i=t("./BiAStarFinder");r.prototype=new i,r.prototype.constructor=r,e.exports=r},{"./BiAStarFinder":9}],11:[function(t,e){function r(t){t=t||{},this.allowDiagonal=t.allowDiagonal,this.dontCrossCorners=t.dontCrossCorners}var i=t("../core/Util");r.prototype.findPath=function(t,e,r,n,o){var s,a,u,h,l,p=o.getNodeAt(t,e),c=o.getNodeAt(r,n),f=[],d=[],g=this.allowDiagonal,b=this.dontCrossCorners,y=0,A=1;for(f.push(p),p.opened=!0,p.by=y,d.push(c),c.opened=!0,c.by=A;f.length&&d.length;){for(u=f.shift(),u.closed=!0,s=o.getNeighbors(u,g,b),h=0,l=s.length;l>h;++h)if(a=s[h],!a.closed)if(a.opened){if(a.by===A)return i.biBacktrace(u,a)}else f.push(a),a.parent=u,a.opened=!0,a.by=y;for(u=d.shift(),u.closed=!0,s=o.getNeighbors(u,g,b),h=0,l=s.length;l>h;++h)if(a=s[h],!a.closed)if(a.opened){if(a.by===y)return i.biBacktrace(a,u)}else d.push(a),a.parent=u,a.opened=!0,a.by=A}return[]},e.exports=r},{"../core/Util":6}],12:[function(t,e){function r(t){i.call(this,t),this.heuristic=function(){return 0}}var i=t("./BiAStarFinder");r.prototype=new i,r.prototype.constructor=r,e.exports=r},{"./BiAStarFinder":9}],13:[function(t,e){function r(t){t=t||{},this.allowDiagonal=t.allowDiagonal,this.dontCrossCorners=t.dontCrossCorners}var i=t("../core/Util");r.prototype.findPath=function(t,e,r,n,o){var s,a,u,h,l,p=[],c=this.allowDiagonal,f=this.dontCrossCorners,d=o.getNodeAt(t,e),g=o.getNodeAt(r,n);for(p.push(d),d.opened=!0;p.length;){if(u=p.shift(),u.closed=!0,u===g)return i.backtrace(g);for(s=o.getNeighbors(u,c,f),h=0,l=s.length;l>h;++h)a=s[h],a.closed||a.opened||(p.push(a),a.opened=!0,a.parent=u)}return[]},e.exports=r},{"../core/Util":6}],14:[function(t,e){function r(t){i.call(this,t),this.heuristic=function(){return 0}}var i=t("./AStarFinder");r.prototype=new i,r.prototype.constructor=r,e.exports=r},{"./AStarFinder":7}],15:[function(t,e){function r(t){t=t||{},this.allowDiagonal=t.allowDiagonal,this.dontCrossCorners=t.dontCrossCorners,this.heuristic=t.heuristic||i.manhattan,this.weight=t.weight||1,this.trackRecursion=t.trackRecursion||!1,this.timeLimit=t.timeLimit||1/0}t("../core/Util");var i=t("../core/Heuristic"),n=t("../core/Node");r.prototype.findPath=function(t,e,r,i,o){var s,a,u,h=0,l=(new Date).getTime(),p=function(t,e){return this.heuristic(Math.abs(e.x-t.x),Math.abs(e.y-t.y))}.bind(this),c=function(t,e){return t.x===e.x||t.y===e.y?1:Math.SQRT2},f=function(t,e,r,i,s){if(h++,this.timeLimit>0&&(new Date).getTime()-l>1e3*this.timeLimit)return 1/0;var a=e+p(t,g)*this.weight;if(a>r)return a;if(t==g)return i[s]=[t.x,t.y],t;var u,d,b,y,A=o.getNeighbors(t,this.allowDiagonal,this.dontCrossCorners);for(b=0,u=1/0;y=A[b];++b){if(this.trackRecursion&&(y.retainCount=y.retainCount+1||1,y.tested!==!0&&(y.tested=!0)),d=f(y,e+c(t,y),r,i,s+1),d instanceof n)return i[s]=[t.x,t.y],d;this.trackRecursion&&0===--y.retainCount&&(y.tested=!1),u>d&&(u=d)}return u}.bind(this),d=o.getNodeAt(t,e),g=o.getNodeAt(r,i),b=p(d,g);for(s=0;!0;++s){if(a=[],u=f(d,0,b,a,0),1/0===u)return[];if(u instanceof n)return a;b=u}return[]},e.exports=r},{"../core/Heuristic":4,"../core/Node":5,"../core/Util":6}],16:[function(t,e){function r(t){t=t||{},this.heuristic=t.heuristic||o.manhattan,this.trackJumpRecursion=t.trackJumpRecursion||!1}var i=t("heap"),n=t("../core/Util"),o=t("../core/Heuristic");r.prototype.findPath=function(t,e,r,o,s){var a,u=this.openList=new i(function(t,e){return t.f-e.f}),h=this.startNode=s.getNodeAt(t,e),l=this.endNode=s.getNodeAt(r,o);for(this.grid=s,h.g=0,h.f=0,u.push(h),h.opened=!0;!u.empty();){if(a=u.pop(),a.closed=!0,a===l)return n.expandPath(n.backtrace(l));this._identifySuccessors(a)}return[]},r.prototype._identifySuccessors=function(t){var e,r,i,n,s,a,u,h,l,p,c=this.grid,f=this.heuristic,d=this.openList,g=this.endNode.x,b=this.endNode.y,y=t.x,A=t.y,k=Math.abs;for(Math.max,e=this._findNeighbors(t),n=0,s=e.length;s>n;++n)if(r=e[n],i=this._jump(r[0],r[1],y,A)){if(a=i[0],u=i[1],p=c.getNodeAt(a,u),p.closed)continue;h=o.octile(k(a-y),k(u-A)),l=t.g+h,(!p.opened||l<p.g)&&(p.g=l,p.h=p.h||f(k(a-g),k(u-b)),p.f=p.g+p.h,p.parent=t,p.opened?d.updateItem(p):(d.push(p),p.opened=!0))}},r.prototype._jump=function(t,e,r,i){var n=this.grid,o=t-r,s=e-i;if(!n.isWalkableAt(t,e))return null;if(this.trackJumpRecursion===!0&&(n.getNodeAt(t,e).tested=!0),n.getNodeAt(t,e)===this.endNode)return[t,e];if(0!==o&&0!==s){if(n.isWalkableAt(t-o,e+s)&&!n.isWalkableAt(t-o,e)||n.isWalkableAt(t+o,e-s)&&!n.isWalkableAt(t,e-s))return[t,e]}else if(0!==o){if(n.isWalkableAt(t+o,e+1)&&!n.isWalkableAt(t,e+1)||n.isWalkableAt(t+o,e-1)&&!n.isWalkableAt(t,e-1))return[t,e]}else if(n.isWalkableAt(t+1,e+s)&&!n.isWalkableAt(t+1,e)||n.isWalkableAt(t-1,e+s)&&!n.isWalkableAt(t-1,e))return[t,e];return 0!==o&&0!==s&&(this._jump(t+o,e,t,e)||this._jump(t,e+s,t,e))?[t,e]:n.isWalkableAt(t+o,e)||n.isWalkableAt(t,e+s)?this._jump(t+o,e+s,t,e):null},r.prototype._findNeighbors=function(t){var e,r,i,n,o,s,a,u,h=t.parent,l=t.x,p=t.y,c=this.grid,f=[];if(h)e=h.x,r=h.y,i=(l-e)/Math.max(Math.abs(l-e),1),n=(p-r)/Math.max(Math.abs(p-r),1),0!==i&&0!==n?(c.isWalkableAt(l,p+n)&&f.push([l,p+n]),c.isWalkableAt(l+i,p)&&f.push([l+i,p]),(c.isWalkableAt(l,p+n)||c.isWalkableAt(l+i,p))&&f.push([l+i,p+n]),!c.isWalkableAt(l-i,p)&&c.isWalkableAt(l,p+n)&&f.push([l-i,p+n]),!c.isWalkableAt(l,p-n)&&c.isWalkableAt(l+i,p)&&f.push([l+i,p-n])):0===i?c.isWalkableAt(l,p+n)&&(f.push([l,p+n]),c.isWalkableAt(l+1,p)||f.push([l+1,p+n]),c.isWalkableAt(l-1,p)||f.push([l-1,p+n])):c.isWalkableAt(l+i,p)&&(f.push([l+i,p]),c.isWalkableAt(l,p+1)||f.push([l+i,p+1]),c.isWalkableAt(l,p-1)||f.push([l+i,p-1]));else for(o=c.getNeighbors(t,!0),a=0,u=o.length;u>a;++a)s=o[a],f.push([s.x,s.y]);return f},e.exports=r},{"../core/Heuristic":4,"../core/Util":6,heap:1}],17:[function(t,e){function r(t){n.call(this,t),t=t||{},this.heuristic=t.heuristic||i.manhattan}var i=t("../core/Heuristic"),n=t("./JumpPointFinder");r.prototype=new n,r.prototype.constructor=r,r.prototype._jump=function(t,e,r,i){var n=this.grid,o=t-r,s=e-i;if(!n.isWalkableAt(t,e))return null;if(this.trackJumpRecursion===!0&&(n.getNodeAt(t,e).tested=!0),n.getNodeAt(t,e)===this.endNode)return[t,e];if(0!==o){if(n.isWalkableAt(t,e-1)&&!n.isWalkableAt(t-o,e-1)||n.isWalkableAt(t,e+1)&&!n.isWalkableAt(t-o,e+1))return[t,e]}else{if(0===s)throw new Error("Only horizontal and vertical movements are allowed");if(n.isWalkableAt(t-1,e)&&!n.isWalkableAt(t-1,e-s)||n.isWalkableAt(t+1,e)&&!n.isWalkableAt(t+1,e-s))return[t,e];if(this._jump(t+1,e,t,e)||this._jump(t-1,e,t,e))return[t,e]}return this._jump(t+o,e+s,t,e)},r.prototype._findNeighbors=function(t){var e,r,i,n,o,s,a,u,h=t.parent,l=t.x,p=t.y,c=this.grid,f=[];if(h)e=h.x,r=h.y,i=(l-e)/Math.max(Math.abs(l-e),1),n=(p-r)/Math.max(Math.abs(p-r),1),0!==i?(c.isWalkableAt(l,p-1)&&f.push([l,p-1]),c.isWalkableAt(l,p+1)&&f.push([l,p+1]),c.isWalkableAt(l+i,p)&&f.push([l+i,p])):0!==n&&(c.isWalkableAt(l-1,p)&&f.push([l-1,p]),c.isWalkableAt(l+1,p)&&f.push([l+1,p]),c.isWalkableAt(l,p+n)&&f.push([l,p+n]));else for(o=c.getNeighbors(t,!1),a=0,u=o.length;u>a;++a)s=o[a],f.push([s.x,s.y]);return f},e.exports=r},{"../core/Heuristic":4,"./JumpPointFinder":16}],18:[function(t,e){e.exports={Heap:t("heap"),Node:t("./core/Node"),Grid:t("./core/Grid"),Util:t("./core/Util"),Heuristic:t("./core/Heuristic"),AStarFinder:t("./finders/AStarFinder"),BestFirstFinder:t("./finders/BestFirstFinder"),BreadthFirstFinder:t("./finders/BreadthFirstFinder"),DijkstraFinder:t("./finders/DijkstraFinder"),BiAStarFinder:t("./finders/BiAStarFinder"),BiBestFirstFinder:t("./finders/BiBestFirstFinder"),BiBreadthFirstFinder:t("./finders/BiBreadthFirstFinder"),BiDijkstraFinder:t("./finders/BiDijkstraFinder"),IDAStarFinder:t("./finders/IDAStarFinder"),JumpPointFinder:t("./finders/JumpPointFinder"),OrthogonalJumpPointFinder:t("./finders/OrthogonalJumpPointFinder")}},{"./core/Grid":3,"./core/Heuristic":4,"./core/Node":5,"./core/Util":6,"./finders/AStarFinder":7,"./finders/BestFirstFinder":8,"./finders/BiAStarFinder":9,"./finders/BiBestFirstFinder":10,"./finders/BiBreadthFirstFinder":11,"./finders/BiDijkstraFinder":12,"./finders/BreadthFirstFinder":13,"./finders/DijkstraFinder":14,"./finders/IDAStarFinder":15,"./finders/JumpPointFinder":16,"./finders/OrthogonalJumpPointFinder":17,heap:1}]},{},[18])(18)});
})();

(() => {
"use strict";
const nativeCrypto = globalThis.crypto;
const process = { env: {
  PORT: "0",
  ANALYTICS_REMOTE_URL: "data:application/json,%7B%7D",
  PROFILE_REMOTE_URL: "data:application/json,%7B%7D",
  ANALYTICS_REMOTE_TOKEN: "",
  DEVELOPER_PROFILE_IDS: ""
} };
const __dirname = "/offline";
const path = {
  join: (...parts) => parts.join("/").replace(/\\/g, "/").replace(/\/{2,}/g, "/"),
  normalize: (value) => String(value || "").replace(/\\/g, "/"),
  extname: (value) => { const match = String(value || "").match(/(\.[^./\\]+)$/); return match ? match[1] : ""; }
};
const fs = {
  readFileSync() { throw new Error("offline storage is empty"); },
  mkdirSync() {},
  writeFileSync() {},
  renameSync() {},
  stat(_path, callback) { callback(new Error("offline static files are not served")); },
  createReadStream() { return { pipe() {} }; }
};
const net = {
  isIP(value) {
    const candidate = String(value || "");
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(candidate) && candidate.split(".").every((part) => Number(part) <= 255)) return 4;
    if (candidate.includes(":")) {
      try { new URL(`http://[${candidate}]`); return 6; } catch { return 0; }
    }
    return 0;
  }
};
function offlineHash(value) {
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  for (const char of String(value || "")) {
    const code = char.codePointAt(0) || 0;
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b ^ code, 0x85ebca6b) >>> 0;
  }
  const seed = `${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`;
  return seed.repeat(4).slice(0, 64);
}
const crypto = {
  createHash() {
    let source = "";
    return {
      update(value) { source += String(value ?? ""); return this; },
      digest(encoding) { const value = offlineHash(source); return encoding === "hex" ? value : value; }
    };
  },
  randomBytes(length) {
    const bytes = new Uint8Array(Math.max(0, Number(length) || 0));
    if (nativeCrypto?.getRandomValues) nativeCrypto.getRandomValues(bytes);
    else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    return { toString: (encoding) => encoding === "hex" ? [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("") : String(bytes) };
  }
};
const Buffer = {
  from(value) {
    return { toString: (encoding) => encoding === "base64" ? btoa(unescape(encodeURIComponent(String(value)))) : String(value) };
  }
};
const PF = globalThis.PF;
const WebSocket = { OPEN: 1 };
class WebSocketServer {
  on() {}
  handleUpgrade() {}
}
const http = {
  createServer() {
    return { on() {}, listen(_port, callback) { callback?.(); } };
  }
};
const MAP_ENVIRONMENT_CONTRACT = Object.freeze({"schema":"dva-map-environment-contract-v268","sourceManifest":null,"coordinateAuthority":"final world coordinates at exactly 1 texture pixel per world unit","rules":{"interiorClusterDistanceUv":0.07,"defaultPortalOpeningSpan":84,"portalThickness":28,"pixelsPerWorldUnit":1,"coordinatesAreFinalExpandedWorldUnits":true,"sourceLayerRescalingForbidden":true,"sharedDoorGeometryRequired":true},"geometryCorrections":{"station":{"corridors":{"c8e":{"w":90},"c13a":{"h":195}}}},"doors":{"station":[{"id":"door-archive","roomId":"archive","corridorId":"c1","openingSpan":70,"worldOpeningRect":{"x":992,"y":410,"w":56,"h":140},"worldOpeningSpan":140},{"id":"door-reactor","roomId":"reactor","corridorId":"c2","openingSpan":78,"worldOpeningRect":{"x":2712,"y":402,"w":56,"h":156},"worldOpeningSpan":156},{"id":"door-electrical","roomId":"electrical","corridorId":"c9","openingSpan":90,"worldOpeningRect":{"x":655,"y":1642,"w":180,"h":56},"worldOpeningSpan":180},{"id":"door-comms","roomId":"comms","corridorId":"c7","openingSpan":82,"worldOpeningRect":{"x":2722,"y":1913,"w":56,"h":164},"worldOpeningSpan":164}]},"objectTypes":{"recharge":{"effectKind":"stamina","label":"スタミナ充填器","effectLabel":"スタミナ +200","amount":200,"cooldownMs":15000},"medPod":{"effectKind":"fullRecovery","label":"応急処置ポッド","effectLabel":"HP全回復・オーバーヒール","amount":1,"cooldownMs":30000},"supply":{"effectKind":"stamina","label":"物資保管庫","effectLabel":"スタミナ +160","amount":160,"cooldownMs":45000},"decoy":{"effectKind":"decoy","label":"デコイビーコン","effectLabel":"スタミナ +100・偽足音","amount":100,"cooldownMs":20000},"restSeat":{"effectKind":"stamina","label":"休息席","effectLabel":"スタミナ +80","amount":80,"cooldownMs":18000},"sofa":{"effectKind":"stamina","label":"休息用ソファ","effectLabel":"スタミナ +80","amount":80,"cooldownMs":18000},"airPlant":{"effectKind":"stamina","label":"空気浄化植栽","effectLabel":"スタミナ +40","amount":40,"cooldownMs":16000},"hydration":{"effectKind":"stamina","label":"給水設備","effectLabel":"スタミナ +100","amount":100,"cooldownMs":15000},"nutritionStation":{"effectKind":"stamina","label":"栄養補給設備","effectLabel":"スタミナ +100","amount":100,"cooldownMs":18000},"mistSprayer":{"effectKind":"stamina","label":"ミスト設備","effectLabel":"スタミナ +50","amount":50,"cooldownMs":18000},"greenhousePlanter":{"effectKind":"stamina","label":"環境植栽","effectLabel":"スタミナ +40","amount":40,"cooldownMs":18000},"diagnosticBed":{"effectKind":"heal","label":"診断ベッド","effectLabel":"ボディダメージ回復","amount":1,"cooldownMs":30000},"medicalCabinet":{"effectKind":"heal","label":"医療キャビネット","effectLabel":"ボディダメージ回復","amount":1,"cooldownMs":30000},"emergencyKit":{"effectKind":"heal","label":"救急キット","effectLabel":"ボディダメージ回復","amount":1,"cooldownMs":36000},"bookshelf":{"effectKind":"mana","label":"資料棚","effectLabel":"マナ +1","amount":1,"cooldownMs":32000},"archiveCabinet":{"effectKind":"mana","label":"保管キャビネット","effectLabel":"マナ +1","amount":1,"cooldownMs":36000},"readingLamp":{"effectKind":"mana","label":"閲覧灯","effectLabel":"マナ +1","amount":1,"cooldownMs":26000},"wallDisplay":{"effectKind":"mana","label":"情報ディスプレイ","effectLabel":"マナ +1","amount":1,"cooldownMs":36000},"recyclingUnit":{"effectKind":"stamina","label":"再資源化設備","effectLabel":"スタミナ +70","amount":70,"cooldownMs":34000},"holoProjector":{"effectKind":"mana","label":"ホロ投影機","effectLabel":"マナ +1","amount":1,"cooldownMs":38000},"radioConsole":{"effectKind":"mana","label":"通信卓","effectLabel":"マナ +1","amount":1,"cooldownMs":38000},"antennaArray":{"effectKind":"mana","label":"アンテナアレイ","effectLabel":"マナ +1","amount":1,"cooldownMs":40000},"serverRack":{"effectKind":"mana","label":"サーバーラック","effectLabel":"マナ +1","amount":1,"cooldownMs":40000},"commandDesk":{"effectKind":"mana","label":"指令卓","effectLabel":"マナ +1","amount":1,"cooldownMs":38000},"powerCabinet":{"effectKind":"stamina","label":"電力盤","effectLabel":"スタミナ +60","amount":60,"cooldownMs":38000},"reactorGauge":{"effectKind":"stamina","label":"出力計","effectLabel":"スタミナ +60","amount":60,"cooldownMs":38000},"cableSpool":{"effectKind":"stamina","label":"ケーブルリール","effectLabel":"スタミナ +50","amount":50,"cooldownMs":34000},"toolCart":{"effectKind":"stamina","label":"ツールカート","effectLabel":"スタミナ +50","amount":50,"cooldownMs":34000},"workbench":{"effectKind":"stamina","label":"作業台","effectLabel":"スタミナ +60","amount":60,"cooldownMs":38000},"coolingUnit":{"effectKind":"stamina","label":"冷却設備","effectLabel":"スタミナ +50","amount":50,"cooldownMs":36000},"securityConsole":{"effectKind":"mana","label":"監視卓","effectLabel":"マナ +1","amount":1,"cooldownMs":40000},"cameraTripod":{"effectKind":"mana","label":"監視カメラ架台","effectLabel":"マナ +1","amount":1,"cooldownMs":36000},"equipmentLocker":{"effectKind":"stamina","label":"装備ロッカー","effectLabel":"スタミナ +60","amount":60,"cooldownMs":36000},"cargoCrate":{"effectKind":"stamina","label":"貨物ケース","effectLabel":"スタミナ +60","amount":60,"cooldownMs":34000},"palletJack":{"effectKind":"stamina","label":"パレット搬送機","effectLabel":"スタミナ +50","amount":50,"cooldownMs":34000},"mineralScanner":{"effectKind":"mana","label":"鉱物スキャナー","effectLabel":"マナ +1","amount":1,"cooldownMs":40000},"specimenCase":{"effectKind":"mana","label":"試料ケース","effectLabel":"マナ +1","amount":1,"cooldownMs":36000},"sterilizer":{"effectKind":"fullRecovery","label":"滅菌設備","effectLabel":"HP全回復・オーバーヒール","amount":1,"cooldownMs":36000},"conferenceTable":{"effectKind":"mana","label":"協議テーブル","effectLabel":"マナ +1","amount":1,"cooldownMs":36000},"compostUnit":{"effectKind":"stamina","label":"循環処理設備","effectLabel":"スタミナ +70","amount":70,"cooldownMs":34000}},"rooms":{"station":{"archive":[{"id":"download-a","type":"task","u":0.3,"v":0.36,"worldX":418,"worldY":376,"worldFootprint":{"width":112,"height":76}},{"id":"repair-oxygen-a","type":"repair","u":0.83,"v":0.18,"worldX":874,"worldY":268,"worldFootprint":{"width":112,"height":76}},{"id":"station-supply","type":"supply","u":0.63,"v":0.86,"worldX":702,"worldY":676,"worldFootprint":{"width":112,"height":76}},{"id":"station-seat-archive","type":"restSeat","u":0.29,"v":0.69,"worldX":409,"worldY":574,"worldFootprint":{"width":80,"height":72}},{"id":"station-plant-archive","type":"airPlant","u":0.17,"v":0.61,"worldX":306,"worldY":526,"worldFootprint":{"width":72,"height":84}},{"id":"station-archive-bookshelf-1","type":"bookshelf","u":0.17,"v":0.18,"worldX":306,"worldY":268,"worldFootprint":{"width":104,"height":132}},{"id":"station-archive-archive-cabinet-2","type":"archiveCabinet","u":0.45,"v":0.18,"worldX":547,"worldY":268,"worldFootprint":{"width":104,"height":132}},{"id":"station-archive-reading-lamp-3","type":"readingLamp","u":0.16,"v":0.62,"worldX":298,"worldY":532,"worldFootprint":{"width":58,"height":58}},{"id":"station-archive-sofa-4","type":"sofa","u":0.27,"v":0.68,"worldX":392,"worldY":568,"worldFootprint":{"width":144,"height":92}},{"id":"station-archive-wall-display-5","type":"wallDisplay","u":0.3,"v":0.83,"worldX":418,"worldY":658,"worldFootprint":{"width":96,"height":68}},{"id":"station-archive-nutrition-station-6","type":"nutritionStation","u":0.76,"v":0.17,"worldX":814,"worldY":262,"worldFootprint":{"width":112,"height":96}},{"id":"station-archive-recycling-unit-7","type":"recyclingUnit","u":0.84,"v":0.86,"worldX":882,"worldY":676,"worldFootprint":{"width":112,"height":96}},{"id":"station-archive-holo-projector-8","type":"holoProjector","u":0.31,"v":0.84,"worldX":427,"worldY":664,"worldFootprint":{"width":96,"height":68}}],"comms":[{"id":"upload-a","type":"task","u":0.58,"v":0.18,"worldX":3318,"worldY":1859,"worldFootprint":{"width":112,"height":76}},{"id":"upload-e","type":"task","u":0.36,"v":0.18,"worldX":3103,"worldY":1859,"worldFootprint":{"width":112,"height":76}},{"id":"repair-comms","type":"repair","u":0.45,"v":0.18,"worldX":3191,"worldY":1859,"worldFootprint":{"width":112,"height":76}},{"id":"repair-oxygen-b","type":"repair","u":0.57,"v":0.18,"worldX":3309,"worldY":1859,"worldFootprint":{"width":112,"height":76}},{"id":"doorlog","type":"utility","u":0.22,"v":0.8,"worldX":2966,"worldY":2268,"worldFootprint":{"width":80,"height":72}},{"id":"station-hush","type":"hushField","u":0.67,"v":0.65,"worldX":3407,"worldY":2169,"worldFootprint":{"width":80,"height":72}},{"id":"station-plant-comms","type":"airPlant","u":0.86,"v":0.83,"worldX":3593,"worldY":2288,"worldFootprint":{"width":72,"height":84}},{"id":"station-comms-radio-console-1","type":"radioConsole","u":0.22,"v":0.8,"worldX":2966,"worldY":2268,"worldFootprint":{"width":96,"height":68}},{"id":"station-comms-antenna-array-2","type":"antennaArray","u":0.82,"v":0.3,"worldX":3554,"worldY":1938,"worldFootprint":{"width":96,"height":68}},{"id":"station-comms-server-rack-3","type":"serverRack","u":0.84,"v":0.55,"worldX":3573,"worldY":2103,"worldFootprint":{"width":104,"height":132}},{"id":"station-comms-wall-display-4","type":"wallDisplay","u":0.94,"v":0.27,"worldX":3671,"worldY":1918,"worldFootprint":{"width":96,"height":68}},{"id":"station-comms-command-desk-5","type":"commandDesk","u":0.53,"v":0.18,"worldX":3269,"worldY":1859,"worldFootprint":{"width":112,"height":96}},{"id":"station-comms-nutrition-station-6","type":"nutritionStation","u":0.72,"v":0.83,"worldX":3456,"worldY":2288,"worldFootprint":{"width":112,"height":96}},{"id":"station-comms-emergency-kit-7","type":"emergencyKit","u":0.94,"v":0.69,"worldX":3671,"worldY":2195,"worldFootprint":{"width":58,"height":58}}],"electrical":[{"id":"download-b","type":"task","u":0.73,"v":0.37,"worldX":862,"worldY":1936,"worldFootprint":{"width":112,"height":76}},{"id":"station-desk-electrical","type":"commandDesk","u":0.16,"v":0.7,"worldX":337,"worldY":2174,"worldFootprint":{"width":112,"height":96}},{"id":"station-electrical-power-cabinet-1","type":"powerCabinet","u":0.17,"v":0.14,"worldX":346,"worldY":1771,"worldFootprint":{"width":104,"height":132}},{"id":"station-electrical-server-rack-2","type":"serverRack","u":0.8,"v":0.45,"worldX":926,"worldY":1994,"worldFootprint":{"width":104,"height":132}},{"id":"station-electrical-cable-spool-3","type":"cableSpool","u":0.1,"v":0.35,"worldX":282,"worldY":1922,"worldFootprint":{"width":58,"height":58}},{"id":"station-electrical-tool-cart-4","type":"toolCart","u":0.31,"v":0.72,"worldX":475,"worldY":2188,"worldFootprint":{"width":58,"height":58}},{"id":"station-electrical-workbench-5","type":"workbench","u":0.15,"v":0.7,"worldX":328,"worldY":2174,"worldFootprint":{"width":144,"height":92}},{"id":"station-electrical-reactor-gauge-6","type":"reactorGauge","u":0.47,"v":0.88,"worldX":622,"worldY":2304,"worldFootprint":{"width":96,"height":68}},{"id":"station-electrical-cooling-unit-7","type":"coolingUnit","u":0.88,"v":0.8,"worldX":1000,"worldY":2246,"worldFootprint":{"width":104,"height":132}},{"id":"station-electrical-emergency-kit-8","type":"emergencyKit","u":0.74,"v":0.9,"worldX":871,"worldY":2318,"worldFootprint":{"width":58,"height":58}}],"engine":[{"id":"upload-c","type":"task","u":0.15,"v":0.32,"worldX":3114,"worldY":1216,"worldFootprint":{"width":112,"height":76}},{"id":"station-locker-engine","type":"equipmentLocker","u":0.92,"v":0.8,"worldX":3699,"worldY":1466,"worldFootprint":{"width":104,"height":132}},{"id":"station-engine-workbench-1","type":"workbench","u":0.2,"v":0.82,"worldX":3152,"worldY":1476,"worldFootprint":{"width":144,"height":92}},{"id":"station-engine-tool-cart-2","type":"toolCart","u":0.57,"v":0.82,"worldX":3433,"worldY":1476,"worldFootprint":{"width":58,"height":58}},{"id":"station-engine-cable-spool-3","type":"cableSpool","u":0.62,"v":0.84,"worldX":3471,"worldY":1487,"worldFootprint":{"width":58,"height":58}},{"id":"station-engine-cooling-unit-4","type":"coolingUnit","u":0.72,"v":0.88,"worldX":3547,"worldY":1508,"worldFootprint":{"width":104,"height":132}},{"id":"station-engine-power-cabinet-5","type":"powerCabinet","u":0.9,"v":0.87,"worldX":3684,"worldY":1502,"worldFootprint":{"width":104,"height":132}},{"id":"station-engine-equipment-locker-6","type":"equipmentLocker","u":0.08,"v":0.18,"worldX":3061,"worldY":1144,"worldFootprint":{"width":104,"height":132}},{"id":"station-engine-emergency-kit-7","type":"emergencyKit","u":0.93,"v":0.42,"worldX":3707,"worldY":1268,"worldFootprint":{"width":58,"height":58}}],"med":[{"id":"download-c","type":"task","u":0.17,"v":0.39,"worldX":1506,"worldY":2203,"worldFootprint":{"width":112,"height":76}},{"id":"vitals","type":"utility","u":0.17,"v":0.64,"worldX":1506,"worldY":2333,"worldFootprint":{"width":80,"height":72}},{"id":"station-medpod","type":"medPod","u":0.77,"v":0.39,"worldX":1950,"worldY":2203,"worldFootprint":{"width":112,"height":76}},{"id":"station-plant-med","type":"airPlant","u":0.77,"v":0.7,"worldX":1950,"worldY":2364,"worldFootprint":{"width":72,"height":84}},{"id":"station-water-med","type":"hydration","u":0.7,"v":0.9,"worldX":1898,"worldY":2468,"worldFootprint":{"width":72,"height":84}},{"id":"station-med-diagnostic-bed-1","type":"diagnosticBed","u":0.19,"v":0.38,"worldX":1521,"worldY":2198,"worldFootprint":{"width":144,"height":92}},{"id":"station-med-medical-cabinet-2","type":"medicalCabinet","u":0.45,"v":0.15,"worldX":1713,"worldY":2078,"worldFootprint":{"width":112,"height":96}},{"id":"station-med-sterilizer-3","type":"sterilizer","u":0.12,"v":0.9,"worldX":1469,"worldY":2468,"worldFootprint":{"width":104,"height":132}},{"id":"station-med-specimen-case-4","type":"specimenCase","u":0.77,"v":0.7,"worldX":1950,"worldY":2364,"worldFootprint":{"width":58,"height":58}},{"id":"station-med-emergency-kit-5","type":"emergencyKit","u":0.82,"v":0.5,"worldX":1987,"worldY":2260,"worldFootprint":{"width":58,"height":58}},{"id":"station-med-mist-sprayer-6","type":"mistSprayer","u":0.88,"v":0.15,"worldX":2031,"worldY":2078,"worldFootprint":{"width":72,"height":84}}],"meeting":[{"id":"upload-b","type":"task","u":0.35,"v":0.16,"worldX":1949,"worldY":1162,"worldFootprint":{"width":112,"height":76}},{"id":"meeting-button","type":"emergency","u":0.5,"v":0.5,"worldX":2090,"worldY":1400,"worldFootprint":{"width":80,"height":72}},{"id":"admin","type":"utility","u":0.84,"v":0.46,"worldX":2410,"worldY":1372,"worldFootprint":{"width":80,"height":72}},{"id":"station-seat-meeting-a","type":"restSeat","u":0.25,"v":0.81,"worldX":1855,"worldY":1617,"worldFootprint":{"width":80,"height":72}},{"id":"station-seat-meeting-b","type":"restSeat","u":0.73,"v":0.81,"worldX":2306,"worldY":1617,"worldFootprint":{"width":80,"height":72}},{"id":"station-water-meeting","type":"hydration","u":0.72,"v":0.16,"worldX":2297,"worldY":1162,"worldFootprint":{"width":72,"height":84}},{"id":"station-meeting-conference-table-1","type":"conferenceTable","u":0.5,"v":0.5,"worldX":2090,"worldY":1400,"worldFootprint":{"width":144,"height":92}},{"id":"station-meeting-sofa-2","type":"sofa","u":0.14,"v":0.72,"worldX":1752,"worldY":1554,"worldFootprint":{"width":144,"height":92}},{"id":"station-meeting-holo-projector-3","type":"holoProjector","u":0.5,"v":0.85,"worldX":2090,"worldY":1645,"worldFootprint":{"width":96,"height":68}},{"id":"station-meeting-reading-lamp-4","type":"readingLamp","u":0.16,"v":0.38,"worldX":1770,"worldY":1316,"worldFootprint":{"width":58,"height":58}},{"id":"station-meeting-wall-display-5","type":"wallDisplay","u":0.19,"v":0.14,"worldX":1799,"worldY":1148,"worldFootprint":{"width":96,"height":68}},{"id":"station-meeting-nutrition-station-6","type":"nutritionStation","u":0.67,"v":0.14,"worldX":2250,"worldY":1148,"worldFootprint":{"width":112,"height":96}},{"id":"station-meeting-hydration-7","type":"hydration","u":0.72,"v":0.14,"worldX":2297,"worldY":1148,"worldFootprint":{"width":72,"height":84}},{"id":"station-meeting-recycling-unit-8","type":"recyclingUnit","u":0.9,"v":0.15,"worldX":2466,"worldY":1155,"worldFootprint":{"width":112,"height":96}}],"reactor":[{"id":"download-d","type":"task","u":0.68,"v":0.27,"worldX":3447,"worldY":344,"worldFootprint":{"width":112,"height":76}},{"id":"upload-d","type":"task","u":0.35,"v":0.27,"worldX":3104,"worldY":344,"worldFootprint":{"width":112,"height":76}},{"id":"repair-reactor-a","type":"repair","u":0.35,"v":0.27,"worldX":3104,"worldY":344,"worldFootprint":{"width":112,"height":76}},{"id":"repair-reactor-b","type":"repair","u":0.68,"v":0.27,"worldX":3447,"worldY":344,"worldFootprint":{"width":112,"height":76}},{"id":"station-desk-reactor","type":"commandDesk","u":0.64,"v":0.82,"worldX":3406,"worldY":718,"worldFootprint":{"width":112,"height":96}},{"id":"station-reactor-reactor-gauge-1","type":"reactorGauge","u":0.38,"v":0.3,"worldX":3135,"worldY":364,"worldFootprint":{"width":96,"height":68}},{"id":"station-reactor-cooling-unit-2","type":"coolingUnit","u":0.84,"v":0.18,"worldX":3614,"worldY":282,"worldFootprint":{"width":104,"height":132}},{"id":"station-reactor-power-cabinet-3","type":"powerCabinet","u":0.9,"v":0.55,"worldX":3676,"worldY":534,"worldFootprint":{"width":104,"height":132}},{"id":"station-reactor-cable-spool-4","type":"cableSpool","u":0.85,"v":0.67,"worldX":3624,"worldY":616,"worldFootprint":{"width":58,"height":58}},{"id":"station-reactor-tool-cart-5","type":"toolCart","u":0.52,"v":0.82,"worldX":3281,"worldY":718,"worldFootprint":{"width":58,"height":58}},{"id":"station-reactor-workbench-6","type":"workbench","u":0.3,"v":0.82,"worldX":3052,"worldY":718,"worldFootprint":{"width":144,"height":92}},{"id":"station-reactor-emergency-kit-7","type":"emergencyKit","u":0.9,"v":0.75,"worldX":3676,"worldY":670,"worldFootprint":{"width":58,"height":58}},{"id":"station-reactor-wall-display-8","type":"wallDisplay","u":0.15,"v":0.15,"worldX":2896,"worldY":262,"worldFootprint":{"width":96,"height":68}}],"security":[{"id":"station-decoy","type":"decoy","u":0.49,"v":0.88,"worldX":1763,"worldY":653,"worldFootprint":{"width":112,"height":76}},{"id":"station-desk-security","type":"commandDesk","u":0.7,"v":0.66,"worldX":1914,"worldY":530,"worldFootprint":{"width":112,"height":96}},{"id":"station-security-security-console-1","type":"securityConsole","u":0.38,"v":0.18,"worldX":1684,"worldY":261,"worldFootprint":{"width":112,"height":96}},{"id":"station-security-camera-tripod-2","type":"cameraTripod","u":0.17,"v":0.44,"worldX":1532,"worldY":406,"worldFootprint":{"width":58,"height":58}},{"id":"station-security-server-rack-3","type":"serverRack","u":0.83,"v":0.18,"worldX":2008,"worldY":261,"worldFootprint":{"width":104,"height":132}},{"id":"station-security-wall-display-4","type":"wallDisplay","u":0.55,"v":0.17,"worldX":1806,"worldY":255,"worldFootprint":{"width":96,"height":68}},{"id":"station-security-reading-lamp-5","type":"readingLamp","u":0.72,"v":0.66,"worldX":1928,"worldY":530,"worldFootprint":{"width":58,"height":58}},{"id":"station-security-emergency-kit-6","type":"emergencyKit","u":0.86,"v":0.67,"worldX":2029,"worldY":535,"worldFootprint":{"width":58,"height":58}},{"id":"station-security-nutrition-station-7","type":"nutritionStation","u":0.23,"v":0.83,"worldX":1576,"worldY":625,"worldFootprint":{"width":112,"height":96}}],"storage":[{"id":"download-e","type":"task","u":0.78,"v":0.83,"worldX":1352,"worldY":1569,"worldFootprint":{"width":112,"height":76}},{"id":"station-recharge","type":"recharge","u":0.68,"v":0.83,"worldX":1312,"worldY":1569,"worldFootprint":{"width":112,"height":76}},{"id":"station-locker-storage","type":"equipmentLocker","u":0.14,"v":0.2,"worldX":1096,"worldY":1304,"worldFootprint":{"width":104,"height":132}},{"id":"station-storage-cargo-crate-1","type":"cargoCrate","u":0.45,"v":0.85,"worldX":1220,"worldY":1577,"worldFootprint":{"width":144,"height":92}},{"id":"station-storage-cargo-crate-2","type":"cargoCrate","u":0.5,"v":0.85,"worldX":1240,"worldY":1577,"worldFootprint":{"width":144,"height":92}},{"id":"station-storage-pallet-jack-3","type":"palletJack","u":0.14,"v":0.77,"worldX":1096,"worldY":1543,"worldFootprint":{"width":58,"height":58}},{"id":"station-storage-equipment-locker-4","type":"equipmentLocker","u":0.15,"v":0.18,"worldX":1100,"worldY":1296,"worldFootprint":{"width":104,"height":132}},{"id":"station-storage-recycling-unit-5","type":"recyclingUnit","u":0.3,"v":0.19,"worldX":1160,"worldY":1300,"worldFootprint":{"width":112,"height":96}},{"id":"station-storage-tool-cart-6","type":"toolCart","u":0.58,"v":0.84,"worldX":1272,"worldY":1573,"worldFootprint":{"width":58,"height":58}}]}},"objectFootprints":{"airPlant":{"width":72,"height":84},"antennaArray":{"width":96,"height":68},"archiveCabinet":{"width":104,"height":132},"bookshelf":{"width":104,"height":132},"cableSpool":{"width":58,"height":58},"cameraTripod":{"width":58,"height":58},"cargoCrate":{"width":144,"height":92},"commandDesk":{"width":112,"height":96},"compostUnit":{"width":112,"height":96},"conferenceTable":{"width":144,"height":92},"coolingUnit":{"width":104,"height":132},"decoy":{"width":112,"height":76},"diagnosticBed":{"width":144,"height":92},"emergencyKit":{"width":58,"height":58},"equipmentLocker":{"width":104,"height":132},"greenhousePlanter":{"width":144,"height":92},"holoProjector":{"width":96,"height":68},"hydration":{"width":72,"height":84},"medPod":{"width":112,"height":76},"medicalCabinet":{"width":112,"height":96},"mineralScanner":{"width":96,"height":68},"mistSprayer":{"width":72,"height":84},"nutritionStation":{"width":112,"height":96},"palletJack":{"width":58,"height":58},"powerCabinet":{"width":104,"height":132},"radioConsole":{"width":96,"height":68},"reactorGauge":{"width":96,"height":68},"readingLamp":{"width":58,"height":58},"recharge":{"width":112,"height":76},"recyclingUnit":{"width":112,"height":96},"restSeat":{"width":80,"height":72},"securityConsole":{"width":112,"height":96},"serverRack":{"width":104,"height":132},"sofa":{"width":144,"height":92},"specimenCase":{"width":58,"height":58},"sterilizer":{"width":104,"height":132},"supply":{"width":112,"height":76},"toolCart":{"width":58,"height":58},"wallDisplay":{"width":96,"height":68},"workbench":{"width":144,"height":92}},"portals":{"station":[{"id":"portal-archive-c1","doorId":"door-archive","orientation":"vertical","worldBoundary":1020,"worldOpeningSpan":140,"worldOpeningRect":{"x":992,"y":410,"w":56,"h":140},"roomId":"archive","corridorId":"c1"},{"id":"portal-comms-c12","doorId":"","orientation":"horizontal","worldBoundary":1740,"worldOpeningSpan":168,"worldOpeningRect":{"x":3231,"y":1712,"w":168,"h":56},"roomId":"comms","corridorId":"c12"},{"id":"portal-comms-c7","doorId":"door-comms","orientation":"vertical","worldBoundary":2750,"worldOpeningSpan":164,"worldOpeningRect":{"x":2722,"y":1913,"w":56,"h":164},"roomId":"comms","corridorId":"c7"},{"id":"portal-electrical-c5","doorId":"","orientation":"vertical","worldBoundary":1110,"worldOpeningSpan":168,"worldOpeningRect":{"x":1082,"y":1991,"w":56,"h":168},"roomId":"electrical","corridorId":"c5"},{"id":"portal-electrical-c9","doorId":"door-electrical","orientation":"horizontal","worldBoundary":1670,"worldOpeningSpan":180,"worldOpeningRect":{"x":655,"y":1642,"w":180,"h":56},"roomId":"electrical","corridorId":"c9"},{"id":"portal-engine-c11","doorId":"","orientation":"horizontal","worldBoundary":1050,"worldOpeningSpan":168,"worldOpeningRect":{"x":3396,"y":1022,"w":168,"h":56},"roomId":"engine","corridorId":"c11"},{"id":"portal-engine-c12","doorId":"","orientation":"horizontal","worldBoundary":1570,"worldOpeningSpan":168,"worldOpeningRect":{"x":3231,"y":1542,"w":168,"h":56},"roomId":"engine","corridorId":"c12"},{"id":"portal-engine-c13b","doorId":"","orientation":"vertical","worldBoundary":3000,"worldOpeningSpan":146,"worldOpeningRect":{"x":2972,"y":1062,"w":56,"h":146},"roomId":"engine","corridorId":"c13b"},{"id":"portal-engine-c6","doorId":"","orientation":"vertical","worldBoundary":3000,"worldOpeningSpan":168,"worldOpeningRect":{"x":2972,"y":1316,"w":56,"h":168},"roomId":"engine","corridorId":"c6"},{"id":"portal-med-c4","doorId":"","orientation":"horizontal","worldBoundary":2000,"worldOpeningSpan":126,"worldOpeningRect":{"x":1982,"y":1972,"w":126,"h":56},"roomId":"med","corridorId":"c4"},{"id":"portal-med-c5","doorId":"","orientation":"vertical","worldBoundary":1380,"worldOpeningSpan":166,"worldOpeningRect":{"x":1352,"y":2012,"w":56,"h":166},"roomId":"med","corridorId":"c5"},{"id":"portal-meeting-c13a","doorId":"","orientation":"horizontal","worldBoundary":1050,"worldOpeningSpan":168,"worldOpeningRect":{"x":2366,"y":1022,"w":168,"h":56},"roomId":"meeting","corridorId":"c13a"},{"id":"portal-meeting-c13b","doorId":"","orientation":"vertical","worldBoundary":2560,"worldOpeningSpan":146,"worldOpeningRect":{"x":2532,"y":1062,"w":56,"h":146},"roomId":"meeting","corridorId":"c13b"},{"id":"portal-meeting-c3","doorId":"","orientation":"horizontal","worldBoundary":1050,"worldOpeningSpan":168,"worldOpeningRect":{"x":2011,"y":1022,"w":168,"h":56},"roomId":"meeting","corridorId":"c3"},{"id":"portal-meeting-c4","doorId":"","orientation":"horizontal","worldBoundary":1750,"worldOpeningSpan":168,"worldOpeningRect":{"x":2011,"y":1722,"w":168,"h":56},"roomId":"meeting","corridorId":"c4"},{"id":"portal-meeting-c6","doorId":"","orientation":"vertical","worldBoundary":2560,"worldOpeningSpan":168,"worldOpeningRect":{"x":2532,"y":1316,"w":56,"h":168},"roomId":"meeting","corridorId":"c6"},{"id":"portal-meeting-c8e","doorId":"","orientation":"vertical","worldBoundary":1620,"worldOpeningSpan":168,"worldOpeningRect":{"x":1592,"y":1256,"w":56,"h":168},"roomId":"meeting","corridorId":"c8e"},{"id":"portal-reactor-c11","doorId":"","orientation":"horizontal","worldBoundary":840,"worldOpeningSpan":168,"worldOpeningRect":{"x":3396,"y":812,"w":168,"h":56},"roomId":"reactor","corridorId":"c11"},{"id":"portal-reactor-c2","doorId":"door-reactor","orientation":"vertical","worldBoundary":2740,"worldOpeningSpan":156,"worldOpeningRect":{"x":2712,"y":402,"w":56,"h":156},"roomId":"reactor","corridorId":"c2"},{"id":"portal-security-c1","doorId":"","orientation":"vertical","worldBoundary":1410,"worldOpeningSpan":168,"worldOpeningRect":{"x":1382,"y":396,"w":56,"h":168},"roomId":"security","corridorId":"c1"},{"id":"portal-security-c2","doorId":"","orientation":"vertical","worldBoundary":2130,"worldOpeningSpan":168,"worldOpeningRect":{"x":2102,"y":396,"w":56,"h":168},"roomId":"security","corridorId":"c2"},{"id":"portal-security-c3","doorId":"","orientation":"horizontal","worldBoundary":720,"worldOpeningSpan":136,"worldOpeningRect":{"x":1982,"y":692,"w":136,"h":56},"roomId":"security","corridorId":"c3"},{"id":"portal-storage-c8e","doorId":"","orientation":"vertical","worldBoundary":1440,"worldOpeningSpan":168,"worldOpeningRect":{"x":1412,"y":1256,"w":56,"h":168},"roomId":"storage","corridorId":"c8e"},{"id":"portal-storage-c8w","doorId":"","orientation":"vertical","worldBoundary":1040,"worldOpeningSpan":168,"worldOpeningRect":{"x":1012,"y":1256,"w":56,"h":168},"roomId":"storage","corridorId":"c8w"}]}});
const ADVANCED_STATION_MAP = Object.freeze({
  "schema": "dva.authored-map.v302",
  "authoredGeometry": true,
  "id": "station",
  "label": "アウレリア自然共生館",
  "width": 4800,
  "height": 3400,
  "playerRadius": 32,
  "objectSpaces": [
    { "id": "v302-medical-diagnosticBed-1", "room": "medical", "x": 2339, "y": 2681, "w": 185, "h": 103 },
    { "id": "v302-medical-medicalCabinet-2", "room": "medical", "x": 2821, "y": 2681, "w": 149, "h": 88 },
    { "id": "v302-medical-sterilizer-3", "room": "medical", "x": 2341, "y": 2995, "w": 180, "h": 120 },
    { "id": "upload-d", "room": "medical", "x": 2621, "y": 2840, "w": 116, "h": 80 },
    { "id": "medical-handwash-sink-1", "room": "medical", "x": 3001, "y": 2677, "w": 96, "h": 93 },
    { "id": "medical-patient-chair-1", "room": "medical", "x": 2789, "y": 3035, "w": 84, "h": 90 }
  ],
  "speed": 460,
  "ghostSpeed": 560,
  "reportRange": 172,
  "taskRange": 220,
  "ventRange": 0,
  "spawns": [
    {
      "x": 2422,
      "y": 1561,
      "room": "atrium"
    },
    {
      "x": 2500,
      "y": 1561,
      "room": "atrium"
    },
    {
      "x": 2578,
      "y": 1561,
      "room": "atrium"
    },
    {
      "x": 2422,
      "y": 1665,
      "room": "atrium"
    },
    {
      "x": 2500,
      "y": 1665,
      "room": "atrium"
    },
    {
      "x": 2578,
      "y": 1665,
      "room": "atrium"
    },
    {
      "x": 2461,
      "y": 1769,
      "room": "atrium"
    },
    {
      "x": 2539,
      "y": 1769,
      "room": "atrium"
    },
    {
      "x": 2370,
      "y": 1704,
      "room": "atrium"
    },
    {
      "x": 2630,
      "y": 1704,
      "room": "atrium"
    }
  ],
  "rooms": [
    {
      "x": 80,
      "y": 180,
      "w": 1100,
      "h": 660,
      "id": "archive",
      "label": "木洩れ日の記録院",
      "polygon": [
        [
          80,
          260
        ],
        [
          150,
          180
        ],
        [
          1100,
          180
        ],
        [
          1180,
          260
        ],
        [
          1180,
          760
        ],
        [
          1100,
          840
        ],
        [
          150,
          840
        ],
        [
          80,
          760
        ]
      ]
    },
    {
      "x": 1300,
      "y": 520,
      "w": 660,
      "h": 610,
      "id": "security",
      "label": "静謐の協議室",
      "polygon": [
        [
          1380,
          520
        ],
        [
          1880,
          520
        ],
        [
          1960,
          600
        ],
        [
          1960,
          1050
        ],
        [
          1880,
          1130
        ],
        [
          1380,
          1130
        ],
        [
          1300,
          1050
        ],
        [
          1300,
          600
        ]
      ]
    },
    {
      "x": 2000,
      "y": 140,
      "w": 1000,
      "h": 680,
      "id": "observatory",
      "label": "星見の間",
      "polygon": [
        [
          2000,
          220
        ],
        [
          2080,
          140
        ],
        [
          2900,
          140
        ],
        [
          3000,
          240
        ],
        [
          3000,
          720
        ],
        [
          2900,
          820
        ],
        [
          2080,
          820
        ],
        [
          2000,
          740
        ]
      ]
    },
    {
      "x": 3400,
      "y": 150,
      "w": 1300,
      "h": 850,
      "id": "reactor",
      "label": "水鏡の庭",
      "polygon": [
        [
          3500,
          150
        ],
        [
          4600,
          150
        ],
        [
          4700,
          250
        ],
        [
          4700,
          900
        ],
        [
          4600,
          1000
        ],
        [
          3500,
          1000
        ],
        [
          3400,
          900
        ],
        [
          3400,
          250
        ]
      ]
    },
    {
      "x": 40,
      "y": 1250,
      "w": 1040,
      "h": 900,
      "id": "power",
      "label": "灯りの休息庭",
      "polygon": [
        [
          40,
          1350
        ],
        [
          140,
          1250
        ],
        [
          980,
          1250
        ],
        [
          1080,
          1350
        ],
        [
          1080,
          2050
        ],
        [
          980,
          2150
        ],
        [
          140,
          2150
        ],
        [
          40,
          2050
        ]
      ]
    },
    {
      "x": 1030,
      "y": 1500,
      "w": 750,
      "h": 700,
      "id": "storage",
      "label": "暮らしの収納室",
      "polygon": [
        [
          1100,
          1500
        ],
        [
          1700,
          1500
        ],
        [
          1780,
          1580
        ],
        [
          1780,
          2120
        ],
        [
          1700,
          2200
        ],
        [
          1100,
          2200
        ],
        [
          1030,
          2130
        ],
        [
          1030,
          1570
        ]
      ]
    },
    {
      "x": 1850,
      "y": 950,
      "w": 1300,
      "h": 1300,
      "id": "atrium",
      "label": "陽だまりの中庭",
      "polygon": [
        [
          1850,
          1200
        ],
        [
          2120,
          950
        ],
        [
          2820,
          950
        ],
        [
          3150,
          1200
        ],
        [
          3150,
          2020
        ],
        [
          2850,
          2250
        ],
        [
          2120,
          2250
        ],
        [
          1850,
          2030
        ]
      ]
    },
    {
      "x": 3320,
      "y": 1120,
      "w": 1300,
      "h": 700,
      "id": "engineering",
      "label": "木工房",
      "polygon": [
        [
          3320,
          1200
        ],
        [
          3420,
          1120
        ],
        [
          4520,
          1120
        ],
        [
          4620,
          1220
        ],
        [
          4620,
          1720
        ],
        [
          4520,
          1820
        ],
        [
          3420,
          1820
        ],
        [
          3320,
          1720
        ]
      ]
    },
    {
      "x": 3350,
      "y": 1900,
      "w": 1270,
      "h": 720,
      "id": "fabrication",
      "label": "手仕事の工房",
      "polygon": [
        [
          3350,
          1980
        ],
        [
          3450,
          1900
        ],
        [
          4520,
          1900
        ],
        [
          4620,
          2000
        ],
        [
          4620,
          2520
        ],
        [
          4520,
          2620
        ],
        [
          3450,
          2620
        ],
        [
          3350,
          2520
        ]
      ]
    },
    {
      "x": 80,
      "y": 2400,
      "w": 970,
      "h": 900,
      "id": "greenhouse",
      "label": "実りの温室",
      "polygon": [
        [
          80,
          2500
        ],
        [
          180,
          2400
        ],
        [
          950,
          2400
        ],
        [
          1050,
          2500
        ],
        [
          1050,
          3200
        ],
        [
          950,
          3300
        ],
        [
          180,
          3300
        ],
        [
          80,
          3200
        ]
      ]
    },
    {
      "x": 1120,
      "y": 2420,
      "w": 930,
      "h": 860,
      "id": "cafeteria",
      "label": "実りの食堂",
      "polygon": [
        [
          1120,
          2500
        ],
        [
          1220,
          2420
        ],
        [
          1950,
          2420
        ],
        [
          2050,
          2520
        ],
        [
          2050,
          3180
        ],
        [
          1950,
          3280
        ],
        [
          1220,
          3280
        ],
        [
          1120,
          3180
        ]
      ]
    },
    {
      "x": 2200,
      "y": 2520,
      "w": 950,
      "h": 780,
      "id": "medical",
      "label": "源泉の湯治処",
      "polygon": [
        [
          2200,
          2600
        ],
        [
          2300,
          2520
        ],
        [
          3050,
          2520
        ],
        [
          3150,
          2620
        ],
        [
          3150,
          3200
        ],
        [
          3050,
          3300
        ],
        [
          2300,
          3300
        ],
        [
          2200,
          3200
        ]
      ]
    },
    {
      "x": 3480,
      "y": 2720,
      "w": 1140,
      "h": 580,
      "id": "comms",
      "label": "便りの間",
      "polygon": [
        [
          3480,
          2800
        ],
        [
          3580,
          2720
        ],
        [
          4520,
          2720
        ],
        [
          4620,
          2820
        ],
        [
          4620,
          3220
        ],
        [
          4520,
          3300
        ],
        [
          3580,
          3300
        ],
        [
          3480,
          3220
        ]
      ]
    }
  ],
  "corridors": [
    {
      "x": 1180,
      "y": 650,
      "w": 200,
      "h": 180,
      "id": "a01",
      "polygon": [
        [
          1180,
          650
        ],
        [
          1380,
          650
        ],
        [
          1380,
          830
        ],
        [
          1180,
          830
        ]
      ],
      "renderSegments": [
        {
          "x": 1180,
          "y": 650,
          "w": 200,
          "h": 180,
          "polygon": [
            [
              1180,
              650
            ],
            [
              1380,
              650
            ],
            [
              1380,
              830
            ],
            [
              1180,
              830
            ]
          ]
        }
      ]
    },
    {
      "x": 450,
      "y": 840,
      "w": 200,
      "h": 410,
      "id": "a02",
      "polygon": [
        [
          450,
          840
        ],
        [
          650,
          840
        ],
        [
          650,
          1250
        ],
        [
          450,
          1250
        ]
      ],
      "renderSegments": [
        {
          "x": 450,
          "y": 840,
          "w": 200,
          "h": 410,
          "polygon": [
            [
              450,
              840
            ],
            [
              650,
              840
            ],
            [
              650,
              1250
            ],
            [
              450,
              1250
            ]
          ]
        }
      ]
    },
    {
      "x": 1880,
      "y": 610,
      "w": 200,
      "h": 180,
      "id": "a03",
      "polygon": [
        [
          1880,
          610
        ],
        [
          2080,
          610
        ],
        [
          2080,
          790
        ],
        [
          1880,
          790
        ]
      ],
      "renderSegments": [
        {
          "x": 1880,
          "y": 610,
          "w": 200,
          "h": 180,
          "polygon": [
            [
              1880,
              610
            ],
            [
              2080,
              610
            ],
            [
              2080,
              790
            ],
            [
              1880,
              790
            ]
          ]
        }
      ]
    },
    {
      "x": 3000,
      "y": 500,
      "w": 400,
      "h": 180,
      "id": "a04",
      "polygon": [
        [
          3000,
          500
        ],
        [
          3400,
          500
        ],
        [
          3400,
          680
        ],
        [
          3000,
          680
        ]
      ],
      "renderSegments": [
        {
          "x": 3000,
          "y": 500,
          "w": 400,
          "h": 180,
          "polygon": [
            [
              3000,
              500
            ],
            [
              3400,
              500
            ],
            [
              3400,
              680
            ],
            [
              3000,
              680
            ]
          ]
        }
      ]
    },
    {
      "x": 2380,
      "y": 820,
      "w": 220,
      "h": 260,
      "id": "a05",
      "polygon": [
        [
          2380,
          820
        ],
        [
          2600,
          820
        ],
        [
          2600,
          1080
        ],
        [
          2380,
          1080
        ]
      ],
      "renderSegments": [
        {
          "x": 2380,
          "y": 820,
          "w": 220,
          "h": 260,
          "polygon": [
            [
              2380,
              820
            ],
            [
              2600,
              820
            ],
            [
              2600,
              1080
            ],
            [
              2380,
              1080
            ]
          ]
        }
      ]
    },
    {
      "x": 1780,
      "y": 960,
      "w": 220,
      "h": 420,
      "id": "a06",
      "polygon": [
        [
          1780,
          960
        ],
        [
          2000,
          960
        ],
        [
          2000,
          1380
        ],
        [
          1780,
          1380
        ]
      ],
      "renderSegments": [
        {
          "x": 1780,
          "y": 960,
          "w": 220,
          "h": 420,
          "polygon": [
            [
              1780,
              960
            ],
            [
              2000,
              960
            ],
            [
              2000,
              1380
            ],
            [
              1780,
              1380
            ]
          ]
        }
      ]
    },
    {
      "x": 3150,
      "y": 1400,
      "w": 170,
      "h": 190,
      "id": "a07",
      "polygon": [
        [
          3150,
          1400
        ],
        [
          3320,
          1400
        ],
        [
          3320,
          1590
        ],
        [
          3150,
          1590
        ]
      ],
      "renderSegments": [
        {
          "x": 3150,
          "y": 1400,
          "w": 170,
          "h": 190,
          "polygon": [
            [
              3150,
              1400
            ],
            [
              3320,
              1400
            ],
            [
              3320,
              1590
            ],
            [
              3150,
              1590
            ]
          ]
        }
      ]
    },
    {
      "x": 3150,
      "y": 1960,
      "w": 200,
      "h": 180,
      "id": "a08",
      "polygon": [
        [
          3150,
          1960
        ],
        [
          3350,
          1960
        ],
        [
          3350,
          2140
        ],
        [
          3150,
          2140
        ]
      ],
      "renderSegments": [
        {
          "x": 3150,
          "y": 1960,
          "w": 200,
          "h": 180,
          "polygon": [
            [
              3150,
              1960
            ],
            [
              3350,
              1960
            ],
            [
              3350,
              2140
            ],
            [
              3150,
              2140
            ]
          ]
        }
      ]
    },
    {
      "x": 3900,
      "y": 1000,
      "w": 220,
      "h": 120,
      "id": "a09",
      "polygon": [
        [
          3900,
          1000
        ],
        [
          4120,
          1000
        ],
        [
          4120,
          1120
        ],
        [
          3900,
          1120
        ]
      ],
      "renderSegments": [
        {
          "x": 3900,
          "y": 1000,
          "w": 220,
          "h": 120,
          "polygon": [
            [
              3900,
              1000
            ],
            [
              4120,
              1000
            ],
            [
              4120,
              1120
            ],
            [
              3900,
              1120
            ]
          ]
        }
      ]
    },
    {
      "x": 3900,
      "y": 1820,
      "w": 220,
      "h": 80,
      "id": "a10",
      "polygon": [
        [
          3900,
          1820
        ],
        [
          4120,
          1820
        ],
        [
          4120,
          1900
        ],
        [
          3900,
          1900
        ]
      ],
      "renderSegments": [
        {
          "x": 3900,
          "y": 1820,
          "w": 220,
          "h": 80,
          "polygon": [
            [
              3900,
              1820
            ],
            [
              4120,
              1820
            ],
            [
              4120,
              1900
            ],
            [
              3900,
              1900
            ]
          ]
        }
      ]
    },
    {
      "x": 3900,
      "y": 2620,
      "w": 220,
      "h": 100,
      "id": "a11",
      "polygon": [
        [
          3900,
          2620
        ],
        [
          4120,
          2620
        ],
        [
          4120,
          2720
        ],
        [
          3900,
          2720
        ]
      ],
      "renderSegments": [
        {
          "x": 3900,
          "y": 2620,
          "w": 220,
          "h": 100,
          "polygon": [
            [
              3900,
              2620
            ],
            [
              4120,
              2620
            ],
            [
              4120,
              2720
            ],
            [
              3900,
              2720
            ]
          ]
        }
      ]
    },
    {
      "x": 2400,
      "y": 2250,
      "w": 220,
      "h": 270,
      "id": "a12",
      "polygon": [
        [
          2400,
          2250
        ],
        [
          2620,
          2250
        ],
        [
          2620,
          2520
        ],
        [
          2400,
          2520
        ]
      ],
      "renderSegments": [
        {
          "x": 2400,
          "y": 2250,
          "w": 220,
          "h": 270,
          "polygon": [
            [
              2400,
              2250
            ],
            [
              2620,
              2250
            ],
            [
              2620,
              2520
            ],
            [
              2400,
              2520
            ]
          ]
        }
      ]
    },
    {
      "x": 1650,
      "y": 2010,
      "w": 300,
      "h": 490,
      "id": "a13",
      "polygon": [
        [
          1750,
          2010
        ],
        [
          1950,
          2010
        ],
        [
          1950,
          2250
        ],
        [
          1830,
          2250
        ],
        [
          1830,
          2500
        ],
        [
          1650,
          2500
        ],
        [
          1650,
          2200
        ],
        [
          1750,
          2200
        ]
      ],
      "renderSegments": [
        {
          "x": 1650,
          "y": 2010,
          "w": 300,
          "h": 490,
          "polygon": [
            [
              1750,
              2010
            ],
            [
              1950,
              2010
            ],
            [
              1950,
              2250
            ],
            [
              1830,
              2250
            ],
            [
              1830,
              2500
            ],
            [
              1650,
              2500
            ],
            [
              1650,
              2200
            ],
            [
              1750,
              2200
            ]
          ]
        }
      ]
    },
    {
      "x": 950,
      "y": 2780,
      "w": 170,
      "h": 190,
      "id": "a14",
      "polygon": [
        [
          950,
          2780
        ],
        [
          1120,
          2780
        ],
        [
          1120,
          2970
        ],
        [
          950,
          2970
        ]
      ],
      "renderSegments": [
        {
          "x": 950,
          "y": 2780,
          "w": 170,
          "h": 190,
          "polygon": [
            [
              950,
              2780
            ],
            [
              1120,
              2780
            ],
            [
              1120,
              2970
            ],
            [
              950,
              2970
            ]
          ]
        }
      ]
    },
    {
      "x": 980,
      "y": 1660,
      "w": 120,
      "h": 180,
      "id": "a15",
      "polygon": [
        [
          980,
          1660
        ],
        [
          1100,
          1660
        ],
        [
          1100,
          1840
        ],
        [
          980,
          1840
        ]
      ],
      "renderSegments": [
        {
          "x": 980,
          "y": 1660,
          "w": 120,
          "h": 180,
          "polygon": [
            [
              980,
              1660
            ],
            [
              1100,
              1660
            ],
            [
              1100,
              1840
            ],
            [
              980,
              1840
            ]
          ]
        }
      ]
    },
    {
      "x": 1700,
      "y": 1720,
      "w": 150,
      "h": 190,
      "id": "a16",
      "polygon": [
        [
          1700,
          1720
        ],
        [
          1850,
          1720
        ],
        [
          1850,
          1910
        ],
        [
          1700,
          1910
        ]
      ],
      "renderSegments": [
        {
          "x": 1700,
          "y": 1720,
          "w": 150,
          "h": 190,
          "polygon": [
            [
              1700,
              1720
            ],
            [
              1850,
              1720
            ],
            [
              1850,
              1910
            ],
            [
              1700,
              1910
            ]
          ]
        }
      ]
    },
    {
      "x": 650,
      "y": 930,
      "w": 650,
      "h": 320,
      "id": "a17",
      "polygon": [
        [
          650,
          930
        ],
        [
          1300,
          930
        ],
        [
          1300,
          1110
        ],
        [
          900,
          1110
        ],
        [
          900,
          1250
        ],
        [
          650,
          1250
        ]
      ],
      "renderSegments": [
        {
          "x": 650,
          "y": 930,
          "w": 650,
          "h": 320,
          "polygon": [
            [
              650,
              930
            ],
            [
              1300,
              930
            ],
            [
              1300,
              1110
            ],
            [
              900,
              1110
            ],
            [
              900,
              1250
            ],
            [
              650,
              1250
            ]
          ]
        }
      ]
    },
    {
      "x": 3050,
      "y": 2880,
      "w": 430,
      "h": 320,
      "id": "a18",
      "polygon": [
        [
          3050,
          2880
        ],
        [
          3480,
          2880
        ],
        [
          3480,
          3060
        ],
        [
          3250,
          3060
        ],
        [
          3250,
          3200
        ],
        [
          3050,
          3200
        ]
      ],
      "renderSegments": [
        {
          "x": 3050,
          "y": 2880,
          "w": 430,
          "h": 320,
          "polygon": [
            [
              3050,
              2880
            ],
            [
              3480,
              2880
            ],
            [
              3480,
              3060
            ],
            [
              3250,
              3060
            ],
            [
              3250,
              3200
            ],
            [
              3050,
              3200
            ]
          ]
        }
      ]
    }
  ],
  "stations": [
    {
      "id": "download-a",
      "type": "task",
      "task": "download",
      "label": "ダウンロード",
      "x": 630,
      "y": 497,
      "room": "archive",
      "integrated": true
    },
    {
      "id": "upload-a",
      "type": "task",
      "task": "upload",
      "label": "アップロード",
      "x": 4073,
      "y": 3022,
      "room": "comms",
      "integrated": true
    },
    {
      "id": "download-b",
      "type": "task",
      "task": "download",
      "label": "ダウンロード",
      "x": 581,
      "y": 1700,
      "room": "power",
      "integrated": true
    },
    {
      "id": "upload-b",
      "type": "task",
      "task": "upload",
      "label": "アップロード",
      "x": 2500,
      "y": 1366,
      "room": "atrium",
      "integrated": true
    },
    {
      "id": "download-c",
      "type": "task",
      "task": "download",
      "label": "ダウンロード",
      "x": 2500,
      "y": 466,
      "room": "observatory",
      "integrated": true
    },
    {
      "id": "upload-c",
      "type": "task",
      "task": "upload",
      "label": "アップロード",
      "x": 3996,
      "y": 1470,
      "room": "engineering",
      "integrated": true
    },
    {
      "id": "download-d",
      "type": "task",
      "task": "download",
      "label": "ダウンロード",
      "x": 584,
      "y": 2850,
      "room": "greenhouse",
      "integrated": true
    },
    {
      "id": "upload-d",
      "type": "task",
      "task": "upload",
      "label": "アップロード",
      "x": 2694,
      "y": 2910,
      "room": "medical",
      "integrated": true
    },
    {
      "id": "download-e",
      "type": "task",
      "task": "download",
      "label": "ダウンロード",
      "x": 1420,
      "y": 1850,
      "room": "storage",
      "integrated": true
    },
    {
      "id": "upload-e",
      "type": "task",
      "task": "upload",
      "label": "アップロード",
      "x": 4010,
      "y": 2260,
      "room": "fabrication",
      "integrated": true
    },
    {
      "id": "download-f",
      "type": "task",
      "task": "download",
      "label": "ダウンロード",
      "x": 1630,
      "y": 837,
      "room": "security",
      "integrated": true
    },
    {
      "id": "upload-f",
      "type": "task",
      "task": "upload",
      "label": "アップロード",
      "x": 1604,
      "y": 2850,
      "room": "cafeteria",
      "integrated": true
    },
    {
      "id": "meeting-button",
      "type": "emergency",
      "label": "緊急会議",
      "x": 2500,
      "y": 1652,
      "room": "atrium",
      "integrated": true
    },
    {
      "id": "repair-lights",
      "type": "repair",
      "repair": "lights",
      "label": "配電復旧",
      "x": 872,
      "y": 1718,
      "room": "power",
      "integrated": true
    },
    {
      "id": "repair-comms",
      "type": "repair",
      "repair": "comms",
      "label": "通信復旧",
      "x": 4369,
      "y": 3039,
      "room": "comms",
      "integrated": true
    },
    {
      "id": "repair-reactor-a",
      "type": "repair",
      "repair": "reactor",
      "label": "炉心A",
      "x": 3842,
      "y": 592,
      "room": "reactor",
      "integrated": true
    },
    {
      "id": "repair-reactor-b",
      "type": "repair",
      "repair": "reactor",
      "label": "炉心B",
      "x": 4271,
      "y": 592,
      "room": "reactor",
      "integrated": true
    }
  ],
  "objects": [
    {
      "id": "v302-archive-bookshelf-1",
      "type": "bookshelf",
      "label": "閲覧書架",
      "effectLabel": "マナ +1",
      "effectKind": "mana",
      "effectAmount": 1,
      "x": 333,
      "y": 365,
      "room": "archive",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 32000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-archive-archiveCabinet-2",
      "type": "archiveCabinet",
      "label": "保存箪笥",
      "effectLabel": "2C 獲得",
      "effectKind": "credits",
      "effectAmount": 2,
      "x": 916,
      "y": 365,
      "room": "archive",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 36000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-archive-readingLamp-3",
      "type": "readingLamp",
      "label": "読書席",
      "effectLabel": "マナ +1",
      "effectKind": "mana",
      "effectAmount": 1,
      "x": 344,
      "y": 662,
      "room": "archive",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 26000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-security-securityConsole-1",
      "type": "securityConsole",
      "label": "協議地図机",
      "effectLabel": "幸運／直観 +15%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.15,
      "x": 1452,
      "y": 691,
      "room": "security",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 40000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76,
      "effectDurationMs": 20000
    },
    {
      "id": "v302-security-cameraTripod-2",
      "type": "cameraTripod",
      "label": "観察台",
      "effectLabel": "幸運／直観 +15%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.15,
      "x": 1802,
      "y": 691,
      "room": "security",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 36000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76,
      "effectDurationMs": 20000
    },
    {
      "id": "v302-security-equipmentLocker-3",
      "type": "equipmentLocker",
      "label": "備品箪笥",
      "effectLabel": "スタミナ +70",
      "effectKind": "stamina",
      "effectAmount": 70,
      "x": 1458,
      "y": 965,
      "room": "security",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 36000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-observatory-holoProjector-1",
      "type": "holoProjector",
      "label": "星図円卓",
      "effectLabel": "幸運／直観 +20%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.2,
      "x": 2230,
      "y": 330,
      "room": "observatory",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 38000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76,
      "effectDurationMs": 20000
    },
    {
      "id": "v302-observatory-readingLamp-2",
      "type": "readingLamp",
      "label": "星見読書席",
      "effectLabel": "マナ +1",
      "effectKind": "mana",
      "effectAmount": 1,
      "x": 2760,
      "y": 330,
      "room": "observatory",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 26000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-observatory-commandDesk-3",
      "type": "commandDesk",
      "label": "観測机",
      "effectLabel": "幸運／直観 +15%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.15,
      "x": 2240,
      "y": 636,
      "room": "observatory",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 38000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76,
      "effectDurationMs": 20000
    },
    {
      "id": "v302-reactor-reactorGauge-1",
      "type": "reactorGauge",
      "label": "湧水時計",
      "effectLabel": "幸運／直観 +15%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.15,
      "x": 3699,
      "y": 388,
      "room": "reactor",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 38000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76,
      "effectDurationMs": 20000
    },
    {
      "id": "v302-reactor-coolingUnit-2",
      "type": "coolingUnit",
      "label": "清流の石鉢",
      "effectLabel": "スタミナ +120",
      "effectKind": "stamina",
      "effectAmount": 120,
      "x": 4388,
      "y": 388,
      "room": "reactor",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 36000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-reactor-powerCabinet-3",
      "type": "powerCabinet",
      "label": "常夜石灯籠",
      "effectLabel": "スタミナ +80",
      "effectKind": "stamina",
      "effectAmount": 80,
      "x": 3712,
      "y": 771,
      "room": "reactor",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 38000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-power-powerCabinet-1",
      "type": "powerCabinet",
      "label": "行灯棚",
      "effectLabel": "マナ +1",
      "effectKind": "mana",
      "effectAmount": 1,
      "x": 279,
      "y": 1502,
      "room": "power",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 38000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-power-cableSpool-2",
      "type": "cableSpool",
      "label": "手仕事台",
      "effectLabel": "2C 獲得",
      "effectKind": "credits",
      "effectAmount": 2,
      "x": 830,
      "y": 1502,
      "room": "power",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 34000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-power-recharge-3",
      "type": "recharge",
      "label": "休息座",
      "effectLabel": "スタミナ +200",
      "effectKind": "stamina",
      "effectAmount": 200,
      "x": 290,
      "y": 1907,
      "room": "power",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 15000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-storage-cargoCrate-1",
      "type": "cargoCrate",
      "label": "保存木箱",
      "effectLabel": "3C 獲得",
      "effectKind": "credits",
      "effectAmount": 3,
      "x": 1203,
      "y": 1696,
      "room": "storage",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 34000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-storage-palletJack-2",
      "type": "palletJack",
      "label": "籐かご手押し台",
      "effectLabel": "加速 1.25・8秒",
      "effectKind": "acceleration",
      "effectAmount": 1.25,
      "x": 1600,
      "y": 1696,
      "room": "storage",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 34000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76,
      "effectDurationMs": 8000
    },
    {
      "id": "v302-storage-equipmentLocker-3",
      "type": "equipmentLocker",
      "label": "リネン棚",
      "effectLabel": "スタミナ +90",
      "effectKind": "stamina",
      "effectAmount": 90,
      "x": 1210,
      "y": 2011,
      "room": "storage",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 36000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-atrium-sofa-1",
      "type": "conferenceSofa",
      "label": "陽だまりソファ",
      "effectLabel": "HP回復（最大1・個人上限まで）",
      "effectKind": "overheal",
      "effectAmount": 1,
      "x": 2149,
      "y": 1314,
      "room": "atrium",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 18000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-atrium-hydration-2",
      "type": "mineralWaterBar",
      "label": "湧水給水卓",
      "effectLabel": "スタミナ +100",
      "effectKind": "stamina",
      "effectAmount": 100,
      "x": 2838,
      "y": 1314,
      "room": "atrium",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 15000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-atrium-airPlant-3",
      "type": "indoorGarden",
      "label": "季節の中庭植栽",
      "effectLabel": "幸運／直観 +12%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.12,
      "x": 2162,
      "y": 1899,
      "room": "atrium",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 16000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76,
      "effectDurationMs": 20000
    },
    {
      "id": "v302-atrium-conferenceTable-4",
      "type": "conferenceTable",
      "label": "木製協議卓",
      "effectLabel": "マナ +1",
      "effectKind": "mana",
      "effectAmount": 1,
      "x": 2812,
      "y": 1886,
      "room": "atrium",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 36000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-engineering-workbench-1",
      "type": "workbench",
      "label": "木工作業台",
      "effectLabel": "スタミナ +120",
      "effectKind": "stamina",
      "effectAmount": 120,
      "x": 3619,
      "y": 1316,
      "room": "engineering",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 38000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-engineering-toolCart-2",
      "type": "toolCart",
      "label": "端材手押し棚",
      "effectLabel": "2C 獲得",
      "effectKind": "credits",
      "effectAmount": 2,
      "x": 4308,
      "y": 1316,
      "room": "engineering",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 34000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-engineering-coolingUnit-3",
      "type": "coolingUnit",
      "label": "石の洗い場",
      "effectLabel": "スタミナ +120",
      "effectKind": "stamina",
      "effectAmount": 120,
      "x": 3632,
      "y": 1631,
      "room": "engineering",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 36000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-fabrication-workbench-1",
      "type": "workbench",
      "label": "工芸作業台",
      "effectLabel": "スタミナ +120",
      "effectKind": "stamina",
      "effectAmount": 120,
      "x": 3642,
      "y": 2102,
      "room": "fabrication",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 38000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-fabrication-recyclingUnit-2",
      "type": "recyclingUnit",
      "label": "粘土再生槽",
      "effectLabel": "3C 獲得",
      "effectKind": "credits",
      "effectAmount": 3,
      "x": 4315,
      "y": 2102,
      "room": "fabrication",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 34000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-fabrication-toolCart-3",
      "type": "toolCart",
      "label": "染織手押し台",
      "effectLabel": "加速 1.30・8秒",
      "effectKind": "acceleration",
      "effectAmount": 1.3,
      "x": 3655,
      "y": 2426,
      "room": "fabrication",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 34000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76,
      "effectDurationMs": 8000
    },
    {
      "id": "v302-greenhouse-greenhousePlanter-1",
      "type": "aromaticGarden",
      "label": "芳香植物庭園",
      "effectLabel": "幸運／直観 +15%・24秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.15,
      "x": 303,
      "y": 2652,
      "room": "greenhouse",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 18000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76,
      "effectDurationMs": 24000
    },
    {
      "id": "v302-greenhouse-mistSprayer-2",
      "type": "restorativeMist",
      "label": "薬草の霧鉢",
      "effectLabel": "幸運／直観 +12%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.12,
      "x": 817,
      "y": 2652,
      "room": "greenhouse",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 18000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76,
      "effectDurationMs": 20000
    },
    {
      "id": "v302-greenhouse-compostUnit-3",
      "type": "herbPreparationTable",
      "label": "薬草調合台",
      "effectLabel": "HP +1",
      "effectKind": "heal",
      "effectAmount": 1,
      "x": 313,
      "y": 3057,
      "room": "greenhouse",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 34000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-cafeteria-nutritionStation-1",
      "type": "healthyMealTable",
      "label": "健康食ビュッフェ",
      "effectLabel": "HP +1・スタミナ +120・マナ +1",
      "effectKind": "healthyMeal",
      "effectAmount": 1,
      "x": 1334,
      "y": 2661,
      "room": "cafeteria",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 18000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-cafeteria-hydration-2",
      "type": "mineralWaterBar",
      "label": "ミネラル給水卓",
      "effectLabel": "スタミナ +100",
      "effectKind": "stamina",
      "effectAmount": 100,
      "x": 1827,
      "y": 2661,
      "room": "cafeteria",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 15000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-cafeteria-sofa-3",
      "type": "relaxationSalon",
      "label": "静養ソファ",
      "effectLabel": "加速 1.35・12秒",
      "effectKind": "acceleration",
      "effectAmount": 1.35,
      "x": 1343,
      "y": 3048,
      "room": "cafeteria",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 18000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76,
      "effectDurationMs": 12000
    },
    {
      "id": "v302-medical-diagnosticBed-1",
      "type": "relaxationBed",
      "label": "布張り施術寝台",
      "effectLabel": "加速 1.35・12秒",
      "effectKind": "acceleration",
      "effectAmount": 1.35,
      "x": 2419,
      "y": 2738,
      "room": "medical",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 30000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76,
      "effectDurationMs": 12000
    },
    {
      "id": "v302-medical-medicalCabinet-2",
      "type": "herbalCabinet",
      "label": "薬草とリネンの棚",
      "effectLabel": "HP +1",
      "effectKind": "heal",
      "effectAmount": 1,
      "x": 2922,
      "y": 2738,
      "room": "medical",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 30000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-medical-sterilizer-3",
      "type": "footBath",
      "label": "源泉掛け流し足湯",
      "effectLabel": "回復・浄化・再使用待機 -6秒",
      "effectKind": "footBath",
      "effectAmount": 1,
      "x": 2428,
      "y": 3089,
      "room": "medical",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 36000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-comms-radioConsole-1",
      "type": "radioConsole",
      "label": "書簡机",
      "effectLabel": "幸運／直観 +15%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.15,
      "x": 3742,
      "y": 2882,
      "room": "comms",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 38000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76,
      "effectDurationMs": 20000
    },
    {
      "id": "v302-comms-serverRack-2",
      "type": "serverRack",
      "label": "文箱棚",
      "effectLabel": "3C 獲得",
      "effectKind": "credits",
      "effectAmount": 3,
      "x": 4346,
      "y": 2882,
      "room": "comms",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 40000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v302-comms-antennaArray-3",
      "type": "antennaArray",
      "label": "風鈴の小庭",
      "effectLabel": "マナ +1",
      "effectKind": "mana",
      "effectAmount": 1,
      "x": 3754,
      "y": 3143,
      "room": "comms",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "cooldownMs": 40000,
      "useRange": 128,
      "visualWidth": 110,
      "visualHeight": 76
    },
    {
      "id": "v317-corridor-a01-1",
      "type": "wallSconce",
      "label": "壁灯",
      "effectLabel": "幸運／直観 +15%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.15,
      "effectDurationMs": 20000,
      "x": 1240,
      "y": 672,
      "corridor": "a01",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 60,
      "sourceLocalY": 22,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 24,
      "visualHeight": 24
    },
    {
      "id": "v317-corridor-a02-1",
      "type": "corridorPlanter",
      "label": "回復植栽",
      "effectLabel": "幸運／直観 +12%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.12,
      "effectDurationMs": 20000,
      "x": 485,
      "y": 1046,
      "corridor": "a02",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 35,
      "sourceLocalY": 206,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 42,
      "visualHeight": 42
    },
    {
      "id": "v317-corridor-a03-1",
      "type": "wallSconce",
      "label": "壁灯",
      "effectLabel": "幸運／直観 +15%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.15,
      "effectDurationMs": 20000,
      "x": 2005,
      "y": 632,
      "corridor": "a03",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 125,
      "sourceLocalY": 22,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 24,
      "visualHeight": 24
    },
    {
      "id": "v317-corridor-a04-1",
      "type": "corridorBench",
      "label": "休息腰掛け",
      "effectLabel": "加速 1.4・18秒",
      "effectKind": "acceleration",
      "effectAmount": 1.4,
      "effectDurationMs": 18000,
      "x": 3201,
      "y": 532,
      "corridor": "a04",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 201,
      "sourceLocalY": 32,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 100,
      "visualHeight": 40
    },
    {
      "id": "v317-corridor-a05-1",
      "type": "corridorPlanter",
      "label": "香草鉢",
      "effectLabel": "HP +1",
      "effectKind": "heal",
      "effectAmount": 1,
      "x": 2414,
      "y": 885,
      "corridor": "a05",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 34,
      "sourceLocalY": 65,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 42,
      "visualHeight": 42
    },
    {
      "id": "v317-corridor-a06-1",
      "type": "corridorBench",
      "label": "静養腰掛け",
      "effectLabel": "加速 1.4・18秒",
      "effectKind": "acceleration",
      "effectAmount": 1.4,
      "effectDurationMs": 18000,
      "x": 1828,
      "y": 1170,
      "corridor": "a06",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 48,
      "sourceLocalY": 210,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 40,
      "visualHeight": 100
    },
    {
      "id": "v317-corridor-a07-1",
      "type": "wallSconce",
      "label": "壁灯",
      "effectLabel": "幸運／直観 +15%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.15,
      "effectDurationMs": 20000,
      "x": 3235,
      "y": 1422,
      "corridor": "a07",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 85,
      "sourceLocalY": 22,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 24,
      "visualHeight": 24
    },
    {
      "id": "v317-corridor-a08-1",
      "type": "corridorPlanter",
      "label": "小葉鉢",
      "effectLabel": "スタミナ +55",
      "effectKind": "stamina",
      "effectAmount": 55,
      "x": 3182,
      "y": 1992,
      "corridor": "a08",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 32,
      "sourceLocalY": 32,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 42,
      "visualHeight": 42
    },
    {
      "id": "v317-corridor-a09-1",
      "type": "wallSconce",
      "label": "壁灯",
      "effectLabel": "幸運／直観 +15%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.15,
      "effectDurationMs": 20000,
      "x": 3928,
      "y": 1061,
      "corridor": "a09",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 28,
      "sourceLocalY": 61,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 24,
      "visualHeight": 24
    },
    {
      "id": "v317-corridor-a10-1",
      "type": "wallSconce",
      "label": "足元灯",
      "effectLabel": "幸運／直観 +10%・15秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.1,
      "effectDurationMs": 15000,
      "x": 3928,
      "y": 1861,
      "corridor": "a10",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 28,
      "sourceLocalY": 41,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 24,
      "visualHeight": 24
    },
    {
      "id": "v317-corridor-a11-1",
      "type": "wallSconce",
      "label": "足元灯",
      "effectLabel": "幸運／直観 +10%・15秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.1,
      "effectDurationMs": 15000,
      "x": 3928,
      "y": 2671,
      "corridor": "a11",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 28,
      "sourceLocalY": 51,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 24,
      "visualHeight": 24
    },
    {
      "id": "v317-corridor-a12-1",
      "type": "corridorPlanter",
      "label": "薬草鉢",
      "effectLabel": "幸運／直観 +12%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.12,
      "effectDurationMs": 20000,
      "x": 2434,
      "y": 2386,
      "corridor": "a12",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 34,
      "sourceLocalY": 136,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 42,
      "visualHeight": 42
    },
    {
      "id": "v317-corridor-a13-1",
      "type": "corridorPlanter",
      "label": "木陰鉢",
      "effectLabel": "スタミナ +60",
      "effectKind": "stamina",
      "effectAmount": 60,
      "x": 1900,
      "y": 2180,
      "corridor": "a13",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 250,
      "sourceLocalY": 170,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 42,
      "visualHeight": 42
    },
    {
      "id": "v317-corridor-a13-2",
      "type": "corridorBench",
      "label": "曲がり角腰掛け",
      "effectLabel": "加速 1.4・18秒",
      "effectKind": "acceleration",
      "effectAmount": 1.4,
      "effectDurationMs": 18000,
      "x": 1718,
      "y": 2385,
      "corridor": "a13",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 68,
      "sourceLocalY": 375,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 100,
      "visualHeight": 40
    },
    {
      "id": "v317-corridor-a14-1",
      "type": "wallSconce",
      "label": "壁灯",
      "effectLabel": "幸運／直観 +15%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.15,
      "effectDurationMs": 20000,
      "x": 1085,
      "y": 2802,
      "corridor": "a14",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 135,
      "sourceLocalY": 22,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 24,
      "visualHeight": 24
    },
    {
      "id": "v317-corridor-a15-1",
      "type": "wallSconce",
      "label": "壁灯",
      "effectLabel": "マナ +1",
      "effectKind": "mana",
      "effectAmount": 1,
      "x": 1040,
      "y": 1682,
      "corridor": "a15",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 60,
      "sourceLocalY": 22,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 24,
      "visualHeight": 24
    },
    {
      "id": "v317-corridor-a16-1",
      "type": "wallSconce",
      "label": "壁灯",
      "effectLabel": "マナ +1",
      "effectKind": "mana",
      "effectAmount": 1,
      "x": 1815,
      "y": 1742,
      "corridor": "a16",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 115,
      "sourceLocalY": 22,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 24,
      "visualHeight": 24
    },
    {
      "id": "v317-corridor-a17-1",
      "type": "corridorBench",
      "label": "窓辺腰掛け",
      "effectLabel": "加速 1.4・18秒",
      "effectKind": "acceleration",
      "effectAmount": 1.4,
      "effectDurationMs": 18000,
      "x": 1150,
      "y": 968,
      "corridor": "a17",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 500,
      "sourceLocalY": 38,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 100,
      "visualHeight": 40
    },
    {
      "id": "v317-corridor-a17-2",
      "type": "corridorPlanter",
      "label": "木陰鉢",
      "effectLabel": "幸運／直観 +12%・20秒",
      "effectKind": "luckBoost",
      "effectAmount": 0.12,
      "effectDurationMs": 20000,
      "x": 745,
      "y": 1185,
      "corridor": "a17",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 95,
      "sourceLocalY": 255,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 42,
      "visualHeight": 42
    },
    {
      "id": "v317-corridor-a18-1",
      "type": "corridorBench",
      "label": "静養腰掛け",
      "effectLabel": "加速 1.4・18秒",
      "effectKind": "acceleration",
      "effectAmount": 1.4,
      "effectDurationMs": 18000,
      "x": 3401,
      "y": 2918,
      "corridor": "a18",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 351,
      "sourceLocalY": 38,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 100,
      "visualHeight": 40
    },
    {
      "id": "v317-corridor-a18-2",
      "type": "corridorPlanter",
      "label": "香草鉢",
      "effectLabel": "HP +1",
      "effectKind": "heal",
      "effectAmount": 1,
      "x": 3233,
      "y": 3130,
      "corridor": "a18",
      "interactive": true,
      "integrated": true,
      "assetAnchor": true,
      "sourceTexture": "field-aurelia-corridor-objects-v318.webp",
      "sourceLocalX": 183,
      "sourceLocalY": 250,
      "cooldownMs": 32000,
      "useRange": 104,
      "visualWidth": 42,
      "visualHeight": 42
    }
  ],
  "vents": [],
  "doors": [
    {
      "id": "d-archive-security",
      "label": "区画扉",
      "orientation": "vertical",
      "x": 1165,
      "y": 675,
      "w": 30,
      "h": 130
    },
    {
      "id": "d-archive-power",
      "label": "区画扉",
      "orientation": "horizontal",
      "x": 485,
      "y": 825,
      "w": 130,
      "h": 30
    },
    {
      "id": "d-security-north",
      "label": "区画扉",
      "orientation": "vertical",
      "x": 1865,
      "y": 635,
      "w": 30,
      "h": 130
    },
    {
      "id": "d-observatory-west",
      "label": "区画扉",
      "orientation": "vertical",
      "x": 1985,
      "y": 635,
      "w": 30,
      "h": 130
    },
    {
      "id": "d-observatory-reactor",
      "label": "区画扉",
      "orientation": "vertical",
      "x": 2985,
      "y": 525,
      "w": 30,
      "h": 130
    },
    {
      "id": "d-observatory-atrium",
      "label": "区画扉",
      "orientation": "horizontal",
      "x": 2425,
      "y": 805,
      "w": 130,
      "h": 30
    },
    {
      "id": "d-security-atrium",
      "label": "区画扉",
      "orientation": "vertical",
      "x": 1865,
      "y": 985,
      "w": 30,
      "h": 100
    },
    {
      "id": "d-atrium-engineering",
      "label": "区画扉",
      "orientation": "vertical",
      "x": 3135,
      "y": 1430,
      "w": 30,
      "h": 130
    },
    {
      "id": "d-atrium-fabrication",
      "label": "区画扉",
      "orientation": "vertical",
      "x": 3135,
      "y": 1985,
      "w": 30,
      "h": 130
    },
    {
      "id": "d-reactor-engineering",
      "label": "区画扉",
      "orientation": "horizontal",
      "x": 3945,
      "y": 985,
      "w": 130,
      "h": 30
    },
    {
      "id": "d-engineering-fabrication",
      "label": "区画扉",
      "orientation": "horizontal",
      "x": 3945,
      "y": 1805,
      "w": 130,
      "h": 30
    },
    {
      "id": "d-fabrication-comms",
      "label": "区画扉",
      "orientation": "horizontal",
      "x": 3945,
      "y": 2605,
      "w": 130,
      "h": 30
    },
    {
      "id": "d-atrium-medical",
      "label": "区画扉",
      "orientation": "horizontal",
      "x": 2445,
      "y": 2235,
      "w": 130,
      "h": 30
    },
    {
      "id": "d-atrium-cafeteria",
      "label": "区画扉",
      "orientation": "vertical",
      "x": 1835,
      "y": 2060,
      "w": 30,
      "h": 120
    },
    {
      "id": "d-greenhouse-east",
      "label": "区画扉",
      "orientation": "vertical",
      "x": 1035,
      "y": 2810,
      "w": 30,
      "h": 130
    },
    {
      "id": "d-cafeteria-west",
      "label": "区画扉",
      "orientation": "vertical",
      "x": 1105,
      "y": 2810,
      "w": 30,
      "h": 130
    },
    {
      "id": "d-power-storage",
      "label": "区画扉",
      "orientation": "vertical",
      "x": 1065,
      "y": 1685,
      "w": 30,
      "h": 130
    },
    {
      "id": "d-storage-atrium",
      "label": "区画扉",
      "orientation": "vertical",
      "x": 1765,
      "y": 1750,
      "w": 30,
      "h": 130
    },
    {
      "id": "d-medical-north",
      "label": "区画扉",
      "orientation": "horizontal",
      "x": 2445,
      "y": 2505,
      "w": 130,
      "h": 30
    },
    {
      "id": "d-medical-east",
      "label": "区画扉",
      "orientation": "vertical",
      "x": 3135,
      "y": 2910,
      "w": 30,
      "h": 130
    },
    {
      "id": "d-comms-west",
      "label": "区画扉",
      "orientation": "vertical",
      "x": 3465,
      "y": 2910,
      "w": 30,
      "h": 130
    }
  ],
  "sourceTexture": "assets/generated/field-aurelia-corridor-objects-v318.webp",
  "assetRevision": "v340-full-map-world-scale"
});
/* Collision against explicitly authored world-space object footprints.
 * Object spaces are map data, never derived from sprite size or pixels. */
(function (root) {
  'use strict';

  const finite = value => typeof value === 'number' && Number.isFinite(value);

  function validateSpace(value, index) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError(`objectSpaces[${index}] must be an object`);
    }
    const { id, room, x, y, w, h } = value;
    if (typeof id !== 'string' || !id.trim() || id !== id.trim()) {
      throw new TypeError(`objectSpaces[${index}].id must be a nonempty trimmed string`);
    }
    if (typeof room !== 'string' || !room.trim() || room !== room.trim()) {
      throw new TypeError(`objectSpaces[${index}].room must be a nonempty trimmed string`);
    }
    if (![x, y, w, h].every(finite) || w <= 0 || h <= 0 ||
        !Number.isFinite(x + w) || !Number.isFinite(y + h)) {
      throw new RangeError(`objectSpaces[${index}] needs finite x/y and positive finite w/h`);
    }
    return Object.freeze({ id, room, x, y, w, h });
  }

  // A point is a radius-zero circle. Tangency with any edge or corner counts
  // as occupied space, so a movement solver cannot settle on the boundary.
  function circleIntersectsRect(x, y, radius, rect) {
    if (![x, y, radius].every(finite) || radius < 0) {
      throw new RangeError('Circle needs finite x/y and a nonnegative finite radius');
    }
    if (!rect || ![rect.x, rect.y, rect.w, rect.h].every(finite) ||
        rect.w <= 0 || rect.h <= 0 ||
        !Number.isFinite(rect.x + rect.w) || !Number.isFinite(rect.y + rect.h)) {
      throw new RangeError('Rectangle needs finite x/y and positive finite w/h');
    }
    const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
    return Math.hypot(x - nearestX, y - nearestY) <= radius;
  }

  function compile(map) {
    if (!map || !Array.isArray(map.objectSpaces)) {
      throw new TypeError('Map needs an explicit objectSpaces array');
    }
    const ids = new Set();
    const geometry = new Set();
    const spaces = map.objectSpaces.map((source, index) => {
      const space = validateSpace(source, index);
      if (ids.has(space.id)) throw new Error(`Duplicate object-space id: ${space.id}`);
      // Equivalent occupied rectangles are duplicate records even if a second
      // author accidentally supplies a different id or room label.
      const key = JSON.stringify([space.x, space.y, space.w, space.h]);
      if (geometry.has(key)) throw new Error(`Duplicate object-space rectangle: ${space.id}`);
      ids.add(space.id);
      geometry.add(key);
      return space;
    });
    Object.freeze(spaces);
    function firstIntersection(x, y, radius) {
      if (![x, y, radius].every(finite) || radius < 0) {
        throw new RangeError('Circle needs finite x/y and a nonnegative finite radius');
      }
      // Input order is preserved so the result is stable across repeated calls.
      for (const space of spaces) {
        if (circleIntersectsRect(x, y, radius, space)) return space;
      }
      return null;
    }
    return Object.freeze({ spaces, firstIntersection,
      isBlocked(x, y, radius) { return firstIntersection(x, y, radius) !== null; } });
  }

  // The medical prototype has drawn walls at the north/east polygon edges.
  // Its corridor polygons touch those edges more widely than the visible door
  // cuts. Keep this index separate from object spaces: floor-bypassing powers
  // still pass walls while physical furniture remains solid.
  function compileMedicalWalls(map) {
    const medical = map?.rooms?.find(room => room.id === 'medical');
    // Client map snapshots omit authoredGeometry, so the actual polygon and
    // door records, rather than that server-only flag, identify this room.
    if (map?.id !== 'station' || !medical) {
      return Object.freeze({ walls: Object.freeze([]), isBlocked: () => false });
    }
    const northDoor = map.doors?.find(door => door.id === 'd-medical-north');
    const eastDoor = map.doors?.find(door => door.id === 'd-medical-east');
    if (!northDoor || !eastDoor || northDoor.orientation !== 'horizontal' || eastDoor.orientation !== 'vertical') {
      throw new Error('Medical wall openings need the north and east authored doors');
    }
    const polygon = medical.polygon;
    if (!Array.isArray(polygon) || polygon.length < 4) throw new Error('Medical room polygon is required');
    let northEdge = null;
    let eastEdge = null;
    for (let i = 0; i < polygon.length; i += 1) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      if (a[1] === medical.y && b[1] === medical.y) northEdge = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
      if (a[0] === medical.x + medical.w && b[0] === medical.x + medical.w) {
        eastEdge = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
      }
    }
    const northY = medical.y;
    const eastX = medical.x + medical.w;
    if (!northEdge || !eastEdge ||
        Math.abs(northDoor.y + northDoor.h / 2 - northY) > 0.5 ||
        Math.abs(eastDoor.x + eastDoor.w / 2 - eastX) > 0.5 ||
        northDoor.x <= northEdge[0] || northDoor.x + northDoor.w >= northEdge[1] ||
        eastDoor.y <= eastEdge[0] || eastDoor.y + eastDoor.h >= eastEdge[1]) {
      throw new Error('Medical doors must cut through their authored wall edges');
    }
    const walls = Object.freeze([
      Object.freeze({ x: northEdge[0], y: northY - 0.5, w: northDoor.x - northEdge[0], h: 1 }),
      Object.freeze({ x: northDoor.x + northDoor.w, y: northY - 0.5, w: northEdge[1] - northDoor.x - northDoor.w, h: 1 }),
      Object.freeze({ x: eastX - 0.5, y: eastEdge[0], w: 1, h: eastDoor.y - eastEdge[0] }),
      Object.freeze({ x: eastX - 0.5, y: eastDoor.y + eastDoor.h, w: 1, h: eastEdge[1] - eastDoor.y - eastDoor.h })
    ]);
    return Object.freeze({ walls, isBlocked(x, y, radius) {
      return walls.some(wall => circleIntersectsRect(x, y, radius, wall));
    } });
  }

  const api = Object.freeze({ compile, compileMedicalWalls, circleIntersectsRect });
  root.DvaObjectSpaceCollision = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);

(function exposeDvaEconomyCatalog(root, factory) {
  const catalog = factory();
  if (typeof module === "object" && module?.exports) module.exports = catalog;
  if (root) root.DVAEconomyCatalog = catalog;
})(typeof globalThis === "object" ? globalThis : this, () => {
  "use strict";

  const COOLDOWN_MS_PER_CREDIT = 5_000;
  const creditIncome = Object.freeze({
    passiveIntervalMs: 10_000,
    passiveReward: 0,
    taskReward: 10,
    cacheReward: 3,
    quantumMercuryReward: 100,
    quantumLeadReward: 100,
    goldInstantReward: 100,
    mysteryJackpot: 6,
    donationCost: 1,
    hackerDuplicateBonus: 2
  });

  const categories = Object.freeze([
    Object.freeze({ id: "generate-supply", label: "生成・物資", defaultCooldownPerCredit: COOLDOWN_MS_PER_CREDIT }),
    Object.freeze({ id: "instant-item", label: "即席アイテム", defaultCooldownPerCredit: COOLDOWN_MS_PER_CREDIT }),
    Object.freeze({ id: "weapon", label: "武器", defaultCooldownPerCredit: COOLDOWN_MS_PER_CREDIT }),
    Object.freeze({ id: "generate-tech", label: "生成・技術", defaultCooldownPerCredit: COOLDOWN_MS_PER_CREDIT })
  ]);

  // Shop ability entitlements are deliberately separate from physical and
  // instant-item products. Buying one unlocks that exact ability for the
  // current match; it never executes during the credit transaction and never
  // changes the player's selected operator identity.
  const abilityGenres = Object.freeze([
    Object.freeze({ id: "operator-fighter", label: "ファイター", operator: "fighter" }),
    Object.freeze({ id: "operator-gravity", label: "グラビティ", operator: "gravity" }),
    Object.freeze({ id: "operator-flora", label: "フローラ", operator: "flora" }),
    Object.freeze({ id: "operator-gunner", label: "ガンナー", operator: "gunner" }),
    Object.freeze({ id: "operator-quantum", label: "クオンタム", operator: "quantum" }),
    Object.freeze({ id: "operator-assassin", label: "アサシン", operator: "assassin" }),
    Object.freeze({ id: "operator-hacker", label: "ハッカー", operator: "hacker" })
  ]);

  const abilityRows = [
    ["fighter-limit-break", "リミットブレイク", 18, "operator-fighter", "fighter", "limit-break", "passive", "advanceLimitBreak"],
    ["gravity-target", "対象転移", 8, "operator-gravity", "gravity", "target", "active-target-map", "/api/teleport"],
    ["gravity-heart", "心臓転移", 22, "operator-gravity", "gravity", "heart", "active", "/api/teleport"],
    ["gravity-accelerate", "アクセラレート", 8, "operator-gravity", "gravity", "accelerate", "active", "/api/gravity-time"],
    ["gravity-decelerate", "ディーセラレート", 8, "operator-gravity", "gravity", "decelerate", "active", "/api/gravity-time"],
    ["gravity-time-keeper", "時の番人", 14, "operator-gravity", "gravity", "time-keeper", "active", "/api/gravity-time-keeper"],
    ["gravity-storm", "グラビティストーム", 20, "operator-gravity", "gravity", "storm", "active", "/api/gravity-storm"],
    ["flora-heal", "ヒール", 7, "operator-flora", "flora", "heal", "active", "/api/flora-heal"],
    ["flora-sunbeam", "サンビーム", 20, "operator-flora", "flora", "sunbeam", "active", "/api/flora-heal"],
    ["flora-invisible", "インビジブル", 16, "operator-flora", "flora", "invisible", "active", "/api/flora-heal"],
    ["gunner-aim", "エイム", 12, "operator-gunner", "gunner", "aim", "passive", "advanceGunnerAimPassive"],
    ["gunner-special-ammo", "特殊弾装填", 14, "operator-gunner", "gunner", "special-ammo", "passive", "advanceGunnerSpecialAmmo"],
    ["quantum-kinetic-accelerate", "運動エネルギー制御・加速", 8, "operator-quantum", "quantum", "kinetic-accelerate", "active", "/api/quantum-control"],
    ["quantum-kinetic-decelerate", "運動エネルギー制御・減速", 8, "operator-quantum", "quantum", "kinetic-decelerate", "active", "/api/quantum-control"],
    ["quantum-electric", "エレクトリック", 12, "operator-quantum", "quantum", "electric-discharge", "active", "/api/quantum-control"],
    ["quantum-transmutation", "核変換", 12, "operator-quantum", "quantum", "nuclear-transmutation", "active", "/api/quantum-control"],
    ["quantum-fission", "核分裂", 24, "operator-quantum", "quantum", "nuclear-fission", "active", "/api/quantum-control"],
    ["quantum-fusion", "核融合", 24, "operator-quantum", "quantum", "nuclear-fusion", "active", "/api/quantum-control"],
    ["assassin-substitution", "変わり身の術", 8, "operator-assassin", "assassin", "substitution", "active", "/api/assassin-substitution"],
    ["assassin-annihilation", "アサシン忍殺", 20, "operator-assassin", "assassin", "annihilation", "passive", "resolveAttack"],
    ["assassin-silent-steps", "常時無音", 12, "operator-assassin", "assassin", "silent-steps", "passive", "emitMovementNoise"],
    ["hacker-vibe-coding", "バイブコーディング", 22, "operator-hacker", "hacker", "vibe-coding", "panel", "/api/alchemy"],
    ["hacker-root", "ROOT", 25, "operator-hacker", "hacker", "root", "active", "/api/hacker-root"]
  ];

  const abilityProducts = Object.freeze(abilityRows.map(([id, label, price, genreId, operator, mode, behavior, actionOwner]) =>
    Object.freeze({ id, label, price, genreId, operator, mode, behavior, actionOwner })
  ));
  const abilityProductById = new Map(abilityProducts.map((entry) => [entry.id, entry]));

  // One credit is the price of the least expensive product. Every other price
  // is a relative gameplay-value unit. Hacker CT uses the same five seconds per
  // credit for every shared product, so price changes cannot drift from CT.
  const rows = [
    ["mineral-water", "ミネラルウォーター", 1, "generate-supply", "mineral-water", "mineral-water"],
    ["seawater", "海水", 2, "generate-supply", "seawater", "seawater"],
    ["antidote", "解毒剤", 2, "generate-supply", "antidote", "antidote"],
    ["molotov", "火炎瓶", 4, "generate-supply", "molotov", "molotov"],
    ["frag-grenade", "フラググレネード", 6, "generate-supply", "frag-grenade", "frag-grenade"],
    ["stun-grenade", "スタングレネード", 5, "generate-supply", "stun-grenade", "stun-grenade"],
    ["evade", "回避拡張", 4, "instant-item", "vending-evade", "instant-evade"],
    ["speed", "アクセラレート飲料", 5, "instant-item", "vending-speed", "instant-speed"],
    ["warp", "テレポートマップスクロール", 3, "instant-item", "warp", "warp"],
    ["mystery", "ミステリー", 4, "instant-item", "vending-mystery", "instant-mystery"],
    ["fire", "ファイア", 8, "instant-item", "fire", "fire"],
    ["protect", "プロテクト", 8, "instant-item", "protect", "protect"],
    ["heal", "回復", 4, "instant-item", "heal", "heal"],
    ["mana", "マナポーション", 3, "instant-item", "vending-mana", "mana"],
    ["stamina", "スタミナ", 6, "instant-item", "stamina", "stamina"],
    ["railgun", "レールガン", 13, "weapon", "vending-railgun", "railgun"],
    ["particle-cannon", "荷電粒子砲", 16, "weapon", "vending-particle-cannon", "particle-cannon"],
    ["excalibur", "エクスカリバー", 19, "weapon", "vending-excalibur", "excalibur"],
    ["exile", "亡命", 22, "instant-item", "vending-exile", "exile"],
    ["hack", "ハック", 10, "instant-item", "vending-hack", "hack"],
    ["handgun", "ハンドガン", 3, "weapon", "vending-handgun", "handgun"],
    ["smg", "サブマシンガン", 5, "weapon", "vending-smg", "smg"],
    ["assault", "アサルトライフル", 7, "weapon", "vending-assault", "assault"],
    ["sniper", "スナイパーライフル", 10, "weapon", "vending-sniper", "sniper"],
    ["taser", "テーザー銃", 5, "weapon", "vending-taser", "taser"],
    ["mercury", "水銀瓶", 3, "generate-supply", "mercury", "quantum-mercury"],
    ["lead", "鉛瓶", 1, "generate-supply", "lead", "quantum-lead"],
    ["uranium", "ウラン容器", 12, "generate-supply", "uranium", "quantum-uranium"],
    ["plutonium", "プルトニウム容器", 15, "generate-supply", "plutonium", "quantum-plutonium"],
    ["orichalcum-sword", "オリハルコン・ソード", 17, "weapon", "orichalcum-sword", "orichalcum-sword"],
    ["iai", "居合", 9, "instant-item", "iai", "iai"],
    ["ice", "氷結水", 2, "generate-supply", "vending-ice", "ice", "root-only"],
    ["heated-water", "高温水", 2, "generate-supply", "vending-heated-water", "heated-water", "root-only"],
    ["gold", "金", 4, "instant-item", "gold", "gold", "root-only"],
    ["rpg", "RPG", 14, "weapon", "vending-rpg", "rpg"],
    ["missile", "ミサイル", 17, "weapon", "vending-missile", "missile"]
  ];

  const products = Object.freeze(rows.map(([id, label, price, category, hackerRecipeId, asset, availability = "shared"]) =>
    Object.freeze({
      id,
      label,
      price,
      category,
      hackerRecipeId,
      cooldownPerCredit: COOLDOWN_MS_PER_CREDIT,
      asset,
      availability,
      vendingAvailable: availability === "shared",
      hackerAccess: availability === "root-only" ? "root" : "ordinary"
    })
  ));
  const categoryById = new Map(categories.map((entry) => [entry.id, entry]));
  const productById = new Map(products.map((entry) => [entry.id, entry]));
  const productByRecipeId = new Map(products.map((entry) => [entry.hackerRecipeId, entry]));
  const productCosts = Object.freeze(Object.fromEntries(products.filter((entry) => entry.vendingAvailable).map((entry) => [entry.id, entry.price])));
  const productLabels = Object.freeze(Object.fromEntries(products.map((entry) => [entry.id, entry.label])));
  const vendingProducts = Object.freeze(products.filter((entry) => entry.vendingAvailable));
  const ordinaryHackerProducts = Object.freeze(products.filter((entry) => entry.hackerAccess === "ordinary"));

  const product = (itemId) => productById.get(String(itemId || "")) || null;
  const productForRecipe = (recipeId) => productByRecipeId.get(String(recipeId || "")) || null;
  const abilityProduct = (abilityId) => abilityProductById.get(String(abilityId || "")) || null;
  const categoryForProduct = (itemId) => product(itemId)?.category || "generate-supply";
  const cooldownForRecipe = (recipeId) => {
    const entry = productForRecipe(recipeId);
    if (!entry) return 0;
    const fallback = Number(categoryById.get(entry.category)?.defaultCooldownPerCredit) || COOLDOWN_MS_PER_CREDIT;
    return Math.max(1_000, Math.round(entry.price * (Number(entry.cooldownPerCredit) || fallback)));
  };

  return Object.freeze({
    version: "fire-e-causal-v918",
    onlineProtocolVersion: "dva-online-protocol-v1",
    cooldownMsPerCredit: COOLDOWN_MS_PER_CREDIT,
    creditIncome,
    categories,
    abilityGenres,
    abilityProducts,
    products,
    vendingProducts,
    ordinaryHackerProducts,
    productCosts,
    productLabels,
    product,
    productForRecipe,
    abilityProduct,
    categoryForProduct,
    cooldownForRecipe
  });
});
const DVA_ECONOMY = globalThis.DVAEconomyCatalog;
const CREDIT_ECONOMY = DVA_ECONOMY.creditIncome;
const SHOP_ABILITY_PRODUCTS = DVA_ECONOMY.abilityProducts;
const PRODUCT_RELEASE = "webgpu-body-benefits-v910";
const ONLINE_CLIENT_RELEASE = String(DVA_ECONOMY.onlineProtocolVersion || "");
if (!ONLINE_CLIENT_RELEASE) throw new Error("Shared online protocol version is required.");
const ONLINE_CLIENT_RELEASE_HEADER = "x-dva-client-release";
const ONLINE_RELEASE_ENFORCED = process.env.DVA_ENFORCE_ONLINE_RELEASE === "true";

function vendingProductOrThrow(itemId) {
  const product = DVA_ECONOMY.product(itemId);
  if (!product) throw new Error(`Unknown shared economy product: ${itemId}`);
  return product;
}

function vendingPrice(itemId) {
  return vendingProductOrThrow(itemId).price;
}

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
function renderCapacityStatus() {
  return {
    available: true,
    renderCapacity: "available",
    source: "reachable-matchmaking-service",
    requiredClientRelease: ONLINE_CLIENT_RELEASE
  };
}

function isLocalApiRequest(req) {
  const host = String(req?.headers?.host || "").split(":")[0].toLowerCase();
  return ["localhost", "127.0.0.1", "::1"].includes(host);
}

function requireCompatibleOnlineClient(req, suppliedRelease = "") {
  if (!ONLINE_RELEASE_ENFORCED || isLocalApiRequest(req)) return true;
  const clientRelease = String(suppliedRelease || req?.headers?.[ONLINE_CLIENT_RELEASE_HEADER] || "");
  if (clientRelease === ONLINE_CLIENT_RELEASE) return true;
  const error = new ApiError(426, "オンライン対戦を更新しています。ページを再読み込みしてください。");
  error.requiredClientRelease = ONLINE_CLIENT_RELEASE;
  error.clientRelease = clientRelease || null;
  throw error;
}

const MIN_KILL_COOLDOWN = 5;
const KILL_CHAIN_REDUCTION_PER_KILL = 0.10;
const KILL_CHAIN_MIN_MULTIPLIER = 0.25;
const QUICK_ATTACK_DELAY_MS = 1000;
const QUICK_FOLLOW_UP_COOLDOWN_MS = 1000;
const QUICK_ATTACK_LETHAL_CHANCE = 0.45;
const NINJUTSU_DURATION_MS = 4000;
const AIM_HOLD_MS = 5000;
const AIM_TARGET_MOVE_TOLERANCE = 1;
const ACCELERATE_SPEED_MULTIPLIER = 2.5;
const LUMINOUS_SPEED_MULTIPLIER = ACCELERATE_SPEED_MULTIPLIER * 0.66;
const DODGE_DURATION_MS = 1000;
const TELEPORT_COOLDOWN_MS = 25_000;
const SMARTPHONE_ACTION_MS = 4_000;
const AUTO_REPORT_POST_KILL_GRACE_MS = 4_000;
const PAIR_ROUTE_RADIUS = 82;
const PAIR_ROUTE_GRACE_MS = 5_000;
const PAIR_ROUTE_DAMAGE_INTERVAL_MS = 3_000;
// Tasks remain an interaction and progression gate, but no longer consume SP.
const TASK_STAMINA_REQUIREMENT = 0;
const AUTO_TASK_INTERVAL_MS = 2_500;
const AUTO_TASK_PRESENCE_MS = 1800;
const HACKER_AUTO_TASK_INTERVAL_MS = 60_000;
const PREPARATION_PHASE_MS = 10_000;
const GUNNER_RELOAD_MS = 2_200;
const GUNNER_IDLE_AUTO_RELOAD_DELAY_MS = 2_600;
const GUNNER_SPECIAL_AMMO_INTERVAL_MS = 18_000;
const GUNNER_SPECIAL_AMMO_TYPES = Object.freeze(["weak", "penetrate", "shock"]);
const GUNNER_SPECIAL_AMMO_LABELS = Object.freeze({
  weak: "ウィーク",
  penetrate: "ペネトレイト",
  shock: "ショック"
});
const GUNNER_SHOCK_SLOW_MS = 6_000;
const GUNNER_SHOCK_LOW_LUCK_THRESHOLD = 0;
// Luck remains the sole modifier.  Keep both ordinary firing modes deliberately
// body-hit biased: Aim improves placement, but never makes a headshot routine.
const GUNNER_HIP_HEADSHOT_BASE_CHANCE = 0.05;
const GUNNER_AIM_HEADSHOT_BASE_CHANCE = 0.20;
const GUNNER_HEADSHOT_LUCK_INFLUENCE = 0.16;
const DEFAULT_GUNNER_WEAPON = "assault";
const GUNNER_WEAPON_ORDER = ["handgun", "smg", "assault", "sniper", "taser"];
const GUNNER_WEAPONS = Object.freeze({
  handgun: Object.freeze({
    id: "handgun", name: "ハンドガン", shortName: "HG", maxAmmo: 12, ammoPerShot: 1,
    range: 520, lineWidth: 58, damage: 0.48, minDamageRatio: 0.65, cooldownMs: 380,
    manaCost: 0, lethalChance: 0, soundDistance: 1500, volume: 0.72
  }),
  smg: Object.freeze({
    id: "smg", name: "サブマシンガン", shortName: "SMG", maxAmmo: 30, ammoPerShot: 1,
    range: 460, lineWidth: 78, damage: 0.42, minDamageRatio: 0.28, cooldownMs: 100,
    manaCost: 0, lethalChance: 0, soundDistance: 2200, volume: 1
  }),
  assault: Object.freeze({
    id: "assault", name: "アサルトライフル", shortName: "AR", maxAmmo: 18, ammoPerShot: 1,
    range: 760, lineWidth: 46, damage: 0.58, minDamageRatio: 0.80, cooldownMs: 240,
    manaCost: 0, lethalChance: 0, soundDistance: 2400, volume: 0.95
  }),
  sniper: Object.freeze({
    id: "sniper", name: "スナイパーライフル", shortName: "SR", maxAmmo: 5, ammoPerShot: 1,
    range: 1200, lineWidth: 22, damage: 1.35, minDamageRatio: 1, cooldownMs: 1100,
    manaCost: 0, scopeMs: 0, lethalChance: 0, soundDistance: 3200, volume: 1.15
  }),
  taser: Object.freeze({
    id: "taser", name: "テーザー銃", shortName: "TSR", maxAmmo: 8, ammoPerShot: 1,
    range: 420, lineWidth: 62, damage: 0.16, minDamageRatio: 0.72, cooldownMs: 720,
    manaCost: 0, lethalChance: 0, slowMs: 6000,
    movementScale: 0.65, soundDistance: 1200, volume: 0.55
  })
});
const FLORA_COOLDOWN_MS = 30_000;
const FLORA_SELF_EFFECT_RADIUS = 110;
const FLORA_SPEED_MULTIPLIER = ACCELERATE_SPEED_MULTIPLIER * 0.72;
const FLORA_SPEED_DURATION_MS = 12_000;
const MAX_STAMINA = 100;
const MAX_STORED_STAMINA = 500;
const DODGE_STAMINA_COST = 60;
const SLEEP_REGEN_MULTIPLIER = 4;
const DEFAULT_MOVEMENT_SPEED_MULTIPLIER = 0.48;
const FIXED_MOVEMENT_ACC = 2;
const NORMAL_MOVEMENT_ACC = 1;
const MOVEMENT_ACC_ACTIVATION_THRESHOLD = 2;
const DASH_MULTIPLIER = 1.75;
const DASH_DRAIN_PER_SECOND = 28;
const WALK_DRAIN_PER_SECOND = 8;
const SLOW_WALK_DRAIN_PER_SECOND = 1.2;
// All gradual natural recovery is intentionally one tenth of its former base rate.
const NATURAL_REGEN_RATE_MULTIPLIER = 0.1;
const STAMINA_REGEN_PER_SECOND = 19 * NATURAL_REGEN_RATE_MULTIPLIER;
const LEVITATION_MANA_DRAIN_PER_SECOND = 0.04;
// Natural Recovery restores 0.127 MP/s toward the protected two-MP reserve.
// Clairvoyance must still have a meaningful net cost while leaving Renki and
// field recovery as viable fuel.
const CLAIRVOYANCE_MANA_DRAIN_PER_SECOND = 0.25;
const TASK_CREDIT_REWARD = CREDIT_ECONOMY.taskReward;
const SLOW_WALK_MULTIPLIER = 0.52;
const EMP_RANGE = 260;
const EMP_COOLDOWN_MS = 18_000;
const EMP_SLOW_DURATION_MS = 5_000;
const EMP_SLOW_MULTIPLIER = 0.55;
const TASER_MOVEMENT_MULTIPLIER = 0.65;
const EMP_INITIAL_LOCK_MS = 15_000;
const HACKER_EMP_OPENING_PROTECTION_MS = 30_000;
const HOVER_SPRINT_BASE_DURATION_MS = 8_000;
const HOVER_SPRINT_BASE_ACC_MULTIPLIER = 1.8;
const HOVER_SPRINT_BASE_MANA_COST = 1;
const HOVER_SPRINT_ACTIVATION_COOLDOWN_MS = 20_000;
const HACKER_INVENTION_LABELS = Object.freeze({
  railgun: "レールガン",
  "particle-cannon": "荷電粒子砲",
  excalibur: "エクスカリバー"
});
const HEAVY_WEAPON_DEFINITIONS = Object.freeze({
  rpg: Object.freeze({ id: "rpg", label: vendingProductOrThrow("rpg").label, cost: vendingPrice("rpg"), asset: "rpg" }),
  missile: Object.freeze({ id: "missile", label: vendingProductOrThrow("missile").label, cost: vendingPrice("missile"), asset: "missile" })
});
const HACKER_ROOT_OPERATOR_TYPES = Object.freeze(["fighter", "gravity", "flora", "gunner", "quantum"]);
const HACKER_ROOT_HEALTH = 0.0001;
const HACKER_ACTION_STAMINA_COST = 10;
const FIGHTER_SLASH_STAMINA_COST = 75;
const FIGHTER_SLASH_GUARD_DURATION_MS = 700;
const FIGHTER_SLASH_PERFECT_GUARD_MS = 140;
const FIGHTER_SLASH_PERFECT_REARM_MS = 1_100;
const FIGHTER_ENERGY_CHARGE_MANA_COST = 1;
const FIGHTER_IAI_REWARD_THRESHOLD = 500;
const FIGHTER_INFINITE_RESOURCE_THRESHOLD = 100;
const FIGHTER_APEX_PERK_THRESHOLD = 1000;
const FIGHTER_ENERGY_PASSIVE_INTERVAL_MS = 12_000;
const IAI_VENDING_COST = vendingPrice("iai");
const ORICHALCUM_SWORD_VENDING_COST = vendingPrice("orichalcum-sword");
const FIGHTER_SHOCKWAVE_RANGE = 950;
const FIGHTER_SHOCKWAVE_WIDTH = 70;
const FIGHTER_SHOCKWAVE_ORIGIN_OFFSET = 20;
const FIGHTER_THROW_SHOCKWAVE_RADIUS = 180;
const FIGHTER_GIANT_SHOCKWAVE_EC_COST = 100;
const FIGHTER_GIANT_SHOCKWAVE_RANGE = 1_900;
const FIGHTER_GIANT_SHOCKWAVE_WIDTH = 240;
const FIGHTER_GIANT_SHOCKWAVE_DURATION_MS = 1_150;
const HACKER_MANA_GPU_DRAIN_PER_SECOND = 0.025;
const HACKER_MANA_GPU_COOLDOWN_REDUCTION_MS_PER_MANA = 20_000;
const EXILE_COST = vendingPrice("exile");
const EMP_PULSE_ATE_DURATION_MS = 1_200;
const EMP_INTERACTION_WINDOW_MS = EMP_PULSE_ATE_DURATION_MS;
const EMP_INTERACTION_RANGE = EMP_RANGE * 2;
const EMP_RESONANCE_LETHAL_RANGE = 110;
const EMP_RESONANCE_BODY_RANGE = EMP_RANGE;
const EMP_ITEM_LOCK_MS = 7_000;
const MAP_OBJECT_RANGE = 150;
const MYSTERY_BOX_USE_RANGE = 82;
const MYSTERY_BOX_CLEARANCE = 118;
const MYSTERY_BOX_MAX_COUNT = 3;
const MAP_OBJECT_SPEED_MULTIPLIER = 1.35;
const LIMIT_BREAK_SPEED_MULTIPLIER = 3;
const FIRE_JUTSU_COST = vendingPrice("fire");
const FIRE_JUTSU_RADIUS = 240;
const ENHANCE_HOLD_STEP_MS = 600;
// Enhance has one authoritative performance profile.  The legacy level field
// remains serialized as 0/1 for protocol compatibility, but no held route can
// create a player-facing stage above the original level-one effect.
const ENHANCE_MAX_LEVEL = 1;
const ENHANCE_FIXED_MANA_COST = 1;
// This threshold is deliberately independent of the compatibility level
// constant: changing serialization must never move the GBO boundary.
const GBO_HOLD_MS = 3_000;
const GBO_FIXED_MANA_COST = 2;
const GBO_PERFORMANCE_MULTIPLIER = 10;
const FIGHTER_ENHANCE_SLASH_RANGE_PER_LEVEL = 40;
const FIGHTER_ENHANCE_SLASH_GUARD_MS_PER_LEVEL = 90;
const GUNNER_ENHANCE_DAMAGE_PER_LEVEL = 0.20;
const ITEM_THROW_BASE_DISTANCE = 220;
const ITEM_THROW_SPEED = 1120;
const ITEM_THROW_MIN_FLIGHT_MS = 240;
const ITEM_THROW_MAX_FLIGHT_MS = 920;
const BOTTLE_ITEM_IDS = new Set(["mercury", "lead", "mineral-water", "seawater", "antidote", "molotov", "ice", "heated-water"]);
// Sealed radioactive containers are physical while carried, but their seal
// opens on any ordinary throw.  Like authored bottles they resolve their
// hazard at the first impact/landing and must never become ground pickups.
const DISPOSABLE_THROW_CONTAINER_ITEM_IDS = new Set([...BOTTLE_ITEM_IDS, "uranium", "plutonium", "frag-grenade", "stun-grenade"]);
const BOTTLE_SHARD_BASE_RADIUS = 112;
const BOTTLE_SHARD_HIT_CHANCE = 0.32;
const BOTTLE_SHARD_MIN_DAMAGE = 0.18;
const BOTTLE_SHARD_MAX_DAMAGE = 0.42;
const RIGID_THROW_COLLISION_RADIUS = 42;
const RIGID_THROW_BLADE_SEVERITY = 0.82;
const GROUND_ITEM_PICKUP_RANGE = 92;
const HAZARD_FIELD_DURATION_MS = 12_000;
const HAZARD_TICK_MS = 1_000;
const POISON_DAMAGE_PER_TICK = 0.2;
const BURN_DAMAGE_PER_TICK = 0.25;
const NATURAL_RECOVERY_HP_PER_SECOND = 0.05 * NATURAL_REGEN_RATE_MULTIPLIER;
const TOXIC_THROW_ITEM_IDS = new Set(["mercury", "lead", "uranium", "plutonium"]);
const GOLD_INSTANT_CREDITS = CREDIT_ECONOMY.goldInstantReward;
// Credit ATE multiplicity is a presentation unit, not the raw balance delta.
// One canonical task reward is one visible unit; Gold is exactly five current
// task-reward units while its authoritative 100C payout remains unchanged.
const QUANTUM_ACTION_STAMINA_COST = 16;
// A committed firearm magazine is one action, not one cost per projectile.
// It is an authored v528 balance value, deliberately outside the doubled
// legacy action-cost inventory.
const GUNNER_BURST_STAMINA_COST = 25;
const QUANTUM_NUCLEAR_MANA_COST = 2;
const QUANTUM_ELECTRIC_MANA_COST = 1;
const QUANTUM_ELECTRIC_DAMAGE = 0.35;
const QUANTUM_ELECTRIC_SLOW_MS = 3_000;
const QUANTUM_ELECTRIC_SLOW_MULTIPLIER = 0.65;
const QUANTUM_ENDGAME_DELAY_MS = 300_000;
const MINERAL_WATER_STAMINA = 100;
const MOLOTOV_COST = vendingPrice("molotov");
const MINERAL_WATER_COST = vendingPrice("mineral-water");
const ANTIDOTE_COST = vendingPrice("antidote");
const SUBSTITUTION_COST = 0;
const MYSTERY_COST = vendingPrice("mystery");
const MYSTERY_ABILITY_LOCK_MS = 15_000;
const MYSTERY_UNCONSCIOUS_MS = 8_000;
const DESIRE_RESOURCE_DEBT = -100;
const DESIRE_STATIONARY_RECOVERY_MS = 5_000;
const DESIRE_RENKI_RECOVERY_MS = 3_000;
const DEFAULT_MAX_MANA = 2;
const REST_COMPLETION_MANA_FLOOR = 2;
const ABILITY_HOLD_MANA_RESERVE = 2;
const STARTING_MANA = DEFAULT_MAX_MANA;
const NATURAL_RECOVERY_MANA_PER_SECOND = 0.127 * NATURAL_REGEN_RATE_MULTIPLIER;
const DONATION_CREDIT_COST = CREDIT_ECONOMY.donationCost;
const DONATION_LUCK_GAIN = 0.05;
const DONATION_LUCK_MIN_BONUS = -0.7;
const DONATION_LUCK_MAX_BONUS = 0.7;
const ABILITY_MANA_COST = 1;
const DESIRE_BIAS_COST_MULTIPLIER = 1.5;
const DESIRE_BIAS_TIME_MULTIPLIER = 0.72;
const DESIRE_BIAS_LUCK_PENALTY = 0.45;
const DESIRE_BIAS_GROUP_RADIUS = 260;
const DESIRE_BIAS_GROUP_MULTIPLIER = 0.6;
const DESIRE_BIASES = Object.freeze([
  Object.freeze({ id: "cognitive-dissonance", label: "認知的不協和", detail: "移動・行動不能時間・クールタイム進行が72%になる" }),
  Object.freeze({ id: "confirmation-bias", label: "確証バイアス", detail: "幸運・直観が0.45低下する" }),
  Object.freeze({ id: "sunk-cost", label: "サンクコスト効果", detail: "マナとスタミナの消費量が1.5倍になる" }),
  Object.freeze({ id: "in-group-bias", label: "内集団バイアス", detail: "他者が近い間、移動速度とスタミナ回復が60%になる" })
]);
// Renki is a single authoritative recovery transaction.  A tap represents ten
// former one-MP repetitions; the qualified long hold represents ten such taps.
// These values are fixed server-side; the client never declares a reward,
// duration, or repeat count.
const RENKI_TAP_MANA_GAIN = 10;
const RENKI_TAP_FOCUS_DURATION_MS = 35_000;
const RENKI_HOLD_TAP_EQUIVALENT = 10;
const RENKI_HOLD_MANA_GAIN = RENKI_TAP_MANA_GAIN * RENKI_HOLD_TAP_EQUIVALENT;
const RENKI_HOLD_FOCUS_DURATION_MS = RENKI_TAP_FOCUS_DURATION_MS * RENKI_HOLD_TAP_EQUIVALENT;
// Ability long-holds are a separate server-observed transaction.  The client
// may render the hold locally, but it never gets to declare its duration,
// mana spend, or repeat count.
const ABILITY_BATCH_HOLD_MIN_MS = 420;
const RATIONAL_FREE_ABILITY_INTERVAL_MS = 30_000;
const DODGE_MANA_COST = 0;
const TELEPORT_MANA_COST = 1;
const HEART_TELEPORT_MANA_COST = 10;
const EMP_MANA_COST = 0;
const GUNNER_MANA_COST = 0;
const FLORA_MANA_COST = ABILITY_MANA_COST;
// Keep the offensive and concealment Flora modes independent from the
// inexpensive restorative mode.  These values are never supplied by a client.
const FLORA_SUNBEAM_MANA_COST = 10;
const FLORA_INVISIBLE_MANA_COST = 10;
const FLORA_INVISIBLE_DURATION_MS = 10_000;
const ALCHEMY_MANA_COST = ABILITY_MANA_COST;
const STAND_FIRM_BARRIER_DURATION_MS = 1_500;
const HEAL_COST = vendingPrice("heal");
const PUSH_BACKLASH_DAMAGE_PER_CHARGE = 0.5;
const MANA_POTION_COST = vendingPrice("mana");
// Six minutes without donations. Passive income fully donated shortens this to
// about 5:30; six task rewards donated as well shorten it to about 5:00.
const IDEA_FIRST_ASPECT_MS = 50_000;
const IDEA_SECOND_ASPECT_MS = 120_000;
const IDEA_GOOD_MS = 220_000;
const IDEA_ASCENSION_MS = 360_000;
const IDEA_ASCENSION_ANIMATION_MS = 5_000;
const IDEA_LUCK_BASELINE = 0.3;
const IDEA_LUCK_MAX_TIME_REDUCTION_MS = 1_000;
const GOOD_SPEED_MULTIPLIER = ACCELERATE_SPEED_MULTIPLIER * 0.56;
const FLORA_AROMA_REGEN_MULTIPLIER = 1.75;
const SUNBEAM_RANGE = 950;
const SUNBEAM_WIDTH = 52;
const SUNBEAM_KILL_CHANCE = 0.48;
const GRAVITY_STORM_VISUAL_RADIUS = 520;
const GRAVITY_STORM_MANA_COST = 10;
const GRAVITY_STORM_DURATION_MS = 12_000;
const GRAVITY_STORM_PULSE_MS = 600;
const GRAVITY_STORM_BARRIER_RELEASE_MS = 1_000;
const GRAVITY_STORM_BARRIER_RADIUS = 140;
const GRAVITY_STORM_DAMAGE_MIN = 0.035;
const GRAVITY_STORM_DAMAGE_MAX = 0.095;
const GRAVITY_STORM_FINAL_DAMAGE_MIN = 0.55;
const GRAVITY_STORM_FINAL_DAMAGE_MAX = 1.15;
const GRAVITY_STORM_SLOW_MULTIPLIER_MIN = 0.35;
const GRAVITY_STORM_SLOW_MULTIPLIER_MAX = 0.82;
const GRAVITY_STORM_SLOW_LINGER_MS = 900;
const GRAVITY_STORM_PULL_MIN = 80;
const GRAVITY_STORM_PULL_MAX = 260;
const GRAVITY_STORM_PIN_MIN_MS = 420;
const GRAVITY_STORM_PIN_MAX_MS = 1_800;
const GRAVITY_TIME_DURATION_MS = 8_000;
const GRAVITY_TIME_SCALE_FAST = ACCELERATE_SPEED_MULTIPLIER;
const GRAVITY_TIME_SCALE_SLOW = 0.38;
const GRAVITY_TIME_KEEPER_DURATION_MS = 5_000;
// Time Keeper is an exceptional, single-cast world control.  Keep the price
// server-owned so neither the native nor ROOT client route can substitute the
// displayed 1000 MP cost with a request payload.
const GRAVITY_TIME_KEEPER_MANA_COST = 1_000;
const BOT_HEARING_MEMORY_MS = 5000;
const BOT_VISIBLE_ATTACK_MEMORY_MS = 7000;
const BOT_ATTACK_BODY_CHAIN_DISTANCE = 440;
const BOT_STAND_FIRM_RETALIATION_MS = 30_000;
const BOT_KILL_WITNESS_RANGE = 340;
const BOT_ATTACKER_ISOLATION_RANGE = 430;
const BOT_BODY_NOTICE_RANGE = 760;
const BOT_VISIBLE_THROW_MEMORY_MS = 30_000;
const BOT_VISIBLE_POISON_ASSOCIATION_PADDING = 56;
const BOT_KILL_DECISION_TRACE_TTL_MS = 45_000;
const BOT_CLAIRVOYANCE_DURATION_MS = 4000;
const BOT_CLAIRVOYANCE_MEMORY_MS = 8000;
const BOT_CLAIRVOYANCE_INTERVAL_MIN_MS = 18_000;
const BOT_CLAIRVOYANCE_INTERVAL_JITTER_MS = 10_000;
const BOT_ATTACKER_CLAIRVOYANCE_INTERVAL_MIN_MS = 6_500;
const BOT_ATTACKER_CLAIRVOYANCE_INTERVAL_JITTER_MS = 3_500;
const BOT_ATTACKER_FAKE_TASK_TRAVEL_MS = 7_000;
const BOT_ATTACKER_FAKE_TASK_PRESENCE_MS = 1_350;
const BOT_ATTACKER_DECOY_PURSUIT_MS = 2_800;
const BOT_ATTACKER_COMMIT_MS = 6_200;
const MODERATION_DIR = path.join(__dirname, "data");
const MODERATION_FILE = path.join(MODERATION_DIR, "moderation.json");
const PLAYER_PROFILE_FILE = path.join(MODERATION_DIR, "player-profiles.json");
const CHECKPOINT_FILE = path.join(MODERATION_DIR, "checkpoints.json");
const CHECKPOINT_SESSIONS_FILE = path.join(MODERATION_DIR, "checkpoint-sessions.json");
const CHECKPOINT_ARCHIVE_FILE = path.join(MODERATION_DIR, "checkpoint-history.json");
const CHECKPOINT_ACTIVE_TIMEOUT_MS = 45_000;
const ANALYTICS_REMOTE_URL = String(
  process.env.ANALYTICS_REMOTE_URL ||
  "https://raw.githubusercontent.com/player13579/-/analytics-data/data/checkpoint-history.json"
).trim();
const ANALYTICS_REMOTE_TOKEN = String(process.env.ANALYTICS_REMOTE_TOKEN || "").trim();
const ANALYTICS_REMOTE_WRITE_URL = String(process.env.ANALYTICS_REMOTE_WRITE_URL || (() => {
  const match = ANALYTICS_REMOTE_URL.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
  return match ? `https://api.github.com/repos/${match[1]}/${match[2]}/contents/${match[4]}?ref=${encodeURIComponent(match[3])}` : "";
})()).trim();
const PROFILE_REMOTE_URL = String(
  process.env.PROFILE_REMOTE_URL ||
  "https://raw.githubusercontent.com/player13579/player13579.github.io/Codex-honoo/runtime-data/player-profiles.json"
).trim();
const PROFILE_REMOTE_WRITE_URL = String(process.env.PROFILE_REMOTE_WRITE_URL || (() => {
  const match = PROFILE_REMOTE_URL.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
  return match ? `https://api.github.com/repos/${match[1]}/${match[2]}/contents/${match[4]}?ref=${encodeURIComponent(match[3])}` : "";
})()).trim();
const RESERVED_DEVELOPER_NAME = "プレイヤー";
const DEVELOPER_CANONICAL_PROFILE_ID = "dfc48197c51d6b2a02fc8a7c";
const DEFAULT_DEVELOPER_PROFILE_IDS = [
  DEVELOPER_CANONICAL_PROFILE_ID,
  crypto.createHash("sha256").update("ip-profile:127.0.0.1").digest("hex").slice(0, 24),
  crypto.createHash("sha256").update("ip-profile:::1").digest("hex").slice(0, 24)
];
const DEVELOPER_PROFILE_IDS = new Set([
  ...DEFAULT_DEVELOPER_PROFILE_IDS,
  ...String(process.env.DEVELOPER_PROFILE_IDS || "").split(",").map((value) => value.trim()).filter(Boolean)
]);
const BOT_TICK_MS = 80;
// Generated-offline solo matches deliberately remain authoritative after the
// sole human is eliminated. In that terminal spectator interval, Bots use a
// separate operational clock; the world clock and human-owned timers do not.
const SOLO_HUMAN_DEATH_BOT_TIME_SCALE = 10;
// The ordinary one-owner pass remains mandatory for every room. Acceleration
// may add these slots across *all* rooms, never one unbounded burst per room.
const BOT_ACCELERATED_PLANNER_EXTRA_SLOTS_PER_TICK = SOLO_HUMAN_DEATH_BOT_TIME_SCALE - 1;
let botAcceleratedPlannerRoomCursor = 0;
const NAV_CELL_SIZE = 48;
const BOT_PATH_REFRESH_MS = 420;
const REALTIME_STATE_INTERVAL_MS = 100;
const PLICY_REALTIME_STATE_INTERVAL_MS = 220;
const ROOM_TTL_MS = 1000 * 60 * 60 * 4;
const OPERATOR_SELECT_MS = 45_000;
const MOVEMENT_MAX_ELAPSED_SECONDS = 1.5;
const MOVEMENT_INTEGRATION_STEP_SECONDS = 1 / 60;
const DEFAULT_ONLINE_BOT_COUNT = 7;
const MAP_SCALE = 2;
const WALKABLE_SEAM_MARGIN = 32;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm"
};

const COLORS = [
  "#ef4444",
  "#2563eb",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#ec4899",
  "#94a3b8"
];
const PLAYER_SKINS = new Set(["hood", "blue-dress"]);

const TASK_LABELS = {
  download: "Download",
  upload: "Upload"
};

const DEFAULT_SETTINGS = {
  mapId: "station",
  hostTeam: "random",
  attackerCount: 2,
  taskCount: 18,
  killCooldown: 18,
  killRange: 120,
  discussionTime: 0,
  votingTime: 300,
  anonymousVotes: true,
  confirmEjects: false,
  emergencyLimit: 1
};

const OPERATORS = {
  defender: [
    {
      id: "operator-fighter",
      role: "defender",
      name: "ファイター",
      special: "fighter",
      limit: 99,
      asset: "fighter",
      description: "ECをためて強くなる剣士。剣・キルカウンター・リミットブレイクを使う。",
      details: "EC：12秒ごとに1MPを使い、EC+1。剣の使用・投擲で通常衝撃波を出すたび、現在ECを1使う。衝撃波は剣で防げるが、ジャストガードと反射はできない。\n\nEC100：以後、ECを使ってもMP・SPを補充。HPとバリア耐久の制限は維持する。EC500：居合を1回獲得。次の成功攻撃を死体ありキルにする。失敗・回避・ガード・準備バリア・非攻撃では消費せず、死体なしキルはそのまま。EC1000：リミットブレイク中のキルを防げない不利を解除。剣の斬るは常に死体なしキルになり、対象攻撃へのジャストガードは全攻撃を反射する。\n\nオリハルコン・ソード：開始時に1振り所持。使用・投擲できる。通常の斬るは死体ありキル、物理攻撃のガード、短いジャストガードで攻撃元への反射を行う。EMP・毒・サンビームは通常ガードできない。ファイター以外は物理斬り・物理ガード・投擲だけを使え、ECと衝撃波は使えない。\n\n回避：60SPでキルを無効化した時だけ、攻撃者を即時キルする。\n\nリミットブレイク：パッシブ。現在HPと上限を1にし、被弾で0になると死亡する。会議外の世界時間でACCが増える。手動発動・MP消費・SP倍率はない。"
    },
    {
      id: "defender-teleport",
      role: "defender",
      name: "グラビティ",
      special: "teleport",
      limit: 99,
      asset: "teleport",
      description: "重力と時空を操る。転移、時間加減速、浮揚、重力嵐を使う。",
      details: "転移（1MP）：自分を指定地点へ移動。対象転移：選んだ対象を指定地点へ移動。\n\n心臓転移（10MP）：対象を遠隔キルする。\n\nアクセラレート／ディーセラレート（各1MP）：8秒間、対象の行動時間を加速／減速する。\n\n理知中：リビテーションで床のない場所も移動できる。\n\nグラビティストーム（10MP）：指定地点へ敵全員を12秒間引き寄せ、継続ダメージ・減速・拘束を与える。発動者には最後の1秒以外でバリアが付く。"
    },
    {
      id: "defender-flora",
      role: "defender",
      name: "フローラ",
      special: "flora",
      limit: 99,
      asset: "flora",
      description: "水・草木・木漏れ日の力を操る。ヒール、サンビーム、インビジブルを切り替える。",
      details: "ヒール（1MP）：自分のHP・スタミナを回復し、状態異常を解除して加速を付与する。\n\nサンビーム（10MP）：光の屈折・回折で選んだ方向へ放つ。壁に当たるまでの交差対象をキルする。\n\nインビジブル（10MP）：10秒間透明になり、敵Botの直接視認と追跡対象から外れる。\n\n理知中：アロマで自分のHP・SP・MP自然回復が1.75倍。"
    },
    {
      id: "operator-quantum-control",
      role: "defender",
      name: "クオンタム",
      special: "quantum",
      limit: 99,
      asset: "quantum",
      description: "水の変化、電撃、核変換、核反応を使い分ける。",
      details: "エレクトリック（1MP／16SP）：見通し内で最も近い敵へ、距離を問わず0.35ダメージと3秒間35%減速。壁・遮蔽物で止まり、連鎖・範囲・貫通はしない。\n\n運動エネルギー制御（16SP）：所持中の水を高温水または氷へ変える。\n\n核変換（16SP）：所持中の鉛か水銀を金へ変え、100Cに即時換金する。\n\n核分裂／核融合（各16SP・2MP）：終盤に所持中の核素材へ作用する。対象がなければ何も起きない。"
    }
  ],
  attacker: [
    {
      id: "attacker-gunner",
      role: "attacker",
      name: "ガンナー",
      special: "gunner",
      limit: 99,
      asset: "gunner",
      description: "初期AR、エイム、特殊弾装填を持ち、5種の銃器を扱う。足場のない場所へ進むとホバースプリントが自動発動する。",
      details: "武器：HG・SMG・AR・SR・テーザーを使用できる。SRは通常1.35ダメージ。1弾倉の射撃は25SPを一度だけ使い、SP不足では弾を使わない。テーザーは6秒間減速。全攻撃は生成遮蔽物を貫通する。\n\nヘッドショット（HS）：通常射撃ごとに幸運で抽選。腰撃ちは1〜21%。理知中かつダッシュ以外ではエイムが最寄りの可視対象を追尾し、4〜36%になるが確定ではない。ダッシュになると即解除。手動ボタンや追尾移動はない。\n\n特殊弾：理知中、18秒ごとに選択中の銃へウィーク・ペネトレイト・ショックのどれか1マガジンを装填する。ウィーク弾は命中対象だけをキルし、射手に反動はない。ペネトレイト弾だけは通常の壁も貫通。未装填分は保管し、武器を替えても再適用する。\n\nホバースプリント（1MP）：全員共通の自動アクション。足場から床のない場所へ進む直前に8秒間浮揚し、ACC 1.8になる。20秒のクールタイム中は再発動・延長・累積できない。最後の浮揚が床のない場所で切れると落下死。所持品は不要。GBO（2MP）は全員共通の武具への長押し。数値性能だけを10倍にして武具を壊し、ヘッドショット・キル・特殊弾など数値でない効果は増えない。"
    },
    {
      id: "attacker-assassin",
      role: "attacker",
      name: "アサシン",
      special: "assassin",
      limit: 99,
      asset: "assassin",
      description: "忍殺を死体なしキルへ変える。どの移動状態でも足音を出さない。",
      details: "忍殺：4秒静止、距離、対象喪失、防御、クールタイムは共有忍殺と同じ。成功すると対象を物質も死体も残さない「アサシン忍殺（死体なし）」にし、通報対象と死体由来マーカーも残さない。\n\n無音移動：歩行・ダッシュ・無音歩行のすべてで移動音を出さない。敵Botにも足音による観測情報を与えない。"
    },
    {
      id: "attacker-alchemist",
      role: "attacker",
      name: "ハッカー",
      special: "alchemist",
      limit: 99,
      asset: "hacker",
      description: "バイブコーディングで訓練世界の資源・物体・能力・状態を変える。",
      details: "バイブコーディング：資源・所持品・永続オブジェクト・オペレーター能力の状態を生成または変更する。共有商品は0MPで、最終クールタイムはショップ価格1Cにつき5秒。対象のクレジット・アイテム・HP・マナは削除または増殖できる。\n\nH：ROOT。自分のHPを0.0001に固定し、ROOT中だけバリア・変わり身などのキル無効アイテムを無効化して、他オペレーターの能力を借用できる。解除後は持っていたキル無効アイテムが再び有効。低HPで自動発動はしない。\n\nマナGPU：0.025MP／秒。1MPは20秒として短縮クールを上限なくため、次の生成に使う。\n\nハック：他人の位置を把握する。通常タスクとは別に、時間経過でタスクを自動完了する。自分のスマホはハッキングされない。"
    }
  ]
};

const ITEM_DEFINITIONS = Object.freeze({
  "orichalcum-sword": Object.freeze({ id: "orichalcum-sword", label: "オリハルコン・ソード", asset: "orichalcum-sword", throwable: true, weapon: true, reusable: true }),
  mercury: Object.freeze({ id: "mercury", label: "水銀瓶", asset: "quantum-mercury", throwable: true, usable: false }),
  lead: Object.freeze({ id: "lead", label: "鉛瓶", asset: "quantum-lead", throwable: true, usable: false }),
  uranium: Object.freeze({ id: "uranium", label: "ウラン容器", asset: "quantum-uranium", throwable: true, usable: false }),
  plutonium: Object.freeze({ id: "plutonium", label: "プルトニウム容器", asset: "quantum-plutonium", throwable: true, usable: false }),
  seawater: Object.freeze({ id: "seawater", label: "海水", asset: "seawater", throwable: true, usable: true }),
  "mineral-water": Object.freeze({ id: "mineral-water", label: "ミネラルウォーター", asset: "mineral-water", throwable: true }),
  antidote: Object.freeze({ id: "antidote", label: "解毒剤", asset: "antidote", throwable: true }),
  molotov: Object.freeze({ id: "molotov", label: "火炎瓶", asset: "molotov", throwable: true, usable: false }),
  "frag-grenade": Object.freeze({ id: "frag-grenade", label: "フラググレネード", asset: "frag-grenade", throwable: true, usable: false }),
  "stun-grenade": Object.freeze({ id: "stun-grenade", label: "スタングレネード", asset: "stun-grenade", throwable: true, usable: false }),
  ice: Object.freeze({ id: "ice", label: "氷結水", asset: "quantum-ice", throwable: true, transformed: true, usable: false }),
  "heated-water": Object.freeze({ id: "heated-water", label: "高温水", asset: "quantum-heated-water", throwable: true, transformed: true, usable: false })
});

// Keep every server-side travelling attack in one auditable registry. New
// vector routes must join this list and use resolveVectorAttackPath; direct,
// omnipresent and area-only effects intentionally do not belong here.
const VECTOR_ATTACK_WALL_OCCLUSION_ROUTES = Object.freeze({
  gunner: Object.freeze(["bullet", "gbo-bullet", "weak-bullet", "shock-bullet"]),
  flora: Object.freeze(["sunbeam"]),
  invention: Object.freeze(["excalibur", "railgun", "particle-cannon"]),
  heavy: Object.freeze(["rpg", "missile"]),
  fighter: Object.freeze(["fighter-energy-shockwave"]),
  thrown: Object.freeze(["thrown-sword-blade", "thrown-item-flight"])
});

const INSTANT_ITEM_DEFINITIONS = Object.freeze({
  protect: Object.freeze({id: "protect", label: "プロテクト", field: "protectCharges", automatic: true}),
  grit: Object.freeze({ id: "grit", label: "バリア", field: "gritCharges", automatic: true }),
  reason: Object.freeze({ id: "reason", label: "バスト", field: "reasonCharges", automatic: true }),
  iai: Object.freeze({ id: "iai", label: "居合", field: "iaiCharges", asset: "iai", automatic: true }),
  gold: Object.freeze({ id: "gold", label: "金", automatic: true }),
  hack: Object.freeze({ id: "hack", label: "ハック", field: "hackActive", automatic: true }),
  stamina: Object.freeze({ id: "stamina", label: "スタミナ", automatic: true })
});

const QUANTUM_STARTING_ITEMS = Object.freeze({ mercury: 1, lead: 1, uranium: 1, plutonium: 1, seawater: 1 });
// Operator loadouts are rebuilt from this authoritative seed at match start,
// so reconnects and fresh matches cannot append duplicate consumables.
const GUNNER_STARTING_ITEMS = Object.freeze({ "frag-grenade": 1, "stun-grenade": 1 });
const GRENADE_BALANCE = Object.freeze({
  frag: Object.freeze({ damage: 0.75, radius: 132, impactDurationMs: 900 }),
  stun: Object.freeze({ durationMs: 2_500, radius: 145, impactDurationMs: 720 })
});

function createItemInventory(seed = {}) {
  const inventory = {};
  for (const [itemId, amount] of Object.entries(seed || {})) {
    if (!ITEM_DEFINITIONS[itemId]) continue;
    const count = Math.max(0, Math.floor(Number(amount) || 0));
    if (count > 0) inventory[itemId] = count;
  }
  return inventory;
}

function itemCount(player, itemId) {
  return Math.max(0, Math.floor(Number(player?.itemInventory?.[itemId]) || 0));
}

function addItem(player, itemId, amount = 1) {
  if (!ITEM_DEFINITIONS[itemId]) throw new ApiError(400, "不明なアイテムです。");
  player.itemInventory ||= {};
  const next = itemCount(player, itemId) + Math.max(0, Math.floor(Number(amount) || 0));
  if (next > 0) player.itemInventory[itemId] = next;
  else delete player.itemInventory[itemId];
  return next;
}

function consumeItem(player, itemId, amount = 1) {
  const count = Math.max(1, Math.floor(Number(amount) || 1));
  if (itemCount(player, itemId) < count) throw new ApiError(400, `${ITEM_DEFINITIONS[itemId]?.label || itemId}を所持していません。`);
  const next = itemCount(player, itemId) - count;
  if (next > 0) player.itemInventory[itemId] = next;
  else delete player.itemInventory[itemId];
  return next;
}

const SOLO_MISSIONS = Object.freeze({
  movement: Object.freeze({
    id: "movement",
    name: "機動・タスク訓練",
    objective: "自分でタスクを1件完了する",
    team: "defender",
    operatorId: "operator-fighter",
    botCount: 3,
    attackerCount: 1,
    taskCount: 6,
    metric: "task"
  }),
  combat: Object.freeze({
    id: "combat",
    name: "ガンナー射撃訓練",
    objective: "ディフェンダーを1人排除する",
    team: "attacker",
    operatorId: "attacker-gunner",
    botCount: 3,
    attackerCount: 1,
    taskCount: 6,
    metric: "kill"
  }),
  defense: Object.freeze({
    id: "defense",
    name: "回避・反撃訓練",
    objective: "回避を発動し、15秒間生存する",
    team: "defender",
    operatorId: "operator-fighter",
    botCount: 3,
    attackerCount: 1,
    taskCount: 6,
    metric: "defense",
    surviveMs: 15_000
  }),
  emp: Object.freeze({
    id: "emp",
    name: "EMP打ち消し・増強訓練",
    objective: "停止BotのEMPへ逆位相で打ち消し、同位相で増強する",
    team: "defender",
    operatorId: "operator-fighter",
    botCount: 1,
    attackerCount: 1,
    taskCount: 6,
    metric: "emp"
  }),
  "cpu-gravity": Object.freeze({
    id: "cpu-gravity",
    name: "CPU戦・重力処刑手順",
    objective: "グラビティCPUの善のイデア到達前に行動パターンを崩して生存する",
    team: "defender",
    operatorId: "operator-fighter",
    botCount: 3,
    attackerCount: 1,
    taskCount: 6,
    metric: "cpu"
  }),
  "cpu-stage2": Object.freeze({
    id: "cpu-stage2",
    name: "CPU戦・ハッカー制圧訓練",
    objective: "資源と状態を書き換えるハッカーCPUを排除する",
    team: "defender",
    operatorId: "operator-fighter",
    botCount: 5,
    attackerCount: 1,
    taskCount: 6,
    metric: "cpu2"
  })
});

// The active game has one authoritative field. Keep a clone because map finalization
// adds runtime geometry/environment fields.
const MAPS = {
  station: JSON.parse(JSON.stringify(ADVANCED_STATION_MAP))
};

for (const map of Object.values(MAPS)) {
  if (!map.authoredGeometry) {
    applyMapGeometryCorrections(map);
    expandMap(map, MAP_SCALE);
  }
  finalizeMapEnvironment(map);
  map.objectSpaceCollision = globalThis.DvaObjectSpaceCollision.compile(map);
  map.medicalWallCollision = globalThis.DvaObjectSpaceCollision.compileMedicalWalls(map);
}

function expandMap(map, scale) {
  if (map.expandedScale === scale) return;
  map.width = Math.round(map.width * scale);
  map.height = Math.round(map.height * scale);
  scalePoints(map.spawns, scale);
  scaleRects(map.rooms, scale);
  scaleRects(map.corridors, scale);
  scalePoints(map.stations, scale);
  scalePoints(map.objects, scale);
  scaleRects(map.objectSpaces, scale);
  scalePoints(map.vents, scale);
  scaleRects(map.doors, scale);
  map.expandedScale = scale;
}

function scalePoints(items, scale) {
  for (const item of items || []) {
    if (typeof item.x === "number") item.x = Math.round(item.x * scale);
    if (typeof item.y === "number") item.y = Math.round(item.y * scale);
  }
}

function scaleRects(items, scale) {
  for (const item of items || []) {
    if (typeof item.x === "number") item.x = Math.round(item.x * scale);
    if (typeof item.y === "number") item.y = Math.round(item.y * scale);
    if (typeof item.w === "number") item.w = Math.round(item.w * scale);
    if (typeof item.h === "number") item.h = Math.round(item.h * scale);
  }
}

function applyMapGeometryCorrections(map) {
  const corrections = MAP_ENVIRONMENT_CONTRACT.geometryCorrections?.[map.id]?.corridors || {};
  for (const corridor of map.corridors || []) {
    Object.assign(corridor, corrections[corridor.id] || {});
  }
}

function sharedBoundary(room, corridor) {
  const epsilon = 1;
  const overlapY = Math.min(room.y + room.h, corridor.y + corridor.h) - Math.max(room.y, corridor.y);
  const overlapX = Math.min(room.x + room.w, corridor.x + corridor.w) - Math.max(room.x, corridor.x);
  if (Math.abs(room.x + room.w - corridor.x) <= epsilon && overlapY > 0) {
    return { orientation: "vertical", roomSide: "E", corridorSide: "W", boundary: corridor.x,
      seamStart: Math.max(room.y, corridor.y), seamEnd: Math.min(room.y + room.h, corridor.y + corridor.h) };
  }
  if (Math.abs(room.x - (corridor.x + corridor.w)) <= epsilon && overlapY > 0) {
    return { orientation: "vertical", roomSide: "W", corridorSide: "E", boundary: room.x,
      seamStart: Math.max(room.y, corridor.y), seamEnd: Math.min(room.y + room.h, corridor.y + corridor.h) };
  }
  if (Math.abs(room.y + room.h - corridor.y) <= epsilon && overlapX > 0) {
    return { orientation: "horizontal", roomSide: "S", corridorSide: "N", boundary: corridor.y,
      seamStart: Math.max(room.x, corridor.x), seamEnd: Math.min(room.x + room.w, corridor.x + corridor.w) };
  }
  if (Math.abs(room.y - (corridor.y + corridor.h)) <= epsilon && overlapX > 0) {
    return { orientation: "horizontal", roomSide: "N", corridorSide: "S", boundary: room.y,
      seamStart: Math.max(room.x, corridor.x), seamEnd: Math.min(room.x + room.w, corridor.x + corridor.w) };
  }
  return null;
}

function positiveIntersection(a, b) {
  return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0 &&
    Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0;
}

function adjacencySides(area, areas) {
  const sides = new Set();
  for (const other of areas) {
    if (other === area) continue;
    const relation = sharedBoundary(area, other);
    if (relation) sides.add(relation.roomSide);
    const reverse = sharedBoundary(other, area);
    if (reverse) sides.add(reverse.corridorSide);
  }
  return ["N", "E", "S", "W"].filter((side) => sides.has(side));
}

function corridorTopology(openings) {
  if (openings.length >= 4) return "cross";
  if (openings.length === 3) return "junction";
  if (openings.length === 2) {
    return (openings.includes("N") && openings.includes("S")) || (openings.includes("E") && openings.includes("W"))
      ? "straight"
      : "corner";
  }
  return openings.length === 1 ? "terminal" : "isolated";
}

function deriveMapPortals(map) {
  const scale = Number(map.expandedScale) || 1;
  const defaultSpan = Number(MAP_ENVIRONMENT_CONTRACT.rules?.defaultPortalOpeningSpan || 84) * scale;
  const thickness = Number(MAP_ENVIRONMENT_CONTRACT.rules?.portalThickness || 28) * scale;
  const doorContracts = new Map((MAP_ENVIRONMENT_CONTRACT.doors?.[map.id] || []).map((door) => [
    `${door.roomId}|${door.corridorId}`,
    door
  ]));
  const visualPortalContracts = new Map((MAP_ENVIRONMENT_CONTRACT.portals?.[map.id] || []).map((portal) => [
    `${portal.roomId}|${portal.corridorId}`,
    portal
  ]));
  const portals = [];
  for (const room of map.rooms || []) {
    for (const corridor of map.corridors || []) {
      const boundary = sharedBoundary(room, corridor);
      if (!boundary) continue;
      const doorContract = doorContracts.get(`${room.id}|${corridor.id}`) || null;
      const visualPortalContract = visualPortalContracts.get(`${room.id}|${corridor.id}`) || null;
      const seamSpan = boundary.seamEnd - boundary.seamStart;
      const requestedSpan = Number(doorContract?.openingSpan || defaultSpan / scale) * scale;
      const openingSpan = Math.max(16 * scale, Math.min(requestedSpan, seamSpan - 12 * scale));
      const center = (boundary.seamStart + boundary.seamEnd) / 2;
      const portal = {
        id: `portal-${room.id}-${corridor.id}`,
        roomId: room.id,
        corridorId: corridor.id,
        roomSide: boundary.roomSide,
        corridorSide: boundary.corridorSide,
        orientation: boundary.orientation,
        boundary: boundary.boundary,
        seamStart: boundary.seamStart,
        seamEnd: boundary.seamEnd,
        doorId: doorContract?.id || visualPortalContract?.doorId || ""
      };
      if (visualPortalContract?.worldOpeningRect) {
        Object.assign(portal, {
          x: Math.round(visualPortalContract.worldOpeningRect.x),
          y: Math.round(visualPortalContract.worldOpeningRect.y),
          w: Math.round(visualPortalContract.worldOpeningRect.w),
          h: Math.round(visualPortalContract.worldOpeningRect.h)
        });
      } else if (boundary.orientation === "vertical") {
        Object.assign(portal, {
          x: Math.round(boundary.boundary - thickness / 2),
          y: Math.round(center - openingSpan / 2),
          w: Math.round(thickness),
          h: Math.round(openingSpan)
        });
      } else {
        Object.assign(portal, {
          x: Math.round(center - openingSpan / 2),
          y: Math.round(boundary.boundary - thickness / 2),
          w: Math.round(openingSpan),
          h: Math.round(thickness)
        });
      }
      portals.push(portal);
    }
  }
  return portals;
}

function applyRoomAnchorContract(map) {
  const roomContracts = MAP_ENVIRONMENT_CONTRACT.rooms?.[map.id] || {};
  const objectTypes = MAP_ENVIRONMENT_CONTRACT.objectTypes || {};
  const objectFootprints = MAP_ENVIRONMENT_CONTRACT.objectFootprints || {};
  const clusterDistance = Number(MAP_ENVIRONMENT_CONTRACT.rules?.interiorClusterDistanceUv || 0.07);
  const existing = new Map([...(map.stations || []), ...(map.objects || [])].map((entry) => [entry.id, entry]));
  for (const room of map.rooms || []) {
    const anchors = roomContracts[room.id] || [];
    const reserved = [];
    for (const anchor of anchors) {
      const entry = existing.get(anchor.id);
      if (!entry) continue;
      const definition = objectTypes[anchor.type];
      entry.x = Number.isFinite(Number(anchor.worldX)) ? Math.round(anchor.worldX) : Math.round(room.x + anchor.u * room.w);
      entry.y = Number.isFinite(Number(anchor.worldY)) ? Math.round(anchor.worldY) : Math.round(room.y + anchor.v * room.h);
      entry.room = room.id;
      entry.assetAnchor = true;
      entry.anchorU = anchor.u;
      entry.anchorV = anchor.v;
      entry.assetWorldX = entry.x;
      entry.assetWorldY = entry.y;
      const footprint = anchor.worldFootprint || objectFootprints[anchor.type] || { width: 80, height: 72 };
      entry.visualWidth = Math.max(1, Math.round(Number(footprint.width) || 80));
      entry.visualHeight = Math.max(1, Math.round(Number(footprint.height) || 72));
      if (definition) {
        entry.type = anchor.type;
        entry.label = definition.label;
        entry.effectLabel = definition.effectLabel;
        entry.effectKind = definition.effectKind;
        entry.effectAmount = Number(definition.amount) || 0;
        entry.cooldownMs = Number(definition.cooldownMs) || 30000;
      }
      if ((map.objects || []).includes(entry)) entry.integrated = true;
      reserved.push(anchor);
    }
    const accepted = [...reserved];
    for (const anchor of anchors) {
      if (existing.has(anchor.id)) continue;
      const definition = objectTypes[anchor.type];
      if (!definition) continue;
      const inferredDetail = /-\d+$/.test(anchor.id);
      const duplicatesVisibleAnchor = inferredDetail && accepted.some((other) => (
        Math.hypot(anchor.u - other.u, anchor.v - other.v) < clusterDistance
      ));
      if (duplicatesVisibleAnchor) continue;
      const object = {
        id: anchor.id,
        type: anchor.type,
        label: definition.label,
        effectLabel: definition.effectLabel,
        effectKind: definition.effectKind,
        effectAmount: Number(definition.amount) || 0,
        x: Number.isFinite(Number(anchor.worldX)) ? Math.round(anchor.worldX) : Math.round(room.x + anchor.u * room.w),
        y: Number.isFinite(Number(anchor.worldY)) ? Math.round(anchor.worldY) : Math.round(room.y + anchor.v * room.h),
        room: room.id,
        interactive: true,
        integrated: true,
        assetAnchor: true,
        anchorU: anchor.u,
        anchorV: anchor.v,
        assetWorldX: Number.isFinite(Number(anchor.worldX)) ? Math.round(anchor.worldX) : Math.round(room.x + anchor.u * room.w),
        assetWorldY: Number.isFinite(Number(anchor.worldY)) ? Math.round(anchor.worldY) : Math.round(room.y + anchor.v * room.h),
        visualWidth: Math.max(1, Math.round(Number((anchor.worldFootprint || objectFootprints[anchor.type])?.width) || 80)),
        visualHeight: Math.max(1, Math.round(Number((anchor.worldFootprint || objectFootprints[anchor.type])?.height) || 72)),
        cooldownMs: Number(definition.cooldownMs) || 30000,
        useRange: Math.round(72 * (Number(map.expandedScale) || 1))
      };
      map.objects.push(object);
      existing.set(object.id, object);
      accepted.push(anchor);
    }
  }
}

function normalizeMapObjectBenefits(map) {
  for (const object of map.objects || []) {
    if (object.effectKind === "footBath") continue;
    if (object.effectKind === "cooldownReduction") {
      if (/workbench|bench/i.test(`${object.type} ${object.id}`)) {
        object.effectKind = "stamina";
        object.effectAmount = 120;
        object.effectLabel = "スタミナ +120";
      } else if (/console|commandDesk|reactorGauge|wallSconce/i.test(`${object.type} ${object.id}`)) {
        object.effectKind = "luckBoost";
        object.effectAmount = 0.15;
        object.effectDurationMs = 20_000;
        object.effectLabel = "幸運／直観 +15%・20秒";
      } else {
        object.effectKind = "mana";
        object.effectAmount = 1;
        object.effectLabel = "マナ +1";
      }
    } else if (object.effectKind === "statusRecovery") {
      if (/plant|mist|herb/i.test(`${object.type} ${object.id}`)) {
        object.effectKind = "luckBoost";
        object.effectAmount = 0.12;
        object.effectDurationMs = 20_000;
        object.effectLabel = "幸運／直観 +12%・20秒";
      } else {
        object.effectKind = "stamina";
        object.effectAmount = 120;
        object.effectLabel = "スタミナ +120";
      }
    } else if (object.effectKind === "herbalRecovery") {
      object.effectKind = "heal";
      object.effectAmount = 1;
      object.effectLabel = "HP +1";
    } else if (object.effectKind === "relaxation") {
      object.effectKind = "acceleration";
      object.effectLabel = `加速 ${Math.max(1.01, Number(object.effectAmount) || 1.35)}・${Math.round(Math.max(1000, Number(object.effectDurationMs) || 12000) / 1000)}秒`;
    } else if (object.effectKind === "mineralWater") {
      object.effectKind = "stamina";
      object.effectLabel = `スタミナ +${Math.max(1, Number(object.effectAmount) || 100)}`;
    }
    if (object.effectKind === "fullRecovery") {
      object.effectLabel = "HP回復（個人上限まで）";
    }
  }
}

function validateMapEnvironment(map) {
  const owned = [...(map.rooms || []), ...(map.corridors || [])];
  const corridorIds = new Set((map.corridors || []).map((corridor) => corridor.id));
  for (let index = 0; index < owned.length; index += 1) {
    for (let other = index + 1; other < owned.length; other += 1) {
      if (positiveIntersection(owned[index], owned[other])) {
        const structuralJunction = corridorIds.has(owned[index].id) && corridorIds.has(owned[other].id) &&
          (owned[index].id.startsWith("junction-") || owned[other].id.startsWith("junction-"));
        if (structuralJunction) continue;
        throw new Error(`${map.id}: overlapping map ownership ${owned[index].id}/${owned[other].id}`);
      }
    }
  }
  const portalByDoor = new Map((map.portals || []).filter((portal) => portal.doorId).map((portal) => [portal.doorId, portal]));
  for (const door of map.doors || []) {
    const portal = portalByDoor.get(door.id);
    if (!portal) throw new Error(`${map.id}: missing canonical portal for ${door.id}`);
    for (const key of ["x", "y", "w", "h"]) {
      if (door[key] !== portal[key]) throw new Error(`${map.id}: ${door.id} differs from ${portal.id} at ${key}`);
    }
  }
}

function finalizeMapEnvironment(map) {
  normalizeMapObjectBenefits(map);
  if (map.authoredGeometry) {
    map.portals = (map.doors || []).map((door) => ({
      id: `portal-${door.id}`,
      doorId: door.id,
      orientation: door.orientation,
      x: door.x,
      y: door.y,
      w: door.w,
      h: door.h
    }));
    map.walkable = [...map.rooms, ...map.corridors];
    map.environmentContractVersion = map.schema;
    return;
  }
  applyRoomAnchorContract(map);
  normalizeMapObjectBenefits(map);
  const allAreas = [...map.rooms, ...map.corridors];
  for (const corridor of map.corridors) {
    const openings = adjacencySides(corridor, allAreas);
    corridor.openings = openings;
    corridor.topology = corridorTopology(openings);
    corridor.renderSegments = [{ x: corridor.x, y: corridor.y, w: corridor.w, h: corridor.h }];
  }
  map.portals = deriveMapPortals(map);
  const portalByDoor = new Map(map.portals.filter((portal) => portal.doorId).map((portal) => [portal.doorId, portal]));
  map.doors = map.doors.map((door) => {
    const portal = portalByDoor.get(door.id);
    return portal ? { ...door, x: portal.x, y: portal.y, w: portal.w, h: portal.h, portalId: portal.id } : door;
  });
  map.walkable = [...map.rooms, ...map.corridors];
  map.environmentContractVersion = MAP_ENVIRONMENT_CONTRACT.schema;
  validateMapEnvironment(map);
}

const rooms = new Map();
// Online matchmaking is deliberately bounded to one perceptual instant.  The
// small window only lets two requests which are already arriving together
// observe one another; it is not a lobby or a polling delay.
const INSTANT_MATCHMAKING_WINDOW_MS = 120;
const MATCHMAKING_WAIT_MS = INSTANT_MATCHMAKING_WINDOW_MS;
const instantMatchmakingRequests = new Map();

const RANKS = Object.freeze([
  { id: "bronze", label: "ブロンズ", min: 0 },
  { id: "silver", label: "シルバー", min: 3 },
  { id: "gold", label: "ゴールド", min: 8 },
  { id: "diamond", label: "ダイヤ", min: 16 }
]);

function loadPlayerProfiles() {
  try {
    const parsed = JSON.parse(fs.readFileSync(PLAYER_PROFILE_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

let playerProfiles = loadPlayerProfiles();
let profileRemoteSaveTimer = null;
let profileHydrationStatus = {
  state: PROFILE_REMOTE_URL ? "pending" : "disabled",
  authenticated: Boolean(ANALYTICS_REMOTE_TOKEN),
  checkedAt: 0
};

function savePlayerProfiles(syncRemote = true) {
  fs.mkdirSync(MODERATION_DIR, { recursive: true });
  const temporaryFile = `${PLAYER_PROFILE_FILE}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(playerProfiles, null, 2), "utf8");
  fs.renameSync(temporaryFile, PLAYER_PROFILE_FILE);
  if (syncRemote && ANALYTICS_REMOTE_TOKEN && PROFILE_REMOTE_WRITE_URL) {
    clearTimeout(profileRemoteSaveTimer);
    profileRemoteSaveTimer = setTimeout(() => void persistPlayerProfilesRemote(), 1_200);
  }
}

function normalizedRequestIp(req) {
  const forwardedFor = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  const standardForwarded = String(req?.headers?.forwarded || "")
    .split(",")[0]
    .split(";")
    .map((part) => part.trim())
    .find((part) => /^for=/i.test(part));
  let candidate = String(
    req?.headers?.["cf-connecting-ip"] ||
    req?.headers?.["x-real-ip"] ||
    forwardedFor ||
    standardForwarded?.replace(/^for=/i, "") ||
    req?.socket?.remoteAddress ||
    ""
  ).trim().replace(/^"|"$/g, "");
  const bracketed = candidate.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) candidate = bracketed[1];
  else {
    const ipv4WithPort = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
    if (ipv4WithPort) candidate = ipv4WithPort[1];
  }
  candidate = candidate.replace(/%.+$/, "").toLowerCase();
  const mappedIpv4 = candidate.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mappedIpv4 && net.isIP(mappedIpv4[1]) === 4) candidate = mappedIpv4[1];
  const version = net.isIP(candidate);
  if (!version) return "";
  if (version === 6) {
    try {
      candidate = new URL(`http://[${candidate}]`).hostname.replace(/^\[|\]$/g, "");
    } catch {
      return "";
    }
  }
  return candidate.slice(0, 128);
}

function isGeneratedOfflineRequest(req) {
  return String(req?.socket?.remoteAddress || "").startsWith("offline:");
}

function playerProfileId(req) {
  const normalizedIp = normalizedRequestIp(req);
  return normalizedIp
    ? crypto.createHash("sha256").update(`ip-profile:${normalizedIp}`).digest("hex").slice(0, 24)
    : "";
}

function legacyPlayerProfileId(rawClientId) {
  return rawClientId ? checkpointClientId(rawClientId) : "";
}

function rankForPoints(points) {
  return [...RANKS].reverse().find((rank) => Number(points) >= rank.min) || RANKS[0];
}

function canonicalProfileId(profileId) {
  const id = String(profileId || "");
  return DEVELOPER_PROFILE_IDS.has(id) ? DEVELOPER_CANONICAL_PROFILE_ID : id;
}

function profileFor(player) {
  if (!player?.profileId) return null;
  const canonicalId = canonicalProfileId(player.profileId);
  return playerProfiles[canonicalId] || playerProfiles[player.profileId] || null;
}

function profileKillRate(profile) {
  return Math.round(Math.max(0, Number(profile?.killPoints) || 0) * 100) / 100;
}

function normalizedRoundKillPoints(role, kills, attackerTarget) {
  const totalKills = Math.max(0, Number(kills) || 0);
  if (role !== "attacker") return totalKills;
  return totalKills / Math.max(1, Number(attackerTarget) || 1);
}

function isDeveloperProfileId(profileId) {
  const id = String(profileId || "");
  return Boolean(id && (DEVELOPER_PROFILE_IDS.has(id) || playerProfiles[id]?.developer === true));
}

function migrateLegacyProfile(profileId, legacyProfileId) {
  const targetId = canonicalProfileId(profileId);
  if (!targetId) return null;
  if (playerProfiles[targetId]) return playerProfiles[targetId];
  const sourceId = playerProfiles[profileId] ? profileId : legacyProfileId;
  if (!sourceId || sourceId === targetId) return null;
  const legacy = playerProfiles[sourceId];
  if (!legacy?.name) return null;
  playerProfiles[targetId] = {
    ...legacy,
    name: isDeveloperProfileId(profileId) ? RESERVED_DEVELOPER_NAME : legacy.name,
    developer: isDeveloperProfileId(profileId),
    identityVersion: 2,
    updatedAt: now()
  };
  if (sourceId !== targetId) delete playerProfiles[sourceId];
  savePlayerProfiles();
  return playerProfiles[targetId];
}

function reservePlayerName(rawName, profileId, legacyProfileId = "") {
  const requested = cleanName(rawName);
  const targetId = canonicalProfileId(profileId);
  const existing = targetId ? playerProfiles[targetId] || migrateLegacyProfile(profileId, legacyProfileId) : null;
  if (existing?.name) {
    if (isDeveloperProfileId(profileId) && existing.name !== RESERVED_DEVELOPER_NAME) {
      existing.name = RESERVED_DEVELOPER_NAME;
      existing.developer = true;
      existing.updatedAt = now();
      savePlayerProfiles();
    }
    if (existing.name === RESERVED_DEVELOPER_NAME && !isDeveloperProfileId(profileId)) {
      // A pre-reservation ordinary profile may contain the former synthesized
      // default. Keep the reserved-name prohibition, but let its owner select
      // a new valid name instead of making the profile permanently unusable.
      if (requested === RESERVED_DEVELOPER_NAME) {
        throw new ApiError(403, "このユーザー名は使用できません。別の名前を入力してください。");
      }
      const owner = Object.entries(playerProfiles).find(([, profile]) => profile?.name === requested);
      if (owner && canonicalProfileId(owner[0]) !== targetId) {
        throw new ApiError(409, "このユーザー名は既に使用されています。");
      }
      existing.name = requested;
      existing.identityVersion = 2;
      existing.updatedAt = now();
      savePlayerProfiles();
      return existing.name;
    }
    if (Number(existing.identityVersion) < 2) {
      existing.identityVersion = 2;
      existing.updatedAt = now();
      savePlayerProfiles();
    }
    return existing.name;
  }
  if (requested === RESERVED_DEVELOPER_NAME && !isDeveloperProfileId(profileId)) {
    throw new ApiError(403, "このユーザー名は使用できません。別の名前を入力してください。");
  }
  const owner = Object.entries(playerProfiles).find(([, profile]) => profile?.name === requested);
  if (owner && canonicalProfileId(owner[0]) !== targetId) {
    throw new ApiError(409, "このユーザー名は既に使用されています。");
  }
  if (targetId) {
    playerProfiles[targetId] = {
      name: requested,
      points: 0,
      games: 0,
      kills: 0,
      killPoints: 0,
      killRate: 0,
      deaths: 0,
      rank: "bronze",
      identityVersion: 2,
      developer: isDeveloperProfileId(profileId),
      messages: [],
      updatedAt: now()
    };
    savePlayerProfiles();
  }
  return requested;
}

function renameSelectingPlayerName(rawName, profileId, legacyProfileId = "") {
  const requested = cleanName(rawName);
  const targetId = canonicalProfileId(profileId);
  const profile = targetId ? playerProfiles[targetId] || migrateLegacyProfile(profileId, legacyProfileId) : null;
  if (!profile) return reservePlayerName(requested, profileId, legacyProfileId);
  if (requested === RESERVED_DEVELOPER_NAME && !isDeveloperProfileId(profileId)) {
    throw new ApiError(403, "このユーザー名は使用できません。別の名前を入力してください。");
  }
  const owner = Object.entries(playerProfiles).find(([, candidate]) => candidate?.name === requested);
  if (owner && canonicalProfileId(owner[0]) !== targetId) {
    throw new ApiError(409, "このユーザー名は既に使用されています。");
  }
  if (profile.name !== requested) {
    profile.name = requested;
    profile.identityVersion = 2;
    profile.updatedAt = now();
    savePlayerProfiles();
  }
  return profile.name;
}

// Stage changes during preparation keep the chosen operators, possessions and
// preparation deadline. Only geometry-owned state is rebuilt for the new map.
function rebuildPreparationMapState(room) {
  const map = getMap(room);
  for (const key of ["bodies", "hitEffects", "magicEffects", "hazardFields", "thrownItems", "groundItems", "activeEmps", "gravityZones", "alchemyObjects", "mysteryBoxes", "sounds", "doorLog"]) room[key] = [];
  room.utilityViews.clear();
  for (const player of room.players.values()) {
    const doneCount = (player.taskList || []).filter((task) => task.done).length;
    player.taskList = player.role === "defender" ? assignTasks(map, room.settings.taskCount) : [];
    player.taskList.slice(0, doneCount).forEach((task) => { task.done = true; });
    player.taskAutoReadyAt = 0;
    player.taskPresenceTaskId = "";
    player.taskPresenceSince = 0;
    player.inVent = false;
    player.ventId = "";
    player.movementMode = "idle";
    player.navPath = [];
    player.navCalculatedAt = 0;
    player.botNavigationIntent = null;
    player.botTarget = null;
    player.botTargetUntil = 0;
    player.botTaskTargetId = "";
    player.botTaskPresenceSince = 0;
    player.botTaskPresenceLastTickAt = 0;
    player.botTaskBlockedUntilById = {};
    player.gunFiring = false;
    player.gunnerBurstRoundsRemaining = 0;
    clearAttackState(player);
  }
  replenishMysteryBoxes(room);
}

function relocateSelectingPlayersForMap(room) {
  const map = getMap(room);
  [...room.players.values()].forEach((entry, index) => {
    const spawn = map.spawns[index % map.spawns.length];
    entry.x = spawn.x;
    entry.y = spawn.y;
    entry.vx = 0;
    entry.vy = 0;
    entry.aimX = 0;
    entry.aimY = 1;
    entry.lastMoveAt = now();
  });
}

async function writeRemoteJson(writeUrl, payload, message) {
  if (!ANALYTICS_REMOTE_TOKEN || !writeUrl || typeof fetch !== "function") return { ok: false, status: 0 };
  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${ANALYTICS_REMOTE_TOKEN}`,
    "content-type": "application/json",
    "user-agent": "defenders-vs-attackers-persistence"
  };
  const metadataResponse = await fetch(writeUrl, { headers, signal: AbortSignal.timeout(8_000) });
  const metadata = metadataResponse.ok ? await metadataResponse.json() : {};
  const branchMatch = writeUrl.match(/[?&]ref=([^&]+)/);
  const contentUrl = writeUrl.replace(/\?ref=[^&]+$/, "");
  const body = {
    message,
    content: Buffer.from(JSON.stringify(payload, null, 2), "utf8").toString("base64"),
    ...(metadata.sha ? { sha: metadata.sha } : {}),
    ...(branchMatch ? { branch: decodeURIComponent(branchMatch[1]) } : {})
  };
  const response = await fetch(contentUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000)
  });
  return { ok: response.ok, status: response.status };
}

async function persistPlayerProfilesRemote() {
  try {
    const result = await writeRemoteJson(PROFILE_REMOTE_WRITE_URL, playerProfiles, "Update persistent player profiles");
    profileHydrationStatus = {
      state: result.ok ? "ready" : "failed",
      authenticated: Boolean(ANALYTICS_REMOTE_TOKEN),
      status: result.status,
      checkedAt: now()
    };
    return result.ok;
  } catch (error) {
    profileHydrationStatus = {
      state: "failed",
      authenticated: Boolean(ANALYTICS_REMOTE_TOKEN),
      reason: error?.name === "AbortError" ? "timeout" : "network",
      checkedAt: now()
    };
    return false;
  }
}

async function hydratePlayerProfiles() {
  if (!PROFILE_REMOTE_URL || typeof fetch !== "function") {
    profileHydrationStatus = { state: "disabled", authenticated: false, checkedAt: now() };
    return false;
  }
  try {
    const headers = { accept: "application/json" };
    if (ANALYTICS_REMOTE_TOKEN) headers.authorization = `Bearer ${ANALYTICS_REMOTE_TOKEN}`;
    const response = await fetch(`${PROFILE_REMOTE_URL}?v=${Date.now()}`, {
      headers,
      signal: AbortSignal.timeout(5_000)
    });
    if (!response.ok) {
      profileHydrationStatus = { state: "failed", authenticated: Boolean(ANALYTICS_REMOTE_TOKEN), status: response.status, checkedAt: now() };
      return false;
    }
    const remoteProfiles = await response.json();
    if (!remoteProfiles || typeof remoteProfiles !== "object" || Array.isArray(remoteProfiles)) return false;
    for (const [profileId, remoteProfile] of Object.entries(remoteProfiles)) {
      const localProfile = playerProfiles[profileId];
      if (!localProfile || Number(remoteProfile?.updatedAt) > Number(localProfile?.updatedAt)) playerProfiles[profileId] = remoteProfile;
    }
    savePlayerProfiles(false);
    profileHydrationStatus = { state: "ready", authenticated: Boolean(ANALYTICS_REMOTE_TOKEN), status: response.status, checkedAt: now() };
    return true;
  } catch (error) {
    profileHydrationStatus = {
      state: "failed",
      authenticated: Boolean(ANALYTICS_REMOTE_TOKEN),
      reason: error?.name === "AbortError" ? "timeout" : "network",
      checkedAt: now()
    };
    return false;
  }
}

function updatePlayerProfiles(room) {
  if (room.resultProfileApplied) return;
  const players = [...room.players.values()];
  const attackers = players.filter((player) => player.role === "attacker");
  const attackerTarget = Math.max(
    1,
    Number(room.killRateAttackerTarget) || Math.ceil(
      players.filter((player) => player.role === "defender").length / Math.max(1, attackers.length)
    )
  );
  const resultById = new Map(resultBoardEntries(room).map((entry) => [entry.id, entry]));
  for (const player of players) {
    // Bot rooms are casual for ordinary users, but the reserved developer
    // profile remains rank/KD-visible for debugging and balance checks.
    if (room.casual && !isDeveloperProfileId(player.profileId)) continue;
    const profile = profileFor(player);
    if (!profile) continue;
    const kills = Number(player.totalKills) || 0;
    const result = resultById.get(player.id);
    profile.games = (Number(profile.games) || 0) + 1;
    profile.kills = (Number(profile.kills) || 0) + kills;
    profile.killPoints = (Number(profile.killPoints) || 0) + normalizedRoundKillPoints(player.role, kills, attackerTarget);
    profile.killRate = profileKillRate(profile);
    profile.deaths = (Number(profile.deaths) || 0) + (player.alive ? 0 : 1);
    // The terminal owner commits the immutable Result board before this
    // profile transaction. Reuse its signed total unchanged and exactly once.
    const resultPoints = Number(result?.points) || 0;
    profile.points = Math.min(24, Math.max(0, (Number(profile.points) || 0) + resultPoints));
    profile.rank = rankForPoints(profile.points).id;
    profile.updatedAt = now();
  }
  room.resultProfileApplied = true;
  savePlayerProfiles();
}

function loadModerationRecords() {
  try {
    const parsed = JSON.parse(fs.readFileSync(MODERATION_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

let moderationRecords = loadModerationRecords();
const localCheckpointArchive = (() => {
  try {
    const parsed = JSON.parse(fs.readFileSync(CHECKPOINT_ARCHIVE_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
})();
let checkpointCounts = localCheckpointArchive.counts || (() => {
  try {
    const parsed = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
})();
let checkpointSessions = localCheckpointArchive.sessions || (() => {
  try {
    const parsed = JSON.parse(fs.readFileSync(CHECKPOINT_SESSIONS_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
})();
let checkpointExcludedIds = localCheckpointArchive.excludedIds && typeof localCheckpointArchive.excludedIds === "object"
  ? localCheckpointArchive.excludedIds
  : {};
let checkpointHydrationStatus = {
  state: ANALYTICS_REMOTE_URL ? "pending" : "disabled",
  authenticated: Boolean(ANALYTICS_REMOTE_TOKEN),
  checkedAt: 0
};

function checkpointClientId(rawClientId) {
  return crypto.createHash("sha256").update(String(rawClientId || "anonymous").slice(0, 128)).digest("hex").slice(0, 24);
}

function checkpointArchiveSnapshot() {
  return {
    version: 3,
    updatedAt: now(),
    counts: checkpointCounts,
    sessions: checkpointSessions,
    excludedIds: checkpointExcludedIds
  };
}

let checkpointRemoteSaveTimer = null;

function saveCheckpointRecords(syncRemote = true) {
  fs.mkdirSync(MODERATION_DIR, { recursive: true });
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpointCounts, null, 2), "utf8");
  fs.writeFileSync(CHECKPOINT_SESSIONS_FILE, JSON.stringify(checkpointSessions, null, 2), "utf8");
  fs.writeFileSync(CHECKPOINT_ARCHIVE_FILE, JSON.stringify(checkpointArchiveSnapshot(), null, 2), "utf8");
  if (syncRemote && ANALYTICS_REMOTE_TOKEN && ANALYTICS_REMOTE_WRITE_URL) {
    clearTimeout(checkpointRemoteSaveTimer);
    checkpointRemoteSaveTimer = setTimeout(() => void persistCheckpointArchiveRemote(), 1_200);
  }
}

function mergeCheckpointArchive(archive) {
  if (!archive || typeof archive !== "object") return false;
  const remoteCounts = archive.counts && typeof archive.counts === "object" ? archive.counts : {};
  const remoteSessions = archive.sessions && typeof archive.sessions === "object" ? archive.sessions : {};
  const remoteExcluded = archive.excludedIds && typeof archive.excludedIds === "object" ? archive.excludedIds : {};
  checkpointCounts = Object.fromEntries([...new Set([...Object.keys(remoteCounts), ...Object.keys(checkpointCounts)])]
    .map((name) => [name, Math.max(Number(remoteCounts[name]) || 0, Number(checkpointCounts[name]) || 0)]));
  checkpointSessions = { ...remoteSessions, ...checkpointSessions };
  checkpointExcludedIds = { ...remoteExcluded, ...checkpointExcludedIds };
  for (const excludedId of Object.keys(checkpointExcludedIds)) delete checkpointSessions[excludedId];
  saveCheckpointRecords(false);
  return true;
}

async function persistCheckpointArchiveRemote() {
  try {
    const result = await writeRemoteJson(ANALYTICS_REMOTE_WRITE_URL, checkpointArchiveSnapshot(), "Update named checkpoint analytics");
    checkpointHydrationStatus = {
      state: result.ok ? "ready" : "failed",
      authenticated: Boolean(ANALYTICS_REMOTE_TOKEN),
      status: result.status,
      checkedAt: now()
    };
    return result.ok;
  } catch (error) {
    checkpointHydrationStatus = {
      state: "failed",
      authenticated: Boolean(ANALYTICS_REMOTE_TOKEN),
      reason: error?.name === "AbortError" ? "timeout" : "network",
      checkedAt: now()
    };
    return false;
  }
}

async function hydrateCheckpointArchive() {
  if (!ANALYTICS_REMOTE_URL || typeof fetch !== "function") {
    checkpointHydrationStatus = { state: "disabled", authenticated: false, checkedAt: now() };
    return false;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const headers = { accept: "application/json" };
    if (ANALYTICS_REMOTE_TOKEN) headers.authorization = `Bearer ${ANALYTICS_REMOTE_TOKEN}`;
    const response = await fetch(`${ANALYTICS_REMOTE_URL}?v=${Date.now()}`, {
      headers,
      signal: controller.signal
    });
    if (!response.ok) {
      checkpointHydrationStatus = {
        state: "failed",
        authenticated: Boolean(ANALYTICS_REMOTE_TOKEN),
        status: response.status,
        checkedAt: now()
      };
      return false;
    }
    const merged = mergeCheckpointArchive(await response.json());
    checkpointHydrationStatus = {
      state: merged ? "ready" : "failed",
      authenticated: Boolean(ANALYTICS_REMOTE_TOKEN),
      status: response.status,
      checkedAt: now()
    };
    return merged;
  } catch (error) {
    checkpointHydrationStatus = {
      state: "failed",
      authenticated: Boolean(ANALYTICS_REMOTE_TOKEN),
      reason: error?.name === "AbortError" ? "timeout" : "network",
      checkedAt: now()
    };
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function excludeCheckpointProfile(profileId) {
  checkpointExcludedIds[profileId] = now();
  delete checkpointSessions[profileId];
  saveCheckpointRecords();
  return profileId;
}

// Accumulate only active intervals so resumed sessions do not count background time.
function addCheckpointDuration(session, timestamp) {
  if (!session.last || Number(session.leftAt) > 0) return 0;
  const lastSeenAt = Number(session.lastSeenAt) || timestamp;
  const activeUntil = Math.min(timestamp, lastSeenAt + CHECKPOINT_ACTIVE_TIMEOUT_MS);
  const elapsedMs = Math.max(0, activeUntil - (Number(session.lastAt) || activeUntil));
  session.durationsMs = session.durationsMs && typeof session.durationsMs === "object"
    ? session.durationsMs
    : {};
  session.durationsMs[session.last] = Math.max(0, Number(session.durationsMs[session.last]) || 0) + elapsedMs;
  session.totalActiveMs = Math.max(0, Number(session.totalActiveMs) || 0) + elapsedMs;
  session.lastAt = timestamp;
  return elapsedMs;
}

function checkpointSessionSnapshot(session, timestamp) {
  const durationsMs = session.durationsMs && typeof session.durationsMs === "object"
    ? { ...session.durationsMs }
    : {};
  let totalActiveMs = Math.max(0, Number(session.totalActiveMs) || 0);
  if (!totalActiveMs && Object.keys(durationsMs).length) {
    totalActiveMs = Object.values(durationsMs).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  }
  if (!Object.keys(durationsMs).length && Number(session.lastDurationMs) > 0 && session.last) {
    durationsMs[session.last] = Math.max(0, Number(session.lastDurationMs) || 0);
    totalActiveMs = Math.max(totalActiveMs, durationsMs[session.last]);
  }
  if (session.last && !(Number(session.leftAt) > 0)) {
    const lastSeenAt = Number(session.lastSeenAt) || timestamp;
    const activeUntil = Math.min(timestamp, lastSeenAt + CHECKPOINT_ACTIVE_TIMEOUT_MS);
    const currentElapsedMs = Math.max(0, activeUntil - (Number(session.lastAt) || activeUntil));
    durationsMs[session.last] = Math.max(0, Number(durationsMs[session.last]) || 0) + currentElapsedMs;
    totalActiveMs += currentElapsedMs;
  }
  return { durationsMs, totalActiveMs };
}

function recordCheckpoint(rawName, profileId, rawEvent = "visit", rawUserName = "", rawEventId = "", rawOccurredAt = 0) {
  const name = String(rawName || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 48);
  const requestedEvent = String(rawEvent || "visit");
  const event = ["leave", "resume", "heartbeat"].includes(requestedEvent) ? requestedEvent : "visit";
  const clientId = String(profileId || "");
  const userName = String(rawUserName || "").replace(/\s+/g, " ").trim().slice(0, 16);
  if (!clientId) return 0;
  if (userName === "プレイヤー") {
    if (!checkpointExcludedIds[clientId] || checkpointSessions[clientId]) excludeCheckpointProfile(clientId);
    return 0;
  }
  if (checkpointExcludedIds[clientId]) return 0;
  const receivedAt = now();
  const requestedAt = Number(rawOccurredAt);
  const timestamp = Number.isFinite(requestedAt) && requestedAt >= receivedAt - 7 * 24 * 60 * 60 * 1000 && requestedAt <= receivedAt + 5 * 60 * 1000
    ? requestedAt
    : receivedAt;
  const eventId = String(rawEventId || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 96);
  const session = checkpointSessions[clientId] || {
    userName: userName || "未設定",
    firstAt: timestamp,
    visited: [],
    last: "",
    lastAt: timestamp,
    durationsMs: {},
    totalActiveMs: 0,
    lastSeenAt: timestamp,
    leaveCount: 0,
    eventIds: []
  };
  session.eventIds = Array.isArray(session.eventIds) ? session.eventIds.slice(-255) : [];
  if (eventId && session.eventIds.includes(eventId)) return event === "visit" ? Number(checkpointCounts[name]) || 0 : Number(session.leaveCount) || 0;
  if (eventId) session.eventIds.push(eventId);
  if (userName) session.userName = userName;
  session.updatedAt = timestamp;

  if (event === "heartbeat") {
    if (!session.last) return 0;
    addCheckpointDuration(session, timestamp);
    session.lastSeenAt = timestamp;
    session.lastAt = timestamp;
    checkpointSessions[clientId] = session;
    saveCheckpointRecords();
    return session.leaveCount;
  }

  if (event === "leave") {
    if (!session.last) return 0;
    const elapsedMs = addCheckpointDuration(session, timestamp);
    session.lastSeenAt = timestamp;
    session.leftAt = timestamp;
    session.lastDurationMs = elapsedMs;
    session.leaveCount = Math.max(0, Number(session.leaveCount) || 0) + 1;
    checkpointSessions[clientId] = session;
    saveCheckpointRecords();
    return session.leaveCount;
  }

  if (event === "resume") {
    if (!session.last) return 0;
    session.leftAt = 0;
    session.lastAt = timestamp;
    session.lastSeenAt = timestamp;
    checkpointSessions[clientId] = session;
    saveCheckpointRecords();
    return session.leaveCount;
  }

  if (!name) throw new ApiError(400, "チェックポイント名が不正です。");
  addCheckpointDuration(session, timestamp);
  checkpointCounts[name] = Math.max(0, Number(checkpointCounts[name]) || 0) + 1;
  if (!session.visited.includes(name)) session.visited.push(name);
  session.leftAt = 0;
  session.last = name;
  session.lastAt = timestamp;
  session.lastSeenAt = timestamp;
  checkpointSessions[clientId] = session;
  saveCheckpointRecords();
  return checkpointCounts[name];
}

function checkpointReport(excludedProfileId = "") {
  const timestamp = now();
  const requestExcludedId = String(excludedProfileId || "");
  const dropoffs = {};
  const confirmedDropoffs = {};
  const dropoffDurationTotals = {};
  const checkpointDurationTotalsMs = {};
  const checkpointUserCounts = {};
  const players = [];
  let totalPlayMs = 0;
  let longestPlayMs = 0;
  for (const [clientId, session] of Object.entries(checkpointSessions)) {
    if (clientId === requestExcludedId || checkpointExcludedIds[clientId]) continue;
    const last = String(session.last || "unknown");
    const snapshot = checkpointSessionSnapshot(session, timestamp);
    totalPlayMs += snapshot.totalActiveMs;
    longestPlayMs = Math.max(longestPlayMs, snapshot.totalActiveMs);
    for (const [name, durationMs] of Object.entries(snapshot.durationsMs)) {
      const safeDurationMs = Math.max(0, Number(durationMs) || 0);
      checkpointDurationTotalsMs[name] = (checkpointDurationTotalsMs[name] || 0) + safeDurationMs;
      checkpointUserCounts[name] = (checkpointUserCounts[name] || 0) + 1;
    }
    dropoffs[last] = (dropoffs[last] || 0) + 1;
    if (Number(session.leftAt) > 0) {
      confirmedDropoffs[last] = (confirmedDropoffs[last] || 0) + 1;
      dropoffDurationTotals[last] = (dropoffDurationTotals[last] || 0) + Math.max(0, Number(session.lastDurationMs) || 0);
    }
    players.push({
      id: clientId.slice(0, 8),
      name: String(session.userName || `旧記録 #${clientId.slice(0, 8)}`),
      active: !(Number(session.leftAt) > 0) &&
        timestamp - (Number(session.lastSeenAt) || Number(session.lastAt) || 0) <= CHECKPOINT_ACTIVE_TIMEOUT_MS,
      currentCheckpoint: last,
      totalSeconds: Math.round(snapshot.totalActiveMs / 1000),
      checkpointSeconds: Object.fromEntries(Object.entries(snapshot.durationsMs)
        .map(([name, durationMs]) => [name, Math.round(Math.max(0, Number(durationMs) || 0) / 1000)]))
    });
  }
  const averageSecondsAtDropoff = Object.fromEntries(Object.entries(confirmedDropoffs).map(([name, count]) => [
    name,
    Math.round((dropoffDurationTotals[name] || 0) / Math.max(1, count) / 1000)
  ]));
  const checkpointDurations = Object.fromEntries(Object.entries(checkpointDurationTotalsMs)
    .sort((a, b) => b[1] - a[1])
    .map(([name, durationMs]) => [name, {
      totalSeconds: Math.round(durationMs / 1000),
      averageSeconds: Math.round(durationMs / Math.max(1, checkpointUserCounts[name] || 0) / 1000),
      users: checkpointUserCounts[name] || 0
    }]));
  players.sort((a, b) => b.totalSeconds - a.totalSeconds);
  const uniqueUsers = players.length;
  return {
    totals: checkpointCounts,
    uniqueUsers,
    totalPlaySeconds: Math.round(totalPlayMs / 1000),
    averagePlaySeconds: Math.round(totalPlayMs / Math.max(1, uniqueUsers) / 1000),
    longestPlaySeconds: Math.round(longestPlayMs / 1000),
    checkpointDurations,
    players,
    dropoffs: Object.fromEntries(Object.entries(dropoffs).sort((a, b) => b[1] - a[1])),
    confirmedDropoffs: Object.fromEntries(Object.entries(confirmedDropoffs).sort((a, b) => b[1] - a[1])),
    averageSecondsAtDropoff
  };
}

function saveModerationRecords() {
  fs.mkdirSync(MODERATION_DIR, { recursive: true });
  fs.writeFileSync(MODERATION_FILE, JSON.stringify(moderationRecords, null, 2), "utf8");
}

function moderationKey(req, clientId) {
  const address = req.socket?.remoteAddress || "unknown";
  const device = String(clientId || "missing").slice(0, 96);
  return crypto.createHash("sha256").update(`${address}|${device}`).digest("hex");
}

function moderationRecord(key) {
  return moderationRecords[key] || { strikes: 0, banned: false, updatedAt: 0 };
}

function registerModerationStrike(key) {
  const record = moderationRecord(key);
  record.strikes += 1;
  record.banned = record.strikes >= 5;
  record.updatedAt = now();
  moderationRecords[key] = record;
  saveModerationRecords();
  return record;
}

function isBlockedComment(value) {
  const text = String(value || "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
  if (!text) return false;
  const blocked = [
    /(?:セックス|性交|強姦|レイプ|輪姦|わいせつ|卑猥|露出狂|児童ポルノ)/,
    /(?:sex(?:ual)?|rape|porn|nudes?|molest|pedophil)/,
    /(?:首を切|四肢を切|内臓を|臓器を|血まみれ|惨殺|拷問|死体を損壊)/,
    /(?:decapitat|dismember|disembowel|gore|tortur|mutilat)/
  ];
  return blocked.some((pattern) => pattern.test(text));
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function now() {
  return Date.now();
}

function uid(prefix = "") {
  return prefix + crypto.randomBytes(6).toString("hex");
}

function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let i = 0; i < 4; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (!rooms.has(code)) return code;
  }
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

function cleanName(value) {
  const name = String(value || "").replace(/\s+/g, " ").trim().slice(0, 16);
  return name || "プレイヤー";
}

function cleanRoomId(value) {
  return String(value || "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 8);
}

function cleanSkinId(value) {
  const skinId = String(value || "");
  return PLAYER_SKINS.has(skinId) ? skinId : "hood";
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function createRoom(id) {
  const room = {
    id,
    phase: "lobby",
    round: 0,
    createdAt: now(),
    updatedAt: now(),
    hostId: null,
    settings: { ...DEFAULT_SETTINGS },
    players: new Map(),
    bodies: [],
    hitEffects: [],
    magicEffects: [],
    chat: [],
    events: [],
    sounds: [],
    meeting: null,
    battleStartedAt: 0,
    quantumEndgameAt: 0,
    preparationEndsAt: 0,
    operatorSelectEndsAt: 0,
    operatorTurnOrder: [],
    operatorTurnIndex: 0,
    winner: null,
    finishReason: "",
    ideaWinnerId: "",
    ideaWinnerIds: [],
    ideaVictoryArrivalAt: 0,
    pendingIdeaVictoryAt: 0,
    activeEmps: [],
    gravityZones: [],
    alchemyObjects: [],
    hazardFields: [],
    thrownItems: [],
    groundItems: [],
    mysteryBoxes: [],
    lastTickAt: now(),
    utilityViews: new Map(),
    doorLog: [],
    matchmaking: null,
    soloMission: null,
    soloHumanDeathBotTimeScale: 1,
    soloHumanDeathBotTimeScaleActive: false,
    soloHumanDeathBotTimeScaleActivatedAt: 0,
    casual: false,
    resultProfileApplied: false,
    // The terminal Result board is committed once and remains the only source
    // for the signed player points and the one MVP flag.
    resultBoardCommitted: false,
    resultBoardByPlayerId: {}
  };
  rooms.set(id, room);
  return room;
}

function getRoom(id) {
  return rooms.get(cleanRoomId(id));
}

function normalizeMapId(value) {
  const mapId = String(value || "").trim();
  return Object.hasOwn(MAPS, mapId) ? mapId : DEFAULT_SETTINGS.mapId;
}

function getMap(room) {
  const mapId = normalizeMapId(room?.settings?.mapId);
  // A room restored from a pre-removal snapshot can still contain the retired map ID.
  // Normalize it at the authoritative map boundary so reconnects persist and
  // serialize the legal remaining map instead of a stale selector value.
  if (room?.settings && room.settings.mapId !== mapId) room.settings.mapId = mapId;
  return MAPS[mapId];
}

function createMysteryBox(room) {
  const map = getMap(room);
  const boxes = Array.isArray(room.mysteryBoxes) ? room.mysteryBoxes : [];
  const obstacles = [
    ...(map.stations || []),
    ...(map.objects || []),
    ...room.players.values()
  ];
  const mapRegions = (map.rooms || []).filter((region) => region.w > 120 && region.h > 120);
  const regions = mapRegions.length ? mapRegions : [{
    id: "corridor",
    x: 0,
    y: 0,
    w: Number(map.width) || 0,
    h: Number(map.height) || 0
  }];
  const placementAt = (x, y, region) => {
    if (!isWalkable(room, x, y, map.playerRadius)) return null;
    const spawnClearance = map.spawns.length
      ? Math.min(...map.spawns.map((spawn) => distance({ x, y }, spawn)))
      : Infinity;
    if (spawnClearance < 420) return null;
    const boxClearance = boxes.length
      ? Math.min(...boxes.map((box) => distance({ x, y }, box)))
      : Infinity;
    if (boxClearance < MYSTERY_BOX_CLEARANCE) return null;
    const clearance = obstacles.length
      ? Math.min(...obstacles.map((obstacle) => distance({ x, y }, obstacle)))
      : Infinity;
    return { x, y, room: region.id, clearance, boxClearance };
  };
  const preferPlacement = (candidate, current) => (
    !current ||
    candidate.clearance > current.clearance ||
    (candidate.clearance === current.clearance && candidate.boxClearance > current.boxClearance)
  );
  let best = null;
  for (let attempt = 0; attempt < 320; attempt += 1) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    if (!region) break;
    const margin = Math.min(64, Math.max(34, Math.min(region.w, region.h) * 0.16));
    const x = region.x + margin + Math.random() * Math.max(1, region.w - margin * 2);
    const y = region.y + margin + Math.random() * Math.max(1, region.h - margin * 2);
    const candidate = placementAt(x, y, region);
    if (!candidate) continue;
    if (preferPlacement(candidate, best)) best = candidate;
    if (candidate.clearance >= MYSTERY_BOX_CLEARANCE) break;
  }
  if (!best) {
    const gridStep = Math.max(48, Math.ceil((Number(map.playerRadius) || 20) * 2.4));
    for (const region of regions) {
      const margin = Math.min(64, Math.max(34, Math.min(region.w, region.h) * 0.16));
      const minX = region.x + margin;
      const maxX = region.x + region.w - margin;
      const minY = region.y + margin;
      const maxY = region.y + region.h - margin;
      for (let y = minY; y <= maxY; y += gridStep) {
        for (let x = minX; x <= maxX; x += gridStep) {
          const candidate = placementAt(x, y, region);
          if (candidate && preferPlacement(candidate, best)) best = candidate;
        }
      }
    }
  }
  if (!best) throw new Error("ミステリーボックスを重ならない安全な地点へ配置できません。");
  return {
    id: uid("mystery_box_"), type: "mysteryBox", kind: "mystery-box", label: "ミステリーボックス",
    effectLabel: "ランダムなショップ報酬", effectKind: "mysteryBox",
    x: Math.round(best.x), y: Math.round(best.y), room: best.room, interactive: true,
    useRange: MYSTERY_BOX_USE_RANGE, radius: 54, createdAt: now()
  };
}

function replenishMysteryBoxes(room) {
  room.mysteryBoxes = Array.isArray(room.mysteryBoxes) ? room.mysteryBoxes : [];
  while (room.mysteryBoxes.length < MYSTERY_BOX_MAX_COUNT) {
    room.mysteryBoxes.push(createMysteryBox(room));
  }
}

function touch(room) {
  room.updatedAt = now();
}

function pushEvent(room, text) {
  room.events.push({ id: uid("e_"), at: now(), text });
  room.events = room.events.slice(-36);
}

function setImmediateFeedback(player, label, detail) {
  if (!player) return;
  player.lastImmediateFeedback = {
    label: String(label || "結果"),
    detail: String(detail || ""),
    at: now()
  };
}

function pushSound(room, type, source, options = {}) {
  room.sounds.push({
    id: uid("sound_"),
    type,
    x: Math.round(source.x),
    y: Math.round(source.y),
    ownerId: String(options.ownerId || source.id || ""),
    maxDistance: Number(options.maxDistance || 1000),
    volume: Number(options.volume || 1),
    sourceKind: String(options.sourceKind || "player"),
    variant: String(options.variant || ""),
    objectId: String(options.objectId || ""),
    ...(typeof options.objectCausalId === "string" && options.objectCausalId
      ? { objectCausalId: options.objectCausalId }
      : {}),
    ...(type === "sunbeam" && typeof options.sunbeamCausalId === "string" && options.sunbeamCausalId
      ? { sunbeamCausalId: options.sunbeamCausalId }
      : {}),
    ...(type === "fireJutsu" && typeof options.fireCausalId === "string" && options.fireCausalId
      ? { fireCausalId: options.fireCausalId }
      : {}),
    ...(type === "gravityStorm" && typeof options.gravityStormCausalId === "string" && options.gravityStormCausalId
      ? { gravityStormCausalId: options.gravityStormCausalId }
      : {}),
    ...(type === "emp" && typeof options.empCausalId === "string" && options.empCausalId
      ? { empCausalId: options.empCausalId }
      : {}),
    at: now()
  });
  room.sounds = room.sounds.slice(-96);
}

function createGunnerAmmo() {
  return Object.fromEntries(GUNNER_WEAPON_ORDER.map((id) => [id, GUNNER_WEAPONS[id].maxAmmo]));
}

function gunnerWeaponFor(player) {
  return GUNNER_WEAPONS[player?.gunnerWeapon] || GUNNER_WEAPONS[DEFAULT_GUNNER_WEAPON];
}

function gunnerWeaponAvailable(player, weaponId) {
  if ((player?.unavailableGunnerWeapons || []).includes(weaponId)) return false;
  return hasOperatorAccess(player, "gunner") || (player?.purchasedWeapons || []).includes(weaponId);
}

function hasFirearmAccess(player) {
  return GUNNER_WEAPON_ORDER.some((weaponId) => gunnerWeaponAvailable(player, weaponId));
}

function gunnerWeaponState(player) {
  return GUNNER_WEAPON_ORDER.map((id) => {
    const weapon = GUNNER_WEAPONS[id];
    return {
      ...weapon,
      ammo: Math.max(0, Number(player?.gunnerAmmo?.[id]) || 0),
      available: gunnerWeaponAvailable(player, id)
    };
  });
}

function pushHitEffect(room, target, hitZone, lethal = false) {
  room.hitEffects.push({
    id: uid("hit_"),
    playerId: target.id,
    x: Math.round(target.x),
    y: Math.round(target.y),
    hitZone: hitZone === "head" ? "head" : "body",
    lethal: Boolean(lethal),
    at: now()
  });
  room.hitEffects = room.hitEffects.slice(-32);
}

// Presentation-only deduplication, scoped to the synchronous batch transaction.
// These are the actual activation emitters of the supported batch actions.
const ABILITY_BATCH_ACTIVATION_EFFECT_TYPES = new Set([
  "action-teleport", "action-heart-teleport", "gravity-accelerate", "gravity-decelerate", "gravity-storm",
  "quantum-electric-discharge", "quantum-transmutation", "quantum-temperature-cold", "quantum-temperature-hot",
  "quantum-nuclear", "quantum-nuclear-fusion", "flora", "flora-sunbeam", "flora-invisible"
]);
const abilityBatchPresentationScopes = new WeakMap();
function batchActivationEffectSuppressed(room, source, type, options = {}) {
  if (!ABILITY_BATCH_ACTIVATION_EFFECT_TYPES.has(type)) return false;
  const scope = abilityBatchPresentationScopes.get(room);
  if (!scope) return false;
  let owner = room.players.get(String(options.playerId || source.id || ""));
  // Teleport arrival is emitted with the transported actor as playerId.
  if (type === "action-teleport" && options.variant === "arrival" &&
      String(source.id || "") === scope.targetId) owner = room.players.get(scope.playerId);
  if (!owner || owner.id !== scope.playerId || owner.abilityBatchExecution !== scope.batch) return false;
  // Coordinates and generated zone IDs are deliberately excluded: they can
  // change per cast while this remains the same component on the same target.
  const target = String(options.targetId || (type === "gravity-storm" ? source.targetId : "") ||
    (type === "action-teleport" && options.variant === "arrival" ? source.id : "") || "");
  // Departure targetId is visibility metadata; preserve the old batch key so
  // adding it cannot change which teleport effects a synchronous cast keeps.
  const presentationTarget = type === "action-teleport" && options.variant !== "arrival" ? "" : target;
  const key = JSON.stringify([type, presentationTarget, options.variant || "", options.mode || "", options.effectKind || "", options.viewerId || ""]);
  if (scope.seen.has(key)) return true;
  scope.seen.add(key);
  scope.captureNextActivation = true;
  return false;
}
function retainAbilityBatchActivationEffects(room, scope) {
  // Reuse the accepted objects/IDs; do not emit another activation. Keep room
  // retention bounded and reserve one slot for the Enhance marker that follows.
  const effects = scope.activationEffects.slice(0, scope.successfulActivationCount).slice(-47);
  const ids = new Set(effects.map(effect => effect.id));
  const remaining = room.magicEffects.filter(effect => !ids.has(effect.id));
  const remainingSlots = 47 - effects.length;
  room.magicEffects = [...(remainingSlots > 0 ? remaining.slice(-remainingSlots) : []), ...effects];
}
function emitEnhanceActivation(room, player, identity) {
  if (!player || typeof identity !== "string" || !identity.trim()) return false;
  player.enhanceActivationIdentities ||= [];
  if (player.enhanceActivationIdentities.includes(identity)) return false;
  player.enhanceActivationIdentities.push(identity);
  player.enhanceActivationIdentities = player.enhanceActivationIdentities.slice(-64);
  pushMagicEffect(room, "enhance-activation", player, { playerId: player.id, variant: identity, markerCount: 1, durationMs: 1200 });
  return true;
}

function pushMagicEffect(room, type, source, options = {}) {
  if (batchActivationEffectSuppressed(room, source, type, options)) return false;
  room.magicEffects.push({
    id: uid("magic_"),
    type,
    x: Math.round(source.x),
    y: Math.round(source.y),
    radius: Number(options.radius || 0),
    targetX: Number.isFinite(options.targetX) ? Math.round(options.targetX) : null,
    targetY: Number.isFinite(options.targetY) ? Math.round(options.targetY) : null,
    playerId: String(options.playerId || source.id || ""),
    targetId: String(options.targetId || ""),
    objectId: String(options.objectId || ""),
    viewerId: String(options.viewerId || ""),
    variant: String(options.variant || ""),
    mode: String(options.mode || ""),
    effectKind: String(options.effectKind || ""),
    completionKind: String(options.completionKind || ""),
    ...(typeof options.objectCausalId === "string" && options.objectCausalId
      ? { objectCausalId: options.objectCausalId }
      : {}),
    ...(type === "flora-sunbeam" && typeof options.sunbeamCausalId === "string" && options.sunbeamCausalId
      ? { sunbeamCausalId: options.sunbeamCausalId }
      : {}),
    ...(type === "fire" && typeof options.fireCausalId === "string" && options.fireCausalId
      ? { fireCausalId: options.fireCausalId }
      : {}),
    ...(type === "gravity-storm" && typeof options.gravityStormCausalId === "string" && options.gravityStormCausalId
      ? { gravityStormCausalId: options.gravityStormCausalId }
      : {}),
    markerCount: Math.max(1, Math.floor(Number(options.markerCount) || 1)),
    durationMs: Math.max(0, Number(options.durationMs) || 0),
    ...((type === "emp" || type.startsWith("emp-")) ? {
      empPulseId: String(options.empPulseId || ""),
      resolvedEmpPulseIds: (Array.isArray(options.resolvedEmpPulseIds) ? options.resolvedEmpPulseIds : []).filter((id) => typeof id === "string" && id).slice(0, 2),
      empSourceAxis: Number.isFinite(options.empSourceAxis) ? options.empSourceAxis : 0,
      ...(typeof options.empCausalId === "string" && options.empCausalId
        ? { empCausalId: options.empCausalId }
        : {})
    } : {}),
    ...(type === "alchemy-excalibur" && options.directionWorld &&
      Number.isFinite(options.directionWorld.x) && Number.isFinite(options.directionWorld.y) &&
      options.pathEndWorld && Number.isFinite(options.pathEndWorld.x) && Number.isFinite(options.pathEndWorld.y)
      ? {
          directionWorld: { x: options.directionWorld.x, y: options.directionWorld.y },
          pathEndWorld: { x: options.pathEndWorld.x, y: options.pathEndWorld.y }
        }
      : {}),
    ...(type === "action-smartphone" && /^(?:donation-rational|donation-unjust)$/.test(String(options.variant || ""))
      ? { donationResultDelta: Math.round((Number(options.donationResultDelta) || 0) * 100) / 100 }
      : {}),
    ...(["mystery-box", "transfer-in"].includes(type) ? {
      acquisitionId: String(options.acquisitionId || ""),
      acquisitionKind: String(options.acquisitionKind || ""),
      acquisitionCredits: Math.max(0, Number(options.acquisitionCredits) || 0),
      acquisitionOriginX: Number.isFinite(options.acquisitionOriginX) ? Math.round(options.acquisitionOriginX) : null,
      acquisitionOriginY: Number.isFinite(options.acquisitionOriginY) ? Math.round(options.acquisitionOriginY) : null
    } : {}),
    at: now()
  });
  const presentationScope = abilityBatchPresentationScopes.get(room);
  if (presentationScope?.captureNextActivation) {
    presentationScope.activationEffects.push(room.magicEffects.at(-1));
    presentationScope.captureNextActivation = false;
  }
  room.magicEffects = room.magicEffects.slice(-48);
}

function pushGainAte(room, player, effectKind, options = {}) {
  if (!player || !effectKind) return;
  pushMagicEffect(room, `gain-${effectKind}`, player, {
    radius: Number(options.radius) || 82,
    playerId: player.id,
    effectKind,
    variant: String(options.variant || ""),
    markerCount: Math.max(1, Math.floor(Number(options.markerCount) || 1)),
    durationMs: Math.max(900, Number(options.durationMs) || 1500)
  });
}

function grantCredits(room, player, rawAmount, source = "") {
  const amount = Math.max(0, Math.floor(Number(rawAmount) || 0));
  if (!amount) return 0;
  const markerCount = Math.max(1, Math.floor(amount / 10));
  player.credits = (Number(player.credits) || 0) + amount;
  pushGainAte(room, player, "credits", {
    variant: source || `credits:${amount}`,
    markerCount
  });
  return amount;
}

// Gold is an instant result rather than physical inventory. Every producer
// must finish through this one function so Quantum Control and Root Hacker
// cannot drift to different payouts or leave an ingot behind.
function acquireGoldAsCredits(room, player, source = "gold-acquisition") {
  return grantCredits(room, player, GOLD_INSTANT_CREDITS, source);
}

function pushMapObjectGainAtes(room, player, effectKind, recoveredHealth = null) {
  const categories = {
    stamina: ["stamina"], credits: ["credits"], mana: ["mana"],
    acceleration: ["acceleration"], luckBoost: ["luckBoost"], overheal: ["overheal"],
    footBath: ["heal", "statusRecovery", "cooldownReduction"],
    relaxation: ["acceleration"],
    herbalRecovery: ["heal"],
    healthyMeal: ["heal", "stamina", "mana"],
    mineralWater: ["stamina"],
    fullRecovery: ["heal", "overheal"],
    decoy: ["stamina"], heal: ["heal"]
  }[effectKind] || [];
  categories.forEach((category, index) => {
    if (category === "overheal" && !(recoveredHealth > 0)) return;
    pushGainAte(room, player, category, {
      variant: `object:${effectKind}:${index}`,
      durationMs: 1450 + index * 120
    });
  });
}

function pushDoorLog(room, text) {
  room.doorLog.push({ id: uid("d_"), at: now(), text });
  room.doorLog = room.doorLog.slice(-24);
}

function pushChat(room, player, message) {
  const text = String(message || "").trim().slice(0, 180);
  if (!text) return;
  room.chat.push({
    id: uid("c_"),
    at: now(),
    playerId: player.id,
    name: player.name,
    killRate: profileKillRate(profileFor(player)),
    message: text,
    muted: Boolean(player.chatMuted)
  });
  room.chat = room.chat.slice(-60);
  const profile = profileFor(player);
  if (profile) {
    profile.messages = [...(Array.isArray(profile.messages) ? profile.messages : []), {
      at: now(),
      message: text,
      roomId: room.id
    }].slice(-500);
    profile.updatedAt = now();
    savePlayerProfiles();
  }
}

function cleanChatMessage(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 180);
}

function addPlayer(room, name, isBot = false, skinId = "hood", profileId = "") {
  const map = getMap(room);
  const index = room.players.size;
  const spawn = map.spawns[index % map.spawns.length];
  const player = {
    id: uid(isBot ? "bot_" : "p_"),
    name: cleanName(name),
    isBot,
    profileId: isBot ? "" : String(profileId || ""),
    midJoinAvailable: false,
    host: false,
    color: COLORS[index % COLORS.length],
    skinId: isBot ? "operator" : cleanSkinId(skinId),
    role: "unassigned",
    special: null,
    operatorId: "",
    operatorReady: false,
    alive: true,
    ejected: false,
    chatMuted: false,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    aimX: 0,
    aimY: 1,
    taskList: [],
    taskAutoReadyAt: 0,
    taskPresenceTaskId: "",
    taskPresenceSince: 0,
    killsThisRound: 0,
    killChainCount: 0,
    totalKills: 0,
    luminousUsed: false,
    luminousActive: false,
    lastLuminousResult: "",
    lastLuminousResultAt: 0,
    killReadyAt: 0,
    attackTargetId: "",
    attackResolveAt: 0,
    aimTargetId: "",
    aimStartedAt: 0,
    aimReadyAt: 0,
    aimExpiresAt: 0,
    aimSourceX: 0,
    aimSourceY: 0,
    aimTargetX: 0,
    aimTargetY: 0,
    aimTargetObservedX: 0,
    aimTargetObservedY: 0,
    aimTargetObservedAt: 0,
    aimTargetRelocationRevision: 0,
    aimTargetFastMovementAt: 0,
    lastAttackResult: "",
    lastAttackResultAt: 0,
    gunReadyAt: 0,
    gunnerWeapon: DEFAULT_GUNNER_WEAPON,
    gunnerAmmo: createGunnerAmmo(),
    gunFiring: false,
    gunFiringWeapon: "",
    gunFiringSince: 0,
    gunnerBurstRoundsRemaining: 0,
    gunnerBurstEnhanceLevel: 0,
    gunnerBurstGbo: false,
    gunnerBurstGboWeapon: "",
    enhanceChargeStartedAt: 0,
    enhanceChargeKind: "",
    enhanceChargeItemId: "",
    enhanceChargeId: "",
    enhanceChargeReleasedAt: 0,
    enhanceChargeAcceptedHoldMs: 0,
    gunnerLastShotAt: 0,
    gunnerReloadUntil: 0,
    gunnerReloadWeapon: "",
    unavailableGunnerWeapons: [],
    gunnerSpecialAmmoType: "",
    gunnerSpecialAmmoWeapon: "",
    gunnerSpecialAmmoRounds: 0,
    gunnerSpecialAmmoInventory: { weak: 0, penetrate: 0, shock: 0 },
    gunnerSpecialAmmoReadyAt: 0,
    gunnerSpecialAmmoBag: [],
    hoverSprintUntil: 0,
    hoverSprintReadyAt: 0,
    killCamera: null,
    gunnerSnipingActive: false,
    gunnerLastHitZone: "",
    gunnerLastHeadshotChance: 0,
    gunnerBodyHitObserved: false,
    gunnerHeadshotObserved: false,
    gunnerHeadshotVerificationRolls: [],
    gunnerAimTargetId: "",
    timedAccelerationEffects: [],
    heavyWeapons: [],
    dodgeReadyAt: 0,
    dodgeActiveUntil: 0,
    slashActiveUntil: 0,
    slashPerfectUntil: 0,
    slashPerfectReadyAt: 0,
    slashGuardInputReleased: true,
    slashDetachedGuardUntil: 0,
    teleportReadyAt: 0,
    limitBreakActive: false,
    limitBreakEndsAt: 0,
    limitBreakManaCarry: 0,
    limitBreakStacks: 0,
    fighterEnergyCharge: 0,
    fighterEnergyPeak: 0,
    fighterEnergyChargeReadyAt: 0,
    empReadyAt: 0,
    itemDisabledUntil: 0,
    slowedUntil: 0,
    taserSlowedUntil: 0,
    shockSlowedUntil: 0,
    quantumElectricSlowUntil: 0,
    gravityStormSlowUntil: 0,
    gravityStormSlowMultiplier: 1,
    lastGravityStormDamage: 0,
    sleepingUntil: 0,
    resting: false,
    unconsciousUntil: 0,
    gravityPinnedUntil: 0,
    abilityDisabledUntil: 0,
    overhealSpeedUntil: 0,
    floraInvisibleUntil: 0,
    floraMode: "heal",
    lastMysteryResult: "",
    lastMysteryResultAt: 0,
    movementMode: "idle",
    movementAccEnabled: true,
    airborneUntil: 0,
    falling: false,
    levitationEngaged: false,
    levitationManaCarry: 0,
    sharedLevitationActive: false,
    clairvoyanceActive: false,
    clairvoyanceManaCarry: 0,
    bodyHits: 0,
    overheal: 0,
    // HP is represented by the original two body layers plus current
    // overheal.  Keep the personal ceiling separately so recovery-earned
    // capacity survives later damage and battle-state serialization.
    maxHealth: 2,
    credits: 0,
    lastPassiveCreditAt: now(),
    mana: STARTING_MANA,
    maxMana: DEFAULT_MAX_MANA,
    mentalState: "理知",
    meditatingUntil: 0,
    renkiTargetMana: null,
    abilityHold: null,
    rationalFreeAbilityReadyAt: 0,
    gritCharges: 0,
    standFirmBarrierUntil: 0,
    reasonCharges: 0,
    manaAutoProtectionNext: "reason",
    shopAbilityEntitlements: [],
    shopAbilityPurchaseTransactions: [],
    lastShopPurchaseAbilityId: "",
    lastShopPurchaseSpent: 0,
    lastShopPurchaseAt: 0,
    iaiCharges: 0,
    ideaProgressStartedAt: 0,
    ideaProgressMs: 0,
    ideaProgressUpdatedAt: 0,
    ideaStage: 0,
    ideaFirstAspect: "",
    desireBias: "",
    desireBiasBag: [],
    lastDesireBias: "",
    desireRestRecoveryStartedAt: 0,
    desireRenkiRecovery: false,
    desireIdeaForfeited: false,
    truthCharges: 0,
    beautyCharges: 0,
    goodActive: false,
    ascensionStartedAt: 0,
    ascensionUntil: 0,
    objectCooldowns: {},
    objectContactUsedIds: [],
    objectLuckBonus: 0,
    objectLuckUntil: 0,
    donationLuckBonus: 0,
    stamina: MAX_STORED_STAMINA,
    maxStoredStamina: MAX_STORED_STAMINA,
    staminaUpdatedAt: now(),
    speedMultiplier: 1,
    dodgeDurationBonusMs: 0,
    warpCharges: 0,
    fireJutsuCharges: 0,
    substitutionCharges: 0,
    itemInventory: {},
    poisonStatus: null,
    burnStatus: null,
    statusImmunityFeedbackAt: 0,
    quantumMode: "nuclear-transmutation",
    quantumElectricLastTargetId: "",
    quantumElectricLastOutcome: "",
    quantumElectricLastDamage: 0,
    quantumElectricLastAt: 0,
    gravityMode: "accelerate",
    gravityTargetId: "",
    gravityTimeMode: "",
    gravityTimeTargetId: "",
    gravityTimeEndsAt: 0,
    timeKeeperEndsAt: 0,
    timeStoppedUntil: 0,
    gravityStormReadyAt: 0,
    alchemyReviveUsed: false,
    vibeCodingReadyAt: 0,
    vibeCodingCooldownMs: 0,
    manaGpuDrainCarry: 0,
    manaGpuCooldownCreditMs: 0,
    inventions: [],
    hackActive: false,
    particleCannonUntil: 0,
    particleCannonNextAt: 0,
    particleCannonPerformanceMultiplier: 1,
    hackerRootActive: false,
    hackerRootHealthSnapshot: null,
    exiled: false,
    routePartnerIds: [],
    routeSharedSince: 0,
    routeDamageReadyAt: 0,
    smartphoneUntil: 0,
    smartphoneAction: "",
    smartphoneSuspectId: "",
    smartphoneEvidenceKind: "",
    smartphoneSuspectId: "",
    luck: 0,
    emergenciesLeft: room.settings.emergencyLimit,
    inVent: false,
    ventId: "",
    nextBotActionAt: now() + 1200 + Math.floor(Math.random() * 1200),
    botTarget: null,
    botTargetUntil: 0,
    botTaskTargetId: "",
    botTaskPresenceSince: 0,
    botTaskPresenceLastTickAt: 0,
    botTaskPathFailures: 0,
    botTaskBlockedUntilById: {},
    botDeceptionPhase: "",
    botDeceptionUntil: 0,
    botDeceptionTargetId: "",
    botDeceptionStationId: "",
    botDeceptionPresenceSince: 0,
    botDeceptionCycle: 0,
    navPath: [],
    navTargetX: 0,
    navTargetY: 0,
    navCalculatedAt: 0,
    // Planning is intentionally amortised across Bots, but physical movement
    // is not.  Keep the last legal waypoint as an authoritative intent so a
    // seven-Bot match does not turn one 80ms movement step per Bot into a
    // 560ms start/stop pulse.
    botNavigationIntent: null,
    nextBotVentAt: 0,
    nextBotDefenseDecisionAt: now() + 1800 + Math.floor(Math.random() * 1800),
    botDefensePlannedAt: 0,
    botDefenseKind: "",
    botDefenseTargetId: "",
    botRetaliationTargetId: "",
    botRetaliationUntil: 0,
    botWitnessTargetId: "",
    botWitnessUntil: 0,
    botWitnessEvidenceKind: "",
    botVisibleAttackMemories: [],
    botVisibleThrowObservations: [],
    botKillDecision: null,
    botCombatPlan: "",
    botCombatPlanTargetId: "",
    botCombatPlanUpdatedAt: 0,
    botCombatPlanHoldId: "",
    botCombatPlanThrowId: "",
    botCombatPlanDeadlineAt: 0,
    nextBotClairvoyanceAt: now() + 4000 + Math.floor(Math.random() * 6000),
    botClairvoyanceUntil: 0,
    botClairvoyanceObservedUntil: 0,
    botClairvoyanceTargetId: "",
    botClairvoyanceTargetX: 0,
    botClairvoyanceTargetY: 0,
    botRetaliationTargetId: "",
    botRetaliationUntil: 0,
    botWitnessTargetId: "",
    botWitnessUntil: 0,
    botVisibleAttackMemories: [],
    heardSoundAt: 0,
    heardWaypointUntil: 0,
    heardWaypointX: 0,
    heardWaypointY: 0,
    lastSeenAt: now(),
    movementSession: "",
    movementSessionStartedAt: 0,
    lastMovementSeq: -1,
    lastMovementClock: 0,
    lastMovementReceivedAt: 0,
    lastMovementDx: 0,
    lastMovementDy: 0,
    lastMovementDash: false,
    lastMovementSlow: false,
    lastMoveAt: now()
  };
  if (isBot) room.casual = true;

  if (!room.hostId && !isBot) {
    room.hostId = player.id;
    player.host = true;
  }

  room.players.set(player.id, player);
  pushEvent(room, `${player.name} が入室しました。`);
  touch(room);
  return player;
}

function addDefaultOnlineBots(room) {
  if (room.soloMission || room.phase !== "lobby") return;
  const currentBotCount = [...room.players.values()].filter((player) => player.isBot).length;
  for (let index = currentBotCount + 1; index <= DEFAULT_ONLINE_BOT_COUNT; index += 1) {
    addPlayer(room, `Bot ${index}`, true);
  }
}

function waitingMatchmakingRoom(identityKey, mapId) {
  const timestamp = now();
  const requestedMapId = normalizeMapId(mapId);
  return [...rooms.values()]
    .filter((room) => {
      if (room.phase !== "lobby" || room.soloMission || room.matchmaking?.status !== "waiting") return false;
      if (Number(room.matchmaking.expiresAt) <= timestamp) return false;
      if (normalizeMapId(room.settings?.mapId) !== requestedMapId) return false;
      const humans = [...room.players.values()].filter((player) => !player.isBot);
      return humans.length === 1 && humans[0].moderationKey !== identityKey;
    })
    .sort((left, right) => Number(left.matchmaking.createdAt) - Number(right.matchmaking.createdAt))[0] || null;
}

function instantMatchmakingRequestId(value) {
  return String(value || "default").replace(/[^a-z0-9_-]/gi, "").slice(0, 64) || "default";
}

function instantMatchmakingKey(identityKey, requestId) {
  return `${String(identityKey || "")}::${instantMatchmakingRequestId(requestId)}`;
}

function purgeInstantMatchmakingRequests(timestamp = now()) {
  for (const [key, entry] of instantMatchmakingRequests) {
    if (entry.status === "waiting" && timestamp > entry.expiresAt) {
      clearTimeout(entry.timer);
      instantMatchmakingRequests.delete(key);
      entry.resolve(createInstantOfflineDecision(entry));
      instantMatchmakingRequests.set(key, entry);
      continue;
    }
    if (entry.status !== "waiting" && timestamp > entry.replayExpiresAt) {
      instantMatchmakingRequests.delete(key);
    }
  }
}

function instantMatchmakingPayload(room, player, requestedName, status, decision) {
  return {
    ...serialize(room, player),
    roomId: room.id,
    playerId: player.id,
    matchmaking: {
      status,
      decision,
      instant: true,
      windowMs: INSTANT_MATCHMAKING_WINDOW_MS
    },
    profile: { name: requestedName, locked: true }
  };
}

function createInstantOfflineDecision(entry) {
  // The generated-offline worker owns gameplay.  An unmatched server decision
  // must not create a room, bots, or a lobby that the client will never use.
  entry.status = "offline";
  entry.replayExpiresAt = now() + INSTANT_MATCHMAKING_WINDOW_MS;
  entry.payload = {
    ok: true,
    matchmaking: {
      status: "offline",
      decision: "offline-fallback",
      instant: true,
      windowMs: INSTANT_MATCHMAKING_WINDOW_MS
    },
    profile: { name: entry.name, locked: true }
  };
  return entry.payload;
}

// The server's single event loop makes insertion/matching atomic.  The first
// request waits at most 120ms for an already-arriving compatible human; every
// other outcome is a decision-only generated-offline handoff, never a
// fabricated online lobby.  Reusing the same request id returns the same
// promise/result.
function requestInstantMatchmaking({ identityKey, requestId, mapId, name, skinId, profileId }) {
  const timestamp = now();
  purgeInstantMatchmakingRequests(timestamp);
  const key = instantMatchmakingKey(identityKey, requestId);
  const existing = instantMatchmakingRequests.get(key);
  if (existing) {
    if (existing.mapId !== normalizeMapId(mapId)) {
      throw new ApiError(409, "同じマッチング要求IDで別のマップは選択できません。");
    }
    return existing.promise || Promise.resolve(existing.payload);
  }

  const requestedMapId = normalizeMapId(mapId);
  const candidate = [...instantMatchmakingRequests.values()]
    .filter((entry) => entry.status === "waiting" && entry.expiresAt >= timestamp)
    .filter((entry) => entry.mapId === requestedMapId && entry.identityKey !== identityKey)
    .sort((left, right) => left.createdAt - right.createdAt)[0];

  if (candidate) {
    clearTimeout(candidate.timer);
    instantMatchmakingRequests.delete(candidate.key);
    const room = createRoom(roomCode());
    room.settings.mapId = requestedMapId;
    const firstPlayer = createMatchedPlayer(room, candidate.name, candidate.skinId, candidate.profileId, candidate.identityKey);
    const secondPlayer = createMatchedPlayer(room, name, skinId, profileId, identityKey);
    room.matchmaking = { status: "matched", matchedAt: now(), instant: true };
    addDefaultOnlineBots(room);
    startGame(room);
    candidate.status = "online";
    candidate.replayExpiresAt = now() + INSTANT_MATCHMAKING_WINDOW_MS;
    candidate.payload = instantMatchmakingPayload(room, firstPlayer, candidate.name, "online", "matched");
    candidate.resolve(candidate.payload);
    instantMatchmakingRequests.set(candidate.key, candidate);
    const payload = instantMatchmakingPayload(room, secondPlayer, name, "online", "matched");
    instantMatchmakingRequests.set(key, {
      key,
      identityKey,
      mapId: requestedMapId,
      status: "online",
      replayExpiresAt: now() + INSTANT_MATCHMAKING_WINDOW_MS,
      payload,
      promise: Promise.resolve(payload)
    });
    return Promise.resolve(payload);
  }

  let resolve;
  const promise = new Promise((resolvePromise) => { resolve = resolvePromise; });
  const entry = {
    key,
    identityKey,
    mapId: requestedMapId,
    name,
    skinId,
    profileId,
    status: "waiting",
    createdAt: timestamp,
    expiresAt: timestamp + INSTANT_MATCHMAKING_WINDOW_MS,
    replayExpiresAt: 0,
    resolve,
    promise,
    timer: null,
    payload: null
  };
  entry.timer = setTimeout(() => {
    if (instantMatchmakingRequests.get(key) !== entry || entry.status !== "waiting") return;
    instantMatchmakingRequests.delete(key);
    entry.resolve(createInstantOfflineDecision(entry));
    instantMatchmakingRequests.set(key, entry);
  }, INSTANT_MATCHMAKING_WINDOW_MS);
  instantMatchmakingRequests.set(key, entry);
  return promise;
}

function cancelInstantMatchmaking(identityKey, requestId) {
  const key = instantMatchmakingKey(identityKey, requestId);
  const entry = instantMatchmakingRequests.get(key);
  if (!entry || entry.status !== "waiting") return { ok: true, cancelled: false };
  clearTimeout(entry.timer);
  instantMatchmakingRequests.delete(key);
  entry.status = "cancelled";
  entry.replayExpiresAt = now() + INSTANT_MATCHMAKING_WINDOW_MS;
  entry.payload = { ok: true, cancelled: true, matchmaking: { status: "cancelled", instant: true } };
  entry.resolve(entry.payload);
  return { ok: true, cancelled: true };
}

function createMatchedPlayer(room, name, skinId, profileId, identityKey) {
  const player = addPlayer(room, name, false, skinId, profileId);
  player.moderationKey = identityKey;
  return player;
}

function leaveRoom(room, player) {
  const playerId = player.id;
  const playerName = player.name;
  const wasHost = room.hostId === playerId;
  const orderIndex = room.operatorTurnOrder.indexOf(playerId);
  const canOpenMidJoinSlot = ["selecting", "playing", "meeting"].includes(room.phase) &&
    player.alive && !player.ejected && !player.isBot;

  if (canOpenMidJoinSlot) {
    const timestamp = now();
    player.name = "途中参加待ち";
    player.isBot = true;
    player.midJoinAvailable = true;
    player.host = false;
    player.moderationKey = "";
    player.vx = 0;
    player.vy = 0;
    player.movementMode = "idle";
    player.airborneUntil = 0;
    player.falling = false;
    setGravityLevitationEngaged(room, player, false, "leave-reset");
    player.sharedLevitationActive = false;
    player.clairvoyanceActive = false;
    player.clairvoyanceManaCarry = 0;
    player.inVent = false;
    player.ventId = "";
    player.nextBotActionAt = timestamp + 300;
    player.nextBotClairvoyanceAt = timestamp + 4000 + Math.floor(Math.random() * 6000);
    player.botClairvoyanceUntil = 0;
    player.botClairvoyanceObservedUntil = 0;
    player.botClairvoyanceTargetId = "";
    player.botClairvoyanceTargetX = player.x;
    player.botClairvoyanceTargetY = player.y;
    player.lastSeenAt = timestamp;
    clearAttackState(player);
    room.utilityViews.delete(playerId);
    if (room.meeting) delete room.meeting.votes[playerId];

    const humans = [...room.players.values()].filter((entry) => !entry.isBot);
    if (wasHost || !room.players.has(room.hostId) || room.players.get(room.hostId)?.isBot) {
      room.hostId = humans[0]?.id || null;
    }
    room.players.forEach((entry) => {
      entry.host = entry.id === room.hostId;
    });

    pushEvent(room, `${playerName} が退出しました。途中参加枠を開放しました。`);
    if (room.phase === "selecting") advanceOperatorTurn(room);
    if (room.phase === "meeting") maybeEndMeeting(room);
    touch(room);
    return { roomDeleted: false, newHostId: room.hostId || "", midJoinOpen: true };
  }

  room.players.delete(playerId);
  room.utilityViews.delete(playerId);
  room.bodies = room.bodies.filter((body) => body.playerId !== playerId);

  if (orderIndex >= 0) {
    room.operatorTurnOrder.splice(orderIndex, 1);
    if (orderIndex < room.operatorTurnIndex) room.operatorTurnIndex -= 1;
  }

  if (room.meeting) {
    delete room.meeting.votes[playerId];
    for (const [voterId, targetId] of Object.entries(room.meeting.votes)) {
      if (targetId === playerId) room.meeting.votes[voterId] = "skip";
    }
  }

  const humans = [...room.players.values()].filter((entry) => !entry.isBot);
  const hasMidJoinSlot = [...room.players.values()].some((entry) => entry.midJoinAvailable);
  if (humans.length === 0 && !hasMidJoinSlot) {
    rooms.delete(room.id);
    return { roomDeleted: true, newHostId: "" };
  }

  if (wasHost || !room.players.has(room.hostId)) room.hostId = humans[0]?.id || null;
  room.players.forEach((entry) => {
    entry.host = entry.id === room.hostId;
  });

  pushEvent(room, `${playerName} が退出しました。`);
  if (room.phase === "selecting") advanceOperatorTurn(room);
  if (room.phase === "meeting") maybeEndMeeting(room);
  checkWin(room);
  touch(room);
  return { roomDeleted: false, newHostId: room.hostId || "", midJoinOpen: false };
}

function availableMidJoinSlot(room) {
  return [...room.players.values()].find((entry) => (
    entry.midJoinAvailable && entry.alive && !entry.ejected
  )) || null;
}

function claimMidJoinSlot(room, player, name, skinId = "hood") {
  player.name = cleanName(name);
  player.isBot = false;
  player.skinId = cleanSkinId(skinId);
  player.midJoinAvailable = false;
  player.host = false;
  player.vx = 0;
  player.vy = 0;
  player.movementMode = "idle";
  player.nextBotActionAt = now() + 1200;
  player.lastSeenAt = now();
  if (room.meeting) delete room.meeting.votes[player.id];

  const currentHost = room.players.get(room.hostId);
  if (!currentHost || currentHost.isBot) room.hostId = player.id;
  room.players.forEach((entry) => {
    entry.host = entry.id === room.hostId;
  });
  pushEvent(room, `${player.name} が途中参加しました。`);
  touch(room);
  return player;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function assignTasks(map, count) {
  const downloads = map.stations.filter((station) => station.type === "task" && station.task === "download");
  const uploads = map.stations.filter((station) => station.type === "task" && station.task === "upload");
  const total = Math.max(6, Math.min(Math.floor(count), 30));
  const pools = {
    download: shuffle(downloads),
    upload: shuffle(uploads)
  };
  const typeCounts = { download: 0, upload: 0 };
  const tasks = [];

  for (let index = 0; index < total; index += 1) {
    const preferredType = index % 2 === 0 ? "download" : "upload";
    const type = pools[preferredType].length ? preferredType : preferredType === "download" ? "upload" : "download";
    const pool = pools[type];
    if (!pool.length) break;
    const typeIndex = typeCounts[type];
    const station = pool[typeIndex % pool.length];
    typeCounts[type] += 1;
    tasks.push({
      id: uid("task_"),
      type,
      label: `${TASK_LABELS[type] || station.label} ${typeCounts[type]}`,
      stationId: station.id,
      done: false
    });
  }

  return tasks;
}

function startGame(room) {
  const players = [...room.players.values()];
  if (players.length < 2) {
    throw new ApiError(400, "2人以上で開始できます。Bot追加でも開始できます。");
  }

  const map = getMap(room);
  const timestamp = now();
  // A new round owns a fresh Bot operational clock, even if the offline room
  // was reused by the operator-selection flow.
  room.soloHumanDeathBotTimeScale = 1;
  room.soloHumanDeathBotTimeScaleActive = false;
  room.soloHumanDeathBotTimeScaleActivatedAt = 0;
  const attackerCount = Math.max(1, Math.min(players.length - 1, Math.floor(room.settings.attackerCount)));
  room.killRateAttackerTarget = Math.max(1, Math.ceil((players.length - attackerCount) / attackerCount));
  const ordered = shuffle(players);
  const host = room.players.get(room.hostId);
  let attackerPlayers = ordered.slice(0, attackerCount);
  if (room.settings.hostTeam === "attacker" && host) {
    attackerPlayers = [host, ...ordered.filter((player) => player.id !== host.id)].slice(0, attackerCount);
  } else if (room.settings.hostTeam === "defender" && host) {
    attackerPlayers = ordered.filter((player) => player.id !== host.id).slice(0, attackerCount);
  }
  // Human attackers have no allied attacker Bots; displaced Bots remain defenders.
  if (attackerPlayers.some((player) => !player.isBot)) attackerPlayers = attackerPlayers.filter((player) => !player.isBot);
  const attackers = new Set(attackerPlayers.map((player) => player.id));

  players.forEach((player, index) => {
    const spawn = map.spawns[index % map.spawns.length];
    player.role = attackers.has(player.id) ? "attacker" : "defender";
    player.midJoinAvailable = false;
    player.special = null;
    player.operatorId = "";
    player.operatorReady = false;
    player.alive = true;
    player.ejected = false;
    player.botMatchEliminatedById = "";
    player.chatMuted = false;
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.aimX = 0;
    player.aimY = 1;
    player.taskList = [];
    player.taskAutoReadyAt = 0;
    player.taskPresenceTaskId = "";
    player.taskPresenceSince = 0;
    player.killsThisRound = 0;
    player.killChainCount = 0;
    player.totalKills = 0;
    player.luminousUsed = false;
    player.luminousActive = false;
    player.lastLuminousResult = "";
    player.lastLuminousResultAt = 0;
    player.killReadyAt = 0;
    clearAttackState(player);
    player.lastAttackResult = "";
    player.lastAttackResultAt = 0;
    player.gunReadyAt = 0;
    player.gunnerWeapon = DEFAULT_GUNNER_WEAPON;
    player.gunnerAmmo = createGunnerAmmo();
    player.gunFiring = false;
    player.gunFiringWeapon = "";
    player.gunFiringSince = 0;
    player.gunnerBurstRoundsRemaining = 0;
    player.gunnerBurstEnhanceLevel = 0;
    player.gunnerBurstGbo = false;
    player.gunnerBurstGboWeapon = "";
    player.gunnerLastShotAt = 0;
    player.gunnerReloadUntil = 0;
    player.gunnerReloadWeapon = "";
    player.unavailableGunnerWeapons = [];
    player.gunnerSpecialAmmoType = "";
    player.gunnerSpecialAmmoWeapon = "";
    player.gunnerSpecialAmmoRounds = 0;
    player.gunnerSpecialAmmoInventory = { weak: 0, penetrate: 0, shock: 0 };
    player.gunnerSpecialAmmoReadyAt = 0;
    player.gunnerSpecialAmmoBag = [];
    player.hoverSprintUntil = 0;
    player.hoverSprintReadyAt = 0;
    player.killCamera = null;
    player.gunnerSnipingActive = false;
    player.gunnerLastHitZone = "";
    player.gunnerLastHeadshotChance = 0;
    player.gunnerBodyHitObserved = false;
    player.gunnerHeadshotObserved = false;
    player.gunnerHeadshotVerificationRolls = [];
    player.gunnerAimTargetId = "";
    player.timedAccelerationEffects = [];
    player.heavyWeapons = [];
    player.dodgeReadyAt = 0;
    player.dodgeActiveUntil = 0;
    player.slashActiveUntil = 0;
    player.slashPerfectUntil = 0;
    player.slashPerfectReadyAt = 0;
    player.slashDetachedGuardUntil = 0;
    player.slashGuardInputReleased = true;
    player.teleportReadyAt = 0;
    player.limitBreakActive = false;
    player.limitBreakEndsAt = 0;
    player.limitBreakManaCarry = 0;
    player.limitBreakStacks = 0;
    player.fighterEnergyCharge = 0;
    player.fighterEnergyPeak = 0;
    player.fighterEnergyChargeReadyAt = 0;
    player.empReadyAt = 0;
    player.itemDisabledUntil = 0;
    player.slowedUntil = 0;
    player.taserSlowedUntil = 0;
    player.shockSlowedUntil = 0;
    player.quantumElectricSlowUntil = 0;
    player.gravityStormSlowUntil = 0;
    player.gravityStormSlowMultiplier = 1;
    player.lastGravityStormDamage = 0;
    player.sleepingUntil = 0;
    player.resting = false;
    player.unconsciousUntil = 0;
    player.gravityPinnedUntil = 0;
    player.abilityDisabledUntil = 0;
    player.overhealSpeedUntil = 0;
    player.floraInvisibleUntil = 0;
    player.floraMode = "heal";
    // Ability entitlements and grant presentation belong to this match only.
    player.shopAbilityEntitlements = [];
    player.shopAbilityPurchaseTransactions = [];
    player.lastShopPurchaseAbilityId = "";
    player.lastShopPurchaseSpent = 0;
    player.lastShopPurchaseAt = 0;
    player.lastMysteryBoxReward = "";
    player.lastMysteryBoxRewardAt = 0;
    player.lastMysteryReveal = null;
    delete player.shopAbilityExecutionOperator;
    player.lastMysteryResult = "";
    player.lastMysteryResultAt = 0;
    player.movementMode = "idle";
    player.movementAccEnabled = true;
    player.airborneUntil = 0;
    player.falling = false;
    setGravityLevitationEngaged(room, player, false, "battle-reset");
    player.sharedLevitationActive = false;
    player.clairvoyanceActive = false;
    player.clairvoyanceManaCarry = 0;
    player.bodyHits = 0;
    player.overheal = 0;
    player.maxHealth = 2;
    player.credits = 0;
    player.lastPassiveCreditAt = timestamp;
    player.mana = STARTING_MANA;
    player.maxMana = DEFAULT_MAX_MANA;
    player.mentalState = "理知";
    player.meditatingUntil = 0;
    player.renkiTargetMana = null;
    player.renkiCompletionKind = "";
    player.abilityHold = null;
    player.rationalFreeAbilityReadyAt = 0;
    player.gritCharges = 0;
    player.standFirmBarrierUntil = 0;
    player.reasonCharges = 0;
    player.manaAutoProtectionNext = "reason";
    player.iaiCharges = 0;
    player.ideaProgressStartedAt = 0;
    player.ideaProgressMs = 0;
    player.ideaProgressUpdatedAt = 0;
    player.ideaStage = 0;
    player.ideaFirstAspect = "";
    player.desireBias = "";
    player.desireRestRecoveryStartedAt = 0;
    player.desireRenkiRecovery = false;
    player.desireIdeaForfeited = false;
    player.truthCharges = 0;
    player.beautyCharges = 0;
    player.goodActive = false;
    player.ascensionStartedAt = 0;
    player.ascensionUntil = 0;
    player.gravityMode = "accelerate";
    player.gravityTargetId = "";
    player.gravityTimeMode = "";
    player.gravityTimeTargetId = "";
    player.gravityTimeEndsAt = 0;
    player.timeKeeperEndsAt = 0;
    player.timeStoppedUntil = 0;
    player.gravityStormReadyAt = 0;
    player.alchemyReviveUsed = false;
    player.vibeCodingReadyAt = 0;
    player.vibeCodingCooldownMs = 0;
    player.manaGpuDrainCarry = 0;
    player.manaGpuCooldownCreditMs = 0;
    player.inventions = [];
    player.hackActive = false;
    player.particleCannonUntil = 0;
    player.particleCannonNextAt = 0;
    player.particleCannonPerformanceMultiplier = 1;
    player.hackerRootActive = false;
    player.hackerRootHealthSnapshot = null;
    player.exiled = false;
    player.routePartnerIds = [];
    player.routeSharedSince = 0;
    player.routeDamageReadyAt = 0;
    player.smartphoneUntil = 0;
    player.smartphoneAction = "";
    player.smartphoneSuspectId = "";
    player.smartphoneEvidenceKind = "";
    player.smartphoneSuspectId = "";
    player.luck = 1;
    player.objectCooldowns = {};
    player.objectContactUsedIds = [];
    player.objectLuckBonus = 0;
    player.objectLuckUntil = 0;
    player.donationLuckBonus = 0;
    player.stamina = MAX_STORED_STAMINA;
    player.maxStoredStamina = MAX_STORED_STAMINA;
    player.staminaUpdatedAt = timestamp;
    player.speedMultiplier = 1;
    player.dodgeDurationBonusMs = 0;
    player.warpCharges = 0;
    player.fireJutsuCharges = 0;
    player.substitutionCharges = 0;
    player.itemInventory = {};
    player.poisonStatus = null;
    player.burnStatus = null;
    player.statusImmunityFeedbackAt = 0;
    player.quantumMode = "nuclear-transmutation";
    player.quantumElectricLastTargetId = "";
    player.quantumElectricLastOutcome = "";
    player.quantumElectricLastDamage = 0;
    player.quantumElectricLastAt = 0;
    player.emergenciesLeft = room.settings.emergencyLimit;
    player.inVent = false;
    player.ventId = "";
    player.nextBotActionAt = timestamp + 1000 + Math.floor(Math.random() * 2000);
    player.botTaskTargetId = "";
    player.botTaskPresenceSince = 0;
    player.botTaskPresenceLastTickAt = 0;
    player.botTaskPathFailures = 0;
    player.botTaskBlockedUntilById = {};
    player.botDeceptionPhase = "";
    player.botDeceptionUntil = 0;
    player.botDeceptionTargetId = "";
    player.botDeceptionStationId = "";
    player.botDeceptionPresenceSince = 0;
    player.botDeceptionCycle = 0;
    player.botTarget = null;
    player.botTargetUntil = 0;
    player.navPath = [];
    player.navTargetX = 0;
    player.navTargetY = 0;
    player.navCalculatedAt = 0;
    player.botNavigationIntent = null;
    player.nextBotVentAt = 0;
    player.nextBotDefenseDecisionAt = timestamp + 1800 + Math.floor(Math.random() * 1800);
    player.botDefensePlannedAt = 0;
    player.botDefenseKind = "";
    player.botDefenseTargetId = "";
    player.botRetaliationTargetId = "";
    player.botRetaliationUntil = 0;
    player.botWitnessTargetId = "";
    player.botWitnessUntil = 0;
    player.botWitnessEvidenceKind = "";
    player.botVisibleAttackMemories = [];
    player.botVisibleThrowObservations = [];
    player.botKillDecision = null;
    clearBotCombatPlan(player);
    player.nextBotClairvoyanceAt = timestamp + 4000 + Math.floor(Math.random() * 6000);
    player.botClairvoyanceUntil = 0;
    player.botClairvoyanceObservedUntil = 0;
    player.botClairvoyanceTargetId = "";
    player.botClairvoyanceTargetX = player.x;
    player.botClairvoyanceTargetY = player.y;
    player.botRetaliationTargetId = "";
    player.botRetaliationUntil = 0;
    player.botWitnessTargetId = "";
    player.botWitnessUntil = 0;
    player.botWitnessEvidenceKind = "";
    player.botVisibleAttackMemories = [];
    player.botVisibleThrowObservations = [];
    player.heardSoundAt = 0;
    player.heardWaypointUntil = 0;
    player.heardWaypointX = 0;
    player.heardWaypointY = 0;
    // A new match must not integrate an input interval from the preceding body.
    // Keep the session/sequence identity so the client's next packet is accepted immediately.
    clearStoredMovementInput(player, timestamp);
    player.lastMoveAt = timestamp;
  });

  room.phase = "selecting";
  room.round = 0;
  room.bodies = [];
  room.hitEffects = [];
  room.magicEffects = [];
  room.hazardFields = [];
  room.thrownItems = [];
  room.groundItems = [];
  room.chat = [];
  room.events = [];
  room.sounds = [];
  room.meeting = null;
  room.battleStartedAt = 0;
  room.quantumEndgameAt = 0;
  room.preparationEndsAt = 0;
  room.operatorSelectEndsAt = 0;
  room.operatorTurnOrder = [
    room.hostId,
    ...players.filter((player) => player.id !== room.hostId && !player.isBot).map((player) => player.id),
    ...players.filter((player) => player.id !== room.hostId && player.isBot).map((player) => player.id)
  ].filter(Boolean);
  room.operatorTurnIndex = 0;
  room.winner = null;
      room.resultProfileApplied = false;
      room.resultBoardCommitted = false;
      room.resultBoardByPlayerId = {};
  room.finishReason = "";
  setIdeaWinnerIds(room, []);
  room.pendingIdeaVictoryAt = 0;
  room.ideaVictoryArrivalAt = 0;
  room.activeEmps = [];
  room.utilityViews.clear();
  room.doorLog = [];

  pushEvent(room, "オペレーター選択開始。選択後にバトルフェーズへ進みます。");
  advanceOperatorTurn(room);
  touch(room);
}

function allOperators() {
  // A role is a match-side assignment, not an operator catalog. Keep one
  // canonical card per special so Witch (and future shared operators) cannot
  // appear twice in the selection menu while remaining selectable by either
  // side.
  const unique = new Map();
  for (const operator of [...OPERATORS.defender, ...OPERATORS.attacker]) {
    if (!unique.has(operator.special)) unique.set(operator.special, operator);
  }
  return [...unique.values()];
}

function operatorFor(_role, operatorId, operatorSpecial = "") {
  const requestedId = String(operatorId || "");
  const requestedSpecial = String(operatorSpecial || "");
  return allOperators().find((operator) => (
    operator.id === requestedId ||
    (requestedSpecial && operator.special === requestedSpecial)
  )) || null;
}

function operatorTakenCount(room, operatorId, exceptPlayerId = "") {
  return [...room.players.values()].filter((player) => player.id !== exceptPlayerId && player.operatorId === operatorId).length;
}

function canSelectOperator(room, player, operator) {
  if (!operator) return false;
  return operatorTakenCount(room, operator.id, player.id) < operator.limit;
}

function selectOperator(room, player, operatorId, operatorSpecial = "") {
  if (room.phase !== "selecting") throw new ApiError(400, "いまはオペレーター選択中ではありません。");
  const turnPlayer = currentOperatorPlayer(room);
  if (!turnPlayer || turnPlayer.id !== player.id) {
    throw new ApiError(409, "まだあなたの選択順ではありません。");
  }
  const operator = operatorFor(player.role, operatorId, operatorSpecial);
  if (!canSelectOperator(room, player, operator)) {
    throw new ApiError(400, "そのオペレーターは選択できません。");
  }
  player.operatorId = operator.id;
  player.operatorReady = true;
  player.special = operator.special;
  pushEvent(room, `${player.name} が ${operator.name} を選択しました。`);
  room.operatorTurnIndex += 1;
  advanceOperatorTurn(room);
  touch(room);
}

function autoPickOperator(room, player) {
  const choices = allOperators().filter((operator) => !(
    operator.special === "alchemist" &&
    botSharesTeamWithHuman(room, player)
  ));
  const specialChoices = choices.filter((operator) => operator.special && canSelectOperator(room, player, operator));
  const preferred = specialChoices[Math.floor(Math.random() * specialChoices.length)];
  const fallback = choices.find((operator) => canSelectOperator(room, player, operator));
  const operator = preferred || fallback;
  if (!operator) return;
  player.operatorId = operator.id;
  player.operatorReady = true;
  player.special = operator.special;
}

function allOperatorsReady(room) {
  return [...room.players.values()].every((player) => player.operatorReady && player.operatorId);
}

function currentOperatorPlayer(room) {
  while (room.operatorTurnIndex < room.operatorTurnOrder.length) {
    const player = room.players.get(room.operatorTurnOrder[room.operatorTurnIndex]);
    if (player && !player.operatorReady) return player;
    room.operatorTurnIndex += 1;
  }
  return null;
}

function advanceOperatorTurn(room) {
  if (room.phase !== "selecting") return;
  let player = currentOperatorPlayer(room);
  while (player?.isBot) {
    autoPickOperator(room, player);
    pushEvent(room, `${player.name} がオペレーターを自動選択しました。`);
    room.operatorTurnIndex += 1;
    player = currentOperatorPlayer(room);
  }
  if (!player) {
    startBattle(room);
    return;
  }
  // Offline operator selection is deliberate and has no automatic timeout.
  room.operatorSelectEndsAt = room.matchmaking?.status === "offline"
    ? 0
    : now() + OPERATOR_SELECT_MS;
}

function startBattle(room) {
  if (room.phase !== "selecting") return;
  const map = getMap(room);
  const timestamp = now();
  for (const player of room.players.values()) {
    if (!player.operatorReady) autoPickOperator(room, player);
    player.taskList = player.role === "defender" ? assignTasks(map, room.settings.taskCount) : [];
    player.taskAutoReadyAt = 0;
    player.taskPresenceTaskId = "";
    player.taskPresenceSince = 0;
    // Operator selection may have lasted arbitrarily long; discard only the old
    // elapsed-direction history while preserving the live packet session.
    clearStoredMovementInput(player, timestamp);
    player.killsThisRound = 0;
    player.killChainCount = 0;
    player.killReadyAt = canUseKill(player) ? timestamp + killCooldownDurationMs(room, player) : 0;
    // One initial Ninjutsu preparation is human-only; later values remain ordinary cooldowns.
    player.ninjutsuOpeningKillReadyAt = !player.isBot && canUseKill(player) ? player.killReadyAt : 0;
    clearAttackState(player);
    player.lastAttackResult = "";
    player.lastAttackResultAt = 0;
    player.gunReadyAt = 0;
    player.gunnerWeapon = DEFAULT_GUNNER_WEAPON;
    player.gunnerAmmo = createGunnerAmmo();
    player.gunFiring = false;
    player.gunFiringWeapon = "";
    player.gunFiringSince = 0;
    player.gunnerBurstRoundsRemaining = 0;
    player.gunnerBurstEnhanceLevel = 0;
    player.gunnerBurstGbo = false;
    player.gunnerBurstGboWeapon = "";
    player.gunnerLastShotAt = 0;
    player.gunnerReloadUntil = 0;
    player.gunnerReloadWeapon = "";
    player.unavailableGunnerWeapons = [];
    player.dodgeReadyAt = 0;
    player.dodgeActiveUntil = 0;
    player.slashActiveUntil = 0;
    player.slashPerfectUntil = 0;
    player.slashPerfectReadyAt = 0;
    player.slashDetachedGuardUntil = 0;
    player.slashGuardInputReleased = true;
    player.teleportReadyAt = 0;
    player.limitBreakActive = false;
    player.limitBreakEndsAt = 0;
    player.limitBreakManaCarry = 0;
    player.limitBreakStacks = 0;
    player.fighterEnergyCharge = 0;
    player.fighterEnergyPeak = 0;
    player.fighterEnergyChargeReadyAt = timestamp + FIGHTER_ENERGY_PASSIVE_INTERVAL_MS;
    player.manaGpuCooldownCreditMs = 0;
    player.manaGpuDrainCarry = 0;
    player.empReadyAt = 0;
    player.itemDisabledUntil = 0;
    player.lastPassiveCreditAt = timestamp;
    player.slowedUntil = 0;
    player.taserSlowedUntil = 0;
    player.shockSlowedUntil = 0;
    player.quantumElectricSlowUntil = 0;
    player.gravityStormSlowUntil = 0;
    player.gravityStormSlowMultiplier = 1;
    player.lastGravityStormDamage = 0;
    player.sleepingUntil = 0;
    player.resting = false;
    player.unconsciousUntil = 0;
    player.gravityPinnedUntil = 0;
    player.abilityDisabledUntil = 0;
    player.overhealSpeedUntil = 0;
    player.floraInvisibleUntil = 0;
    player.hoverSprintUntil = 0;
    player.hoverSprintReadyAt = 0;
    player.killCamera = null;
    player.gunnerSnipingActive = false;
    player.gunnerLastHitZone = "";
    player.gunnerLastHeadshotChance = 0;
    player.gunnerBodyHitObserved = false;
    player.gunnerHeadshotObserved = false;
    player.gunnerHeadshotVerificationRolls = [];
    player.gunnerAimTargetId = "";
    player.timedAccelerationEffects = [];
    player.particleCannonPerformanceMultiplier = 1;
    player.lastMysteryResult = "";
    player.lastMysteryResultAt = 0;
    player.movementMode = "idle";
    player.bodyHits = 0;
    player.overheal = 0;
    player.maxHealth = 2;
    player.stamina = MAX_STORED_STAMINA;
    player.mana = STARTING_MANA;
    player.maxStoredStamina = MAX_STORED_STAMINA;
    player.maxMana = DEFAULT_MAX_MANA;
    player.mentalState = "理知";
    player.meditatingUntil = 0;
    player.renkiTargetMana = null;
    player.renkiCompletionKind = "";
    player.abilityHold = null;
    player.rationalFreeAbilityReadyAt = 0;
    player.gritCharges = 0;
    player.standFirmBarrierUntil = 0;
    player.reasonCharges = 0;
    player.manaAutoProtectionNext = "reason";
    player.iaiCharges = 0;
    player.ideaProgressStartedAt = 0;
    player.ideaProgressMs = 0;
    player.ideaProgressUpdatedAt = 0;
    player.ideaStage = 0;
    player.ideaFirstAspect = "";
    player.desireBias = "";
    player.desireRestRecoveryStartedAt = 0;
    player.desireRenkiRecovery = false;
    player.desireIdeaForfeited = false;
    player.truthCharges = 0;
    player.beautyCharges = 0;
    player.goodActive = false;
    player.ascensionStartedAt = 0;
    player.ascensionUntil = 0;
    player.staminaUpdatedAt = timestamp;
    player.itemInventory = player.special === "quantum"
      ? createItemInventory(QUANTUM_STARTING_ITEMS)
      : player.special === "gunner"
        ? createItemInventory(GUNNER_STARTING_ITEMS)
        : createItemInventory(player.itemInventory);
    if (player.special === "fighter" && itemCount(player, "orichalcum-sword") <= 0) {
      addItem(player, "orichalcum-sword");
    }
    initializeDurableCombat(player, timestamp, true);
    player.poisonStatus = null;
    player.burnStatus = null;
    player.statusImmunityFeedbackAt = 0;
    player.quantumMode = "nuclear-transmutation";
    player.quantumElectricLastTargetId = "";
    player.quantumElectricLastOutcome = "";
    player.quantumElectricLastDamage = 0;
    player.quantumElectricLastAt = 0;
    player.emergenciesLeft = room.settings.emergencyLimit;
    player.lastMoveAt = timestamp;
    // Every Bot receives an opening decision slot without waiting for a human
    // movement packet. Stagger only within one normal Bot cadence so this is a
    // cover/navigation start, never a combat-speed multiplier.
    if (player.isBot) player.nextBotActionAt = timestamp + stableBotHash(`${player.id}:opening-cover`) % BOT_TICK_MS;
  }
  room.phase = "playing";
  for (const player of room.players.values()) advanceLimitBreak(room, player, 0);
  room.canonicalKillVictimIds = new Set();
  room.round = 1;
  room.battleStartedAt = timestamp;
  room.quantumEndgameAt = timestamp + QUANTUM_ENDGAME_DELAY_MS;
  room.preparationEndsAt = timestamp + PREPARATION_PHASE_MS;
  room.mysteryBoxes = [];
  replenishMysteryBoxes(room);
  room.operatorSelectEndsAt = 0;
  room.operatorTurnOrder = [];
  room.operatorTurnIndex = 0;
  pushEvent(room, "バトルフェーズ開始。ディフェンダーはタスク、アタッカーはキルを狙ってください。");
  touch(room);
}

function createSoloMissionRoom(missionId, name, skinId, profileId = "") {
  const mission = SOLO_MISSIONS[missionId];
  if (!mission) throw new ApiError(404, "ソロ訓練が見つかりません。");
  const room = createRoom(`S${roomCode()}`);
  room.soloMission = {
    id: mission.id,
    playerId: "",
    startedAt: 0,
    completed: false,
    taskCount: 0,
    defenseActivatedAt: 0,
    empCancelled: false,
    empAmplified: false,
    empTrainingOutcomes: [],
    hintUnlocked: false,
    cpuPhase: "accelerate-1",
    cpuRenkiCount: 0,
    cpuBotId: "",
    cpuElementIndex: 0
  };
  room.settings = {
    ...room.settings,
    hostTeam: mission.team,
    attackerCount: mission.attackerCount,
    taskCount: mission.taskCount,
    killCooldown: 8,
    votingTime: 60
  };
  const player = addPlayer(room, name, false, skinId, profileId);
  room.hostId = player.id;
  player.host = true;
  room.soloMission.playerId = player.id;
  for (let index = 0; index < mission.botCount; index += 1) {
    addPlayer(room, `訓練Bot ${index + 1}`, true);
  }
  startGame(room);
  selectOperator(room, player, mission.operatorId);
  if (mission.metric === "cpu" || mission.metric === "cpu2") {
    const cpu = [...room.players.values()].find((candidate) => candidate.isBot && candidate.role === "attacker");
    if (cpu) {
      cpu.operatorId = mission.metric === "cpu2" ? "attacker-alchemist" : "defender-teleport";
      cpu.operatorReady = true;
      cpu.special = mission.metric === "cpu2" ? "alchemist" : "teleport";
      cpu.mana = STARTING_MANA;
      cpu.maxMana = DEFAULT_MAX_MANA;
      cpu.rationalFreeAbilityReadyAt = Infinity;
      room.soloMission.cpuBotId = cpu.id;
    }
  }
  room.soloMission.startedAt = room.battleStartedAt || now();
  if (mission.metric === "task") {
    player.stamina = MAX_STORED_STAMINA;
    player.maxStoredStamina = MAX_STORED_STAMINA;
    player.staminaUpdatedAt = now();
  }
  for (const bot of room.players.values()) {
    if (bot.isBot) bot.nextBotActionAt = now() + 30_000;
  }
  if (mission.metric === "cpu" || mission.metric === "cpu2") {
    const cpu = room.players.get(room.soloMission.cpuBotId);
    if (cpu) cpu.nextBotActionAt = now();
  }
  if (mission.id === "emp") {
    for (const bot of room.players.values()) {
      if (!bot.isBot) continue;
      bot.nextBotActionAt = now();
      bot.empReadyAt = 0;
    }
  }
  pushEvent(room, `ソロ訓練「${mission.name}」開始: ${mission.objective}`);
  touch(room);
  return { room, player };
}
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function actionBlockedUntil(player) {
  return Math.max(
    Number(player.unconsciousUntil) || 0,
    Number(player.damageReactionUntil) || 0,
    Number(player.meditatingUntil) || 0,
    Number(player.smartphoneUntil) || 0,
    Number(player.gravityPinnedUntil) || 0,
    Number(player.ascensionUntil) || 0,
    Number(player.timeStoppedUntil) || 0
  );
}

function sensoryBlockedUntil(player) {
  return Number(player.unconsciousUntil) || 0;
}

function ensureConscious(player) {
  const timestamp = now();
  const blockedUntil = actionBlockedUntil(player);
  if (blockedUntil <= timestamp) return;
  if (blockedUntil === Number(player.damageReactionUntil)) throw new ApiError(400, "被弾硬直中です。");
  const label = (player.ascensionUntil || 0) > timestamp
    ? "昇天演出が終わる"
    : (player.timeStoppedUntil || 0) > timestamp
      ? "時間停止が解ける"
    : (player.meditatingUntil || 0) > timestamp
      ? "精神統一が終わる"
    : (player.sleepingUntil || 0) > timestamp
      ? "休息が終わる"
    : (player.gravityPinnedUntil || 0) > timestamp
      ? "重力拘束が解ける"
      : "意識が戻る";
  throw new ApiError(400, `${label}まで${Math.ceil((blockedUntil - timestamp) / 1000)}秒です。`);
}

function ensureAbilityAvailable(player) {
  ensureConscious(player);
  if ((player.abilityDisabledUntil || 0) > now()) {
    throw new ApiError(400, `能力封印中です（残り${Math.ceil((player.abilityDisabledUntil - now()) / 1000)}秒）。`);
  }
}

const ABILITY_BATCH_ACTION_PATHS = new Set([
  "/api/renki",
  "/api/teleport",
  "/api/gravity-time",
  "/api/gravity-storm",
  "/api/quantum-control",
  "/api/flora-heal",
  "/api/borrowed-ability"
]);

function abilityBatchUnitManaCost(actionPath, rawAction = {}) {
  const action = rawAction && typeof rawAction === "object" ? rawAction : {};
  const path = String(actionPath || "");
  const mode = normalizeQuantumMode(String(action.mode || ""));
  if (path === "/api/renki") return 0;
  if (path === "/api/teleport") {
    if (String(action.mode || "") !== "heart") return null;
    return HEART_TELEPORT_MANA_COST;
  }
  if (path === "/api/gravity-time") {
    return ["accelerate", "decelerate"].includes(String(action.mode || "")) ? ABILITY_MANA_COST : null;
  }
  if (path === "/api/gravity-storm") return GRAVITY_STORM_MANA_COST;
  if (path === "/api/quantum-control") {
    if (!["kinetic-accelerate", "kinetic-decelerate", "nuclear-transmutation", "nuclear-fission", "nuclear-fusion", "electric-discharge"].includes(mode)) return null;
    if (mode === "electric-discharge") return QUANTUM_ELECTRIC_MANA_COST;
    return ["nuclear-fission", "nuclear-fusion"].includes(mode) ? QUANTUM_NUCLEAR_MANA_COST : ABILITY_MANA_COST;
  }
  if (path === "/api/flora-heal") {
    return String(action.mode || "heal") === "sunbeam"
      ? FLORA_SUNBEAM_MANA_COST
      : String(action.mode || "heal") === "invisible"
        ? FLORA_INVISIBLE_MANA_COST
        : FLORA_MANA_COST;
  }
  if (path !== "/api/borrowed-ability") return null;
  const ability = String(action.ability || "");
  if (ability === "flora") {
    return String(action.mode || "heal") === "sunbeam"
      ? FLORA_SUNBEAM_MANA_COST
      : String(action.mode || "heal") === "invisible"
        ? FLORA_INVISIBLE_MANA_COST
        : FLORA_MANA_COST;
  }
  if (ability === "quantum") {
    if (!["kinetic-accelerate", "kinetic-decelerate", "nuclear-transmutation", "nuclear-fission", "nuclear-fusion", "electric-discharge"].includes(mode)) return null;
    if (mode === "electric-discharge") return QUANTUM_ELECTRIC_MANA_COST;
    return ["nuclear-fission", "nuclear-fusion"].includes(mode) ? QUANTUM_NUCLEAR_MANA_COST : ABILITY_MANA_COST;
  }
  if (ability !== "gravity") return null;
  const gravityMode = String(action.mode || "");
  if (gravityMode === "heart") {
    return HEART_TELEPORT_MANA_COST;
  }
  if (["accelerate", "decelerate"].includes(gravityMode)) return ABILITY_MANA_COST;
  // Time Keeper deliberately has no ability-batch unit: a hold may never
  // fan a room-wide stop out into multiple casts.
  if (gravityMode === "time-keeper") return null;
  if (gravityMode === "storm") return GRAVITY_STORM_MANA_COST;
  return null;
}

function startAbilityHold(room, player, rawActionPath, rawHoldId = "", rawAction = {}) {
  if (room.phase !== "playing" || !player?.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在は能力長押しを開始できません。");
  }
  ensureAbilityAvailable(player);
  const actionPath = String(rawActionPath || "");
  if (!ABILITY_BATCH_ACTION_PATHS.has(actionPath)) throw new ApiError(400, "能力長押しの対象が不正です。");
  const unitManaCost = abilityBatchUnitManaCost(actionPath, rawAction);
  if (actionPath !== "/api/renki" && !(Number(unitManaCost) > 0)) {
    throw new ApiError(400, "この能力はMP一括並列発動の対象ではありません。");
  }
  const requestedId = String(rawHoldId || "").trim();
  if (!requestedId || requestedId.length > 160) throw new ApiError(400, "能力長押しIDが不正です。");
  // A newly observed press atomically replaces an uncommitted stale hold.
  // The old release/cancel ID can no longer match, which also avoids a race
  // between the client's best-effort cancel request and the next press.
  player.abilityHold = {
    id: requestedId,
    actionPath,
    startedAt: now(),
    committed: false,
    committedAt: 0,
    batch: false,
    unitManaCost: Number(unitManaCost) || 0,
    // Only action identity is accepted at start.  Release callers compare
    // their canonical target/mode snapshot before execution; clients cannot
    // swap a selected target after the server observed the hold.
    actionSnapshot: abilityHoldActionSnapshot(rawAction)
  };
  touch(room);
  return player.abilityHold;
}

function abilityHoldActionSnapshot(rawAction = {}) {
  const action = rawAction && typeof rawAction === "object" ? rawAction : {};
  const permitted = ["mode", "targetId", "x", "y", "dx", "dy", "ability", "conversion"];
  const snapshot = {};
  for (const key of permitted) {
    if (!Object.hasOwn(action, key)) continue;
    const value = action[key];
    snapshot[key] = ["x", "y", "dx", "dy"].includes(key) ? Number(value) || 0 : String(value || "");
  }
  return JSON.stringify(snapshot);
}

function commitAbilityHold(room, player, rawHoldId, expectedActionPath, rawAction = {}) {
  const hold = player?.abilityHold;
  const holdId = String(rawHoldId || "").trim();
  if (!hold || !holdId || hold.id !== holdId || hold.actionPath !== expectedActionPath) {
    throw new ApiError(409, "能力長押し状態が一致しません。もう一度押し直してください。");
  }
  if (hold.actionSnapshot !== abilityHoldActionSnapshot(rawAction)) {
    throw new ApiError(409, "能力長押しの対象または方式が開始時と一致しません。");
  }
  if (hold.committed) return { duplicate: true, batch: Boolean(hold.batch), hold };
  const timestamp = now();
  hold.committed = true;
  hold.committedAt = timestamp;
  hold.batch = timestamp - Number(hold.startedAt) >= ABILITY_BATCH_HOLD_MIN_MS;
  return { duplicate: false, batch: hold.batch, hold };
}

function cancelAbilityHold(room, player, rawHoldId, rawActionPath) {
  const hold = player?.abilityHold;
  if (!hold || hold.committed || hold.id !== String(rawHoldId || "") || hold.actionPath !== String(rawActionPath || "")) return false;
  player.abilityHold = null;
  touch(room);
  return true;
}

async function awaitAbilityHoldAutoCommitThreshold(player, rawBody, expectedActionPath) {
  const body = rawBody && typeof rawBody === "object" ? rawBody : {};
  if (body.abilityHoldAutoCommit !== true) return;
  const holdId = String(body.renkiHoldId || body.abilityHoldId || "").trim();
  const hold = player?.abilityHold;
  if (!hold || !holdId || hold.id !== holdId || hold.actionPath !== expectedActionPath) {
    throw new ApiError(409, "能力長押し状態が一致しません。もう一度押し直してください。");
  }
  // The automatic client timer begins with pointer/key ownership, while the
  // authoritative start timestamp begins when this server accepts start.
  // Absorb asymmetric network latency here so an automatic threshold commit
  // can never be downgraded into an ordinary tap.  The client still reports no
  // duration, MP amount, or batch count.
  const remainingMs = Math.max(0, Number(hold.startedAt) + ABILITY_BATCH_HOLD_MIN_MS - now());
  if (remainingMs > 0) await new Promise((resolve) => setTimeout(resolve, remainingMs));
}

function quantumBatchCapacity(player, rawMode) {
  const mode = normalizeQuantumMode(rawMode);
  const itemIds = mode === "electric-discharge"
    ? []
    : mode === "nuclear-transmutation"
    ? ["lead", "mercury"]
    : mode === "nuclear-fission"
      ? ["uranium", "plutonium"]
      : mode === "nuclear-fusion"
        ? ["seawater"]
      : ["mineral-water", "seawater"];
  const itemCapacity = mode === "electric-discharge"
    ? Number.MAX_SAFE_INTEGER
    : itemIds.reduce((sum, itemId) => sum + itemCount(player, itemId), 0);
  const staminaCost = QUANTUM_ACTION_STAMINA_COST * (player?.desireBias === "sunk-cost" ? DESIRE_BIAS_COST_MULTIPLIER : 1);
  const staminaCapacity = Math.floor(Math.max(0, Number(player?.stamina) || 0) / Math.max(1, staminaCost));
  return Math.min(itemCapacity, staminaCapacity, ["nuclear-fission", "nuclear-fusion"].includes(mode) ? 1 : Number.MAX_SAFE_INTEGER);
}

function abilityBatchActionCapacity(player, actionPath, rawAction = {}) {
  const action = rawAction && typeof rawAction === "object" ? rawAction : {};
  if (actionPath === "/api/quantum-control") return quantumBatchCapacity(player, action.mode);
  if (actionPath === "/api/borrowed-ability" && String(action.ability || "") === "quantum") {
    return quantumBatchCapacity(player, action.mode);
  }
  if ((actionPath === "/api/flora-heal" || actionPath === "/api/borrowed-ability") &&
    String(action.mode || "") === "invisible") return 1;
  return Number.MAX_SAFE_INTEGER;
}

function setAbilityBatchManaReserve(room, player, sourceLabel) {
  return setMana(room, player, ABILITY_HOLD_MANA_RESERVE, sourceLabel, { exact: true });
}

function executeAbilityHoldAction(room, player, rawBody, actionPath, action) {
  const body = rawBody && typeof rawBody === "object" ? rawBody : {};
  const holdId = String(body.abilityHoldId || "");
  if (!holdId) return { value: action(), held: false, batch: false, duplicate: false, count: 1, spentMana: 0 };
  const committed = commitAbilityHold(room, player, holdId, actionPath, body);
  if (committed.duplicate) {
    return { value: undefined, held: true, batch: Boolean(committed.batch), duplicate: true, count: 0, spentMana: 0 };
  }
  if (!committed.batch) {
    return { value: action(), held: true, batch: false, duplicate: false, count: 1, spentMana: 0 };
  }

  const currentMana = Math.round((Number(player.mana) || 0) * 100) / 100;
  const spendableMana = Math.max(0, Math.round((currentMana - ABILITY_HOLD_MANA_RESERVE) * 100) / 100);
  const unitManaCost = Math.max(0.01, Number(committed.hold.unitManaCost) || abilityBatchUnitManaCost(actionPath, body) || 0);
  const parallelCount = Math.floor((spendableMana + 1e-9) / unitManaCost);
  if (parallelCount < 1) {
    throw new ApiError(400, `能力長押し（1回${unitManaCost}MP）には理知維持用2MPとは別に、1回分以上のMPが必要です。`);
  }
  const capacity = abilityBatchActionCapacity(player, actionPath, body);
  if (capacity < parallelCount) {
    throw new ApiError(400, `並列${parallelCount}回分の所持品またはSPが不足しています（実行可能 ${Math.max(0, capacity)}回）。`);
  }

  player.abilityBatchExecution = {
    id: committed.hold.id,
    actionPath,
    count: parallelCount,
    suppressManaCost: true
  };
  const previousPresentationScope = abilityBatchPresentationScopes.get(room);
  const presentationScope = { playerId: player.id, targetId: String(body.targetId || player.id), batch: player.abilityBatchExecution, seen: new Set(), activationEffects: [], successfulActivationCount: 0 };
  abilityBatchPresentationScopes.set(room, presentationScope);
  let appliedCount = 0;
  let value;
  let partialError = null;
  try {
    for (let index = 0; index < parallelCount; index += 1) {
      if (index > 0 && (room.phase !== "playing" || !player.alive || player.ejected || player.inVent)) break;
      try {
        const result = action(index, parallelCount);
        if (result === false) break;
        value = result;
        appliedCount += 1;
        presentationScope.successfulActivationCount = presentationScope.activationEffects.length;
      } catch (error) {
        if (appliedCount <= 0) throw error;
        partialError = error;
        break;
      }
    }
  } finally {
    delete player.abilityBatchExecution;
    if (previousPresentationScope) abilityBatchPresentationScopes.set(room, previousPresentationScope);
    else abilityBatchPresentationScopes.delete(room);
  }
  if (appliedCount <= 0) {
    return { value, held: true, batch: true, duplicate: false, count: 0, requestedCount: parallelCount, spentMana: 0 };
  }
  setAbilityBatchManaReserve(room, player, "能力一括並列発動");
  retainAbilityBatchActivationEffects(room, presentationScope);
  emitEnhanceActivation(room, player, "ability-hold:" + committed.hold.id);
  setImmediateFeedback(
    player,
    `能力一括並列発動（${spendableMana.toFixed(2)}MP）`,
    `${appliedCount}/${parallelCount}回 / 2MP維持${partialError ? " / 対象状態変化で残り終了" : ""}`
  );
  pushEvent(room, `${player.name} が能力一括並列発動（${spendableMana.toFixed(2)}MP）を${appliedCount}回成立させ、2MPを維持しました。`);
  touch(room);
  return {
    value,
    held: true,
    batch: true,
    duplicate: false,
    count: appliedCount,
    requestedCount: parallelCount,
    spentMana: spendableMana,
    partial: Boolean(partialError)
  };
}

function executeSingleTimeKeeperAction(room, player, rawBody, action) {
  const body = rawBody && typeof rawBody === "object" ? rawBody : {};
  if (String(body.abilityHoldId || body.renkiHoldId || "").trim()) {
    throw new ApiError(400, "時の番人は長押し一括並列発動できません。タップで1回だけ発動します。");
  }
  return action();
}

function attachAbilityBatchPayload(payload, outcome) {
  if (!outcome?.held) return payload;
  payload.abilityBatch = {
    batch: Boolean(outcome.batch),
    duplicate: Boolean(outcome.duplicate),
    count: Math.max(0, Number(outcome.count) || 0),
    requestedCount: Math.max(0, Number(outcome.requestedCount ?? outcome.count) || 0),
    spentMana: Math.max(0, Number(outcome.spentMana) || 0),
    partial: Boolean(outcome.partial)
  };
  return payload;
}

function resourceRatioMindPoints(value, maximum) {
  const current = Number(value) || 0;
  const cap = Math.max(Number(maximum) || 0, Number.EPSILON);
  if (current <= 0) return 0;
  return current / cap <= 0.5 ? 1 : 2;
}

function manaMindPoints(mana, maxMana = DEFAULT_MAX_MANA) {
  return resourceRatioMindPoints(mana, maxMana);
}

function staminaMindPoints(stamina, maxStamina = MAX_STORED_STAMINA) {
  return resourceRatioMindPoints(stamina, maxStamina);
}

function mentalStateForResources(mana, stamina, maxMana = DEFAULT_MAX_MANA, maxStamina = MAX_STORED_STAMINA) {
  const points = manaMindPoints(mana, maxMana) + staminaMindPoints(stamina, maxStamina);
  return points <= 0 ? "欲望" : points <= 2 ? "気概" : "理知";
}

function mentalPointsFor(player) {
  const maxMana = manaCapacityFor(player);
  const maxStamina = staminaCapacityFor(player);
  const manaPoints = manaMindPoints(player?.mana, maxMana);
  const staminaPoints = staminaMindPoints(player?.stamina, maxStamina);
  return {
    manaPoints,
    staminaPoints,
    total: manaPoints + staminaPoints,
    manaRatio: Math.max(0, Number(player?.mana) || 0) / maxMana,
    staminaRatio: Math.max(0, Number(player?.stamina) || 0) / maxStamina
  };
}

function hasDesireManaDebt(player) {
  return Number(player?.mana) <= DESIRE_RESOURCE_DEBT;
}

function mentalStateFor(player) {
  if (hasDesireManaDebt(player)) return "欲望";
  return mentalStateForResources(
    player?.mana,
    player?.stamina,
    manaCapacityFor(player),
    staminaCapacityFor(player)
  );
}

function isRational(player) {
  return mentalStateFor(player) === "理知";
}

function isHackerOperator(player) {
  if (!player) return false;
  if (player.special === "alchemist") return true;
  return operatorFor(player.role, player.operatorId)?.special === "alchemist";
}

function isHackerOperational(player) {
  return Boolean((hasHackerVibeCodingAccess(player) || hasHackerRootAccess(player)) && player.alive && !player.ejected);
}

// 2026-09-21 root-selected provisional balance, not user-specified numbers.
const DURABLE_COMBAT_BALANCE = Object.freeze({
  weaponCapacity: 2, barrierCapacity: 2, weaponInterceptChance: 0.25,
  killBarrierDamage: 1, equipmentRecoveryPerSecond: 0.005,
  barrierCooldownMs: 20000, bustCooldownMs: 20000, bustDurationMs: 8000,
  substitutionManaCost: 1, substitutionCooldownMs: 20000,
  knockbackDistance: 24, hitstunMs: 180,
  limitBreakAccPerWorldSecond: 0.1
});

function newDurableWeapon(player, itemId) {
  player.durableWeaponSerial = Math.max(0, Number(player.durableWeaponSerial) || 0) + 1;
  return { instanceId: `${player.id}:weapon:${player.durableRoundId || "legacy"}:${player.durableWeaponSerial}`,
    itemId, durability: DURABLE_COMBAT_BALANCE.weaponCapacity, maxDurability: DURABLE_COMBAT_BALANCE.weaponCapacity };
}

function synchronizeDurableWeapons(player) {
  if (!player) return [];
  player.durableWeapons ||= [];
  const desired = new Map();
  for (const id of GUNNER_WEAPON_ORDER) if (gunnerWeaponAvailable(player, id)) desired.set(`weapon:${id}`, 1);
  const swordCount = Math.max(0, Math.floor(Number(player.itemInventory?.["orichalcum-sword"]) || 0));
  if (swordCount) desired.set("orichalcum-sword", swordCount);
  // Multiple firearm instances can share the legacy type-level UI entry.
  // Keep every surviving transferred instance rather than merging durability.
  player.durableWeapons = player.durableWeapons.filter(w => desired.has(w.itemId) && Number(w.durability) > 0);
  let retainedSwords = 0;
  player.durableWeapons = player.durableWeapons.filter(w => w.itemId !== "orichalcum-sword" || ++retainedSwords <= swordCount);
  for (const [itemId, count] of desired) {
    let owned = player.durableWeapons.filter(w => w.itemId === itemId).length;
    while (owned++ < count) player.durableWeapons.push(newDurableWeapon(player, itemId));
  }
  return player.durableWeapons;
}

function initializeDurableCombat(player, roundId, openingBarrier = true) {
  player.durableRoundId = String(roundId);
  player.durableWeaponSerial = 0;
  player.durableWeapons = [];
  player.barrierDurability = openingBarrier ? DURABLE_COMBAT_BALANCE.barrierCapacity : 0;
  player.barrierMaxDurability = DURABLE_COMBAT_BALANCE.barrierCapacity;
  player.barrierReadyAt = 0;
  player.bustReadyAt = 0;
  player.bustUntil = 0; player.bustUnlocked = false; player.substitutionReadyAt = 0;
  player.damageReactionStartedAt = 0; player.damageReactionUntil = 0; player.damageReactionDx = 0; player.damageReactionDy = 0;
  player.protectCharges = 0;
  player.substitutionCharges = 0;
  player.gritCharges = 0;
  player.standFirmBarrierUntil = 0;
  player.limitBreakAccBonus = 0;
  synchronizeDurableWeapons(player);
}

function durableBarrierActive(target) {
  return Boolean(target?.alive && !target.ejected && Number(target.barrierDurability) > 0);
}

function grantDurableBarrier(room, source, target = source, timestamp = now()) {
  if (room?.phase !== "playing" || !source?.alive || source.ejected || !target?.alive || target.ejected) return false;
  if (Number(source.barrierReadyAt) > timestamp) return false;
  target.barrierMaxDurability = DURABLE_COMBAT_BALANCE.barrierCapacity;
  target.barrierDurability = DURABLE_COMBAT_BALANCE.barrierCapacity;
  source.barrierReadyAt = timestamp + DURABLE_COMBAT_BALANCE.barrierCooldownMs;
  return true;
}

function selectedDurableWeapon(player) {
  const weapons = synchronizeDurableWeapons(player);
  const selected = `weapon:${player.gunnerWeapon || ""}`;
  const order = [...GUNNER_WEAPON_ORDER.map(id => `weapon:${id}`), "orichalcum-sword"];
  return weapons.find(w => w.itemId === selected) || [...weapons].sort((a,b) =>
    order.indexOf(a.itemId) - order.indexOf(b.itemId) || a.instanceId.localeCompare(b.instanceId))[0] || null;
}

function destroyDurableWeapon(player, weapon) {
  weapon.durability = 0;
  player.durableWeapons = (player.durableWeapons || []).filter(w => w.instanceId !== weapon.instanceId);
  if (weapon.itemId === "orichalcum-sword") {
    const count = Math.max(0, Number(player.itemInventory?.[weapon.itemId]) || 0);
    if (count <= 1) delete player.itemInventory[weapon.itemId];
    else player.itemInventory[weapon.itemId] = count - 1;
    return;
  }
  const id = weapon.itemId.slice(7);
  if (player.durableWeapons.some(w => w.itemId === weapon.itemId)) return;
  player.purchasedWeapons = (player.purchasedWeapons || []).filter(w => w !== id);
  player.unavailableGunnerWeapons ||= [];
  if (!player.unavailableGunnerWeapons.includes(id)) player.unavailableGunnerWeapons.push(id);
  if (player.gunnerAmmo) player.gunnerAmmo[id] = 0;
  if (player.gunFiringWeapon === id) {
    player.gunFiring = false; player.gunFiringWeapon = ""; player.gunFiringSince = 0;
    player.gunnerBurstRoundsRemaining = 0; player.gunnerBurstGbo = false; player.gunnerBurstGboWeapon = "";
  }
  if (player.gunnerReloadWeapon === id) { player.gunnerReloadWeapon = ""; player.gunnerReloadUntil = 0; }
  if (player.gunnerWeapon === id) player.gunnerWeapon = GUNNER_WEAPON_ORDER.find(w => gunnerWeaponAvailable(player,w)) || DEFAULT_GUNNER_WEAPON;
}

function takeDurableWeaponInstances(player, itemId, amount = 1) {
  const matches = synchronizeDurableWeapons(player).filter(w => w.itemId === itemId);
  const result = matches.slice(0, Math.max(0, Math.floor(amount)));
  const ids = new Set(result.map(w => w.instanceId));
  player.durableWeapons = player.durableWeapons.filter(w => !ids.has(w.instanceId));
  return result.map(w => ({...w}));
}

function receiveDurableWeaponInstances(player, instances) {
  player.durableWeapons ||= [];
  const existing = new Set(player.durableWeapons.map(w => w.instanceId));
  for (const w of instances || []) {
    if (!w?.instanceId || existing.has(w.instanceId) || !(Number(w.durability) > 0)) continue;
    player.durableWeapons.push({...w}); existing.add(w.instanceId);
  }
}

function recoverDurableEquipment(player, elapsedMs, multiplier = 1) {
  if (!player?.alive || player.ejected) return false;
  const recovery = Math.max(0, Number(elapsedMs) || 0) / 1000 * DURABLE_COMBAT_BALANCE.equipmentRecoveryPerSecond * Math.max(0, Number(multiplier) || 0);
  if (!(recovery > 0)) return false;
  let changed = false;
  if (Number(player.barrierDurability) > 0) {
    const next = Math.min(DURABLE_COMBAT_BALANCE.barrierCapacity, Number(player.barrierDurability) + recovery);
    changed ||= next !== player.barrierDurability; player.barrierDurability = next;
  }
  // Do not synchronize here: regeneration cannot create/resurrect equipment.
  for (const weapon of player.durableWeapons || []) if (Number(weapon.durability) > 0) {
    const next = Math.min(Number(weapon.maxDurability), Number(weapon.durability) + recovery);
    changed ||= next !== weapon.durability; weapon.durability = next;
  }
  return changed;
}

function durableCombatSnapshot(player) {
  return {
    barrierDurability: Math.max(0, Number(player?.barrierDurability) || 0),
    barrierMaxDurability: DURABLE_COMBAT_BALANCE.barrierCapacity,
    durableWeapons: (player?.durableWeapons || []).filter(w => w.itemId.startsWith("weapon:") ? gunnerWeaponAvailable(player, w.itemId.slice(7)) : Number(player?.itemInventory?.[w.itemId]) > 0).map(w => ({...w}))
  };
}

// Called only AFTER guard, reflection, evade and final attack classification.
// The transaction is server-owned and must be reused by nested resolution.
// Body HP commit/death/knockback is the caller's next step when absorbed=false.
function resolveDurableCombatHit(room, source, target, hit, transaction, adapters = {}) {
  if (!transaction || typeof transaction !== "object") throw new Error("A server-owned combat transaction is required");
  const key = String(target?.id || "");
  transaction.durableOutcomes ||= new Map();
  if (transaction.durableOutcomes.has(key)) return transaction.durableOutcomes.get(key);
  const outcome = { attackType: hit.attackType === "kill" ? "kill" : "body", damage: Math.max(0, Number(hit.damage) || 0), absorbed: false, defense: "", converted: false };
  transaction.durableOutcomes.set(key, outcome);
  if (!target?.alive || target.ejected) { outcome.absorbed = true; outcome.defense = "inactive"; return outcome; }
  if (outcome.attackType === "body" && outcome.damage <= 0) return outcome;
  if (outcome.attackType === "body" && source?.id !== target.id && Number(source?.bustUntil) > now()) {
    const bust = resolveBustForNormalBodyAttack(room, source, target, {}, now());
    if (bust === "pushBacklash") { outcome.absorbed = true; outcome.defense = "pushBacklash"; return outcome; }
  }
  if (durableBarrierActive(target)) {
    const cost = outcome.attackType === "kill" ? DURABLE_COMBAT_BALANCE.killBarrierDamage : outcome.damage;
    target.barrierDurability = Math.max(0, Number(target.barrierDurability) - cost);
    outcome.absorbed = true; outcome.defense = "barrier"; outcome.barrierBroken = target.barrierDurability === 0;
    pushMagicEffect(room, "preparation-barrier-hit", target, {playerId: target.id, targetId: source?.id || "", radius: 110, variant: outcome.barrierBroken ? "durability-broken" : "durability-hit", durationMs: outcome.barrierBroken ? 480 : 650});
    return outcome;
  }
  if (outcome.attackType === "kill" && adapters.substitution?.(room, source, target, transaction)) {
    outcome.absorbed = true; outcome.defense = "substitution"; return outcome;
  }
  if (outcome.attackType === "kill" && adapters.protect?.(room, source, target, transaction)) {
    outcome.attackType = "body"; outcome.damage = 1; outcome.converted = true;
  }
  if (outcome.attackType === "body") {
    const weapon = selectedDurableWeapon(target);
    if (weapon) {
      const roll = (adapters.random || Math.random)();
      outcome.weaponRoll = roll;
      if (roll < DURABLE_COMBAT_BALANCE.weaponInterceptChance) {
        weapon.durability = Math.max(0, Number(weapon.durability) - outcome.damage);
        outcome.absorbed = true; outcome.defense = "weapon"; outcome.weaponInstanceId = weapon.instanceId;
        outcome.weaponBroken = weapon.durability === 0;
        if (outcome.weaponBroken) destroyDurableWeapon(target, weapon);
      }
    }
  }
  return outcome;
}

function durableDefenseAdapters(timestamp = now()) {
  return {
    substitution: (room, source, target) => triggerSubstitution(room, target, "kill", timestamp),
    protect: (room, source, target) => {
      if (!passivesEnabled(target) || !itemStorageAvailable(target, timestamp) || !(Number(target.protectCharges) > 0)) return false;
      target.protectCharges -= 1;
      return true;
    }
  };
}

function settleDurableBodyDamage(room, source, target, damage, label, options = {}) {
  const transaction = options.defenseTransaction || {};
  const outcome = options.defenseOutcome || resolveDurableCombatHit(room, source, target,
    {attackType: "body", damage}, transaction, durableDefenseAdapters(options.timestamp || now()));
  if (outcome.absorbed || outcome.hpCommitClaimed || !target?.alive || target.ejected) return outcome;
  outcome.hpCommitClaimed = true;
  if (hasFighterInfiniteResources(target) && !target.limitBreakActive) {
    syncFighterInfiniteResources(target); outcome.absorbed = true; outcome.defense = "infiniteResources"; return outcome;
  }
  if (!options.ignoreOverheal && Number(target.overheal) > 0) {
    target.overheal = Math.max(0, Number(target.overheal) - 1);
    outcome.absorbed = true; outcome.defense = "overheal"; outcome.hpDamage = 0;
    pushHitEffect(room, target, "body", false);
    return outcome;
  }
  const applied = Math.max(0, Number(outcome.damage) || 0);
  target.bodyHits = Number((Math.max(0, Number(target.bodyHits) || 0) + applied).toFixed(6));
  outcome.hpDamage = applied;
  const lethal = remainingHealth(target) <= 0;
  pushHitEffect(room, target, "body", lethal);
  if (lethal) outcome.killed = destroyPlayerUnconditionally(room, source, target, label, {
    ...options, attackType: "body", defenseSettled: true, bypassSlashGuard: true,
    ignorePreparationBarrier: true, defenseTransaction: transaction,
    attackKind: options.attackKind || "body-damage", attackLabel: label
  });
  else if (applied > 0) applyBodyDamageReaction(room, source, target, options);
  return outcome;
}

function applyBodyDamageReaction(room, source, target, options = {}) {
  if (!target?.alive || target.ejected) return false;
  const timestamp = options.timestamp || now();
  target.damageReactionStartedAt = timestamp;
  target.damageReactionUntil = timestamp + DURABLE_COMBAT_BALANCE.hitstunMs;
  let dx = 0, dy = 0;
  if (!options.noDirectionalReaction) {
    const direction = options.attackDirection;
    const origin = options.impactOrigin || (source?.id !== target.id ? source : null);
    if (Number.isFinite(direction?.x) && Number.isFinite(direction?.y)) { dx = direction.x; dy = direction.y; }
    else if (Number.isFinite(origin?.x) && Number.isFinite(origin?.y)) { dx = target.x - origin.x; dy = target.y - origin.y; }
  }
  const length = Math.hypot(dx,dy);
  target.damageReactionDx = length > 0 ? dx / length : 0;
  target.damageReactionDy = length > 0 ? dy / length : 0;
  if (length > 0) displaceByGravity(room, target, dx, dy, DURABLE_COMBAT_BALANCE.knockbackDistance);
  target.vx = 0; target.vy = 0;
  clearStoredMovementInput(target, timestamp);
  if (target.gunFiring) stopGunnerFire(room, target, {reason: "被弾硬直"});
  clearAttackState(target);
  return true;
}

function commonDefenseTarget(room, player, targetId = "") {
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) throw new ApiError(403, "現在は発動できません。");
  ensureAbilityAvailable(player); ensureConscious(player);
  const target = targetId ? room.players.get(String(targetId)) : player;
  if (!target?.alive || target.ejected || target.inVent) throw new ApiError(404, "対象がいません。");
  return target;
}

function activateDurableBarrier(room, player, targetId = "") {
  const target = commonDefenseTarget(room, player, targetId), timestamp = now();
  if (!grantDurableBarrier(room, player, target, timestamp)) throw new ApiError(400, "バリアのクールタイム中です。");
  pushMagicEffect(room, "action-stand", target, {playerId: player.id, targetId: target.id, radius: 110, variant: "durability-created", durationMs: 650});
  touch(room); return true;
}

function activateTimedBust(room, player, targetId = "") {
  const target = commonDefenseTarget(room, player, targetId), timestamp = now();
  if (!player.bustUnlocked) throw new ApiError(403, "バストを獲得していません。");
  if (Number(player.bustReadyAt) > timestamp) throw new ApiError(400, "バストのクールタイム中です。");
  player.bustReadyAt = timestamp + DURABLE_COMBAT_BALANCE.bustCooldownMs;
  target.bustUntil = timestamp + DURABLE_COMBAT_BALANCE.bustDurationMs;
  pushMagicEffect(room, "action-push", target, {playerId: player.id, targetId: target.id, radius: 125, variant: "timed-bust-start", durationMs: 650});
  touch(room); return true;
}

function hasAssassinSubstitution(player) {
  return hasOperatorAccess(player, "assassin") || ownsShopAbility(player, "assassin-substitution");
}

function activateAssassinSubstitution(room, player, targetId = "") {
  const target = commonDefenseTarget(room, player, targetId), timestamp = now();
  if (!hasAssassinSubstitution(player)) throw new ApiError(403, "変わり身の術を獲得していません。");
  if (Number(player.substitutionReadyAt) > timestamp) throw new ApiError(400, "変わり身の術のクールタイム中です。");
  if (Number(target.substitutionCharges) > 0) throw new ApiError(400, "対象には変わり身の術が付与されています。");
  spendHeldPowerMana(room, player, DURABLE_COMBAT_BALANCE.substitutionManaCost, "変わり身の術");
  player.substitutionReadyAt = timestamp + DURABLE_COMBAT_BALANCE.substitutionCooldownMs;
  target.substitutionCharges = 1;
  pushMagicEffect(room, "action-assassin-substitution-grant", player, {
    playerId: player.id,
    targetId: target.id,
    radius: 110,
    durationMs: 820,
    variant: target.id === player.id ? "self" : "target"
  });
  touch(room); return true;
}

function grantProtectItem(room, player, amount = 1) {
  player.protectCharges = Math.max(0, Number(player.protectCharges) || 0) + Math.max(1, Math.floor(Number(amount) || 1));
}

function remainingHealth(player) {
  return Math.min(healthCapacityFor(player), Math.max(0, 2 - Math.max(0, Number(player?.bodyHits) || 0)));
}

function healthCapacityFor(player) { return player?.limitBreakActive ? 1 : 2; }

// The sole positive-HP recovery owner. Recovery stops at the current personal
// capacity and never increases it; the legacy maxHealth field is normalized
// to that capacity when recovery occurs.
function recoverHealth(player, amount = 1) {
  if (!player) return { recovered: 0, health: 0, maxHealth: 2 };
  const capacity = healthCapacityFor(player);
  const before = Math.min(capacity, remainingHealth(player));
  const recovery = Math.min(Math.max(0, Number(amount) || 0), Math.max(0, capacity - before));
  const health = Number((before + recovery).toFixed(6));
  // Recovery repairs the original HP pool; it cannot create overhealth or a
  // permanent personal capacity. Legacy extended state is normalized here.
  player.bodyHits = Number((2 - health).toFixed(6));
  player.overheal = 0;
  player.maxHealth = capacity;
  return { recovered: recovery, health, maxHealth: capacity };
}

function fighterEnergyPeak(player) {
  return Math.max(
    0,
    Math.floor(Number(player?.fighterEnergyPeak) || 0),
    Math.floor(Number(player?.fighterEnergyCharge) || 0)
  );
}

function hasFighterInfiniteResources(player) {
  return Boolean(
    player?.alive &&
    !player.ejected &&
    hasOperatorAccess(player, "fighter") &&
    fighterEnergyPeak(player) >= FIGHTER_INFINITE_RESOURCE_THRESHOLD
  );
}

// EC1000 retains only the non-resource apex package.  Keep it separate from
// the EC100 permanent MP/SP/HP/Stand Firm entitlement.
function hasFighterApexPerks(player) {
  return Boolean(
    player?.alive &&
    !player.ejected &&
    hasOperatorAccess(player, "fighter") &&
    fighterEnergyPeak(player) >= FIGHTER_APEX_PERK_THRESHOLD
  );
}

function syncFighterInfiniteResources(player) {
  if (!hasFighterInfiniteResources(player)) return false;
  player.mana = Math.max(manaCapacityFor(player), Number(player.mana) || 0);
  player.stamina = staminaCapacityFor(player);
  if (!player.limitBreakActive) player.bodyHits = 0;
  player.gritCharges = 0;
  return true;
}

function hasLimitBreakDeathVulnerability(player) { return false; }

function hackerRootEligible(player) {
  return Boolean(isHackerOperational(player) && player.hackerRootActive);
}

function discardHackerRootState(player) {
  if (!player) return false;
  const changed = Boolean(player.hackerRootActive || player.hackerRootHealthSnapshot);
  player.hackerRootActive = false;
  player.hackerRootHealthSnapshot = null;
  return changed;
}

function syncHackerRootState(room, player) {
  if (!isHackerOperational(player)) discardHackerRootState(player);
  return hackerRootEligible(player);
}

function deactivateHackerRoot(room, player, { restoreHealth = false, announce = false } = {}) {
  if (!player?.hackerRootActive) return false;
  const snapshot = player.hackerRootHealthSnapshot;
  player.hackerRootActive = false;
  player.hackerRootHealthSnapshot = null;
  if (restoreHealth && player.alive && !player.ejected && snapshot) {
    player.bodyHits = Number(snapshot.bodyHits);
    player.overheal = Number(snapshot.overheal);
  }
  if (announce) {
    pushMagicEffect(room, "hacker-root", player, {
      radius: 128,
      playerId: player.id,
      variant: "release"
    });
    setImmediateFeedback(player, "ROOT解除", `HP ${remainingHealth(player)}`);
    pushEvent(room, `${player.name} がROOTを解除し、発動前のHP ${remainingHealth(player)}へ戻りました。`);
    touch(room);
  }
  return true;
}

function activateHackerRoot(room, player) {
  if (room.phase !== "playing" || !hasHackerRootAccess(player)) {
    throw new ApiError(403, "ハッカーのバトル中だけroot化できます。");
  }
  if (!player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在はroot化できません。");
  }
  ensureAbilityAvailable(player);
  ensureConscious(player);

  const healthBefore = remainingHealth(player);
  const retainedProtections = {
    grit: Math.max(0, Math.floor(Number(player.gritCharges) || 0)),
    substitution: Math.max(0, Math.floor(Number(player.substitutionCharges) || 0))
  };
  player.hackerRootHealthSnapshot = {
    bodyHits: Number(player.bodyHits),
    overheal: Number(player.overheal)
  };
  player.overheal = 0;
  player.bodyHits = 2 - HACKER_ROOT_HEALTH;
  player.hackerRootActive = true;
  const inheritedStartingItems = grantHackerRootStartingItems(player);
  const retainedLabels = [
    retainedProtections.grit ? `バリア${retainedProtections.grit}` : "",
    retainedProtections.substitution ? `変わり身${retainedProtections.substitution}` : ""
  ].filter(Boolean);
  pushHitEffect(room, player, "body", false);
  pushMagicEffect(room, "hacker-root", player, {
    radius: 155,
    playerId: player.id,
    variant: "all-operators"
  });
  setImmediateFeedback(
    player,
    "root化",
    `HP ${HACKER_ROOT_HEALTH}${retainedLabels.length ? ` / ${retainedLabels.join("・")}はROOT中無効（所持維持）` : ""}${inheritedStartingItems.length ? ` / 開始装備:${inheritedStartingItems.join("・")}` : ""}`
  );
  pushEvent(
    room,
    `${player.name} が能力ボタンでroot化し、${Math.max(0, healthBefore - HACKER_ROOT_HEALTH).toFixed(4)}ダメージを受けてHP ${HACKER_ROOT_HEALTH}になりました。${retainedLabels.length ? `${retainedLabels.join("・")}は所持したままROOT中だけ無効です。` : ""}${inheritedStartingItems.length ? ` 各オペレーターの開始装備（${inheritedStartingItems.join("・")}）を継承しました。` : ""}`
  );
  touch(room);
  return { health: remainingHealth(player), retainedProtections, inheritedStartingItems };
}

function toggleHackerRoot(room, player) {
  if (player?.hackerRootActive) {
    if (room.phase !== "playing" || !hasHackerRootAccess(player) || !player.alive || player.ejected) {
      discardHackerRootState(player);
      throw new ApiError(403, "現在はROOTを解除できません。");
    }
    deactivateHackerRoot(room, player, { restoreHealth: true, announce: true });
    return { active: false, health: remainingHealth(player) };
  }
  return { active: true, ...activateHackerRoot(room, player) };
}

function grantHackerRootStartingItems(player) {
  const inherited = [];
  if (itemCount(player, "orichalcum-sword") < 1) {
    addItem(player, "orichalcum-sword");
    inherited.push(ITEM_DEFINITIONS["orichalcum-sword"].label);
  }
  for (const [itemId, required] of Object.entries(QUANTUM_STARTING_ITEMS)) {
    const missing = Math.max(0, Number(required) - itemCount(player, itemId));
    if (!missing) continue;
    addItem(player, itemId, missing);
    inherited.push(ITEM_DEFINITIONS[itemId].label);
  }
  return inherited;
}

function passivesEnabled(player) {
  return Boolean(player?.alive && !player.ejected && isRational(player));
}

function limitBreakStackCount(player) {
  return player?.limitBreakActive
    ? Math.max(1, Math.floor(Number(player.limitBreakStacks) || 1))
    : 0;
}

function limitBreakMultiplier(player) {
  return player?.limitBreakActive ? 1 + Math.max(0, Number(player.limitBreakAccBonus) || 0) : 1;
}

function spendLimitBreakHealth(player) {
  if (hasFighterInfiniteResources(player)) return;
  const healthBefore = remainingHealth(player);
  if (healthBefore <= 0) {
    throw new ApiError(400, "リミットブレイクには消費できるHPが必要です。");
  }
  const cost = Math.min(1, healthBefore);
  const overhealBefore = Math.max(0, Number(player.overheal) || 0);
  const overhealSpent = Math.min(cost, overhealBefore);
  player.overheal = Number((overhealBefore - overhealSpent).toFixed(6));
  const bodySpent = cost - overhealSpent;
  if (bodySpent > 0) {
    player.bodyHits = Number(Math.min(2, Math.max(0, Number(player.bodyHits) || 0) + bodySpent).toFixed(6));
  }
}

function toggleLimitBreak(room, player) {
  throw new ApiError(400, "リミットブレイクはパッシブ能力です。");
}

function stopLimitBreak(room, player, reason = "") {
  const wasActive = Boolean(player.limitBreakActive);
  player.limitBreakActive = false;
  player.limitBreakEndsAt = 0; player.limitBreakManaCarry = 0;
  player.limitBreakStacks = 0; player.limitBreakAccBonus = 0;
  player.maxHealth = 2;
  return wasActive;
}

function advanceLimitBreak(room, player, elapsedMs) {
  if (room.phase === "meeting") return false;
  const entitled = hasOperatorAccess(player, "fighter") || ownsShopAbility(player, "fighter-limit-break");
  if (room.phase !== "playing" || !player.alive || player.ejected || !entitled || !passivesEnabled(player)) return stopLimitBreak(room, player);
  const first = !player.limitBreakActive;
  player.limitBreakActive = true;
  player.limitBreakStacks = 1; player.limitBreakEndsAt = 0; player.limitBreakManaCarry = 0;
  player.maxHealth = 1; player.overheal = 0;
  player.bodyHits = first ? 1 : Math.max(1, Number(player.bodyHits) || 0);
  player.limitBreakAccBonus = (first ? 0 : Math.max(0, Number(player.limitBreakAccBonus) || 0)) +
    Math.max(0, Number(elapsedMs) || 0) / 1000 * DURABLE_COMBAT_BALANCE.limitBreakAccPerWorldSecond;
  return true;
}

function advanceFighterEnergyPassive(room, player, timestamp = now()) {
  if (room.phase === "meeting") return false;
  if (room.phase !== "playing" || !player?.alive || player.ejected || player.inVent || !hasOperatorAccess(player, "fighter") || !passivesEnabled(player)) {
    player.fighterEnergyChargeReadyAt = Math.max(Number(player.fighterEnergyChargeReadyAt) || 0, timestamp + FIGHTER_ENERGY_PASSIVE_INTERVAL_MS);
    return false;
  }
  const readyAt = Number(player.fighterEnergyChargeReadyAt) || (timestamp + FIGHTER_ENERGY_PASSIVE_INTERVAL_MS);
  if (timestamp < readyAt) {
    player.fighterEnergyChargeReadyAt = readyAt;
    return false;
  }
  player.fighterEnergyChargeReadyAt = timestamp + FIGHTER_ENERGY_PASSIVE_INTERVAL_MS;
  if (!isHackerOperator(player) && Number(player.mana) < FIGHTER_ENERGY_CHARGE_MANA_COST) return false;
  spendMana(room, player, FIGHTER_ENERGY_CHARGE_MANA_COST, "EC");
  const previousPeak = fighterEnergyPeak(player);
  const next = Math.max(0, Math.floor(Number(player.fighterEnergyCharge) || 0)) + 1;
  const nextPeak = Math.max(previousPeak, next);
  const reachedIaiMilestone = previousPeak < FIGHTER_IAI_REWARD_THRESHOLD && nextPeak >= FIGHTER_IAI_REWARD_THRESHOLD;
  const reachedInfiniteMilestone = previousPeak < FIGHTER_INFINITE_RESOURCE_THRESHOLD && nextPeak >= FIGHTER_INFINITE_RESOURCE_THRESHOLD;
  const reachedApexMilestone = previousPeak < FIGHTER_APEX_PERK_THRESHOLD && nextPeak >= FIGHTER_APEX_PERK_THRESHOLD;
  player.fighterEnergyCharge = next;
  player.fighterEnergyPeak = nextPeak;
  let reward = `EC ${next}`;
  if (reachedIaiMilestone) {
    grantIaiCharge(room, player, false, `ec-${nextPeak}`);
    reward += " / 居合（即席）×1獲得";
  }
  if (reachedInfiniteMilestone) {
    syncFighterInfiniteResources(player);
    pushMagicEffect(room, "fighter-energy-destruction-milestone", player, {
      radius: 138,
      playerId: player.id,
      variant: String(next)
    });
    reward += " / MP・SP補充（HP・バリアは有限）";
  }
  if (reachedApexMilestone) reward += " / リミットブレイク被キルデメリット解除 / 斬る・常時死体なしキル（死体なし） / ジャストガード・全攻撃反射";
  const milestoneMotion = reachedIaiMilestone || reachedInfiniteMilestone || reachedApexMilestone;
  pushMagicEffect(room, "fighter-energy-charge", player, {
    radius: 112,
    playerId: player.id,
    variant: `${next}:ec-${next}:${milestoneMotion ? `milestone-motion-${nextPeak}` : "no-character-motion"}`
  });
  setImmediateFeedback(player, "EC", reward);
  pushEvent(room, `${player.name} のECが1増加${reachedIaiMilestone ? "。EC500到達：居合を即席の使用回数へ変換" : ""}${reachedInfiniteMilestone ? "。EC100到達：MP・SPを補充（HP・バリアは有限）" : ""}${reachedApexMilestone ? "。EC1000到達：リミットブレイクの被キル不利を解除。斬るは常時死体なしキル、ジャストガードは全攻撃を反射" : ""}。`);
  pushSound(room, "invention", player, { ownerId: player.id, sourceKind: "fighter-energy-charge", maxDistance: 900, volume: 0.62 });
  touch(room);
  return true;
}

function fighterSlashShockwaveCost(player) {
  if (!hasOperatorAccess(player, "fighter")) return 0;
  const current = Math.max(0, Math.floor(Number(player?.fighterEnergyCharge) || 0));
  return current >= FIGHTER_GIANT_SHOCKWAVE_EC_COST
    ? FIGHTER_GIANT_SHOCKWAVE_EC_COST
    : 1;
}

function consumeFighterEnergyCharge(player, requestedCost = 1, label = "衝撃波") {
  if (!hasOperatorAccess(player, "fighter")) return 0;
  const current = Math.max(0, Math.floor(Number(player?.fighterEnergyCharge) || 0));
  const cost = Math.max(1, Math.floor(Number(requestedCost) || 1));
  if (!player || current < cost) return 0;
  player.fighterEnergyCharge = current - cost;
  setImmediateFeedback(player, "EC", `${label}発生 / EC${cost}放出 / 残りEC${player.fighterEnergyCharge}`);
  return cost;
}

function luckValueFor(player) {
  const stamina = Number(player?.stamina) || 0;
  let base = 0;
  if (stamina > 250 && isRational(player)) base = player.goodActive ? 0.55 : 0.3;
  else if (stamina <= 0) base = -0.35;
  else if (stamina <= 250) base = -0.12;
  else base = isRational(player) ? 0.2 : 0;
  const objectBonus = Number(player?.objectLuckUntil || 0) > now()
    ? Math.max(0, Number(player?.objectLuckBonus) || 0)
    : 0;
  const donationBonus = clampNumber(
    Number(player?.donationLuckBonus) || 0,
    DONATION_LUCK_MIN_BONUS,
    DONATION_LUCK_MAX_BONUS,
    0
  );
  const confirmationPenalty = player?.desireBias === "confirmation-bias" ? DESIRE_BIAS_LUCK_PENALTY : 0;
  return clampNumber(base + objectBonus + donationBonus - confirmationPenalty, -1, 1, base);
}

function ideaProgressRateFor(player) {
  const luckBenefit = clampNumber(
    (luckValueFor(player) - IDEA_LUCK_BASELINE) / (1 - IDEA_LUCK_BASELINE),
    0,
    1,
    0
  );
  const reductionMs = luckBenefit * IDEA_LUCK_MAX_TIME_REDUCTION_MS;
  return IDEA_ASCENSION_MS / (IDEA_ASCENSION_MS - reductionMs);
}

function resetIdeaProgress(player) {
  player.ideaProgressStartedAt = 0;
  player.ideaProgressMs = 0;
  player.ideaProgressUpdatedAt = 0;
}

function forfeitIdeaAttainment(player) {
  resetIdeaProgress(player);
  player.ideaStage = 0;
  player.ideaFirstAspect = "";
  player.truthCharges = 0;
  player.beautyCharges = 0;
  player.goodActive = false;
  player.ascensionStartedAt = 0;
  player.ascensionUntil = 0;
}

function ideaWinnerIdsFor(room) {
  const ids = Array.isArray(room?.ideaWinnerIds) ? room.ideaWinnerIds : [];
  const legacyId = String(room?.ideaWinnerId || "");
  return [...new Set([...ids.map(String), legacyId].filter(Boolean))];
}

function setIdeaWinnerIds(room, ids = []) {
  if (!room) return [];
  const next = [...new Set((Array.isArray(ids) ? ids : []).map(String).filter(Boolean))];
  room.ideaWinnerIds = next;
  room.ideaWinnerId = next[0] || "";
  return next;
}

function desireBiasDefinition(player) {
  return DESIRE_BIASES.find((bias) => bias.id === player?.desireBias) || null;
}

function nextDesireBias(player) {
  const validIds = new Set(DESIRE_BIASES.map((bias) => bias.id));
  let bag = Array.isArray(player.desireBiasBag)
    ? player.desireBiasBag.filter((id) => validIds.has(id))
    : [];
  if (!bag.length) {
    bag = DESIRE_BIASES.map((bias) => bias.id);
    for (let index = bag.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
    }
    if (bag.length > 1 && bag[0] === player.lastDesireBias) {
      [bag[0], bag[1]] = [bag[1], bag[0]];
    }
  }
  const selected = bag.shift() || DESIRE_BIASES[0].id;
  player.desireBiasBag = bag;
  player.lastDesireBias = selected;
  return selected;
}

function isDesireState(player) {
  return mentalStateFor(player) === "欲望";
}

function enterDesireState(room, player, sourceLabel = "", timestamp = now()) {
  const enteredNow = !player.desireBias;
  if (enteredNow) {
    player.desireBias = nextDesireBias(player);
    player.desireRestRecoveryStartedAt = 0;
    player.desireRenkiRecovery = false;
  }
  player.mana = DESIRE_RESOURCE_DEBT;
  player.credits = DESIRE_RESOURCE_DEBT;
  player.stamina = DESIRE_RESOURCE_DEBT;
  player.staminaUpdatedAt = timestamp;
  player.mentalState = "欲望";
  player.rationalFreeAbilityReadyAt = 0;
  player.desireIdeaForfeited = true;
  forfeitIdeaAttainment(player);
  if (room && ideaWinnerIdsFor(room).includes(player.id)) {
    const remainingWinnerIds = setIdeaWinnerIds(room, ideaWinnerIdsFor(room).filter((id) => id !== player.id));
    if (!remainingWinnerIds.length) {
      room.pendingIdeaVictoryAt = 0;
      room.ideaVictoryArrivalAt = 0;
    }
  }
  if (room && enteredNow) {
    const bias = desireBiasDefinition(player);
    pushEvent(room, `${player.name} は欲望へ移行し、${bias?.label || "認知バイアス"}が心を支配しました。この対戦では真・美・善・善のイデアへの到達を永久に失います。`);
    pushMagicEffect(room, "action-mana", player, { radius: 110, playerId: player.id, variant: "欲望" });
  }
  return player.desireBias;
}

function syncMentalState(room, player, sourceLabel = "", timestamp = now()) {
  expandManaCapacityFor(player, player?.mana);
  expandStaminaCapacityFor(player, player?.stamina);
  const previous = String(player?.mentalState || mentalStateFor(player));
  const next = mentalStateFor(player);
  if (next === "欲望") {
    if (!player.desireBias) enterDesireState(room, player, sourceLabel || "心状態低下", timestamp);
    player.mentalState = "欲望";
    return "欲望";
  }
  if (player.desireBias) {
    player.desireBias = "";
  }
  player.mentalState = next;
  if (previous === next) return next;
  const enteredRational = previous !== "理知" && next === "理知";
  const leftRational = previous === "理知" && next !== "理知";
  if (enteredRational && !player.desireIdeaForfeited) {
    player.ideaProgressStartedAt = timestamp;
    player.ideaProgressMs = 0;
    player.ideaProgressUpdatedAt = timestamp;
    player.rationalFreeAbilityReadyAt = timestamp + RATIONAL_FREE_ABILITY_INTERVAL_MS;
  } else if (leftRational) {
    resetIdeaProgress(player);
    player.rationalFreeAbilityReadyAt = 0;
  }
  if (room) {
    pushEvent(room, `${player.name} の心状態が${next}になりました${sourceLabel ? `（${sourceLabel}）` : ""}。`);
    pushMagicEffect(room, "action-mana", player, { radius: 110, playerId: player.id, variant: next });
  }
  return next;
}

function desireBiasGroupActive(room, player) {
  if (player?.desireBias !== "in-group-bias" || !room) return false;
  return [...room.players.values()].some((other) => (
    other.id !== player.id && other.alive && !other.ejected && !other.inVent && distance(player, other) <= DESIRE_BIAS_GROUP_RADIUS
  ));
}

function luckAdjustedRoll(player) {
  return clampNumber(Math.random() - luckValueFor(player) * 0.16, 0, 0.999999, Math.random());
}

function taskStaminaCostFor() {
  return TASK_STAMINA_REQUIREMENT;
}

function setMana(room, player, rawMana, sourceLabel = "", options = {}) {
  const timestamp = now();
  const previousRaw = Math.round((Number(player.mana) || 0) * 100) / 100;
  const previous = previousRaw <= 0 ? DESIRE_RESOURCE_DEBT : previousRaw;
  const rawRequested = Math.round((Number(rawMana) || 0) * 100) / 100;
  if (hasDesireManaDebt(player) && options.desireRecovery !== true) {
    player.mana = DESIRE_RESOURCE_DEBT;
    syncMentalState(room, player, sourceLabel, timestamp);
    player.luck = luckValueFor(player);
    if (room) maintainNaturalRecovery(room, player, timestamp);
    return Number(player.mana);
  }
  const requested = !options.exact && player.desireBias === "sunk-cost" && previous > 0 && rawRequested < previous
    ? Math.round((previous - (previous - rawRequested) * DESIRE_BIAS_COST_MULTIPLIER) * 100) / 100
    : rawRequested;
  const preGainMaxMana = manaCapacityFor(player);
  const automaticProtection = options.skipAutomaticProtection === true
    ? { mana: requested, converted: 0, reason: 0, grit: 0 }
    : applyAutomaticSurplusManaProtection(
      room,
      player,
      previousRaw,
      requested,
      preGainMaxMana
    );
  const next = automaticProtection.mana <= 0 ? DESIRE_RESOURCE_DEBT : automaticProtection.mana;
  expandManaCapacityFor(player, next);
  player.mana = next;
  syncMentalState(room, player, sourceLabel, timestamp);
  player.luck = luckValueFor(player);
  if (room) maintainNaturalRecovery(room, player, timestamp);
  return Number(player.mana);
}

function spendMana(room, player, amount, label) {
  const cost = Math.max(0, Number(amount) || 0);
  if (player?.abilityBatchExecution?.suppressManaCost) return false;
  if (hasFighterInfiniteResources(player)) return false;
  // EC retains its native Hacker passive exception; acquired/borrowed spells pay normally.
  if (isHackerOperator(player) && label === "EC") return false;
  if ((Number(player.mana) || 0) < cost) {
    throw new ApiError(400, `${label}（${cost}MP）を発動するには同量のMPが必要です。`);
  }
  setMana(room, player, (Number(player.mana) || 0) - cost, label);
}

function spendOperatorMana(room, player, label, amount = ABILITY_MANA_COST) {
  const timestamp = now();
  if (player?.abilityBatchExecution?.suppressManaCost) return false;
  if (isRational(player) && (Number(player.rationalFreeAbilityReadyAt) || Infinity) <= timestamp) {
    player.rationalFreeAbilityReadyAt = timestamp + RATIONAL_FREE_ABILITY_INTERVAL_MS;
    pushMagicEffect(room, "action-rational-free", player, { radius: 145, playerId: player.id });
    pushEvent(room, `${player.name} は理知により${label}を無料で発動しました。`);
    return false;
  }
  spendMana(room, player, Math.max(0, Number(amount) || 0), label);
  return true;
}

// Electric is a single settled Quantum transaction. Unlike ordinary operator
// abilities, its declared 1 MP cost is never waived by ROOT, Rational,
// infinite-resource, or ability-batch free-cast owners.
function canSpendQuantumElectricResources(player) {
  return Number(player?.stamina) >= QUANTUM_ACTION_STAMINA_COST &&
    Number(player?.mana) >= QUANTUM_ELECTRIC_MANA_COST;
}

function spendQuantumElectricResources(room, player) {
  if (!canSpendQuantumElectricResources(player)) {
    throw new ApiError(400, `エレクトリック（${QUANTUM_ELECTRIC_MANA_COST}MP / ${QUANTUM_ACTION_STAMINA_COST}SP）には同量の資源が必要です。`);
  }
  player.stamina = Math.max(0, Number(player.stamina) - QUANTUM_ACTION_STAMINA_COST);
  player.staminaUpdatedAt = now();
  syncMentalState(room, player, "エレクトリック");
  setMana(room, player, Number(player.mana) - QUANTUM_ELECTRIC_MANA_COST, "エレクトリック", { exact: true });
}

function canSpendOperatorMana(player, timestamp = now(), amount = ABILITY_MANA_COST) {
  const cost = Math.max(0, Number(amount) || 0);
  if (hasFighterInfiniteResources(player)) return true;
  const rationalFree = isRational(player) &&
    (Number(player.rationalFreeAbilityReadyAt) || Infinity) <= timestamp;
  return rationalFree || (Number(player.mana) || 0) >= cost;
}

function completeDesireManaRecovery(room, player, source, timestamp = now()) {
  if (!hasDesireManaDebt(player)) return false;
  player.desireRestRecoveryStartedAt = 0;
  player.desireRenkiRecovery = false;
  player.renkiTargetMana = null;
    player.renkiCompletionKind = "";
  player.meditatingUntil = 0;
  if (player.movementMode === "meditating") player.movementMode = "idle";
  setMana(room, player, REST_COMPLETION_MANA_FLOOR, source === "renki" ? "欲望・練気完了" : "欲望・停止休息完了", {
    exact: true,
    desireRecovery: true
  });
  if (source === "renki") {
    pushGainAte(room, player, "mana", { variant: "desire-recovery", durationMs: 1680 });
    pushMagicEffect(room, "action-renki", player, { radius: 120, playerId: player.id, variant: "desire-recovery" });
  }
  setImmediateFeedback(player, "欲望回復", `${source === "renki" ? "練気" : "停止休息"}完了 / MP ${REST_COMPLETION_MANA_FLOOR}`);
  pushEvent(room, `${player.name} が${source === "renki" ? "練気" : "停止休息"}を完了し、欲望のMP負債からマナ${REST_COMPLETION_MANA_FLOOR}へ回復しました。`);
  touch(room);
  return true;
}

function practiceRenki(room, player, options = {}) {
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在は練気できません。");
  }
  let desireHold = null;
  if (hasDesireManaDebt(player) && options.holdId) {
    desireHold = commitAbilityHold(room, player, options.holdId, "/api/renki");
    if (desireHold.duplicate) return { duplicate: true, batch: Boolean(desireHold.batch), desireRecovery: true };
  }
  if (hasDesireManaDebt(player)) {
    ensureAbilityAvailable(player);
    const timestamp = now();
    player.desireRestRecoveryStartedAt = 0;
    player.desireRenkiRecovery = true;
    player.renkiTargetMana = REST_COMPLETION_MANA_FLOOR;
    player.renkiCompletionKind = "";
    player.meditatingUntil = timestamp + DESIRE_RENKI_RECOVERY_MS;
    player.resting = false;
    player.sleepingUntil = 0;
    player.vx = 0;
    player.vy = 0;
    player.movementMode = "meditating";
    player.lastMoveAt = timestamp;
    clearAttackState(player);
    pushMagicEffect(room, "action-renki", player, { radius: 120, playerId: player.id, variant: "desire-recovery-start" });
    setImmediateFeedback(player, "欲望回復・練気", `${DESIRE_RENKI_RECOVERY_MS / 1000}秒後にMP ${REST_COMPLETION_MANA_FLOOR}`);
    pushEvent(room, `${player.name} が欲望のMP負債を回復する練気に入りました（${DESIRE_RENKI_RECOVERY_MS / 1000}秒 / 完了時MP ${REST_COMPLETION_MANA_FLOOR}）。`);
    touch(room);
    return { duplicate: false, batch: Boolean(desireHold?.batch), desireRecovery: true };
  }
  if (options.holdId) {
    const committed = commitAbilityHold(room, player, options.holdId, "/api/renki");
    if (committed.duplicate) return { duplicate: true, batch: Boolean(committed.batch) };
    if (committed.batch) {
      ensureAbilityAvailable(player);
      const timestamp = now();
      // This is one committed operation, never a client-declared repetition
      // count.  The server-owned Renki constants define the whole reward.
      const currentMana = Number(player.mana) || 0;
      const batchMana = currentMana + RENKI_HOLD_MANA_GAIN;
      setMana(room, player, batchMana, "練気・十連");
      player.renkiTargetMana = batchMana;
      player.renkiCompletionKind = "tenfold";
      player.meditatingUntil = timestamp + RENKI_HOLD_FOCUS_DURATION_MS;
      player.vx = 0;
      player.vy = 0;
      player.movementMode = "meditating";
      player.lastMoveAt = timestamp;
      clearAttackState(player);
      pushGainAte(room, player, "mana", { variant: "renki-tenfold", durationMs: 1680 });
      pushMagicEffect(room, "action-renki", player, { radius: 150, playerId: player.id, variant: "tenfold" });
      emitEnhanceActivation(room, player, committed.hold.id);
      setImmediateFeedback(player, "練気・十連", `マナ +${RENKI_HOLD_MANA_GAIN} / CT ${(RENKI_HOLD_FOCUS_DURATION_MS / 1000).toFixed(1)}秒`);
      pushEvent(room, `${player.name} が練気を十連で一括実行しました（マナ +${RENKI_HOLD_MANA_GAIN} / CT ${(RENKI_HOLD_FOCUS_DURATION_MS / 1000).toFixed(1)}秒）。`);
      touch(room);
      return { duplicate: false, batch: true, mana: batchMana };
    }
  }
  ensureAbilityAvailable(player);
  const timestamp = now();
  const currentMana = Number(player.mana) || 0;
  const tapMana = currentMana + RENKI_TAP_MANA_GAIN;
  // Award at commit, rather than slowly at meditation completion.  The target
  // remains the committed amount solely so finishRenki can release movement
  // without issuing a second resource gain.
  setMana(room, player, tapMana, "練気");
  player.renkiTargetMana = tapMana;
  player.renkiCompletionKind = "normal";
  player.meditatingUntil = timestamp + RENKI_TAP_FOCUS_DURATION_MS;
  player.vx = 0;
  player.vy = 0;
  player.movementMode = "meditating";
  player.lastMoveAt = timestamp;
  clearAttackState(player);
  pushGainAte(room, player, "mana", { variant: "renki", durationMs: 1680 });
  pushMagicEffect(room, "action-renki", player, { radius: 120, playerId: player.id });
  setImmediateFeedback(player, "練気", `マナ +${RENKI_TAP_MANA_GAIN} / CT ${(RENKI_TAP_FOCUS_DURATION_MS / 1000).toFixed(1)}秒`);
  pushEvent(room, `${player.name} が練気の精神統一に入りました（マナ +${RENKI_TAP_MANA_GAIN} / CT ${(RENKI_TAP_FOCUS_DURATION_MS / 1000).toFixed(1)}秒）。`);
  touch(room);
  return { duplicate: false, batch: false };
}

function donateCredits(room, player) {
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在は募金できません。");
  }
  ensureConscious(player);
  if ((Number(player.credits) || 0) < DONATION_CREDIT_COST) {
    throw new ApiError(400, `募金には${DONATION_CREDIT_COST}Cが必要です。`);
  }
  player.credits -= DONATION_CREDIT_COST;
  const luckBeforeDonation = luckValueFor(player);
  const rationalDonation = isRational(player);
  const donationLuckDelta = rationalDonation ? DONATION_LUCK_GAIN : -DONATION_LUCK_GAIN;
  player.donationLuckBonus = clampNumber(
    Math.round(((Number(player.donationLuckBonus) || 0) + donationLuckDelta) * 100) / 100,
    DONATION_LUCK_MIN_BONUS,
    DONATION_LUCK_MAX_BONUS,
    0
  );
  player.luck = luckValueFor(player);
  const donationResultDelta = Math.round((player.luck - luckBeforeDonation) * 100) / 100;
  const donationResultText = donationResultDelta === 0
    ? "変化なし（上限・下限）"
    : `${donationResultDelta > 0 ? "+" : ""}${donationResultDelta.toFixed(2)}`;
  setImmediateFeedback(
    player,
    "スマホ募金",
    `-${DONATION_CREDIT_COST}C / 幸運・直観 ${donationResultText}`
  );
  pushMagicEffect(room, "action-smartphone", player, {
    radius: 105,
    variant: rationalDonation ? "donation-rational" : "donation-unjust",
    donationResultDelta
  });
  if (rationalDonation) {
    if (donationResultDelta > 0) pushGainAte(room, player, "luckBoost", { variant: "donation-rational", durationMs: 1680 });
  } else {
    pushMagicEffect(room, "action-mana", player, { radius: 125, variant: "欲望" });
  }
  pushSound(room, "object", player, { distance: 900, volume: 0.55 });
  touch(room);
}

function finishRenki(room, player, timestamp) {
  if (player.desireRenkiRecovery && (room.phase !== "playing" || !player.alive || player.ejected || player.inVent)) {
    player.desireRenkiRecovery = false;
    player.renkiTargetMana = null;
    player.renkiCompletionKind = "";
    player.meditatingUntil = 0;
    if (player.movementMode === "meditating") player.movementMode = "idle";
    return;
  }
  if (room.phase !== "playing") return;
  if (player.renkiTargetMana == null || !player.meditatingUntil || player.meditatingUntil > timestamp) return;
  const desireRecovery = Boolean(player.desireRenkiRecovery);
  const completionKind = String(player.renkiCompletionKind || "normal");
  player.renkiTargetMana = null;
  player.renkiCompletionKind = "";
  player.meditatingUntil = 0;
  player.desireRenkiRecovery = false;
  if (player.movementMode === "meditating") player.movementMode = "idle";
  if (desireRecovery) {
    completeDesireManaRecovery(room, player, "renki", timestamp);
    return;
  }
  // Renki grants MP at commit. Completion releases focus and reports the ATE;
  // it must not restore the saved target over drains or gains during focus.
  pushMagicEffect(room, "action-mana", player, { radius: 135, playerId: player.id, variant: "renki", completionKind });
  pushEvent(room, `${player.name} が精神統一を完了しました。`);
  touch(room);
}

function grantIdeaAspect(room, player, aspect) {
  if (player.desireIdeaForfeited) return false;
  if (aspect === "truth") {
    grantPushCharge(room, player, false, "idea-truth");
    pushMagicEffect(room, "idea-truth", player, { radius: 135, playerId: player.id });
    pushEvent(room, `${player.name} が真を獲得し、バストを得ました。`);
    return true;
  }
  grantStandFirmCharge(room, player, false, "idea-beauty");
  pushMagicEffect(room, "idea-beauty", player, { radius: 145, playerId: player.id });
  pushEvent(room, `${player.name} が美を獲得し、バリアを得ました。`);
  return true;
}

function grantIdeaGood(room, player, timestamp) {
  if (player.desireIdeaForfeited) return false;
  player.goodActive = true;
  grantPushCharge(room, player, false, "idea-good");
  grantStandFirmCharge(room, player, false, "idea-good");
  recoverHealth(player, Math.max(1, Math.max(0, Number(player.bodyHits) || 0) + 1));
  player.slowedUntil = 0;
  player.taserSlowedUntil = 0;
  player.shockSlowedUntil = 0;
  player.gravityStormSlowUntil = 0;
  player.gravityStormSlowMultiplier = 1;
  player.abilityDisabledUntil = 0;
  player.unconsciousUntil = 0;
  setStamina(room, player, staminaCapacityFor(player), "善", timestamp);
  pushMagicEffect(room, "idea-good", player, { radius: 185, playerId: player.id });
    pushEvent(room, `${player.name} が善を獲得し、バスト・バリア・回復・加速を統合しました。`);
  return true;
}

function beginIdeaAscension(room, player, timestamp) {
  if (!player.alive || player.ejected || player.desireIdeaForfeited) return false;
  if (room.phase !== "playing" || ideaWinnerIdsFor(room).includes(player.id)) return false;
  // Preserve genuine simultaneous arrivals, but never collect a player whose
  // canonical arrival belongs to a later tick while the first ascension
  // animation is still playing.  The old max() deadline made a one-second
  // Luck lead indistinguishable from a tie.
  const firstArrivalAt = Number(room.ideaVictoryArrivalAt) || 0;
  if (firstArrivalAt > 0 && timestamp !== firstArrivalAt) return false;
  if (!firstArrivalAt) room.ideaVictoryArrivalAt = timestamp;
  player.ideaStage = 4;
  player.ascensionStartedAt = timestamp;
  player.ascensionUntil = timestamp + IDEA_ASCENSION_ANIMATION_MS;
  player.vx = 0;
  player.vy = 0;
  player.inVent = false;
  player.ventId = "";
  clearAttackState(player);
  const winnerIds = setIdeaWinnerIds(room, [...ideaWinnerIdsFor(room), player.id]);
  room.pendingIdeaVictoryAt = Number(room.ideaVictoryArrivalAt) + IDEA_ASCENSION_ANIMATION_MS;
  pushMagicEffect(room, "idea-ascension", player, { radius: 260, playerId: player.id });
  pushEvent(room, `${player.name} が善のイデアへ到達しました。光る翼とともに昇天を開始します（現在の到達者${winnerIds.length}人）。`);
  touch(room);
  return true;
}

function advanceIdeaProgress(room, player, timestamp) {
  if (!player.alive || player.ejected) {
    resetIdeaProgress(player);
    return;
  }
  if (room.phase !== "playing" || player.ideaStage >= 4) return;
  if (player.desireIdeaForfeited || isDesireState(player) || player.desireBias) {
    forfeitIdeaAttainment(player);
    return;
  }
  if (!isRational(player)) {
    resetIdeaProgress(player);
    return;
  }
  if (!player.ideaProgressStartedAt) {
    player.ideaProgressStartedAt = timestamp;
    player.ideaProgressMs = 0;
    player.ideaProgressUpdatedAt = timestamp;
  }
  const previousUpdate = Number(player.ideaProgressUpdatedAt) || timestamp;
  const deltaMs = Math.max(0, timestamp - previousUpdate);
  const progressRate = ideaProgressRateFor(player);
  player.ideaProgressMs = Math.max(0, Number(player.ideaProgressMs) || 0) + deltaMs * progressRate;
  player.ideaProgressUpdatedAt = timestamp;
  player.ideaProgressStartedAt = timestamp - player.ideaProgressMs;
  const elapsed = player.ideaProgressMs;
  if (player.ideaStage < 1 && elapsed >= IDEA_FIRST_ASPECT_MS) {
    player.ideaFirstAspect = Math.random() < 0.5 ? "truth" : "beauty";
    grantIdeaAspect(room, player, player.ideaFirstAspect);
    player.ideaStage = 1;
  }
  if (player.ideaStage < 2 && elapsed >= IDEA_SECOND_ASPECT_MS) {
    grantIdeaAspect(room, player, player.ideaFirstAspect === "truth" ? "beauty" : "truth");
    player.ideaStage = 2;
  }
  if (player.ideaStage < 3 && elapsed >= IDEA_GOOD_MS) {
    grantIdeaGood(room, player, timestamp);
    player.ideaStage = 3;
  }
  if (player.ideaStage < 4 && elapsed >= IDEA_ASCENSION_MS) beginIdeaAscension(room, player, timestamp);
}

function rectContains(rect, x, y, radius = 0) {
  if (Array.isArray(rect.polygon) && rect.polygon.length >= 3) {
    const insetRadius = Math.max(0, Number(radius) || 0);
    if (!pointInsidePolygon(x, y, rect.polygon)) return false;
    if (!insetRadius) return true;
    for (let index = 0; index < rect.polygon.length; index += 1) {
      const start = rect.polygon[index];
      const end = rect.polygon[(index + 1) % rect.polygon.length];
      if (pointToSegmentDistance(x, y, start[0], start[1], end[0], end[1]) < insetRadius) return false;
    }
    return true;
  }
  return x >= rect.x + radius && x <= rect.x + rect.w - radius && y >= rect.y + radius && y <= rect.y + rect.h - radius;
}

function pointInsidePolygon(x, y, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [currentX, currentY] = polygon[index];
    const [previousX, previousY] = polygon[previous];
    const crosses = (currentY > y) !== (previousY > y) &&
      x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY || 1) + currentX;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared)) : 0;
  return Math.hypot(px - (ax + dx * ratio), py - (ay + dy * ratio));
}

function isWalkable(room, x, y, radius = 0) {
  const map = getMap(room);
  const insideMap = x >= radius && y >= radius && x <= map.width - radius && y <= map.height - radius;
  if (!insideMap) return false;
  const seamMargin = Math.max(radius, WALKABLE_SEAM_MARGIN);
  if (!map.walkable.some((rect) => rectContains(rect, x, y, -seamMargin))) return false;
  if (map.medicalWallCollision?.isBlocked(x, y, radius)) return false;
  if (map.objectSpaceCollision?.isBlocked(x, y, radius)) return false;
  return true;
}

function isObjectSpaceClear(map, x, y, radius = 0) {
  return !map.objectSpaceCollision?.isBlocked(x, y, radius);
}

function resolveObjectAwareMovementPosition(map, mover, nx, ny, radius) {
  const clampedX = clampNumber(nx, radius, map.width - radius, mover.x);
  const clampedY = clampNumber(ny, radius, map.height - radius, mover.y);
  if (isObjectSpaceClear(map, clampedX, clampedY, radius)) return { x: clampedX, y: clampedY };
  if (isObjectSpaceClear(map, clampedX, mover.y, radius)) return { x: clampedX, y: mover.y };
  if (isObjectSpaceClear(map, mover.x, clampedY, radius)) return { x: mover.x, y: clampedY };
  return { x: mover.x, y: mover.y };
}

function resolveCollisionAwareMovementPosition(room, map, mover, nx, ny, radius, bypassFloor) {
  // Bot navigation can advance 120 ms per call. Test the travelled path, not
  // only its endpoint, so a sprint cannot step across a narrow footprint.
  const steps = Math.max(1, Math.ceil(Math.hypot(nx - mover.x, ny - mover.y) / 8));
  const stepX = (nx - mover.x) / steps;
  const stepY = (ny - mover.y) / steps;
  let position = { x: mover.x, y: mover.y };
  for (let step = 0; step < steps; step += 1) {
    const x = position.x + stepX;
    const y = position.y + stepY;
    if (bypassFloor) {
      position = resolveObjectAwareMovementPosition(map, position, x, y, radius);
    } else if (isWalkable(room, x, y, radius)) {
      position = { x, y };
    } else if (isWalkable(room, x, position.y, radius)) {
      position = { x, y: position.y };
    } else if (isWalkable(room, position.x, y, radius)) {
      position = { x: position.x, y };
    }
  }
  return position;
}

function isFloorArea(room, x, y, radius = 0) {
  const map = getMap(room);
  const insideMap = x >= radius && y >= radius && x <= map.width - radius && y <= map.height - radius;
  if (!insideMap) return false;
  const seamMargin = Math.max(radius, WALKABLE_SEAM_MARGIN);
  return map.walkable.some((rect) => rectContains(rect, x, y, -seamMargin));
}

function setGravityLevitationEngaged(room, player, active, reason = "") {
  if (!player) return false;
  const next = Boolean(active);
  if (Boolean(player.levitationEngaged) === next) return false;
  player.levitationEngaged = next;
  if (!next) player.levitationManaCarry = 0;
  pushSound(room, next ? "gravity-levitation-onset" : "gravity-levitation-end", player, {
    ownerId: player.id,
    maxDistance: 720,
    volume: next ? 0.62 : 0.5,
    sourceKind: "player",
    variant: String(reason || (next ? "support-engaged" : "support-released"))
  });
  return true;
}

function advanceLevitationMana(room, player, elapsedMs) {
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
    setGravityLevitationEngaged(room, player, false, "actor-inactive");
    return;
  }
  const radius = getMap(room).playerRadius || 36;
  const offFloor = !isFloorArea(room, player.x, player.y, radius);
  if (!offFloor) {
    setGravityLevitationEngaged(room, player, false, "floor-return");
    return;
  }
  if (!hasOperatorAccess(player, "gravity")) {
    setGravityLevitationEngaged(room, player, false, "gravity-access-ended");
    return;
  }
  if (!player.levitationEngaged) {
    if (!passivesEnabled(player) || Number(player.mana) <= 0) return;
    setGravityLevitationEngaged(room, player, true, "unsupported-floor");
  }
  player.levitationManaCarry = Math.max(0, Number(player.levitationManaCarry) || 0) +
    Math.max(0, elapsedMs) / 1000 * LEVITATION_MANA_DRAIN_PER_SECOND;
  const drain = Math.floor((player.levitationManaCarry + 1e-9) * 100) / 100;
  if (drain < 0.01) return;
  player.levitationManaCarry = Math.max(0, player.levitationManaCarry - drain);
  setMana(room, player, Number(player.mana) - drain, "リビテーション");
  if (Number(player.mana) <= 0) setGravityLevitationEngaged(room, player, false, "mana-empty");
}

function setClairvoyanceActive(room, player, active) {
  const shouldActivate = Boolean(active);
  if (!shouldActivate) {
    player.clairvoyanceActive = false;
    player.clairvoyanceManaCarry = 0;
    touch(room);
    return false;
  }
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "今は千里眼を使用できません。");
  }
  ensureConscious(player);
  if (Number(player.mana) <= 0) throw new ApiError(400, "千里眼に必要なMPがありません。");
  player.clairvoyanceActive = true;
  player.clairvoyanceManaCarry = Math.max(0, Number(player.clairvoyanceManaCarry) || 0);
  markSoloMissionAction(room, player, "clairvoyance");
  touch(room);
  return true;
}

function advanceClairvoyanceMana(room, player, elapsedMs) {
  if (!player.clairvoyanceActive) return;
  if (room.phase === "meeting") return;
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
    player.clairvoyanceActive = false;
    player.clairvoyanceManaCarry = 0;
    return;
  }
  player.clairvoyanceManaCarry = Math.max(0, Number(player.clairvoyanceManaCarry) || 0) +
    Math.max(0, elapsedMs) / 1000 * CLAIRVOYANCE_MANA_DRAIN_PER_SECOND;
  const drain = Math.floor((player.clairvoyanceManaCarry + 1e-9) * 100) / 100;
  if (drain < 0.01) return;
  player.clairvoyanceManaCarry = Math.max(0, player.clairvoyanceManaCarry - drain);
  setMana(room, player, Number(player.mana) - drain, "千里眼");
  if (Number(player.mana) <= 0) {
    player.clairvoyanceActive = false;
    player.clairvoyanceManaCarry = 0;
    pushEvent(room, `${player.name} の千里眼はMP切れで終了しました。`);
  }
}

function activeLevitationSources(player, timestamp = now()) {
  const sources = [];
  if (Number(player?.hoverSprintUntil) > timestamp) sources.push("hoverSprint");
  if (
    hasOperatorAccess(player, "gravity") &&
    Number(player.mana) > 0 &&
    (passivesEnabled(player) || player.levitationEngaged)
  ) sources.push("gravity");
  return sources;
}

function canLevitate(player, timestamp = now()) {
  return activeLevitationSources(player, timestamp).length > 0;
}

function synchronizeSharedLevitationExpiry(room, player, timestamp = now()) {
  if (!player) return false;
  const active = activeLevitationSources(player, timestamp).length > 0;
  player.sharedLevitationActive = active;
  // `sharedLevitationActive` is presentation/reconciliation state, never the
  // authority for survival. A missed state update used to make an already
  // false flag indistinguishable from an hover-sprint expiry, leaving an off-floor
  // player alive. Re-evaluate actual timed sources on every tick: hover sprint is
  // active strictly before its deadline, while Gravity remains independent.
  if (active) return false;
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) return false;
  const radius = getMap(room).playerRadius || 36;
  if (isFloorArea(room, player.x, player.y, radius)) return false;
  const destroyed = destroyPlayerUnconditionally(room, null, player, "共有浮揚終了後の足場外落下", {
    noKillCutin: true,
    attackKind: "unsupported-fall-after-levitation",
    attackLabel: "共有浮揚終了後の足場外落下",
    bypassSlashGuard: true,
    ignorePreparationBarrier: true,
    ignoreFriendlyFire: true
  });
  if (destroyed) {
    checkWin(room);
    touch(room);
  }
  return destroyed;
}

function moveToward(room, player, target, dtSeconds, sprint = false) {
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const len = Math.hypot(dx, dy) || 1;
  movePlayer(room, player, dx / len, dy / len, dtSeconds, sprint);
}

function clearWalkLine(room, start, end, radius) {
  const length = distance(start, end);
  const steps = Math.max(1, Math.ceil(length / 24));
  for (let index = 1; index <= steps; index += 1) {
    const ratio = index / steps;
    const x = start.x + (end.x - start.x) * ratio;
    const y = start.y + (end.y - start.y) * ratio;
    if (!isWalkable(room, x, y, radius)) return false;
  }
  return true;
}

function nearestOpenGridCell(matrix, column, row) {
  const height = matrix.length;
  const width = matrix[0]?.length || 0;
  const startX = Math.max(0, Math.min(width - 1, column));
  const startY = Math.max(0, Math.min(height - 1, row));
  for (let radius = 0; radius <= 5; radius += 1) {
    for (let y = startY - radius; y <= startY + radius; y += 1) {
      for (let x = startX - radius; x <= startX + radius; x += 1) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (matrix[y][x] === 0) return { x, y };
      }
    }
  }
  return null;
}

function planBotPath(room, bot, target) {
  const map = getMap(room);
  const radius = bot.alive ? map.playerRadius : 8;
  const columns = Math.ceil(map.width / NAV_CELL_SIZE);
  const rows = Math.ceil(map.height / NAV_CELL_SIZE);
  const matrix = Array.from({ length: rows }, (_, row) => (
    Array.from({ length: columns }, (_, column) => {
      const x = Math.min(map.width - radius, (column + 0.5) * NAV_CELL_SIZE);
      const y = Math.min(map.height - radius, (row + 0.5) * NAV_CELL_SIZE);
      return isWalkable(room, x, y, radius) ? 0 : 1;
    })
  ));
  for (const other of room.players.values()) {
    if (other.id === bot.id || other.id === target?.id || !other.alive || other.ejected || other.inVent) continue;
    const column = Math.floor(other.x / NAV_CELL_SIZE);
    const row = Math.floor(other.y / NAV_CELL_SIZE);
    // Blocking a 3x3 area around every player can seal a narrow corridor and
    // leave defender bots without any route. Reserve only the occupied cell;
    // route-conflict handling still keeps bots from following the same line.
    if (matrix[row]?.[column] === 0) matrix[row][column] = 1;
  }
  const start = nearestOpenGridCell(
    matrix,
    Math.floor(bot.x / NAV_CELL_SIZE),
    Math.floor(bot.y / NAV_CELL_SIZE)
  );
  const goal = nearestOpenGridCell(
    matrix,
    Math.floor(target.x / NAV_CELL_SIZE),
    Math.floor(target.y / NAV_CELL_SIZE)
  );
  if (!start || !goal) return [];

  const grid = new PF.Grid(columns, rows, matrix);
  const finder = new PF.AStarFinder({
    allowDiagonal: true,
    dontCrossCorners: true,
    heuristic: PF.Heuristic.octile
  });
  let path = finder.findPath(start.x, start.y, goal.x, goal.y, grid);
  if (!path.length) return [];
  path = PF.Util.compressPath(path);
  const points = path.slice(1).map(([column, row]) => ({
    x: Math.min(map.width - radius, (column + 0.5) * NAV_CELL_SIZE),
    y: Math.min(map.height - radius, (row + 0.5) * NAV_CELL_SIZE)
  }));
  if (isWalkable(room, target.x, target.y, radius)) points.push({ x: target.x, y: target.y });
  return points;
}

function clearBotNavigationIntent(bot) {
  if (!bot) return;
  bot.botNavigationIntent = null;
}

function botNavigationIntentLifetime(room) {
  const activeBotCount = [...(room?.players?.values?.() || [])]
    .filter((player) => player.isBot && !player.ejected && !player.inVent).length;
  // The single expensive planner may need a full round to revisit a Bot.  The
  // intent remains valid across that round, but can never survive a lifecycle
  // change indefinitely.
  return Math.max(420, (activeBotCount + 2) * BOT_TICK_MS);
}

function setBotNavigationIntent(room, bot, waypoint, sprint, timestamp = now()) {
  if (!bot?.isBot || !waypoint || !Number.isFinite(Number(waypoint.x)) || !Number.isFinite(Number(waypoint.y))) return;
  bot.botNavigationIntent = {
    x: Number(waypoint.x),
    y: Number(waypoint.y),
    sprint: Boolean(sprint),
    expiresAt: timestamp + botNavigationIntentLifetime(room)
  };
}

function advanceBotNavigationMotion(room, bot, elapsedMs, timestamp = now()) {
  const intent = bot?.botNavigationIntent;
  if (!intent) return false;
  if (
    !bot.isBot ||
    !bot.alive ||
    bot.ejected ||
    bot.inVent ||
    actionBlockedUntil(bot) > timestamp ||
    botNavigationMustRemainStationary(bot, timestamp) ||
    Number(intent.expiresAt) <= timestamp
  ) {
    clearBotNavigationIntent(bot);
    return false;
  }
  // State serialization and unrelated action responses may revisit tickRoom
  // at the exact same authoritative clock value.  They are observers, not a
  // second movement clock: forcing a minimum 8ms step here made every Slash
  // response nudge all Bots with a live route and appear as action-linked
  // warping on the client.  Preserve the route for the next real elapsed tick.
  if (Number(elapsedMs) <= 0) return false;
  const map = getMap(room);
  const arrivalRadius = Math.max(10, Math.min(30, Number(map.playerRadius) || 18));
  if (distance(bot, intent) <= arrivalRadius) {
    // Path planning is intentionally sparse, but waypoint ownership is not.
    // Reaching the current A* point must advance to the already-authoritative
    // next point in this same cheap tick.  Clearing only the intent here left
    // the remaining navPath untouched and made the Bot wait for its next
    // ~560ms full-planner turn, reproducing the visible action-pulse freeze at
    // every compressed path corner.
    while (Array.isArray(bot.navPath) && bot.navPath.length && distance(bot, bot.navPath[0]) <= arrivalRadius) {
      bot.navPath.shift();
    }
    const nextWaypoint = Array.isArray(bot.navPath) ? bot.navPath[0] : null;
    if (!nextWaypoint) {
      clearBotNavigationIntent(bot);
      return false;
    }
    intent.x = Number(nextWaypoint.x);
    intent.y = Number(nextWaypoint.y);
    intent.expiresAt = timestamp + botNavigationIntentLifetime(room);
  }
  const beforeX = bot.x;
  const beforeY = bot.y;
  // Retain short collision-safe integration slices while consuming the full
  // Bot-only operational interval. A single large move would tunnel through
  // walls; silently clamping it would make a nominal 10x scale only 1.5x.
  let remainingMs = Math.max(0, Number(elapsedMs) || 0) * botOperationalTimeScale(room);
  while (remainingMs > 0) {
    const stepMs = Math.min(120, remainingMs);
    moveToward(room, bot, intent, stepMs / 1000, intent.sprint);
    remainingMs -= stepMs;
  }
  const moved = Math.hypot(bot.x - beforeX, bot.y - beforeY);
  if (moved < 0.05) {
    bot.navStuckTicks = (Number(bot.navStuckTicks) || 0) + 1;
    if (bot.navStuckTicks >= 3) {
      clearBotNavigationIntent(bot);
      bot.navPath = [];
      bot.navCalculatedAt = 0;
      bot.navStuckTicks = 0;
    }
    return false;
  }
  bot.navStuckTicks = 0;
  // A legal route remains alive across planner turns.  Planner cadence is an
  // implementation-budget concern, not an input-expiry signal; lifecycle,
  // stationary action, arrival, or an explicit replanning owner clear it.
  intent.expiresAt = timestamp + botNavigationIntentLifetime(room);
  return true;
}

function moveBotToward(room, bot, target) {
  if (!target) return false;
  const map = getMap(room);
  const radius = bot.alive ? map.playerRadius : 8;
  const hostileChase = bot.role === "attacker" && target?.role === "defender";
  const sprint = distance(bot, target) > (hostileChase ? 76 : 420) && bot.stamina > 22;
  const timestamp = now();
  const routeConflict = [...room.players.values()].some((other) => {
    if (other.id === bot.id || other.id === target?.id || !other.alive || other.ejected || distance(bot, other) > PAIR_ROUTE_RADIUS * 1.5) return false;
    const botLength = Math.hypot(Number(bot.vx) || 0, Number(bot.vy) || 0);
    const otherLength = Math.hypot(Number(other.vx) || 0, Number(other.vy) || 0);
    if (botLength < 0.1 || otherLength < 0.1) return true;
    return (bot.vx * other.vx + bot.vy * other.vy) / (botLength * otherLength) > 0.55;
  });
  if (routeConflict) bot.navForcePathUntil = Math.max(bot.navForcePathUntil || 0, timestamp + 1200);
  if (timestamp >= (bot.navForcePathUntil || 0) && clearWalkLine(room, bot, target, radius)) {
    bot.navPath = [];
    setBotNavigationIntent(room, bot, target, sprint, timestamp);
    const beforeX = bot.x;
    const beforeY = bot.y;
    moveToward(room, bot, target, undefined, sprint);
    const moved = Math.hypot(bot.x - beforeX, bot.y - beforeY);
    bot.navStuckTicks = moved < 0.2 ? (bot.navStuckTicks || 0) + 1 : 0;
    if (bot.navStuckTicks >= 3) {
      bot.navForcePathUntil = timestamp + 900;
      bot.navCalculatedAt = 0;
      bot.navStuckTicks = 0;
    }
    return moved >= 0.2;
  }

  const targetMoved = Math.hypot(target.x - bot.navTargetX, target.y - bot.navTargetY) > 100;
  if (!bot.navPath?.length || targetMoved || timestamp - bot.navCalculatedAt >= BOT_PATH_REFRESH_MS) {
    bot.navPath = planBotPath(room, bot, target);
    bot.navTargetX = target.x;
    bot.navTargetY = target.y;
    bot.navCalculatedAt = timestamp;
  }

  while (bot.navPath.length && distance(bot, bot.navPath[0]) < 32) bot.navPath.shift();
  const waypoint = bot.navPath[0];
  if (!waypoint) {
    clearBotNavigationIntent(bot);
    return false;
  }
  setBotNavigationIntent(room, bot, waypoint, sprint, timestamp);
  const beforeX = bot.x;
  const beforeY = bot.y;
  moveToward(room, bot, waypoint, undefined, sprint);
  const moved = Math.hypot(bot.x - beforeX, bot.y - beforeY);
  bot.navStuckTicks = moved < 0.2 ? (bot.navStuckTicks || 0) + 1 : 0;
  if (bot.navStuckTicks >= 3) {
    bot.navPath = [];
    bot.navCalculatedAt = 0;
    bot.navStuckTicks = 0;
    return false;
  }
  return moved >= 0.2;
}

function advancePairRouteRule(room, timestamp) {
  if (room.phase !== "playing") return;
  if (preparationBarrierActive(room, timestamp)) return;
  const active = [...room.players.values()].filter((player) => player.alive && !player.ejected && !player.inVent);
  for (const player of active) {
    const speed = Math.hypot(Number(player.vx) || 0, Number(player.vy) || 0);
    const partners = speed < 0.12 ? [] : active.filter((other) => {
      if (other.id === player.id || distance(player, other) > PAIR_ROUTE_RADIUS) return false;
      const otherSpeed = Math.hypot(Number(other.vx) || 0, Number(other.vy) || 0);
      if (otherSpeed < 0.12) return false;
      return (player.vx * other.vx + player.vy * other.vy) / (speed * otherSpeed) >= 0.72;
    });
    const ids = partners.map((partner) => partner.id).sort();
    const previous = (player.routePartnerIds || []).join("|");
    const current = ids.join("|");
    if (!ids.length || previous !== current) {
      player.routePartnerIds = ids;
      player.routeSharedSince = ids.length ? timestamp : 0;
      continue;
    }
    if (player.role === "attacker" || timestamp - (Number(player.routeSharedSince) || timestamp) < PAIR_ROUTE_GRACE_MS) continue;
    if ((Number(player.routeDamageReadyAt) || 0) > timestamp) continue;
    player.routeDamageReadyAt = timestamp + PAIR_ROUTE_DAMAGE_INTERVAL_MS;
    const outcome = settleDurableBodyDamage(room, null, player, 1, "ペア行動禁止違反", {
      timestamp,
      attackKind: "pair-route-violation",
      noDirectionalReaction: true
    });
    pushMagicEffect(room, "pair-route-violation", player, { radius: PAIR_ROUTE_RADIUS, playerId: player.id });
    pushEvent(room, outcome.absorbed
      ? `${player.name} のペア行動禁止ダメージは${outcome.defense === "overheal" ? "オーバーヒール" : "装備防御"}に吸収されました。`
      : `${player.name} が同一経路でのペア行動を続け、ダメージを受けました。`);
  }
  checkWin(room);
}

function manaCapacityFor(entity) {
  return Math.max(DEFAULT_MAX_MANA, Number(entity?.maxMana) || 0);
}

function serializeResourceValue(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function serializeHealthValue(value) {
  const health = Number(value) || 0;
  return Math.abs(health - HACKER_ROOT_HEALTH) < 1e-8
    ? HACKER_ROOT_HEALTH
    : serializeResourceValue(health);
}

function expandManaCapacityFor(entity, requestedMana) {
  if (!entity) return DEFAULT_MAX_MANA;
  const requested = Math.max(0, Number(requestedMana) || 0);
  entity.maxMana = Math.max(manaCapacityFor(entity), requested);
  return entity.maxMana;
}

function baseStaminaCapacityFor(entity) {
  return MAX_STORED_STAMINA;
}

function staminaCapacityFor(entity) {
  return baseStaminaCapacityFor(entity);
}

function expandStaminaCapacityFor(entity, requestedStamina) {
  if (entity) entity.maxStoredStamina = MAX_STORED_STAMINA;
  return MAX_STORED_STAMINA;
}

function setStamina(room, entity, requestedStamina, sourceLabel = "スタミナ変動", timestamp = now()) {
  const requested = Math.min(staminaCapacityFor(entity), Number(requestedStamina) || 0);
  expandStaminaCapacityFor(entity, requested);
  entity.stamina = Number(requested.toFixed(6));
  entity.staminaUpdatedAt = timestamp;
  if (room) {
    syncMentalState(room, entity, sourceLabel, timestamp);
    maintainNaturalRecovery(room, entity, timestamp);
  }
  return entity.stamina;
}

function grantStamina(room, entity, amount, sourceLabel = "スタミナ獲得", timestamp = now(), options = {}) {
  const current = options.floorAtZero
    ? Math.max(0, Number(entity?.stamina) || 0)
    : Number(entity?.stamina) || 0;
  return setStamina(room, entity, current + Math.max(0, Number(amount) || 0), sourceLabel, timestamp);
}

function replenishStamina(entity, timestamp, allowRegen = true, multiplier = 1, room = null, expandCapacity = false, plannedActorSeconds = null) {
  const last = entity.staminaUpdatedAt || timestamp;
  const elapsed = plannedActorSeconds == null
    ? Math.min(0.5, Math.max(0, (timestamp - last) / 1000))
    : Math.max(0, Number(plannedActorSeconds) || 0);
  if (allowRegen) {
    const desireMultiplier = desireBiasGroupActive(room, entity) ? DESIRE_BIAS_GROUP_MULTIPLIER : 1;
    const actorTime = plannedActorSeconds == null && room ? playerProgressMultiplier(room, entity, timestamp) : 1;
    const recovery = STAMINA_REGEN_PER_SECOND * elapsed * Math.max(1, multiplier) * desireMultiplier * actorTime;
    const capacity = staminaCapacityFor(entity);
    // Desire intentionally creates a -100 SP debt.  Clamping that debt to zero
    // here made the unified Desire state and its selected cognitive bias vanish
    // on the first idle recovery tick, before the client could observe either.
    // Recover the debt itself; only availableStamina() clamps it for spending.
    const current = Number(entity.stamina) || 0;
    const next = Math.min(capacity, current + recovery);
    expandStaminaCapacityFor(entity, next);
    entity.stamina = Number(next.toFixed(6));
  }
  entity.staminaUpdatedAt = timestamp;
  if (room) {
    syncMentalState(room, entity, "スタミナ回復", timestamp);
    maintainNaturalRecovery(room, entity, timestamp);
  }
}

function availableStamina(entity) {
  return Math.max(0, Number(entity.stamina) || 0);
}

function spendStamina(entity, rawAmount, room = null, sourceLabel = "スタミナ消費") {
  if (hasFighterInfiniteResources(entity)) return false;
  const baseAmount = Math.max(0, Number(rawAmount) || 0);
  const amount = entity?.desireBias === "sunk-cost" ? baseAmount * DESIRE_BIAS_COST_MULTIPLIER : baseAmount;
  const previous = Number(entity.stamina) || 0;
  const next = previous <= 0 ? previous : previous - amount;
  // Walking or another zero-available-SP route must not erase Desire's debt.
  // A positive balance still bottoms out at zero and syncMentalState() then
  // performs the authoritative Desire transition when MP is also exhausted.
  entity.stamina = previous <= 0 ? previous : Math.max(0, next);
  if (room) syncMentalState(room, entity, sourceLabel);
}

function activeTimedAccelerationEffects(player, timestamp = now()) {
  return (Array.isArray(player?.timedAccelerationEffects) ? player.timedAccelerationEffects : [])
    .filter((effect) => Number(effect?.endsAt) > timestamp && Number(effect?.multiplier) > 1);
}

function timedAccelerationSummary(player, timestamp = now()) {
  const effects = activeTimedAccelerationEffects(player, timestamp);
  const bySource = {};
  for (const effect of effects) {
    const source = String(effect.source || "acceleration");
    bySource[source] ||= { count: 0, multiplier: 0, endsAt: 0 };
    bySource[source].count += 1;
    bySource[source].multiplier += Number(effect.multiplier);
    bySource[source].endsAt = Math.max(bySource[source].endsAt, Number(effect.endsAt) || 0);
  }
  const multiplier = effects.length ? effects.reduce((sum, effect) => sum + Number(effect.multiplier), 0) : 1;
  return { count: effects.length, multiplier, bySource };
}

function addTimedAcceleration(player, source, multiplier, durationMs, timestamp = now()) {
  player.timedAccelerationEffects = activeTimedAccelerationEffects(player, timestamp);
  const effect = {
    id: uid("acceleration_"),
    source: String(source || "acceleration"),
    multiplier: Math.max(1, Number(multiplier) || 1),
    startedAt: timestamp,
    endsAt: timestamp + Math.max(0, Number(durationMs) || 0)
  };
  player.timedAccelerationEffects.push(effect);
  if (effect.source === "flora") player.overhealSpeedUntil = Math.max(Number(player.overhealSpeedUntil) || 0, effect.endsAt);
  if (effect.source === "hoverSprint") player.hoverSprintUntil = Math.max(Number(player.hoverSprintUntil) || 0, effect.endsAt);
  return timedAccelerationSummary(player, timestamp);
}

function accelerationMultipliersFor(player, timestamp = now()) {
  const values = [];
  const purchased = Math.max(1, Number(player.speedMultiplier) || 1);
  if (purchased > 1) values.push(purchased);
  if (player.luminousActive) values.push(LUMINOUS_SPEED_MULTIPLIER);
  if (player.limitBreakActive) values.push(limitBreakMultiplier(player));
  if (player.goodActive && passivesEnabled(player)) values.push(GOOD_SPEED_MULTIPLIER);
  for (const effect of activeTimedAccelerationEffects(player, timestamp)) values.push(Number(effect.multiplier));
  return values;
}

function additiveAccelerationMultiplier(player, extraMultipliers = [], timestamp = now()) {
  const values = [...accelerationMultipliersFor(player, timestamp), ...extraMultipliers]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 1);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : 1;
}

function effectiveSpeedMultiplier(player, extraMultipliers = [], timestamp = now()) {
  return additiveAccelerationMultiplier(player, extraMultipliers, timestamp);
}

function accelerationTimerMultiplier(player, extraMultipliers = [], timestamp = now()) {
  return additiveAccelerationMultiplier(player, extraMultipliers, timestamp);
}

function effectiveAccelerationMultiplier(room, player, timestamp = now(), movementSource = null) {
  if (movementSource ? movementSource.stopped : timeKeeperStops(player, timestamp)) return 0;
  // Clairvoyance owns remote-view traversal. While it is active, its ACC 2
  // replaces every ordinary acceleration/slow source without mutating any of
  // those source states, so ending Clairvoyance restores them intact.
  if (movementSource ? movementSource.clairvoyanceActive : player?.clairvoyanceActive) return FIXED_MOVEMENT_ACC;
  const passive = activeMapObjectEffects(room, player);
  const gravityScale = movementSource ? movementSource.gravityScale : gravityTimeScaleFor(room, player, timestamp);
  const accelerations = passive.speedBoost ? [MAP_OBJECT_SPEED_MULTIPLIER] : [];
  const accelerated = movementSource ? [...(movementSource.accelerationComponents || []), ...accelerations].reduce((sum, value) => sum + value, 0) || 1 : accelerationTimerMultiplier(player, accelerations, timestamp);
  return gravityScale < 1 ? gravityScale : accelerated;
}

// Actor-time is intentionally separate from movement ACC.  ACC Fixed may cap
// movement at 2, while every personal progression path follows the underlying
// acceleration source (or a received time slow) without advancing the world.
function playerProgressMultiplier(room, player, timestamp = now(), movementSource = null) {
  if (movementSource ? movementSource.stopped : timeKeeperStops(player, timestamp)) return 0;
  const desireTimeMultiplier = player?.desireBias === "cognitive-dissonance" && !player.desireRenkiRecovery
    ? DESIRE_BIAS_TIME_MULTIPLIER
    : 1;
  return Math.max(0, effectiveAccelerationMultiplier(room, player, timestamp, movementSource) * desireTimeMultiplier);
}

function movementAccState(room, player, timestamp = now(), movementSource = null) {
  const enabled = movementSource ? movementSource.movementAccEnabled !== false : player?.movementAccEnabled !== false;
  const acceleration = effectiveAccelerationMultiplier(room, player, timestamp, movementSource);
  const available = acceleration + 1e-6 >= MOVEMENT_ACC_ACTIVATION_THRESHOLD;
  const active = enabled && available;
  return {
    enabled,
    active,
    available,
    // OFF releases the final movement clamp.  It must expose the current
    // authoritative source acceleration (including TimeKeeper's zero), not
    // cache NORMAL_MOVEMENT_ACC while the source keeps advancing.
    selected: !enabled ? acceleration : active ? FIXED_MOVEMENT_ACC : NORMAL_MOVEMENT_ACC,
    maximum: FIXED_MOVEMENT_ACC,
    threshold: MOVEMENT_ACC_ACTIVATION_THRESHOLD
  };
}

function setMovementAccEnabled(room, player, rawEnabled) {
  if (!room || !player || !["playing", "meeting"].includes(room.phase) || player.ejected) {
    throw new ApiError(403, "現在は移動ACCを変更できません。");
  }
  player.movementAccEnabled = rawEnabled !== false;
  const state = movementAccState(room, player);
  const label = `ACC ${state.maximum}`;
  setImmediateFeedback(player, "移動ACC", state.active ? `${label} 固定中` : state.enabled ? `${label} 待機` : `${label} OFF`);
  touch(room);
  return state;
}

function persistentStatusAteState(room, player, timestamp = now()) {
  const passive = activeMapObjectEffects(room, player);
  const acceleration = additiveAccelerationMultiplier(
    player,
    passive.speedBoost ? [MAP_OBJECT_SPEED_MULTIPLIER] : [],
    timestamp
  ) > 1.001;
  return {
    naturalRecovery: hasNaturalRecovery(room, player),
    acceleration,
    clairvoyance: Boolean(player.clairvoyanceActive),
    levitation: Boolean(player.levitationEngaged || Number(player.hoverSprintUntil) > timestamp),
    hpReduction: hasLimitBreakDeathVulnerability(player),
    resistanceBreak: hasLimitBreakDeathVulnerability(player),
    standFirm: (Number(player.gritCharges) || 0) > 0,
    push: (Number(player.reasonCharges) || 0) > 0,
    iai: (Number(player.iaiCharges) || 0) > 0,
    burning: Boolean(player.burnStatus),
    poison: Boolean(player.poisonStatus)
  };
}

const ACCELERATED_ACTION_UNTIL_FIELDS = Object.freeze([
  "damageReactionUntil",
  "bustUntil",
  "sleepingUntil",
  "unconsciousUntil",
  "meditatingUntil",
  "smartphoneUntil",
  "gravityPinnedUntil",
  "ascensionUntil",
  "itemDisabledUntil",
  "abilityDisabledUntil",
  "taserSlowedUntil",
  "shockSlowedUntil",
  "gunnerReloadUntil",
  "attackResolveAt",
  "dodgeActiveUntil",
  "floraInvisibleUntil",
  "airborneUntil",
  "particleCannonUntil",
  "particleCannonNextAt",
  "gunnerFiringNextAt",
  "gunnerFiringEndsAt",
  "aimExpiresAt",
  "slashActiveUntil",
  "slashPerfectUntil",
  "slashDetachedGuardUntil",
  "standFirmBarrierUntil",
  "objectLuckUntil",
  "quantumElectricSlowUntil",
  "gravityStormSlowUntil"
]);

// These anchors are read through the actor's own timestamp deltas. Moving an
// anchor by the same adjustment as a deadline gives exactly one time-scale
// application; their callers must continue to consume ordinary timestamps.
const ACCELERATED_PLAYER_PROGRESS_ANCHOR_FIELDS = Object.freeze([
  "lastPassiveCreditAt",
  "taskPresenceSince",
  // Idea uses heavenly elapsed time; never shift its last-update anchor with actor time.
  "desireRestRecoveryStartedAt",
  "enhanceChargeStartedAt"
]);

const TIME_KEEPER_FROZEN_DEADLINE_FIELDS = Object.freeze([
  "hoverSprintUntil",
  "dodgeActiveUntil",
  "limitBreakEndsAt",
  "slowedUntil",
  "gravityStormSlowUntil",
  "overhealSpeedUntil",
  "floraInvisibleUntil",
  "airborneUntil",
  "objectLuckUntil",
  "gravityTimeEndsAt",
  "timeKeeperEndsAt",
  "particleCannonUntil",
  "particleCannonNextAt",
  "gunnerFiringNextAt",
  "gunnerFiringEndsAt",
  "botTargetUntil",
  "botRetaliationUntil",
  "botWitnessUntil",
  "botClairvoyanceUntil",
  "botClairvoyanceObservedUntil",
  "nextBotClairvoyanceAt",
  "botDeceptionUntil",
  "heardWaypointUntil"
]);

const TIME_KEEPER_FROZEN_ANCHOR_FIELDS = Object.freeze([
  "gunnerLastShotAt",
  "lastPassiveCreditAt",
  "staminaUpdatedAt",
  "desireRestRecoveryStartedAt",
  "taskPresenceSince",
  "ideaProgressStartedAt",
  "ideaProgressUpdatedAt",
  "ascensionStartedAt",
  "routeSharedSince",
  "botTaskPresenceSince",
  "botTaskPresenceLastTickAt",
  "botDeceptionPresenceSince"
]);

function timeKeeperStops(player, timestamp = now()) {
  return Number(player?.timeStoppedUntil) > timestamp;
}

function roomTimeKeeperActive(room, timestamp = now()) {
  return [...room.players.values()].some((player) => (
    Number(player.timeKeeperEndsAt) > timestamp
  ));
}

function synchronizeTimeKeeperStops(room, timestamp = now()) {
  const activeCasters = [...room.players.values()].filter((player) => Number(player.timeKeeperEndsAt) > timestamp);
  if (!activeCasters.length) return;
  for (const target of room.players.values()) {
    if (!target.alive || target.ejected) continue;
    const controllingCaster = activeCasters
      .filter((caster) => caster.id !== target.id)
      .sort((a, b) => Number(b.timeKeeperEndsAt) - Number(a.timeKeeperEndsAt))[0];
    if (!controllingCaster) continue;
    target.timeStoppedUntil = Math.max(Number(target.timeStoppedUntil) || 0, Number(controllingCaster.timeKeeperEndsAt) || timestamp);
  }
}

function freezeRoomTimeKeeperState(room, elapsedMs, timestamp = now(), previousTimestamp = timestamp, planned = false) {
  if (!planned && !roomTimeKeeperActive(room, timestamp)) return false;
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  for (const zone of room.gravityZones || []) {
    if (Number(zone.endsAt) <= previousTimestamp) continue;
    zone.startedAt = (Number(zone.startedAt) || timestamp) + elapsed;
    zone.barrierUntil = (Number(zone.barrierUntil) || timestamp) + elapsed;
    zone.endsAt = Number(zone.endsAt) + elapsed;
    zone.lastPulseAt = (Number(zone.lastPulseAt) || timestamp) + elapsed;
  }
  return true;
}

function freezePlayerTimeKeeperState(player, elapsedMs, timestamp = now(), previousTimestamp = timestamp - elapsedMs) {
  if (!timeKeeperStops(player, timestamp)) return;
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  if (!elapsed) return;
  for (const field of new Set([...TIME_KEEPER_FROZEN_DEADLINE_FIELDS, ...ACCELERATED_ACTION_UNTIL_FIELDS])) {
    const deadline = Number(player[field]) || 0;
    if (deadline > previousTimestamp) player[field] = deadline + elapsed;
  }
  for (const field of new Set([...TIME_KEEPER_FROZEN_ANCHOR_FIELDS, ...ACCELERATED_PLAYER_PROGRESS_ANCHOR_FIELDS])) {
    const anchor = Number(player[field]) || 0;
    if (anchor > 0) player[field] = anchor + elapsed;
  }
  for (const [key, rawValue] of Object.entries(player)) {
    if (!key.endsWith("ReadyAt")) continue;
    const deadline = Number(rawValue) || 0;
    if (deadline > previousTimestamp) player[key] = deadline + elapsed;
  }
  player.objectCooldowns ||= {};
  for (const [key, rawValue] of Object.entries(player.objectCooldowns)) {
    const deadline = Number(rawValue) || 0;
    if (deadline > previousTimestamp) player.objectCooldowns[key] = deadline + elapsed;
  }
  for (const effect of player.timedAccelerationEffects || []) {
    if (Number(effect.endsAt) <= previousTimestamp) continue;
    effect.startedAt = (Number(effect.startedAt) || timestamp) + elapsed;
    effect.endsAt = Number(effect.endsAt) + elapsed;
  }
  for (const field of ["poisonStatus", "burnStatus"]) {
    const status = player[field];
    if (!status) continue;
    if (Number(status.nextTickAt) > previousTimestamp) status.nextTickAt = Number(status.nextTickAt) + elapsed;
  }
  for (const observation of player.botVisibleThrowObservations || []) {
    if (Number(observation.observedAt) > 0) observation.observedAt = Number(observation.observedAt) + elapsed;
    if (Number(observation.landsAt) > previousTimestamp) observation.landsAt = Number(observation.landsAt) + elapsed;
    if (Number(observation.poisonLandingObservedAt) > 0) observation.poisonLandingObservedAt = Number(observation.poisonLandingObservedAt) + elapsed;
    if (Number(observation.expiresAt) > previousTimestamp) observation.expiresAt = Number(observation.expiresAt) + elapsed;
    for (const victim of Object.values(observation.visiblePoisonVictims || {})) {
      if (Number(victim.firstSeenAt) > 0) victim.firstSeenAt = Number(victim.firstSeenAt) + elapsed;
      if (Number(victim.lastSeenAt) > 0) victim.lastSeenAt = Number(victim.lastSeenAt) + elapsed;
    }
  }
}

function advanceAccelerationTime(room, player, elapsedMs, timestamp = now(), progressMultiplier = playerProgressMultiplier(room, player, timestamp)) {
  if (room.phase !== "playing" || !player.alive || player.ejected || timeKeeperStops(player, timestamp)) return;
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  const previousTimestamp = timestamp - elapsed;
  const multiplier = Math.max(0, Number(progressMultiplier) || 0);
  const adjustment = elapsed * (multiplier - 1);
  if (Math.abs(adjustment) < 0.001) return;
  const readyDeadlines = Object.fromEntries(Object.entries(player).filter(([key, value]) => key.endsWith("ReadyAt") && Number(value) > previousTimestamp));
  const objectCooldowns = Object.fromEntries(Object.entries(player.objectCooldowns || {}).filter(([, value]) => Number(value) > previousTimestamp));
  const gunCadenceAt = Number(player.gunReadyAt) || 0;
  const particleCadenceAt = Number(player.particleCannonNextAt) || 0;
  if (adjustment > 0) reducePlayerCooldowns(player, adjustment, timestamp);
  else extendPlayerCooldowns(player, -adjustment, timestamp);
  for (const [field, deadline] of Object.entries(readyDeadlines)) player[field] = Number(deadline) - adjustment;
  for (const [field, deadline] of Object.entries(objectCooldowns)) player.objectCooldowns[field] = Number(deadline) - adjustment;
  for (const field of ACCELERATED_ACTION_UNTIL_FIELDS) {
    const deadline = Number(player[field]) || 0;
    if (deadline > previousTimestamp) player[field] = deadline - adjustment;
  }
  for (const field of ACCELERATED_PLAYER_PROGRESS_ANCHOR_FIELDS) {
    const anchor = Number(player[field]) || 0;
    if (anchor > 0) player[field] = anchor - adjustment;
  }
  for (const field of ["poisonStatus", "burnStatus"]) {
    const status = player[field];
    const nextTickAt = Number(status?.nextTickAt) || 0;
    if (nextTickAt > previousTimestamp) status.nextTickAt = nextTickAt - adjustment;
  }
  // Cadence deadlines retain their elapsed excess. Generic cooldown handling
  // correctly clamps ordinary readiness, but clamping these would discard the
  // extra shots/beams earned during this actor tick.
  if (gunCadenceAt > 0) player.gunReadyAt = gunCadenceAt - adjustment;
  if (particleCadenceAt > 0) player.particleCannonNextAt = particleCadenceAt - adjustment;
}

function activeMapObjectEffects(room, player) {
  const objects = getMap(room).objects || [];
  const speedPad = objects.find((object) => (
    object.type === "speedPad" && distance(player, object) <= Number(object.radius || 90)
  ));
  const hushField = objects.find((object) => (
    object.type === "hushField" && distance(player, object) <= Number(object.radius || 110)
  ));
  return {
    speedBoost: Boolean(speedPad),
    quiet: Boolean(hushField),
    labels: [speedPad?.label, hushField?.label].filter(Boolean)
  };
}

function effectiveMovementMultiplier(room, player, timestamp = now(), movementSource = null) {
  if (movementSource ? movementSource.stopped : timeKeeperStops(player, timestamp)) return 0;
  if (movementSource ? movementSource.clairvoyanceActive : player?.clairvoyanceActive) return DEFAULT_MOVEMENT_SPEED_MULTIPLIER * FIXED_MOVEMENT_ACC;
  const electricSlowMultiplier = movementSource ? movementSource.electricSlowMultiplier : Number(player.taserSlowedUntil) > timestamp ||
    Number(player.shockSlowedUntil) > timestamp ||
    Number(player.quantumElectricSlowUntil) > timestamp
    ? TASER_MOVEMENT_MULTIPLIER
    : 1;
  const gravityStormMultiplier = movementSource ? movementSource.gravityStormMultiplier : Number(player.gravityStormSlowUntil) > timestamp
    ? clampNumber(player.gravityStormSlowMultiplier, GRAVITY_STORM_SLOW_MULTIPLIER_MIN, 1, 1)
    : 1;
  const groupMultiplier = desireBiasGroupActive(room, player) ? DESIRE_BIAS_GROUP_MULTIPLIER : 1;
  // Cognitive dissonance is a legal post-ACC movement modifier.  It must not
  // alter the source threshold that arms ACC Fixed (for example a temporary acceleration source
  // at ACC 2); otherwise a slow would incorrectly disable the fixed state.
  const desireTimeMultiplier = player?.desireBias === "cognitive-dissonance"
    ? DESIRE_BIAS_TIME_MULTIPLIER
    : 1;
  // ACC Fixed owns the final authoritative movement acceleration only while
  // armed; OFF returns the active source acceleration from movementAccState.
  const movementState = movementAccState(room, player, timestamp, movementSource);
  // ACC OFF already exposes gravity's scale as selected; apply it only when
  // ACC's enabled clamp has substituted NORMAL_MOVEMENT_ACC for a slow.
  const gravityTimeMultiplier = movementState.enabled ? (movementSource ? movementSource.gravityScale : gravityTimeScaleFor(room, player, timestamp)) : 1;
  const movementAcceleration = movementState.selected;
  return DEFAULT_MOVEMENT_SPEED_MULTIPLIER * movementAcceleration * gravityTimeMultiplier * electricSlowMultiplier * gravityStormMultiplier * groupMultiplier * desireTimeMultiplier;
}

function floraAromaSource(room, player) {
  return player.alive && !player.ejected && hasOperatorAccess(player, "flora") && passivesEnabled(player)
    ? player
    : null;
}

function floraAromaMultiplier(room, player) {
  return floraAromaSource(room, player) ? FLORA_AROMA_REGEN_MULTIPLIER : 1;
}

function activateHoverSprintForUnsupportedMovement(room, player, targetX, targetY, timestamp = now()) {
  const radius = getMap(room).playerRadius;
  if (
    room.phase !== "playing" ||
    !player.alive || player.ejected || player.inVent ||
    actionBlockedUntil(player) > timestamp ||
    Number(player.hoverSprintUntil) > timestamp ||
    Number(player.hoverSprintReadyAt) > timestamp ||
    !hasFloorSupport(room, player.x, player.y, radius) ||
    hasFloorSupport(room, targetX, targetY, radius) ||
    (!hasFighterInfiniteResources(player) && (Number(player.mana) || 0) < HOVER_SPRINT_BASE_MANA_COST)
  ) return false;
  spendHeldPowerMana(room, player, HOVER_SPRINT_BASE_MANA_COST, "ホバースプリント");
  addTimedAcceleration(player, "hoverSprint", HOVER_SPRINT_BASE_ACC_MULTIPLIER, HOVER_SPRINT_BASE_DURATION_MS, timestamp);
  player.hoverSprintReadyAt = timestamp + HOVER_SPRINT_ACTIVATION_COOLDOWN_MS;
  pushMagicEffect(room, "hover-sprint-active", player, {
    radius: 135, playerId: player.id, variant: "auto-unsupported",
    durationMs: 1200,
    accelerationMultiplier: HOVER_SPRINT_BASE_ACC_MULTIPLIER
  });
  setImmediateFeedback(player, `ホバースプリント（${HOVER_SPRINT_BASE_MANA_COST}MP）`, `浮揚 8秒 / ACC 1.8 / CT ${HOVER_SPRINT_ACTIVATION_COOLDOWN_MS / 1000}秒`);
  pushEvent(room, `${player.name} が足場のない場所へ移動してホバースプリント（${HOVER_SPRINT_BASE_MANA_COST}MP）を発動しました（浮揚 8秒 / ACC 1.8 / CT ${HOVER_SPRINT_ACTIVATION_COOLDOWN_MS / 1000}秒）。`);
  return true;
}

function movePlayer(room, player, rawDx, rawDy, forcedDt, wantsDash = false, wantsSlow = false, clockSample = null) {
  if (room.phase !== "playing" || player.ejected || player.inVent) return;
  const timestamp = now();
  const movementBlocked = clockSample
    ? clockSample.stopped || actionBlockedUntil({ ...player, timeStoppedUntil: 0 }) > timestamp
    : actionBlockedUntil(player) > timestamp;
  if (movementBlocked) {
    if (player.isBot) clearBotNavigationIntent(player);
    player.vx = 0;
    player.vy = 0;
    player.movementMode = player.ascensionUntil > timestamp
      ? "ascension"
      : player.sleepingUntil > timestamp
        ? "sleep"
        : player.gravityPinnedUntil > timestamp
          ? "gravity-pinned"
        : (clockSample?.stopped || timeKeeperStops(player, timestamp))
          ? "time-stopped"
          : "unconscious";
    return;
  }
  const dt = forcedDt ?? Math.min(0.08, Math.max(0.008, (timestamp - player.lastMoveAt) / 1000));
  player.lastMoveAt = timestamp;
  const mover = player;

  let dx = clampNumber(rawDx, -1, 1, 0);
  let dy = clampNumber(rawDy, -1, 1, 0);
  const len = Math.hypot(dx, dy);
  if (len > 1) {
    dx /= len;
    dy /= len;
  }
  if (!dx && !dy) {
    mover.vx = 0;
    mover.vy = 0;
    mover.movementMode = "idle";
    const stationaryRestActive = syncAutomaticStationaryRest(room, mover, true, timestamp);
    const naturalRecoveryActive = hasNaturalRecovery(room, mover);
    replenishStamina(
      mover,
      timestamp,
      true,
      (stationaryRestActive ? SLEEP_REGEN_MULTIPLIER : 1) * (naturalRecoveryActive ? floraAromaMultiplier(room, mover) : 1),
      room,
      naturalRecoveryActive
    );
    completeRestAtFullStamina(room, mover, timestamp);
    return;
  }
  // SP is the authoritative movement resource for living actors.  Apply the
  // same gate before walk, slow walk, dash, and automatic Hover Sprint so a
  // held input cannot advance an actor after its balance reaches zero.  This
  // deliberately lives in the common movement integrator: Bot navigation
  // uses it too, while teleports, knockback, and other authoritative position
  // changes retain their own non-input routes.
  if (player.alive && availableStamina(mover) <= 0) {
    mover.vx = 0;
    mover.vy = 0;
    mover.movementMode = "idle";
    return;
  }
  // A zero-time packet switches intent after prior movement was integrated.
  // Preserve immediate aiming input without reclassifying physical motion.
  // Explicit zero-direction packets already settle rest in the branch above.
  if (dt <= 0) {
    if (wantsDash && (Number(player.hoverSprintUntil) > timestamp || availableStamina(mover) > 0.5)) clearGunnerAim(player);
    if (!player.gunnerSnipingActive) {
      player.aimX = dx;
      player.aimY = dy;
    }
    return;
  }
  const interruptedDesireRestStartedAt = Number(mover.desireRestRecoveryStartedAt) || 0;
  syncAutomaticStationaryRest(room, mover, false, timestamp);
  const hoverSprintActiveBeforeMove = Number(player.hoverSprintUntil) > timestamp;
  const canDash = Boolean(wantsDash && (hoverSprintActiveBeforeMove || availableStamina(mover) > 0.5));
  const movementMode = canDash ? "dash" : wantsSlow ? "slow" : "walk";
  mover.vx = dx;
  mover.vy = dy;
  mover.movementMode = movementMode;
  if (movementMode === "dash") clearGunnerAim(player);
  if (!player.gunnerSnipingActive) {
    player.aimX = dx;
    player.aimY = dy;
  }

  const map = getMap(room);
  const boost = canDash ? DASH_MULTIPLIER : wantsSlow ? SLOW_WALK_MULTIPLIER : 1;
  const slowedMultiplier = 1;
  const passiveEffects = player.alive
    ? activeMapObjectEffects(room, player)
    : { speedBoost: false, quiet: false };
  const baseSpeed = player.alive ? map.speed * effectiveMovementMultiplier(room, player, timestamp, clockSample?.movementSource || null) : map.ghostSpeed;
  const speed = baseSpeed * boost * slowedMultiplier;
  const radius = player.alive ? map.playerRadius : 8;
  const beforeX = mover.x;
  const beforeY = mover.y;
  const nx = mover.x + dx * speed * dt;
  const ny = mover.y + dy * speed * dt;
  if (player.alive) activateHoverSprintForUnsupportedMovement(room, player, nx, ny, timestamp);
  const hoverSprintActive = Number(player.hoverSprintUntil) > timestamp;
  // HS grants motion without SP spend from the same movement packet, including
  // its activation packet. Ordinary sprint spending resumes as soon as HS ends.
  if (canDash && !hoverSprintActive) {
    spendStamina(mover, DASH_DRAIN_PER_SECOND * dt * playerProgressMultiplier(room, mover, timestamp, clockSample?.movementSource || null), room, "ダッシュ");
    mover.lastDashAt = timestamp;
  }
  if (!player.alive) {
    mover.x = clampNumber(nx, radius, map.width - radius, mover.x);
    mover.y = clampNumber(ny, radius, map.height - radius, mover.y);
  } else if (player.hoverSprintUntil > timestamp || canLevitate(player)) {
    // These movement modes may cross map boundaries, but physical furniture
    // remains solid. Preserve their wall-bypass semantics and slide along an
    // occupied footprint just like ordinary movement slides along map walls.
    const position = resolveCollisionAwareMovementPosition(room, map, mover, nx, ny, radius, true);
    mover.x = position.x;
    mover.y = position.y;
  } else {
    const position = resolveCollisionAwareMovementPosition(room, map, mover, nx, ny, radius, false);
    mover.x = position.x;
    mover.y = position.y;
  }
  const movedDistance = Math.hypot(mover.x - beforeX, mover.y - beforeY);
  if (movedDistance > 0) {
    observeNinjutsuTargetMovement(room, mover, beforeX, beforeY, movedDistance, dt, timestamp);
  }
  if (beforeX === mover.x && beforeY === mover.y) {
    mover.vx = 0;
    mover.vy = 0;
    mover.movementMode = "idle";
    if (interruptedDesireRestStartedAt > 0) mover.desireRestRecoveryStartedAt = interruptedDesireRestStartedAt;
    syncAutomaticStationaryRest(room, mover, true, timestamp);
    return;
  }
  if (player.alive && movementMode !== "dash" && !hoverSprintActive) {
    const drainRate = movementMode === "slow" ? SLOW_WALK_DRAIN_PER_SECOND : WALK_DRAIN_PER_SECOND;
    spendStamina(mover, drainRate * dt * playerProgressMultiplier(room, mover, timestamp, clockSample?.movementSource || null), room, movementMode === "slow" ? "無音歩行" : "歩行");
  }
  const soundInterval = movementMode === "dash" ? 210 : 430;
  const silentAssassinStep = hasAssassinSilentStepsAccess(player);
  if (player.alive && !silentAssassinStep && movementMode !== "slow" && !passiveEffects.quiet && timestamp - (mover.lastSoundAt || 0) >= soundInterval) {
    mover.lastSoundAt = timestamp;
    pushSound(room, movementMode === "dash" ? "dash" : "walk", mover, {
      ownerId: player.id,
      sourceKind: "player",
      maxDistance: movementMode === "dash" ? 1600 : 650,
      volume: movementMode === "dash" ? 1 : 0.34
    });
  }
}

function findStation(map, id) {
  return map.stations.find((station) => station.id === id);
}

function nearestStation(room, player, predicate = () => true, range = Infinity) {
  const map = getMap(room);
  let best = null;
  let bestDistance = range;
  for (const station of map.stations) {
    if (!predicate(station)) continue;
    const dist = distance(player, station);
    if (dist <= bestDistance) {
      best = station;
      bestDistance = dist;
    }
  }
  return best ? { station: best, distance: bestDistance } : null;
}

function whichRoom(map, player) {
  const found = map.rooms.find((room) => rectContains(room, player.x, player.y, 0));
  return found?.label || "連絡通路";
}

function taskProgress(room) {
  const defenders = [...room.players.values()].filter((player) => player.role === "defender");
  const allTasks = defenders.flatMap((player) => player.taskList);
  const done = allTasks.filter((task) => task.done).length;
  return { done, total: allTasks.length };
}

function soleHumanBotMatchPlayer(room) {
  const players = [...room.players.values()].filter((player) => !player.midJoinAvailable);
  if (!players.some((player) => player.isBot)) return null;
  const humans = players.filter((player) => !player.isBot);
  return humans.length === 1 ? humans[0] : null;
}

function humanPlayersInBotMatch(room) {
  const players = [...room.players.values()].filter((player) => !player.midJoinAvailable);
  if (!players.some((player) => player.isBot)) return [];
  return players.filter((player) => !player.isBot);
}

function winningHumansInBotMatch(room, winnerRole) {
  return humanPlayersInBotMatch(room).filter((player) => player.role === winnerRole);
}

function generatedOfflineSoloBotTimeScaleApplies(room, human = soleHumanBotMatchPlayer(room)) {
  return Boolean(
    room &&
    !room.soloMission &&
    room.matchmaking?.status === "offline" &&
    human &&
    !human.isBot
  );
}

function activateSoloHumanDeathBotTimeScale(room, target, timestamp = now()) {
  if (!generatedOfflineSoloBotTimeScaleApplies(room, target)) return false;
  if (room.soloHumanDeathBotTimeScaleActive) return false;
  room.soloHumanDeathBotTimeScale = SOLO_HUMAN_DEATH_BOT_TIME_SCALE;
  room.soloHumanDeathBotTimeScaleActive = true;
  room.soloHumanDeathBotTimeScaleActivatedAt = timestamp;
  pushEvent(room, "ソロプレイヤー戦闘不能: Bot行動速度を10倍へ切替。");
  return true;
}

function botOperationalTimeScale(room) {
  return room?.soloHumanDeathBotTimeScaleActive && room?.matchmaking?.status === "offline"
    ? SOLO_HUMAN_DEATH_BOT_TIME_SCALE
    : 1;
}

function botPlannerSlotsForRoom(room) {
  return botOperationalTimeScale(room);
}

const BOT_OPERATIONAL_DEADLINE_FIELDS = Object.freeze([
  "nextBotActionAt", "nextBotVentAt", "nextBotDefenseDecisionAt", "nextBotClairvoyanceAt",
  "killReadyAt", "gunReadyAt", "gunnerReloadUntil", "gunnerSpecialAmmoReadyAt", "hoverSprintReadyAt",
  "dodgeReadyAt", "teleportReadyAt", "empReadyAt", "gravityStormReadyAt",
  "vibeCodingReadyAt", "fighterEnergyChargeReadyAt", "rationalFreeAbilityReadyAt", "particleCannonNextAt",
  "routeDamageReadyAt", "botTargetUntil", "botDeceptionUntil", "botRetaliationUntil", "botWitnessUntil",
  "botClairvoyanceUntil", "botClairvoyanceObservedUntil", "heardWaypointUntil"
]);

const BOT_OPERATIONAL_ANCHOR_FIELDS = Object.freeze([
  "botTaskPresenceSince", "botTaskPresenceLastTickAt", "botDeceptionPresenceSince"
]);

function advanceBotOperationalTime(room, elapsedMs, timestamp = now()) {
  const scale = botOperationalTimeScale(room);
  if (scale <= 1 || elapsedMs <= 0 || room.phase !== "playing") return;
  const bonusMs = Math.max(0, (scale - 1) * elapsedMs);
  const advanceDeadline = (value) => {
    const deadline = Number(value);
    return Number.isFinite(deadline) && deadline > timestamp
      ? Math.max(timestamp, deadline - bonusMs)
      : value;
  };
  for (const bot of room.players.values()) {
    if (!bot.isBot || !bot.alive || bot.ejected) continue;
    for (const field of BOT_OPERATIONAL_DEADLINE_FIELDS) bot[field] = advanceDeadline(bot[field]);
    for (const field of BOT_OPERATIONAL_ANCHOR_FIELDS) {
      const anchor = Number(bot[field]);
      if (Number.isFinite(anchor) && anchor > 0) bot[field] = Math.max(0, anchor - bonusMs);
    }
    for (const taskId of Object.keys(bot.botTaskBlockedUntilById || {})) {
      bot.botTaskBlockedUntilById[taskId] = advanceDeadline(bot.botTaskBlockedUntilById[taskId]);
    }
    for (const objectId of Object.keys(bot.objectCooldowns || {})) {
      bot.objectCooldowns[objectId] = advanceDeadline(bot.objectCooldowns[objectId]);
    }
  }
}

function recordBotMatchElimination(room, target, source = null) {
  if (!target) return;
  target.botMatchEliminatedById = String(source?.id || "");
  if (target.gunFiring) stopGunnerFire(room, target, { reason: "戦闘不能" });
  discardHackerRootState(target);
  clearEnhanceChargeState(target);
  // This is the sole authoritative death funnel. The target is still a human
  // at this point, so Bot deaths and online/mission deaths cannot arm it.
  activateSoloHumanDeathBotTimeScale(room, target);
}

const AMBIGUOUS_KILL_CAMERA_ACTION_LABELS = new Set([
  "",
  "死亡原因不明",
  "攻撃",
  "能力",
  "射撃",
  "物理攻撃",
  "非物理攻撃",
  "破壊",
  "反射された攻撃",
  "居合を帯びた攻撃"
]);

function requireExactKillCameraActionLabel(value, context = "death") {
  const label = String(value || "").trim();
  if (
    AMBIGUOUS_KILL_CAMERA_ACTION_LABELS.has(label) ||
    (label.includes("通常") && label.includes("攻撃"))
  ) {
    throw new Error(`Exact kill-camera action label required for ${context}.`);
  }
  return label;
}

const BOT_WITNESS_EVIDENCE_LABELS = Object.freeze({
  "visible-hostile-kill": "目の前または千里眼の視点で対象のキルを視認",
  "observed-kill-burst-exceeds-attacker-count": "同時に視認した犠牲者数が公開された攻撃陣営人数を超過",
  "visual-poison-throw-death": "投擲動作・毒物の着地・毒表示中の被害者・死亡瞬間を連続して視認",
  "visible-attack-motion-body-chain": "直接見た攻撃動作と近傍で直接発見した死体の時空間連鎖"
});

function botKillDecisionEvidenceLabels(room, bot, target, timestamp = now()) {
  if (!room || !bot?.isBot || !target) return [];
  const labels = [];
  if (String(bot.botWitnessTargetId || "") === target.id && Number(bot.botWitnessUntil) > timestamp) {
    const label = BOT_WITNESS_EVIDENCE_LABELS[String(bot.botWitnessEvidenceKind || "")];
    if (label) labels.push(label);
  }
  if (String(bot.botRetaliationTargetId || "") === target.id && Number(bot.botRetaliationUntil) > timestamp) {
    labels.push("対象から受けたキルをバリアでボディダメージへ変換し、攻撃者を視認");
  }
  if (botCanDirectlyObservePlayer(room, bot, target)) {
    labels.push("通常視界と遮蔽物判定を通して対象を直接視認");
  }
  if (
    String(bot.botClairvoyanceTargetId || "") === target.id &&
    Number(bot.botClairvoyanceObservedUntil) > timestamp
  ) {
    labels.push("千里眼で対象を直接観測し、その観測位置を記憶");
  }
  return [...new Set(labels)];
}

function rememberBotKillDecision(room, bot, target, options = {}, timestamp = now()) {
  if (!room || !bot?.isBot || !target) return null;
  const actionLabel = String(options.actionLabel || "攻撃手段").trim();
  const evidence = [...new Set([
    ...botKillDecisionEvidenceLabels(room, bot, target, timestamp),
    ...(Array.isArray(options.evidence) ? options.evidence.map(String).filter(Boolean) : [])
  ])];
  const reasons = [...new Set(
    (Array.isArray(options.reasons) ? options.reasons : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )];
  const parts = [];
  if (evidence.length) parts.push(`観測証拠: ${evidence.join("／")}`);
  if (reasons.length) parts.push(`判断: ${reasons.join("、")}`);
  parts.push(`選択: ${actionLabel}`);
  const record = {
    targetId: target.id,
    at: timestamp,
    code: String(options.code || "bot-combat-decision"),
    actionLabel,
    actionKinds: Array.isArray(options.actionKinds) ? options.actionKinds.map(String).filter(Boolean) : null,
    evidence,
    logic: parts.join("。")
  };
  bot.botKillDecision = record;
  return record;
}

function botKillCameraDecision(room, source, target, details = {}, timestamp = now()) {
  if (!source?.isBot || !target) return null;
  // Only the dynamic extent of the actual counter action owns this evidence.
  // A later unrelated kill must never inherit a stale special counter label.
  const immediateCounter = source.botImmediateNinjutsuCounter;
  if (immediateCounter?.targetId === target.id) {
    return { code: "visible-ninjutsu-self-defense-counter", logic: immediateCounter.logic, evidence: [...immediateCounter.evidence] };
  }
  const trace = source.botKillDecision;
  if (
    trace &&
    String(trace.targetId || "") === target.id &&
    (!Array.isArray(trace.actionKinds) || trace.actionKinds.includes(String(details.actionKind || ""))) &&
    timestamp - Number(trace.at) >= 0 &&
    timestamp - Number(trace.at) <= BOT_KILL_DECISION_TRACE_TTL_MS
  ) {
    return {
      code: String(trace.code || "bot-combat-decision"),
      logic: String(trace.logic || ""),
      evidence: Array.isArray(trace.evidence) ? trace.evidence.map(String) : []
    };
  }
  const actionKind = String(details.actionKind || "");
  const actionLabel = String(details.actionLabel || "攻撃手段");
  if (actionKind.startsWith("reflected-")) {
    return {
      code: "visible-perfect-guard-reflection",
      logic: `観測証拠: 自分へ向けられた${actionLabel.replace(/^反射された/, "")}を視認。判断: ジャストガードが成立したため攻撃者へ反射。選択: ${actionLabel}`,
      evidence: ["自分へ向けられた攻撃を視認"]
    };
  }
  if (actionKind === "fighter-dodge-counter") {
    return {
      code: "visible-certain-kill-dodge-counter",
      logic: "観測証拠: 自分へ向けられたキルを視認。判断: 回避が成立したためファイターのキルカウンターを発動。選択: 回避キルカウンター",
      evidence: ["自分へ向けられたキルを視認"]
    };
  }
  const evidence = botKillDecisionEvidenceLabels(room, source, target, timestamp);
  if (evidence.length) {
    return {
      code: "observable-evidence-at-impact",
      logic: `観測証拠: ${evidence.join("／")}。判断: 致死時点に保持していた観測証拠を表示。選択: ${actionLabel}`,
      evidence
    };
  }
  return {
    code: "decision-trace-unavailable",
    logic: `判断記録なし: ${actionLabel}に対応する人間可知の判断記録が残っていないため、内部情報から理由を補完しません。`,
    evidence: []
  };
}

function recordKillCamera(room, target, source = null, details = {}) {
  if (!room || !target || target.ejected) return null;
  const timestamp = Number(details.timestamp) || now();
  const actionLabel = requireExactKillCameraActionLabel(details.actionLabel, details.actionKind || "death");
  const actionKind = String(details.actionKind || "").trim();
  if (!actionKind) throw new Error(`Exact kill-camera action kind required for ${actionLabel}.`);
  const sourceLabel = String(details.sourceLabel || "");
  const killerName = String(details.killerName || source?.name || "環境・ルール");
  const botDecision = botKillCameraDecision(room, source, target, {
    ...details,
    actionLabel,
    actionKind
  }, timestamp);
  const record = {
    id: uid("killcam_"),
    at: timestamp,
    mapId: String(getMap(room).id || ""),
    areaLabel: whichRoom(getMap(room), target),
    victimId: target.id,
    victimName: target.name,
    victimX: Math.round(Number(target.x) || 0),
    victimY: Math.round(Number(target.y) || 0),
    killerId: String(source?.id || ""),
    killerName,
    killerIsBot: Boolean(source?.isBot),
    killerSkinId: String(source?.skinId || (source?.isBot ? "operator" : "")),
    killerX: Math.round(Number(source?.x ?? target.x) || 0),
    killerY: Math.round(Number(source?.y ?? target.y) || 0),
    actionLabel,
    actionKind,
    sourceLabel,
    reflected: actionKind.includes("reflected") || Boolean(details.reflected),
    result: String(details.result || "死亡"),
    botDecisionCode: String(botDecision?.code || ""),
    botDecisionLogic: String(botDecision?.logic || ""),
    botDecisionEvidence: Array.isArray(botDecision?.evidence) ? botDecision.evidence : []
  };
  target.killCamera = record;
  return record;
}

function botMatchHumanEarnedEliminationVictory(room, winnerRole) {
  const winningHumans = winningHumansInBotMatch(room, winnerRole);
  if (winningHumans.length === 0) return true;
  const winningHumanIds = new Set(winningHumans.map((player) => player.id));
  const opponents = [...room.players.values()].filter((player) => (
    !player.midJoinAvailable && player.role !== winnerRole
  ));
  return opponents.length > 0 && opponents.every((player) => (
    (!player.alive || player.ejected) && winningHumanIds.has(player.botMatchEliminatedById)
  ));
}

function botMatchHumanOwnsVictory(room, winner, cause = null) {
  const humans = humanPlayersInBotMatch(room);
  if (humans.length === 0) return true;
  const victoryCause = cause || {};

  if (winner === "idea") {
    const sourceIds = Array.isArray(victoryCause.sourceIds)
      ? victoryCause.sourceIds.map(String)
      : ideaWinnerIdsFor(room);
    return victoryCause.type === "idea" && humans.some((player) => sourceIds.includes(player.id));
  }

  const winnerRole = winner === "defenders"
    ? "defender"
    : winner === "attackers"
      ? "attacker"
      : "";
  if (room.soloMission) {
    const trainee = room.players.get(room.soloMission.playerId);
    if (!trainee || !winnerRole || winnerRole !== trainee.role) return true;
    return victoryCause.type === "soloMission" &&
      String(victoryCause.sourceId || "") === trainee.id &&
      Boolean(room.soloMission.completed);
  }
  const winningHumans = winningHumansInBotMatch(room, winnerRole);
  if (!winnerRole || winningHumans.length === 0) return true;

  if (victoryCause.type === "elimination") {
    return botMatchHumanEarnedEliminationVictory(room, winnerRole);
  }
  if (victoryCause.type === "tasks") {
    return winningHumans.every((human) => {
      const tasks = Array.isArray(human.taskList) ? human.taskList : [];
      return human.alive && !human.ejected && tasks.length > 0 && tasks.every((task) => task.done);
    });
  }
  return false;
}

function botIsEnemyOfSoleHuman(room, bot) {
  return Boolean(bot?.isBot && !botSharesTeamWithHuman(room, bot));
}

function botSharesTeamWithHuman(room, bot) {
  if (!bot?.isBot) return false;
  return [...room.players.values()].some((player) => (
    !player.isBot &&
    !player.midJoinAvailable &&
    player.role === bot.role
  ));
}

function botOpposesLivingHuman(room, bot) {
  if (!bot?.isBot || room.soloMission) return false;
  return [...room.players.values()].some((player) => (
    !player.isBot &&
    !player.midJoinAvailable &&
    player.alive &&
    !player.ejected &&
    player.role !== bot.role
  ));
}

function botAllyCannotFinishTarget(room, source, target) {
  const human = soleHumanBotMatchPlayer(room);
  return Boolean(
    human &&
    source?.isBot &&
    source.role === human.role &&
    target?.role !== human.role
  );
}

function taskProgressForWin(room) {
  const humans = humanPlayersInBotMatch(room);
  if (humans.length === 0) return taskProgress(room);
  const defenderHumans = humans.filter((player) => player.role === "defender");
  // Bot defenders may defeat human attackers, but cannot supply a human defender's win.
  if (defenderHumans.length === 0) return { done: 0, total: 0 };
  const tasks = defenderHumans.flatMap((player) => Array.isArray(player.taskList) ? player.taskList : []);
  if (defenderHumans.some((player) => !player.alive || player.ejected)) return { done: 0, total: tasks.length };
  return { done: tasks.filter((task) => task.done).length, total: tasks.length };
}

function alivePlayers(room, role) {
  return [...room.players.values()].filter((player) => player.role === role && player.alive && !player.ejected);
}

function finish(room, winner, reason, cause = {}) {
  if (!botMatchHumanOwnsVictory(room, winner, cause)) return false;
  room.phase = "ended";
  for (const player of room.players.values()) clearFloraInvisible(room, player, "試合終了で解除");
  room.winner = winner;
  commitResultBoard(room);
  if (room.soloMission?.id === "cpu-gravity" && winner === "attackers") {
    room.soloMission.hintUnlocked = true;
  }
  room.finishReason = reason;
  updatePlayerProfiles(room);
  room.meeting = null;
  room.pendingIdeaVictoryAt = 0;
  room.ideaVictoryArrivalAt = 0;
  room.players.forEach((player) => {
    player.inVent = false;
    player.ventId = "";
    player.dodgeActiveUntil = 0;
    player.slashActiveUntil = 0;
    player.slashPerfectUntil = 0;
    player.slashGuardInputReleased = true;
    player.clairvoyanceActive = false;
    player.clairvoyanceManaCarry = 0;
    clearAttackState(player);
  });
  const ideaWinnerCount = winner === "idea" ? ideaWinnerIdsFor(room).length : 0;
  const winnerLabel = winner === "defenders"
    ? "ディフェンダー"
    : winner === "attackers"
      ? "アタッカー"
      : `善のイデア到達者${ideaWinnerCount > 1 ? ` ${ideaWinnerCount}人` : ""}`;
  pushEvent(room, `${winnerLabel}勝利: ${reason}`);
  touch(room);
  return true;
}

function forceEnd(room, player) {
  if (room.hostId !== player.id) throw new ApiError(403, "ホストだけが強制終了できます。");
  room.phase = "ended";
  for (const entry of room.players.values()) clearFloraInvisible(room, entry, "試合終了で解除");
  room.winner = "none";
  // A forced end has neither a winner nor a loser. Clear any Idea winner
  // before deterministic MVP selection and the immutable rank-point seal.
  setIdeaWinnerIds(room, []);
  commitResultBoard(room);
  room.finishReason = `${player.name} が試合を強制終了しました。`;
  room.meeting = null;
  room.pendingIdeaVictoryAt = 0;
  room.ideaVictoryArrivalAt = 0;
  room.players.forEach((entry) => {
    entry.inVent = false;
    entry.ventId = "";
    entry.dodgeActiveUntil = 0;
    entry.slashActiveUntil = 0;
    entry.slashPerfectUntil = 0;
    entry.slashGuardInputReleased = true;
    entry.clairvoyanceActive = false;
    entry.clairvoyanceManaCarry = 0;
    clearAttackState(entry);
  });
  updatePlayerProfiles(room);
  pushEvent(room, room.finishReason);
  touch(room);
}

function soloMissionDefinition(room) {
  return room.soloMission ? SOLO_MISSIONS[room.soloMission.id] || null : null;
}

function soloMissionProgress(room, timestamp = now()) {
  const mission = soloMissionDefinition(room);
  const state = room.soloMission;
  if (!mission || !state) return null;
  if (mission.metric === "task") return `${Math.min(1, state.taskCount || 0)} / 1 タスク`;
  if (mission.metric === "kill") {
    const player = room.players.get(state.playerId);
    return `${Math.min(1, Number(player?.totalKills) || 0)} / 1 撃破`;
  }
  if (mission.metric === "defense") {
    if (!state.defenseActivatedAt) return "回避を発動する";
    const seconds = Math.min(mission.surviveMs / 1000, Math.max(0, (timestamp - state.defenseActivatedAt) / 1000));
    return `防御後の生存 ${seconds.toFixed(1)} / ${(mission.surviveMs / 1000).toFixed(0)}秒`;
  }
  if (mission.metric === "emp") {
    const outcomes = new Set(Array.isArray(state.empTrainingOutcomes) ? state.empTrainingOutcomes : []);
    return `打ち消し ${outcomes.has("cancel") ? "完了" : "未完了"} / 増強 ${outcomes.has("amplify") ? "完了" : "未完了"}`;
  }
  if (mission.metric === "cpu") return "グラビティCPUの手順を妨害して生存";
  return mission.objective;
}

function completeSoloMission(room, mission) {
  if (!room.soloMission || room.soloMission.completed || room.phase !== "playing") return false;
  room.soloMission.completed = true;
  const winner = mission.team === "attacker" ? "attackers" : "defenders";
  const finished = finish(room, winner, `ソロ訓練「${mission.name}」を達成しました。`, {
    type: "soloMission",
    sourceId: room.soloMission.playerId
  });
  if (!finished) room.soloMission.completed = false;
  return finished;
}

function evaluateSoloMission(room, timestamp = now()) {
  const mission = soloMissionDefinition(room);
  const state = room.soloMission;
  if (!mission || !state || state.completed || room.phase !== "playing") return false;
  const player = room.players.get(state.playerId);
  if (!player || !player.alive || player.ejected) return false;
  let completed = false;
  if (mission.metric === "task") completed = state.taskCount >= 1;
  else if (mission.metric === "kill") completed = player.totalKills >= 1;
  else if (mission.metric === "defense") {
    completed = Boolean(state.defenseActivatedAt) && timestamp - state.defenseActivatedAt >= mission.surviveMs;
  }
  else if (mission.metric === "emp") {
    const outcomes = new Set(Array.isArray(state.empTrainingOutcomes) ? state.empTrainingOutcomes : []);
    completed = outcomes.has("cancel") && outcomes.has("amplify");
  }
  else if (mission.metric === "cpu" || mission.metric === "cpu2") {
    const cpu = room.players.get(state.cpuBotId);
    completed = Boolean(cpu) && (!cpu.alive || cpu.ejected) && cpu.botMatchEliminatedById === player.id;
  }
  return completed ? completeSoloMission(room, mission) : false;
}

function markSoloMissionAction(room, player, action) {
  const state = room.soloMission;
  if (!state || state.playerId !== player.id || state.completed) return;
  if (action === "task") state.taskCount += 1;
  else if (action === "defense" && !state.defenseActivatedAt) state.defenseActivatedAt = now();
  evaluateSoloMission(room);
}

function resolvePendingIdeaVictory(room, timestamp) {
  if (!room.pendingIdeaVictoryAt || timestamp < room.pendingIdeaVictoryAt) return false;
  const ideaWinners = ideaWinnerIdsFor(room)
    .map((id) => room.players.get(id))
    .filter((player) => player && player.alive && !player.ejected && !player.desireIdeaForfeited);
  if (ideaWinners.length) {
    const winnerNames = ideaWinners.map((player) => player.name).join("、");
    const sourceIds = ideaWinners.map((player) => player.id);
    // Commit only eligible survivors to the result board, including simultaneous arrivals.
    setIdeaWinnerIds(room, sourceIds);
    if (finish(room, "idea", winnerNames + " が善のイデアへ到達しました。", {
      type: "idea",
      sourceId: sourceIds[0],
      sourceIds
    })) return true;
  }
  // Missing/dead candidates or denied ownership must not lock ordinary victory checks.
  room.pendingIdeaVictoryAt = 0;
  room.ideaVictoryArrivalAt = 0;
  setIdeaWinnerIds(room, []);
  return false;
}

function checkWin(room) {
  if (room.phase !== "playing" && room.phase !== "meeting") return;
  if (room.pendingIdeaVictoryAt) return;
  if (evaluateSoloMission(room)) return;
  if (room.soloMission) {
    const trainee = room.players.get(room.soloMission.playerId);
    if (trainee && (!trainee.alive || trainee.ejected)) {
      const winner = trainee.role === "attacker" ? "defenders" : "attackers";
      finish(room, winner, "訓練目標の達成前にプレイヤーが行動不能になりました。", {
        type: "soloMissionFailure",
        sourceId: ""
      });
    }
    return;
  }
  const attackers = alivePlayers(room, "attacker");
  const defenders = alivePlayers(room, "defender");
  const progress = taskProgressForWin(room);

  if (attackers.length === 0) {
    if (botMatchHumanEarnedEliminationVictory(room, "defender")) {
      finish(room, "defenders", "アタッカーを全員排除しました。", { type: "elimination" });
    }
    return;
  }
  if (defenders.length === 0 && room.phase === "playing") {
    if (botMatchHumanEarnedEliminationVictory(room, "attacker")) {
      finish(room, "attackers", "ディフェンダーが全滅しました。", { type: "elimination" });
    }
    return;
  }
  if (progress.total > 0 && progress.done >= progress.total) {
    finish(room, "defenders", "全タスクを完了しました。", { type: "tasks" });
    return;
  }
}

function completeTasksAfterDeath(room, player) {
  if (player.role !== "defender") return 0;
  player.taskPresenceTaskId = "";
  player.taskPresenceSince = 0;
  let completed = 0;
  for (const task of player.taskList) {
    if (task.done) continue;
    task.done = true;
    completed += 1;
  }
  if (completed > 0) pushEvent(room, `${player.name} の死亡後タスク ${completed}件を完了扱いにしました。`);
  return completed;
}

const MEETING_PAUSED_PLAYER_DEADLINE_FIELDS = Object.freeze([
  "gunnerReloadUntil",
  "hoverSprintUntil",
  "dodgeActiveUntil",
  "limitBreakEndsAt",
  "itemDisabledUntil",
  "slowedUntil",
  "taserSlowedUntil",
  "shockSlowedUntil",
  "quantumElectricSlowUntil",
  "gravityStormSlowUntil",
  "sleepingUntil",
  "unconsciousUntil",
  "gravityPinnedUntil",
  "abilityDisabledUntil",
  "overhealSpeedUntil",
  "floraInvisibleUntil",
  "airborneUntil",
  "meditatingUntil",
  "ascensionUntil",
  "objectLuckUntil",
  "gravityTimeEndsAt",
  "timeKeeperEndsAt",
  "timeStoppedUntil",
  "particleCannonUntil",
  "particleCannonNextAt",
  "smartphoneUntil",
  "botTargetUntil",
  "botRetaliationUntil",
  "botWitnessUntil",
  "botClairvoyanceUntil",
  "botClairvoyanceObservedUntil",
  "nextBotClairvoyanceAt",
  "botDeceptionUntil",
  "heardWaypointUntil"
]);

const MEETING_PAUSED_PLAYER_ANCHOR_FIELDS = Object.freeze([
  "gunnerLastShotAt",
  "lastPassiveCreditAt",
  "staminaUpdatedAt",
  "taskPresenceSince",
  "ideaProgressStartedAt",
  "ideaProgressUpdatedAt",
  "ascensionStartedAt",
  "routeSharedSince",
  "botTaskPresenceSince",
  "botTaskPresenceLastTickAt",
  "botDeceptionPresenceSince"
]);

function shiftMeetingDeadline(owner, key, pausedAt, elapsedMs) {
  const value = Number(owner?.[key]) || 0;
  if (value > pausedAt) owner[key] = value + elapsedMs;
}

function shiftMeetingAnchor(owner, key, elapsedMs) {
  const value = Number(owner?.[key]) || 0;
  if (value > 0) owner[key] = value + elapsedMs;
}

function pausePlayerBattleTime(player, pausedAt, elapsedMs) {
  for (const [key] of Object.entries(player)) {
    if (key.endsWith("ReadyAt")) shiftMeetingDeadline(player, key, pausedAt, elapsedMs);
  }
  for (const key of MEETING_PAUSED_PLAYER_DEADLINE_FIELDS) {
    shiftMeetingDeadline(player, key, pausedAt, elapsedMs);
  }
  for (const key of MEETING_PAUSED_PLAYER_ANCHOR_FIELDS) {
    shiftMeetingAnchor(player, key, elapsedMs);
  }
  player.objectCooldowns ||= {};
  for (const key of Object.keys(player.objectCooldowns)) {
    shiftMeetingDeadline(player.objectCooldowns, key, pausedAt, elapsedMs);
  }
  for (const effect of player.timedAccelerationEffects || []) {
    if (Number(effect.endsAt) <= pausedAt) continue;
    shiftMeetingAnchor(effect, "startedAt", elapsedMs);
    effect.endsAt = Number(effect.endsAt) + elapsedMs;
  }
  for (const field of ["poisonStatus", "burnStatus"]) {
    const status = player[field];
    if (!status) continue;
    shiftMeetingDeadline(status, "nextTickAt", pausedAt, elapsedMs);
  }
  for (const observation of player.botVisibleThrowObservations || []) {
    shiftMeetingAnchor(observation, "observedAt", elapsedMs);
    shiftMeetingDeadline(observation, "landsAt", pausedAt, elapsedMs);
    shiftMeetingAnchor(observation, "poisonLandingObservedAt", elapsedMs);
    shiftMeetingDeadline(observation, "expiresAt", pausedAt, elapsedMs);
    for (const victim of Object.values(observation.visiblePoisonVictims || {})) {
      shiftMeetingAnchor(victim, "firstSeenAt", elapsedMs);
      shiftMeetingAnchor(victim, "lastSeenAt", elapsedMs);
    }
  }
}

function pauseBattleTimeForMeeting(room, timestamp = now()) {
  const meeting = room.meeting;
  if (room.phase !== "meeting" || !meeting) return 0;
  const pausedAt = Number(meeting.battlePauseUpdatedAt) || Number(meeting.startedAt) || timestamp;
  const elapsedMs = Math.max(0, timestamp - pausedAt);
  meeting.battlePauseUpdatedAt = timestamp;
  if (!elapsedMs) return 0;

  shiftMeetingDeadline(room, "preparationEndsAt", pausedAt, elapsedMs);
  shiftMeetingDeadline(room, "pendingIdeaVictoryAt", pausedAt, elapsedMs);
  for (const player of room.players.values()) pausePlayerBattleTime(player, pausedAt, elapsedMs);
  for (const pulse of room.activeEmps || []) {
    shiftMeetingAnchor(pulse, "at", elapsedMs);
    shiftMeetingDeadline(pulse, "resolvesAt", pausedAt, elapsedMs);
  }
  for (const zone of room.gravityZones || []) {
    shiftMeetingAnchor(zone, "startedAt", elapsedMs);
    shiftMeetingAnchor(zone, "lastPulseAt", elapsedMs);
    shiftMeetingDeadline(zone, "barrierUntil", pausedAt, elapsedMs);
    shiftMeetingDeadline(zone, "endsAt", pausedAt, elapsedMs);
  }
  for (const field of room.hazardFields || []) {
    shiftMeetingAnchor(field, "createdAt", elapsedMs);
    shiftMeetingDeadline(field, "endsAt", pausedAt, elapsedMs);
    shiftMeetingDeadline(field, "nextTickAt", pausedAt, elapsedMs);
  }
  for (const thrown of room.thrownItems || []) {
    shiftMeetingAnchor(thrown, "createdAt", elapsedMs);
    shiftMeetingDeadline(thrown, "landsAt", pausedAt, elapsedMs);
  }
  for (const object of room.alchemyObjects || []) {
    shiftMeetingAnchor(object, "startedAt", elapsedMs);
    shiftMeetingDeadline(object, "endsAt", pausedAt, elapsedMs);
  }
  return elapsedMs;
}

function startMeeting(room, reason, reporterId, options = {}) {
  if (room.phase !== "playing") return;
  const timestamp = now();
  room.phase = "meeting";
  room.meeting = {
    id: uid("m_"),
    reason,
    reporterId,
    startedAt: timestamp,
    discussionEndsAt: timestamp + room.settings.discussionTime * 1000,
    endsAt: timestamp + (room.settings.discussionTime + room.settings.votingTime) * 1000,
    suspectId: String(options.suspectId || ""),
    evidenceKind: String(options.evidenceKind || ""),
    votes: {},
    battlePauseUpdatedAt: timestamp
  };
  for (const player of room.players.values()) {
    clearFloraInvisible(room, player, "会議開始で解除");
    player.inVent = false;
    player.ventId = "";
    player.vx = 0;
    player.vy = 0;
    if (player.gunFiring) stopGunnerFire(room, player, { reason: "会議開始" });
    player.gunFiring = false;
    player.gunFiringWeapon = "";
    player.gunFiringSince = 0;
    player.gunnerBurstRoundsRemaining = 0;
    player.gunnerBurstEnhanceLevel = 0;
    player.gunnerBurstGbo = false;
    player.gunnerBurstGboWeapon = "";
    player.gunnerSnipingActive = false;
    player.gunnerAimTargetId = "";
    player.slashActiveUntil = 0;
    player.slashPerfectUntil = 0;
    player.slashGuardInputReleased = true;
    clearAttackState(player);
  }
  pushEvent(room, `会議開始: ${reason}`);
  touch(room);
}

function tallyMeeting(room) {
  pauseBattleTimeForMeeting(room, now());
  const meeting = room.meeting;
  if (!meeting) return;
  const alive = [...room.players.values()].filter((player) => player.alive && !player.ejected);
  const counts = new Map();
  for (const vote of Object.values(meeting.votes)) {
    counts.set(vote, (counts.get(vote) || 0) + 1);
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  let ejected = null;
  if (entries.length > 0) {
    const [topTarget, topCount] = entries[0];
    const secondCount = entries[1]?.[1] || 0;
    const skipCount = counts.get("skip") || 0;
    if (topTarget !== "skip" && topCount > secondCount && topCount > skipCount) {
      ejected = room.players.get(topTarget) || null;
    }
  }

  if (ejected && ejected.alive && !ejected.ejected) {
    recordBotMatchElimination(room, ejected, null);
    setGravityLevitationEngaged(room, ejected, false, "ejected");
    ejected.alive = false;
    ejected.ejected = true;
    ejected.killCamera = null;
    ejected.inVent = false;
    ejected.ventId = "";
    clearAttackState(ejected);
    completeTasksAfterDeath(room, ejected);
    const roleText = room.settings.confirmEjects
      ? `${ejected.name} は ${ejected.role === "attacker" ? "アタッカー" : "ディフェンダー"}でした。`
      : `${ejected.name} は追放されました。`;
    pushEvent(room, roleText);
  } else {
    pushEvent(room, alive.length ? "投票はスキップまたは同票でした。" : "会議は終了しました。");
  }

  room.bodies = [];
  if (room.phase === "ended") return;
  room.phase = "playing";
  room.round += 1;
  room.meeting = null;
  const timestamp = now();
  room.battleStartedAt = timestamp;
  for (const player of room.players.values()) {
    player.killsThisRound = 0;
  }
  pushEvent(room, `ラウンド ${room.round} 開始。`);
  checkWin(room);
  touch(room);
}

function maybeEndMeeting(room) {
  if (room.phase !== "meeting" || !room.meeting) return;
  const alive = [...room.players.values()].filter((player) => player.alive && !player.ejected);
  const voted = alive.filter((player) => room.meeting.votes[player.id]).length;
  if (now() >= room.meeting.endsAt || voted >= alive.length) {
    tallyMeeting(room);
  }
}

// Snapshot adapter only: existing gameplay getters supply rates; no live state
// is advanced or mutated. Caller must settle input-time source changes first.
function planRoomActorClock(room, from, to) {
  if (!room?.players || !Number.isFinite(from) || !Number.isFinite(to) || to < from) throw new RangeError("Invalid room clock interval");
  const players = new Map([...room.players].map(([id, player]) => [id, {
    ...player,
    timedAccelerationEffects: (player.timedAccelerationEffects || []).map(effect => ({ ...effect }))
  }]));
  const snapshot = { ...room, players };
  const movementStatusFields = ["taserSlowedUntil", "shockSlowedUntil", "quantumElectricSlowUntil", "gravityStormSlowUntil"];
  const totals = new Map([...players].map(([id]) => [id, { actorMs: 0, stoppedMs: 0, segments: [] }]));
  const synchronizeStops = (at) => {
    const casters = [...players.values()].filter(player => Number(player.timeKeeperEndsAt) > at);
    for (const player of players.values()) {
      if (!player.alive || player.ejected) continue;
      for (const caster of casters) {
        if (caster.id !== player.id) player.timeStoppedUntil = Math.max(Number(player.timeStoppedUntil) || 0, Number(caster.timeKeeperEndsAt));
      }
    }
    return casters.length > 0;
  };
  let at = from, roomStoppedMs = 0;
  while (at < to) {
    const roomStopped = synchronizeStops(at);
    const stopped = new Map([...players].map(([id, player]) => [id, timeKeeperStops(player, at)]));
    // All rates read the same segment-start source snapshot. No controller
    // endpoint may shift until every recipient has been sampled.
    const rates = new Map();
    const movementSources = new Map();
    for (const [id, player] of players) {
      if (stopped.get(id)) { rates.set(id, 0); movementSources.set(id, { stopped: true }); continue; }
      const allEffects = player.timedAccelerationEffects;
      player.timedAccelerationEffects = allEffects.filter(effect => !Number.isFinite(Number(effect.startedAt)) || Number(effect.startedAt) <= at);
      try { rates.set(id, playerProgressMultiplier(snapshot, player, at)); movementSources.set(id, { stopped: false, clairvoyanceActive: Boolean(player.clairvoyanceActive), movementAccEnabled: player.movementAccEnabled !== false, gravityScale: gravityTimeScaleFor(snapshot, player, at), electricSlowMultiplier: [player.taserSlowedUntil, player.shockSlowedUntil, player.quantumElectricSlowUntil].some(end => Number(end) > at) ? TASER_MOVEMENT_MULTIPLIER : 1, gravityStormMultiplier: Number(player.gravityStormSlowUntil) > at ? clampNumber(player.gravityStormSlowMultiplier, GRAVITY_STORM_SLOW_MULTIPLIER_MIN, 1, 1) : 1, accelerationComponents: accelerationMultipliersFor(player, at).map(Number).filter(value => Number.isFinite(value) && value > 1) }); }
      finally { player.timedAccelerationEffects = allEffects; }
    }
    let next = to;
    const boundary = (raw) => { const value = Number(raw); if (Number.isFinite(value) && value > at) next = Math.min(next, value); };
    for (const [id, player] of players) {
      boundary(player.timeStoppedUntil);
      const statusRate = player.alive && !player.ejected ? rates.get(id) : (stopped.get(id) ? 0 : 1);
      if (statusRate > 0) for (const field of movementStatusFields) {
        if (Number(player[field]) > at) boundary(at + (Number(player[field]) - at) / statusRate);
      }
      if (stopped.get(id)) continue;
      // Controller expiries freeze with their caster, not their recipient.
      boundary(player.timeKeeperEndsAt);
      boundary(player.gravityTimeEndsAt);
      for (const effect of player.timedAccelerationEffects) {
        boundary(effect.startedAt);
        boundary(effect.endsAt);
      }
    }
    const elapsed = next - at;
    if (roomStopped) roomStoppedMs += elapsed;
    for (const [id, player] of players) {
      const total = totals.get(id);
      const isStopped = stopped.get(id);
      const actorRate = rates.get(id);
      total.segments.push({ from: at, to: next, actorRate, movementSource: movementSources.get(id), stopped: isStopped });
      total.actorMs += elapsed * actorRate;
      const statusRate = player.alive && !player.ejected ? actorRate : (isStopped ? 0 : 1);
      for (const field of movementStatusFields) {
        const deadline = Number(player[field]);
        if (deadline > at) player[field] = deadline - at <= elapsed * statusRate + 1e-7 ? next : deadline + elapsed * (1 - statusRate);
      }
      if (!isStopped) continue;
      total.stoppedMs += elapsed;
      for (const field of ["gravityTimeEndsAt", "timeKeeperEndsAt"]) {
        if (Number(player[field]) > at) player[field] = Number(player[field]) + elapsed;
      }
      for (const effect of player.timedAccelerationEffects) {
        if (Number(effect.endsAt) <= at) continue;
        effect.startedAt = (Number.isFinite(Number(effect.startedAt)) ? Number(effect.startedAt) : at) + elapsed;
        effect.endsAt = Number(effect.endsAt) + elapsed;
      }
    }
    at = next;
  }
  synchronizeStops(to);
  return {
    worldMs: to - from,
    roomStoppedMs,
    players: new Map([...players].map(([id, player]) => [id, {
      ...totals.get(id),
      timing: {
        timeStoppedUntil: Number(player.timeStoppedUntil) || 0,
        timeKeeperEndsAt: Number(player.timeKeeperEndsAt) || 0,
        gravityTimeEndsAt: Number(player.gravityTimeEndsAt) || 0,
        timedAccelerationEffects: player.timedAccelerationEffects
      }
    }]))
  };
}

function applyPlannedActorClock(player, plan, from, to) {
  const adjustment = player.alive && !player.ejected ? (to - from) - plan.actorMs : plan.stoppedMs;
  const stopped = plan.stoppedMs;
  const actorDeadlines = new Set(ACCELERATED_ACTION_UNTIL_FIELDS);
  for (const key of Object.keys(player)) if (key.endsWith("ReadyAt")) actorDeadlines.add(key);
  for (const field of new Set([...actorDeadlines, ...TIME_KEEPER_FROZEN_DEADLINE_FIELDS])) {
    if (field === "gravityTimeEndsAt" || field === "timeKeeperEndsAt") continue;
    const deadline = Number(player[field]) || 0;
    // Gun/beam/status cadence retains elapsed excess for the pulse owner.
    const cadence = field === "gunReadyAt" || field === "particleCannonNextAt";
    if (deadline > from || (cadence && deadline > 0)) {
      player[field] = deadline + (actorDeadlines.has(field) ? adjustment : stopped);
    }
  }
  const actorAnchors = new Set(ACCELERATED_PLAYER_PROGRESS_ANCHOR_FIELDS);
  for (const field of new Set([...actorAnchors, ...TIME_KEEPER_FROZEN_ANCHOR_FIELDS])) {
    // Stamina owns a separate wall anchor and consumes the planned segments.
    if (field === "staminaUpdatedAt") continue;
    const anchor = Number(player[field]) || 0;
    if (anchor > 0) player[field] = anchor + (actorAnchors.has(field) ? adjustment : stopped);
  }
  player.objectCooldowns ||= {};
  for (const [key, value] of Object.entries(player.objectCooldowns)) {
    if (Number(value) > from) player.objectCooldowns[key] = Number(value) + adjustment;
  }
  for (const field of ["poisonStatus", "burnStatus"]) {
    const status = player[field];
    if (Number(status?.nextTickAt) > from) status.nextTickAt = Number(status.nextTickAt) + adjustment;
  }
  for (const observation of player.botVisibleThrowObservations || []) {
    for (const field of ["observedAt", "poisonLandingObservedAt"]) {
      if (Number(observation[field]) > 0) observation[field] = Number(observation[field]) + stopped;
    }
    for (const field of ["landsAt", "expiresAt"]) {
      if (Number(observation[field]) > from) observation[field] = Number(observation[field]) + stopped;
    }
    for (const victim of Object.values(observation.visiblePoisonVictims || {})) {
      for (const field of ["firstSeenAt", "lastSeenAt"]) if (Number(victim[field]) > 0) victim[field] = Number(victim[field]) + stopped;
    }
  }
  Object.assign(player, plan.timing);
}

function plannedStaminaElapsed(player, plan, from, to) {
  const start = Math.max(Number(player.staminaUpdatedAt) || to, to - 500);
  let actorMs = 0;
  // Retain the existing 500ms recovery catch-up cap for any pre-room-cap tail.
  if (start < from) actorMs += (from - start) * (plan.segments?.[0]?.actorRate ?? 1);
  for (const segment of plan.segments || []) {
    actorMs += Math.max(0, Math.min(to, segment.to) - Math.max(start, segment.from)) * segment.actorRate;
  }
  return actorMs / 1000;
}

function tickRoom(room) {
  const timestamp = now();
  const elapsedMs = Math.min(250, Math.max(0, timestamp - (Number(room.lastTickAt) || timestamp)));
  room.lastTickAt = timestamp;
  const clockFrom = timestamp - elapsedMs;
  const actorClock = room.phase === "playing" && elapsedMs > 0 ? planRoomActorClock(room, clockFrom, timestamp) : null;
  if (actorClock) rememberMovementClock(room, actorClock, timestamp);
  advanceBotOperationalTime(room, elapsedMs, timestamp);
  if (actorClock) for (const player of room.players.values()) applyPlannedActorClock(player, actorClock.players.get(player.id), clockFrom, timestamp);
  reconcileBarrierExpiry(room, timestamp);
  if (room.phase === "meeting") {
    pauseBattleTimeForMeeting(room, timestamp);
    for (const player of room.players.values()) {
      syncFighterInfiniteResources(player);
      syncHackerRootState(room, player);
      player.vx = 0;
      player.vy = 0;
      player.resting = false;
      player.sleepingUntil = 0;
      player.desireRestRecoveryStartedAt = 0;
      if (player.desireRenkiRecovery) {
        player.desireRenkiRecovery = false;
        player.renkiTargetMana = null;
    player.renkiCompletionKind = "";
        player.meditatingUntil = 0;
        if (player.movementMode === "meditating") player.movementMode = "idle";
      }
      if (player.movementMode === "sleep") player.movementMode = "idle";
    }
    maybeEndMeeting(room);
    return;
  }
  synchronizeTimeKeeperStops(room, timestamp);
  const roomTimeStopped = roomTimeKeeperActive(room, timestamp);
  if (actorClock) freezeRoomTimeKeeperState(room, actorClock.roomStoppedMs, timestamp, clockFrom, true);
  else freezeRoomTimeKeeperState(room, elapsedMs, timestamp);
  if (!roomTimeStopped) advanceGravitySystems(room, timestamp, elapsedMs);
  advanceThrownItems(room, timestamp, elapsedMs, actorClock?.roomStoppedMs);
  for (const player of room.players.values()) {
    if (!floraInvisibleActive(player, timestamp)) clearFloraInvisible(room, player, "透明化終了");
    syncFighterInfiniteResources(player);
    syncMentalState(room, player, "資源更新", timestamp);
    syncHackerRootState(room, player);
    advanceLimitBreak(room, player, elapsedMs);
    const actorTimeScale = playerProgressMultiplier(room, player, timestamp);
    const playerClock = actorClock?.players.get(player.id);
    if (!playerClock) {
      advanceAccelerationTime(room, player, elapsedMs, timestamp, actorTimeScale);
      freezePlayerTimeKeeperState(player, elapsedMs, timestamp);
    }
    if (timeKeeperStops(player, timestamp)) {
      player.vx = 0;
      player.vy = 0;
      player.movementMode = "time-stopped";
      continue;
    }
    const actorElapsedMs = playerClock ? playerClock.actorMs : elapsedMs * actorTimeScale;
    advanceFighterEnergyPassive(room, player, timestamp);
    if (synchronizeSharedLevitationExpiry(room, player, timestamp)) continue;
    advanceLevitationMana(room, player, actorElapsedMs);
    if (synchronizeSharedLevitationExpiry(room, player, timestamp)) continue;
    advanceClairvoyanceMana(room, player, actorElapsedMs);

    advanceHackerManaGpu(room, player, actorElapsedMs, timestamp);
    finishRenki(room, player, timestamp);
    advanceParticleCannon(room, player, timestamp);
    resolveSmartphoneAction(room, player, timestamp);
    advanceGunnerReload(room, player, timestamp);
    advanceGunnerSpecialAmmoPassive(room, player, timestamp);
    advanceGunnerAimPassive(room, player, timestamp);
    advanceGunnerFire(room, player, timestamp);
    synchronizeDurableWeapons(player);
    if (player.attackResolveAt && player.attackResolveAt <= timestamp) clearPendingAttack(player);
    if (player.aimTargetId) {
      const aimTarget = room.players.get(player.aimTargetId);
      if (room.phase !== "playing" || !aimTarget || !aimTarget.alive || aimTarget.ejected) {
        clearAimState(player);
      } else if (aimedTargetMoved(room, player, aimTarget, timestamp)) {
        failAimForMovement(room, player, timestamp);
      } else if (player.aimReadyAt && player.aimReadyAt <= timestamp) {
        resolveReadyAim(room, player, timestamp);
      }
    }
    // `runPlayingBots` deliberately schedules only one expensive repertoire
    // evaluation per callback.  Its last selected legal waypoint is instead
    // integrated here for every Bot.  This is the authoritative equivalent of
    // held movement input: it keeps a route continuous between planner turns
    // without running seven full planners or trusting the client.
    if (player.isBot && room.phase === "playing") {
      advanceBotNavigationMotion(room, player, elapsedMs, timestamp);
    }
    const idleThreshold = player.isBot ? BOT_TICK_MS + 150 : 120;
    const blockedUntil = actionBlockedUntil(player);
    const movementInputExpired = timestamp - Math.max(Number(player.lastMoveAt) || 0, Number(player.lastMovementReceivedAt) || 0) > idleThreshold;
    if (blockedUntil > timestamp || movementInputExpired) {
      player.vx = 0;
      player.vy = 0;
      player.movementMode = player.ascensionUntil > timestamp
        ? "ascension"
        : player.meditatingUntil > timestamp
          ? "meditating"
        : player.sleepingUntil > timestamp
          ? "sleep"
          : player.unconsciousUntil > timestamp
            ? "unconscious"
            : "idle";
      if (movementInputExpired && Math.hypot(Number(player.lastMovementDx) || 0, Number(player.lastMovementDy) || 0) > 0.0001) {
        clearStoredMovementInput(player, timestamp);
      }
    }
    const stopped = Math.hypot(Number(player.vx) || 0, Number(player.vy) || 0) <= 0.01;
    const stationaryRestActive = syncAutomaticStationaryRest(room, player, stopped, timestamp);
    const naturalRecoveryActive = hasNaturalRecovery(room, player);
    replenishStamina(
      player,
      timestamp,
      stopped || naturalRecoveryActive,
      (stationaryRestActive ? SLEEP_REGEN_MULTIPLIER : 1) * (naturalRecoveryActive ? floraAromaMultiplier(room, player) : 1),
      room,
      naturalRecoveryActive,
      playerClock ? plannedStaminaElapsed(player, playerClock, clockFrom, timestamp) : null
    );
    advanceNaturalRecoveryMana(room, player, actorElapsedMs);
    advanceNaturalRecoveryHealth(room, player, actorElapsedMs);
    if (hasNaturalRecovery(room, player)) recoverDurableEquipment(player, actorElapsedMs, (player.resting ? SLEEP_REGEN_MULTIPLIER : 1) * floraAromaMultiplier(room, player));
    completeRestAtFullStamina(room, player, timestamp);
    advanceIdeaProgress(room, player, timestamp);
    const hackerBot = player.isBot && isHackerOperator(player);
    if (!hackerBot && !autoCompleteHackerTask(room, player, timestamp)) {
      autoCompleteNearbyTask(room, player);
    }
    autoUseNearbyMapObject(room, player, timestamp);
    // Credits are earned through explicit game events only. Keep the legacy
    // timestamp current for old saves and time-anchor code, but never turn
    // elapsed match time into currency.
    player.lastPassiveCreditAt = timestamp;
  }
  if (!roomTimeStopped) advanceHazards(room, timestamp);
  if (runAutomaticHumanBodyReports(room, timestamp)) return;
  if (!roomTimeStopped) {
    advancePairRouteRule(room, timestamp);
    advanceAlchemyObjects(room, timestamp);
    resolvePendingEmps(room, timestamp);
  }
  if (room.phase === "selecting") {
    const turnPlayer = currentOperatorPlayer(room);
    if (!turnPlayer) {
      startBattle(room);
    } else if (room.operatorSelectEndsAt && now() >= room.operatorSelectEndsAt) {
      autoPickOperator(room, turnPlayer);
      pushEvent(room, `${turnPlayer.name} は時間切れのため自動選択されました。`);
      room.operatorTurnIndex += 1;
      advanceOperatorTurn(room);
    }
  }
  if (room.phase === "playing") {
    if (evaluateSoloMission(room, timestamp)) return;
    if (resolvePendingIdeaVictory(room, timestamp)) return;
    checkWin(room);
  }
  maybeEndMeeting(room);
}

function completeTask(room, player, taskId) {
  if (room.phase !== "playing") throw new ApiError(400, "いまはタスクを実行できません。");
  if (player.role !== "defender") throw new ApiError(403, "アタッカーはタスクを完了できません。");
  if (player.ejected) throw new ApiError(403, "追放後はタスクを実行できません。");
  ensureConscious(player);
  if (!isHackerOperator(player) && Math.hypot(Number(player.vx) || 0, Number(player.vy) || 0) > 0.01) {
    throw new ApiError(400, "停止している間だけタスクを実行できます。");
  }
  const timestamp = now();
  const staminaCost = taskStaminaCostFor(player);
  replenishStamina(player, timestamp, true, 1, room);
  if (availableStamina(player) < staminaCost) {
    throw new ApiError(400, `タスクの自動実行にはスタミナ ${staminaCost} が必要です。`);
  }
  if ((Number(player.taskAutoReadyAt) || 0) > timestamp) {
    throw new ApiError(400, "端末処理中です。");
  }

  const map = getMap(room);
  const range = map.taskRange;
  let task = player.taskList.find((item) => item.id === taskId && !item.done);
  if (!task && taskId === "nearest") {
    task = player.taskList.find((item) => {
      if (item.done) return false;
      const station = findStation(map, item.stationId);
      return station && distance(player, station) <= range;
    });
  }
  if (!task) throw new ApiError(404, "近くに未完了タスクがありません。");

  const station = findStation(map, task.stationId);
  if (!station || distance(player, station) > range) throw new ApiError(400, "タスク端末に近づいてください。");
  if (task.type === "upload") {
    const completedDownloads = player.taskList.filter((item) => item.type === "download" && item.done).length;
    const completedUploads = player.taskList.filter((item) => item.type === "upload" && item.done).length;
    if (completedDownloads <= completedUploads) {
      throw new ApiError(400, "このUploadの前にDownloadを1件完了してください。");
    }
  }
  spendStamina(player, staminaCost, room, "斬る");
  player.staminaUpdatedAt = timestamp;
  task.done = true;
  player.taskPresenceTaskId = "";
  player.taskPresenceSince = 0;
  player.taskAutoReadyAt = timestamp + AUTO_TASK_INTERVAL_MS;
  grantCredits(room, player, TASK_CREDIT_REWARD, "task");
  pushMagicEffect(room, "action-task", player, { radius: 105, playerId: player.id, mode: task.type, targetId: station.id, targetX: station.x, targetY: station.y });
  pushEvent(room, `${player.name} が ${task.label} を完了し、${TASK_CREDIT_REWARD}Cを獲得しました。`);
  markSoloMissionAction(room, player, "task");
  checkWin(room);
  touch(room);
}

function autoCompleteNearbyTask(room, player) {
  if (room.phase !== "playing" || player.role !== "defender" || !player.alive || player.ejected || player.inVent) {
    player.taskPresenceTaskId = "";
    player.taskPresenceSince = 0;
    return false;
  }
  if (player.isBot) {
    player.taskPresenceTaskId = "";
    player.taskPresenceSince = 0;
    return false;
  }
  if (
    !isHackerOperator(player) &&
    (
      Math.hypot(Number(player.vx) || 0, Number(player.vy) || 0) > 0.01 ||
      Math.hypot(Number(player.lastMovementDx) || 0, Number(player.lastMovementDy) || 0) > 0.01 ||
      ["walk", "slow", "dash"].includes(String(player.movementMode || ""))
    )
  ) {
    player.taskPresenceTaskId = "";
    player.taskPresenceSince = 0;
    return false;
  }
  const timestamp = now();
  const map = getMap(room);
  const task = player.taskList.find((item) => {
    if (item.done) return false;
    const station = findStation(map, item.stationId);
    if (!station || distance(player, station) > map.taskRange) return false;
    if (item.type !== "upload") return true;
    const downloads = player.taskList.filter((candidate) => candidate.type === "download" && candidate.done).length;
    const uploads = player.taskList.filter((candidate) => candidate.type === "upload" && candidate.done).length;
    return downloads > uploads;
  });
  if (!task) {
    player.taskPresenceTaskId = "";
    player.taskPresenceSince = 0;
    return false;
  }
  if (player.taskPresenceTaskId !== task.id) {
    player.taskPresenceTaskId = task.id;
    player.taskPresenceSince = timestamp;
    return false;
  }
  if (
    availableStamina(player) < taskStaminaCostFor(player) ||
    actionBlockedUntil(player) > timestamp ||
    (Number(player.taskAutoReadyAt) || 0) > timestamp
  ) return false;
  const requiredPresenceMs = AUTO_TASK_PRESENCE_MS;
  if (timestamp - (Number(player.taskPresenceSince) || timestamp) < requiredPresenceMs) return false;
  completeTask(room, player, task.id);
  return true;
}

function autoCompleteHackerTask(room, player, timestamp = now()) {
  if (
    room.phase !== "playing" ||
    player.isBot ||
    player.role !== "defender" ||
    !player.alive ||
    player.ejected ||
    !isHackerOperational(player)
  ) return false;
  if (!(Number(player.hackerTaskReadyAt) > 0)) {
    player.hackerTaskReadyAt = timestamp + HACKER_AUTO_TASK_INTERVAL_MS;
    return false;
  }
  if (timestamp < player.hackerTaskReadyAt) return false;
  const completedDownloads = player.taskList.filter((task) => task.type === "download" && task.done).length;
  const completedUploads = player.taskList.filter((task) => task.type === "upload" && task.done).length;
  const task = player.taskList.find((candidate) => (
    !candidate.done && (candidate.type !== "upload" || completedDownloads > completedUploads)
  ));
  if (!task) {
    player.hackerTaskReadyAt = 0;
    return false;
  }
  task.done = true;
  grantCredits(room, player, TASK_CREDIT_REWARD, "hacker-task");
  player.hackerTaskReadyAt = player.taskList.some((candidate) => !candidate.done)
    ? timestamp + HACKER_AUTO_TASK_INTERVAL_MS
    : 0;
  const station = findStation(getMap(room), task.stationId);
  pushMagicEffect(room, "action-task", player, { radius: 105, playerId: player.id, variant: "hacker-auto", mode: task.type, targetId: station?.id, targetX: station?.x, targetY: station?.y });
  pushEvent(room, `${player.name} のハックが ${task.label} を自動完了し、${TASK_CREDIT_REWARD}Cを獲得しました。`);
  markSoloMissionAction(room, player, "task");
  checkWin(room);
  touch(room);
  return true;
}

function canActivateDodge(player) {
  return player?.role === "defender" || hasOperatorAccess(player, "fighter");
}

function fighterKillCounterAvailable(player) {
  return hasOperatorAccess(player, "fighter") && passivesEnabled(player);
}

function fighterKillCounterTriggerIsCertainKill(hitZone, options = {}) {
  return hitZone === "head" || Boolean(options.destroy);
}

function bustExcludedByLethalAttack(hitZone, options = {}) {
  if (fighterKillCounterTriggerIsCertainKill(hitZone, options)) return true;
  if (Boolean(options.certainKill) || Boolean(options.noBody) || Boolean(options.annihilate) || Boolean(options.disappear)) return true;
  const attackKind = String(options.attackKind || "").toLowerCase();
  return /(?:certain|certain-kill|headshot|destroy|destruct|annihilat|disappear|消滅|破壊|確殺)/.test(attackKind);
}

function hasOrichalcumSword(player) {
  return itemCount(player, "orichalcum-sword") > 0;
}

function activateDodge(room, player) {
  if (room.phase !== "playing") throw new ApiError(400, "バトル中のみ回避を発動できます。");
  if (!canActivateDodge(player)) throw new ApiError(403, "このオペレーターは回避を使用できません。");
  if (!player.alive || player.ejected || player.inVent) throw new ApiError(403, "現在は回避できません。");
  ensureAbilityAvailable(player);
  const timestamp = now();
  if (player.dodgeActiveUntil > timestamp) throw new ApiError(400, "回避は発動中です。");
  replenishStamina(player, timestamp, Math.hypot(Number(player.vx) || 0, Number(player.vy) || 0) <= 0.01, 1, room);
  if (player.stamina < DODGE_STAMINA_COST - 0.01) {
    throw new ApiError(400, `回避にはスタミナ ${DODGE_STAMINA_COST} が必要です。`);
  }
  spendStamina(player, DODGE_STAMINA_COST, room, "回避");
  player.dodgeActiveUntil = timestamp + DODGE_DURATION_MS + player.dodgeDurationBonusMs;
  player.dodgeReadyAt = 0;
  pushMagicEffect(room, "action-dodge", player, { radius: 115, playerId: player.id });
  pushEvent(room, `${player.name} が回避態勢に入りました。`);
  markSoloMissionAction(room, player, "defense");
  touch(room);
}

function beginFighterSlashGuard(player, timestamp = now(), perfectGuardIntent = false, windowMultiplier = 1) {
  const multiplier = Math.max(1, Number(windowMultiplier) || 1);
  player.slashActiveUntil = Math.max(Number(player.slashActiveUntil) || 0, timestamp + FIGHTER_SLASH_GUARD_DURATION_MS * multiplier);
  if (!perfectGuardIntent) return false;
  // The client only marks a deliberate press as intent=true; held repeats are
  // intent=false. Treat every declared press as an edge so a delayed release
  // request cannot let rapid tapping evade the anti-fishing rearm penalty.
  player.slashGuardInputReleased = false;
  if (timestamp < (Number(player.slashPerfectReadyAt) || 0)) {
    // Repeated early presses move the rearm point forward. Holding never sends
    // another intent, while button mashing cannot keep fishing for a perfect
    // guard window without first pausing and reading the incoming attack.
    player.slashPerfectUntil = 0;
    player.slashPerfectReadyAt = timestamp + FIGHTER_SLASH_PERFECT_REARM_MS;
    return false;
  }
  player.slashPerfectUntil = timestamp + FIGHTER_SLASH_PERFECT_GUARD_MS * multiplier;
  player.slashPerfectReadyAt = timestamp + FIGHTER_SLASH_PERFECT_REARM_MS;
  return true;
}

function releaseFighterSlashGuardInput(player) {
  if (!player) return false;
  player.slashGuardInputReleased = true;
  return true;
}

function applyReflectedSlashAttack(room, defender, source, attack = {}, timestamp = now()) {
  if (!source?.alive || source.ejected || source.id === defender?.id) return false;
  try {
    if (typeof attack.reflectEffect === "function") {
      return attack.reflectEffect({ room, defender, source, attack, timestamp }) !== false;
    }
    const reflectedActionLabel = `反射された${requireExactKillCameraActionLabel(attack.label, attack.kind || "reflected-attack")}`;
    if (attack.destroy) {
      destroyPlayerUnconditionally(room, defender, source, reflectedActionLabel, {
        noKillCutin: false,
        attackType: "kill",
        attackKind: `reflected-${attack.kind || "destruction"}` ,
        attackLabel: reflectedActionLabel,
        ignorePreparationBarrier: true,
        ignoreInfiniteResources: Boolean(attack.ignoreInfiniteResourcesOnReflect),
        ignoreFriendlyFire: true,
        bypassSlashGuard: true
      });
      return true;
    }
    killPlayer(room, defender, source.id, {
      ranged: true,
      hitZone: attack.hitZone === "head" ? "head" : "body",
      damage: clampNumber(attack.damage, 0.01, 2, 1),
      magic: Boolean(attack.magic),
      allowAnyKiller: true,
      ignoreRange: true,
      ignoreCooldown: true,
      preserveCooldown: true,
      ignorePush: true,
      ignoreFriendlyFire: true,
      bypassSlashGuard: true,
      origin: { x: defender.x, y: defender.y },
      targetRole: source.role,
      attackKind: `reflected-${attack.kind || "physical"}`,
      attackLabel: reflectedActionLabel,
      slashGuardPhysical: Boolean(attack.physical)
    });
    return true;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return false;
  }
}

function resolveFighterSlashGuard(room, source, target, attack = {}, timestamp = now()) {
  const detachedGboGuard = Number(target?.slashDetachedGuardUntil) > timestamp;
  if (!target?.alive || target.ejected || (!hasOrichalcumSword(target) && !detachedGboGuard)) return "";
  if ((Number(target.slashActiveUntil) || 0) <= timestamp) return "";
  const physical = Boolean(attack.physical);
  const perfect = attack.perfectGuardEligible !== false && (Number(target.slashPerfectUntil) || 0) > timestamp;
  const universalPerfect = perfect && hasFighterApexPerks(target);
  if (!physical && !universalPerfect) return "";

  if (perfect) target.slashPerfectUntil = 0;
  const label = String(attack.label || attack.kind || (physical ? "物理攻撃" : "攻撃"));
  const reflectionIntent = Boolean(perfect && (universalPerfect || attack.reflectable !== false));
  const reflectedAtSource = reflectionIntent && applyReflectedSlashAttack(room, target, source, attack, timestamp);
  // At charge 50 the successful edge is semantically a reflection even when
  // the originating entity has already vanished or cannot receive the return
  // effect. The incoming attack is still sent back instead of merely guarded.
  const reflected = Boolean(reflectionIntent && (reflectedAtSource || universalPerfect));
  const outcome = reflected
    ? "slashPerfectReflected"
    : perfect
      ? "slashPerfectGuarded"
      : "slashGuarded";
  pushMagicEffect(room, "fighter-slash-parry", target, {
    radius: universalPerfect ? 205 : perfect ? 180 : 155,
    playerId: target.id,
    targetId: source?.id || "",
    targetX: Number.isFinite(Number(source?.x)) ? Number(source.x) : target.x + (Number(target.aimX) || 1) * 180,
    targetY: Number.isFinite(Number(source?.y)) ? Number(source.y) : target.y + (Number(target.aimY) || 0) * 180,
    variant: universalPerfect ? `perfect-all-reflect:${attack.kind || "attack"}` : perfect ? `perfect-reflect:${attack.kind || "physical"}` : `guard:${attack.kind || "physical"}`
  });
  pushSound(room, "fighterCounter", target, { ownerId: target.id, sourceKind: "fighter", maxDistance: 1400, volume: perfect ? 1 : 0.72 });
  if (reflected) {
    setImmediateFeedback(target, "ジャストガード", `${label}を反射`);
    pushEvent(room, `${target.name} が${label}をジャストガードし、${source?.name || "攻撃元"}へ反射しました。`);
  } else if (universalPerfect) {
    setImmediateFeedback(target, "EC1000到達ジャストガード", `${label}を反射（攻撃元なし）`);
    pushEvent(room, `${target.name} がEC1000回到達後のジャストガードで${label}を弾き返しました。反射可能な攻撃元はありませんでした。`);
  } else {
    setImmediateFeedback(target, perfect ? "ジャストガード" : "斬る・ガード", `${label}を無効化`);
    pushEvent(room, `${target.name} が斬るで${label}をガードしました。`);
  }
  touch(room);
  return outcome;
}

function fighterSlash(room, player, targetId = "", perfectGuardIntent = false, rawPower = 0) {
  if (room.phase !== "playing" || !hasOrichalcumSword(player)) {
    throw new ApiError(403, "オリハルコン・ソードを所持していないため斬るは使用できません。");
  }
  if (!player.alive || player.ejected || player.inVent) throw new ApiError(403, "現在は斬れません。");
  ensureAbilityAvailable(player);
  ensureItemStorageAvailable(player);
  ensureConscious(player);
  recordBotVisibleHumanAttackStart(room, player, "fighter-slash");
  const timestamp = now();
  const cost = FIGHTER_SLASH_STAMINA_COST;
  if (Number(player.stamina) < cost) throw new ApiError(400, `斬るにはスタミナ ${cost} が必要です。`);
  spendStamina(player, cost, room, "バリア");
  const power = rawPower && typeof rawPower === "object"
    ? rawPower
    : { mode: Number(rawPower) > 0 ? "enhance" : "normal", enhanceLevel: Number(rawPower) || 0, multiplier: 1 };
  const gbo = power.mode === "gbo";
  const enhanceLevel = gbo ? 0 : (Number(power.enhanceLevel) > 0 ? 1 : 0);
  const perfectGuardOpened = beginFighterSlashGuard(player, timestamp, perfectGuardIntent, gbo ? GBO_PERFORMANCE_MULTIPLIER : 1);
  player.slashActiveUntil += enhanceLevel * FIGHTER_ENHANCE_SLASH_GUARD_MS_PER_LEVEL;
  if (gbo) {
    player.slashDetachedGuardUntil = player.slashActiveUntil;
    consumeItem(player, "orichalcum-sword", 1);
    pushGboOverdriveEffect(room, player, "orichalcum-sword", "slash");
  }
  const slashAimX = Number(player.aimX) || 1;
  const slashAimY = Number(player.aimY) || 0;
  const slashRange = gbo
    ? room.settings.killRange * GBO_PERFORMANCE_MULTIPLIER
    : room.settings.killRange + enhanceLevel * FIGHTER_ENHANCE_SLASH_RANGE_PER_LEVEL;
  pushMagicEffect(room, "fighter-slash", player, {
    radius: gbo ? 240 : 160 + enhanceLevel * 18,
    playerId: player.id,
    targetX: player.x + slashAimX * (220 + enhanceLevel * FIGHTER_ENHANCE_SLASH_RANGE_PER_LEVEL),
    targetY: player.y + slashAimY * (220 + enhanceLevel * FIGHTER_ENHANCE_SLASH_RANGE_PER_LEVEL),
    variant: gbo ? "gbo-tenfold" : `enhance-${enhanceLevel}`
  });
  pushSound(room, "fighterSlash", player, { ownerId: player.id, sourceKind: "fighter", maxDistance: 1300, volume: 0.9 });
  const target = attackTargetFor(room, player, targetId);
  const struckIds = new Set();
  if (target && distance(player, target) <= slashRange) {
    struckIds.add(target.id);
    const destructionSlash = hasFighterApexPerks(player);
    const destructionGuardOutcome = destructionSlash
      ? resolveFighterSlashGuard(room, player, target, {
          kind: "slash",
          label: "EC1000回到達後の死体なしキル斬り",
          physical: true,
          reflectable: true,
          destroy: true,
          ignoreInfiniteResourcesOnReflect: true
        }, timestamp)
      : "";
    const outcome = destructionSlash
      ? destructionGuardOutcome || (destroyPlayerUnconditionally(room, player, target, "EC1000回到達後の死体なしキル斬り", {
          noKillCutin: false,
          noBody: true,
          attackType: "kill",
          ignorePreparationBarrier: true,
          ignoreInfiniteResources: true,
          bypassSlashGuard: true
        }) ? "destroyed" : "friendlyFirePenalty")
      : killPlayer(room, player, target.id, {
          hitZone: "head",
          lockedAim: true,
          ignoreCooldown: true,
          preserveCooldown: true,
          ignoreDodge: false,
          targetRole: target.role,
          attackKind: "slash",
          attackLabel: "斬る",
          slashGuardPhysical: true
        });
    if (destructionSlash) pushMagicEffect(room, "fighter-energy-destruction-slash", player, {
      radius: 175,
      playerId: player.id,
      targetId: target.id,
      targetX: target.x,
      targetY: target.y,
      variant: outcome
    });
    pushEvent(room, `${player.name} の${gbo ? "GBO斬り" : enhanceLevel ? "エンハンス斬り" : "斬る"}が ${target.name} に命中しました（${outcome} / 射程${slashRange}${gbo ? " / オリハルコン・ソード破壊" : ""}）。`);
  } else {
    const universalReflect = hasFighterApexPerks(player);
    pushEvent(room, `${player.name} が斬るを構えました。物理攻撃をガードし、${perfectGuardOpened ? `短いジャストガード受付で${universalReflect ? "全攻撃" : "物理攻撃"}を反射できます` : "今回はジャストガード再受付前です"}。`);
  }
  // The sword owns only this physical slash/guard.  EC and every wave are
  // Fighter abilities; a Fighter may use this slash as their trigger.
  const requestedShockwaveCost = hasOperatorAccess(player, "fighter")
    ? fighterSlashShockwaveCost(player)
    : 0;
  const consumedShockwaveCost = player.alive
    ? consumeFighterEnergyCharge(
        player,
        requestedShockwaveCost,
        requestedShockwaveCost === FIGHTER_GIANT_SHOCKWAVE_EC_COST ? "ファイター特大衝撃波" : "ファイター衝撃波"
      )
    : 0;
  if (consumedShockwaveCost > 0) {
    const giantShockwave = consumedShockwaveCost === FIGHTER_GIANT_SHOCKWAVE_EC_COST;
    const shockwaveRange = giantShockwave ? FIGHTER_GIANT_SHOCKWAVE_RANGE : FIGHTER_SHOCKWAVE_RANGE;
    const shockwaveWidth = giantShockwave ? FIGHTER_GIANT_SHOCKWAVE_WIDTH : FIGHTER_SHOCKWAVE_WIDTH;
    const swordOrigin = {
      ...player,
      x: player.x + slashAimX * FIGHTER_SHOCKWAVE_ORIGIN_OFFSET,
      y: player.y + slashAimY * FIGHTER_SHOCKWAVE_ORIGIN_OFFSET
    };
    const shockwavePath = resolveVectorAttackPath(room, swordOrigin, slashAimX, slashAimY, shockwaveRange, { collisionRadius: 2 });
    const targetX = shockwavePath.x;
    const targetY = shockwavePath.y;
    pushMagicEffect(room, "fighter-shockwave", swordOrigin, {
      radius: shockwaveWidth,
      playerId: player.id,
      targetX,
      targetY,
      durationMs: giantShockwave ? FIGHTER_GIANT_SHOCKWAVE_DURATION_MS : 760,
      variant: `${giantShockwave ? "giant-" : ""}one-body-damage:ec-cost-${consumedShockwaveCost}:remaining-ec-${player.fighterEnergyCharge}`
    });
    const waveTargets = inventionLineTargets(room, swordOrigin, shockwaveRange, shockwaveWidth, false)
      .filter(({ target: waveTarget }) => !struckIds.has(waveTarget.id));
    for (const { target: waveTarget } of waveTargets) {
      if (!player.alive || player.ejected) break;
      try {
        const outcome = killPlayer(room, player, waveTarget.id, {
          ranged: true,
          hitZone: "body",
          damage: 1,
          ignoreRange: true,
          ignoreCooldown: true,
          preserveCooldown: true,
          magic: true,
          attackKind: "fighter-energy-shockwave",
          attackLabel: giantShockwave ? "ファイター特大衝撃波" : "ファイター衝撃波",
          slashGuardPhysical: true,
          slashGuardReflectable: false,
          slashGuardPerfectEligible: false,
          targetRole: waveTarget.role
        });
        pushEvent(room, `${player.name} の${giantShockwave ? "ファイター特大衝撃波" : "ファイター衝撃波"}が ${waveTarget.name} に命中しました（${outcome}）。`);
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
      }
    }
  }
  checkWin(room);
  touch(room);
}

function syncAutomaticStationaryRest(room, player, stationary, timestamp = now()) {
  const capacity = staminaCapacityFor(player);
  const desireDebt = hasDesireManaDebt(player);
  const wasResting = Boolean(player.resting);
  const staminaNeedsRecovery = Number(player.stamina) < capacity - 0.01;
  const active = Boolean(
    room?.phase === "playing" &&
    player?.alive &&
    !player.ejected &&
    !player.inVent &&
    stationary
  );
  player.sleepingUntil = 0;
  player.resting = active;
  if (!active) {
    player.restCompletionPending = false;
    player.desireRestRecoveryStartedAt = 0;
  } else {
    if (!wasResting) player.restCompletionPending = staminaNeedsRecovery;
    else if (staminaNeedsRecovery) player.restCompletionPending = true;
    if (desireDebt) {
      if (!(Number(player.desireRestRecoveryStartedAt) > 0)) player.desireRestRecoveryStartedAt = timestamp;
      if (timestamp - Number(player.desireRestRecoveryStartedAt) >= DESIRE_STATIONARY_RECOVERY_MS) {
        completeDesireManaRecovery(room, player, "rest", timestamp);
      }
    } else {
      player.desireRestRecoveryStartedAt = 0;
    }
  }
  if (player.resting && player.movementMode === "idle") player.movementMode = "sleep";
  if (!player.resting && player.movementMode === "sleep") player.movementMode = "idle";
  return player.resting;
}

function completeRestAtFullStamina(room, player, timestamp = now()) {
  if (
    room?.phase !== "playing" ||
    !player?.resting ||
    !player.restCompletionPending ||
    !player.alive ||
    player.ejected ||
    player.inVent
  ) return { completed: false, manaRestored: false };
  if (hasDesireManaDebt(player)) return { completed: false, manaRestored: false };
  const capacity = staminaCapacityFor(player);
  if (Number(player.stamina) < capacity - 0.01) {
    return { completed: false, manaRestored: false };
  }
  setStamina(room, player, capacity, "休息完了", timestamp);
  const manaRestored = Number(player.mana) < REST_COMPLETION_MANA_FLOOR;
  if (manaRestored) {
    setMana(room, player, REST_COMPLETION_MANA_FLOOR, "休息完了", { exact: true });
  }
  player.restCompletionPending = false;
  player.sleepingUntil = 0;
  pushEvent(
    room,
    `${player.name} の休息が完了し、スタミナが上限まで回復しました${manaRestored ? "。マナは2へ回復しました" : ""}。`
  );
  return { completed: true, manaRestored };
}

function resolveExpandedMapTeleportDestination(room, rawX, rawY) {
  const x = Number(rawX);
  const y = Number(rawY);
  const map = getMap(room);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new ApiError(400, "テレポート先が不正です。");
  }
  if (!isWalkable(room, x, y, map.playerRadius)) {
    throw new ApiError(400, "通行可能な場所を指定してください。");
  }
  return { x, y };
}

function moveByExpandedMapTeleport(target, destination, timestamp = now()) {
  const origin = { x: target.x, y: target.y };
  clearStoredMovementInput(target, timestamp);
  target.airborneUntil = 0;
  target.movementMode = "idle";
  target.x = destination.x;
  target.y = destination.y;
  target.vx = 0;
  target.vy = 0;
  // This is an authoritative discontinuity, not ordinary movement.  Keep a
  // monotonic, per-player marker so clients can invalidate interpolation even
  // when the destination happens to be within their usual snap distance.
  target.relocationRevision = Math.max(0, Number(target.relocationRevision) || 0) + 1;
  target.lastMoveAt = timestamp;
  target.navPath = [];
  if (target.isBot) clearBotNavigationIntent(target);
  if (Math.hypot(target.x - destination.x, target.y - destination.y) > 0.001) {
    throw new ApiError(500, "テレポート先への移動を確定できませんでした。");
  }
  return origin;
}

function teleportPlayer(room, player, rawX, rawY, targetId = "", mode = "body") {
  if (room.phase !== "playing") throw new ApiError(400, "バトル中のみテレポートできます。");
  if (!hasOperatorAccess(player, "gravity")) {
    throw new ApiError(403, "テレポート役職ではありません。");
  }
  if (!player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在はテレポートできません。");
  }
  ensureAbilityAvailable(player);
  mode = String(mode || "body");
  if (!["body", "heart", "target"].includes(mode)) {
    throw new ApiError(400, "テレポート方式が不正です。");
  }
  const timestamp = now();
  const selectedTarget = targetId ? room.players.get(String(targetId)) : player;
  const target = mode === "body" ? player : selectedTarget;
  if (!target || !target.alive || target.ejected || target.inVent) {
    throw new ApiError(404, "テレポート対象がいません。");
  }
  if (mode === "heart") {
    if (target.id === player.id) throw new ApiError(400, "自分の心臓は対象にできません。");
    spendMana(room, player, HEART_TELEPORT_MANA_COST, "心臓転移");
    recordBotVisibleHumanAttackStart(room, player, "heart-transfer", timestamp);
    // The fist glow belongs to the caster and is private so this remote action
    // never discloses the caster's position to the target or other players.
    pushMagicEffect(room, "action-heart-teleport", player, {
      radius: 64,
      playerId: player.id,
      targetId: target.id,
      targetX: target.x,
      targetY: target.y,
      variant: target.role,
      viewerId: player.id
    });
    setImmediateFeedback(player, `心臓転移（${HEART_TELEPORT_MANA_COST}MP）`, target.name);
    const eliminated = eliminatePlayerWithEmp(room, player, target, timestamp, "心臓転移");
    if (eliminated) pushEvent(room, `${player.name} が ${target.name} の心臓へ遠隔テレポートを適用しました。`);
    player.teleportReadyAt = 0;
    checkWin(room);
    touch(room);
    return;
  }
  if (
    mode === "target" &&
    target.id !== player.id &&
    target.role === player.role &&
    ["defender", "attacker"].includes(player.role)
  ) {
    applyDefenderFriendlyFirePenalty(room, player, target, timestamp, { ignorePreparationBarrier: true });
    pushEvent(room, `${player.name} の対象転移は味方への誤射として反射されました。${target.name} は移動しません。`);
    checkWin(room);
    touch(room);
    return;
  }
  let x = Number(rawX);
  let y = Number(rawY);
  let movingTarget = target;
  const destination = resolveExpandedMapTeleportDestination(room, x, y);

  const teleportLabel = mode === "target" ? "対象転移" : "地点転移";
  spendOperatorMana(room, player, teleportLabel);
  const origin = moveByExpandedMapTeleport(movingTarget, destination, timestamp);
  player.teleportReadyAt = 0;
  pushMagicEffect(room, "action-teleport", origin, { radius: 135, playerId: player.id, targetId: movingTarget.id, targetX: destination.x, targetY: destination.y });
  pushMagicEffect(room, "action-teleport", movingTarget, { radius: 135, playerId: movingTarget.id, variant: "arrival" });
  pushEvent(room, mode === "target"
    ? `${player.name} が ${movingTarget.name} を指定地点へ対象転移させました。`
      : movingTarget.id === player.id
        ? `${player.name} が転移しました。`
        : `${player.name} が ${movingTarget.name} を転移させました。`);
  touch(room);
}

function receivedGravityTimeControllersFor(room, target, timestamp = now()) {
  if (hasNaturalRecovery(room, target) || timeKeeperStops(target, timestamp)) return [];
  return [...room.players.values()].filter((player) => (
    (hasOperatorAccess(player, "gravity") || hasShopGravityTimeLifecycle(player)) && player.gravityTimeMode && player.gravityTimeTargetId === target.id &&
    Number(player.gravityTimeEndsAt) > timestamp && player.alive && !player.ejected
  ));
}

function receivedDecelerateStatusFor(room, target, timestamp = now()) {
  const latest = receivedGravityTimeControllersFor(room, target, timestamp)
    .filter((player) => player.gravityTimeMode === "decelerate")
    .reduce((endsAt, player) => Math.max(endsAt, Number(player.gravityTimeEndsAt) || 0), 0);
  return latest > timestamp ? { endsAt: latest } : null;
}

function gravityTimeScaleFor(room, target, timestamp = now()) {
  if (hasNaturalRecovery(room, target)) return 1;
  if (timeKeeperStops(target, timestamp)) return 0;
  const controllers = receivedGravityTimeControllersFor(room, target, timestamp);
  if (controllers.some((player) => player.gravityTimeMode === "decelerate")) return GRAVITY_TIME_SCALE_SLOW;
  return 1;
}

function useTimeKeeper(room, player) {
  if (room.phase !== "playing" || !hasOperatorAccess(player, "gravity") || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在は時の番人を使用できません。");
  }
  ensureAbilityAvailable(player);
  const startedAt = now();
  if (Number(player.timeKeeperEndsAt) > startedAt) {
    throw new ApiError(409, "時の番人はすでに発動中です。終了後にもう一度使用してください。");
  }
  spendOperatorMana(room, player, "時の番人", GRAVITY_TIME_KEEPER_MANA_COST);
  const endsAt = startedAt + GRAVITY_TIME_KEEPER_DURATION_MS;
  player.timeKeeperEndsAt = Math.max(Number(player.timeKeeperEndsAt) || 0, endsAt);
  let stoppedCount = 0;
  for (const target of room.players.values()) {
    if (target.id === player.id || !target.alive || target.ejected) continue;
    target.timeStoppedUntil = Math.max(Number(target.timeStoppedUntil) || 0, endsAt);
    target.vx = 0;
    target.vy = 0;
    target.movementMode = "time-stopped";
    stoppedCount += 1;
  }
  pushMagicEffect(room, "gravity-time-keeper", player, {
    radius: 155,
    playerId: player.id,
    durationMs: GRAVITY_TIME_KEEPER_DURATION_MS,
    variant: "total-stop"
  });
  pushEvent(room, `${player.name} が時の番人（${GRAVITY_TIME_KEEPER_MANA_COST}MP）を発動し、術者以外の全てを${GRAVITY_TIME_KEEPER_DURATION_MS / 1000}秒間停止しました（${stoppedCount}人）。`);
  touch(room);
}

function toggleGravityTime(room, player, mode, targetId) {
  if (room.phase !== "playing" || !hasOperatorAccess(player, "gravity") || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在は時空加減速を使用できません。");
  }
  ensureAbilityAvailable(player);
  const selectedMode = mode === "decelerate" ? "decelerate" : "accelerate";
  const target = room.players.get(String(targetId || player.id));
  if (!target || !target.alive || target.ejected) throw new ApiError(404, "時空操作対象がいません。");
  if (
    selectedMode === "decelerate" &&
    target.id !== player.id &&
    target.role === player.role &&
    ["defender", "attacker"].includes(player.role)
  ) {
    applyDefenderFriendlyFirePenalty(room, player, target, now(), { ignorePreparationBarrier: true });
    pushEvent(room, `${player.name} のディーセラレートは味方への誤射として反射されました。${target.name} は減速しません。`);
    checkWin(room);
    touch(room);
    return;
  }
  spendOperatorMana(room, player, selectedMode === "accelerate" ? "アクセラレート" : "ディーセラレート");
  const timestamp = now();
  if (selectedMode === "decelerate" && rejectAdverseStatusDuringNaturalRecovery(room, target, "ディーセラレート", timestamp)) {
    pushMagicEffect(room, "gravity-decelerate", target, {
      radius: 150,
      playerId: player.id,
      targetId: target.id,
      durationMs: 900,
      variant: "rational-natural-recovery-immune"
    });
    pushEvent(room, `${player.name} のディーセラレートを ${target.name} が理知の自然回復で無効化しました。`);
    touch(room);
    return;
  }
  player.gravityTimeMode = selectedMode;
  player.gravityTimeTargetId = target.id;
  player.gravityTimeEndsAt = timestamp + GRAVITY_TIME_DURATION_MS;
  if (selectedMode === "accelerate") {
    addTimedAcceleration(target, "gravity-accelerate", GRAVITY_TIME_SCALE_FAST, GRAVITY_TIME_DURATION_MS, timestamp);
  }
  pushMagicEffect(room, `gravity-${selectedMode}`, target, {
    radius: 150,
    playerId: player.id,
    targetId: target.id,
    durationMs: GRAVITY_TIME_DURATION_MS
  });
  pushEvent(room, `${player.name} が ${target.name} へ${selectedMode === "accelerate" ? "アクセラレート" : "ディーセラレート"}を8秒間付与しました。`);
  touch(room);
}

function useGravityStorm(room, player, targetId = "") {
  if (room.phase !== "playing" || !hasOperatorAccess(player, "gravity") || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在はグラビティストームを使用できません。");
  }
  ensureAbilityAvailable(player);
  const requestedTargetId = String(targetId || player.id);
  const target = room.players.get(requestedTargetId);
  if (!target || !target.alive || target.ejected || target.inVent) {
    throw new ApiError(404, "グラビティストームの対象がいません。");
  }
  spendOperatorMana(room, player, "グラビティストーム", GRAVITY_STORM_MANA_COST);
  const startedAt = now();
  recordBotVisibleHumanAttackStart(room, player, "gravity-storm", startedAt);
  const endsAt = startedAt + GRAVITY_STORM_DURATION_MS;
  const zone = {
    id: uid("gravity_"), ownerId: player.id,
    targetId: target.id,
    x: clampNumber(target.x, 0, getMap(room).width, target.x),
    y: clampNumber(target.y, 0, getMap(room).height, target.y),
    radius: GRAVITY_STORM_VISUAL_RADIUS,
    barrierRadius: GRAVITY_STORM_BARRIER_RADIUS,
    safeX: player.x,
    safeY: player.y,
    startedAt,
    barrierUntil: endsAt - GRAVITY_STORM_BARRIER_RELEASE_MS,
    endsAt,
    lastPulseAt: 0
  };
  const gravityStormCausalId = `gravity-storm:${zone.id}`;
  zone.gravityStormCausalId = gravityStormCausalId;
  room.gravityZones ||= [];
  room.gravityZones.push(zone);
  pushMagicEffect(room, "gravity-storm", zone, { radius: zone.radius, playerId: player.id, variant: "debris-dent", gravityStormCausalId });
  pushSound(room, "gravityStorm", zone, { ownerId: player.id, sourceKind: "magic", maxDistance: 2600, volume: 1, gravityStormCausalId });
  pushEvent(room, `${player.name} が ${target.name} の位置へグラビティストームを展開しました。全域の敵を吸引し、最後の1秒だけ発動者のバリアが消失します。`);
  touch(room);
}

function displaceByGravity(room, target, rawDx, rawDy, amount) {
  const map = getMap(room);
  const length = Math.hypot(rawDx, rawDy) || 1;
  const dx = rawDx / length;
  const dy = rawDy / length;
  const stepSize = 18;
  let remaining = Math.max(0, amount);
  while (remaining > 0) {
    const step = Math.min(stepSize, remaining);
    const nx = clampNumber(target.x + dx * step, map.playerRadius, map.width - map.playerRadius, target.x);
    const ny = clampNumber(target.y + dy * step, map.playerRadius, map.height - map.playerRadius, target.y);
    if (!isWalkable(room, nx, ny, map.playerRadius)) break;
    target.x = nx;
    target.y = ny;
    remaining -= step;
  }
}

function advanceGravitySystems(room, timestamp, elapsedMs) {
  reconcileBarrierExpiry(room, timestamp);
  for (const controller of room.players.values()) {
    if (!controller.gravityTimeMode) continue;
    const target = room.players.get(controller.gravityTimeTargetId);
    if (!target?.alive || target.ejected || !controller.alive || controller.ejected || timestamp >= Number(controller.gravityTimeEndsAt || 0)) {
      controller.gravityTimeMode = "";
      controller.gravityTimeTargetId = "";
      controller.gravityTimeEndsAt = 0;
      continue;
    }
  }
  room.gravityZones = (room.gravityZones || []).filter((zone) => zone.endsAt > timestamp);
  for (const zone of room.gravityZones) {
    const owner = room.players.get(zone.ownerId);
    if (owner?.alive && !owner.ejected) {
      zone.safeX = owner.x;
      zone.safeY = owner.y;
    }
    if (timestamp - zone.lastPulseAt < GRAVITY_STORM_PULSE_MS) continue;
    zone.lastPulseAt = timestamp;
    if (!owner) continue;
    const enemyRole = attackTargetRole(owner);
    for (const candidate of room.players.values()) {
      if (candidate.id === zone.ownerId) continue;
      if (!candidate.alive || candidate.ejected || candidate.inVent || candidate.role !== enemyRole) continue;
      const target = candidate;
      if (resolveFighterSlashGuard(room, owner || null, target, {
        kind: "gravity-storm",
        label: "グラビティストーム",
        physical: false,
        reflectable: false
      }, timestamp)) continue;
      if (absorbPreparationBarrier(room, target, timestamp, owner || null)) continue;

      const severity = luckAdjustedRoll(target);
      const luck = luckValueFor(target);
      const remainingMs = Math.max(0, Number(zone.endsAt) - timestamp);
      const finalSecond = remainingMs <= GRAVITY_STORM_BARRIER_RELEASE_MS;
      const damageMin = finalSecond ? GRAVITY_STORM_FINAL_DAMAGE_MIN : GRAVITY_STORM_DAMAGE_MIN;
      const damageMax = finalSecond ? GRAVITY_STORM_FINAL_DAMAGE_MAX : GRAVITY_STORM_DAMAGE_MAX;
      const luckDamageMultiplier = clampNumber(
        1 - Math.max(0, luck) * 0.65 + Math.max(0, -luck) * 0.35,
        0.35,
        1.35,
        1
      );
      const damage = Math.round((damageMin + (damageMax - damageMin) * severity) * luckDamageMultiplier * 100) / 100;
      const slowMultiplier = Math.round((GRAVITY_STORM_SLOW_MULTIPLIER_MAX -
        (GRAVITY_STORM_SLOW_MULTIPLIER_MAX - GRAVITY_STORM_SLOW_MULTIPLIER_MIN) * severity) * 100) / 100;

      const damageResult = settleDurableBodyDamage(room, owner, target, damage, "グラビティストーム", {timestamp, attackKind: "gravity-storm", impactOrigin: zone});
      if (damageResult.absorbed || damageResult.killed) continue;
      const distanceToCore = Math.hypot(zone.x - target.x, zone.y - target.y);
      const pullAmount = GRAVITY_STORM_PULL_MIN +
        (GRAVITY_STORM_PULL_MAX - GRAVITY_STORM_PULL_MIN) * severity +
        Math.min(160, distanceToCore * 0.12);
      displaceByGravity(room, target, zone.x - target.x, zone.y - target.y, pullAmount);

      const infiniteResources = hasFighterInfiniteResources(target) && !target.limitBreakActive;
      if (infiniteResources) syncFighterInfiniteResources(target);

      target.lastGravityStormDamage = damage;
      const statusImmune = rejectAdverseStatusDuringNaturalRecovery(room, target, "グラビティストーム減速・拘束", timestamp);
      if (!statusImmune) {
        const gravitySlowWasActive = Number(target.gravityStormSlowUntil) > timestamp;
        target.gravityStormSlowUntil = Math.max(Number(target.gravityStormSlowUntil) || 0, timestamp + GRAVITY_STORM_SLOW_LINGER_MS);
        target.gravityStormSlowMultiplier = gravitySlowWasActive
          ? Math.min(Number(target.gravityStormSlowMultiplier) || 1, slowMultiplier)
          : slowMultiplier;
      }
      setImmediateFeedback(
        target,
        finalSecond ? "グラビティストーム 最終1秒" : "グラビティストーム",
        `${infiniteResources ? "HP∞でダメージ無効" : `HP-${damage.toFixed(2)}`} / 全域吸引 / ${statusImmune ? "理知の自然回復で減速・拘束無効" : `移動速度${Math.round(slowMultiplier * 100)}%`}`
      );

      const modeRoll = Math.random();
      if (modeRoll < 0.22 && !statusImmune) {
        const pinMs = Math.round(GRAVITY_STORM_PIN_MIN_MS + (GRAVITY_STORM_PIN_MAX_MS - GRAVITY_STORM_PIN_MIN_MS) * severity);
        target.gravityPinnedUntil = Math.max(target.gravityPinnedUntil || 0, timestamp + pinMs);
        target.vx = 0;
        target.vy = 0;
        pushMagicEffect(room, "gravity-storm-crush", target, { radius: 165, playerId: zone.ownerId, targetId: target.id, variant: `pull-pin:${pinMs}` });
      } else if (modeRoll < 0.48) {
        const extraPull = pullAmount * (0.28 + severity * 0.22);
        displaceByGravity(room, target, zone.x - target.x, zone.y - target.y, extraPull);
        pushMagicEffect(room, "gravity-storm-heavy", target, { radius: 155, playerId: zone.ownerId, targetId: target.id, variant: `inward:${Math.round(extraPull)}` });
      } else {
        pushMagicEffect(room, "gravity-storm-pull", target, {
          radius: 175,
          playerId: zone.ownerId,
          targetId: target.id,
          variant: `${finalSecond ? "final" : "sustain"}:${Math.round(pullAmount)}`
        });
      }
    }
  }
}

function substitutionDestination(room, player, origin) {
  const map = getMap(room);
  const areas = [...map.rooms, ...map.corridors].filter((area) => area.w > 120 && area.h > 120);
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const area = areas[Math.floor(Math.random() * areas.length)];
    if (!area) break;
    const margin = Math.min(70, area.w / 3, area.h / 3);
    const x = area.x + margin + Math.random() * Math.max(1, area.w - margin * 2);
    const y = area.y + margin + Math.random() * Math.max(1, area.h - margin * 2);
    if (distance(origin, { x, y }) >= 520 && isWalkable(room, x, y, map.playerRadius)) return { x, y };
  }
  const fallback = [...map.spawns]
    .filter((point) => isWalkable(room, point.x, point.y, map.playerRadius))
    .sort((a, b) => distance(b, origin) - distance(a, origin))[0];
  return fallback || { x: player.x, y: player.y };
}

function itemStorageAvailable(player, timestamp = now()) {
  return (Number(player?.itemDisabledUntil) || 0) <= timestamp;
}

function ensureItemStorageAvailable(player, timestamp = now()) {
  if (itemStorageAvailable(player, timestamp)) return;
  throw new ApiError(400, `EMP機器異常中です（残り${Math.ceil((player.itemDisabledUntil - timestamp) / 1000)}秒）。`);
}

function triggerSubstitution(room, player, reason, timestamp = now()) {
  if (hackerRootEligible(player) || hasLimitBreakDeathVulnerability(player) || player.substitutionCharges <= 0 || !passivesEnabled(player) || !itemStorageAvailable(player, timestamp)) return false;
  const origin = { x: player.x, y: player.y, id: player.id };
  const destination = substitutionDestination(room, player, origin);
  player.substitutionCharges -= 1;
  player.inVent = false;
  player.ventId = "";
  player.x = destination.x;
  player.y = destination.y;
  player.vx = 0;
  player.vy = 0;
  player.lastMoveAt = timestamp;
  player.navPath = [];
  pushMagicEffect(room, "substitution", origin, {
    targetX: destination.x,
    targetY: destination.y,
    playerId: player.id
  });
  pushSound(room, "substitution", origin, {
    ownerId: player.id,
    sourceKind: "magic",
    maxDistance: 1800,
    volume: 0.9
  });
  const reasonLabel = reason === "emp" ? "EMP" : "キル";
  pushEvent(room, `${player.name} が変わり身の術で${reasonLabel}を無効化しました。`);
  touch(room);
  return true;
}

function eliminateLimitBreakerWithEmp(room, source, target, timestamp) {
  return eliminatePlayerWithEmp(room, source, target, timestamp, "EMPキル");
}

function transferKillCredits(room, killer, target) {
  if (!killer || !target || killer.id === target.id) return 0;
  const amount = Math.max(0, Math.floor(Number(target.credits) || 0));
  if (amount <= 0) return 0;
  target.credits -= amount;
  grantCredits(room, killer, amount, "kill-transfer");
  pushEvent(room, `${killer.name} が ${target.name} の保有クレジット ${amount}Cを獲得しました。`);
  return amount;
}

// Result and profile scoring consume totalKills, so every credited elimination
// passes through this one authoritative, idempotent ledger. A body is only a
// presentation detail: annihilations, reflections and EMP deaths share the
// same cross-faction record, while environmental/no-source deaths do not.
function recordCanonicalKill(room, source, target) {
  const killer = room?.players?.get(String(source?.id || ""));
  const victim = room?.players?.get(String(target?.id || ""));
  if (
    !killer || !victim || killer.id === victim.id ||
    !["attacker", "defender"].includes(killer.role) ||
    !["attacker", "defender"].includes(victim.role) ||
    killer.role === victim.role
  ) return false;
  if (!room.canonicalKillVictimIds) room.canonicalKillVictimIds = new Set();
  if (room.canonicalKillVictimIds.has(victim.id)) return false;
  room.canonicalKillVictimIds.add(victim.id);
  killer.totalKills = Math.max(0, Number(killer.totalKills) || 0) + 1;
  killer.killChainCount = Math.max(0, Math.floor(Number(killer.killChainCount) || 0)) + 1;
  pushGainAte(room, killer, "cooldownReduction", {
    variant: "kill-chain",
    durationMs: 1_500
  });
  return true;
}

function killChainCooldownMultiplier(player) {
  const count = Math.max(0, Math.floor(Number(player?.killChainCount) || 0));
  return Math.max(KILL_CHAIN_MIN_MULTIPLIER, 1 - count * KILL_CHAIN_REDUCTION_PER_KILL);
}

function killCooldownDurationMs(room, player) {
  const baseSeconds = Math.max(MIN_KILL_COOLDOWN, Number(room?.settings?.killCooldown) || MIN_KILL_COOLDOWN);
  return Math.round(baseSeconds * 1000 * killChainCooldownMultiplier(player));
}

function transferKillInventory(room, killer, target) {
  if (!killer || !target || killer.id === target.id) return [];
  synchronizeDurableWeapons(killer);
  const durableLoot = synchronizeDurableWeapons(target).map(w => ({...w}));
  const transferred = [];
  // Operator charges are player-bound effects, not transferable inventory.
  // Physical inventory, inventions, heavy weapons and firearms already have
  // shared ownership semantics and can be looted by any credited opposing
  // killer (human or Bot).
  for (const [itemId, amountValue] of Object.entries(target.itemInventory || {})) {
    const amount = Math.max(0, Math.floor(Number(amountValue) || 0));
    if (!amount || !ITEM_DEFINITIONS[itemId]) continue;
    addItem(killer, itemId, amount);
    delete target.itemInventory[itemId];
    transferred.push(`${ITEM_DEFINITIONS[itemId].label}:${amount}`);
  }
  if (Array.isArray(target.inventions) && target.inventions.length) {
    killer.inventions = [...(killer.inventions || []), ...target.inventions];
    transferred.push(`発明品:${target.inventions.length}`);
    target.inventions = [];
  }
  if (Array.isArray(target.heavyWeapons) && target.heavyWeapons.length) {
    killer.heavyWeapons = [...(killer.heavyWeapons || []), ...target.heavyWeapons];
    transferred.push(`重火器:${target.heavyWeapons.length}`);
    target.heavyWeapons = [];
  }
  // Match the manual transfer owner exactly: an operator-native Gunner weapon
  // is transferable too.  Removing it means marking it unavailable, while
  // receiving it means an explicit purchased owner (even for non-Gunner roles).
  const firearms = GUNNER_WEAPON_ORDER.filter((weaponId) => gunnerWeaponAvailable(target, weaponId));
  if (firearms.length) {
    killer.purchasedWeapons ||= [];
    killer.unavailableGunnerWeapons ||= [];
    target.purchasedWeapons ||= [];
    target.unavailableGunnerWeapons ||= [];
    killer.gunnerAmmo ||= createGunnerAmmo();
    target.gunnerAmmo ||= createGunnerAmmo();
    for (const weaponId of firearms) {
      const weapon = GUNNER_WEAPONS[weaponId];
      if (!killer.purchasedWeapons.includes(weaponId)) killer.purchasedWeapons.push(weaponId);
      killer.unavailableGunnerWeapons = killer.unavailableGunnerWeapons.filter((id) => id !== weaponId);
      target.purchasedWeapons = target.purchasedWeapons.filter((id) => id !== weaponId);
      if (!target.unavailableGunnerWeapons.includes(weaponId)) target.unavailableGunnerWeapons.push(weaponId);
      const sourceAmmo = Math.min(weapon.maxAmmo, Math.max(0, Math.floor(Number(target.gunnerAmmo[weaponId]) || 0)));
      const existingAmmo = Math.min(weapon.maxAmmo, Math.max(0, Math.floor(Number(killer.gunnerAmmo[weaponId]) || 0)));
      killer.gunnerAmmo[weaponId] = Math.min(weapon.maxAmmo, existingAmmo + sourceAmmo);
      target.gunnerAmmo[weaponId] = 0;
    }
    transferred.push(`銃器:${firearms.length}`);
  }
  target.durableWeapons = [];
  receiveDurableWeaponInstances(killer, durableLoot);
  if (transferred.length) pushEvent(room, `${killer.name} が ${target.name} の所持品をすべて獲得しました。`);
  return transferred;
}

// One credited enemy elimination owns both scoring and loot.  Every lethal
// route calls this after it has committed the death; recordCanonicalKill is
// the idempotent gate, so duplicate callbacks, self kills, environmental
// deaths and same-faction penalties cannot transfer assets twice.
function settleCreditedKillLoot(room, source, target) {
  if (!recordCanonicalKill(room, source, target)) return null;
  const credits = transferKillCredits(room, source, target);
  const inventory = transferKillInventory(room, source, target);
  if (credits > 0 || inventory.length) {
    const summary = [credits > 0 ? `${credits}C` : "", ...inventory].filter(Boolean).join(" / ");
    pushMagicEffect(room, "transfer-in", source, {
      radius: 150,
      playerId: source.id,
      targetId: target.id,
      targetX: target.x,
      targetY: target.y,
      variant: "kill-loot",
      acquisitionKind: inventory.length ? "loot" : "credits",
      acquisitionCredits: credits,
      acquisitionOriginX: target.x,
      acquisitionOriginY: target.y,
      durationMs: 1800
    });
    setImmediateFeedback(source, "戦利品", summary);
  }
  return { credits, inventory };
}

// Instant-item acquisition consumes the item into a player-bound effect or
// use count. No converted instant charge remains available for manual transfer.
const TRANSFERABLE_CHARGES = Object.freeze({});

function inventionLabel(invention) {
  const id = String(invention || "");
  return HACKER_INVENTION_LABELS[id] || id || "素敵な発明品";
}

function transferableItemsFor(player) {
  const entries = [];
  for (const [itemId, amount] of Object.entries(player.itemInventory || {})) {
    if (ITEM_DEFINITIONS[itemId] && Number(amount) > 0) {
      entries.push({
        id: itemId,
        label: ITEM_DEFINITIONS[itemId].label,
        amount: Math.floor(Number(amount)),
        asset: ITEM_DEFINITIONS[itemId].asset,
        kind: "item",
        throwable: ITEM_DEFINITIONS[itemId].throwable !== false,
        usable: ITEM_DEFINITIONS[itemId].usable !== false,
        reusable: Boolean(ITEM_DEFINITIONS[itemId].reusable)
      });
    }
  }
  for (const [itemId, definition] of Object.entries(TRANSFERABLE_CHARGES)) {
    const amount = Math.max(0, Math.floor(Number(player[definition.field]) || 0));
    if (amount > 0) entries.push({ id: itemId, label: definition.label, amount, asset: itemId, kind: "charge" });
  }
  for (const invention of player.inventions || []) {
    entries.push({ id: `invention:${invention}`, label: inventionLabel(invention), amount: 1, asset: invention, kind: "invention" });
  }
  const heavyWeaponCounts = (player.heavyWeapons || []).reduce((counts, weaponId) => {
    counts[weaponId] = (counts[weaponId] || 0) + 1;
    return counts;
  }, {});
  for (const [weaponId, amount] of Object.entries(heavyWeaponCounts)) {
    const definition = HEAVY_WEAPON_DEFINITIONS[weaponId];
    if (definition && amount > 0) entries.push({ id: `heavy:${weaponId}`, label: definition.label, amount, asset: definition.asset, kind: "heavy" });
  }
  for (const weapon of GUNNER_WEAPON_ORDER) {
    if (!gunnerWeaponAvailable(player, weapon)) continue;
    entries.push({ id: `weapon:${weapon}`, label: GUNNER_WEAPONS[weapon]?.name || weapon, amount: 1, asset: weapon, kind: "weapon" });
  }
  return entries;
}

function removeTransferableItem(room, player, itemId, amount = 1) {
  const count = Math.max(1, Math.floor(Number(amount) || 1));
  const durableBefore = synchronizeDurableWeapons(player).filter(w => w.itemId === itemId).slice(0, itemId.startsWith("weapon:") ? 1 : count).map(w => ({...w}));
  if (INSTANT_ITEM_DEFINITIONS[itemId]) throw new ApiError(400, `${INSTANT_ITEM_DEFINITIONS[itemId].label}は即席のため譲渡できません。`);
  if (ITEM_DEFINITIONS[itemId]) {
    consumeItem(player, itemId, count);
    player.durableWeapons = player.durableWeapons.filter(w => !durableBefore.some(x => x.instanceId === w.instanceId));
    return { id: itemId, label: ITEM_DEFINITIONS[itemId].label, amount: count, kind: "item", durableInstances: durableBefore };
  }
  const charge = TRANSFERABLE_CHARGES[itemId];
  if (charge) {
    if ((Number(player[charge.field]) || 0) < count) throw new ApiError(400, `${charge.label}が不足しています。`);
    player[charge.field] -= count;
    return { id: itemId, label: charge.label, amount: count, kind: "charge" };
  }
  if (itemId.startsWith("invention:")) {
    const invention = itemId.slice(10);
    const index = (player.inventions || []).indexOf(invention);
    if (index < 0) throw new ApiError(400, "その特殊装備を所持していません。");
    player.inventions.splice(index, 1);
    return { id: itemId, label: inventionLabel(invention), amount: 1, kind: "invention" };
  }
  if (itemId.startsWith("weapon:")) {
    const weapon = itemId.slice(7);
    if (!GUNNER_WEAPONS[weapon] || !gunnerWeaponAvailable(player, weapon)) throw new ApiError(400, "その武器を所持していません。");
    const index = (player.purchasedWeapons || []).indexOf(weapon);
    if (index >= 0) player.purchasedWeapons.splice(index, 1);
    player.unavailableGunnerWeapons ||= [];
    if (!player.unavailableGunnerWeapons.includes(weapon)) player.unavailableGunnerWeapons.push(weapon);
    if (player.gunnerReloadWeapon === weapon) {
      player.gunnerReloadWeapon = "";
      player.gunnerReloadUntil = 0;
    }
    if (player.gunFiringWeapon === weapon) {
      if (player.gunnerBurstGbo && player.gunnerBurstGboWeapon === weapon) {
        stopGunnerFire(room, player, { reason: "別操作による中断" });
        throw new ApiError(400, "GBOへcommitした武器は中断により破壊され、別操作へ移せません。");
      }
      player.gunFiring = false;
      player.gunFiringWeapon = "";
      player.gunFiringSince = 0;
      player.gunnerBurstRoundsRemaining = 0;
      player.gunnerBurstEnhanceLevel = 0;
      player.gunnerBurstGbo = false;
      player.gunnerBurstGboWeapon = "";
    }
    if (player.gunnerWeapon === weapon) {
      const currentIndex = Math.max(0, GUNNER_WEAPON_ORDER.indexOf(weapon));
      player.gunnerWeapon = nextUsableGunnerWeapon(player, currentIndex, 1) || DEFAULT_GUNNER_WEAPON;
    }
    player.durableWeapons = player.durableWeapons.filter(w => !durableBefore.some(x => x.instanceId === w.instanceId));
    if (player.durableWeapons.some(w => w.itemId === itemId)) {
      player.purchasedWeapons ||= []; if (!player.purchasedWeapons.includes(weapon)) player.purchasedWeapons.push(weapon);
      player.unavailableGunnerWeapons = player.unavailableGunnerWeapons.filter(id => id !== weapon);
    }
    return { id: itemId, label: GUNNER_WEAPONS[weapon]?.name || weapon, amount: 1, kind: "weapon", durableInstances: durableBefore.slice(0, 1) };
  }
  if (itemId.startsWith("heavy:")) {
    const weapon = itemId.slice(6);
    const index = (player.heavyWeapons || []).indexOf(weapon);
    if (index < 0) throw new ApiError(400, "その重火器を所持していません。");
    player.heavyWeapons.splice(index, 1);
    return { id: itemId, label: HEAVY_WEAPON_DEFINITIONS[weapon]?.label || weapon, amount: 1, kind: "heavy" };
  }
  throw new ApiError(400, "譲渡対象が不正です。");
}

function receiveTransferableItem(player, item) {
  const itemId = String(item?.id || "");
  if (ITEM_DEFINITIONS[itemId]) addItem(player, itemId, item.amount);
  else if (TRANSFERABLE_CHARGES[itemId]) player[TRANSFERABLE_CHARGES[itemId].field] = Math.max(0, Number(player[TRANSFERABLE_CHARGES[itemId].field]) || 0) + item.amount;
  else if (itemId.startsWith("invention:")) player.inventions.push(itemId.slice(10));
  else if (itemId.startsWith("weapon:")) purchaseFirearm(player, itemId.slice(7));
  else if (itemId.startsWith("heavy:")) player.heavyWeapons.push(itemId.slice(6));
  else throw new ApiError(400, "この接地アイテムは回収できません。");
  receiveDurableWeaponInstances(player, item.durableInstances);
  return true;
}

function transferOwnedResource(room, player, targetId, itemId, rawAmount, credits = false) {
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) throw new ApiError(403, "現在は譲渡できません。");
  ensureConscious(player);
  const target = room.players.get(String(targetId || ""));
  if (!target || target.id === player.id || !target.alive || target.ejected) throw new ApiError(404, "譲渡相手がいません。");
  // 所持品とクレジットはスマホのストレージ経由で譲渡するため距離を問わない。
  const amount = Math.max(1, Math.floor(Number(rawAmount) || 1));
  let transferLabel = "";
  let acquisitionId = "";
  let acquisitionKind = "credits";
  if (credits) {
    if (Number(player.credits) < amount) throw new ApiError(400, "クレジットが不足しています。");
    player.credits -= amount;
    grantCredits(room, target, amount, "player-transfer");
    transferLabel = `${amount}C`;
    pushEvent(room, `${player.name} が ${target.name} へ ${amount}Cを譲渡しました。`);
  } else {
    ensureItemStorageAvailable(player);
    const item = removeTransferableItem(room, player, String(itemId || ""), amount);
    receiveTransferableItem(target, item);
    transferLabel = `${item.label}×${item.amount}`;
    acquisitionId = item.id;
    acquisitionKind = item.kind || "item";
    pushEvent(room, `${player.name} が ${target.name} へ ${item.label}×${item.amount}を譲渡しました。`);
  }
  pushMagicEffect(room, "transfer-out", player, {
    radius: 150,
    playerId: player.id,
    targetId: target.id,
    targetX: target.x,
    targetY: target.y,
    variant: credits ? "credits" : "item",
    acquisitionKind,
    durationMs: 1800
  });
  pushMagicEffect(room, "transfer-in", target, {
    radius: 150,
    playerId: target.id,
    targetId: player.id,
    targetX: player.x,
    targetY: player.y,
    variant: credits ? "credits" : "item",
    acquisitionId,
    acquisitionKind,
    acquisitionOriginX: player.x,
    acquisitionOriginY: player.y,
    durationMs: 1800
  });
  setImmediateFeedback(player, "譲渡", transferLabel);
  setImmediateFeedback(target, "受領", transferLabel);
  touch(room);
}

function applyDefenderFriendlyFirePenalty(room, killer, target, timestamp, options = {}) {
  if (!killer || !target || killer.id === target.id) return false;
  if (killer.role !== target.role || !["defender", "attacker"].includes(killer.role) || !killer.alive || killer.ejected) return false;
  if (!options.ignorePreparationBarrier && absorbPreparationBarrier(room, killer, timestamp, target)) return false;
  recordBotMatchElimination(room, killer, killer);
  setGravityLevitationEngaged(room, killer, false, "friendly-fire-death");
  killer.alive = false;
  recordKillCamera(room, killer, null, {
    timestamp,
    killerName: "同陣営誤射ペナルティ",
    actionLabel: `${target.name}への同陣営攻撃`,
    actionKind: "friendly-fire-penalty",
    sourceLabel: "戦闘ルール"
  });
  killer.bodyHits = 0;
  killer.overheal = 0;
  killer.limitBreakActive = false;
  killer.limitBreakEndsAt = 0;
  killer.limitBreakStacks = 0;
  killer.inVent = false;
  killer.ventId = "";
  clearAttackState(killer);
  completeTasksAfterDeath(room, killer);
  pushHitEffect(room, killer, "body", true);
  room.bodies.push({
    id: uid("body_"),
    playerId: killer.id,
    killerId: "friendly-fire",
    killerName: "同陣営誤射ペナルティ",
    killerIsBot: true,
    killerSkinId: "operator",
    name: killer.name,
    x: killer.x,
    y: killer.y,
    at: timestamp,
    friendlyFirePenalty: true
  });
  pushDoorLog(room, `${whichRoom(getMap(room), killer)} で同陣営誤射ペナルティ発生`);
  pushEvent(room, `${killer.name} は同陣営の ${target.name} へ攻撃を試みたため即死しました。${target.name} は無傷です。`);
  return true;
}

function destroyElectronicInventoryByEmp(room, target) {
  let destroyed = 0;
  if (Array.isArray(target.purchasedWeapons) && target.purchasedWeapons.includes("taser")) {
    target.purchasedWeapons = target.purchasedWeapons.filter((weaponId) => weaponId !== "taser");
    target.gunnerAmmo.taser = 0;
    destroyed += 1;
  }
  if (destroyed > 0) pushEvent(room, `${target.name} の電子機器 ${destroyed}点がEMPで破壊されました。`);
  return destroyed;
}

function hackerEmpProtectionUntil(room, target) {
  if (!isHackerOperational(target)) return 0;
  const battleStartedAt = Number(room?.battleStartedAt) || 0;
  return battleStartedAt > 0 ? battleStartedAt + HACKER_EMP_OPENING_PROTECTION_MS : 0;
}

function hackerEmpOpeningProtected(room, target, timestamp = now()) {
  const protectedUntil = hackerEmpProtectionUntil(room, target);
  return protectedUntil > 0 && timestamp < protectedUntil;
}

function preparationBarrierActive(room, timestamp = now()) {
  return room?.phase === "playing" && Number(room.preparationEndsAt) > timestamp;
}

// Keep the serialized barrier lifecycle authoritative as well as its boolean
// predicate.  Leaving an expired timestamp in the room made an old shield
// state available to consumers which did not independently compare it with
// server time.  In particular, an explicit zero is significant for a Gravity
// Storm: it means "released", not "use the legacy inferred release time".
function reconcileBarrierExpiry(room, timestamp = now()) {
  if (!room) return false;
  let changed = false;
  if (Number(room.preparationEndsAt) > 0 && Number(room.preparationEndsAt) <= timestamp) {
    room.preparationEndsAt = 0;
    changed = true;
  }
  for (const zone of room.gravityZones || []) {
    const endsAt = Number(zone?.endsAt) || 0;
    const hasExplicitBarrierUntil = Object.prototype.hasOwnProperty.call(zone || {}, "barrierUntil");
    const barrierUntil = hasExplicitBarrierUntil
      ? Number(zone.barrierUntil) || 0
      : endsAt - GRAVITY_STORM_BARRIER_RELEASE_MS;
    if (barrierUntil > 0 && barrierUntil <= timestamp) {
      zone.barrierUntil = 0;
      changed = true;
    }
  }
  for (const player of room.players?.values?.() || []) {
    if (Number(player.standFirmBarrierUntil) > 0 && Number(player.standFirmBarrierUntil) <= timestamp) {
      player.standFirmBarrierUntil = 0;
      changed = true;
    }
  }
  return changed;
}

function preparationBarrierProtects(room, target, timestamp = now()) { return room?.phase === "playing" && durableBarrierActive(target); }

function standFirmBarrierProtects(target, timestamp = now()) { return false; }

function activeGravityStormBarrier(room, target, timestamp = now()) {
  if (!target?.alive || target.ejected) return null;
  return (room?.gravityZones || []).find((zone) => (
    String(zone.ownerId || "") === String(target.id || "") &&
    Number(zone.endsAt) > timestamp &&
    timestamp < (
      Object.prototype.hasOwnProperty.call(zone, "barrierUntil")
        ? Number(zone.barrierUntil) || 0
        : Number(zone.endsAt) - GRAVITY_STORM_BARRIER_RELEASE_MS
    )
  )) || null;
}

// This is deliberately a bot *planning* boundary, rather than another
// damage-resolution exception.  A barrier has always absorbed an already
// committed hit, but hostile bots must not spend a shot, ability, throw or
// kill attempt on a target they can see is currently protected.  Keeping this
// predicate next to the two authoritative barrier definitions gives every
// target selector the same expiry/re-evaluation semantics.
function botTargetHasActiveBarrier(room, target, timestamp = now()) {
  // A finite-durability shield must be attacked to break; waiting for expiry
  // would stall Bot combat forever. Storm's independent invulnerability stays.
  return Boolean(activeGravityStormBarrier(room, target, timestamp));
}

function sharesCombatFaction(source, target) {
  return Boolean(
    source &&
    target &&
    source.id !== target.id &&
    ["defender", "attacker"].includes(source.role) &&
    source.role === target.role
  );
}

// A Bot never owns the human-facing friendly-fire penalty transaction.  Its
// candidate, delayed action and final settlement layers must all treat a
// current same-faction recipient as a no-commit result.  Human inputs retain
// the ordinary penalty contract.
function botFriendlyTransactionBlocked(source, target) {
  return Boolean(source?.isBot && sharesCombatFaction(source, target));
}

function botCanAttackTarget(room, bot, target, timestamp = now()) {
  return Boolean(
    bot?.isBot &&
    target?.alive &&
    !target.ejected &&
    !target.inVent &&
    !floraInvisibleActive(target, timestamp) &&
    target.id !== bot.id &&
    !sharesCombatFaction(bot, target) &&
    !botTargetHasActiveBarrier(room, target, timestamp)
  );
}

function absorbPreparationBarrier(room, target, timestamp = now(), source = null) {
  const gravityBarrier = activeGravityStormBarrier(room, target, timestamp);
  if (gravityBarrier) {
    pushMagicEffect(room, "gravity-storm-barrier-hit", target, {
      radius: Number(gravityBarrier.barrierRadius) || GRAVITY_STORM_BARRIER_RADIUS,
      targetId: source?.id || "",
      durationMs: 620,
      variant: "caster-barrier"
    });
    setImmediateFeedback(target, "グラビティストーム・バリア", "攻撃を無効化");
    return true;
  }
  return false;
}

function applyEmpDisruption(room, target, timestamp = now(), empCausalId = "") {
  if (!target?.alive || target.ejected) return 0;
  // EMP is an equipment anomaly, never a status abnormality or debuff. No
  // status-recovery route may reject, shorten, clear, or repair this timer.
  target.itemDisabledUntil = Math.max(Number(target.itemDisabledUntil) || 0, timestamp + EMP_ITEM_LOCK_MS);
  if (target.gunFiring) stopGunnerFire(room, target, { reason: "EMP機器異常", autoSwitch: false });
  target.particleCannonUntil = 0;
  target.particleCannonNextAt = 0;
  target.particleCannonPerformanceMultiplier = 1;
  pushMagicEffect(room, "emp-storage-lock", target, {
    radius: 105,
    playerId: target.id,
    durationMs: EMP_ITEM_LOCK_MS,
    variant: "storage",
    ...(typeof empCausalId === "string" && empCausalId ? { empCausalId } : {})
  });
  setImmediateFeedback(target, "EMP機器異常", `${Math.ceil(EMP_ITEM_LOCK_MS / 1000)}秒間、全アイテム使用・効果停止`);
  return 1;
}

function applyReflectedEmpAttack(room, defender, source, mode, timestamp = now(), empCausalId = "") {
  if (!source?.alive || source.ejected || source.id === defender?.id) return false;
  applyEmpDisruption(room, source, timestamp, empCausalId);
  if (mode === "disruption") return true;
  if (mode === "lethal") {
    destroyPlayerUnconditionally(room, defender, source, "反射されたEMP", {
      noKillCutin: false,
      attackType: "kill",
      attackKind: "reflected-emp-lethal",
      attackLabel: "反射されたEMP",
      ignorePreparationBarrier: true,
      ignoreFriendlyFire: true,
      bypassSlashGuard: true
    });
    return true;
  }
  try {
    killPlayer(room, defender, source.id, {
      ranged: true,
      magic: true,
      hitZone: "body",
      damage: 1,
      allowAnyKiller: true,
      ignoreRange: true,
      ignoreCooldown: true,
      preserveCooldown: true,
      ignorePush: true,
      ignoreFriendlyFire: true,
      bypassSlashGuard: true,
      origin: { x: defender.x, y: defender.y },
      targetRole: source.role,
      attackKind: "reflected-emp",
      attackLabel: "反射されたEMP",
      slashGuardPhysical: false
    });
    return true;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return false;
  }
}

function eliminatePlayerWithEmp(room, source, target, timestamp, reason = "EMP共振", empCausalId = "") {
  if (!target?.alive || target.ejected || botFriendlyTransactionBlocked(source, target)) return false;
  if (source?.id !== target.id && sharesCombatFaction(source, target)) { applyEmpDisruption(room, source, timestamp, empCausalId); return false; }
  if (hackerEmpOpeningProtected(room, target, timestamp)) return false;
  const outcome = {attackType: "kill", attackKind: String(reason).includes("反射") ? "reflected-emp-lethal" : "emp-resonance-lethal", attackLabel: reason, slashGuardPhysical: false, slashGuardReflectable: false};
  const killed = destroyPlayerUnconditionally(room, source, target, reason, outcome);
  if (outcome.defenseOutcome?.defense !== "barrier" && target.alive) applyEmpDisruption(room, target, timestamp, empCausalId);
  return outcome.killConvertedToBodyDamage ? "converted" : killed;
}

function applyEmpBodyDamage(room, source, target, timestamp, empCausalId = "") {
  if (!target?.alive || target.ejected) return "none";
  if (botFriendlyTransactionBlocked(source, target)) return "none";
  if (source?.role === target.role && ["defender", "attacker"].includes(source.role) && source.id !== target.id) {
    applyEmpDisruption(room, source, timestamp, empCausalId);
    pushEvent(room, `${source.name} の味方EMPが反射され、発動者のアイテムストレージを遮断しました。${target.name} は無傷です。`);
    return "friendlyFireReflected";
  }
  const slashGuardOutcome = resolveFighterSlashGuard(room, source, target, {
    kind: "emp",
    label: "EMP共振",
    physical: false,
    reflectable: false,
    damage: 1,
    hitZone: "body",
    reflectEffect: ({ defender, source: reflectedTarget }) => applyReflectedEmpAttack(room, defender, reflectedTarget, "body", timestamp, empCausalId)
  }, timestamp);
  if (slashGuardOutcome) return slashGuardOutcome;
  if (absorbPreparationBarrier(room, target, timestamp, source)) return "preparationBarrier";
  if (hackerEmpOpeningProtected(room, target, timestamp)) return "openingProtection";
  const result = settleDurableBodyDamage(room, source, target, 1, "EMP共振", {timestamp, attackKind: "emp-resonance-body"});
  if (result.defense !== "barrier" && target.alive) applyEmpDisruption(room, target, timestamp, empCausalId);
  return result.killed ? "lethal" : result.absorbed ? result.defense : "body";
}

function resolveStandardEmp(room, pulse, timestamp) {
  const player = room.players.get(pulse.playerId);
  if (!player) return;
  const empCausalId = `pulse:${pulse.id}`;
  let itemLocks = 0;
  let friendlyReflections = 0;
  for (const target of room.players.values()) {
    if (target.id !== player.id && target.alive && !target.ejected && distance(pulse, target) <= EMP_RANGE) {
      if (player.role === target.role && ["defender", "attacker"].includes(player.role)) {
        if (durableBarrierActive(target) || absorbPreparationBarrier(room, target, timestamp, player)) continue;
        itemLocks += applyEmpDisruption(room, player, timestamp, empCausalId);
        friendlyReflections += 1;
      } else {
        const slashGuardOutcome = resolveFighterSlashGuard(room, player, target, {
          kind: "emp",
          label: `${pulse.phase === "positive" ? "正相" : "逆相"}EMP`,
          physical: false,
          reflectable: false,
          reflectEffect: ({ defender, source: reflectedTarget }) => applyReflectedEmpAttack(room, defender, reflectedTarget, "disruption", timestamp, empCausalId)
        }, timestamp);
        if (slashGuardOutcome) continue;
        if (durableBarrierActive(target) || absorbPreparationBarrier(room, target, timestamp, player)) continue;
        if (hackerEmpOpeningProtected(room, target, timestamp)) continue;
        itemLocks += applyEmpDisruption(room, target, timestamp, empCausalId);
      }
    }
  }
  pushSound(room, "emp", pulse, {
    ownerId: player.id,
    sourceKind: "player",
    maxDistance: 2200,
    volume: 1,
    empCausalId
  });
  pushMagicEffect(room, "emp", pulse, { radius: EMP_RANGE, playerId: player.id, variant: pulse.phase, resolvedEmpPulseIds: [pulse.id], empCausalId });
  pushEvent(room, `${pulse.phase === "positive" ? "正相" : "逆相"}EMP発生: ストレージ遮断${itemLocks}人 / 味方反射${friendlyReflections}件`);
  checkWin(room);
  touch(room);
}

function resolveEmpInteraction(room, first, second, timestamp) {
  const firstOwner = room.players.get(first.playerId);
  const secondOwner = room.players.get(second.playerId);
  const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
  const samePhase = first.phase === second.phase;
  const pulseIds = [String(first.id), String(second.id)].sort();
  const empCausalId = `interaction:${samePhase ? "resonance" : "cancel"}:${pulseIds[0]}:${pulseIds[1]}`;
  const visualSettlement = {resolvedEmpPulseIds: [first.id, second.id], empSourceAxis: Math.atan2(second.y - first.y, second.x - first.x)};
  const soloEmpPractice = room.soloMission?.id === "emp" && [first.playerId, second.playerId].includes(room.soloMission.playerId);
  if (soloEmpPractice) {
    const outcome = samePhase ? "amplify" : "cancel";
    const outcomes = new Set(Array.isArray(room.soloMission.empTrainingOutcomes) ? room.soloMission.empTrainingOutcomes : []);
    outcomes.add(outcome);
    room.soloMission.empTrainingOutcomes = [...outcomes];
    room.soloMission.empAmplified = outcomes.has("amplify");
    room.soloMission.empCancelled = outcomes.has("cancel");
  }
  if (!samePhase) {
    pushMagicEffect(room, "emp-cancel", midpoint, { ...visualSettlement, radius: EMP_INTERACTION_RANGE, variant: "opposite", empCausalId });
    pushSound(room, "emp", midpoint, { ownerId: second.playerId, sourceKind: "emp", maxDistance: 1800, volume: 0.8, empCausalId });
    pushEvent(room, soloEmpPractice
      ? "EMP訓練: 逆位相の重ね合わせで打ち消しに成功しました。"
      : "正相EMPと逆相EMPが干渉し、互いに相殺されました。");
    checkWin(room);
    touch(room);
    return;
  }

  if (soloEmpPractice) {
    pushMagicEffect(room, "emp-resonance", midpoint, { ...visualSettlement, radius: EMP_INTERACTION_RANGE, variant: first.phase, empCausalId });
    pushSound(room, "emp", midpoint, { ownerId: second.playerId, sourceKind: "emp", maxDistance: 2600, volume: 1, empCausalId });
    pushEvent(room, "EMP訓練: 同位相の重ね合わせで増強に成功しました。");
    checkWin(room);
    touch(room);
    return;
  }

  const pairDistance = distance(first, second);
  let lethalCount = 0;
  let bodyCount = 0;
  for (const target of room.players.values()) {
    if (!target.alive || target.ejected) continue;
    const isFirst = target.id === first.playerId;
    const isSecond = target.id === second.playerId;
    const source = isFirst ? secondOwner : isSecond ? firstOwner : distance(target, first) <= distance(target, second) ? firstOwner : secondOwner;
    if (isFirst || isSecond) {
      if (pairDistance <= EMP_RESONANCE_LETHAL_RANGE) {
        const outcome = eliminatePlayerWithEmp(room, source, target, timestamp, "同位相EMP共振", empCausalId);
        if (outcome === true) lethalCount += 1;
        else if (outcome === "converted") bodyCount += 1;
      } else {
        const outcome = applyEmpBodyDamage(room, source, target, timestamp, empCausalId);
        if (outcome === "lethal") lethalCount += 1;
        else if (["body", "overheal"].includes(outcome)) bodyCount += 1;
      }
      continue;
    }
    if (pairDistance <= EMP_RESONANCE_LETHAL_RANGE && distance(target, midpoint) <= EMP_RESONANCE_LETHAL_RANGE) {
      const outcome = eliminatePlayerWithEmp(room, source, target, timestamp, "同位相EMP共振の巻き添え", empCausalId);
      if (outcome === true) lethalCount += 1;
      else if (outcome === "converted") bodyCount += 1;
    } else if (Math.min(distance(target, first), distance(target, second)) <= EMP_RESONANCE_BODY_RANGE) {
      const outcome = applyEmpBodyDamage(room, source, target, timestamp, empCausalId);
      if (outcome === "lethal") lethalCount += 1;
      else if (["body", "overheal"].includes(outcome)) bodyCount += 1;
    }
  }
  pushMagicEffect(room, "emp-resonance", midpoint, { ...visualSettlement, radius: EMP_INTERACTION_RANGE, variant: first.phase, empCausalId });
  pushSound(room, "emp", midpoint, { ownerId: second.playerId, sourceKind: "emp", maxDistance: 2600, volume: 1, empCausalId });
  pushEvent(room, `同位相EMPが共振しました。キル${lethalCount}人 / ボディダメージ${bodyCount}人。`);
  checkWin(room);
  touch(room);
}

function resolvePendingEmps(room, timestamp = now()) {
  room.activeEmps ||= [];
  const due = room.activeEmps.filter((pulse) => pulse.resolvesAt <= timestamp);
  if (!due.length) return;
  const dueIds = new Set(due.map((pulse) => pulse.id));
  room.activeEmps = room.activeEmps.filter((pulse) => !dueIds.has(pulse.id));
  for (const pulse of due) resolveStandardEmp(room, pulse, timestamp);
}

function activateEmp(room, player, rawPhase = "positive") {
  if (room.phase !== "playing") throw new ApiError(400, "バトル中のみEMPを使用できます。");
  if (!player.alive || player.ejected || player.inVent) throw new ApiError(403, "現在はEMPを使用できません。");
  ensureAbilityAvailable(player);
  const timestamp = now();
  if ((Number(player.empReadyAt) || 0) > timestamp) {
    throw new ApiError(400, `EMP再充填中です（残り${Math.ceil((player.empReadyAt - timestamp) / 1000)}秒）。`);
  }
  const phase = rawPhase === "negative" ? "negative" : "positive";
  recordBotVisibleHumanAttackStart(room, player, "emp", timestamp);
  player.empReadyAt = timestamp + (room.soloMission?.id === "emp" ? 3000 : EMP_COOLDOWN_MS);
  room.activeEmps ||= [];
  room.activeEmps = room.activeEmps.filter((pulse) => pulse.resolvesAt > timestamp);
  const pulse = {
    id: uid("emp_"),
    playerId: player.id,
    x: player.x,
    y: player.y,
    phase,
    at: timestamp,
    resolvesAt: timestamp + EMP_INTERACTION_WINDOW_MS
  };
  const interaction = room.activeEmps.find((other) => other.playerId !== player.id && distance(other, pulse) <= EMP_INTERACTION_RANGE);
  if (interaction) {
    room.activeEmps = room.activeEmps.filter((other) => other.id !== interaction.id);
    resolveEmpInteraction(room, interaction, pulse, timestamp);
  } else {
    room.activeEmps.push(pulse);
    pushMagicEffect(room, "emp-charge", pulse, {
      radius: EMP_RANGE,
      playerId: player.id,
      variant: phase,
      empPulseId: pulse.id,
      empCausalId: `pulse:${pulse.id}`,
      durationMs: EMP_PULSE_ATE_DURATION_MS
    });
    pushEvent(room, `${player.name} が${phase === "positive" ? "正相" : "逆相"}EMPを起動しました。`);
    touch(room);
  }
}

function nearbyMapObjects(room, player, objectId = "") {
  const objects = [
    ...(getMap(room).objects || []),
    ...(room.alchemyObjects || []),
    ...(room.mysteryBoxes || [])
  ].filter((object) => object.interactive);
  const candidates = objectId ? objects.filter((object) => object.id === objectId) : objects;
  return candidates
    .map((object) => ({ object, distance: distance(player, object) }))
    .filter((entry) => entry.distance <= Number(entry.object.useRange || MAP_OBJECT_RANGE))
    .sort((a, b) => a.distance - b.distance);
}

function nearbyMapObject(room, player, objectId = "") {
  return nearbyMapObjects(room, player, objectId)[0] || null;
}

function pruneObjectContactUses(player, nearbyEntries) {
  const nearbyIds = new Set((nearbyEntries || []).map(({ object }) => object.id));
  player.objectContactUsedIds = (Array.isArray(player.objectContactUsedIds) ? player.objectContactUsedIds : [])
    .filter((id) => nearbyIds.has(id));
  return new Set(player.objectContactUsedIds);
}

function markObjectContactUsed(player, objectId) {
  const used = new Set(Array.isArray(player.objectContactUsedIds) ? player.objectContactUsedIds : []);
  used.add(objectId);
  player.objectContactUsedIds = [...used];
}

function reducePlayerCooldowns(player, reductionMs, timestamp = now()) {
  const reduction = Math.max(0, Number(reductionMs) || 0);
  if (!reduction) return 0;
  let changed = 0;
  for (const [key, rawValue] of Object.entries(player)) {
    if (!key.endsWith("ReadyAt")) continue;
    const readyAt = Number(rawValue) || 0;
    if (readyAt <= timestamp) continue;
    player[key] = Math.max(timestamp, readyAt - reduction);
    changed += 1;
  }
  player.objectCooldowns ||= {};
  for (const [key, rawValue] of Object.entries(player.objectCooldowns)) {
    const readyAt = Number(rawValue) || 0;
    if (readyAt <= timestamp) continue;
    player.objectCooldowns[key] = Math.max(timestamp, readyAt - reduction);
    changed += 1;
  }
  return changed;
}

function extendPlayerCooldowns(player, extensionMs, timestamp = now()) {
  const extension = Math.max(0, Number(extensionMs) || 0);
  if (!extension) return 0;
  let changed = 0;
  for (const [key, rawValue] of Object.entries(player)) {
    if (!key.endsWith("ReadyAt")) continue;
    const readyAt = Number(rawValue) || 0;
    if (readyAt <= timestamp) continue;
    player[key] = readyAt + extension;
    changed += 1;
  }
  player.objectCooldowns ||= {};
  for (const [key, rawValue] of Object.entries(player.objectCooldowns)) {
    const readyAt = Number(rawValue) || 0;
    if (readyAt <= timestamp) continue;
    player.objectCooldowns[key] = readyAt + extension;
    changed += 1;
  }
  return changed;
}

function recoverMapObjectStatuses(room, player, source) {
  return clearAdverseStatuses(room, player, source);
}

function healBodyHits(player, amount = 1) {
  return recoverHealth(player, Math.max(1, Number(amount) || 1)).recovered > 0;
}

function useMapObject(room, player, objectId) {
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在はマップオブジェクトを利用できません。");
  }
  ensureConscious(player);
  const nearbyEntries = nearbyMapObjects(room, player);
  const nearby = nearbyEntries.find(({ object }) => object.id === objectId) || null;
  if (!nearby) throw new ApiError(400, "利用可能なオブジェクトに近づいてください。");
  const object = nearby.object;
  const timestamp = now();
  player.objectCooldowns ||= {};
  const usedDuringContact = pruneObjectContactUses(player, nearbyEntries);
  if (usedDuringContact.has(object.id)) {
    throw new ApiError(400, `${object.label}は同じ接触中に再発動しません。一度離れてから利用してください。`);
  }
  const readyAt = Number(player.objectCooldowns[object.id] || 0);
  if (readyAt > timestamp) {
    throw new ApiError(400, `${object.label}は再起動中です（残り${Math.ceil((readyAt - timestamp) / 1000)}秒）。`);
  }

  if (object.type === "mysteryBox") {
    const boxIndex = (room.mysteryBoxes || []).findIndex((entry) => entry.id === object.id);
    if (boxIndex < 0) return;
    const reward = awardMysteryBoxReward(room, player, timestamp);
    room.mysteryBoxes.splice(boxIndex, 1);
    markObjectContactUsed(player, object.id);
    pushMagicEffect(room, "mystery-box", object, { radius: Number(object.radius || 100), playerId: player.id, variant: reward.id, acquisitionId: reward.id, acquisitionKind: reward.kind, viewerId: player.id, durationMs: 2600 });
    pushEvent(room, `${player.name} がミステリーボックスから${reward.label}を獲得しました。`);
    touch(room);
    return;
  }

  let recoveredHealth = null;
  if (object.effectKind === "stamina") {
    replenishStamina(player, timestamp, true, 1, room);
    grantStamina(room, player, Math.max(1, Number(object.effectAmount) || 0), object.label, timestamp);
  } else if (object.effectKind === "credits") {
    player.credits = Math.max(0, Number(player.credits) || 0) + Math.max(1, Number(object.effectAmount) || 1);
  } else if (object.effectKind === "cooldownReduction") {
    reducePlayerCooldowns(player, Math.max(1000, Number(object.effectAmount) || 1000), timestamp);
  } else if (object.effectKind === "statusRecovery") {
    if (!recoverMapObjectStatuses(room, player, object.label)) throw new ApiError(400, "解除できる状態異常はありません。");
  } else if (object.effectKind === "acceleration") {
    addTimedAcceleration(
      player,
      `object:${object.id}`,
      Math.max(1.01, Number(object.effectAmount) || 1.2),
      Math.max(1000, Number(object.effectDurationMs) || 8000),
      timestamp
    );
  } else if (object.effectKind === "luckBoost") {
    player.objectLuckBonus = Math.max(Number(player.objectLuckBonus) || 0, Math.max(0.01, Number(object.effectAmount) || 0.1));
    player.objectLuckUntil = Math.max(Number(player.objectLuckUntil) || 0, timestamp + Math.max(1000, Number(object.effectDurationMs) || 20000));
    player.luck = luckValueFor(player);
  } else if (object.effectKind === "overheal") {
    recoveredHealth = recoverHealth(player, Math.max(1, Number(object.effectAmount) || 1)).recovered;
  } else if (object.effectKind === "footBath") {
    healBodyHits(player, 1);
    recoverMapObjectStatuses(room, player, object.label);
    reducePlayerCooldowns(player, 6000, timestamp);
    setImmediateFeedback(player, object.label, "HP +1・状態異常解除・再使用待機 -6秒");
  } else if (object.effectKind === "relaxation") {
    addTimedAcceleration(
      player,
      `object:${object.id}`,
      Math.max(1.01, Number(object.effectAmount) || 1.35),
      Math.max(1000, Number(object.effectDurationMs) || 12000),
      timestamp
    );
    setImmediateFeedback(player, object.label, `加速 ${Math.max(1.01, Number(object.effectAmount) || 1.35)}・${Math.round(Math.max(1000, Number(object.effectDurationMs) || 12000) / 1000)}秒`);
  } else if (object.effectKind === "herbalRecovery") {
    healBodyHits(player, 1);
    setImmediateFeedback(player, object.label, "HP +1");
  } else if (object.effectKind === "healthyMeal") {
    healBodyHits(player, 1);
    replenishStamina(player, timestamp, true, 1, room);
    grantStamina(room, player, 120, object.label, timestamp);
    setMana(room, player, (Number(player.mana) || 0) + 1, object.label);
    setImmediateFeedback(player, object.label, "HP +1・スタミナ +120・マナ +1");
  } else if (object.effectKind === "mineralWater") {
    replenishStamina(player, timestamp, true, 1, room);
    grantStamina(room, player, Math.max(1, Number(object.effectAmount) || 100), object.label, timestamp);
  } else if (object.effectKind === "fullRecovery") {
    recoveredHealth = recoverHealth(player, Math.max(1, Math.max(0, Number(player.bodyHits) || 0) + 1)).recovered;
  } else if (object.effectKind === "decoy") {
    replenishStamina(player, timestamp, true, 1, room);
    grantStamina(room, player, Math.max(1, Number(object.effectAmount) || MAX_STAMINA), object.label, timestamp);
    pushSound(room, "dash", object, {
      ownerId: player.id,
      sourceKind: "player",
      maxDistance: 1800,
      volume: 1.05
    });
  } else if (object.effectKind === "heal") {
    healBodyHits(player, object.effectAmount);
  } else if (object.effectKind === "mana") {
    setMana(room, player, (Number(player.mana) || 0) + Math.max(1, Number(object.effectAmount) || 1), object.label);
  } else {
    throw new ApiError(400, "このオブジェクトは接触時に自動で作動します。");
  }

  maintainNaturalRecovery(room, player, timestamp);

  markObjectContactUsed(player, object.id);
  player.objectCooldowns[object.id] = timestamp + Number(object.cooldownMs || 15000);
  const objectCausalId = `map-object:${object.id}:${uid("object_use_")}`;
  pushMagicEffect(room, `object-${object.type}`, object, {
    radius: Number(object.radius || 100),
    playerId: player.id,
    objectId: object.id,
    effectKind: object.effectKind,
    objectCausalId
  });
  pushMapObjectGainAtes(room, player, object.effectKind, recoveredHealth);
  const medicalUseSound = {
    "v302-medical-diagnosticBed-1": "medicalBedUse",
    "v302-medical-medicalCabinet-2": "medicalCabinetUse",
    "v302-medical-sterilizer-3": "medicalFootBathUse",
    "v317-corridor-a01-1": "a01SconceUse",
    "v302-power-cableSpool-2": "cableSpoolUse",
    "v302-archive-archiveCabinet-2": "archiveCabinetUse"
  }[object.id];
  pushSound(room, medicalUseSound || "object", object, {
    ownerId: player.id,
    sourceKind: "facility",
    maxDistance: 720,
    volume: 0.7,
    objectId: object.id,
    objectCausalId
  });
  pushEvent(room, `${player.name} が ${object.label} を使用: ${object.effectLabel}`);
  touch(room);
}

function autoUseNearbyMapObject(room, player, timestamp = now()) {
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent || actionBlockedUntil(player) > timestamp) return false;
  const nearbyEntries = nearbyMapObjects(room, player);
  const usedDuringContact = pruneObjectContactUses(player, nearbyEntries);
  for (const { object } of nearbyEntries) {
    if (usedDuringContact.has(object.id)) continue;
    const readyAt = Number(player.objectCooldowns?.[object.id] || 0);
    if (readyAt > timestamp) continue;
    const useful = object.type === "mysteryBox" || object.effectKind === "mana" || object.effectKind === "decoy" ||
      object.effectKind === "credits" || object.effectKind === "acceleration" || object.effectKind === "luckBoost" ||
      object.effectKind === "overheal" || object.effectKind === "relaxation" || object.effectKind === "healthyMeal" ||
      object.effectKind === "footBath" ||
      object.effectKind === "herbalRecovery" ||
      object.effectKind === "mineralWater" ||
      object.effectKind === "stamina" ||
      object.effectKind === "heal" ||
      object.effectKind === "fullRecovery";
    if (!useful) continue;
    try {
      useMapObject(room, player, object.id);
      return true;
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    }
  }
  return false;
}

function applyMysteryDrink(room, player, timestamp = now()) {
  const verificationRolls = Array.isArray(player.mysteryVerificationRolls)
    ? player.mysteryVerificationRolls
    : [];
  const roll = verificationRolls.length
    ? clampNumber(verificationRolls.shift(), 0, 1, 0.99)
    : luckAdjustedRoll(player);
  let result;
  if (roll < 0.18) {
    grantCredits(room, player, CREDIT_ECONOMY.mysteryJackpot, "mystery");
    result = `ジャックポット +${CREDIT_ECONOMY.mysteryJackpot}C`;
  } else if (roll < 0.36) {
    grantStamina(room, player, 250, "ミステリー", timestamp);
    pushGainAte(room, player, "stamina", { variant: "mystery:energy-surge" });
    result = "エナジーサージ スタミナ+250";
  } else if (roll < 0.52) {
    const healthBefore = healthCapacityFor(player);
    const recovery = recoverHealth(player, Math.max(1, Math.max(0, Number(player.bodyHits) || 0) + 1));
    if (recovery.recovered > 0) pushGainAte(room, player, "heal", { variant: "mystery:full-activation" });
    if (recovery.maxHealth > healthBefore) pushGainAte(room, player, "overheal", { variant: "mystery:full-activation" });
    if (clearAdverseStatuses(room, player, "完全活性", timestamp)) {
      pushGainAte(room, player, "statusRecovery", { variant: "mystery:full-activation" });
    }
    addTimedAcceleration(player, "flora", FLORA_SPEED_MULTIPLIER, FLORA_SPEED_DURATION_MS, timestamp);
    pushGainAte(room, player, "acceleration", { variant: "mystery:full-activation" });
    result = "完全活性 HP回復（個人上限まで）・速度上昇";
  } else if (roll < 0.64) {
    const manaBefore = Number(player.mana) || 0;
    const manaAfter = setMana(room, player, Math.max(manaCapacityFor(player), manaBefore), "マナ奔流");
    if (manaAfter > manaBefore) pushGainAte(room, player, "mana", { variant: "mystery:mana-surge" });
    result = "マナ奔流 理知へ移行";
  } else if (roll < 0.78) {
    if (rejectAdverseStatusDuringNaturalRecovery(room, player, "倦怠", timestamp)) result = "倦怠を理知の自然回復で無効化";
    else {
      player.slowedUntil = Math.max(player.slowedUntil || 0, timestamp + 12_000);
      result = "倦怠 移動速度低下12秒";
    }
  } else if (roll < 0.9) {
    if (rejectAdverseStatusDuringNaturalRecovery(room, player, "能力封印", timestamp)) result = "能力封印を理知の自然回復で無効化";
    else {
      player.abilityDisabledUntil = Math.max(player.abilityDisabledUntil || 0, timestamp + MYSTERY_ABILITY_LOCK_MS);
      result = "能力封印15秒";
    }
  } else {
    if (rejectAdverseStatusDuringNaturalRecovery(room, player, "意識消失", timestamp)) result = "意識消失を理知の自然回復で無効化";
    else {
      player.unconsciousUntil = timestamp + MYSTERY_UNCONSCIOUS_MS;
      player.vx = 0;
      player.vy = 0;
      player.movementMode = "unconscious";
      clearAttackState(player);
      result = "意識消失8秒";
    }
  }
  player.lastMysteryResult = result;
  player.lastMysteryResultAt = timestamp;
  return result;
}

function restoreTransactionalPlayerSnapshot(player, snapshot) {
  for (const key of Object.keys(player)) delete player[key];
  Object.assign(player, snapshot);
}

function vendingPurchaseCapacity(player, itemId) {
  switch (itemId) {
    case "warp":
      return Math.max(0, 3 - Math.max(0, Number(player.warpCharges) || 0));
    case "fire":
      return Math.max(0, 2 - Math.max(0, Number(player.fireJutsuCharges) || 0));
    case "evade":
      return Math.max(0, Math.ceil((1500 - Math.max(0, Number(player.dodgeDurationBonusMs) || 0)) / 250));
    case "substitution":
      return Math.max(0, 2 - Math.max(0, Number(player.substitutionCharges) || 0));
    case "grit":
      return Math.max(0, 3 - Math.max(0, Number(player.gritCharges) || 0));
    case "reason":
      return Math.max(0, 3 - Math.max(0, Number(player.reasonCharges) || 0));
    case "iai":
      return Math.max(0, 3 - Math.max(0, Number(player.iaiCharges) || 0));
    case "hack":
      return player.hackActive ? 0 : 1;
    case "exile":
      return player.exiled ? 0 : 1;
    default: {
      const weapon = GUNNER_WEAPONS[itemId];
      if (!weapon) return Number.POSITIVE_INFINITY;
      const owned = gunnerWeaponAvailable(player, itemId);
      const ammunition = Math.max(0, Math.floor(Number(player.gunnerAmmo?.[itemId]) || 0));
      return !owned || ammunition < weapon.maxAmmo ? 1 : 0;
    }
  }
}

function vendingPurchaseCapacitiesFor(player) {
  const capacities = {};
  for (const product of DVA_ECONOMY.vendingProducts) {
    const capacity = vendingPurchaseCapacity(player, product.id);
    // Unbounded physical products deliberately stay absent. JSON cannot
    // represent Infinity, and omission prevents the client from inventing a
    // finite limit where the authoritative purchase owner has none.
    if (Number.isFinite(capacity)) capacities[product.id] = Math.max(0, Math.floor(capacity));
  }
  return capacities;
}

function purchaseShopAbility(room, player, abilityId, transactionId = "") {
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在はショップを利用できません。");
  }
  ensureConscious(player);
  ensureItemStorageAvailable(player);
  const product = shopAbilityProduct(abilityId);
  if (!product) throw new ApiError(404, "その能力はショップでは販売していません。");
  const id = String(transactionId || "").trim().slice(0, 96);
  const timestamp = now();
  const recent = Array.isArray(player.shopAbilityPurchaseTransactions) ? player.shopAbilityPurchaseTransactions : [];
  const previous = id ? recent.find((entry) => entry.id === id) : null;
  if (previous) {
    return {
      duplicate: true,
      transactionId: id,
      abilityId: previous.abilityId,
      spent: previous.spent,
      remainingCredits: player.credits
    };
  }
  if (ownsShopAbility(player, product.id)) throw new ApiError(409, `${product.label}は購入済みです。`);
  const credits = Math.max(0, Math.floor(Number(player.credits) || 0));
  if (credits < product.price) throw new ApiError(400, `通貨が不足しています（必要 ${product.price}C）。`);
  player.shopAbilityEntitlements = [...new Set([...(player.shopAbilityEntitlements || []), product.id])];
  player.credits = credits - product.price;
  player.shopAbilityPurchaseTransactions = [
    ...recent.filter((entry) => timestamp - Number(entry.at || 0) < 120_000),
    ...(id ? [{ id, abilityId: product.id, spent: product.price, at: timestamp }] : [])
  ].slice(-48);
  player.lastShopPurchaseAbilityId = product.id;
  player.lastShopPurchaseSpent = product.price;
  player.lastShopPurchaseAt = timestamp;
  pushMagicEffect(room, "action-vending", player, {
    radius: 96,
    playerId: player.id,
    variant: `shop-ability:${product.operator}:${product.mode}`
  });
  pushEvent(room, `${player.name} がショップで${product.label}を購入し、この対戦中の能力として解放しました。`);
  touch(room);
  return {
    duplicate: false,
    transactionId: id || null,
    abilityId: product.id,
    spent: product.price,
    remainingCredits: player.credits
  };
}

function nearestShopAbilityTarget(room, player) {
  return [...room.players.values()]
    .filter((target) => target.id !== player.id && target.alive && !target.ejected && !target.exiled)
    .sort((left, right) => (
      Number(right.role !== player.role) - Number(left.role !== player.role) ||
      distance(player, left) - distance(player, right) ||
      String(left.id).localeCompare(String(right.id))
    ))[0] || null;
}

function useShopAbility(room, player, abilityId, options = {}) {
  const product = shopAbilityProduct(abilityId);
  if (!product || !ownsShopAbility(player, product.id)) throw new ApiError(403, "その能力をショップで購入していません。");
  if (!["active", "active-target-map"].includes(product.behavior)) {
    throw new ApiError(400, `${product.label}は購入後に自動適用される能力です。`);
  }
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在は購入能力を使用できません。");
  }
  const fallbackTarget = nearestShopAbilityTarget(room, player);
  const targetId = String(options.targetId || fallbackTarget?.id || player.id);
  player.shopAbilityExecutionOperator = product.operator;
  try {
    if (product.operator === "fighter") return toggleLimitBreak(room, player);
    if (product.operator === "gravity") {
      if (["target", "heart"].includes(product.mode)) {
        return teleportPlayer(room, player, options.x, options.y, targetId, product.mode);
      }
      if (["accelerate", "decelerate"].includes(product.mode)) return toggleGravityTime(room, player, product.mode, targetId);
      if (product.mode === "storm") return useGravityStorm(room, player, targetId);
      if (product.mode === "time-keeper") return useTimeKeeper(room, player);
    }
    if (product.operator === "flora") {
      return useFloraAbility(room, player, product.mode, {
        targetId,
        dx: Number(options.dx) || Number(player.aimX) || 0,
        dy: Number(options.dy) || Number(player.aimY) || 1
      });
    }
    if (product.operator === "quantum") return useQuantumControl(room, player, product.mode);
    if (product.operator === "assassin" && product.mode === "substitution") {
      return activateAssassinSubstitution(room, player, targetId);
    }
    if (product.operator === "hacker" && product.mode === "root") return toggleHackerRoot(room, player);
    throw new ApiError(400, "購入能力の実行ownerが不正です。");
  } finally {
    delete player.shopAbilityExecutionOperator;
  }
}

function mysteryBoxEligibleRewards(player) {
  const excluded = new Set(["grit", "reason", "hsg"]);
  return [
    ...DVA_ECONOMY.vendingProducts.filter((product) => !excluded.has(product.id) && vendingPurchaseCapacity(player, product.id) >= 1).map((product) => ({ kind: "product", ...product })),
    ...DVA_ECONOMY.abilityProducts.filter((product) => !ownsShopAbility(player, product.id)).map((product) => ({ kind: "ability", ...product }))
  ];
}

function awardMysteryBoxReward(room, player, timestamp = now()) {
  const rewards = mysteryBoxEligibleRewards(player);
  if (!rewards.length) throw new ApiError(500, "ミステリーボックスの報酬候補がありません。");
  const forcedRewardId = Number(player.mysteryFixtureForceRewardUntil) >= timestamp ? String(player.mysteryFixtureForceRewardId || "") : "";
  delete player.mysteryFixtureForceRewardId;
  delete player.mysteryFixtureForceRewardUntil;
  const reward = rewards.find((entry) => entry.id === forcedRewardId) || rewards[Math.floor(Math.random() * rewards.length)];
  let detail = "";
  let nestedMysteryResultAt = 0;
  if (reward.kind === "ability") {
    player.shopAbilityEntitlements = [...new Set([...(player.shopAbilityEntitlements || []), reward.id])];
  } else {
    const item = vendingItemDefinitions(room, player)[reward.id];
    if (!item) throw new ApiError(500, `ミステリーボックス報酬の実装がありません: ${reward.id}`);
    if (vendingPurchaseCapacity(player, reward.id) < 1) throw new ApiError(409, `${reward.label}は現在これ以上獲得できません。`);
    detail = String(item.apply() || (reward.id === "mystery" ? player.lastMysteryResult || "" : ""));
    nestedMysteryResultAt = reward.id === "mystery" ? Number(player.lastMysteryResultAt) || 0 : 0;
    pushInstantItemAcquisitionAte(room, player, reward.id, "mystery-box");
  }
  player.lastMysteryBoxReward = reward.id;
  player.lastMysteryBoxRewardAt = timestamp;
  player.lastMysteryReveal = { id: uid("mystery_reveal_"), source: "box", rewardId: reward.id,
    rewardKind: reward.kind, label: reward.label, asset: String(reward.asset || reward.id), detail, nestedMysteryResultAt, at: timestamp };
  return reward;
}

function vendingItemDefinitions(room, player) {
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在はショップを利用できません。");
  }
  ensureConscious(player);
  ensureItemStorageAvailable(player);
  return {
    "mineral-water": { label: "ミネラルウォーター", cost: MINERAL_WATER_COST, apply: () => { addItem(player, "mineral-water"); } },
    seawater: { label: "海水", cost: 2, apply: () => { addItem(player, "seawater"); } },
    antidote: { label: "解毒剤", cost: ANTIDOTE_COST, apply: () => { addItem(player, "antidote"); } },
    molotov: { label: "火炎瓶", cost: MOLOTOV_COST, apply: () => { addItem(player, "molotov"); } },
    // Quantum Control deliberately turns these low-price feedstocks into a
    // small credit profit (Hg +1C / Pb +1C).
    mercury: { label: "水銀瓶", cost: 60, apply: () => { addItem(player, "mercury"); } },
    lead: { label: "鉛瓶", cost: 40, apply: () => { addItem(player, "lead"); } },
    uranium: { label: "ウラン容器", cost: 140, apply: () => { addItem(player, "uranium"); } },
    plutonium: { label: "プルトニウム容器", cost: 180, apply: () => { addItem(player, "plutonium"); } },
    "orichalcum-sword": { label: "オリハルコン・ソード", cost: ORICHALCUM_SWORD_VENDING_COST, apply: () => { addItem(player, "orichalcum-sword"); } },
    iai: { label: "居合", cost: IAI_VENDING_COST, apply: () => { grantIaiCharge(room, player, true, "vending"); } },
    evade: { label: "回避拡張", cost: 45, apply: () => { player.dodgeDurationBonusMs = Math.min(1500, player.dodgeDurationBonusMs + 250); } },
    speed: { label: "アクセラレート飲料", cost: 55, apply: () => { player.speedMultiplier = Math.round((player.speedMultiplier + 0.15) * 100) / 100; } },
    warp: { label: "テレポートマップスクロール", cost: 35, apply: () => { player.warpCharges = Math.min(3, player.warpCharges + 1); } },
    mystery: { label: "ミステリー", cost: MYSTERY_COST, apply: () => applyMysteryDrink(room, player) },
    fire: { label: "ファイア", cost: FIRE_JUTSU_COST, apply: () => { player.fireJutsuCharges = Math.min(2, player.fireJutsuCharges + 1); } },
    protect: { label: "プロテクト", cost: 8, apply: () => grantProtectItem(room, player) },
    heal: { label: "回復", cost: HEAL_COST, apply: () => {
      recoverHealth(player, Math.max(1, Math.max(0, Number(player.bodyHits) || 0)));
    } },
    mana: { label: "マナポーション +1MP", cost: MANA_POTION_COST, apply: () => {
      setMana(room, player, (Number(player.mana) || 0) + 1, "マナポーション");
    } },
    stamina: { label: "スタミナ", cost: 6, apply: () => {
      grantStamina(room, player, 350, "スタミナ", now(), { floorAtZero: true });
    } },
    railgun: { label: "素敵な発明品・レールガン", cost: 150, apply: () => { player.inventions.push("railgun"); } },
    "particle-cannon": { label: "素敵な発明品・荷電粒子砲", cost: 190, apply: () => { player.inventions.push("particle-cannon"); } },
    excalibur: { label: "素敵な発明品・エクスカリバー", cost: 230, apply: () => { player.inventions.push("excalibur"); } },
    hack: { label: "ハック", cost: 125, apply: () => activateHackInstant(player) },
    handgun: { label: "ハンドガン", cost: 40, apply: () => purchaseFirearm(player, "handgun") },
    smg: { label: "サブマシンガン", cost: 65, apply: () => purchaseFirearm(player, "smg") },
    assault: { label: "アサルトライフル", cost: 85, apply: () => purchaseFirearm(player, "assault") },
    sniper: { label: "スナイパーライフル", cost: 120, apply: () => purchaseFirearm(player, "sniper") },
    taser: { label: "テーザー銃", cost: 60, apply: () => purchaseFirearm(player, "taser") },
    rpg: { label: "RPG", cost: HEAVY_WEAPON_DEFINITIONS.rpg.cost, apply: () => { (player.heavyWeapons ||= []).push("rpg"); } },
    missile: { label: "ミサイル", cost: HEAVY_WEAPON_DEFINITIONS.missile.cost, apply: () => { (player.heavyWeapons ||= []).push("missile"); } },
    exile: { label: "亡命・遠隔クローン運用", cost: EXILE_COST, apply: () => {
      if (player.exiled) throw new ApiError(400, "既に亡命済みです。");
      player.exiled = true;
    } }
  };
}

function purchaseDrink(room, player, itemId, options = {}) {
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在はショップを利用できません。");
  }
  ensureConscious(player);
  ensureItemStorageAvailable(player);
  const items = vendingItemDefinitions(room, player);
  const product = DVA_ECONOMY.product(itemId);
  const item = items[itemId];
  if (!product || !item || !product.vendingAvailable) throw new ApiError(404, "その商品はショップでは販売していません。");
  item.label = product.label;
  item.cost = product.price;
  if (item.role && player.role !== item.role) throw new ApiError(403, "この商品はアタッカー専用です。");
  const bulk = Boolean(options.bulk);
  const creditSnapshot = Math.max(0, Math.floor(Number(player.credits) || 0));
  if (creditSnapshot < item.cost) throw new ApiError(400, `通貨が不足しています（必要 ${item.cost}C）。`);
  const quantity = bulk ? Math.floor(creditSnapshot / item.cost) : 1;
  if (quantity < 1) throw new ApiError(400, `通貨が不足しています（必要 ${item.cost}C）。`);
  const capacity = vendingPurchaseCapacity(player, itemId);
  if (capacity < 1) throw new ApiError(409, `${item.label}は現在これ以上購入できません。`);
  if (bulk && capacity < quantity) {
    throw new ApiError(409, `${item.label}は一括購入で全額分を有効に付与できません。`);
  }
  const playerSnapshot = structuredClone(player);
  let outcome;
  try {
    // Settle the canonical purchase cost first. Any effect that intentionally
    // changes credits (for example a Mystery jackpot) is then an independent,
    // preserved transaction delta rather than being overwritten at return.
    player.credits = creditSnapshot - item.cost * quantity;
    for (let index = 0; index < quantity; index += 1) outcome = item.apply();
  } catch (error) {
    restoreTransactionalPlayerSnapshot(player, playerSnapshot);
    throw error;
  }
  if (!["grit", "reason", "iai"].includes(itemId)) {
    pushInstantItemAcquisitionAte(room, player, itemId, "vending");
  }
  pushMagicEffect(room, itemId === "mystery" ? "mystery-reveal" : "action-vending", player, {
    radius: itemId === "mystery" ? 145 : 90,
    playerId: player.id
  });
  pushEvent(room, `${player.name} がショップで${item.label}${bulk ? `を${quantity}個一括購入` : "を購入"}しました。${outcome ? `結果: ${outcome}` : ""}`);
  touch(room);
  return { quantity, spent: item.cost * quantity, remainingCredits: player.credits };
}

function purchaseDrinkBulk(room, player, itemId, transactionId = "") {
  const timestamp = now();
  const id = String(transactionId || "").trim().slice(0, 96);
  const recent = Array.isArray(player.vendingBulkTransactions) ? player.vendingBulkTransactions : [];
  const fallbackDuplicate = !id && String(player.lastVendingBulkItemId || "") === String(itemId || "") &&
    timestamp - (Number(player.lastVendingBulkAt) || 0) < 800;
  const previous = id ? recent.find((entry) => entry.id === id) : null;
  if (previous) {
    if (String(previous.itemId || "") !== String(itemId || "")) {
      throw new ApiError(409, "この一括購入IDは別の商品に再利用できません。");
    }
    return {
      ...(previous.result || {}),
      duplicate: true,
      transactionId: id,
      remainingCredits: Math.max(0, Math.floor(Number(player.credits) || 0))
    };
  }
  if (fallbackDuplicate) {
    throw new ApiError(409, "この一括購入は既に処理済みです。");
  }
  const result = purchaseDrink(room, player, itemId, { bulk: true });
  player.vendingBulkTransactions = [...recent.filter((entry) => timestamp - Number(entry.at || 0) < 120_000), ...(id ? [{
    id,
    itemId: String(itemId || ""),
    at: timestamp,
    result: { quantity: result.quantity, spent: result.spent }
  }] : [])].slice(-32);
  player.lastVendingBulkItemId = String(itemId || "");
  player.lastVendingBulkAt = timestamp;
  return result;
}

function purchaseFirearm(player, weaponId) {
  const weapon = GUNNER_WEAPONS[weaponId];
  if (!weapon) throw new ApiError(404, "その銃器は販売されていません。");
  player.purchasedWeapons ||= [];
  if (!player.purchasedWeapons.includes(weaponId)) player.purchasedWeapons.push(weaponId);
  player.unavailableGunnerWeapons = (player.unavailableGunnerWeapons || []).filter((id) => id !== weaponId);
  player.gunnerAmmo ||= createGunnerAmmo();
  player.gunnerAmmo[weaponId] = weapon.maxAmmo;
  player.gunnerWeapon = weaponId;
}

function activateHackInstant(player) {
  if (player.hackActive) throw new ApiError(400, "ハックは適用済みです。");
  player.hackActive = true;
}

function pushInstantItemAcquisitionAte(room, player, itemId, source = "acquired") {
  if (!room || !player) return;
  // Vibe Coding already emits its own generation ATE. Suppress only the
  // generated instant item's acquisition ATE; vending, EC and other grants
  // keep the normal item-specific acquisition feedback.
  if (String(source || "").startsWith("hacker")) return;
  const benefitKind = { stamina: "stamina", heal: "heal", mana: "mana", speed: "acceleration" }[itemId];
  if (benefitKind) {
    pushGainAte(room, player, benefitKind, { variant: `instant:${source}:${itemId}` });
    return;
  }
  const effectType = {
    stamina: "instant-stamina-acquired",
    heal: "instant-heal-acquired",
    fire: "instant-fire-acquired",
    substitution: "instant-substitution-acquired",
    warp: "teleport-map-scroll-acquired",
    evade: "instant-evade-acquired",
    speed: "instant-speed-acquired",
    mystery: "instant-mystery-acquired",
    mana: "instant-mana-acquired",
    grit: "instant-stand-firm-acquired",
    reason: "instant-push-acquired",
    iai: "instant-iai-acquired",
    hack: "instant-hack-acquired"
  }[itemId];
  if (!effectType) return;
  pushMagicEffect(room, effectType, player, {
    radius: itemId === "iai" ? 122 : itemId === "reason" ? 116 : 124,
    playerId: player.id,
    variant: source
  });
}

function grantStandFirmCharge(room, player, enforceLimit = true, source = "acquired") {
  player.barrierMaxDurability = DURABLE_COMBAT_BALANCE.barrierCapacity;
  player.barrierDurability = DURABLE_COMBAT_BALANCE.barrierCapacity;
}

function grantPushCharge(room, player, enforceLimit = true, source = "acquired") { player.bustUnlocked = true; }

function automaticProtectionDestination(player) {
  const preferred = player?.manaAutoProtectionNext === "grit" ? "grit" : "reason";
  const alternate = preferred === "reason" ? "grit" : "reason";
  const fieldFor = (mode) => mode === "grit" ? "gritCharges" : "reasonCharges";
  if (Math.max(0, Math.floor(Number(player?.[fieldFor(preferred)]) || 0)) < 3) return preferred;
  if (Math.max(0, Math.floor(Number(player?.[fieldFor(alternate)]) || 0)) < 3) return alternate;
  return "";
}

// Excess MP is never a player-callable conversion transaction.  At the one
// authoritative resource settlement where a gain crosses the pre-gain cap,
// each whole MP is spent immediately on the next available automatic defense.
// This deliberately has no item-storage, consciousness, EMP, UI or request-ID
// dependency: it is resource accounting, not an item action.
function applyAutomaticSurplusManaProtection(room, player, previousMana, requestedMana, preGainMaxMana) {
  return {mana: Math.round((Number(requestedMana) || 0) * 100) / 100, converted: 0, reason: 0, grit: 0};
}

function grantIaiCharge(room, player, enforceLimit = true, source = "acquired") {
  if (enforceLimit && Math.max(0, Number(player.iaiCharges) || 0) >= 3) {
    throw new ApiError(400, "居合は最大3回分まで所持できます。");
  }
  player.iaiCharges = Math.max(0, Math.floor(Number(player.iaiCharges) || 0)) + 1;
  pushInstantItemAcquisitionAte(room, player, "iai", source);
  return player.iaiCharges;
}

function applyPushBacklash(room, player, removedDurability, timestamp = now()) {
  const damage = Math.max(0, Number(removedDurability) || 0) * PUSH_BACKLASH_DAMAGE_PER_CHARGE;
  if (!damage || !player?.alive || player.ejected) return false;
  return Boolean(settleDurableBodyDamage(room, player, player, damage, "バスト反動", {timestamp, attackKind: "push-backlash"}).killed);
}

function resolveBustForNormalBodyAttack(room, killer, target, options = {}, timestamp = now()) {
  if (options.ignorePush || bustExcludedByLethalAttack("body", options) || !killer?.alive || Number(killer.bustUntil) <= timestamp || !durableBarrierActive(target)) return "";
  const removedDurability = Number(target.barrierDurability);
  target.barrierDurability = 0;
  pushMagicEffect(room, "action-push", target, {playerId: killer.id, targetId: target.id, radius: 125, variant: "timed-bust-break", durationMs: 480});
  return applyPushBacklash(room, killer, removedDurability, timestamp) ? "pushBacklash" : "bust";
}

function botPushBacklashWouldBeLethal(bot, target) {
  if (!bot?.isBot || !bot.alive || bot.ejected || Number(bot.bustUntil) <= now() || durableBarrierActive(bot)) return false;
  const removed = Math.max(0, Number(target?.barrierDurability) || 0);
  return removed > 0 && remainingHealth(bot) <= removed * PUSH_BACKLASH_DAMAGE_PER_CHARGE;
}

function pruneBotVisibleThrowObservations(bot, timestamp = now()) {
  bot.botVisibleThrowObservations = (Array.isArray(bot?.botVisibleThrowObservations)
    ? bot.botVisibleThrowObservations
    : []).filter((observation) => Number(observation.expiresAt) > timestamp).slice(-24);
  return bot.botVisibleThrowObservations;
}

function playerHasVisiblePoisonPresentation(room, player, timestamp = now()) {
  // This boolean is the same statusAte.poison/players[].poisoned presentation
  // serialized to ordinary clients. No source identity or hidden death reason is
  // consulted here.
  return Boolean(player?.alive && !player.ejected && persistentStatusAteState(room, player, timestamp).poison);
}

function recordBotVisibleThrowMotion(room, thrower, thrown, landing, timestamp = now()) {
  if (!thrower?.alive || thrower.ejected || !thrown?.id) return 0;
  let observers = 0;
  for (const bot of room.players.values()) {
    if (!bot.isBot || !bot.alive || bot.ejected || bot.inVent) continue;
    // The thrower has direct public action evidence of its own released
    // container; other bots still require ordinary visual contact.
    if (bot.id !== thrower.id && !botCanDirectlyObservePlayer(room, bot, thrower)) continue;
    const observations = pruneBotVisibleThrowObservations(bot, timestamp);
    observations.push({
      visualThrowId: String(thrown.id),
      throwerId: String(thrower.id),
      visibleItemId: String(thrown.itemId || ""),
      visiblyToxicContainer: TOXIC_THROW_ITEM_IDS.has(String(thrown.itemId || "")),
      startX: Number(thrower.x) || 0,
      startY: Number(thrower.y) || 0,
      targetX: Number(landing?.x) || 0,
      targetY: Number(landing?.y) || 0,
      observedAt: timestamp,
      landsAt: Number(thrown.landsAt) || timestamp,
      poisonLandingObservedAt: 0,
      poisonX: 0,
      poisonY: 0,
      poisonRadius: 0,
      visiblePoisonVictims: {},
      expiresAt: Math.max(Number(thrown.landsAt) || timestamp, timestamp) + BOT_VISIBLE_THROW_MEMORY_MS
    });
    bot.botVisibleThrowObservations = observations.slice(-24);
    observers += 1;
  }
  return observers;
}

function recordBotVisiblePoisonLanding(room, thrown, landing, timestamp = now()) {
  if (!TOXIC_THROW_ITEM_IDS.has(String(thrown?.itemId || ""))) return 0;
  let observers = 0;
  for (const bot of room.players.values()) {
    if (!bot.isBot || !bot.alive || bot.ejected || bot.inVent) continue;
    const observation = pruneBotVisibleThrowObservations(bot, timestamp)
      .find((entry) => entry.visualThrowId === String(thrown.id || ""));
    if (!observation || !observation.visiblyToxicContainer) continue;
    if (!botCanDirectlyObservePosition(room, bot, landing)) continue;
    observation.poisonLandingObservedAt = timestamp;
    observation.poisonX = Number(landing?.x) || 0;
    observation.poisonY = Number(landing?.y) || 0;
    observation.poisonRadius = 145 + Math.max(0, Number(thrown.level) || 0) * 42;
    observation.expiresAt = Math.max(
      Number(observation.expiresAt) || 0,
      timestamp + BOT_VISIBLE_THROW_MEMORY_MS
    );
    observers += 1;
  }
  return observers;
}

function recordBotVisiblePoisonPresentations(room, timestamp = now()) {
  let observationsAdded = 0;
  for (const bot of room.players.values()) {
    if (!bot.isBot || !bot.alive || bot.ejected || bot.inVent) continue;
    const observations = pruneBotVisibleThrowObservations(bot, timestamp)
      .filter((entry) => entry.visiblyToxicContainer && Number(entry.poisonLandingObservedAt) > 0);
    if (!observations.length) continue;
    for (const target of room.players.values()) {
      if (!playerHasVisiblePoisonPresentation(room, target, timestamp)) continue;
      if (!botCanDirectlyObservePlayer(room, bot, target)) continue;
      for (const observation of observations) {
        const previous = observation.visiblePoisonVictims?.[target.id] || null;
        const visuallyEnteredObservedCloud = Math.hypot(
          Number(target.x) - Number(observation.poisonX),
          Number(target.y) - Number(observation.poisonY)
        ) <= Number(observation.poisonRadius) + BOT_VISIBLE_POISON_ASSOCIATION_PADDING;
        if (!previous && !visuallyEnteredObservedCloud) continue;
        observation.visiblePoisonVictims ||= {};
        observation.visiblePoisonVictims[target.id] = {
          firstSeenAt: Number(previous?.firstSeenAt) || timestamp,
          lastSeenAt: timestamp,
          lastX: Number(target.x) || 0,
          lastY: Number(target.y) || 0
        };
        observationsAdded += 1;
      }
    }
  }
  return observationsAdded;
}

function recordBotVisiblePoisonDeathInference(room, target, timestamp = now()) {
  // This intentionally receives neither the authoritative damage source nor a
  // death-cause label. A bot can infer poison only when it sees the public
  // poison ATE on the victim at the visible death moment and has the complete
  // earlier visual chain: thrower motion -> toxic landing -> victim in cloud.
  if (!playerHasVisiblePoisonPresentation(room, target, timestamp)) return 0;
  let witnesses = 0;
  for (const bot of room.players.values()) {
    if (!bot.isBot || !bot.alive || bot.ejected || bot.inVent || bot.id === target.id) continue;
    if (!botCanDirectlyObservePlayer(room, bot, target)) continue;
    const observation = pruneBotVisibleThrowObservations(bot, timestamp)
      .filter((entry) => entry.visiblePoisonVictims?.[target.id])
      .sort((a, b) => Number(b.poisonLandingObservedAt) - Number(a.poisonLandingObservedAt))[0];
    if (!observation) continue;
    const observedThrower = room.players.get(String(observation.throwerId || ""));
    if (!observedThrower?.alive || observedThrower.ejected || observedThrower.id === bot.id) continue;
    bot.botWitnessTargetId = observedThrower.id;
    bot.botWitnessUntil = timestamp + BOT_STAND_FIRM_RETALIATION_MS;
    bot.botWitnessEvidenceKind = "visual-poison-throw-death";
    bot.navPath = [];
    bot.nextBotActionAt = Math.min(Number(bot.nextBotActionAt) || timestamp, timestamp);
    witnesses += 1;
  }
  return witnesses;
}

function pruneBotVisibleAttackMemories(bot, timestamp = now()) {
  const memories = Array.isArray(bot?.botVisibleAttackMemories) ? bot.botVisibleAttackMemories : [];
  const retained = memories.filter((entry) => (
    entry &&
    String(entry.actorId || "") &&
    Number(entry.expiresAt) > timestamp &&
    Number.isFinite(Number(entry.x)) &&
    Number.isFinite(Number(entry.y))
  ));
  if (bot) bot.botVisibleAttackMemories = retained.slice(-12);
  return retained;
}

function recordBotVisibleHumanAttackStart(room, actor, kind, timestamp = now()) {
  // This is deliberately a motion memory, not an attacker-role conclusion.
  // The actor's role, kill attribution and private status never participate.
  if (!room || !actor || actor.isBot || !actor.alive || actor.ejected || actor.inVent) return 0;
  let observed = 0;
  for (const bot of room.players.values()) {
    if (!bot?.isBot || bot.role !== "defender" || !botIsEnemyOfSoleHuman(room, bot)) continue;
    if (!botCanDirectlyObservePlayer(room, bot, actor)) continue;
    const memories = pruneBotVisibleAttackMemories(bot, timestamp)
      .filter((entry) => String(entry.actorId || "") !== actor.id);
    memories.push({
      actorId: actor.id,
      x: Number(actor.x) || 0,
      y: Number(actor.y) || 0,
      observedAt: timestamp,
      expiresAt: timestamp + BOT_VISIBLE_ATTACK_MEMORY_MS,
      kind: String(kind || "attack")
    });
    bot.botVisibleAttackMemories = memories.slice(-12);
    observed += 1;
  }
  return observed;
}

function promoteBotVisibleAttackBodyChain(room, bot, body, timestamp = now()) {
  if (!room || !bot?.isBot || bot.role !== "defender" || !body) return null;
  if (!botIsEnemyOfSoleHuman(room, bot) || !botCanDirectlyObservePosition(room, bot, body)) return null;
  const memories = pruneBotVisibleAttackMemories(bot, timestamp);
  const match = memories
    .map((memory) => ({ memory, actor: room.players.get(String(memory.actorId || "")) }))
    .filter(({ memory, actor }) => (
      actor?.alive &&
      !actor.ejected &&
      !actor.inVent &&
      actor.id !== bot.id &&
      String(body.playerId || "") !== actor.id &&
      Number(body.at) >= Number(memory.observedAt) &&
      Number(body.at) <= Number(memory.expiresAt) &&
      Math.hypot(Number(body.x) - Number(memory.x), Number(body.y) - Number(memory.y)) <= BOT_ATTACK_BODY_CHAIN_DISTANCE
    ))
    .sort((a, b) => Number(b.memory.observedAt) - Number(a.memory.observedAt))[0];
  if (!match) return null;
  // A legal suspect is promoted only after the bot itself saw both endpoints
  // of the chain. This is still evidence, never a hidden-role confirmation.
  bot.botWitnessTargetId = match.actor.id;
  bot.botWitnessUntil = Math.min(Number(match.memory.expiresAt), timestamp + BOT_VISIBLE_ATTACK_MEMORY_MS);
  bot.botWitnessEvidenceKind = "visible-attack-motion-body-chain";
  bot.navPath = [];
  bot.nextBotActionAt = Math.min(Number(bot.nextBotActionAt) || timestamp, timestamp);
  return match.actor;
}

function botKnownAttackerEvidence(room, bot, timestamp = now()) {
  // Observation evidence is not a role-reveal route. Attack motion alone is
  // insufficient: it must be joined by a matching, directly discovered body.
  // Hidden role/faction, status source, thrown owner, corpse killer and internal
  // death reason are forbidden inputs here.
  const witnessed = room.players.get(String(bot?.botWitnessTargetId || ""));
  if (botDefenderScoutCandidate(bot, witnessed, timestamp) && Number(bot.botWitnessUntil) > timestamp) return witnessed;
  const retaliatingAgainst = room.players.get(String(bot?.botRetaliationTargetId || ""));
  if (botDefenderScoutCandidate(bot, retaliatingAgainst, timestamp) && Number(bot.botRetaliationUntil) > timestamp) {
    return retaliatingAgainst;
  }
  return null;
}

function botCanCommitLuminous(room, bot, targetId, timestamp = now()) {
  if (!bot?.isBot || bot.role !== "defender" || !botIsEnemyOfSoleHuman(room, bot)) return false;
  if (!bot.alive || bot.ejected || bot.inVent || bot.luminousUsed || bot.smartphoneAction || bot.emergenciesLeft <= 0) return false;
  const knownTarget = botKnownAttackerEvidence(room, bot, timestamp);
  return Boolean(knownTarget && knownTarget.id === String(targetId || ""));
}

function isGboEligibleItemId(itemId) {
  const id = String(itemId || "");
  // Heavy weapons and inventions are consumed on use. Only repeat-use
  // firearms and the reusable sword may commit GBO, including throw routes.
  return id === "orichalcum-sword" ||
    (id.startsWith("weapon:") && Object.prototype.hasOwnProperty.call(GUNNER_WEAPONS, id.slice(7)));
}

function spendHeldPowerMana(room, player, amount, label) {
  const cost = Math.max(0, Number(amount) || 0);
  if (hasFighterInfiniteResources(player)) return false;
  if ((Number(player.mana) || 0) < cost) {
    throw new ApiError(400, `${label}（${cost}MP）を発動するには同量のMPが必要です。`);
  }
  setMana(room, player, (Number(player.mana) || 0) - cost, label);
  return true;
}

function withHeldEnhanceActivation(room, player, action) {
  if (player.heldEnhanceVisual) return action();
  const context = { identity: "" };
  player.heldEnhanceVisual = context;
  try {
    const result = action();
    if (result !== false && context.identity) emitEnhanceActivation(room, player, context.identity);
    return result;
  } finally {
    delete player.heldEnhanceVisual;
  }
}

function acceptedEnhanceChargeHoldMs(player, rawHoldMs, timestamp = now()) {
  const startedAt = Number(player?.enhanceChargeStartedAt) || 0;
  if (startedAt <= 0) return 0;
  const releasedAt = Number(player.enhanceChargeReleasedAt) || 0;
  if (releasedAt >= startedAt) return Math.max(0, Number(player.enhanceChargeAcceptedHoldMs) || 0);
  const claimedHoldMs = Math.max(0, Number(rawHoldMs) || 0);
  const observedHoldMs = Math.max(0, timestamp - startedAt);
  return Math.min(claimedHoldMs, observedHoldMs);
}

function finalizeEnhanceChargeState(room, player, rawHoldMs, chargeId = "") {
  const startedAt = Number(player?.enhanceChargeStartedAt) || 0;
  const expectedChargeId = String(player?.enhanceChargeId || "");
  if (startedAt <= 0 || !expectedChargeId || (chargeId && String(chargeId) !== expectedChargeId)) {
    clearEnhanceChargeState(player);
    throw new ApiError(409, "長押し状態が一致しません。もう一度押し直してください。");
  }
  const timestamp = now();
  player.enhanceChargeAcceptedHoldMs = acceptedEnhanceChargeHoldMs(player, rawHoldMs, timestamp);
  player.enhanceChargeReleasedAt = timestamp;
  touch(room);
  return player.enhanceChargeAcceptedHoldMs;
}

function resolveHeldPowerMode(room, player, rawHoldMs, label, options = {}) {
  const expectedKind = String(options.kind || "");
  const expectedItemId = String(options.itemId || "");
  const expectedChargeId = String(options.chargeId || "");
  const startedAt = Number(player?.enhanceChargeStartedAt) || 0;
  if (startedAt <= 0) {
    if (options.allowUnchargedNormal && Math.max(0, Number(rawHoldMs) || 0) < ENHANCE_HOLD_STEP_MS) {
      return Object.freeze({ mode: "normal", enhanceLevel: 0, multiplier: 1, acceptedHoldMs: 0 });
    }
    throw new ApiError(409, "長押し開始が確認できません。もう一度押し直してください。");
  }
  const chargeMatches = (!expectedKind || String(player.enhanceChargeKind || "") === expectedKind) &&
    String(player.enhanceChargeItemId || "") === expectedItemId &&
    (!expectedChargeId || String(player.enhanceChargeId || "") === expectedChargeId);
  if (!chargeMatches) {
    clearEnhanceChargeState(player);
    throw new ApiError(409, "長押し対象が開始時と一致しないため中止しました。");
  }
  const acceptedHoldMs = acceptedEnhanceChargeHoldMs(player, rawHoldMs);
  const visualChargeId = String(player.enhanceChargeId || "");
  // A completed consumable use/throw hold cannot silently become Enhance.
  // Check after charge ownership validation and before any resource settlement.
  if (["use", "throw"].includes(expectedKind) && acceptedHoldMs >= GBO_HOLD_MS && !isGboEligibleItemId(expectedItemId)) {
    clearEnhanceChargeState(player);
    throw new ApiError(400, "GBOは再利用可能な武具にのみ使用できます。");
  }
  const gbo = Boolean(options.gboEligible) && isGboEligibleItemId(expectedItemId) && acceptedHoldMs >= GBO_HOLD_MS;
  const enhanceLevel = gbo ? 0 : (acceptedHoldMs >= ENHANCE_HOLD_STEP_MS ? 1 : 0);
  clearEnhanceChargeState(player);
  if (gbo) {
    spendHeldPowerMana(room, player, GBO_FIXED_MANA_COST, `${label}・GBO`);
    if (player.heldEnhanceVisual) player.heldEnhanceVisual.identity = visualChargeId;
    return Object.freeze({ mode: "gbo", enhanceLevel: 0, multiplier: GBO_PERFORMANCE_MULTIPLIER, acceptedHoldMs });
  }
  if (enhanceLevel > 0) {
    spendHeldPowerMana(room, player, ENHANCE_FIXED_MANA_COST, `${label}・エンハンス`);
    if (player.heldEnhanceVisual) player.heldEnhanceVisual.identity = visualChargeId;
    return Object.freeze({ mode: "enhance", enhanceLevel, multiplier: 1, acceptedHoldMs });
  }
  return Object.freeze({ mode: "normal", enhanceLevel: 0, multiplier: 1, acceptedHoldMs });
}

function resolveEnhance(room, player, rawHoldMs, label, options = {}) {
  return resolveHeldPowerMode(room, player, rawHoldMs, label, options).enhanceLevel;
}

function pushGboOverdriveEffect(room, player, itemId, variant = "activate") {
  player.bustUnlocked = true;
  pushMagicEffect(room, "gbo-overdrive", player, {
    radius: 175,
    playerId: player.id,
    variant: `${variant}:${String(itemId || "gear")}`,
    durationMs: 1_450
  });
}

function clearEnhanceChargeState(player) {
  if (!player) return false;
  const changed = Boolean(
    player.enhanceChargeStartedAt ||
    player.enhanceChargeKind ||
    player.enhanceChargeItemId ||
    player.enhanceChargeId ||
    player.enhanceChargeReleasedAt ||
    player.enhanceChargeAcceptedHoldMs
  );
  player.enhanceChargeStartedAt = 0;
  player.enhanceChargeKind = "";
  player.enhanceChargeItemId = "";
  player.enhanceChargeId = "";
  player.enhanceChargeReleasedAt = 0;
  player.enhanceChargeAcceptedHoldMs = 0;
  return changed;
}

function setEnhanceChargeState(room, player, active, kind = "", itemId = "") {
  if (!active) {
    const changed = clearEnhanceChargeState(player);
    if (changed) touch(room);
    return changed;
  }
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在はエンハンスを溜められません。");
  }
  ensureAbilityAvailable(player);
  ensureConscious(player);
  const normalizedKind = String(kind || "");
  if (!["shoot", "use", "throw", "fire"].includes(normalizedKind)) throw new ApiError(400, "エンハンス対象が不正です。");
  player.enhanceChargeStartedAt = now();
  player.enhanceChargeKind = normalizedKind;
  player.enhanceChargeItemId = String(itemId || "");
  player.enhanceChargeId = uid("charge_");
  player.enhanceChargeReleasedAt = 0;
  player.enhanceChargeAcceptedHoldMs = 0;
  player.vx = 0;
  player.vy = 0;
  player.movementMode = "idle";
  touch(room);
  return player.enhanceChargeId;
}

function clearBurning(room, player, source = "水") {
  if (!player?.burnStatus) return false;
  player.burnStatus = null;
  pushMagicEffect(room, "status-burn-cleared", player, { radius: 105, playerId: player.id, variant: source });
  setImmediateFeedback(player, "燃焼解除", source);
  return true;
}

function clearPoison(room, player, source = "解毒") {
  if (!player?.poisonStatus) return false;
  player.poisonStatus = null;
  pushMagicEffect(room, "status-poison-cleared", player, { radius: 105, playerId: player.id, variant: source });
  setImmediateFeedback(player, "毒解除", source);
  return true;
}

const ADVERSE_STATUS_DEADLINE_FIELDS = Object.freeze([
  "slowedUntil",
  "taserSlowedUntil",
  "shockSlowedUntil",
  "gravityStormSlowUntil",
  "unconsciousUntil",
  "gravityPinnedUntil",
  "abilityDisabledUntil",
  "timeStoppedUntil"
]);

function hasNaturalRecovery(room, player) {
  return Boolean(
    room?.phase === "playing" &&
    player?.alive &&
    !player.ejected &&
    isRational(player)
  );
}

function hasActiveAdverseStatus(player, timestamp = now()) {
  return Boolean(
    player?.poisonStatus ||
    player?.burnStatus ||
    ADVERSE_STATUS_DEADLINE_FIELDS.some((field) => Number(player?.[field]) > timestamp)
  );
}

function clearAdverseStatuses(room, player, source = "状態異常回復", timestamp = now()) {
  if (!player) return false;
  const naturalRecovery = source === "自然回復";
  const hadTimedStatus = ADVERSE_STATUS_DEADLINE_FIELDS.some((field) => Number(player[field]) > timestamp);
  for (const field of ADVERSE_STATUS_DEADLINE_FIELDS) player[field] = 0;
  // EMP is an equipment anomaly, never a status abnormality.  This generic
  // status-recovery helper must not repair, shorten, or otherwise touch its
  // authoritative equipment-lock timer, regardless of recovery source.
  player.gravityStormSlowMultiplier = 1;
  if (["unconscious", "time-stopped"].includes(player.movementMode)) {
    player.movementMode = "idle";
  }
  const clearedBurn = Boolean(player.burnStatus);
  const clearedPoison = Boolean(player.poisonStatus);
  if (naturalRecovery) {
    player.burnStatus = null;
    player.poisonStatus = null;
  } else {
    if (clearedBurn) clearBurning(room, player, source);
    if (clearedPoison) clearPoison(room, player, source);
  }
  return hadTimedStatus || clearedBurn || clearedPoison;
}

function rejectAdverseStatusDuringNaturalRecovery(room, target, label = "状態異常", timestamp = now()) {
  if (!hasNaturalRecovery(room, target)) return false;
  pushMagicEffect(room, "natural-recovery", target, {
    radius: 112,
    playerId: target.id,
    variant: `blocked:${label}`,
    durationMs: 1150
  });
  if (Number(target.statusImmunityFeedbackAt) <= timestamp) {
    target.statusImmunityFeedbackAt = timestamp + HAZARD_TICK_MS;
    setImmediateFeedback(target, "自然回復", `${label}を無効化 / 理知`);
  }
  return true;
}

function maintainNaturalRecovery(room, player, timestamp = now()) {
  // Several instant-item and map-object routes alter SP directly.  Reconcile
  // the single authoritative mind state here as well as in the continuous
  // resource paths so a direct SP gain/loss cannot leave stale passives.
  syncMentalState(room, player, "資源更新", timestamp);
  if (!hasNaturalRecovery(room, player) || !hasActiveAdverseStatus(player, timestamp)) return false;
  const cleared = clearAdverseStatuses(room, player, "自然回復", timestamp);
  if (cleared) {
    pushMagicEffect(room, "natural-recovery", player, {
      radius: 122,
      playerId: player.id,
      variant: "cleared",
      durationMs: 1350
    });
    player.statusImmunityFeedbackAt = Math.max(Number(player.statusImmunityFeedbackAt) || 0, timestamp + HAZARD_TICK_MS);
    setImmediateFeedback(player, "自然回復", "理知 / 状態異常解除");
  }
  return cleared;
}

function advanceNaturalRecoveryHealth(room, player, elapsedMs) {
  if (!hasNaturalRecovery(room, player)) return false;
  if (player.hackerRootActive || (hasFighterInfiniteResources(player) && !player.limitBreakActive)) return false;
  const elapsedSeconds = Math.max(0, Number(elapsedMs) || 0) / 1000;
  const restMultiplier = player.resting ? SLEEP_REGEN_MULTIPLIER : 1;
  const recovered = NATURAL_RECOVERY_HP_PER_SECOND * restMultiplier * floraAromaMultiplier(room, player) * elapsedSeconds;
  if (recovered <= 0) return false;
  return recoverHealth(player, recovered).recovered > 0;
}

function advanceNaturalRecoveryMana(room, player, elapsedMs) {
  if (!hasNaturalRecovery(room, player)) return false;
  if (player.hackerRootActive || hasFighterInfiniteResources(player)) return false;
  const before = Math.max(0, Number(player.mana) || 0);
  const elapsedSeconds = Math.max(0, Number(elapsedMs) || 0) / 1000;
  const restMultiplier = player.resting ? SLEEP_REGEN_MULTIPLIER : 1;
  const recovered = NATURAL_RECOVERY_MANA_PER_SECOND * restMultiplier * floraAromaMultiplier(room, player) * elapsedSeconds;
  if (recovered <= 0) return false;
  player.mana = Number((before + recovered).toFixed(6));
  expandManaCapacityFor(player, player.mana);
  syncMentalState(room, player, "自然回復", now());
  player.luck = luckValueFor(player);
  return player.mana > before;
}

function applyPersistentStatus(room, source, target, kind, strength = 1, timestamp = now(), options = {}) {
  if (!target?.alive || target.ejected) return false;
  if (!options.ignoreFriendlyFire && botFriendlyTransactionBlocked(source, target)) return false;
  if (rejectAdverseStatusDuringNaturalRecovery(room, target, kind === "poison" ? "毒" : "燃焼", timestamp)) return false;
  if (!options.bypassSlashGuard && resolveFighterSlashGuard(room, source, target, {
    kind,
    label: kind === "poison" ? "毒" : "燃焼",
    physical: false,
    reflectable: false,
    reflectEffect: ({ defender, source: reflectedTarget }) => applyPersistentStatus(
      room,
      defender,
      reflectedTarget,
      kind,
      strength,
      timestamp,
      { ignorePreparationBarrier: true, ignoreFriendlyFire: true, bypassSlashGuard: true }
    )
  }, timestamp)) return false;
  if (!options.ignorePreparationBarrier && (durableBarrierActive(target) || absorbPreparationBarrier(room, target, timestamp, source))) return false;
  if (!options.ignoreFriendlyFire && source && source.id !== target.id && source.role === target.role && ["defender", "attacker"].includes(source.role)) {
    applyDefenderFriendlyFirePenalty(room, source, target, timestamp);
    return false;
  }
  if (resolveIaiDestructionUpgrade(room, source, target, kind === "poison" ? "毒攻撃" : "燃焼攻撃", {
    ignoreFriendlyFire: true
  })) {
    checkWin(room);
    touch(room);
    return true;
  }
  const field = kind === "poison" ? "poisonStatus" : "burnStatus";
  const current = target[field];
  const sourceId = String(source?.id || current?.sourceId || "");
  const nextStrength = Math.max(Number(current?.strength) || 0, Math.max(0.25, Number(strength) || 1));
  const shouldEmitActivation = !current || sourceId !== String(current.sourceId || "") || nextStrength > (Number(current.strength) || 0) + 0.001;
  target[field] = {
    sourceId,
    strength: nextStrength,
    nextTickAt: Math.min(Number(current?.nextTickAt) || Infinity, timestamp + HAZARD_TICK_MS)
  };
  if (shouldEmitActivation) {
    pushMagicEffect(room, kind === "poison" ? "status-poison" : "status-burning", target, {
      radius: 105,
      playerId: target.id,
      variant: String(target[field].strength)
    });
  }
  return true;
}

function addHazardField(room, source, kind, x, y, radius, strength = 1, durationMs = HAZARD_FIELD_DURATION_MS) {
  const field = {
    id: uid("hazard_"),
    kind,
    sourceId: String(source?.id || ""),
    x: Math.round(x),
    y: Math.round(y),
    radius: Math.max(40, Number(radius) || 120),
    strength: Math.max(0.25, Number(strength) || 1),
    createdAt: now(),
    endsAt: now() + Math.max(1_000, Number(durationMs) || HAZARD_FIELD_DURATION_MS)
  };
  room.hazardFields.push(field);
  room.hazardFields = room.hazardFields.slice(-32);
  pushMagicEffect(room, kind === "poison" ? "hazard-poison" : kind === "water" ? "hazard-water" : "hazard-fire", field, {
    radius: field.radius,
    playerId: source?.id || "",
    variant: String(field.strength)
  });
  return field;
}

function safeThrowPoint(room, player, targetX = Number.NaN, targetY = Number.NaN) {
  const map = getMap(room);
  const requestedX = Number(targetX);
  const requestedY = Number(targetY);
  const requestedDx = requestedX - player.x;
  const requestedDy = requestedY - player.y;
  const requestedLength = Math.hypot(requestedDx, requestedDy);
  const explicitTarget = Number.isFinite(requestedX) && Number.isFinite(requestedY) && requestedLength > 0.01;
  const direction = explicitTarget
    ? { dx: requestedDx / requestedLength, dy: requestedDy / requestedLength }
    : finiteDirection(player.aimX, player.aimY, 0, 1);
  const throwDistance = explicitTarget ? requestedLength : ITEM_THROW_BASE_DISTANCE;
  for (let ratio = 1; ratio >= 0.15; ratio -= 0.05) {
    const x = clampNumber(player.x + direction.dx * throwDistance * ratio, map.playerRadius, map.width - map.playerRadius, player.x);
    const y = clampNumber(player.y + direction.dy * throwDistance * ratio, map.playerRadius, map.height - map.playerRadius, player.y);
    if (isWalkable(room, x, y, Math.max(12, map.playerRadius * 0.4))) return { x, y, distance: throwDistance * ratio };
  }
  return { x: player.x, y: player.y, distance: 0 };
}

function useMineralWater(room, player, center, level = 0, thrown = false) {
  const radius = thrown ? 135 + level * 38 : 0;
  const timestamp = now();
  const targets = thrown
    ? [...room.players.values()].filter((target) => target.alive && !target.ejected && distance(center, target) <= radius)
    : [player];
  for (const target of targets) {
    clearBurning(room, target, "ミネラルウォーター");
    grantStamina(room, target, MINERAL_WATER_STAMINA + level * 45, "ミネラルウォーター", timestamp);
    pushGainAte(room, target, "stamina", { variant: thrown ? "mineral-water:thrown" : "mineral-water:use" });
  }
  if (thrown) addHazardField(room, player, "water", center.x, center.y, radius, 1 + level * 0.25, 4_500 + level * 1_000);
}

function useAntidote(room, player, center, level = 0, thrown = false) {
  const radius = thrown ? 120 + level * 30 : 0;
  const targets = thrown
    ? [...room.players.values()].filter((target) => target.alive && !target.ejected && distance(center, target) <= radius)
    : [player];
  for (const target of targets) clearPoison(room, target, "解毒剤");
  if (thrown) pushMagicEffect(room, "hazard-antidote", center, { radius, playerId: player.id, variant: String(level) });
}

function applyBottleShardSplash(room, player, itemId, center, level = 0, options = {}) {
  if (!BOTTLE_ITEM_IDS.has(itemId)) return 0;
  const radius = BOTTLE_SHARD_BASE_RADIUS + level * 16;
  const timestamp = now();
  const random = typeof options.random === "function" ? options.random : Math.random;
  let hits = 0;
  for (const target of room.players.values()) {
    if (!target.alive || target.ejected || distance(center, target) > radius || random() >= BOTTLE_SHARD_HIT_CHANCE) continue;
    if (botFriendlyTransactionBlocked(player, target)) continue;
    const damage = BOTTLE_SHARD_MIN_DAMAGE + random() * (BOTTLE_SHARD_MAX_DAMAGE - BOTTLE_SHARD_MIN_DAMAGE);
    if (resolveFighterSlashGuard(room, player, target, {
      kind: "bottle-shards",
      label: "瓶の破片",
      physical: true,
      reflectable: true,
      damage,
      hitZone: "body"
    }, timestamp)) continue;
    if (absorbPreparationBarrier(room, target, timestamp, player)) continue;
    if (player && player.id !== target.id && sharesCombatFaction(player, target)) {
      applyDefenderFriendlyFirePenalty(room, player, target, timestamp);
      continue;
    }
    const damageResult = settleDurableBodyDamage(room, player, target, damage, "瓶の破片", {timestamp, attackKind: "bottle-shards", impactOrigin: center});
    if (!damageResult.absorbed) hits += 1;
  }
  pushMagicEffect(room, "bottle-shards", center, {
    radius,
    playerId: player.id,
    variant: `${itemId}:${hits}`
  });
  if (hits > 0) pushEvent(room, `瓶の破片が ${hits} 人に命中しました。`);
  return hits;
}

function itemThrowFlightDuration(distanceToLanding) {
  return Math.round(clampNumber(
    Math.max(0, Number(distanceToLanding) || 0) / ITEM_THROW_SPEED * 1000,
    ITEM_THROW_MIN_FLIGHT_MS,
    ITEM_THROW_MAX_FLIGHT_MS,
    ITEM_THROW_MIN_FLIGHT_MS
  ));
}

function queueThrownItem(room, player, itemId, item, landing, rawPower = 0) {
  const createdAt = now();
  recordBotVisibleHumanAttackStart(room, player, "item-throw", createdAt);
  const requestedDx = Number(landing?.x) - Number(player.x);
  const requestedDy = Number(landing?.y) - Number(player.y);
  const requestedDistance = Math.hypot(requestedDx, requestedDy);
  const throwPath = requestedDistance > 0.01
    ? resolveVectorAttackPath(room, player, requestedDx, requestedDy, requestedDistance, { collisionRadius: 2 })
    : { x: player.x, y: player.y, distance: 0, blocked: false };
  const resolvedLanding = { x: throwPath.x, y: throwPath.y, distance: throwPath.distance };
  const durationMs = itemThrowFlightDuration(resolvedLanding.distance);
  const power = rawPower && typeof rawPower === "object"
    ? rawPower
    : { mode: Number(rawPower) > 0 ? "enhance" : "normal", enhanceLevel: Number(rawPower) || 0 };
  const level = power.mode === "gbo" ? 0 : (Number(power.enhanceLevel) > 0 ? 1 : 0);
  const gbo = power.mode === "gbo";
  // This is a Fighter ability augmentation, never a property of the thrown
  // item or of the Orichalcum Sword.
  const energyShockwave = hasOperatorAccess(player, "fighter") && consumeFighterEnergyCharge(player, 1, "ファイター投擲衝撃波");
  room.thrownItems ||= [];
  const thrown = {
    id: uid("throw_"),
    itemId,
    item,
    ownerId: player.id,
    x: Math.round(player.x),
    y: Math.round(player.y),
    targetX: Math.round(resolvedLanding.x),
    targetY: Math.round(resolvedLanding.y),
    level,
    gbo,
    energyShockwave,
    createdAt,
    landsAt: createdAt + durationMs
  };
  room.thrownItems.push(thrown);
  room.thrownItems = room.thrownItems.slice(-48);
  pushMagicEffect(room, "action-item-throw", player, {
    radius: 90,
    playerId: player.id,
    targetX: resolvedLanding.x,
    targetY: resolvedLanding.y,
    variant: `flight:${itemId}`,
    durationMs
  });
  recordBotVisibleThrowMotion(room, player, thrown, resolvedLanding, createdAt);
  if (gbo) pushGboOverdriveEffect(room, player, itemId, "throw");
  if (energyShockwave) {
    pushMagicEffect(room, "fighter-energy-release", player, {
      radius: 92,
      playerId: player.id,
      targetX: resolvedLanding.x,
      targetY: resolvedLanding.y,
      variant: `throw:remaining-ec-${player.fighterEnergyCharge}`,
      durationMs
    });
  }
  const label = item?.label || ITEM_DEFINITIONS[itemId]?.label || "アイテム";
  pushEvent(room, `${player.name} が${label}を投擲しました${gbo ? "（GBO・接触性能×10・接地時破壊）" : level ? "（エンハンス）" : ""}${energyShockwave ? "。ファイター投擲衝撃波を付与しました" : ""}。`);
  touch(room);
}

function releaseThrownEnergyShockwave(room, source, landing) {
  if (!source?.id) return;
  pushMagicEffect(room, "fighter-energy-impact", landing, {
    radius: FIGHTER_THROW_SHOCKWAVE_RADIUS,
    playerId: source.id,
    durationMs: 880,
    variant: "one-body-damage"
  });
  const targets = [...room.players.values()]
    .filter((target) => target.id !== source.id && target.alive && !target.ejected && distance(landing, target) <= FIGHTER_THROW_SHOCKWAVE_RADIUS)
    .sort((a, b) => distance(landing, a) - distance(landing, b));
  for (const target of targets) {
    if (!source.alive || source.ejected) break;
    try {
      const outcome = killPlayer(room, source, target.id, {
        ranged: true,
        hitZone: "body",
        damage: 1,
        ignoreRange: true,
        ignoreCooldown: true,
        preserveCooldown: true,
        magic: true,
        attackKind: "fighter-energy-shockwave",
        attackLabel: "ファイター投擲衝撃波",
        slashGuardPhysical: true,
        slashGuardReflectable: false,
        slashGuardPerfectEligible: false,
        targetRole: target.role
      });
      pushEvent(room, `${source.name} のファイター投擲衝撃波が ${target.name} に命中しました（${outcome}）。`);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    }
  }
}

function applyThrownImpactDamage(room, source, landing, label, damage, radius, options = {}) {
  const requestedTargetId = String(options.targetId || "");
  const targets = [...room.players.values()]
    .filter((candidate) => candidate.alive && !candidate.ejected && distance(landing, candidate) <= radius)
    .filter((candidate) => !requestedTargetId || candidate.id === requestedTargetId)
    .sort((a, b) => distance(landing, a) - distance(landing, b));
  if (!targets.length) return false;
  const timestamp = now();
  const impactDamage = Math.max(0.1, Number(damage) || 0.1);
  let hitCount = 0;
  for (const target of targets) {
    if (!target.alive || target.ejected) continue;
    if (botFriendlyTransactionBlocked(source, target)) continue;
    if (resolveFighterSlashGuard(room, source, target, {
      kind: "thrown-impact",
      label: `${label}の衝撃`,
      physical: true,
      reflectable: true,
      damage: impactDamage,
      hitZone: "body"
    }, timestamp)) continue;
    if (absorbPreparationBarrier(room, target, timestamp, source)) continue;
    if (source && source.id !== target.id && source.role === target.role && ["defender", "attacker"].includes(source.role)) {
      applyDefenderFriendlyFirePenalty(room, source, target, timestamp);
      continue;
    }
    const damageResult = settleDurableBodyDamage(room, source, target, impactDamage, label + "の衝撃", {timestamp, attackKind: "thrown-impact", impactOrigin: landing});
    if (!damageResult.absorbed) hitCount += 1;
  }
  return hitCount > 0;
}

function rigidThrownItemKind(itemId, item = {}) {
  const id = String(itemId || "");
  // Authored bottles and the two radioactive containers open/shatter at their
  // first collision or landing. Every other physical item (sword,
  // firearm, heavy weapon and invention) remains recoverable after normal Throw.
  if (!id || id === "fire-jutsu" || DISPOSABLE_THROW_CONTAINER_ITEM_IDS.has(id)) return "";
  if (id === "orichalcum-sword") return "sword";
  if (id.startsWith("weapon:")) return "firearm";
  if (id.startsWith("invention:")) return "invention";
  if (id.startsWith("heavy:")) return "heavy";
  if (item?.kind === "item" && ITEM_DEFINITIONS[id]?.throwable !== false) return "rigid";
  return "";
}

function rigidGroundItemAssetId(itemId) {
  return String(itemId || "").replace(/^(?:weapon:|invention:|heavy:)/, "");
}

function rigidThrownCollision(room, thrown) {
  const startX = Number(thrown?.x) || 0;
  const startY = Number(thrown?.y) || 0;
  const endX = Number(thrown?.targetX) || startX;
  const endY = Number(thrown?.targetY) || startY;
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 0.001) return null;
  return [...room.players.values()]
    .filter((target) => (
      target.id !== String(thrown?.ownerId || "") &&
      target.alive &&
      !target.ejected &&
      !target.inVent
    ))
    .map((target) => {
      const along = clampNumber(((target.x - startX) * dx + (target.y - startY) * dy) / lengthSquared, 0, 1, 0);
      const x = startX + dx * along;
      const y = startY + dy * along;
      return { target, along, x, y, missDistance: Math.hypot(target.x - x, target.y - y) };
    })
    .filter((entry) => entry.along > 0.03 && entry.missDistance <= RIGID_THROW_COLLISION_RADIUS)
    .sort((a, b) => a.along - b.along || a.missDistance - b.missDistance)[0] || null;
}

function rigidThrownImpactProfile(target, kind) {
  const severity = luckAdjustedRoll(target);
  const luck = luckValueFor(target);
  if (kind === "sword" && severity >= RIGID_THROW_BLADE_SEVERITY) {
    return { severity, luck, certainKill: true, contact: "blade", damage: 2 };
  }
  const [minimum, maximum] = kind === "firearm"
    ? [0.08, 0.36]
    : kind === "sword"
      ? [0.12, 0.51]
      : [0.10, 0.60];
  const boundedSeverity = kind === "sword"
    ? Math.min(1, severity / RIGID_THROW_BLADE_SEVERITY)
    : severity;
  return {
    severity,
    luck,
    certainKill: false,
    contact: kind === "sword" ? "safe-side" : "body",
    damage: Math.round((minimum + (maximum - minimum) * boundedSeverity) * 100) / 100
  };
}

function applyRigidThrownImpact(room, source, thrown, collision, kind) {
  if (!collision?.target) return null;
  const target = collision.target;
  const label = thrown?.item?.label || ITEM_DEFINITIONS[thrown?.itemId]?.label || "剛体アイテム";
  const profile = rigidThrownImpactProfile(target, kind);
  const gbo = Boolean(thrown?.gbo);
  const impactDamage = profile.damage * (gbo ? GBO_PERFORMANCE_MULTIPLIER : 1);
  const impactRadius = RIGID_THROW_COLLISION_RADIUS * (gbo ? GBO_PERFORMANCE_MULTIPLIER : 1);
  let outcome = "body";
  if (profile.certainKill && source?.alive && !source.ejected) {
    try {
      outcome = killPlayer(room, source, target.id, {
        ranged: true,
        hitZone: "head",
        ignoreRange: true,
        allowAnyKiller: true,
        targetRole: target.role,
        magic: false,
        attackKind: "thrown-sword-blade",
        attackLabel: "投擲オリハルコン剣の刃",
        slashGuardPhysical: true
      });
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      outcome = "blocked";
    }
    if (gbo) {
      applyThrownImpactDamage(room, source, { x: collision.x, y: collision.y }, `${label}・GBO`, impactDamage, impactRadius);
    }
  } else {
    applyThrownImpactDamage(
      room,
      source,
      { x: collision.x, y: collision.y },
      label,
      impactDamage,
      impactRadius,
      { targetId: gbo ? "" : target.id }
    );
  }
  pushMagicEffect(room, "rigid-item-impact", { x: collision.x, y: collision.y }, {
    radius: (kind === "sword" ? 112 : 82) * (gbo ? 2.2 : 1),
    playerId: source?.id || "",
    targetId: target.id,
    variant: `${gbo ? "gbo:" : ""}${kind}:${profile.contact}:${impactDamage.toFixed(2)}:luck-${profile.luck.toFixed(2)}`
  });
  const resultText = profile.certainKill
    ? `刃が直撃しキル判定（${outcome}）`
    : `${impactDamage.toFixed(2)}ダメージ判定`;
  setImmediateFeedback(target, `${label}被弾`, `${resultText} / 幸運 ${profile.luck.toFixed(2)}`);
  pushEvent(room, `${target.name} に投擲された${label}が被弾し、幸運 ${profile.luck.toFixed(2)}から${resultText}になりました。`);
  return { targetId: target.id, outcome, ...profile };
}

function placeRigidGroundItem(room, thrown, landing, kind, impact = null) {
  const itemId = String(thrown?.itemId || "");
  const item = thrown?.item && typeof thrown.item === "object"
    ? { ...thrown.item }
    : { id: itemId, label: ITEM_DEFINITIONS[itemId]?.label || itemId, kind: "item" };
  const angle = Math.atan2(
    (Number(thrown?.targetY) || Number(landing.y) || 0) - (Number(thrown?.y) || 0),
    (Number(thrown?.targetX) || Number(landing.x) || 0) - (Number(thrown?.x) || 0)
  );
  const groundItem = {
    id: uid("ground_item_"),
    itemId,
    item,
    label: item.label || ITEM_DEFINITIONS[itemId]?.label || itemId,
    asset: rigidGroundItemAssetId(itemId),
    kind,
    x: Math.round(Number(landing.x) || 0),
    y: Math.round(Number(landing.y) || 0),
    angle: Math.round(angle * 1000) / 1000,
    pickupRange: GROUND_ITEM_PICKUP_RANGE,
    ownerId: String(thrown?.ownerId || ""),
    createdAt: now(),
    impact
  };
  room.groundItems ||= [];
  room.groundItems.push(groundItem);
  return groundItem;
}

function pickupGroundItem(room, player, groundItemId = "") {
  if (room.phase !== "playing" || !player?.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在は接地アイテムを拾えません。");
  }
  ensureConscious(player);
  ensureItemStorageAvailable(player);
  const requestedId = String(groundItemId || "");
  const candidates = (room.groundItems || [])
    .map((groundItem, index) => ({ groundItem, index, distance: distance(player, groundItem) }))
    .filter(({ groundItem, distance: itemDistance }) => (
      (!requestedId || groundItem.id === requestedId) &&
      itemDistance <= Number(groundItem.pickupRange || GROUND_ITEM_PICKUP_RANGE)
    ))
    .sort((a, b) => a.distance - b.distance);
  const selected = candidates[0];
  if (!selected) throw new ApiError(404, "拾える接地アイテムが近くにありません。");
  receiveTransferableItem(player, selected.groundItem.item);
  room.groundItems.splice(selected.index, 1);
  pushMagicEffect(room, "action-item-pickup", player, {
    radius: 84,
    playerId: player.id,
    variant: selected.groundItem.asset
  });
  pushEvent(room, `${player.name} が接地していた${selected.groundItem.label}を拾いました。`);
  touch(room);
  return selected.groundItem;
}

function applyThrownStun(room, source, landing, durationMs, radius) {
  const timestamp = now();
  let affected = 0;
  for (const target of [...room.players.values()]
    .filter((candidate) => candidate.alive && !candidate.ejected && distance(landing, candidate) <= radius)
    .sort((left, right) => distance(landing, left) - distance(landing, right))) {
    if (botFriendlyTransactionBlocked(source, target)) continue;
    if (source && source.id !== target.id && source.role === target.role && ["defender", "attacker"].includes(source.role)) continue;
    // Adverse statuses observe both preparation and persistent durable shields
    // without spending durable points; body damage owns durability settlement.
    if (durableBarrierActive(target) || absorbPreparationBarrier(room, target, timestamp, source)) continue;
    target.unconsciousUntil = Math.max(Number(target.unconsciousUntil) || 0, timestamp + durationMs);
    target.vx = 0;
    target.vy = 0;
    target.movementMode = "unconscious";
    affected += 1;
  }
  return affected;
}

function resolveThrownInventoryLanding(room, source, thrown, landing) {
  const { itemId, level } = thrown;
  const radius = 145 + level * 42;
  if (["mercury", "lead", "uranium", "plutonium"].includes(itemId)) {
    const strength = {
      mercury: 1.15,
      lead: 0.95,
      uranium: 1.55,
      plutonium: 1.9
    }[itemId] + level * 0.35;
    addHazardField(room, source, "poison", landing.x, landing.y, radius, strength);
  } else if (itemId === "molotov" || itemId === "heated-water") {
    addHazardField(room, source, "fire", landing.x, landing.y, radius, 1 + level * 0.4);
  } else if (itemId === "mineral-water") {
    useMineralWater(room, source, landing, level, true);
  } else if (itemId === "seawater") {
    addHazardField(room, source, "water", landing.x, landing.y, radius, 1 + level * 0.2);
  } else if (itemId === "antidote") {
    useAntidote(room, source, landing, level, true);
  } else if (itemId === "ice") {
    applyThrownImpactDamage(room, source, landing, ITEM_DEFINITIONS[itemId].label, Math.min(1.75, 0.8 + level * 0.24), radius);
    pushMagicEffect(room, "quantum-ice-impact", landing, { radius, playerId: source?.id || "", variant: String(level) });
  } else if (itemId === "frag-grenade") {
    applyThrownImpactDamage(room, source, landing, ITEM_DEFINITIONS[itemId].label, GRENADE_BALANCE.frag.damage, GRENADE_BALANCE.frag.radius);
    pushMagicEffect(room, "grenade-frag-impact", landing, {
      radius: GRENADE_BALANCE.frag.radius,
      playerId: source?.id || "",
      durationMs: GRENADE_BALANCE.frag.impactDurationMs
    });
  } else if (itemId === "stun-grenade") {
    applyThrownStun(room, source, landing, GRENADE_BALANCE.stun.durationMs, GRENADE_BALANCE.stun.radius);
    pushMagicEffect(room, "grenade-stun-impact", landing, {
      radius: GRENADE_BALANCE.stun.radius,
      playerId: source?.id || "",
      durationMs: GRENADE_BALANCE.stun.impactDurationMs
    });
  } else {
    applyThrownImpactDamage(room, source, landing, ITEM_DEFINITIONS[itemId]?.label || "アイテム", 0.45 + level * 0.12, 72 + level * 10);
  }
  applyBottleShardSplash(room, source || { id: thrown.ownerId, name: "投擲者" }, itemId, landing, level);
}

function resolveThrownOwnedLanding(room, source, thrown, landing) {
  const { itemId, item, level } = thrown;
  if (itemId === "fire-jutsu") {
    addHazardField(room, source, "fire", landing.x, landing.y, 150 + level * 45, 1 + level * 0.35);
    return;
  }
  const isInvention = itemId.startsWith("invention:");
  const isWeapon = itemId.startsWith("weapon:");
  const multiplier = thrown.gbo ? GBO_PERFORMANCE_MULTIPLIER : 1;
  const damage = (isInvention ? 1.05 + level * 0.2 : isWeapon ? 0.62 + level * 0.15 : 0.45 + level * 0.12) * multiplier;
  const radius = (isInvention ? 120 + level * 16 : isWeapon ? 82 + level * 12 : 72 + level * 10) * multiplier;
  applyThrownImpactDamage(room, source, landing, item?.label || "アイテム", damage, radius);
}

function resolveThrownItemLanding(room, thrown) {
  const source = room.players.get(String(thrown.ownerId || "")) || {
    id: String(thrown.ownerId || "thrower-left"),
    name: "投擲者",
    role: ""
  };
  const requestedLanding = { x: Number(thrown.targetX) || 0, y: Number(thrown.targetY) || 0 };
  const requestedDx = requestedLanding.x - (Number(thrown.x) || 0);
  const requestedDy = requestedLanding.y - (Number(thrown.y) || 0);
  const intendedPath = resolveVectorAttackPath(room, thrown, requestedDx, requestedDy, Math.hypot(requestedDx, requestedDy), { collisionRadius: 2 });
  const intendedLanding = { x: intendedPath.x, y: intendedPath.y };
  const rigidKind = rigidThrownItemKind(thrown.itemId, thrown.item);
  const collision = rigidKind ? rigidThrownCollision(room, { ...thrown, targetX: intendedLanding.x, targetY: intendedLanding.y }) : null;
  const landing = collision
    ? { x: Number(collision.x) || intendedLanding.x, y: Number(collision.y) || intendedLanding.y }
    : intendedLanding;
  let groundItem = null;
  if (rigidKind) {
    const impact = collision ? applyRigidThrownImpact(room, source, thrown, collision, rigidKind) : null;
    if (thrown.gbo) {
      if (!collision) {
        const baseDamage = rigidKind === "sword" ? 0.51 : rigidKind === "firearm" ? 0.36 : rigidKind === "invention" ? 1.05 : 0.6;
        applyThrownImpactDamage(room, source, landing, `${thrown.item?.label || "武具"}・GBO`, baseDamage * GBO_PERFORMANCE_MULTIPLIER, RIGID_THROW_COLLISION_RADIUS * GBO_PERFORMANCE_MULTIPLIER);
      }
      pushMagicEffect(room, "gbo-overdrive", landing, {
        radius: 205,
        playerId: source?.id || "",
        variant: `impact:${thrown.itemId}`,
        durationMs: 1_450
      });
    } else {
      groundItem = placeRigidGroundItem(room, thrown, landing, rigidKind, impact);
    }
  } else if (ITEM_DEFINITIONS[thrown.itemId]) {
    resolveThrownInventoryLanding(room, source, thrown, landing);
    recordBotVisiblePoisonLanding(room, thrown, landing, now());
  } else {
    resolveThrownOwnedLanding(room, source, thrown, landing);
  }
  if (thrown.energyShockwave) releaseThrownEnergyShockwave(room, source, landing);
  if (!["frag-grenade", "stun-grenade"].includes(thrown.itemId)) {
    pushMagicEffect(room, "action-item-throw", landing, {
      radius: 110 + Number(thrown.level || 0) * 14,
      variant: `impact:${thrown.itemId}`,
      durationMs: 950
    });
  }
  const label = thrown.item?.label || ITEM_DEFINITIONS[thrown.itemId]?.label || "アイテム";
  pushEvent(room, groundItem
    ? `${label}は${collision ? "被弾地点" : "接地点"}へ剛体のまま残りました。誰でも拾えます。`
    : `${label}は接地して破壊され、効果が発動しました。`);
  checkWin(room);
  touch(room);
}

function advanceThrownItems(room, timestamp = now(), elapsedMs = 0, plannedStoppedMs = null) {
  const timeKeeperActive = roomTimeKeeperActive(room, timestamp);
  const pending = [];
  for (const thrown of room.thrownItems || []) {
    if (plannedStoppedMs != null || timeKeeperActive) {
      const elapsed = Math.max(0, Number(plannedStoppedMs ?? elapsedMs) || 0);
      thrown.createdAt = (Number(thrown.createdAt) || timestamp) + elapsed;
      thrown.landsAt = (Number(thrown.landsAt) || timestamp) + elapsed;
      if (timeKeeperActive) {
        pending.push(thrown);
        continue;
      }
    }
    if (Number(thrown.landsAt) > timestamp) pending.push(thrown);
    else resolveThrownItemLanding(room, thrown);
  }
  room.thrownItems = pending;
}

function toxicThrowHazardRadius(player, rawHoldMs = 0) {
  const enhanced = acceptedEnhanceChargeHoldMs(player, rawHoldMs) >= ENHANCE_HOLD_STEP_MS;
  return 145 + (enhanced ? 42 : 0);
}

function botToxicThrowLandingIsSafe(room, bot, landing, rawHoldMs = 0) {
  if (!bot?.isBot) return true;
  const map = getMap(room);
  // This uses only the Bot's own body and the resolved authoritative landing
  // point. It never infers a hidden target state. A Bot without a movement
  // escape transaction must be outside both the toxic field and a collision
  // margin before it may release a disposable radioactive container.
  const safeDistance = toxicThrowHazardRadius(bot, rawHoldMs) + Math.max(24, Number(map.playerRadius || 0) * 2);
  return distance(bot, landing) > safeDistance;
}

function holdBotOutsideOwnToxicField(bot, landing, durationMs) {
  if (!bot?.isBot) return;
  bot.botHazardAvoidUntil = Math.max(
    Number(bot.botHazardAvoidUntil) || 0,
    now() + Math.max(0, Number(durationMs) || 0) + HAZARD_FIELD_DURATION_MS
  );
  bot.botHazardAvoidX = Number(landing?.x) || 0;
  bot.botHazardAvoidY = Number(landing?.y) || 0;
}

function throwInventoryItem(room, player, itemId, rawHoldMs = 0, targetX = Number.NaN, targetY = Number.NaN, chargeId = "") {
  return withHeldEnhanceActivation(room, player, () => {
    if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) throw new ApiError(403, "現在は投擲できません。");
    ensureAbilityAvailable(player);
    ensureItemStorageAvailable(player);
    if (!ITEM_DEFINITIONS[itemId]) throw new ApiError(400, "投擲対象が不正です。");
    if (ITEM_DEFINITIONS[itemId].throwable === false) throw new ApiError(400, `${ITEM_DEFINITIONS[itemId].label}は投擲できません。`);
    if (itemCount(player, itemId) < 1) throw new ApiError(400, `${ITEM_DEFINITIONS[itemId].label}を所持していません。`);
    const landing = safeThrowPoint(room, player, targetX, targetY);
    // Bottle shards are an authored area transaction. A Bot must not spend the
    // held bottle or create its throw/effect when the current landing radius
    // contains any same-faction body.
    if (player.isBot && BOTTLE_ITEM_IDS.has(itemId)) {
      const previewEnhanceLevel = acceptedEnhanceChargeHoldMs(player, rawHoldMs) >= ENHANCE_HOLD_STEP_MS ? 1 : 0;
      const shardRadius = BOTTLE_SHARD_BASE_RADIUS + previewEnhanceLevel * 16;
      const friendlyInShardRadius = [...room.players.values()].some((target) => (
        target.id !== player.id &&
        target.alive &&
        !target.ejected &&
        distance(landing, target) <= shardRadius &&
        botFriendlyTransactionBlocked(player, target)
      ));
      if (friendlyInShardRadius) {
        throw new ApiError(409, "味方が瓶の破片範囲内にいるためBOTは投擲を保留します。");
      }
    }
    // Radioactive containers create a persistent poison field on landing.  The
    // former Bot planner could select Plutonium at close range, keep chasing its
    // target during flight, and poison-kill its own authoritative owner. Human
    // throws retain their intentional self-risk; Bots reject before item/effect
    // ownership when their resolved landing lacks a safe owner position.
    if (player.isBot && TOXIC_THROW_ITEM_IDS.has(itemId) && !botToxicThrowLandingIsSafe(room, player, landing, rawHoldMs)) {
      throw new ApiError(409, "BOTは自分が毒性着地点へ入るため放射性容器の投擲を保留します。");
    }
    // A rigid sword resolves against the first physical body it reaches, not
    // merely the Bot's intended enemy. Reject before any transaction ownership.
    if (player.isBot && itemId === "orichalcum-sword") {
      const requestedDx = landing.x - player.x;
      const requestedDy = landing.y - player.y;
      const intendedPath = resolveVectorAttackPath(room, player, requestedDx, requestedDy, Math.hypot(requestedDx, requestedDy), { collisionRadius: 2 });
      const collision = rigidThrownCollision(room, {
        ownerId: player.id, x: player.x, y: player.y,
        targetX: intendedPath.x, targetY: intendedPath.y
      });
      if (botFriendlyTransactionBlocked(player, collision?.target)) {
        throw new ApiError(409, "味方が投擲経路上にいるためBOTは投擲を保留します。");
      }
    }
    const power = resolveHeldPowerMode(room, player, rawHoldMs, ITEM_DEFINITIONS[itemId].label, {
      kind: "throw",
      itemId,
      chargeId,
      gboEligible: itemId === "orichalcum-sword"
    });
    if (landing.distance > 700) markSoloMissionAction(room, player, "clairvoyance");
    const durableInstances = takeDurableWeaponInstances(player, itemId, 1);
    consumeItem(player, itemId);
    queueThrownItem(room, player, itemId, { id: itemId, label: ITEM_DEFINITIONS[itemId].label, kind: "item", amount: 1, durableInstances }, landing, power);
    if (player.isBot && TOXIC_THROW_ITEM_IDS.has(itemId)) {
      // The accepted safe landing has no movement escape owner. Keep the Bot at
      // its verified-safe source position until its own poison field expires.
      holdBotOutsideOwnToxicField(player, landing, itemThrowFlightDuration(landing.distance));
    }
  });
}

function throwOwnedItem(room, player, itemId, rawHoldMs = 0, targetX = Number.NaN, targetY = Number.NaN, chargeId = "") {
  return withHeldEnhanceActivation(room, player, () => {
    if (ITEM_DEFINITIONS[itemId]) return throwInventoryItem(room, player, itemId, rawHoldMs, targetX, targetY, chargeId);
    if (INSTANT_ITEM_DEFINITIONS[itemId]) throw new ApiError(400, `${INSTANT_ITEM_DEFINITIONS[itemId].label}は即席のため投擲できません。`);
    if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) throw new ApiError(403, "現在は投擲できません。");
    ensureAbilityAvailable(player);
    ensureItemStorageAvailable(player);
    const owned = transferableItemsFor(player).find((entry) => entry.id === itemId);
    const label = TRANSFERABLE_CHARGES[itemId]?.label || owned?.label || "アイテム";
    if (!owned && !TRANSFERABLE_CHARGES[itemId]) throw new ApiError(400, "その武具を所持していません。");
    const landing = safeThrowPoint(room, player, targetX, targetY);
    if (player.gunFiring && player.gunnerBurstGbo && itemId === "weapon:" + player.gunFiringWeapon) throw new ApiError(400, "GBO射撃中の武器は投擲できません。");
    const power = resolveHeldPowerMode(room, player, rawHoldMs, label, {
      kind: "throw",
      itemId,
      chargeId,
      gboEligible: isGboEligibleItemId(itemId)
    });

    if (landing.distance > 700) markSoloMissionAction(room, player, "clairvoyance");
    const item = removeTransferableItem(room, player, itemId, 1);
    queueThrownItem(room, player, itemId, item, landing, power);
  });
}

function useInventoryItem(room, player, itemId, rawHoldMs = 0, chargeId = "") {
  return withHeldEnhanceActivation(room, player, () => {
    if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) throw new ApiError(403, "現在は使用できません。");
    ensureAbilityAvailable(player);
    ensureItemStorageAvailable(player);
    const definition = ITEM_DEFINITIONS[itemId];
    if (!definition) throw new ApiError(400, "使用対象が不正です。");
    if (definition.usable === false) throw new ApiError(400, `${definition.label}は通常使用できません。`);
    if (itemCount(player, itemId) < 1) throw new ApiError(400, `${definition.label}を所持していません。`);
    if (itemId === "orichalcum-sword" && Number(player.stamina) < FIGHTER_SLASH_STAMINA_COST) throw new ApiError(400, "斬るためのスタミナが不足しています。");
    const power = resolveHeldPowerMode(room, player, rawHoldMs, definition.label, {
      kind: "use",
      itemId,
      chargeId,
      gboEligible: itemId === "orichalcum-sword"
    });
    const level = power.enhanceLevel;
    if (itemId === "orichalcum-sword") {
      return fighterSlash(room, player, "", true, power);
    }
    consumeItem(player, itemId);
    if (itemId === "mineral-water") {
      useMineralWater(room, player, player, level, false);
    } else if (itemId === "seawater") {
      clearBurning(room, player, "海水");
      setImmediateFeedback(player, "海水", "燃焼解除");
    } else if (itemId === "antidote") {
      useAntidote(room, player, player, level, false);
    } else if (["mercury", "lead", "uranium", "plutonium"].includes(itemId)) {
      const strength = {
        mercury: 1.15,
        lead: 0.95,
        uranium: 1.55,
        plutonium: 1.9
      }[itemId] + level * 0.35;
      const applied = applyPersistentStatus(room, player, player, "poison", strength, now(), { ignorePreparationBarrier: true });
      if (applied) setImmediateFeedback(player, "有害物質曝露", `${definition.label} / 毒強度${strength.toFixed(2)}`);
    } else if (itemId === "molotov" || itemId === "heated-water") {
      const strength = 1 + level * 0.4;
      const applied = applyPersistentStatus(room, player, player, "burn", strength, now(), { ignorePreparationBarrier: true });
      if (applied) setImmediateFeedback(player, "燃焼", `${definition.label} / 燃焼強度${strength.toFixed(2)}`);
    } else if (itemId === "ice") {
      const damage = Math.min(1.75, 0.65 + level * 0.22);
      const damageResult = settleDurableBodyDamage(room, player, player, damage, "氷結水の直接使用", {attackKind: "ice-self-use"});
      const timestamp = now();
      if (!rejectAdverseStatusDuringNaturalRecovery(room, player, "低温減速", timestamp)) {
        player.taserSlowedUntil = Math.max(Number(player.taserSlowedUntil) || 0, timestamp + 5_000 + level * 1_000);
      }
      const lethal = player.bodyHits >= 2;
      pushHitEffect(room, player, "body", lethal);

      setImmediateFeedback(player, "低温障害", `${damage.toFixed(2)}ダメージ`);
    } else {
      throw new ApiError(400, "この所持品は通常使用できません。");
    }
    pushMagicEffect(room, "action-item-use", player, { radius: 90, playerId: player.id, variant: itemId });
    pushEvent(room, `${player.name} が${definition.label}を使用しました${level ? "（エンハンス）" : ""}。`);
    checkWin(room);
    touch(room);
  });
}

function useOwnedItem(room, player, itemId, rawHoldMs = 0, chargeId = "") {
  if (ITEM_DEFINITIONS[itemId]) return useInventoryItem(room, player, itemId, rawHoldMs, chargeId);
  if (itemId === "fire-jutsu") return useFireJutsu(room, player, rawHoldMs, chargeId);
  if (itemId === "instant-warp") throw new ApiError(400, "テレポートマップスクロールは即席です。拡大マップからテレポート権利を行使してください。");
  if (["substitution", "stand-firm", "push", "iai"].includes(itemId)) {
    throw new ApiError(400, "このアイテムは条件成立時に自動発動します。");
  }
  if (itemId.startsWith("weapon:")) {
    switchGunnerWeapon(room, player, itemId.slice(7));
    return;
  }
  throw new ApiError(400, "この所持品は専用操作から使用してください。");
}

function normalizeQuantumMode(rawMode) {
  const mode = String(rawMode || "nuclear-transmutation");
  return {
    "transmute-mercury": "nuclear-transmutation",
    "transmute-lead": "nuclear-transmutation",
    "cool-water": "kinetic-decelerate",
    "heat-water": "kinetic-accelerate",
    "fission-uranium": "nuclear-fission",
    "fission-plutonium": "nuclear-fission",
    "fusion-seawater": "nuclear-fusion"
  }[mode] || mode;
}

function firstHeldQuantumItem(player, itemIds) {
  return itemIds.find((itemId) => itemCount(player, itemId) > 0) || "";
}

function quantumEndgameAvailable(room, timestamp = now()) {
  const unlockAt = Number(room?.quantumEndgameAt) || 0;
  return Boolean(room?.phase === "playing" && unlockAt > 0 && Number(timestamp) >= unlockAt);
}

function executeQuantumGlobalNuclearEffect(room, player, mode, itemId) {
  const fusion = mode === "nuclear-fusion";
  const label = fusion ? "核融合" : "核分裂";
  const attackLabel = fusion ? "核融合連鎖" : "核分裂連鎖";
  consumeItem(player, itemId);
  spendMana(room, player, QUANTUM_NUCLEAR_MANA_COST, label);
  const targets = [...room.players.values()].filter((target) => target.id !== player.id && target.alive && !target.ejected && !target.exiled);
  for (const target of targets) destroyPlayerUnconditionally(room, player, target, attackLabel, {
    attackType: "kill",
    attackKind: mode,
    attackLabel,
    slashGuardPhysical: false,
    slashGuardReflectable: false,
    reflectDestroy: true
  });
  pushMagicEffect(room, fusion ? "quantum-nuclear-fusion" : "quantum-nuclear", player, {
    radius: Math.max(getMap(room).width, getMap(room).height),
    playerId: player.id,
    variant: itemId
  });
  checkWin(room);
  if (room.phase !== "ended" && !player.exiled) destroyPlayerUnconditionally(room, player, player, `${label}の代償`);
  pushEvent(room, fusion
    ? `${player.name} が重水素を含む${ITEM_DEFINITIONS[itemId].label}で核融合連鎖を開始しました。`
    : `${player.name} が${ITEM_DEFINITIONS[itemId].label}へ中性子を作用させ、核分裂の連鎖を開始しました。`);
}

function findQuantumElectricTarget(room, player, timestamp = now()) {
  return [...room.players.values()]
    .filter((target) =>
      target.id !== player.id &&
      target.alive &&
      !target.ejected &&
      !target.exiled &&
      !target.inVent &&
      target.role !== player.role &&
      ["defender", "attacker"].includes(target.role) &&
      !floraInvisibleActive(target, timestamp)
    )
    .map((target) => ({ target, separation: distance(player, target) }))
    .filter(({ target }) => {
      const { dx, dy } = finiteDirection(target.x - player.x, target.y - player.y, 0, 1);
      return clearShotPath(room, player, target, dx, dy);
    })
    .sort((left, right) => left.separation - right.separation || String(left.target.id).localeCompare(String(right.target.id)))[0]?.target || null;
}

function quantumElectricSettlementBlockReason(room, target, timestamp = now()) {
  if (!target?.alive || target.ejected || target.exiled || target.inVent) return "invalidTarget";
  const detachedGboGuard = Number(target.slashDetachedGuardUntil) > timestamp;
  const universalPerfectGuard =
    (hasOrichalcumSword(target) || detachedGboGuard) &&
    Number(target.slashActiveUntil) > timestamp &&
    Number(target.slashPerfectUntil) > timestamp &&
    hasFighterApexPerks(target);
  if (universalPerfectGuard) return "slashPerfectGuarded";
  if (activeGravityStormBarrier(room, target, timestamp)) return "preparationBarrier";
  if (hasFighterInfiniteResources(target) && !target.limitBreakActive) return "infiniteResources";
  if (Number(target.dodgeActiveUntil) > timestamp) return "dodged";
  if (Number(target.overheal) > 0) return "overheal";
  const nextBodyHits = Math.round((Math.max(0, Number(target.bodyHits) || 0) + QUANTUM_ELECTRIC_DAMAGE) * 100) / 100;
  if (nextBodyHits >= 2) return "nonlethalLimit";
  return "";
}

function resolveQuantumElectricDischarge(room, player, target, timestamp = now()) {
  const targetBodyHitsBefore = Math.max(0, Number(target.bodyHits) || 0);
  const nextBodyHits = Math.round((targetBodyHitsBefore + QUANTUM_ELECTRIC_DAMAGE) * 100) / 100;
  if (nextBodyHits >= 2) throw new Error("Quantum Electric exact settlement crossed the nonlethal boundary after preflight.");
  const damageResult = settleDurableBodyDamage(room, player, target, QUANTUM_ELECTRIC_DAMAGE, "クオンタム・エレクトリック", {timestamp, attackKind: "quantum-electric-discharge"});
  if (damageResult.absorbed || damageResult.killed) return damageResult.killed ? "lethal" : damageResult.defense;
  pushHitEffect(room, target, "body", false);
  pushEvent(room, `${target.name} が${QUANTUM_ELECTRIC_DAMAGE.toFixed(2)}ダメージを受けました（残りHP ${(2 - nextBodyHits).toFixed(2)}）。`);
  resolveBustForNormalBodyAttack(room, player, target, {
    attackKind: "quantum-electric-discharge",
    attackLabel: "クオンタム・エレクトリック",
    slashGuardPhysical: false
  }, timestamp);
  target.quantumElectricSlowUntil = Math.max(Number(target.quantumElectricSlowUntil) || 0, timestamp + QUANTUM_ELECTRIC_SLOW_MS);
  const slowApplied = true;
  const outcome = "body";
  pushEvent(room, `${target.name} は電子輸送の衝撃で3秒間移動速度が35%低下します。`);
  pushMagicEffect(room, "quantum-electric-discharge", player, {
    radius: 108,
    targetX: target.x,
    targetY: target.y,
    playerId: player.id,
    targetId: target.id,
    variant: slowApplied ? "dielectric-breakdown:slow" : `dielectric-breakdown:${outcome}`,
    durationMs: 1050
  });
  player.quantumElectricLastTargetId = target.id;
  player.quantumElectricLastOutcome = outcome;
  player.quantumElectricLastDamage = Math.max(0, Math.round((Math.max(0, Number(target.bodyHits) || 0) - targetBodyHitsBefore) * 100) / 100);
  player.quantumElectricLastAt = timestamp;
  setImmediateFeedback(player, "エレクトリック", `${target.name} / 絶縁破壊→電子輸送 / ${outcome}`);
  pushEvent(room, `${player.name} が空気を局所絶縁破壊し、${target.name} へ一条の電子輸送路を形成しました。`);
  touch(room);
  return outcome;
}

function useQuantumControl(room, player, rawMode) {
  if (room.phase !== "playing" || !hasOperatorAccess(player, "quantum") || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "クオンタムを使用できません。");
  }
  const mode = normalizeQuantumMode(rawMode || player.quantumMode || "nuclear-transmutation");
  if (!["kinetic-accelerate", "kinetic-decelerate", "nuclear-transmutation", "nuclear-fission", "nuclear-fusion", "electric-discharge"].includes(mode)) {
    throw new ApiError(400, "クオンタム方式が不正です。");
  }
  const timestamp = now();
  const electricTarget = mode === "electric-discharge" ? findQuantumElectricTarget(room, player, timestamp) : null;
  if (mode === "electric-discharge" && !electricTarget) return false;
  if (mode === "electric-discharge" && quantumElectricSettlementBlockReason(room, electricTarget, timestamp)) return false;
  const itemId = mode === "electric-discharge"
    ? ""
    : mode === "nuclear-transmutation"
    ? firstHeldQuantumItem(player, ["lead", "mercury"])
    : mode === "nuclear-fission"
      ? firstHeldQuantumItem(player, ["uranium", "plutonium"])
      : mode === "nuclear-fusion"
        ? firstHeldQuantumItem(player, ["seawater"])
      : firstHeldQuantumItem(player, ["mineral-water", "seawater"]);
  // A Quantum activation without a compatible held item is a strict silent
  // no-op. This check must precede availability/cost checks and every effect.
  if (mode !== "electric-discharge" && !itemId) return false;
  player.quantumMode = mode;
  const nuclearMode = mode === "nuclear-fission" || mode === "nuclear-fusion";
  if (nuclearMode && !quantumEndgameAvailable(room, now())) {
    const secondsLeft = Math.max(1, Math.ceil((Number(room.quantumEndgameAt) - now()) / 1000));
    throw new ApiError(400, `${mode === "nuclear-fusion" ? "核融合" : "核分裂"}は終盤まで使用できません（残り${secondsLeft}秒）。`);
  }
  ensureAbilityAvailable(player);
  if (mode === "electric-discharge" && !canSpendQuantumElectricResources(player)) {
    throw new ApiError(400, `エレクトリック（${QUANTUM_ELECTRIC_MANA_COST}MP / ${QUANTUM_ACTION_STAMINA_COST}SP）には同量の資源が必要です。`);
  }
  if (mode !== "electric-discharge" && Number(player.stamina) < QUANTUM_ACTION_STAMINA_COST) throw new ApiError(400, `クオンタムには${QUANTUM_ACTION_STAMINA_COST}SPが必要です。`);
  if (nuclearMode && Number(player.mana) < QUANTUM_NUCLEAR_MANA_COST) {
    throw new ApiError(400, `${mode === "nuclear-fusion" ? "核融合" : "核分裂"}（${isHackerOperator(player) ? 0 : QUANTUM_NUCLEAR_MANA_COST}MP / 発動には${QUANTUM_NUCLEAR_MANA_COST}MP保有）を使用できません。`);
  }
  if (mode === "electric-discharge") {
    spendQuantumElectricResources(room, player);
    player.quantumElectricLastManaSpent = QUANTUM_ELECTRIC_MANA_COST;
    player.quantumElectricLastStaminaSpent = QUANTUM_ACTION_STAMINA_COST;
    resolveQuantumElectricDischarge(room, player, electricTarget, timestamp);
  } else if (mode === "nuclear-transmutation") {
    spendStamina(player, QUANTUM_ACTION_STAMINA_COST, room, "クオンタム");
    consumeItem(player, itemId);
    const credits = acquireGoldAsCredits(room, player, `quantum-gold:${itemId}`);
    pushMagicEffect(room, "quantum-transmutation", player, {
      radius: 150,
      playerId: player.id,
      variant: itemId,
      durationMs: 3600
    });
    pushEvent(room, `${player.name} が${ITEM_DEFINITIONS[itemId].label}を金へ核変換し、${credits}Cへ自動換金しました。`);
  } else if (mode === "kinetic-decelerate" || mode === "kinetic-accelerate") {
    spendStamina(player, QUANTUM_ACTION_STAMINA_COST, room, "クオンタム");
    consumeItem(player, itemId);
    const output = mode === "kinetic-decelerate" ? "ice" : "heated-water";
    addItem(player, output);
    pushMagicEffect(room, mode === "kinetic-decelerate" ? "quantum-temperature-cold" : "quantum-temperature-hot", player, {
      radius: 135,
      playerId: player.id,
      variant: output
    });
    pushEvent(room, `${player.name} が${ITEM_DEFINITIONS[itemId].label}の運動エネルギーを${mode === "kinetic-decelerate" ? "減速させて氷結水" : "加速させて高温水"}を生成しました。`);
  } else if (nuclearMode) {
    spendStamina(player, QUANTUM_ACTION_STAMINA_COST, room, "クオンタム");
    executeQuantumGlobalNuclearEffect(room, player, mode, itemId);
  }
  checkWin(room);
  touch(room);
  return true;
}

function advanceHazards(room, timestamp = now()) {
  room.hazardFields = (room.hazardFields || []).filter((field) => Number(field.endsAt) > timestamp);
  for (const field of room.hazardFields) {
    if (Number(field.nextTickAt) > timestamp) continue;
    field.nextTickAt = timestamp + HAZARD_TICK_MS;
    const source = room.players.get(field.sourceId) || null;
    for (const target of room.players.values()) {
      if (!target.alive || target.ejected || distance(field, target) > field.radius || (field.excludeSource && target.id === field.sourceId)) continue;
      if (field.kind === "water") clearBurning(room, target, "散水");
      else applyPersistentStatus(room, source, target, field.kind, field.strength, timestamp);
    }
  }
  recordBotVisiblePoisonPresentations(room, timestamp);
  for (const target of room.players.values()) {
    maintainNaturalRecovery(room, target, timestamp);
    for (const [field, kind, baseDamage] of [["poisonStatus", "毒", POISON_DAMAGE_PER_TICK], ["burnStatus", "燃焼", BURN_DAMAGE_PER_TICK]]) {
      // At the maximum current actor scale (ACC18) a bounded 250 ms room tick
      // can legitimately cross five one-second status pulses. Preserve that
      // cadence rather than collapsing it into one pulse; eight is above the
      // reachable maximum and prevents malformed legacy timestamps looping.
      for (let pulses = 0; pulses < 8; pulses += 1) {
        const status = target[field];
        if (!status || !target.alive || target.ejected || Number(status.nextTickAt) > timestamp) break;
        const source = room.players.get(status.sourceId) || null;
        // Revalidate delayed Bot damage against the current room faction before
        // advancing its timer or mutating the recipient.
        if (botFriendlyTransactionBlocked(source, target)) {
          target[field] = null;
          break;
        }
        status.nextTickAt = Number(status.nextTickAt) + HAZARD_TICK_MS;
        const damage = baseDamage * Math.max(0.25, Number(status.strength) || 1);
        if (resolveFighterSlashGuard(room, source, target, {
          kind: field === "poisonStatus" ? "poison" : "burn",
          label: kind,
          physical: false,
          reflectable: false,
          damage,
          hitZone: "body"
        }, timestamp)) continue;
        if (absorbPreparationBarrier(room, target, timestamp, source)) continue;
        const damageResult = settleDurableBodyDamage(room, source, target, damage, kind, {timestamp, attackKind: field === "poisonStatus" ? "poison" : "burn", noDirectionalReaction: true});
        if (damageResult.killed) target[field] = null;
        else if (!damageResult.absorbed) setImmediateFeedback(target, kind, damage.toFixed(2) + "継続ダメージ");
      }
    }
  }
}

function useFireJutsu(room, player, rawHoldMs = 0, chargeId = "") {
  return withHeldEnhanceActivation(room, player, () => {
    if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
      throw new ApiError(403, "現在はファイアを使用できません。");
    }
    ensureAbilityAvailable(player);
    ensureItemStorageAvailable(player);
    if (player.fireJutsuCharges <= 0) throw new ApiError(400, "ファイアを所持していません。");
    const enhance = resolveEnhance(room, player, rawHoldMs, "ファイア", {
      kind: String(player.enhanceChargeKind || "fire"),
      itemId: "fire-jutsu",
      chargeId,
      gboEligible: false
    });
    const radius = FIRE_JUTSU_RADIUS + enhance * 75;
    const origin = { x: player.x, y: player.y, id: player.id };
    player.fireJutsuCharges -= 1;
    const fireCausalId = `fire:${uid("cast_")}`;
    pushMagicEffect(room, "fire", origin, { radius, playerId: player.id,
      variant: String(enhance), fireCausalId });
    if (room.magicEffects.some(effect => effect.type === "fire" &&
      effect.fireCausalId === fireCausalId)) {
      pushSound(room, "fireJutsu", origin, {
        ownerId: player.id,
        sourceKind: "magic",
        maxDistance: 2200,
        volume: 1,
        fireCausalId
      });
    }

    const fireField = addHazardField(room, player, "fire", origin.x, origin.y, radius, 1 + enhance * 0.35);
    fireField.excludeSource = true;
    pushEvent(room, `${player.name} がファイアを使用し、熱放出と浮力対流による燃焼領域を展開しました${enhance ? "（エンハンス）" : ""}。`);
    checkWin(room);
    touch(room);
  });
}

function useTeleportMapScroll(room, player, rawX, rawY) {
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在はテレポートできません。");
  }
  ensureAbilityAvailable(player);
  if (player.warpCharges <= 0) throw new ApiError(400, "テレポート可能回数がありません。");
  const destination = resolveExpandedMapTeleportDestination(room, rawX, rawY);
  const origin = moveByExpandedMapTeleport(player, destination);
  player.warpCharges -= 1;
  pushMagicEffect(room, "action-warp", origin, {
    radius: 125,
    playerId: player.id,
    targetX: destination.x,
    targetY: destination.y
  });
  pushMagicEffect(room, "action-warp", player, {
    radius: 125,
    playerId: player.id,
    variant: "arrival"
  });
  pushEvent(room, `${player.name} がテレポートマップスクロールの権利を行使しました。`);
  touch(room);
}

// Clairvoyance is a view/input state, never a client-authoritative movement
// permission. A committed tap reuses the normal Gravity or Scroll action
// routes and clears Clairvoyance only after that route has moved the player.
function teleportFromClairvoyance(room, player, rawX, rawY) {
  if (!player.clairvoyanceActive) throw new ApiError(403, "千里眼中のみ地点転移できます。");
  if (hasOperatorAccess(player, "gravity")) {
    teleportPlayer(room, player, rawX, rawY, "", "body");
  } else {
    useTeleportMapScroll(room, player, rawX, rawY);
  }
  setClairvoyanceActive(room, player, false);
  touch(room);
}

function healFlora(room, player) {
  if (room.phase !== "playing" || !hasOperatorAccess(player, "flora")) {
    throw new ApiError(403, "フローラだけがヒールを使用できます。");
  }
  if (!player.alive || player.ejected || player.inVent) throw new ApiError(403, "現在はヒールを使用できません。");
  ensureAbilityAvailable(player);
  const timestamp = now();
  spendOperatorMana(room, player, "ヒール");
  const healthBefore = healthCapacityFor(player);
  const recovery = recoverHealth(player, Math.max(1, Math.max(0, Number(player.bodyHits) || 0)));
  clearAdverseStatuses(room, player, "ヒール", timestamp);
  grantStamina(room, player, MAX_STAMINA, "ヒール", timestamp, { floorAtZero: true });
  addTimedAcceleration(player, "flora", FLORA_SPEED_MULTIPLIER, FLORA_SPEED_DURATION_MS, timestamp);
  setImmediateFeedback(player, "ヒール", `自分 / HP回復 / SP+${MAX_STAMINA} / 状態解除 / 加速`);
  pushMagicEffect(room, "flora", player, { radius: FLORA_SELF_EFFECT_RADIUS, playerId: player.id, durationMs: FLORA_SPEED_DURATION_MS });
  pushGainAte(room, player, "heal", { variant: "flora" });
  if (recovery.maxHealth > healthBefore) pushGainAte(room, player, "overheal", { variant: "flora" });
  pushGainAte(room, player, "stamina", { variant: "flora", durationMs: 1620 });
  pushGainAte(room, player, "statusRecovery", { variant: "flora", durationMs: 1740 });
  pushGainAte(room, player, "acceleration", { variant: "flora", durationMs: 1860 });
  pushEvent(room, `${player.name} がヒールを発動し、自分へ回復・スタミナ・状態解除・加速を付与しました。`);
  touch(room);
}

function floraSunbeam(room, player, targetId = "", direction = {}) {
  if (room.phase !== "playing" || !hasOperatorAccess(player, "flora") || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在はサンビームを使用できません。");
  }
  ensureAbilityAvailable(player);
  const trackedCandidate = room.players.get(String(targetId || ""));
  const tracked = trackedCandidate &&
    trackedCandidate.id !== player.id &&
    trackedCandidate.alive &&
    !trackedCandidate.ejected &&
    !floraInvisibleActive(trackedCandidate)
      ? trackedCandidate
      : null;
  let dx = Number(direction.dx);
  let dy = Number(direction.dy);
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) < 0.01) {
    dx = Number(player.aimX) || 0;
    dy = Number(player.aimY) || 1;
  }
  if (tracked?.alive && !tracked.ejected) {
    dx = tracked.x - player.x;
    dy = tracked.y - player.y;
  }
  const length = Math.hypot(dx, dy) || 1;
  dx /= length;
  dy /= length;
  const sunbeamPath = resolveVectorAttackPath(room, player, dx, dy, SUNBEAM_RANGE, { collisionRadius: 2 });
  const variantIndex = Math.abs(Math.floor((player.x + player.y) / 180)) % 3;
  const opticalVariant = ["refraction", "scattering", "diffraction"][variantIndex];
  const candidates = [...room.players.values()]
    .filter((target) => target.id !== player.id && target.alive && !target.ejected)
    .map((target) => {
      const rx = target.x - player.x;
      const ry = target.y - player.y;
      return { target, along: rx * dx + ry * dy, perpendicular: Math.abs(rx * dy - ry * dx) };
    })
    .filter((entry) => entry.along > 0 && entry.along <= sunbeamPath.distance + 0.5 && entry.perpendicular <= SUNBEAM_WIDTH)
    .sort((a, b) => a.along - b.along);
  // One canonical Sunbeam combines target-directed convergence with full-ray
  // piercing. Every valid body intersecting the ray receives its own
  // independent guard, barrier, dodge, and certain-kill resolution.
  const selected = candidates;
  // A full piercing Bot ray is one transaction: an ally in its actual
  // wall-clipped corridor rejects it before MP, evidence or presentation.
  if (player.isBot && selected.some((entry) => botFriendlyTransactionBlocked(player, entry.target))) {
    throw new ApiError(409, "味方がサンビーム経路上にいるためBOTは発動を保留します。");
  }
  spendOperatorMana(room, player, "サンビーム", FLORA_SUNBEAM_MANA_COST);
  recordBotVisibleHumanAttackStart(room, player, "flora-sunbeam");
  let hits = 0;
  for (const entry of selected) {
    if (!player.alive || player.ejected || !entry.target?.alive || entry.target.ejected) break;
    killPlayer(room, player, entry.target.id, {
      ranged: true,
      hitZone: "head",
      damage: 1,
      ignoreRange: true,
      allowAnyKiller: true,
      targetRole: entry.target.role,
      magic: true,
      attackKind: "sunbeam",
      attackLabel: "サンビーム",
      slashGuardPhysical: false
    });
    hits += 1;
  }
  const end = { x: sunbeamPath.x, y: sunbeamPath.y };
  const sunbeamCausalId = `sunbeam:${uid("cast_")}`;
  pushMagicEffect(room, "flora-sunbeam", player, {
    radius: SUNBEAM_WIDTH * 2,
    targetX: end.x,
    targetY: end.y,
    playerId: player.id,
    variant: `${opticalVariant}:piercing`,
    sunbeamCausalId
  });
  pushSound(room, "sunbeam", player, { ownerId: player.id, sourceKind: "magic", maxDistance: 2100, volume: 0.9, sunbeamCausalId });
  pushEvent(room, `${player.name} がサンビームを発動しました（${opticalVariant}・判定${hits}人）。`);
  checkWin(room);
  touch(room);
}

function floraInvisibleActive(player, timestamp = now()) {
  return Boolean(
    player?.alive &&
    !player.ejected &&
    Number(player.floraInvisibleUntil) > timestamp
  );
}

function clearFloraInvisible(room, player, reason = "") {
  if (!player || !Number(player.floraInvisibleUntil)) return false;
  player.floraInvisibleUntil = 0;
  if (reason) setImmediateFeedback(player, "インビジブル", reason);
  return true;
}

// Concealment must remove existing AI contacts as well as reject future target
// acquisition.  Otherwise a bot could retain a remembered coordinate and
// continue an ordinary-sight kill route after the body has disappeared.
function clearBotsTrackingFloraInvisible(room, player) {
  for (const bot of room.players.values()) {
    if (!bot.isBot || bot.id === player.id) continue;
    if (bot.botTarget?.id === player.id) {
      bot.botTarget = null;
      bot.botTargetUntil = 0;
    }
    if (String(bot.botCombatPlanTargetId || "") === player.id) {
      bot.botCombatPlan = "";
      bot.botCombatPlanTargetId = "";
      bot.botCombatPlanUpdatedAt = 0;
    }
    if (String(bot.botRetaliationTargetId || "") === player.id) {
      bot.botRetaliationTargetId = "";
      bot.botRetaliationUntil = 0;
    }
    if (String(bot.botWitnessTargetId || "") === player.id) {
      bot.botWitnessTargetId = "";
      bot.botWitnessUntil = 0;
      bot.botWitnessEvidenceKind = "";
    }
    if (String(bot.botClairvoyanceTargetId || "") === player.id) clearBotClairvoyanceContact(bot);
    bot.navPath = [];
  }
}

function useFloraInvisible(room, player) {
  if (room.phase !== "playing" || !hasOperatorAccess(player, "flora") || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在はインビジブルを使用できません。");
  }
  ensureAbilityAvailable(player);
  const timestamp = now();
  if (floraInvisibleActive(player, timestamp)) throw new ApiError(400, "インビジブルは既に発動中です。");
  spendOperatorMana(room, player, "インビジブル", FLORA_INVISIBLE_MANA_COST);
  player.floraInvisibleUntil = timestamp + FLORA_INVISIBLE_DURATION_MS;
  player.floraMode = "invisible";
  clearBotsTrackingFloraInvisible(room, player);
  setImmediateFeedback(player, "インビジブル", "10秒間透明化 / 敵Botの直接視認対象外");
  pushMagicEffect(room, "flora-invisible", player, {
    radius: 120,
    playerId: player.id,
    viewerId: player.id,
    durationMs: 1_600
  });
  pushEvent(room, `${player.name} がインビジブルを発動しました。`);
  touch(room);
}

function useFloraAbility(room, player, mode, options = {}) {
  const selected = ["sunbeam", "invisible"].includes(mode) ? mode : "heal";
  player.floraMode = selected;
  if (selected === "sunbeam") {
    floraSunbeam(room, player, String(options.targetId || ""), {
      dx: options.dx,
      dy: options.dy
    });
  } else if (selected === "invisible") {
    useFloraInvisible(room, player);
  } else healFlora(room, player);
}

const ALCHEMY_RECIPE_IMPLEMENTATIONS = {
  "orichalcum-sword": { label: "オリハルコン・ソード", cost: 0, apply: (_room, player) => addItem(player, "orichalcum-sword") },
  stamina: { label: "スタミナ", cost: 1, apply: (room, player) => { const timestamp = now(); grantStamina(room, player, 350, "バイブコーディング", timestamp, { floorAtZero: true }); pushInstantItemAcquisitionAte(room, player, "stamina", "hacker"); } },
  heal: { label: "回復", cost: 1, apply: (room, player) => { recoverHealth(player, Math.max(1, Math.max(0, Number(player.bodyHits) || 0))); pushInstantItemAcquisitionAte(room, player, "heal", "hacker"); } },
  fire: { label: "ファイア", cost: 1, apply: (room, player) => { player.fireJutsuCharges += 1; pushInstantItemAcquisitionAte(room, player, "fire", "hacker"); } },
  protect: { label: "プロテクト", cost: 1, apply: (room, player) => grantProtectItem(room, player) },
  warp: { label: "テレポートマップスクロール", cost: 1, apply: (room, player) => { player.warpCharges += 1; pushInstantItemAcquisitionAte(room, player, "warp", "hacker"); } },
  mercury: { label: "水銀瓶", cost: 0, apply: (_room, player) => addItem(player, "mercury") },
  lead: { label: "鉛瓶", cost: 0, apply: (_room, player) => addItem(player, "lead") },
  uranium: { label: "ウラン容器", cost: 0, apply: (_room, player) => addItem(player, "uranium") },
  plutonium: { label: "プルトニウム容器", cost: 0, apply: (_room, player) => addItem(player, "plutonium") },
  "mineral-water": { label: "ミネラルウォーター", cost: 0, apply: (_room, player) => addItem(player, "mineral-water") },
  seawater: { label: "海水", cost: 0, apply: (_room, player) => addItem(player, "seawater") },
  antidote: { label: "解毒剤", cost: 0, apply: (_room, player) => addItem(player, "antidote") },
  molotov: { label: "火炎瓶", cost: 0, apply: (_room, player) => addItem(player, "molotov") },
  "frag-grenade": { label: "フラググレネード", cost: 0, apply: (_room, player) => addItem(player, "frag-grenade") },
  "stun-grenade": { label: "スタングレネード", cost: 0, apply: (_room, player) => addItem(player, "stun-grenade") },
  iai: { label: "居合", cost: 1, apply: (room, player) => grantIaiCharge(room, player, false, "hacker") },
  "vending-evade": { label: "回避拡張", cost: 0, apply: (room, player) => { player.dodgeDurationBonusMs = Math.min(1500, player.dodgeDurationBonusMs + 250); pushInstantItemAcquisitionAte(room, player, "evade", "hacker"); } },
  "vending-speed": { label: "アクセラレート飲料", cost: 0, apply: (room, player) => { player.speedMultiplier = Math.round((player.speedMultiplier + 0.15) * 100) / 100; pushInstantItemAcquisitionAte(room, player, "speed", "hacker"); } },
  "vending-mystery": { label: "ミステリー", cost: 0, apply: (room, player) => { const result = applyMysteryDrink(room, player); pushInstantItemAcquisitionAte(room, player, "mystery", `hacker:${result}`); } },
  "vending-mana": { label: "マナポーション", cost: 0, apply: (room, player) => { setMana(room, player, (Number(player.mana) || 0) + 1, "バイブコーディング"); pushInstantItemAcquisitionAte(room, player, "mana", "hacker"); } },
  "vending-railgun": { label: "レールガン", cost: 0, apply: (_room, player) => { if (!player.inventions.includes("railgun")) player.inventions.push("railgun"); } },
  "vending-particle-cannon": { label: "荷電粒子砲", cost: 0, apply: (_room, player) => { if (!player.inventions.includes("particle-cannon")) player.inventions.push("particle-cannon"); } },
  "vending-excalibur": { label: "エクスカリバー", cost: 0, apply: (_room, player) => { if (!player.inventions.includes("excalibur")) player.inventions.push("excalibur"); } },
  "vending-exile": { label: "亡命", cost: 0, apply: (_room, player) => { player.exiled = true; } },
  "vending-hack": { label: "ハック", cost: 0, apply: (_room, player) => activateHackInstant(player) },
  "vending-handgun": { label: "ハンドガン", cost: 0, apply: (_room, player) => purchaseFirearm(player, "handgun") },
  "vending-smg": { label: "サブマシンガン", cost: 0, apply: (_room, player) => purchaseFirearm(player, "smg") },
  "vending-assault": { label: "アサルトライフル", cost: 0, apply: (_room, player) => purchaseFirearm(player, "assault") },
  "vending-sniper": { label: "スナイパーライフル", cost: 0, apply: (_room, player) => purchaseFirearm(player, "sniper") },
  "vending-taser": { label: "テーザー銃", cost: 0, apply: (_room, player) => purchaseFirearm(player, "taser") },
  "vending-ice": { label: "氷結水", cost: 0, apply: (_room, player) => addItem(player, "ice") },
  "vending-heated-water": { label: "高温水", cost: 0, apply: (_room, player) => addItem(player, "heated-water") },
  gold: { label: "金", cost: 0, apply: (room, player) => { acquireGoldAsCredits(room, player, "hacker-gold"); } },
  "vending-rpg": { label: "RPG", cost: 0, apply: (_room, player) => { (player.heavyWeapons ||= []).push("rpg"); } },
  "vending-missile": { label: "ミサイル", cost: 0, apply: (_room, player) => { (player.heavyWeapons ||= []).push("missile"); } },
  "hack-credits-delete": { label: "クレジット削除", cost: 2, apply: (room, player, targetId) => { hackerTarget(room, player, targetId).credits = 0; } },
  "hack-credits-duplicate": { label: "クレジット増殖", cost: 2, apply: (room, player, targetId) => { const target = hackerTarget(room, player, targetId); target.credits = Math.max(0, Number(target.credits) || 0) * 2 + CREDIT_ECONOMY.hackerDuplicateBonus; } },
  "hack-items-delete": { label: "アイテム削除", cost: 2, apply: (room, player, targetId) => clearHackableInventory(hackerTarget(room, player, targetId)) },
  "hack-items-duplicate": { label: "アイテム増殖", cost: 2, apply: (room, player, targetId) => duplicateHackableInventory(hackerTarget(room, player, targetId)) },
  "hack-hp-delete": { label: "HP削除", cost: 2, apply: (room, player, targetId) => deleteHackerTargetHp(room, player, targetId) },
  "hack-hp-duplicate": { label: "HP増殖", cost: 2, apply: (room, player, targetId) => {
    const target = hackerTarget(room, player, targetId);
    const bodyDamage = Math.max(0, Number(target.bodyHits) || 0);
    const extraNeeded = Math.max(0, 1 - Math.max(0, Number(target.overheal) || 0));
    recoverHealth(target, Math.max(1, bodyDamage + extraNeeded));
  } },
  "hack-mana-delete": { label: "マナ削除", cost: 2, apply: (room, player, targetId) => setMana(room, hackerTarget(room, player, targetId), 0, "バイブコーディング") },
  "hack-mana-duplicate": { label: "マナ増殖", cost: 2, apply: (room, player, targetId) => { const target = hackerTarget(room, player, targetId); setMana(room, target, Math.max(2, Number(target.mana) || 0) * 2, "バイブコーディング"); } },
  "hack-status-recover": { label: "状態異常回復", cost: 0, apply: (room, player, targetId) => recoverHackerTargetStatus(room, player, targetId) },
  revive: { label: "人体生成", cost: 3, apply: (room, player, targetId) => humanTransmutation(room, player, targetId) }
};

// Vending and Vibe Coding use one runtime catalog membership. Only behavior is
// implemented here; identity, label, category, availability and CT are always
// derived from DVA_ECONOMY so a new sellable product cannot disappear from the
// Hacker generator because somebody forgot a second display list.
const HACKER_EXTENSION_RECIPE_IDS = new Set([
  "hack-credits-delete", "hack-credits-duplicate", "hack-items-delete",
  "hack-items-duplicate", "hack-hp-delete", "hack-hp-duplicate", "hack-mana-delete",
  "hack-mana-duplicate", "hack-status-recover", "revive"
]);
const ALCHEMY_RECIPES = Object.fromEntries([
  ...DVA_ECONOMY.products.map((product) => {
    const implementation = ALCHEMY_RECIPE_IMPLEMENTATIONS[product.hackerRecipeId];
    if (!implementation) throw new Error(`Missing Hacker behavior for shared product: ${product.id}`);
    return [product.hackerRecipeId, { ...implementation, label: product.label, productId: product.id }];
  }),
  ...[...HACKER_EXTENSION_RECIPE_IDS].map((id) => {
    const implementation = ALCHEMY_RECIPE_IMPLEMENTATIONS[id];
    if (!implementation) throw new Error(`Missing Hacker extension behavior: ${id}`);
    return [id, implementation];
  })
]);

const ALCHEMY_RECIPE_ALIASES = Object.freeze({
  "instant-warp": "warp",
  "fire-jutsu": "fire",
  "vending-mineral-water": "mineral-water",
  "vending-molotov": "molotov",
  "vending-antidote": "antidote"
});

function canonicalAlchemyConversion(rawConversion) {
  const requested = String(rawConversion || "stamina").trim().toLowerCase();
  return ALCHEMY_RECIPE_ALIASES[requested] || requested;
}

function hackerTarget(room, player, targetId) {
  const target = room.players.get(String(targetId || "")) || [...room.players.values()]
    .filter((candidate) => candidate.id !== player.id && !candidate.ejected)
    .sort((a, b) => distance(player, a) - distance(player, b))[0];
  if (!target || target.ejected) throw new ApiError(404, "バイブコーディング対象がいません。");
  return target;
}

function clearHackableInventory(target) {
  for (const field of ["warpCharges", "fireJutsuCharges", "substitutionCharges", "gritCharges", "reasonCharges", "iaiCharges"]) target[field] = 0;
  target.inventions = [];
  target.itemInventory = {};
}

function duplicateHackableInventory(target) {
  for (const field of ["warpCharges", "fireJutsuCharges", "substitutionCharges", "gritCharges", "reasonCharges", "iaiCharges"]) {
    target[field] = Math.max(0, Number(target[field]) || 0) * 2;
  }
  target.inventions = [...(target.inventions || []), ...(target.inventions || [])];
  for (const itemId of Object.keys(target.itemInventory || {})) {
    target.itemInventory[itemId] = itemCount(target, itemId) * 2;
  }
}

function hasHackableInventory(target, duplicate = false) {
  if (["warpCharges", "fireJutsuCharges", "substitutionCharges", "gritCharges", "reasonCharges", "iaiCharges"]
    .some((field) => Math.max(0, Number(target?.[field]) || 0) > 0)) return true;
  if ((target?.inventions || []).length > 0) return true;
  return Object.keys(target?.itemInventory || {}).some((itemId) =>
    itemCount(target, itemId) > 0);
}

function recoverHackerTargetStatus(room, player, targetId) {
  const target = hackerTarget(room, player, targetId);
  if (!target.alive || target.ejected) throw new ApiError(400, "状態異常を回復できる対象ではありません。");
  const timestamp = now();
  const cleared = clearAdverseStatuses(room, target, "バイブコーディング", timestamp);
  pushMagicEffect(room, "hacker-status-recover", target, {
    radius: 145,
    playerId: player.id,
    targetId: target.id,
    variant: cleared ? "cleared" : "unchanged"
  });
  setImmediateFeedback(target, "状態異常回復", cleared ? "解除完了" : "異常なし");
}

function deleteHackerTargetHp(room, player, targetId) {
  const target = hackerTarget(room, player, targetId);
  if (resolveFighterSlashGuard(room, player, target, {
    kind: "hp-deletion",
    label: "バイブコーディングのHP削除",
    physical: false,
    reflectable: false,
    destroy: true
  })) return false;
  setImmediateFeedback(target, "HP削除", "HPが0になった");
  return destroyPlayerUnconditionally(room, player, target, "バイブコーディング: HP削除", { attackType: "kill", bypassSlashGuard: true });
}

function advanceAlchemyObjects(room, timestamp) {
  room.alchemyObjects ||= [];
}

function shopAbilityProduct(abilityId) {
  return DVA_ECONOMY.abilityProduct(String(abilityId || ""));
}

function ownsShopAbility(player, abilityId) {
  return Boolean(Array.isArray(player?.shopAbilityEntitlements) && player.shopAbilityEntitlements.includes(String(abilityId || "")));
}

function ownsShopAbilityMode(player, operator, mode) {
  return SHOP_ABILITY_PRODUCTS.some((product) => (
    product.operator === operator &&
    product.mode === mode &&
    ownsShopAbility(player, product.id)
  ));
}

function hasShopLimitBreakLifecycle(player) {
  return Boolean(player?.limitBreakActive && ownsShopAbility(player, "fighter-limit-break"));
}

function hasShopGravityTimeLifecycle(player) {
  return Boolean(
    player?.gravityTimeMode &&
    ownsShopAbilityMode(player, "gravity", player.gravityTimeMode)
  );
}

function hasGunnerAimAccess(player) {
  // GUNNER_AIM_OWNED_V731: temporary execution context is not persistent Aim ownership.
  return player?.special === "gunner" || hackerRootEligible(player) || ownsShopAbility(player, "gunner-aim");
}

function hasGunnerSpecialAmmoAccess(player) {
  return hasOperatorAccess(player, "gunner") || ownsShopAbility(player, "gunner-special-ammo");
}

function hasAssassinAnnihilationAccess(player) {
  return player?.special === "assassin" || ownsShopAbility(player, "assassin-annihilation");
}

function hasAssassinSilentStepsAccess(player) {
  return player?.special === "assassin" || ownsShopAbility(player, "assassin-silent-steps");
}

function hasHackerVibeCodingAccess(player) {
  return isHackerOperator(player) || ownsShopAbility(player, "hacker-vibe-coding");
}

function hasHackerRootAccess(player) {
  return isHackerOperator(player) || ownsShopAbility(player, "hacker-root");
}

function hasOperatorAccess(player, type) {
  const nativeSpecial = type === "gravity" ? "teleport" : type;
  return player.special === nativeSpecial || (
    HACKER_ROOT_OPERATOR_TYPES.includes(type) && hackerRootEligible(player)
  ) || player.shopAbilityExecutionOperator === type;
}

function humanTransmutation(room, player, targetId) {
  if (player.alchemyReviveUsed) throw new ApiError(400, "人体生成は対戦中一度だけです。");
  const target = room.players.get(String(targetId || "")) || [...room.players.values()].find((candidate) => !candidate.alive && !candidate.ejected);
  if (!target || target.alive || target.ejected) throw new ApiError(404, "人体生成できる死者がいません。");
  const spawn = getMap(room).spawns[Math.floor(Math.random() * getMap(room).spawns.length)];
  target.alive = true;
  room.canonicalKillVictimIds?.delete(target.id);
  target.botMatchEliminatedById = "";
  target.chatMuted = true;
  target.bodyHits = 0;
  target.overheal = 0;
  advanceLimitBreak(room, target, 0);
  target.x = spawn.x;
  target.y = spawn.y;
  target.vx = 0;
  target.vy = 0;
  // Revival relocates a body: prior movement must never integrate at its spawn.
  clearStoredMovementInput(target, now());
  room.bodies = room.bodies.filter((body) => body.playerId !== target.id);
  player.alchemyReviveUsed = true;
  pushMagicEffect(room, "alchemy-human-transmutation", target, { radius: 180, playerId: player.id, targetId: target.id });
  pushEvent(room, `${player.name} が人体生成で ${target.name} を復活させました。復活者はバトル中チャット不可です。`);
}

// Final cooldowns before stored Mana GPU credit. Credit itself is uncapped;
// each generation consumes only the amount required by this table.
const HACKER_EXTENSION_COOLDOWN_MS = Object.freeze({
  "hack-credits-delete": 60_000,
  "hack-credits-duplicate": 90_000,
  "hack-items-delete": 75_000,
  "hack-items-duplicate": 105_000,
  "hack-hp-delete": 120_000,
  "hack-hp-duplicate": 60_000,
  "hack-mana-delete": 60_000,
  "hack-mana-duplicate": 90_000,
  "hack-status-recover": 36_000,
  revive: 120_000
});

function vibeCodingCooldownMsFor(conversion) {
  const id = String(conversion || "");
  return DVA_ECONOMY.cooldownForRecipe(id) || HACKER_EXTENSION_COOLDOWN_MS[id] || (id.startsWith("object-") ? 30_000 : 36_000);
}

function advanceHackerManaGpu(room, player, elapsedMs, timestamp = now()) {
  if (room.phase === "meeting") return false;
  if (
    room.phase !== "playing" ||
    !hasHackerVibeCodingAccess(player) ||
    !player.alive ||
    player.ejected ||
    (Number(player.mana) || 0) <= 0
  ) {
    player.manaGpuDrainCarry = 0;
    return false;
  }
  player.manaGpuDrainCarry = Math.max(0, Number(player.manaGpuDrainCarry) || 0) +
    HACKER_MANA_GPU_DRAIN_PER_SECOND * Math.max(0, Number(elapsedMs) || 0) / 1000;
  const spend = Math.min(
    Math.floor(player.manaGpuDrainCarry * 100) / 100,
    Math.max(0, Number(player.mana) || 0)
  );
  if (spend < 0.01) return false;
  player.manaGpuDrainCarry = Math.max(0, player.manaGpuDrainCarry - spend);
  setMana(room, player, (Number(player.mana) || 0) - spend, "マナGPU");
  player.manaGpuCooldownCreditMs = Math.max(0, Number(player.manaGpuCooldownCreditMs) || 0) +
    spend * HACKER_MANA_GPU_COOLDOWN_REDUCTION_MS_PER_MANA;
  return true;
}

function useAlchemy(room, player, rawConversion, targetId = "") {
  if (room.phase !== "playing" || !hasHackerVibeCodingAccess(player)) {
    throw new ApiError(403, "ハッカーではありません。");
  }
  if (!player.alive || player.ejected || player.inVent) throw new ApiError(403, "現在は生成できません。");
  ensureAbilityAvailable(player);
  const timestamp = now();
  if ((Number(player.vibeCodingReadyAt) || 0) > timestamp) {
    throw new ApiError(400, `バイブコーディング再実行待ちです（残り${Math.ceil((player.vibeCodingReadyAt - timestamp) / 1000)}秒）。`);
  }
  const conversion = canonicalAlchemyConversion(rawConversion);
  const recipe = ALCHEMY_RECIPES[conversion];
  if (!recipe) {
    throw new ApiError(400, `生成先が不正です。画面を更新して再選択してください（${conversion || "未選択"}）。`);
  }
  const catalogProduct = DVA_ECONOMY.productForRecipe(conversion);
  if (catalogProduct?.hackerAccess === "root" && !hackerRootEligible(player)) {
    throw new ApiError(403, `${catalogProduct.label}はroot化中だけ生成できます。`);
  }
  if (conversion === "hack-hp-delete") recordBotVisibleHumanAttackStart(room, player, "hacker-hp-delete", timestamp);
  recipe.apply(room, player, targetId);
  const committedGoldCredits = conversion === "gold" ? Number(player.credits) : null;
  player.vibeCodingCooldownMs = vibeCodingCooldownMsFor(conversion);
  const shortenedCooldownMs = Math.min(
    player.vibeCodingCooldownMs,
    Math.max(0, Number(player.manaGpuCooldownCreditMs) || 0)
  );
  player.manaGpuCooldownCreditMs = Math.max(0, Number(player.manaGpuCooldownCreditMs) - shortenedCooldownMs);
  player.vibeCodingReadyAt = timestamp + player.vibeCodingCooldownMs - shortenedCooldownMs;
  if (Number(player.mana) <= 0) {
    // Gold has already been authoritatively acquired. The legacy desire-state
    // resource normalization must never overwrite its 100C payout afterward.
    // Other recipes retain their existing zero-mana credit debt behavior.
    if (conversion !== "gold") player.credits = DESIRE_RESOURCE_DEBT;
    player.stamina = DESIRE_RESOURCE_DEBT;
  }
  player.staminaUpdatedAt = now();
  maintainNaturalRecovery(room, player, player.staminaUpdatedAt);
  // Entering Desire during the shared resource reconciliation also normalizes
  // credits. Gold's already committed instant payout must survive that step.
  if (committedGoldCredits !== null) player.credits = committedGoldCredits;
  pushMagicEffect(room, "action-vibe-coding", player, {
    radius: 145,
    playerId: player.id,
    variant: conversion
  });
  pushEvent(room, `${player.name} がバイブコーディングで${recipe.label}を生成しました。短縮クールを${(shortenedCooldownMs / 1000).toFixed(1)}秒使用しました。`);
  touch(room);
}

function iaiChargeAvailable(player, timestamp = now()) {
  return Boolean(
    player?.alive &&
    !player.ejected &&
    Math.max(0, Math.floor(Number(player.iaiCharges) || 0)) > 0 &&
    itemStorageAvailable(player, timestamp) &&
    passivesEnabled(player)
  );
}

function consumeIaiChargeForSuccessfulAttack(room, source, target, reason, options = {}) {
  if (!source || source.id === target?.id || !iaiChargeAvailable(source)) return false;
  source.iaiCharges = Math.max(0, Math.floor(Number(source.iaiCharges) || 0) - 1);
  pushMagicEffect(room, "iai-destruction-attack", target, {
    radius: 148,
    playerId: source.id,
    targetId: target.id,
    targetX: target.x,
    targetY: target.y,
    variant: options.iaiUpgrade ? "upgraded-to-destruction" : options.noBody ? "existing-disappearance" : "existing-destruction",
    durationMs: 900
  });
  setImmediateFeedback(source, "居合", `${reason || "攻撃"}を${options.noBody ? "死体なしキルのまま" : "キル"}へ接続 / 残り${source.iaiCharges}`);
  pushEvent(room, `${source.name} の居合が次の成功攻撃へ自動発動しました。${options.noBody ? "既存の死体なしキル結果を維持します。" : `${target.name}をキルします。`}`);
  return true;
}

function resolveIaiDestructionUpgrade(room, source, target, reason, options = {}) {
  if (!target?.alive || target.ejected || !iaiChargeAvailable(source)) return false;
  const exactReason = requireExactKillCameraActionLabel(reason, "iai-upgrade");
  const outcome = { ...options, attackType: "kill", bypassSlashGuard: true, ignorePreparationBarrier: true, iaiUpgrade: true };
  const destroyed = destroyPlayerUnconditionally(room, source, target, `居合を帯びた${exactReason}`, outcome);
  if (outcome.killConvertedToBodyDamage) {
    consumeIaiChargeForSuccessfulAttack(room, source, target, reason, outcome);
    return "converted";
  }
  if (outcome.defenseOutcome?.absorbed) return "blocked";
  return destroyed;
}

function applyBarrierKillConversion(room, source, target, timestamp = now(), outcome = {}) {
  // Compatibility symbol only: the removed grit/short-invulnerability system
  // must never be independently applied by old callers.
  return false;
}

function destroyPlayerUnconditionally(room, source, target, reason, options = {}) {
  if (!target?.alive || target.ejected) return false;
  if (!options.ignoreFriendlyFire && botFriendlyTransactionBlocked(source, target)) return false;
  const timestamp = now();
  const exactActionLabel = requireExactKillCameraActionLabel(options.attackLabel || reason, options.attackKind || "destruction");
  if (options.attackKind && !options.bypassSlashGuard) {
    const guardOutcome = resolveFighterSlashGuard(room, source, target, {
      kind: String(options.attackKind),
      label: String(options.attackLabel || reason || "攻撃"),
      physical: Boolean(options.slashGuardPhysical),
      reflectable: options.slashGuardReflectable !== false,
      damage: 2,
      hitZone: "head",
      destroy: Boolean(options.reflectDestroy),
      ignoreInfiniteResourcesOnReflect: Boolean(options.reflectIgnoreInfiniteResources)
    });
    if (guardOutcome) return false;
  }
  if (room.phase === "playing" && options.attackType === "kill" && !options.defenseSettled && !options.ignoreDodge && Number(target.dodgeActiveUntil) > timestamp) {
    if (source) killPlayer(room, source, target.id, {ranged: true, hitZone: "head", allowAnyKiller: true, ignoreRange: true, ignoreCooldown: true, preserveCooldown: true, bypassSlashGuard: true, attackKind: options.attackKind || "kill", attackLabel: exactActionLabel});
    else target.dodgeActiveUntil = 0;
    return false;
  }
  if (options.attackType === "kill" && !options.defenseSettled && !options.ignorePreparationBarrier && absorbPreparationBarrier(room, target, timestamp, source)) return false;
  if (!options.ignoreFriendlyFire && source?.role === target.role && ["defender", "attacker"].includes(source?.role) && source.id !== target.id) {
    if (source.alive && !source.ejected) applyDefenderFriendlyFirePenalty(room, source, target, timestamp);
    return false;
  }
  if (options.attackType === "kill" && !options.defenseSettled) {
    const transaction = options.defenseTransaction || {};
    const defense = resolveDurableCombatHit(room, source, target, {attackType: "kill", damage: 1}, transaction, durableDefenseAdapters(timestamp));
    options.defenseOutcome = defense;
    if (defense.absorbed) return false;
    if (defense.converted) {
      const result = settleDurableBodyDamage(room, source, target, defense.damage, exactActionLabel,
        {...options, defenseOutcome: defense, defenseTransaction: transaction});
      options.killConvertedToBodyDamage = !result.killed;
      return Boolean(result.killed);
    }
    if (defense.killCommitClaimed) return false;
    defense.killCommitClaimed = true;
  }
  recordBotVisiblePoisonDeathInference(room, target, timestamp);
  recordBotMatchElimination(room, target, source);
  clearFloraInvisible(room, target, "戦闘不能で解除");
  const botKillWitnesses = captureBotKillWitnesses(room, source, target, timestamp);
  setGravityLevitationEngaged(room, target, false, "death");
  target.alive = false;
  stopLimitBreak(room, target, "death");
  recordKillCamera(room, target, source, {
    timestamp,
    actionLabel: exactActionLabel,
    actionKind: String(options.attackKind || (options.noBody ? "disappearance" : "destruction")),
    sourceLabel: String(options.sourceLabel || reason || ""),
    reflected: String(options.attackKind || "").includes("reflected")
  });
  target.bodyHits = 0;
  target.overheal = 0;
  target.gritCharges = 0;
  target.beautyCharges = 0;
  target.substitutionCharges = 0;
  target.inVent = false;
  target.ventId = "";
  clearAttackState(target);
  completeTasksAfterDeath(room, target);
  if (source && source.id !== target.id) {
    settleCreditedKillLoot(room, source, target);
  }
  consumeIaiChargeForSuccessfulAttack(room, source, target, reason, options);
  pushHitEffect(room, target, "head", true);
  if (!options.noBody) {
    room.bodies.push({
      id: uid("body_"), playerId: target.id, killerId: source?.id || "destruction",
      killerName: source?.name || reason, killerIsBot: Boolean(source?.isBot),
      killerSkinId: source?.skinId || "operator", name: target.name,
      x: target.x, y: target.y, at: timestamp, destruction: true,
      noKillCutin: Boolean(options.noKillCutin)
    });
  }
  recordBotKillWitnesses(room, source, target, timestamp, botKillWitnesses);
  pushEvent(room, options.noBody
    ? `${target.name} は${reason}でキルされ、死体は残りませんでした。`
    : `${target.name} は${reason}でキルされ、死体が残りました。`);
  return true;
}

function inventionLineTargets(room, player, range, width, enemyOnly = false, resolvedPath = null) {
  const path = resolvedPath || resolveVectorAttackPath(room, player, player.aimX, player.aimY, range, { collisionRadius: 2 });
  const { dx, dy } = path;
  return [...room.players.values()]
    .filter((target) => target.id !== player.id && target.alive && !target.ejected && (!enemyOnly || target.role === attackTargetRole(player)))
    .map((target) => {
      const rx = target.x - player.x;
      const ry = target.y - player.y;
      return { target, along: rx * dx + ry * dy, perpendicular: Math.abs(rx * dy - ry * dx) };
    })
    .filter((entry) => entry.along > 0 && entry.along <= path.distance + 0.5 && entry.perpendicular <= width)
    .map((entry) => ({ ...entry, path }))
    .sort((a, b) => a.along - b.along);
}

function useAlchemistInvention(room, player, invention, rawHoldMs = 0, chargeId = "") {
  return withHeldEnhanceActivation(room, player, () => {
    if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
      throw new ApiError(403, "現在は素敵な発明品を使用できません。");
    }
    ensureAbilityAvailable(player);
    ensureItemStorageAvailable(player);
    const id = String(invention || "");
    const index = (player.inventions || []).indexOf(id);
    if (index < 0) throw new ApiError(404, "その素敵な発明品を所持していません。");
    const power = resolveHeldPowerMode(room, player, rawHoldMs, inventionLabel(id), {
      kind: "use",
      itemId: `invention:${id}`,
      chargeId,
      gboEligible: false
    });
    const performanceMultiplier = power.mode === "gbo"
      ? GBO_PERFORMANCE_MULTIPLIER
      : 1 + power.enhanceLevel * GUNNER_ENHANCE_DAMAGE_PER_LEVEL;
    player.inventions.splice(index, 1);
    if (power.mode === "gbo") pushGboOverdriveEffect(room, player, `invention:${id}`, "invention-use");
    if (id === "hack") {
      room.utilityViews.set(player.id, {
        type: "hack", title: "ハック",
        lines: [...room.players.values()]
          .filter((target) => target.alive && !target.ejected && target.special !== "alchemist")
          .map((target) => `${target.name}: ${whichRoom(getMap(room), target)} (${Math.round(target.x)}, ${Math.round(target.y)})`)
      });
    } else if (id === "excalibur") {
      const excaliburRange = Math.max(getMap(room).width, getMap(room).height) * 2 * performanceMultiplier;
      const excaliburPath = resolveVectorAttackPath(room, player, player.aimX, player.aimY, excaliburRange, { collisionRadius: 2 });
      const targets = inventionLineTargets(room, player, excaliburRange, Math.max(getMap(room).width, getMap(room).height) * performanceMultiplier, true, excaliburPath);
      for (const { target } of targets) destroyPlayerUnconditionally(room, player, target, "エクスカリバー", {
        attackType: "kill",
        attackKind: "excalibur",
        attackLabel: "エクスカリバー",
        slashGuardPhysical: true,
        slashGuardReflectable: true,
        reflectDestroy: true
      });
      pushMagicEffect(room, "alchemy-excalibur", player, {
        radius: 900 * performanceMultiplier,
        playerId: player.id,
        variant: power.mode === "gbo" ? "gbo-tenfold" : "forward-half-map",
        directionWorld: { x: excaliburPath.dx, y: excaliburPath.dy },
        pathEndWorld: { x: excaliburPath.x, y: excaliburPath.y }
      });
      checkWin(room);
      if (!(room.phase === "ended" && room.winner === "attackers" && player.role === "attacker")) {
        destroyPlayerUnconditionally(room, player, player, "エクスカリバーの代償");
      }
    } else if (id === "railgun") {
      const railgunRange = 5000 * performanceMultiplier;
      const railgunPath = resolveVectorAttackPath(room, player, player.aimX, player.aimY, railgunRange, { collisionRadius: 2 });
      for (const { target } of inventionLineTargets(room, player, railgunRange, 38 * performanceMultiplier, false)) destroyPlayerUnconditionally(room, player, target, "レールガン", {
        attackType: "kill",
        attackKind: "railgun",
        attackLabel: "レールガン弾",
        slashGuardPhysical: true,
        slashGuardReflectable: true,
        reflectDestroy: true
      });
      pushMagicEffect(room, "alchemy-railgun", player, { radius: 100 * Math.sqrt(performanceMultiplier), targetX: railgunPath.x, targetY: railgunPath.y, playerId: player.id, variant: power.mode });
    } else if (id === "particle-cannon") {
      player.particleCannonUntil = now() + 6_000 * performanceMultiplier;
      player.particleCannonNextAt = 0;
      player.particleCannonPerformanceMultiplier = performanceMultiplier;
      pushMagicEffect(room, "alchemy-particle-cannon", player, {
        radius: 150,
        targetX: player.x + player.aimX * 1250 * performanceMultiplier,
        targetY: player.y + player.aimY * 1250 * performanceMultiplier,
        playerId: player.id,
        variant: power.mode === "gbo" ? "gbo-tenfold" : "continuous"
      });
    }
    pushSound(room, "invention", player, { ownerId: player.id, sourceKind: "alchemy", maxDistance: 3200, volume: 1 });
    pushEvent(room, `${player.name} が素敵な発明品 ${id} を使用しました${power.mode === "gbo" ? "（GBO・数値性能×10・武具破壊）" : power.enhanceLevel ? "（エンハンス）" : ""}。`);
    checkWin(room);
    touch(room);
  });
}

function advanceParticleCannon(room, player, timestamp) {
  if (room.phase !== "playing") return;
  if ((Number(player.particleCannonUntil) || 0) <= timestamp || !player.alive) {
    player.particleCannonPerformanceMultiplier = 1;
    return;
  }
  const performanceMultiplier = Math.max(1, Number(player.particleCannonPerformanceMultiplier) || 1);
  const cadenceMs = 300 / performanceMultiplier;
  // 250ms world ticks and the current maximum ACC18 can cross 15 normal
  // cannon cadences. Keep the scheduled deadline, not `timestamp + cadence`.
  for (let pulses = 0; pulses < 256 && Number(player.particleCannonNextAt) <= timestamp; pulses += 1) {
    const cadenceAt = Number(player.particleCannonNextAt) || timestamp;
    player.particleCannonNextAt = cadenceAt + cadenceMs;
    const particleRange = 1250 * performanceMultiplier;
    const particlePath = resolveVectorAttackPath(room, player, player.aimX, player.aimY, particleRange, { collisionRadius: 2 });
    const targets = inventionLineTargets(room, player, particleRange, 70 * performanceMultiplier, true);
    for (const { target } of targets) {
      destroyPlayerUnconditionally(room, player, target, "荷電粒子砲", {
        attackType: "kill",
        attackKind: "particle-cannon",
        attackLabel: "荷電粒子砲",
        slashGuardPhysical: false,
        slashGuardReflectable: false,
        reflectDestroy: true
      });
    }
    pushMagicEffect(room, "alchemy-particle-beam", player, {
      radius: 140 * Math.sqrt(performanceMultiplier), targetX: particlePath.x, targetY: particlePath.y, playerId: player.id, variant: performanceMultiplier > 1 ? "gbo-tenfold" : "continuous"
    });
  }
}

function useBorrowedAbility(room, player, type, options = {}) {
  const key = String(type || "");
  if (!isHackerOperational(player) || !hackerRootEligible(player)) {
    throw new ApiError(403, "能力ボタンでroot化した後だけ他オペレーターの能力を借用できます。");
  }
  if (!HACKER_ROOT_OPERATOR_TYPES.includes(key)) {
    throw new ApiError(400, "借用能力の種類が不正です。");
  }
  if (key === "fighter") {
    toggleLimitBreak(room, player);
  } else if (key === "gravity") {
    const mode = String(options.mode || "storm");
    const targetId = String(options.targetId || player.id);
    if (["body", "heart", "target"].includes(mode)) {
      teleportPlayer(room, player, options.x, options.y, targetId, mode);
    } else if (mode === "accelerate" || mode === "decelerate") {
      toggleGravityTime(room, player, mode, targetId);
    } else if (mode === "storm") {
      useGravityStorm(room, player, targetId);
    } else if (mode === "time-keeper") {
      useTimeKeeper(room, player);
    } else {
      throw new ApiError(400, "借用グラビティの方式が不正です。");
    }
  } else if (key === "flora") {
    useFloraAbility(room, player, String(options.mode || "heal"), options);
  } else if (key === "gunner") {
    throw new ApiError(400, "ガンナーのエイム・特殊弾装填は理知中に自動作動します。ホバースプリントは床外への移動で自動発動し、GBOは所持武具のUse／Throw／Shoot長押しから全員が使用します。");
  } else if (key === "quantum") {
    return useQuantumControl(room, player, String(options.mode || "nuclear-transmutation"));
  }
}

function clearAimState(player) {
  player.aimTargetId = "";
  player.aimStartedAt = 0;
  player.aimReadyAt = 0;
  player.aimExpiresAt = 0;
  player.aimSourceX = 0;
  player.aimSourceY = 0;
  player.aimTargetX = 0;
  player.aimTargetY = 0;
  player.aimTargetObservedX = 0;
  player.aimTargetObservedY = 0;
  player.aimTargetObservedAt = 0;
  player.aimTargetRelocationRevision = 0;
  player.aimTargetFastMovementAt = 0;
}

function clearPendingAttack(player) {
  player.attackTargetId = "";
  player.attackResolveAt = 0;
}

function clearAttackState(player) {
  clearAimState(player);
  clearPendingAttack(player);
  clearEnhanceChargeState(player);
}

function attackTargetFor(room, killer, targetId) {
  const targetRole = attackTargetRole(killer);
  const explicit = targetId ? room.players.get(targetId) : null;
  if (explicit) return explicit;
  return [...room.players.values()]
    .filter((player) => player.role === targetRole && player.alive && !player.ejected)
    .sort((a, b) => distance(killer, a) - distance(killer, b))[0] || null;
}

function canUseKill(player) {
  if (player.role === "attacker") return true;
  if (player.isBot) return false;
  return hasOperatorAccess(player, "fighter") || ownsShopAbility(player, "assassin-annihilation");
}

function attackTargetRole(player) {
  return player.role === "defender" ? "attacker" : "defender";
}

function validateAttackStart(room, killer, targetId, options = {}) {
  const timestamp = now();
  if (room.phase !== "playing") throw new ApiError(400, "会議中は攻撃できません。");
  if (!canUseKill(killer) || !killer.alive || killer.ejected) throw new ApiError(403, "攻撃できません。");
  ensureConscious(killer);
  if (killer.inVent) throw new ApiError(400, "ダクト内では攻撃できません。");
  if (killer.attackResolveAt > timestamp) throw new ApiError(400, "すでに攻撃準備中です。");
  if (!options.ignoreCooldown && killer.killReadyAt > timestamp) {
    throw new ApiError(400, `キルクールダウン中です（残り${Math.ceil((killer.killReadyAt - timestamp) / 1000)}秒）。`);
  }
  const target = attackTargetFor(room, killer, targetId);
  const explicitTarget = Boolean(targetId);
  if (!target || (!explicitTarget && target.role !== attackTargetRole(killer)) || !target.alive || target.ejected) {
    if (options.allowEmptyTarget) return {target: null, timestamp};
    throw new ApiError(404, "攻撃対象がいません。");
  }
  if (!options.ignoreRange && distance(killer, target) > room.settings.killRange) throw new ApiError(400, "対象が遠すぎます。");
  return { target, timestamp };
}

const NINJUTSU_IMMEDIATE_COUNTER_CODES = new Set([
  "gravity-heart-transfer", "gravity-decelerate", "gravity-storm",
  "flora-sunbeam", "fighter-slash",
  "hacker-hp-delete", "hacker-items-delete", "hacker-mana-delete",
  "root-borrowed-gravity-heart-transfer", "root-borrowed-gravity-decelerate",
  "root-borrowed-gravity-storm", "root-borrowed-flora-sunbeam",
  "root-borrowed-fighter-slash", "invention-excalibur", "invention-railgun",
  "invention-particle-cannon", "throw-orichalcum-sword", "throw-molotov",
  "throw-heated-water", "throw-ice", "gunner-shoot", "ninjutsu"
]);

const handledNinjutsuCounterEffects = new WeakSet();

function botCanObserveNinjutsuFocusEffect(room, bot, attacker, timestamp = now(), eventId = "") {
  // Invisible Ninjutsu cannot be inferred from internal effect payloads.
  return Boolean(bot?.isBot && bot.alive && !bot.ejected && !bot.inVent &&
    attacker?.alive && !floraInvisibleActive(attacker, timestamp) &&
    distance(bot, attacker) <= BOT_BODY_NOTICE_RANGE && eventId &&
    room.magicEffects.some(effect => effect.id === eventId && effect.type === "action-ninjutsu-focus" &&
      effect.playerId === attacker.id && effect.targetId === bot.id));
}

function immediateNinjutsuCounterDecision(bot, attacker, code, timestamp) {
  return {
    targetId: attacker.id,
    at: timestamp,
    code,
    evidence: ["自分へ向けられた忍殺TEを近距離で視認"],
    logic: `観測証拠: 自分へ向けられた忍殺TEを近距離で視認。判断: 忍殺の4秒後の成否を待たず、所持・射程・資源・クールダウン・行動可否を満たす反撃手段を即時に選択。選択: ${code}`
  };
}

function runImmediateNinjutsuCounter(room, attacker, target, timestamp, eventId = "") {
  const event = room.magicEffects.find(effect => effect.id === eventId);
  if (!target?.isBot || !event || handledNinjutsuCounterEffects.has(event)) return false;
  // Close every start event now, including invisible, blocked and nested casts.
  // Neither visibility changes nor a replay may turn an old start into a counter.
  handledNinjutsuCounterEffects.add(event);
  if (Number(room.ninjutsuCounterDepth) > 0 ||
      !botCanObserveNinjutsuFocusEffect(room, target, attacker, timestamp, eventId) ||
      !botCanAttackTarget(room, target, attacker, timestamp)) return false;
  room.ninjutsuCounterDepth = (Number(room.ninjutsuCounterDepth) || 0) + 1;
  try {
    for (const candidate of botCombatCandidates(room, target, attacker, timestamp)) {
      if (!NINJUTSU_IMMEDIATE_COUNTER_CODES.has(candidate.code)) continue;
      const decision = immediateNinjutsuCounterDecision(target, attacker, candidate.code, timestamp);
      const previousTrace = target.botKillDecision;
      target.botImmediateNinjutsuCounter = decision;
      rememberBotKillDecision(room, target, attacker, {
        code: "visible-ninjutsu-self-defense-counter", actionLabel: "忍殺に対する反撃",
        evidence: decision.evidence, reasons: ["忍殺の完了を待たず所持する合法な攻撃手段で反撃"]
      }, timestamp);
      try {
        if (candidate.run() !== false) return true;
      } catch {
        // Candidate legality can change inside an authoritative action. Other
        // candidates still go through their own ordinary authority checks.
      } finally {
        target.botImmediateNinjutsuCounter = null;
      }
      target.botKillDecision = previousTrace;
    }
  } finally {
    room.ninjutsuCounterDepth = Math.max(0, (Number(room.ninjutsuCounterDepth) || 1) - 1);
  }
  return false;
}

function startNinjutsu(room, player, targetId) {
  const openingReadyAt = Number(player.ninjutsuOpeningKillReadyAt) || 0;
  const openingReady = !player.isBot && openingReadyAt > now() && Number(player.killReadyAt) === openingReadyAt;
  const { target, timestamp } = validateAttackStart(room, player, targetId, { ignoreCooldown: openingReady, ignoreRange: true, allowEmptyTarget: true });
  // Consume only after all existing target/range/alive validation succeeds.
  player.ninjutsuOpeningKillReadyAt = 0;
  recordBotVisibleHumanAttackStart(room, player, "ninjutsu", timestamp);
  if (!target) {
    player.killReadyAt = timestamp + killCooldownDurationMs(room, player);
    setAttackResult(player, "miss", timestamp);
    pushMagicEffect(room, "action-ninjutsu-focus", player, {radius: 115, playerId: player.id, targetId: ""});
    touch(room); return;
  }
  player.aimTargetId = target.id;
  player.aimStartedAt = timestamp;
  player.aimReadyAt = timestamp + NINJUTSU_DURATION_MS;
  player.aimExpiresAt = player.aimReadyAt + AIM_HOLD_MS;
  player.aimSourceX = player.x;
  player.aimSourceY = player.y;
  player.aimTargetX = target.x;
  player.aimTargetY = target.y;
  player.aimTargetObservedX = target.x;
  player.aimTargetObservedY = target.y;
  player.aimTargetObservedAt = timestamp;
  player.aimTargetRelocationRevision = Math.max(0, Number(target.relocationRevision) || 0);
  player.aimTargetFastMovementAt = 0;
  const previousMagicEffectId = room.magicEffects.at(-1)?.id;
  pushMagicEffect(room, "action-ninjutsu-focus", player, { radius: 115, playerId: player.id, targetId: target.id });
  const ninjutsuFocusEventId = String(room.magicEffects.at(-1)?.id || "");
  // Run in the same authoritative start transaction as the TE producer. A
  // nested counter Ninjutsu is depth-guarded, so one TE cannot recurse.
  if (ninjutsuFocusEventId && ninjutsuFocusEventId !== previousMagicEffectId) {
    runImmediateNinjutsuCounter(room, player, target, timestamp, ninjutsuFocusEventId);
  }
  touch(room);
}

function setAttackResult(player, result, timestamp = now()) {
  player.lastAttackResult = result;
  player.lastAttackResultAt = timestamp;
}

function ninjutsuTargetSpeedLimit(room) {
  return Math.max(0, Number(getMap(room)?.speed) || 0) * DEFAULT_MOVEMENT_SPEED_MULTIPLIER * NORMAL_MOVEMENT_ACC;
}

function observeNinjutsuTargetMovement(room, target, beforeX, beforeY, movedDistance, elapsedSeconds, timestamp = now()) {
  const maximumSpeed = ninjutsuTargetSpeedLimit(room);
  for (const player of room.players.values()) {
    if (player.aimTargetId !== target.id) continue;
    const observedAt = Number(player.aimTargetObservedAt) || Number(player.aimStartedAt) || timestamp;
    const unrecordedDistance = Math.hypot(beforeX - player.aimTargetObservedX, beforeY - player.aimTargetObservedY);
    const elapsedSinceObservation = Math.max(0, (timestamp - observedAt) / 1000);
    // A discontinuity that happened outside movePlayer must be checked before
    // this authoritative move refreshes the observation point. This keeps a
    // teleport followed by a normal walk from being laundered as slow motion.
    if (unrecordedDistance > AIM_TARGET_MOVE_TOLERANCE && (
      elapsedSinceObservation <= 0 || unrecordedDistance / elapsedSinceObservation > maximumSpeed + 1e-6
    )) {
      player.aimTargetFastMovementAt = timestamp;
    }
    if (elapsedSeconds > 0 && movedDistance / elapsedSeconds > maximumSpeed + 1e-6) {
      player.aimTargetFastMovementAt = timestamp;
    }
    player.aimTargetObservedX = target.x;
    player.aimTargetObservedY = target.y;
    player.aimTargetObservedAt = timestamp;
  }
}

function aimedTargetMoved(room, player, target, timestamp = now()) {
  if (!target) return true;
  const sourceMoved = Math.hypot(player.x - player.aimSourceX, player.y - player.aimSourceY) > AIM_TARGET_MOVE_TOLERANCE;
  if (sourceMoved) return true;
  if (distance(player, target) > room.settings.killRange) return true;
  if (Math.max(0, Number(target.relocationRevision) || 0) !== Math.max(0, Number(player.aimTargetRelocationRevision) || 0)) return true;
  if (Number(player.aimTargetFastMovementAt) >= Number(player.aimStartedAt) && Number(player.aimTargetFastMovementAt) > 0) return true;
  const observedAt = Number(player.aimTargetObservedAt) || Number(player.aimStartedAt) || timestamp;
  const observedDistance = Math.hypot(target.x - player.aimTargetObservedX, target.y - player.aimTargetObservedY);
  const elapsedSinceObservation = Math.max(0, (timestamp - observedAt) / 1000);
  const targetMoved = observedDistance > AIM_TARGET_MOVE_TOLERANCE && (
    elapsedSinceObservation <= 0 || observedDistance / elapsedSinceObservation > ninjutsuTargetSpeedLimit(room) + 1e-6
  );
  player.aimTargetObservedX = target.x;
  player.aimTargetObservedY = target.y;
  player.aimTargetObservedAt = timestamp;
  return targetMoved;
}

function failAimForMovement(room, player, timestamp = now()) {
  clearAimState(player);
  if (room.phase === "playing" && player.alive && !player.ejected) {
    player.killReadyAt = Math.max(player.killReadyAt, timestamp + killCooldownDurationMs(room, player));
  }
  setAttackResult(player, "moved", timestamp);
  touch(room);
}

function ninjutsuEliminationProfile(player) {
  if (hasAssassinAnnihilationAccess(player)) {
    return {
      reason: "アサシン忍殺（死体なし）",
      attackKind: "assassin-ninjutsu-annihilation",
      attackLabel: "アサシン忍殺（死体なし）"
    };
  }
  return {
    reason: "忍殺",
    attackKind: "ninjutsu",
    attackLabel: "忍殺"
  };
}

function resolveNinjutsuDisappearance(room, player, targetId, timestamp = now()) {
  const target = room.players.get(targetId);
  if (!target?.alive || target.ejected) return "miss";
  const profile = ninjutsuEliminationProfile(player);
  const disappearanceOutcome = {
    // Only Assassin owns the no-corpse presentation. Shared Ninjutsu leaves
    // an ordinary reportable body when the kill is not converted.
    noBody: hasAssassinAnnihilationAccess(player),
    attackType: "kill",
    attackKind: profile.attackKind,
    attackLabel: profile.attackLabel,
    slashGuardPhysical: true,
    slashGuardReflectable: true,
    reflectDestroy: true
  };
  // Ninja kills must respect the same active Dodge and Fighter counter as
  // other lethal attacks. Non-dodge outcomes retain their existing resolver.
  if (Number(target.dodgeActiveUntil) > timestamp) {
    const outcome = killPlayer(room, player, targetId, {
      hitZone: "head", lockedAim: true, ignoreCooldown: true, preserveCooldown: true,
      noBody: disappearanceOutcome.noBody, attackKind: disappearanceOutcome.attackKind,
      attackLabel: disappearanceOutcome.attackLabel,
      slashGuardPhysical: true, slashGuardReflectable: true
    });
    if (outcome === "dodged") player.killReadyAt = timestamp + killCooldownDurationMs(room, player);
    checkWin(room);
    touch(room);
    return outcome === "dodged" ? "dodged" : "blocked";
  }
  const disappeared = destroyPlayerUnconditionally(room, player, target, profile.reason, disappearanceOutcome);
  if (!disappeared) {
    if (disappearanceOutcome.killConvertedToBodyDamage) {
      player.killReadyAt = timestamp + killCooldownDurationMs(room, player);
      checkWin(room);
      touch(room);
      return "body";
    }
    checkWin(room);
    touch(room);
    return "blocked";
  }
  player.killsThisRound += 1;
  // Award only a completed Ninjutsu elimination. Dodges, barriers, cancelled
  // aim, duplicate resolution and any rejected disappearance return above.
  setMana(room, player, (Number(player.mana) || 0) + 100, "忍殺成功", {
    exact: true,
    skipAutomaticProtection: true
  });
  player.killReadyAt = timestamp + killCooldownDurationMs(room, player);
  evaluateSoloMission(room, timestamp);
  pushDoorLog(room, `${whichRoom(getMap(room), target)} 付近で${profile.attackLabel}による反応消失`);
  checkWin(room);
  touch(room);
  return "disappeared";
}

function performNinjutsuAttack(room, player, targetId) {
  const timestamp = now();
  if (!player.aimTargetId || player.aimTargetId !== targetId) throw new ApiError(400, "この対象へ忍殺準備をしていません。");
  if (player.aimReadyAt > timestamp) {
    throw new ApiError(400, `忍殺準備中です（残り${((player.aimReadyAt - timestamp) / 1000).toFixed(1)}秒）。`);
  }
  if (!player.aimExpiresAt || player.aimExpiresAt <= timestamp) {
    clearAimState(player);
    throw new ApiError(400, "忍殺の有効時間が切れました。");
  }
  if (aimedTargetMoved(room, player, room.players.get(targetId), timestamp)) {
    failAimForMovement(room, player, timestamp);
    return;
  }
  const outcome = resolveNinjutsuDisappearance(room, player, targetId, timestamp);
  clearAimState(player);
  setAttackResult(player, outcome, timestamp);
  touch(room);
}

function resolveReadyAim(room, player, timestamp = now()) {
  if (!player.aimTargetId || !player.aimReadyAt || player.aimReadyAt > timestamp) return;
  const targetId = player.aimTargetId;
  if (aimedTargetMoved(room, player, room.players.get(targetId), timestamp)) {
    failAimForMovement(room, player, timestamp);
    return;
  }
  try {
    const outcome = resolveNinjutsuDisappearance(room, player, targetId, timestamp);
    clearAimState(player);
    setAttackResult(player, outcome, timestamp);
  } catch {
    clearAimState(player);
    if (room.phase === "playing" && player.alive && !player.ejected) {
      player.killReadyAt = Math.max(player.killReadyAt, timestamp + killCooldownDurationMs(room, player));
    }
    setAttackResult(player, "miss", timestamp);
  }
  touch(room);
}

function killPlayer(room, killer, targetId, options = {}) {
  const ranged = Boolean(options.ranged);
  const lockedAim = Boolean(options.lockedAim);
  const ignoreCooldown = Boolean(options.ignoreCooldown);
  const ignoreRange = Boolean(options.ignoreRange);
  const ignoreDodge = Boolean(options.ignoreDodge);
  const preserveCooldown = Boolean(options.preserveCooldown);
  const allowAnyKiller = Boolean(options.allowAnyKiller);
  const ignorePush = Boolean(options.ignorePush);
  const ignoreFriendlyFire = Boolean(options.ignoreFriendlyFire);
  const bypassSlashGuard = Boolean(options.bypassSlashGuard);
  let bodyDamage = clampNumber(options.damage, 0.01, 2, 1);
  let hitZone = options.hitZone === "head" ? "head" : "body";
  let standFirmConverted = false;
  if (room.phase !== "playing") throw new ApiError(400, "会議中はキルできません。");
  if ((!canUseKill(killer) && !allowAnyKiller) || !killer.alive || killer.ejected) throw new ApiError(403, "キルできません。");
  if (killer.inVent) throw new ApiError(400, "ダクト内ではキルできません。");
  const timestamp = now();
  const attackOrigin = options.origin || { x: killer.x, y: killer.y };
  if (!ranged && !ignoreCooldown && killer.killReadyAt > timestamp) {
    throw new ApiError(400, `キルクールダウン中です（残り${Math.ceil((killer.killReadyAt - timestamp) / 1000)}秒）。`);
  }
  const map = getMap(room);
  const target = attackTargetFor(room, killer, targetId);
  const expectedTargetRole = options.targetRole || attackTargetRole(killer);
  const explicitTarget = Boolean(targetId);
  if (!target || (!explicitTarget && target.role !== expectedTargetRole) || !target.alive || target.ejected) {
    throw new ApiError(404, "キル対象がいません。");
  }
  if (!ignoreFriendlyFire && botFriendlyTransactionBlocked(killer, target)) return "botFriendlyFireBlocked";
  if (!ranged && !lockedAim && !ignoreRange && distance(killer, target) > room.settings.killRange) throw new ApiError(400, "対象が遠すぎます。");
  if (!ignoreFriendlyFire && killer.role === target.role && ["defender", "attacker"].includes(killer.role)) {
    if (!ranged && !ignoreCooldown && !preserveCooldown) {
      killer.killReadyAt = timestamp + killCooldownDurationMs(room, killer);
    }
    applyDefenderFriendlyFirePenalty(room, killer, target, timestamp);
    checkWin(room);
    touch(room);
    return "friendlyFirePenalty";
  }

  if (!bypassSlashGuard) {
    const slashGuardPhysical = options.slashGuardPhysical === undefined
      ? !options.magic
      : Boolean(options.slashGuardPhysical);
    const attackKind = String(options.attackKind || (slashGuardPhysical ? ranged ? "projectile" : "melee" : "nonphysical"));
    const guardOutcome = resolveFighterSlashGuard(room, killer, target, {
      kind: attackKind,
      label: String(options.attackLabel || (attackKind === "slash" ? "斬る" : slashGuardPhysical ? "物理攻撃" : "非物理攻撃")),
      physical: slashGuardPhysical,
      reflectable: options.slashGuardReflectable !== false,
      perfectGuardEligible: options.slashGuardPerfectEligible !== false,
      damage: bodyDamage,
      hitZone,
      magic: Boolean(options.magic),
      destroy: Boolean(options.destroy),
      ignoreInfiniteResourcesOnReflect: Boolean(options.ignoreInfiniteResources)
    }, timestamp);
    if (guardOutcome) return guardOutcome;
  }

  // Durable barrier resolves after evade and final attack classification below.

  const iaiOutcome = (ignoreDodge || Number(target.dodgeActiveUntil) <= timestamp)
    ? resolveIaiDestructionUpgrade(
        room,
        killer,
        target,
        String(options.attackLabel || (options.attackKind === "slash" ? "斬る" : ranged ? "射撃" : "攻撃")),
        { ignoreFriendlyFire: true }
      )
    : false;
  if (iaiOutcome) {
    if (iaiOutcome === "converted") {
      if (ranged) killer.gunReadyAt = Math.max(Number(killer.gunReadyAt) || 0, timestamp);
      else if (!ignoreCooldown && !preserveCooldown) killer.killReadyAt = timestamp + QUICK_FOLLOW_UP_COOLDOWN_MS;
    } else if (iaiOutcome !== "blocked" && !ranged && !ignoreCooldown && !preserveCooldown) {
      killer.killsThisRound += 1;
      killer.killReadyAt = timestamp + killCooldownDurationMs(room, killer);
    }
    checkWin(room);
    touch(room);
    return iaiOutcome === "blocked" ? "blocked" : iaiOutcome === "converted" ? "body" : "kill";
  }

  if (hasFighterInfiniteResources(target) && !target.limitBreakActive) {
    syncFighterInfiniteResources(target);
    pushHitEffect(room, target, "body", false);
    pushEvent(room, `${target.name} は無限HPと無限バリアで攻撃を防ぎました。`);
    touch(room);
    return "infiniteResources";
  }


  if (lockedAim && killer.special !== "fighter" && mentalStateFor(killer) === "気概") {
    hitZone = "body";
    setImmediateFeedback(killer, "気概", "忍殺がボディダメージへ変化");
  }

  if (!ignoreDodge && target.dodgeActiveUntil > timestamp) {
    target.dodgeActiveUntil = 0;
    const incomingCertainKill = fighterKillCounterTriggerIsCertainKill(hitZone, options);
    if (fighterKillCounterAvailable(target) && incomingCertainKill) {
      const counterOptions = {attackType: "kill", attackKind: "fighter-dodge-counter", attackLabel: "回避キルカウンター", bypassSlashGuard: true};
      const countered = destroyPlayerUnconditionally(room, target, killer, "回避キルカウンター", counterOptions);
      target.killReadyAt = timestamp + killCooldownDurationMs(room, target);
      if (countered) target.killsThisRound += 1;
      checkWin(room); touch(room);
      return countered ? "fighterCountered" : "dodged";
    }
    if (!ranged && !ignoreCooldown && !preserveCooldown) {
      killer.killReadyAt = timestamp + killCooldownDurationMs(room, killer);
    }
    pushEvent(room, `${target.name} が ${killer.name} の攻撃を回避しました。`);
    touch(room);
    return "dodged";
  }

  const defenseTransaction = options.defenseTransaction || {};
  const defense = resolveDurableCombatHit(room, killer, target,
    {attackType: hitZone === "head" || options.destroy ? "kill" : "body", damage: bodyDamage}, defenseTransaction, {
      substitution: (_room, _source, recipient) => triggerSubstitution(_room, recipient, "kill", timestamp),
      protect: (_room, _source, recipient) => {
        if (!itemStorageAvailable(recipient, timestamp) || !passivesEnabled(recipient) || !(Number(recipient.protectCharges) > 0)) return false;
        recipient.protectCharges -= 1; return true;
      }
    });
  if (defense.absorbed) {
    if (!ranged && !ignoreCooldown && !preserveCooldown) killer.killReadyAt = timestamp + killCooldownDurationMs(room, killer);
    pushHitEffect(room, target, "body", false); touch(room);
    return defense.defense === "barrier" ? "preparationBarrier" : defense.defense;
  }
  if (defense.hpCommitClaimed) return defense.committedResult || "body";
  defense.hpCommitClaimed = true;
  if (defense.converted) { hitZone = "body"; bodyDamage = defense.damage; }

  if (hitZone === "body" && target.overheal > 0) {
    target.overheal -= 1;
    if (ranged) killer.gunReadyAt = Math.max(Number(killer.gunReadyAt) || 0, timestamp);
    else if (!ignoreCooldown && !preserveCooldown) killer.killReadyAt = timestamp + QUICK_FOLLOW_UP_COOLDOWN_MS;
    pushHitEffect(room, target, "body", false);
    pushEvent(room, `${target.name} のオーバーヒールがボディ攻撃を吸収しました。`);
    touch(room);
    return "overheal";
  }

  if (hitZone === "body") {
    const nextDamage = Math.round((Math.max(0, Number(target.bodyHits) || 0) + bodyDamage) * 100) / 100;
    const lethalThreshold = 2;
    if (standFirmConverted && nextDamage >= lethalThreshold) {
      target.bodyHits = 1;
      if (ranged) killer.gunReadyAt = Math.max(Number(killer.gunReadyAt) || 0, timestamp);
      else if (!ignoreCooldown && !preserveCooldown) killer.killReadyAt = timestamp + QUICK_FOLLOW_UP_COOLDOWN_MS;
      pushHitEffect(room, target, "body", false);
      touch(room);
      return "body";
    }
    if (nextDamage >= lethalThreshold) {
      target.bodyHits = 2;
    } else {
      target.bodyHits = nextDamage;
      applyBodyDamageReaction(room, killer, target, {timestamp, impactOrigin: attackOrigin});
      if (ranged) killer.gunReadyAt = Math.max(Number(killer.gunReadyAt) || 0, timestamp);
      else if (!ignoreCooldown && !preserveCooldown) killer.killReadyAt = timestamp + QUICK_FOLLOW_UP_COOLDOWN_MS;
      pushHitEffect(room, target, "body", false);
      pushEvent(room, `${target.name} が${bodyDamage.toFixed(2)}ダメージを受けました（残りHP ${(2 - nextDamage).toFixed(2)}）。`);
      touch(room);
      return "body";
    }
  }

  const killActionKind = String(options.attackKind || "").trim();
  if (!killActionKind) throw new Error("Exact lethal action kind is required before committing a kill.");
  const killActionLabel = requireExactKillCameraActionLabel(options.attackLabel, killActionKind);
  recordBotVisiblePoisonDeathInference(room, target, timestamp);
  recordBotMatchElimination(room, target, killer);
  clearFloraInvisible(room, target, "戦闘不能で解除");
  const botKillWitnesses = captureBotKillWitnesses(room, killer, target, timestamp);
  setGravityLevitationEngaged(room, target, false, "death");
  target.alive = false;
  stopLimitBreak(room, target, "death");
  recordKillCamera(room, target, killer, {
    timestamp,
    actionLabel: killActionLabel,
    actionKind: killActionKind,
    sourceLabel: ranged ? gunnerWeaponFor(killer).name : killActionLabel,
    reflected: killActionKind.includes("reflected")
  });
  target.gunnerSnipingActive = false;
  target.gunnerAimTargetId = "";
  target.bodyHits = 0;
  target.overheal = 0;
  target.inVent = false;
  target.ventId = "";
  clearAttackState(target);
  pushHitEffect(room, target, hitZone, true);
  completeTasksAfterDeath(room, target);
  settleCreditedKillLoot(room, killer, target);
  evaluateSoloMission(room, timestamp);
  if (!options.noBody) {
    room.bodies.push({
      id: uid("body_"),
      playerId: target.id,
      killerId: killer.id,
      killerName: killer.name,
      killerIsBot: killer.isBot,
      killerSkinId: killer.skinId || (killer.isBot ? "operator" : "hood"),
      name: target.name,
      x: target.x,
      y: target.y,
      at: timestamp
    });
  }
  recordBotKillWitnesses(room, killer, target, timestamp, botKillWitnesses);
  if (!options.deferFriendlyFire) applyDefenderFriendlyFirePenalty(room, killer, target, timestamp);

  if (!ranged && !ignoreCooldown && !preserveCooldown) {
    killer.killsThisRound += 1;
    killer.killReadyAt = timestamp + killCooldownDurationMs(room, killer);
  }
  pushDoorLog(room, `${whichRoom(map, attackOrigin)} 付近で反応消失`);
  pushEvent(room, options.noBody
    ? `${target.name} が忍殺され、痕跡は残りませんでした。`
    : `${target.name} が倒れました。死体発見で会議が始まります。`);
  checkWin(room);
  touch(room);
  return "lethal";
}

function clearShotPath(room, shooter, target, directionX, directionY, options = {}) {
  const along = (target.x - shooter.x) * directionX + (target.y - shooter.y) * directionY;
  // Only the named Penetrate special round opts out of immutable map-wall
  // clipping. Generated cover remains independently controlled by ignoreCover.
  const penetrateMapWalls = Boolean(options.penetrateMapWalls);
  const path = penetrateMapWalls
    ? { distance: along }
    : resolveVectorAttackPath(room, shooter, directionX, directionY, along, { collisionRadius: 2 });
  if (path.distance + 0.5 < along) return false;
  const steps = Math.max(1, Math.ceil(along / 18));
  for (let step = 1; step < steps; step += 1) {
    const distanceAlong = along * step / steps;
    const x = shooter.x + directionX * distanceAlong;
    const y = shooter.y + directionY * distanceAlong;
    if (!penetrateMapWalls && !isWalkable(room, x, y, 2)) return false;
    if (!options.ignoreCover && (room.alchemyObjects || []).some((object) => object.type === "cover" && (!object.endsAt || object.endsAt > now()) && Math.hypot(x - object.x, y - object.y) <= object.radius)) return false;
  }
  return true;
}

// All attacks that physically travel along a ray use this authoritative map
// resolver. Generated cover is deliberately not modeled here: its existing
// Gunner-only ignore-cover rule is separate from immutable map-wall occlusion.
function resolveVectorAttackPath(room, origin, rawDx, rawDy, rawRange, options = {}) {
  const start = {
    x: Number(origin?.x) || 0,
    y: Number(origin?.y) || 0
  };
  const { dx, dy } = finiteDirection(rawDx, rawDy, 0, 1);
  const range = Math.max(0, Number(rawRange) || 0);
  const collisionRadius = Math.max(0, Number(options.collisionRadius) || 2);
  const sampleStep = Math.max(4, Math.min(18, Number(options.sampleStep) || 8));
  let clearDistance = 0;
  let blocked = false;
  for (let sampledDistance = Math.min(sampleStep, range); sampledDistance <= range + 0.001; sampledDistance += sampleStep) {
    const distanceAlong = Math.min(range, sampledDistance);
    if (isWalkable(room, start.x + dx * distanceAlong, start.y + dy * distanceAlong, collisionRadius)) {
      clearDistance = distanceAlong;
      if (distanceAlong >= range) break;
      continue;
    }
    blocked = true;
    let low = clearDistance;
    let high = distanceAlong;
    for (let iteration = 0; iteration < 7; iteration += 1) {
      const middle = (low + high) / 2;
      if (isWalkable(room, start.x + dx * middle, start.y + dy * middle, collisionRadius)) low = middle;
      else high = middle;
    }
    clearDistance = Math.max(0, low - 0.5);
    break;
  }
  if (!blocked && clearDistance < range) clearDistance = range;
  return {
    x: start.x + dx * clearDistance,
    y: start.y + dy * clearDistance,
    start,
    dx,
    dy,
    range,
    distance: clearDistance,
    blocked
  };
}

function recordBotKillWitnesses(room, killer, target, timestamp = now(), observedWitnessIds = null) {
  for (const witness of room.players.values()) {
    if (!witness.isBot || !witness.alive || witness.ejected || witness.inVent || witness.id === target.id) continue;
    if (witness.role !== "defender") continue;
    const observed = observedWitnessIds instanceof Set
      ? observedWitnessIds.has(witness.id)
      : botCanObserveKill(room, witness, killer, target, timestamp);
    if (witness.id === killer?.id || !observed) continue;
    witness.botWitnessTargetId = killer.id;
    witness.botWitnessUntil = timestamp + BOT_STAND_FIRM_RETALIATION_MS;
    witness.botWitnessEvidenceKind = "visible-hostile-kill";
    rememberBotObservedKill(room, witness, killer, target, timestamp);
    witness.navPath = [];
    witness.nextBotActionAt = Math.min(Number(witness.nextBotActionAt) || timestamp, timestamp);
    if (witness.botWitnessEvidenceKind !== "observed-kill-burst-exceeds-attacker-count" &&
        Number(witness.mana) >= HEART_TELEPORT_MANA_COST && botCanCommitLuminous(room, witness, killer.id, timestamp)) {
      try {
        callEmergency(room, witness, killer.id, "witness");
      } catch {}
    }
  }
}

function shotEndPoint(room, shooter, directionX, directionY, maxRange) {
  const path = resolveVectorAttackPath(room, shooter, directionX, directionY, maxRange, { collisionRadius: 2 });
  return { x: path.x, y: path.y };
}

function destroyGboFirearmAccess(room, player, weaponId, reason = "GBO使用完了") {
  const id = String(weaponId || "");
  if (!GUNNER_WEAPONS[id]) return false;
  const purchasedIndex = (player.purchasedWeapons || []).indexOf(id);
  if (purchasedIndex >= 0) player.purchasedWeapons.splice(purchasedIndex, 1);
  player.unavailableGunnerWeapons ||= [];
  if (!player.unavailableGunnerWeapons.includes(id)) player.unavailableGunnerWeapons.push(id);
  if (player.gunnerReloadWeapon === id) {
    player.gunnerReloadWeapon = "";
    player.gunnerReloadUntil = 0;
  }
  if (player.gunnerWeapon === id) {
    const currentIndex = Math.max(0, GUNNER_WEAPON_ORDER.indexOf(id));
    player.gunnerWeapon = nextUsableGunnerWeapon(player, currentIndex, 1) || id;
  }
  pushMagicEffect(room, "gbo-overdrive", player, {
    radius: 185,
    playerId: player.id,
    variant: `destroyed:weapon:${id}`,
    durationMs: 1_450
  });
  setImmediateFeedback(player, "GBO武器破壊", `${GUNNER_WEAPONS[id].name} / ${reason}`);
  pushEvent(room, `${player.name} の${GUNNER_WEAPONS[id].name}はGBOの${reason}により破壊されました。`);
  return true;
}

function stopGunnerFire(room, player, options = {}) {
  if (!player.gunFiring) return false;
  const weaponId = player.gunFiringWeapon || gunnerWeaponFor(player).id;
  const destroyGboWeapon = Boolean(player.gunnerBurstGbo && player.gunnerBurstGboWeapon === weaponId);
  player.gunFiring = false;
  player.gunFiringWeapon = "";
  player.gunFiringSince = 0;
  player.gunnerBurstRoundsRemaining = 0;
  player.gunnerBurstEnhanceLevel = 0;
  player.gunnerBurstGbo = false;
  player.gunnerBurstGboWeapon = "";
  if (destroyGboWeapon) destroyGboFirearmAccess(room, player, weaponId, String(options.reason || "中断"));
  touch(room);
  return true;
}

function finishGunnerBurstRound(room, shooter, weapon, timestamp = now()) {
  shooter.gunnerBurstRoundsRemaining = Math.max(0, Math.floor(Number(shooter.gunnerBurstRoundsRemaining) || 0) - 1);
  const magazineConsumed = shooter.gunnerBurstRoundsRemaining <= 0 ||
    (Number(shooter.gunnerAmmo?.[weapon.id]) || 0) < weapon.ammoPerShot;
  if (!magazineConsumed) return false;
  const gbo = Boolean(shooter.gunnerBurstGbo && shooter.gunnerBurstGboWeapon === weapon.id);
  stopGunnerFire(room, shooter, { reason: "1弾倉を撃ち切り" });
  if (!gbo && shooter.alive && !shooter.ejected && !shooter.inVent) {
    startGunnerReload(room, shooter, weapon.id, timestamp, "1弾倉を撃ち切ったため");
  }
  return true;
}

function nextUsableGunnerWeapon(player, startIndex, step) {
  for (let offset = 1; offset <= GUNNER_WEAPON_ORDER.length; offset += 1) {
    const index = (startIndex + step * offset + GUNNER_WEAPON_ORDER.length * 2) % GUNNER_WEAPON_ORDER.length;
    const id = GUNNER_WEAPON_ORDER[index];
    if (gunnerWeaponAvailable(player, id)) return id;
  }
  return "";
}

function switchGunnerWeapon(room, player, requestedWeaponId = "", direction = 1) {
  if (room.phase !== "playing") throw new ApiError(400, "バトル中のみ武器を切り替えられます。");
  if (!hasFirearmAccess(player)) throw new ApiError(403, "使用できる銃器を所持していません。");
  if (!player.alive || player.ejected || player.inVent) throw new ApiError(403, "現在は武器を切り替えられません。");
  ensureConscious(player);
  ensureItemStorageAvailable(player);
  if (player.gunFiring) stopGunnerFire(room, player, { reason: "切替", autoSwitch: false });
  const currentIndex = Math.max(0, GUNNER_WEAPON_ORDER.indexOf(gunnerWeaponFor(player).id));
  const step = direction < 0 ? -1 : 1;
  let nextWeaponId = "";
  if (requestedWeaponId && GUNNER_WEAPONS[requestedWeaponId] && gunnerWeaponAvailable(player, requestedWeaponId)) {
    nextWeaponId = requestedWeaponId;
  } else {
    nextWeaponId = nextUsableGunnerWeapon(player, currentIndex, step);
  }
  if (!nextWeaponId) throw new ApiError(400, "使用できる銃が残っていません。");
  player.gunnerWeapon = nextWeaponId;
  const weapon = gunnerWeaponFor(player);
  // Special ammunition belongs to the currently selected firearm rather than
  // remaining pinned to whichever firearm happened to be selected on pickup.
  // Preserve the active ammunition kind when possible, then expose its stored
  // rounds through the newly selected weapon.
  activateStoredGunnerSpecialAmmo(player, weapon.id);
  pushMagicEffect(room, "action-weapon-switch", player, {
    radius: 90,
    playerId: player.id,
    variant: weapon.id
  });
  touch(room);
}

function gunnerDamageAtDistance(weapon, distanceToTarget) {
  if (weapon.id === "sniper") return weapon.damage;
  const ratio = clampNumber(distanceToTarget / Math.max(1, weapon.range), 0, 1, 0);
  const multiplier = Math.max(weapon.minDamageRatio, 1 - (1 - weapon.minDamageRatio) * ratio);
  return Math.round(weapon.damage * multiplier * 100) / 100;
}

function gunnerHeadshotChance(shooter, aimed = Boolean(shooter?.gunnerSnipingActive && hasGunnerAimAccess(shooter))) {
  const base = aimed ? GUNNER_AIM_HEADSHOT_BASE_CHANCE : GUNNER_HIP_HEADSHOT_BASE_CHANCE;
  return Math.round(clampNumber(
    base + luckValueFor(shooter) * GUNNER_HEADSHOT_LUCK_INFLUENCE,
    0.01,
    0.95,
    base
  ) * 10_000) / 10_000;
}

function resolveGunnerHeadshot(shooter, aimed = Boolean(shooter?.gunnerSnipingActive), explicitRoll) {
  const fixtureRolls = Array.isArray(shooter?.gunnerHeadshotVerificationRolls)
    ? shooter.gunnerHeadshotVerificationRolls
    : [];
  const rawRoll = Number.isFinite(Number(explicitRoll))
    ? Number(explicitRoll)
    : fixtureRolls.length
      ? Number(fixtureRolls.shift())
      : Math.random();
  const roll = clampNumber(rawRoll, 0, 0.999999, 0.999999);
  const chance = gunnerHeadshotChance(shooter, aimed);
  return { headshot: roll < chance, hitZone: roll < chance ? "head" : "body", chance, roll };
}

function findGunnerTarget(room, shooter, weapon, dx, dy, options = {}) {
  // Penetrate is the one named special-round exception to normal wall path
  // clipping.  General firearms and generated-cover rules remain unchanged.
  const path = options.penetrate
    ? { distance: weapon.range, x: shooter.x + dx * weapon.range, y: shooter.y + dy * weapon.range }
    : resolveVectorAttackPath(room, shooter, dx, dy, weapon.range, { collisionRadius: 2 });
  return [...room.players.values()]
    .filter((player) => player.id !== shooter.id && player.alive && !player.ejected)
    .map((player) => {
      const relativeX = player.x - shooter.x;
      const relativeY = player.y - shooter.y;
      const along = relativeX * dx + relativeY * dy;
      const perpendicular = Math.abs(relativeX * dy - relativeY * dx);
      return { player, along, perpendicular };
    })
    .filter((entry) => entry.along > 8 && entry.along <= path.distance + 0.5 && entry.perpendicular <= weapon.lineWidth)
    .filter((entry) => clearShotPath(room, shooter, entry.player, dx, dy, {
      ignoreCover: Boolean(options.ignoreCover),
      penetrateMapWalls: Boolean(options.penetrate)
    }))
    .sort((a, b) => a.along - b.along)[0] || null;
}

function previewGunnerSpecialAmmoType(player, weaponId) {
  const type = String(player?.gunnerSpecialAmmoType || "");
  if (!GUNNER_SPECIAL_AMMO_TYPES.includes(type)) return "";
  if (String(player?.gunnerSpecialAmmoWeapon || "") !== String(weaponId || "")) return "";
  const inventoryRounds = Number(player?.gunnerSpecialAmmoInventory?.[type]);
  const rounds = Number.isFinite(inventoryRounds)
    ? inventoryRounds
    : Number(player?.gunnerSpecialAmmoRounds) || 0;
  return rounds > 0 ? type : "";
}

function botGunnerFriendlyLaneBlock(room, shooter, weapon, dx, dy) {
  if (!shooter?.isBot) return null;
  const specialAmmoType = previewGunnerSpecialAmmoType(shooter, weapon?.id);
  const firstBody = findGunnerTarget(room, shooter, weapon, dx, dy, {
    ignoreCover: true,
    penetrate: specialAmmoType === "penetrate"
  });
  return botFriendlyTransactionBlocked(shooter, firstBody?.player) ? firstBody : null;
}

function gunnerSpecialAmmoLabel(type) {
  return GUNNER_SPECIAL_AMMO_LABELS[type] || "特殊弾";
}

function ensureGunnerSpecialAmmoInventory(player) {
  if (!player.gunnerSpecialAmmoInventory || typeof player.gunnerSpecialAmmoInventory !== "object") {
    player.gunnerSpecialAmmoInventory = { weak: 0, penetrate: 0, shock: 0 };
    const legacyType = String(player.gunnerSpecialAmmoType || "");
    if (GUNNER_SPECIAL_AMMO_TYPES.includes(legacyType)) {
      player.gunnerSpecialAmmoInventory[legacyType] = Math.max(0, Math.floor(Number(player.gunnerSpecialAmmoRounds) || 0));
    }
  }
  for (const type of GUNNER_SPECIAL_AMMO_TYPES) {
    player.gunnerSpecialAmmoInventory[type] = Math.max(0, Math.floor(Number(player.gunnerSpecialAmmoInventory[type]) || 0));
  }
  return player.gunnerSpecialAmmoInventory;
}

function activateStoredGunnerSpecialAmmo(player, weaponId = player?.gunnerWeapon) {
  const inventory = ensureGunnerSpecialAmmoInventory(player);
  const activeType = String(player?.gunnerSpecialAmmoType || "");
  const nextType = GUNNER_SPECIAL_AMMO_TYPES.includes(activeType) && inventory[activeType] > 0
    ? activeType
    : GUNNER_SPECIAL_AMMO_TYPES.find((type) => inventory[type] > 0) || "";
  if (!nextType) {
    clearGunnerSpecialAmmo(player);
    return "";
  }
  player.gunnerSpecialAmmoType = nextType;
  player.gunnerSpecialAmmoWeapon = String(weaponId || player?.gunnerWeapon || DEFAULT_GUNNER_WEAPON);
  player.gunnerSpecialAmmoRounds = inventory[nextType];
  return nextType;
}

function gunnerSpecialAmmoTypeForShot(player, weaponId) {
  const inventory = ensureGunnerSpecialAmmoInventory(player);
  const type = String(player?.gunnerSpecialAmmoType || "");
  if (!GUNNER_SPECIAL_AMMO_TYPES.includes(type)) return "";
  if (String(player?.gunnerSpecialAmmoWeapon || "") !== String(weaponId || "")) return "";
  player.gunnerSpecialAmmoRounds = inventory[type];
  return inventory[type] > 0 ? type : "";
}

function clearGunnerSpecialAmmo(player) {
  player.gunnerSpecialAmmoType = "";
  player.gunnerSpecialAmmoWeapon = "";
  player.gunnerSpecialAmmoRounds = 0;
}

function consumeGunnerSpecialAmmoRound(player, weaponId) {
  const type = gunnerSpecialAmmoTypeForShot(player, weaponId);
  if (!type) return "";
  const inventory = ensureGunnerSpecialAmmoInventory(player);
  inventory[type] = Math.max(0, inventory[type] - 1);
  player.gunnerSpecialAmmoRounds = inventory[type];
  if (inventory[type] <= 0) activateStoredGunnerSpecialAmmo(player, weaponId);
  return type;
}

function applyShockSpecialRound(room, shooter, target, timestamp = now(), options = {}) {
  if (!target?.alive || target.ejected) return "miss";
  if (!options.ignoreFriendlyFire && botFriendlyTransactionBlocked(shooter, target)) return "botFriendlyFireBlocked";
  if (!options.ignoreFriendlyFire && shooter?.role === target.role && ["defender", "attacker"].includes(shooter?.role) && shooter.id !== target.id) {
    applyDefenderFriendlyFirePenalty(room, shooter, target, timestamp);
    return "friendlyFirePenalty";
  }
  if (!options.bypassSlashGuard) {
    const guardOutcome = resolveFighterSlashGuard(room, shooter, target, {
      kind: "shock-bullet",
      label: "ショック弾",
      physical: true,
      reflectable: true,
      damage: 0.01,
      hitZone: "body",
      reflectEffect: ({ defender, source }) => applyShockSpecialRound(room, defender, source, timestamp, {
        bypassSlashGuard: true,
        ignoreFriendlyFire: true,
        reflected: true
      })
    }, timestamp);
    if (guardOutcome) return guardOutcome;
  }
  if (absorbPreparationBarrier(room, target, timestamp, shooter)) return "preparationBarrier";
  if (hasFighterInfiniteResources(target) && !target.limitBreakActive) {
    syncFighterInfiniteResources(target);
    pushEvent(room, `${target.name} は無限HPと無限バリアでショック弾を防ぎました。`);
    touch(room);
    return "infiniteResources";
  }
  if (luckValueFor(target) < GUNNER_SHOCK_LOW_LUCK_THRESHOLD) {
    return killPlayer(room, shooter, target.id, {
      ranged: true,
      hitZone: "head",
      damage: 2,
      allowAnyKiller: true,
      ignoreRange: true,
      ignoreCooldown: true,
      preserveCooldown: true,
      ignoreFriendlyFire: true,
      bypassSlashGuard: true,
      targetRole: target.role,
      attackKind: options.reflected ? "reflected-shock-bullet" : "shock-bullet",
      attackLabel: options.reflected ? "反射されたショック弾" : "ショック弾",
      slashGuardPhysical: true
    });
  }
  if (rejectAdverseStatusDuringNaturalRecovery(room, target, "ショック弾減速", timestamp)) {
    pushEvent(room, `${target.name} はショック弾の減速を理知の自然回復で無効化しました。`);
    touch(room);
    return "statusImmune";
  }
  target.shockSlowedUntil = Math.max(Number(target.shockSlowedUntil) || 0, timestamp + GUNNER_SHOCK_SLOW_MS);
  pushEvent(room, `${target.name} はショック弾で6秒間移動速度が35%低下します。`);
  touch(room);
  return "shockSlowed";
}

function pushGunnerPenetrateImpact(room, shooter, targetEntry, endPoint, outcome) {
  // One physical contact for the first target of this authoritative round.
  // The shot end point lies on the bullet ray; the target center may not.
  if (!targetEntry || ["dodged", "fighterCountered", "botFriendlyFireBlocked"].includes(outcome)) return false;
  pushMagicEffect(room, "action-special-ammo-impact", endPoint, {
    radius: 145,
    playerId: shooter.id,
    targetId: targetEntry.player.id,
    variant: `penetrate:${outcome}`
  });
  return true;
}

function fireGunnerRound(room, shooter, weapon, timestamp, cadenceAt = timestamp) {
  const remainingAmmo = Math.max(0, Number(shooter.gunnerAmmo?.[weapon.id]) || 0);
  if (remainingAmmo < weapon.ammoPerShot) return false;
  const enhanceLevel = Number(shooter.gunnerBurstEnhanceLevel) > 0 ? 1 : 0;
  const gbo = Boolean(shooter.gunnerBurstGbo && shooter.gunnerBurstGboWeapon === weapon.id);
  const effectiveWeapon = gbo
    ? { ...weapon, range: weapon.range * GBO_PERFORMANCE_MULTIPLIER, cooldownMs: Math.max(1, weapon.cooldownMs / GBO_PERFORMANCE_MULTIPLIER) }
    : weapon;
  const { dx, dy } = finiteDirection(shooter.aimX, shooter.aimY, 0, 1);
  const previewSpecialAmmoType = previewGunnerSpecialAmmoType(shooter, weapon.id);
  const targetEntry = findGunnerTarget(room, shooter, effectiveWeapon, dx, dy, {
    ignoreCover: true,
    penetrate: previewSpecialAmmoType === "penetrate"
  });
  // A burst is a long-lived transaction. Revalidate the first physical body
  // before every round so an ally entering the lane pauses the magazine with
  // no ammo, cooldown, sound, ATE, event or friendly-fire penalty mutation.
  if (botFriendlyTransactionBlocked(shooter, targetEntry?.player)) return "friendlyLaneBlocked";

  shooter.gunnerAmmo[weapon.id] = remainingAmmo - weapon.ammoPerShot;
  recordBotVisibleHumanAttackStart(room, shooter, `gunner-${weapon.id}`, timestamp);
  const specialAmmoType = consumeGunnerSpecialAmmoRound(shooter, weapon.id);
  shooter.gunnerLastShotAt = timestamp;
  shooter.gunReadyAt = cadenceAt + effectiveWeapon.cooldownMs;
  pushSound(room, "gunshot", shooter, {
    ownerId: shooter.id,
    sourceKind: "player",
    maxDistance: weapon.soundDistance,
    volume: weapon.volume,
    variant: weapon.id
  });

  const endPoint = targetEntry
    ? { x: shooter.x + dx * targetEntry.along, y: shooter.y + dy * targetEntry.along }
    : shotEndPoint(room, shooter, dx, dy, effectiveWeapon.range);
  pushMagicEffect(room, "action-shoot", shooter, {
    radius: Math.max(90, weapon.lineWidth * 2),
    playerId: shooter.id,
    targetX: endPoint.x,
    targetY: endPoint.y,
    variant: weapon.id
  });
  if (specialAmmoType) {
    pushMagicEffect(room, "action-special-ammo-shot", shooter, {
      radius: Math.max(110, weapon.lineWidth * 2.2),
      playerId: shooter.id,
      targetId: targetEntry?.player?.id || "",
      targetX: endPoint.x,
      targetY: endPoint.y,
      variant: `${specialAmmoType}:${weapon.id}`
    });
  }

  if (targetEntry) {
    const aimed = Boolean(shooter.gunnerSnipingActive && hasGunnerAimAccess(shooter));
    const headshotResolution = ["weak", "shock"].includes(specialAmmoType)
      ? null
      : resolveGunnerHeadshot(shooter, aimed);
    if (headshotResolution) {
      shooter.gunnerLastHitZone = headshotResolution.hitZone;
      shooter.gunnerLastHeadshotChance = headshotResolution.chance;
      if (headshotResolution.headshot) shooter.gunnerHeadshotObserved = true;
      else shooter.gunnerBodyHitObserved = true;
    }
    if (shooter.isBot) {
      const botShotLabel = specialAmmoType === "weak"
          ? "ウィーク弾"
          : specialAmmoType === "shock"
            ? "ショック弾"
            : headshotResolution?.headshot
              ? `${aimed ? "エイム" : "腰撃ち"}・${specialAmmoType === "penetrate" ? "ペネトレイト弾" : `${gbo ? "GBO・" : ""}${weapon.name}`}HS`
              : `${aimed ? "エイム" : "腰撃ち"}・${specialAmmoType === "penetrate" ? "ペネトレイト弾" : `${gbo ? "GBO・" : ""}${weapon.name}の銃弾`}`;
      rememberBotKillDecision(room, shooter, targetEntry.player, {
        code: "visible-target-first-in-clear-gun-line",
        actionLabel: botShotLabel,
        reasons: [headshotResolution
          ? `射線上で最初に命中する対象を直接視認し、射程・弾薬・射撃間隔を満たして幸運補正込み${Math.round(headshotResolution.chance * 100)}%の${aimed ? "エイム" : "腰撃ち"}HS抽選を一度だけ解決した`
          : "射線上で最初に命中する対象を直接視認し、特殊弾固有の射程・弾薬・射撃間隔を満たした"]
      }, timestamp);
    }
    if (specialAmmoType === "weak") {
      pushMagicEffect(room, "action-special-ammo-impact", targetEntry.player, {
        radius: 145,
        playerId: shooter.id,
        targetId: targetEntry.player.id,
        variant: "weak:target-destruction"
      });
      const targetDestroyed = destroyPlayerUnconditionally(
        room,
        shooter,
        targetEntry.player,
        "ウィーク弾",
        {
          noKillCutin: false,
          attackType: "kill",
          attackKind: "weak-bullet",
          attackLabel: "ウィーク弾",
          slashGuardPhysical: true,
          slashGuardReflectable: true,
          reflectDestroy: true
        }
      );
      pushEvent(room, targetDestroyed
        ? `${shooter.name} のウィーク弾が命中し、${targetEntry.player.name}をキルしました。`
        : `${shooter.name} のウィーク弾は対象側の防御または反射でキルに至りませんでした。`);
      finishGunnerBurstRound(room, shooter, weapon, timestamp);
      checkWin(room);
      touch(room);
      return true;
    }
    if (specialAmmoType === "shock") {
      const outcome = applyShockSpecialRound(room, shooter, targetEntry.player, timestamp);
      pushMagicEffect(room, "action-special-ammo-impact", targetEntry.player, {
        radius: 135,
        playerId: shooter.id,
        targetId: targetEntry.player.id,
        variant: `shock:${outcome}`
      });
      finishGunnerBurstRound(room, shooter, weapon, timestamp);
      checkWin(room);
      touch(room);
      return true;
    }
    if (headshotResolution?.headshot) {
      const modeLabel = aimed ? "エイム" : "腰撃ち";
      const ammunitionLabel = specialAmmoType === "penetrate" ? "ペネトレイト弾" : `${gbo ? "GBO・" : ""}${weapon.name}`;
      pushMagicEffect(room, "action-gunner-headshot", targetEntry.player, {
        radius: 150,
        playerId: shooter.id,
        targetId: targetEntry.player.id,
        variant: `${aimed ? "aim" : "hip"}:${weapon.id}`
      });
      const outcome = killPlayer(room, shooter, targetEntry.player.id, {
        ranged: true,
        hitZone: "head",
        allowAnyKiller: true,
        targetRole: targetEntry.player.role,
        attackKind: specialAmmoType === "penetrate"
          ? `penetrate-${aimed ? "aim" : "hip"}-headshot`
          : `gunner-${aimed ? "aim" : "hip"}-headshot`,
        attackLabel: `${modeLabel}・${ammunitionLabel}HS`,
        slashGuardPhysical: true
      });
      if (specialAmmoType === "penetrate") {
        pushGunnerPenetrateImpact(room, shooter, targetEntry, endPoint, outcome);
      }
      finishGunnerBurstRound(room, shooter, weapon, timestamp);
      checkWin(room);
      touch(room);
      return true;
    }
    const baseDamage = gunnerDamageAtDistance(effectiveWeapon, targetEntry.along);
    const damage = Math.round(baseDamage * (1 + enhanceLevel * GUNNER_ENHANCE_DAMAGE_PER_LEVEL) * (gbo ? GBO_PERFORMANCE_MULTIPLIER : 1) * 100) / 100;
    const outcome = killPlayer(room, shooter, targetEntry.player.id, {
      ranged: true,
      hitZone: "body",
      damage,
      allowAnyKiller: true,
      targetRole: targetEntry.player.role,
      attackKind: specialAmmoType === "penetrate" ? "penetrate-bullet" : gbo ? "gbo-bullet" : "bullet",
      attackLabel: specialAmmoType === "penetrate" ? "ペネトレイト弾" : `${gbo ? "GBO・" : ""}${weapon.name}の銃弾`,
      slashGuardPhysical: true
    });
    if (specialAmmoType === "penetrate") {
      pushGunnerPenetrateImpact(room, shooter, targetEntry, endPoint, outcome);
    }
    if (weapon.id === "taser" && !["lethal", "slashGuarded", "slashPerfectGuarded", "slashPerfectReflected"].includes(outcome) && targetEntry.player.alive) {
      if (rejectAdverseStatusDuringNaturalRecovery(room, targetEntry.player, "テーザー減速", timestamp)) {
        pushEvent(room, `${targetEntry.player.name} はテーザーの減速を理知の自然回復で無効化しました。`);
      } else {
        targetEntry.player.taserSlowedUntil = Math.max(targetEntry.player.taserSlowedUntil || 0, timestamp + weapon.slowMs * (gbo ? GBO_PERFORMANCE_MULTIPLIER : 1));
        pushMagicEffect(room, "action-taser", targetEntry.player, { radius: 95, playerId: shooter.id, targetId: targetEntry.player.id });
        pushEvent(room, `${targetEntry.player.name} はテーザーで痺れ、${Math.round(weapon.slowMs * (gbo ? GBO_PERFORMANCE_MULTIPLIER : 1) / 1000)}秒間移動速度が低下します。`);
      }
    }
  } else {
    touch(room);
  }
  finishGunnerBurstRound(room, shooter, weapon, timestamp);
  return true;
}

function advanceGunnerFire(room, shooter, timestamp = now()) {
  if (!shooter.gunFiring) return;
  const weapon = GUNNER_WEAPONS[shooter.gunFiringWeapon] || gunnerWeaponFor(shooter);
  if (room.phase !== "playing" || !shooter.alive || shooter.ejected || shooter.inVent || actionBlockedUntil(shooter) > timestamp || !itemStorageAvailable(shooter, timestamp)) {
    stopGunnerFire(room, shooter, { reason: "中断" });
    return;
  }
  // Preserve the scheduled cadence across a fast actor tick.  The upper bound
  // exceeds the current ACC18 × 250ms / 100ms maximum while protecting against
  // malformed stale deadlines.
  for (let shots = 0; shots < 512 && shooter.gunFiring && Number(shooter.gunReadyAt) <= timestamp; shots += 1) {
    const cadenceAt = Number(shooter.gunReadyAt) || timestamp;
    const fired = fireGunnerRound(room, shooter, weapon, timestamp, cadenceAt);
    if (fired === "friendlyLaneBlocked") return;
    if (!fired) {
      const gbo = Boolean(shooter.gunnerBurstGbo && shooter.gunnerBurstGboWeapon === weapon.id);
      stopGunnerFire(room, shooter, { reason: "弾切れ" });
      if (!gbo) startGunnerReload(room, shooter, weapon.id, timestamp, "弾倉が空になったため");
      return;
    }
  }
}

function shootGunner(room, shooter, rawDx, rawDy, action = "start", rawHoldMs = 0, chargeId = "", serverInternal = false) {
  return withHeldEnhanceActivation(room, shooter, () => {
    if (!hasFirearmAccess(shooter)) throw new ApiError(403, "使用できる銃器を所持していません。");
    if (action === "stop") {
      // Trigger release no longer controls firing. One accepted activation owns
      // the current magazine until it is consumed or an authoritative state
      // interruption stops it.
      return;
    }
    if (room.phase !== "playing") throw new ApiError(400, "バトル中のみ射撃できます。");
    if (!shooter.alive || shooter.ejected || shooter.inVent) throw new ApiError(403, "現在は射撃できません。");
    ensureAbilityAvailable(shooter);
    ensureItemStorageAvailable(shooter);
    if (shooter.gunFiring) return;
    const timestamp = now();
    const weapon = gunnerWeaponFor(shooter);
    if (!shooter.gunnerAmmo || typeof shooter.gunnerAmmo !== "object") shooter.gunnerAmmo = createGunnerAmmo();
    if ((Number(shooter.gunnerReloadUntil) || 0) > timestamp) throw new ApiError(400, "リロード中です。");
    const remainingAmmo = Math.max(0, Number(shooter.gunnerAmmo[weapon.id]) || 0);
    if (remainingAmmo < weapon.ammoPerShot) {
      startGunnerReload(room, shooter, weapon.id, timestamp, "弾倉が空のため");
      return;
    }
    if (availableStamina(shooter) < GUNNER_BURST_STAMINA_COST) {
      throw new ApiError(400, `1弾倉射撃にはスタミナ ${GUNNER_BURST_STAMINA_COST} が必要です。`);
    }
    // Clear only lost ownership before choosing a tracked direction. Valid Aim
    // still acquires at its original post-validation point below.
    if (!hasGunnerAimAccess(shooter)) clearGunnerAim(shooter);
    const fallbackDx = Number.isFinite(Number(shooter.aimX)) ? Number(shooter.aimX) : 0;
    const fallbackDy = Number.isFinite(Number(shooter.aimY)) ? Number(shooter.aimY) : 1;
    let dx = shooter.gunnerSnipingActive ? fallbackDx : clampNumber(rawDx, -1, 1, fallbackDx);
    let dy = shooter.gunnerSnipingActive ? fallbackDy : clampNumber(rawDy, -1, 1, fallbackDy);
    const length = Math.hypot(dx, dy) || 1;
    dx /= length;
    dy /= length;
    // The planner may correctly select an enemy while an allied body physically
    // stands first in the firing lane. Reject before held-power settlement,
    // stamina spend or burst ownership so the Bot never attacks toward its ally.
    if (botGunnerFriendlyLaneBlock(room, shooter, weapon, dx, dy)) {
      throw new ApiError(409, "味方が射線上にいるためBOTは射撃を保留します。");
    }
    const power = resolveHeldPowerMode(room, shooter, rawHoldMs, `${weapon.name}ため撃ち`, {
      kind: "shoot",
      itemId: `weapon:${weapon.id}`,
      chargeId,
      gboEligible: true,
      allowUnchargedNormal: Boolean(serverInternal)
    });
    const enhanceLevel = power.enhanceLevel;
    advanceGunnerAimPassive(room, shooter, timestamp);
    shooter.aimX = dx;
    shooter.aimY = dy;
    // Charge once only after all ordinary action validation has succeeded and
    // before the first projectile can leave the magazine.  Later rounds,
    // release and duplicate start requests own no additional SP transaction.
    spendStamina(shooter, GUNNER_BURST_STAMINA_COST, room, "1弾倉射撃");
    shooter.gunFiring = true;
    shooter.gunFiringWeapon = weapon.id;
    shooter.gunFiringSince = timestamp;
    shooter.gunnerBurstRoundsRemaining = Math.max(1, Math.ceil(remainingAmmo / weapon.ammoPerShot));
    shooter.gunnerBurstEnhanceLevel = enhanceLevel;
    shooter.gunnerBurstGbo = power.mode === "gbo";
    shooter.gunnerBurstGboWeapon = power.mode === "gbo" ? weapon.id : "";
    shooter.gunReadyAt = timestamp;
    if (power.mode === "gbo") pushGboOverdriveEffect(room, shooter, `weapon:${weapon.id}`, "magazine-commit");
    setImmediateFeedback(
      shooter,
      power.mode === "gbo" ? "GBO・1弾倉射撃" : enhanceLevel ? "エンハンス射撃" : "1弾倉射撃",
      `${weapon.name} / 残り${shooter.gunnerBurstRoundsRemaining}発${power.mode === "gbo" ? " / 通常ダメージ・射程・cadence×10 / 完了・中断時に武器破壊" : enhanceLevel ? ` / 与ダメージ×${(1 + enhanceLevel * GUNNER_ENHANCE_DAMAGE_PER_LEVEL).toFixed(1)}` : ""}`
    );
    advanceGunnerFire(room, shooter, timestamp);
    touch(room);
  });
}

function startGunnerReload(room, player, weaponId = gunnerWeaponFor(player).id, timestamp = now(), reason = "") {
  const weapon = GUNNER_WEAPONS[weaponId];
  if (!weapon || !gunnerWeaponAvailable(player, weaponId)) return false;
  player.gunnerAmmo ||= createGunnerAmmo();
  if ((Number(player.gunnerAmmo[weaponId]) || 0) >= weapon.maxAmmo) return false;
  if ((Number(player.gunnerReloadUntil) || 0) > timestamp && player.gunnerReloadWeapon === weaponId) return false;
  stopGunnerFire(room, player, { reason: "リロード" });
  if (!gunnerWeaponAvailable(player, weaponId)) return false;
  player.gunnerReloadWeapon = weaponId;
  player.gunnerReloadUntil = timestamp + GUNNER_RELOAD_MS;
  pushMagicEffect(room, "action-reload", player, { radius: 90, playerId: player.id, variant: `${weapon.id}:start` });
  pushEvent(room, `${player.name} が${weapon.name}の自動リロードを開始しました${reason ? `（${reason}）` : ""}。`);
  touch(room);
  return true;
}

function advanceGunnerReload(room, player, timestamp = now()) {
  if (room.phase === "meeting") return false;
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent || !hasFirearmAccess(player)) {
    player.gunnerReloadUntil = 0;
    player.gunnerReloadWeapon = "";
    return false;
  }
  const activeUntil = Number(player.gunnerReloadUntil) || 0;
  if (activeUntil > 0) {
    if (timestamp < activeUntil) return false;
    const weaponId = player.gunnerReloadWeapon;
    const weapon = GUNNER_WEAPONS[weaponId];
    player.gunnerReloadUntil = 0;
    player.gunnerReloadWeapon = "";
    if (!weapon || !gunnerWeaponAvailable(player, weaponId)) return false;
    player.gunnerAmmo ||= createGunnerAmmo();
    player.gunnerAmmo[weaponId] = weapon.maxAmmo;
    pushMagicEffect(room, "action-reload", player, { radius: 90, playerId: player.id, variant: `${weapon.id}:complete` });
    setImmediateFeedback(player, "自動リロード完了", `${weapon.name} ${weapon.maxAmmo}発`);
    touch(room);
    return true;
  }
  if (player.gunFiring) return false;
  const weapon = gunnerWeaponFor(player);
  if (!gunnerWeaponAvailable(player, weapon.id)) return false;
  const ammo = Math.max(0, Number(player.gunnerAmmo?.[weapon.id]) || 0);
  if (ammo >= weapon.maxAmmo) return false;
  const lastShotAt = Number(player.gunnerLastShotAt) || 0;
  if (ammo < weapon.ammoPerShot || (lastShotAt > 0 && timestamp - lastShotAt >= GUNNER_IDLE_AUTO_RELOAD_DELAY_MS)) {
    return startGunnerReload(room, player, weapon.id, timestamp, ammo < weapon.ammoPerShot ? "弾倉が空のため" : "射撃停止後の自動補填");
  }
  return false;
}

function nextGunnerSpecialAmmoType(player) {
  let bag = Array.isArray(player.gunnerSpecialAmmoBag)
    ? player.gunnerSpecialAmmoBag.filter((type) => GUNNER_SPECIAL_AMMO_TYPES.includes(type))
    : [];
  if (!bag.length) {
    bag = [...GUNNER_SPECIAL_AMMO_TYPES];
    for (let index = bag.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
    }
    const previous = String(player.gunnerSpecialAmmoType || "");
    if (bag.length > 1 && bag[0] === previous) [bag[0], bag[1]] = [bag[1], bag[0]];
  }
  const type = bag.shift() || GUNNER_SPECIAL_AMMO_TYPES[0];
  player.gunnerSpecialAmmoBag = bag;
  return type;
}

function advanceGunnerSpecialAmmoPassive(room, player, timestamp = now()) {
  if (room.phase === "meeting") return false;
  const eligible = room.phase === "playing" &&
    player.alive &&
    !player.ejected &&
    !player.inVent &&
    hasGunnerSpecialAmmoAccess(player) &&
    passivesEnabled(player);
  if (!eligible) {
    player.gunnerSpecialAmmoReadyAt = 0;
    return false;
  }
  if (!(Number(player.gunnerSpecialAmmoReadyAt) > 0)) {
    player.gunnerSpecialAmmoReadyAt = timestamp + GUNNER_SPECIAL_AMMO_INTERVAL_MS;
    return false;
  }
  if (timestamp < player.gunnerSpecialAmmoReadyAt) return false;
  const weapon = gunnerWeaponFor(player);
  if (!gunnerWeaponAvailable(player, weapon.id)) {
    player.gunnerSpecialAmmoReadyAt = timestamp + GUNNER_SPECIAL_AMMO_INTERVAL_MS;
    return false;
  }
  const type = nextGunnerSpecialAmmoType(player);
  const inventory = ensureGunnerSpecialAmmoInventory(player);
  player.gunnerAmmo ||= createGunnerAmmo();
  player.gunnerAmmo[weapon.id] = weapon.maxAmmo;
  inventory[type] += weapon.maxAmmo;
  // A different newly awarded kind remains stored while a valid loaded kind
  // stays active. Whichever kind is active is rebound to the firearm selected
  // at award time; later weapon switches rebind it again.
  const activeType = activateStoredGunnerSpecialAmmo(player, weapon.id);
  player.gunnerSpecialAmmoReadyAt = timestamp + GUNNER_SPECIAL_AMMO_INTERVAL_MS;
  if (player.gunnerReloadWeapon === weapon.id) {
    player.gunnerReloadUntil = 0;
    player.gunnerReloadWeapon = "";
  }
  pushMagicEffect(room, "action-special-ammo-load", player, {
    radius: 125,
    playerId: player.id,
    variant: `${type}:${weapon.id}`
  });
  const activeLabel = gunnerSpecialAmmoLabel(activeType || type);
  setImmediateFeedback(player, "特殊弾獲得", `${gunnerSpecialAmmoLabel(type)} +${weapon.maxAmmo}発 / ${activeLabel}を${weapon.shortName || weapon.name}へ適用 / ${gunnerSpecialAmmoLabel(type)}所持${inventory[type]}発`);
  pushEvent(room, `${player.name} が${gunnerSpecialAmmoLabel(type)}弾を${weapon.maxAmmo}発獲得し、装填中の${activeLabel}を選択中の${weapon.shortName || weapon.name}へ適用しました（${gunnerSpecialAmmoLabel(type)}所持${inventory[type]}発）。`);
  touch(room);
  return true;
}

function reloadGunner(room, player) {
  if (room.phase !== "playing" || !hasFirearmAccess(player) || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(403, "現在はリロードできません。");
  }
  ensureConscious(player);
  ensureItemStorageAvailable(player);
  const weapon = gunnerWeaponFor(player);
  if ((Number(player.gunnerAmmo?.[weapon.id]) || 0) >= weapon.maxAmmo) throw new ApiError(400, "弾倉は満タンです。");
  startGunnerReload(room, player, weapon.id, now(), "手動要求");
}

function clearGunnerAim(player) {
  if (!player) return false;
  const changed = Boolean(player.gunnerSnipingActive || player.gunnerAimTargetId);
  player.gunnerSnipingActive = false;
  player.gunnerAimTargetId = "";
  return changed;
}

function gunnerAimCandidates(room, player) {
  const weapon = gunnerWeaponFor(player);
  return [...room.players.values()]
    .filter((target) => (
      target.id !== player.id &&
      target.alive &&
      !target.ejected &&
      !target.inVent &&
      distance(player, target) <= weapon.range
    ))
    .filter((target) => {
      const dx = target.x - player.x;
      const dy = target.y - player.y;
      const length = Math.hypot(dx, dy) || 1;
      return clearShotPath(room, player, target, dx / length, dy / length);
    })
    .sort((a, b) => distance(player, a) - distance(player, b) || a.id.localeCompare(b.id));
}

function gunnerAimMovementAllowed(player) {
  return String(player?.movementMode || "idle") !== "dash";
}

function advanceGunnerAimPassive(room, player, timestamp = now()) {
  const eligible = Boolean(
    room?.phase === "playing" &&
    player?.alive &&
    !player.ejected &&
    !player.inVent &&
    hasGunnerAimAccess(player) &&
    passivesEnabled(player) &&
    gunnerAimMovementAllowed(player)
  );
  if (!eligible) return clearGunnerAim(player);
  const candidates = gunnerAimCandidates(room, player);
  const previousTargetId = String(player.gunnerAimTargetId || "");
  const target = candidates.find((candidate) => candidate.id === previousTargetId) || candidates[0] || null;
  if (!target) return clearGunnerAim(player);
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const length = Math.hypot(dx, dy) || 1;
  player.aimX = dx / length;
  player.aimY = dy / length;
  player.gunnerSnipingActive = true;
  player.gunnerAimTargetId = target.id;
  if (target.id !== previousTargetId) {
    pushMagicEffect(room, "gunner-passive-aim", player, {
      radius: 118,
      playerId: player.id,
      targetId: target.id,
      targetX: target.x,
      targetY: target.y,
      variant: gunnerWeaponFor(player).id,
      durationMs: 900
    });
    setImmediateFeedback(player, "エイム", "非ダッシュ・可視対象を追尾");
  }
  return true;
}

function useHeavyWeapon(room, player, weaponId, rawHoldMs = 0, chargeId = "") {
  return withHeldEnhanceActivation(room, player, () => {
    if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
      throw new ApiError(403, "現在は重火器を使用できません。");
    }
    ensureAbilityAvailable(player);
    ensureItemStorageAvailable(player);
    const weapon = String(weaponId || "");
    if (!HEAVY_WEAPON_DEFINITIONS[weapon]) throw new ApiError(400, "重火器の種類が不正です。");
    const index = (player.heavyWeapons || []).indexOf(weapon);
    if (index < 0) throw new ApiError(400, "その重火器を所持していません。");
    const power = resolveHeldPowerMode(room, player, rawHoldMs, HEAVY_WEAPON_DEFINITIONS[weapon].label, {
      kind: "use",
      itemId: `heavy:${weapon}`,
      chargeId,
      gboEligible: false
    });
    const performanceMultiplier = power.mode === "gbo"
      ? GBO_PERFORMANCE_MULTIPLIER
      : 1 + power.enhanceLevel * GUNNER_ENHANCE_DAMAGE_PER_LEVEL;
    player.heavyWeapons.splice(index, 1);
    if (power.mode === "gbo") pushGboOverdriveEffect(room, player, `heavy:${weapon}`, "heavy-use");
    const targets = [...room.players.values()].filter((target) => target.id !== player.id && target.alive && !target.ejected && !target.inVent);
    if (weapon === "rpg") {
      const rpgRange = 300 * performanceMultiplier;
      const rpgPath = resolveVectorAttackPath(room, player, player.aimX, player.aimY, rpgRange, { collisionRadius: 2 });
      for (const target of targets.filter((candidate) => {
        if (player.isBot && !botCanAttackTarget(room, player, candidate, now())) return false;
        const candidateDistance = distance(player, candidate);
        if (candidateDistance > rpgRange) return false;
        const dx = (candidate.x - player.x) / Math.max(candidateDistance, 1);
        const dy = (candidate.y - player.y) / Math.max(candidateDistance, 1);
        return clearShotPath(room, player, candidate, dx, dy);
      })) {
        try {
          killPlayer(room, player, target.id, {
            ranged: true, hitZone: "body", damage: 1 * performanceMultiplier, ignoreRange: true,
            allowAnyKiller: true, targetRole: target.role, magic: false,
            attackKind: "rpg", attackLabel: "RPG弾", slashGuardPhysical: true
          });
        } catch {}
      }
      pushMagicEffect(room, "gunner-rpg", player, { radius: rpgRange, playerId: player.id, targetX: rpgPath.x, targetY: rpgPath.y, variant: power.mode });
    } else if (weapon === "missile") {
      const target = player.isBot
        ? botMissileTarget(room, player, now())
        : targets
          .filter((candidate) => {
            if (candidate.role === player.role) return false;
            const candidateDistance = distance(player, candidate);
            const dx = (candidate.x - player.x) / Math.max(candidateDistance, 1);
            const dy = (candidate.y - player.y) / Math.max(candidateDistance, 1);
            return clearShotPath(room, player, candidate, dx, dy);
          })
          .sort((a, b) => distance(player, a) - distance(player, b) || a.id.localeCompare(b.id))[0];
      if (target) {
        try {
          killPlayer(room, player, target.id, {
            ranged: true, hitZone: "head", damage: performanceMultiplier, ignoreRange: true,
            allowAnyKiller: true, targetRole: target.role, magic: false,
            attackKind: "missile", attackLabel: "ミサイル", slashGuardPhysical: true
          });
        } catch {}
        pushMagicEffect(room, "gunner-missile", player, { radius: 150 * performanceMultiplier, playerId: player.id, targetId: target.id, targetX: target.x, targetY: target.y, variant: power.mode });
      }
    }
    pushSound(room, "heavyWeapon", player, { ownerId: player.id, sourceKind: "weapon", maxDistance: 10000, volume: 1.25, variant: weapon });
    pushEvent(room, `${player.name} が${HEAVY_WEAPON_DEFINITIONS[weapon].label}を使用しました${power.mode === "gbo" ? "（GBO・数値性能×10・武具破壊）" : power.enhanceLevel ? "（エンハンス）" : ""}。`);
    checkWin(room);
    touch(room);
  });
}

function reportBody(room, player, bodyId = "") {
  if (room.phase !== "playing") throw new ApiError(400, "いまは通報できません。");
  if (!player.alive || player.ejected || player.inVent) throw new ApiError(403, "通報できません。");
  ensureConscious(player);
  const map = getMap(room);
  const body = room.bodies
    .map((item) => ({ item, dist: distance(player, item) }))
    .filter(({ item, dist }) => dist <= map.reportRange && (!bodyId || item.id === bodyId))
    .sort((a, b) => a.dist - b.dist)[0]?.item;
  if (!body) throw new ApiError(404, "近くに通報対象がありません。");
  const visibleEvidenceTarget = player.isBot ? botKnownAttackerEvidence(room, player, now()) : null;
  const suspectId = visibleEvidenceTarget && botCanCommitLuminous(room, player, visibleEvidenceTarget.id)
    ? String(visibleEvidenceTarget.id)
    : "";
  if (player.isBot && !suspectId) throw new ApiError(403, "ルミナスを実行しないBOTは通報しません。");
  startMeeting(room, `${player.name} が ${body.name} を通報`, player.id, {
    suspectId,
    evidenceKind: suspectId ? String(player.botWitnessEvidenceKind || "witness") : ""
  });
}

function runAutomaticHumanBodyReports(room, timestamp = now()) {
  if (room.phase !== "playing" || !room.bodies.length) return false;
  const reportRange = getMap(room).reportRange;
  for (const player of room.players.values()) {
    if (player.isBot || !player.alive || player.ejected || player.inVent) continue;
    if (actionBlockedUntil(player) > timestamp) continue;
    const body = room.bodies
      .map((item) => ({ item, dist: distance(player, item) }))
      .filter(({ item, dist }) => (
        dist <= reportRange &&
        !(item.killerId === player.id && timestamp - (Number(item.at) || timestamp) < AUTO_REPORT_POST_KILL_GRACE_MS)
      ))
      .sort((a, b) => a.dist - b.dist)[0]?.item;
    if (!body) continue;
    try {
      reportBody(room, player, body.id);
      return true;
    } catch {}
  }
  return false;
}

function callEmergency(room, player, suspectId = "", evidenceKind = "") {
  if (room.phase !== "playing") throw new ApiError(400, "いまはEmergencyを押せません。");
  if (!player.alive || player.ejected || player.inVent) throw new ApiError(403, "Emergencyを押せません。");
  ensureConscious(player);
  if (player.emergenciesLeft <= 0) throw new ApiError(400, "Emergency回数を使い切っています。");
  player.emergenciesLeft -= 1;
  player.smartphoneAction = "emergency";
  player.smartphoneSuspectId = String(suspectId || "");
  player.smartphoneEvidenceKind = String(evidenceKind || "");
  player.smartphoneUntil = now() + SMARTPHONE_ACTION_MS;
  player.vx = 0;
  player.vy = 0;
  pushMagicEffect(room, "action-smartphone", player, { radius: 85, playerId: player.id, variant: "emergency" });
  pushEvent(room, `${player.name} がスマホで緊急会議を要請中です（${SMARTPHONE_ACTION_MS / 1000}秒行動不能）。`);
  touch(room);
}

function resolveSmartphoneAction(room, player, timestamp) {
  if (!player.smartphoneAction || player.smartphoneUntil > timestamp) return;
  const action = player.smartphoneAction;
  const suspectId = player.smartphoneSuspectId || "";
  const evidenceKind = player.smartphoneEvidenceKind || "";
  player.smartphoneAction = "";
  player.smartphoneUntil = 0;
  player.smartphoneSuspectId = "";
  player.smartphoneEvidenceKind = "";
  if (!player.alive || player.ejected || room.phase !== "playing") return;
  if (action === "emergency") {
    startMeeting(room, `${player.name} がスマホから緊急会議を招集`, player.id, { suspectId, evidenceKind });
    return;
  }
}

function makeUtility(room, player, type) {
  if (room.phase !== "playing") throw new ApiError(400, "会議中はUtilityを見られません。");
  if (player.ejected || player.inVent) throw new ApiError(403, "Utilityを見られません。");
  if (type === "cameras") throw new ApiError(404, "監視カメラは利用できません。");
  const utilityType = ["admin", "vitals", "doorlog"].includes(type) ? type : "admin";
  const map = getMap(room);
  const near = nearestStation(room, player, (station) => station.type === "utility" && station.utility === utilityType, map.taskRange);
  if (!near) throw new ApiError(400, `${nearUtilityLabel(utilityType)} 端末に近づいてください。`);

  if (utilityType === "admin") {
    const counts = new Map();
    for (const other of room.players.values()) {
      if (other.ejected || other.inVent || !other.alive) continue;
      const roomName = whichRoom(map, other);
      counts.set(roomName, (counts.get(roomName) || 0) + 1);
    }
    return {
      type: utilityType,
      title: "Census Console",
      lines: [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => `${name}: ${count}`)
    };
  }

  if (utilityType === "vitals") {
    return {
      type: utilityType,
      title: "Biometrics",
      lines: [...room.players.values()].map((other) => {
        const status = other.ejected ? "追放" : other.alive ? "生存" : "死亡";
        return `${other.name}: ${status}`;
      })
    };
  }



  return {
    type: utilityType,
    title: "Transit Log",
    lines: room.doorLog.length ? room.doorLog.slice(-12).map((entry) => entry.text) : ["ログなし"]
  };
}

function nearUtilityLabel(type) {
  return {
    admin: "Census Console",
    vitals: "Biometrics",
    doorlog: "Transit Log"
  }[type] || "Utility";
}

function vote(room, player, targetId) {
  if (room.phase !== "meeting" || !room.meeting) throw new ApiError(400, "投票中ではありません。");
  if (!player.alive || player.ejected) throw new ApiError(403, "投票できません。");
  if (now() < room.meeting.discussionEndsAt) throw new ApiError(400, "討論時間中です。");
  const target = targetId === "skip" ? "skip" : room.players.get(targetId)?.id;
  if (!target) throw new ApiError(404, "投票先がありません。");
  room.meeting.votes[player.id] = target;
  touch(room);
  maybeEndMeeting(room);
}

function removeDefeatedPlayerFromMeeting(meeting, playerId) {
  delete meeting.votes[playerId];
  for (const [voterId, targetId] of Object.entries(meeting.votes)) {
    if (targetId === playerId) meeting.votes[voterId] = "skip";
  }
}

function useLuminous(room, player, targetId) {
  if (room.phase !== "meeting" || !room.meeting) {
    throw new ApiError(400, "ルミナスは会議中のみ発動できます。");
  }
  if (player.role !== "defender") throw new ApiError(403, "ルミナスはディフェンダー専用です。");
  if (player.isBot && !botIsEnemyOfSoleHuman(room, player)) {
    throw new ApiError(403, "味方陣営のボットはルミナスを使用しません。");
  }
  if (!player.alive || player.ejected) throw new ApiError(403, "死亡または追放後は発動できません。");
  ensureConscious(player);
  if (player.luminousUsed) throw new ApiError(400, "ルミナスは1試合に1回だけ使用できます。");

  const target = room.players.get(targetId);
  if (!target || !target.alive || target.ejected || target.id === player.id) {
    throw new ApiError(404, "有効なルミナス対象がいません。");
  }

  const timestamp = now();
  player.luminousUsed = true;
  player.luminousActive = false;
  player.lastLuminousResultAt = timestamp;

  if (target.role === "attacker") {
    const luminousOutcome = {
      noBody: true,
      attackType: "kill",
      attackKind: "luminous-annihilation",
      attackLabel: "ルミナス",
      slashGuardPhysical: false,
      slashGuardReflectable: false,
      bypassSlashGuard: true,
      ignorePreparationBarrier: true
    };
    const annihilated = destroyPlayerUnconditionally(room, player, target, "ルミナス", luminousOutcome);
    if (luminousOutcome.killConvertedToBodyDamage) {
      player.lastLuminousResult = "body";
      pushEvent(room, `${player.name} のルミナスはバリアによりボディダメージへ変換されました。`);
    } else if (!annihilated) {
      player.lastLuminousResult = "blocked";
    }
    if (annihilated) {
      target.ejected = true;
      removeDefeatedPlayerFromMeeting(room.meeting, target.id);
      player.luminousActive = true;
      player.killsThisRound += 1;
      player.lastLuminousResult = "success";
      pushEvent(room, `${player.name} のルミナスが ${target.name} を死体なしでキルしました。`);
    }
  } else {
    recordBotMatchElimination(room, player, player);
    setGravityLevitationEngaged(room, player, false, "luminous-failure-death");
    player.alive = false;
    recordKillCamera(room, player, player, {
      timestamp,
      actionLabel: "ルミナス失敗の代償",
      actionKind: "luminous-failure",
      sourceLabel: `対象: ${target.name}`
    });
    player.inVent = false;
    player.ventId = "";
    player.bodyHits = 0;
    clearAttackState(player);
    completeTasksAfterDeath(room, player);
    removeDefeatedPlayerFromMeeting(room.meeting, player.id);
    player.lastLuminousResult = "failure";
    pushEvent(room, `${player.name} のルミナスは外れ、代償として死亡しました。`);
  }

  checkWin(room);
  if (room.phase === "meeting") maybeEndMeeting(room);
  touch(room);
}

function operatorState(room) {
  const operators = allOperators().map((operator) => ({
        id: operator.id,
        role: operator.role,
        originRole: operator.role,
        name: operator.name,
        special: operator.special,
        description: operator.description,
        details: operator.details,
        asset: operator.asset || "",
        limit: operator.limit,
        taken: operatorTakenCount(room, operator.id)
      }));
  return {
    defender: operators,
    attacker: operators
  };
}

function visibleStations(map) {
  return map.stations.filter((station) => (
    station.type !== "repair" &&
    (station.type !== "task" || station.task === "download" || station.task === "upload")
  ));
}

function visibleBodies(room, viewer) {
  return room.bodies.map((body) => {
    const killer = room.players.get(body.killerId);
    const showKillCutin = Boolean(
      !body.noKillCutin &&
      killer &&
      killer.id !== body.playerId &&
      (viewer.id === killer.id || viewer.id === body.playerId)
    );
    return {
      ...body,
      showKillCutin,
      killerId: showKillCutin ? body.killerId : "",
      killerName: showKillCutin ? body.killerName : "",
      killerIsBot: showKillCutin ? body.killerIsBot : false,
      killerSkinId: showKillCutin ? body.killerSkinId || "hood" : ""
    };
  });
}

function clearStoredMovementInput(player, receivedAt = now()) {
  player.lastMovementClock = 0;
  player.lastMovementReceivedAt = receivedAt;
  player.lastMovementDx = 0;
  player.lastMovementDy = 0;
  player.lastMovementDash = false;
  player.lastMovementSlow = false;
}

function movementElapsedSeconds(player, movementClock, receivedAt) {
  const previousClock = Number(player.lastMovementClock) || 0;
  const previousReceivedAt = Number(player.lastMovementReceivedAt) || receivedAt;
  if (!Number.isFinite(movementClock) || previousClock <= 0 || movementClock <= previousClock) return 0;
  const clientElapsed = (movementClock - previousClock) / 1000;
  const serverElapsed = Math.max(0, (receivedAt - previousReceivedAt) / 1000);
  return Math.min(
    MOVEMENT_MAX_ELAPSED_SECONDS,
    Math.max(0, clientElapsed),
    serverElapsed + 0.05
  );
}

function rememberMovementClock(room, plan, timestamp) {
  for (const [id, clock] of plan.players) {
    const player = room.players.get(id);
    if (!player || player.isBot) continue;
    const history = (player.movementClockHistory || []).filter(segment => segment.to > timestamp - 2000);
    for (const segment of clock.segments) {
      const previous = history.at(-1);
      if (previous && previous.to >= segment.to) continue;
      const entry = { ...segment, from: Math.max(segment.from, previous?.to ?? segment.from) };
      if (previous && previous.to === entry.from && previous.actorRate === entry.actorRate && previous.stopped === entry.stopped && JSON.stringify(previous.movementSource) === JSON.stringify(entry.movementSource)) previous.to = entry.to;
      else history.push(entry);
    }
    player.movementClockHistory = history.slice(-512);
  }
}

function advanceStoredMovement(room, player, elapsedSeconds) {
  const dx = Number(player.lastMovementDx) || 0;
  const dy = Number(player.lastMovementDy) || 0;
  if (Math.hypot(dx, dy) <= 0.0001 || elapsedSeconds <= 0) return;
  const timestamp = now();
  const from = timestamp - elapsedSeconds * 1000;
  const tailFrom = Math.max(Number(room.lastTickAt) || from, from);
  if (room.phase === "playing" && tailFrom < timestamp) rememberMovementClock(room, planRoomActorClock(room, tailFrom, timestamp), timestamp);
  const history = player.movementClockHistory || [];
  let at = from;
  while (at < timestamp - 0.00001) {
    const segment = history.find(entry => entry.from <= at && entry.to > at);
    // The preexisting input clock admits up to50ms jitter beyond wall time.
    // Only that uncovered leading allowance uses the earliest retained rate.
    const sample = segment || history.find(entry => entry.to > at) || {
      actorRate: playerProgressMultiplier(room, player, timestamp),
      stopped: timeKeeperStops(player, timestamp)
    };
    const end = Math.min(timestamp, segment ? segment.to : sample.from > at ? sample.from : timestamp);
    let remaining = (end - at) / 1000;
    while (remaining > 0.00001) {
      const step = Math.min(MOVEMENT_INTEGRATION_STEP_SECONDS, remaining);
      movePlayer(room, player, dx, dy, step, Boolean(player.lastMovementDash), Boolean(player.lastMovementSlow), sample);
      remaining -= step;
    }
    at = end;
  }
}

function storeMovementInput(player, body) {
  let dx = clampNumber(body.dx, -1, 1, 0);
  let dy = clampNumber(body.dy, -1, 1, 0);
  const length = Math.hypot(dx, dy);
  if (length > 1) {
    dx /= length;
    dy /= length;
  }
  player.lastMovementDx = dx;
  player.lastMovementDy = dy;
  player.lastMovementDash = Boolean(body.dash);
  player.lastMovementSlow = Boolean(body.slow);
  return { dx, dy };
}

function processMovementInput(room, player, body) {
  const receivedAt = now();
  const movementSession = String(body.movementSession || "").slice(0, 96);
  const movementSessionStartedAtRaw = Number(body.movementSessionStartedAt);
  const movementSessionStartedAt = Number.isFinite(movementSessionStartedAtRaw)
    ? Math.min(movementSessionStartedAtRaw, receivedAt + 60_000)
    : receivedAt;
  const movementSeq = Number(body.movementSeq);
  if (movementSession && Number.isSafeInteger(movementSeq) && movementSeq >= 0) {
    if (player.movementSession !== movementSession) {
      if (movementSessionStartedAt < player.movementSessionStartedAt) {
        return serializeMovement(room, player, movementSeq);
      }
      player.movementSession = movementSession;
      player.movementSessionStartedAt = movementSessionStartedAt;
      player.lastMovementSeq = -1;
      clearStoredMovementInput(player, receivedAt);
    }
    if (movementSeq <= player.lastMovementSeq) return serializeMovement(room, player, movementSeq);
    player.lastMovementSeq = movementSeq;
  }
  const movementClock = Number(body.movementClock);
  const elapsed = movementElapsedSeconds(player, movementClock, receivedAt);
  advanceStoredMovement(room, player, elapsed);
  if (room.phase === "playing" && Number(room.lastTickAt) < receivedAt) tickRoom(room);
  const input = storeMovementInput(player, body);
  player.lastMovementClock = Number.isFinite(movementClock) ? movementClock : 0;
  player.lastMovementReceivedAt = receivedAt;
  // Switch input state at the packet timestamp without assigning past time to
  // the new direction. The next packet integrates this stored input.
  movePlayer(room, player, input.dx, input.dy, 0, Boolean(body.dash), Boolean(body.slow));
  return serializeMovement(room, player, movementSeq, movementClock);
}

function finiteDirection(rawDx, rawDy, fallbackDx = 0, fallbackDy = 1) {
  const suppliedDx = Number(rawDx);
  const suppliedDy = Number(rawDy);
  const hasSuppliedDirection = Number.isFinite(suppliedDx) && Number.isFinite(suppliedDy) && Math.hypot(suppliedDx, suppliedDy) > 0.0001;
  const dx = hasSuppliedDirection ? suppliedDx : (Number.isFinite(Number(fallbackDx)) ? Number(fallbackDx) : 0);
  const dy = hasSuppliedDirection ? suppliedDy : (Number.isFinite(Number(fallbackDy)) ? Number(fallbackDy) : 1);
  const length = Math.hypot(dx, dy) || 1;
  return { dx: dx / length, dy: dy / length };
}

function hasFloorSupport(room, x, y, radius = 0) {
  const map = getMap(room);
  if (x < radius || y < radius || x > map.width - radius || y > map.height - radius) return false;
  return map.walkable.some((rect) => rectContains(rect, x, y, radius));
}

function adoptMovementSession(player, body) {
  const receivedAt = now();
  const movementSession = String(body?.movementSession || "").slice(0, 96);
  if (!movementSession) return;
  const requestedStartedAt = Number(body?.movementSessionStartedAt);
  player.movementSession = movementSession;
  player.movementSessionStartedAt = Number.isFinite(requestedStartedAt)
    ? Math.min(requestedStartedAt, receivedAt + 60_000)
    : receivedAt;
  player.lastMovementSeq = -1;
  player.lastMovementClock = 0;
  clearStoredMovementInput(player, receivedAt);
}

function resyncMovementSession(room, player, body) {
  adoptMovementSession(player, body);
  player.vx = 0;
  player.vy = 0;
  if (actionBlockedUntil(player) <= now()) player.movementMode = "idle";
  player.lastMoveAt = now();
  touch(room);
  return serialize(room, player);
}

function serializeMovement(room, player, movementSeq = player.lastMovementSeq, movementClock = player.lastMovementClock) {
  const timestamp = now();
  const movementAcc = movementAccState(room, player, timestamp);
  return {
    ok: true,
    serverNow: timestamp,
    roomId: room.id,
    playerId: player.id,
    movementSession: String(player.movementSession || ""),
    movementSeq: Number.isSafeInteger(movementSeq) ? movementSeq : 0,
    movementClock: Number.isFinite(movementClock) ? movementClock : Number(player.lastMovementClock) || 0,
    x: player.x,
    y: player.y,
    moveX: player.vx,
    moveY: player.vy,
    resting: Boolean(player.resting),
    movementMode: player.movementMode,
    speedMultiplier: effectiveMovementMultiplier(room, player, timestamp),
    accelerationMultiplier: effectiveAccelerationMultiplier(room, player, timestamp),
    actorTimeScale: playerProgressMultiplier(room, player, timestamp),
    movementAcc: movementAcc.selected,
    movementAccMax: movementAcc.maximum,
    movementAccEnabled: movementAcc.enabled,
    movementAccActive: movementAcc.active,
    movementAccAvailable: movementAcc.available,
    movementAccThreshold: movementAcc.threshold,
    slowedUntil: player.slowedUntil,
    taserSlowedUntil: player.taserSlowedUntil,
    shockSlowedUntil: player.shockSlowedUntil,
    quantumElectricSlowUntil: player.quantumElectricSlowUntil,
    gravityStormSlowUntil: player.gravityStormSlowUntil,
    gravityStormSlowMultiplier: player.gravityStormSlowMultiplier,
    lastGravityStormDamage: player.lastGravityStormDamage,
    alive: player.alive,
    ejected: player.ejected,
    inVent: player.inVent,
    stamina: serializeResourceValue(player.stamina),
    maxStoredStamina: serializeResourceValue(staminaCapacityFor(player))
  };
}

// Result owns one numeric domain only: rank points.  Commit its named facts
// together with the total so the client never has to infer, recalculate, or
// relabel a score from gameplay state. An Idea winner/loser still won/lost.
function calculateResultPointBreakdown(room, player) {
  const players = [...room.players.values()];
  const attackers = players.filter((entry) => entry.role === "attacker");
  const defenders = players.filter((entry) => entry.role === "defender");
  const attackerQuota = Math.max(
    1,
    Number(room.killRateAttackerTarget) || Math.ceil(defenders.length / Math.max(1, attackers.length))
  );
  const kills = Math.max(0, Number(player.totalKills) || 0);
  const killPoints = player.role === "attacker" ? Math.floor(kills / attackerQuota) : kills;
  const decidedOutcome = room.winner === "defenders" || room.winner === "attackers" || room.winner === "idea";
  const won = room.winner === "idea"
    ? ideaWinnerIdsFor(room).includes(player.id)
    : room.winner === "defenders"
      ? player.role === "defender"
      : room.winner === "attackers" && player.role === "attacker";
  const outcomePoints = decidedOutcome ? (won ? 1 : -1) : 0;
  const facts = [];
  if (killPoints > 0) {
    facts.push(Object.freeze({
      // Keep the Result's visible numerals in the one rank-point domain. The
      // quota remains authoritative here but is not exposed as a second count.
      reason: player.role === "attacker" ? "攻撃キル換算" : "防衛キル",
      points: killPoints
    }));
  }
  if (outcomePoints !== 0) {
    facts.push(Object.freeze({ reason: outcomePoints > 0 ? "勝利" : "敗北", points: outcomePoints }));
  }
  return Object.freeze(facts);
}

function calculateResultPoints(room, player) {
  return calculateResultPointBreakdown(room, player)
    .reduce((total, fact) => total + fact.points, 0);
}

// Commit a self-contained board exactly once.  All later Result serialization
// and profile updates read this immutable transaction instead of recalculating.
function commitResultBoard(room) {
  if (room.resultBoardCommitted) return false;
  const ordered = [...room.players.values()]
    .map((player) => {
      const pointBreakdown = calculateResultPointBreakdown(room, player);
      return {
        player,
        pointBreakdown,
        points: pointBreakdown.reduce((total, fact) => total + fact.points, 0)
      };
    })
    .sort((left, right) => (
      right.points - left.points ||
      left.player.name.localeCompare(right.player.name, "ja") ||
      left.player.id.localeCompare(right.player.id)
    ));
  const mvpPlayerId = ordered[0]?.player.id || "";
  room.resultBoardByPlayerId = Object.fromEntries(ordered.map(({ player, points, pointBreakdown }) => {
    const mvp = player.id === mvpPlayerId;
    const committedBreakdown = mvp
      ? Object.freeze([...pointBreakdown, Object.freeze({ reason: "MVP", points: 1 })])
      : pointBreakdown;
    return [player.id, Object.freeze({
      points: points + (mvp ? 1 : 0),
      mvp,
      pointBreakdown: committedBreakdown
    })];
  }));
  room.resultBoardCommitted = true;
  return true;
}

function resultBoardEntries(room) {
  if (!room.resultBoardCommitted) return [];
  const entries = [...room.players.values()]
    .map((player) => {
      const board = room.resultBoardByPlayerId?.[player.id];
      if (!board) return null;
      return {
        id: player.id,
        name: player.name,
        isBot: player.isBot,
        color: player.color,
        skinId: player.skinId || (player.isBot ? "operator" : "hood"),
        role: player.role,
        operatorId: player.operatorId,
        mvp: Boolean(board.mvp),
        points: Number(board.points) || 0,
        // This is the sealed, named rank-point ledger for the row. Do not
        // expose contribution, placement, or client-derived score aliases.
        pointBreakdown: Array.isArray(board.pointBreakdown)
          ? board.pointBreakdown.map((fact) => ({ reason: String(fact.reason || ""), points: Number(fact.points) || 0 }))
          : []
      };
    })
    .filter(Boolean)
    .sort((a, b) => (
      b.points - a.points ||
      a.name.localeCompare(b.name, "ja") ||
      a.id.localeCompare(b.id)
    ));

  return entries;
}

function resultBoard(room) {
  return resultBoardEntries(room);
}

function magicEffectsForViewer(room, viewer, timestamp = now()) {
  return (room.magicEffects || []).flatMap((effect) => {
    if (effect.viewerId && effect.viewerId !== viewer.id) return [];
    if (effect.type === "flora-sunbeam") {
      const owner = room.players.get(String(effect.playerId || ""));
      if (
        room.phase === "playing" && owner && owner.id !== viewer.id &&
        floraInvisibleActive(owner, timestamp)
      ) return [];
      return [effect];
    }
    if (!(effect.type === "transfer-in" || effect.type === "transfer-out" || effect.type === "action-warp" || effect.type === "action-teleport")) {
      return [effect];
    }
    const owner = room.players.get(String(effect.playerId || ""));
    if (
      room.phase === "playing" && owner && owner.id !== viewer.id &&
      floraInvisibleActive(owner, timestamp)
    ) return [];

    const target = room.players.get(String(effect.targetId || ""));
    const targetConcealed = Boolean(
      room.phase === "playing" && target && target.id !== viewer.id &&
      floraInvisibleActive(target, timestamp)
    );
    if (!targetConcealed) return [effect];

    // Departure x/y is the transported actor's origin, not a caster-local
    // point. Keeping it would still disclose a concealed target's position.
    if (effect.type === "action-teleport") return [];

    // Keep the visible actor's local presentation while applying the same
    // concealment boundary as serialized player positions to remote endpoints.
    const redacted = { ...effect, targetId: "", targetX: null, targetY: null };
    if (effect.type === "transfer-in") {
      redacted.acquisitionOriginX = null;
      redacted.acquisitionOriginY = null;
    }
    return [redacted];
  });
}

function soundsForViewer(room, viewer, timestamp = now()) {
  return (room.sounds || []).filter((sound) => {
    if (sound.type !== "sunbeam" || room.phase !== "playing") return true;
    const ownerId = String(sound.ownerId || "");
    if (ownerId === viewer.id) return true;
    const owner = room.players.get(ownerId);
    return !owner || !floraInvisibleActive(owner, timestamp);
  });
}

function serialize(room, viewer, options = {}) {
  if (!options.skipTick) tickRoom(room);
  const map = getMap(room);
  const timestamp = now();
  reconcileBarrierExpiry(room, timestamp);
  const revealRoles = room.phase === "ended";
  const meetingVotes = room.meeting
    ? buildVoteSummary(room, viewer)
    : null;
  const operatorTurnPlayer = room.phase === "selecting" ? currentOperatorPlayer(room) : null;
  const viewerObjectEffects = activeMapObjectEffects(room, viewer);
  const receivedDecelerate = receivedDecelerateStatusFor(room, viewer, timestamp);
  const viewerSelfDecelerateController = Boolean(
    viewer.gravityTimeMode === "decelerate" &&
    receivedGravityTimeControllersFor(room, viewer, timestamp).includes(viewer)
  );

  const players = [...room.players.values()].map((player) => {
    const attackerAlly = viewer.role === "attacker" && player.role === "attacker" && player.id !== viewer.id;
    const roleVisible = player.id === viewer.id || attackerAlly || revealRoles || room.phase === "lobby" || room.phase === "selecting";
    const aromaSource = floraAromaSource(room, player);
    const concealedFromViewer = room.phase === "playing" && player.id !== viewer.id && floraInvisibleActive(player, timestamp);
    const publicDesireRenkiRecovery = Boolean(player.desireRenkiRecovery && player.alive && !player.ejected && !player.inVent && Number(player.meditatingUntil) > timestamp);
    // Non-owners receive only a visible actor deadline, never an aim target id.
    const publicNinjutsuFocus = Boolean(room.phase === "playing" && player.alive && !player.ejected && !player.inVent && player.aimTargetId && Number(player.aimReadyAt) > timestamp);
    const serializedPlayer = {
      id: player.id,
      name: player.name,
      kd: profileFor(player) ? `${Number(profileFor(player).kills) || 0}/${Number(profileFor(player).deaths) || 0}` : "0/0",
      rank: profileFor(player)?.rank || "bronze",
      isBot: player.isBot,
      midJoinAvailable: player.midJoinAvailable,
      host: player.id === room.hostId,
      color: player.color,
      skinId: player.skinId || (player.isBot ? "operator" : "hood"),
      role: roleVisible ? player.role : "unknown",
      attackerAlly,
      special: player.id === viewer.id || room.phase === "ended" ? player.special : null,
      operatorId: roleVisible ? player.operatorId : "",
      operatorReady: roleVisible ? player.operatorReady : false,
      alive: player.alive,
      ejected: player.ejected,
      preparationBarrierActive: preparationBarrierProtects(room, player, timestamp) || standFirmBarrierProtects(player, timestamp),
      standFirmBarrierActive: false,
      barrierDurability: Math.max(0, Number(player.barrierDurability) || 0),
      barrierMaxDurability: DURABLE_COMBAT_BALANCE.barrierCapacity,
      bustUntil: player.alive ? Number(player.bustUntil) || 0 : 0,
      damageReactionDurationMs: DURABLE_COMBAT_BALANCE.hitstunMs,
      damageReactionStartedAt: player.alive ? Number(player.damageReactionStartedAt) || 0 : 0,
      damageReactionUntil: player.alive ? Number(player.damageReactionUntil) || 0 : 0,
      damageReactionDx: Number(player.damageReactionDx) || 0,
      damageReactionDy: Number(player.damageReactionDy) || 0,
      chatMuted: player.id === viewer.id ? player.chatMuted : false,
      x: Math.round(player.x),
      y: Math.round(player.y),
      moveX: player.vx,
      moveY: player.vy,
      moving: Math.hypot(player.vx, player.vy) > 0.01,
      movementMode: player.movementMode,
      resting: Boolean(player.resting),
      relocationRevision: Math.max(0, Number(player.relocationRevision) || 0),
      movementSession: player.id === viewer.id ? String(player.movementSession || "") : "",
      movementSeq: player.id === viewer.id && Number.isSafeInteger(player.lastMovementSeq) ? player.lastMovementSeq : 0,
      movementClock: player.id === viewer.id && Number.isFinite(player.lastMovementClock) ? player.lastMovementClock : 0,
      gunnerWeapon: gunnerWeaponFor(player).id,
      gunFiring: Boolean(player.gunFiring),
      gunFiringWeapon: player.gunFiringWeapon || "",
      gunFiringSince: Number(player.gunFiringSince) || 0,
      gunnerBurstRoundsRemaining: Math.max(0, Math.floor(Number(player.gunnerBurstRoundsRemaining) || 0)),
      gunnerBurstEnhanceLevel: Math.max(0, Math.floor(Number(player.gunnerBurstEnhanceLevel) || 0)),
      enhanceChargeStartedAt: Number(player.enhanceChargeStartedAt) || 0,
      enhanceChargeKind: String(player.enhanceChargeKind || ""),
      enhanceChargeItemId: String(player.enhanceChargeItemId || ""),
      aimX: Number.isFinite(Number(player.aimX)) ? Number(player.aimX) : 0,
      aimY: Number.isFinite(Number(player.aimY)) ? Number(player.aimY) : 1,
      slowedUntil: player.slowedUntil,
      taserSlowedUntil: player.taserSlowedUntil,
      shockSlowedUntil: player.shockSlowedUntil,
      quantumElectricSlowUntil: player.quantumElectricSlowUntil,
      gravityStormSlowUntil: player.gravityStormSlowUntil,
      gravityStormSlowMultiplier: player.gravityStormSlowMultiplier,
      speedMultiplier: effectiveMovementMultiplier(room, player),
      accelerationMultiplier: effectiveAccelerationMultiplier(room, player, timestamp),
    actorTimeScale: playerProgressMultiplier(room, player, timestamp),
      movementAcc: movementAccState(room, player, timestamp).selected,
      movementAccMax: movementAccState(room, player, timestamp).maximum,
      movementAccEnabled: movementAccState(room, player, timestamp).enabled,
      movementAccActive: movementAccState(room, player, timestamp).active,
      movementAccAvailable: movementAccState(room, player, timestamp).available,
      movementAccThreshold: movementAccState(room, player, timestamp).threshold,
      levitationActive: canLevitate(player),
      gravityLevitationActive: Boolean(room.phase === "playing" && player.alive && !player.ejected && !player.inVent && player.levitationEngaged),
      statusAte: persistentStatusAteState(room, player, timestamp),
      floraAccelerationEndsAt: !concealedFromViewer && player.alive &&
        !player.ejected && !player.inVent
        ? Number(timedAccelerationSummary(player, timestamp).bySource.flora?.endsAt) || 0 : 0,
      hackerRootActive: hackerRootEligible(player),
      gunnerSnipingActive: Boolean(hasGunnerAimAccess(player) && player.gunnerSnipingActive),
      aromaActive: Boolean(aromaSource),
      aromaSource: aromaSource?.id === player.id,
      aromaRegenMultiplier: floraAromaMultiplier(room, player),
      luminousActive: player.luminousActive,
      poisoned: Boolean(player.poisonStatus),
      burning: Boolean(player.burnStatus),
      ideaStage: Number(player.ideaStage) || 0,
      goodActive: Boolean(player.goodActive),
      ascensionStartedAt: Number(player.ascensionStartedAt) || 0,
      ascensionUntil: Number(player.ascensionUntil) || 0,
      bodyHits: player.id === viewer.id ? player.bodyHits : 0,
      overheal: player.id === viewer.id ? player.overheal : 0,
      maxHealth: player.id === viewer.id ? serializeResourceValue(healthCapacityFor(player)) : 2,
      inVent: player.id === viewer.id ? player.inVent : player.inVent && viewer.role === "attacker",
      ventId: player.id === viewer.id || viewer.role === "attacker" ? player.ventId : ""
    };
    if (concealedFromViewer) {
      // Do not serialize a current body coordinate or a motion-derived proxy
      // to a non-owner.  The marker only tells the client to discard any stale
      // render cache; it cannot be used to reconstruct the field position.
      serializedPlayer.invisible = true;
      delete serializedPlayer.x;
      delete serializedPlayer.y;
      delete serializedPlayer.moveX;
      delete serializedPlayer.moveY;
      delete serializedPlayer.moving;
      delete serializedPlayer.movementMode;
      delete serializedPlayer.resting;
      delete serializedPlayer.relocationRevision;
      delete serializedPlayer.aimX;
      delete serializedPlayer.aimY;
    } else {
      serializedPlayer.invisible = false;
      serializedPlayer.hoverSprintUntil = Number(player.hoverSprintUntil) > timestamp ? Number(player.hoverSprintUntil) : 0;
      serializedPlayer.desireRenkiRecoveryEndsAt = publicDesireRenkiRecovery ? Number(player.meditatingUntil) : 0;
      serializedPlayer.desireRenkiRecoveryMs = publicDesireRenkiRecovery ? DESIRE_RENKI_RECOVERY_MS : 0;
      if (publicNinjutsuFocus) serializedPlayer.ninjutsuFocusEndsAt = Number(player.aimReadyAt);
      // Only visible Philia handgun body timing; no inventory, ammo, or target data.
      if ((player.isBot || ["hood", "blue-dress"].includes(cleanSkinId(player.skinId))) && room.phase === "playing" && player.alive && !player.ejected && !player.inVent && player.gunnerReloadWeapon === "handgun" && Number(player.gunnerReloadUntil) > timestamp) {
        serializedPlayer.handgunReloadBody = { weapon: "handgun", endsAt: Number(player.gunnerReloadUntil), durationMs: GUNNER_RELOAD_MS };
      }
      if (!player.isBot && ["hood", "blue-dress"].includes(cleanSkinId(player.skinId)) && room.phase === "playing" && player.alive && !player.ejected && !player.inVent && (((player.gunnerReloadWeapon === "smg" || (cleanSkinId(player.skinId) === "hood" && ["assault", "sniper"].includes(player.gunnerReloadWeapon)) || (cleanSkinId(player.skinId) === "blue-dress" && ["assault", "sniper"].includes(player.gunnerReloadWeapon))) || (cleanSkinId(player.skinId) === "hood" && player.gunnerReloadWeapon === "taser")) || (cleanSkinId(player.skinId) === "blue-dress" && player.gunnerReloadWeapon === "taser")) && Number(player.gunnerReloadUntil) > timestamp) {
        serializedPlayer.weaponReloadBody = { weapon: player.gunnerReloadWeapon, endsAt: Number(player.gunnerReloadUntil), durationMs: GUNNER_RELOAD_MS };
      }
      if (player.isBot && room.phase === "playing" && player.alive && !player.ejected && !player.inVent && ["smg", "assault", "sniper", "taser"].includes(player.gunnerReloadWeapon) && Number(player.gunnerReloadUntil) > timestamp) {
        serializedPlayer.weaponReloadBody = { weapon: player.gunnerReloadWeapon, endsAt: Number(player.gunnerReloadUntil), durationMs: GUNNER_RELOAD_MS };
      }

    }
    return serializedPlayer;
  });

  return {
    ok: true,
    serverNow: timestamp,
    roomId: room.id,
    phase: room.phase,
    round: room.round,
    battleStartedAt: room.battleStartedAt,
    quantumEndgameAt: Number(room.quantumEndgameAt) || 0,
    quantumEndgameAvailable: quantumEndgameAvailable(room, timestamp),
    quantumEndgameSecondsLeft: quantumEndgameAvailable(room, timestamp)
      ? 0
      : Math.max(0, Math.ceil(((Number(room.quantumEndgameAt) || timestamp) - timestamp) / 1000)),
    preparationEndsAt: Number(room.preparationEndsAt) || 0,
    preparationActive: preparationBarrierActive(room, timestamp),
    soloHumanDeathBotTimeScale: botOperationalTimeScale(room),
    soloHumanDeathBotTimeScaleActive: Boolean(room.soloHumanDeathBotTimeScaleActive),
    soloHumanDeathBotTimeScaleActivatedAt: Number(room.soloHumanDeathBotTimeScaleActivatedAt) || 0,
    hostId: room.hostId,
    settings: room.settings,
    operatorSelectionUnlimited: room.phase === "selecting" &&
      room.matchmaking?.status === "offline" &&
      !Number(room.operatorSelectEndsAt),
    operatorSelectSecondsLeft: room.phase !== "selecting"
      ? 0
      : room.matchmaking?.status === "offline" && !Number(room.operatorSelectEndsAt)
        ? null
        : Math.max(0, Math.ceil((room.operatorSelectEndsAt - timestamp) / 1000)),
    operatorTurnPlayerId: operatorTurnPlayer?.id || "",
    operatorTurnName: operatorTurnPlayer?.name || "",
    operatorTurnPosition: operatorTurnPlayer ? room.operatorTurnIndex + 1 : 0,
    operatorTurnTotal: room.phase === "selecting" ? room.operatorTurnOrder.length : 0,
    operators: operatorState(room),
    map: {
      id: map.id,
      label: map.label,
      width: map.width,
      height: map.height,
      speed: map.speed,
      ghostSpeed: map.ghostSpeed,
      playerRadius: map.playerRadius,
      objectSpaces: map.objectSpaces || [],
      reportRange: map.reportRange,
      taskRange: map.taskRange,
      ventRange: map.ventRange,
      rooms: map.rooms,
      corridors: map.corridors,
      stations: visibleStations(map),
      objects: (map.objects || []).map((object) => ({
        ...object,
        readyAt: Number(viewer.objectCooldowns?.[object.id] || 0)
      })),
      alchemyObjects: room.alchemyObjects || [],
      mysteryBoxes: (room.mysteryBoxes || []).map((box) => ({ ...box })),
      vents: map.vents,
      portals: map.portals,
      doors: map.doors,
      environmentContractVersion: map.environmentContractVersion || ""
    },
    selfId: viewer.id,
    self: {
      id: viewer.id,
      skinId: viewer.skinId || "hood",
      role: viewer.role,
      special: isHackerOperator(viewer) ? "alchemist" : viewer.special,
      operatorId: viewer.operatorId,
      operatorReady: viewer.operatorReady,
      alive: viewer.alive,
      ejected: viewer.ejected,
      preparationBarrierActive: preparationBarrierProtects(room, viewer, timestamp) || standFirmBarrierProtects(viewer, timestamp),
      standFirmBarrierActive: standFirmBarrierProtects(viewer, timestamp),
      standFirmBarrierUntil: 0,
      ...durableCombatSnapshot(viewer),
      barrierReadyAt: Number(viewer.barrierReadyAt) || 0,
      bustReadyAt: Number(viewer.bustReadyAt) || 0,
      bustUnlocked: Boolean(viewer.bustUnlocked), bustUntil: Number(viewer.bustUntil) || 0,
      substitutionReadyAt: Number(viewer.substitutionReadyAt) || 0,
      hasAssassinSubstitution: hasAssassinSubstitution(viewer), protectCharges: Number(viewer.protectCharges) || 0,
      chatMuted: viewer.chatMuted,
      tasks: viewer.taskList,
      taskAutoReadyAt: Number(viewer.taskAutoReadyAt) || 0,
      taskPresenceTaskId: viewer.taskPresenceTaskId || "",
      taskPresenceSince: Number(viewer.taskPresenceSince) || 0,
      taskPresenceDurationMs: AUTO_TASK_PRESENCE_MS,
      killReadyAt: viewer.killReadyAt,
      ninjutsuOpeningReady: !viewer.isBot && Number(viewer.ninjutsuOpeningKillReadyAt) > timestamp && Number(viewer.killReadyAt) === Number(viewer.ninjutsuOpeningKillReadyAt),
      killChainCount: Math.max(0, Math.floor(Number(viewer.killChainCount) || 0)),
      killChainCooldownMultiplier: killChainCooldownMultiplier(viewer),
      killChainCooldownMs: killCooldownDurationMs(room, viewer),
      attackTargetId: viewer.attackTargetId,
      attackResolveAt: viewer.attackResolveAt,
      aimTargetId: viewer.aimTargetId,
      aimStartedAt: viewer.aimStartedAt,
      aimReadyAt: viewer.aimReadyAt,
      aimExpiresAt: viewer.aimExpiresAt,
      lastAttackResult: viewer.lastAttackResult,
      lastAttackResultAt: viewer.lastAttackResultAt,
      luminousUsed: viewer.luminousUsed,
      luminousActive: viewer.luminousActive,
      totalKills: viewer.totalKills,
      lastLuminousResult: viewer.lastLuminousResult,
      lastLuminousResultAt: viewer.lastLuminousResultAt,
      gunReadyAt: viewer.gunReadyAt,
      gunnerWeapon: gunnerWeaponFor(viewer).id,
      gunnerAmmo: { ...viewer.gunnerAmmo },
      gunnerWeapons: gunnerWeaponState(viewer),
      gunFiring: Boolean(viewer.gunFiring),
      gunFiringWeapon: viewer.gunFiringWeapon || "",
      gunFiringSince: Number(viewer.gunFiringSince) || 0,
      gunnerBurstRoundsRemaining: Math.max(0, Math.floor(Number(viewer.gunnerBurstRoundsRemaining) || 0)),
      gunnerBurstEnhanceLevel: Math.max(0, Math.floor(Number(viewer.gunnerBurstEnhanceLevel) || 0)),
      gunnerEnhanceDamagePerLevel: GUNNER_ENHANCE_DAMAGE_PER_LEVEL,
      enhanceChargeStartedAt: Number(viewer.enhanceChargeStartedAt) || 0,
      enhanceChargeKind: String(viewer.enhanceChargeKind || ""),
      enhanceChargeItemId: String(viewer.enhanceChargeItemId || ""),
      enhanceChargeId: String(viewer.enhanceChargeId || ""),
      enhanceChargeReleasedAt: Number(viewer.enhanceChargeReleasedAt) || 0,
      enhanceHoldStepMs: ENHANCE_HOLD_STEP_MS,
      enhanceMaxLevel: ENHANCE_MAX_LEVEL,
      gboHoldMs: GBO_HOLD_MS,
      enhanceManaCost: ENHANCE_FIXED_MANA_COST,
      gboManaCost: GBO_FIXED_MANA_COST,
      gunnerReloadUntil: Number(viewer.gunnerReloadUntil) || 0,
      gunnerReloadWeapon: String(viewer.gunnerReloadWeapon || ""),
      gunnerSpecialAmmoType: String(viewer.gunnerSpecialAmmoType || ""),
      gunnerSpecialAmmoWeapon: String(viewer.gunnerSpecialAmmoWeapon || ""),
      gunnerSpecialAmmoRounds: Math.max(0, Number(viewer.gunnerSpecialAmmoRounds) || 0),
      gunnerSpecialAmmoInventory: { ...ensureGunnerSpecialAmmoInventory(viewer) },
      gunnerSpecialAmmoReadyAt: Number(viewer.gunnerSpecialAmmoReadyAt) || 0,
      gunnerSpecialAmmoIntervalMs: GUNNER_SPECIAL_AMMO_INTERVAL_MS,
      hoverSprintUntil: Number(viewer.hoverSprintUntil) || 0,
      hoverSprintReadyAt: Number(viewer.hoverSprintReadyAt) || 0,
      hoverSprintDurationMs: HOVER_SPRINT_BASE_DURATION_MS,
      hoverSprintCooldownMs: HOVER_SPRINT_ACTIVATION_COOLDOWN_MS,
      hoverSprintManaCost: HOVER_SPRINT_BASE_MANA_COST,
      gunnerAimOwned: Boolean(hasGunnerAimAccess(viewer)),
      gunnerSnipingActive: Boolean(hasGunnerAimAccess(viewer) && viewer.gunnerSnipingActive),
      gunnerHipHeadshotChance: gunnerHeadshotChance(viewer, false),
      gunnerAimHeadshotChance: gunnerHeadshotChance(viewer, true),
      gunnerCurrentHeadshotChance: gunnerHeadshotChance(viewer, Boolean(hasGunnerAimAccess(viewer) && viewer.gunnerSnipingActive)),
      gunnerLastHitZone: String(viewer.gunnerLastHitZone || ""),
      gunnerLastHeadshotChance: Math.max(0, Number(viewer.gunnerLastHeadshotChance) || 0),
      gunnerBodyHitObserved: Boolean(viewer.gunnerBodyHitObserved),
      gunnerHeadshotObserved: Boolean(viewer.gunnerHeadshotObserved),
      gunnerAimTargetId: hasGunnerAimAccess(viewer) ? String(viewer.gunnerAimTargetId || "") : "",
      gunnerAimAvailable: Boolean(
        room.phase === "playing" &&
        viewer.alive &&
        !viewer.ejected &&
        !viewer.inVent &&
        hasGunnerAimAccess(viewer) &&
        passivesEnabled(viewer) &&
        gunnerAimMovementAllowed(viewer)
      ),
      gravityLevitationActive: Boolean(room.phase === "playing" && viewer.alive && !viewer.ejected && !viewer.inVent && viewer.levitationEngaged),
      statusAte: persistentStatusAteState(room, viewer, timestamp),
      aromaActive: Boolean(floraAromaSource(room, viewer)),
      aromaRegenMultiplier: floraAromaMultiplier(room, viewer),
      heavyWeapons: [...(viewer.heavyWeapons || [])],
      aimX: viewer.aimX,
      aimY: viewer.aimY,
      dodgeReadyAt: viewer.dodgeReadyAt,
      dodgeActiveUntil: viewer.dodgeActiveUntil,
      slashActiveUntil: Number(viewer.slashActiveUntil) || 0,
      slashPerfectUntil: Number(viewer.slashPerfectUntil) || 0,
      slashPerfectReadyAt: Number(viewer.slashPerfectReadyAt) || 0,
      slashGuardDurationMs: FIGHTER_SLASH_GUARD_DURATION_MS,
      slashPerfectGuardMs: FIGHTER_SLASH_PERFECT_GUARD_MS,
      slashPerfectRearmMs: FIGHTER_SLASH_PERFECT_REARM_MS,
      teleportReadyAt: viewer.teleportReadyAt,
      floraInvisibleActive: floraInvisibleActive(viewer, timestamp),
      floraInvisibleUntil: Number(viewer.floraInvisibleUntil) || 0,
      floraInvisibleDurationMs: FLORA_INVISIBLE_DURATION_MS,
      limitBreakActive: viewer.limitBreakActive,
      limitBreakEndsAt: Number(viewer.limitBreakEndsAt) || 0,
      limitBreakDurationMs: 0,
      limitBreakStacks: limitBreakStackCount(viewer),
      limitBreakMultiplier: limitBreakMultiplier(viewer),
      fighterEnergyCharge: Math.max(0, Math.floor(Number(viewer.fighterEnergyCharge) || 0)),
      fighterEnergyPeak: fighterEnergyPeak(viewer),
      fighterEnergyChargeReadyAt: Number(viewer.fighterEnergyChargeReadyAt) || 0,
      fighterEnergyChargeIntervalMs: FIGHTER_ENERGY_PASSIVE_INTERVAL_MS,
      fighterInfiniteResources: hasFighterInfiniteResources(viewer),
      fighterDestructionSlash: hasFighterApexPerks(viewer),
      empReadyAt: viewer.empReadyAt,
      empCooldownMs: room.soloMission?.id === "emp" ? 3000 : EMP_COOLDOWN_MS,
      slowedUntil: viewer.slowedUntil,
      taserSlowedUntil: viewer.taserSlowedUntil,
      shockSlowedUntil: viewer.shockSlowedUntil,
      quantumElectricSlowUntil: viewer.quantumElectricSlowUntil,
      gravityStormSlowUntil: viewer.gravityStormSlowUntil,
      gravityStormSlowMultiplier: viewer.gravityStormSlowMultiplier,
      lastGravityStormDamage: viewer.lastGravityStormDamage,
      sleepingUntil: viewer.sleepingUntil,
      resting: Boolean(viewer.resting),
      meditatingUntil: viewer.meditatingUntil,
      unconsciousUntil: viewer.unconsciousUntil,
      actionBlockedUntil: actionBlockedUntil(viewer),
      abilityDisabledUntil: viewer.abilityDisabledUntil,
      itemDisabledUntil: Number(viewer.itemDisabledUntil) || 0,
      overhealSpeedUntil: viewer.overhealSpeedUntil,
      floraMode: viewer.floraMode || "heal",
      sensoryBlockedUntil: sensoryBlockedUntil(viewer),
      lastMysteryResult: viewer.lastMysteryResult,
      lastMysteryResultAt: viewer.lastMysteryResultAt,
      lastMysteryReveal: viewer.lastMysteryReveal ? { ...viewer.lastMysteryReveal } : null,
      mysteryPickupFixture: viewer.mysteryPickupFixture ? { ...viewer.mysteryPickupFixture } : null,
      lastImmediateFeedback: viewer.lastImmediateFeedback || null,
      movementMode: viewer.movementMode,
      bodyHits: viewer.bodyHits,
      overheal: viewer.overheal,
      health: serializeHealthValue(remainingHealth(viewer)),
      maxHealth: serializeResourceValue(healthCapacityFor(viewer)),
      killCamera: viewer.killCamera ? { ...viewer.killCamera } : null,
      credits: viewer.credits,
      vendingPurchaseCapacities: vendingPurchaseCapacitiesFor(viewer),
      shopAbilityEntitlements: [...(viewer.shopAbilityEntitlements || [])],
      lastShopPurchaseAbilityId: String(viewer.lastShopPurchaseAbilityId || ""),
      lastShopPurchaseSpent: Math.max(0, Math.floor(Number(viewer.lastShopPurchaseSpent) || 0)),
      lastShopPurchaseAt: Number(viewer.lastShopPurchaseAt) || 0,
      vendingVerification: Array.isArray(viewer.mysteryVerificationRolls)
        ? {
            remainingMysteryRolls: viewer.mysteryVerificationRolls.length,
            bulkTransactionCount: Array.isArray(viewer.vendingBulkTransactions)
              ? viewer.vendingBulkTransactions.length
              : 0,
            lastBulkItemId: String(viewer.lastVendingBulkItemId || "")
          }
        : null,
      mana: serializeResourceValue(viewer.mana),
      maxMana: serializeResourceValue(manaCapacityFor(viewer)),
      mentalState: mentalStateFor(viewer),
      mentalPoints: mentalPointsFor(viewer),
      desireBias: viewer.desireBias || "",
      desireBiasLabel: desireBiasDefinition(viewer)?.label || "",
      desireBiasDetail: desireBiasDefinition(viewer)?.detail || "",
      desireDebtActive: hasDesireManaDebt(viewer),
      desireRecoveryMode: hasDesireManaDebt(viewer)
        ? viewer.desireRenkiRecovery
          ? "renki"
          : viewer.resting && Number(viewer.desireRestRecoveryStartedAt) > 0
            ? "rest"
            : ""
        : "",
      desireRecoveryEndsAt: hasDesireManaDebt(viewer)
        ? viewer.desireRenkiRecovery
          ? Number(viewer.meditatingUntil) || 0
          : Number(viewer.desireRestRecoveryStartedAt) > 0
            ? Number(viewer.desireRestRecoveryStartedAt) + DESIRE_STATIONARY_RECOVERY_MS
            : 0
        : 0,
      desireStationaryRecoveryMs: DESIRE_STATIONARY_RECOVERY_MS,
      desireRenkiRecoveryMs: DESIRE_RENKI_RECOVERY_MS,
      desireIdeaForfeited: Boolean(viewer.desireIdeaForfeited),
      ideaBlockedByDesire: Boolean(viewer.desireIdeaForfeited || isDesireState(viewer) || viewer.desireBias),
      luck: luckValueFor(viewer),
      passivesEnabled: passivesEnabled(viewer),
      hackerManaFree: isHackerOperator(viewer),
      rationalFreeAbilityReadyAt: Number(viewer.rationalFreeAbilityReadyAt) || 0,
      rationalFreeAbilityReady: isRational(viewer) &&
        (Number(viewer.rationalFreeAbilityReadyAt) || Infinity) <= timestamp,
      rationalFreeAbilityIntervalMs: RATIONAL_FREE_ABILITY_INTERVAL_MS,
      taskStaminaRequirement: taskStaminaCostFor(viewer),
      dodgeStaminaCost: DODGE_STAMINA_COST,
      gunnerBurstStaminaCost: GUNNER_BURST_STAMINA_COST,
      fighterSlashStaminaCost: FIGHTER_SLASH_STAMINA_COST,
      ideaStage: Number(viewer.ideaStage) || 0,
      ideaFirstAspect: viewer.ideaFirstAspect || "",
      ideaProgressStartedAt: Number(viewer.ideaProgressStartedAt) || 0,
      ideaProgressMs: Math.max(0, Number(viewer.ideaProgressMs) || 0),
      ideaProgressUpdatedAt: Number(viewer.ideaProgressUpdatedAt) || 0,
      ideaProgressRate: ideaProgressRateFor(viewer),
      ideaTimeBasis: "heaven",
      ideaNextThresholdMs: [IDEA_FIRST_ASPECT_MS, IDEA_SECOND_ASPECT_MS, IDEA_GOOD_MS, IDEA_ASCENSION_MS][Math.min(3, Number(viewer.ideaStage) || 0)],
      ideaThresholdsMs: {
        firstAspect: IDEA_FIRST_ASPECT_MS,
        secondAspect: IDEA_SECOND_ASPECT_MS,
        good: IDEA_GOOD_MS,
        ascension: IDEA_ASCENSION_MS
      },
      truthCharges: Number(viewer.truthCharges) || 0,
      beautyCharges: Number(viewer.beautyCharges) || 0,
      gravityPinnedUntil: Number(viewer.gravityPinnedUntil) || 0,
      goodActive: Boolean(viewer.goodActive),
      ascensionStartedAt: Number(viewer.ascensionStartedAt) || 0,
      ascensionUntil: Number(viewer.ascensionUntil) || 0,
      abilityCosts: {
        dodge: DODGE_MANA_COST,
        teleport: TELEPORT_MANA_COST,
        heartTeleport: HEART_TELEPORT_MANA_COST,
        gravityStorm: GRAVITY_STORM_MANA_COST,
        timeKeeper: GRAVITY_TIME_KEEPER_MANA_COST,
        emp: EMP_MANA_COST,
        shoot: GUNNER_MANA_COST,
        flora: FLORA_MANA_COST,
        floraSunbeam: FLORA_SUNBEAM_MANA_COST,
        floraInvisible: FLORA_INVISIBLE_MANA_COST,
        alchemy: ALCHEMY_MANA_COST,
        fighterCharge: FIGHTER_ENERGY_CHARGE_MANA_COST,
        quantumNuclear: QUANTUM_NUCLEAR_MANA_COST,
        quantumElectric: QUANTUM_ELECTRIC_MANA_COST
      },
      stamina: serializeResourceValue(viewer.stamina),
      maxStamina: serializeResourceValue(staminaCapacityFor(viewer)),
      maxStoredStamina: serializeResourceValue(staminaCapacityFor(viewer)),
      statusImmunityActive: hasNaturalRecovery(room, viewer),
      naturalRecoveryHpPerSecond: NATURAL_RECOVERY_HP_PER_SECOND * (viewer.resting ? SLEEP_REGEN_MULTIPLIER : 1) * floraAromaMultiplier(room, viewer),
      naturalRecoveryStaminaPerSecond: STAMINA_REGEN_PER_SECOND * (viewer.resting ? SLEEP_REGEN_MULTIPLIER : 1) * floraAromaMultiplier(room, viewer),
      naturalRecoveryManaPerSecond: NATURAL_RECOVERY_MANA_PER_SECOND * (viewer.resting ? SLEEP_REGEN_MULTIPLIER : 1) * floraAromaMultiplier(room, viewer),
      naturalRecoveryManaCap: serializeResourceValue(manaCapacityFor(viewer)),
      sleepRegenPerSecond: STAMINA_REGEN_PER_SECOND * SLEEP_REGEN_MULTIPLIER,
      restCompletionManaFloor: REST_COMPLETION_MANA_FLOOR,
      speedMultiplier: effectiveMovementMultiplier(room, viewer),
      accelerationMultiplier: effectiveAccelerationMultiplier(room, viewer, timestamp),
      actorTimeScale: playerProgressMultiplier(room, viewer, timestamp),
      movementAcc: movementAccState(room, viewer, timestamp).selected,
      movementAccMax: movementAccState(room, viewer, timestamp).maximum,
      movementAccEnabled: movementAccState(room, viewer, timestamp).enabled,
      movementAccActive: movementAccState(room, viewer, timestamp).active,
      movementAccAvailable: movementAccState(room, viewer, timestamp).available,
      movementAccThreshold: movementAccState(room, viewer, timestamp).threshold,
      timedAccelerationStacks: timedAccelerationSummary(viewer, timestamp).bySource,
      mapObjectEffects: viewerObjectEffects,
      dodgeDurationBonusMs: viewer.dodgeDurationBonusMs,
      warpCharges: viewer.warpCharges,
      fireJutsuCharges: viewer.fireJutsuCharges,
      fireJutsuKillChance: 0,
      itemInventory: transferableItemsFor(viewer),
      poisonStatus: viewer.poisonStatus ? { ...viewer.poisonStatus } : null,
      burnStatus: viewer.burnStatus ? { ...viewer.burnStatus } : null,
      quantumMode: normalizeQuantumMode(viewer.quantumMode || "nuclear-transmutation"),
      quantumActionStaminaCost: QUANTUM_ACTION_STAMINA_COST,
      quantumElectricDamage: QUANTUM_ELECTRIC_DAMAGE,
      quantumElectricSlowMs: QUANTUM_ELECTRIC_SLOW_MS,
      quantumElectricSlowMultiplier: QUANTUM_ELECTRIC_SLOW_MULTIPLIER,
      quantumElectricLastTargetId: String(viewer.quantumElectricLastTargetId || ""),
      quantumElectricLastOutcome: String(viewer.quantumElectricLastOutcome || ""),
      quantumElectricLastDamage: Math.max(0, Number(viewer.quantumElectricLastDamage) || 0),
      quantumElectricLastManaSpent: Math.max(0, Number(viewer.quantumElectricLastManaSpent) || 0),
      quantumElectricLastStaminaSpent: Math.max(0, Number(viewer.quantumElectricLastStaminaSpent) || 0),
      quantumElectricLastAt: Number(viewer.quantumElectricLastAt) || 0,
      substitutionCharges: viewer.substitutionCharges,
      gritCharges: viewer.gritCharges,
      reasonCharges: viewer.reasonCharges,
      manaAutoProtectionNext: viewer.manaAutoProtectionNext === "grit" ? "grit" : "reason",
      iaiCharges: Math.max(0, Math.floor(Number(viewer.iaiCharges) || 0)),
      standFirmCharges: viewer.gritCharges,
      pushCharges: viewer.reasonCharges,
      smartphoneUntil: Number(viewer.smartphoneUntil) || 0,
      smartphoneAction: viewer.smartphoneAction || "",
      routePartnerCount: (viewer.routePartnerIds || []).length,
      routeSharedSince: Number(viewer.routeSharedSince) || 0,
      gravityMode: viewer.gravityMode || "accelerate",
      gravityTimeMode: viewer.gravityTimeMode || "",
      gravityTimeTargetId: viewer.gravityTimeTargetId || "",
      gravityTimeEndsAt: Number(viewer.gravityTimeEndsAt) || 0,
      gravityTimeEffectiveEndsAt: viewer.gravityTimeMode === "decelerate" && viewer.gravityTimeTargetId === viewer.id
        ? (viewerSelfDecelerateController ? Number(receivedDecelerate?.endsAt) || 0 : 0)
        : Number(viewer.gravityTimeEndsAt) || 0,
      gravityTimeTargetIsSelf: viewer.gravityTimeTargetId === viewer.id,
      receivedDecelerateEndsAt: viewerSelfDecelerateController ? 0 : Number(receivedDecelerate?.endsAt) || 0,
      receivedDecelerateMovementSuppressed: Boolean(receivedDecelerate && viewer.clairvoyanceActive),
      timeKeeperEndsAt: Number(viewer.timeKeeperEndsAt) || 0,
      timeStoppedUntil: Number(viewer.timeStoppedUntil) || 0,
      levitationActive: canLevitate(viewer),
      clairvoyanceActive: Boolean(viewer.clairvoyanceActive),
      clairvoyanceManaPerSecond: CLAIRVOYANCE_MANA_DRAIN_PER_SECOND,
      levitationManaPerSecond: LEVITATION_MANA_DRAIN_PER_SECOND,
      limitBreakManaPerSecond: 0,
      limitBreakActivationCost: 0,
      limitBreakPassive: Boolean(
        hasOperatorAccess(viewer, "fighter") ||
        ownsShopAbility(viewer, "fighter-limit-break")
      ),
      alchemyReviveUsed: Boolean(viewer.alchemyReviveUsed),
      vibeCodingReadyAt: Number(viewer.vibeCodingReadyAt) || 0,
      vibeCodingCooldownMs: Number(viewer.vibeCodingCooldownMs) || 0,
      hackerVibeCodingAccess: hasHackerVibeCodingAccess(viewer),
      hackerRootAccess: hasHackerRootAccess(viewer),
      manaGpuActive: room.phase === "playing" && hasHackerVibeCodingAccess(viewer) && viewer.alive && !viewer.ejected && Number(viewer.mana) > 0,
      manaGpuDrainPerSecond: HACKER_MANA_GPU_DRAIN_PER_SECOND,
      manaGpuCooldownReductionMsPerMana: HACKER_MANA_GPU_COOLDOWN_REDUCTION_MS_PER_MANA,
      manaGpuCooldownCreditMs: Math.max(0, Number(viewer.manaGpuCooldownCreditMs) || 0),
      alchemyRecipeIds: hasHackerVibeCodingAccess(viewer) ? Object.keys(ALCHEMY_RECIPES).filter((recipeId) => {
        const product = DVA_ECONOMY.productForRecipe(recipeId);
        return product?.hackerAccess !== "root" || hackerRootEligible(viewer);
      }) : [],
      inventions: [...(viewer.inventions || [])],
      hackActive: Boolean(viewer.hackActive),
      hackEffective: Boolean(viewer.hackActive && itemStorageAvailable(viewer, timestamp)),
      exiled: Boolean(viewer.exiled),
      hackTracking: room.phase === "playing" && hasHackerVibeCodingAccess(viewer) && viewer.alive && !viewer.ejected,
      hackerRootActive: hackerRootEligible(viewer),
      hackerRootOperators: hackerRootEligible(viewer) ? [...HACKER_ROOT_OPERATOR_TYPES] : [],
      particleCannonUntil: Number(viewer.particleCannonUntil) || 0,
      emergenciesLeft: viewer.emergenciesLeft,
      inVent: viewer.inVent,
      ventId: viewer.ventId,
      killsThisRound: viewer.killsThisRound,
      friendlyAttackerBotFireLaneVerification: viewer.friendlyAttackerBotFireLaneVerification
        ? { ...viewer.friendlyAttackerBotFireLaneVerification }
        : null
    },
    players,
    bodies: visibleBodies(room, viewer),
    hitEffects: room.hitEffects,
    magicEffects: magicEffectsForViewer(room, viewer, timestamp),
    hazardFields: (room.hazardFields || []).map((field) => ({ ...field })),
    groundItems: (room.groundItems || []).map((groundItem) => ({
      id: groundItem.id,
      itemId: groundItem.itemId,
      label: groundItem.label,
      asset: groundItem.asset,
      kind: groundItem.kind,
      x: groundItem.x,
      y: groundItem.y,
      angle: groundItem.angle,
      pickupRange: groundItem.pickupRange,
      createdAt: groundItem.createdAt,
      impact: groundItem.impact ? {
        targetId: groundItem.impact.targetId,
        damage: groundItem.impact.damage,
        certainKill: Boolean(groundItem.impact.certainKill),
        contact: groundItem.impact.contact,
        luck: groundItem.impact.luck,
        severity: groundItem.impact.severity,
        outcome: groundItem.impact.outcome
      } : null
    })),
    gravityZones: room.gravityZones || [],
    meeting: room.meeting
      ? {
          id: room.meeting.id,
          reason: room.meeting.reason,
          reporterId: room.meeting.reporterId,
          discussionSecondsLeft: Math.max(0, Math.ceil((room.meeting.discussionEndsAt - timestamp) / 1000)),
          secondsLeft: Math.max(0, Math.ceil((room.meeting.endsAt - timestamp) / 1000)),
          votes: meetingVotes
        }
      : null,
    chat: room.chat,
    events: room.events,
    sounds: soundsForViewer(room, viewer, timestamp),
    utility: room.utilityViews.get(viewer.id) || null,
    soloMission: (() => {
      const mission = soloMissionDefinition(room);
      if (!mission || !room.soloMission) return null;
      return {
        id: mission.id,
        name: mission.name,
        objective: mission.objective,
        completed: Boolean(room.soloMission.completed),
        progress: soloMissionProgress(room, timestamp),
        hintUnlocked: Boolean(room.soloMission.hintUnlocked),
        hint: room.soloMission.hintUnlocked
          ? "CPUは自分へアクセラレート→練気1回（+10MP）→心臓転移を繰り返します。35秒の精神統一中か、心臓転移（10MP）の準備が整う前を狙って妨害してください。"
          : ""
      };
    })(),
    winner: room.winner,
    ideaWinnerId: room.ideaWinnerId,
    ideaWinnerIds: ideaWinnerIdsFor(room),
    pendingIdeaVictoryAt: room.pendingIdeaVictoryAt,
    finishReason: room.finishReason,
    results: room.phase === "ended" ? resultBoard(room) : [],
    availableMaps: Object.values(MAPS).map((item) => ({ id: item.id, label: item.label }))
  };
}

function buildVoteSummary(room, viewer) {
  const votes = room.meeting.votes;
  if (!room.settings.anonymousVotes || room.phase === "ended") return votes;
  const summary = {};
  for (const [voter, target] of Object.entries(votes)) {
    summary[voter === viewer.id ? voter : `anon_${Object.keys(summary).length}`] = target;
  }
  return summary;
}

function publicRooms() {
  const timestamp = now();
  return [...rooms.values()]
    .filter((room) => !room.soloMission && timestamp - room.updatedAt < ROOM_TTL_MS)
    .map((room) => {
      const availableSlots = [...room.players.values()].filter((entry) => (
        entry.midJoinAvailable && entry.alive && !entry.ejected
      )).length;
      const humans = [...room.players.values()].filter((entry) => !entry.isBot).length;
      return {
        id: room.id,
        phase: room.phase,
        players: room.players.size,
        humans,
        map: getMap(room).label,
        host: room.players.get(room.hostId)?.name || "ホスト待ち",
        hostKillRate: profileKillRate(profileFor(room.players.get(room.hostId))),
        availableSlots,
        midJoinAvailable: room.phase !== "lobby" && availableSlots > 0,
        joinable: room.phase === "lobby" || availableSlots > 0
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function requireRoomPlayer(body, settleTime = true) {
  const room = getRoom(body.roomId);
  if (!room) throw new ApiError(404, "ルームが見つかりません。");
  const player = room.players.get(String(body.playerId || ""));
  if (!player) throw new ApiError(404, "プレイヤーが見つかりません。再入室してください。");
  // The simulation elapsed before this request belongs to the old state.
  // Action-specific validation still runs after this ordinary room update.
  if (settleTime && room.phase === "playing" && Number(room.lastTickAt) < now()) tickRoom(room);
  player.lastSeenAt = now();
  return { room, player };
}

function requireLegacyRoomTestFixture(req, body) {
  if (body._offlineDeveloper === true && isDeveloperProfileId(playerProfileId(req))) return;
  throw new ApiError(410, "部屋作成・部屋設定機能は廃止されました。マッチングを使用してください。");
}

// Deliberately local-only regression states used by the hidden real-screen
// recurrence audit.  They reuse normal authoritative primitives and return
// ordinary serialization, but cannot be reached by the public client.
function applyRealScreenRegressionFixture(room, player, rawKind) {
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) {
    throw new ApiError(400, "実画面回帰fixtureはプレイ中の生存プレイヤーだけに使用できます。");
  }
  const kind = String(rawKind || "");
  if (kind === "mystery-pickup-alive" || kind === "mystery-pickup-mystery-alive") {
    // The fixture only positions a normal, alive player outside the existing
    // box contact radius. A regular movement packet and the ordinary room tick
    // own proximity, reward selection, removal and the reveal effect.
    const timestamp = now();
    const fixtureForcesMystery = kind === "mystery-pickup-mystery-alive";
    if (fixtureForcesMystery && !mysteryBoxEligibleRewards(player).some((reward) => reward.id === "mystery")) {
      throw new ApiError(400, "ミステリー報酬が通常候補にありません。");
    }
    if (fixtureForcesMystery) {
      player.mysteryFixtureForceRewardId = "mystery";
      player.mysteryFixtureForceRewardUntil = timestamp + 120_000;
    }
    replenishMysteryBoxes(room);
    const box = (room.mysteryBoxes || [])[0];
    if (!box) throw new ApiError(400, "ミステリーボックス実画面fixtureに既存箱がありません。");
    const map = getMap(room);
    const startDistance = Number(box.useRange || MYSTERY_BOX_USE_RANGE) + 18;
    const directions = [[1, 0], [0, 1], [-1, 0], [0, -1], [Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, -Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2]];
    const start = directions
      .map(([dx, dy]) => ({ x: Math.round(Number(box.x) + dx * startDistance), y: Math.round(Number(box.y) + dy * startDistance), dx: -dx, dy: -dy }))
      .find((candidate) => isWalkable(room, candidate.x, candidate.y, Number(map.playerRadius) || 0));
    if (!start) throw new ApiError(400, "ミステリーボックス実画面fixtureに通常移動できる開始地点がありません。");
    Object.assign(player, {
      alive: true, ejected: false, inVent: false, x: start.x, y: start.y,
      vx: 0, vy: 0, lastMovementDx: 0, lastMovementDy: 0,
      objectContactUsedIds: [], itemDisabledUntil: 0
    });
    player.mysteryPickupFixture = {
      boxId: box.id, boxX: Number(box.x), boxY: Number(box.y), useRange: Number(box.useRange || MYSTERY_BOX_USE_RANGE),
      startX: start.x, startY: start.y, startDistance: Math.hypot(start.x - Number(box.x), start.y - Number(box.y)),
      canvasDx: start.dx, canvasDy: start.dy, expectedRewardId: fixtureForcesMystery ? "mystery" : "", normalInput: "hold the displayed canvas direction until contact"
    };
    room.preparationEndsAt = timestamp + 120_000;
    for (const entry of room.players.values()) {
      if (!entry.isBot) continue;
      entry.nextBotActionAt = timestamp + 120_000;
      entry.taskAutoReadyAt = timestamp + 120_000;
      entry.emergenciesLeft = 0;
    }
    setImmediateFeedback(player, "ミステリーボックス実画面検証", "箱 (" + box.x + ", " + box.y + ") へ通常移動");
  } else if (kind === "desire-precondition") {
    setMana(room, player, 0, "実画面Desire fixture", { exact: true });
    setStamina(room, player, 0.25, "実画面Desire fixture");
    const base = Math.max(1, Number(player.lastMovementClock) || 1);
    processMovementInput(room, player, { dx: 1, dy: 0, movementSession: `fixture-desire-${player.id}`, movementSessionStartedAt: now(), movementSeq: 0, movementClock: base });
    processMovementInput(room, player, { dx: 1, dy: 0, movementSession: `fixture-desire-${player.id}`, movementSessionStartedAt: now(), movementSeq: 1, movementClock: base + 1_000 });
    processMovementInput(room, player, { dx: 0, dy: 0, movementSession: `fixture-desire-${player.id}`, movementSessionStartedAt: now(), movementSeq: 2, movementClock: base + 1_001 });
  } else if (kind === "universal-healing") {
    // Start just below the base ceiling.  The ordinary tick first repairs the
    // visible damage and then, without any synthetic action, demonstrates the
    // same Natural Recovery transaction extending current/max HP together.
    const timestamp = now();
    Object.assign(player, {
      bodyHits: 0.05,
      overheal: 0,
      maxHealth: 2,
      mana: 2,
      maxMana: Math.max(2, Number(player.maxMana) || 0),
      stamina: MAX_STORED_STAMINA,
      maxStoredStamina: Math.max(MAX_STORED_STAMINA, Number(player.maxStoredStamina) || 0),
      staminaUpdatedAt: now(),
      mentalState: "理知",
      hackerRootActive: false
    });
    room.preparationEndsAt = timestamp + 120_000;
    for (const entry of room.players.values()) {
      if (!entry.isBot) continue;
      entry.nextBotActionAt = timestamp + 120_000;
      entry.taskAutoReadyAt = timestamp + 120_000;
    }
  } else if (kind === "hover-sprint-input") {
    const timestamp = now(), map = getMap(room), radius = map.playerRadius;
    let boundary = null;
    for (const rect of map.walkable) {
      if (boundary) break;
      const y = Number(rect.y) + Number(rect.h) / 2;
      let previous = null;
      for (let x = Number(rect.x) + radius + 1; x < Math.min(map.width - radius, Number(rect.x) + Number(rect.w) + radius * 2); x += 2) {
        if (hasFloorSupport(room, x, y, radius)) previous = { x, y };
        else if (previous) { boundary = previous; break; }
      }
    }
    if (!boundary) throw new ApiError(400, "ホバースプリント入力fixtureに支持床の境界がありません。");
    Object.assign(player, boundary, {
      mana: 10, maxMana: Math.max(20, Number(player.maxMana) || 0),
      stamina: 100, maxStoredStamina: 5000, staminaUpdatedAt: timestamp,
      hoverSprintUntil: 0, hoverSprintReadyAt: 0, timedAccelerationEffects: [],
      vx: 0, vy: 0, lastMovementDx: 0, lastMovementDy: 0,
      itemInventory: {}, itemDisabledUntil: timestamp + 120000,
      unconsciousUntil: 0, sleepingUntil: 0, levitationEngaged: false
    });
    room.preparationEndsAt = timestamp + 120000;
    for (const entry of room.players.values()) {
      if (!entry.isBot) continue;
      entry.nextBotActionAt = timestamp + 120000;
      entry.taskAutoReadyAt = timestamp + 120000;
    }
    setImmediateFeedback(player, "入力検証の前提状態", "停止で休息 / 右移動でホバースプリント / 左移動で足場へ復帰");
  } else if (kind === "hover-sprint-fall-live") {
    // Prepare a normal eight-second hover-sprint source over an unsupported in-map
    // coordinate. The ordinary room tick owns both countdown expiry and the
    // subsequent unsupported-fall death; the fixture performs no terminal
    // action and never bypasses the shared levitation owner.
    const timestamp = now();
    const map = getMap(room);
    const radius = Number(map.playerRadius) || 36;
    const step = Math.max(32, radius);
    let unsupported = null;
    for (let y = radius; y <= Number(map.height) - radius && !unsupported; y += step) {
      for (let x = radius; x <= Number(map.width) - radius; x += step) {
        if (!isFloorArea(room, x, y, radius)) {
          unsupported = { x, y };
          break;
        }
      }
    }
    if (!unsupported) throw new ApiError(400, "ホバースプリント落下実画面fixtureに床外地点がありません。");
    Object.assign(player, {
      x: unsupported.x,
      y: unsupported.y,
      alive: true,
      ejected: false,
      inVent: false,
      hoverSprintUntil: 0,
      hoverSprintReadyAt: timestamp + HOVER_SPRINT_ACTIVATION_COOLDOWN_MS,
      sharedLevitationActive: true,
      levitationEngaged: false
    });
    addTimedAcceleration(player, "hoverSprint", HOVER_SPRINT_BASE_ACC_MULTIPLIER, HOVER_SPRINT_BASE_DURATION_MS, timestamp);
    for (const entry of room.players.values()) {
      if (!entry.isBot) continue;
      entry.nextBotActionAt = timestamp + 120_000;
      entry.taskAutoReadyAt = timestamp + 120_000;
    }
    setImmediateFeedback(player, "ホバースプリント実画面検証", "浮揚 8秒 / 期限終了時に床がなければ落下死");
  } else if (kind === "marker-coalesce") {
    pushMagicEffect(room, "fighter-energy-charge", player, { radius: 112, playerId: player.id, variant: "fixture-ec-1", durationMs: 1_500 });
    pushMagicEffect(room, "fighter-energy-charge", player, { radius: 112, playerId: player.id, variant: "fixture-ec-2", durationMs: 1_500 });
    pushMagicEffect(room, "action-dodge", player, { radius: 115, playerId: player.id, variant: "fixture-positive-control", durationMs: 900 });
  } else if (kind === "credit-ate-task") {
    player.credits = 0;
    grantCredits(room, player, TASK_CREDIT_REWARD, "fixture-credit-task");
  } else if (kind === "credit-ate-gold") {
    player.credits = 0;
    acquireGoldAsCredits(room, player, "fixture-credit-gold");
  } else if (kind === "kill-loot") {
    const timestamp = now();
    const map = getMap(room);
    const target = [...room.players.values()].find((entry) => entry.isBot);
    if (!target) throw new ApiError(400, "戦利品実画面fixtureに対象Botがいません。");
    const arena = [...map.walkable]
      .filter((rect) => Number(rect.w) > 320 && Number(rect.h) > map.playerRadius * 3)
      .sort((a, b) => Number(b.w) - Number(a.w))[0];
    if (!arena) throw new ApiError(400, "戦利品実画面fixtureに斬撃経路がありません。");
    const x = Number(arena.x) + Math.max(55, map.playerRadius + 16);
    const y = Number(arena.y) + Number(arena.h) / 2;
    Object.assign(player, {
      role: "attacker", special: "fighter", operatorId: "operator-fighter", operatorReady: true,
      alive: true, ejected: false, inVent: false, x, y, aimX: 1, aimY: 0,
      credits: 0, stamina: MAX_STORED_STAMINA, itemInventory: { "orichalcum-sword": 1 },
      inventions: [], heavyWeapons: [], purchasedWeapons: [], unavailableGunnerWeapons: [...GUNNER_WEAPON_ORDER],
      killReadyAt: 0, slashActiveUntil: 0, slashPerfectGuardReadyAt: 0
    });
    Object.assign(target, {
      role: "defender", special: "quantum", operatorId: "operator-quantum-control", operatorReady: true,
      alive: true, ejected: false, inVent: false, x: x + Math.min(100, room.settings.killRange - 10), y,
      credits: 37, itemInventory: { mercury: 2 }, inventions: ["railgun"],
      heavyWeapons: ["rpg"], purchasedWeapons: ["assault"], unavailableGunnerWeapons: ["handgun", "smg", "sniper", "taser"],
      gunnerAmmo: { ...createGunnerAmmo(), assault: 9 }, gritCharges: 0, overheal: 0,
      dodgeActiveUntil: 0, standFirmBarrierUntil: 0,
      nextBotActionAt: timestamp + 120_000, taskAutoReadyAt: timestamp + 120_000
    });
    for (const entry of room.players.values()) {
      if (!entry.isBot || entry === target) continue;
      entry.alive = false;
      entry.ejected = true;
    }
    room.preparationEndsAt = 0;
    room.meeting = null;
      pushEvent(room, "実画面検証: 斬る成功時に対象Botの37Cと全譲渡可能所持品を一度だけ戦利品として獲得します。");
  } else if (kind === "friendly-attacker-bot-fire-lane") {
    const timestamp = now();
    const map = getMap(room);
    const bots = [...room.players.values()].filter((entry) => entry.isBot);
    const gunnerBot = bots[0];
    const enemyDefender = bots[1];
    if (!gunnerBot || !enemyDefender) {
      throw new ApiError(400, "味方Attacker Bot射線fixtureに必要なBotがいません。");
    }
    const arena = [...map.walkable]
      .filter((rect) => Number(rect.w) > 520 && Number(rect.h) > map.playerRadius * 4)
      .sort((left, right) => Number(right.w) - Number(left.w))[0];
    if (!arena) throw new ApiError(400, "味方Attacker Bot射線fixtureに直線経路がありません。");
    const startX = Number(arena.x) + Math.max(55, map.playerRadius + 16);
    const y = Number(arena.y) + Number(arena.h) / 2;
    const ammo = createGunnerAmmo();
    ammo.handgun = GUNNER_WEAPONS.handgun.maxAmmo;
    Object.assign(player, {
      role: "attacker", special: "fighter", operatorId: "operator-fighter", operatorReady: true,
      alive: true, ejected: false, inVent: false, x: startX + 70, y, bodyHits: 0, overheal: 0,
      gritCharges: 0, standFirmBarrierUntil: 0
    });
    Object.assign(gunnerBot, {
      role: "attacker", special: "gunner", operatorId: "attacker-gunner", operatorReady: true,
      alive: true, ejected: false, inVent: false, x: startX, y, aimX: 1, aimY: 0,
      stamina: MAX_STORED_STAMINA, maxStoredStamina: MAX_STORED_STAMINA,
      gunnerWeapon: "handgun", gunnerAmmo: ammo,
      unavailableGunnerWeapons: GUNNER_WEAPON_ORDER.filter((weaponId) => weaponId !== "handgun"),
      purchasedWeapons: [], inventions: [], heavyWeapons: [], itemInventory: {},
      gunnerReloadUntil: 0, gunReadyAt: 0, gunFiring: false,
      gunnerSpecialAmmoType: "", gunnerSpecialAmmoWeapon: "", gunnerSpecialAmmoRounds: 0,
      gunnerSpecialAmmoInventory: { weak: 0, penetrate: 0, shock: 0 },
      mana: 0, maxMana: 2, empReadyAt: timestamp + 120_000,
      killReadyAt: timestamp + 120_000, nextBotActionAt: timestamp + 120_000,
      taskAutoReadyAt: timestamp + 120_000
    });
    Object.assign(enemyDefender, {
      role: "defender", special: "fighter", operatorId: "operator-fighter", operatorReady: true,
      alive: true, ejected: false, inVent: false, x: startX + 210, y, bodyHits: 0, overheal: 0,
      gritCharges: 0, standFirmBarrierUntil: 0,
      nextBotActionAt: timestamp + 120_000, taskAutoReadyAt: timestamp + 120_000
    });
    for (const entry of bots.slice(2)) {
      entry.alive = false;
      entry.ejected = true;
      entry.nextBotActionAt = timestamp + 120_000;
    }
    room.preparationEndsAt = 0;
    room.meeting = null;
  
    const weapon = GUNNER_WEAPONS.handgun;
    const firstBody = findGunnerTarget(room, gunnerBot, weapon, 1, 0, { ignoreCover: true });
    const beforeBlocked = {
      ammo: Object.values(gunnerBot.gunnerAmmo || {}).reduce((total, value) => total + Math.max(0, Number(value) || 0), 0),
      stamina: Number(gunnerBot.stamina) || 0,
      gunReadyAt: Number(gunnerBot.gunReadyAt) || 0,
      effects: room.magicEffects.length,
      sounds: room.sounds.length,
      events: room.events.length,
      allyBodyHits: Number(player.bodyHits) || 0,
      botAlive: Boolean(gunnerBot.alive)
    };
    const blockedHandled = runBotCombatPlanner(room, gunnerBot, enemyDefender, timestamp);
    const afterBlocked = {
      ammo: Object.values(gunnerBot.gunnerAmmo || {}).reduce((total, value) => total + Math.max(0, Number(value) || 0), 0),
      stamina: Number(gunnerBot.stamina) || 0,
      gunReadyAt: Number(gunnerBot.gunReadyAt) || 0,
      effects: room.magicEffects.length,
      sounds: room.sounds.length,
      events: room.events.length,
      allyBodyHits: Number(player.bodyHits) || 0,
      botAlive: Boolean(gunnerBot.alive)
    };
    const allyNoCommit = firstBody?.player?.id === player.id &&
      !botCanAttackTarget(room, gunnerBot, player, timestamp) &&
      botCanAttackTarget(room, gunnerBot, enemyDefender, timestamp) &&
      blockedHandled === false &&
      JSON.stringify(afterBlocked) === JSON.stringify(beforeBlocked);

    // Retry the identical canonical planner after the ally leaves the physical
    // lane. The action is accepted only for the current enemy Defender.
    player.y = y + Math.max(110, map.playerRadius * 3);
    const enemyBodyHitsBefore = Number(enemyDefender.bodyHits) || 0;
    const acceptedHandled = runBotCombatPlanner(room, gunnerBot, enemyDefender, timestamp);
    const ammoAfterEnemy = Object.values(gunnerBot.gunnerAmmo || {})
      .reduce((total, value) => total + Math.max(0, Number(value) || 0), 0);
    const enemyAccepted = acceptedHandled === true &&
      ammoAfterEnemy < beforeBlocked.ammo &&
      Number(enemyDefender.bodyHits) > enemyBodyHitsBefore &&
      (room.magicEffects || []).some((effect) => effect.type === "action-shoot" && effect.playerId === gunnerBot.id);
    const gunnerAllyBodyHitsAfter = Number(player.bodyHits) || 0;
    const gunnerEnemyBodyHitsAfter = Number(enemyDefender.bodyHits) || 0;
    const gunnerBotAlive = Boolean(gunnerBot.alive);
    const friendlyPenaltyEvent = (room.events || []).some((event) => (
      String(event?.text || "").includes(gunnerBot.name) &&
      /同陣営|味方.*攻撃/.test(String(event?.text || ""))
    ));
    const transactionSnapshot = () => JSON.stringify({
      mana: Number(gunnerBot.mana) || 0,
      inventory: { ...(gunnerBot.itemInventory || {}) },
      thrown: (room.thrownItems || []).length,
      effects: (room.magicEffects || []).length,
      sounds: (room.sounds || []).length,
      events: (room.events || []).length,
      allyBodyHits: Number(player.bodyHits) || 0,
      allyOverheal: Number(player.overheal) || 0
    });

    // Cross-family recurrence proof: the same allied body blocks the entire
    // actual Sunbeam ray before MP/evidence/presentation. Moving it aside
    // restores the ordinary enemy-only transaction.
    Object.assign(gunnerBot, {
      role: "attacker", special: "flora", operatorId: "operator-flora",
      mana: FLORA_SUNBEAM_MANA_COST * 2, maxMana: FLORA_SUNBEAM_MANA_COST * 2,
      aimX: 1, aimY: 0, itemInventory: {}, gunFiring: false
    });
    player.x = startX + 70; player.y = y; player.bodyHits = 0; player.overheal = 0;
    enemyDefender.x = startX + 210; enemyDefender.y = y; enemyDefender.role = "defender";
    enemyDefender.alive = true; enemyDefender.ejected = false; enemyDefender.bodyHits = 0; enemyDefender.overheal = 0;
    const sunbeamBeforeBlocked = transactionSnapshot();
    let sunbeamBlockedStatus = 0;
    try { floraSunbeam(room, gunnerBot, enemyDefender.id); } catch (error) { sunbeamBlockedStatus = Number(error?.status) || 0; }
    const sunbeamAfterBlocked = transactionSnapshot();
    const sunbeamAllyNoCommit = sunbeamBlockedStatus === 409 && sunbeamAfterBlocked === sunbeamBeforeBlocked;
    player.y = y + Math.max(110, map.playerRadius * 3);
    const sunbeamEnemyBodyHitsBefore = Number(enemyDefender.bodyHits) || 0;
    floraSunbeam(room, gunnerBot, enemyDefender.id);
    const sunbeamEnemyAccepted = Number(gunnerBot.mana) === FLORA_SUNBEAM_MANA_COST &&
      ((Number(enemyDefender.bodyHits) || 0) > sunbeamEnemyBodyHitsBefore || !enemyDefender.alive);

    // A sword's physical first-body collision uses the same current-faction
    // preflight, before inventory removal or projectile queue ownership.
    enemyDefender.alive = true; enemyDefender.ejected = false; enemyDefender.bodyHits = 0; enemyDefender.overheal = 0;
    Object.assign(gunnerBot, { special: "gunner", operatorId: "attacker-gunner", itemInventory: { "orichalcum-sword": 1 } });
    player.x = startX + 70; player.y = y;
    const swordBeforeBlocked = transactionSnapshot();
    let swordBlockedStatus = 0;
    const swordBlockedCharge = setEnhanceChargeState(room, gunnerBot, true, "throw", "orichalcum-sword");
    try { throwInventoryItem(room, gunnerBot, "orichalcum-sword", 0, enemyDefender.x, enemyDefender.y, swordBlockedCharge); } catch (error) { swordBlockedStatus = Number(error?.status) || 0; }
    const swordAfterBlocked = transactionSnapshot();
    const swordAllyNoCommit = swordBlockedStatus === 409 &&
      Number(gunnerBot.itemInventory?.["orichalcum-sword"]) === 1 &&
      JSON.parse(swordAfterBlocked).thrown === JSON.parse(swordBeforeBlocked).thrown &&
      JSON.parse(swordAfterBlocked).effects === JSON.parse(swordBeforeBlocked).effects &&
      JSON.parse(swordAfterBlocked).events === JSON.parse(swordBeforeBlocked).events;
    player.y = y + Math.max(110, map.playerRadius * 3);
    const swordEnemyCharge = setEnhanceChargeState(room, gunnerBot, true, "throw", "orichalcum-sword");
    throwInventoryItem(room, gunnerBot, "orichalcum-sword", 0, enemyDefender.x, enemyDefender.y, swordEnemyCharge);
    const swordEnemyAccepted = Number(gunnerBot.itemInventory?.["orichalcum-sword"] || 0) === 0 && (room.thrownItems || []).length > 0;
    room.thrownItems = [];

    // Bottle throwing owns the item transaction before the later shard owner.
    // Reject an allied landing radius before inventory/projectile/effect commit,
    // then retain ordinary enemy-only throwing when the radius clears.
    Object.assign(gunnerBot, { itemInventory: { molotov: 1 } });
    player.x = enemyDefender.x; player.y = enemyDefender.y;
    const bottleThrowBeforeBlocked = transactionSnapshot();
    const bottleThrowBlockedCharge = setEnhanceChargeState(room, gunnerBot, true, "throw", "molotov");
    let bottleThrowBlockedStatus = 0;
    try { throwInventoryItem(room, gunnerBot, "molotov", 0, enemyDefender.x, enemyDefender.y, bottleThrowBlockedCharge); } catch (error) { bottleThrowBlockedStatus = Number(error?.status) || 0; }
    const bottleThrowAfterBlocked = transactionSnapshot();
    const bottleThrowAllyNoCommit = bottleThrowBlockedStatus === 409 && bottleThrowAfterBlocked === bottleThrowBeforeBlocked;
    player.x = startX + 70; player.y = y + Math.max(110, map.playerRadius * 3);
    const bottleThrowEnemyCharge = setEnhanceChargeState(room, gunnerBot, true, "throw", "molotov");
    throwInventoryItem(room, gunnerBot, "molotov", 0, enemyDefender.x, enemyDefender.y, bottleThrowEnemyCharge);
    const bottleThrowEnemyAccepted = Number(gunnerBot.itemInventory?.molotov || 0) === 0 && (room.thrownItems || []).length > 0;
    room.thrownItems = [];

    // Bottle shards and delayed poison use their own non-lethal mutation
    // owners. Verify both current ally rejection and current enemy acceptance.
    player.x = startX + 170; player.y = y; player.bodyHits = 0; player.overheal = 0;
    enemyDefender.x = startX + 410; enemyDefender.y = y; enemyDefender.alive = true; enemyDefender.ejected = false; enemyDefender.bodyHits = 0;
    const shardsBeforeBlocked = transactionSnapshot();
    const shardAllyNoCommit = applyBottleShardSplash(room, gunnerBot, "molotov", { x: player.x, y: player.y }, 0, { random: () => 0 }) === 0 &&
      Number(player.bodyHits) === 0 && Number(player.overheal) === 0 &&
      JSON.parse(transactionSnapshot()).events === JSON.parse(shardsBeforeBlocked).events;
    player.x = startX + 70; player.y = y + Math.max(110, map.playerRadius * 3);
    const shardEnemyBodyHitsBefore = Number(enemyDefender.bodyHits) || 0;
    const shardEnemyAccepted = applyBottleShardSplash(room, gunnerBot, "molotov", { x: enemyDefender.x, y: enemyDefender.y }, 0, { random: () => 0 }) > 0 &&
      Number(enemyDefender.bodyHits) > shardEnemyBodyHitsBefore;

    enemyDefender.alive = true; enemyDefender.ejected = false; enemyDefender.role = "defender"; enemyDefender.bodyHits = 0;
    enemyDefender.mana = 0; enemyDefender.stamina = 0;
    applyPersistentStatus(room, gunnerBot, enemyDefender, "poison", 1, timestamp);
    const staleStatusInstalled = Boolean(enemyDefender.poisonStatus);
    enemyDefender.role = "attacker";
    const staleStatusBodyHitsBefore = Number(enemyDefender.bodyHits) || 0;
    advanceHazards(room, timestamp + HAZARD_TICK_MS + 1);
    const staleStatusAllyNoCommit = staleStatusInstalled && !enemyDefender.poisonStatus && Number(enemyDefender.bodyHits) === staleStatusBodyHitsBefore;
    player.friendlyAttackerBotFireLaneVerification = {
      complete: allyNoCommit && enemyAccepted && !friendlyPenaltyEvent && sunbeamAllyNoCommit && sunbeamEnemyAccepted &&
        swordAllyNoCommit && swordEnemyAccepted && bottleThrowAllyNoCommit && bottleThrowEnemyAccepted &&
        shardAllyNoCommit && shardEnemyAccepted && staleStatusAllyNoCommit,
      allyNoCommit,
      enemyAccepted,
      friendlyPenaltyEvent,
      sunbeamAllyNoCommit,
      sunbeamEnemyAccepted,
      sunbeamBlockedStatus,
      swordAllyNoCommit,
      swordEnemyAccepted,
      swordBlockedStatus,
      bottleThrowAllyNoCommit,
      bottleThrowEnemyAccepted,
      bottleThrowBlockedStatus,
      shardAllyNoCommit,
      shardEnemyAccepted,
      staleStatusAllyNoCommit,
      firstBodyId: String(firstBody?.player?.id || ""),
      allyId: player.id,
      botId: gunnerBot.id,
      enemyId: enemyDefender.id,
      ammoBeforeBlocked: beforeBlocked.ammo,
      ammoAfterBlocked: afterBlocked.ammo,
      ammoAfterEnemy,
      allyBodyHitsBefore: beforeBlocked.allyBodyHits,
      allyBodyHitsAfter: gunnerAllyBodyHitsAfter,
      enemyBodyHitsBefore,
      enemyBodyHitsAfter: gunnerEnemyBodyHitsAfter,
      botAlive: gunnerBotAlive
    };
    gunnerBot.nextBotActionAt = timestamp + 120_000;
    enemyDefender.nextBotActionAt = timestamp + 120_000;
    pushEvent(room, player.friendlyAttackerBotFireLaneVerification.complete
      ? "実画面検証: 味方Attackerユーザーが射線上ではBot射撃no-commit、射線解除後は敵Defenderへの射撃だけを受理しました。"
      : "実画面検証: 味方Attacker Bot射線検証が未完了です。");
  } else if (kind === "hacker-flick-tap" || kind === "hacker-flick-tap-no-barrier") {
    const timestamp = now();
    player.role = "attacker";
    player.operatorId = "attacker-alchemist";
    player.special = "alchemist";
    player.operatorReady = true;
    player.alive = true;
    player.ejected = false;
    player.inVent = false;
    player.credits = 12;
    player.mana = manaCapacityFor(player);
    player.vibeCodingReadyAt = 0;
    room.meeting = null;
      // Hold the ordinary combat actors outside their decision windows long
    // enough for a bounded hidden-screen pointer transaction. The gesture and
    // its Hacker action route remain the production UI and API paths.
    room.preparationEndsAt = kind === "hacker-flick-tap-no-barrier" ? 0 : timestamp + 120_000;
    for (const entry of room.players.values()) {
      if (!entry.isBot) continue;
      entry.nextBotActionAt = timestamp + 120_000;
      entry.taskAutoReadyAt = timestamp + 120_000;
      entry.emergenciesLeft = 0;
    }
  } else if (kind === "sunbeam-activation") {
    const timestamp = now();
    const map = getMap(room);
    const bots = [...room.players.values()].filter((entry) => entry.isBot);
    const target = bots[0];
    if (!target) throw new ApiError(400, "サンビーム実画面fixtureに対象Botがいません。");
    const arena = [...map.walkable]
      .filter((rect) => Number(rect.w) > 520 && Number(rect.h) > map.playerRadius * 3)
      .sort((a, b) => Number(b.w) - Number(a.w))[0];
    if (!arena) throw new ApiError(400, "サンビーム実画面fixtureに直線通路がありません。");
    const y = Number(arena.y) + Number(arena.h) / 2;
    const startX = Number(arena.x) + Math.max(45, map.playerRadius + 10);
    Object.assign(player, {
      role: "defender", special: "flora", operatorId: "defender-flora", operatorReady: true,
      alive: true, ejected: false, inVent: false, x: startX, y, aimX: 1, aimY: 0,
      mana: 20, maxMana: Math.max(20, Number(player.maxMana) || 0), floraMode: "sunbeam",
      rationalFreeAbilityReadyAt: timestamp + 120_000
    });
    bots.forEach((bot, index) => {
      if (index > 0) { bot.alive = false; bot.ejected = true; return; }
      Object.assign(bot, {
        role: "attacker", special: "fighter", operatorReady: true,
        alive: true, ejected: false, inVent: false,
        x: startX + 280, y, gritCharges: 1, standFirmBarrierUntil: 0,
        killReadyAt: timestamp + 120_000,
        nextBotActionAt: timestamp + 120_000, taskAutoReadyAt: timestamp + 120_000
      });
    });
    room.preparationEndsAt = 0;
    room.meeting = null;
      pushEvent(room, "実画面検証: サンビーム（合計20MP）を2回連続発動できます。");
  } else if (kind === "movement-acc") {
    const timestamp = now();
    Object.assign(player, {
      role: "defender", special: "fighter", operatorId: "operator-fighter", operatorReady: true,
      alive: true, ejected: false, inVent: false,
      movementAccEnabled: true,
      speedMultiplier: 1,
      timedAccelerationEffects: [{ source: "fixture-acceleration", multiplier: 2, endsAt: timestamp + 4_000 }]
    });
    room.preparationEndsAt = timestamp + 120_000;
    for (const entry of room.players.values()) {
      if (!entry.isBot) continue;
      entry.nextBotActionAt = timestamp + 120_000;
      entry.taskAutoReadyAt = timestamp + 120_000;
    }
    pushEvent(room, "実画面検証: 検証用加速によりACC2固定が有効、4秒後の次tickでACC1へ戻ります。");
  } else if (kind === "human-defender-task") {
    const timestamp = now();
    const map = getMap(room);
    Object.assign(player, {
      role: "defender", special: "fighter", operatorId: "operator-fighter", operatorReady: true,
      alive: true, ejected: false, inVent: false, vx: 0, vy: 0,
      stamina: TASK_STAMINA_REQUIREMENT, staminaUpdatedAt: timestamp,
      taskAutoReadyAt: 0
    });
    player.taskList = assignTasks(map, room.settings.taskCount);
    const task = player.taskList.find((entry) => !entry.done && entry.type !== "upload") || player.taskList.find((entry) => !entry.done);
    const station = task ? findStation(map, task.stationId) : null;
    if (!task || !station) throw new ApiError(400, "人間Defenderタスク実画面fixtureを準備できません。");
    player.x = station.x;
    player.y = station.y;
    // The public Human Defender route is proximity-only: the first tick owns
    // presence acquisition and a later tick owns authoritative completion.
    player.taskPresenceTaskId = task.id;
    player.taskPresenceSince = timestamp;
    room.preparationEndsAt = timestamp + 120_000;
    for (const entry of room.players.values()) {
      if (!entry.isBot) continue;
      entry.nextBotActionAt = timestamp + 120_000;
      entry.taskAutoReadyAt = timestamp + 120_000;
    }
    pushEvent(room, `実画面検証: 停止中の人間Defenderが ${task.label} に接近し、滞在後に自動完了します。`);
  } else if (kind === "fighter-ec100") {
    const timestamp = now();
    Object.assign(player, {
      role: "defender", special: "fighter", operatorId: "operator-fighter", operatorReady: true,
      alive: true, ejected: false, inVent: false,
      fighterEnergyCharge: 99, fighterEnergyPeak: 99, fighterEnergyChargeReadyAt: timestamp + 800,
      mana: 20, maxMana: Math.max(20, Number(player.maxMana) || 0),
      stamina: MAX_STORED_STAMINA, bodyHits: 0, gritCharges: 0
    });
    room.preparationEndsAt = timestamp + 120_000;
    for (const entry of room.players.values()) {
      if (!entry.isBot) continue;
      entry.nextBotActionAt = timestamp + 120_000;
      entry.taskAutoReadyAt = timestamp + 120_000;
    }
    pushEvent(room, "実画面検証: EC99から次tickでEC100へ到達し、無限MP/SP/HP/バリアを同期します。");
  } else if (kind === "root-borrowed-input") {
    const timestamp = now();
    const map = getMap(room);
    const target = [...room.players.values()].find((entry) => entry.isBot);
    if (!target) throw new ApiError(400, "ROOT借用入力実画面fixtureに対象Botがいません。");
    const spawn = map.spawns[0];
    Object.assign(player, {
      role: "attacker", special: "alchemist", operatorId: "attacker-alchemist", operatorReady: true,
      alive: true, ejected: false, inVent: false,
      x: spawn.x, y: spawn.y, aimX: 1, aimY: 0,
      mana: 20, maxMana: Math.max(20, Number(player.maxMana) || 0),
      hackerRootActive: true,
      hackerRootHealthSnapshot: { bodyHits: 0, overheal: 0 },
      bodyHits: 2 - HACKER_ROOT_HEALTH, overheal: 0
    });
    Object.assign(target, {
      role: "defender", special: "fighter", operatorReady: true,
      alive: true, ejected: false, inVent: false,
      x: spawn.x + 140, y: spawn.y, gritCharges: 1,
      nextBotActionAt: timestamp + 120_000, taskAutoReadyAt: timestamp + 120_000
    });
    for (const entry of room.players.values()) {
      if (!entry.isBot || entry === target) continue;
      entry.alive = false;
      entry.ejected = true;
    }
    room.preparationEndsAt = 0;
    room.meeting = null;
      pushEvent(room, "実画面検証: ROOT借用能力はpointer・keyboard・tabletで同じowner/modeへ委譲します。");
  } else if (kind.startsWith("enemy-bot-repertoire-")) {
    const timestamp = now();
    const map = getMap(room);
    const bots = [...room.players.values()].filter((entry) => entry.isBot);
    const bot = bots[0];
    if (!bot) throw new ApiError(400, "敵Bot最大強度実画面fixtureにBotがいません。");
    const arena = [...map.walkable]
      .filter((rect) => Number(rect.w) > 520 && Number(rect.h) > map.playerRadius * 3)
      .sort((a, b) => Number(b.w) - Number(a.w))[0];
    if (!arena) throw new ApiError(400, "敵Bot最大強度実画面fixtureに直線通路がありません。");
    const y = Number(arena.y) + Number(arena.h) / 2;
    const x = Number(arena.x) + Math.max(45, map.playerRadius + 10);
    Object.assign(player, {
      role: "defender", special: "fighter", operatorId: "operator-fighter", operatorReady: true,
      alive: true, ejected: false, inVent: false, x: x + 240, y,
      gritCharges: 1, mana: 20, stamina: MAX_STAMINA
    });
    Object.assign(bot, {
      role: "attacker", special: "fighter", operatorId: "operator-fighter", operatorReady: true,
      alive: true, ejected: false, inVent: false, x, y, aimX: 1, aimY: 0,
      mana: 20, maxMana: 20, stamina: MAX_STAMINA,
      nextBotActionAt: 0, killReadyAt: 0, gunReadyAt: 0,
      heavyWeapons: [], inventions: [], itemInventory: {}, purchasedWeapons: []
    });
    if (kind === "enemy-bot-repertoire-heavy") bot.heavyWeapons = ["rpg"];
    else if (kind === "enemy-bot-repertoire-invention") bot.inventions = ["railgun"];
    else if (kind === "enemy-bot-repertoire-quantum") {
      bot.special = "quantum";
      bot.operatorId = "operator-quantum-control";
      bot.itemInventory = { lead: 1 };
      bot.credits = 0;
    } else if (kind === "enemy-bot-repertoire-root") {
      bot.special = "alchemist";
      bot.operatorId = "attacker-alchemist";
      bot.hackerRootActive = true;
      bot.hackerRootHealthSnapshot = { bodyHits: 0, overheal: 0 };
      bot.bodyHits = 2 - HACKER_ROOT_HEALTH;
    } else {
      throw new ApiError(400, "敵Bot最大強度実画面fixtureの種類が不正です。");
    }
    bots.slice(1).forEach((entry) => { entry.alive = false; entry.ejected = true; });
    room.preparationEndsAt = 0;
    room.meeting = null;
      const expectedPrefix = {
      "enemy-bot-repertoire-heavy": "heavy-rpg",
      "enemy-bot-repertoire-invention": "invention-railgun",
      "enemy-bot-repertoire-quantum": "quantum-nuclear-transmutation",
      "enemy-bot-repertoire-root": "root-borrowed-"
    }[kind];
    const fixtureCandidate = botCombatCandidates(room, bot, player, timestamp)
      .find((candidate) => candidate.code.startsWith(expectedPrefix));
    if (!fixtureCandidate || fixtureCandidate.run() === false) {
      throw new ApiError(500, `敵Bot最大強度実画面fixtureが ${expectedPrefix} を実行できません。`);
    }
    pushEvent(room, `実画面検証: ${kind} は ${fixtureCandidate.code} をauthoritative helperで実行しました。`);
  } else if (kind === "shop-all-abilities") {
    const timestamp = now();
    const map = getMap(room);
    const bots = [...room.players.values()].filter((entry) => entry.isBot);
    const target = bots[0];
    if (!target) throw new ApiError(400, "ショップ能力実画面fixtureに対象Botがいません。");
    const arena = [...map.walkable]
      .filter((rect) => Number(rect.w) > 760 && Number(rect.h) > map.playerRadius * 3)
      .sort((left, right) => Number(right.w) - Number(left.w))[0];
    if (!arena) throw new ApiError(400, "ショップ能力実画面fixtureに見通し通路がありません。");
    const y = Number(arena.y) + Number(arena.h) / 2;
    const startX = Number(arena.x) + Math.max(50, map.playerRadius + 12);
    Object.assign(player, {
      role: "defender", special: "fighter", operatorId: "operator-fighter", operatorReady: true,
      alive: true, ejected: false, inVent: false, x: startX, y, vx: 0, vy: 0,
      movementMode: "idle", aimX: 1, aimY: 0,
      credits: 40, shopAbilityEntitlements: [], shopAbilityPurchaseTransactions: [],
      lastShopPurchaseAbilityId: "", lastShopPurchaseSpent: 0, lastShopPurchaseAt: 0,
      mana: 6, maxMana: Math.max(6, Number(player.maxMana) || 0),
      stamina: 500, maxStoredStamina: Math.max(500, Number(player.maxStoredStamina) || 0),
      rationalFreeAbilityReadyAt: timestamp + 120_000,
      sleepingUntil: 0, unconsciousUntil: 0, meditatingUntil: 0, smartphoneUntil: 0,
      gravityPinnedUntil: 0, ascensionUntil: 0, timeStoppedUntil: 0,
      abilityDisabledUntil: 0, itemDisabledUntil: 0
    });
    Object.assign(target, {
      isBot: false,
      role: "attacker", special: "fighter", operatorId: "attacker-fighter", operatorReady: true,
      alive: true, ejected: false, inVent: false, x: startX + 360, y, vx: 0, vy: 0,
      bodyHits: 0, overheal: 0, gritCharges: 0, mana: -100, stamina: 0,
      shockSlowedUntil: 0, quantumElectricSlowUntil: 0, itemDisabledUntil: 0, abilityDisabledUntil: 0,
      sleepingUntil: 0, unconsciousUntil: 0, meditatingUntil: 0,
      nextBotActionAt: timestamp + 120_000,
      taskAutoReadyAt: timestamp + 120_000, smartphoneUntil: timestamp + 120_000
    });
    bots.slice(1).forEach((entry) => { entry.alive = false; entry.ejected = true; });
    room.preparationEndsAt = 0;
    room.meeting = null;
      pushEvent(room, "実画面検証: ショップのクオンタム頁へ直接移動し、エレクトリックを12Cで購入後、同じカードから既存ownerへ発動します。");
  } else if (["quantum-electric-discharge", "quantum-electric-root"].includes(kind)) {
    const timestamp = now();
    const map = getMap(room);
    const bots = [...room.players.values()].filter((entry) => entry.isBot);
    const target = bots[0];
    if (!target) throw new ApiError(400, "Quantum Electric実画面fixtureに対象Botがいません。");
    const arena = [...map.walkable]
      .filter((rect) => Number(rect.w) > 760 && Number(rect.h) > map.playerRadius * 3)
      .sort((left, right) => Number(right.w) - Number(left.w))[0];
    if (!arena) throw new ApiError(400, "Quantum Electric実画面fixtureに見通し通路がありません。");
    const y = Number(arena.y) + Number(arena.h) / 2;
    const startX = Number(arena.x) + Math.max(50, map.playerRadius + 12);
    const targetX = Number(arena.x) + Number(arena.w) - Math.max(50, map.playerRadius + 12);
    const rootBorrowed = kind === "quantum-electric-root";
    Object.assign(player, {
      role: rootBorrowed ? "attacker" : "defender",
      special: rootBorrowed ? "alchemist" : "quantum",
      operatorId: rootBorrowed ? "attacker-alchemist" : "operator-quantum-control", operatorReady: true,
      alive: true, ejected: false, inVent: false, x: startX, y, vx: 0, vy: 0,
      movementMode: "idle", aimX: 1, aimY: 0,
      mana: 6, maxMana: Math.max(12, Number(player.maxMana) || 0),
      stamina: 500, maxStoredStamina: Math.max(1000, Number(player.maxStoredStamina) || 0),
      quantumMode: "electric-discharge", rationalFreeAbilityReadyAt: timestamp + 120_000,
      sleepingUntil: 0, unconsciousUntil: 0, meditatingUntil: 0, smartphoneUntil: 0,
      gravityPinnedUntil: 0, ascensionUntil: 0, timeStoppedUntil: 0,
      abilityDisabledUntil: 0, itemDisabledUntil: 0
    });
    syncMentalState(room, player, "実画面検証", timestamp);
    if (rootBorrowed) {
      player.hackerRootActive = true;
      player.hackerRootHealthSnapshot = { bodyHits: 0, overheal: 0 };
      player.bodyHits = 2 - HACKER_ROOT_HEALTH;
    }
    Object.assign(target, {
      isBot: false,
      role: rootBorrowed ? "defender" : "attacker", special: "fighter", operatorId: rootBorrowed ? "defender-fighter" : "attacker-fighter", operatorReady: true,
      alive: true, ejected: false, inVent: false, x: targetX, y, vx: 0, vy: 0,
      bodyHits: 0, overheal: 0, gritCharges: 0, mana: -100, stamina: 0,
      shockSlowedUntil: 0, quantumElectricSlowUntil: 0, itemDisabledUntil: 0, abilityDisabledUntil: 0,
      sleepingUntil: 0, unconsciousUntil: 0, meditatingUntil: 0,
      nextBotActionAt: timestamp + 120_000,
      taskAutoReadyAt: timestamp + 120_000, smartphoneUntil: timestamp + 120_000
    });
    bots.slice(1).forEach((entry) => { entry.alive = false; entry.ejected = true; });
    room.preparationEndsAt = 0;
    room.meeting = null;
      pushEvent(room, `実画面検証: ${rootBorrowed ? "ROOT借用" : "通常"}エレクトリック（1MP / 16SP）は見通し上の最近接敵へ距離を問わず絶縁破壊→電子輸送を一度だけ実行します。`);
  } else if (["gunner-luck-headshot-aim", "gunner-luck-headshot-hip"].includes(kind)) {
    const timestamp = now();
    const map = getMap(room);
    const bots = [...room.players.values()].filter((entry) => entry.isBot);
    const target = bots[0];
    if (!target) throw new ApiError(400, "Gunner HS確率実画面fixtureに対象Botがいません。");
    const arena = [...map.walkable]
      .filter((rect) => Number(rect.w) > 620 && Number(rect.h) > map.playerRadius * 3)
      .sort((a, b) => Number(b.w) - Number(a.w))[0];
    if (!arena) throw new ApiError(400, "Gunner HS確率実画面fixtureに直線通路がありません。");
    const y = Number(arena.y) + Number(arena.h) / 2;
    const startX = Number(arena.x) + Math.max(50, map.playerRadius + 12);
    const aimed = kind.endsWith("-aim");
    Object.assign(player, {
      role: "attacker", special: "gunner", operatorId: "attacker-gunner", operatorReady: true,
      alive: true, ejected: false, inVent: false, x: startX, y, vx: 0, vy: 0,
      movementMode: "idle", aimX: 1, aimY: 0,
      mana: aimed ? 20 : -100, maxMana: Math.max(20, Number(player.maxMana) || 0),
      stamina: 500, maxStoredStamina: Math.max(500, Number(player.maxStoredStamina) || 0),
      gunnerWeapon: "assault", gunnerAmmo: createGunnerAmmo(),
      gunnerReloadUntil: 0, gunReadyAt: 0, gunFiring: false,
      gunnerSpecialAmmoType: "", gunnerSpecialAmmoWeapon: "", gunnerSpecialAmmoRounds: 0,
      gunnerSpecialAmmoInventory: { weak: 0, penetrate: 0, shock: 0 },
      gunnerSnipingActive: false, gunnerAimTargetId: "",
      gunnerLastHitZone: "", gunnerLastHeadshotChance: 0,
      gunnerBodyHitObserved: false, gunnerHeadshotObserved: false,
      gunnerHeadshotVerificationRolls: [0.999999, 0]
    });
    Object.assign(target, {
      role: "defender", special: "fighter", operatorId: "defender-fighter", operatorReady: true,
      alive: true, ejected: false, inVent: false,
      x: startX + 260, y, vx: 0, vy: 0, bodyHits: 0, overheal: 0, gritCharges: 0,
      nextBotActionAt: timestamp + 120_000, taskAutoReadyAt: timestamp + 120_000,
      killReadyAt: timestamp + 120_000, smartphoneUntil: timestamp + 120_000
    });
    bots.slice(1).forEach((entry) => { entry.alive = false; entry.ejected = true; });
    room.preparationEndsAt = 0;
    room.meeting = null;
      if (aimed) advanceGunnerAimPassive(room, player, timestamp);
    pushEvent(room, `実画面検証: ${aimed ? "エイム" : "腰撃ち"}は幸運補正込み確率でbody→HSを一度ずつ解決します。`);
  } else if (kind === "automatic-surplus-mana") {
    Object.assign(player, {
      alive: true, ejected: false, inVent: false,
      mana: 10, maxMana: 10,
      reasonCharges: 0, gritCharges: 0,
      manaAutoProtectionNext: "reason"
    });
    room.preparationEndsAt = 0;
    room.meeting = null;
      setMana(room, player, 14, "実画面余剰マナ自動変換fixture");
    pushEvent(room, "実画面検証: 上限10MPに対する一度の+4MP余剰を、バスト→バリア交互の2回分ずつへ自動変換しました。");
  } else if (kind === "enemy-bot-combat") {
    const timestamp = now();
    const map = getMap(room);
    const bots = [...room.players.values()].filter((entry) => entry.isBot);
    const hunter = bots[0];
    if (!hunter) throw new ApiError(400, "敵Bot戦闘実画面fixtureにBotがいません。");
    const arena = [...map.walkable]
      .filter((rect) => Number(rect.w) > map.playerRadius * 4 && Number(rect.h) > map.playerRadius * 4)
      .sort((a, b) => Math.max(Number(b.w), Number(b.h)) - Math.max(Number(a.w), Number(a.h)))[0];
    if (!arena) throw new ApiError(400, "敵Bot戦闘実画面fixtureに通行可能領域がありません。");
    const margin = Math.max(map.playerRadius + 14, 40);
    const alongX = Number(arena.w) >= Number(arena.h);
    const available = Math.max(1, (alongX ? Number(arena.w) : Number(arena.h)) - margin * 2);
    const separation = Math.min(360, Math.max(room.settings.killRange + 90, available * 0.55));
    const first = margin;
    const second = Math.min(margin + separation, margin + available);
    const fixed = alongX ? Number(arena.y) + Number(arena.h) / 2 : Number(arena.x) + Number(arena.w) / 2;
    Object.assign(player, {
      role: "defender", special: "fighter", operatorId: "defender-fighter", operatorReady: true,
      alive: true, ejected: false, inVent: false,
      x: alongX ? Number(arena.x) + second : fixed,
      y: alongX ? fixed : Number(arena.y) + second,
      health: 2, killReadyAt: 0
    });
    for (const bot of bots) {
      if (bot !== hunter) {
        bot.ejected = true;
        bot.alive = false;
        continue;
      }
      Object.assign(bot, {
        role: "attacker", special: "fighter", operatorId: "attacker-fighter", operatorReady: true,
        alive: true, ejected: false, inVent: false,
        x: alongX ? Number(arena.x) + first : fixed,
        y: alongX ? fixed : Number(arena.y) + first,
        mana: 0, maxMana: Math.max(20, Number(bot.maxMana) || 0),
        stamina: Math.max(MAX_STAMINA, Number(bot.stamina) || 0),
        nextBotActionAt: 0, killReadyAt: 0, meditatingUntil: 0,
        actionTargetId: "", attackTargetId: "", aimTargetId: "", botCombatPlan: null,
        navPath: [], navTargetId: "", fighterEnergy: 0,
        // This fixture must exercise only the prepared Fighter chase. Bot
        // generation may previously have selected Quantum and supplied toxic
        // inventory; retaining that hidden setup made a visual combat fixture
        // nondeterministically test a self-poison plan instead of pursuit.
        itemInventory: {}, heavyWeapons: [], inventions: [],
        botHazardAvoidUntil: 0, botHazardAvoidX: 0, botHazardAvoidY: 0
      });
    }
    // Exercise the same first-screen lifecycle reported by the user: the
    // opening shield is present briefly, expires through the ordinary tick,
    // and the hostile Bot must then continue from pursuit into a real kill.
    room.preparationEndsAt = timestamp + 1_500;
    room.meeting = null;
      room.bodies = [];
    room.finishReason = "";
    pushEvent(room, `実画面検証: ${hunter.name} が既知の敵へ接敵し、キルまで継続します。`);
  } else if (kind === "meeting-chat-layout") {
    const timestamp = now();
    startMeeting(room, "実画面検証: チャット安全幅", player.id);
    room.meeting.discussionEndsAt = timestamp + 120_000;
    room.meeting.endsAt = timestamp + 180_000;
    room.chat.push({
      id: uid("c_"),
      at: timestamp,
      playerId: player.id,
      name: player.name,
      killRate: 0,
      message: "W".repeat(180),
      muted: false
    });
    room.chat = room.chat.slice(-60);
  } else if (kind === "result-points-clean-rebuild" || kind === "result-points-mvp-tie" || kind === "result-points-idea-outcome") {
    const entries = [...room.players.values()];
    const runnerUp = entries.find((entry) => entry.id !== player.id) || null;
    if (!runnerUp) throw new ApiError(400, "Result実画面fixtureに比較対象がいません。");
    for (const entry of entries) {
      entry.role = "attacker";
      entry.totalKills = 0;
      entry.alive = true;
      entry.ejected = false;
    }
    if (kind === "result-points-idea-outcome") {
      player.role = "defender";
      runnerUp.role = "attacker";
      setIdeaWinnerIds(room, [player.id]);
      room.winner = "idea";
    } else {
      player.role = "defender";
      player.totalKills = 1;
      runnerUp.role = "defender";
      if (kind === "result-points-mvp-tie") runnerUp.totalKills = 1;
      // Keep both winning and losing factions visible.
      entries
        .filter((entry) => entry.id !== player.id && entry.id !== runnerUp.id)
        .slice(0, 2)
        .forEach((entry) => { entry.role = "defender"; });
      setIdeaWinnerIds(room, []);
      room.winner = "defenders";
    }
    room.phase = "ended";
    room.finishReason = kind === "result-points-mvp-tie"
      ? "実画面検証: 同点でもMVPは決定的な一人だけ"
      : kind === "result-points-idea-outcome"
        ? "実画面検証: 善のイデアは通常の勝敗点だけ"
        : "実画面検証: リザルト数値は新規ランクポイント経路だけ";
    room.resultBoardCommitted = false;
    room.resultBoardByPlayerId = {};
    commitResultBoard(room);
  } else if (kind === "vending-atomic-settlement") {
    // Exercise the real Vending controls against one deterministic state:
    // a capped Warp must reject without charging, then a two-unit Mystery
    // bulk purchase must preserve both jackpot deltas after its 8C cost.
    const timestamp = now();
    Object.assign(player, {
      credits: 8,
      warpCharges: 3,
      mysteryVerificationRolls: [0.01, 0.01],
      lastMysteryResult: "",
      lastMysteryResultAt: 0,
      lastPassiveCreditAt: timestamp + 120_000,
      vendingBulkTransactions: [],
      lastVendingBulkItemId: "",
      lastVendingBulkAt: 0
    });
    for (const entry of room.players.values()) {
      if (!entry.isBot) continue;
      entry.nextBotActionAt = timestamp + 120_000;
      entry.taskAutoReadyAt = timestamp + 120_000;
    }
    setImmediateFeedback(player, "ショップ実画面検証", "Warp上限拒否後、Mysteryを一括購入");
  } else if (kind === "enemy-defender-task") {
    const timestamp = now();
    const map = getMap(room);
    const bots = [...room.players.values()].filter((entry) => entry.isBot);
    if (!bots.length) throw new ApiError(400, "敵防衛Bot実画面fixtureにBotがいません。");
    player.role = "attacker";
    room.preparationEndsAt = timestamp + 30_000;
    room.bodies = [];
      room.groundItems = [];
    for (const bot of bots) {
      bot.role = "defender";
      bot.alive = true;
      bot.ejected = false;
      bot.inVent = false;
      bot.operatorReady = true;
      bot.nextBotActionAt = 0;
      bot.taskAutoReadyAt = 0;
      bot.mana = manaCapacityFor(bot);
      // Forced verification placement must not retain a previously planned
      // waypoint now that Bot navigation intent persists between planner turns.
      clearBotNavigationIntent(bot);
      if (!(Array.isArray(bot.taskList) && bot.taskList.some((task) => !task.done))) {
        bot.taskList = assignTasks(map, room.settings.taskCount);
      }
      clearBotTaskInteraction(bot, { clearTarget: true });
    }
    const primary = bots.find((bot) => bot.taskList.some((task) => !task.done));
    const task = primary?.taskList.find((entry) => !entry.done && entry.type === "download") ||
      primary?.taskList.find((entry) => !entry.done);
    const station = task ? findStation(map, task.stationId) : null;
    if (!primary || !task || !station) throw new ApiError(400, "敵防衛Bot実画面fixtureの未完了タスクを準備できません。");
    primary.x = station.x;
    primary.y = station.y;
    primary.vx = 0;
    primary.vy = 0;
    primary.movementMode = "idle";
    primary.botTaskTargetId = task.id;
    primary.botTaskPresenceSince = timestamp - 1_000;
    primary.botTaskPresenceLastTickAt = timestamp;
  } else {
    throw new ApiError(400, "実画面回帰fixtureの種類が不正です。");
  }
  touch(room);
  return serialize(room, player);
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new ApiError(413, "リクエストが大きすぎます。"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new ApiError(400, "JSONを解析できません。"));
      }
    });
    req.on("error", reject);
  });
}

// Only successful, known gameplay actions can carry this cosmetic gesture.
// It never changes authorization, costs, repeat cadence, or action arguments.
const ENHANCE_CONTINUOUS_GAMEPLAY_PATHS = new Set([
  "/api/donate", "/api/gunner-weapon", "/api/gunner-reload", "/api/dodge", "/api/emp",
  "/api/fighter-slash", "/api/emergency", "/api/sabotage", "/api/repair", "/api/task",
  "/api/report", "/api/item-pickup", "/api/purchase", "/api/shop/purchase", "/api/shop/ability",
  "/api/limit-break", "/api/instant-warp", "/api/teleport", "/api/flora-heal", "/api/alchemist-invention",
  "/api/borrowed-ability", "/api/quantum-control", "/api/gravity-time", "/api/gravity-storm", "/api/luminous"
]);
function beginEnhanceGesturePresentation(body, pathname) {
  const gesture = body.enhanceGesture;
  if (!gesture || typeof gesture.id !== "string" || !gesture.id.trim() || gesture.id.length > 160) return null;
  const supported = gesture.kind === "continuous" ? ENHANCE_CONTINUOUS_GAMEPLAY_PATHS.has(pathname)
    : gesture.kind === "vending-bulk" ? pathname === "/api/purchase" && body.bulk === true
    : gesture.kind === "root-shortcut" ? pathname === "/api/hacker-root" : false;
  if (!supported) return null;
  const { room, player } = requireRoomPlayer(body);
  if (room.phase !== "playing" || !player.alive || player.ejected || player.inVent) return null;
  if (gesture.kind === "root-shortcut" && !player.hackerRootActive) return null;
  return { room, player, identity: "gesture:" + gesture.id, kind: gesture.kind,
    lastMagicId: room.magicEffects.at(-1)?.id, lastEventId: room.events.at(-1)?.id, phase: room.phase };
}
function finishEnhanceGesturePresentation(context, payload) {
  if (!context || !payload || payload.actionApplied === false || payload.duplicate || payload.shopAbilityResult === false) return;
  const { room, player } = context;
  if (context.kind === "root-shortcut" && player.hackerRootActive) return;
  const priorIndex = room.magicEffects.findIndex(effect => effect.id === context.lastMagicId);
  const newEffects = room.magicEffects.slice(priorIndex + 1);
  // Specialized charged/batch actions already own their Enhance marker.
  if (newEffects.some(effect => effect.type === "enhance-activation" && effect.playerId === player.id)) return;
  const changed = room.magicEffects.at(-1)?.id !== context.lastMagicId ||
    room.events.at(-1)?.id !== context.lastEventId || room.phase !== context.phase;
  if (!changed) return; // Successful HTTP no-op/replay is not a new gameplay action.
  if (emitEnhanceActivation(room, player, context.identity)) {
    // serialize happened in the route: refresh only the effect projection so
    // this response includes its marker while route-specific outcome fields stay intact.
    payload.magicEffects = room.magicEffects.filter(effect => !effect.viewerId || effect.viewerId === player.id);
  }
}

async function handleApi(req, res) {
  const body = req.method === "GET" ? Object.fromEntries(new URL(req.url, `http://${req.headers.host}`).searchParams) : await parseBody(req);
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  requireCompatibleOnlineClient(req);
  const identityKey = moderationKey(req, body.clientId);
  if (moderationRecord(identityKey).banned) {
    throw new ApiError(403, "この端末からの参加は永久停止されています。");
  }
  let payload;
  const enhanceGesturePresentation = beginEnhanceGesturePresentation(body, pathname);

  if (body.abilityHoldAutoCommit === true && ABILITY_BATCH_ACTION_PATHS.has(pathname)) {
    const { player } = requireRoomPlayer(body, false);
    await awaitAbilityHoldAutoCommitThreshold(player, body, pathname);
  }

  switch (pathname) {
    case "/api/checkpoint":
      {
        const profileId = playerProfileId(req);
        const profile = playerProfiles[canonicalProfileId(profileId)] || migrateLegacyProfile(profileId, legacyPlayerProfileId(body.clientId));
      payload = body.exclude === true || body.exclude === "true"
        ? { ok: true, excluded: true }
        : {
            ok: true,
            checkpoint: String(body.checkpoint || ""),
            count: recordCheckpoint(
              body.checkpoint,
              profileId,
              body.event,
              profile?.name || body.userName,
              body.id,
              body.occurredAt
            )
          };
      }
      break;

    case "/api/checkpoints": {
      if (ANALYTICS_REMOTE_URL && now() - (Number(checkpointHydrationStatus.checkedAt) || 0) > 15_000) {
        await hydrateCheckpointArchive();
      }
      payload = {
        ok: true,
        analyticsVersion: 3,
        checkpoints: checkpointReport(playerProfileId(req)),
        archiveStatus: checkpointHydrationStatus
      };
      break;
    }

    case "/api/checkpoints/exclude": {
      excludeCheckpointProfile(playerProfileId(req));
      payload = { ok: true, excluded: true };
      break;
    }

    case "/api/checkpoints/archive": {
      payload = { ok: true, archive: checkpointArchiveSnapshot() };
      break;
    }

    case "/api/online-capacity":
      payload = { ok: true, ...renderCapacityStatus() };
      break;

    case "/api/profile": {
      const profileId = playerProfileId(req);
      const profile = playerProfiles[canonicalProfileId(profileId)] || migrateLegacyProfile(profileId, legacyPlayerProfileId(body.clientId));
      const developer = isDeveloperProfileId(profileId);
      if (profile?.name && Number(profile.identityVersion) < 2) {
        profile.identityVersion = 2;
        profile.updatedAt = now();
        savePlayerProfiles();
      }
      payload = {
        ok: true,
        profile: profile
          ? { name: profile.name, locked: Boolean(profile.name), developer }
          : { name: "", locked: false, developer },
        policy: "名前はIPアドレス単位で保存され、初回確定後は変更できません。",
        profileStatus: profileHydrationStatus
      };
      break;
    }

    case "/api/solo/start": {
      const profileId = playerProfileId(req);
      const playerName = reservePlayerName(body.name, profileId, legacyPlayerProfileId(body.clientId));
      const { room, player } = createSoloMissionRoom(String(body.missionId || ""), playerName, body.skinId, profileId);
      player.moderationKey = identityKey;
      payload = {
        ...serialize(room, player),
        roomId: room.id,
        playerId: player.id,
        profile: { name: playerName, locked: true }
      };
      break;
    }

    case "/api/matchmake": {
      const profileId = playerProfileId(req);
      const requestedName = reservePlayerName(body.name, profileId, legacyPlayerProfileId(body.clientId));
      const requestedMapId = normalizeMapId(body.mapId);
      if (body.instantDecision === true) {
        payload = await requestInstantMatchmaking({
          identityKey,
          requestId: body.matchmakingRequestId,
          mapId: requestedMapId,
          name: requestedName,
          skinId: body.skinId,
          profileId
        });
        break;
      }
      if (body.offlineFallback === true) {
        const room = createRoom(roomCode());
        room.settings.mapId = requestedMapId;
        const player = createMatchedPlayer(room, requestedName, body.skinId, profileId, identityKey);
        room.matchmaking = { status: "offline" };
        addDefaultOnlineBots(room);
        startGame(room);
        payload = {
          ...serialize(room, player),
          roomId: room.id,
          playerId: player.id,
          matchmaking: { status: "offline" },
          profile: { name: requestedName, locked: true }
        };
        break;
      }

      const waitingRoom = waitingMatchmakingRoom(identityKey, requestedMapId);
      if (waitingRoom) {
        const player = createMatchedPlayer(waitingRoom, requestedName, body.skinId, profileId, identityKey);
        waitingRoom.matchmaking = { status: "matched", matchedAt: now() };
        addDefaultOnlineBots(waitingRoom);
        startGame(waitingRoom);
        payload = {
          ...serialize(waitingRoom, player),
          roomId: waitingRoom.id,
          playerId: player.id,
          matchmaking: { status: "online" },
          profile: { name: requestedName, locked: true }
        };
        break;
      }

      const room = createRoom(roomCode());
      room.settings.mapId = requestedMapId;
      const player = createMatchedPlayer(room, requestedName, body.skinId, profileId, identityKey);
      room.matchmaking = {
        status: "waiting",
        createdAt: now(),
        expiresAt: now() + MATCHMAKING_WAIT_MS
      };
      payload = {
        ...serialize(room, player),
        roomId: room.id,
        playerId: player.id,
        matchmaking: { ...room.matchmaking },
        profile: { name: requestedName, locked: true }
      };
      break;
    }

    case "/api/matchmake/instant/cancel": {
      payload = cancelInstantMatchmaking(identityKey, body.matchmakingRequestId);
      break;
    }

    case "/api/matchmake/cancel": {
      const { room, player } = requireRoomPlayer(body);
      if (room.phase !== "lobby") {
        payload = {
          ...serialize(room, player),
          matchmaking: { status: "online" }
        };
        break;
      }
      const humans = [...room.players.values()].filter((entry) => !entry.isBot);
      if (room.matchmaking?.status === "waiting" && humans.length === 1 && humans[0].id === player.id) {
        rooms.delete(room.id);
        payload = { ok: true, cancelled: true };
        break;
      }
      throw new ApiError(409, "マッチング待機を解除できませんでした。");
    }

    // Regression fixtures only. These routes are unavailable to normal clients
    // and are retained solely so the established offline simulation suite can
    // construct exact combat states without reintroducing player-facing rooms.
    case "/api/join": {
      requireLegacyRoomTestFixture(req, body);
      const profileId = playerProfileId(req);
      const requestedName = reservePlayerName(body.name, profileId, legacyPlayerProfileId(body.clientId));
      const requested = cleanRoomId(body.roomId);
      const room = requested ? getRoom(requested) || createRoom(requested) : createRoom(roomCode());
      const shouldAddDefaultBots = room.phase === "lobby" && room.players.size === 0;
      const existing = body.playerId ? room.players.get(String(body.playerId)) : null;
      const player = existing || addPlayer(room, requestedName, false, body.skinId, profileId);
      player.moderationKey = identityKey;
      if (existing) {
        player.name = requestedName || player.name;
        player.profileId ||= profileId;
        player.isBot = false;
        player.skinId = cleanSkinId(body.skinId || player.skinId);
        player.lastSeenAt = now();
      }
      if (shouldAddDefaultBots) addDefaultOnlineBots(room);
      payload = {
        ...serialize(room, player),
        roomId: room.id,
        playerId: player.id,
        profile: { name: requestedName, locked: true }
      };
      break;
    }

    case "/api/settings": {
      requireLegacyRoomTestFixture(req, body);
      const { room, player } = requireRoomPlayer(body);
      if (room.hostId !== player.id || room.phase !== "lobby") throw new ApiError(400, "テスト用設定を変更できません。");
      const next = { ...room.settings };
      next.mapId = normalizeMapId(body.mapId);
      if (["random", "attacker", "defender"].includes(body.hostTeam)) next.hostTeam = body.hostTeam;
      next.attackerCount = Math.floor(clampNumber(body.attackerCount, 1, 3, next.attackerCount));
      next.taskCount = Math.floor(clampNumber(body.taskCount, 6, 30, next.taskCount));
      next.killCooldown = Math.floor(clampNumber(body.killCooldown, 8, 45, next.killCooldown));
      next.killRange = Math.floor(clampNumber(body.killRange, 60, 180, next.killRange));
      next.discussionTime = Math.floor(clampNumber(body.discussionTime, 0, 45, next.discussionTime));
      next.votingTime = Math.floor(clampNumber(body.votingTime, 20, 600, next.votingTime));
      next.anonymousVotes = Boolean(body.anonymousVotes);
      next.confirmEjects = Boolean(body.confirmEjects);
      next.emergencyLimit = Math.floor(clampNumber(body.emergencyLimit, 0, 5, next.emergencyLimit));
      room.settings = next;
      touch(room);
      payload = serialize(room, player);
      break;
    }

    case "/api/add-bot": {
      requireLegacyRoomTestFixture(req, body);
      const { room, player } = requireRoomPlayer(body);
      if (room.hostId !== player.id || room.phase !== "lobby") throw new ApiError(400, "テスト用Botを追加できません。");
      addPlayer(room, `Bot ${room.players.size + 1}`, true);
      payload = serialize(room, player);
      break;
    }

    case "/api/regression-real-screen-fixture": {
      requireLegacyRoomTestFixture(req, body);
      const { room, player } = requireRoomPlayer(body);
      payload = applyRealScreenRegressionFixture(room, player, body.kind);
      break;
    }

    case "/api/start": {
      requireLegacyRoomTestFixture(req, body);
      const { room, player } = requireRoomPlayer(body);
      if (room.hostId !== player.id) throw new ApiError(403, "テスト用開始権限がありません。");
      startGame(room);
      payload = serialize(room, player);
      break;
    }

    case "/api/kick": {
      requireLegacyRoomTestFixture(req, body);
      const { room, player } = requireRoomPlayer(body);
      if (room.hostId !== player.id) throw new ApiError(403, "テスト用退出権限がありません。");
      const target = room.players.get(String(body.targetId || ""));
      if (!target || target.id === player.id) throw new ApiError(400, "退出対象を選択してください。");
      leaveRoom(room, target);
      payload = serialize(room, player);
      break;
    }

    case "/api/operator-selection-settings": {
      const { room, player } = requireRoomPlayer(body);
      const profileId = playerProfileId(req);
      const generatedOffline = isGeneratedOfflineRequest(req) && room.matchmaking?.status === "offline";
      const selectionProfileId = profileId || (generatedOffline ? legacyPlayerProfileId(body.clientId) : "");
      const preparing = preparationBarrierActive(room);
      if ((room.phase !== "selecting" && !preparing) || room.soloMission) {
        throw new ApiError(409, "いまは出撃設定を変更できません。");
      }
      if (player.moderationKey && player.moderationKey !== identityKey) {
        throw new ApiError(403, "この出撃設定は変更できません。");
      }
      if (!generatedOffline && (!profileId || canonicalProfileId(player.profileId) !== canonicalProfileId(profileId))) {
        throw new ApiError(403, "この出撃設定は変更できません。");
      }
      const nextMapId = normalizeMapId(body.mapId);
      const mapChanged = nextMapId !== normalizeMapId(room.settings.mapId);
      if (mapChanged && room.matchmaking?.status !== "offline") {
        throw new ApiError(409, "オンラインで組まれた試合ではステージを変更できません。");
      }
      const nextName = renameSelectingPlayerName(body.name, selectionProfileId, legacyPlayerProfileId(body.clientId));
      player.name = nextName;
      if (generatedOffline && selectionProfileId) player.profileId = selectionProfileId;
      player.skinId = cleanSkinId(body.skinId);
      if (mapChanged) {
        room.settings.mapId = nextMapId;
        relocateSelectingPlayersForMap(room);
        if (preparing) rebuildPreparationMapState(room);
      }
      touch(room);
      payload = {
        ...serialize(room, player),
        profile: { name: nextName, locked: false },
        selectionSettings: { mapChanged, mapId: room.settings.mapId }
      };
      break;
    }

    case "/api/skin": {
      const { room, player } = requireRoomPlayer(body);
      player.skinId = cleanSkinId(body.skinId);
      touch(room);
      payload = serialize(room, player);
      break;
    }

    case "/api/state": {
      const { room, player } = requireRoomPlayer(body);
      payload = serialize(room, player);
      break;
    }

    case "/api/leave": {
      const room = rooms.get(String(body.roomId || ""));
      const player = room?.players.get(String(body.playerId || ""));
      if (!room || !player) {
        payload = {
          ok: true,
          left: true,
          alreadyGone: true,
          roomId: String(body.roomId || ""),
          roomDeleted: !room,
          newHostId: room?.hostId || null,
          midJoinOpen: Boolean(room?.midJoinOpen)
        };
        break;
      }
      const result = leaveRoom(room, player);
      payload = {
        ok: true,
        left: true,
        roomId: room.id,
        roomDeleted: result.roomDeleted,
        newHostId: result.newHostId,
        midJoinOpen: result.midJoinOpen
      };
      break;
    }

    case "/api/operator": {
      const { room, player } = requireRoomPlayer(body);
      selectOperator(room, player, String(body.operatorId || ""), String(body.operatorSpecial || ""));
      payload = serialize(room, player);
      break;
    }

    case "/api/operator-reselect": {
      const { room, player } = requireRoomPlayer(body);
      if (body.localOffline !== true || room.matchmaking?.status !== "offline") {
        throw new ApiError(403, "オフライン対戦だけがオペレーターを選び直せます。");
      }
      if (room.soloMission || room.phase !== "playing") {
        throw new ApiError(409, "いまはオペレーター選択へ戻れません。");
      }
      const roles = new Map([...room.players.values()].map((entry) => [entry.id, entry.role]));
      startGame(room);
      for (const entry of room.players.values()) entry.role = roles.get(entry.id) || entry.role;
      payload = serialize(room, player);
      break;
    }

    case "/api/offline-team": {
      const { room, player } = requireRoomPlayer(body);
      const role = String(body.role || "");
      if (body.localOffline !== true || room.matchmaking?.status !== "offline") {
        throw new ApiError(403, "オフライン対戦だけが陣営を選択できます。");
      }
      if (room.phase !== "selecting" || !["defender", "attacker"].includes(role)) {
        throw new ApiError(409, "いまは陣営を選択できません。");
      }
      const bots = [...room.players.values()].filter((entry) => entry.isBot);
      const totalPlayers = room.players.size;
      const configuredAttackerCount = Math.max(1, Math.min(totalPlayers - 1, Math.floor(room.settings.attackerCount)));
      // A human attacker has no allied attacker Bots; a human defender keeps enemy attacker Bots.
      const botAttackerCount = role === "attacker" ? 0 : Math.max(0, Math.min(bots.length, configuredAttackerCount));
      player.role = role;
      const existingBotAttackers = bots.filter((entry) => entry.role === "attacker");
      const assignmentAlreadyMatches = existingBotAttackers.length === botAttackerCount;
      if (!assignmentAlreadyMatches) {
        const botAttackers = new Set(shuffle(bots).slice(0, botAttackerCount).map((entry) => entry.id));
        bots.forEach((entry) => { entry.role = botAttackers.has(entry.id) ? "attacker" : "defender"; });
      }
      const attackerCount = [...room.players.values()].filter((entry) => entry.role === "attacker").length;
      const defenderCount = [...room.players.values()].filter((entry) => entry.role === "defender").length;
      room.killRateAttackerTarget = Math.max(1, Math.ceil(defenderCount / Math.max(1, attackerCount)));
      touch(room);
      payload = serialize(room, player);
      break;
    }

    case "/api/force-end": {
      const { room, player } = requireRoomPlayer(body);
      forceEnd(room, player);
      payload = serialize(room, player);
      break;
    }

    case "/api/move": {
      const { room, player } = requireRoomPlayer(body);
      payload = processMovementInput(room, player, body);
      break;
    }

    case "/api/movement-acc": {
      const { room, player } = requireRoomPlayer(body);
      setMovementAccEnabled(room, player, body.enabled);
      payload = serialize(room, player);
      break;
    }

    case "/api/movement/resync": {
      const { room, player } = requireRoomPlayer(body);
      payload = resyncMovementSession(room, player, body);
      break;
    }

    case "/api/clairvoyance": {
      const { room, player } = requireRoomPlayer(body);
      setClairvoyanceActive(room, player, body.active);
      payload = serialize(room, player);
      break;
    }

    case "/api/barrier":
    case "/api/bust":
    case "/api/assassin-substitution": {
      const {room, player} = requireRoomPlayer(body);
      const action = pathname === "/api/barrier" ? activateDurableBarrier : pathname === "/api/bust" ? activateTimedBust : activateAssassinSubstitution;
      action(room, player, String(body.targetId || ""));
      payload = serialize(room, player); break;
    }
    case "/api/emp": {
      const { room, player } = requireRoomPlayer(body);
      activateEmp(room, player, body.phase);
      payload = serialize(room, player);
      break;
    }

    case "/api/task": {
      const { room, player } = requireRoomPlayer(body);
      completeTask(room, player, String(body.taskId || "nearest"));
      payload = serialize(room, player);
      break;
    }

    case "/api/ninjutsu": {
      const { room, player } = requireRoomPlayer(body);
      startNinjutsu(room, player, String(body.targetId || ""));
      payload = serialize(room, player);
      break;
    }

    case "/api/kill": {
      throw new ApiError(410, "通常キルは廃止されました。忍殺を使用してください。");
    }

    case "/api/shoot": {
      const { room, player } = requireRoomPlayer(body);
      shootGunner(room, player, body.dx, body.dy, String(body.action || "start"), body.holdMs, String(body.chargeId || ""));
      payload = serialize(room, player);
      break;
    }

    case "/api/enhance-charge": {
      const { room, player } = requireRoomPlayer(body);
      if (!body.active && body.finalize) {
        finalizeEnhanceChargeState(room, player, body.holdMs, String(body.chargeId || ""));
      } else {
        setEnhanceChargeState(room, player, Boolean(body.active), String(body.kind || ""), String(body.itemId || ""));
      }
      payload = serialize(room, player);
      break;
    }

    case "/api/ability-hold": {
      const { room, player } = requireRoomPlayer(body);
      if (String(body.phase || "start") === "cancel") {
        const cancelled = cancelAbilityHold(room, player, String(body.holdId || ""), String(body.actionPath || ""));
        payload = serialize(room, player);
        payload.abilityHoldCancelled = cancelled;
        break;
      }
      const hold = startAbilityHold(room, player, String(body.actionPath || ""), String(body.holdId || ""), body.action);
      payload = serialize(room, player);
      payload.abilityHold = { id: hold.id, actionPath: hold.actionPath, startedAt: hold.startedAt };
      break;
    }

    case "/api/gunner-weapon": {
      const { room, player } = requireRoomPlayer(body);
      switchGunnerWeapon(room, player, String(body.weaponId || ""), Number(body.direction) || 1);
      payload = serialize(room, player);
      break;
    }

    case "/api/gunner-reload": {
      const { room, player } = requireRoomPlayer(body);
      reloadGunner(room, player);
      payload = serialize(room, player);
      break;
    }

    case "/api/gunner-heavy": {
      const { room, player } = requireRoomPlayer(body);
      useHeavyWeapon(room, player, body.weapon, body.holdMs, String(body.chargeId || ""));
      payload = serialize(room, player);
      break;
    }

    case "/api/dodge": {
      const { room, player } = requireRoomPlayer(body);
      activateDodge(room, player);
      payload = serialize(room, player);
      break;
    }

    case "/api/fighter-slash": {
      const { room, player } = requireRoomPlayer(body);
      fighterSlash(room, player, String(body.targetId || ""), Boolean(body.perfectGuardIntent));
      payload = serialize(room, player);
      break;
    }

    case "/api/fighter-slash-release": {
      const { room, player } = requireRoomPlayer(body);
      releaseFighterSlashGuardInput(player);
      payload = serialize(room, player);
      break;
    }

    case "/api/limit-break": {
      const { room, player } = requireRoomPlayer(body);
      toggleLimitBreak(room, player);
      payload = serialize(room, player);
      break;
    }

    case "/api/hacker-root": {
      const { room, player } = requireRoomPlayer(body);
      toggleHackerRoot(room, player);
      payload = serialize(room, player);
      break;
    }

    case "/api/renki": {
      const { room, player } = requireRoomPlayer(body);
      const outcome = practiceRenki(room, player, { holdId: String(body.renkiHoldId || body.abilityHoldId || "") });
      payload = serialize(room, player);
      payload.renkiBatch = Boolean(outcome?.batch);
      payload.duplicate = Boolean(outcome?.duplicate);
      break;
    }

    case "/api/donate": {
      const { room, player } = requireRoomPlayer(body);
      donateCredits(room, player);
      payload = serialize(room, player);
      break;
    }

    case "/api/teleport": {
      const { room, player } = requireRoomPlayer(body);
      const outcome = executeAbilityHoldAction(room, player, body, "/api/teleport", () => (
        teleportPlayer(room, player, body.x, body.y, String(body.targetId || ""), String(body.mode || "move"))
      ));
      payload = serialize(room, player);
      attachAbilityBatchPayload(payload, outcome);
      break;
    }

    case "/api/gravity-time": {
      const { room, player } = requireRoomPlayer(body);
      const outcome = executeAbilityHoldAction(room, player, body, "/api/gravity-time", () => (
        toggleGravityTime(room, player, String(body.mode || "accelerate"), String(body.targetId || player.id))
      ));
      payload = serialize(room, player);
      attachAbilityBatchPayload(payload, outcome);
      break;
    }

    case "/api/gravity-time-keeper": {
      const { room, player } = requireRoomPlayer(body);
      executeSingleTimeKeeperAction(room, player, body, () => useTimeKeeper(room, player));
      payload = serialize(room, player);
      break;
    }

    case "/api/gravity-storm": {
      const { room, player } = requireRoomPlayer(body);
      const outcome = executeAbilityHoldAction(room, player, body, "/api/gravity-storm", () => (
        useGravityStorm(room, player, String(body.targetId || player.id))
      ));
      payload = serialize(room, player);
      attachAbilityBatchPayload(payload, outcome);
      break;
    }

    case "/api/instant-warp": {
      const { room, player } = requireRoomPlayer(body);
      useTeleportMapScroll(room, player, body.x, body.y);
      payload = serialize(room, player);
      break;
    }

    case "/api/clairvoyance-teleport": {
      const { room, player } = requireRoomPlayer(body);
      teleportFromClairvoyance(room, player, body.x, body.y);
      payload = serialize(room, player);
      break;
    }

    case "/api/purchase": {
      const { room, player } = requireRoomPlayer(body);
      if (body.bulk === true) purchaseDrinkBulk(room, player, String(body.itemId || ""), String(body.transactionId || body.purchaseId || ""));
      else purchaseDrink(room, player, String(body.itemId || ""));
      payload = serialize(room, player);
      break;
    }

    case "/api/shop/purchase": {
      const { room, player } = requireRoomPlayer(body);
      const result = purchaseShopAbility(room, player, String(body.abilityId || ""), String(body.transactionId || body.purchaseId || ""));
      payload = serialize(room, player);
      payload.shopPurchase = result;
      break;
    }

    case "/api/shop/ability": {
      const { room, player } = requireRoomPlayer(body);
      const result = useShopAbility(room, player, String(body.abilityId || ""), body);
      payload = serialize(room, player);
      payload.shopAbilityResult = result ?? true;
      break;
    }

    case "/api/object": {
      const { room, player } = requireRoomPlayer(body);
      useMapObject(room, player, String(body.objectId || ""));
      payload = serialize(room, player);
      break;
    }

    case "/api/fire-jutsu": {
      const { room, player } = requireRoomPlayer(body);
      useFireJutsu(room, player, body.holdMs, String(body.chargeId || ""));
      payload = serialize(room, player);
      break;
    }

    case "/api/quantum-control": {
      const { room, player } = requireRoomPlayer(body);
      const outcome = executeAbilityHoldAction(room, player, body, "/api/quantum-control", () => useQuantumControl(room, player, body.mode));
      payload = serialize(room, player);
      payload.actionApplied = outcome.duplicate ? false : (outcome.batch ? outcome.count > 0 : outcome.value);
      attachAbilityBatchPayload(payload, outcome);
      break;
    }

    case "/api/item-use": {
      const { room, player } = requireRoomPlayer(body);
      useOwnedItem(room, player, String(body.itemId || ""), body.holdMs, String(body.chargeId || ""));
      payload = serialize(room, player);
      break;
    }

    case "/api/item-throw": {
      const { room, player } = requireRoomPlayer(body);
      throwOwnedItem(room, player, String(body.itemId || ""), body.holdMs, body.targetX, body.targetY, String(body.chargeId || ""));
      payload = serialize(room, player);
      break;
    }

    case "/api/item-pickup": {
      const { room, player } = requireRoomPlayer(body);
      pickupGroundItem(room, player, String(body.groundItemId || ""));
      payload = serialize(room, player);
      break;
    }

    case "/api/transfer": {
      const { room, player } = requireRoomPlayer(body);
      transferOwnedResource(room, player, body.targetId, body.itemId, body.amount, Boolean(body.credits));
      payload = serialize(room, player);
      break;
    }

    case "/api/flora-heal": {
      const { room, player } = requireRoomPlayer(body);
      const outcome = executeAbilityHoldAction(room, player, body, "/api/flora-heal", () => (
        useFloraAbility(room, player, String(body.mode || "heal"), body)
      ));
      payload = serialize(room, player);
      attachAbilityBatchPayload(payload, outcome);
      break;
    }

    case "/api/alchemy": {
      const { room, player } = requireRoomPlayer(body);
      useAlchemy(room, player, body.conversion, body.targetId);
      payload = serialize(room, player);
      break;
    }

    case "/api/alchemist-invention": {
      const { room, player } = requireRoomPlayer(body);
      useAlchemistInvention(room, player, body.invention, body.holdMs, String(body.chargeId || ""));
      payload = serialize(room, player);
      break;
    }

    case "/api/borrowed-ability": {
      const { room, player } = requireRoomPlayer(body);
      const timeKeeper = String(body.ability || "") === "gravity" && String(body.mode || "") === "time-keeper";
      const outcome = timeKeeper
        ? { value: executeSingleTimeKeeperAction(room, player, body, () => useBorrowedAbility(room, player, body.ability, body)), held: false, batch: false, duplicate: false, count: 1, spentMana: 0 }
        : executeAbilityHoldAction(room, player, body, "/api/borrowed-ability", () => (
          useBorrowedAbility(room, player, body.ability, body)
        ));
      payload = serialize(room, player);
      if (outcome.duplicate) payload.actionApplied = false;
      else if (outcome.batch) payload.actionApplied = outcome.count > 0;
      else if (typeof outcome.value === "boolean") payload.actionApplied = outcome.value;
      attachAbilityBatchPayload(payload, outcome);
      break;
    }

    case "/api/report": {
      const { room, player } = requireRoomPlayer(body);
      reportBody(room, player);
      payload = serialize(room, player);
      break;
    }

    case "/api/emergency": {
      const { room, player } = requireRoomPlayer(body);
      callEmergency(room, player);
      payload = serialize(room, player);
      break;
    }

    case "/api/vote": {
      const { room, player } = requireRoomPlayer(body);
      ensureConscious(player);
      vote(room, player, String(body.targetId || "skip"));
      payload = serialize(room, player);
      break;
    }

    case "/api/luminous": {
      const { room, player } = requireRoomPlayer(body);
      useLuminous(room, player, String(body.targetId || ""));
      payload = serialize(room, player);
      break;
    }

    case "/api/chat": {
      const { room, player } = requireRoomPlayer(body);
      ensureConscious(player);
      if (room.phase !== "meeting") throw new ApiError(400, "チャットは会議中のみ使えます。");
      if (player.chatMuted) throw new ApiError(403, "復活後はチャットできません。");
      if (!player.alive || player.ejected) throw new ApiError(403, "死亡または追放後はチャットできません。");
      if (isBlockedComment(body.message)) {
        const record = registerModerationStrike(player.moderationKey || identityKey);
        leaveRoom(room, player);
        payload = {
          ok: true,
          moderated: true,
          left: true,
          strikes: record.strikes,
          banned: record.banned,
          error: record.banned
            ? "禁止コメントが5回に達したため永久停止されました。"
            : `禁止コメントを検出したため退出しました（${record.strikes}/5）。`
        };
      } else {
        pushChat(room, player, body.message);
        payload = serialize(room, player);
      }
      break;
    }

    case "/api/sabotage": {
      throw new ApiError(410, "サボタージュは廃止されました。");
    }

    case "/api/repair": {
      throw new ApiError(410, "修理はサボタージュとともに廃止されました。");
    }

    case "/api/utility": {
      const { room, player } = requireRoomPlayer(body);
      const utility = makeUtility(room, player, String(body.type || "admin"));
      room.utilityViews.set(player.id, utility);
      payload = serialize(room, player);
      break;
    }

    case "/api/reset": {
      throw new ApiError(410, "ロビーへの復帰機能は廃止されました。再マッチングしてください。");
      const { room, player } = requireRoomPlayer(body);
      if (room.hostId !== player.id) throw new ApiError(403, "ホストだけがオンラインロビーへ戻せます。");
      if (room.soloMission) throw new ApiError(400, "ソロ訓練からオンラインロビーへ移動することはできません。");
      room.phase = "lobby";
      room.round = 0;
      room.bodies = [];
      room.hitEffects = [];
      room.magicEffects = [];
      room.hazardFields = [];
      room.thrownItems = [];
      room.groundItems = [];
      room.chat = [];
      room.events = [];
      room.sounds = [];
      room.meeting = null;
      room.battleStartedAt = 0;
      room.quantumEndgameAt = 0;
      room.preparationEndsAt = 0;
      room.operatorSelectEndsAt = 0;
      room.operatorTurnOrder = [];
      room.operatorTurnIndex = 0;
      room.winner = null;
      room.finishReason = "";
      setIdeaWinnerIds(room, []);
      room.pendingIdeaVictoryAt = 0;
      room.ideaVictoryArrivalAt = 0;
          room.activeEmps = [];
          room.doorLog = [];
      room.utilityViews.clear();
      for (const entry of room.players.values()) {
        entry.role = "unassigned";
        entry.midJoinAvailable = false;
        entry.special = null;
        entry.operatorId = "";
        entry.operatorReady = false;
        entry.alive = true;
        entry.ejected = false;
        entry.botMatchEliminatedById = "";
        entry.chatMuted = false;
        entry.taskList = [];
        entry.taskAutoReadyAt = 0;
        entry.taskPresenceTaskId = "";
        entry.taskPresenceSince = 0;
        entry.killsThisRound = 0;
        entry.totalKills = 0;
        entry.luminousUsed = false;
        entry.luminousActive = false;
        entry.lastLuminousResult = "";
        entry.lastLuminousResultAt = 0;
        entry.killReadyAt = 0;
        entry.killChainCount = 0;
        clearAttackState(entry);
        entry.lastAttackResult = "";
        entry.lastAttackResultAt = 0;
        entry.gunReadyAt = 0;
        entry.gunnerWeapon = DEFAULT_GUNNER_WEAPON;
        entry.gunnerAmmo = createGunnerAmmo();
        entry.gunFiring = false;
        entry.gunFiringWeapon = "";
        entry.gunFiringSince = 0;
        entry.gunnerBurstRoundsRemaining = 0;
        entry.gunnerBurstEnhanceLevel = 0;
        entry.gunnerBurstGbo = false;
        entry.gunnerBurstGboWeapon = "";
        entry.gunnerLastShotAt = 0;
        entry.gunnerReloadUntil = 0;
        entry.gunnerReloadWeapon = "";
        entry.unavailableGunnerWeapons = [];
        entry.dodgeReadyAt = 0;
        entry.dodgeActiveUntil = 0;
        entry.slashActiveUntil = 0;
        entry.slashPerfectUntil = 0;
        entry.slashPerfectReadyAt = 0;
        entry.slashDetachedGuardUntil = 0;
        entry.slashGuardInputReleased = true;
        entry.teleportReadyAt = 0;
        entry.limitBreakActive = false;
        entry.limitBreakEndsAt = 0;
        entry.limitBreakStacks = 0;
        entry.fighterEnergyCharge = 0;
        entry.fighterEnergyPeak = 0;
        entry.fighterEnergyChargeReadyAt = 0;
        entry.manaGpuCooldownCreditMs = 0;
        entry.empReadyAt = 0;
        entry.itemDisabledUntil = 0;
        entry.slowedUntil = 0;
        entry.taserSlowedUntil = 0;
        entry.shockSlowedUntil = 0;
        entry.quantumElectricSlowUntil = 0;
        entry.sleepingUntil = 0;
        entry.resting = false;
        entry.meditatingUntil = 0;
        entry.renkiTargetMana = null;
    entry.renkiCompletionKind = "";
        entry.unconsciousUntil = 0;
        entry.abilityDisabledUntil = 0;
        entry.overhealSpeedUntil = 0;
        entry.floraInvisibleUntil = 0;
        entry.hoverSprintUntil = 0;
        entry.hoverSprintReadyAt = 0;
        entry.killCamera = null;
        entry.gunnerSnipingActive = false;
        entry.gunnerAimTargetId = "";
        entry.timedAccelerationEffects = [];
        entry.particleCannonPerformanceMultiplier = 1;
        entry.lastMysteryResult = "";
        entry.lastMysteryResultAt = 0;
        entry.lastMysteryReveal = null;
        entry.movementMode = "idle";
        entry.movementAccEnabled = true;
        entry.bodyHits = 0;
        entry.overheal = 0;
        entry.maxHealth = 2;
        entry.credits = 0;
        entry.lastPassiveCreditAt = now();
        entry.mana = STARTING_MANA;
        entry.maxMana = DEFAULT_MAX_MANA;
        entry.mentalState = "理知";
        entry.rationalFreeAbilityReadyAt = 0;
        entry.gritCharges = 0;
        entry.standFirmBarrierUntil = 0;
        entry.reasonCharges = 0;
        entry.manaAutoProtectionNext = "reason";
        entry.iaiCharges = 0;
        entry.ideaProgressStartedAt = 0;
        entry.ideaProgressMs = 0;
        entry.ideaProgressUpdatedAt = 0;
        entry.ideaStage = 0;
        entry.ideaFirstAspect = "";
        entry.desireBias = "";
        entry.desireIdeaForfeited = false;
        entry.truthCharges = 0;
        entry.beautyCharges = 0;
        entry.goodActive = false;
        entry.ascensionStartedAt = 0;
        entry.ascensionUntil = 0;
        entry.objectCooldowns = {};
        entry.objectContactUsedIds = [];
        entry.objectLuckBonus = 0;
        entry.objectLuckUntil = 0;
        entry.donationLuckBonus = 0;
        entry.stamina = MAX_STAMINA;
        entry.maxStoredStamina = MAX_STORED_STAMINA;
        entry.staminaUpdatedAt = now();
        entry.speedMultiplier = 1;
        entry.dodgeDurationBonusMs = 0;
        entry.warpCharges = 0;
        entry.fireJutsuCharges = 0;
        entry.substitutionCharges = 0;
        entry.itemInventory = {};
        entry.poisonStatus = null;
        entry.burnStatus = null;
        entry.statusImmunityFeedbackAt = 0;
        entry.quantumMode = "nuclear-transmutation";
        entry.quantumElectricLastTargetId = "";
        entry.quantumElectricLastOutcome = "";
        entry.quantumElectricLastDamage = 0;
        entry.quantumElectricLastAt = 0;
        entry.emergenciesLeft = room.settings.emergencyLimit;
        entry.inVent = false;
        entry.ventId = "";
        entry.vx = 0;
        entry.vy = 0;
        entry.aimX = 0;
        entry.aimY = 1;
        entry.heardSoundAt = 0;
        entry.heardWaypointUntil = 0;
        entry.heardWaypointX = 0;
        entry.heardWaypointY = 0;
        entry.nextBotDefenseDecisionAt = now() + 1800 + Math.floor(Math.random() * 1800);
        entry.botDefensePlannedAt = 0;
        entry.botDefenseKind = "";
        entry.botDefenseTargetId = "";
        entry.botWitnessTargetId = "";
        entry.botWitnessUntil = 0;
        entry.botWitnessEvidenceKind = "";
        entry.botVisibleAttackMemories = [];
        entry.botVisibleThrowObservations = [];
        entry.botKillDecision = null;
        clearBotCombatPlan(entry);
        entry.movementSession = "";
        entry.movementSessionStartedAt = 0;
        entry.lastMovementSeq = -1;
        entry.lastMovementClock = 0;
        entry.lastMovementReceivedAt = 0;
        entry.lastMovementDx = 0;
        entry.lastMovementDy = 0;
        entry.lastMovementDash = false;
        entry.lastMovementSlow = false;
        entry.lastMoveAt = now();
      }
      pushEvent(room, "オンラインロビーに戻りました。");
      touch(room);
      payload = serialize(room, player);
      break;
    }

    default:
      throw new ApiError(404, "APIが見つかりません。");
  }

  finishEnhanceGesturePresentation(enhanceGesturePresentation, payload);
  sendJson(res, 200, payload);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function allowedCorsOrigin(origin) {
  if (!origin) return "";
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    const local = ["localhost", "127.0.0.1", "::1"].includes(host);
    if (local && ["http:", "https:"].includes(url.protocol)) return origin;
    if (url.protocol !== "https:") return "";
    if (
      host === "player13579.github.io" ||
      host === "plicy.net" ||
      host === "html5.plicy.net" ||
      host === "game.plicy.net" ||
      host.endsWith(".game.plicy.net")
    ) return origin;
  } catch {}
  return "";
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const rawPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const safePath = path.normalize(rawPath).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(PUBLIC_DIR, safePath);
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(fullPath);
    const baseHeaders = {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": ext === ".html" ? "no-store" : "public, max-age=60",
      "accept-ranges": "bytes"
    };
    const rangeMatch = typeof req.headers.range === "string"
      ? req.headers.range.match(/^bytes=(\d*)-(\d*)$/i)
      : null;

    if (req.headers.range && !rangeMatch) {
      res.writeHead(416, { ...baseHeaders, "content-range": `bytes */${stats.size}` });
      res.end();
      return;
    }

    if (rangeMatch) {
      const [, rawStart, rawEnd] = rangeMatch;
      let start;
      let end;
      if (!rawStart) {
        const suffixLength = Number(rawEnd);
        if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
          res.writeHead(416, { ...baseHeaders, "content-range": `bytes */${stats.size}` });
          res.end();
          return;
        }
        start = Math.max(0, stats.size - suffixLength);
        end = stats.size - 1;
      } else {
        start = Number(rawStart);
        end = rawEnd ? Math.min(Number(rawEnd), stats.size - 1) : stats.size - 1;
      }
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= stats.size || end < start) {
        res.writeHead(416, { ...baseHeaders, "content-range": `bytes */${stats.size}` });
        res.end();
        return;
      }
      const contentLength = end - start + 1;
      res.writeHead(206, {
        ...baseHeaders,
        "content-length": contentLength,
        "content-range": `bytes ${start}-${end}/${stats.size}`
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      fs.createReadStream(fullPath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, { ...baseHeaders, "content-length": stats.size });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(fullPath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const corsOrigin = allowedCorsOrigin(req.headers.origin);
    if (corsOrigin) {
      res.setHeader("access-control-allow-origin", corsOrigin);
      res.setHeader("vary", "Origin");
      res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
      res.setHeader("access-control-allow-headers", "Content-Type, X-DVA-Client-Release");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(corsOrigin ? 204 : 403);
      res.end();
      return;
    }
    if (new URL(req.url, `http://${req.headers.host}`).pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        service: "defenders-vs-attackers",
        apiVersion: 2,
        soloTraining: true,
        requiredClientRelease: ONLINE_CLIENT_RELEASE
      });
      return;
    }
    if (req.url.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    serveStatic(req, res);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    if (!(error instanceof ApiError)) console.error(error);
    sendJson(res, status, {
      ok: false,
      error: error.message || "Server error",
      ...(error?.requiredClientRelease ? { requiredClientRelease: error.requiredClientRelease } : {})
    });
  }
});

const realtimeServer = new WebSocketServer({ noServer: true, maxPayload: 4096 });
const realtimePeers = new Set();

function realtimeOriginAllowed(origin) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase());
    if (local && ["http:", "https:"].includes(url.protocol)) return true;
  } catch {
    return false;
  }
  return Boolean(allowedCorsOrigin(origin));
}

server.on("upgrade", (req, socket, head) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname !== "/ws" || !realtimeOriginAllowed(req.headers.origin)) {
      socket.destroy();
      return;
    }
    requireCompatibleOnlineClient(req, url.searchParams.get("clientRelease"));
    const room = getRoom(url.searchParams.get("roomId"));
    const player = room?.players.get(String(url.searchParams.get("playerId") || ""));
    if (!room || !player) {
      socket.destroy();
      return;
    }
    realtimeServer.handleUpgrade(req, socket, head, (websocket) => {
      realtimeServer.emit("connection", websocket, req, {
        roomId: room.id,
        playerId: player.id,
        performanceMode: url.searchParams.get("performanceMode") === "plicy" ? "plicy" : "standard"
      });
    });
  } catch {
    socket.destroy();
  }
});

realtimeServer.on("connection", (socket, _request, identity) => {
  const peer = {
    socket,
    roomId: identity.roomId,
    playerId: identity.playerId,
    stateIntervalMs: identity.performanceMode === "plicy" ? PLICY_REALTIME_STATE_INTERVAL_MS : REALTIME_STATE_INTERVAL_MS,
    lastStateSentAt: 0
  };
  realtimePeers.add(peer);
  socket.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (message.type !== "move") return;
    const room = getRoom(peer.roomId);
    const player = room?.players.get(peer.playerId);
    if (!room || !player) {
      socket.close(1008, "session-ended");
      return;
    }
    player.lastSeenAt = now();
    const movement = processMovementInput(room, player, message);
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "movement", data: movement }));
    }
  });
  socket.on("close", () => realtimePeers.delete(peer));
  socket.on("error", () => realtimePeers.delete(peer));
});

function pushRealtimeStates() {
  const timestamp = now();
  const peersByRoom = new Map();
  for (const peer of realtimePeers) {
    if (peer.socket.readyState !== WebSocket.OPEN) continue;
    const peers = peersByRoom.get(peer.roomId) || [];
    peers.push(peer);
    peersByRoom.set(peer.roomId, peers);
  }
  for (const [roomId, peers] of peersByRoom) {
    const room = getRoom(roomId);
    if (!room) {
      for (const peer of peers) peer.socket.close(1008, "room-ended");
      continue;
    }
    tickRoom(room);
    for (const peer of peers) {
      if (timestamp - peer.lastStateSentAt < peer.stateIntervalMs) continue;
      const player = room.players.get(peer.playerId);
      if (!player) {
        peer.socket.close(1008, "player-ended");
        continue;
      }
      try {
        peer.socket.send(JSON.stringify({ type: "state", data: serialize(room, player, { skipTick: true }) }));
        peer.lastStateSentAt = timestamp;
      } catch {
        peer.socket.close();
      }
    }
  }
}

function botTick() {
  purgeInstantMatchmakingRequests();
  const acceleratedPlayingRooms = [];
  for (const room of rooms.values()) {
    if (
      room.phase === "lobby" &&
      room.matchmaking?.status === "waiting" &&
      now() >= Number(room.matchmaking.expiresAt || 0)
    ) {
      room.matchmaking = { status: "offline", decision: "offline-fallback", instant: true };
      addDefaultOnlineBots(room);
      startGame(room);
      continue;
    }
    if (now() - room.updatedAt > ROOM_TTL_MS) {
      rooms.delete(room.id);
      continue;
    }
    tickRoom(room);
    if (room.phase === "meeting") {
      runMeetingBots(room);
    } else if (room.phase === "playing") {
      // Every room keeps its legacy one-owner pass. This is the baseline that
      // prevents a busy room from starving `/api/state` and other rooms.
      runPlayingBots(room);
      if (botPlannerSlotsForRoom(room) > 1) acceleratedPlayingRooms.push(room);
    }
  }

  // Allocate only nine additional planner owners globally. With one active
  // generated-offline spectator room this yields exactly ten slots (the
  // ordinary one plus nine); with several it round-robins the bounded surplus
  // so no room can turn a single 80ms callback into an unbounded planner loop.
  const extraSlots = BOT_ACCELERATED_PLANNER_EXTRA_SLOTS_PER_TICK;
  let granted = 0;
  let attempts = 0;
  const maxAttempts = acceleratedPlayingRooms.length * extraSlots;
  while (granted < extraSlots && attempts < maxAttempts && acceleratedPlayingRooms.length) {
    const room = acceleratedPlayingRooms[botAcceleratedPlannerRoomCursor % acceleratedPlayingRooms.length];
    botAcceleratedPlannerRoomCursor = (botAcceleratedPlannerRoomCursor + 1) % acceleratedPlayingRooms.length;
    attempts += 1;
    if (room.phase !== "playing" || botPlannerSlotsForRoom(room) <= 1) continue;
    runPlayingBots(room);
    granted += 1;
  }
}

function runMeetingBots(room) {
  if (!room.meeting) return;
  for (const bot of room.players.values()) {
    if (!bot.isBot || !bot.alive || bot.ejected) continue;
    const suspect = room.players.get(room.meeting.suspectId);
    const knownAttacker = botKnownAttackerEvidence(room, bot, now());
    if (
      bot.role === "defender" &&
      botIsEnemyOfSoleHuman(room, bot) &&
      !bot.luminousUsed &&
      suspect?.alive &&
      !suspect.ejected &&
      knownAttacker?.id === suspect.id
    ) {
      try {
        useLuminous(room, bot, suspect.id);
      } catch {}
      if (!room.meeting || room.phase !== "meeting") return;
    }
    if (!room.meeting.votes[bot.id]) {
      const livingHumanOpponent = botOpposesLivingHuman(room, bot)
        ? [...room.players.values()]
          .filter((player) => !player.isBot && player.alive && !player.ejected && player.role !== bot.role)
          .sort((a, b) => a.id.localeCompare(b.id))[0]
        : null;
      const evidenceTarget = bot.role === "defender" ? knownAttacker : null;
      room.meeting.votes[bot.id] = evidenceTarget?.id ||
        (bot.role === "attacker" ? livingHumanOpponent?.id : "") ||
        "skip";
    }
  }
  maybeEndMeeting(room);
}

function runBotStandFirmRetaliation(room, bot, timestamp = now()) {
  if (!botIsEnemyOfSoleHuman(room, bot)) return false;
  if (!bot.botRetaliationTargetId || Number(bot.botRetaliationUntil) <= timestamp) {
    bot.botRetaliationTargetId = "";
    bot.botRetaliationUntil = 0;
    return false;
  }
  const target = room.players.get(bot.botRetaliationTargetId);
  if (!botCanAttackTarget(room, bot, target, timestamp)) {
    bot.botRetaliationTargetId = "";
    bot.botRetaliationUntil = 0;
    return false;
  }
  if (distance(bot, target) > room.settings.killRange * 1.35) {
    moveBotToward(room, bot, target);
    return true;
  }
  if (bot.killReadyAt > timestamp) return true;
  try {
    rememberBotKillDecision(room, bot, target, {
      code: "stand-firm-visible-retaliation",
      actionLabel: "バリア反撃の頭部命中（キル）",
      reasons: ["バリアで耐えた直前の攻撃者が反撃射程内に入り、反撃クールタイムも完了"]
    }, timestamp);
    killPlayer(room, bot, target.id, {
      hitZone: "head",
      lockedAim: true,
      allowAnyKiller: true,
      targetRole: target.role,
      ignorePush: true,
      attackKind: "stand-firm-retaliation",
      attackLabel: "バリア反撃の頭部命中（キル）"
    });
    bot.botRetaliationTargetId = "";
    bot.botRetaliationUntil = 0;
  } catch {}
  return true;
}

function runBotBodyReport(room, bot) {
  if (!botIsEnemyOfSoleHuman(room, bot) || !bot.alive || bot.ejected || bot.inVent || room.phase !== "playing") return false;
  const reportRange = getMap(room).reportRange;
  const body = [...(room.bodies || [])].sort((a, b) => distance(bot, a) - distance(bot, b))[0];
  if (!body) return false;
  const bodyDistance = distance(bot, body);
  if (bodyDistance <= BOT_BODY_NOTICE_RANGE && botCanDirectlyObservePosition(room, bot, body)) {
    const suspect = promoteBotVisibleAttackBodyChain(room, bot, body, now());
    // Keep the body unreported for this tick so the newly evidence-backed
    // suspect can enter the normal maximum-strength payoff planner.
    if (suspect) return false;
  }
  if (bodyDistance > reportRange) {
    if (bodyDistance > BOT_BODY_NOTICE_RANGE) return false;
    const dx = body.x - bot.x;
    const dy = body.y - bot.y;
    const length = Math.hypot(dx, dy) || 1;
    if (!clearShotPath(room, bot, body, dx / length, dy / length)) return false;
    moveBotToward(room, bot, body);
    return true;
  }
  try {
    reportBody(room, bot);
    return true;
  } catch {
    return false;
  }
}

function teleportBotToward(room, bot, target) {
  if (!target || bot.special !== "teleport" || bot.teleportReadyAt > now() || distance(bot, target) < 650) {
    return false;
  }
  try {
    teleportPlayer(room, bot, target.x, target.y);
    return true;
  } catch {
    return false;
  }
}

function heardMovementWaypoint(room, bot, timestamp = now()) {
  for (let index = room.sounds.length - 1; index >= 0; index -= 1) {
    const sound = room.sounds[index];
    if (sound.at <= bot.heardSoundAt || timestamp - sound.at > BOT_HEARING_MEMORY_MS) break;
    if (!["walk", "dash"].includes(sound.type) || sound.sourceKind !== "player") continue;
    if (distance(bot, sound) > Math.max(1, Number(sound.maxDistance) || 0)) continue;
    bot.heardSoundAt = sound.at;
    bot.heardWaypointUntil = sound.at + BOT_HEARING_MEMORY_MS;
    bot.heardWaypointX = sound.x;
    bot.heardWaypointY = sound.y;
    bot.navPath = [];
    break;
  }

  if (Number(bot.heardWaypointUntil) <= timestamp) {
    bot.heardWaypointUntil = 0;
    return null;
  }
  return {
    x: Number(bot.heardWaypointX) || 0,
    y: Number(bot.heardWaypointY) || 0,
    observedAt: Number(bot.heardSoundAt) || 0
  };
}

function botHasHumanOpponent(room, bot) {
  if (botSharesTeamWithHuman(room, bot)) return false;
  if (botOpposesLivingHuman(room, bot)) return true;
  // In a sole-human Bot match, death/ejection turns that human into a spectator;
  // it must not silently downgrade the opposing Bots while their match continues.
  const human = soleHumanBotMatchPlayer(room);
  return Boolean(bot?.isBot && !room?.soloMission && human && bot.role !== human.role);
}

function stableBotHash(value) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function activeBotClaimCount(room, bot, targetId, targetField, untilField, timestamp = now()) {
  return [...room.players.values()].filter((other) => (
    other.isBot &&
    other.id !== bot.id &&
    other.role === bot.role &&
    other.alive &&
    !other.ejected &&
    String(other[targetField] || "") === String(targetId || "") &&
    Number(other[untilField]) > timestamp
  )).length;
}

function botTargetAffinity(bot, target, cycle = 0) {
  return stableBotHash(`${bot?.id || "bot"}:${target?.id || "target"}:${cycle}`);
}

function clearBotClairvoyanceContact(bot) {
  bot.botClairvoyanceUntil = 0;
  bot.botClairvoyanceObservedUntil = 0;
  bot.botClairvoyanceTargetId = "";
  bot.botClairvoyanceTargetX = 0;
  bot.botClairvoyanceTargetY = 0;
  bot.botClairvoyanceKillWitnessSnapshot = null;
}

function botClairvoyanceContact(room, bot, timestamp = now()) {
  const hadTarget = Boolean(bot?.botClairvoyanceTargetId);
  const target = room.players.get(String(bot?.botClairvoyanceTargetId || ""));
  if (!(bot.role === "defender" ? botDefenderScoutCandidate(bot, target, timestamp) : botCanAttackTarget(room, bot, target, timestamp))) {
    clearBotClairvoyanceContact(bot);
    if (hadTarget && bot?.role === "attacker") {
      const scheduled = Number(bot.nextBotClairvoyanceAt) || Infinity;
      bot.nextBotClairvoyanceAt = Math.min(scheduled, timestamp + BOT_TICK_MS);
    }
    return null;
  }
  if (bot.clairvoyanceActive && Number(bot.botClairvoyanceUntil) > timestamp) {
    bot.botClairvoyanceTargetX = target.x;
    bot.botClairvoyanceTargetY = target.y;
    bot.botClairvoyanceObservedUntil = Math.max(
      Number(bot.botClairvoyanceObservedUntil) || 0,
      timestamp + BOT_CLAIRVOYANCE_MEMORY_MS
    );
    return target;
  }
  if (Number(bot.botClairvoyanceObservedUntil) <= timestamp) {
    clearBotClairvoyanceContact(bot);
    return null;
  }
  return {
    ...target,
    x: Number(bot.botClairvoyanceTargetX) || target.x,
    y: Number(bot.botClairvoyanceTargetY) || target.y
  };
}

function runBotClairvoyanceSearch(room, bot, timestamp = now()) {
  const maximumStrength = botHasHumanOpponent(room, bot);
  if (!maximumStrength || !bot.alive || bot.ejected || bot.inVent) {
    if (bot.clairvoyanceActive) setClairvoyanceActive(room, bot, false);
    clearBotClairvoyanceContact(bot);
    return null;
  }

  const blockedUntil = actionBlockedUntil(bot);
  if (blockedUntil > timestamp) {
    // A maximum-strength bot still obeys the same action-unavailable window
    // as a human. Cooldowns, Natural Recovery and plan time keep advancing,
    // but no rejected Clairvoyance activation is attempted each bot tick.
    if (bot.clairvoyanceActive) setClairvoyanceActive(room, bot, false);
    bot.nextBotClairvoyanceAt = Math.max(Number(bot.nextBotClairvoyanceAt) || 0, blockedUntil);
    return null;
  }

  if (bot.clairvoyanceActive) {
    const contact = botClairvoyanceContact(room, bot, timestamp);
    if (Number(bot.botClairvoyanceUntil) > timestamp && Number(bot.mana) > 0) return contact;
    setClairvoyanceActive(room, bot, false);
  }

  const remembered = botClairvoyanceContact(room, bot, timestamp);
  if (remembered) return remembered;
  if (Number(bot.nextBotClairvoyanceAt) > timestamp) return null;

  const minimumMana = CLAIRVOYANCE_MANA_DRAIN_PER_SECOND * BOT_CLAIRVOYANCE_DURATION_MS / 1000 +
    (bot.role === "defender" ? HEART_TELEPORT_MANA_COST : 0);
  if (Number(bot.mana) + 1e-9 < minimumMana) {
    bot.nextBotClairvoyanceAt = timestamp + 3000;
    return null;
  }
  const observableCandidates = [...room.players.values()].filter((target) => (
    bot.role === "defender" ? botDefenderScoutCandidate(bot, target, timestamp) : botCanAttackTarget(room, bot, target, timestamp)
  ));
  if (!observableCandidates.length) {
    bot.nextBotClairvoyanceAt = timestamp + 3000;
    return null;
  }
  const target = observableCandidates.sort((a, b) => {
    const claimsA = activeBotClaimCount(room, bot, a.id, "botClairvoyanceTargetId", "botClairvoyanceObservedUntil", timestamp);
    const claimsB = activeBotClaimCount(room, bot, b.id, "botClairvoyanceTargetId", "botClairvoyanceObservedUntil", timestamp);
    const scoutCycle = Math.floor(timestamp / Math.max(1, BOT_CLAIRVOYANCE_INTERVAL_MIN_MS));
    if (bot.role === "attacker" && a.role === "defender" && b.role === "defender") {
      return defenderIdeaVisibleThreatStage(b) - defenderIdeaVisibleThreatStage(a) ||
        claimsA - claimsB ||
        botTargetAffinity(bot, a, scoutCycle) - botTargetAffinity(bot, b, scoutCycle) ||
        a.id.localeCompare(b.id);
    }
    return claimsA - claimsB ||
      botTargetAffinity(bot, a, scoutCycle) - botTargetAffinity(bot, b, scoutCycle) ||
      a.id.localeCompare(b.id);
  })[0];
  bot.botClairvoyanceTargetId = target.id;
  bot.botClairvoyanceTargetX = target.x;
  bot.botClairvoyanceTargetY = target.y;
  bot.botClairvoyanceUntil = timestamp + BOT_CLAIRVOYANCE_DURATION_MS;
  bot.botClairvoyanceObservedUntil = bot.botClairvoyanceUntil + BOT_CLAIRVOYANCE_MEMORY_MS;
  const intervalMinimum = bot.role === "attacker"
    ? BOT_ATTACKER_CLAIRVOYANCE_INTERVAL_MIN_MS
    : BOT_CLAIRVOYANCE_INTERVAL_MIN_MS;
  const intervalJitterRange = bot.role === "attacker"
    ? BOT_ATTACKER_CLAIRVOYANCE_INTERVAL_JITTER_MS
    : BOT_CLAIRVOYANCE_INTERVAL_JITTER_MS;
  const intervalJitter = intervalJitterRange > 0
    ? stableBotHash(`${bot.id}:${target.id}:${Math.floor(timestamp / BOT_CLAIRVOYANCE_DURATION_MS)}`) % intervalJitterRange
    : 0;
  bot.nextBotClairvoyanceAt = bot.botClairvoyanceUntil + intervalMinimum + intervalJitter;
  setClairvoyanceActive(room, bot, true);
  pushEvent(room, `${bot.name} が千里眼で周囲の行動を観測しました。`);
  return target;
}

function attackerBotKillUrgencyState(room, bot, timestamp = now()) {
  if (
    room?.phase !== "playing" ||
    !bot?.isBot ||
    bot.role !== "attacker" ||
    !bot.alive ||
    bot.ejected
  ) return { level: "none", ideaThreatStage: 0, urgent: false, critical: false };
  const ideaThreatStage = alivePlayers(room, "defender").reduce(
    (maximum, defender) => Math.max(maximum, defenderIdeaVisibleThreatStage(defender)),
    0
  );
  const critical = ideaThreatStage >= 3;
  const urgent = critical || ideaThreatStage >= 2;
  return {
    level: critical ? "critical" : urgent ? "urgent" : "comfortable",
    ideaThreatStage,
    urgent,
    critical
  };
}

function defenderIdeaVisibleThreatStage(defender) {
  if (!defender?.alive || defender.ejected || defender.role !== "defender") return 0;
  // ideaStage/goodActive/ascension are serialized to every ordinary player and
  // have field ATEs. Exact ideaProgressMs, resources and thresholds are self-only
  // and must never be read by a bot for target selection.
  return Math.max(
    0,
    Math.min(4, Number(defender.ideaStage) || 0),
    defender.goodActive ? 3 : 0,
    Number(defender.ascensionUntil) > 0 ? 4 : 0
  );
}

function botKillOpportunityProfile(room, bot, target) {
  if (!botCanAttackTarget(room, bot, target) || target.role !== "defender") {
    return { witnesses: [], thirdParties: [], witnessCount: Infinity, thirdPartyCount: Infinity, isolated: false, hidden: false };
  }
  const thirdParties = [...room.players.values()].filter((candidate) => (
    candidate.id !== bot.id &&
    candidate.id !== target.id &&
    candidate.alive &&
    !candidate.ejected &&
    !candidate.inVent &&
    botCanDirectlyObservePlayer(room, bot, candidate) &&
    (
      distance(candidate, target) <= BOT_ATTACKER_ISOLATION_RANGE ||
      distance(candidate, bot) <= BOT_ATTACKER_ISOLATION_RANGE
    )
  ));
  const witnesses = thirdParties.filter((candidate) => {
    const sees = (subject) => {
      if (distance(candidate, subject) > BOT_KILL_WITNESS_RANGE) return false;
      const dx = subject.x - candidate.x;
      const dy = subject.y - candidate.y;
      const length = Math.hypot(dx, dy) || 1;
      return clearShotPath(room, candidate, subject, dx / length, dy / length);
    };
    return sees(bot) || sees(target);
  });
  return {
    witnesses,
    thirdParties,
    witnessCount: witnesses.length,
    thirdPartyCount: thirdParties.length,
    isolated: thirdParties.length === 0,
    hidden: witnesses.length === 0
  };
}

function compareAttackerDefenderPriority(room, bot, a, b, timestamp = now(), claimsA = 0, claimsB = 0) {
  const ideaA = defenderIdeaVisibleThreatStage(a);
  const ideaB = defenderIdeaVisibleThreatStage(b);
  const opportunityA = botKillOpportunityProfile(room, bot, a);
  const opportunityB = botKillOpportunityProfile(room, bot, b);
  const immediateA = botHasImmediateLethalOpportunity(room, bot, a, timestamp) ? 1 : 0;
  const immediateB = botHasImmediateLethalOpportunity(room, bot, b, timestamp) ? 1 : 0;
  return ideaB - ideaA ||
    immediateB - immediateA ||
    claimsA - claimsB ||
    opportunityA.witnessCount - opportunityB.witnessCount ||
    opportunityA.thirdPartyCount - opportunityB.thirdPartyCount ||
    distance(bot, a) - distance(bot, b) ||
    botTargetAffinity(bot, a, Math.floor(timestamp / 12_000)) - botTargetAffinity(bot, b, Math.floor(timestamp / 12_000)) ||
    a.id.localeCompare(b.id);
}

function botCanDirectlyObservePosition(room, bot, target, maximumRange = BOT_BODY_NOTICE_RANGE) {
  if (!bot?.alive || bot.ejected || bot.inVent || !Number.isFinite(Number(target?.x)) || !Number.isFinite(Number(target?.y))) return false;
  const targetDistance = distance(bot, target);
  if (targetDistance > Math.max(1, Number(maximumRange) || BOT_BODY_NOTICE_RANGE)) return false;
  const dx = Number(target.x) - Number(bot.x);
  const dy = Number(target.y) - Number(bot.y);
  const length = Math.hypot(dx, dy) || 1;
  return clearShotPath(room, bot, target, dx / length, dy / length);
}

function botCanDirectlyObservePlayer(room, bot, target) {
  if (!target?.alive || target.ejected || target.inVent || floraInvisibleActive(target) || target.id === bot?.id) return false;
  return botCanDirectlyObservePosition(room, bot, target);
}

function visibleDefenderCandidates(room, bot, timestamp = now()) {
  return alivePlayers(room, "defender").filter((target) => (
    botCanAttackTarget(room, bot, target, timestamp) && botCanDirectlyObservePlayer(room, bot, target)
  )).sort((a, b) => {
    const claimsA = activeBotClaimCount(room, bot, a.id, "botTarget", "botTargetUntil", timestamp);
    const claimsB = activeBotClaimCount(room, bot, b.id, "botTarget", "botTargetUntil", timestamp);
    return compareAttackerDefenderPriority(room, bot, a, b, timestamp, claimsA, claimsB);
  });
}

function visibleDefenderTarget(room, bot, timestamp = now()) {
  return visibleDefenderCandidates(room, bot, timestamp)[0] || null;
}

function preferredDefenderTarget(room, bot, timestamp = now()) {
  const pendingTarget = room.players.get(String(bot.attackTargetId || ""));
  if (pendingTarget?.role === "defender" && botCanAttackTarget(room, bot, pendingTarget, timestamp)) return pendingTarget;
  const scouted = botClairvoyanceContact(room, bot, timestamp);
  if (scouted?.role === "defender" && botCanAttackTarget(room, bot, scouted, timestamp)) {
    bot.botTarget = scouted.id;
    bot.botTargetUntil = Math.max(timestamp + 2000, Number(bot.botClairvoyanceObservedUntil) || 0);
    return scouted;
  }
  const visible = visibleDefenderTarget(room, bot, timestamp);
  if (visible) {
    bot.botTarget = visible.id;
    bot.botTargetUntil = timestamp + BOT_HEARING_MEMORY_MS;
    return visible;
  }
  bot.botTarget = "";
  bot.botTargetUntil = 0;
  return null;
}

function defenderBotOwnsPursuitSlot(room, bot, target, timestamp = now()) {
  if (!bot?.isBot || bot.role !== "defender" || !target) return false;
  const eligible = [...room.players.values()].filter((candidate) => {
    if (!candidate.isBot || candidate.role !== "defender" || !candidate.alive || candidate.ejected || candidate.inVent) return false;
    return botKnownAttackerEvidence(room, candidate, timestamp)?.id === target.id;
  }).sort((a, b) => {
    const distanceBandA = Math.floor(distance(a, target) / 160);
    const distanceBandB = Math.floor(distance(b, target) / 160);
    return distanceBandA - distanceBandB ||
      botTargetAffinity(a, target, 0) - botTargetAffinity(b, target, 0) ||
      distance(a, target) - distance(b, target) ||
      a.id.localeCompare(b.id);
  });
  return eligible[0]?.id === bot.id;
}

function clearBotAttackerDeception(bot) {
  bot.botDeceptionPhase = "";
  bot.botDeceptionUntil = 0;
  bot.botDeceptionTargetId = "";
  bot.botDeceptionStationId = "";
  bot.botDeceptionPresenceSince = 0;
}

function botHasImmediateLethalOpportunity(room, bot, target, timestamp = now()) {
  if (!botCanAttackTarget(room, bot, target, timestamp) || target.role !== "defender") return false;
  const targetDistance = distance(bot, target);
  if (bot.attackResolveAt > timestamp) return true;
  if (bot.killReadyAt <= timestamp && targetDistance <= Math.max(72, room.settings.killRange * 0.58)) return true;
  if (bot.special !== "gunner" || bot.gunnerReloadUntil > timestamp || bot.gunReadyAt > timestamp) return false;
  const loadedWeapon = gunnerWeaponFor(bot);
  if (!gunnerWeaponAvailable(bot, loadedWeapon.id) ||
      (Number(bot.gunnerAmmo?.[loadedWeapon.id]) || 0) < loadedWeapon.ammoPerShot ||
      targetDistance > loadedWeapon.range) return false;
  const dx = target.x - bot.x;
  const dy = target.y - bot.y;
  const length = Math.hypot(dx, dy) || 1;
  if (!clearShotPath(room, bot, target, dx / length, dy / length)) return false;
  const deterministicBodyDamage = gunnerDamageAtDistance(loadedWeapon, targetDistance);
  return Math.max(0, Number(target.bodyHits) || 0) + deterministicBodyDamage >= 2;
}

function attackerFakeTaskStation(room, bot, map, actualTarget, timestamp = now()) {
  const cycle = Math.max(0, Number(bot.botDeceptionCycle) || 0);
  return (map.stations || [])
    .filter((station) => station.type === "task" && isWalkable(room, station.x, station.y, map.playerRadius))
    .sort((a, b) => {
      const claimsA = [...room.players.values()].filter((other) => (
        other.isBot && other.id !== bot.id && other.role === "attacker" && other.alive && !other.ejected &&
        other.botDeceptionPhase === "fake-task" && other.botDeceptionStationId === a.id && Number(other.botDeceptionUntil) > timestamp
      )).length;
      const claimsB = [...room.players.values()].filter((other) => (
        other.isBot && other.id !== bot.id && other.role === "attacker" && other.alive && !other.ejected &&
        other.botDeceptionPhase === "fake-task" && other.botDeceptionStationId === b.id && Number(other.botDeceptionUntil) > timestamp
      )).length;
      const actualSeparationA = actualTarget ? distance(a, actualTarget) : 0;
      const actualSeparationB = actualTarget ? distance(b, actualTarget) : 0;
      return claimsA - claimsB ||
        actualSeparationB - actualSeparationA ||
        botTargetAffinity(bot, a, cycle) - botTargetAffinity(bot, b, cycle) ||
        distance(bot, a) - distance(bot, b) ||
        a.id.localeCompare(b.id);
    })[0] || null;
}

function beginBotAttackerCommit(bot, timestamp = now()) {
  const cycle = Math.max(0, Number(bot.botDeceptionCycle) || 0);
  bot.botDeceptionPhase = "commit";
  bot.botDeceptionUntil = timestamp + BOT_ATTACKER_COMMIT_MS + stableBotHash(`${bot.id}:commit:${cycle}`) % 1_400;
  bot.botDeceptionTargetId = "";
  bot.botDeceptionStationId = "";
  bot.botDeceptionPresenceSince = 0;
}

function beginBotAttackerDecoy(room, bot, actualTarget, timestamp = now()) {
  const cycle = Math.max(0, Number(bot.botDeceptionCycle) || 0);
  const decoy = visibleDefenderCandidates(room, bot, timestamp)
    .filter((candidate) => candidate.id !== actualTarget?.id)
    .sort((a, b) => {
      const claimsA = activeBotClaimCount(room, bot, a.id, "botDeceptionTargetId", "botDeceptionUntil", timestamp);
      const claimsB = activeBotClaimCount(room, bot, b.id, "botDeceptionTargetId", "botDeceptionUntil", timestamp);
      return claimsA - claimsB ||
        botTargetAffinity(bot, a, cycle) - botTargetAffinity(bot, b, cycle) ||
        distance(bot, a) - distance(bot, b) ||
        a.id.localeCompare(b.id);
    })[0] || null;
  if (!decoy) {
    beginBotAttackerCommit(bot, timestamp);
    return null;
  }
  bot.botDeceptionPhase = "decoy";
  bot.botDeceptionTargetId = decoy.id;
  bot.botDeceptionStationId = "";
  bot.botDeceptionPresenceSince = 0;
  bot.botDeceptionUntil = timestamp + BOT_ATTACKER_DECOY_PURSUIT_MS + stableBotHash(`${bot.id}:decoy:${cycle}`) % 900;
  bot.navPath = [];
  bot.navCalculatedAt = 0;
  return decoy;
}

function beginBotAttackerFakeTask(room, bot, map, actualTarget, timestamp = now()) {
  bot.botDeceptionCycle = Math.max(0, Number(bot.botDeceptionCycle) || 0) + 1;
  const station = attackerFakeTaskStation(room, bot, map, actualTarget, timestamp);
  if (!station) {
    beginBotAttackerDecoy(room, bot, actualTarget, timestamp);
    return null;
  }
  bot.botDeceptionPhase = "fake-task";
  bot.botDeceptionTargetId = "";
  bot.botDeceptionStationId = station.id;
  bot.botDeceptionPresenceSince = 0;
  bot.botDeceptionUntil = timestamp + BOT_ATTACKER_FAKE_TASK_TRAVEL_MS + stableBotHash(`${bot.id}:task:${bot.botDeceptionCycle}`) % 1_600;
  bot.navPath = [];
  bot.navCalculatedAt = 0;
  return station;
}

function runBotAttackerDeception(room, bot, map, actualTarget, timestamp = now()) {
  if (bot.role !== "attacker" || !botHasHumanOpponent(room, bot) || !bot.alive || bot.ejected || bot.inVent) {
    clearBotAttackerDeception(bot);
    return false;
  }
  const urgency = attackerBotKillUrgencyState(room, bot, timestamp);
  const opportunity = botKillOpportunityProfile(room, bot, actualTarget);
  if (
    urgency.urgent ||
    opportunity.isolated ||
    (opportunity.hidden && distance(bot, actualTarget) <= Math.max(BOT_ATTACKER_ISOLATION_RANGE, room.settings.killRange * 2)) ||
    bot.attackResolveAt > timestamp ||
    botHasImmediateLethalOpportunity(room, bot, actualTarget, timestamp)
  ) {
    beginBotAttackerCommit(bot, timestamp);
    return false;
  }
  if (bot.botDeceptionPhase === "commit" && Number(bot.botDeceptionUntil) > timestamp) return false;
  if (!bot.botDeceptionPhase || Number(bot.botDeceptionUntil) <= timestamp) {
    if (bot.botDeceptionPhase === "fake-task") beginBotAttackerDecoy(room, bot, actualTarget, timestamp);
    else if (bot.botDeceptionPhase === "decoy") beginBotAttackerCommit(bot, timestamp);
    else beginBotAttackerFakeTask(room, bot, map, actualTarget, timestamp);
  }
  if (bot.botDeceptionPhase === "commit") return false;

  if (bot.gunFiring) stopGunnerFire(room, bot, { reason: "偽装行動" });
  if (bot.botDeceptionPhase === "fake-task") {
    const station = (map.stations || []).find((entry) => entry.id === bot.botDeceptionStationId);
    if (!station) {
      beginBotAttackerDecoy(room, bot, actualTarget, timestamp);
      return bot.botDeceptionPhase !== "commit";
    }
    if (distance(bot, station) > Math.max(56, map.taskRange * 0.72)) {
      moveBotToward(room, bot, station);
      return true;
    }
    stopBotForInteraction(bot, timestamp);
    if (!Number(bot.botDeceptionPresenceSince)) {
      bot.botDeceptionPresenceSince = timestamp;
    }
    if (timestamp - Number(bot.botDeceptionPresenceSince) >= BOT_ATTACKER_FAKE_TASK_PRESENCE_MS) {
      beginBotAttackerDecoy(room, bot, actualTarget, timestamp);
    }
    return bot.botDeceptionPhase !== "commit";
  }

  if (bot.botDeceptionPhase === "decoy") {
    const decoy = room.players.get(String(bot.botDeceptionTargetId || ""));
    if (!decoy?.alive || decoy.ejected || decoy.role !== "defender") {
      beginBotAttackerCommit(bot, timestamp);
      return false;
    }
    // A fresh target evaluation may promote the apparent target to the real
    // target. From that point it is no longer a feint and normal combat resumes.
    if (decoy.id === actualTarget?.id) {
      beginBotAttackerCommit(bot, timestamp);
      return false;
    }
    const dx = decoy.x - bot.x;
    const dy = decoy.y - bot.y;
    const length = Math.hypot(dx, dy) || 1;
    bot.aimX = dx / length;
    bot.aimY = dy / length;
    if (distance(bot, decoy) <= Math.max(115, room.settings.killRange * 0.78)) stopBotForInteraction(bot, timestamp);
    else moveBotToward(room, bot, decoy);
    return true;
  }
  return false;
}

function botManaTarget(bot) {
  if (bot.special === "fighter") return FIGHTER_ENERGY_CHARGE_MANA_COST;
  if (bot.special === "teleport") return TELEPORT_MANA_COST;
  if (bot.special === "flora") return FLORA_MANA_COST;
  if (bot.special === "gunner") return 0;
  if (bot.special === "alchemist") return ALCHEMY_MANA_COST;
  return bot.role === "defender" ? DODGE_MANA_COST : 0;
}

function refillBotMana(room, bot) {
  if ((Number(bot.mana) || 0) >= botManaTarget(bot)) return false;
  try {
    practiceRenki(room, bot);
    return true;
  } catch {
    return false;
  }
}

function runBotDefenseDecision(room, bot, nearbyAttacker, timestamp) {
  if (botHasHumanOpponent(room, bot)) {
    bot.botDefensePlannedAt = 0;
    bot.botDefenseKind = "";
    bot.botDefenseTargetId = "";
    bot.nextBotDefenseDecisionAt = timestamp + BOT_TICK_MS;
    if (!nearbyAttacker || distance(bot, nearbyAttacker) > room.settings.killRange * 1.35) return;
    if (bot.dodgeActiveUntil > timestamp) return;
    try { activateDodge(room, bot); } catch {}
    return;
  }
  if (bot.botDefensePlannedAt > 0 && bot.botDefensePlannedAt <= timestamp) {
    const plannedTarget = room.players.get(bot.botDefenseTargetId);
    const canReact = plannedTarget && plannedTarget.alive && !plannedTarget.ejected &&
      distance(bot, plannedTarget) <= room.settings.killRange * 1.35;
    const kind = bot.botDefenseKind;
    bot.botDefensePlannedAt = 0;
    bot.botDefenseKind = "";
    bot.botDefenseTargetId = "";
    if (!canReact) return;
    // The bot predicts danger from proximity alone. It must sometimes misread
    // that cue instead of turning every nearby attack into a guaranteed counter.
    if (Math.random() < 0.38) return;
    try {
      if (kind === "dodge") activateDodge(room, bot);
    } catch {}
    return;
  }

  if (timestamp < (bot.nextBotDefenseDecisionAt || 0)) return;
  bot.nextBotDefenseDecisionAt = timestamp + 4200 + Math.floor(Math.random() * 5000);
  if (!nearbyAttacker || distance(bot, nearbyAttacker) > room.settings.killRange * 1.35) return;
  if (Math.random() >= 0.16) return;

  const canDodge = bot.dodgeReadyAt <= timestamp;
  const kind = canDodge ? "dodge" : "";
  if (!kind) return;
  bot.botDefenseKind = kind;
  bot.botDefenseTargetId = nearbyAttacker.id;
  bot.botDefensePlannedAt = timestamp + 500 + Math.floor(Math.random() * 1000);
}

function selectBotGunnerWeapon(bot, targetDistance, maximumStrength = false) {
  if (!bot.gunnerAmmo || typeof bot.gunnerAmmo !== "object") bot.gunnerAmmo = createGunnerAmmo();
  if (bot.gunFiring && GUNNER_WEAPONS[bot.gunFiringWeapon]) return GUNNER_WEAPONS[bot.gunFiringWeapon];
  const preferred = targetDistance > 700
    ? ["sniper", "assault", "handgun", "smg", "taser"]
    : targetDistance > 430
      ? ["assault", "sniper", "handgun", "smg", "taser"]
      : targetDistance < 260
        ? ["smg", "taser", "handgun", "assault", "sniper"]
        : ["handgun", "taser", "smg", "assault", "sniper"];
  const usable = preferred.filter((id) => {
    const weapon = GUNNER_WEAPONS[id];
    return targetDistance <= weapon.range && (Number(bot.gunnerAmmo[id]) || 0) >= weapon.ammoPerShot;
  });
  const weaponId = maximumStrength
    ? usable.sort((a, b) => {
      const weaponA = GUNNER_WEAPONS[a];
      const weaponB = GUNNER_WEAPONS[b];
      const headshotChance = gunnerHeadshotChance(bot, bot.gunnerSnipingActive);
      const bodyDamageA = gunnerDamageAtDistance(weaponA, targetDistance);
      const bodyDamageB = gunnerDamageAtDistance(weaponB, targetDistance);
      const scoreA = (headshotChance * 2 + (1 - headshotChance) * bodyDamageA) * 1000 / Math.max(1, weaponA.cooldownMs);
      const scoreB = (headshotChance * 2 + (1 - headshotChance) * bodyDamageB) * 1000 / Math.max(1, weaponB.cooldownMs);
      return scoreB - scoreA || GUNNER_WEAPON_ORDER.indexOf(a) - GUNNER_WEAPON_ORDER.indexOf(b);
    })[0]
    : usable[0];
  if (!weaponId) return null;
  bot.gunnerWeapon = weaponId;
  return GUNNER_WEAPONS[weaponId];
}

function runCpuGravityScript(room, bot, timestamp) {
  const state = room.soloMission;
  if (!state || state.id !== "cpu-gravity" || state.cpuBotId !== bot.id || !bot.alive || bot.ejected) return false;
  bot.vx = 0;
  bot.vy = 0;
  bot.movementMode = "idle";
  if (bot.meditatingUntil > timestamp) return true;
  try {
    if (state.cpuPhase === "accelerate-1" || state.cpuPhase === "accelerate-2") {
      if (Number(bot.mana) < ABILITY_MANA_COST) {
        state.cpuPhase = "renki-1";
        state.cpuRenkiCount = 0;
        return true;
      }
      toggleGravityTime(room, bot, "accelerate", bot.id);
      state.cpuRenkiCount = 0;
      state.cpuPhase = state.cpuPhase === "accelerate-1" && Number(bot.mana) >= ABILITY_MANA_COST
        ? "accelerate-2" : "renki-1";
      return true;
    }
    if (state.cpuPhase === "renki-1" || state.cpuPhase === "renki-2") {
      if (Number(bot.mana) >= HEART_TELEPORT_MANA_COST) {
        state.cpuPhase = "heart";
        return true;
      }
      if (state.cpuRenkiCount < 1) {
        practiceRenki(room, bot);
        state.cpuRenkiCount += 1;
      } else {
        state.cpuPhase = "heart";
      }
      return true;
    }
    if (state.cpuPhase === "heart") {
      const target = [...room.players.values()].find((candidate) => candidate.role === "defender" && candidate.alive && !candidate.ejected);
      if (!botCanAttackTarget(room, bot, target, timestamp)) return true;
      if ((Number(bot.mana) || 0) < HEART_TELEPORT_MANA_COST) {
        state.cpuPhase = "accelerate-1";
        state.cpuRenkiCount = 0;
        return true;
      }
      rememberBotKillDecision(room, bot, target, {
        code: "cpu-gravity-public-training-script",
        actionLabel: "心臓転移",
        evidence: ["CPU訓練画面で公開された対戦対象"],
        reasons: ["訓練課題で指定された心臓転移フェーズに到達し、必要MPを保持"]
      }, timestamp);
      teleportPlayer(room, bot, undefined, undefined, target.id, "heart");
      if (room.phase === "playing" && !alivePlayers(room, "defender").length) checkWin(room);
      return true;
    }
  } catch {
    state.cpuPhase = "accelerate-1";
    state.cpuRenkiCount = 0;
  }
  return true;
}

function runCpuStage2Script(room, bot, timestamp) {
  const state = room.soloMission;
  if (!state || state.id !== "cpu-stage2" || state.cpuBotId !== bot.id || !bot.alive || bot.ejected) return false;
  const target = [...room.players.values()]
    .filter((candidate) => candidate.role === "defender" && candidate.alive && !candidate.ejected)
    .sort((a, b) => distance(bot, a) - distance(bot, b))[0];
  if (!botCanAttackTarget(room, bot, target, timestamp)) return true;
  if ((Number(bot.vibeCodingReadyAt) || 0) > timestamp || availableStamina(bot) < 6) return false;
  bot.vx = 0;
  bot.vy = 0;
  bot.movementMode = "idle";
  try {
    rememberBotKillDecision(room, bot, target, {
      code: "cpu-hacker-public-training-script",
      actionLabel: "バイブコーディング: HP削除",
      evidence: ["CPU訓練画面で公開された対戦対象"],
      reasons: ["訓練課題で指定されたハック行動のクールタイムとSP条件を満たした"]
    }, timestamp);
    useAlchemy(room, bot, "hack-hp-delete", target.id);
    return true;
  } catch {
    return false;
  }
}

function stopBotForInteraction(bot, timestamp = now()) {
  clearBotNavigationIntent(bot);
  bot.vx = 0;
  bot.vy = 0;
  bot.movementMode = "idle";
  bot.lastMoveAt = timestamp;
  clearStoredMovementInput(bot, timestamp);
}

function runFriendlyDefenderPatrol(room, bot, map) {
  if (bot.role !== "defender" || botIsEnemyOfSoleHuman(room, bot)) return false;
  const roomCenters = [...(map.rooms || []), ...(map.corridors || [])].map((rect, index) => ({
    id: `patrol-area-${rect.id || index}`,
    x: Number(rect.x) + Number(rect.w) / 2,
    y: Number(rect.y) + Number(rect.h) / 2
  }));
  const patrolPoints = [
    ...(map.objects || []),
    ...(map.stations || []),
    ...(map.spawns || []),
    ...roomCenters
  ].filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y) &&
    isWalkable(room, Number(point.x), Number(point.y), map.playerRadius));
  if (!patrolPoints.length) return true;
  for (let attempt = 0; attempt < Math.min(6, patrolPoints.length); attempt += 1) {
    let target = patrolPoints.find((point) => point.id === bot.botPatrolTargetId);
    if (!target || distance(bot, target) <= Math.max(70, map.taskRange * 0.55)) {
      const alternatives = patrolPoints.filter((point) => point.id !== bot.botPatrolTargetId);
      target = alternatives[Math.floor(Math.random() * alternatives.length)] || patrolPoints[0];
      bot.botPatrolTargetId = target.id || `${Math.round(target.x)}:${Math.round(target.y)}`;
    }
    if (moveBotToward(room, bot, target)) {
      bot.botPatrolPathFailures = 0;
      return true;
    }
    bot.botPatrolTargetId = "";
    bot.navPath = [];
    bot.navCalculatedAt = 0;
  }
  bot.botPatrolPathFailures = (Number(bot.botPatrolPathFailures) || 0) + 1;
  stopBotForInteraction(bot);
  return true;
}

function clearBotTaskInteraction(bot, { clearTarget = false } = {}) {
  if (!bot) return;
  bot.botTaskPresenceSince = 0;
  bot.botTaskPresenceLastTickAt = 0;
  if (clearTarget) bot.botTaskTargetId = "";
}

function botScheduledReturnWindowMs(room) {
  const activeBotCount = [...(room?.players?.values?.() || [])]
    .filter((player) => player.isBot && !player.ejected && !player.inVent).length;
  return Math.max(BOT_TICK_MS * 2.5, (activeBotCount + 1.5) * BOT_TICK_MS);
}

function runEnemyDefenderTask(room, bot, map, timestamp = now()) {
  if (
    bot?.role !== "defender" ||
    !bot.alive ||
    bot.ejected ||
    !botIsEnemyOfSoleHuman(room, bot)
  ) {
    clearBotTaskInteraction(bot, { clearTarget: true });
    return false;
  }

  const pending = (Array.isArray(bot.taskList) ? bot.taskList : []).filter((item) => !item.done);
  // An Upload is legal as soon as completed Downloads outnumber completed
  // Uploads.  Do not force every remaining Download first: that old shortcut
  // can make an enemy Defender cross the map past an already-unlocked nearby
  // Upload.  This mirrors completeTask's authoritative stage guard while
  // retaining the same assigned stations, visibility boundary, costs and
  // task cooldown.
  const completedDownloads = bot.taskList.filter((item) => item.type === "download" && item.done).length;
  const completedUploads = bot.taskList.filter((item) => item.type === "upload" && item.done).length;
  const candidates = pending.filter((item) => (
    item.type !== "upload" || completedDownloads > completedUploads
  ));
  bot.botTaskBlockedUntilById ||= {};
  for (const [taskId, blockedUntil] of Object.entries(bot.botTaskBlockedUntilById)) {
    if (Number(blockedUntil) <= timestamp) delete bot.botTaskBlockedUntilById[taskId];
  }

  const entries = candidates
    .map((task) => ({ task, station: findStation(map, task.stationId) }))
    .filter((entry) => entry.station);
  let taskTarget = entries.find(({ task }) => (
    task.id === bot.botTaskTargetId &&
    Number(bot.botTaskBlockedUntilById[task.id] || 0) <= timestamp
  ));
  if (!taskTarget) {
    taskTarget = entries
      .filter(({ task }) => Number(bot.botTaskBlockedUntilById[task.id] || 0) <= timestamp)
      .sort((a, b) => distance(bot, a.station) - distance(bot, b.station))[0];
    bot.botTaskTargetId = taskTarget?.task.id || "";
    clearBotTaskInteraction(bot);
  }
  if (!taskTarget) {
    clearBotTaskInteraction(bot, { clearTarget: true });
    return false;
  }

  const { task, station } = taskTarget;
  if (distance(bot, station) > map.taskRange) {
    clearBotTaskInteraction(bot);
    if (!teleportBotToward(room, bot, station)) {
      const moved = moveBotToward(room, bot, station);
      bot.botTaskPathFailures = moved ? 0 : (Number(bot.botTaskPathFailures) || 0) + 1;
      if (bot.botTaskPathFailures >= 3) {
        bot.botTaskBlockedUntilById[task.id] = timestamp + 5000;
        bot.botTaskPathFailures = 0;
        bot.navPath = [];
        bot.navCalculatedAt = 0;
        clearBotTaskInteraction(bot, { clearTarget: true });
      }
    }
    return true;
  }

  bot.botTaskPathFailures = 0;
  stopBotForInteraction(bot, timestamp);
  const interactionWasInterrupted = (
    bot.botTaskTargetId !== task.id ||
    !Number(bot.botTaskPresenceSince) ||
    timestamp - Number(bot.botTaskPresenceLastTickAt || 0) > botScheduledReturnWindowMs(room)
  );
  bot.botTaskTargetId = task.id;
  bot.botTaskPresenceLastTickAt = timestamp;
  if (interactionWasInterrupted) {
    bot.botTaskPresenceSince = timestamp;
    return true;
  }

  const requiredPresenceMs = Math.min(900, AUTO_TASK_PRESENCE_MS / effectiveAccelerationMultiplier(room, bot, timestamp));
  if (timestamp - Number(bot.botTaskPresenceSince) < requiredPresenceMs || Number(bot.taskAutoReadyAt) > timestamp) return true;
  try {
    completeTask(room, bot, task.id);
    clearBotTaskInteraction(bot, { clearTarget: true });
  } catch (error) {
    bot.botTaskPresenceSince = timestamp;
    bot.botTaskPresenceLastTickAt = timestamp;
    if (error instanceof ApiError && error.status === 404) {
      bot.botTaskBlockedUntilById[task.id] = timestamp + 5000;
      clearBotTaskInteraction(bot, { clearTarget: true });
    }
  }
  return true;
}

function runBotGroundItemPickup(room, bot) {
  if (!bot?.alive || bot.ejected || bot.inVent || !itemStorageAvailable(bot)) return false;
  const nearby = (room.groundItems || [])
    .map((groundItem) => ({ groundItem, distance: distance(bot, groundItem) }))
    .filter(({ groundItem }) => !groundItem.fixtureReservedOwnerId)
    .filter(({ groundItem, distance: itemDistance }) => itemDistance <= Number(groundItem.pickupRange || GROUND_ITEM_PICKUP_RANGE))
    .sort((a, b) => a.distance - b.distance)[0]?.groundItem;
  if (!nearby) return false;
  try {
    pickupGroundItem(room, bot, nearby.id);
    stopBotForInteraction(bot);
    return true;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return false;
  }
}

// Enemy bots used to have a hard-coded EMP -> heart-transfer -> gun ->
// ninjutsu ladder.  That made maximum-strength matches deceptively weak: a
// Gravity bot, for example, never used the public Accelerate/Renki/Heart
// route which the CPU training explicitly teaches.  Keep the decision layer
// deliberately small and invoke the same authoritative action functions as a
// human request; legality (resources, cooldowns, range, ownership, guards and
// line of sight) therefore remains in one canonical place.
function botOpponentTarget(room, bot, timestamp = now()) {
  if (bot.role === "attacker") return preferredDefenderTarget(room, bot, timestamp);
  return botKnownAttackerEvidence(room, bot, timestamp);
}

// A protection barrier rejects every combat transaction, but it is not an
// information blackout or a navigation objective.  In particular, the
// first-screen enemy-Bot fixture used to see its directly visible Defender
// protected for 1.5 seconds, fall through to fake-task deception, and leave
// the same room before the barrier expired.  Keep this deliberately narrower
// than botCanAttackTarget: it authorizes only movement toward a currently
// visible hostile (or a Defender's already-public evidence), never a plan,
// resource spend, damage, or target acquisition through secrecy.
function botCanPursueBarrierProtectedTarget(room, bot, target, timestamp = now()) {
  if (botCanAttackTarget(room, bot, target, timestamp)) return true;
  if (
    !bot?.isBot ||
    !target?.alive ||
    target.ejected ||
    target.inVent ||
    target.id === bot.id ||
    sharesCombatFaction(bot, target) ||
    !botTargetHasActiveBarrier(room, target, timestamp)
  ) return false;
  if (bot.role === "attacker") {
    return target.role === "defender" && botCanDirectlyObservePlayer(room, bot, target);
  }
  return bot.role === "defender" &&
    target.role === "attacker" &&
    botKnownAttackerEvidence(room, bot, timestamp)?.id === target.id;
}

function botBarrierPursuitTarget(room, bot, timestamp = now()) {
  if (!bot?.isBot) return null;
  if (bot.role === "defender") {
    const witnessed = botKnownAttackerEvidence(room, bot, timestamp);
    return botCanPursueBarrierProtectedTarget(room, bot, witnessed, timestamp) ? witnessed : null;
  }
  if (bot.role !== "attacker") return null;
  return alivePlayers(room, "defender")
    .filter((target) => botCanPursueBarrierProtectedTarget(room, bot, target, timestamp))
    .sort((left, right) => distance(bot, left) - distance(bot, right) || left.id.localeCompare(right.id))[0] || null;
}

function botHasTimedAcceleration(bot, timestamp = now()) {
  return activeTimedAccelerationEffects(bot, timestamp).some((effect) => String(effect.source) === "gravity-accelerate");
}

function clearBotCombatPlan(bot) {
  bot.botCombatPlan = "";
  bot.botCombatPlanTargetId = "";
  bot.botCombatPlanUpdatedAt = 0;
  bot.botCombatPlanHoldId = "";
  bot.botCombatPlanThrowId = "";
  bot.botCombatPlanDeadlineAt = 0;
}

// Plans are data, not a new fixed priority ladder.  A plan declares its setup
// effect, only public evidence/window it may retain, payoff, and future value;
// adding a legal tactic is a new declarative entry plus canonical callbacks.
const BOT_COMBAT_PLAN_DEFINITIONS = Object.freeze({
  "gravity-accelerate-renki-heart": Object.freeze({
    setup: "self-accelerate", expectedPublicState: "visible gravity acceleration", payoff: "heart-transfer", futureValue: 960,
    valid: (room, bot, target, timestamp) => Boolean(botCanAttackTarget(room, bot, target, timestamp) && target.id === bot.botCombatPlanTargetId && hasOperatorAccess(bot, "gravity")),
    step: runGravityAccelerateRenkiHeartPlan
  }),
  "poison-observe-rest-payoff": Object.freeze({
    setup: "toxic throw", expectedPublicState: "directly visible toxic landing and public rest motion", payoff: "visible-rest attack", futureValue: 700,
    valid: (room, bot, target, timestamp) => Boolean(botCanAttackTarget(room, bot, target, timestamp) && target.id === bot.botCombatPlanTargetId && botCanDirectlyObservePlayer(room, bot, target)),
    step: runPoisonObserveRestPayoffPlan
  })
});

function runPoisonObserveRestPayoffPlan(room, bot, target, timestamp) {
    // Never read poisonStatus, sleep timers, or another player's private
    // resource state.  This plan is retained only for the public throw/ATE
    // chain and pays off only while the bot can actually see the sleep motion.
    const observation = pruneBotVisibleThrowObservations(bot, timestamp)
      .find((entry) => entry.visualThrowId === String(bot.botCombatPlanThrowId || "") && entry.visiblyToxicContainer);
    // Waiting is handled: do not rebuild candidates/rethrow until the observed
    // public throw has landed and the public poison ATE chain reaches target.
    if (!observation || timestamp > Number(bot.botCombatPlanDeadlineAt || 0)) {
      clearBotCombatPlan(bot);
      return false;
    }
    const victimObserved = Boolean(observation.poisonLandingObservedAt > 0 && observation.visiblePoisonVictims?.[target.id]);
    if (!victimObserved || !["sleep", "meditating"].includes(String(target.movementMode || ""))) return true;
    try {
      if (bot.special === "gunner") {
        const weapon = selectBotGunnerWeapon(bot, distance(bot, target), true);
        const dx = target.x - bot.x;
        const dy = target.y - bot.y;
        const length = Math.hypot(dx, dy) || 1;
        if (weapon && bot.gunReadyAt <= timestamp && distance(bot, target) <= weapon.range && clearShotPath(room, bot, target, dx / length, dy / length)) {
          shootGunner(room, bot, dx, dy, "start", 0, "", true);
          clearBotCombatPlan(bot);
          return true;
        }
      }
      if (bot.role === "attacker" && bot.killReadyAt <= timestamp && distance(bot, target) <= room.settings.killRange * 0.58) {
        startNinjutsu(room, bot, target.id);
        clearBotCombatPlan(bot);
        return true;
      }
    } catch {
      clearBotCombatPlan(bot);
    }
    return false;
}

function runGravityAccelerateRenkiHeartPlan(room, bot, target, timestamp) {
  try {
    if (bot.meditatingUntil > timestamp || bot.attackResolveAt > timestamp) return true;
    if (!botHasTimedAcceleration(bot, timestamp)) {
      if (Number(bot.mana) < ABILITY_MANA_COST) {
        clearBotCombatPlan(bot);
        return false;
      }
      toggleGravityTime(room, bot, "accelerate", bot.id);
      bot.botCombatPlanUpdatedAt = timestamp;
      return true;
    }
    if (Number(bot.mana) < HEART_TELEPORT_MANA_COST) {
      const holdId = String(bot.botCombatPlanHoldId || `bot-plan-renki-${bot.id}`);
      bot.botCombatPlanHoldId = holdId;
      if (!bot.abilityHold || bot.abilityHold.id !== holdId) {
        startAbilityHold(room, bot, "/api/renki", holdId);
        return true;
      }
      if (timestamp < Number(bot.abilityHold.startedAt) + ABILITY_BATCH_HOLD_MIN_MS) return true;
      practiceRenki(room, bot, { holdId });
      bot.botCombatPlanUpdatedAt = timestamp;
      return true;
    }
    if (bot.teleportReadyAt > timestamp) return true;
    rememberBotKillDecision(room, bot, target, {
      code: "planned-gravity-accelerate-renki-heart",
      actionLabel: "心臓転移",
      evidence: ["直接観測または許可された観測記憶上の敵対対象"],
      reasons: ["アクセラレート後の錬気で心臓転移の必要MPを確保した"]
    }, timestamp);
    teleportPlayer(room, bot, undefined, undefined, target.id, "heart");
    clearBotCombatPlan(bot);
    return true;
  } catch {
    // A phase/resource/target change is not retried blindly.  Re-evaluate the
    // complete candidate list on the next decision.
    clearBotCombatPlan(bot);
    return false;
  }
}

function executeBotCombatPlan(room, bot, target, timestamp) {
  const definition = BOT_COMBAT_PLAN_DEFINITIONS[String(bot.botCombatPlan || "")];
  if (!definition) return false;
  if (!definition.valid(room, bot, target, timestamp)) {
    clearBotCombatPlan(bot);
    return false;
  }
  return definition.step(room, bot, target, timestamp);
}

function botRailgunLineHasAlly(room, bot, target) {
  const dx = Number(target?.x) - Number(bot?.x);
  const dy = Number(target?.y) - Number(bot?.y);
  const length = Math.hypot(dx, dy) || 1;
  const aimX = dx / length;
  const aimY = dy / length;
  const path = resolveVectorAttackPath(room, bot, aimX, aimY, 5000, { collisionRadius: 2 });
  return [...room.players.values()].some((candidate) => {
    if (candidate.id === bot.id || candidate.id === target?.id || !candidate.alive || candidate.ejected || candidate.role !== bot.role) return false;
    const relativeX = Number(candidate.x) - Number(bot.x);
    const relativeY = Number(candidate.y) - Number(bot.y);
    const along = relativeX * path.dx + relativeY * path.dy;
    const perpendicular = Math.abs(relativeX * path.dy - relativeY * path.dx);
    return along > 0 && along <= path.distance + 0.5 && perpendicular <= 38;
  });
}

function botMissileTarget(room, bot, timestamp = now()) {
  return [...room.players.values()]
    .filter((candidate) => botCanAttackTarget(room, bot, candidate, timestamp))
    .filter((candidate) => {
      const candidateDistance = distance(bot, candidate);
      const dx = (candidate.x - bot.x) / Math.max(candidateDistance, 1);
      const dy = (candidate.y - bot.y) / Math.max(candidateDistance, 1);
      return clearShotPath(room, bot, candidate, dx, dy);
    })
    .sort((a, b) => distance(bot, a) - distance(bot, b) || a.id.localeCompare(b.id))[0] || null;
}

function botCombatCandidates(room, bot, target, timestamp) {
  if (!botCanAttackTarget(room, bot, target, timestamp) ||
    !bot.alive || bot.ejected || bot.inVent ||
    actionBlockedUntil(bot) > timestamp ||
    Number(bot.abilityDisabledUntil) > timestamp
  ) return [];
  const targetDistance = distance(bot, target);
  const targetDx = (target.x - bot.x) / Math.max(targetDistance, 1);
  const targetDy = (target.y - bot.y) / Math.max(targetDistance, 1);
  const clearTargetPath = clearShotPath(room, bot, target, targetDx, targetDy);
  const storageAvailable = itemStorageAvailable(bot, timestamp);
  const candidates = [];
  const evidenceBoost = bot.role === "defender" &&
    String(bot.botWitnessTargetId || "") === target.id &&
    Number(bot.botWitnessUntil) > timestamp &&
    String(bot.botWitnessEvidenceKind || "") === "visible-attack-motion-body-chain"
      ? 2_000
      : 0;
  // Once the legal visual attack->body chain exists, every owned payoff keeps
  // its own resource/range/LOS/ownership guard but shares one target priority.
  const confirmedKillIntent = bot.role === "defender" && bot.botWitnessTargetId === target.id &&
    Number(bot.botWitnessUntil) > timestamp && bot.botWitnessEvidenceKind === "observed-kill-burst-exceeds-attacker-count";
  const killCapableActions = new Set(["hacker-hp-delete", "flora-sunbeam", "root-borrowed-flora-sunbeam", "gunner-shoot", "quantum-nuclear-fission", "quantum-nuclear-fusion",
    "root-borrowed-quantum-fission", "root-borrowed-quantum-fusion", "invention-excalibur", "invention-railgun", "invention-particle-cannon"]);
  // This affects ranking only after the original ownership/range/resource
  // predicates accept each candidate. Gunfire retains normal hit probability.
  const add = (code, score, run) => candidates.push({ code,
    score: score + evidenceBoost + (confirmedKillIntent && killCapableActions.has(code) ? 3000 : 0), run });
  const nativeGravity = bot.special === "teleport";
  const nativeFlora = bot.special === "flora";
  const nativeQuantum = bot.special === "quantum";
  const nativeFighter = bot.special === "fighter";

  // This multi-step plan intentionally outranks immediate gunfire/ninjutsu.
  // It is started only from a target the bot can legally know about.
  if (nativeGravity && bot.role === "attacker" && Number(bot.mana) < HEART_TELEPORT_MANA_COST && canSpendOperatorMana(bot, timestamp, ABILITY_MANA_COST) &&
      !botHasTimedAcceleration(bot, timestamp) && Number(bot.teleportReadyAt) <= timestamp) {
    add("gravity-accelerate-renki-heart-plan", BOT_COMBAT_PLAN_DEFINITIONS["gravity-accelerate-renki-heart"].futureValue, () => {
      bot.botCombatPlan = "gravity-accelerate-renki-heart";
      bot.botCombatPlanTargetId = target.id;
      bot.botCombatPlanUpdatedAt = timestamp;
      return executeBotCombatPlan(room, bot, target, timestamp);
    });
  }
  const toxicItem = [...TOXIC_THROW_ITEM_IDS].reverse().find((itemId) => itemCount(bot, itemId) > 0);
  const canExploitVisibleRest = bot.role === "attacker" || bot.special === "gunner";
  const toxicLanding = toxicItem ? safeThrowPoint(room, bot, target.x, target.y) : null;
  if (storageAvailable && canExploitVisibleRest && toxicItem && targetDistance <= 700 && clearTargetPath &&
      botToxicThrowLandingIsSafe(room, bot, toxicLanding, 0) && botCanDirectlyObservePlayer(room, bot, target)) {
    add("poison-throw-observe-rest-payoff", BOT_COMBAT_PLAN_DEFINITIONS["poison-observe-rest-payoff"].futureValue, () => {
      // Use the normal authoritative charge path; bots never forge a hold
      // duration or bypass inventory ownership.
      const chargeId = setEnhanceChargeState(room, bot, true, "throw", toxicItem);
      throwInventoryItem(room, bot, toxicItem, 0, target.x, target.y, chargeId);
      const thrown = [...(room.thrownItems || [])].filter((entry) => entry.ownerId === bot.id && entry.itemId === toxicItem).sort((a, b) => b.createdAt - a.createdAt)[0];
      if (!thrown) return false;
      bot.botCombatPlan = "poison-observe-rest-payoff";
      bot.botCombatPlanTargetId = target.id;
      bot.botCombatPlanThrowId = thrown.id;
      bot.botCombatPlanDeadlineAt = Number(thrown.landsAt) + BOT_VISIBLE_THROW_MEMORY_MS;
      bot.botCombatPlanUpdatedAt = timestamp;
      return true;
    });
  }
  if (nativeGravity && bot.role === "attacker" && canSpendOperatorMana(bot, timestamp, HEART_TELEPORT_MANA_COST) && Number(bot.teleportReadyAt) <= timestamp) {
    add("gravity-heart-transfer", 900, () => teleportPlayer(room, bot, undefined, undefined, target.id, "heart"));
  }
  if (nativeGravity && target.role !== bot.role && canSpendOperatorMana(bot, timestamp, ABILITY_MANA_COST)) {
    add("gravity-decelerate", 690, () => toggleGravityTime(room, bot, "decelerate", target.id));
  }
  if (nativeGravity && target.role !== bot.role && canSpendOperatorMana(bot, timestamp, GRAVITY_STORM_MANA_COST)) {
    add("gravity-storm", 675, () => useGravityStorm(room, bot, target.id));
  }
  if (nativeGravity && Number(bot.timeKeeperEndsAt) <= timestamp && canSpendOperatorMana(bot, timestamp, GRAVITY_TIME_KEEPER_MANA_COST)) {
    add("gravity-time-keeper", 640, () => useTimeKeeper(room, bot));
  }
  if (nativeFlora) {
    if ((Number(bot.bodyHits) > 0 || Number(bot.overheal) < 1) && canSpendOperatorMana(bot, timestamp, FLORA_MANA_COST)) {
      add("flora-self-heal", 720, () => healFlora(room, bot));
    }
    if (target.role !== bot.role && canSpendOperatorMana(bot, timestamp, FLORA_SUNBEAM_MANA_COST) && targetDistance <= SUNBEAM_RANGE && clearTargetPath) {
      add("flora-sunbeam", 740, () => floraSunbeam(room, bot, target.id));
    }
    if (target.role !== bot.role && !floraInvisibleActive(bot, timestamp) && canSpendOperatorMana(bot, timestamp, FLORA_INVISIBLE_MANA_COST) && targetDistance <= BOT_BODY_NOTICE_RANGE) {
      add("flora-invisible", 700, () => useFloraInvisible(room, bot));
    }
  }
  if (nativeQuantum && Number(bot.stamina) >= QUANTUM_ACTION_STAMINA_COST) {
    if (canSpendQuantumElectricResources(bot) && findQuantumElectricTarget(room, bot, timestamp)) {
      add("quantum-electric-discharge", 430, () => useQuantumControl(room, bot, "electric-discharge"));
    }
    if (itemCount(bot, "mineral-water") > 0) {
      add("quantum-kinetic-accelerate", 410, () => useQuantumControl(room, bot, "kinetic-accelerate"));
      add("quantum-kinetic-decelerate", 405, () => useQuantumControl(room, bot, "kinetic-decelerate"));
    }
    if (itemCount(bot, "lead") || itemCount(bot, "mercury")) add("quantum-nuclear-transmutation", 520, () => useQuantumControl(room, bot, "nuclear-transmutation"));
  }
  if (nativeQuantum && Number(bot.stamina) >= QUANTUM_ACTION_STAMINA_COST && Number(bot.mana) >= QUANTUM_NUCLEAR_MANA_COST && quantumEndgameAvailable(room, timestamp)) {
    if (itemCount(bot, "uranium") || itemCount(bot, "plutonium")) add("quantum-nuclear-fission", 860, () => useQuantumControl(room, bot, "nuclear-fission"));
    if (itemCount(bot, "seawater")) add("quantum-nuclear-fusion", 875, () => useQuantumControl(room, bot, "nuclear-fusion"));
  }
  if (nativeFighter && storageAvailable && itemCount(bot, "orichalcum-sword") > 0 && Number(bot.stamina) >= FIGHTER_SLASH_STAMINA_COST && targetDistance <= room.settings.killRange && clearTargetPath) {
    add("fighter-slash", 780, () => fighterSlash(room, bot, target.id, false));
  }
  if (nativeFighter && !bot.limitBreakActive && remainingHealth(bot) > 1) {
    add("fighter-limit-break", 610, () => toggleLimitBreak(room, bot));
  }
  if (isHackerOperator(bot) && Number(bot.vibeCodingReadyAt) <= timestamp) {
    const deadAlly = [...room.players.values()].find((candidate) =>
      candidate.id !== bot.id && candidate.role === bot.role && !candidate.alive && !candidate.ejected);
    if (deadAlly && !bot.alchemyReviveUsed) add("hacker-revive-ally", 900, () => useAlchemy(room, bot, "revive", deadAlly.id));
    if (Number(bot.bodyHits) > 0) add("hacker-hp-duplicate", 735, () => useAlchemy(room, bot, "hack-hp-duplicate", bot.id));
    if (Number(bot.mana) < manaCapacityFor(bot)) add("hacker-mana-duplicate", 700, () => useAlchemy(room, bot, "hack-mana-duplicate", bot.id));
    if (hasHackableInventory(bot, true)) add("hacker-items-duplicate", 620, () => useAlchemy(room, bot, "hack-items-duplicate", bot.id));
    if (bot.poisonStatus || bot.burnStatus || bot.shockSlowedUntil > timestamp) add("hacker-status-recover", 710, () => useAlchemy(room, bot, "hack-status-recover", bot.id));
    if (targetDistance <= room.settings.killRange * 1.5) {
      // HP deletion is a native Hacker recipe; the recipe itself verifies ROOT
      // access and target semantics before making any change.
      add("hacker-hp-delete", 820, () => useAlchemy(room, bot, "hack-hp-delete", target.id));
      // Enemy Inventory and MP are private. A human may attempt these recipes
      // without knowing whether they will find anything, so candidate scoring
      // must not branch on the target's concealed server fields.
      add("hacker-items-delete", 790, () => useAlchemy(room, bot, "hack-items-delete", target.id));
      add("hacker-mana-delete", 775, () => useAlchemy(room, bot, "hack-mana-delete", target.id));
    }
  }
  if (hackerRootEligible(bot) && target.role !== bot.role) {
    if (canSpendQuantumElectricResources(bot) && findQuantumElectricTarget(room, bot, timestamp)) {
      add("root-borrowed-quantum-electric", 435, () => useBorrowedAbility(room, bot, "quantum", { mode: "electric-discharge" }));
    }
    if (bot.role === "attacker" && Number(bot.teleportReadyAt) <= timestamp) add("root-borrowed-gravity-heart-transfer", 905, () => useBorrowedAbility(room, bot, "gravity", { mode: "heart", targetId: target.id }));
    add("root-borrowed-gravity-decelerate", 705, () => useBorrowedAbility(room, bot, "gravity", { mode: "decelerate", targetId: target.id }));
    if ((Number(bot.bodyHits) > 0 || Number(bot.overheal) < 1)) add("root-borrowed-flora-heal", 715, () => useBorrowedAbility(room, bot, "flora", { mode: "heal" }));
    if (targetDistance <= SUNBEAM_RANGE && clearTargetPath) add("root-borrowed-flora-sunbeam", 745, () => useBorrowedAbility(room, bot, "flora", { mode: "sunbeam", targetId: target.id }));
    if (!floraInvisibleActive(bot, timestamp) && targetDistance <= BOT_BODY_NOTICE_RANGE) add("root-borrowed-flora-invisible", 700, () => useBorrowedAbility(room, bot, "flora", { mode: "invisible" }));
    add("root-borrowed-gravity-storm", 680, () => useBorrowedAbility(room, bot, "gravity", { mode: "storm", targetId: target.id }));
    if (Number(bot.timeKeeperEndsAt) <= timestamp) add("root-borrowed-gravity-time-keeper", 645, () => useBorrowedAbility(room, bot, "gravity", { mode: "time-keeper" }));
    if (storageAvailable && itemCount(bot, "orichalcum-sword") > 0 && Number(bot.stamina) >= FIGHTER_SLASH_STAMINA_COST && targetDistance <= room.settings.killRange && clearTargetPath) add("root-borrowed-fighter-slash", 785, () => fighterSlash(room, bot, target.id, false));
    if (!bot.limitBreakActive && remainingHealth(bot) > 1) add("root-borrowed-fighter-limit-break", 615, () => useBorrowedAbility(room, bot, "fighter"));
    if (itemCount(bot, "mineral-water") > 0 && Number(bot.stamina) >= QUANTUM_ACTION_STAMINA_COST) {
      add("root-borrowed-quantum-accelerate", 420, () => useBorrowedAbility(room, bot, "quantum", { mode: "kinetic-accelerate" }));
      add("root-borrowed-quantum-decelerate", 415, () => useBorrowedAbility(room, bot, "quantum", { mode: "kinetic-decelerate" }));
    }
    if (Number(bot.stamina) >= QUANTUM_ACTION_STAMINA_COST && (itemCount(bot, "lead") || itemCount(bot, "mercury"))) add("root-borrowed-quantum-transmutation", 525, () => useBorrowedAbility(room, bot, "quantum", { mode: "nuclear-transmutation" }));
    if (Number(bot.stamina) >= QUANTUM_ACTION_STAMINA_COST && Number(bot.mana) >= QUANTUM_NUCLEAR_MANA_COST && quantumEndgameAvailable(room, timestamp)) {
      if (itemCount(bot, "uranium") || itemCount(bot, "plutonium")) add("root-borrowed-quantum-fission", 865, () => useBorrowedAbility(room, bot, "quantum", { mode: "nuclear-fission" }));
      if (itemCount(bot, "seawater")) add("root-borrowed-quantum-fusion", 880, () => useBorrowedAbility(room, bot, "quantum", { mode: "nuclear-fusion" }));
    }
  }
  if (storageAvailable && (bot.heavyWeapons || []).includes("rpg") && targetDistance <= 300 && clearTargetPath) add("heavy-rpg", 790, () => { const chargeId = setEnhanceChargeState(room, bot, true, "use", "heavy:rpg"); return useHeavyWeapon(room, bot, "rpg", 0, chargeId); });
  const nearestHeavyTarget = botMissileTarget(room, bot, timestamp);
  if (storageAvailable && (bot.heavyWeapons || []).includes("missile") && nearestHeavyTarget?.id === target.id) add("heavy-missile", 800, () => { const chargeId = setEnhanceChargeState(room, bot, true, "use", "heavy:missile"); return useHeavyWeapon(room, bot, "missile", 0, chargeId); });
  const aimAtTarget = () => { const dx = target.x - bot.x, dy = target.y - bot.y, length = Math.hypot(dx, dy) || 1; bot.aimX = dx / length; bot.aimY = dy / length; };
  if (storageAvailable && clearTargetPath) for (const invention of ["excalibur", "railgun", "particle-cannon"]) if ((bot.inventions || []).includes(invention) && (invention !== "railgun" || !botRailgunLineHasAlly(room, bot, target))) add(`invention-${invention}`, invention === "particle-cannon" ? 830 : 810, () => { aimAtTarget(); const chargeId = setEnhanceChargeState(room, bot, true, "use", `invention:${invention}`); return useAlchemistInvention(room, bot, invention, 0, chargeId); });
  if (storageAvailable && clearTargetPath) for (const itemId of ["orichalcum-sword", "molotov", "heated-water", "ice"]) if (itemCount(bot, itemId) > 0 && targetDistance <= 700) add(`throw-${itemId}`, itemId === "molotov" ? 760 : 650, () => { const chargeId = setEnhanceChargeState(room, bot, true, "throw", itemId); return throwInventoryItem(room, bot, itemId, 0, target.x, target.y, chargeId); });
  if (bot.role === "attacker" && targetDistance <= EMP_RANGE && Number(bot.empReadyAt) <= timestamp) {
    add("emp", 650, () => activateEmp(room, bot));
  }
  if (storageAvailable && bot.special === "gunner") {
    const weapon = selectBotGunnerWeapon(bot, targetDistance, true);
    if (weapon && Number(bot.gunReadyAt) <= timestamp && targetDistance <= weapon.range) {
      const dx = target.x - bot.x;
      const dy = target.y - bot.y;
      const length = Math.hypot(dx, dy) || 1;
      if (clearShotPath(room, bot, target, dx / length, dy / length)) {
        add("gunner-shoot", 600, () => shootGunner(room, bot, dx, dy, "start", 0, "", true));
      }
    }
  }
  if (bot.role === "attacker" && targetDistance <= room.settings.killRange && Number(bot.killReadyAt) <= timestamp && !bot.aimTargetId) {
    add("ninjutsu", 560, () => startNinjutsu(room, bot, target.id));
  }
  return candidates.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
}

function botPlannerDecisionActionKinds(code) {
  if (code === "ninjutsu") return ["ninjutsu", "assassin-ninjutsu-annihilation"];
  if (code === "flora-sunbeam" || code === "root-borrowed-flora-sunbeam") return ["sunbeam"];
  if (code === "fighter-slash" || code === "root-borrowed-fighter-slash") return ["slash"];
  if (code === "invention-railgun") return ["railgun"];
  if (code === "invention-particle-cannon") return ["particle-cannon"];
  if (code === "invention-excalibur") return ["excalibur"];
  return [];
}

// Planner codes are an implementation detail.  The kill camera must use the
// same player-facing action names as the authoritative attack transaction.
function botPlannerDecisionActionLabel(code, bot) {
  if (code === "ninjutsu") return ninjutsuEliminationProfile(bot).attackLabel;
  if (code === "flora-sunbeam" || code === "root-borrowed-flora-sunbeam") return "サンビーム";
  if (code === "fighter-slash" || code === "root-borrowed-fighter-slash") return "斬る";
  if (code === "invention-railgun") return "レールガン弾";
  if (code === "invention-particle-cannon") return "パーティクルキャノン";
  if (code === "invention-excalibur") return "エクスカリバー";
  return "攻撃";
}

function runBotCombatPlanner(room, bot, target, timestamp) {
  if (executeBotCombatPlan(room, bot, target, timestamp)) return true;
  for (const candidate of botCombatCandidates(room, bot, target, timestamp)) {
    const actionKinds = botPlannerDecisionActionKinds(candidate.code);
    // Only a candidate with an exact public kill action can own a later
    // kill-camera reason.  Empty mappings describe setup/nonlethal actions;
    // recording them would overwrite a still-valid Ninjutsu focus trace.
    const decision = actionKinds.length ? rememberBotKillDecision(room, bot, target, {
      code: `planner-selected-${candidate.code}`,
      actionLabel: botPlannerDecisionActionLabel(candidate.code, bot),
      actionKinds,
      reasons: ["Botの通常戦闘候補から、既存の所持・射程・資源・クールダウン・行動可否の判定を通過した最高優先行動を選択"]
    }, timestamp) : null;
    try {
      if (candidate.run() !== false) {
        // Navigation is intentionally owned once per scheduled Bot tick by
        // runPlayingBots below.  Do not move here: a successful action used to
        // consume the tick, and adding movement here made plans double-step.
        return true;
      }
    } catch {
      // Candidate legality may have changed within this tick; try the next
      // independently legal candidate rather than idling or trusting state.
    }
    if (bot.botKillDecision === decision) bot.botKillDecision = null;
  }
  return false;
}

function botNavigationMustRemainStationary(bot, timestamp = now()) {
  // These are physical/lifecycle commitments, not generic planner state.
  // In particular, a poison observation/wait plan is allowed to keep walking
  // toward the already public target; `botCombatPlan` alone is never a freeze.
  return Boolean(
    !bot ||
    actionBlockedUntil(bot) > timestamp ||
    Number(bot.botHazardAvoidUntil) > timestamp ||
    bot.aimTargetId ||
    bot.gunFiring ||
    Number(bot.attackResolveAt) > timestamp
  );
}

function runScheduledBotNavigation(room, bot, target, timestamp = now()) {
  if (!botCanPursueBarrierProtectedTarget(room, bot, target, timestamp)) {
    clearBotNavigationIntent(bot);
    return { ownsTick: false, moved: false, stationary: false };
  }
  if (botNavigationMustRemainStationary(bot, timestamp)) {
    return { ownsTick: true, moved: false, stationary: true };
  }
  // The target comes only from preferredDefenderTarget or public Defender
  // evidence via botOpponentTarget; this owner introduces no private knowledge.
  return { ownsTick: true, moved: moveBotToward(room, bot, target), stationary: false };
}

function nextDuePlayingBot(room, timestamp = now()) {
  return [...room.players.values()]
    .filter((bot) => (
      bot.isBot &&
      !bot.ejected &&
      !bot.inVent &&
      !timeKeeperStops(bot, timestamp) &&
      timestamp >= Number(bot.nextBotActionAt || 0)
    ))
    .sort((left, right) => (
      Number(left.nextBotActionAt || 0) - Number(right.nextBotActionAt || 0) ||
      String(left.id || "").localeCompare(String(right.id || ""))
    ))[0] || null;
}

function syncBotTacticalMode(room, bot, timestamp = now()) {
  const mode = botSharesTeamWithHuman(room, bot) ? "support" : "enemy";
  const key = [bot.role, mode, room.battleStartedAt || 0, bot.alive ? "alive" : "dead"].join(":");
  if (bot.botTacticalModeKey === key) return mode;
  const hadMode = Boolean(bot.botTacticalModeKey);
  bot.botTacticalModeKey = key;
  if (!hadMode) return mode;
  clearBotCombatPlan(bot);
  clearBotClairvoyanceContact(bot);
  if (bot.clairvoyanceActive) setClairvoyanceActive(room, bot, false);
  bot.botTarget = null;
  bot.botTargetUntil = 0;
  bot.botDefensePlannedAt = 0;
  bot.botDefenseTargetId = "";
  bot.botDefenseKind = "";
  bot.botWitnessTargetId = "";
  bot.botWitnessUntil = 0;
  bot.botWitnessEvidenceKind = "";
  bot.botObservedKillBursts = [];
  bot.botRetaliationTargetId = "";
  bot.botRetaliationUntil = 0;
  bot.botVisibleAttackMemories = [];
  bot.botVisibleThrowObservations = [];
  bot.navPath = [];
  clearBotNavigationIntent(bot);
  if (bot.gunFiring) stopGunnerFire(room, bot, { reason: "戦術役割変更" });
  return mode;
}

function botDefenderScoutCandidate(bot, target, timestamp = now()) {
  // Scout selection cannot use the subject's concealed faction or kill count.
  return Boolean(target && target.id !== bot.id && target.alive && !target.ejected &&
    !target.inVent && !floraInvisibleActive(target, timestamp));
}

function botCanObserveKill(room, bot, killer, victim, timestamp = now()) {
  if (!killer || !victim?.alive || victim.ejected || victim.inVent || floraInvisibleActive(killer, timestamp)) return false;
  const direct = botCanDirectlyObservePosition(room, bot, killer, BOT_KILL_WITNESS_RANGE) &&
    botCanDirectlyObservePosition(room, bot, victim, BOT_KILL_WITNESS_RANGE);
  if (direct) return true;
  const eyePosition = botClairvoyanceKillEye(room, bot, killer, timestamp);
  if (!eyePosition) return false;
  const eye = { ...bot, x: eyePosition.x, y: eyePosition.y };
  return botCanDirectlyObservePosition(room, eye, killer, BOT_KILL_WITNESS_RANGE) &&
    botCanDirectlyObservePosition(room, eye, victim, BOT_KILL_WITNESS_RANGE);
}

function botClairvoyanceKillEye(room, bot, killer, timestamp = now()) {
  if (!bot?.clairvoyanceActive || Number(bot.botClairvoyanceUntil) <= timestamp) return null;
  const focus = room.players.get(String(bot.botClairvoyanceTargetId || ""));
  if (botDefenderScoutCandidate(bot, focus, timestamp)) {
    return { x: focus.x, y: focus.y, focusId: focus.id };
  }
  // A kill may mark the followed player dead before its observer pass. Keep
  // only this attack's timestamp and actor, never a reusable dead-player view.
  const snapshot = bot.botClairvoyanceKillWitnessSnapshot;
  if (!snapshot || Number(snapshot.at) !== timestamp || String(snapshot.actorId || "") !== String(killer?.id || "") ||
      String(snapshot.focusId || "") !== String(bot.botClairvoyanceTargetId || "")) return null;
  return { x: Number(snapshot.x), y: Number(snapshot.y), focusId: snapshot.focusId };
}

function captureBotKillWitnesses(room, killer, target, timestamp = now()) {
  const witnesses = new Set();
  for (const witness of room.players.values()) {
    if (!witness.isBot || !witness.alive || witness.ejected || witness.inVent || witness.id === target?.id) continue;
    if (witness.role !== "defender" || witness.id === killer?.id) continue;
    if (!botCanObserveKill(room, witness, killer, target, timestamp)) continue;
    witnesses.add(witness.id);
    if (String(witness.botClairvoyanceTargetId || "") === target.id) {
      witness.botClairvoyanceKillWitnessSnapshot = {
        at: timestamp,
        actorId: String(killer?.id || ""),
        focusId: target.id,
        x: Number(target.x),
        y: Number(target.y)
      };
    }
  }
  return witnesses;
}

function rememberBotObservedKill(room, bot, killer, victim, timestamp) {
  const bursts = (bot.botObservedKillBursts || []).filter(entry => timestamp - entry.at <= 250);
  let burst = bursts.find(entry => entry.actorId === killer.id);
  if (!burst) { burst = { actorId: killer.id, at: timestamp, victimIds: [] }; bursts.push(burst); }
  if (!burst.victimIds.includes(victim.id)) burst.victimIds.push(victim.id);
  bot.botObservedKillBursts = bursts;
  const publicAttackerCount = Math.max(1, Number(room.settings.attackerCount) || 1);
  if (burst.victimIds.length > publicAttackerCount) {
    bot.botWitnessEvidenceKind = "observed-kill-burst-exceeds-attacker-count";
    // The first victim may have started an automatic emergency request.
    // A newly conclusive burst switches that pending decision to combat.
    if (bot.smartphoneAction === "emergency" && bot.smartphoneSuspectId === killer.id &&
        bot.smartphoneEvidenceKind === "witness") {
      bot.smartphoneAction = "";
      bot.smartphoneUntil = 0;
      bot.smartphoneSuspectId = "";
      bot.smartphoneEvidenceKind = "";
      bot.emergenciesLeft += 1;
    }
  }
}

function runBotWitnessCaution(room, bot, timestamp = now()) {
  if (bot.role !== "defender" || !bot.alive || bot.botWitnessUntil <= timestamp) return false;
  if (bot.botWitnessEvidenceKind === "observed-kill-burst-exceeds-attacker-count") return false;
  const suspect = room.players.get(String(bot.botWitnessTargetId || ""));
  if (!botDefenderScoutCandidate(bot, suspect, timestamp) || !botCanDirectlyObservePlayer(room, bot, suspect)) return false;
  // Only own public resources and visible distance influence risk response.
  if (Number(bot.mana) >= HEART_TELEPORT_MANA_COST && bot.killReadyAt <= timestamp) return false;
  if (distance(bot, suspect) > room.settings.killRange * 3) return false;
  const dx = bot.x - suspect.x;
  const dy = bot.y - suspect.y;
  const length = Math.hypot(dx, dy) || 1;
  moveBotToward(room, bot, { x: bot.x + (length === 1 && !dx && !dy ? 1 : dx / length) * 260, y: bot.y + dy / length * 260 });
  return true;
}

function runBotConfirmedWitnessResponse(room, bot, timestamp = now()) {
  if (bot.role !== "defender" || !botHasHumanOpponent(room, bot) ||
      bot.botWitnessEvidenceKind !== "observed-kill-burst-exceeds-attacker-count") return false;
  const target = botKnownAttackerEvidence(room, bot, timestamp);
  if (!target || !botCanDirectlyObservePlayer(room, bot, target)) return false;
  if (actionBlockedUntil(bot) > timestamp) return false;
  if (runBotCombatPlanner(room, bot, target, timestamp)) return true;
  if (distance(bot, target) > room.settings.killRange) {
    moveBotToward(room, bot, target);
    return true;
  }
  // Certainty grants no weapon, ability, aim result or combat permission.
  return false;
}

function runPlayingBots(room) {
  const timestamp = now();
  const map = getMap(room);
  // A normal generated-offline match can contain seven maximum-strength Bots.
  // Running every due full-repertoire planner synchronously in the same 250ms
  // callback starves `/api/state`: the client then keeps rendering the opening
  // barrier timestamp and unchanged spawn positions even though wall time has
  // advanced. Process exactly one oldest-due Bot per authoritative tick. Bots
  // left due retain their original deadline, so the next tick selects them in
  // stable deadline/id order and no participant can be starved.
  for (const bot of room.players.values()) if (bot.isBot) syncBotTacticalMode(room, bot, timestamp);
  const scheduledBot = nextDuePlayingBot(room, timestamp);
  if (!scheduledBot) return;
  for (const bot of room.players.values()) {
    if (bot !== scheduledBot) continue;
    // Keep the planner's legal decision cadence on the same Bot-only clock as
    // movement and Bot-owned cooldowns. The one-owner scheduler still
    // preserves stable ordering and prevents a dead spectator room from
    // double-settling any action.
    bot.nextBotActionAt = timestamp + Math.max(1, Math.floor(BOT_TICK_MS / botOperationalTimeScale(room)) - 1);
    const maximumStrength = botHasHumanOpponent(room, bot);
    const attackerUrgency = attackerBotKillUrgencyState(room, bot, timestamp);

    // A Bot that has accepted a radioactive-container throw owns no escape
    // movement transaction; remain at the preflight-verified safe source
    // position until the field expires rather than resuming a chase into it.
    if (Number(bot.botHazardAvoidUntil) > timestamp) {
      stopBotForInteraction(bot, timestamp);
      continue;
    }

    if (runCpuStage2Script(room, bot, timestamp)) continue;
    if (runCpuGravityScript(room, bot, timestamp)) continue;

    if (room.soloMission?.id === "emp" && bot.alive) {
      bot.vx = 0;
      bot.vy = 0;
      bot.movementMode = "idle";
      if (bot.empReadyAt <= timestamp) {
        try {
          activateEmp(room, bot, Math.floor(timestamp / 3000) % 2 ? "negative" : "positive");
          bot.empReadyAt = timestamp + 3000;
        } catch {}
      }
      continue;
    }

    if (runBotConfirmedWitnessResponse(room, bot, timestamp)) continue;
    if (runBotWitnessCaution(room, bot, timestamp)) continue;
    if (!attackerUrgency.urgent && runBotBodyReport(room, bot)) return;
    if (bot.alive && runBotStandFirmRetaliation(room, bot, timestamp)) continue;
    if (!attackerUrgency.urgent && bot.alive && runBotGroundItemPickup(room, bot)) continue;

    if (bot.alive) runBotClairvoyanceSearch(room, bot, timestamp);

    // Maximum-strength is faction-neutral: any bot facing a living human
    // receives the same legal-repertoire evaluator before attacker/defender
    // movement scripts.  Defender targets still come solely from evidence.
    const opponentTarget = botOpponentTarget(room, bot, timestamp);
    if (maximumStrength) {
      const plannerHandled = runBotCombatPlanner(room, bot, opponentTarget, timestamp);
      // A scheduled Bot gets one canonical navigation owner whether the
      // planner selected an ability, is waiting on a non-stationary plan, or
      // found no action at all.  This makes motion continuous rather than an
      // incidental side effect of action selection and prevents the later
      // faction branches from moving the same Bot twice.
      const navigation = runScheduledBotNavigation(room, bot, opponentTarget, timestamp);
      // During a visible protection barrier, retain a navigation-only target.
      // The planner receives only the strict legal-action target above; this
      // fallback runs only when that target is absent, so no attack, item,
      // cooldown or effect can be committed before barrier expiry.
      // During the opening barrier an Attacker Bot moves under the same
      // fake-task cover used when no hostile is visible. A direct protected
      // Defender must not turn an idle human into a role-reveal tether. The
      // barrier still blocks every combat transaction and expiry resumes the
      // ordinary visible-target pursuit path.
      const attackerOpeningCover = bot.role === "attacker" && preparationBarrierActive(room, timestamp);
      const barrierNavigation = !navigation.ownsTick && !opponentTarget && !attackerOpeningCover
        ? runScheduledBotNavigation(room, bot, botBarrierPursuitTarget(room, bot, timestamp), timestamp)
        : navigation;
      if (plannerHandled || barrierNavigation.ownsTick) continue;
    }

    // Generic one-at-a-time Renki is a fallback.  It must not pre-empt a
    // maximum-strength setup such as Accelerate -> server-observed tenfold
    // Renki -> Heart Transfer.
    // A known hostile is a higher-priority combat fact than discretionary
    // Renki.  The old unconditional refill branch re-entered meditation every
    // tick before the Attacker pursuit branch, continually extending the
    // action block and leaving the Bot motionless even though its target was
    // still directly observable.  Retain mana recovery while searching, but
    // never let it pre-empt an evidence-backed chase.
    // An enemy Defender without public combat evidence has a real objective
    // route.  Do not repeatedly start optional Renki at spawn and starve that
    // route forever; its later canonical objective planner owns movement
    // and may still choose a stationary interaction once it reaches a legal
    // station.  Attackers and evidence-backed combat keep the existing
    // recovery-before-search behaviour.
    const enemyDefenderObjectivePending =
      bot.role === "defender" &&
      botIsEnemyOfSoleHuman(room, bot) &&
      !opponentTarget;
    // A Defender who shares the human's faction has no task route by
    // contract.  Its patrol/support loop is therefore its non-combat
    // objective, not idle time in which optional Renki may repeatedly start
    // a 35-second stationary focus.  Once its MP falls below an ability
    // target, the old generic fallback won every later tick and left the
    // allied Defender standing permanently (or until a coincidental enemy
    // appeared).  Preserve Renki for actual combat/setup decisions, but keep
    // the no-task patrol route moving while it has no public hostile evidence.
    const friendlyDefenderPatrolPending =
      bot.role === "defender" &&
      botSharesTeamWithHuman(room, bot) &&
      !opponentTarget;
    // A Bot facing a living human must keep searching, patrolling, pursuing a
    // public waypoint, or entering its faction objective even when a barrier
    // temporarily removes that human from the legal attack-target set.  The
    // old `!opponentTarget` guard treated the opening shield as "nothing to
    // do", started the 35-second Renki focus at spawn, and left the Bot
    // motionless long after the 1.5/5-second barrier had released.  Explicit
    // combat plans may still choose Renki as a deliberate setup; only this
    // discretionary fallback yields while a human opponent exists.
    if (
      !attackerUrgency.urgent &&
      bot.alive &&
      !maximumStrength &&
      !opponentTarget &&
      !enemyDefenderObjectivePending &&
      !friendlyDefenderPatrolPending &&
      refillBotMana(room, bot)
    ) continue;

    if (bot.role === "attacker" && bot.alive) {
    if (bot.special === "alchemist" && isRational(bot) && (bot.stamina < MAX_STAMINA || bot.substitutionCharges < 1)) {
        try { useAlchemy(room, bot, bot.substitutionCharges < 1 ? "substitution" : "stamina"); } catch {}
      }
      // Footsteps intentionally expose only an anonymous position.  When this Bot
      // shares the human Attacker faction, that signal cannot distinguish its ally
      // from an enemy, so it must not become a human-follow tether.  Combat targets
      // still come from preferredDefenderTarget; the ordinary patrol/objective fallback
      // below remains available when no visible hostile exists.
      const heardWaypoint = botSharesTeamWithHuman(room, bot)
        ? null
        : heardMovementWaypoint(room, bot, timestamp);
      const target = preferredDefenderTarget(room, bot, timestamp);
      if (runBotAttackerDeception(room, bot, map, target, timestamp)) continue;
      if (bot.gunFiring && (!target || distance(bot, target) > gunnerWeaponFor(bot).range)) stopGunnerFire(room, bot, { reason: "対象喪失" });
      if (target && distance(bot, target) <= EMP_RANGE && bot.empReadyAt <= timestamp && (maximumStrength || Math.random() < 0.08)) {
        try {
          rememberBotKillDecision(room, bot, target, {
            code: "observable-target-in-emp-range",
            actionLabel: "EMP",
            reasons: ["直接観測または千里眼の観測記憶上の対象がEMP有効範囲内に入り、自分のEMPが使用可能"]
          }, timestamp);
          activateEmp(room, bot);
        } catch {}
      }
      const targetDistance = target ? distance(bot, target) : Infinity;
      const killOpportunity = botKillOpportunityProfile(room, bot, target);
      if (
        target &&
        bot.special === "teleport" &&
        bot.teleportReadyAt <= timestamp &&
        Number(bot.mana) >= HEART_TELEPORT_MANA_COST &&
        (attackerUrgency.urgent || killOpportunity.hidden || killOpportunity.isolated)
      ) {
        try {
          rememberBotKillDecision(room, bot, target, {
            code: "observable-target-heart-teleport-opportunity",
            actionLabel: "心臓転移",
            reasons: [
              attackerUrgency.urgent
                ? "公開ATEで対象側の善への進行脅威を確認"
                : killOpportunity.hidden
                  ? "自分の視界内に攻撃現場を見届ける第三者を確認できない"
                  : "自分の視界内で対象が孤立",
              "心臓転移に必要なMPとクールタイム条件を満たした"
            ]
          }, timestamp);
          teleportPlayer(room, bot, undefined, undefined, target.id, "heart");
          continue;
        } catch {}
      }
      const botGunnerWeapon = target && bot.special === "gunner"
        ? selectBotGunnerWeapon(bot, targetDistance, maximumStrength)
        : null;
      if (target && bot.special === "gunner" && !botGunnerWeapon && bot.gunnerReloadUntil <= timestamp) {
        try { reloadGunner(room, bot); } catch {}
      }
      if (
        target &&
        bot.special === "gunner" &&
        botGunnerWeapon &&
        bot.gunReadyAt <= timestamp &&
        targetDistance <= botGunnerWeapon.range &&
        (() => {
          const dx = target.x - bot.x;
          const dy = target.y - bot.y;
          const length = Math.hypot(dx, dy) || 1;
          return clearShotPath(room, bot, target, dx / length, dy / length);
        })()
      ) {
        try {
          rememberBotKillDecision(room, bot, target, {
            code: "observable-target-clear-gun-line",
            actionLabel: `${botGunnerWeapon.name}射撃`,
            reasons: [
              "対象が選択中の銃の射程内に入り、遮蔽物のない射線を確認",
              "弾薬と射撃クールタイムの条件を満たした"
            ]
          }, timestamp);
          shootGunner(room, bot, target.x - bot.x, target.y - bot.y, "start", 0, "", true);
        } catch {}
      } else if (bot.aimTargetId) {
        stopBotForInteraction(bot, timestamp);
      } else if (
        target &&
        distance(bot, target) <= Math.max(72, room.settings.killRange * 0.58) &&
        bot.killReadyAt <= timestamp &&
        !bot.aimTargetId
      ) {
        try {
          rememberBotKillDecision(room, bot, target, {
            code: "observable-target-ninjutsu-range",
            actionLabel: ninjutsuEliminationProfile(bot).attackLabel,
            reasons: ["観測記憶上の対象が忍殺の開始距離に入り、キルクールタイムが完了"]
          }, timestamp);
          startNinjutsu(room, bot, target.id);
        } catch {}
      } else if (target) {
        moveBotToward(room, bot, target);
      } else {
        if (heardWaypoint) {
          moveBotToward(room, bot, heardWaypoint);
        } else {
          const patrol = map.stations[(Math.floor(timestamp / 2500) + Number.parseInt(bot.id.replace(/\D/g, "") || "0", 10)) % map.stations.length];
          if (patrol) moveBotToward(room, bot, patrol);
        }
      }
      continue;
    }

    if (bot.role !== "defender" || bot.ejected) continue;

    if (bot.alive) {
      const nearbyAttacker = botKnownAttackerEvidence(room, bot, timestamp);
      if (bot.special === "flora" && (bot.bodyHits > 0 || bot.overheal < 1)) {
        try { healFlora(room, bot); } catch {}
      }
      runBotDefenseDecision(room, bot, nearbyAttacker, timestamp);
    }

    const defenderEvidenceTarget = botKnownAttackerEvidence(room, bot, timestamp);
    if (
      defenderEvidenceTarget &&
      defenderBotOwnsPursuitSlot(room, bot, defenderEvidenceTarget, timestamp)
    ) {
      moveBotToward(room, bot, defenderEvidenceTarget);
      continue;
    }

    if (runFriendlyDefenderPatrol(room, bot, map)) continue;

    runEnemyDefenderTask(room, bot, map, timestamp);
  }
}

setInterval(botTick, BOT_TICK_MS);
setInterval(pushRealtimeStates, REALTIME_STATE_INTERVAL_MS);

Promise.allSettled([hydrateCheckpointArchive(), hydratePlayerProfiles()]).finally(() => {
  server.listen(PORT, () => {
    console.log(`Defenders vs Attackers server: http://localhost:${PORT}`);
  });
});

function offlineApiRequest(pathname, body = {}) {
  return new Promise((resolve) => {
    const text = JSON.stringify(body || {});
    let status = 200;
    const req = {
      method: "POST",
      url: pathname,
      headers: { host: "offline.local" },
      socket: { remoteAddress: body._offlineDeveloper ? "127.0.0.1" : `offline:${String(body.clientId || "anonymous").slice(0, 96)}` },
      destroyed: false,
      destroy() { this.destroyed = true; },
      on(event, callback) {
        if (event === "data") callback(text);
        else if (event === "end") queueMicrotask(callback);
        return this;
      }
    };
    const res = {
      setHeader() {},
      writeHead(nextStatus) { status = Number(nextStatus) || 200; },
      end(payloadText = "") {
        let payload;
        try { payload = payloadText ? JSON.parse(payloadText) : {}; }
        catch { payload = { ok: false, error: "offline-response-parse-failed" }; }
        payload.offline = true;
        payload.status = status;
        resolve(payload);
      }
    };
    Promise.resolve(handleApi(req, res)).catch((error) => {
      res.writeHead(error instanceof ApiError ? error.status : 500);
      res.end(JSON.stringify({ ok: false, error: error?.message || "offline-request-failed" }));
    });
  });
}
globalThis.DVAOfflineMainThread = Object.freeze({
  version: "fire-e-causal-v918",
  request(pathname, body = {}) {
    return offlineApiRequest(String(pathname || "/"), body || {});
  }
});
})();
