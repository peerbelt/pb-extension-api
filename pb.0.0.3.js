var pbAPI = new (function(){
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function(c) {
            if (typeof c != "function") { throw new TypeError(); }
            var l = this.length, ctx = arguments[1];
            for (var i = 0; i < l; i++) {
                if (i in this) { c.call(ctx, this[i], i, this); } } } }
    if ( !window.sinkEvent ) { 
        if (!window.addEventListener) {
            window.sinkEvent = function (el, type, listener, useCapture) {
                el.attachEvent('on' + type, function() { listener(event) } ); } } 
        else {
            window.sinkEvent = function (el, type, listener, useCapture) {
                el.addEventListener( type, listener, useCapture ); } } }
    var prerequisites = new (function ensurePrerequisites() {
        var self = this; var c = [];
        if (!window["JSON"]) {
            var p, s = document.createElement("SCRIPT");
            s.src = "http://www.peerbelt.com/api/json2.min.js";
            s = (p=document.getElementsByTagName("HEAD")[0]).insertBefore(s,((p=p.childNodes).length)?p[0]:null); 
            sinkEvent(s, "readystatechange", function(){
                if (self.loaded()) { 
                    c.forEach(function(e){e();}); } }, false ); }
        self.loaded = function(){ return !!window["JSON"]; };
        self.onload = function(cb){
            if (cb) {c.push(cb);} } 
        return self; } )();
    var timerRelease = function(t){
        if (t) { window.clearTimeout(t); t = null; }; };
    var callAsyncWithDelay = function(){
        if ( arguments.length < 2 ) throw "Delay + one argument needed";
        var a = Array.prototype.slice.call(arguments);
        var d = a.shift(), r, t = window.setTimeout( function(){
                timerRelease(t);
                r = (a.shift())(a); }, d ); 
        return {"cancel":function(){var r = !!t; timerRelease(t); return r; }, 
                "result":function(){return r;} }; };
    var callAsync = function() {
        if ( arguments.length < 1 ) throw "At least one argument needed";
        var a = Array.prototype.slice.call(arguments); a.unshift(1);
        return callAsyncWithDelay.apply(this, a); }
    if ( !Object.hasOwnProperty ) { // not exactly the same, but still something in IE
        Object.prototype.hasOwnProperty = function(n){
            if (!n) { return false; }
            for (var p in this){
                if (p===n){ return true; } } } }
    // different communication mechanism depending on browser type. as usual, IE is on its own
    var pbCtor = ( /\bMSIE\b/gi.test(window.navigator.userAgent) ) ?
        function(cb, er) {
            var proxyId = "__pb_channel", e = window[proxyId], t = null;
            var self = this;
            var init = ( function(probe, count) {
		var pinned = false; try{ pinned = window.external.msIsSiteMode(); } catch(x) { }
                return function(a) {
                        if ( e = window[proxyId]) { if (cb) { cb(true); } return; }
			if ( pinned || ( count == 0 ) ) {
				// one last attempt to initialize, though with limited functionality
				try { e = new ActiveXObject("PeerBeltBHO.ApiChannel"); } catch (x) { }
				if (cb){ cb(((e)?true:false)); } return; } count-=1;
                        callAsyncWithDelay(probe, function(){ init(probe,count); } );
                    } } )( 200, 10 );
            self.release = function(){ 
                if ( t ) { t.cancel(); t = null; } };
            self.get = function() {
                var a = Array.prototype.slice.call(arguments);
                if (a.length==0) { return undefined; }
                return e.get(a); };
            callAsync(init);
            return self;
        }:
        function(cb) {
            var self = this;
            var e = document.createElement("EMBED");
            e.type = "application/peerbelt-indigo-npapi";
            e.id = "__pb_print";
            e.style["witdh"] = e.style["height"] = "1px";
            e.style["opacity"] = 0.001; e.style["visibility"] = "hidden";
            e = document.body.appendChild(e);
            self.release = function() {
                document.body.removeChild( e ); e = null; };
            self.get = function() {
                var a = Array.prototype.slice.call(arguments);
                if (a.length==0) { return undefined; }
                if (a.length==1) { return e[a[0]];}
                return e[a.shift()].apply(e,a); };
            if ( cb ) { callAsync(cb, self ) };
            return self; 
        };

    var self = this;
    var pb = null;
    var history = function(filter){
        if (!pb) { throw "uninitialized"; }
        return pb.get('launchView', 1, true, filter); }
    var hook = (function(){
        var hooked = false;
            return function(cb) {
                if (pb||self.hasOwnProperty("initialized")){ return; }
                if ( (!document.body) || (!prerequisites.loaded()) ){ 
                    if (!hooked) { 
                        sinkEvent(document,"readystatechange",function(){hook(cb);},false); 
                        prerequisites.onload(function(){hook(cb);});
                        hooked = true; } 
                    return; }
                self.initialized = false;
                pb = new pbCtor( function() {
                    try { 
                        // if this goes through the plugin must be running
                        if (pb.get('inBackground') != undefined) {
                            // continue adding peer belt methods to work with
                            self.initialized = true;
                            self.history = history; } }
                    catch(ex){ }
                    if ( ( !self.initialized ) && pb ) {
                        pb.release(); pb = null; }
                    if (cb) { cb( !( pb==null ) ); }
                } ); }; })();
    self.init = function(manifest, callback) {
        hook(callback); };
    return self;
    })();
