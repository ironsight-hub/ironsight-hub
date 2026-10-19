// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = import.meta.require;

// mini-services/ironsight-room/node_modules/negotiator/lib/charset.js
var require_charset = __commonJS((exports, module) => {
  module.exports = preferredCharsets;
  module.exports.preferredCharsets = preferredCharsets;
  var simpleCharsetRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/;
  function parseAcceptCharset(accept) {
    var accepts = accept.split(",");
    for (var i = 0, j = 0;i < accepts.length; i++) {
      var charset = parseCharset(accepts[i].trim(), i);
      if (charset) {
        accepts[j++] = charset;
      }
    }
    accepts.length = j;
    return accepts;
  }
  function parseCharset(str, i) {
    var match = simpleCharsetRegExp.exec(str);
    if (!match)
      return null;
    var charset = match[1];
    var q = 1;
    if (match[2]) {
      var params = match[2].split(";");
      for (var j = 0;j < params.length; j++) {
        var p = params[j].trim().split("=");
        if (p[0] === "q") {
          q = parseFloat(p[1]);
          break;
        }
      }
    }
    return {
      charset,
      q,
      i
    };
  }
  function getCharsetPriority(charset, accepted, index) {
    var priority = { o: -1, q: 0, s: 0 };
    for (var i = 0;i < accepted.length; i++) {
      var spec = specify(charset, accepted[i], index);
      if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
        priority = spec;
      }
    }
    return priority;
  }
  function specify(charset, spec, index) {
    var s = 0;
    if (spec.charset.toLowerCase() === charset.toLowerCase()) {
      s |= 1;
    } else if (spec.charset !== "*") {
      return null;
    }
    return {
      i: index,
      o: spec.i,
      q: spec.q,
      s
    };
  }
  function preferredCharsets(accept, provided) {
    var accepts = parseAcceptCharset(accept === undefined ? "*" : accept || "");
    if (!provided) {
      return accepts.filter(isQuality).sort(compareSpecs).map(getFullCharset);
    }
    var priorities = provided.map(function getPriority(type, index) {
      return getCharsetPriority(type, accepts, index);
    });
    return priorities.filter(isQuality).sort(compareSpecs).map(function getCharset(priority) {
      return provided[priorities.indexOf(priority)];
    });
  }
  function compareSpecs(a, b) {
    return b.q - a.q || b.s - a.s || a.o - b.o || a.i - b.i || 0;
  }
  function getFullCharset(spec) {
    return spec.charset;
  }
  function isQuality(spec) {
    return spec.q > 0;
  }
});

// mini-services/ironsight-room/node_modules/negotiator/lib/encoding.js
var require_encoding = __commonJS((exports, module) => {
  module.exports = preferredEncodings;
  module.exports.preferredEncodings = preferredEncodings;
  var simpleEncodingRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/;
  function parseAcceptEncoding(accept) {
    var accepts = accept.split(",");
    var hasIdentity = false;
    var minQuality = 1;
    for (var i = 0, j = 0;i < accepts.length; i++) {
      var encoding = parseEncoding(accepts[i].trim(), i);
      if (encoding) {
        accepts[j++] = encoding;
        hasIdentity = hasIdentity || specify("identity", encoding);
        minQuality = Math.min(minQuality, encoding.q || 1);
      }
    }
    if (!hasIdentity) {
      accepts[j++] = {
        encoding: "identity",
        q: minQuality,
        i
      };
    }
    accepts.length = j;
    return accepts;
  }
  function parseEncoding(str, i) {
    var match = simpleEncodingRegExp.exec(str);
    if (!match)
      return null;
    var encoding = match[1];
    var q = 1;
    if (match[2]) {
      var params = match[2].split(";");
      for (var j = 0;j < params.length; j++) {
        var p = params[j].trim().split("=");
        if (p[0] === "q") {
          q = parseFloat(p[1]);
          break;
        }
      }
    }
    return {
      encoding,
      q,
      i
    };
  }
  function getEncodingPriority(encoding, accepted, index) {
    var priority = { o: -1, q: 0, s: 0 };
    for (var i = 0;i < accepted.length; i++) {
      var spec = specify(encoding, accepted[i], index);
      if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
        priority = spec;
      }
    }
    return priority;
  }
  function specify(encoding, spec, index) {
    var s = 0;
    if (spec.encoding.toLowerCase() === encoding.toLowerCase()) {
      s |= 1;
    } else if (spec.encoding !== "*") {
      return null;
    }
    return {
      i: index,
      o: spec.i,
      q: spec.q,
      s
    };
  }
  function preferredEncodings(accept, provided) {
    var accepts = parseAcceptEncoding(accept || "");
    if (!provided) {
      return accepts.filter(isQuality).sort(compareSpecs).map(getFullEncoding);
    }
    var priorities = provided.map(function getPriority(type, index) {
      return getEncodingPriority(type, accepts, index);
    });
    return priorities.filter(isQuality).sort(compareSpecs).map(function getEncoding(priority) {
      return provided[priorities.indexOf(priority)];
    });
  }
  function compareSpecs(a, b) {
    return b.q - a.q || b.s - a.s || a.o - b.o || a.i - b.i || 0;
  }
  function getFullEncoding(spec) {
    return spec.encoding;
  }
  function isQuality(spec) {
    return spec.q > 0;
  }
});

// mini-services/ironsight-room/node_modules/negotiator/lib/language.js
var require_language = __commonJS((exports, module) => {
  module.exports = preferredLanguages;
  module.exports.preferredLanguages = preferredLanguages;
  var simpleLanguageRegExp = /^\s*([^\s\-;]+)(?:-([^\s;]+))?\s*(?:;(.*))?$/;
  function parseAcceptLanguage(accept) {
    var accepts = accept.split(",");
    for (var i = 0, j = 0;i < accepts.length; i++) {
      var language = parseLanguage(accepts[i].trim(), i);
      if (language) {
        accepts[j++] = language;
      }
    }
    accepts.length = j;
    return accepts;
  }
  function parseLanguage(str, i) {
    var match = simpleLanguageRegExp.exec(str);
    if (!match)
      return null;
    var prefix = match[1];
    var suffix = match[2];
    var full = prefix;
    if (suffix)
      full += "-" + suffix;
    var q = 1;
    if (match[3]) {
      var params = match[3].split(";");
      for (var j = 0;j < params.length; j++) {
        var p = params[j].split("=");
        if (p[0] === "q")
          q = parseFloat(p[1]);
      }
    }
    return {
      prefix,
      suffix,
      q,
      i,
      full
    };
  }
  function getLanguagePriority(language, accepted, index) {
    var priority = { o: -1, q: 0, s: 0 };
    for (var i = 0;i < accepted.length; i++) {
      var spec = specify(language, accepted[i], index);
      if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
        priority = spec;
      }
    }
    return priority;
  }
  function specify(language, spec, index) {
    var p = parseLanguage(language);
    if (!p)
      return null;
    var s = 0;
    if (spec.full.toLowerCase() === p.full.toLowerCase()) {
      s |= 4;
    } else if (spec.prefix.toLowerCase() === p.full.toLowerCase()) {
      s |= 2;
    } else if (spec.full.toLowerCase() === p.prefix.toLowerCase()) {
      s |= 1;
    } else if (spec.full !== "*") {
      return null;
    }
    return {
      i: index,
      o: spec.i,
      q: spec.q,
      s
    };
  }
  function preferredLanguages(accept, provided) {
    var accepts = parseAcceptLanguage(accept === undefined ? "*" : accept || "");
    if (!provided) {
      return accepts.filter(isQuality).sort(compareSpecs).map(getFullLanguage);
    }
    var priorities = provided.map(function getPriority(type, index) {
      return getLanguagePriority(type, accepts, index);
    });
    return priorities.filter(isQuality).sort(compareSpecs).map(function getLanguage(priority) {
      return provided[priorities.indexOf(priority)];
    });
  }
  function compareSpecs(a, b) {
    return b.q - a.q || b.s - a.s || a.o - b.o || a.i - b.i || 0;
  }
  function getFullLanguage(spec) {
    return spec.full;
  }
  function isQuality(spec) {
    return spec.q > 0;
  }
});

// mini-services/ironsight-room/node_modules/negotiator/lib/mediaType.js
var require_mediaType = __commonJS((exports, module) => {
  module.exports = preferredMediaTypes;
  module.exports.preferredMediaTypes = preferredMediaTypes;
  var simpleMediaTypeRegExp = /^\s*([^\s\/;]+)\/([^;\s]+)\s*(?:;(.*))?$/;
  function parseAccept(accept) {
    var accepts = splitMediaTypes(accept);
    for (var i = 0, j = 0;i < accepts.length; i++) {
      var mediaType = parseMediaType(accepts[i].trim(), i);
      if (mediaType) {
        accepts[j++] = mediaType;
      }
    }
    accepts.length = j;
    return accepts;
  }
  function parseMediaType(str, i) {
    var match = simpleMediaTypeRegExp.exec(str);
    if (!match)
      return null;
    var params = Object.create(null);
    var q = 1;
    var subtype = match[2];
    var type = match[1];
    if (match[3]) {
      var kvps = splitParameters(match[3]).map(splitKeyValuePair);
      for (var j = 0;j < kvps.length; j++) {
        var pair = kvps[j];
        var key = pair[0].toLowerCase();
        var val = pair[1];
        var value = val && val[0] === '"' && val[val.length - 1] === '"' ? val.substr(1, val.length - 2) : val;
        if (key === "q") {
          q = parseFloat(value);
          break;
        }
        params[key] = value;
      }
    }
    return {
      type,
      subtype,
      params,
      q,
      i
    };
  }
  function getMediaTypePriority(type, accepted, index) {
    var priority = { o: -1, q: 0, s: 0 };
    for (var i = 0;i < accepted.length; i++) {
      var spec = specify(type, accepted[i], index);
      if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
        priority = spec;
      }
    }
    return priority;
  }
  function specify(type, spec, index) {
    var p = parseMediaType(type);
    var s = 0;
    if (!p) {
      return null;
    }
    if (spec.type.toLowerCase() == p.type.toLowerCase()) {
      s |= 4;
    } else if (spec.type != "*") {
      return null;
    }
    if (spec.subtype.toLowerCase() == p.subtype.toLowerCase()) {
      s |= 2;
    } else if (spec.subtype != "*") {
      return null;
    }
    var keys = Object.keys(spec.params);
    if (keys.length > 0) {
      if (keys.every(function(k) {
        return spec.params[k] == "*" || (spec.params[k] || "").toLowerCase() == (p.params[k] || "").toLowerCase();
      })) {
        s |= 1;
      } else {
        return null;
      }
    }
    return {
      i: index,
      o: spec.i,
      q: spec.q,
      s
    };
  }
  function preferredMediaTypes(accept, provided) {
    var accepts = parseAccept(accept === undefined ? "*/*" : accept || "");
    if (!provided) {
      return accepts.filter(isQuality).sort(compareSpecs).map(getFullType);
    }
    var priorities = provided.map(function getPriority(type, index) {
      return getMediaTypePriority(type, accepts, index);
    });
    return priorities.filter(isQuality).sort(compareSpecs).map(function getType(priority) {
      return provided[priorities.indexOf(priority)];
    });
  }
  function compareSpecs(a, b) {
    return b.q - a.q || b.s - a.s || a.o - b.o || a.i - b.i || 0;
  }
  function getFullType(spec) {
    return spec.type + "/" + spec.subtype;
  }
  function isQuality(spec) {
    return spec.q > 0;
  }
  function quoteCount(string) {
    var count = 0;
    var index = 0;
    while ((index = string.indexOf('"', index)) !== -1) {
      count++;
      index++;
    }
    return count;
  }
  function splitKeyValuePair(str) {
    var index = str.indexOf("=");
    var key;
    var val;
    if (index === -1) {
      key = str;
    } else {
      key = str.substr(0, index);
      val = str.substr(index + 1);
    }
    return [key, val];
  }
  function splitMediaTypes(accept) {
    var accepts = accept.split(",");
    for (var i = 1, j = 0;i < accepts.length; i++) {
      if (quoteCount(accepts[j]) % 2 == 0) {
        accepts[++j] = accepts[i];
      } else {
        accepts[j] += "," + accepts[i];
      }
    }
    accepts.length = j + 1;
    return accepts;
  }
  function splitParameters(str) {
    var parameters = str.split(";");
    for (var i = 1, j = 0;i < parameters.length; i++) {
      if (quoteCount(parameters[j]) % 2 == 0) {
        parameters[++j] = parameters[i];
      } else {
        parameters[j] += ";" + parameters[i];
      }
    }
    parameters.length = j + 1;
    for (var i = 0;i < parameters.length; i++) {
      parameters[i] = parameters[i].trim();
    }
    return parameters;
  }
});

// mini-services/ironsight-room/node_modules/negotiator/index.js
var require_negotiator = __commonJS((exports, module) => {
  /*!
   * negotiator
   * Copyright(c) 2012 Federico Romero
   * Copyright(c) 2012-2014 Isaac Z. Schlueter
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   */
  var preferredCharsets = require_charset();
  var preferredEncodings = require_encoding();
  var preferredLanguages = require_language();
  var preferredMediaTypes = require_mediaType();
  module.exports = Negotiator;
  module.exports.Negotiator = Negotiator;
  function Negotiator(request) {
    if (!(this instanceof Negotiator)) {
      return new Negotiator(request);
    }
    this.request = request;
  }
  Negotiator.prototype.charset = function charset(available) {
    var set = this.charsets(available);
    return set && set[0];
  };
  Negotiator.prototype.charsets = function charsets(available) {
    return preferredCharsets(this.request.headers["accept-charset"], available);
  };
  Negotiator.prototype.encoding = function encoding(available) {
    var set = this.encodings(available);
    return set && set[0];
  };
  Negotiator.prototype.encodings = function encodings(available) {
    return preferredEncodings(this.request.headers["accept-encoding"], available);
  };
  Negotiator.prototype.language = function language(available) {
    var set = this.languages(available);
    return set && set[0];
  };
  Negotiator.prototype.languages = function languages(available) {
    return preferredLanguages(this.request.headers["accept-language"], available);
  };
  Negotiator.prototype.mediaType = function mediaType(available) {
    var set = this.mediaTypes(available);
    return set && set[0];
  };
  Negotiator.prototype.mediaTypes = function mediaTypes(available) {
    return preferredMediaTypes(this.request.headers.accept, available);
  };
  Negotiator.prototype.preferredCharset = Negotiator.prototype.charset;
  Negotiator.prototype.preferredCharsets = Negotiator.prototype.charsets;
  Negotiator.prototype.preferredEncoding = Negotiator.prototype.encoding;
  Negotiator.prototype.preferredEncodings = Negotiator.prototype.encodings;
  Negotiator.prototype.preferredLanguage = Negotiator.prototype.language;
  Negotiator.prototype.preferredLanguages = Negotiator.prototype.languages;
  Negotiator.prototype.preferredMediaType = Negotiator.prototype.mediaType;
  Negotiator.prototype.preferredMediaTypes = Negotiator.prototype.mediaTypes;
});

// mini-services/ironsight-room/node_modules/mime-db/db.json
var require_db = __commonJS((exports, module) => {
  module.exports = {
    "application/1d-interleaved-parityfec": {
      source: "iana"
    },
    "application/3gpdash-qoe-report+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/3gpp-ims+xml": {
      source: "iana",
      compressible: true
    },
    "application/3gpphal+json": {
      source: "iana",
      compressible: true
    },
    "application/3gpphalforms+json": {
      source: "iana",
      compressible: true
    },
    "application/a2l": {
      source: "iana"
    },
    "application/ace+cbor": {
      source: "iana"
    },
    "application/activemessage": {
      source: "iana"
    },
    "application/activity+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-costmap+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-costmapfilter+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-directory+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-endpointcost+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-endpointcostparams+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-endpointprop+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-endpointpropparams+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-error+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-networkmap+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-networkmapfilter+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-updatestreamcontrol+json": {
      source: "iana",
      compressible: true
    },
    "application/alto-updatestreamparams+json": {
      source: "iana",
      compressible: true
    },
    "application/aml": {
      source: "iana"
    },
    "application/andrew-inset": {
      source: "iana",
      extensions: ["ez"]
    },
    "application/applefile": {
      source: "iana"
    },
    "application/applixware": {
      source: "apache",
      extensions: ["aw"]
    },
    "application/at+jwt": {
      source: "iana"
    },
    "application/atf": {
      source: "iana"
    },
    "application/atfx": {
      source: "iana"
    },
    "application/atom+xml": {
      source: "iana",
      compressible: true,
      extensions: ["atom"]
    },
    "application/atomcat+xml": {
      source: "iana",
      compressible: true,
      extensions: ["atomcat"]
    },
    "application/atomdeleted+xml": {
      source: "iana",
      compressible: true,
      extensions: ["atomdeleted"]
    },
    "application/atomicmail": {
      source: "iana"
    },
    "application/atomsvc+xml": {
      source: "iana",
      compressible: true,
      extensions: ["atomsvc"]
    },
    "application/atsc-dwd+xml": {
      source: "iana",
      compressible: true,
      extensions: ["dwd"]
    },
    "application/atsc-dynamic-event-message": {
      source: "iana"
    },
    "application/atsc-held+xml": {
      source: "iana",
      compressible: true,
      extensions: ["held"]
    },
    "application/atsc-rdt+json": {
      source: "iana",
      compressible: true
    },
    "application/atsc-rsat+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rsat"]
    },
    "application/atxml": {
      source: "iana"
    },
    "application/auth-policy+xml": {
      source: "iana",
      compressible: true
    },
    "application/bacnet-xdd+zip": {
      source: "iana",
      compressible: false
    },
    "application/batch-smtp": {
      source: "iana"
    },
    "application/bdoc": {
      compressible: false,
      extensions: ["bdoc"]
    },
    "application/beep+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/calendar+json": {
      source: "iana",
      compressible: true
    },
    "application/calendar+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xcs"]
    },
    "application/call-completion": {
      source: "iana"
    },
    "application/cals-1840": {
      source: "iana"
    },
    "application/captive+json": {
      source: "iana",
      compressible: true
    },
    "application/cbor": {
      source: "iana"
    },
    "application/cbor-seq": {
      source: "iana"
    },
    "application/cccex": {
      source: "iana"
    },
    "application/ccmp+xml": {
      source: "iana",
      compressible: true
    },
    "application/ccxml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["ccxml"]
    },
    "application/cdfx+xml": {
      source: "iana",
      compressible: true,
      extensions: ["cdfx"]
    },
    "application/cdmi-capability": {
      source: "iana",
      extensions: ["cdmia"]
    },
    "application/cdmi-container": {
      source: "iana",
      extensions: ["cdmic"]
    },
    "application/cdmi-domain": {
      source: "iana",
      extensions: ["cdmid"]
    },
    "application/cdmi-object": {
      source: "iana",
      extensions: ["cdmio"]
    },
    "application/cdmi-queue": {
      source: "iana",
      extensions: ["cdmiq"]
    },
    "application/cdni": {
      source: "iana"
    },
    "application/cea": {
      source: "iana"
    },
    "application/cea-2018+xml": {
      source: "iana",
      compressible: true
    },
    "application/cellml+xml": {
      source: "iana",
      compressible: true
    },
    "application/cfw": {
      source: "iana"
    },
    "application/city+json": {
      source: "iana",
      compressible: true
    },
    "application/clr": {
      source: "iana"
    },
    "application/clue+xml": {
      source: "iana",
      compressible: true
    },
    "application/clue_info+xml": {
      source: "iana",
      compressible: true
    },
    "application/cms": {
      source: "iana"
    },
    "application/cnrp+xml": {
      source: "iana",
      compressible: true
    },
    "application/coap-group+json": {
      source: "iana",
      compressible: true
    },
    "application/coap-payload": {
      source: "iana"
    },
    "application/commonground": {
      source: "iana"
    },
    "application/conference-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/cose": {
      source: "iana"
    },
    "application/cose-key": {
      source: "iana"
    },
    "application/cose-key-set": {
      source: "iana"
    },
    "application/cpl+xml": {
      source: "iana",
      compressible: true,
      extensions: ["cpl"]
    },
    "application/csrattrs": {
      source: "iana"
    },
    "application/csta+xml": {
      source: "iana",
      compressible: true
    },
    "application/cstadata+xml": {
      source: "iana",
      compressible: true
    },
    "application/csvm+json": {
      source: "iana",
      compressible: true
    },
    "application/cu-seeme": {
      source: "apache",
      extensions: ["cu"]
    },
    "application/cwt": {
      source: "iana"
    },
    "application/cybercash": {
      source: "iana"
    },
    "application/dart": {
      compressible: true
    },
    "application/dash+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mpd"]
    },
    "application/dash-patch+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mpp"]
    },
    "application/dashdelta": {
      source: "iana"
    },
    "application/davmount+xml": {
      source: "iana",
      compressible: true,
      extensions: ["davmount"]
    },
    "application/dca-rft": {
      source: "iana"
    },
    "application/dcd": {
      source: "iana"
    },
    "application/dec-dx": {
      source: "iana"
    },
    "application/dialog-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/dicom": {
      source: "iana"
    },
    "application/dicom+json": {
      source: "iana",
      compressible: true
    },
    "application/dicom+xml": {
      source: "iana",
      compressible: true
    },
    "application/dii": {
      source: "iana"
    },
    "application/dit": {
      source: "iana"
    },
    "application/dns": {
      source: "iana"
    },
    "application/dns+json": {
      source: "iana",
      compressible: true
    },
    "application/dns-message": {
      source: "iana"
    },
    "application/docbook+xml": {
      source: "apache",
      compressible: true,
      extensions: ["dbk"]
    },
    "application/dots+cbor": {
      source: "iana"
    },
    "application/dskpp+xml": {
      source: "iana",
      compressible: true
    },
    "application/dssc+der": {
      source: "iana",
      extensions: ["dssc"]
    },
    "application/dssc+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xdssc"]
    },
    "application/dvcs": {
      source: "iana"
    },
    "application/ecmascript": {
      source: "iana",
      compressible: true,
      extensions: ["es", "ecma"]
    },
    "application/edi-consent": {
      source: "iana"
    },
    "application/edi-x12": {
      source: "iana",
      compressible: false
    },
    "application/edifact": {
      source: "iana",
      compressible: false
    },
    "application/efi": {
      source: "iana"
    },
    "application/elm+json": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/elm+xml": {
      source: "iana",
      compressible: true
    },
    "application/emergencycalldata.cap+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/emergencycalldata.comment+xml": {
      source: "iana",
      compressible: true
    },
    "application/emergencycalldata.control+xml": {
      source: "iana",
      compressible: true
    },
    "application/emergencycalldata.deviceinfo+xml": {
      source: "iana",
      compressible: true
    },
    "application/emergencycalldata.ecall.msd": {
      source: "iana"
    },
    "application/emergencycalldata.providerinfo+xml": {
      source: "iana",
      compressible: true
    },
    "application/emergencycalldata.serviceinfo+xml": {
      source: "iana",
      compressible: true
    },
    "application/emergencycalldata.subscriberinfo+xml": {
      source: "iana",
      compressible: true
    },
    "application/emergencycalldata.veds+xml": {
      source: "iana",
      compressible: true
    },
    "application/emma+xml": {
      source: "iana",
      compressible: true,
      extensions: ["emma"]
    },
    "application/emotionml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["emotionml"]
    },
    "application/encaprtp": {
      source: "iana"
    },
    "application/epp+xml": {
      source: "iana",
      compressible: true
    },
    "application/epub+zip": {
      source: "iana",
      compressible: false,
      extensions: ["epub"]
    },
    "application/eshop": {
      source: "iana"
    },
    "application/exi": {
      source: "iana",
      extensions: ["exi"]
    },
    "application/expect-ct-report+json": {
      source: "iana",
      compressible: true
    },
    "application/express": {
      source: "iana",
      extensions: ["exp"]
    },
    "application/fastinfoset": {
      source: "iana"
    },
    "application/fastsoap": {
      source: "iana"
    },
    "application/fdt+xml": {
      source: "iana",
      compressible: true,
      extensions: ["fdt"]
    },
    "application/fhir+json": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/fhir+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/fido.trusted-apps+json": {
      compressible: true
    },
    "application/fits": {
      source: "iana"
    },
    "application/flexfec": {
      source: "iana"
    },
    "application/font-sfnt": {
      source: "iana"
    },
    "application/font-tdpfr": {
      source: "iana",
      extensions: ["pfr"]
    },
    "application/font-woff": {
      source: "iana",
      compressible: false
    },
    "application/framework-attributes+xml": {
      source: "iana",
      compressible: true
    },
    "application/geo+json": {
      source: "iana",
      compressible: true,
      extensions: ["geojson"]
    },
    "application/geo+json-seq": {
      source: "iana"
    },
    "application/geopackage+sqlite3": {
      source: "iana"
    },
    "application/geoxacml+xml": {
      source: "iana",
      compressible: true
    },
    "application/gltf-buffer": {
      source: "iana"
    },
    "application/gml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["gml"]
    },
    "application/gpx+xml": {
      source: "apache",
      compressible: true,
      extensions: ["gpx"]
    },
    "application/gxf": {
      source: "apache",
      extensions: ["gxf"]
    },
    "application/gzip": {
      source: "iana",
      compressible: false,
      extensions: ["gz"]
    },
    "application/h224": {
      source: "iana"
    },
    "application/held+xml": {
      source: "iana",
      compressible: true
    },
    "application/hjson": {
      extensions: ["hjson"]
    },
    "application/http": {
      source: "iana"
    },
    "application/hyperstudio": {
      source: "iana",
      extensions: ["stk"]
    },
    "application/ibe-key-request+xml": {
      source: "iana",
      compressible: true
    },
    "application/ibe-pkg-reply+xml": {
      source: "iana",
      compressible: true
    },
    "application/ibe-pp-data": {
      source: "iana"
    },
    "application/iges": {
      source: "iana"
    },
    "application/im-iscomposing+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/index": {
      source: "iana"
    },
    "application/index.cmd": {
      source: "iana"
    },
    "application/index.obj": {
      source: "iana"
    },
    "application/index.response": {
      source: "iana"
    },
    "application/index.vnd": {
      source: "iana"
    },
    "application/inkml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["ink", "inkml"]
    },
    "application/iotp": {
      source: "iana"
    },
    "application/ipfix": {
      source: "iana",
      extensions: ["ipfix"]
    },
    "application/ipp": {
      source: "iana"
    },
    "application/isup": {
      source: "iana"
    },
    "application/its+xml": {
      source: "iana",
      compressible: true,
      extensions: ["its"]
    },
    "application/java-archive": {
      source: "apache",
      compressible: false,
      extensions: ["jar", "war", "ear"]
    },
    "application/java-serialized-object": {
      source: "apache",
      compressible: false,
      extensions: ["ser"]
    },
    "application/java-vm": {
      source: "apache",
      compressible: false,
      extensions: ["class"]
    },
    "application/javascript": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["js", "mjs"]
    },
    "application/jf2feed+json": {
      source: "iana",
      compressible: true
    },
    "application/jose": {
      source: "iana"
    },
    "application/jose+json": {
      source: "iana",
      compressible: true
    },
    "application/jrd+json": {
      source: "iana",
      compressible: true
    },
    "application/jscalendar+json": {
      source: "iana",
      compressible: true
    },
    "application/json": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["json", "map"]
    },
    "application/json-patch+json": {
      source: "iana",
      compressible: true
    },
    "application/json-seq": {
      source: "iana"
    },
    "application/json5": {
      extensions: ["json5"]
    },
    "application/jsonml+json": {
      source: "apache",
      compressible: true,
      extensions: ["jsonml"]
    },
    "application/jwk+json": {
      source: "iana",
      compressible: true
    },
    "application/jwk-set+json": {
      source: "iana",
      compressible: true
    },
    "application/jwt": {
      source: "iana"
    },
    "application/kpml-request+xml": {
      source: "iana",
      compressible: true
    },
    "application/kpml-response+xml": {
      source: "iana",
      compressible: true
    },
    "application/ld+json": {
      source: "iana",
      compressible: true,
      extensions: ["jsonld"]
    },
    "application/lgr+xml": {
      source: "iana",
      compressible: true,
      extensions: ["lgr"]
    },
    "application/link-format": {
      source: "iana"
    },
    "application/load-control+xml": {
      source: "iana",
      compressible: true
    },
    "application/lost+xml": {
      source: "iana",
      compressible: true,
      extensions: ["lostxml"]
    },
    "application/lostsync+xml": {
      source: "iana",
      compressible: true
    },
    "application/lpf+zip": {
      source: "iana",
      compressible: false
    },
    "application/lxf": {
      source: "iana"
    },
    "application/mac-binhex40": {
      source: "iana",
      extensions: ["hqx"]
    },
    "application/mac-compactpro": {
      source: "apache",
      extensions: ["cpt"]
    },
    "application/macwriteii": {
      source: "iana"
    },
    "application/mads+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mads"]
    },
    "application/manifest+json": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["webmanifest"]
    },
    "application/marc": {
      source: "iana",
      extensions: ["mrc"]
    },
    "application/marcxml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mrcx"]
    },
    "application/mathematica": {
      source: "iana",
      extensions: ["ma", "nb", "mb"]
    },
    "application/mathml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mathml"]
    },
    "application/mathml-content+xml": {
      source: "iana",
      compressible: true
    },
    "application/mathml-presentation+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-associated-procedure-description+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-deregister+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-envelope+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-msk+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-msk-response+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-protection-description+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-reception-report+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-register+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-register-response+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-schedule+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbms-user-service-description+xml": {
      source: "iana",
      compressible: true
    },
    "application/mbox": {
      source: "iana",
      extensions: ["mbox"]
    },
    "application/media-policy-dataset+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mpf"]
    },
    "application/media_control+xml": {
      source: "iana",
      compressible: true
    },
    "application/mediaservercontrol+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mscml"]
    },
    "application/merge-patch+json": {
      source: "iana",
      compressible: true
    },
    "application/metalink+xml": {
      source: "apache",
      compressible: true,
      extensions: ["metalink"]
    },
    "application/metalink4+xml": {
      source: "iana",
      compressible: true,
      extensions: ["meta4"]
    },
    "application/mets+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mets"]
    },
    "application/mf4": {
      source: "iana"
    },
    "application/mikey": {
      source: "iana"
    },
    "application/mipc": {
      source: "iana"
    },
    "application/missing-blocks+cbor-seq": {
      source: "iana"
    },
    "application/mmt-aei+xml": {
      source: "iana",
      compressible: true,
      extensions: ["maei"]
    },
    "application/mmt-usd+xml": {
      source: "iana",
      compressible: true,
      extensions: ["musd"]
    },
    "application/mods+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mods"]
    },
    "application/moss-keys": {
      source: "iana"
    },
    "application/moss-signature": {
      source: "iana"
    },
    "application/mosskey-data": {
      source: "iana"
    },
    "application/mosskey-request": {
      source: "iana"
    },
    "application/mp21": {
      source: "iana",
      extensions: ["m21", "mp21"]
    },
    "application/mp4": {
      source: "iana",
      extensions: ["mp4s", "m4p"]
    },
    "application/mpeg4-generic": {
      source: "iana"
    },
    "application/mpeg4-iod": {
      source: "iana"
    },
    "application/mpeg4-iod-xmt": {
      source: "iana"
    },
    "application/mrb-consumer+xml": {
      source: "iana",
      compressible: true
    },
    "application/mrb-publish+xml": {
      source: "iana",
      compressible: true
    },
    "application/msc-ivr+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/msc-mixer+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/msword": {
      source: "iana",
      compressible: false,
      extensions: ["doc", "dot"]
    },
    "application/mud+json": {
      source: "iana",
      compressible: true
    },
    "application/multipart-core": {
      source: "iana"
    },
    "application/mxf": {
      source: "iana",
      extensions: ["mxf"]
    },
    "application/n-quads": {
      source: "iana",
      extensions: ["nq"]
    },
    "application/n-triples": {
      source: "iana",
      extensions: ["nt"]
    },
    "application/nasdata": {
      source: "iana"
    },
    "application/news-checkgroups": {
      source: "iana",
      charset: "US-ASCII"
    },
    "application/news-groupinfo": {
      source: "iana",
      charset: "US-ASCII"
    },
    "application/news-transmission": {
      source: "iana"
    },
    "application/nlsml+xml": {
      source: "iana",
      compressible: true
    },
    "application/node": {
      source: "iana",
      extensions: ["cjs"]
    },
    "application/nss": {
      source: "iana"
    },
    "application/oauth-authz-req+jwt": {
      source: "iana"
    },
    "application/oblivious-dns-message": {
      source: "iana"
    },
    "application/ocsp-request": {
      source: "iana"
    },
    "application/ocsp-response": {
      source: "iana"
    },
    "application/octet-stream": {
      source: "iana",
      compressible: false,
      extensions: ["bin", "dms", "lrf", "mar", "so", "dist", "distz", "pkg", "bpk", "dump", "elc", "deploy", "exe", "dll", "deb", "dmg", "iso", "img", "msi", "msp", "msm", "buffer"]
    },
    "application/oda": {
      source: "iana",
      extensions: ["oda"]
    },
    "application/odm+xml": {
      source: "iana",
      compressible: true
    },
    "application/odx": {
      source: "iana"
    },
    "application/oebps-package+xml": {
      source: "iana",
      compressible: true,
      extensions: ["opf"]
    },
    "application/ogg": {
      source: "iana",
      compressible: false,
      extensions: ["ogx"]
    },
    "application/omdoc+xml": {
      source: "apache",
      compressible: true,
      extensions: ["omdoc"]
    },
    "application/onenote": {
      source: "apache",
      extensions: ["onetoc", "onetoc2", "onetmp", "onepkg"]
    },
    "application/opc-nodeset+xml": {
      source: "iana",
      compressible: true
    },
    "application/oscore": {
      source: "iana"
    },
    "application/oxps": {
      source: "iana",
      extensions: ["oxps"]
    },
    "application/p21": {
      source: "iana"
    },
    "application/p21+zip": {
      source: "iana",
      compressible: false
    },
    "application/p2p-overlay+xml": {
      source: "iana",
      compressible: true,
      extensions: ["relo"]
    },
    "application/parityfec": {
      source: "iana"
    },
    "application/passport": {
      source: "iana"
    },
    "application/patch-ops-error+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xer"]
    },
    "application/pdf": {
      source: "iana",
      compressible: false,
      extensions: ["pdf"]
    },
    "application/pdx": {
      source: "iana"
    },
    "application/pem-certificate-chain": {
      source: "iana"
    },
    "application/pgp-encrypted": {
      source: "iana",
      compressible: false,
      extensions: ["pgp"]
    },
    "application/pgp-keys": {
      source: "iana",
      extensions: ["asc"]
    },
    "application/pgp-signature": {
      source: "iana",
      extensions: ["asc", "sig"]
    },
    "application/pics-rules": {
      source: "apache",
      extensions: ["prf"]
    },
    "application/pidf+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/pidf-diff+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/pkcs10": {
      source: "iana",
      extensions: ["p10"]
    },
    "application/pkcs12": {
      source: "iana"
    },
    "application/pkcs7-mime": {
      source: "iana",
      extensions: ["p7m", "p7c"]
    },
    "application/pkcs7-signature": {
      source: "iana",
      extensions: ["p7s"]
    },
    "application/pkcs8": {
      source: "iana",
      extensions: ["p8"]
    },
    "application/pkcs8-encrypted": {
      source: "iana"
    },
    "application/pkix-attr-cert": {
      source: "iana",
      extensions: ["ac"]
    },
    "application/pkix-cert": {
      source: "iana",
      extensions: ["cer"]
    },
    "application/pkix-crl": {
      source: "iana",
      extensions: ["crl"]
    },
    "application/pkix-pkipath": {
      source: "iana",
      extensions: ["pkipath"]
    },
    "application/pkixcmp": {
      source: "iana",
      extensions: ["pki"]
    },
    "application/pls+xml": {
      source: "iana",
      compressible: true,
      extensions: ["pls"]
    },
    "application/poc-settings+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/postscript": {
      source: "iana",
      compressible: true,
      extensions: ["ai", "eps", "ps"]
    },
    "application/ppsp-tracker+json": {
      source: "iana",
      compressible: true
    },
    "application/problem+json": {
      source: "iana",
      compressible: true
    },
    "application/problem+xml": {
      source: "iana",
      compressible: true
    },
    "application/provenance+xml": {
      source: "iana",
      compressible: true,
      extensions: ["provx"]
    },
    "application/prs.alvestrand.titrax-sheet": {
      source: "iana"
    },
    "application/prs.cww": {
      source: "iana",
      extensions: ["cww"]
    },
    "application/prs.cyn": {
      source: "iana",
      charset: "7-BIT"
    },
    "application/prs.hpub+zip": {
      source: "iana",
      compressible: false
    },
    "application/prs.nprend": {
      source: "iana"
    },
    "application/prs.plucker": {
      source: "iana"
    },
    "application/prs.rdf-xml-crypt": {
      source: "iana"
    },
    "application/prs.xsf+xml": {
      source: "iana",
      compressible: true
    },
    "application/pskc+xml": {
      source: "iana",
      compressible: true,
      extensions: ["pskcxml"]
    },
    "application/pvd+json": {
      source: "iana",
      compressible: true
    },
    "application/qsig": {
      source: "iana"
    },
    "application/raml+yaml": {
      compressible: true,
      extensions: ["raml"]
    },
    "application/raptorfec": {
      source: "iana"
    },
    "application/rdap+json": {
      source: "iana",
      compressible: true
    },
    "application/rdf+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rdf", "owl"]
    },
    "application/reginfo+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rif"]
    },
    "application/relax-ng-compact-syntax": {
      source: "iana",
      extensions: ["rnc"]
    },
    "application/remote-printing": {
      source: "iana"
    },
    "application/reputon+json": {
      source: "iana",
      compressible: true
    },
    "application/resource-lists+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rl"]
    },
    "application/resource-lists-diff+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rld"]
    },
    "application/rfc+xml": {
      source: "iana",
      compressible: true
    },
    "application/riscos": {
      source: "iana"
    },
    "application/rlmi+xml": {
      source: "iana",
      compressible: true
    },
    "application/rls-services+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rs"]
    },
    "application/route-apd+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rapd"]
    },
    "application/route-s-tsid+xml": {
      source: "iana",
      compressible: true,
      extensions: ["sls"]
    },
    "application/route-usd+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rusd"]
    },
    "application/rpki-ghostbusters": {
      source: "iana",
      extensions: ["gbr"]
    },
    "application/rpki-manifest": {
      source: "iana",
      extensions: ["mft"]
    },
    "application/rpki-publication": {
      source: "iana"
    },
    "application/rpki-roa": {
      source: "iana",
      extensions: ["roa"]
    },
    "application/rpki-updown": {
      source: "iana"
    },
    "application/rsd+xml": {
      source: "apache",
      compressible: true,
      extensions: ["rsd"]
    },
    "application/rss+xml": {
      source: "apache",
      compressible: true,
      extensions: ["rss"]
    },
    "application/rtf": {
      source: "iana",
      compressible: true,
      extensions: ["rtf"]
    },
    "application/rtploopback": {
      source: "iana"
    },
    "application/rtx": {
      source: "iana"
    },
    "application/samlassertion+xml": {
      source: "iana",
      compressible: true
    },
    "application/samlmetadata+xml": {
      source: "iana",
      compressible: true
    },
    "application/sarif+json": {
      source: "iana",
      compressible: true
    },
    "application/sarif-external-properties+json": {
      source: "iana",
      compressible: true
    },
    "application/sbe": {
      source: "iana"
    },
    "application/sbml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["sbml"]
    },
    "application/scaip+xml": {
      source: "iana",
      compressible: true
    },
    "application/scim+json": {
      source: "iana",
      compressible: true
    },
    "application/scvp-cv-request": {
      source: "iana",
      extensions: ["scq"]
    },
    "application/scvp-cv-response": {
      source: "iana",
      extensions: ["scs"]
    },
    "application/scvp-vp-request": {
      source: "iana",
      extensions: ["spq"]
    },
    "application/scvp-vp-response": {
      source: "iana",
      extensions: ["spp"]
    },
    "application/sdp": {
      source: "iana",
      extensions: ["sdp"]
    },
    "application/secevent+jwt": {
      source: "iana"
    },
    "application/senml+cbor": {
      source: "iana"
    },
    "application/senml+json": {
      source: "iana",
      compressible: true
    },
    "application/senml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["senmlx"]
    },
    "application/senml-etch+cbor": {
      source: "iana"
    },
    "application/senml-etch+json": {
      source: "iana",
      compressible: true
    },
    "application/senml-exi": {
      source: "iana"
    },
    "application/sensml+cbor": {
      source: "iana"
    },
    "application/sensml+json": {
      source: "iana",
      compressible: true
    },
    "application/sensml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["sensmlx"]
    },
    "application/sensml-exi": {
      source: "iana"
    },
    "application/sep+xml": {
      source: "iana",
      compressible: true
    },
    "application/sep-exi": {
      source: "iana"
    },
    "application/session-info": {
      source: "iana"
    },
    "application/set-payment": {
      source: "iana"
    },
    "application/set-payment-initiation": {
      source: "iana",
      extensions: ["setpay"]
    },
    "application/set-registration": {
      source: "iana"
    },
    "application/set-registration-initiation": {
      source: "iana",
      extensions: ["setreg"]
    },
    "application/sgml": {
      source: "iana"
    },
    "application/sgml-open-catalog": {
      source: "iana"
    },
    "application/shf+xml": {
      source: "iana",
      compressible: true,
      extensions: ["shf"]
    },
    "application/sieve": {
      source: "iana",
      extensions: ["siv", "sieve"]
    },
    "application/simple-filter+xml": {
      source: "iana",
      compressible: true
    },
    "application/simple-message-summary": {
      source: "iana"
    },
    "application/simplesymbolcontainer": {
      source: "iana"
    },
    "application/sipc": {
      source: "iana"
    },
    "application/slate": {
      source: "iana"
    },
    "application/smil": {
      source: "iana"
    },
    "application/smil+xml": {
      source: "iana",
      compressible: true,
      extensions: ["smi", "smil"]
    },
    "application/smpte336m": {
      source: "iana"
    },
    "application/soap+fastinfoset": {
      source: "iana"
    },
    "application/soap+xml": {
      source: "iana",
      compressible: true
    },
    "application/sparql-query": {
      source: "iana",
      extensions: ["rq"]
    },
    "application/sparql-results+xml": {
      source: "iana",
      compressible: true,
      extensions: ["srx"]
    },
    "application/spdx+json": {
      source: "iana",
      compressible: true
    },
    "application/spirits-event+xml": {
      source: "iana",
      compressible: true
    },
    "application/sql": {
      source: "iana"
    },
    "application/srgs": {
      source: "iana",
      extensions: ["gram"]
    },
    "application/srgs+xml": {
      source: "iana",
      compressible: true,
      extensions: ["grxml"]
    },
    "application/sru+xml": {
      source: "iana",
      compressible: true,
      extensions: ["sru"]
    },
    "application/ssdl+xml": {
      source: "apache",
      compressible: true,
      extensions: ["ssdl"]
    },
    "application/ssml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["ssml"]
    },
    "application/stix+json": {
      source: "iana",
      compressible: true
    },
    "application/swid+xml": {
      source: "iana",
      compressible: true,
      extensions: ["swidtag"]
    },
    "application/tamp-apex-update": {
      source: "iana"
    },
    "application/tamp-apex-update-confirm": {
      source: "iana"
    },
    "application/tamp-community-update": {
      source: "iana"
    },
    "application/tamp-community-update-confirm": {
      source: "iana"
    },
    "application/tamp-error": {
      source: "iana"
    },
    "application/tamp-sequence-adjust": {
      source: "iana"
    },
    "application/tamp-sequence-adjust-confirm": {
      source: "iana"
    },
    "application/tamp-status-query": {
      source: "iana"
    },
    "application/tamp-status-response": {
      source: "iana"
    },
    "application/tamp-update": {
      source: "iana"
    },
    "application/tamp-update-confirm": {
      source: "iana"
    },
    "application/tar": {
      compressible: true
    },
    "application/taxii+json": {
      source: "iana",
      compressible: true
    },
    "application/td+json": {
      source: "iana",
      compressible: true
    },
    "application/tei+xml": {
      source: "iana",
      compressible: true,
      extensions: ["tei", "teicorpus"]
    },
    "application/tetra_isi": {
      source: "iana"
    },
    "application/thraud+xml": {
      source: "iana",
      compressible: true,
      extensions: ["tfi"]
    },
    "application/timestamp-query": {
      source: "iana"
    },
    "application/timestamp-reply": {
      source: "iana"
    },
    "application/timestamped-data": {
      source: "iana",
      extensions: ["tsd"]
    },
    "application/tlsrpt+gzip": {
      source: "iana"
    },
    "application/tlsrpt+json": {
      source: "iana",
      compressible: true
    },
    "application/tnauthlist": {
      source: "iana"
    },
    "application/token-introspection+jwt": {
      source: "iana"
    },
    "application/toml": {
      compressible: true,
      extensions: ["toml"]
    },
    "application/trickle-ice-sdpfrag": {
      source: "iana"
    },
    "application/trig": {
      source: "iana",
      extensions: ["trig"]
    },
    "application/ttml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["ttml"]
    },
    "application/tve-trigger": {
      source: "iana"
    },
    "application/tzif": {
      source: "iana"
    },
    "application/tzif-leap": {
      source: "iana"
    },
    "application/ubjson": {
      compressible: false,
      extensions: ["ubj"]
    },
    "application/ulpfec": {
      source: "iana"
    },
    "application/urc-grpsheet+xml": {
      source: "iana",
      compressible: true
    },
    "application/urc-ressheet+xml": {
      source: "iana",
      compressible: true,
      extensions: ["rsheet"]
    },
    "application/urc-targetdesc+xml": {
      source: "iana",
      compressible: true,
      extensions: ["td"]
    },
    "application/urc-uisocketdesc+xml": {
      source: "iana",
      compressible: true
    },
    "application/vcard+json": {
      source: "iana",
      compressible: true
    },
    "application/vcard+xml": {
      source: "iana",
      compressible: true
    },
    "application/vemmi": {
      source: "iana"
    },
    "application/vividence.scriptfile": {
      source: "apache"
    },
    "application/vnd.1000minds.decision-model+xml": {
      source: "iana",
      compressible: true,
      extensions: ["1km"]
    },
    "application/vnd.3gpp-prose+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp-prose-pc3ch+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp-v2x-local-service-information": {
      source: "iana"
    },
    "application/vnd.3gpp.5gnas": {
      source: "iana"
    },
    "application/vnd.3gpp.access-transfer-events+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.bsf+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.gmop+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.gtpc": {
      source: "iana"
    },
    "application/vnd.3gpp.interworking-data": {
      source: "iana"
    },
    "application/vnd.3gpp.lpp": {
      source: "iana"
    },
    "application/vnd.3gpp.mc-signalling-ear": {
      source: "iana"
    },
    "application/vnd.3gpp.mcdata-affiliation-command+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcdata-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcdata-payload": {
      source: "iana"
    },
    "application/vnd.3gpp.mcdata-service-config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcdata-signalling": {
      source: "iana"
    },
    "application/vnd.3gpp.mcdata-ue-config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcdata-user-profile+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-affiliation-command+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-floor-request+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-location-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-mbms-usage-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-service-config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-signed+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-ue-config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-ue-init-config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcptt-user-profile+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-affiliation-command+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-affiliation-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-location-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-service-config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-transmission-request+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-ue-config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mcvideo-user-profile+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.mid-call+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.ngap": {
      source: "iana"
    },
    "application/vnd.3gpp.pfcp": {
      source: "iana"
    },
    "application/vnd.3gpp.pic-bw-large": {
      source: "iana",
      extensions: ["plb"]
    },
    "application/vnd.3gpp.pic-bw-small": {
      source: "iana",
      extensions: ["psb"]
    },
    "application/vnd.3gpp.pic-bw-var": {
      source: "iana",
      extensions: ["pvb"]
    },
    "application/vnd.3gpp.s1ap": {
      source: "iana"
    },
    "application/vnd.3gpp.sms": {
      source: "iana"
    },
    "application/vnd.3gpp.sms+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.srvcc-ext+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.srvcc-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.state-and-event-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp.ussd+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp2.bcmcsinfo+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.3gpp2.sms": {
      source: "iana"
    },
    "application/vnd.3gpp2.tcap": {
      source: "iana",
      extensions: ["tcap"]
    },
    "application/vnd.3lightssoftware.imagescal": {
      source: "iana"
    },
    "application/vnd.3m.post-it-notes": {
      source: "iana",
      extensions: ["pwn"]
    },
    "application/vnd.accpac.simply.aso": {
      source: "iana",
      extensions: ["aso"]
    },
    "application/vnd.accpac.simply.imp": {
      source: "iana",
      extensions: ["imp"]
    },
    "application/vnd.acucobol": {
      source: "iana",
      extensions: ["acu"]
    },
    "application/vnd.acucorp": {
      source: "iana",
      extensions: ["atc", "acutc"]
    },
    "application/vnd.adobe.air-application-installer-package+zip": {
      source: "apache",
      compressible: false,
      extensions: ["air"]
    },
    "application/vnd.adobe.flash.movie": {
      source: "iana"
    },
    "application/vnd.adobe.formscentral.fcdt": {
      source: "iana",
      extensions: ["fcdt"]
    },
    "application/vnd.adobe.fxp": {
      source: "iana",
      extensions: ["fxp", "fxpl"]
    },
    "application/vnd.adobe.partial-upload": {
      source: "iana"
    },
    "application/vnd.adobe.xdp+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xdp"]
    },
    "application/vnd.adobe.xfdf": {
      source: "iana",
      extensions: ["xfdf"]
    },
    "application/vnd.aether.imp": {
      source: "iana"
    },
    "application/vnd.afpc.afplinedata": {
      source: "iana"
    },
    "application/vnd.afpc.afplinedata-pagedef": {
      source: "iana"
    },
    "application/vnd.afpc.cmoca-cmresource": {
      source: "iana"
    },
    "application/vnd.afpc.foca-charset": {
      source: "iana"
    },
    "application/vnd.afpc.foca-codedfont": {
      source: "iana"
    },
    "application/vnd.afpc.foca-codepage": {
      source: "iana"
    },
    "application/vnd.afpc.modca": {
      source: "iana"
    },
    "application/vnd.afpc.modca-cmtable": {
      source: "iana"
    },
    "application/vnd.afpc.modca-formdef": {
      source: "iana"
    },
    "application/vnd.afpc.modca-mediummap": {
      source: "iana"
    },
    "application/vnd.afpc.modca-objectcontainer": {
      source: "iana"
    },
    "application/vnd.afpc.modca-overlay": {
      source: "iana"
    },
    "application/vnd.afpc.modca-pagesegment": {
      source: "iana"
    },
    "application/vnd.age": {
      source: "iana",
      extensions: ["age"]
    },
    "application/vnd.ah-barcode": {
      source: "iana"
    },
    "application/vnd.ahead.space": {
      source: "iana",
      extensions: ["ahead"]
    },
    "application/vnd.airzip.filesecure.azf": {
      source: "iana",
      extensions: ["azf"]
    },
    "application/vnd.airzip.filesecure.azs": {
      source: "iana",
      extensions: ["azs"]
    },
    "application/vnd.amadeus+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.amazon.ebook": {
      source: "apache",
      extensions: ["azw"]
    },
    "application/vnd.amazon.mobi8-ebook": {
      source: "iana"
    },
    "application/vnd.americandynamics.acc": {
      source: "iana",
      extensions: ["acc"]
    },
    "application/vnd.amiga.ami": {
      source: "iana",
      extensions: ["ami"]
    },
    "application/vnd.amundsen.maze+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.android.ota": {
      source: "iana"
    },
    "application/vnd.android.package-archive": {
      source: "apache",
      compressible: false,
      extensions: ["apk"]
    },
    "application/vnd.anki": {
      source: "iana"
    },
    "application/vnd.anser-web-certificate-issue-initiation": {
      source: "iana",
      extensions: ["cii"]
    },
    "application/vnd.anser-web-funds-transfer-initiation": {
      source: "apache",
      extensions: ["fti"]
    },
    "application/vnd.antix.game-component": {
      source: "iana",
      extensions: ["atx"]
    },
    "application/vnd.apache.arrow.file": {
      source: "iana"
    },
    "application/vnd.apache.arrow.stream": {
      source: "iana"
    },
    "application/vnd.apache.thrift.binary": {
      source: "iana"
    },
    "application/vnd.apache.thrift.compact": {
      source: "iana"
    },
    "application/vnd.apache.thrift.json": {
      source: "iana"
    },
    "application/vnd.api+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.aplextor.warrp+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.apothekende.reservation+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.apple.installer+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mpkg"]
    },
    "application/vnd.apple.keynote": {
      source: "iana",
      extensions: ["key"]
    },
    "application/vnd.apple.mpegurl": {
      source: "iana",
      extensions: ["m3u8"]
    },
    "application/vnd.apple.numbers": {
      source: "iana",
      extensions: ["numbers"]
    },
    "application/vnd.apple.pages": {
      source: "iana",
      extensions: ["pages"]
    },
    "application/vnd.apple.pkpass": {
      compressible: false,
      extensions: ["pkpass"]
    },
    "application/vnd.arastra.swi": {
      source: "iana"
    },
    "application/vnd.aristanetworks.swi": {
      source: "iana",
      extensions: ["swi"]
    },
    "application/vnd.artisan+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.artsquare": {
      source: "iana"
    },
    "application/vnd.astraea-software.iota": {
      source: "iana",
      extensions: ["iota"]
    },
    "application/vnd.audiograph": {
      source: "iana",
      extensions: ["aep"]
    },
    "application/vnd.autopackage": {
      source: "iana"
    },
    "application/vnd.avalon+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.avistar+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.balsamiq.bmml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["bmml"]
    },
    "application/vnd.balsamiq.bmpr": {
      source: "iana"
    },
    "application/vnd.banana-accounting": {
      source: "iana"
    },
    "application/vnd.bbf.usp.error": {
      source: "iana"
    },
    "application/vnd.bbf.usp.msg": {
      source: "iana"
    },
    "application/vnd.bbf.usp.msg+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.bekitzur-stech+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.bint.med-content": {
      source: "iana"
    },
    "application/vnd.biopax.rdf+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.blink-idb-value-wrapper": {
      source: "iana"
    },
    "application/vnd.blueice.multipass": {
      source: "iana",
      extensions: ["mpm"]
    },
    "application/vnd.bluetooth.ep.oob": {
      source: "iana"
    },
    "application/vnd.bluetooth.le.oob": {
      source: "iana"
    },
    "application/vnd.bmi": {
      source: "iana",
      extensions: ["bmi"]
    },
    "application/vnd.bpf": {
      source: "iana"
    },
    "application/vnd.bpf3": {
      source: "iana"
    },
    "application/vnd.businessobjects": {
      source: "iana",
      extensions: ["rep"]
    },
    "application/vnd.byu.uapi+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.cab-jscript": {
      source: "iana"
    },
    "application/vnd.canon-cpdl": {
      source: "iana"
    },
    "application/vnd.canon-lips": {
      source: "iana"
    },
    "application/vnd.capasystems-pg+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.cendio.thinlinc.clientconf": {
      source: "iana"
    },
    "application/vnd.century-systems.tcp_stream": {
      source: "iana"
    },
    "application/vnd.chemdraw+xml": {
      source: "iana",
      compressible: true,
      extensions: ["cdxml"]
    },
    "application/vnd.chess-pgn": {
      source: "iana"
    },
    "application/vnd.chipnuts.karaoke-mmd": {
      source: "iana",
      extensions: ["mmd"]
    },
    "application/vnd.ciedi": {
      source: "iana"
    },
    "application/vnd.cinderella": {
      source: "iana",
      extensions: ["cdy"]
    },
    "application/vnd.cirpack.isdn-ext": {
      source: "iana"
    },
    "application/vnd.citationstyles.style+xml": {
      source: "iana",
      compressible: true,
      extensions: ["csl"]
    },
    "application/vnd.claymore": {
      source: "iana",
      extensions: ["cla"]
    },
    "application/vnd.cloanto.rp9": {
      source: "iana",
      extensions: ["rp9"]
    },
    "application/vnd.clonk.c4group": {
      source: "iana",
      extensions: ["c4g", "c4d", "c4f", "c4p", "c4u"]
    },
    "application/vnd.cluetrust.cartomobile-config": {
      source: "iana",
      extensions: ["c11amc"]
    },
    "application/vnd.cluetrust.cartomobile-config-pkg": {
      source: "iana",
      extensions: ["c11amz"]
    },
    "application/vnd.coffeescript": {
      source: "iana"
    },
    "application/vnd.collabio.xodocuments.document": {
      source: "iana"
    },
    "application/vnd.collabio.xodocuments.document-template": {
      source: "iana"
    },
    "application/vnd.collabio.xodocuments.presentation": {
      source: "iana"
    },
    "application/vnd.collabio.xodocuments.presentation-template": {
      source: "iana"
    },
    "application/vnd.collabio.xodocuments.spreadsheet": {
      source: "iana"
    },
    "application/vnd.collabio.xodocuments.spreadsheet-template": {
      source: "iana"
    },
    "application/vnd.collection+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.collection.doc+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.collection.next+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.comicbook+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.comicbook-rar": {
      source: "iana"
    },
    "application/vnd.commerce-battelle": {
      source: "iana"
    },
    "application/vnd.commonspace": {
      source: "iana",
      extensions: ["csp"]
    },
    "application/vnd.contact.cmsg": {
      source: "iana",
      extensions: ["cdbcmsg"]
    },
    "application/vnd.coreos.ignition+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.cosmocaller": {
      source: "iana",
      extensions: ["cmc"]
    },
    "application/vnd.crick.clicker": {
      source: "iana",
      extensions: ["clkx"]
    },
    "application/vnd.crick.clicker.keyboard": {
      source: "iana",
      extensions: ["clkk"]
    },
    "application/vnd.crick.clicker.palette": {
      source: "iana",
      extensions: ["clkp"]
    },
    "application/vnd.crick.clicker.template": {
      source: "iana",
      extensions: ["clkt"]
    },
    "application/vnd.crick.clicker.wordbank": {
      source: "iana",
      extensions: ["clkw"]
    },
    "application/vnd.criticaltools.wbs+xml": {
      source: "iana",
      compressible: true,
      extensions: ["wbs"]
    },
    "application/vnd.cryptii.pipe+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.crypto-shade-file": {
      source: "iana"
    },
    "application/vnd.cryptomator.encrypted": {
      source: "iana"
    },
    "application/vnd.cryptomator.vault": {
      source: "iana"
    },
    "application/vnd.ctc-posml": {
      source: "iana",
      extensions: ["pml"]
    },
    "application/vnd.ctct.ws+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.cups-pdf": {
      source: "iana"
    },
    "application/vnd.cups-postscript": {
      source: "iana"
    },
    "application/vnd.cups-ppd": {
      source: "iana",
      extensions: ["ppd"]
    },
    "application/vnd.cups-raster": {
      source: "iana"
    },
    "application/vnd.cups-raw": {
      source: "iana"
    },
    "application/vnd.curl": {
      source: "iana"
    },
    "application/vnd.curl.car": {
      source: "apache",
      extensions: ["car"]
    },
    "application/vnd.curl.pcurl": {
      source: "apache",
      extensions: ["pcurl"]
    },
    "application/vnd.cyan.dean.root+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.cybank": {
      source: "iana"
    },
    "application/vnd.cyclonedx+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.cyclonedx+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.d2l.coursepackage1p0+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.d3m-dataset": {
      source: "iana"
    },
    "application/vnd.d3m-problem": {
      source: "iana"
    },
    "application/vnd.dart": {
      source: "iana",
      compressible: true,
      extensions: ["dart"]
    },
    "application/vnd.data-vision.rdz": {
      source: "iana",
      extensions: ["rdz"]
    },
    "application/vnd.datapackage+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dataresource+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dbf": {
      source: "iana",
      extensions: ["dbf"]
    },
    "application/vnd.debian.binary-package": {
      source: "iana"
    },
    "application/vnd.dece.data": {
      source: "iana",
      extensions: ["uvf", "uvvf", "uvd", "uvvd"]
    },
    "application/vnd.dece.ttml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["uvt", "uvvt"]
    },
    "application/vnd.dece.unspecified": {
      source: "iana",
      extensions: ["uvx", "uvvx"]
    },
    "application/vnd.dece.zip": {
      source: "iana",
      extensions: ["uvz", "uvvz"]
    },
    "application/vnd.denovo.fcselayout-link": {
      source: "iana",
      extensions: ["fe_launch"]
    },
    "application/vnd.desmume.movie": {
      source: "iana"
    },
    "application/vnd.dir-bi.plate-dl-nosuffix": {
      source: "iana"
    },
    "application/vnd.dm.delegation+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dna": {
      source: "iana",
      extensions: ["dna"]
    },
    "application/vnd.document+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dolby.mlp": {
      source: "apache",
      extensions: ["mlp"]
    },
    "application/vnd.dolby.mobile.1": {
      source: "iana"
    },
    "application/vnd.dolby.mobile.2": {
      source: "iana"
    },
    "application/vnd.doremir.scorecloud-binary-document": {
      source: "iana"
    },
    "application/vnd.dpgraph": {
      source: "iana",
      extensions: ["dpg"]
    },
    "application/vnd.dreamfactory": {
      source: "iana",
      extensions: ["dfac"]
    },
    "application/vnd.drive+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ds-keypoint": {
      source: "apache",
      extensions: ["kpxx"]
    },
    "application/vnd.dtg.local": {
      source: "iana"
    },
    "application/vnd.dtg.local.flash": {
      source: "iana"
    },
    "application/vnd.dtg.local.html": {
      source: "iana"
    },
    "application/vnd.dvb.ait": {
      source: "iana",
      extensions: ["ait"]
    },
    "application/vnd.dvb.dvbisl+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.dvbj": {
      source: "iana"
    },
    "application/vnd.dvb.esgcontainer": {
      source: "iana"
    },
    "application/vnd.dvb.ipdcdftnotifaccess": {
      source: "iana"
    },
    "application/vnd.dvb.ipdcesgaccess": {
      source: "iana"
    },
    "application/vnd.dvb.ipdcesgaccess2": {
      source: "iana"
    },
    "application/vnd.dvb.ipdcesgpdd": {
      source: "iana"
    },
    "application/vnd.dvb.ipdcroaming": {
      source: "iana"
    },
    "application/vnd.dvb.iptv.alfec-base": {
      source: "iana"
    },
    "application/vnd.dvb.iptv.alfec-enhancement": {
      source: "iana"
    },
    "application/vnd.dvb.notif-aggregate-root+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.notif-container+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.notif-generic+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.notif-ia-msglist+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.notif-ia-registration-request+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.notif-ia-registration-response+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.notif-init+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.dvb.pfr": {
      source: "iana"
    },
    "application/vnd.dvb.service": {
      source: "iana",
      extensions: ["svc"]
    },
    "application/vnd.dxr": {
      source: "iana"
    },
    "application/vnd.dynageo": {
      source: "iana",
      extensions: ["geo"]
    },
    "application/vnd.dzr": {
      source: "iana"
    },
    "application/vnd.easykaraoke.cdgdownload": {
      source: "iana"
    },
    "application/vnd.ecdis-update": {
      source: "iana"
    },
    "application/vnd.ecip.rlp": {
      source: "iana"
    },
    "application/vnd.eclipse.ditto+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ecowin.chart": {
      source: "iana",
      extensions: ["mag"]
    },
    "application/vnd.ecowin.filerequest": {
      source: "iana"
    },
    "application/vnd.ecowin.fileupdate": {
      source: "iana"
    },
    "application/vnd.ecowin.series": {
      source: "iana"
    },
    "application/vnd.ecowin.seriesrequest": {
      source: "iana"
    },
    "application/vnd.ecowin.seriesupdate": {
      source: "iana"
    },
    "application/vnd.efi.img": {
      source: "iana"
    },
    "application/vnd.efi.iso": {
      source: "iana"
    },
    "application/vnd.emclient.accessrequest+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.enliven": {
      source: "iana",
      extensions: ["nml"]
    },
    "application/vnd.enphase.envoy": {
      source: "iana"
    },
    "application/vnd.eprints.data+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.epson.esf": {
      source: "iana",
      extensions: ["esf"]
    },
    "application/vnd.epson.msf": {
      source: "iana",
      extensions: ["msf"]
    },
    "application/vnd.epson.quickanime": {
      source: "iana",
      extensions: ["qam"]
    },
    "application/vnd.epson.salt": {
      source: "iana",
      extensions: ["slt"]
    },
    "application/vnd.epson.ssf": {
      source: "iana",
      extensions: ["ssf"]
    },
    "application/vnd.ericsson.quickcall": {
      source: "iana"
    },
    "application/vnd.espass-espass+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.eszigno3+xml": {
      source: "iana",
      compressible: true,
      extensions: ["es3", "et3"]
    },
    "application/vnd.etsi.aoc+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.asic-e+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.etsi.asic-s+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.etsi.cug+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvcommand+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvdiscovery+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvprofile+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvsad-bc+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvsad-cod+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvsad-npvr+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvservice+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvsync+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.iptvueprofile+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.mcid+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.mheg5": {
      source: "iana"
    },
    "application/vnd.etsi.overload-control-policy-dataset+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.pstn+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.sci+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.simservs+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.timestamp-token": {
      source: "iana"
    },
    "application/vnd.etsi.tsl+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.etsi.tsl.der": {
      source: "iana"
    },
    "application/vnd.eu.kasparian.car+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.eudora.data": {
      source: "iana"
    },
    "application/vnd.evolv.ecig.profile": {
      source: "iana"
    },
    "application/vnd.evolv.ecig.settings": {
      source: "iana"
    },
    "application/vnd.evolv.ecig.theme": {
      source: "iana"
    },
    "application/vnd.exstream-empower+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.exstream-package": {
      source: "iana"
    },
    "application/vnd.ezpix-album": {
      source: "iana",
      extensions: ["ez2"]
    },
    "application/vnd.ezpix-package": {
      source: "iana",
      extensions: ["ez3"]
    },
    "application/vnd.f-secure.mobile": {
      source: "iana"
    },
    "application/vnd.familysearch.gedcom+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.fastcopy-disk-image": {
      source: "iana"
    },
    "application/vnd.fdf": {
      source: "iana",
      extensions: ["fdf"]
    },
    "application/vnd.fdsn.mseed": {
      source: "iana",
      extensions: ["mseed"]
    },
    "application/vnd.fdsn.seed": {
      source: "iana",
      extensions: ["seed", "dataless"]
    },
    "application/vnd.ffsns": {
      source: "iana"
    },
    "application/vnd.ficlab.flb+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.filmit.zfc": {
      source: "iana"
    },
    "application/vnd.fints": {
      source: "iana"
    },
    "application/vnd.firemonkeys.cloudcell": {
      source: "iana"
    },
    "application/vnd.flographit": {
      source: "iana",
      extensions: ["gph"]
    },
    "application/vnd.fluxtime.clip": {
      source: "iana",
      extensions: ["ftc"]
    },
    "application/vnd.font-fontforge-sfd": {
      source: "iana"
    },
    "application/vnd.framemaker": {
      source: "iana",
      extensions: ["fm", "frame", "maker", "book"]
    },
    "application/vnd.frogans.fnc": {
      source: "iana",
      extensions: ["fnc"]
    },
    "application/vnd.frogans.ltf": {
      source: "iana",
      extensions: ["ltf"]
    },
    "application/vnd.fsc.weblaunch": {
      source: "iana",
      extensions: ["fsc"]
    },
    "application/vnd.fujifilm.fb.docuworks": {
      source: "iana"
    },
    "application/vnd.fujifilm.fb.docuworks.binder": {
      source: "iana"
    },
    "application/vnd.fujifilm.fb.docuworks.container": {
      source: "iana"
    },
    "application/vnd.fujifilm.fb.jfi+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.fujitsu.oasys": {
      source: "iana",
      extensions: ["oas"]
    },
    "application/vnd.fujitsu.oasys2": {
      source: "iana",
      extensions: ["oa2"]
    },
    "application/vnd.fujitsu.oasys3": {
      source: "iana",
      extensions: ["oa3"]
    },
    "application/vnd.fujitsu.oasysgp": {
      source: "iana",
      extensions: ["fg5"]
    },
    "application/vnd.fujitsu.oasysprs": {
      source: "iana",
      extensions: ["bh2"]
    },
    "application/vnd.fujixerox.art-ex": {
      source: "iana"
    },
    "application/vnd.fujixerox.art4": {
      source: "iana"
    },
    "application/vnd.fujixerox.ddd": {
      source: "iana",
      extensions: ["ddd"]
    },
    "application/vnd.fujixerox.docuworks": {
      source: "iana",
      extensions: ["xdw"]
    },
    "application/vnd.fujixerox.docuworks.binder": {
      source: "iana",
      extensions: ["xbd"]
    },
    "application/vnd.fujixerox.docuworks.container": {
      source: "iana"
    },
    "application/vnd.fujixerox.hbpl": {
      source: "iana"
    },
    "application/vnd.fut-misnet": {
      source: "iana"
    },
    "application/vnd.futoin+cbor": {
      source: "iana"
    },
    "application/vnd.futoin+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.fuzzysheet": {
      source: "iana",
      extensions: ["fzs"]
    },
    "application/vnd.genomatix.tuxedo": {
      source: "iana",
      extensions: ["txd"]
    },
    "application/vnd.gentics.grd+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.geo+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.geocube+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.geogebra.file": {
      source: "iana",
      extensions: ["ggb"]
    },
    "application/vnd.geogebra.slides": {
      source: "iana"
    },
    "application/vnd.geogebra.tool": {
      source: "iana",
      extensions: ["ggt"]
    },
    "application/vnd.geometry-explorer": {
      source: "iana",
      extensions: ["gex", "gre"]
    },
    "application/vnd.geonext": {
      source: "iana",
      extensions: ["gxt"]
    },
    "application/vnd.geoplan": {
      source: "iana",
      extensions: ["g2w"]
    },
    "application/vnd.geospace": {
      source: "iana",
      extensions: ["g3w"]
    },
    "application/vnd.gerber": {
      source: "iana"
    },
    "application/vnd.globalplatform.card-content-mgt": {
      source: "iana"
    },
    "application/vnd.globalplatform.card-content-mgt-response": {
      source: "iana"
    },
    "application/vnd.gmx": {
      source: "iana",
      extensions: ["gmx"]
    },
    "application/vnd.google-apps.document": {
      compressible: false,
      extensions: ["gdoc"]
    },
    "application/vnd.google-apps.presentation": {
      compressible: false,
      extensions: ["gslides"]
    },
    "application/vnd.google-apps.spreadsheet": {
      compressible: false,
      extensions: ["gsheet"]
    },
    "application/vnd.google-earth.kml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["kml"]
    },
    "application/vnd.google-earth.kmz": {
      source: "iana",
      compressible: false,
      extensions: ["kmz"]
    },
    "application/vnd.gov.sk.e-form+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.gov.sk.e-form+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.gov.sk.xmldatacontainer+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.grafeq": {
      source: "iana",
      extensions: ["gqf", "gqs"]
    },
    "application/vnd.gridmp": {
      source: "iana"
    },
    "application/vnd.groove-account": {
      source: "iana",
      extensions: ["gac"]
    },
    "application/vnd.groove-help": {
      source: "iana",
      extensions: ["ghf"]
    },
    "application/vnd.groove-identity-message": {
      source: "iana",
      extensions: ["gim"]
    },
    "application/vnd.groove-injector": {
      source: "iana",
      extensions: ["grv"]
    },
    "application/vnd.groove-tool-message": {
      source: "iana",
      extensions: ["gtm"]
    },
    "application/vnd.groove-tool-template": {
      source: "iana",
      extensions: ["tpl"]
    },
    "application/vnd.groove-vcard": {
      source: "iana",
      extensions: ["vcg"]
    },
    "application/vnd.hal+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.hal+xml": {
      source: "iana",
      compressible: true,
      extensions: ["hal"]
    },
    "application/vnd.handheld-entertainment+xml": {
      source: "iana",
      compressible: true,
      extensions: ["zmm"]
    },
    "application/vnd.hbci": {
      source: "iana",
      extensions: ["hbci"]
    },
    "application/vnd.hc+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.hcl-bireports": {
      source: "iana"
    },
    "application/vnd.hdt": {
      source: "iana"
    },
    "application/vnd.heroku+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.hhe.lesson-player": {
      source: "iana",
      extensions: ["les"]
    },
    "application/vnd.hl7cda+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/vnd.hl7v2+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/vnd.hp-hpgl": {
      source: "iana",
      extensions: ["hpgl"]
    },
    "application/vnd.hp-hpid": {
      source: "iana",
      extensions: ["hpid"]
    },
    "application/vnd.hp-hps": {
      source: "iana",
      extensions: ["hps"]
    },
    "application/vnd.hp-jlyt": {
      source: "iana",
      extensions: ["jlt"]
    },
    "application/vnd.hp-pcl": {
      source: "iana",
      extensions: ["pcl"]
    },
    "application/vnd.hp-pclxl": {
      source: "iana",
      extensions: ["pclxl"]
    },
    "application/vnd.httphone": {
      source: "iana"
    },
    "application/vnd.hydrostatix.sof-data": {
      source: "iana",
      extensions: ["sfd-hdstx"]
    },
    "application/vnd.hyper+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.hyper-item+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.hyperdrive+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.hzn-3d-crossword": {
      source: "iana"
    },
    "application/vnd.ibm.afplinedata": {
      source: "iana"
    },
    "application/vnd.ibm.electronic-media": {
      source: "iana"
    },
    "application/vnd.ibm.minipay": {
      source: "iana",
      extensions: ["mpy"]
    },
    "application/vnd.ibm.modcap": {
      source: "iana",
      extensions: ["afp", "listafp", "list3820"]
    },
    "application/vnd.ibm.rights-management": {
      source: "iana",
      extensions: ["irm"]
    },
    "application/vnd.ibm.secure-container": {
      source: "iana",
      extensions: ["sc"]
    },
    "application/vnd.iccprofile": {
      source: "iana",
      extensions: ["icc", "icm"]
    },
    "application/vnd.ieee.1905": {
      source: "iana"
    },
    "application/vnd.igloader": {
      source: "iana",
      extensions: ["igl"]
    },
    "application/vnd.imagemeter.folder+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.imagemeter.image+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.immervision-ivp": {
      source: "iana",
      extensions: ["ivp"]
    },
    "application/vnd.immervision-ivu": {
      source: "iana",
      extensions: ["ivu"]
    },
    "application/vnd.ims.imsccv1p1": {
      source: "iana"
    },
    "application/vnd.ims.imsccv1p2": {
      source: "iana"
    },
    "application/vnd.ims.imsccv1p3": {
      source: "iana"
    },
    "application/vnd.ims.lis.v2.result+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ims.lti.v2.toolconsumerprofile+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ims.lti.v2.toolproxy+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ims.lti.v2.toolproxy.id+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ims.lti.v2.toolsettings+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ims.lti.v2.toolsettings.simple+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.informedcontrol.rms+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.informix-visionary": {
      source: "iana"
    },
    "application/vnd.infotech.project": {
      source: "iana"
    },
    "application/vnd.infotech.project+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.innopath.wamp.notification": {
      source: "iana"
    },
    "application/vnd.insors.igm": {
      source: "iana",
      extensions: ["igm"]
    },
    "application/vnd.intercon.formnet": {
      source: "iana",
      extensions: ["xpw", "xpx"]
    },
    "application/vnd.intergeo": {
      source: "iana",
      extensions: ["i2g"]
    },
    "application/vnd.intertrust.digibox": {
      source: "iana"
    },
    "application/vnd.intertrust.nncp": {
      source: "iana"
    },
    "application/vnd.intu.qbo": {
      source: "iana",
      extensions: ["qbo"]
    },
    "application/vnd.intu.qfx": {
      source: "iana",
      extensions: ["qfx"]
    },
    "application/vnd.iptc.g2.catalogitem+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.iptc.g2.conceptitem+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.iptc.g2.knowledgeitem+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.iptc.g2.newsitem+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.iptc.g2.newsmessage+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.iptc.g2.packageitem+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.iptc.g2.planningitem+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ipunplugged.rcprofile": {
      source: "iana",
      extensions: ["rcprofile"]
    },
    "application/vnd.irepository.package+xml": {
      source: "iana",
      compressible: true,
      extensions: ["irp"]
    },
    "application/vnd.is-xpr": {
      source: "iana",
      extensions: ["xpr"]
    },
    "application/vnd.isac.fcs": {
      source: "iana",
      extensions: ["fcs"]
    },
    "application/vnd.iso11783-10+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.jam": {
      source: "iana",
      extensions: ["jam"]
    },
    "application/vnd.japannet-directory-service": {
      source: "iana"
    },
    "application/vnd.japannet-jpnstore-wakeup": {
      source: "iana"
    },
    "application/vnd.japannet-payment-wakeup": {
      source: "iana"
    },
    "application/vnd.japannet-registration": {
      source: "iana"
    },
    "application/vnd.japannet-registration-wakeup": {
      source: "iana"
    },
    "application/vnd.japannet-setstore-wakeup": {
      source: "iana"
    },
    "application/vnd.japannet-verification": {
      source: "iana"
    },
    "application/vnd.japannet-verification-wakeup": {
      source: "iana"
    },
    "application/vnd.jcp.javame.midlet-rms": {
      source: "iana",
      extensions: ["rms"]
    },
    "application/vnd.jisp": {
      source: "iana",
      extensions: ["jisp"]
    },
    "application/vnd.joost.joda-archive": {
      source: "iana",
      extensions: ["joda"]
    },
    "application/vnd.jsk.isdn-ngn": {
      source: "iana"
    },
    "application/vnd.kahootz": {
      source: "iana",
      extensions: ["ktz", "ktr"]
    },
    "application/vnd.kde.karbon": {
      source: "iana",
      extensions: ["karbon"]
    },
    "application/vnd.kde.kchart": {
      source: "iana",
      extensions: ["chrt"]
    },
    "application/vnd.kde.kformula": {
      source: "iana",
      extensions: ["kfo"]
    },
    "application/vnd.kde.kivio": {
      source: "iana",
      extensions: ["flw"]
    },
    "application/vnd.kde.kontour": {
      source: "iana",
      extensions: ["kon"]
    },
    "application/vnd.kde.kpresenter": {
      source: "iana",
      extensions: ["kpr", "kpt"]
    },
    "application/vnd.kde.kspread": {
      source: "iana",
      extensions: ["ksp"]
    },
    "application/vnd.kde.kword": {
      source: "iana",
      extensions: ["kwd", "kwt"]
    },
    "application/vnd.kenameaapp": {
      source: "iana",
      extensions: ["htke"]
    },
    "application/vnd.kidspiration": {
      source: "iana",
      extensions: ["kia"]
    },
    "application/vnd.kinar": {
      source: "iana",
      extensions: ["kne", "knp"]
    },
    "application/vnd.koan": {
      source: "iana",
      extensions: ["skp", "skd", "skt", "skm"]
    },
    "application/vnd.kodak-descriptor": {
      source: "iana",
      extensions: ["sse"]
    },
    "application/vnd.las": {
      source: "iana"
    },
    "application/vnd.las.las+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.las.las+xml": {
      source: "iana",
      compressible: true,
      extensions: ["lasxml"]
    },
    "application/vnd.laszip": {
      source: "iana"
    },
    "application/vnd.leap+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.liberty-request+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.llamagraphics.life-balance.desktop": {
      source: "iana",
      extensions: ["lbd"]
    },
    "application/vnd.llamagraphics.life-balance.exchange+xml": {
      source: "iana",
      compressible: true,
      extensions: ["lbe"]
    },
    "application/vnd.logipipe.circuit+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.loom": {
      source: "iana"
    },
    "application/vnd.lotus-1-2-3": {
      source: "iana",
      extensions: ["123"]
    },
    "application/vnd.lotus-approach": {
      source: "iana",
      extensions: ["apr"]
    },
    "application/vnd.lotus-freelance": {
      source: "iana",
      extensions: ["pre"]
    },
    "application/vnd.lotus-notes": {
      source: "iana",
      extensions: ["nsf"]
    },
    "application/vnd.lotus-organizer": {
      source: "iana",
      extensions: ["org"]
    },
    "application/vnd.lotus-screencam": {
      source: "iana",
      extensions: ["scm"]
    },
    "application/vnd.lotus-wordpro": {
      source: "iana",
      extensions: ["lwp"]
    },
    "application/vnd.macports.portpkg": {
      source: "iana",
      extensions: ["portpkg"]
    },
    "application/vnd.mapbox-vector-tile": {
      source: "iana",
      extensions: ["mvt"]
    },
    "application/vnd.marlin.drm.actiontoken+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.marlin.drm.conftoken+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.marlin.drm.license+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.marlin.drm.mdcf": {
      source: "iana"
    },
    "application/vnd.mason+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.maxar.archive.3tz+zip": {
      source: "iana",
      compressible: false
    },
    "application/vnd.maxmind.maxmind-db": {
      source: "iana"
    },
    "application/vnd.mcd": {
      source: "iana",
      extensions: ["mcd"]
    },
    "application/vnd.medcalcdata": {
      source: "iana",
      extensions: ["mc1"]
    },
    "application/vnd.mediastation.cdkey": {
      source: "iana",
      extensions: ["cdkey"]
    },
    "application/vnd.meridian-slingshot": {
      source: "iana"
    },
    "application/vnd.mfer": {
      source: "iana",
      extensions: ["mwf"]
    },
    "application/vnd.mfmp": {
      source: "iana",
      extensions: ["mfm"]
    },
    "application/vnd.micro+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.micrografx.flo": {
      source: "iana",
      extensions: ["flo"]
    },
    "application/vnd.micrografx.igx": {
      source: "iana",
      extensions: ["igx"]
    },
    "application/vnd.microsoft.portable-executable": {
      source: "iana"
    },
    "application/vnd.microsoft.windows.thumbnail-cache": {
      source: "iana"
    },
    "application/vnd.miele+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.mif": {
      source: "iana",
      extensions: ["mif"]
    },
    "application/vnd.minisoft-hp3000-save": {
      source: "iana"
    },
    "application/vnd.mitsubishi.misty-guard.trustweb": {
      source: "iana"
    },
    "application/vnd.mobius.daf": {
      source: "iana",
      extensions: ["daf"]
    },
    "application/vnd.mobius.dis": {
      source: "iana",
      extensions: ["dis"]
    },
    "application/vnd.mobius.mbk": {
      source: "iana",
      extensions: ["mbk"]
    },
    "application/vnd.mobius.mqy": {
      source: "iana",
      extensions: ["mqy"]
    },
    "application/vnd.mobius.msl": {
      source: "iana",
      extensions: ["msl"]
    },
    "application/vnd.mobius.plc": {
      source: "iana",
      extensions: ["plc"]
    },
    "application/vnd.mobius.txf": {
      source: "iana",
      extensions: ["txf"]
    },
    "application/vnd.mophun.application": {
      source: "iana",
      extensions: ["mpn"]
    },
    "application/vnd.mophun.certificate": {
      source: "iana",
      extensions: ["mpc"]
    },
    "application/vnd.motorola.flexsuite": {
      source: "iana"
    },
    "application/vnd.motorola.flexsuite.adsi": {
      source: "iana"
    },
    "application/vnd.motorola.flexsuite.fis": {
      source: "iana"
    },
    "application/vnd.motorola.flexsuite.gotap": {
      source: "iana"
    },
    "application/vnd.motorola.flexsuite.kmr": {
      source: "iana"
    },
    "application/vnd.motorola.flexsuite.ttc": {
      source: "iana"
    },
    "application/vnd.motorola.flexsuite.wem": {
      source: "iana"
    },
    "application/vnd.motorola.iprm": {
      source: "iana"
    },
    "application/vnd.mozilla.xul+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xul"]
    },
    "application/vnd.ms-3mfdocument": {
      source: "iana"
    },
    "application/vnd.ms-artgalry": {
      source: "iana",
      extensions: ["cil"]
    },
    "application/vnd.ms-asf": {
      source: "iana"
    },
    "application/vnd.ms-cab-compressed": {
      source: "iana",
      extensions: ["cab"]
    },
    "application/vnd.ms-color.iccprofile": {
      source: "apache"
    },
    "application/vnd.ms-excel": {
      source: "iana",
      compressible: false,
      extensions: ["xls", "xlm", "xla", "xlc", "xlt", "xlw"]
    },
    "application/vnd.ms-excel.addin.macroenabled.12": {
      source: "iana",
      extensions: ["xlam"]
    },
    "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
      source: "iana",
      extensions: ["xlsb"]
    },
    "application/vnd.ms-excel.sheet.macroenabled.12": {
      source: "iana",
      extensions: ["xlsm"]
    },
    "application/vnd.ms-excel.template.macroenabled.12": {
      source: "iana",
      extensions: ["xltm"]
    },
    "application/vnd.ms-fontobject": {
      source: "iana",
      compressible: true,
      extensions: ["eot"]
    },
    "application/vnd.ms-htmlhelp": {
      source: "iana",
      extensions: ["chm"]
    },
    "application/vnd.ms-ims": {
      source: "iana",
      extensions: ["ims"]
    },
    "application/vnd.ms-lrm": {
      source: "iana",
      extensions: ["lrm"]
    },
    "application/vnd.ms-office.activex+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ms-officetheme": {
      source: "iana",
      extensions: ["thmx"]
    },
    "application/vnd.ms-opentype": {
      source: "apache",
      compressible: true
    },
    "application/vnd.ms-outlook": {
      compressible: false,
      extensions: ["msg"]
    },
    "application/vnd.ms-package.obfuscated-opentype": {
      source: "apache"
    },
    "application/vnd.ms-pki.seccat": {
      source: "apache",
      extensions: ["cat"]
    },
    "application/vnd.ms-pki.stl": {
      source: "apache",
      extensions: ["stl"]
    },
    "application/vnd.ms-playready.initiator+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ms-powerpoint": {
      source: "iana",
      compressible: false,
      extensions: ["ppt", "pps", "pot"]
    },
    "application/vnd.ms-powerpoint.addin.macroenabled.12": {
      source: "iana",
      extensions: ["ppam"]
    },
    "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
      source: "iana",
      extensions: ["pptm"]
    },
    "application/vnd.ms-powerpoint.slide.macroenabled.12": {
      source: "iana",
      extensions: ["sldm"]
    },
    "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
      source: "iana",
      extensions: ["ppsm"]
    },
    "application/vnd.ms-powerpoint.template.macroenabled.12": {
      source: "iana",
      extensions: ["potm"]
    },
    "application/vnd.ms-printdevicecapabilities+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ms-printing.printticket+xml": {
      source: "apache",
      compressible: true
    },
    "application/vnd.ms-printschematicket+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ms-project": {
      source: "iana",
      extensions: ["mpp", "mpt"]
    },
    "application/vnd.ms-tnef": {
      source: "iana"
    },
    "application/vnd.ms-windows.devicepairing": {
      source: "iana"
    },
    "application/vnd.ms-windows.nwprinting.oob": {
      source: "iana"
    },
    "application/vnd.ms-windows.printerpairing": {
      source: "iana"
    },
    "application/vnd.ms-windows.wsd.oob": {
      source: "iana"
    },
    "application/vnd.ms-wmdrm.lic-chlg-req": {
      source: "iana"
    },
    "application/vnd.ms-wmdrm.lic-resp": {
      source: "iana"
    },
    "application/vnd.ms-wmdrm.meter-chlg-req": {
      source: "iana"
    },
    "application/vnd.ms-wmdrm.meter-resp": {
      source: "iana"
    },
    "application/vnd.ms-word.document.macroenabled.12": {
      source: "iana",
      extensions: ["docm"]
    },
    "application/vnd.ms-word.template.macroenabled.12": {
      source: "iana",
      extensions: ["dotm"]
    },
    "application/vnd.ms-works": {
      source: "iana",
      extensions: ["wps", "wks", "wcm", "wdb"]
    },
    "application/vnd.ms-wpl": {
      source: "iana",
      extensions: ["wpl"]
    },
    "application/vnd.ms-xpsdocument": {
      source: "iana",
      compressible: false,
      extensions: ["xps"]
    },
    "application/vnd.msa-disk-image": {
      source: "iana"
    },
    "application/vnd.mseq": {
      source: "iana",
      extensions: ["mseq"]
    },
    "application/vnd.msign": {
      source: "iana"
    },
    "application/vnd.multiad.creator": {
      source: "iana"
    },
    "application/vnd.multiad.creator.cif": {
      source: "iana"
    },
    "application/vnd.music-niff": {
      source: "iana"
    },
    "application/vnd.musician": {
      source: "iana",
      extensions: ["mus"]
    },
    "application/vnd.muvee.style": {
      source: "iana",
      extensions: ["msty"]
    },
    "application/vnd.mynfc": {
      source: "iana",
      extensions: ["taglet"]
    },
    "application/vnd.nacamar.ybrid+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.ncd.control": {
      source: "iana"
    },
    "application/vnd.ncd.reference": {
      source: "iana"
    },
    "application/vnd.nearst.inv+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.nebumind.line": {
      source: "iana"
    },
    "application/vnd.nervana": {
      source: "iana"
    },
    "application/vnd.netfpx": {
      source: "iana"
    },
    "application/vnd.neurolanguage.nlu": {
      source: "iana",
      extensions: ["nlu"]
    },
    "application/vnd.nimn": {
      source: "iana"
    },
    "application/vnd.nintendo.nitro.rom": {
      source: "iana"
    },
    "application/vnd.nintendo.snes.rom": {
      source: "iana"
    },
    "application/vnd.nitf": {
      source: "iana",
      extensions: ["ntf", "nitf"]
    },
    "application/vnd.noblenet-directory": {
      source: "iana",
      extensions: ["nnd"]
    },
    "application/vnd.noblenet-sealer": {
      source: "iana",
      extensions: ["nns"]
    },
    "application/vnd.noblenet-web": {
      source: "iana",
      extensions: ["nnw"]
    },
    "application/vnd.nokia.catalogs": {
      source: "iana"
    },
    "application/vnd.nokia.conml+wbxml": {
      source: "iana"
    },
    "application/vnd.nokia.conml+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.nokia.iptv.config+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.nokia.isds-radio-presets": {
      source: "iana"
    },
    "application/vnd.nokia.landmark+wbxml": {
      source: "iana"
    },
    "application/vnd.nokia.landmark+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.nokia.landmarkcollection+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.nokia.n-gage.ac+xml": {
      source: "iana",
      compressible: true,
      extensions: ["ac"]
    },
    "application/vnd.nokia.n-gage.data": {
      source: "iana",
      extensions: ["ngdat"]
    },
    "application/vnd.nokia.n-gage.symbian.install": {
      source: "iana",
      extensions: ["n-gage"]
    },
    "application/vnd.nokia.ncd": {
      source: "iana"
    },
    "application/vnd.nokia.pcd+wbxml": {
      source: "iana"
    },
    "application/vnd.nokia.pcd+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.nokia.radio-preset": {
      source: "iana",
      extensions: ["rpst"]
    },
    "application/vnd.nokia.radio-presets": {
      source: "iana",
      extensions: ["rpss"]
    },
    "application/vnd.novadigm.edm": {
      source: "iana",
      extensions: ["edm"]
    },
    "application/vnd.novadigm.edx": {
      source: "iana",
      extensions: ["edx"]
    },
    "application/vnd.novadigm.ext": {
      source: "iana",
      extensions: ["ext"]
    },
    "application/vnd.ntt-local.content-share": {
      source: "iana"
    },
    "application/vnd.ntt-local.file-transfer": {
      source: "iana"
    },
    "application/vnd.ntt-local.ogw_remote-access": {
      source: "iana"
    },
    "application/vnd.ntt-local.sip-ta_remote": {
      source: "iana"
    },
    "application/vnd.ntt-local.sip-ta_tcp_stream": {
      source: "iana"
    },
    "application/vnd.oasis.opendocument.chart": {
      source: "iana",
      extensions: ["odc"]
    },
    "application/vnd.oasis.opendocument.chart-template": {
      source: "iana",
      extensions: ["otc"]
    },
    "application/vnd.oasis.opendocument.database": {
      source: "iana",
      extensions: ["odb"]
    },
    "application/vnd.oasis.opendocument.formula": {
      source: "iana",
      extensions: ["odf"]
    },
    "application/vnd.oasis.opendocument.formula-template": {
      source: "iana",
      extensions: ["odft"]
    },
    "application/vnd.oasis.opendocument.graphics": {
      source: "iana",
      compressible: false,
      extensions: ["odg"]
    },
    "application/vnd.oasis.opendocument.graphics-template": {
      source: "iana",
      extensions: ["otg"]
    },
    "application/vnd.oasis.opendocument.image": {
      source: "iana",
      extensions: ["odi"]
    },
    "application/vnd.oasis.opendocument.image-template": {
      source: "iana",
      extensions: ["oti"]
    },
    "application/vnd.oasis.opendocument.presentation": {
      source: "iana",
      compressible: false,
      extensions: ["odp"]
    },
    "application/vnd.oasis.opendocument.presentation-template": {
      source: "iana",
      extensions: ["otp"]
    },
    "application/vnd.oasis.opendocument.spreadsheet": {
      source: "iana",
      compressible: false,
      extensions: ["ods"]
    },
    "application/vnd.oasis.opendocument.spreadsheet-template": {
      source: "iana",
      extensions: ["ots"]
    },
    "application/vnd.oasis.opendocument.text": {
      source: "iana",
      compressible: false,
      extensions: ["odt"]
    },
    "application/vnd.oasis.opendocument.text-master": {
      source: "iana",
      extensions: ["odm"]
    },
    "application/vnd.oasis.opendocument.text-template": {
      source: "iana",
      extensions: ["ott"]
    },
    "application/vnd.oasis.opendocument.text-web": {
      source: "iana",
      extensions: ["oth"]
    },
    "application/vnd.obn": {
      source: "iana"
    },
    "application/vnd.ocf+cbor": {
      source: "iana"
    },
    "application/vnd.oci.image.manifest.v1+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oftn.l10n+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.contentaccessdownload+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.contentaccessstreaming+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.cspg-hexbinary": {
      source: "iana"
    },
    "application/vnd.oipf.dae.svg+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.dae.xhtml+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.mippvcontrolmessage+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.pae.gem": {
      source: "iana"
    },
    "application/vnd.oipf.spdiscovery+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.spdlist+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.ueprofile+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oipf.userprofile+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.olpc-sugar": {
      source: "iana",
      extensions: ["xo"]
    },
    "application/vnd.oma-scws-config": {
      source: "iana"
    },
    "application/vnd.oma-scws-http-request": {
      source: "iana"
    },
    "application/vnd.oma-scws-http-response": {
      source: "iana"
    },
    "application/vnd.oma.bcast.associated-procedure-parameter+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.bcast.drm-trigger+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.bcast.imd+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.bcast.ltkm": {
      source: "iana"
    },
    "application/vnd.oma.bcast.notification+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.bcast.provisioningtrigger": {
      source: "iana"
    },
    "application/vnd.oma.bcast.sgboot": {
      source: "iana"
    },
    "application/vnd.oma.bcast.sgdd+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.bcast.sgdu": {
      source: "iana"
    },
    "application/vnd.oma.bcast.simple-symbol-container": {
      source: "iana"
    },
    "application/vnd.oma.bcast.smartcard-trigger+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.bcast.sprov+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.bcast.stkm": {
      source: "iana"
    },
    "application/vnd.oma.cab-address-book+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.cab-feature-handler+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.cab-pcc+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.cab-subs-invite+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.cab-user-prefs+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.dcd": {
      source: "iana"
    },
    "application/vnd.oma.dcdc": {
      source: "iana"
    },
    "application/vnd.oma.dd2+xml": {
      source: "iana",
      compressible: true,
      extensions: ["dd2"]
    },
    "application/vnd.oma.drm.risd+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.group-usage-list+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.lwm2m+cbor": {
      source: "iana"
    },
    "application/vnd.oma.lwm2m+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.lwm2m+tlv": {
      source: "iana"
    },
    "application/vnd.oma.pal+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.poc.detailed-progress-report+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.poc.final-report+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.poc.groups+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.poc.invocation-descriptor+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.poc.optimized-progress-report+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.push": {
      source: "iana"
    },
    "application/vnd.oma.scidm.messages+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oma.xcap-directory+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.omads-email+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/vnd.omads-file+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/vnd.omads-folder+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/vnd.omaloc-supl-init": {
      source: "iana"
    },
    "application/vnd.onepager": {
      source: "iana"
    },
    "application/vnd.onepagertamp": {
      source: "iana"
    },
    "application/vnd.onepagertamx": {
      source: "iana"
    },
    "application/vnd.onepagertat": {
      source: "iana"
    },
    "application/vnd.onepagertatp": {
      source: "iana"
    },
    "application/vnd.onepagertatx": {
      source: "iana"
    },
    "application/vnd.openblox.game+xml": {
      source: "iana",
      compressible: true,
      extensions: ["obgx"]
    },
    "application/vnd.openblox.game-binary": {
      source: "iana"
    },
    "application/vnd.openeye.oeb": {
      source: "iana"
    },
    "application/vnd.openofficeorg.extension": {
      source: "apache",
      extensions: ["oxt"]
    },
    "application/vnd.openstreetmap.data+xml": {
      source: "iana",
      compressible: true,
      extensions: ["osm"]
    },
    "application/vnd.opentimestamps.ots": {
      source: "iana"
    },
    "application/vnd.openxmlformats-officedocument.custom-properties+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.drawing+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.extended-properties+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
      source: "iana",
      compressible: false,
      extensions: ["pptx"]
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.slide": {
      source: "iana",
      extensions: ["sldx"]
    },
    "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
      source: "iana",
      extensions: ["ppsx"]
    },
    "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.template": {
      source: "iana",
      extensions: ["potx"]
    },
    "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      source: "iana",
      compressible: false,
      extensions: ["xlsx"]
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
      source: "iana",
      extensions: ["xltx"]
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.theme+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.themeoverride+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.vmldrawing": {
      source: "iana"
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      source: "iana",
      compressible: false,
      extensions: ["docx"]
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
      source: "iana",
      extensions: ["dotx"]
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-package.core-properties+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.openxmlformats-package.relationships+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oracle.resource+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.orange.indata": {
      source: "iana"
    },
    "application/vnd.osa.netdeploy": {
      source: "iana"
    },
    "application/vnd.osgeo.mapguide.package": {
      source: "iana",
      extensions: ["mgp"]
    },
    "application/vnd.osgi.bundle": {
      source: "iana"
    },
    "application/vnd.osgi.dp": {
      source: "iana",
      extensions: ["dp"]
    },
    "application/vnd.osgi.subsystem": {
      source: "iana",
      extensions: ["esa"]
    },
    "application/vnd.otps.ct-kip+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.oxli.countgraph": {
      source: "iana"
    },
    "application/vnd.pagerduty+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.palm": {
      source: "iana",
      extensions: ["pdb", "pqa", "oprc"]
    },
    "application/vnd.panoply": {
      source: "iana"
    },
    "application/vnd.paos.xml": {
      source: "iana"
    },
    "application/vnd.patentdive": {
      source: "iana"
    },
    "application/vnd.patientecommsdoc": {
      source: "iana"
    },
    "application/vnd.pawaafile": {
      source: "iana",
      extensions: ["paw"]
    },
    "application/vnd.pcos": {
      source: "iana"
    },
    "application/vnd.pg.format": {
      source: "iana",
      extensions: ["str"]
    },
    "application/vnd.pg.osasli": {
      source: "iana",
      extensions: ["ei6"]
    },
    "application/vnd.piaccess.application-licence": {
      source: "iana"
    },
    "application/vnd.picsel": {
      source: "iana",
      extensions: ["efif"]
    },
    "application/vnd.pmi.widget": {
      source: "iana",
      extensions: ["wg"]
    },
    "application/vnd.poc.group-advertisement+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.pocketlearn": {
      source: "iana",
      extensions: ["plf"]
    },
    "application/vnd.powerbuilder6": {
      source: "iana",
      extensions: ["pbd"]
    },
    "application/vnd.powerbuilder6-s": {
      source: "iana"
    },
    "application/vnd.powerbuilder7": {
      source: "iana"
    },
    "application/vnd.powerbuilder7-s": {
      source: "iana"
    },
    "application/vnd.powerbuilder75": {
      source: "iana"
    },
    "application/vnd.powerbuilder75-s": {
      source: "iana"
    },
    "application/vnd.preminet": {
      source: "iana"
    },
    "application/vnd.previewsystems.box": {
      source: "iana",
      extensions: ["box"]
    },
    "application/vnd.proteus.magazine": {
      source: "iana",
      extensions: ["mgz"]
    },
    "application/vnd.psfs": {
      source: "iana"
    },
    "application/vnd.publishare-delta-tree": {
      source: "iana",
      extensions: ["qps"]
    },
    "application/vnd.pvi.ptid1": {
      source: "iana",
      extensions: ["ptid"]
    },
    "application/vnd.pwg-multiplexed": {
      source: "iana"
    },
    "application/vnd.pwg-xhtml-print+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.qualcomm.brew-app-res": {
      source: "iana"
    },
    "application/vnd.quarantainenet": {
      source: "iana"
    },
    "application/vnd.quark.quarkxpress": {
      source: "iana",
      extensions: ["qxd", "qxt", "qwd", "qwt", "qxl", "qxb"]
    },
    "application/vnd.quobject-quoxdocument": {
      source: "iana"
    },
    "application/vnd.radisys.moml+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-audit+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-audit-conf+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-audit-conn+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-audit-dialog+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-audit-stream+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-conf+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-dialog+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-dialog-base+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-dialog-fax-detect+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-dialog-group+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-dialog-speech+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.radisys.msml-dialog-transform+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.rainstor.data": {
      source: "iana"
    },
    "application/vnd.rapid": {
      source: "iana"
    },
    "application/vnd.rar": {
      source: "iana",
      extensions: ["rar"]
    },
    "application/vnd.realvnc.bed": {
      source: "iana",
      extensions: ["bed"]
    },
    "application/vnd.recordare.musicxml": {
      source: "iana",
      extensions: ["mxl"]
    },
    "application/vnd.recordare.musicxml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["musicxml"]
    },
    "application/vnd.renlearn.rlprint": {
      source: "iana"
    },
    "application/vnd.resilient.logic": {
      source: "iana"
    },
    "application/vnd.restful+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.rig.cryptonote": {
      source: "iana",
      extensions: ["cryptonote"]
    },
    "application/vnd.rim.cod": {
      source: "apache",
      extensions: ["cod"]
    },
    "application/vnd.rn-realmedia": {
      source: "apache",
      extensions: ["rm"]
    },
    "application/vnd.rn-realmedia-vbr": {
      source: "apache",
      extensions: ["rmvb"]
    },
    "application/vnd.route66.link66+xml": {
      source: "iana",
      compressible: true,
      extensions: ["link66"]
    },
    "application/vnd.rs-274x": {
      source: "iana"
    },
    "application/vnd.ruckus.download": {
      source: "iana"
    },
    "application/vnd.s3sms": {
      source: "iana"
    },
    "application/vnd.sailingtracker.track": {
      source: "iana",
      extensions: ["st"]
    },
    "application/vnd.sar": {
      source: "iana"
    },
    "application/vnd.sbm.cid": {
      source: "iana"
    },
    "application/vnd.sbm.mid2": {
      source: "iana"
    },
    "application/vnd.scribus": {
      source: "iana"
    },
    "application/vnd.sealed.3df": {
      source: "iana"
    },
    "application/vnd.sealed.csf": {
      source: "iana"
    },
    "application/vnd.sealed.doc": {
      source: "iana"
    },
    "application/vnd.sealed.eml": {
      source: "iana"
    },
    "application/vnd.sealed.mht": {
      source: "iana"
    },
    "application/vnd.sealed.net": {
      source: "iana"
    },
    "application/vnd.sealed.ppt": {
      source: "iana"
    },
    "application/vnd.sealed.tiff": {
      source: "iana"
    },
    "application/vnd.sealed.xls": {
      source: "iana"
    },
    "application/vnd.sealedmedia.softseal.html": {
      source: "iana"
    },
    "application/vnd.sealedmedia.softseal.pdf": {
      source: "iana"
    },
    "application/vnd.seemail": {
      source: "iana",
      extensions: ["see"]
    },
    "application/vnd.seis+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.sema": {
      source: "iana",
      extensions: ["sema"]
    },
    "application/vnd.semd": {
      source: "iana",
      extensions: ["semd"]
    },
    "application/vnd.semf": {
      source: "iana",
      extensions: ["semf"]
    },
    "application/vnd.shade-save-file": {
      source: "iana"
    },
    "application/vnd.shana.informed.formdata": {
      source: "iana",
      extensions: ["ifm"]
    },
    "application/vnd.shana.informed.formtemplate": {
      source: "iana",
      extensions: ["itp"]
    },
    "application/vnd.shana.informed.interchange": {
      source: "iana",
      extensions: ["iif"]
    },
    "application/vnd.shana.informed.package": {
      source: "iana",
      extensions: ["ipk"]
    },
    "application/vnd.shootproof+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.shopkick+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.shp": {
      source: "iana"
    },
    "application/vnd.shx": {
      source: "iana"
    },
    "application/vnd.sigrok.session": {
      source: "iana"
    },
    "application/vnd.simtech-mindmapper": {
      source: "iana",
      extensions: ["twd", "twds"]
    },
    "application/vnd.siren+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.smaf": {
      source: "iana",
      extensions: ["mmf"]
    },
    "application/vnd.smart.notebook": {
      source: "iana"
    },
    "application/vnd.smart.teacher": {
      source: "iana",
      extensions: ["teacher"]
    },
    "application/vnd.snesdev-page-table": {
      source: "iana"
    },
    "application/vnd.software602.filler.form+xml": {
      source: "iana",
      compressible: true,
      extensions: ["fo"]
    },
    "application/vnd.software602.filler.form-xml-zip": {
      source: "iana"
    },
    "application/vnd.solent.sdkm+xml": {
      source: "iana",
      compressible: true,
      extensions: ["sdkm", "sdkd"]
    },
    "application/vnd.spotfire.dxp": {
      source: "iana",
      extensions: ["dxp"]
    },
    "application/vnd.spotfire.sfs": {
      source: "iana",
      extensions: ["sfs"]
    },
    "application/vnd.sqlite3": {
      source: "iana"
    },
    "application/vnd.sss-cod": {
      source: "iana"
    },
    "application/vnd.sss-dtf": {
      source: "iana"
    },
    "application/vnd.sss-ntf": {
      source: "iana"
    },
    "application/vnd.stardivision.calc": {
      source: "apache",
      extensions: ["sdc"]
    },
    "application/vnd.stardivision.draw": {
      source: "apache",
      extensions: ["sda"]
    },
    "application/vnd.stardivision.impress": {
      source: "apache",
      extensions: ["sdd"]
    },
    "application/vnd.stardivision.math": {
      source: "apache",
      extensions: ["smf"]
    },
    "application/vnd.stardivision.writer": {
      source: "apache",
      extensions: ["sdw", "vor"]
    },
    "application/vnd.stardivision.writer-global": {
      source: "apache",
      extensions: ["sgl"]
    },
    "application/vnd.stepmania.package": {
      source: "iana",
      extensions: ["smzip"]
    },
    "application/vnd.stepmania.stepchart": {
      source: "iana",
      extensions: ["sm"]
    },
    "application/vnd.street-stream": {
      source: "iana"
    },
    "application/vnd.sun.wadl+xml": {
      source: "iana",
      compressible: true,
      extensions: ["wadl"]
    },
    "application/vnd.sun.xml.calc": {
      source: "apache",
      extensions: ["sxc"]
    },
    "application/vnd.sun.xml.calc.template": {
      source: "apache",
      extensions: ["stc"]
    },
    "application/vnd.sun.xml.draw": {
      source: "apache",
      extensions: ["sxd"]
    },
    "application/vnd.sun.xml.draw.template": {
      source: "apache",
      extensions: ["std"]
    },
    "application/vnd.sun.xml.impress": {
      source: "apache",
      extensions: ["sxi"]
    },
    "application/vnd.sun.xml.impress.template": {
      source: "apache",
      extensions: ["sti"]
    },
    "application/vnd.sun.xml.math": {
      source: "apache",
      extensions: ["sxm"]
    },
    "application/vnd.sun.xml.writer": {
      source: "apache",
      extensions: ["sxw"]
    },
    "application/vnd.sun.xml.writer.global": {
      source: "apache",
      extensions: ["sxg"]
    },
    "application/vnd.sun.xml.writer.template": {
      source: "apache",
      extensions: ["stw"]
    },
    "application/vnd.sus-calendar": {
      source: "iana",
      extensions: ["sus", "susp"]
    },
    "application/vnd.svd": {
      source: "iana",
      extensions: ["svd"]
    },
    "application/vnd.swiftview-ics": {
      source: "iana"
    },
    "application/vnd.sycle+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.syft+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.symbian.install": {
      source: "apache",
      extensions: ["sis", "sisx"]
    },
    "application/vnd.syncml+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["xsm"]
    },
    "application/vnd.syncml.dm+wbxml": {
      source: "iana",
      charset: "UTF-8",
      extensions: ["bdm"]
    },
    "application/vnd.syncml.dm+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["xdm"]
    },
    "application/vnd.syncml.dm.notification": {
      source: "iana"
    },
    "application/vnd.syncml.dmddf+wbxml": {
      source: "iana"
    },
    "application/vnd.syncml.dmddf+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["ddf"]
    },
    "application/vnd.syncml.dmtnds+wbxml": {
      source: "iana"
    },
    "application/vnd.syncml.dmtnds+xml": {
      source: "iana",
      charset: "UTF-8",
      compressible: true
    },
    "application/vnd.syncml.ds.notification": {
      source: "iana"
    },
    "application/vnd.tableschema+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.tao.intent-module-archive": {
      source: "iana",
      extensions: ["tao"]
    },
    "application/vnd.tcpdump.pcap": {
      source: "iana",
      extensions: ["pcap", "cap", "dmp"]
    },
    "application/vnd.think-cell.ppttc+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.tmd.mediaflex.api+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.tml": {
      source: "iana"
    },
    "application/vnd.tmobile-livetv": {
      source: "iana",
      extensions: ["tmo"]
    },
    "application/vnd.tri.onesource": {
      source: "iana"
    },
    "application/vnd.trid.tpt": {
      source: "iana",
      extensions: ["tpt"]
    },
    "application/vnd.triscape.mxs": {
      source: "iana",
      extensions: ["mxs"]
    },
    "application/vnd.trueapp": {
      source: "iana",
      extensions: ["tra"]
    },
    "application/vnd.truedoc": {
      source: "iana"
    },
    "application/vnd.ubisoft.webplayer": {
      source: "iana"
    },
    "application/vnd.ufdl": {
      source: "iana",
      extensions: ["ufd", "ufdl"]
    },
    "application/vnd.uiq.theme": {
      source: "iana",
      extensions: ["utz"]
    },
    "application/vnd.umajin": {
      source: "iana",
      extensions: ["umj"]
    },
    "application/vnd.unity": {
      source: "iana",
      extensions: ["unityweb"]
    },
    "application/vnd.uoml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["uoml"]
    },
    "application/vnd.uplanet.alert": {
      source: "iana"
    },
    "application/vnd.uplanet.alert-wbxml": {
      source: "iana"
    },
    "application/vnd.uplanet.bearer-choice": {
      source: "iana"
    },
    "application/vnd.uplanet.bearer-choice-wbxml": {
      source: "iana"
    },
    "application/vnd.uplanet.cacheop": {
      source: "iana"
    },
    "application/vnd.uplanet.cacheop-wbxml": {
      source: "iana"
    },
    "application/vnd.uplanet.channel": {
      source: "iana"
    },
    "application/vnd.uplanet.channel-wbxml": {
      source: "iana"
    },
    "application/vnd.uplanet.list": {
      source: "iana"
    },
    "application/vnd.uplanet.list-wbxml": {
      source: "iana"
    },
    "application/vnd.uplanet.listcmd": {
      source: "iana"
    },
    "application/vnd.uplanet.listcmd-wbxml": {
      source: "iana"
    },
    "application/vnd.uplanet.signal": {
      source: "iana"
    },
    "application/vnd.uri-map": {
      source: "iana"
    },
    "application/vnd.valve.source.material": {
      source: "iana"
    },
    "application/vnd.vcx": {
      source: "iana",
      extensions: ["vcx"]
    },
    "application/vnd.vd-study": {
      source: "iana"
    },
    "application/vnd.vectorworks": {
      source: "iana"
    },
    "application/vnd.vel+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.verimatrix.vcas": {
      source: "iana"
    },
    "application/vnd.veritone.aion+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.veryant.thin": {
      source: "iana"
    },
    "application/vnd.ves.encrypted": {
      source: "iana"
    },
    "application/vnd.vidsoft.vidconference": {
      source: "iana"
    },
    "application/vnd.visio": {
      source: "iana",
      extensions: ["vsd", "vst", "vss", "vsw"]
    },
    "application/vnd.visionary": {
      source: "iana",
      extensions: ["vis"]
    },
    "application/vnd.vividence.scriptfile": {
      source: "iana"
    },
    "application/vnd.vsf": {
      source: "iana",
      extensions: ["vsf"]
    },
    "application/vnd.wap.sic": {
      source: "iana"
    },
    "application/vnd.wap.slc": {
      source: "iana"
    },
    "application/vnd.wap.wbxml": {
      source: "iana",
      charset: "UTF-8",
      extensions: ["wbxml"]
    },
    "application/vnd.wap.wmlc": {
      source: "iana",
      extensions: ["wmlc"]
    },
    "application/vnd.wap.wmlscriptc": {
      source: "iana",
      extensions: ["wmlsc"]
    },
    "application/vnd.webturbo": {
      source: "iana",
      extensions: ["wtb"]
    },
    "application/vnd.wfa.dpp": {
      source: "iana"
    },
    "application/vnd.wfa.p2p": {
      source: "iana"
    },
    "application/vnd.wfa.wsc": {
      source: "iana"
    },
    "application/vnd.windows.devicepairing": {
      source: "iana"
    },
    "application/vnd.wmc": {
      source: "iana"
    },
    "application/vnd.wmf.bootstrap": {
      source: "iana"
    },
    "application/vnd.wolfram.mathematica": {
      source: "iana"
    },
    "application/vnd.wolfram.mathematica.package": {
      source: "iana"
    },
    "application/vnd.wolfram.player": {
      source: "iana",
      extensions: ["nbp"]
    },
    "application/vnd.wordperfect": {
      source: "iana",
      extensions: ["wpd"]
    },
    "application/vnd.wqd": {
      source: "iana",
      extensions: ["wqd"]
    },
    "application/vnd.wrq-hp3000-labelled": {
      source: "iana"
    },
    "application/vnd.wt.stf": {
      source: "iana",
      extensions: ["stf"]
    },
    "application/vnd.wv.csp+wbxml": {
      source: "iana"
    },
    "application/vnd.wv.csp+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.wv.ssp+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.xacml+json": {
      source: "iana",
      compressible: true
    },
    "application/vnd.xara": {
      source: "iana",
      extensions: ["xar"]
    },
    "application/vnd.xfdl": {
      source: "iana",
      extensions: ["xfdl"]
    },
    "application/vnd.xfdl.webform": {
      source: "iana"
    },
    "application/vnd.xmi+xml": {
      source: "iana",
      compressible: true
    },
    "application/vnd.xmpie.cpkg": {
      source: "iana"
    },
    "application/vnd.xmpie.dpkg": {
      source: "iana"
    },
    "application/vnd.xmpie.plan": {
      source: "iana"
    },
    "application/vnd.xmpie.ppkg": {
      source: "iana"
    },
    "application/vnd.xmpie.xlim": {
      source: "iana"
    },
    "application/vnd.yamaha.hv-dic": {
      source: "iana",
      extensions: ["hvd"]
    },
    "application/vnd.yamaha.hv-script": {
      source: "iana",
      extensions: ["hvs"]
    },
    "application/vnd.yamaha.hv-voice": {
      source: "iana",
      extensions: ["hvp"]
    },
    "application/vnd.yamaha.openscoreformat": {
      source: "iana",
      extensions: ["osf"]
    },
    "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
      source: "iana",
      compressible: true,
      extensions: ["osfpvg"]
    },
    "application/vnd.yamaha.remote-setup": {
      source: "iana"
    },
    "application/vnd.yamaha.smaf-audio": {
      source: "iana",
      extensions: ["saf"]
    },
    "application/vnd.yamaha.smaf-phrase": {
      source: "iana",
      extensions: ["spf"]
    },
    "application/vnd.yamaha.through-ngn": {
      source: "iana"
    },
    "application/vnd.yamaha.tunnel-udpencap": {
      source: "iana"
    },
    "application/vnd.yaoweme": {
      source: "iana"
    },
    "application/vnd.yellowriver-custom-menu": {
      source: "iana",
      extensions: ["cmp"]
    },
    "application/vnd.youtube.yt": {
      source: "iana"
    },
    "application/vnd.zul": {
      source: "iana",
      extensions: ["zir", "zirz"]
    },
    "application/vnd.zzazz.deck+xml": {
      source: "iana",
      compressible: true,
      extensions: ["zaz"]
    },
    "application/voicexml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["vxml"]
    },
    "application/voucher-cms+json": {
      source: "iana",
      compressible: true
    },
    "application/vq-rtcpxr": {
      source: "iana"
    },
    "application/wasm": {
      source: "iana",
      compressible: true,
      extensions: ["wasm"]
    },
    "application/watcherinfo+xml": {
      source: "iana",
      compressible: true,
      extensions: ["wif"]
    },
    "application/webpush-options+json": {
      source: "iana",
      compressible: true
    },
    "application/whoispp-query": {
      source: "iana"
    },
    "application/whoispp-response": {
      source: "iana"
    },
    "application/widget": {
      source: "iana",
      extensions: ["wgt"]
    },
    "application/winhlp": {
      source: "apache",
      extensions: ["hlp"]
    },
    "application/wita": {
      source: "iana"
    },
    "application/wordperfect5.1": {
      source: "iana"
    },
    "application/wsdl+xml": {
      source: "iana",
      compressible: true,
      extensions: ["wsdl"]
    },
    "application/wspolicy+xml": {
      source: "iana",
      compressible: true,
      extensions: ["wspolicy"]
    },
    "application/x-7z-compressed": {
      source: "apache",
      compressible: false,
      extensions: ["7z"]
    },
    "application/x-abiword": {
      source: "apache",
      extensions: ["abw"]
    },
    "application/x-ace-compressed": {
      source: "apache",
      extensions: ["ace"]
    },
    "application/x-amf": {
      source: "apache"
    },
    "application/x-apple-diskimage": {
      source: "apache",
      extensions: ["dmg"]
    },
    "application/x-arj": {
      compressible: false,
      extensions: ["arj"]
    },
    "application/x-authorware-bin": {
      source: "apache",
      extensions: ["aab", "x32", "u32", "vox"]
    },
    "application/x-authorware-map": {
      source: "apache",
      extensions: ["aam"]
    },
    "application/x-authorware-seg": {
      source: "apache",
      extensions: ["aas"]
    },
    "application/x-bcpio": {
      source: "apache",
      extensions: ["bcpio"]
    },
    "application/x-bdoc": {
      compressible: false,
      extensions: ["bdoc"]
    },
    "application/x-bittorrent": {
      source: "apache",
      extensions: ["torrent"]
    },
    "application/x-blorb": {
      source: "apache",
      extensions: ["blb", "blorb"]
    },
    "application/x-bzip": {
      source: "apache",
      compressible: false,
      extensions: ["bz"]
    },
    "application/x-bzip2": {
      source: "apache",
      compressible: false,
      extensions: ["bz2", "boz"]
    },
    "application/x-cbr": {
      source: "apache",
      extensions: ["cbr", "cba", "cbt", "cbz", "cb7"]
    },
    "application/x-cdlink": {
      source: "apache",
      extensions: ["vcd"]
    },
    "application/x-cfs-compressed": {
      source: "apache",
      extensions: ["cfs"]
    },
    "application/x-chat": {
      source: "apache",
      extensions: ["chat"]
    },
    "application/x-chess-pgn": {
      source: "apache",
      extensions: ["pgn"]
    },
    "application/x-chrome-extension": {
      extensions: ["crx"]
    },
    "application/x-cocoa": {
      source: "nginx",
      extensions: ["cco"]
    },
    "application/x-compress": {
      source: "apache"
    },
    "application/x-conference": {
      source: "apache",
      extensions: ["nsc"]
    },
    "application/x-cpio": {
      source: "apache",
      extensions: ["cpio"]
    },
    "application/x-csh": {
      source: "apache",
      extensions: ["csh"]
    },
    "application/x-deb": {
      compressible: false
    },
    "application/x-debian-package": {
      source: "apache",
      extensions: ["deb", "udeb"]
    },
    "application/x-dgc-compressed": {
      source: "apache",
      extensions: ["dgc"]
    },
    "application/x-director": {
      source: "apache",
      extensions: ["dir", "dcr", "dxr", "cst", "cct", "cxt", "w3d", "fgd", "swa"]
    },
    "application/x-doom": {
      source: "apache",
      extensions: ["wad"]
    },
    "application/x-dtbncx+xml": {
      source: "apache",
      compressible: true,
      extensions: ["ncx"]
    },
    "application/x-dtbook+xml": {
      source: "apache",
      compressible: true,
      extensions: ["dtb"]
    },
    "application/x-dtbresource+xml": {
      source: "apache",
      compressible: true,
      extensions: ["res"]
    },
    "application/x-dvi": {
      source: "apache",
      compressible: false,
      extensions: ["dvi"]
    },
    "application/x-envoy": {
      source: "apache",
      extensions: ["evy"]
    },
    "application/x-eva": {
      source: "apache",
      extensions: ["eva"]
    },
    "application/x-font-bdf": {
      source: "apache",
      extensions: ["bdf"]
    },
    "application/x-font-dos": {
      source: "apache"
    },
    "application/x-font-framemaker": {
      source: "apache"
    },
    "application/x-font-ghostscript": {
      source: "apache",
      extensions: ["gsf"]
    },
    "application/x-font-libgrx": {
      source: "apache"
    },
    "application/x-font-linux-psf": {
      source: "apache",
      extensions: ["psf"]
    },
    "application/x-font-pcf": {
      source: "apache",
      extensions: ["pcf"]
    },
    "application/x-font-snf": {
      source: "apache",
      extensions: ["snf"]
    },
    "application/x-font-speedo": {
      source: "apache"
    },
    "application/x-font-sunos-news": {
      source: "apache"
    },
    "application/x-font-type1": {
      source: "apache",
      extensions: ["pfa", "pfb", "pfm", "afm"]
    },
    "application/x-font-vfont": {
      source: "apache"
    },
    "application/x-freearc": {
      source: "apache",
      extensions: ["arc"]
    },
    "application/x-futuresplash": {
      source: "apache",
      extensions: ["spl"]
    },
    "application/x-gca-compressed": {
      source: "apache",
      extensions: ["gca"]
    },
    "application/x-glulx": {
      source: "apache",
      extensions: ["ulx"]
    },
    "application/x-gnumeric": {
      source: "apache",
      extensions: ["gnumeric"]
    },
    "application/x-gramps-xml": {
      source: "apache",
      extensions: ["gramps"]
    },
    "application/x-gtar": {
      source: "apache",
      extensions: ["gtar"]
    },
    "application/x-gzip": {
      source: "apache"
    },
    "application/x-hdf": {
      source: "apache",
      extensions: ["hdf"]
    },
    "application/x-httpd-php": {
      compressible: true,
      extensions: ["php"]
    },
    "application/x-install-instructions": {
      source: "apache",
      extensions: ["install"]
    },
    "application/x-iso9660-image": {
      source: "apache",
      extensions: ["iso"]
    },
    "application/x-iwork-keynote-sffkey": {
      extensions: ["key"]
    },
    "application/x-iwork-numbers-sffnumbers": {
      extensions: ["numbers"]
    },
    "application/x-iwork-pages-sffpages": {
      extensions: ["pages"]
    },
    "application/x-java-archive-diff": {
      source: "nginx",
      extensions: ["jardiff"]
    },
    "application/x-java-jnlp-file": {
      source: "apache",
      compressible: false,
      extensions: ["jnlp"]
    },
    "application/x-javascript": {
      compressible: true
    },
    "application/x-keepass2": {
      extensions: ["kdbx"]
    },
    "application/x-latex": {
      source: "apache",
      compressible: false,
      extensions: ["latex"]
    },
    "application/x-lua-bytecode": {
      extensions: ["luac"]
    },
    "application/x-lzh-compressed": {
      source: "apache",
      extensions: ["lzh", "lha"]
    },
    "application/x-makeself": {
      source: "nginx",
      extensions: ["run"]
    },
    "application/x-mie": {
      source: "apache",
      extensions: ["mie"]
    },
    "application/x-mobipocket-ebook": {
      source: "apache",
      extensions: ["prc", "mobi"]
    },
    "application/x-mpegurl": {
      compressible: false
    },
    "application/x-ms-application": {
      source: "apache",
      extensions: ["application"]
    },
    "application/x-ms-shortcut": {
      source: "apache",
      extensions: ["lnk"]
    },
    "application/x-ms-wmd": {
      source: "apache",
      extensions: ["wmd"]
    },
    "application/x-ms-wmz": {
      source: "apache",
      extensions: ["wmz"]
    },
    "application/x-ms-xbap": {
      source: "apache",
      extensions: ["xbap"]
    },
    "application/x-msaccess": {
      source: "apache",
      extensions: ["mdb"]
    },
    "application/x-msbinder": {
      source: "apache",
      extensions: ["obd"]
    },
    "application/x-mscardfile": {
      source: "apache",
      extensions: ["crd"]
    },
    "application/x-msclip": {
      source: "apache",
      extensions: ["clp"]
    },
    "application/x-msdos-program": {
      extensions: ["exe"]
    },
    "application/x-msdownload": {
      source: "apache",
      extensions: ["exe", "dll", "com", "bat", "msi"]
    },
    "application/x-msmediaview": {
      source: "apache",
      extensions: ["mvb", "m13", "m14"]
    },
    "application/x-msmetafile": {
      source: "apache",
      extensions: ["wmf", "wmz", "emf", "emz"]
    },
    "application/x-msmoney": {
      source: "apache",
      extensions: ["mny"]
    },
    "application/x-mspublisher": {
      source: "apache",
      extensions: ["pub"]
    },
    "application/x-msschedule": {
      source: "apache",
      extensions: ["scd"]
    },
    "application/x-msterminal": {
      source: "apache",
      extensions: ["trm"]
    },
    "application/x-mswrite": {
      source: "apache",
      extensions: ["wri"]
    },
    "application/x-netcdf": {
      source: "apache",
      extensions: ["nc", "cdf"]
    },
    "application/x-ns-proxy-autoconfig": {
      compressible: true,
      extensions: ["pac"]
    },
    "application/x-nzb": {
      source: "apache",
      extensions: ["nzb"]
    },
    "application/x-perl": {
      source: "nginx",
      extensions: ["pl", "pm"]
    },
    "application/x-pilot": {
      source: "nginx",
      extensions: ["prc", "pdb"]
    },
    "application/x-pkcs12": {
      source: "apache",
      compressible: false,
      extensions: ["p12", "pfx"]
    },
    "application/x-pkcs7-certificates": {
      source: "apache",
      extensions: ["p7b", "spc"]
    },
    "application/x-pkcs7-certreqresp": {
      source: "apache",
      extensions: ["p7r"]
    },
    "application/x-pki-message": {
      source: "iana"
    },
    "application/x-rar-compressed": {
      source: "apache",
      compressible: false,
      extensions: ["rar"]
    },
    "application/x-redhat-package-manager": {
      source: "nginx",
      extensions: ["rpm"]
    },
    "application/x-research-info-systems": {
      source: "apache",
      extensions: ["ris"]
    },
    "application/x-sea": {
      source: "nginx",
      extensions: ["sea"]
    },
    "application/x-sh": {
      source: "apache",
      compressible: true,
      extensions: ["sh"]
    },
    "application/x-shar": {
      source: "apache",
      extensions: ["shar"]
    },
    "application/x-shockwave-flash": {
      source: "apache",
      compressible: false,
      extensions: ["swf"]
    },
    "application/x-silverlight-app": {
      source: "apache",
      extensions: ["xap"]
    },
    "application/x-sql": {
      source: "apache",
      extensions: ["sql"]
    },
    "application/x-stuffit": {
      source: "apache",
      compressible: false,
      extensions: ["sit"]
    },
    "application/x-stuffitx": {
      source: "apache",
      extensions: ["sitx"]
    },
    "application/x-subrip": {
      source: "apache",
      extensions: ["srt"]
    },
    "application/x-sv4cpio": {
      source: "apache",
      extensions: ["sv4cpio"]
    },
    "application/x-sv4crc": {
      source: "apache",
      extensions: ["sv4crc"]
    },
    "application/x-t3vm-image": {
      source: "apache",
      extensions: ["t3"]
    },
    "application/x-tads": {
      source: "apache",
      extensions: ["gam"]
    },
    "application/x-tar": {
      source: "apache",
      compressible: true,
      extensions: ["tar"]
    },
    "application/x-tcl": {
      source: "apache",
      extensions: ["tcl", "tk"]
    },
    "application/x-tex": {
      source: "apache",
      extensions: ["tex"]
    },
    "application/x-tex-tfm": {
      source: "apache",
      extensions: ["tfm"]
    },
    "application/x-texinfo": {
      source: "apache",
      extensions: ["texinfo", "texi"]
    },
    "application/x-tgif": {
      source: "apache",
      extensions: ["obj"]
    },
    "application/x-ustar": {
      source: "apache",
      extensions: ["ustar"]
    },
    "application/x-virtualbox-hdd": {
      compressible: true,
      extensions: ["hdd"]
    },
    "application/x-virtualbox-ova": {
      compressible: true,
      extensions: ["ova"]
    },
    "application/x-virtualbox-ovf": {
      compressible: true,
      extensions: ["ovf"]
    },
    "application/x-virtualbox-vbox": {
      compressible: true,
      extensions: ["vbox"]
    },
    "application/x-virtualbox-vbox-extpack": {
      compressible: false,
      extensions: ["vbox-extpack"]
    },
    "application/x-virtualbox-vdi": {
      compressible: true,
      extensions: ["vdi"]
    },
    "application/x-virtualbox-vhd": {
      compressible: true,
      extensions: ["vhd"]
    },
    "application/x-virtualbox-vmdk": {
      compressible: true,
      extensions: ["vmdk"]
    },
    "application/x-wais-source": {
      source: "apache",
      extensions: ["src"]
    },
    "application/x-web-app-manifest+json": {
      compressible: true,
      extensions: ["webapp"]
    },
    "application/x-www-form-urlencoded": {
      source: "iana",
      compressible: true
    },
    "application/x-x509-ca-cert": {
      source: "iana",
      extensions: ["der", "crt", "pem"]
    },
    "application/x-x509-ca-ra-cert": {
      source: "iana"
    },
    "application/x-x509-next-ca-cert": {
      source: "iana"
    },
    "application/x-xfig": {
      source: "apache",
      extensions: ["fig"]
    },
    "application/x-xliff+xml": {
      source: "apache",
      compressible: true,
      extensions: ["xlf"]
    },
    "application/x-xpinstall": {
      source: "apache",
      compressible: false,
      extensions: ["xpi"]
    },
    "application/x-xz": {
      source: "apache",
      extensions: ["xz"]
    },
    "application/x-zmachine": {
      source: "apache",
      extensions: ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8"]
    },
    "application/x400-bp": {
      source: "iana"
    },
    "application/xacml+xml": {
      source: "iana",
      compressible: true
    },
    "application/xaml+xml": {
      source: "apache",
      compressible: true,
      extensions: ["xaml"]
    },
    "application/xcap-att+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xav"]
    },
    "application/xcap-caps+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xca"]
    },
    "application/xcap-diff+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xdf"]
    },
    "application/xcap-el+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xel"]
    },
    "application/xcap-error+xml": {
      source: "iana",
      compressible: true
    },
    "application/xcap-ns+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xns"]
    },
    "application/xcon-conference-info+xml": {
      source: "iana",
      compressible: true
    },
    "application/xcon-conference-info-diff+xml": {
      source: "iana",
      compressible: true
    },
    "application/xenc+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xenc"]
    },
    "application/xhtml+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xhtml", "xht"]
    },
    "application/xhtml-voice+xml": {
      source: "apache",
      compressible: true
    },
    "application/xliff+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xlf"]
    },
    "application/xml": {
      source: "iana",
      compressible: true,
      extensions: ["xml", "xsl", "xsd", "rng"]
    },
    "application/xml-dtd": {
      source: "iana",
      compressible: true,
      extensions: ["dtd"]
    },
    "application/xml-external-parsed-entity": {
      source: "iana"
    },
    "application/xml-patch+xml": {
      source: "iana",
      compressible: true
    },
    "application/xmpp+xml": {
      source: "iana",
      compressible: true
    },
    "application/xop+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xop"]
    },
    "application/xproc+xml": {
      source: "apache",
      compressible: true,
      extensions: ["xpl"]
    },
    "application/xslt+xml": {
      source: "iana",
      compressible: true,
      extensions: ["xsl", "xslt"]
    },
    "application/xspf+xml": {
      source: "apache",
      compressible: true,
      extensions: ["xspf"]
    },
    "application/xv+xml": {
      source: "iana",
      compressible: true,
      extensions: ["mxml", "xhvml", "xvml", "xvm"]
    },
    "application/yang": {
      source: "iana",
      extensions: ["yang"]
    },
    "application/yang-data+json": {
      source: "iana",
      compressible: true
    },
    "application/yang-data+xml": {
      source: "iana",
      compressible: true
    },
    "application/yang-patch+json": {
      source: "iana",
      compressible: true
    },
    "application/yang-patch+xml": {
      source: "iana",
      compressible: true
    },
    "application/yin+xml": {
      source: "iana",
      compressible: true,
      extensions: ["yin"]
    },
    "application/zip": {
      source: "iana",
      compressible: false,
      extensions: ["zip"]
    },
    "application/zlib": {
      source: "iana"
    },
    "application/zstd": {
      source: "iana"
    },
    "audio/1d-interleaved-parityfec": {
      source: "iana"
    },
    "audio/32kadpcm": {
      source: "iana"
    },
    "audio/3gpp": {
      source: "iana",
      compressible: false,
      extensions: ["3gpp"]
    },
    "audio/3gpp2": {
      source: "iana"
    },
    "audio/aac": {
      source: "iana"
    },
    "audio/ac3": {
      source: "iana"
    },
    "audio/adpcm": {
      source: "apache",
      extensions: ["adp"]
    },
    "audio/amr": {
      source: "iana",
      extensions: ["amr"]
    },
    "audio/amr-wb": {
      source: "iana"
    },
    "audio/amr-wb+": {
      source: "iana"
    },
    "audio/aptx": {
      source: "iana"
    },
    "audio/asc": {
      source: "iana"
    },
    "audio/atrac-advanced-lossless": {
      source: "iana"
    },
    "audio/atrac-x": {
      source: "iana"
    },
    "audio/atrac3": {
      source: "iana"
    },
    "audio/basic": {
      source: "iana",
      compressible: false,
      extensions: ["au", "snd"]
    },
    "audio/bv16": {
      source: "iana"
    },
    "audio/bv32": {
      source: "iana"
    },
    "audio/clearmode": {
      source: "iana"
    },
    "audio/cn": {
      source: "iana"
    },
    "audio/dat12": {
      source: "iana"
    },
    "audio/dls": {
      source: "iana"
    },
    "audio/dsr-es201108": {
      source: "iana"
    },
    "audio/dsr-es202050": {
      source: "iana"
    },
    "audio/dsr-es202211": {
      source: "iana"
    },
    "audio/dsr-es202212": {
      source: "iana"
    },
    "audio/dv": {
      source: "iana"
    },
    "audio/dvi4": {
      source: "iana"
    },
    "audio/eac3": {
      source: "iana"
    },
    "audio/encaprtp": {
      source: "iana"
    },
    "audio/evrc": {
      source: "iana"
    },
    "audio/evrc-qcp": {
      source: "iana"
    },
    "audio/evrc0": {
      source: "iana"
    },
    "audio/evrc1": {
      source: "iana"
    },
    "audio/evrcb": {
      source: "iana"
    },
    "audio/evrcb0": {
      source: "iana"
    },
    "audio/evrcb1": {
      source: "iana"
    },
    "audio/evrcnw": {
      source: "iana"
    },
    "audio/evrcnw0": {
      source: "iana"
    },
    "audio/evrcnw1": {
      source: "iana"
    },
    "audio/evrcwb": {
      source: "iana"
    },
    "audio/evrcwb0": {
      source: "iana"
    },
    "audio/evrcwb1": {
      source: "iana"
    },
    "audio/evs": {
      source: "iana"
    },
    "audio/flexfec": {
      source: "iana"
    },
    "audio/fwdred": {
      source: "iana"
    },
    "audio/g711-0": {
      source: "iana"
    },
    "audio/g719": {
      source: "iana"
    },
    "audio/g722": {
      source: "iana"
    },
    "audio/g7221": {
      source: "iana"
    },
    "audio/g723": {
      source: "iana"
    },
    "audio/g726-16": {
      source: "iana"
    },
    "audio/g726-24": {
      source: "iana"
    },
    "audio/g726-32": {
      source: "iana"
    },
    "audio/g726-40": {
      source: "iana"
    },
    "audio/g728": {
      source: "iana"
    },
    "audio/g729": {
      source: "iana"
    },
    "audio/g7291": {
      source: "iana"
    },
    "audio/g729d": {
      source: "iana"
    },
    "audio/g729e": {
      source: "iana"
    },
    "audio/gsm": {
      source: "iana"
    },
    "audio/gsm-efr": {
      source: "iana"
    },
    "audio/gsm-hr-08": {
      source: "iana"
    },
    "audio/ilbc": {
      source: "iana"
    },
    "audio/ip-mr_v2.5": {
      source: "iana"
    },
    "audio/isac": {
      source: "apache"
    },
    "audio/l16": {
      source: "iana"
    },
    "audio/l20": {
      source: "iana"
    },
    "audio/l24": {
      source: "iana",
      compressible: false
    },
    "audio/l8": {
      source: "iana"
    },
    "audio/lpc": {
      source: "iana"
    },
    "audio/melp": {
      source: "iana"
    },
    "audio/melp1200": {
      source: "iana"
    },
    "audio/melp2400": {
      source: "iana"
    },
    "audio/melp600": {
      source: "iana"
    },
    "audio/mhas": {
      source: "iana"
    },
    "audio/midi": {
      source: "apache",
      extensions: ["mid", "midi", "kar", "rmi"]
    },
    "audio/mobile-xmf": {
      source: "iana",
      extensions: ["mxmf"]
    },
    "audio/mp3": {
      compressible: false,
      extensions: ["mp3"]
    },
    "audio/mp4": {
      source: "iana",
      compressible: false,
      extensions: ["m4a", "mp4a"]
    },
    "audio/mp4a-latm": {
      source: "iana"
    },
    "audio/mpa": {
      source: "iana"
    },
    "audio/mpa-robust": {
      source: "iana"
    },
    "audio/mpeg": {
      source: "iana",
      compressible: false,
      extensions: ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"]
    },
    "audio/mpeg4-generic": {
      source: "iana"
    },
    "audio/musepack": {
      source: "apache"
    },
    "audio/ogg": {
      source: "iana",
      compressible: false,
      extensions: ["oga", "ogg", "spx", "opus"]
    },
    "audio/opus": {
      source: "iana"
    },
    "audio/parityfec": {
      source: "iana"
    },
    "audio/pcma": {
      source: "iana"
    },
    "audio/pcma-wb": {
      source: "iana"
    },
    "audio/pcmu": {
      source: "iana"
    },
    "audio/pcmu-wb": {
      source: "iana"
    },
    "audio/prs.sid": {
      source: "iana"
    },
    "audio/qcelp": {
      source: "iana"
    },
    "audio/raptorfec": {
      source: "iana"
    },
    "audio/red": {
      source: "iana"
    },
    "audio/rtp-enc-aescm128": {
      source: "iana"
    },
    "audio/rtp-midi": {
      source: "iana"
    },
    "audio/rtploopback": {
      source: "iana"
    },
    "audio/rtx": {
      source: "iana"
    },
    "audio/s3m": {
      source: "apache",
      extensions: ["s3m"]
    },
    "audio/scip": {
      source: "iana"
    },
    "audio/silk": {
      source: "apache",
      extensions: ["sil"]
    },
    "audio/smv": {
      source: "iana"
    },
    "audio/smv-qcp": {
      source: "iana"
    },
    "audio/smv0": {
      source: "iana"
    },
    "audio/sofa": {
      source: "iana"
    },
    "audio/sp-midi": {
      source: "iana"
    },
    "audio/speex": {
      source: "iana"
    },
    "audio/t140c": {
      source: "iana"
    },
    "audio/t38": {
      source: "iana"
    },
    "audio/telephone-event": {
      source: "iana"
    },
    "audio/tetra_acelp": {
      source: "iana"
    },
    "audio/tetra_acelp_bb": {
      source: "iana"
    },
    "audio/tone": {
      source: "iana"
    },
    "audio/tsvcis": {
      source: "iana"
    },
    "audio/uemclip": {
      source: "iana"
    },
    "audio/ulpfec": {
      source: "iana"
    },
    "audio/usac": {
      source: "iana"
    },
    "audio/vdvi": {
      source: "iana"
    },
    "audio/vmr-wb": {
      source: "iana"
    },
    "audio/vnd.3gpp.iufp": {
      source: "iana"
    },
    "audio/vnd.4sb": {
      source: "iana"
    },
    "audio/vnd.audiokoz": {
      source: "iana"
    },
    "audio/vnd.celp": {
      source: "iana"
    },
    "audio/vnd.cisco.nse": {
      source: "iana"
    },
    "audio/vnd.cmles.radio-events": {
      source: "iana"
    },
    "audio/vnd.cns.anp1": {
      source: "iana"
    },
    "audio/vnd.cns.inf1": {
      source: "iana"
    },
    "audio/vnd.dece.audio": {
      source: "iana",
      extensions: ["uva", "uvva"]
    },
    "audio/vnd.digital-winds": {
      source: "iana",
      extensions: ["eol"]
    },
    "audio/vnd.dlna.adts": {
      source: "iana"
    },
    "audio/vnd.dolby.heaac.1": {
      source: "iana"
    },
    "audio/vnd.dolby.heaac.2": {
      source: "iana"
    },
    "audio/vnd.dolby.mlp": {
      source: "iana"
    },
    "audio/vnd.dolby.mps": {
      source: "iana"
    },
    "audio/vnd.dolby.pl2": {
      source: "iana"
    },
    "audio/vnd.dolby.pl2x": {
      source: "iana"
    },
    "audio/vnd.dolby.pl2z": {
      source: "iana"
    },
    "audio/vnd.dolby.pulse.1": {
      source: "iana"
    },
    "audio/vnd.dra": {
      source: "iana",
      extensions: ["dra"]
    },
    "audio/vnd.dts": {
      source: "iana",
      extensions: ["dts"]
    },
    "audio/vnd.dts.hd": {
      source: "iana",
      extensions: ["dtshd"]
    },
    "audio/vnd.dts.uhd": {
      source: "iana"
    },
    "audio/vnd.dvb.file": {
      source: "iana"
    },
    "audio/vnd.everad.plj": {
      source: "iana"
    },
    "audio/vnd.hns.audio": {
      source: "iana"
    },
    "audio/vnd.lucent.voice": {
      source: "iana",
      extensions: ["lvp"]
    },
    "audio/vnd.ms-playready.media.pya": {
      source: "iana",
      extensions: ["pya"]
    },
    "audio/vnd.nokia.mobile-xmf": {
      source: "iana"
    },
    "audio/vnd.nortel.vbk": {
      source: "iana"
    },
    "audio/vnd.nuera.ecelp4800": {
      source: "iana",
      extensions: ["ecelp4800"]
    },
    "audio/vnd.nuera.ecelp7470": {
      source: "iana",
      extensions: ["ecelp7470"]
    },
    "audio/vnd.nuera.ecelp9600": {
      source: "iana",
      extensions: ["ecelp9600"]
    },
    "audio/vnd.octel.sbc": {
      source: "iana"
    },
    "audio/vnd.presonus.multitrack": {
      source: "iana"
    },
    "audio/vnd.qcelp": {
      source: "iana"
    },
    "audio/vnd.rhetorex.32kadpcm": {
      source: "iana"
    },
    "audio/vnd.rip": {
      source: "iana",
      extensions: ["rip"]
    },
    "audio/vnd.rn-realaudio": {
      compressible: false
    },
    "audio/vnd.sealedmedia.softseal.mpeg": {
      source: "iana"
    },
    "audio/vnd.vmx.cvsd": {
      source: "iana"
    },
    "audio/vnd.wave": {
      compressible: false
    },
    "audio/vorbis": {
      source: "iana",
      compressible: false
    },
    "audio/vorbis-config": {
      source: "iana"
    },
    "audio/wav": {
      compressible: false,
      extensions: ["wav"]
    },
    "audio/wave": {
      compressible: false,
      extensions: ["wav"]
    },
    "audio/webm": {
      source: "apache",
      compressible: false,
      extensions: ["weba"]
    },
    "audio/x-aac": {
      source: "apache",
      compressible: false,
      extensions: ["aac"]
    },
    "audio/x-aiff": {
      source: "apache",
      extensions: ["aif", "aiff", "aifc"]
    },
    "audio/x-caf": {
      source: "apache",
      compressible: false,
      extensions: ["caf"]
    },
    "audio/x-flac": {
      source: "apache",
      extensions: ["flac"]
    },
    "audio/x-m4a": {
      source: "nginx",
      extensions: ["m4a"]
    },
    "audio/x-matroska": {
      source: "apache",
      extensions: ["mka"]
    },
    "audio/x-mpegurl": {
      source: "apache",
      extensions: ["m3u"]
    },
    "audio/x-ms-wax": {
      source: "apache",
      extensions: ["wax"]
    },
    "audio/x-ms-wma": {
      source: "apache",
      extensions: ["wma"]
    },
    "audio/x-pn-realaudio": {
      source: "apache",
      extensions: ["ram", "ra"]
    },
    "audio/x-pn-realaudio-plugin": {
      source: "apache",
      extensions: ["rmp"]
    },
    "audio/x-realaudio": {
      source: "nginx",
      extensions: ["ra"]
    },
    "audio/x-tta": {
      source: "apache"
    },
    "audio/x-wav": {
      source: "apache",
      extensions: ["wav"]
    },
    "audio/xm": {
      source: "apache",
      extensions: ["xm"]
    },
    "chemical/x-cdx": {
      source: "apache",
      extensions: ["cdx"]
    },
    "chemical/x-cif": {
      source: "apache",
      extensions: ["cif"]
    },
    "chemical/x-cmdf": {
      source: "apache",
      extensions: ["cmdf"]
    },
    "chemical/x-cml": {
      source: "apache",
      extensions: ["cml"]
    },
    "chemical/x-csml": {
      source: "apache",
      extensions: ["csml"]
    },
    "chemical/x-pdb": {
      source: "apache"
    },
    "chemical/x-xyz": {
      source: "apache",
      extensions: ["xyz"]
    },
    "font/collection": {
      source: "iana",
      extensions: ["ttc"]
    },
    "font/otf": {
      source: "iana",
      compressible: true,
      extensions: ["otf"]
    },
    "font/sfnt": {
      source: "iana"
    },
    "font/ttf": {
      source: "iana",
      compressible: true,
      extensions: ["ttf"]
    },
    "font/woff": {
      source: "iana",
      extensions: ["woff"]
    },
    "font/woff2": {
      source: "iana",
      extensions: ["woff2"]
    },
    "image/aces": {
      source: "iana",
      extensions: ["exr"]
    },
    "image/apng": {
      compressible: false,
      extensions: ["apng"]
    },
    "image/avci": {
      source: "iana",
      extensions: ["avci"]
    },
    "image/avcs": {
      source: "iana",
      extensions: ["avcs"]
    },
    "image/avif": {
      source: "iana",
      compressible: false,
      extensions: ["avif"]
    },
    "image/bmp": {
      source: "iana",
      compressible: true,
      extensions: ["bmp"]
    },
    "image/cgm": {
      source: "iana",
      extensions: ["cgm"]
    },
    "image/dicom-rle": {
      source: "iana",
      extensions: ["drle"]
    },
    "image/emf": {
      source: "iana",
      extensions: ["emf"]
    },
    "image/fits": {
      source: "iana",
      extensions: ["fits"]
    },
    "image/g3fax": {
      source: "iana",
      extensions: ["g3"]
    },
    "image/gif": {
      source: "iana",
      compressible: false,
      extensions: ["gif"]
    },
    "image/heic": {
      source: "iana",
      extensions: ["heic"]
    },
    "image/heic-sequence": {
      source: "iana",
      extensions: ["heics"]
    },
    "image/heif": {
      source: "iana",
      extensions: ["heif"]
    },
    "image/heif-sequence": {
      source: "iana",
      extensions: ["heifs"]
    },
    "image/hej2k": {
      source: "iana",
      extensions: ["hej2"]
    },
    "image/hsj2": {
      source: "iana",
      extensions: ["hsj2"]
    },
    "image/ief": {
      source: "iana",
      extensions: ["ief"]
    },
    "image/jls": {
      source: "iana",
      extensions: ["jls"]
    },
    "image/jp2": {
      source: "iana",
      compressible: false,
      extensions: ["jp2", "jpg2"]
    },
    "image/jpeg": {
      source: "iana",
      compressible: false,
      extensions: ["jpeg", "jpg", "jpe"]
    },
    "image/jph": {
      source: "iana",
      extensions: ["jph"]
    },
    "image/jphc": {
      source: "iana",
      extensions: ["jhc"]
    },
    "image/jpm": {
      source: "iana",
      compressible: false,
      extensions: ["jpm"]
    },
    "image/jpx": {
      source: "iana",
      compressible: false,
      extensions: ["jpx", "jpf"]
    },
    "image/jxr": {
      source: "iana",
      extensions: ["jxr"]
    },
    "image/jxra": {
      source: "iana",
      extensions: ["jxra"]
    },
    "image/jxrs": {
      source: "iana",
      extensions: ["jxrs"]
    },
    "image/jxs": {
      source: "iana",
      extensions: ["jxs"]
    },
    "image/jxsc": {
      source: "iana",
      extensions: ["jxsc"]
    },
    "image/jxsi": {
      source: "iana",
      extensions: ["jxsi"]
    },
    "image/jxss": {
      source: "iana",
      extensions: ["jxss"]
    },
    "image/ktx": {
      source: "iana",
      extensions: ["ktx"]
    },
    "image/ktx2": {
      source: "iana",
      extensions: ["ktx2"]
    },
    "image/naplps": {
      source: "iana"
    },
    "image/pjpeg": {
      compressible: false
    },
    "image/png": {
      source: "iana",
      compressible: false,
      extensions: ["png"]
    },
    "image/prs.btif": {
      source: "iana",
      extensions: ["btif"]
    },
    "image/prs.pti": {
      source: "iana",
      extensions: ["pti"]
    },
    "image/pwg-raster": {
      source: "iana"
    },
    "image/sgi": {
      source: "apache",
      extensions: ["sgi"]
    },
    "image/svg+xml": {
      source: "iana",
      compressible: true,
      extensions: ["svg", "svgz"]
    },
    "image/t38": {
      source: "iana",
      extensions: ["t38"]
    },
    "image/tiff": {
      source: "iana",
      compressible: false,
      extensions: ["tif", "tiff"]
    },
    "image/tiff-fx": {
      source: "iana",
      extensions: ["tfx"]
    },
    "image/vnd.adobe.photoshop": {
      source: "iana",
      compressible: true,
      extensions: ["psd"]
    },
    "image/vnd.airzip.accelerator.azv": {
      source: "iana",
      extensions: ["azv"]
    },
    "image/vnd.cns.inf2": {
      source: "iana"
    },
    "image/vnd.dece.graphic": {
      source: "iana",
      extensions: ["uvi", "uvvi", "uvg", "uvvg"]
    },
    "image/vnd.djvu": {
      source: "iana",
      extensions: ["djvu", "djv"]
    },
    "image/vnd.dvb.subtitle": {
      source: "iana",
      extensions: ["sub"]
    },
    "image/vnd.dwg": {
      source: "iana",
      extensions: ["dwg"]
    },
    "image/vnd.dxf": {
      source: "iana",
      extensions: ["dxf"]
    },
    "image/vnd.fastbidsheet": {
      source: "iana",
      extensions: ["fbs"]
    },
    "image/vnd.fpx": {
      source: "iana",
      extensions: ["fpx"]
    },
    "image/vnd.fst": {
      source: "iana",
      extensions: ["fst"]
    },
    "image/vnd.fujixerox.edmics-mmr": {
      source: "iana",
      extensions: ["mmr"]
    },
    "image/vnd.fujixerox.edmics-rlc": {
      source: "iana",
      extensions: ["rlc"]
    },
    "image/vnd.globalgraphics.pgb": {
      source: "iana"
    },
    "image/vnd.microsoft.icon": {
      source: "iana",
      compressible: true,
      extensions: ["ico"]
    },
    "image/vnd.mix": {
      source: "iana"
    },
    "image/vnd.mozilla.apng": {
      source: "iana"
    },
    "image/vnd.ms-dds": {
      compressible: true,
      extensions: ["dds"]
    },
    "image/vnd.ms-modi": {
      source: "iana",
      extensions: ["mdi"]
    },
    "image/vnd.ms-photo": {
      source: "apache",
      extensions: ["wdp"]
    },
    "image/vnd.net-fpx": {
      source: "iana",
      extensions: ["npx"]
    },
    "image/vnd.pco.b16": {
      source: "iana",
      extensions: ["b16"]
    },
    "image/vnd.radiance": {
      source: "iana"
    },
    "image/vnd.sealed.png": {
      source: "iana"
    },
    "image/vnd.sealedmedia.softseal.gif": {
      source: "iana"
    },
    "image/vnd.sealedmedia.softseal.jpg": {
      source: "iana"
    },
    "image/vnd.svf": {
      source: "iana"
    },
    "image/vnd.tencent.tap": {
      source: "iana",
      extensions: ["tap"]
    },
    "image/vnd.valve.source.texture": {
      source: "iana",
      extensions: ["vtf"]
    },
    "image/vnd.wap.wbmp": {
      source: "iana",
      extensions: ["wbmp"]
    },
    "image/vnd.xiff": {
      source: "iana",
      extensions: ["xif"]
    },
    "image/vnd.zbrush.pcx": {
      source: "iana",
      extensions: ["pcx"]
    },
    "image/webp": {
      source: "apache",
      extensions: ["webp"]
    },
    "image/wmf": {
      source: "iana",
      extensions: ["wmf"]
    },
    "image/x-3ds": {
      source: "apache",
      extensions: ["3ds"]
    },
    "image/x-cmu-raster": {
      source: "apache",
      extensions: ["ras"]
    },
    "image/x-cmx": {
      source: "apache",
      extensions: ["cmx"]
    },
    "image/x-freehand": {
      source: "apache",
      extensions: ["fh", "fhc", "fh4", "fh5", "fh7"]
    },
    "image/x-icon": {
      source: "apache",
      compressible: true,
      extensions: ["ico"]
    },
    "image/x-jng": {
      source: "nginx",
      extensions: ["jng"]
    },
    "image/x-mrsid-image": {
      source: "apache",
      extensions: ["sid"]
    },
    "image/x-ms-bmp": {
      source: "nginx",
      compressible: true,
      extensions: ["bmp"]
    },
    "image/x-pcx": {
      source: "apache",
      extensions: ["pcx"]
    },
    "image/x-pict": {
      source: "apache",
      extensions: ["pic", "pct"]
    },
    "image/x-portable-anymap": {
      source: "apache",
      extensions: ["pnm"]
    },
    "image/x-portable-bitmap": {
      source: "apache",
      extensions: ["pbm"]
    },
    "image/x-portable-graymap": {
      source: "apache",
      extensions: ["pgm"]
    },
    "image/x-portable-pixmap": {
      source: "apache",
      extensions: ["ppm"]
    },
    "image/x-rgb": {
      source: "apache",
      extensions: ["rgb"]
    },
    "image/x-tga": {
      source: "apache",
      extensions: ["tga"]
    },
    "image/x-xbitmap": {
      source: "apache",
      extensions: ["xbm"]
    },
    "image/x-xcf": {
      compressible: false
    },
    "image/x-xpixmap": {
      source: "apache",
      extensions: ["xpm"]
    },
    "image/x-xwindowdump": {
      source: "apache",
      extensions: ["xwd"]
    },
    "message/cpim": {
      source: "iana"
    },
    "message/delivery-status": {
      source: "iana"
    },
    "message/disposition-notification": {
      source: "iana",
      extensions: [
        "disposition-notification"
      ]
    },
    "message/external-body": {
      source: "iana"
    },
    "message/feedback-report": {
      source: "iana"
    },
    "message/global": {
      source: "iana",
      extensions: ["u8msg"]
    },
    "message/global-delivery-status": {
      source: "iana",
      extensions: ["u8dsn"]
    },
    "message/global-disposition-notification": {
      source: "iana",
      extensions: ["u8mdn"]
    },
    "message/global-headers": {
      source: "iana",
      extensions: ["u8hdr"]
    },
    "message/http": {
      source: "iana",
      compressible: false
    },
    "message/imdn+xml": {
      source: "iana",
      compressible: true
    },
    "message/news": {
      source: "iana"
    },
    "message/partial": {
      source: "iana",
      compressible: false
    },
    "message/rfc822": {
      source: "iana",
      compressible: true,
      extensions: ["eml", "mime"]
    },
    "message/s-http": {
      source: "iana"
    },
    "message/sip": {
      source: "iana"
    },
    "message/sipfrag": {
      source: "iana"
    },
    "message/tracking-status": {
      source: "iana"
    },
    "message/vnd.si.simp": {
      source: "iana"
    },
    "message/vnd.wfa.wsc": {
      source: "iana",
      extensions: ["wsc"]
    },
    "model/3mf": {
      source: "iana",
      extensions: ["3mf"]
    },
    "model/e57": {
      source: "iana"
    },
    "model/gltf+json": {
      source: "iana",
      compressible: true,
      extensions: ["gltf"]
    },
    "model/gltf-binary": {
      source: "iana",
      compressible: true,
      extensions: ["glb"]
    },
    "model/iges": {
      source: "iana",
      compressible: false,
      extensions: ["igs", "iges"]
    },
    "model/mesh": {
      source: "iana",
      compressible: false,
      extensions: ["msh", "mesh", "silo"]
    },
    "model/mtl": {
      source: "iana",
      extensions: ["mtl"]
    },
    "model/obj": {
      source: "iana",
      extensions: ["obj"]
    },
    "model/step": {
      source: "iana"
    },
    "model/step+xml": {
      source: "iana",
      compressible: true,
      extensions: ["stpx"]
    },
    "model/step+zip": {
      source: "iana",
      compressible: false,
      extensions: ["stpz"]
    },
    "model/step-xml+zip": {
      source: "iana",
      compressible: false,
      extensions: ["stpxz"]
    },
    "model/stl": {
      source: "iana",
      extensions: ["stl"]
    },
    "model/vnd.collada+xml": {
      source: "iana",
      compressible: true,
      extensions: ["dae"]
    },
    "model/vnd.dwf": {
      source: "iana",
      extensions: ["dwf"]
    },
    "model/vnd.flatland.3dml": {
      source: "iana"
    },
    "model/vnd.gdl": {
      source: "iana",
      extensions: ["gdl"]
    },
    "model/vnd.gs-gdl": {
      source: "apache"
    },
    "model/vnd.gs.gdl": {
      source: "iana"
    },
    "model/vnd.gtw": {
      source: "iana",
      extensions: ["gtw"]
    },
    "model/vnd.moml+xml": {
      source: "iana",
      compressible: true
    },
    "model/vnd.mts": {
      source: "iana",
      extensions: ["mts"]
    },
    "model/vnd.opengex": {
      source: "iana",
      extensions: ["ogex"]
    },
    "model/vnd.parasolid.transmit.binary": {
      source: "iana",
      extensions: ["x_b"]
    },
    "model/vnd.parasolid.transmit.text": {
      source: "iana",
      extensions: ["x_t"]
    },
    "model/vnd.pytha.pyox": {
      source: "iana"
    },
    "model/vnd.rosette.annotated-data-model": {
      source: "iana"
    },
    "model/vnd.sap.vds": {
      source: "iana",
      extensions: ["vds"]
    },
    "model/vnd.usdz+zip": {
      source: "iana",
      compressible: false,
      extensions: ["usdz"]
    },
    "model/vnd.valve.source.compiled-map": {
      source: "iana",
      extensions: ["bsp"]
    },
    "model/vnd.vtu": {
      source: "iana",
      extensions: ["vtu"]
    },
    "model/vrml": {
      source: "iana",
      compressible: false,
      extensions: ["wrl", "vrml"]
    },
    "model/x3d+binary": {
      source: "apache",
      compressible: false,
      extensions: ["x3db", "x3dbz"]
    },
    "model/x3d+fastinfoset": {
      source: "iana",
      extensions: ["x3db"]
    },
    "model/x3d+vrml": {
      source: "apache",
      compressible: false,
      extensions: ["x3dv", "x3dvz"]
    },
    "model/x3d+xml": {
      source: "iana",
      compressible: true,
      extensions: ["x3d", "x3dz"]
    },
    "model/x3d-vrml": {
      source: "iana",
      extensions: ["x3dv"]
    },
    "multipart/alternative": {
      source: "iana",
      compressible: false
    },
    "multipart/appledouble": {
      source: "iana"
    },
    "multipart/byteranges": {
      source: "iana"
    },
    "multipart/digest": {
      source: "iana"
    },
    "multipart/encrypted": {
      source: "iana",
      compressible: false
    },
    "multipart/form-data": {
      source: "iana",
      compressible: false
    },
    "multipart/header-set": {
      source: "iana"
    },
    "multipart/mixed": {
      source: "iana"
    },
    "multipart/multilingual": {
      source: "iana"
    },
    "multipart/parallel": {
      source: "iana"
    },
    "multipart/related": {
      source: "iana",
      compressible: false
    },
    "multipart/report": {
      source: "iana"
    },
    "multipart/signed": {
      source: "iana",
      compressible: false
    },
    "multipart/vnd.bint.med-plus": {
      source: "iana"
    },
    "multipart/voice-message": {
      source: "iana"
    },
    "multipart/x-mixed-replace": {
      source: "iana"
    },
    "text/1d-interleaved-parityfec": {
      source: "iana"
    },
    "text/cache-manifest": {
      source: "iana",
      compressible: true,
      extensions: ["appcache", "manifest"]
    },
    "text/calendar": {
      source: "iana",
      extensions: ["ics", "ifb"]
    },
    "text/calender": {
      compressible: true
    },
    "text/cmd": {
      compressible: true
    },
    "text/coffeescript": {
      extensions: ["coffee", "litcoffee"]
    },
    "text/cql": {
      source: "iana"
    },
    "text/cql-expression": {
      source: "iana"
    },
    "text/cql-identifier": {
      source: "iana"
    },
    "text/css": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["css"]
    },
    "text/csv": {
      source: "iana",
      compressible: true,
      extensions: ["csv"]
    },
    "text/csv-schema": {
      source: "iana"
    },
    "text/directory": {
      source: "iana"
    },
    "text/dns": {
      source: "iana"
    },
    "text/ecmascript": {
      source: "iana"
    },
    "text/encaprtp": {
      source: "iana"
    },
    "text/enriched": {
      source: "iana"
    },
    "text/fhirpath": {
      source: "iana"
    },
    "text/flexfec": {
      source: "iana"
    },
    "text/fwdred": {
      source: "iana"
    },
    "text/gff3": {
      source: "iana"
    },
    "text/grammar-ref-list": {
      source: "iana"
    },
    "text/html": {
      source: "iana",
      compressible: true,
      extensions: ["html", "htm", "shtml"]
    },
    "text/jade": {
      extensions: ["jade"]
    },
    "text/javascript": {
      source: "iana",
      compressible: true
    },
    "text/jcr-cnd": {
      source: "iana"
    },
    "text/jsx": {
      compressible: true,
      extensions: ["jsx"]
    },
    "text/less": {
      compressible: true,
      extensions: ["less"]
    },
    "text/markdown": {
      source: "iana",
      compressible: true,
      extensions: ["markdown", "md"]
    },
    "text/mathml": {
      source: "nginx",
      extensions: ["mml"]
    },
    "text/mdx": {
      compressible: true,
      extensions: ["mdx"]
    },
    "text/mizar": {
      source: "iana"
    },
    "text/n3": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["n3"]
    },
    "text/parameters": {
      source: "iana",
      charset: "UTF-8"
    },
    "text/parityfec": {
      source: "iana"
    },
    "text/plain": {
      source: "iana",
      compressible: true,
      extensions: ["txt", "text", "conf", "def", "list", "log", "in", "ini"]
    },
    "text/provenance-notation": {
      source: "iana",
      charset: "UTF-8"
    },
    "text/prs.fallenstein.rst": {
      source: "iana"
    },
    "text/prs.lines.tag": {
      source: "iana",
      extensions: ["dsc"]
    },
    "text/prs.prop.logic": {
      source: "iana"
    },
    "text/raptorfec": {
      source: "iana"
    },
    "text/red": {
      source: "iana"
    },
    "text/rfc822-headers": {
      source: "iana"
    },
    "text/richtext": {
      source: "iana",
      compressible: true,
      extensions: ["rtx"]
    },
    "text/rtf": {
      source: "iana",
      compressible: true,
      extensions: ["rtf"]
    },
    "text/rtp-enc-aescm128": {
      source: "iana"
    },
    "text/rtploopback": {
      source: "iana"
    },
    "text/rtx": {
      source: "iana"
    },
    "text/sgml": {
      source: "iana",
      extensions: ["sgml", "sgm"]
    },
    "text/shaclc": {
      source: "iana"
    },
    "text/shex": {
      source: "iana",
      extensions: ["shex"]
    },
    "text/slim": {
      extensions: ["slim", "slm"]
    },
    "text/spdx": {
      source: "iana",
      extensions: ["spdx"]
    },
    "text/strings": {
      source: "iana"
    },
    "text/stylus": {
      extensions: ["stylus", "styl"]
    },
    "text/t140": {
      source: "iana"
    },
    "text/tab-separated-values": {
      source: "iana",
      compressible: true,
      extensions: ["tsv"]
    },
    "text/troff": {
      source: "iana",
      extensions: ["t", "tr", "roff", "man", "me", "ms"]
    },
    "text/turtle": {
      source: "iana",
      charset: "UTF-8",
      extensions: ["ttl"]
    },
    "text/ulpfec": {
      source: "iana"
    },
    "text/uri-list": {
      source: "iana",
      compressible: true,
      extensions: ["uri", "uris", "urls"]
    },
    "text/vcard": {
      source: "iana",
      compressible: true,
      extensions: ["vcard"]
    },
    "text/vnd.a": {
      source: "iana"
    },
    "text/vnd.abc": {
      source: "iana"
    },
    "text/vnd.ascii-art": {
      source: "iana"
    },
    "text/vnd.curl": {
      source: "iana",
      extensions: ["curl"]
    },
    "text/vnd.curl.dcurl": {
      source: "apache",
      extensions: ["dcurl"]
    },
    "text/vnd.curl.mcurl": {
      source: "apache",
      extensions: ["mcurl"]
    },
    "text/vnd.curl.scurl": {
      source: "apache",
      extensions: ["scurl"]
    },
    "text/vnd.debian.copyright": {
      source: "iana",
      charset: "UTF-8"
    },
    "text/vnd.dmclientscript": {
      source: "iana"
    },
    "text/vnd.dvb.subtitle": {
      source: "iana",
      extensions: ["sub"]
    },
    "text/vnd.esmertec.theme-descriptor": {
      source: "iana",
      charset: "UTF-8"
    },
    "text/vnd.familysearch.gedcom": {
      source: "iana",
      extensions: ["ged"]
    },
    "text/vnd.ficlab.flt": {
      source: "iana"
    },
    "text/vnd.fly": {
      source: "iana",
      extensions: ["fly"]
    },
    "text/vnd.fmi.flexstor": {
      source: "iana",
      extensions: ["flx"]
    },
    "text/vnd.gml": {
      source: "iana"
    },
    "text/vnd.graphviz": {
      source: "iana",
      extensions: ["gv"]
    },
    "text/vnd.hans": {
      source: "iana"
    },
    "text/vnd.hgl": {
      source: "iana"
    },
    "text/vnd.in3d.3dml": {
      source: "iana",
      extensions: ["3dml"]
    },
    "text/vnd.in3d.spot": {
      source: "iana",
      extensions: ["spot"]
    },
    "text/vnd.iptc.newsml": {
      source: "iana"
    },
    "text/vnd.iptc.nitf": {
      source: "iana"
    },
    "text/vnd.latex-z": {
      source: "iana"
    },
    "text/vnd.motorola.reflex": {
      source: "iana"
    },
    "text/vnd.ms-mediapackage": {
      source: "iana"
    },
    "text/vnd.net2phone.commcenter.command": {
      source: "iana"
    },
    "text/vnd.radisys.msml-basic-layout": {
      source: "iana"
    },
    "text/vnd.senx.warpscript": {
      source: "iana"
    },
    "text/vnd.si.uricatalogue": {
      source: "iana"
    },
    "text/vnd.sosi": {
      source: "iana"
    },
    "text/vnd.sun.j2me.app-descriptor": {
      source: "iana",
      charset: "UTF-8",
      extensions: ["jad"]
    },
    "text/vnd.trolltech.linguist": {
      source: "iana",
      charset: "UTF-8"
    },
    "text/vnd.wap.si": {
      source: "iana"
    },
    "text/vnd.wap.sl": {
      source: "iana"
    },
    "text/vnd.wap.wml": {
      source: "iana",
      extensions: ["wml"]
    },
    "text/vnd.wap.wmlscript": {
      source: "iana",
      extensions: ["wmls"]
    },
    "text/vtt": {
      source: "iana",
      charset: "UTF-8",
      compressible: true,
      extensions: ["vtt"]
    },
    "text/x-asm": {
      source: "apache",
      extensions: ["s", "asm"]
    },
    "text/x-c": {
      source: "apache",
      extensions: ["c", "cc", "cxx", "cpp", "h", "hh", "dic"]
    },
    "text/x-component": {
      source: "nginx",
      extensions: ["htc"]
    },
    "text/x-fortran": {
      source: "apache",
      extensions: ["f", "for", "f77", "f90"]
    },
    "text/x-gwt-rpc": {
      compressible: true
    },
    "text/x-handlebars-template": {
      extensions: ["hbs"]
    },
    "text/x-java-source": {
      source: "apache",
      extensions: ["java"]
    },
    "text/x-jquery-tmpl": {
      compressible: true
    },
    "text/x-lua": {
      extensions: ["lua"]
    },
    "text/x-markdown": {
      compressible: true,
      extensions: ["mkd"]
    },
    "text/x-nfo": {
      source: "apache",
      extensions: ["nfo"]
    },
    "text/x-opml": {
      source: "apache",
      extensions: ["opml"]
    },
    "text/x-org": {
      compressible: true,
      extensions: ["org"]
    },
    "text/x-pascal": {
      source: "apache",
      extensions: ["p", "pas"]
    },
    "text/x-processing": {
      compressible: true,
      extensions: ["pde"]
    },
    "text/x-sass": {
      extensions: ["sass"]
    },
    "text/x-scss": {
      extensions: ["scss"]
    },
    "text/x-setext": {
      source: "apache",
      extensions: ["etx"]
    },
    "text/x-sfv": {
      source: "apache",
      extensions: ["sfv"]
    },
    "text/x-suse-ymp": {
      compressible: true,
      extensions: ["ymp"]
    },
    "text/x-uuencode": {
      source: "apache",
      extensions: ["uu"]
    },
    "text/x-vcalendar": {
      source: "apache",
      extensions: ["vcs"]
    },
    "text/x-vcard": {
      source: "apache",
      extensions: ["vcf"]
    },
    "text/xml": {
      source: "iana",
      compressible: true,
      extensions: ["xml"]
    },
    "text/xml-external-parsed-entity": {
      source: "iana"
    },
    "text/yaml": {
      compressible: true,
      extensions: ["yaml", "yml"]
    },
    "video/1d-interleaved-parityfec": {
      source: "iana"
    },
    "video/3gpp": {
      source: "iana",
      extensions: ["3gp", "3gpp"]
    },
    "video/3gpp-tt": {
      source: "iana"
    },
    "video/3gpp2": {
      source: "iana",
      extensions: ["3g2"]
    },
    "video/av1": {
      source: "iana"
    },
    "video/bmpeg": {
      source: "iana"
    },
    "video/bt656": {
      source: "iana"
    },
    "video/celb": {
      source: "iana"
    },
    "video/dv": {
      source: "iana"
    },
    "video/encaprtp": {
      source: "iana"
    },
    "video/ffv1": {
      source: "iana"
    },
    "video/flexfec": {
      source: "iana"
    },
    "video/h261": {
      source: "iana",
      extensions: ["h261"]
    },
    "video/h263": {
      source: "iana",
      extensions: ["h263"]
    },
    "video/h263-1998": {
      source: "iana"
    },
    "video/h263-2000": {
      source: "iana"
    },
    "video/h264": {
      source: "iana",
      extensions: ["h264"]
    },
    "video/h264-rcdo": {
      source: "iana"
    },
    "video/h264-svc": {
      source: "iana"
    },
    "video/h265": {
      source: "iana"
    },
    "video/iso.segment": {
      source: "iana",
      extensions: ["m4s"]
    },
    "video/jpeg": {
      source: "iana",
      extensions: ["jpgv"]
    },
    "video/jpeg2000": {
      source: "iana"
    },
    "video/jpm": {
      source: "apache",
      extensions: ["jpm", "jpgm"]
    },
    "video/jxsv": {
      source: "iana"
    },
    "video/mj2": {
      source: "iana",
      extensions: ["mj2", "mjp2"]
    },
    "video/mp1s": {
      source: "iana"
    },
    "video/mp2p": {
      source: "iana"
    },
    "video/mp2t": {
      source: "iana",
      extensions: ["ts"]
    },
    "video/mp4": {
      source: "iana",
      compressible: false,
      extensions: ["mp4", "mp4v", "mpg4"]
    },
    "video/mp4v-es": {
      source: "iana"
    },
    "video/mpeg": {
      source: "iana",
      compressible: false,
      extensions: ["mpeg", "mpg", "mpe", "m1v", "m2v"]
    },
    "video/mpeg4-generic": {
      source: "iana"
    },
    "video/mpv": {
      source: "iana"
    },
    "video/nv": {
      source: "iana"
    },
    "video/ogg": {
      source: "iana",
      compressible: false,
      extensions: ["ogv"]
    },
    "video/parityfec": {
      source: "iana"
    },
    "video/pointer": {
      source: "iana"
    },
    "video/quicktime": {
      source: "iana",
      compressible: false,
      extensions: ["qt", "mov"]
    },
    "video/raptorfec": {
      source: "iana"
    },
    "video/raw": {
      source: "iana"
    },
    "video/rtp-enc-aescm128": {
      source: "iana"
    },
    "video/rtploopback": {
      source: "iana"
    },
    "video/rtx": {
      source: "iana"
    },
    "video/scip": {
      source: "iana"
    },
    "video/smpte291": {
      source: "iana"
    },
    "video/smpte292m": {
      source: "iana"
    },
    "video/ulpfec": {
      source: "iana"
    },
    "video/vc1": {
      source: "iana"
    },
    "video/vc2": {
      source: "iana"
    },
    "video/vnd.cctv": {
      source: "iana"
    },
    "video/vnd.dece.hd": {
      source: "iana",
      extensions: ["uvh", "uvvh"]
    },
    "video/vnd.dece.mobile": {
      source: "iana",
      extensions: ["uvm", "uvvm"]
    },
    "video/vnd.dece.mp4": {
      source: "iana"
    },
    "video/vnd.dece.pd": {
      source: "iana",
      extensions: ["uvp", "uvvp"]
    },
    "video/vnd.dece.sd": {
      source: "iana",
      extensions: ["uvs", "uvvs"]
    },
    "video/vnd.dece.video": {
      source: "iana",
      extensions: ["uvv", "uvvv"]
    },
    "video/vnd.directv.mpeg": {
      source: "iana"
    },
    "video/vnd.directv.mpeg-tts": {
      source: "iana"
    },
    "video/vnd.dlna.mpeg-tts": {
      source: "iana"
    },
    "video/vnd.dvb.file": {
      source: "iana",
      extensions: ["dvb"]
    },
    "video/vnd.fvt": {
      source: "iana",
      extensions: ["fvt"]
    },
    "video/vnd.hns.video": {
      source: "iana"
    },
    "video/vnd.iptvforum.1dparityfec-1010": {
      source: "iana"
    },
    "video/vnd.iptvforum.1dparityfec-2005": {
      source: "iana"
    },
    "video/vnd.iptvforum.2dparityfec-1010": {
      source: "iana"
    },
    "video/vnd.iptvforum.2dparityfec-2005": {
      source: "iana"
    },
    "video/vnd.iptvforum.ttsavc": {
      source: "iana"
    },
    "video/vnd.iptvforum.ttsmpeg2": {
      source: "iana"
    },
    "video/vnd.motorola.video": {
      source: "iana"
    },
    "video/vnd.motorola.videop": {
      source: "iana"
    },
    "video/vnd.mpegurl": {
      source: "iana",
      extensions: ["mxu", "m4u"]
    },
    "video/vnd.ms-playready.media.pyv": {
      source: "iana",
      extensions: ["pyv"]
    },
    "video/vnd.nokia.interleaved-multimedia": {
      source: "iana"
    },
    "video/vnd.nokia.mp4vr": {
      source: "iana"
    },
    "video/vnd.nokia.videovoip": {
      source: "iana"
    },
    "video/vnd.objectvideo": {
      source: "iana"
    },
    "video/vnd.radgamettools.bink": {
      source: "iana"
    },
    "video/vnd.radgamettools.smacker": {
      source: "iana"
    },
    "video/vnd.sealed.mpeg1": {
      source: "iana"
    },
    "video/vnd.sealed.mpeg4": {
      source: "iana"
    },
    "video/vnd.sealed.swf": {
      source: "iana"
    },
    "video/vnd.sealedmedia.softseal.mov": {
      source: "iana"
    },
    "video/vnd.uvvu.mp4": {
      source: "iana",
      extensions: ["uvu", "uvvu"]
    },
    "video/vnd.vivo": {
      source: "iana",
      extensions: ["viv"]
    },
    "video/vnd.youtube.yt": {
      source: "iana"
    },
    "video/vp8": {
      source: "iana"
    },
    "video/vp9": {
      source: "iana"
    },
    "video/webm": {
      source: "apache",
      compressible: false,
      extensions: ["webm"]
    },
    "video/x-f4v": {
      source: "apache",
      extensions: ["f4v"]
    },
    "video/x-fli": {
      source: "apache",
      extensions: ["fli"]
    },
    "video/x-flv": {
      source: "apache",
      compressible: false,
      extensions: ["flv"]
    },
    "video/x-m4v": {
      source: "apache",
      extensions: ["m4v"]
    },
    "video/x-matroska": {
      source: "apache",
      compressible: false,
      extensions: ["mkv", "mk3d", "mks"]
    },
    "video/x-mng": {
      source: "apache",
      extensions: ["mng"]
    },
    "video/x-ms-asf": {
      source: "apache",
      extensions: ["asf", "asx"]
    },
    "video/x-ms-vob": {
      source: "apache",
      extensions: ["vob"]
    },
    "video/x-ms-wm": {
      source: "apache",
      extensions: ["wm"]
    },
    "video/x-ms-wmv": {
      source: "apache",
      compressible: false,
      extensions: ["wmv"]
    },
    "video/x-ms-wmx": {
      source: "apache",
      extensions: ["wmx"]
    },
    "video/x-ms-wvx": {
      source: "apache",
      extensions: ["wvx"]
    },
    "video/x-msvideo": {
      source: "apache",
      extensions: ["avi"]
    },
    "video/x-sgi-movie": {
      source: "apache",
      extensions: ["movie"]
    },
    "video/x-smv": {
      source: "apache",
      extensions: ["smv"]
    },
    "x-conference/x-cooltalk": {
      source: "apache",
      extensions: ["ice"]
    },
    "x-shader/x-fragment": {
      compressible: true
    },
    "x-shader/x-vertex": {
      compressible: true
    }
  };
});

// mini-services/ironsight-room/node_modules/mime-types/index.js
var require_mime_types = __commonJS((exports) => {
  /*!
   * mime-types
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   */
  var db = require_db();
  var extname = __require("path").extname;
  var EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
  var TEXT_TYPE_REGEXP = /^text\//i;
  exports.charset = charset;
  exports.charsets = { lookup: charset };
  exports.contentType = contentType;
  exports.extension = extension;
  exports.extensions = Object.create(null);
  exports.lookup = lookup;
  exports.types = Object.create(null);
  populateMaps(exports.extensions, exports.types);
  function charset(type) {
    if (!type || typeof type !== "string") {
      return false;
    }
    var match = EXTRACT_TYPE_REGEXP.exec(type);
    var mime = match && db[match[1].toLowerCase()];
    if (mime && mime.charset) {
      return mime.charset;
    }
    if (match && TEXT_TYPE_REGEXP.test(match[1])) {
      return "UTF-8";
    }
    return false;
  }
  function contentType(str) {
    if (!str || typeof str !== "string") {
      return false;
    }
    var mime = str.indexOf("/") === -1 ? exports.lookup(str) : str;
    if (!mime) {
      return false;
    }
    if (mime.indexOf("charset") === -1) {
      var charset2 = exports.charset(mime);
      if (charset2)
        mime += "; charset=" + charset2.toLowerCase();
    }
    return mime;
  }
  function extension(type) {
    if (!type || typeof type !== "string") {
      return false;
    }
    var match = EXTRACT_TYPE_REGEXP.exec(type);
    var exts = match && exports.extensions[match[1].toLowerCase()];
    if (!exts || !exts.length) {
      return false;
    }
    return exts[0];
  }
  function lookup(path) {
    if (!path || typeof path !== "string") {
      return false;
    }
    var extension2 = extname("x." + path).toLowerCase().substr(1);
    if (!extension2) {
      return false;
    }
    return exports.types[extension2] || false;
  }
  function populateMaps(extensions, types) {
    var preference = ["nginx", "apache", undefined, "iana"];
    Object.keys(db).forEach(function forEachMimeType(type) {
      var mime = db[type];
      var exts = mime.extensions;
      if (!exts || !exts.length) {
        return;
      }
      extensions[type] = exts;
      for (var i = 0;i < exts.length; i++) {
        var extension2 = exts[i];
        if (types[extension2]) {
          var from = preference.indexOf(db[types[extension2]].source);
          var to = preference.indexOf(mime.source);
          if (types[extension2] !== "application/octet-stream" && (from > to || from === to && types[extension2].substr(0, 12) === "application/")) {
            continue;
          }
        }
        types[extension2] = type;
      }
    });
  }
});

// mini-services/ironsight-room/node_modules/accepts/index.js
var require_accepts = __commonJS((exports, module) => {
  /*!
   * accepts
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   */
  var Negotiator = require_negotiator();
  var mime = require_mime_types();
  module.exports = Accepts;
  function Accepts(req) {
    if (!(this instanceof Accepts)) {
      return new Accepts(req);
    }
    this.headers = req.headers;
    this.negotiator = new Negotiator(req);
  }
  Accepts.prototype.type = Accepts.prototype.types = function(types_) {
    var types = types_;
    if (types && !Array.isArray(types)) {
      types = new Array(arguments.length);
      for (var i = 0;i < types.length; i++) {
        types[i] = arguments[i];
      }
    }
    if (!types || types.length === 0) {
      return this.negotiator.mediaTypes();
    }
    if (!this.headers.accept) {
      return types[0];
    }
    var mimes = types.map(extToMime);
    var accepts = this.negotiator.mediaTypes(mimes.filter(validMime));
    var first = accepts[0];
    return first ? types[mimes.indexOf(first)] : false;
  };
  Accepts.prototype.encoding = Accepts.prototype.encodings = function(encodings_) {
    var encodings = encodings_;
    if (encodings && !Array.isArray(encodings)) {
      encodings = new Array(arguments.length);
      for (var i = 0;i < encodings.length; i++) {
        encodings[i] = arguments[i];
      }
    }
    if (!encodings || encodings.length === 0) {
      return this.negotiator.encodings();
    }
    return this.negotiator.encodings(encodings)[0] || false;
  };
  Accepts.prototype.charset = Accepts.prototype.charsets = function(charsets_) {
    var charsets = charsets_;
    if (charsets && !Array.isArray(charsets)) {
      charsets = new Array(arguments.length);
      for (var i = 0;i < charsets.length; i++) {
        charsets[i] = arguments[i];
      }
    }
    if (!charsets || charsets.length === 0) {
      return this.negotiator.charsets();
    }
    return this.negotiator.charsets(charsets)[0] || false;
  };
  Accepts.prototype.lang = Accepts.prototype.langs = Accepts.prototype.language = Accepts.prototype.languages = function(languages_) {
    var languages = languages_;
    if (languages && !Array.isArray(languages)) {
      languages = new Array(arguments.length);
      for (var i = 0;i < languages.length; i++) {
        languages[i] = arguments[i];
      }
    }
    if (!languages || languages.length === 0) {
      return this.negotiator.languages();
    }
    return this.negotiator.languages(languages)[0] || false;
  };
  function extToMime(type) {
    return type.indexOf("/") === -1 ? mime.lookup(type) : type;
  }
  function validMime(type) {
    return typeof type === "string";
  }
});

// mini-services/ironsight-room/node_modules/engine.io/build/contrib/base64id.js
var require_base64id = __commonJS((exports) => {
  /*!
   * base64id v0.1.0
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.base64id = undefined;
  var crypto2 = __require("crypto");
  var Base64Id = function() {};
  Base64Id.prototype.getRandomBytes = function(bytes) {
    var BUFFER_SIZE = 4096;
    var self = this;
    bytes = bytes || 12;
    if (bytes > BUFFER_SIZE) {
      return crypto2.randomBytes(bytes);
    }
    var bytesInBuffer = Math.floor(BUFFER_SIZE / bytes);
    var threshold = Math.floor(bytesInBuffer * 0.85);
    if (!threshold) {
      return crypto2.randomBytes(bytes);
    }
    if (this.bytesBufferIndex == null) {
      this.bytesBufferIndex = -1;
    }
    if (this.bytesBufferIndex == bytesInBuffer) {
      this.bytesBuffer = null;
      this.bytesBufferIndex = -1;
    }
    if (this.bytesBufferIndex == -1 || this.bytesBufferIndex > threshold) {
      if (!this.isGeneratingBytes) {
        this.isGeneratingBytes = true;
        crypto2.randomBytes(BUFFER_SIZE, function(err, bytes2) {
          self.bytesBuffer = bytes2;
          self.bytesBufferIndex = 0;
          self.isGeneratingBytes = false;
        });
      }
      if (this.bytesBufferIndex == -1) {
        return crypto2.randomBytes(bytes);
      }
    }
    var result = this.bytesBuffer.slice(bytes * this.bytesBufferIndex, bytes * (this.bytesBufferIndex + 1));
    this.bytesBufferIndex++;
    return result;
  };
  Base64Id.prototype.generateId = function() {
    var rand = Buffer.alloc(15);
    if (!rand.writeInt32BE) {
      return Math.abs(Math.random() * Math.random() * Date.now() | 0).toString() + Math.abs(Math.random() * Math.random() * Date.now() | 0).toString();
    }
    this.sequenceNumber = this.sequenceNumber + 1 | 0;
    rand.writeInt32BE(this.sequenceNumber, 11);
    if (crypto2.randomBytes) {
      this.getRandomBytes(12).copy(rand);
    } else {
      [0, 4, 8].forEach(function(i) {
        rand.writeInt32BE(Math.random() * Math.pow(2, 32) | 0, i);
      });
    }
    return rand.toString("base64").replace(/\//g, "_").replace(/\+/g, "-");
  };
  exports.base64id = new Base64Id;
});

// mini-services/ironsight-room/node_modules/engine.io-parser/build/cjs/commons.js
var require_commons = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ERROR_PACKET = exports.PACKET_TYPES_REVERSE = exports.PACKET_TYPES = undefined;
  var PACKET_TYPES = Object.create(null);
  exports.PACKET_TYPES = PACKET_TYPES;
  PACKET_TYPES["open"] = "0";
  PACKET_TYPES["close"] = "1";
  PACKET_TYPES["ping"] = "2";
  PACKET_TYPES["pong"] = "3";
  PACKET_TYPES["message"] = "4";
  PACKET_TYPES["upgrade"] = "5";
  PACKET_TYPES["noop"] = "6";
  var PACKET_TYPES_REVERSE = Object.create(null);
  exports.PACKET_TYPES_REVERSE = PACKET_TYPES_REVERSE;
  Object.keys(PACKET_TYPES).forEach((key) => {
    PACKET_TYPES_REVERSE[PACKET_TYPES[key]] = key;
  });
  var ERROR_PACKET = { type: "error", data: "parser error" };
  exports.ERROR_PACKET = ERROR_PACKET;
});

// mini-services/ironsight-room/node_modules/engine.io-parser/build/cjs/encodePacket.js
var require_encodePacket = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.encodePacket = undefined;
  exports.encodePacketToBinary = encodePacketToBinary;
  var commons_js_1 = require_commons();
  var encodePacket = ({ type, data }, supportsBinary, callback) => {
    if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
      return callback(supportsBinary ? data : "b" + toBuffer(data, true).toString("base64"));
    }
    return callback(commons_js_1.PACKET_TYPES[type] + (data || ""));
  };
  exports.encodePacket = encodePacket;
  var toBuffer = (data, forceBufferConversion) => {
    if (Buffer.isBuffer(data) || data instanceof Uint8Array && !forceBufferConversion) {
      return data;
    } else if (data instanceof ArrayBuffer) {
      return Buffer.from(data);
    } else {
      return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    }
  };
  var TEXT_ENCODER;
  function encodePacketToBinary(packet, callback) {
    if (packet.data instanceof ArrayBuffer || ArrayBuffer.isView(packet.data)) {
      return callback(toBuffer(packet.data, false));
    }
    (0, exports.encodePacket)(packet, true, (encoded) => {
      if (!TEXT_ENCODER) {
        TEXT_ENCODER = new TextEncoder;
      }
      callback(TEXT_ENCODER.encode(encoded));
    });
  }
});

// mini-services/ironsight-room/node_modules/engine.io-parser/build/cjs/decodePacket.js
var require_decodePacket = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.decodePacket = undefined;
  var commons_js_1 = require_commons();
  var decodePacket = (encodedPacket, binaryType) => {
    if (typeof encodedPacket !== "string") {
      return {
        type: "message",
        data: mapBinary(encodedPacket, binaryType)
      };
    }
    const type = encodedPacket.charAt(0);
    if (type === "b") {
      const buffer = Buffer.from(encodedPacket.substring(1), "base64");
      return {
        type: "message",
        data: mapBinary(buffer, binaryType)
      };
    }
    if (!commons_js_1.PACKET_TYPES_REVERSE[type]) {
      return commons_js_1.ERROR_PACKET;
    }
    return encodedPacket.length > 1 ? {
      type: commons_js_1.PACKET_TYPES_REVERSE[type],
      data: encodedPacket.substring(1)
    } : {
      type: commons_js_1.PACKET_TYPES_REVERSE[type]
    };
  };
  exports.decodePacket = decodePacket;
  var mapBinary = (data, binaryType) => {
    switch (binaryType) {
      case "arraybuffer":
        if (data instanceof ArrayBuffer) {
          return data;
        } else if (Buffer.isBuffer(data)) {
          return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        } else {
          return data.buffer;
        }
      case "nodebuffer":
      default:
        if (Buffer.isBuffer(data)) {
          return data;
        } else {
          return Buffer.from(data);
        }
    }
  };
});

// mini-services/ironsight-room/node_modules/engine.io-parser/build/cjs/index.js
var require_cjs = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.decodePayload = exports.decodePacket = exports.encodePayload = exports.encodePacket = exports.protocol = undefined;
  exports.createPacketEncoderStream = createPacketEncoderStream;
  exports.createPacketDecoderStream = createPacketDecoderStream;
  var encodePacket_js_1 = require_encodePacket();
  Object.defineProperty(exports, "encodePacket", { enumerable: true, get: function() {
    return encodePacket_js_1.encodePacket;
  } });
  var decodePacket_js_1 = require_decodePacket();
  Object.defineProperty(exports, "decodePacket", { enumerable: true, get: function() {
    return decodePacket_js_1.decodePacket;
  } });
  var commons_js_1 = require_commons();
  var SEPARATOR = String.fromCharCode(30);
  var encodePayload = (packets, callback) => {
    const length = packets.length;
    const encodedPackets = new Array(length);
    let count = 0;
    packets.forEach((packet, i) => {
      (0, encodePacket_js_1.encodePacket)(packet, false, (encodedPacket) => {
        encodedPackets[i] = encodedPacket;
        if (++count === length) {
          callback(encodedPackets.join(SEPARATOR));
        }
      });
    });
  };
  exports.encodePayload = encodePayload;
  var decodePayload = (encodedPayload, binaryType) => {
    const encodedPackets = encodedPayload.split(SEPARATOR);
    const packets = [];
    for (let i = 0;i < encodedPackets.length; i++) {
      const decodedPacket = (0, decodePacket_js_1.decodePacket)(encodedPackets[i], binaryType);
      packets.push(decodedPacket);
      if (decodedPacket.type === "error") {
        break;
      }
    }
    return packets;
  };
  exports.decodePayload = decodePayload;
  function createPacketEncoderStream() {
    return new TransformStream({
      transform(packet, controller) {
        (0, encodePacket_js_1.encodePacketToBinary)(packet, (encodedPacket) => {
          const payloadLength = encodedPacket.length;
          let header;
          if (payloadLength < 126) {
            header = new Uint8Array(1);
            new DataView(header.buffer).setUint8(0, payloadLength);
          } else if (payloadLength < 65536) {
            header = new Uint8Array(3);
            const view = new DataView(header.buffer);
            view.setUint8(0, 126);
            view.setUint16(1, payloadLength);
          } else {
            header = new Uint8Array(9);
            const view = new DataView(header.buffer);
            view.setUint8(0, 127);
            view.setBigUint64(1, BigInt(payloadLength));
          }
          if (packet.data && typeof packet.data !== "string") {
            header[0] |= 128;
          }
          controller.enqueue(header);
          controller.enqueue(encodedPacket);
        });
      }
    });
  }
  var TEXT_DECODER;
  function totalLength(chunks) {
    return chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  }
  function concatChunks(chunks, size) {
    if (chunks[0].length === size) {
      return chunks.shift();
    }
    const buffer = new Uint8Array(size);
    let j = 0;
    for (let i = 0;i < size; i++) {
      buffer[i] = chunks[0][j++];
      if (j === chunks[0].length) {
        chunks.shift();
        j = 0;
      }
    }
    if (chunks.length && j < chunks[0].length) {
      chunks[0] = chunks[0].slice(j);
    }
    return buffer;
  }
  function createPacketDecoderStream(maxPayload, binaryType) {
    if (!TEXT_DECODER) {
      TEXT_DECODER = new TextDecoder;
    }
    const chunks = [];
    let state = 0;
    let expectedLength = -1;
    let isBinary = false;
    return new TransformStream({
      transform(chunk, controller) {
        chunks.push(chunk);
        while (true) {
          if (state === 0) {
            if (totalLength(chunks) < 1) {
              break;
            }
            const header = concatChunks(chunks, 1);
            isBinary = (header[0] & 128) === 128;
            expectedLength = header[0] & 127;
            if (expectedLength < 126) {
              state = 3;
            } else if (expectedLength === 126) {
              state = 1;
            } else {
              state = 2;
            }
          } else if (state === 1) {
            if (totalLength(chunks) < 2) {
              break;
            }
            const headerArray = concatChunks(chunks, 2);
            expectedLength = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length).getUint16(0);
            state = 3;
          } else if (state === 2) {
            if (totalLength(chunks) < 8) {
              break;
            }
            const headerArray = concatChunks(chunks, 8);
            const view = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length);
            const n = view.getUint32(0);
            if (n > Math.pow(2, 53 - 32) - 1) {
              controller.enqueue(commons_js_1.ERROR_PACKET);
              break;
            }
            expectedLength = n * Math.pow(2, 32) + view.getUint32(4);
            state = 3;
          } else {
            if (totalLength(chunks) < expectedLength) {
              break;
            }
            const data = concatChunks(chunks, expectedLength);
            controller.enqueue((0, decodePacket_js_1.decodePacket)(isBinary ? data : TEXT_DECODER.decode(data), binaryType));
            state = 0;
          }
          if (expectedLength === 0 || expectedLength > maxPayload) {
            controller.enqueue(commons_js_1.ERROR_PACKET);
            break;
          }
        }
      }
    });
  }
  exports.protocol = 4;
});

// mini-services/ironsight-room/node_modules/engine.io/build/parser-v3/utf8.js
var require_utf8 = __commonJS((exports, module) => {
  /*! https://mths.be/utf8js v2.1.2 by @mathias */
  var stringFromCharCode = String.fromCharCode;
  function ucs2decode(string) {
    var output = [];
    var counter = 0;
    var length = string.length;
    var value;
    var extra;
    while (counter < length) {
      value = string.charCodeAt(counter++);
      if (value >= 55296 && value <= 56319 && counter < length) {
        extra = string.charCodeAt(counter++);
        if ((extra & 64512) == 56320) {
          output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
        } else {
          output.push(value);
          counter--;
        }
      } else {
        output.push(value);
      }
    }
    return output;
  }
  function ucs2encode(array) {
    var length = array.length;
    var index = -1;
    var value;
    var output = "";
    while (++index < length) {
      value = array[index];
      if (value > 65535) {
        value -= 65536;
        output += stringFromCharCode(value >>> 10 & 1023 | 55296);
        value = 56320 | value & 1023;
      }
      output += stringFromCharCode(value);
    }
    return output;
  }
  function checkScalarValue(codePoint, strict) {
    if (codePoint >= 55296 && codePoint <= 57343) {
      if (strict) {
        throw Error("Lone surrogate U+" + codePoint.toString(16).toUpperCase() + " is not a scalar value");
      }
      return false;
    }
    return true;
  }
  function createByte(codePoint, shift) {
    return stringFromCharCode(codePoint >> shift & 63 | 128);
  }
  function encodeCodePoint(codePoint, strict) {
    if ((codePoint & 4294967168) == 0) {
      return stringFromCharCode(codePoint);
    }
    var symbol = "";
    if ((codePoint & 4294965248) == 0) {
      symbol = stringFromCharCode(codePoint >> 6 & 31 | 192);
    } else if ((codePoint & 4294901760) == 0) {
      if (!checkScalarValue(codePoint, strict)) {
        codePoint = 65533;
      }
      symbol = stringFromCharCode(codePoint >> 12 & 15 | 224);
      symbol += createByte(codePoint, 6);
    } else if ((codePoint & 4292870144) == 0) {
      symbol = stringFromCharCode(codePoint >> 18 & 7 | 240);
      symbol += createByte(codePoint, 12);
      symbol += createByte(codePoint, 6);
    }
    symbol += stringFromCharCode(codePoint & 63 | 128);
    return symbol;
  }
  function utf8encode(string, opts) {
    opts = opts || {};
    var strict = opts.strict !== false;
    var codePoints = ucs2decode(string);
    var length = codePoints.length;
    var index = -1;
    var codePoint;
    var byteString = "";
    while (++index < length) {
      codePoint = codePoints[index];
      byteString += encodeCodePoint(codePoint, strict);
    }
    return byteString;
  }
  function readContinuationByte() {
    if (byteIndex >= byteCount) {
      throw Error("Invalid byte index");
    }
    var continuationByte = byteArray[byteIndex] & 255;
    byteIndex++;
    if ((continuationByte & 192) == 128) {
      return continuationByte & 63;
    }
    throw Error("Invalid continuation byte");
  }
  function decodeSymbol(strict) {
    var byte1;
    var byte2;
    var byte3;
    var byte4;
    var codePoint;
    if (byteIndex > byteCount) {
      throw Error("Invalid byte index");
    }
    if (byteIndex == byteCount) {
      return false;
    }
    byte1 = byteArray[byteIndex] & 255;
    byteIndex++;
    if ((byte1 & 128) == 0) {
      return byte1;
    }
    if ((byte1 & 224) == 192) {
      byte2 = readContinuationByte();
      codePoint = (byte1 & 31) << 6 | byte2;
      if (codePoint >= 128) {
        return codePoint;
      } else {
        throw Error("Invalid continuation byte");
      }
    }
    if ((byte1 & 240) == 224) {
      byte2 = readContinuationByte();
      byte3 = readContinuationByte();
      codePoint = (byte1 & 15) << 12 | byte2 << 6 | byte3;
      if (codePoint >= 2048) {
        return checkScalarValue(codePoint, strict) ? codePoint : 65533;
      } else {
        throw Error("Invalid continuation byte");
      }
    }
    if ((byte1 & 248) == 240) {
      byte2 = readContinuationByte();
      byte3 = readContinuationByte();
      byte4 = readContinuationByte();
      codePoint = (byte1 & 7) << 18 | byte2 << 12 | byte3 << 6 | byte4;
      if (codePoint >= 65536 && codePoint <= 1114111) {
        return codePoint;
      }
    }
    throw Error("Invalid UTF-8 detected");
  }
  var byteArray;
  var byteCount;
  var byteIndex;
  function utf8decode(byteString, opts) {
    opts = opts || {};
    var strict = opts.strict !== false;
    byteArray = ucs2decode(byteString);
    byteCount = byteArray.length;
    byteIndex = 0;
    var codePoints = [];
    var tmp;
    while ((tmp = decodeSymbol(strict)) !== false) {
      codePoints.push(tmp);
    }
    return ucs2encode(codePoints);
  }
  module.exports = {
    version: "2.1.2",
    encode: utf8encode,
    decode: utf8decode
  };
});

// mini-services/ironsight-room/node_modules/engine.io/build/parser-v3/index.js
var require_parser_v3 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.packets = exports.protocol = undefined;
  exports.encodePacket = encodePacket;
  exports.encodeBase64Packet = encodeBase64Packet;
  exports.decodePacket = decodePacket;
  exports.decodeBase64Packet = decodeBase64Packet;
  exports.encodePayload = encodePayload;
  exports.decodePayload = decodePayload;
  exports.encodePayloadAsBinary = encodePayloadAsBinary;
  exports.decodePayloadAsBinary = decodePayloadAsBinary;
  var utf8 = require_utf8();
  exports.protocol = 3;
  var hasBinary = (packets) => {
    for (const packet of packets) {
      if (packet.data instanceof ArrayBuffer || ArrayBuffer.isView(packet.data)) {
        return true;
      }
    }
    return false;
  };
  exports.packets = {
    open: 0,
    close: 1,
    ping: 2,
    pong: 3,
    message: 4,
    upgrade: 5,
    noop: 6
  };
  var packetslist = Object.keys(exports.packets);
  var err = { type: "error", data: "parser error" };
  var EMPTY_BUFFER = Buffer.concat([]);
  function encodePacket(packet, supportsBinary, utf8encode, callback) {
    if (typeof supportsBinary === "function") {
      callback = supportsBinary;
      supportsBinary = null;
    }
    if (typeof utf8encode === "function") {
      callback = utf8encode;
      utf8encode = null;
    }
    if (Buffer.isBuffer(packet.data)) {
      return encodeBuffer(packet, supportsBinary, callback);
    } else if (packet.data && (packet.data.buffer || packet.data) instanceof ArrayBuffer) {
      return encodeBuffer({ type: packet.type, data: arrayBufferToBuffer(packet.data) }, supportsBinary, callback);
    }
    var encoded = exports.packets[packet.type];
    if (packet.data !== undefined) {
      encoded += utf8encode ? utf8.encode(String(packet.data), { strict: false }) : String(packet.data);
    }
    return callback("" + encoded);
  }
  function encodeBuffer(packet, supportsBinary, callback) {
    if (!supportsBinary) {
      return encodeBase64Packet(packet, callback);
    }
    var data = packet.data;
    var typeBuffer = Buffer.allocUnsafe(1);
    typeBuffer[0] = exports.packets[packet.type];
    return callback(Buffer.concat([typeBuffer, data]));
  }
  function encodeBase64Packet(packet, callback) {
    var data = Buffer.isBuffer(packet.data) ? packet.data : arrayBufferToBuffer(packet.data);
    var message = "b" + exports.packets[packet.type];
    message += data.toString("base64");
    return callback(message);
  }
  function decodePacket(data, binaryType, utf8decode) {
    if (data === undefined) {
      return err;
    }
    let type;
    if (typeof data === "string") {
      type = data.charAt(0);
      if (type === "b") {
        return decodeBase64Packet(data.slice(1), binaryType);
      }
      if (utf8decode) {
        data = tryDecode(data);
        if (data === false) {
          return err;
        }
      }
      if (Number(type) != type || !packetslist[type]) {
        return err;
      }
      if (data.length > 1) {
        return { type: packetslist[type], data: data.slice(1) };
      } else {
        return { type: packetslist[type] };
      }
    }
    if (binaryType === "arraybuffer") {
      var intArray = new Uint8Array(data);
      type = intArray[0];
      return { type: packetslist[type], data: intArray.buffer.slice(1) };
    }
    if (data instanceof ArrayBuffer) {
      data = arrayBufferToBuffer(data);
    }
    type = data[0];
    return { type: packetslist[type], data: data.slice(1) };
  }
  function tryDecode(data) {
    try {
      data = utf8.decode(data, { strict: false });
    } catch (e) {
      return false;
    }
    return data;
  }
  function decodeBase64Packet(msg, binaryType) {
    var type = packetslist[msg.charAt(0)];
    var data = Buffer.from(msg.slice(1), "base64");
    if (binaryType === "arraybuffer") {
      var abv = new Uint8Array(data.length);
      for (var i = 0;i < abv.length; i++) {
        abv[i] = data[i];
      }
      data = abv.buffer;
    }
    return { type, data };
  }
  function encodePayload(packets, supportsBinary, callback) {
    if (typeof supportsBinary === "function") {
      callback = supportsBinary;
      supportsBinary = null;
    }
    if (supportsBinary && hasBinary(packets)) {
      return encodePayloadAsBinary(packets, callback);
    }
    if (!packets.length) {
      return callback("0:");
    }
    function encodeOne(packet, doneCallback) {
      encodePacket(packet, supportsBinary, false, function(message) {
        doneCallback(null, setLengthHeader(message));
      });
    }
    map(packets, encodeOne, function(err2, results) {
      return callback(results.join(""));
    });
  }
  function setLengthHeader(message) {
    return message.length + ":" + message;
  }
  function map(ary, each, done) {
    const results = new Array(ary.length);
    let count = 0;
    for (let i = 0;i < ary.length; i++) {
      each(ary[i], (error, msg) => {
        results[i] = msg;
        if (++count === ary.length) {
          done(null, results);
        }
      });
    }
  }
  function decodePayload(data, binaryType, callback) {
    if (typeof data !== "string") {
      return decodePayloadAsBinary(data, binaryType, callback);
    }
    if (typeof binaryType === "function") {
      callback = binaryType;
      binaryType = null;
    }
    if (data === "") {
      return callback(err, 0, 1);
    }
    var length = "", n, msg, packet;
    for (var i = 0, l = data.length;i < l; i++) {
      var chr = data.charAt(i);
      if (chr !== ":") {
        length += chr;
        continue;
      }
      if (length === "" || length != (n = Number(length))) {
        return callback(err, 0, 1);
      }
      msg = data.slice(i + 1, i + 1 + n);
      if (length != msg.length) {
        return callback(err, 0, 1);
      }
      if (msg.length) {
        packet = decodePacket(msg, binaryType, false);
        if (err.type === packet.type && err.data === packet.data) {
          return callback(err, 0, 1);
        }
        var more = callback(packet, i + n, l);
        if (more === false)
          return;
      }
      i += n;
      length = "";
    }
    if (length !== "") {
      return callback(err, 0, 1);
    }
  }
  function bufferToString(buffer) {
    var str = "";
    for (var i = 0, l = buffer.length;i < l; i++) {
      str += String.fromCharCode(buffer[i]);
    }
    return str;
  }
  function stringToBuffer(string) {
    var buf = Buffer.allocUnsafe(string.length);
    for (var i = 0, l = string.length;i < l; i++) {
      buf.writeUInt8(string.charCodeAt(i), i);
    }
    return buf;
  }
  function arrayBufferToBuffer(data) {
    var length = data.byteLength || data.length;
    var offset = data.byteOffset || 0;
    return Buffer.from(data.buffer || data, offset, length);
  }
  function encodePayloadAsBinary(packets, callback) {
    if (!packets.length) {
      return callback(EMPTY_BUFFER);
    }
    map(packets, encodeOneBinaryPacket, function(err2, results) {
      return callback(Buffer.concat(results));
    });
  }
  function encodeOneBinaryPacket(p, doneCallback) {
    function onBinaryPacketEncode(packet) {
      var encodingLength = "" + packet.length;
      var sizeBuffer;
      if (typeof packet === "string") {
        sizeBuffer = Buffer.allocUnsafe(encodingLength.length + 2);
        sizeBuffer[0] = 0;
        for (var i = 0;i < encodingLength.length; i++) {
          sizeBuffer[i + 1] = parseInt(encodingLength[i], 10);
        }
        sizeBuffer[sizeBuffer.length - 1] = 255;
        return doneCallback(null, Buffer.concat([sizeBuffer, stringToBuffer(packet)]));
      }
      sizeBuffer = Buffer.allocUnsafe(encodingLength.length + 2);
      sizeBuffer[0] = 1;
      for (var i = 0;i < encodingLength.length; i++) {
        sizeBuffer[i + 1] = parseInt(encodingLength[i], 10);
      }
      sizeBuffer[sizeBuffer.length - 1] = 255;
      doneCallback(null, Buffer.concat([sizeBuffer, packet]));
    }
    encodePacket(p, true, true, onBinaryPacketEncode);
  }
  function decodePayloadAsBinary(data, binaryType, callback) {
    if (typeof binaryType === "function") {
      callback = binaryType;
      binaryType = null;
    }
    var bufferTail = data;
    var buffers = [];
    var i;
    while (bufferTail.length > 0) {
      var strLen = "";
      var isString = bufferTail[0] === 0;
      for (i = 1;; i++) {
        if (bufferTail[i] === 255)
          break;
        if (strLen.length > 310) {
          return callback(err, 0, 1);
        }
        strLen += "" + bufferTail[i];
      }
      bufferTail = bufferTail.slice(strLen.length + 1);
      var msgLength = parseInt(strLen, 10);
      var msg = bufferTail.slice(1, msgLength + 1);
      if (isString)
        msg = bufferToString(msg);
      buffers.push(msg);
      bufferTail = bufferTail.slice(msgLength + 1);
    }
    var total = buffers.length;
    for (i = 0;i < total; i++) {
      var buffer = buffers[i];
      callback(decodePacket(buffer, binaryType, true), i, total);
    }
  }
});

// mini-services/ironsight-room/node_modules/ms/index.js
var require_ms = __commonJS((exports, module) => {
  var s = 1000;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  module.exports = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse(val);
    } else if (type === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
  };
  function parse(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return;
    }
  }
  function fmtShort(ms) {
    var msAbs = Math.abs(ms);
    if (msAbs >= d) {
      return Math.round(ms / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms / s) + "s";
    }
    return ms + "ms";
  }
  function fmtLong(ms) {
    var msAbs = Math.abs(ms);
    if (msAbs >= d) {
      return plural(ms, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms, msAbs, s, "second");
    }
    return ms + " ms";
  }
  function plural(ms, msAbs, n, name) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
  }
});

// mini-services/ironsight-room/node_modules/debug/src/common.js
var require_common = __commonJS((exports, module) => {
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = require_ms();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0;i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug(...args) {
        if (!debug.enabled) {
          return;
        }
        const self = debug;
        const curr = Number(new Date);
        const ms = curr - (prevTime || curr);
        self.diff = ms;
        self.prev = prevTime;
        self.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index];
            match = formatter.call(self, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        createDebug.formatArgs.call(self, args);
        const logFn = self.log || createDebug.log;
        logFn.apply(self, args);
      }
      debug.namespace = namespace;
      debug.useColors = createDebug.useColors();
      debug.color = createDebug.selectColor(namespace);
      debug.extend = extend;
      debug.destroy = createDebug.destroy;
      Object.defineProperty(debug, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug);
      }
      return debug;
    }
    function extend(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const ns of split) {
        if (ns[0] === "-") {
          createDebug.skips.push(ns.slice(1));
        } else {
          createDebug.names.push(ns);
        }
      }
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length) {
        if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else {
          return false;
        }
      }
      while (templateIndex < template.length && template[templateIndex] === "*") {
        templateIndex++;
      }
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [
        ...createDebug.names,
        ...createDebug.skips.map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips) {
        if (matchesTemplate(name, skip)) {
          return false;
        }
      }
      for (const ns of createDebug.names) {
        if (matchesTemplate(name, ns)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  module.exports = setup;
});

// mini-services/ironsight-room/node_modules/debug/src/browser.js
var require_browser = __commonJS((exports, module) => {
  exports.formatArgs = formatArgs;
  exports.save = save;
  exports.load = load;
  exports.useColors = useColors;
  exports.storage = localstorage();
  exports.destroy = (() => {
    let warned = false;
    return () => {
      if (!warned) {
        warned = true;
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
    };
  })();
  exports.colors = [
    "#0000CC",
    "#0000FF",
    "#0033CC",
    "#0033FF",
    "#0066CC",
    "#0066FF",
    "#0099CC",
    "#0099FF",
    "#00CC00",
    "#00CC33",
    "#00CC66",
    "#00CC99",
    "#00CCCC",
    "#00CCFF",
    "#3300CC",
    "#3300FF",
    "#3333CC",
    "#3333FF",
    "#3366CC",
    "#3366FF",
    "#3399CC",
    "#3399FF",
    "#33CC00",
    "#33CC33",
    "#33CC66",
    "#33CC99",
    "#33CCCC",
    "#33CCFF",
    "#6600CC",
    "#6600FF",
    "#6633CC",
    "#6633FF",
    "#66CC00",
    "#66CC33",
    "#9900CC",
    "#9900FF",
    "#9933CC",
    "#9933FF",
    "#99CC00",
    "#99CC33",
    "#CC0000",
    "#CC0033",
    "#CC0066",
    "#CC0099",
    "#CC00CC",
    "#CC00FF",
    "#CC3300",
    "#CC3333",
    "#CC3366",
    "#CC3399",
    "#CC33CC",
    "#CC33FF",
    "#CC6600",
    "#CC6633",
    "#CC9900",
    "#CC9933",
    "#CCCC00",
    "#CCCC33",
    "#FF0000",
    "#FF0033",
    "#FF0066",
    "#FF0099",
    "#FF00CC",
    "#FF00FF",
    "#FF3300",
    "#FF3333",
    "#FF3366",
    "#FF3399",
    "#FF33CC",
    "#FF33FF",
    "#FF6600",
    "#FF6633",
    "#FF9900",
    "#FF9933",
    "#FFCC00",
    "#FFCC33"
  ];
  function useColors() {
    if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
      return true;
    }
    if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
      return false;
    }
    let m;
    return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
  }
  function formatArgs(args) {
    args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
    if (!this.useColors) {
      return;
    }
    const c = "color: " + this.color;
    args.splice(1, 0, c, "color: inherit");
    let index = 0;
    let lastC = 0;
    args[0].replace(/%[a-zA-Z%]/g, (match) => {
      if (match === "%%") {
        return;
      }
      index++;
      if (match === "%c") {
        lastC = index;
      }
    });
    args.splice(lastC, 0, c);
  }
  exports.log = console.debug || console.log || (() => {});
  function save(namespaces) {
    try {
      if (namespaces) {
        exports.storage.setItem("debug", namespaces);
      } else {
        exports.storage.removeItem("debug");
      }
    } catch (error) {}
  }
  function load() {
    let r;
    try {
      r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
    } catch (error) {}
    if (!r && typeof process !== "undefined" && "env" in process) {
      r = process.env.DEBUG;
    }
    return r;
  }
  function localstorage() {
    try {
      return localStorage;
    } catch (error) {}
  }
  module.exports = require_common()(exports);
  var { formatters } = module.exports;
  formatters.j = function(v) {
    try {
      return JSON.stringify(v);
    } catch (error) {
      return "[UnexpectedJSONParseError]: " + error.message;
    }
  };
});

// node_modules/has-flag/index.js
var require_has_flag = __commonJS((exports, module) => {
  module.exports = (flag, argv = process.argv) => {
    const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
    const position = argv.indexOf(prefix + flag);
    const terminatorPosition = argv.indexOf("--");
    return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
  };
});

// node_modules/supports-color/index.js
var require_supports_color = __commonJS((exports, module) => {
  var os = __require("os");
  var tty = __require("tty");
  var hasFlag = require_has_flag();
  var { env } = process;
  var forceColor;
  if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
    forceColor = 0;
  } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
    forceColor = 1;
  }
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      forceColor = 1;
    } else if (env.FORCE_COLOR === "false") {
      forceColor = 0;
    } else {
      forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
    }
  }
  function translateLevel(level) {
    if (level === 0) {
      return false;
    }
    return {
      level,
      hasBasic: true,
      has256: level >= 2,
      has16m: level >= 3
    };
  }
  function supportsColor(haveStream, streamIsTTY) {
    if (forceColor === 0) {
      return 0;
    }
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
      return 3;
    }
    if (hasFlag("color=256")) {
      return 2;
    }
    if (haveStream && !streamIsTTY && forceColor === undefined) {
      return 0;
    }
    const min = forceColor || 0;
    if (env.TERM === "dumb") {
      return min;
    }
    if (process.platform === "win32") {
      const osRelease = os.release().split(".");
      if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
        return Number(osRelease[2]) >= 14931 ? 3 : 2;
      }
      return 1;
    }
    if ("CI" in env) {
      if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => (sign in env)) || env.CI_NAME === "codeship") {
        return 1;
      }
      return min;
    }
    if ("TEAMCITY_VERSION" in env) {
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
    }
    if (env.COLORTERM === "truecolor") {
      return 3;
    }
    if ("TERM_PROGRAM" in env) {
      const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env.TERM_PROGRAM) {
        case "iTerm.app":
          return version >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env.TERM)) {
      return 2;
    }
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
      return 1;
    }
    if ("COLORTERM" in env) {
      return 1;
    }
    return min;
  }
  function getSupportLevel(stream) {
    const level = supportsColor(stream, stream && stream.isTTY);
    return translateLevel(level);
  }
  module.exports = {
    supportsColor: getSupportLevel,
    stdout: translateLevel(supportsColor(true, tty.isatty(1))),
    stderr: translateLevel(supportsColor(true, tty.isatty(2)))
  };
});

// mini-services/ironsight-room/node_modules/debug/src/node.js
var require_node = __commonJS((exports, module) => {
  var tty = __require("tty");
  var util = __require("util");
  exports.init = init;
  exports.log = log;
  exports.formatArgs = formatArgs;
  exports.save = save;
  exports.load = load;
  exports.useColors = useColors;
  exports.destroy = util.deprecate(() => {}, "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
  exports.colors = [6, 2, 3, 4, 5, 1];
  try {
    const supportsColor = require_supports_color();
    if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
      exports.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ];
    }
  } catch (error) {}
  exports.inspectOpts = Object.keys(process.env).filter((key) => {
    return /^debug_/i.test(key);
  }).reduce((obj, key) => {
    const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
      return k.toUpperCase();
    });
    let val = process.env[key];
    if (/^(yes|on|true|enabled)$/i.test(val)) {
      val = true;
    } else if (/^(no|off|false|disabled)$/i.test(val)) {
      val = false;
    } else if (val === "null") {
      val = null;
    } else {
      val = Number(val);
    }
    obj[prop] = val;
    return obj;
  }, {});
  function useColors() {
    return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
  }
  function formatArgs(args) {
    const { namespace: name, useColors: useColors2 } = this;
    if (useColors2) {
      const c = this.color;
      const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
      const prefix = `  ${colorCode};1m${name} \x1B[0m`;
      args[0] = prefix + args[0].split(`
`).join(`
` + prefix);
      args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
    } else {
      args[0] = getDate() + name + " " + args[0];
    }
  }
  function getDate() {
    if (exports.inspectOpts.hideDate) {
      return "";
    }
    return new Date().toISOString() + " ";
  }
  function log(...args) {
    return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + `
`);
  }
  function save(namespaces) {
    if (namespaces) {
      process.env.DEBUG = namespaces;
    } else {
      delete process.env.DEBUG;
    }
  }
  function load() {
    return process.env.DEBUG;
  }
  function init(debug) {
    debug.inspectOpts = {};
    const keys = Object.keys(exports.inspectOpts);
    for (let i = 0;i < keys.length; i++) {
      debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
    }
  }
  module.exports = require_common()(exports);
  var { formatters } = module.exports;
  formatters.o = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts).split(`
`).map((str) => str.trim()).join(" ");
  };
  formatters.O = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts);
  };
});

// mini-services/ironsight-room/node_modules/debug/src/index.js
var require_src = __commonJS((exports, module) => {
  if (typeof process === "undefined" || process.type === "renderer" || false || process.__nwjs) {
    module.exports = require_browser();
  } else {
    module.exports = require_node();
  }
});

// mini-services/ironsight-room/node_modules/engine.io/build/transport.js
var require_transport = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports && exports.__importStar || function() {
    var ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o2) {
        var ar = [];
        for (var k in o2)
          if (Object.prototype.hasOwnProperty.call(o2, k))
            ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    return function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k = ownKeys(mod), i = 0;i < k.length; i++)
          if (k[i] !== "default")
            __createBinding(result, mod, k[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  }();
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Transport = undefined;
  var events_1 = __require("events");
  var parser_v4 = __importStar(require_cjs());
  var parser_v3 = __importStar(require_parser_v3());
  var debug_1 = __importDefault(require_src());
  var debug = (0, debug_1.default)("engine:transport");
  function noop() {}

  class Transport extends events_1.EventEmitter {
    get readyState() {
      return this._readyState;
    }
    set readyState(state) {
      debug("readyState updated from %s to %s (%s)", this._readyState, state, this.name);
      this._readyState = state;
    }
    constructor(req) {
      super();
      this.writable = false;
      this._readyState = "open";
      this.discarded = false;
      this.protocol = req._query.EIO === "4" ? 4 : 3;
      this.parser = this.protocol === 4 ? parser_v4 : parser_v3;
      this.supportsBinary = !(req._query && req._query.b64);
    }
    discard() {
      this.discarded = true;
    }
    onRequest(req) {}
    close(fn) {
      if (this.readyState === "closed" || this.readyState === "closing")
        return;
      this.readyState = "closing";
      this.doClose(fn || noop);
    }
    onError(msg, desc) {
      if (this.listeners("error").length) {
        const err = new Error(msg);
        err.type = "TransportError";
        err.description = desc;
        this.emit("error", err);
      } else {
        debug("ignored transport error %s (%s)", msg, desc);
      }
    }
    onPacket(packet) {
      this.emit("packet", packet);
    }
    onData(data) {
      this.onPacket(this.parser.decodePacket(data));
    }
    onClose() {
      this.readyState = "closed";
      this.emit("close");
    }
  }
  exports.Transport = Transport;
  Transport.upgradesTo = [];
});

// mini-services/ironsight-room/node_modules/engine.io/build/transports/polling.js
var require_polling = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Polling = undefined;
  var transport_1 = require_transport();
  var zlib_1 = __require("zlib");
  var accepts = require_accepts();
  var debug_1 = __importDefault(require_src());
  var debug = (0, debug_1.default)("engine:polling");
  var compressionMethods = {
    gzip: zlib_1.createGzip,
    deflate: zlib_1.createDeflate
  };

  class Polling extends transport_1.Transport {
    constructor(req) {
      super(req);
      this.closeTimeout = 30 * 1000;
    }
    get name() {
      return "polling";
    }
    onRequest(req) {
      const res = req.res;
      req.res = null;
      if (req.method === "GET") {
        this.onPollRequest(req, res);
      } else if (req.method === "POST") {
        this.onDataRequest(req, res);
      } else {
        res.writeHead(500);
        res.end();
      }
    }
    onPollRequest(req, res) {
      if (this.req) {
        debug("request overlap");
        this.onError("overlap from client");
        res.writeHead(400);
        res.end();
        return;
      }
      debug("setting request");
      this.req = req;
      this.res = res;
      const onClose = () => {
        this.onError("poll connection closed prematurely");
      };
      const cleanup = () => {
        req.removeListener("close", onClose);
        this.req = this.res = null;
      };
      req.cleanup = cleanup;
      req.on("close", onClose);
      this.writable = true;
      this.emit("ready");
      if (this.writable && this.shouldClose) {
        debug("triggering empty send to append close packet");
        this.send([{ type: "noop" }]);
      }
    }
    onDataRequest(req, res) {
      if (this.dataReq) {
        this.onError("data request overlap from client");
        res.writeHead(400);
        res.end();
        return;
      }
      const isBinary = req.headers["content-type"] === "application/octet-stream";
      if (isBinary && this.protocol === 4) {
        this.onError("invalid content");
        return res.writeHead(400).end();
      }
      this.dataReq = req;
      this.dataRes = res;
      const buffers = [];
      let stringChunks = "";
      let contentLength = 0;
      let exceededMaxHttpBufferSize = false;
      const cleanup = () => {
        req.removeListener("data", onData);
        req.removeListener("end", onEnd);
        req.removeListener("close", onClose);
        this.dataReq = this.dataRes = null;
      };
      const onClose = () => {
        cleanup();
        this.onError("data request connection closed prematurely");
      };
      const onData = (chunk) => {
        contentLength += isBinary ? chunk.length : Buffer.byteLength(chunk);
        if (contentLength > this.maxHttpBufferSize) {
          exceededMaxHttpBufferSize = true;
          res.writeHead(413).end();
          cleanup();
          return;
        }
        if (isBinary) {
          buffers.push(chunk);
        } else {
          stringChunks += chunk;
        }
      };
      const onEnd = () => {
        if (exceededMaxHttpBufferSize) {
          return;
        }
        const chunks = isBinary ? Buffer.concat(buffers, contentLength) : stringChunks;
        this.onData(chunks);
        const headers = {
          "Content-Type": "text/html",
          "Content-Length": "2"
        };
        res.writeHead(200, this.headers(req, headers));
        res.end("ok");
        cleanup();
      };
      req.on("close", onClose);
      if (!isBinary)
        req.setEncoding("utf8");
      req.on("data", onData);
      req.on("end", onEnd);
    }
    onData(data) {
      debug('received "%s"', data);
      const callback = (packet) => {
        if (packet.type === "close") {
          debug("got xhr close packet");
          this.onClose();
          return false;
        }
        this.onPacket(packet);
      };
      if (this.protocol === 3) {
        this.parser.decodePayload(data, callback);
      } else {
        this.parser.decodePayload(data).forEach(callback);
      }
    }
    onClose() {
      if (this.writable) {
        this.send([{ type: "noop" }]);
      }
      super.onClose();
    }
    send(packets) {
      this.writable = false;
      if (this.shouldClose) {
        debug("appending close packet to payload");
        packets.push({ type: "close" });
        this.shouldClose();
        this.shouldClose = null;
      }
      const doWrite = (data) => {
        const compress = packets.some((packet) => {
          return packet.options && packet.options.compress;
        });
        this.write(data, { compress });
      };
      if (this.protocol === 3) {
        this.parser.encodePayload(packets, this.supportsBinary, doWrite);
      } else {
        this.parser.encodePayload(packets, doWrite);
      }
    }
    write(data, options) {
      debug('writing "%s"', data);
      this.doWrite(data, options, () => {
        this.req.cleanup();
        this.emit("drain");
      });
    }
    doWrite(data, options, callback) {
      const isString = typeof data === "string";
      const contentType = isString ? "text/plain; charset=UTF-8" : "application/octet-stream";
      const headers = {
        "Content-Type": contentType
      };
      const respond = (data2) => {
        headers["Content-Length"] = typeof data2 === "string" ? Buffer.byteLength(data2) : data2.length;
        this.res.writeHead(200, this.headers(this.req, headers));
        this.res.end(data2);
        callback();
      };
      if (!this.httpCompression || !options.compress) {
        respond(data);
        return;
      }
      const len = isString ? Buffer.byteLength(data) : data.length;
      if (len < this.httpCompression.threshold) {
        respond(data);
        return;
      }
      const encoding = accepts(this.req).encodings(["gzip", "deflate"]);
      if (!encoding) {
        respond(data);
        return;
      }
      debug("compressing");
      headers["Content-Encoding"] = encoding;
      this.res.writeHead(200, this.headers(this.req, headers));
      const stream = compressionMethods[encoding](this.httpCompression);
      let isErrored = false;
      let isDone = false;
      const done = () => {
        if (isDone || isErrored) {
          return;
        }
        isDone = true;
        callback();
      };
      stream.on("error", (err) => {
        isErrored = true;
        this.res.end();
        callback(err);
      });
      this.res.once("finish", done);
      this.res.once("close", done);
      stream.pipe(this.res);
      stream.end(data);
    }
    doClose(fn) {
      debug("closing");
      let closeTimeoutTimer;
      if (this.dataReq) {
        debug("aborting ongoing data request");
        this.dataReq.destroy();
      }
      const onClose = () => {
        clearTimeout(closeTimeoutTimer);
        fn();
        this.onClose();
      };
      if (this.writable) {
        debug("transport writable - closing right away");
        this.send([{ type: "close" }]);
        onClose();
      } else if (this.discarded) {
        debug("transport discarded - closing right away");
        onClose();
      } else {
        debug("transport not writable - buffering orderly close");
        this.shouldClose = onClose;
        closeTimeoutTimer = setTimeout(onClose, this.closeTimeout);
      }
    }
    headers(req, headers = {}) {
      const ua = req.headers["user-agent"];
      if (ua && (~ua.indexOf(";MSIE") || ~ua.indexOf("Trident/"))) {
        headers["X-XSS-Protection"] = "0";
      }
      headers["cache-control"] = "no-store";
      this.emit("headers", headers, req);
      return headers;
    }
  }
  exports.Polling = Polling;
});

// mini-services/ironsight-room/node_modules/engine.io/build/transports/polling-jsonp.js
var require_polling_jsonp = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports && exports.__importStar || function() {
    var ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o2) {
        var ar = [];
        for (var k in o2)
          if (Object.prototype.hasOwnProperty.call(o2, k))
            ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    return function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k = ownKeys(mod), i = 0;i < k.length; i++)
          if (k[i] !== "default")
            __createBinding(result, mod, k[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  }();
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.JSONP = undefined;
  var polling_1 = require_polling();
  var qs = __importStar(__require("querystring"));
  var rDoubleSlashes = /\\\\n/g;
  var rSlashes = /(\\)?\\n/g;

  class JSONP extends polling_1.Polling {
    constructor(req) {
      super(req);
      this.head = "___eio[" + (req._query.j || "").replace(/[^0-9]/g, "") + "](";
      this.foot = ");";
    }
    onData(data) {
      data = qs.parse(data).d;
      if (typeof data === "string") {
        data = data.replace(rSlashes, function(match, slashes) {
          return slashes ? match : `
`;
        });
        super.onData(data.replace(rDoubleSlashes, "\\n"));
      }
    }
    doWrite(data, options, callback) {
      const js = JSON.stringify(data).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
      data = this.head + js + this.foot;
      super.doWrite(data, options, callback);
    }
  }
  exports.JSONP = JSONP;
});

// mini-services/ironsight-room/node_modules/engine.io/build/transports/websocket.js
var require_websocket = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.WebSocket = undefined;
  var transport_1 = require_transport();
  var debug_1 = __importDefault(require_src());
  var debug = (0, debug_1.default)("engine:ws");

  class WebSocket extends transport_1.Transport {
    constructor(req) {
      super(req);
      this._doSend = (data) => {
        this.socket.send(data, this._onSent);
      };
      this._doSendLast = (data) => {
        this.socket.send(data, this._onSentLast);
      };
      this._onSent = (err) => {
        if (err) {
          this.onError("write error", err.stack);
        }
      };
      this._onSentLast = (err) => {
        if (err) {
          this.onError("write error", err.stack);
        } else {
          this.emit("drain");
          this.writable = true;
          this.emit("ready");
        }
      };
      this.socket = req.websocket;
      this.socket.on("message", (data, isBinary) => {
        const message = isBinary ? data : data.toString();
        debug('received "%s"', message);
        super.onData(message);
      });
      this.socket.once("close", this.onClose.bind(this));
      this.socket.on("error", this.onError.bind(this));
      this.writable = true;
      this.perMessageDeflate = null;
    }
    get name() {
      return "websocket";
    }
    get handlesUpgrades() {
      return true;
    }
    send(packets) {
      this.writable = false;
      for (let i = 0;i < packets.length; i++) {
        const packet = packets[i];
        const isLast = i + 1 === packets.length;
        if (this._canSendPreEncodedFrame(packet)) {
          this.socket._sender.sendFrame(packet.options.wsPreEncodedFrame, isLast ? this._onSentLast : this._onSent);
        } else {
          this.parser.encodePacket(packet, this.supportsBinary, isLast ? this._doSendLast : this._doSend);
        }
      }
    }
    _canSendPreEncodedFrame(packet) {
      var _a, _b, _c;
      return !this.perMessageDeflate && typeof ((_b = (_a = this.socket) === null || _a === undefined ? undefined : _a._sender) === null || _b === undefined ? undefined : _b.sendFrame) === "function" && ((_c = packet.options) === null || _c === undefined ? undefined : _c.wsPreEncodedFrame) !== undefined;
    }
    doClose(fn) {
      debug("closing");
      this.socket.close();
      fn && fn();
    }
  }
  exports.WebSocket = WebSocket;
});

// mini-services/ironsight-room/node_modules/engine.io/build/transports/webtransport.js
var require_webtransport = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.WebTransport = undefined;
  var transport_1 = require_transport();
  var debug_1 = __importDefault(require_src());
  var engine_io_parser_1 = require_cjs();
  var debug = (0, debug_1.default)("engine:webtransport");

  class WebTransport extends transport_1.Transport {
    constructor(session, stream, reader) {
      super({ _query: { EIO: "4" } });
      this.session = session;
      const transformStream = (0, engine_io_parser_1.createPacketEncoderStream)();
      transformStream.readable.pipeTo(stream.writable).catch(() => {
        debug("the stream was closed");
      });
      this.writer = transformStream.writable.getWriter();
      (async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              debug("session is closed");
              break;
            }
            debug("received chunk: %o", value);
            this.onPacket(value);
          }
        } catch (e) {
          debug("error while reading: %s", e.message);
        }
      })();
      session.closed.then(() => this.onClose());
      this.writable = true;
    }
    get name() {
      return "webtransport";
    }
    async send(packets) {
      this.writable = false;
      try {
        for (let i = 0;i < packets.length; i++) {
          const packet = packets[i];
          await this.writer.write(packet);
        }
      } catch (e) {
        debug("error while writing: %s", e.message);
      }
      this.emit("drain");
      this.writable = true;
      this.emit("ready");
    }
    doClose(fn) {
      debug("closing WebTransport session");
      this.session.close();
      fn && fn();
    }
  }
  exports.WebTransport = WebTransport;
});

// mini-services/ironsight-room/node_modules/engine.io/build/transports/index.js
var require_transports = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var polling_1 = require_polling();
  var polling_jsonp_1 = require_polling_jsonp();
  var websocket_1 = require_websocket();
  var webtransport_1 = require_webtransport();
  exports.default = {
    polling,
    websocket: websocket_1.WebSocket,
    webtransport: webtransport_1.WebTransport
  };
  function polling(req) {
    if (typeof req._query.j === "string") {
      return new polling_jsonp_1.JSONP(req);
    } else {
      return new polling_1.Polling(req);
    }
  }
  polling.upgradesTo = ["websocket", "webtransport"];
});

// mini-services/ironsight-room/node_modules/engine.io/build/socket.js
var require_socket = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Socket = undefined;
  var events_1 = __require("events");
  var debug_1 = __importDefault(require_src());
  var timers_1 = __require("timers");
  var debug = (0, debug_1.default)("engine:socket");

  class Socket extends events_1.EventEmitter {
    get readyState() {
      return this._readyState;
    }
    set readyState(state) {
      debug("readyState updated from %s to %s", this._readyState, state);
      this._readyState = state;
    }
    constructor(id, server, transport, req, protocol) {
      super();
      this._readyState = "opening";
      this.upgrading = false;
      this.upgraded = false;
      this.writeBuffer = [];
      this.packetsFn = [];
      this.sentCallbackFn = [];
      this.cleanupFn = [];
      this.pingTimeoutTimer = null;
      this.pingIntervalTimer = null;
      this.hasRefreshedPingTimeout = false;
      this.id = id;
      this.server = server;
      this.request = req;
      this.protocol = protocol;
      if (req) {
        if (req.websocket && req.websocket._socket) {
          this.remoteAddress = req.websocket._socket.remoteAddress;
        } else {
          this.remoteAddress = req.connection.remoteAddress;
        }
      }
      this.setTransport(transport);
      this.onOpen();
    }
    onOpen() {
      this.readyState = "open";
      this.transport.sid = this.id;
      this.sendPacket("open", JSON.stringify({
        sid: this.id,
        upgrades: this.getAvailableUpgrades(),
        pingInterval: this.server.opts.pingInterval,
        pingTimeout: this.server.opts.pingTimeout,
        maxPayload: this.server.opts.maxHttpBufferSize
      }));
      if (this.server.opts.initialPacket) {
        this.sendPacket("message", this.server.opts.initialPacket);
      }
      this.emit("open");
      if (this.protocol === 3) {
        this.resetPingTimeout();
      } else {
        this.schedulePing();
      }
    }
    onPacket(packet) {
      var _a, _b;
      if (this.readyState !== "open") {
        return debug("packet received with closed socket");
      }
      debug(`received packet ${packet.type}`);
      this.emit("packet", packet);
      if (this.protocol !== 3 && this.pingTimeoutTimer !== null && !this.hasRefreshedPingTimeout && packet.type !== "pong") {
        debug("got packet while waiting for pong - refreshing ping timeout");
        this.pingTimeoutTimer.refresh();
        this.hasRefreshedPingTimeout = true;
      }
      switch (packet.type) {
        case "ping":
          if (this.protocol !== 3) {
            this.onError(new Error("invalid heartbeat direction"));
            return;
          }
          debug("got ping");
          (_a = this.pingTimeoutTimer) === null || _a === undefined || _a.refresh();
          this.sendPacket("pong");
          this.emit("heartbeat");
          break;
        case "pong":
          if (this.protocol === 3) {
            this.onError(new Error("invalid heartbeat direction"));
            return;
          }
          debug("got pong");
          (0, timers_1.clearTimeout)(this.pingTimeoutTimer);
          this.pingTimeoutTimer = null;
          (_b = this.pingIntervalTimer) === null || _b === undefined || _b.refresh();
          this.emit("heartbeat");
          break;
        case "error":
          this.onClose("parse error");
          break;
        case "message":
          this.emit("data", packet.data);
          this.emit("message", packet.data);
          break;
      }
    }
    onError(err) {
      debug("transport error");
      this.onClose("transport error", err);
    }
    schedulePing() {
      this.pingIntervalTimer = (0, timers_1.setTimeout)(() => {
        debug("writing ping packet - expecting pong within %sms", this.server.opts.pingTimeout);
        this.hasRefreshedPingTimeout = false;
        this.sendPacket("ping");
        this.resetPingTimeout();
      }, this.server.opts.pingInterval);
    }
    resetPingTimeout() {
      (0, timers_1.clearTimeout)(this.pingTimeoutTimer);
      this.pingTimeoutTimer = (0, timers_1.setTimeout)(() => {
        if (this.readyState === "closed")
          return;
        this.onClose("ping timeout");
      }, this.protocol === 3 ? this.server.opts.pingInterval + this.server.opts.pingTimeout : this.server.opts.pingTimeout);
    }
    setTransport(transport) {
      const onError = this.onError.bind(this);
      const onReady = () => this.flush();
      const onPacket = this.onPacket.bind(this);
      const onDrain = this.onDrain.bind(this);
      const onClose = this.onClose.bind(this, "transport close");
      this.transport = transport;
      this.transport.once("error", onError);
      this.transport.on("ready", onReady);
      this.transport.on("packet", onPacket);
      this.transport.on("drain", onDrain);
      this.transport.once("close", onClose);
      this.cleanupFn.push(function() {
        transport.removeListener("error", onError);
        transport.removeListener("ready", onReady);
        transport.removeListener("packet", onPacket);
        transport.removeListener("drain", onDrain);
        transport.removeListener("close", onClose);
      });
    }
    onDrain() {
      if (this.sentCallbackFn.length > 0) {
        debug("executing batch send callback");
        const seqFn = this.sentCallbackFn.shift();
        if (seqFn) {
          for (let i = 0;i < seqFn.length; i++) {
            seqFn[i](this.transport);
          }
        }
      }
    }
    _maybeUpgrade(transport) {
      debug('might upgrade socket transport from "%s" to "%s"', this.transport.name, transport.name);
      this.upgrading = true;
      const upgradeTimeoutTimer = (0, timers_1.setTimeout)(() => {
        debug("client did not complete upgrade - closing transport");
        cleanup();
        if (transport.readyState === "open") {
          transport.close();
        }
      }, this.server.opts.upgradeTimeout);
      let checkIntervalTimer;
      const onPacket = (packet) => {
        if (packet.type === "ping" && packet.data === "probe") {
          debug("got probe ping packet, sending pong");
          transport.send([{ type: "pong", data: "probe" }]);
          this.emit("upgrading", transport);
          clearInterval(checkIntervalTimer);
          checkIntervalTimer = setInterval(check, 100);
        } else if (packet.type === "upgrade" && this.readyState !== "closed") {
          debug("got upgrade packet - upgrading");
          cleanup();
          this.transport.discard();
          this.upgraded = true;
          this.clearTransport();
          this.setTransport(transport);
          this.emit("upgrade", transport);
          this.flush();
          if (this.readyState === "closing") {
            transport.close(() => {
              this.onClose("forced close");
            });
          }
        } else {
          cleanup();
          transport.close();
        }
      };
      const check = () => {
        if (this.transport.name === "polling" && this.transport.writable) {
          debug("writing a noop packet to polling for fast upgrade");
          this.transport.send([{ type: "noop" }]);
        }
      };
      const cleanup = () => {
        this.upgrading = false;
        clearInterval(checkIntervalTimer);
        (0, timers_1.clearTimeout)(upgradeTimeoutTimer);
        transport.removeListener("packet", onPacket);
        transport.removeListener("close", onTransportClose);
        transport.removeListener("error", onError);
        this.removeListener("close", onClose);
      };
      const onError = (err) => {
        debug("client did not complete upgrade - %s", err);
        cleanup();
        transport.close();
        transport = null;
      };
      const onTransportClose = () => {
        onError("transport closed");
      };
      const onClose = () => {
        onError("socket closed");
      };
      transport.on("packet", onPacket);
      transport.once("close", onTransportClose);
      transport.once("error", onError);
      this.once("close", onClose);
    }
    clearTransport() {
      let cleanup;
      const toCleanUp = this.cleanupFn.length;
      for (let i = 0;i < toCleanUp; i++) {
        cleanup = this.cleanupFn.shift();
        cleanup();
      }
      this.transport.on("error", function() {
        debug("error triggered by discarded transport");
      });
      this.transport.close();
      (0, timers_1.clearTimeout)(this.pingTimeoutTimer);
      this.pingTimeoutTimer = null;
    }
    onClose(reason, description) {
      if (this.readyState !== "closed") {
        this.readyState = "closed";
        (0, timers_1.clearTimeout)(this.pingIntervalTimer);
        (0, timers_1.clearTimeout)(this.pingTimeoutTimer);
        process.nextTick(() => {
          this.writeBuffer = [];
        });
        this.packetsFn = [];
        this.sentCallbackFn = [];
        this.clearTransport();
        this.emit("close", reason, description);
      }
    }
    send(data, options, callback) {
      this.sendPacket("message", data, options, callback);
      return this;
    }
    write(data, options, callback) {
      this.sendPacket("message", data, options, callback);
      return this;
    }
    sendPacket(type, data, options = {}, callback) {
      if (typeof options === "function") {
        callback = options;
        options = {};
      }
      if (this.readyState !== "closing" && this.readyState !== "closed") {
        debug('sending packet "%s" (%s)', type, data);
        options.compress = options.compress !== false;
        const packet = {
          type,
          options
        };
        if (data)
          packet.data = data;
        this.emit("packetCreate", packet);
        this.writeBuffer.push(packet);
        if (typeof callback === "function")
          this.packetsFn.push(callback);
        this.flush();
      }
    }
    flush() {
      if (this.readyState !== "closed" && this.transport.writable && this.writeBuffer.length) {
        debug("flushing buffer to transport");
        this.emit("flush", this.writeBuffer);
        this.server.emit("flush", this, this.writeBuffer);
        const wbuf = this.writeBuffer;
        this.writeBuffer = [];
        if (this.packetsFn.length) {
          this.sentCallbackFn.push(this.packetsFn);
          this.packetsFn = [];
        } else {
          this.sentCallbackFn.push(null);
        }
        this.transport.send(wbuf);
        this.emit("drain");
        this.server.emit("drain", this);
      }
    }
    getAvailableUpgrades() {
      const availableUpgrades = [];
      const allUpgrades = this.server.upgrades(this.transport.name);
      for (let i = 0;i < allUpgrades.length; ++i) {
        const upg = allUpgrades[i];
        if (this.server.opts.transports.indexOf(upg) !== -1) {
          availableUpgrades.push(upg);
        }
      }
      return availableUpgrades;
    }
    close(discard) {
      if (discard && (this.readyState === "open" || this.readyState === "closing")) {
        return this.closeTransport(discard);
      }
      if (this.readyState !== "open")
        return;
      this.readyState = "closing";
      if (this.writeBuffer.length) {
        debug("there are %d remaining packets in the buffer, waiting for the 'drain' event", this.writeBuffer.length);
        this.once("drain", () => {
          debug("all packets have been sent, closing the transport");
          this.closeTransport(discard);
        });
        return;
      }
      debug("the buffer is empty, closing the transport right away");
      this.closeTransport(discard);
    }
    closeTransport(discard) {
      debug("closing the transport (discard? %s)", !!discard);
      if (discard)
        this.transport.discard();
      this.transport.close(this.onClose.bind(this, "forced close"));
    }
  }
  exports.Socket = Socket;
});

// mini-services/ironsight-room/node_modules/cookie/index.js
var require_cookie = __commonJS((exports) => {
  /*!
   * cookie
   * Copyright(c) 2012-2014 Roman Shtylman
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   */
  exports.parse = parse;
  exports.serialize = serialize;
  var __toString = Object.prototype.toString;
  var __hasOwnProperty = Object.prototype.hasOwnProperty;
  var cookieNameRegExp = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
  var cookieValueRegExp = /^("?)[\u0021\u0023-\u002B\u002D-\u003A\u003C-\u005B\u005D-\u007E]*\1$/;
  var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
  var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
  function parse(str, opt) {
    if (typeof str !== "string") {
      throw new TypeError("argument str must be a string");
    }
    var obj = {};
    var len = str.length;
    if (len < 2)
      return obj;
    var dec = opt && opt.decode || decode;
    var index = 0;
    var eqIdx = 0;
    var endIdx = 0;
    do {
      eqIdx = str.indexOf("=", index);
      if (eqIdx === -1)
        break;
      endIdx = str.indexOf(";", index);
      if (endIdx === -1) {
        endIdx = len;
      } else if (eqIdx > endIdx) {
        index = str.lastIndexOf(";", eqIdx - 1) + 1;
        continue;
      }
      var keyStartIdx = startIndex(str, index, eqIdx);
      var keyEndIdx = endIndex(str, eqIdx, keyStartIdx);
      var key = str.slice(keyStartIdx, keyEndIdx);
      if (!__hasOwnProperty.call(obj, key)) {
        var valStartIdx = startIndex(str, eqIdx + 1, endIdx);
        var valEndIdx = endIndex(str, endIdx, valStartIdx);
        if (str.charCodeAt(valStartIdx) === 34 && str.charCodeAt(valEndIdx - 1) === 34) {
          valStartIdx++;
          valEndIdx--;
        }
        var val = str.slice(valStartIdx, valEndIdx);
        obj[key] = tryDecode(val, dec);
      }
      index = endIdx + 1;
    } while (index < len);
    return obj;
  }
  function startIndex(str, index, max) {
    do {
      var code = str.charCodeAt(index);
      if (code !== 32 && code !== 9)
        return index;
    } while (++index < max);
    return max;
  }
  function endIndex(str, index, min) {
    while (index > min) {
      var code = str.charCodeAt(--index);
      if (code !== 32 && code !== 9)
        return index + 1;
    }
    return min;
  }
  function serialize(name, val, opt) {
    var enc = opt && opt.encode || encodeURIComponent;
    if (typeof enc !== "function") {
      throw new TypeError("option encode is invalid");
    }
    if (!cookieNameRegExp.test(name)) {
      throw new TypeError("argument name is invalid");
    }
    var value = enc(val);
    if (!cookieValueRegExp.test(value)) {
      throw new TypeError("argument val is invalid");
    }
    var str = name + "=" + value;
    if (!opt)
      return str;
    if (opt.maxAge != null) {
      var maxAge = Math.floor(opt.maxAge);
      if (!isFinite(maxAge)) {
        throw new TypeError("option maxAge is invalid");
      }
      str += "; Max-Age=" + maxAge;
    }
    if (opt.domain) {
      if (!domainValueRegExp.test(opt.domain)) {
        throw new TypeError("option domain is invalid");
      }
      str += "; Domain=" + opt.domain;
    }
    if (opt.path) {
      if (!pathValueRegExp.test(opt.path)) {
        throw new TypeError("option path is invalid");
      }
      str += "; Path=" + opt.path;
    }
    if (opt.expires) {
      var expires = opt.expires;
      if (!isDate(expires) || isNaN(expires.valueOf())) {
        throw new TypeError("option expires is invalid");
      }
      str += "; Expires=" + expires.toUTCString();
    }
    if (opt.httpOnly) {
      str += "; HttpOnly";
    }
    if (opt.secure) {
      str += "; Secure";
    }
    if (opt.partitioned) {
      str += "; Partitioned";
    }
    if (opt.priority) {
      var priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
      switch (priority) {
        case "low":
          str += "; Priority=Low";
          break;
        case "medium":
          str += "; Priority=Medium";
          break;
        case "high":
          str += "; Priority=High";
          break;
        default:
          throw new TypeError("option priority is invalid");
      }
    }
    if (opt.sameSite) {
      var sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
      switch (sameSite) {
        case true:
          str += "; SameSite=Strict";
          break;
        case "lax":
          str += "; SameSite=Lax";
          break;
        case "strict":
          str += "; SameSite=Strict";
          break;
        case "none":
          str += "; SameSite=None";
          break;
        default:
          throw new TypeError("option sameSite is invalid");
      }
    }
    return str;
  }
  function decode(str) {
    return str.indexOf("%") !== -1 ? decodeURIComponent(str) : str;
  }
  function isDate(val) {
    return __toString.call(val) === "[object Date]";
  }
  function tryDecode(str, decode2) {
    try {
      return decode2(str);
    } catch (e) {
      return str;
    }
  }
});

// mini-services/ironsight-room/node_modules/engine.io/build/utils/objectFromEntries.js
var require_objectFromEntries = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.objectFromEntries = undefined;
  exports.objectFromEntries = Object.fromEntries || function fromEntries(entries) {
    const obj = {};
    for (const [key, value] of entries) {
      obj[key] = value;
    }
    return obj;
  };
});

// mini-services/ironsight-room/node_modules/object-assign/index.js
var require_object_assign = __commonJS((exports, module) => {
  var getOwnPropertySymbols = Object.getOwnPropertySymbols;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var propIsEnumerable = Object.prototype.propertyIsEnumerable;
  function toObject(val) {
    if (val === null || val === undefined) {
      throw new TypeError("Object.assign cannot be called with null or undefined");
    }
    return Object(val);
  }
  function shouldUseNative() {
    try {
      if (!Object.assign) {
        return false;
      }
      var test1 = new String("abc");
      test1[5] = "de";
      if (Object.getOwnPropertyNames(test1)[0] === "5") {
        return false;
      }
      var test2 = {};
      for (var i = 0;i < 10; i++) {
        test2["_" + String.fromCharCode(i)] = i;
      }
      var order2 = Object.getOwnPropertyNames(test2).map(function(n) {
        return test2[n];
      });
      if (order2.join("") !== "0123456789") {
        return false;
      }
      var test3 = {};
      "abcdefghijklmnopqrst".split("").forEach(function(letter) {
        test3[letter] = letter;
      });
      if (Object.keys(Object.assign({}, test3)).join("") !== "abcdefghijklmnopqrst") {
        return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  }
  module.exports = shouldUseNative() ? Object.assign : function(target, source) {
    var from;
    var to = toObject(target);
    var symbols;
    for (var s = 1;s < arguments.length; s++) {
      from = Object(arguments[s]);
      for (var key in from) {
        if (hasOwnProperty.call(from, key)) {
          to[key] = from[key];
        }
      }
      if (getOwnPropertySymbols) {
        symbols = getOwnPropertySymbols(from);
        for (var i = 0;i < symbols.length; i++) {
          if (propIsEnumerable.call(from, symbols[i])) {
            to[symbols[i]] = from[symbols[i]];
          }
        }
      }
    }
    return to;
  };
});

// mini-services/ironsight-room/node_modules/vary/index.js
var require_vary = __commonJS((exports, module) => {
  /*!
   * vary
   * Copyright(c) 2014-2017 Douglas Christopher Wilson
   * MIT Licensed
   */
  module.exports = vary;
  module.exports.append = append;
  var FIELD_NAME_REGEXP = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
  function append(header, field) {
    if (typeof header !== "string") {
      throw new TypeError("header argument is required");
    }
    if (!field) {
      throw new TypeError("field argument is required");
    }
    var fields = !Array.isArray(field) ? parse(String(field)) : field;
    for (var j = 0;j < fields.length; j++) {
      if (!FIELD_NAME_REGEXP.test(fields[j])) {
        throw new TypeError("field argument contains an invalid header name");
      }
    }
    if (header === "*") {
      return header;
    }
    var val = header;
    var vals = parse(header.toLowerCase());
    if (fields.indexOf("*") !== -1 || vals.indexOf("*") !== -1) {
      return "*";
    }
    for (var i = 0;i < fields.length; i++) {
      var fld = fields[i].toLowerCase();
      if (vals.indexOf(fld) === -1) {
        vals.push(fld);
        val = val ? val + ", " + fields[i] : fields[i];
      }
    }
    return val;
  }
  function parse(header) {
    var end = 0;
    var list = [];
    var start = 0;
    for (var i = 0, len = header.length;i < len; i++) {
      switch (header.charCodeAt(i)) {
        case 32:
          if (start === end) {
            start = end = i + 1;
          }
          break;
        case 44:
          list.push(header.substring(start, end));
          start = end = i + 1;
          break;
        default:
          end = i + 1;
          break;
      }
    }
    list.push(header.substring(start, end));
    return list;
  }
  function vary(res, field) {
    if (!res || !res.getHeader || !res.setHeader) {
      throw new TypeError("res argument is required");
    }
    var val = res.getHeader("Vary") || "";
    var header = Array.isArray(val) ? val.join(", ") : String(val);
    if (val = append(header, field)) {
      res.setHeader("Vary", val);
    }
  }
});

// mini-services/ironsight-room/node_modules/cors/lib/index.js
var require_lib = __commonJS((exports, module) => {
  (function() {
    var assign = require_object_assign();
    var vary = require_vary();
    var defaults = {
      origin: "*",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
      preflightContinue: false,
      optionsSuccessStatus: 204
    };
    function isString(s) {
      return typeof s === "string" || s instanceof String;
    }
    function isOriginAllowed(origin, allowedOrigin) {
      if (Array.isArray(allowedOrigin)) {
        for (var i = 0;i < allowedOrigin.length; ++i) {
          if (isOriginAllowed(origin, allowedOrigin[i])) {
            return true;
          }
        }
        return false;
      } else if (isString(allowedOrigin)) {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      } else {
        return !!allowedOrigin;
      }
    }
    function configureOrigin(options, req) {
      var requestOrigin = req.headers.origin, headers = [], isAllowed;
      if (!options.origin || options.origin === "*") {
        headers.push([{
          key: "Access-Control-Allow-Origin",
          value: "*"
        }]);
      } else if (isString(options.origin)) {
        headers.push([{
          key: "Access-Control-Allow-Origin",
          value: options.origin
        }]);
        headers.push([{
          key: "Vary",
          value: "Origin"
        }]);
      } else {
        isAllowed = isOriginAllowed(requestOrigin, options.origin);
        headers.push([{
          key: "Access-Control-Allow-Origin",
          value: isAllowed ? requestOrigin : false
        }]);
        headers.push([{
          key: "Vary",
          value: "Origin"
        }]);
      }
      return headers;
    }
    function configureMethods(options) {
      var methods = options.methods;
      if (methods.join) {
        methods = options.methods.join(",");
      }
      return {
        key: "Access-Control-Allow-Methods",
        value: methods
      };
    }
    function configureCredentials(options) {
      if (options.credentials === true) {
        return {
          key: "Access-Control-Allow-Credentials",
          value: "true"
        };
      }
      return null;
    }
    function configureAllowedHeaders(options, req) {
      var allowedHeaders = options.allowedHeaders || options.headers;
      var headers = [];
      if (!allowedHeaders) {
        allowedHeaders = req.headers["access-control-request-headers"];
        headers.push([{
          key: "Vary",
          value: "Access-Control-Request-Headers"
        }]);
      } else if (allowedHeaders.join) {
        allowedHeaders = allowedHeaders.join(",");
      }
      if (allowedHeaders && allowedHeaders.length) {
        headers.push([{
          key: "Access-Control-Allow-Headers",
          value: allowedHeaders
        }]);
      }
      return headers;
    }
    function configureExposedHeaders(options) {
      var headers = options.exposedHeaders;
      if (!headers) {
        return null;
      } else if (headers.join) {
        headers = headers.join(",");
      }
      if (headers && headers.length) {
        return {
          key: "Access-Control-Expose-Headers",
          value: headers
        };
      }
      return null;
    }
    function configureMaxAge(options) {
      var maxAge = (typeof options.maxAge === "number" || options.maxAge) && options.maxAge.toString();
      if (maxAge && maxAge.length) {
        return {
          key: "Access-Control-Max-Age",
          value: maxAge
        };
      }
      return null;
    }
    function applyHeaders(headers, res) {
      for (var i = 0, n = headers.length;i < n; i++) {
        var header = headers[i];
        if (header) {
          if (Array.isArray(header)) {
            applyHeaders(header, res);
          } else if (header.key === "Vary" && header.value) {
            vary(res, header.value);
          } else if (header.value) {
            res.setHeader(header.key, header.value);
          }
        }
      }
    }
    function cors(options, req, res, next) {
      var headers = [], method = req.method && req.method.toUpperCase && req.method.toUpperCase();
      if (method === "OPTIONS") {
        headers.push(configureOrigin(options, req));
        headers.push(configureCredentials(options));
        headers.push(configureMethods(options));
        headers.push(configureAllowedHeaders(options, req));
        headers.push(configureMaxAge(options));
        headers.push(configureExposedHeaders(options));
        applyHeaders(headers, res);
        if (options.preflightContinue) {
          next();
        } else {
          res.statusCode = options.optionsSuccessStatus;
          res.setHeader("Content-Length", "0");
          res.end();
        }
      } else {
        headers.push(configureOrigin(options, req));
        headers.push(configureCredentials(options));
        headers.push(configureExposedHeaders(options));
        applyHeaders(headers, res);
        next();
      }
    }
    function middlewareWrapper(o) {
      var optionsCallback = null;
      if (typeof o === "function") {
        optionsCallback = o;
      } else {
        optionsCallback = function(req, cb) {
          cb(null, o);
        };
      }
      return function corsMiddleware(req, res, next) {
        optionsCallback(req, function(err, options) {
          if (err) {
            next(err);
          } else {
            var corsOptions = assign({}, defaults, options);
            var originCallback = null;
            if (corsOptions.origin && typeof corsOptions.origin === "function") {
              originCallback = corsOptions.origin;
            } else if (corsOptions.origin) {
              originCallback = function(origin, cb) {
                cb(null, corsOptions.origin);
              };
            }
            if (originCallback) {
              originCallback(req.headers.origin, function(err2, origin) {
                if (err2 || !origin) {
                  next(err2);
                } else {
                  corsOptions.origin = origin;
                  cors(corsOptions, req, res, next);
                }
              });
            } else {
              next();
            }
          }
        });
      };
    }
    module.exports = middlewareWrapper;
  })();
});

// mini-services/ironsight-room/node_modules/engine.io/build/server.js
var require_server = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Server = exports.BaseServer = undefined;
  var base64id_1 = require_base64id();
  var transports_1 = __importDefault(require_transports());
  var events_1 = __require("events");
  var socket_1 = require_socket();
  var debug_1 = __importDefault(require_src());
  var cookie_1 = require_cookie();
  var ws_1 = __require("ws");
  var webtransport_1 = require_webtransport();
  var engine_io_parser_1 = require_cjs();
  var objectFromEntries_1 = require_objectFromEntries();
  var debug = (0, debug_1.default)("engine");
  var kResponseHeaders = Symbol("responseHeaders");
  function parseSessionId(data) {
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed.sid === "string") {
        return parsed.sid;
      }
    } catch (e) {}
  }
  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }
  function computeProtocolRevision(req) {
    return req._query.EIO === "4" ? 4 : 3;
  }

  class BaseServer extends events_1.EventEmitter {
    constructor(opts = {}) {
      super();
      this.middlewares = [];
      this.clients = {};
      this.clientsCount = 0;
      this.opts = Object.assign({
        wsEngine: ws_1.Server,
        pingTimeout: 20000,
        pingInterval: 25000,
        upgradeTimeout: 1e4,
        maxHttpBufferSize: 1e6,
        transports: ["polling", "websocket"],
        allowUpgrades: true,
        httpCompression: {
          threshold: 1024
        },
        cors: false,
        allowEIO3: false
      }, opts);
      if (opts.cookie) {
        this.opts.cookie = Object.assign({
          name: "io",
          path: "/",
          httpOnly: true,
          sameSite: "lax"
        }, opts.cookie);
      }
      if (this.opts.cors) {
        this.use(require_lib()(this.opts.cors));
      }
      if (opts.perMessageDeflate) {
        this.opts.perMessageDeflate = Object.assign({
          threshold: 1024
        }, opts.perMessageDeflate);
      }
      this.init();
    }
    _computePath(options) {
      let path = (options.path || "/engine.io").replace(/\/$/, "");
      if (options.addTrailingSlash !== false) {
        path += "/";
      }
      return path;
    }
    upgrades(transport) {
      if (!this.opts.allowUpgrades)
        return [];
      return transports_1.default[transport].upgradesTo || [];
    }
    verify(req, upgrade, fn) {
      const transport = req._query.transport;
      if (!~this.opts.transports.indexOf(transport) || transport === "webtransport") {
        debug('unknown transport "%s"', transport);
        return fn(Server.errors.UNKNOWN_TRANSPORT, { transport });
      }
      const isOriginInvalid = checkInvalidHeaderChar(req.headers.origin);
      if (isOriginInvalid) {
        const origin = req.headers.origin;
        req.headers.origin = null;
        debug("origin header invalid");
        return fn(Server.errors.BAD_REQUEST, {
          name: "INVALID_ORIGIN",
          origin
        });
      }
      const sid = req._query.sid;
      if (sid) {
        if (!hasOwn(this.clients, sid)) {
          debug('unknown sid "%s"', sid);
          return fn(Server.errors.UNKNOWN_SID, {
            sid
          });
        }
        const client = this.clients[sid];
        const previousTransport = client.transport.name;
        if (!upgrade && previousTransport !== transport) {
          debug("bad request: unexpected transport without upgrade");
          return fn(Server.errors.BAD_REQUEST, {
            name: "TRANSPORT_MISMATCH",
            transport,
            previousTransport
          });
        }
        const protocol = computeProtocolRevision(req);
        if (client.protocol !== protocol) {
          debug("bad request: unexpected protocol version during upgrade");
          return fn(Server.errors.BAD_REQUEST, {
            name: "PROTOCOL_MISMATCH",
            protocol,
            previousProtocol: client.protocol
          });
        }
      } else {
        if (req.method !== "GET") {
          return fn(Server.errors.BAD_HANDSHAKE_METHOD, {
            method: req.method
          });
        }
        if (transport === "websocket" && !upgrade) {
          debug("invalid transport upgrade");
          return fn(Server.errors.BAD_REQUEST, {
            name: "TRANSPORT_HANDSHAKE_ERROR"
          });
        }
        if (!this.opts.allowRequest)
          return fn();
        return this.opts.allowRequest(req, (message, success) => {
          if (!success) {
            return fn(Server.errors.FORBIDDEN, {
              message
            });
          }
          fn();
        });
      }
      fn();
    }
    use(fn) {
      this.middlewares.push(fn);
    }
    _applyMiddlewares(req, res, callback) {
      if (this.middlewares.length === 0) {
        debug("no middleware to apply, skipping");
        return callback();
      }
      const apply = (i) => {
        debug("applying middleware n\xB0%d", i + 1);
        this.middlewares[i](req, res, (err) => {
          if (err) {
            return callback(err);
          }
          if (i + 1 < this.middlewares.length) {
            apply(i + 1);
          } else {
            callback();
          }
        });
      };
      apply(0);
    }
    close() {
      debug("closing all open clients");
      for (const sid in this.clients) {
        if (hasOwn(this.clients, sid)) {
          this.clients[sid].close(true);
        }
      }
      this.cleanup();
      return this;
    }
    generateId(req) {
      return base64id_1.base64id.generateId();
    }
    async handshake(transportName, req, closeConnection) {
      const protocol = computeProtocolRevision(req);
      if (protocol === 3 && !this.opts.allowEIO3) {
        debug("unsupported protocol version");
        this.emit("connection_error", {
          req,
          code: Server.errors.UNSUPPORTED_PROTOCOL_VERSION,
          message: Server.errorMessages[Server.errors.UNSUPPORTED_PROTOCOL_VERSION],
          context: {
            protocol
          }
        });
        closeConnection(Server.errors.UNSUPPORTED_PROTOCOL_VERSION);
        return;
      }
      let id;
      try {
        id = await this.generateId(req);
      } catch (e) {
        debug("error while generating an id");
        this.emit("connection_error", {
          req,
          code: Server.errors.BAD_REQUEST,
          message: Server.errorMessages[Server.errors.BAD_REQUEST],
          context: {
            name: "ID_GENERATION_ERROR",
            error: e
          }
        });
        closeConnection(Server.errors.BAD_REQUEST);
        return;
      }
      debug('handshaking client "%s"', id);
      try {
        var transport = this.createTransport(transportName, req);
        if (transportName === "polling") {
          transport.maxHttpBufferSize = this.opts.maxHttpBufferSize;
          transport.httpCompression = this.opts.httpCompression;
        } else if (transportName === "websocket") {
          transport.perMessageDeflate = this.opts.perMessageDeflate;
        }
      } catch (e) {
        debug('error handshaking to transport "%s"', transportName);
        this.emit("connection_error", {
          req,
          code: Server.errors.BAD_REQUEST,
          message: Server.errorMessages[Server.errors.BAD_REQUEST],
          context: {
            name: "TRANSPORT_HANDSHAKE_ERROR",
            error: e
          }
        });
        closeConnection(Server.errors.BAD_REQUEST);
        return;
      }
      const socket = new socket_1.Socket(id, this, transport, req, protocol);
      transport.on("headers", (headers, req2) => {
        const isInitialRequest = !req2._query.sid;
        if (isInitialRequest) {
          if (this.opts.cookie) {
            headers["Set-Cookie"] = [
              (0, cookie_1.serialize)(this.opts.cookie.name, id, this.opts.cookie)
            ];
          }
          this.emit("initial_headers", headers, req2);
        }
        this.emit("headers", headers, req2);
      });
      transport.onRequest(req);
      this.clients[id] = socket;
      this.clientsCount++;
      socket.once("close", () => {
        delete this.clients[id];
        this.clientsCount--;
      });
      this.emit("connection", socket);
      return transport;
    }
    async onWebTransportSession(session) {
      if (this.middlewares.length > 0) {
        debug("closing session since WebTransport is not compatible with middlewares");
        return session.close();
      }
      const timeout = setTimeout(() => {
        debug("the client failed to establish a bidirectional stream in the given period");
        session.close();
      }, this.opts.upgradeTimeout);
      const streamReader = session.incomingBidirectionalStreams.getReader();
      const result = await streamReader.read();
      if (result.done) {
        clearTimeout(timeout);
        debug("session is closed");
        return;
      }
      const stream = result.value;
      const transformStream = (0, engine_io_parser_1.createPacketDecoderStream)(this.opts.maxHttpBufferSize, "nodebuffer");
      const reader = stream.readable.pipeThrough(transformStream).getReader();
      const closeSession = async () => {
        try {
          await reader.cancel();
        } catch (e) {
          debug("error while canceling WebTransport stream reader: %s", e.message);
        }
        reader.releaseLock();
        session.close();
      };
      const { value, done } = await reader.read();
      clearTimeout(timeout);
      if (done) {
        debug("stream is closed");
        reader.releaseLock();
        return;
      }
      if (value.type !== "open") {
        debug("invalid WebTransport handshake");
        return closeSession();
      }
      if (value.data === undefined) {
        const transport = new webtransport_1.WebTransport(session, stream, reader);
        const id = base64id_1.base64id.generateId();
        debug('handshaking client "%s" (WebTransport)', id);
        const socket = new socket_1.Socket(id, this, transport, null, 4);
        this.clients[id] = socket;
        this.clientsCount++;
        socket.once("close", () => {
          delete this.clients[id];
          this.clientsCount--;
        });
        this.emit("connection", socket);
        return;
      }
      const sid = parseSessionId(value.data);
      if (!sid || !hasOwn(this.clients, sid)) {
        debug("invalid WebTransport handshake");
        return closeSession();
      }
      const client = this.clients[sid];
      if (!client) {
        debug("upgrade attempt for closed client");
        return closeSession();
      } else if (client.upgrading) {
        debug("transport has already been trying to upgrade");
        return closeSession();
      } else if (client.upgraded) {
        debug("transport had already been upgraded");
        return closeSession();
      } else {
        debug("upgrading existing transport");
        const transport = new webtransport_1.WebTransport(session, stream, reader);
        client._maybeUpgrade(transport);
      }
    }
  }
  exports.BaseServer = BaseServer;
  BaseServer.errors = {
    UNKNOWN_TRANSPORT: 0,
    UNKNOWN_SID: 1,
    BAD_HANDSHAKE_METHOD: 2,
    BAD_REQUEST: 3,
    FORBIDDEN: 4,
    UNSUPPORTED_PROTOCOL_VERSION: 5
  };
  BaseServer.errorMessages = {
    0: "Transport unknown",
    1: "Session ID unknown",
    2: "Bad handshake method",
    3: "Bad request",
    4: "Forbidden",
    5: "Unsupported protocol version"
  };

  class WebSocketResponse {
    constructor(req, socket) {
      this.req = req;
      this.socket = socket;
      req[kResponseHeaders] = {};
    }
    setHeader(name, value) {
      this.req[kResponseHeaders][name] = value;
    }
    getHeader(name) {
      return this.req[kResponseHeaders][name];
    }
    removeHeader(name) {
      delete this.req[kResponseHeaders][name];
    }
    write() {}
    writeHead() {}
    end() {
      this.socket.destroy();
    }
  }

  class Server extends BaseServer {
    init() {
      if (!~this.opts.transports.indexOf("websocket"))
        return;
      if (this.ws)
        this.ws.close();
      this.ws = new this.opts.wsEngine({
        noServer: true,
        clientTracking: false,
        perMessageDeflate: this.opts.perMessageDeflate,
        maxPayload: this.opts.maxHttpBufferSize
      });
      if (typeof this.ws.on === "function") {
        this.ws.on("headers", (headersArray, req) => {
          const additionalHeaders = req[kResponseHeaders] || {};
          delete req[kResponseHeaders];
          const isInitialRequest = !req._query.sid;
          if (isInitialRequest) {
            this.emit("initial_headers", additionalHeaders, req);
          }
          this.emit("headers", additionalHeaders, req);
          debug("writing headers: %j", additionalHeaders);
          Object.keys(additionalHeaders).forEach((key) => {
            headersArray.push(`${key}: ${additionalHeaders[key]}`);
          });
        });
      }
    }
    cleanup() {
      if (this.ws) {
        debug("closing webSocketServer");
        this.ws.close();
      }
    }
    prepare(req) {
      if (!req._query) {
        const url = new URL(req.url, "https://socket.io");
        req._query = (0, objectFromEntries_1.objectFromEntries)(url.searchParams.entries());
      }
    }
    createTransport(transportName, req) {
      return new transports_1.default[transportName](req);
    }
    handleRequest(req, res) {
      debug('handling "%s" http request "%s"', req.method, req.url);
      const engineRequest = req;
      this.prepare(engineRequest);
      engineRequest.res = res;
      const callback = (errorCode, errorContext) => {
        if (errorCode !== undefined) {
          this.emit("connection_error", {
            req: engineRequest,
            code: errorCode,
            message: Server.errorMessages[errorCode],
            context: errorContext
          });
          abortRequest(res, errorCode, errorContext);
          return;
        }
        if (engineRequest._query.sid) {
          debug("setting new request for existing client");
          this.clients[engineRequest._query.sid].transport.onRequest(engineRequest);
        } else {
          const closeConnection = (errorCode2, errorContext2) => abortRequest(res, errorCode2, errorContext2);
          this.handshake(engineRequest._query.transport, engineRequest, closeConnection);
        }
      };
      this._applyMiddlewares(engineRequest, res, (err) => {
        if (err) {
          callback(Server.errors.BAD_REQUEST, { name: "MIDDLEWARE_FAILURE" });
        } else {
          this.verify(engineRequest, false, callback);
        }
      });
    }
    handleUpgrade(req, socket, upgradeHead) {
      const engineRequest = req;
      this.prepare(engineRequest);
      const res = new WebSocketResponse(engineRequest, socket);
      const callback = (errorCode, errorContext) => {
        if (errorCode !== undefined) {
          this.emit("connection_error", {
            req: engineRequest,
            code: errorCode,
            message: Server.errorMessages[errorCode],
            context: errorContext
          });
          abortUpgrade(socket, errorCode, errorContext);
          return;
        }
        const head = Buffer.from(upgradeHead);
        upgradeHead = null;
        res.writeHead();
        this.ws.handleUpgrade(engineRequest, socket, head, (websocket) => {
          this.onWebSocket(engineRequest, socket, websocket);
        });
      };
      this._applyMiddlewares(engineRequest, res, (err) => {
        if (err) {
          callback(Server.errors.BAD_REQUEST, { name: "MIDDLEWARE_FAILURE" });
        } else {
          this.verify(engineRequest, true, callback);
        }
      });
    }
    onWebSocket(req, socket, websocket) {
      websocket.on("error", onUpgradeError);
      if (transports_1.default[req._query.transport] !== undefined && !transports_1.default[req._query.transport].prototype.handlesUpgrades) {
        debug("transport doesnt handle upgraded requests");
        websocket.close();
        return;
      }
      const id = req._query.sid;
      req.websocket = websocket;
      if (id) {
        const client = this.clients[id];
        if (!client) {
          debug("upgrade attempt for closed client");
          websocket.close();
        } else if (client.upgrading) {
          debug("transport has already been trying to upgrade");
          websocket.close();
        } else if (client.upgraded) {
          debug("transport had already been upgraded");
          websocket.close();
        } else {
          debug("upgrading existing transport");
          websocket.removeListener("error", onUpgradeError);
          const transport = this.createTransport(req._query.transport, req);
          transport.perMessageDeflate = this.opts.perMessageDeflate;
          client._maybeUpgrade(transport);
        }
      } else {
        const closeConnection = (errorCode, errorContext) => abortUpgrade(socket, errorCode, errorContext);
        this.handshake(req._query.transport, req, closeConnection);
      }
      function onUpgradeError() {
        debug("websocket error before upgrade");
      }
    }
    attach(server, options = {}) {
      const path = this._computePath(options);
      const destroyUpgradeTimeout = options.destroyUpgradeTimeout || 1000;
      function check(req) {
        return path === req.url.slice(0, path.length);
      }
      const listeners = server.listeners("request").slice(0);
      server.removeAllListeners("request");
      server.on("close", this.close.bind(this));
      server.on("listening", this.init.bind(this));
      server.on("request", (req, res) => {
        if (check(req)) {
          debug('intercepting request for path "%s"', path);
          this.handleRequest(req, res);
        } else {
          let i = 0;
          const l = listeners.length;
          for (;i < l; i++) {
            listeners[i].call(server, req, res);
          }
        }
      });
      if (~this.opts.transports.indexOf("websocket")) {
        server.on("upgrade", (req, socket, head) => {
          if (check(req)) {
            this.handleUpgrade(req, socket, head);
          } else if (options.destroyUpgrade !== false) {
            setTimeout(function() {
              if (socket.writable && socket.bytesWritten <= 0) {
                socket.on("error", (e) => {
                  debug("error while destroying upgrade: %s", e.message);
                });
                return socket.end();
              }
            }, destroyUpgradeTimeout);
          }
        });
      }
    }
  }
  exports.Server = Server;
  function abortRequest(res, errorCode, errorContext) {
    const statusCode = errorCode === Server.errors.FORBIDDEN ? 403 : 400;
    const message = errorContext && errorContext.message ? errorContext.message : Server.errorMessages[errorCode];
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      code: errorCode,
      message
    }));
  }
  function abortUpgrade(socket, errorCode, errorContext = {}) {
    socket.on("error", () => {
      debug("ignoring error from closed connection");
    });
    if (socket.writable) {
      const message = errorContext.message || Server.errorMessages[errorCode];
      const length = Buffer.byteLength(message);
      socket.write(`HTTP/1.1 400 Bad Request\r
` + `Connection: close\r
` + `Content-type: text/html\r
` + "Content-Length: " + length + `\r
` + `\r
` + message);
    }
    socket.destroy();
  }
  var validHdrChars = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1
  ];
  function checkInvalidHeaderChar(val) {
    val += "";
    if (val.length < 1)
      return false;
    if (!validHdrChars[val.charCodeAt(0)]) {
      debug('invalid header, index 0, char "%s"', val.charCodeAt(0));
      return true;
    }
    if (val.length < 2)
      return false;
    if (!validHdrChars[val.charCodeAt(1)]) {
      debug('invalid header, index 1, char "%s"', val.charCodeAt(1));
      return true;
    }
    if (val.length < 3)
      return false;
    if (!validHdrChars[val.charCodeAt(2)]) {
      debug('invalid header, index 2, char "%s"', val.charCodeAt(2));
      return true;
    }
    if (val.length < 4)
      return false;
    if (!validHdrChars[val.charCodeAt(3)]) {
      debug('invalid header, index 3, char "%s"', val.charCodeAt(3));
      return true;
    }
    for (let i = 4;i < val.length; ++i) {
      if (!validHdrChars[val.charCodeAt(i)]) {
        debug('invalid header, index "%i", char "%s"', i, val.charCodeAt(i));
        return true;
      }
    }
    return false;
  }
});

// mini-services/ironsight-room/node_modules/engine.io/build/transports-uws/polling.js
var require_polling2 = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Polling = undefined;
  var transport_1 = require_transport();
  var zlib_1 = __require("zlib");
  var accepts = require_accepts();
  var debug_1 = __importDefault(require_src());
  var debug = (0, debug_1.default)("engine:polling");
  var compressionMethods = {
    gzip: zlib_1.createGzip,
    deflate: zlib_1.createDeflate
  };

  class Polling extends transport_1.Transport {
    constructor(req) {
      super(req);
      this.closeTimeout = 30 * 1000;
    }
    get name() {
      return "polling";
    }
    onRequest(req) {
      const res = req.res;
      req.res = null;
      if (req.getMethod() === "get") {
        this.onPollRequest(req, res);
      } else if (req.getMethod() === "post") {
        this.onDataRequest(req, res);
      } else {
        res.writeStatus("500 Internal Server Error");
        res.end();
      }
    }
    onPollRequest(req, res) {
      if (this.req) {
        debug("request overlap");
        this.onError("overlap from client");
        res.writeStatus("500 Internal Server Error");
        res.end();
        return;
      }
      debug("setting request");
      this.req = req;
      this.res = res;
      const onClose = () => {
        this.writable = false;
        this.onError("poll connection closed prematurely");
      };
      const cleanup = () => {
        this.req = this.res = null;
      };
      req.cleanup = cleanup;
      res.onAborted(onClose);
      this.writable = true;
      this.emit("ready");
      if (this.writable && this.shouldClose) {
        debug("triggering empty send to append close packet");
        this.send([{ type: "noop" }]);
      }
    }
    onDataRequest(req, res) {
      if (this.dataReq) {
        this.onError("data request overlap from client");
        res.writeStatus("500 Internal Server Error");
        res.end();
        return;
      }
      const expectedContentLength = Number(req.headers["content-length"]);
      if (!expectedContentLength) {
        this.onError("content-length header required");
        res.writeStatus("411 Length Required").end();
        return;
      }
      if (expectedContentLength > this.maxHttpBufferSize) {
        this.onError("payload too large");
        res.writeStatus("413 Payload Too Large").end();
        return;
      }
      const isBinary = req.headers["content-type"] === "application/octet-stream";
      if (isBinary && this.protocol === 4) {
        this.onError("invalid content");
        return res.writeStatus("400 Bad Request").end();
      }
      this.dataReq = req;
      this.dataRes = res;
      let buffer;
      let offset = 0;
      const headers = {
        "Content-Type": "text/html"
      };
      this.headers(req, headers);
      for (let key in headers) {
        res.writeHeader(key, String(headers[key]));
      }
      const onEnd = (buffer2) => {
        this.onData(buffer2.toString());
        this.onDataRequestCleanup();
        res.cork(() => {
          res.end("ok");
        });
      };
      res.onAborted(() => {
        this.onDataRequestCleanup();
        this.onError("data request connection closed prematurely");
      });
      res.onData((arrayBuffer, isLast) => {
        const totalLength = offset + arrayBuffer.byteLength;
        if (totalLength > expectedContentLength) {
          this.onError("content-length mismatch");
          res.close();
          return;
        }
        if (!buffer) {
          if (isLast) {
            onEnd(Buffer.from(arrayBuffer));
            return;
          }
          buffer = Buffer.allocUnsafe(expectedContentLength);
        }
        Buffer.from(arrayBuffer).copy(buffer, offset);
        if (isLast) {
          if (totalLength != expectedContentLength) {
            this.onError("content-length mismatch");
            res.writeStatus("400 Content-Length Mismatch").end();
            this.onDataRequestCleanup();
            return;
          }
          onEnd(buffer);
          return;
        }
        offset = totalLength;
      });
    }
    onDataRequestCleanup() {
      this.dataReq = this.dataRes = null;
    }
    onData(data) {
      debug('received "%s"', data);
      const callback = (packet) => {
        if (packet.type === "close") {
          debug("got xhr close packet");
          this.onClose();
          return false;
        }
        this.onPacket(packet);
      };
      if (this.protocol === 3) {
        this.parser.decodePayload(data, callback);
      } else {
        this.parser.decodePayload(data).forEach(callback);
      }
    }
    onClose() {
      if (this.writable) {
        this.send([{ type: "noop" }]);
      }
      super.onClose();
    }
    send(packets) {
      this.writable = false;
      if (this.shouldClose) {
        debug("appending close packet to payload");
        packets.push({ type: "close" });
        this.shouldClose();
        this.shouldClose = null;
      }
      const doWrite = (data) => {
        const compress = packets.some((packet) => {
          return packet.options && packet.options.compress;
        });
        this.write(data, { compress });
      };
      if (this.protocol === 3) {
        this.parser.encodePayload(packets, this.supportsBinary, doWrite);
      } else {
        this.parser.encodePayload(packets, doWrite);
      }
    }
    write(data, options) {
      debug('writing "%s"', data);
      this.doWrite(data, options, () => {
        this.req.cleanup();
        this.emit("drain");
      });
    }
    doWrite(data, options, callback) {
      const isString = typeof data === "string";
      const contentType = isString ? "text/plain; charset=UTF-8" : "application/octet-stream";
      const headers = {
        "Content-Type": contentType
      };
      const respond = (data2) => {
        this.headers(this.req, headers);
        this.res.cork(() => {
          Object.keys(headers).forEach((key) => {
            this.res.writeHeader(key, String(headers[key]));
          });
          this.res.end(data2);
        });
        callback();
      };
      if (!this.httpCompression || !options.compress) {
        respond(data);
        return;
      }
      const len = isString ? Buffer.byteLength(data) : data.length;
      if (len < this.httpCompression.threshold) {
        respond(data);
        return;
      }
      const encoding = accepts(this.req).encodings(["gzip", "deflate"]);
      if (!encoding) {
        respond(data);
        return;
      }
      this.compress(data, encoding, (err, data2) => {
        if (err) {
          this.res.writeStatus("500 Internal Server Error");
          this.res.end();
          callback(err);
          return;
        }
        headers["Content-Encoding"] = encoding;
        respond(data2);
      });
    }
    compress(data, encoding, callback) {
      debug("compressing");
      const buffers = [];
      let nread = 0;
      compressionMethods[encoding](this.httpCompression).on("error", callback).on("data", function(chunk) {
        buffers.push(chunk);
        nread += chunk.length;
      }).on("end", function() {
        callback(null, Buffer.concat(buffers, nread));
      }).end(data);
    }
    doClose(fn) {
      debug("closing");
      let closeTimeoutTimer;
      const onClose = () => {
        clearTimeout(closeTimeoutTimer);
        fn();
        this.onClose();
      };
      if (this.writable) {
        debug("transport writable - closing right away");
        this.send([{ type: "close" }]);
        onClose();
      } else if (this.discarded) {
        debug("transport discarded - closing right away");
        onClose();
      } else {
        debug("transport not writable - buffering orderly close");
        this.shouldClose = onClose;
        closeTimeoutTimer = setTimeout(onClose, this.closeTimeout);
      }
    }
    headers(req, headers) {
      headers = headers || {};
      const ua = req.headers["user-agent"];
      if (ua && (~ua.indexOf(";MSIE") || ~ua.indexOf("Trident/"))) {
        headers["X-XSS-Protection"] = "0";
      }
      headers["cache-control"] = "no-store";
      this.emit("headers", headers, req);
      return headers;
    }
  }
  exports.Polling = Polling;
});

// mini-services/ironsight-room/node_modules/engine.io/build/transports-uws/websocket.js
var require_websocket2 = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.WebSocket = undefined;
  var transport_1 = require_transport();
  var debug_1 = __importDefault(require_src());
  var debug = (0, debug_1.default)("engine:ws");

  class WebSocket extends transport_1.Transport {
    constructor(req) {
      super(req);
      this.writable = false;
      this.perMessageDeflate = null;
    }
    get name() {
      return "websocket";
    }
    get handlesUpgrades() {
      return true;
    }
    send(packets) {
      this.writable = false;
      for (let i = 0;i < packets.length; i++) {
        const packet = packets[i];
        const isLast = i + 1 === packets.length;
        const send = (data) => {
          const isBinary = typeof data !== "string";
          const compress = this.perMessageDeflate && Buffer.byteLength(data) > this.perMessageDeflate.threshold;
          debug('writing "%s"', data);
          this.socket.send(data, isBinary, compress);
          if (isLast) {
            this.emit("drain");
            this.writable = true;
            this.emit("ready");
          }
        };
        if (packet.options && typeof packet.options.wsPreEncoded === "string") {
          send(packet.options.wsPreEncoded);
        } else {
          this.parser.encodePacket(packet, this.supportsBinary, send);
        }
      }
    }
    doClose(fn) {
      debug("closing");
      fn && fn();
      this.socket.end();
    }
  }
  exports.WebSocket = WebSocket;
});

// mini-services/ironsight-room/node_modules/engine.io/build/transports-uws/index.js
var require_transports_uws = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var polling_1 = require_polling2();
  var websocket_1 = require_websocket2();
  exports.default = {
    polling: polling_1.Polling,
    websocket: websocket_1.WebSocket
  };
});

// mini-services/ironsight-room/node_modules/engine.io/build/userver.js
var require_userver = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.uServer = undefined;
  var debug_1 = __importDefault(require_src());
  var server_1 = require_server();
  var transports_uws_1 = __importDefault(require_transports_uws());
  var objectFromEntries_1 = require_objectFromEntries();
  var debug = (0, debug_1.default)("engine:uws");

  class uServer extends server_1.BaseServer {
    init() {}
    cleanup() {}
    prepare(req, res) {
      req.method = req.getMethod().toUpperCase();
      req.url = req.getUrl();
      const params = new URLSearchParams(req.getQuery());
      req._query = (0, objectFromEntries_1.objectFromEntries)(params.entries());
      req.headers = {};
      req.forEach((key, value) => {
        req.headers[key] = value;
      });
      req.connection = {
        remoteAddress: Buffer.from(res.getRemoteAddressAsText()).toString()
      };
      res.onAborted(() => {
        debug("response has been aborted");
      });
    }
    createTransport(transportName, req) {
      return new transports_uws_1.default[transportName](req);
    }
    attach(app, options = {}) {
      const path = this._computePath(options);
      app.any(path, this.handleRequest.bind(this)).ws(path, {
        compression: options.compression,
        idleTimeout: options.idleTimeout,
        maxBackpressure: options.maxBackpressure,
        maxPayloadLength: this.opts.maxHttpBufferSize,
        upgrade: this.handleUpgrade.bind(this),
        open: (ws) => {
          const transport = ws.getUserData().transport;
          transport.socket = ws;
          transport.writable = true;
          transport.emit("ready");
        },
        message: (ws, message, isBinary) => {
          ws.getUserData().transport.onData(isBinary ? message : Buffer.from(message).toString());
        },
        close: (ws, code, message) => {
          ws.getUserData().transport.onClose(code, message);
        }
      });
    }
    _applyMiddlewares(req, res, callback) {
      if (this.middlewares.length === 0) {
        return callback();
      }
      req.res = new ResponseWrapper(res);
      super._applyMiddlewares(req, req.res, (err) => {
        req.res.writeHead();
        callback(err);
      });
    }
    handleRequest(res, req) {
      debug('handling "%s" http request "%s"', req.getMethod(), req.getUrl());
      this.prepare(req, res);
      req.res = res;
      const callback = (errorCode, errorContext) => {
        if (errorCode !== undefined) {
          this.emit("connection_error", {
            req,
            code: errorCode,
            message: server_1.Server.errorMessages[errorCode],
            context: errorContext
          });
          this.abortRequest(req.res, errorCode, errorContext);
          return;
        }
        if (req._query.sid) {
          debug("setting new request for existing client");
          this.clients[req._query.sid].transport.onRequest(req);
        } else {
          const closeConnection = (errorCode2, errorContext2) => this.abortRequest(res, errorCode2, errorContext2);
          this.handshake(req._query.transport, req, closeConnection);
        }
      };
      this._applyMiddlewares(req, res, (err) => {
        if (err) {
          callback(server_1.Server.errors.BAD_REQUEST, { name: "MIDDLEWARE_FAILURE" });
        } else {
          this.verify(req, false, callback);
        }
      });
    }
    handleUpgrade(res, req, context) {
      debug("on upgrade");
      this.prepare(req, res);
      req.res = res;
      const callback = async (errorCode, errorContext) => {
        if (errorCode !== undefined) {
          this.emit("connection_error", {
            req,
            code: errorCode,
            message: server_1.Server.errorMessages[errorCode],
            context: errorContext
          });
          this.abortRequest(res, errorCode, errorContext);
          return;
        }
        const id = req._query.sid;
        let transport;
        if (id) {
          const client = this.clients[id];
          if (!client) {
            debug("upgrade attempt for closed client");
            return res.close();
          } else if (client.upgrading) {
            debug("transport has already been trying to upgrade");
            return res.close();
          } else if (client.upgraded) {
            debug("transport had already been upgraded");
            return res.close();
          } else {
            debug("upgrading existing transport");
            transport = this.createTransport(req._query.transport, req);
            client._maybeUpgrade(transport);
          }
        } else {
          transport = await this.handshake(req._query.transport, req, (errorCode2, errorContext2) => this.abortRequest(res, errorCode2, errorContext2));
          if (!transport) {
            return;
          }
        }
        const additionalHeaders = {};
        const isInitialRequest = !id;
        if (isInitialRequest) {
          this.emit("initial_headers", additionalHeaders, req);
        }
        this.emit("headers", additionalHeaders, req);
        req.res.writeStatus("101 Switching Protocols");
        Object.keys(additionalHeaders).forEach((key) => {
          req.res.writeHeader(key, additionalHeaders[key]);
        });
        res.upgrade({
          transport
        }, req.getHeader("sec-websocket-key"), req.getHeader("sec-websocket-protocol"), req.getHeader("sec-websocket-extensions"), context);
      };
      this._applyMiddlewares(req, res, (err) => {
        if (err) {
          callback(server_1.Server.errors.BAD_REQUEST, { name: "MIDDLEWARE_FAILURE" });
        } else {
          this.verify(req, true, callback);
        }
      });
    }
    abortRequest(res, errorCode, errorContext) {
      const statusCode = errorCode === server_1.Server.errors.FORBIDDEN ? "403 Forbidden" : "400 Bad Request";
      const message = errorContext && errorContext.message ? errorContext.message : server_1.Server.errorMessages[errorCode];
      res.writeStatus(statusCode);
      res.writeHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        code: errorCode,
        message
      }));
    }
  }
  exports.uServer = uServer;

  class ResponseWrapper {
    constructor(res) {
      this.res = res;
      this.statusWritten = false;
      this.headers = [];
      this.isAborted = false;
    }
    set statusCode(status) {
      if (!status) {
        return;
      }
      this.writeStatus(status === 200 ? "200 OK" : "204 No Content");
    }
    writeHead(status) {
      this.statusCode = status;
    }
    setHeader(key, value) {
      if (Array.isArray(value)) {
        value.forEach((val) => {
          this.writeHeader(key, val);
        });
      } else {
        this.writeHeader(key, value);
      }
    }
    removeHeader() {}
    getHeader() {}
    writeStatus(status) {
      if (this.isAborted)
        return;
      this.res.writeStatus(status);
      this.statusWritten = true;
      this.writeBufferedHeaders();
      return this;
    }
    writeHeader(key, value) {
      if (this.isAborted)
        return;
      if (key === "Content-Length") {
        return;
      }
      if (this.statusWritten) {
        this.res.writeHeader(key, value);
      } else {
        this.headers.push([key, value]);
      }
    }
    writeBufferedHeaders() {
      this.headers.forEach(([key, value]) => {
        this.res.writeHeader(key, value);
      });
    }
    end(data) {
      if (this.isAborted)
        return;
      this.res.cork(() => {
        if (!this.statusWritten) {
          this.writeBufferedHeaders();
        }
        this.res.end(data);
      });
    }
    onData(fn) {
      if (this.isAborted)
        return;
      this.res.onData(fn);
    }
    onAborted(fn) {
      if (this.isAborted)
        return;
      this.res.onAborted(() => {
        this.isAborted = true;
        fn();
      });
    }
    cork(fn) {
      if (this.isAborted)
        return;
      this.res.cork(fn);
    }
  }
});

// mini-services/ironsight-room/node_modules/engine.io/build/engine.io.js
var require_engine_io = __commonJS((exports) => {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports && exports.__importStar || function() {
    var ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o2) {
        var ar = [];
        for (var k in o2)
          if (Object.prototype.hasOwnProperty.call(o2, k))
            ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    return function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k = ownKeys(mod), i = 0;i < k.length; i++)
          if (k[i] !== "default")
            __createBinding(result, mod, k[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  }();
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.protocol = exports.Transport = exports.Socket = exports.uServer = exports.parser = exports.transports = exports.Server = undefined;
  exports.listen = listen;
  exports.attach = attach;
  var http_1 = __require("http");
  var server_1 = require_server();
  Object.defineProperty(exports, "Server", { enumerable: true, get: function() {
    return server_1.Server;
  } });
  var index_1 = __importDefault(require_transports());
  exports.transports = index_1.default;
  var parser = __importStar(require_cjs());
  exports.parser = parser;
  var userver_1 = require_userver();
  Object.defineProperty(exports, "uServer", { enumerable: true, get: function() {
    return userver_1.uServer;
  } });
  var socket_1 = require_socket();
  Object.defineProperty(exports, "Socket", { enumerable: true, get: function() {
    return socket_1.Socket;
  } });
  var transport_1 = require_transport();
  Object.defineProperty(exports, "Transport", { enumerable: true, get: function() {
    return transport_1.Transport;
  } });
  exports.protocol = parser.protocol;
  function listen(port, options, listenCallback) {
    if (typeof options === "function") {
      listenCallback = options;
      options = {};
    }
    const server = (0, http_1.createServer)(function(req, res) {
      res.writeHead(501);
      res.end("Not Implemented");
    });
    const engine = attach(server, options);
    engine.httpServer = server;
    server.listen(port, listenCallback);
    return engine;
  }
  function attach(server, options) {
    const engine = new server_1.Server(options);
    engine.attach(server, options);
    return engine;
  }
});

// mini-services/ironsight-room/node_modules/@socket.io/component-emitter/lib/cjs/index.js
var require_cjs2 = __commonJS((exports) => {
  exports.Emitter = Emitter;
  function Emitter(obj) {
    if (obj)
      return mixin(obj);
  }
  function mixin(obj) {
    for (var key in Emitter.prototype) {
      obj[key] = Emitter.prototype[key];
    }
    return obj;
  }
  Emitter.prototype.on = Emitter.prototype.addEventListener = function(event, fn) {
    this._callbacks = this._callbacks || {};
    (this._callbacks["$" + event] = this._callbacks["$" + event] || []).push(fn);
    return this;
  };
  Emitter.prototype.once = function(event, fn) {
    function on() {
      this.off(event, on);
      fn.apply(this, arguments);
    }
    on.fn = fn;
    this.on(event, on);
    return this;
  };
  Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function(event, fn) {
    this._callbacks = this._callbacks || {};
    if (arguments.length == 0) {
      this._callbacks = {};
      return this;
    }
    var callbacks = this._callbacks["$" + event];
    if (!callbacks)
      return this;
    if (arguments.length == 1) {
      delete this._callbacks["$" + event];
      return this;
    }
    var cb;
    for (var i = 0;i < callbacks.length; i++) {
      cb = callbacks[i];
      if (cb === fn || cb.fn === fn) {
        callbacks.splice(i, 1);
        break;
      }
    }
    if (callbacks.length === 0) {
      delete this._callbacks["$" + event];
    }
    return this;
  };
  Emitter.prototype.emit = function(event) {
    this._callbacks = this._callbacks || {};
    var args = new Array(arguments.length - 1), callbacks = this._callbacks["$" + event];
    for (var i = 1;i < arguments.length; i++) {
      args[i - 1] = arguments[i];
    }
    if (callbacks) {
      callbacks = callbacks.slice(0);
      for (var i = 0, len = callbacks.length;i < len; ++i) {
        callbacks[i].apply(this, args);
      }
    }
    return this;
  };
  Emitter.prototype.emitReserved = Emitter.prototype.emit;
  Emitter.prototype.listeners = function(event) {
    this._callbacks = this._callbacks || {};
    return this._callbacks["$" + event] || [];
  };
  Emitter.prototype.hasListeners = function(event) {
    return !!this.listeners(event).length;
  };
});

// mini-services/ironsight-room/node_modules/socket.io-parser/build/cjs/is-binary.js
var require_is_binary = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.isBinary = isBinary;
  exports.hasBinary = hasBinary;
  var withNativeArrayBuffer = typeof ArrayBuffer === "function";
  var isView = (obj) => {
    return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj.buffer instanceof ArrayBuffer;
  };
  var toString = Object.prototype.toString;
  var withNativeBlob = typeof Blob === "function" || typeof Blob !== "undefined" && toString.call(Blob) === "[object BlobConstructor]";
  var withNativeFile = typeof File === "function" || typeof File !== "undefined" && toString.call(File) === "[object FileConstructor]";
  function isBinary(obj) {
    return withNativeArrayBuffer && (obj instanceof ArrayBuffer || isView(obj)) || withNativeBlob && obj instanceof Blob || withNativeFile && obj instanceof File;
  }
  function hasBinary(obj, toJSON) {
    if (!obj || typeof obj !== "object") {
      return false;
    }
    if (Array.isArray(obj)) {
      for (let i = 0, l = obj.length;i < l; i++) {
        if (hasBinary(obj[i])) {
          return true;
        }
      }
      return false;
    }
    if (isBinary(obj)) {
      return true;
    }
    if (obj.toJSON && typeof obj.toJSON === "function" && arguments.length === 1) {
      return hasBinary(obj.toJSON(), true);
    }
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
        return true;
      }
    }
    return false;
  }
});

// mini-services/ironsight-room/node_modules/socket.io-parser/build/cjs/binary.js
var require_binary = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.deconstructPacket = deconstructPacket;
  exports.reconstructPacket = reconstructPacket;
  var is_binary_js_1 = require_is_binary();
  function deconstructPacket(packet) {
    const buffers = [];
    const packetData = packet.data;
    const pack = packet;
    pack.data = _deconstructPacket(packetData, buffers);
    pack.attachments = buffers.length;
    return { packet: pack, buffers };
  }
  function _deconstructPacket(data, buffers, toJSON) {
    if (!data)
      return data;
    if ((0, is_binary_js_1.isBinary)(data)) {
      const placeholder = { _placeholder: true, num: buffers.length };
      buffers.push(data);
      return placeholder;
    } else if (Array.isArray(data)) {
      const newData = new Array(data.length);
      for (let i = 0;i < data.length; i++) {
        newData[i] = _deconstructPacket(data[i], buffers);
      }
      return newData;
    } else if (typeof data === "object" && !(data instanceof Date)) {
      if (data.toJSON && typeof data.toJSON === "function" && !toJSON) {
        return _deconstructPacket(data.toJSON(), buffers, true);
      }
      const newData = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          newData[key] = _deconstructPacket(data[key], buffers);
        }
      }
      return newData;
    }
    return data;
  }
  function reconstructPacket(packet, buffers) {
    packet.data = _reconstructPacket(packet.data, buffers);
    delete packet.attachments;
    return packet;
  }
  function _reconstructPacket(data, buffers) {
    if (!data)
      return data;
    if (data && data._placeholder === true) {
      const isIndexValid = typeof data.num === "number" && data.num >= 0 && data.num < buffers.length;
      if (isIndexValid) {
        return buffers[data.num];
      } else {
        throw new Error("illegal attachments");
      }
    } else if (Array.isArray(data)) {
      for (let i = 0;i < data.length; i++) {
        data[i] = _reconstructPacket(data[i], buffers);
      }
    } else if (typeof data === "object") {
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          data[key] = _reconstructPacket(data[key], buffers);
        }
      }
    }
    return data;
  }
});

// mini-services/ironsight-room/node_modules/socket.io-parser/build/cjs/index.js
var require_cjs3 = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Decoder = exports.Encoder = exports.PacketType = exports.protocol = undefined;
  exports.isPacketValid = isPacketValid;
  var component_emitter_1 = require_cjs2();
  var binary_js_1 = require_binary();
  var is_binary_js_1 = require_is_binary();
  var debug_1 = __importDefault(require_src());
  var debug = (0, debug_1.default)("socket.io-parser");
  var RESERVED_EVENTS = [
    "connect",
    "connect_error",
    "disconnect",
    "disconnecting",
    "newListener",
    "removeListener"
  ];
  exports.protocol = 5;
  var PacketType;
  (function(PacketType2) {
    PacketType2[PacketType2["CONNECT"] = 0] = "CONNECT";
    PacketType2[PacketType2["DISCONNECT"] = 1] = "DISCONNECT";
    PacketType2[PacketType2["EVENT"] = 2] = "EVENT";
    PacketType2[PacketType2["ACK"] = 3] = "ACK";
    PacketType2[PacketType2["CONNECT_ERROR"] = 4] = "CONNECT_ERROR";
    PacketType2[PacketType2["BINARY_EVENT"] = 5] = "BINARY_EVENT";
    PacketType2[PacketType2["BINARY_ACK"] = 6] = "BINARY_ACK";
  })(PacketType || (exports.PacketType = PacketType = {}));

  class Encoder {
    constructor(replacer) {
      this.replacer = replacer;
    }
    encode(obj) {
      debug("encoding packet %j", obj);
      if (obj.type === PacketType.EVENT || obj.type === PacketType.ACK) {
        if ((0, is_binary_js_1.hasBinary)(obj)) {
          return this.encodeAsBinary({
            type: obj.type === PacketType.EVENT ? PacketType.BINARY_EVENT : PacketType.BINARY_ACK,
            nsp: obj.nsp,
            data: obj.data,
            id: obj.id
          });
        }
      }
      return [this.encodeAsString(obj)];
    }
    encodeAsString(obj) {
      let str = "" + obj.type;
      if (obj.type === PacketType.BINARY_EVENT || obj.type === PacketType.BINARY_ACK) {
        str += obj.attachments + "-";
      }
      if (obj.nsp && obj.nsp !== "/") {
        str += obj.nsp + ",";
      }
      if (obj.id != null) {
        str += obj.id;
      }
      if (obj.data != null) {
        str += JSON.stringify(obj.data, this.replacer);
      }
      debug("encoded %j as %s", obj, str);
      return str;
    }
    encodeAsBinary(obj) {
      const deconstruction = (0, binary_js_1.deconstructPacket)(obj);
      const pack = this.encodeAsString(deconstruction.packet);
      const buffers = deconstruction.buffers;
      buffers.unshift(pack);
      return buffers;
    }
  }
  exports.Encoder = Encoder;

  class Decoder extends component_emitter_1.Emitter {
    constructor(opts) {
      super();
      this.opts = Object.assign({
        reviver: undefined,
        maxAttachments: 10
      }, typeof opts === "function" ? { reviver: opts } : opts);
    }
    add(obj) {
      let packet;
      if (typeof obj === "string") {
        if (this.reconstructor) {
          throw new Error("got plaintext data when reconstructing a packet");
        }
        packet = this.decodeString(obj);
        const isBinaryEvent = packet.type === PacketType.BINARY_EVENT;
        if (isBinaryEvent || packet.type === PacketType.BINARY_ACK) {
          packet.type = isBinaryEvent ? PacketType.EVENT : PacketType.ACK;
          this.reconstructor = new BinaryReconstructor(packet);
        } else {
          super.emitReserved("decoded", packet);
        }
      } else if ((0, is_binary_js_1.isBinary)(obj) || obj.base64) {
        if (!this.reconstructor) {
          throw new Error("got binary data when not reconstructing a packet");
        } else {
          packet = this.reconstructor.takeBinaryData(obj);
          if (packet) {
            this.reconstructor = null;
            super.emitReserved("decoded", packet);
          }
        }
      } else {
        throw new Error("Unknown type: " + obj);
      }
    }
    decodeString(str) {
      let i = 0;
      const p = {
        type: Number(str.charAt(0))
      };
      if (PacketType[p.type] === undefined) {
        throw new Error("unknown packet type " + p.type);
      }
      if (p.type === PacketType.BINARY_EVENT || p.type === PacketType.BINARY_ACK) {
        const start = i + 1;
        while (str.charAt(++i) !== "-" && i != str.length) {}
        const buf = str.substring(start, i);
        if (buf != Number(buf) || str.charAt(i) !== "-") {
          throw new Error("Illegal attachments");
        }
        const n = Number(buf);
        if (!isInteger(n) || n < 1) {
          throw new Error("Illegal attachments");
        } else if (n > this.opts.maxAttachments) {
          throw new Error("too many attachments");
        }
        p.attachments = n;
      }
      if (str.charAt(i + 1) === "/") {
        const start = i + 1;
        while (++i) {
          const c = str.charAt(i);
          if (c === ",")
            break;
          if (i === str.length)
            break;
        }
        p.nsp = str.substring(start, i);
      } else {
        p.nsp = "/";
      }
      const next = str.charAt(i + 1);
      if (next !== "" && Number(next) == next) {
        const start = i + 1;
        while (++i) {
          const c = str.charAt(i);
          if (c == null || Number(c) != c) {
            --i;
            break;
          }
          if (i === str.length)
            break;
        }
        p.id = Number(str.substring(start, i + 1));
      }
      if (str.charAt(++i)) {
        const payload = this.tryParse(str.substr(i));
        if (Decoder.isPayloadValid(p.type, payload)) {
          p.data = payload;
        } else {
          throw new Error("invalid payload");
        }
      }
      debug("decoded %s as %j", str, p);
      return p;
    }
    tryParse(str) {
      try {
        return JSON.parse(str, this.opts.reviver);
      } catch (e) {
        return false;
      }
    }
    static isPayloadValid(type, payload) {
      switch (type) {
        case PacketType.CONNECT:
          return isObject(payload);
        case PacketType.DISCONNECT:
          return payload === undefined;
        case PacketType.CONNECT_ERROR:
          return typeof payload === "string" || isObject(payload);
        case PacketType.EVENT:
        case PacketType.BINARY_EVENT:
          return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS.indexOf(payload[0]) === -1);
        case PacketType.ACK:
        case PacketType.BINARY_ACK:
          return Array.isArray(payload);
      }
    }
    destroy() {
      if (this.reconstructor) {
        this.reconstructor.finishedReconstruction();
        this.reconstructor = null;
      }
    }
  }
  exports.Decoder = Decoder;

  class BinaryReconstructor {
    constructor(packet) {
      this.packet = packet;
      this.buffers = [];
      this.reconPack = packet;
    }
    takeBinaryData(binData) {
      this.buffers.push(binData);
      if (this.buffers.length === this.reconPack.attachments) {
        const packet = (0, binary_js_1.reconstructPacket)(this.reconPack, this.buffers);
        this.finishedReconstruction();
        return packet;
      }
      return null;
    }
    finishedReconstruction() {
      this.reconPack = null;
      this.buffers = [];
    }
  }
  function isNamespaceValid(nsp) {
    return typeof nsp === "string";
  }
  var isInteger = Number.isInteger || function(value) {
    return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
  };
  function isAckIdValid(id) {
    return id === undefined || isInteger(id);
  }
  function isObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
  }
  function isDataValid(type, payload) {
    switch (type) {
      case PacketType.CONNECT:
        return payload === undefined || isObject(payload);
      case PacketType.DISCONNECT:
        return payload === undefined;
      case PacketType.EVENT:
        return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS.indexOf(payload[0]) === -1);
      case PacketType.ACK:
        return Array.isArray(payload);
      case PacketType.CONNECT_ERROR:
        return typeof payload === "string" || isObject(payload);
      default:
        return false;
    }
  }
  function isPacketValid(packet) {
    return isNamespaceValid(packet.nsp) && isAckIdValid(packet.id) && isDataValid(packet.type, packet.data);
  }
});

// mini-services/ironsight-room/node_modules/socket.io/dist/client.js
var require_client = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Client = undefined;
  var socket_io_parser_1 = require_cjs3();
  var debug_1 = __importDefault(require_src());
  var debug = (0, debug_1.default)("socket.io:client");
  function objectFromEntries(entries) {
    const obj = Object.create(null);
    for (const [key, value] of entries) {
      obj[key] = value;
    }
    return obj;
  }

  class Client {
    constructor(server, conn) {
      this.sockets = new Map;
      this.nsps = new Map;
      this.server = server;
      this.conn = conn;
      this.encoder = server.encoder;
      this.decoder = new server._parser.Decoder;
      this.id = conn.id;
      this.setup();
    }
    get request() {
      return this.conn.request;
    }
    setup() {
      this.onclose = this.onclose.bind(this);
      this.ondata = this.ondata.bind(this);
      this.onerror = this.onerror.bind(this);
      this.ondecoded = this.ondecoded.bind(this);
      this.decoder.on("decoded", this.ondecoded);
      this.conn.on("data", this.ondata);
      this.conn.on("error", this.onerror);
      this.conn.on("close", this.onclose);
      this.connectTimeout = setTimeout(() => {
        if (this.nsps.size === 0) {
          debug("no namespace joined yet, close the client");
          this.close();
        } else {
          debug("the client has already joined a namespace, nothing to do");
        }
      }, this.server._connectTimeout);
    }
    connect(name, auth = {}) {
      if (this.server._nsps.has(name)) {
        debug("connecting to namespace %s", name);
        return this.doConnect(name, auth);
      }
      this.server._checkNamespace(name, auth, (dynamicNspName) => {
        if (dynamicNspName) {
          this.doConnect(name, auth);
        } else {
          debug("creation of namespace %s was denied", name);
          this._packet({
            type: socket_io_parser_1.PacketType.CONNECT_ERROR,
            nsp: name,
            data: {
              message: "Invalid namespace"
            }
          });
        }
      });
    }
    doConnect(name, auth) {
      const nsp = this.server.of(name);
      nsp._add(this, auth, (socket) => {
        this.sockets.set(socket.id, socket);
        this.nsps.set(nsp.name, socket);
        if (this.connectTimeout) {
          clearTimeout(this.connectTimeout);
          this.connectTimeout = undefined;
        }
      });
    }
    _disconnect() {
      for (const socket of this.sockets.values()) {
        socket.disconnect();
      }
      this.sockets.clear();
      this.close();
    }
    _remove(socket) {
      if (this.sockets.has(socket.id)) {
        const nsp = this.sockets.get(socket.id).nsp.name;
        this.sockets.delete(socket.id);
        this.nsps.delete(nsp);
      } else {
        debug("ignoring remove for %s", socket.id);
      }
    }
    close() {
      if (this.conn.readyState === "open") {
        debug("forcing transport close");
        this.conn.close();
        this.onclose("forced server close");
      }
    }
    _packet(packet, opts = {}) {
      if (this.conn.readyState !== "open") {
        debug("ignoring packet write %j", packet);
        return;
      }
      const encodedPackets = opts.preEncoded ? packet : this.encoder.encode(packet);
      this.writeToEngine(encodedPackets, opts);
    }
    writeToEngine(encodedPackets, opts) {
      if (opts.volatile && !this.conn.transport.writable) {
        debug("volatile packet is discarded since the transport is not currently writable");
        return;
      }
      const packets = Array.isArray(encodedPackets) ? encodedPackets : [encodedPackets];
      for (const encodedPacket of packets) {
        this.conn.write(encodedPacket, opts);
      }
    }
    ondata(data) {
      try {
        this.decoder.add(data);
      } catch (e) {
        debug("invalid packet format");
        this.onerror(e);
      }
    }
    ondecoded(packet) {
      const { namespace, authPayload } = this._parseNamespace(packet);
      const socket = this.nsps.get(namespace);
      if (!socket && packet.type === socket_io_parser_1.PacketType.CONNECT) {
        this.connect(namespace, authPayload);
      } else if (socket && packet.type !== socket_io_parser_1.PacketType.CONNECT && packet.type !== socket_io_parser_1.PacketType.CONNECT_ERROR) {
        process.nextTick(function() {
          socket._onpacket(packet);
        });
      } else {
        debug("invalid state (packet type: %s)", packet.type);
        this.close();
      }
    }
    _parseNamespace(packet) {
      if (this.conn.protocol !== 3) {
        return {
          namespace: packet.nsp,
          authPayload: packet.data
        };
      }
      const url = new URL(packet.nsp, "https://socket.io");
      return {
        namespace: url.pathname,
        authPayload: objectFromEntries(url.searchParams.entries())
      };
    }
    onerror(err) {
      for (const socket of this.sockets.values()) {
        socket._onerror(err);
      }
      this.conn.close();
    }
    onclose(reason, description) {
      debug("client close with reason %s", reason);
      this.destroy();
      for (const socket of this.sockets.values()) {
        socket._onclose(reason, description);
      }
      this.sockets.clear();
      this.decoder.destroy();
    }
    destroy() {
      this.conn.removeListener("data", this.ondata);
      this.conn.removeListener("error", this.onerror);
      this.conn.removeListener("close", this.onclose);
      this.decoder.removeListener("decoded", this.ondecoded);
      if (this.connectTimeout) {
        clearTimeout(this.connectTimeout);
        this.connectTimeout = undefined;
      }
    }
  }
  exports.Client = Client;
});

// mini-services/ironsight-room/node_modules/socket.io/dist/typed-events.js
var require_typed_events = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.StrictEventEmitter = undefined;
  var events_1 = __require("events");

  class StrictEventEmitter extends events_1.EventEmitter {
    on(ev, listener) {
      return super.on(ev, listener);
    }
    once(ev, listener) {
      return super.once(ev, listener);
    }
    emit(ev, ...args) {
      return super.emit(ev, ...args);
    }
    emitReserved(ev, ...args) {
      return super.emit(ev, ...args);
    }
    emitUntyped(ev, ...args) {
      return super.emit(ev, ...args);
    }
    listeners(event) {
      return super.listeners(event);
    }
  }
  exports.StrictEventEmitter = StrictEventEmitter;
});

// mini-services/ironsight-room/node_modules/socket.io/dist/contrib/base64id.js
var require_base64id2 = __commonJS((exports) => {
  /*!
   * base64id v0.1.0
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.base64id = undefined;
  var crypto2 = __require("crypto");
  var Base64Id = function() {};
  Base64Id.prototype.getRandomBytes = function(bytes) {
    var BUFFER_SIZE = 4096;
    var self = this;
    bytes = bytes || 12;
    if (bytes > BUFFER_SIZE) {
      return crypto2.randomBytes(bytes);
    }
    var bytesInBuffer = Math.floor(BUFFER_SIZE / bytes);
    var threshold = Math.floor(bytesInBuffer * 0.85);
    if (!threshold) {
      return crypto2.randomBytes(bytes);
    }
    if (this.bytesBufferIndex == null) {
      this.bytesBufferIndex = -1;
    }
    if (this.bytesBufferIndex == bytesInBuffer) {
      this.bytesBuffer = null;
      this.bytesBufferIndex = -1;
    }
    if (this.bytesBufferIndex == -1 || this.bytesBufferIndex > threshold) {
      if (!this.isGeneratingBytes) {
        this.isGeneratingBytes = true;
        crypto2.randomBytes(BUFFER_SIZE, function(err, bytes2) {
          self.bytesBuffer = bytes2;
          self.bytesBufferIndex = 0;
          self.isGeneratingBytes = false;
        });
      }
      if (this.bytesBufferIndex == -1) {
        return crypto2.randomBytes(bytes);
      }
    }
    var result = this.bytesBuffer.slice(bytes * this.bytesBufferIndex, bytes * (this.bytesBufferIndex + 1));
    this.bytesBufferIndex++;
    return result;
  };
  Base64Id.prototype.generateId = function() {
    var rand = Buffer.alloc(15);
    if (!rand.writeInt32BE) {
      return Math.abs(Math.random() * Math.random() * Date.now() | 0).toString() + Math.abs(Math.random() * Math.random() * Date.now() | 0).toString();
    }
    this.sequenceNumber = this.sequenceNumber + 1 | 0;
    rand.writeInt32BE(this.sequenceNumber, 11);
    if (crypto2.randomBytes) {
      this.getRandomBytes(12).copy(rand);
    } else {
      [0, 4, 8].forEach(function(i) {
        rand.writeInt32BE(Math.random() * Math.pow(2, 32) | 0, i);
      });
    }
    return rand.toString("base64").replace(/\//g, "_").replace(/\+/g, "-");
  };
  exports.base64id = new Base64Id;
});

// mini-services/ironsight-room/node_modules/socket.io/dist/socket-types.js
var require_socket_types = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.RESERVED_EVENTS = undefined;
  exports.RESERVED_EVENTS = new Set([
    "connect",
    "connect_error",
    "disconnect",
    "disconnecting",
    "newListener",
    "removeListener"
  ]);
});

// mini-services/ironsight-room/node_modules/socket.io/dist/broadcast-operator.js
var require_broadcast_operator = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.RemoteSocket = exports.BroadcastOperator = undefined;
  var socket_types_1 = require_socket_types();
  var socket_io_parser_1 = require_cjs3();
  var debug_1 = __importDefault(require_src());
  var debug = (0, debug_1.default)("socket.io:broadcast-operator");

  class BroadcastOperator {
    constructor(adapter, rooms = new Set, exceptRooms = new Set, flags = {}) {
      this.adapter = adapter;
      this.rooms = rooms;
      this.exceptRooms = exceptRooms;
      this.flags = flags;
    }
    to(room) {
      const rooms = new Set(this.rooms);
      if (Array.isArray(room)) {
        room.forEach((r) => rooms.add(r));
      } else {
        rooms.add(room);
      }
      return new BroadcastOperator(this.adapter, rooms, this.exceptRooms, this.flags);
    }
    in(room) {
      return this.to(room);
    }
    except(room) {
      const exceptRooms = new Set(this.exceptRooms);
      if (Array.isArray(room)) {
        room.forEach((r) => exceptRooms.add(r));
      } else {
        exceptRooms.add(room);
      }
      return new BroadcastOperator(this.adapter, this.rooms, exceptRooms, this.flags);
    }
    compress(compress) {
      const flags = Object.assign({}, this.flags, { compress });
      return new BroadcastOperator(this.adapter, this.rooms, this.exceptRooms, flags);
    }
    get volatile() {
      const flags = Object.assign({}, this.flags, { volatile: true });
      return new BroadcastOperator(this.adapter, this.rooms, this.exceptRooms, flags);
    }
    get local() {
      const flags = Object.assign({}, this.flags, { local: true });
      return new BroadcastOperator(this.adapter, this.rooms, this.exceptRooms, flags);
    }
    timeout(timeout) {
      const flags = Object.assign({}, this.flags, { timeout });
      return new BroadcastOperator(this.adapter, this.rooms, this.exceptRooms, flags);
    }
    emit(ev, ...args) {
      if (socket_types_1.RESERVED_EVENTS.has(ev)) {
        throw new Error(`"${String(ev)}" is a reserved event name`);
      }
      const data = [ev, ...args];
      const packet = {
        type: socket_io_parser_1.PacketType.EVENT,
        data
      };
      const withAck = typeof data[data.length - 1] === "function";
      if (!withAck) {
        this.adapter.broadcast(packet, {
          rooms: this.rooms,
          except: this.exceptRooms,
          flags: this.flags
        });
        return true;
      }
      const ack = data.pop();
      let timedOut = false;
      let responses = [];
      const timer = setTimeout(() => {
        timedOut = true;
        debug("operation has timed out");
        const packetId = packet.id;
        if (packetId !== undefined) {
          this.adapter.nsp.sockets.forEach((socket) => {
            socket.acks.delete(packetId);
          });
        }
        ack.apply(this, [
          new Error("operation has timed out"),
          this.flags.expectSingleResponse ? null : responses
        ]);
      }, this.flags.timeout);
      let expectedServerCount = -1;
      let actualServerCount = 0;
      let expectedClientCount = 0;
      const checkCompleteness = () => {
        debug("responses: servers: %d / %d ; clients: %d / %d", actualServerCount, expectedServerCount, responses.length, expectedClientCount);
        if (!timedOut && expectedServerCount === actualServerCount && responses.length === expectedClientCount) {
          clearTimeout(timer);
          ack.apply(this, [
            null,
            this.flags.expectSingleResponse ? responses[0] : responses
          ]);
        }
      };
      this.adapter.broadcastWithAck(packet, {
        rooms: this.rooms,
        except: this.exceptRooms,
        flags: this.flags
      }, (clientCount) => {
        expectedClientCount += clientCount;
        actualServerCount++;
        checkCompleteness();
      }, (clientResponse) => {
        responses.push(clientResponse);
        checkCompleteness();
      });
      this.adapter.serverCount().then((serverCount) => {
        expectedServerCount = serverCount;
        checkCompleteness();
      });
      return true;
    }
    emitWithAck(ev, ...args) {
      return new Promise((resolve, reject) => {
        args.push((err, responses) => {
          if (err) {
            err.responses = responses;
            return reject(err);
          } else {
            return resolve(responses);
          }
        });
        this.emit(ev, ...args);
      });
    }
    allSockets() {
      if (!this.adapter) {
        throw new Error("No adapter for this namespace, are you trying to get the list of clients of a dynamic namespace?");
      }
      return this.adapter.sockets(this.rooms);
    }
    fetchSockets() {
      return this.adapter.fetchSockets({
        rooms: this.rooms,
        except: this.exceptRooms,
        flags: this.flags
      }).then((sockets) => {
        return sockets.map((socket) => {
          if (socket.server) {
            return socket;
          } else {
            return new RemoteSocket(this.adapter, socket);
          }
        });
      });
    }
    socketsJoin(room) {
      this.adapter.addSockets({
        rooms: this.rooms,
        except: this.exceptRooms,
        flags: this.flags
      }, Array.isArray(room) ? room : [room]);
    }
    socketsLeave(room) {
      this.adapter.delSockets({
        rooms: this.rooms,
        except: this.exceptRooms,
        flags: this.flags
      }, Array.isArray(room) ? room : [room]);
    }
    disconnectSockets(close = false) {
      this.adapter.disconnectSockets({
        rooms: this.rooms,
        except: this.exceptRooms,
        flags: this.flags
      }, close);
    }
  }
  exports.BroadcastOperator = BroadcastOperator;

  class RemoteSocket {
    constructor(adapter, details) {
      this.id = details.id;
      this.handshake = details.handshake;
      this.rooms = new Set(details.rooms);
      this.data = details.data;
      this.operator = new BroadcastOperator(adapter, new Set([this.id]), new Set, {
        expectSingleResponse: true
      });
    }
    timeout(timeout) {
      return this.operator.timeout(timeout);
    }
    emit(ev, ...args) {
      return this.operator.emit(ev, ...args);
    }
    join(room) {
      return this.operator.socketsJoin(room);
    }
    leave(room) {
      return this.operator.socketsLeave(room);
    }
    disconnect(close = false) {
      this.operator.disconnectSockets(close);
      return this;
    }
  }
  exports.RemoteSocket = RemoteSocket;
});

// mini-services/ironsight-room/node_modules/socket.io/dist/socket.js
var require_socket2 = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Socket = undefined;
  var socket_io_parser_1 = require_cjs3();
  var debug_1 = __importDefault(require_src());
  var typed_events_1 = require_typed_events();
  var base64id_1 = require_base64id2();
  var broadcast_operator_1 = require_broadcast_operator();
  var socket_types_1 = require_socket_types();
  var debug = (0, debug_1.default)("socket.io:socket");
  var RECOVERABLE_DISCONNECT_REASONS = new Set([
    "transport error",
    "transport close",
    "forced close",
    "ping timeout",
    "server shutting down",
    "forced server close"
  ]);
  function noop() {}

  class Socket extends typed_events_1.StrictEventEmitter {
    constructor(nsp, client, auth, previousSession) {
      super();
      this.nsp = nsp;
      this.client = client;
      this.recovered = false;
      this.data = {};
      this.connected = false;
      this.acks = new Map;
      this.fns = [];
      this.flags = {};
      this.server = nsp.server;
      this.adapter = nsp.adapter;
      if (previousSession) {
        this.id = previousSession.sid;
        this.pid = previousSession.pid;
        previousSession.rooms.forEach((room) => this.join(room));
        this.data = previousSession.data;
        previousSession.missedPackets.forEach((packet) => {
          this.packet({
            type: socket_io_parser_1.PacketType.EVENT,
            data: packet
          });
        });
        this.recovered = true;
      } else {
        if (client.conn.protocol === 3) {
          this.id = nsp.name !== "/" ? nsp.name + "#" + client.id : client.id;
        } else {
          this.id = base64id_1.base64id.generateId();
        }
        if (this.server._opts.connectionStateRecovery) {
          this.pid = base64id_1.base64id.generateId();
        }
      }
      this.handshake = this.buildHandshake(auth);
      this.on("error", noop);
    }
    buildHandshake(auth) {
      var _a, _b, _c, _d;
      return {
        headers: ((_a = this.request) === null || _a === undefined ? undefined : _a.headers) || {},
        time: new Date + "",
        address: this.conn.remoteAddress,
        xdomain: !!((_b = this.request) === null || _b === undefined ? undefined : _b.headers.origin),
        secure: !this.request || !!this.request.connection.encrypted,
        issued: +new Date,
        url: (_c = this.request) === null || _c === undefined ? undefined : _c.url,
        query: ((_d = this.request) === null || _d === undefined ? undefined : _d._query) || {},
        auth
      };
    }
    emit(ev, ...args) {
      if (socket_types_1.RESERVED_EVENTS.has(ev)) {
        throw new Error(`"${String(ev)}" is a reserved event name`);
      }
      const data = [ev, ...args];
      const packet = {
        type: socket_io_parser_1.PacketType.EVENT,
        data
      };
      if (typeof data[data.length - 1] === "function") {
        const id = this.nsp._ids++;
        debug("emitting packet with ack id %d", id);
        this.registerAckCallback(id, data.pop());
        packet.id = id;
      }
      const flags = Object.assign({}, this.flags);
      this.flags = {};
      if (this.nsp.server.opts.connectionStateRecovery) {
        this.adapter.broadcast(packet, {
          rooms: new Set([this.id]),
          except: new Set,
          flags
        });
      } else {
        this.notifyOutgoingListeners(packet);
        this.packet(packet, flags);
      }
      return true;
    }
    emitWithAck(ev, ...args) {
      const withErr = this.flags.timeout !== undefined;
      return new Promise((resolve, reject) => {
        args.push((arg1, arg2) => {
          if (withErr) {
            return arg1 ? reject(arg1) : resolve(arg2);
          } else {
            return resolve(arg1);
          }
        });
        this.emit(ev, ...args);
      });
    }
    registerAckCallback(id, ack) {
      const timeout = this.flags.timeout;
      if (timeout === undefined) {
        this.acks.set(id, ack);
        return;
      }
      const timer = setTimeout(() => {
        debug("event with ack id %d has timed out after %d ms", id, timeout);
        this.acks.delete(id);
        ack.call(this, new Error("operation has timed out"));
      }, timeout);
      this.acks.set(id, (...args) => {
        clearTimeout(timer);
        ack.apply(this, [null, ...args]);
      });
    }
    to(room) {
      return this.newBroadcastOperator().to(room);
    }
    in(room) {
      return this.newBroadcastOperator().in(room);
    }
    except(room) {
      return this.newBroadcastOperator().except(room);
    }
    send(...args) {
      this.emit("message", ...args);
      return this;
    }
    write(...args) {
      this.emit("message", ...args);
      return this;
    }
    packet(packet, opts = {}) {
      packet.nsp = this.nsp.name;
      opts.compress = opts.compress !== false;
      this.client._packet(packet, opts);
    }
    join(rooms) {
      debug("join room %s", rooms);
      return this.adapter.addAll(this.id, new Set(Array.isArray(rooms) ? rooms : [rooms]));
    }
    leave(room) {
      debug("leave room %s", room);
      return this.adapter.del(this.id, room);
    }
    leaveAll() {
      this.adapter.delAll(this.id);
    }
    _onconnect() {
      debug("socket connected - writing packet");
      this.connected = true;
      this.join(this.id);
      if (this.conn.protocol === 3) {
        this.packet({ type: socket_io_parser_1.PacketType.CONNECT });
      } else {
        this.packet({
          type: socket_io_parser_1.PacketType.CONNECT,
          data: { sid: this.id, pid: this.pid }
        });
      }
    }
    _onpacket(packet) {
      debug("got packet %j", packet);
      switch (packet.type) {
        case socket_io_parser_1.PacketType.EVENT:
        case socket_io_parser_1.PacketType.BINARY_EVENT:
          this.onevent(packet);
          break;
        case socket_io_parser_1.PacketType.ACK:
        case socket_io_parser_1.PacketType.BINARY_ACK:
          this.onack(packet);
          break;
        case socket_io_parser_1.PacketType.DISCONNECT:
          this.ondisconnect();
          break;
      }
    }
    onevent(packet) {
      const args = packet.data || [];
      debug("emitting event %j", args);
      if (packet.id != null) {
        debug("attaching ack callback to event");
        args.push(this.ack(packet.id));
      }
      if (this._anyListeners && this._anyListeners.length) {
        const listeners = this._anyListeners.slice();
        for (const listener of listeners) {
          listener.apply(this, args);
        }
      }
      this.dispatch(args);
    }
    ack(id) {
      const self = this;
      let sent = false;
      return function() {
        if (sent)
          return;
        const args = Array.prototype.slice.call(arguments);
        debug("sending ack %j", args);
        self.packet({
          id,
          type: socket_io_parser_1.PacketType.ACK,
          data: args
        });
        sent = true;
      };
    }
    onack(packet) {
      const ack = this.acks.get(packet.id);
      if (typeof ack == "function") {
        debug("calling ack %s with %j", packet.id, packet.data);
        ack.apply(this, packet.data);
        this.acks.delete(packet.id);
      } else {
        debug("bad ack %s", packet.id);
      }
    }
    ondisconnect() {
      debug("got disconnect packet");
      this._onclose("client namespace disconnect");
    }
    _onerror(err) {
      this.emitReserved("error", err);
    }
    _onclose(reason, description) {
      if (!this.connected)
        return this;
      debug("closing socket - reason %s", reason);
      this.emitReserved("disconnecting", reason, description);
      if (this.server._opts.connectionStateRecovery && RECOVERABLE_DISCONNECT_REASONS.has(reason)) {
        debug("connection state recovery is enabled for sid %s", this.id);
        this.adapter.persistSession({
          sid: this.id,
          pid: this.pid,
          rooms: [...this.rooms],
          data: this.data
        });
      }
      this._cleanup();
      this.client._remove(this);
      this.connected = false;
      this.emitReserved("disconnect", reason, description);
      return;
    }
    _cleanup() {
      this.leaveAll();
      this.nsp._remove(this);
      this.join = noop;
    }
    _error(err) {
      this.packet({ type: socket_io_parser_1.PacketType.CONNECT_ERROR, data: err });
    }
    disconnect(close = false) {
      if (!this.connected)
        return this;
      if (close) {
        this.client._disconnect();
      } else {
        this.packet({ type: socket_io_parser_1.PacketType.DISCONNECT });
        this._onclose("server namespace disconnect");
      }
      return this;
    }
    compress(compress) {
      this.flags.compress = compress;
      return this;
    }
    get volatile() {
      this.flags.volatile = true;
      return this;
    }
    get broadcast() {
      return this.newBroadcastOperator();
    }
    get local() {
      return this.newBroadcastOperator().local;
    }
    timeout(timeout) {
      this.flags.timeout = timeout;
      return this;
    }
    dispatch(event) {
      debug("dispatching an event %j", event);
      this.run(event, (err) => {
        process.nextTick(() => {
          if (err) {
            return this._onerror(err);
          }
          if (this.connected) {
            super.emitUntyped.apply(this, event);
          } else {
            debug("ignore packet received after disconnection");
          }
        });
      });
    }
    use(fn) {
      this.fns.push(fn);
      return this;
    }
    run(event, fn) {
      if (!this.fns.length)
        return fn();
      const fns = this.fns.slice(0);
      function run(i) {
        fns[i](event, (err) => {
          if (err)
            return fn(err);
          if (!fns[i + 1])
            return fn();
          run(i + 1);
        });
      }
      run(0);
    }
    get disconnected() {
      return !this.connected;
    }
    get request() {
      return this.client.request;
    }
    get conn() {
      return this.client.conn;
    }
    get rooms() {
      return this.adapter.socketRooms(this.id) || new Set;
    }
    onAny(listener) {
      this._anyListeners = this._anyListeners || [];
      this._anyListeners.push(listener);
      return this;
    }
    prependAny(listener) {
      this._anyListeners = this._anyListeners || [];
      this._anyListeners.unshift(listener);
      return this;
    }
    offAny(listener) {
      if (!this._anyListeners) {
        return this;
      }
      if (listener) {
        const listeners = this._anyListeners;
        for (let i = 0;i < listeners.length; i++) {
          if (listener === listeners[i]) {
            listeners.splice(i, 1);
            return this;
          }
        }
      } else {
        this._anyListeners = [];
      }
      return this;
    }
    listenersAny() {
      return this._anyListeners || [];
    }
    onAnyOutgoing(listener) {
      this._anyOutgoingListeners = this._anyOutgoingListeners || [];
      this._anyOutgoingListeners.push(listener);
      return this;
    }
    prependAnyOutgoing(listener) {
      this._anyOutgoingListeners = this._anyOutgoingListeners || [];
      this._anyOutgoingListeners.unshift(listener);
      return this;
    }
    offAnyOutgoing(listener) {
      if (!this._anyOutgoingListeners) {
        return this;
      }
      if (listener) {
        const listeners = this._anyOutgoingListeners;
        for (let i = 0;i < listeners.length; i++) {
          if (listener === listeners[i]) {
            listeners.splice(i, 1);
            return this;
          }
        }
      } else {
        this._anyOutgoingListeners = [];
      }
      return this;
    }
    listenersAnyOutgoing() {
      return this._anyOutgoingListeners || [];
    }
    notifyOutgoingListeners(packet) {
      if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
        const listeners = this._anyOutgoingListeners.slice();
        for (const listener of listeners) {
          listener.apply(this, packet.data);
        }
      }
    }
    newBroadcastOperator() {
      const flags = Object.assign({}, this.flags);
      this.flags = {};
      return new broadcast_operator_1.BroadcastOperator(this.adapter, new Set, new Set([this.id]), flags);
    }
  }
  exports.Socket = Socket;
});

// mini-services/ironsight-room/node_modules/socket.io/dist/namespace.js
var require_namespace = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Namespace = exports.RESERVED_EVENTS = undefined;
  var socket_1 = require_socket2();
  var typed_events_1 = require_typed_events();
  var debug_1 = __importDefault(require_src());
  var broadcast_operator_1 = require_broadcast_operator();
  var debug = (0, debug_1.default)("socket.io:namespace");
  exports.RESERVED_EVENTS = new Set(["connect", "connection", "new_namespace"]);

  class Namespace extends typed_events_1.StrictEventEmitter {
    constructor(server, name) {
      super();
      this.sockets = new Map;
      this._preConnectSockets = new Map;
      this._fns = [];
      this._ids = 0;
      this.server = server;
      this.name = name;
      this._initAdapter();
    }
    _initAdapter() {
      this.adapter = new (this.server.adapter())(this);
      Promise.resolve(this.adapter.init()).catch((err) => {
        debug("error while initializing adapter: %s", err);
      });
    }
    use(fn) {
      this._fns.push(fn);
      return this;
    }
    run(socket, fn) {
      if (!this._fns.length)
        return fn();
      const fns = this._fns.slice(0);
      function run(i) {
        fns[i](socket, (err) => {
          if (err)
            return fn(err);
          if (!fns[i + 1])
            return fn();
          run(i + 1);
        });
      }
      run(0);
    }
    to(room) {
      return new broadcast_operator_1.BroadcastOperator(this.adapter).to(room);
    }
    in(room) {
      return new broadcast_operator_1.BroadcastOperator(this.adapter).in(room);
    }
    except(room) {
      return new broadcast_operator_1.BroadcastOperator(this.adapter).except(room);
    }
    async _add(client, auth, fn) {
      var _a;
      debug("adding socket to nsp %s", this.name);
      const socket = await this._createSocket(client, auth);
      this._preConnectSockets.set(socket.id, socket);
      if (((_a = this.server.opts.connectionStateRecovery) === null || _a === undefined ? undefined : _a.skipMiddlewares) && socket.recovered && client.conn.readyState === "open") {
        return this._doConnect(socket, fn);
      }
      this.run(socket, (err) => {
        process.nextTick(() => {
          if (client.conn.readyState !== "open") {
            debug("next called after client was closed - ignoring socket");
            socket._cleanup();
            return;
          }
          if (err) {
            debug("middleware error, sending CONNECT_ERROR packet to the client");
            socket._cleanup();
            if (client.conn.protocol === 3) {
              return socket._error(err.data || err.message);
            } else {
              return socket._error({
                message: err.message,
                data: err.data
              });
            }
          }
          this._doConnect(socket, fn);
        });
      });
    }
    async _createSocket(client, auth) {
      const sessionId = auth.pid;
      const offset = auth.offset;
      if (this.server.opts.connectionStateRecovery && typeof sessionId === "string" && typeof offset === "string") {
        let session;
        try {
          session = await this.adapter.restoreSession(sessionId, offset);
        } catch (e) {
          debug("error while restoring session: %s", e);
        }
        if (session) {
          debug("connection state recovered for sid %s", session.sid);
          return new socket_1.Socket(this, client, auth, session);
        }
      }
      return new socket_1.Socket(this, client, auth);
    }
    _doConnect(socket, fn) {
      this._preConnectSockets.delete(socket.id);
      this.sockets.set(socket.id, socket);
      socket._onconnect();
      if (fn)
        fn(socket);
      this.emitReserved("connect", socket);
      this.emitReserved("connection", socket);
    }
    _remove(socket) {
      this.sockets.delete(socket.id) || this._preConnectSockets.delete(socket.id);
    }
    emit(ev, ...args) {
      return new broadcast_operator_1.BroadcastOperator(this.adapter).emit(ev, ...args);
    }
    send(...args) {
      this.emit("message", ...args);
      return this;
    }
    write(...args) {
      this.emit("message", ...args);
      return this;
    }
    serverSideEmit(ev, ...args) {
      if (exports.RESERVED_EVENTS.has(ev)) {
        throw new Error(`"${String(ev)}" is a reserved event name`);
      }
      args.unshift(ev);
      this.adapter.serverSideEmit(args);
      return true;
    }
    serverSideEmitWithAck(ev, ...args) {
      return new Promise((resolve, reject) => {
        args.push((err, responses) => {
          if (err) {
            err.responses = responses;
            return reject(err);
          } else {
            return resolve(responses);
          }
        });
        this.serverSideEmit(ev, ...args);
      });
    }
    _onServerSideEmit(args) {
      super.emitUntyped.apply(this, args);
    }
    allSockets() {
      return new broadcast_operator_1.BroadcastOperator(this.adapter).allSockets();
    }
    compress(compress) {
      return new broadcast_operator_1.BroadcastOperator(this.adapter).compress(compress);
    }
    get volatile() {
      return new broadcast_operator_1.BroadcastOperator(this.adapter).volatile;
    }
    get local() {
      return new broadcast_operator_1.BroadcastOperator(this.adapter).local;
    }
    timeout(timeout) {
      return new broadcast_operator_1.BroadcastOperator(this.adapter).timeout(timeout);
    }
    fetchSockets() {
      return new broadcast_operator_1.BroadcastOperator(this.adapter).fetchSockets();
    }
    socketsJoin(room) {
      return new broadcast_operator_1.BroadcastOperator(this.adapter).socketsJoin(room);
    }
    socketsLeave(room) {
      return new broadcast_operator_1.BroadcastOperator(this.adapter).socketsLeave(room);
    }
    disconnectSockets(close = false) {
      return new broadcast_operator_1.BroadcastOperator(this.adapter).disconnectSockets(close);
    }
  }
  exports.Namespace = Namespace;
});

// mini-services/ironsight-room/node_modules/socket.io-adapter/dist/contrib/yeast.js
var require_yeast = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.encode = encode;
  exports.decode = decode;
  exports.yeast = yeast;
  var alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_".split("");
  var length = 64;
  var map = {};
  var seed = 0;
  var i = 0;
  var prev;
  function encode(num) {
    let encoded = "";
    do {
      encoded = alphabet[num % length] + encoded;
      num = Math.floor(num / length);
    } while (num > 0);
    return encoded;
  }
  function decode(str) {
    let decoded = 0;
    for (i = 0;i < str.length; i++) {
      decoded = decoded * length + map[str.charAt(i)];
    }
    return decoded;
  }
  function yeast() {
    const now = encode(+new Date);
    if (now !== prev)
      return seed = 0, prev = now;
    return now + "." + encode(seed++);
  }
  for (;i < length; i++)
    map[alphabet[i]] = i;
});

// mini-services/ironsight-room/node_modules/socket.io-adapter/dist/in-memory-adapter.js
var require_in_memory_adapter = __commonJS((exports) => {
  var _a;
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.SessionAwareAdapter = exports.Adapter = undefined;
  var events_1 = __require("events");
  var yeast_1 = require_yeast();
  var WebSocket = __require("ws");
  var canPreComputeFrame = typeof ((_a = WebSocket === null || WebSocket === undefined ? undefined : WebSocket.Sender) === null || _a === undefined ? undefined : _a.frame) === "function";

  class Adapter extends events_1.EventEmitter {
    constructor(nsp) {
      super();
      this.nsp = nsp;
      this.rooms = new Map;
      this.sids = new Map;
      this.encoder = nsp.server.encoder;
    }
    init() {}
    close() {}
    serverCount() {
      return Promise.resolve(1);
    }
    addAll(id, rooms) {
      if (!this.sids.has(id)) {
        this.sids.set(id, new Set);
      }
      for (const room of rooms) {
        this.sids.get(id).add(room);
        if (!this.rooms.has(room)) {
          this.rooms.set(room, new Set);
          this.emit("create-room", room);
        }
        if (!this.rooms.get(room).has(id)) {
          this.rooms.get(room).add(id);
          this.emit("join-room", room, id);
        }
      }
    }
    del(id, room) {
      if (this.sids.has(id)) {
        this.sids.get(id).delete(room);
      }
      this._del(room, id);
    }
    _del(room, id) {
      const _room = this.rooms.get(room);
      if (_room != null) {
        const deleted = _room.delete(id);
        if (deleted) {
          this.emit("leave-room", room, id);
        }
        if (_room.size === 0 && this.rooms.delete(room)) {
          this.emit("delete-room", room);
        }
      }
    }
    delAll(id) {
      if (!this.sids.has(id)) {
        return;
      }
      for (const room of this.sids.get(id)) {
        this._del(room, id);
      }
      this.sids.delete(id);
    }
    broadcast(packet, opts) {
      const flags = opts.flags || {};
      const packetOpts = {
        preEncoded: true,
        volatile: flags.volatile,
        compress: flags.compress
      };
      packet.nsp = this.nsp.name;
      const encodedPackets = this._encode(packet, packetOpts);
      this.apply(opts, (socket) => {
        if (typeof socket.notifyOutgoingListeners === "function") {
          socket.notifyOutgoingListeners(packet);
        }
        socket.client.writeToEngine(encodedPackets, packetOpts);
      });
    }
    broadcastWithAck(packet, opts, clientCountCallback, ack) {
      const flags = opts.flags || {};
      const packetOpts = {
        preEncoded: true,
        volatile: flags.volatile,
        compress: flags.compress
      };
      packet.nsp = this.nsp.name;
      packet.id = this.nsp._ids++;
      const encodedPackets = this._encode(packet, packetOpts);
      let clientCount = 0;
      this.apply(opts, (socket) => {
        clientCount++;
        socket.acks.set(packet.id, ack);
        if (typeof socket.notifyOutgoingListeners === "function") {
          socket.notifyOutgoingListeners(packet);
        }
        socket.client.writeToEngine(encodedPackets, packetOpts);
      });
      clientCountCallback(clientCount);
    }
    _encode(packet, packetOpts) {
      const encodedPackets = this.encoder.encode(packet);
      if (canPreComputeFrame && encodedPackets.length === 1 && typeof encodedPackets[0] === "string") {
        const data = Buffer.from("4" + encodedPackets[0]);
        packetOpts.wsPreEncodedFrame = WebSocket.Sender.frame(data, {
          readOnly: false,
          mask: false,
          rsv1: false,
          opcode: 1,
          fin: true
        });
      }
      return encodedPackets;
    }
    sockets(rooms) {
      const sids = new Set;
      this.apply({ rooms }, (socket) => {
        sids.add(socket.id);
      });
      return Promise.resolve(sids);
    }
    socketRooms(id) {
      return this.sids.get(id);
    }
    fetchSockets(opts) {
      const sockets = [];
      this.apply(opts, (socket) => {
        sockets.push(socket);
      });
      return Promise.resolve(sockets);
    }
    addSockets(opts, rooms) {
      this.apply(opts, (socket) => {
        socket.join(rooms);
      });
    }
    delSockets(opts, rooms) {
      this.apply(opts, (socket) => {
        rooms.forEach((room) => socket.leave(room));
      });
    }
    disconnectSockets(opts, close) {
      this.apply(opts, (socket) => {
        socket.disconnect(close);
      });
    }
    apply(opts, callback) {
      const rooms = opts.rooms;
      const except = this.computeExceptSids(opts.except);
      if (rooms.size) {
        const ids = new Set;
        for (const room of rooms) {
          if (!this.rooms.has(room))
            continue;
          for (const id of this.rooms.get(room)) {
            if (ids.has(id) || except.has(id))
              continue;
            const socket = this.nsp.sockets.get(id);
            if (socket) {
              callback(socket);
              ids.add(id);
            }
          }
        }
      } else {
        for (const [id] of this.sids) {
          if (except.has(id))
            continue;
          const socket = this.nsp.sockets.get(id);
          if (socket)
            callback(socket);
        }
      }
    }
    computeExceptSids(exceptRooms) {
      const exceptSids = new Set;
      if (exceptRooms && exceptRooms.size > 0) {
        for (const room of exceptRooms) {
          if (this.rooms.has(room)) {
            this.rooms.get(room).forEach((sid) => exceptSids.add(sid));
          }
        }
      }
      return exceptSids;
    }
    serverSideEmit(packet) {
      console.warn("this adapter does not support the serverSideEmit() functionality");
    }
    persistSession(session) {}
    restoreSession(pid, offset) {
      return null;
    }
  }
  exports.Adapter = Adapter;

  class SessionAwareAdapter extends Adapter {
    constructor(nsp) {
      super(nsp);
      this.nsp = nsp;
      this.sessions = new Map;
      this.packets = [];
      this.maxDisconnectionDuration = nsp.server.opts.connectionStateRecovery.maxDisconnectionDuration;
      const timer = setInterval(() => {
        const threshold = Date.now() - this.maxDisconnectionDuration;
        this.sessions.forEach((session, sessionId) => {
          const hasExpired = session.disconnectedAt < threshold;
          if (hasExpired) {
            this.sessions.delete(sessionId);
          }
        });
        for (let i = this.packets.length - 1;i >= 0; i--) {
          const hasExpired = this.packets[i].emittedAt < threshold;
          if (hasExpired) {
            this.packets.splice(0, i + 1);
            break;
          }
        }
      }, 60 * 1000);
      timer.unref();
    }
    persistSession(session) {
      session.disconnectedAt = Date.now();
      this.sessions.set(session.pid, session);
    }
    restoreSession(pid, offset) {
      const session = this.sessions.get(pid);
      if (!session) {
        return null;
      }
      const hasExpired = session.disconnectedAt + this.maxDisconnectionDuration < Date.now();
      if (hasExpired) {
        this.sessions.delete(pid);
        return null;
      }
      const index = this.packets.findIndex((packet) => packet.id === offset);
      if (index === -1) {
        return null;
      }
      const missedPackets = [];
      for (let i = index + 1;i < this.packets.length; i++) {
        const packet = this.packets[i];
        if (shouldIncludePacket(session.rooms, packet.opts)) {
          missedPackets.push(packet.data);
        }
      }
      return Promise.resolve(Object.assign(Object.assign({}, session), { missedPackets }));
    }
    broadcast(packet, opts) {
      var _a2;
      const isEventPacket = packet.type === 2;
      const withoutAcknowledgement = packet.id === undefined;
      const notVolatile = ((_a2 = opts.flags) === null || _a2 === undefined ? undefined : _a2.volatile) === undefined;
      if (isEventPacket && withoutAcknowledgement && notVolatile) {
        const id = (0, yeast_1.yeast)();
        packet.data.push(id);
        this.packets.push({
          id,
          opts,
          data: packet.data,
          emittedAt: Date.now()
        });
      }
      super.broadcast(packet, opts);
    }
  }
  exports.SessionAwareAdapter = SessionAwareAdapter;
  function shouldIncludePacket(sessionRooms, opts) {
    const included = opts.rooms.size === 0 || sessionRooms.some((room) => opts.rooms.has(room));
    const notExcluded = sessionRooms.every((room) => !opts.except.has(room));
    return included && notExcluded;
  }
});

// mini-services/ironsight-room/node_modules/socket.io-adapter/dist/cluster-adapter.js
var require_cluster_adapter = __commonJS((exports) => {
  var __rest = exports && exports.__rest || function(s, e) {
    var t = {};
    for (var p in s)
      if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s);i < p.length; i++) {
        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
          t[p[i]] = s[p[i]];
      }
    return t;
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ClusterAdapterWithHeartbeat = exports.ClusterAdapter = exports.MessageType = undefined;
  var in_memory_adapter_1 = require_in_memory_adapter();
  var debug_1 = require_src();
  var crypto_1 = __require("crypto");
  var debug = (0, debug_1.debug)("socket.io-adapter");
  var EMITTER_UID = "emitter";
  var DEFAULT_TIMEOUT = 5000;
  function randomId() {
    return (0, crypto_1.randomBytes)(8).toString("hex");
  }
  var MessageType;
  (function(MessageType2) {
    MessageType2[MessageType2["INITIAL_HEARTBEAT"] = 1] = "INITIAL_HEARTBEAT";
    MessageType2[MessageType2["HEARTBEAT"] = 2] = "HEARTBEAT";
    MessageType2[MessageType2["BROADCAST"] = 3] = "BROADCAST";
    MessageType2[MessageType2["SOCKETS_JOIN"] = 4] = "SOCKETS_JOIN";
    MessageType2[MessageType2["SOCKETS_LEAVE"] = 5] = "SOCKETS_LEAVE";
    MessageType2[MessageType2["DISCONNECT_SOCKETS"] = 6] = "DISCONNECT_SOCKETS";
    MessageType2[MessageType2["FETCH_SOCKETS"] = 7] = "FETCH_SOCKETS";
    MessageType2[MessageType2["FETCH_SOCKETS_RESPONSE"] = 8] = "FETCH_SOCKETS_RESPONSE";
    MessageType2[MessageType2["SERVER_SIDE_EMIT"] = 9] = "SERVER_SIDE_EMIT";
    MessageType2[MessageType2["SERVER_SIDE_EMIT_RESPONSE"] = 10] = "SERVER_SIDE_EMIT_RESPONSE";
    MessageType2[MessageType2["BROADCAST_CLIENT_COUNT"] = 11] = "BROADCAST_CLIENT_COUNT";
    MessageType2[MessageType2["BROADCAST_ACK"] = 12] = "BROADCAST_ACK";
    MessageType2[MessageType2["ADAPTER_CLOSE"] = 13] = "ADAPTER_CLOSE";
  })(MessageType || (exports.MessageType = MessageType = {}));
  function encodeOptions(opts) {
    return {
      rooms: [...opts.rooms],
      except: [...opts.except],
      flags: opts.flags
    };
  }
  function decodeOptions(opts) {
    return {
      rooms: new Set(opts.rooms),
      except: new Set(opts.except),
      flags: opts.flags
    };
  }

  class ClusterAdapter extends in_memory_adapter_1.Adapter {
    constructor(nsp) {
      super(nsp);
      this.requests = new Map;
      this.ackRequests = new Map;
      this.uid = randomId();
    }
    onMessage(message, offset) {
      if (message.uid === this.uid) {
        return debug("[%s] ignore message from self", this.uid);
      }
      if (message.nsp !== this.nsp.name) {
        return debug("[%s] ignore message from another namespace (%s)", this.uid, message.nsp);
      }
      debug("[%s] new event of type %d from %s", this.uid, message.type, message.uid);
      switch (message.type) {
        case MessageType.BROADCAST: {
          const withAck = message.data.requestId !== undefined;
          if (withAck) {
            super.broadcastWithAck(message.data.packet, decodeOptions(message.data.opts), (clientCount) => {
              debug("[%s] waiting for %d client acknowledgements", this.uid, clientCount);
              this.publishResponse(message.uid, {
                type: MessageType.BROADCAST_CLIENT_COUNT,
                data: {
                  requestId: message.data.requestId,
                  clientCount
                }
              });
            }, (arg) => {
              debug("[%s] received acknowledgement with value %j", this.uid, arg);
              this.publishResponse(message.uid, {
                type: MessageType.BROADCAST_ACK,
                data: {
                  requestId: message.data.requestId,
                  packet: arg
                }
              });
            });
          } else {
            const packet = message.data.packet;
            const opts = decodeOptions(message.data.opts);
            this.addOffsetIfNecessary(packet, opts, offset);
            super.broadcast(packet, opts);
          }
          break;
        }
        case MessageType.SOCKETS_JOIN:
          super.addSockets(decodeOptions(message.data.opts), message.data.rooms);
          break;
        case MessageType.SOCKETS_LEAVE:
          super.delSockets(decodeOptions(message.data.opts), message.data.rooms);
          break;
        case MessageType.DISCONNECT_SOCKETS:
          super.disconnectSockets(decodeOptions(message.data.opts), message.data.close);
          break;
        case MessageType.FETCH_SOCKETS: {
          debug("[%s] calling fetchSockets with opts %j", this.uid, message.data.opts);
          super.fetchSockets(decodeOptions(message.data.opts)).then((localSockets) => {
            this.publishResponse(message.uid, {
              type: MessageType.FETCH_SOCKETS_RESPONSE,
              data: {
                requestId: message.data.requestId,
                sockets: localSockets.map((socket) => {
                  const _a = socket.handshake, { sessionStore } = _a, handshake = __rest(_a, ["sessionStore"]);
                  return {
                    id: socket.id,
                    handshake,
                    rooms: [...socket.rooms],
                    data: socket.data
                  };
                })
              }
            });
          });
          break;
        }
        case MessageType.SERVER_SIDE_EMIT: {
          const packet = message.data.packet;
          const withAck = message.data.requestId !== undefined;
          if (!withAck) {
            this.nsp._onServerSideEmit(packet);
            return;
          }
          let called = false;
          const callback = (arg) => {
            if (called) {
              return;
            }
            called = true;
            debug("[%s] calling acknowledgement with %j", this.uid, arg);
            this.publishResponse(message.uid, {
              type: MessageType.SERVER_SIDE_EMIT_RESPONSE,
              data: {
                requestId: message.data.requestId,
                packet: arg
              }
            });
          };
          this.nsp._onServerSideEmit([...packet, callback]);
          break;
        }
        case MessageType.BROADCAST_CLIENT_COUNT:
        case MessageType.BROADCAST_ACK:
        case MessageType.FETCH_SOCKETS_RESPONSE:
        case MessageType.SERVER_SIDE_EMIT_RESPONSE:
          this.onResponse(message);
          break;
        default:
          debug("[%s] unknown message type: %s", this.uid, message.type);
      }
    }
    onResponse(response) {
      var _a, _b;
      const requestId = response.data.requestId;
      debug("[%s] received response %s to request %s", this.uid, response.type, requestId);
      switch (response.type) {
        case MessageType.BROADCAST_CLIENT_COUNT: {
          (_a = this.ackRequests.get(requestId)) === null || _a === undefined || _a.clientCountCallback(response.data.clientCount);
          break;
        }
        case MessageType.BROADCAST_ACK: {
          (_b = this.ackRequests.get(requestId)) === null || _b === undefined || _b.ack(response.data.packet);
          break;
        }
        case MessageType.FETCH_SOCKETS_RESPONSE: {
          const request = this.requests.get(requestId);
          if (!request) {
            return;
          }
          request.current++;
          response.data.sockets.forEach((socket) => request.responses.push(socket));
          if (request.current === request.expected) {
            clearTimeout(request.timeout);
            request.resolve(request.responses);
            this.requests.delete(requestId);
          }
          break;
        }
        case MessageType.SERVER_SIDE_EMIT_RESPONSE: {
          const request = this.requests.get(requestId);
          if (!request) {
            return;
          }
          request.current++;
          request.responses.push(response.data.packet);
          if (request.current === request.expected) {
            clearTimeout(request.timeout);
            request.resolve(null, request.responses);
            this.requests.delete(requestId);
          }
          break;
        }
        default:
          debug("[%s] unknown response type: %s", this.uid, response.type);
      }
    }
    async broadcast(packet, opts) {
      var _a;
      const onlyLocal = (_a = opts.flags) === null || _a === undefined ? undefined : _a.local;
      if (!onlyLocal) {
        try {
          const offset = await this.publishAndReturnOffset({
            type: MessageType.BROADCAST,
            data: {
              packet,
              opts: encodeOptions(opts)
            }
          });
          this.addOffsetIfNecessary(packet, opts, offset);
        } catch (e) {
          debug("[%s] error while broadcasting message: %s", this.uid, e.message);
        }
      }
      super.broadcast(packet, opts);
    }
    addOffsetIfNecessary(packet, opts, offset) {
      var _a;
      if (!this.nsp.server.opts.connectionStateRecovery) {
        return;
      }
      const isEventPacket = packet.type === 2;
      const withoutAcknowledgement = packet.id === undefined;
      const notVolatile = ((_a = opts.flags) === null || _a === undefined ? undefined : _a.volatile) === undefined;
      if (isEventPacket && withoutAcknowledgement && notVolatile) {
        packet.data.push(offset);
      }
    }
    broadcastWithAck(packet, opts, clientCountCallback, ack) {
      var _a;
      const onlyLocal = (_a = opts === null || opts === undefined ? undefined : opts.flags) === null || _a === undefined ? undefined : _a.local;
      if (!onlyLocal) {
        const requestId = randomId();
        this.ackRequests.set(requestId, {
          clientCountCallback,
          ack
        });
        this.publish({
          type: MessageType.BROADCAST,
          data: {
            packet,
            requestId,
            opts: encodeOptions(opts)
          }
        });
        setTimeout(() => {
          this.ackRequests.delete(requestId);
        }, opts.flags.timeout);
      }
      super.broadcastWithAck(packet, opts, clientCountCallback, ack);
    }
    async addSockets(opts, rooms) {
      var _a;
      const onlyLocal = (_a = opts.flags) === null || _a === undefined ? undefined : _a.local;
      if (!onlyLocal) {
        try {
          await this.publishAndReturnOffset({
            type: MessageType.SOCKETS_JOIN,
            data: {
              opts: encodeOptions(opts),
              rooms
            }
          });
        } catch (e) {
          debug("[%s] error while publishing message: %s", this.uid, e.message);
        }
      }
      super.addSockets(opts, rooms);
    }
    async delSockets(opts, rooms) {
      var _a;
      const onlyLocal = (_a = opts.flags) === null || _a === undefined ? undefined : _a.local;
      if (!onlyLocal) {
        try {
          await this.publishAndReturnOffset({
            type: MessageType.SOCKETS_LEAVE,
            data: {
              opts: encodeOptions(opts),
              rooms
            }
          });
        } catch (e) {
          debug("[%s] error while publishing message: %s", this.uid, e.message);
        }
      }
      super.delSockets(opts, rooms);
    }
    async disconnectSockets(opts, close) {
      var _a;
      const onlyLocal = (_a = opts.flags) === null || _a === undefined ? undefined : _a.local;
      if (!onlyLocal) {
        try {
          await this.publishAndReturnOffset({
            type: MessageType.DISCONNECT_SOCKETS,
            data: {
              opts: encodeOptions(opts),
              close
            }
          });
        } catch (e) {
          debug("[%s] error while publishing message: %s", this.uid, e.message);
        }
      }
      super.disconnectSockets(opts, close);
    }
    async fetchSockets(opts) {
      var _a;
      const [localSockets, serverCount] = await Promise.all([
        super.fetchSockets(opts),
        this.serverCount()
      ]);
      const expectedResponseCount = serverCount - 1;
      if (((_a = opts.flags) === null || _a === undefined ? undefined : _a.local) || expectedResponseCount <= 0) {
        return localSockets;
      }
      const requestId = randomId();
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const storedRequest2 = this.requests.get(requestId);
          if (storedRequest2) {
            reject(new Error(`timeout reached: only ${storedRequest2.current} responses received out of ${storedRequest2.expected}`));
            this.requests.delete(requestId);
          }
        }, opts.flags.timeout || DEFAULT_TIMEOUT);
        const storedRequest = {
          type: MessageType.FETCH_SOCKETS,
          resolve,
          timeout,
          current: 0,
          expected: expectedResponseCount,
          responses: localSockets
        };
        this.requests.set(requestId, storedRequest);
        this.publish({
          type: MessageType.FETCH_SOCKETS,
          data: {
            opts: encodeOptions(opts),
            requestId
          }
        });
      });
    }
    async serverSideEmit(packet) {
      const withAck = typeof packet[packet.length - 1] === "function";
      if (!withAck) {
        return this.publish({
          type: MessageType.SERVER_SIDE_EMIT,
          data: {
            packet
          }
        });
      }
      const ack = packet.pop();
      const expectedResponseCount = await this.serverCount() - 1;
      debug('[%s] waiting for %d responses to "serverSideEmit" request', this.uid, expectedResponseCount);
      if (expectedResponseCount <= 0) {
        return ack(null, []);
      }
      const requestId = randomId();
      const timeout = setTimeout(() => {
        const storedRequest2 = this.requests.get(requestId);
        if (storedRequest2) {
          ack(new Error(`timeout reached: only ${storedRequest2.current} responses received out of ${storedRequest2.expected}`), storedRequest2.responses);
          this.requests.delete(requestId);
        }
      }, DEFAULT_TIMEOUT);
      const storedRequest = {
        type: MessageType.SERVER_SIDE_EMIT,
        resolve: ack,
        timeout,
        current: 0,
        expected: expectedResponseCount,
        responses: []
      };
      this.requests.set(requestId, storedRequest);
      this.publish({
        type: MessageType.SERVER_SIDE_EMIT,
        data: {
          requestId,
          packet
        }
      });
    }
    publish(message) {
      debug("[%s] sending message %s", this.uid, message.type);
      this.publishAndReturnOffset(message).catch((err) => {
        debug("[%s] error while publishing message: %s", this.uid, err);
      });
    }
    publishAndReturnOffset(message) {
      message.uid = this.uid;
      message.nsp = this.nsp.name;
      return this.doPublish(message);
    }
    publishResponse(requesterUid, response) {
      response.uid = this.uid;
      response.nsp = this.nsp.name;
      debug("[%s] sending response %s to %s", this.uid, response.type, requesterUid);
      this.doPublishResponse(requesterUid, response).catch((err) => {
        debug("[%s] error while publishing response: %s", this.uid, err);
      });
    }
  }
  exports.ClusterAdapter = ClusterAdapter;

  class ClusterAdapterWithHeartbeat extends ClusterAdapter {
    constructor(nsp, opts) {
      super(nsp);
      this.nodesMap = new Map;
      this.customRequests = new Map;
      this._opts = Object.assign({
        heartbeatInterval: 5000,
        heartbeatTimeout: 1e4
      }, opts);
      this.cleanupTimer = setInterval(() => {
        const now = Date.now();
        this.nodesMap.forEach((lastSeen, uid) => {
          const nodeSeemsDown = now - lastSeen > this._opts.heartbeatTimeout;
          if (nodeSeemsDown) {
            debug("[%s] node %s seems down", this.uid, uid);
            this.removeNode(uid);
          }
        });
      }, 1000);
    }
    init() {
      this.publish({
        type: MessageType.INITIAL_HEARTBEAT
      });
    }
    scheduleHeartbeat() {
      if (this.heartbeatTimer) {
        this.heartbeatTimer.refresh();
      } else {
        this.heartbeatTimer = setTimeout(() => {
          this.publish({
            type: MessageType.HEARTBEAT
          });
        }, this._opts.heartbeatInterval);
      }
    }
    close() {
      this.publish({
        type: MessageType.ADAPTER_CLOSE
      });
      clearTimeout(this.heartbeatTimer);
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
      }
    }
    onMessage(message, offset) {
      if (message.uid === this.uid) {
        return debug("[%s] ignore message from self", this.uid);
      }
      if (message.uid && message.uid !== EMITTER_UID) {
        this.nodesMap.set(message.uid, Date.now());
      }
      switch (message.type) {
        case MessageType.INITIAL_HEARTBEAT:
          this.publish({
            type: MessageType.HEARTBEAT
          });
          break;
        case MessageType.HEARTBEAT:
          break;
        case MessageType.ADAPTER_CLOSE:
          this.removeNode(message.uid);
          break;
        default:
          super.onMessage(message, offset);
      }
    }
    serverCount() {
      return Promise.resolve(1 + this.nodesMap.size);
    }
    publish(message) {
      this.scheduleHeartbeat();
      return super.publish(message);
    }
    async serverSideEmit(packet) {
      const withAck = typeof packet[packet.length - 1] === "function";
      if (!withAck) {
        return this.publish({
          type: MessageType.SERVER_SIDE_EMIT,
          data: {
            packet
          }
        });
      }
      const ack = packet.pop();
      const expectedResponseCount = this.nodesMap.size;
      debug('[%s] waiting for %d responses to "serverSideEmit" request', this.uid, expectedResponseCount);
      if (expectedResponseCount <= 0) {
        return ack(null, []);
      }
      const requestId = randomId();
      const timeout = setTimeout(() => {
        const storedRequest2 = this.customRequests.get(requestId);
        if (storedRequest2) {
          ack(new Error(`timeout reached: missing ${storedRequest2.missingUids.size} responses`), storedRequest2.responses);
          this.customRequests.delete(requestId);
        }
      }, DEFAULT_TIMEOUT);
      const storedRequest = {
        type: MessageType.SERVER_SIDE_EMIT,
        resolve: ack,
        timeout,
        missingUids: new Set([...this.nodesMap.keys()]),
        responses: []
      };
      this.customRequests.set(requestId, storedRequest);
      this.publish({
        type: MessageType.SERVER_SIDE_EMIT,
        data: {
          requestId,
          packet
        }
      });
    }
    async fetchSockets(opts) {
      var _a;
      const [localSockets, serverCount] = await Promise.all([
        super.fetchSockets({
          rooms: opts.rooms,
          except: opts.except,
          flags: {
            local: true
          }
        }),
        this.serverCount()
      ]);
      const expectedResponseCount = serverCount - 1;
      if (((_a = opts.flags) === null || _a === undefined ? undefined : _a.local) || expectedResponseCount <= 0) {
        return localSockets;
      }
      const requestId = randomId();
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const storedRequest2 = this.customRequests.get(requestId);
          if (storedRequest2) {
            reject(new Error(`timeout reached: missing ${storedRequest2.missingUids.size} responses`));
            this.customRequests.delete(requestId);
          }
        }, opts.flags.timeout || DEFAULT_TIMEOUT);
        const storedRequest = {
          type: MessageType.FETCH_SOCKETS,
          resolve,
          timeout,
          missingUids: new Set([...this.nodesMap.keys()]),
          responses: localSockets
        };
        this.customRequests.set(requestId, storedRequest);
        this.publish({
          type: MessageType.FETCH_SOCKETS,
          data: {
            opts: encodeOptions(opts),
            requestId
          }
        });
      });
    }
    onResponse(response) {
      const requestId = response.data.requestId;
      debug("[%s] received response %s to request %s", this.uid, response.type, requestId);
      switch (response.type) {
        case MessageType.FETCH_SOCKETS_RESPONSE: {
          const request = this.customRequests.get(requestId);
          if (!request) {
            return;
          }
          response.data.sockets.forEach((socket) => request.responses.push(socket));
          request.missingUids.delete(response.uid);
          if (request.missingUids.size === 0) {
            clearTimeout(request.timeout);
            request.resolve(request.responses);
            this.customRequests.delete(requestId);
          }
          break;
        }
        case MessageType.SERVER_SIDE_EMIT_RESPONSE: {
          const request = this.customRequests.get(requestId);
          if (!request) {
            return;
          }
          request.responses.push(response.data.packet);
          request.missingUids.delete(response.uid);
          if (request.missingUids.size === 0) {
            clearTimeout(request.timeout);
            request.resolve(null, request.responses);
            this.customRequests.delete(requestId);
          }
          break;
        }
        default:
          super.onResponse(response);
      }
    }
    removeNode(uid) {
      this.customRequests.forEach((request, requestId) => {
        request.missingUids.delete(uid);
        if (request.missingUids.size === 0) {
          clearTimeout(request.timeout);
          if (request.type === MessageType.FETCH_SOCKETS) {
            request.resolve(request.responses);
          } else if (request.type === MessageType.SERVER_SIDE_EMIT) {
            request.resolve(null, request.responses);
          }
          this.customRequests.delete(requestId);
        }
      });
      this.nodesMap.delete(uid);
    }
  }
  exports.ClusterAdapterWithHeartbeat = ClusterAdapterWithHeartbeat;
});

// mini-services/ironsight-room/node_modules/socket.io-adapter/dist/index.js
var require_dist = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.MessageType = exports.ClusterAdapterWithHeartbeat = exports.ClusterAdapter = exports.SessionAwareAdapter = exports.Adapter = undefined;
  var in_memory_adapter_1 = require_in_memory_adapter();
  Object.defineProperty(exports, "Adapter", { enumerable: true, get: function() {
    return in_memory_adapter_1.Adapter;
  } });
  Object.defineProperty(exports, "SessionAwareAdapter", { enumerable: true, get: function() {
    return in_memory_adapter_1.SessionAwareAdapter;
  } });
  var cluster_adapter_1 = require_cluster_adapter();
  Object.defineProperty(exports, "ClusterAdapter", { enumerable: true, get: function() {
    return cluster_adapter_1.ClusterAdapter;
  } });
  Object.defineProperty(exports, "ClusterAdapterWithHeartbeat", { enumerable: true, get: function() {
    return cluster_adapter_1.ClusterAdapterWithHeartbeat;
  } });
  Object.defineProperty(exports, "MessageType", { enumerable: true, get: function() {
    return cluster_adapter_1.MessageType;
  } });
});

// mini-services/ironsight-room/node_modules/socket.io/dist/parent-namespace.js
var require_parent_namespace = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ParentNamespace = undefined;
  var namespace_1 = require_namespace();
  var socket_io_adapter_1 = require_dist();
  var debug_1 = __importDefault(require_src());
  var debug = (0, debug_1.default)("socket.io:parent-namespace");

  class ParentNamespace extends namespace_1.Namespace {
    constructor(server) {
      super(server, "/_" + ParentNamespace.count++);
      this.children = new Set;
    }
    _initAdapter() {
      this.adapter = new ParentBroadcastAdapter(this);
    }
    emit(ev, ...args) {
      this.children.forEach((nsp) => {
        nsp.emit(ev, ...args);
      });
      return true;
    }
    createChild(name) {
      debug("creating child namespace %s", name);
      const namespace = new namespace_1.Namespace(this.server, name);
      this["_fns"].forEach((fn) => namespace.use(fn));
      this.listeners("connect").forEach((listener) => namespace.on("connect", listener));
      this.listeners("connection").forEach((listener) => namespace.on("connection", listener));
      this.children.add(namespace);
      if (this.server._opts.cleanupEmptyChildNamespaces) {
        const remove = namespace._remove;
        namespace._remove = (socket) => {
          remove.call(namespace, socket);
          if (namespace.sockets.size === 0) {
            debug("closing child namespace %s", name);
            namespace.adapter.close();
            this.server._nsps.delete(namespace.name);
            this.children.delete(namespace);
          }
        };
      }
      this.server._nsps.set(name, namespace);
      this.server.sockets.emitReserved("new_namespace", namespace);
      return namespace;
    }
    fetchSockets() {
      throw new Error("fetchSockets() is not supported on parent namespaces");
    }
  }
  exports.ParentNamespace = ParentNamespace;
  ParentNamespace.count = 0;

  class ParentBroadcastAdapter extends socket_io_adapter_1.Adapter {
    broadcast(packet, opts) {
      this.nsp.children.forEach((nsp) => {
        nsp.adapter.broadcast(packet, opts);
      });
    }
  }
});

// mini-services/ironsight-room/node_modules/socket.io/dist/uws.js
var require_uws = __commonJS((exports) => {
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.patchAdapter = patchAdapter;
  exports.restoreAdapter = restoreAdapter;
  exports.serveFile = serveFile;
  var socket_io_adapter_1 = require_dist();
  var fs_1 = __require("fs");
  var debug_1 = __importDefault(require_src());
  var debug = (0, debug_1.default)("socket.io:adapter-uws");
  var SEPARATOR = "\x1F";
  var { addAll, del, broadcast } = socket_io_adapter_1.Adapter.prototype;
  function patchAdapter(app) {
    socket_io_adapter_1.Adapter.prototype.addAll = function(id, rooms) {
      const isNew = !this.sids.has(id);
      addAll.call(this, id, rooms);
      const socket = this.nsp.sockets.get(id) || this.nsp._preConnectSockets.get(id);
      if (!socket) {
        return;
      }
      if (socket.conn.transport.name === "websocket") {
        subscribe(this.nsp.name, socket, isNew, rooms);
        return;
      }
      if (isNew) {
        socket.conn.on("upgrade", () => {
          const rooms2 = this.sids.get(id);
          if (rooms2) {
            subscribe(this.nsp.name, socket, isNew, rooms2);
          }
        });
      }
    };
    socket_io_adapter_1.Adapter.prototype.del = function(id, room) {
      del.call(this, id, room);
      const socket = this.nsp.sockets.get(id) || this.nsp._preConnectSockets.get(id);
      if (socket && socket.conn.transport.name === "websocket") {
        const sessionId = socket.conn.id;
        const websocket = socket.conn.transport.socket;
        const topic = `${this.nsp.name}${SEPARATOR}${room}`;
        debug("unsubscribe connection %s from topic %s", sessionId, topic);
        websocket.unsubscribe(topic);
      }
    };
    socket_io_adapter_1.Adapter.prototype.broadcast = function(packet, opts) {
      const useFastPublish = opts.rooms.size <= 1 && opts.except.size === 0;
      if (!useFastPublish) {
        broadcast.call(this, packet, opts);
        return;
      }
      const flags = opts.flags || {};
      const basePacketOpts = {
        preEncoded: true,
        volatile: flags.volatile,
        compress: flags.compress
      };
      packet.nsp = this.nsp.name;
      const encodedPackets = this.encoder.encode(packet);
      const topic = opts.rooms.size === 0 ? this.nsp.name : `${this.nsp.name}${SEPARATOR}${opts.rooms.keys().next().value}`;
      debug("fast publish to %s", topic);
      encodedPackets.forEach((encodedPacket) => {
        const isBinary = typeof encodedPacket !== "string";
        app.publish(topic, isBinary ? encodedPacket : "4" + encodedPacket, isBinary);
      });
      this.apply(opts, (socket) => {
        if (socket.conn.transport.name !== "websocket") {
          socket.client.writeToEngine(encodedPackets, basePacketOpts);
        }
      });
    };
  }
  function subscribe(namespaceName, socket, isNew, rooms) {
    const sessionId = socket.conn.id;
    const websocket = socket.conn.transport.socket;
    if (isNew) {
      debug("subscribe connection %s to topic %s", sessionId, namespaceName);
      websocket.subscribe(namespaceName);
    }
    rooms.forEach((room) => {
      const topic = `${namespaceName}${SEPARATOR}${room}`;
      debug("subscribe connection %s to topic %s", sessionId, topic);
      websocket.subscribe(topic);
    });
  }
  function restoreAdapter() {
    socket_io_adapter_1.Adapter.prototype.addAll = addAll;
    socket_io_adapter_1.Adapter.prototype.del = del;
    socket_io_adapter_1.Adapter.prototype.broadcast = broadcast;
  }
  var toArrayBuffer = (buffer) => {
    const { buffer: arrayBuffer, byteOffset, byteLength } = buffer;
    return arrayBuffer.slice(byteOffset, byteOffset + byteLength);
  };
  function serveFile(res, filepath) {
    const { size } = (0, fs_1.statSync)(filepath);
    const readStream = (0, fs_1.createReadStream)(filepath);
    const destroyReadStream = () => !readStream.destroyed && readStream.destroy();
    const onError = (error) => {
      destroyReadStream();
      throw error;
    };
    const onDataChunk = (chunk) => {
      const arrayBufferChunk = toArrayBuffer(chunk);
      res.cork(() => {
        const lastOffset = res.getWriteOffset();
        const [ok, done] = res.tryEnd(arrayBufferChunk, size);
        if (!done && !ok) {
          readStream.pause();
          res.onWritable((offset) => {
            const [ok2, done2] = res.tryEnd(arrayBufferChunk.slice(offset - lastOffset), size);
            if (!done2 && ok2) {
              readStream.resume();
            }
            return ok2;
          });
        }
      });
    };
    res.onAborted(destroyReadStream);
    readStream.on("data", onDataChunk).on("error", onError).on("end", destroyReadStream);
  }
});

// mini-services/ironsight-room/node_modules/socket.io/package.json
var require_package = __commonJS((exports, module) => {
  module.exports = {
    name: "socket.io",
    version: "4.8.4",
    description: "node.js realtime framework server",
    keywords: [
      "realtime",
      "framework",
      "websocket",
      "tcp",
      "events",
      "socket",
      "io"
    ],
    files: [
      "dist/",
      "client-dist/",
      "wrapper.mjs",
      "!**/*.tsbuildinfo"
    ],
    directories: {
      doc: "docs/",
      example: "example/",
      lib: "lib/",
      test: "test/"
    },
    type: "commonjs",
    main: "./dist/index.js",
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        import: "./wrapper.mjs",
        require: "./dist/index.js"
      },
      "./package.json": "./package.json"
    },
    types: "./dist/index.d.ts",
    license: "MIT",
    homepage: "https://github.com/socketio/socket.io/tree/main/packages/socket.io#readme",
    repository: {
      type: "git",
      url: "git+https://github.com/socketio/socket.io.git"
    },
    bugs: {
      url: "https://github.com/socketio/socket.io/issues"
    },
    scripts: {
      compile: "rimraf ./dist && tsc",
      test: "npm run format:check && npm run compile && npm run test:types && npm run test:unit",
      "test:types": "exit 0",
      "test:unit": "nyc mocha --import=tsx --reporter spec --slow 200 --bail --timeout 10000 test/index.ts",
      "format:check": 'prettier --check "lib/**/*.ts" "test/**/*.ts"',
      "format:fix": 'prettier --write "lib/**/*.ts" "test/**/*.ts"',
      prepack: "npm run compile"
    },
    dependencies: {
      accepts: "~1.3.4",
      cors: "~2.8.5",
      debug: "~4.4.1",
      "engine.io": "~6.6.0",
      "socket.io-adapter": "~2.5.2",
      "socket.io-parser": "~4.2.4"
    },
    contributors: [
      {
        name: "Guillermo Rauch",
        email: "rauchg@gmail.com"
      },
      {
        name: "Arnout Kazemier",
        email: "info@3rd-eden.com"
      },
      {
        name: "Vladimir Dronnikov",
        email: "dronnikov@gmail.com"
      },
      {
        name: "Einar Otto Stangvik",
        email: "einaros@gmail.com"
      }
    ],
    engines: {
      node: ">=10.2.0"
    },
    tsd: {
      directory: "test"
    }
  };
});

// mini-services/ironsight-room/node_modules/socket.io/dist/index.js
var require_dist2 = __commonJS((exports, module) => {
  var __dirname = "/home/z/my-project/mini-services/ironsight-room/node_modules/socket.io/dist";
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports && exports.__importStar || function() {
    var ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o2) {
        var ar = [];
        for (var k in o2)
          if (Object.prototype.hasOwnProperty.call(o2, k))
            ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    return function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k = ownKeys(mod), i = 0;i < k.length; i++)
          if (k[i] !== "default")
            __createBinding(result, mod, k[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  }();
  var __importDefault = exports && exports.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Namespace = exports.Socket = exports.Server = undefined;
  var http_1 = __require("http");
  var fs_1 = __require("fs");
  var zlib_1 = __require("zlib");
  var accepts = require_accepts();
  var stream_1 = __require("stream");
  var path = __require("path");
  var engine_io_1 = require_engine_io();
  var client_1 = require_client();
  var events_1 = __require("events");
  var namespace_1 = require_namespace();
  Object.defineProperty(exports, "Namespace", { enumerable: true, get: function() {
    return namespace_1.Namespace;
  } });
  var parent_namespace_1 = require_parent_namespace();
  var socket_io_adapter_1 = require_dist();
  var parser = __importStar(require_cjs3());
  var debug_1 = __importDefault(require_src());
  var socket_1 = require_socket2();
  Object.defineProperty(exports, "Socket", { enumerable: true, get: function() {
    return socket_1.Socket;
  } });
  var typed_events_1 = require_typed_events();
  var uws_1 = require_uws();
  var cors_1 = __importDefault(require_lib());
  var debug = (0, debug_1.default)("socket.io:server");
  var clientVersion = require_package().version;
  var CLIENT_FILES = new Set([
    "socket.io.esm.min.js",
    "socket.io.esm.min.js.map",
    "socket.io.js",
    "socket.io.js.map",
    "socket.io.min.js",
    "socket.io.min.js.map",
    "socket.io.msgpack.min.js",
    "socket.io.msgpack.min.js.map"
  ]);

  class Server extends typed_events_1.StrictEventEmitter {
    constructor(srv, opts = {}) {
      super();
      this._nsps = new Map;
      this.parentNsps = new Map;
      this.parentNamespacesFromRegExp = new Map;
      if (typeof srv === "object" && srv instanceof Object && !srv.listen) {
        opts = srv;
        srv = undefined;
      }
      this.path(opts.path || "/socket.io");
      this.connectTimeout(opts.connectTimeout || 45000);
      this.serveClient(opts.serveClient !== false);
      this._parser = opts.parser || parser;
      this.encoder = new this._parser.Encoder;
      this.opts = opts;
      if (opts.connectionStateRecovery) {
        opts.connectionStateRecovery = Object.assign({
          maxDisconnectionDuration: 2 * 60 * 1000,
          skipMiddlewares: true
        }, opts.connectionStateRecovery);
        this.adapter(opts.adapter || socket_io_adapter_1.SessionAwareAdapter);
      } else {
        this.adapter(opts.adapter || socket_io_adapter_1.Adapter);
      }
      opts.cleanupEmptyChildNamespaces = !!opts.cleanupEmptyChildNamespaces;
      this.sockets = this.of("/");
      if (srv || typeof srv == "number")
        this.attach(srv);
      if (this.opts.cors) {
        this._corsMiddleware = (0, cors_1.default)(this.opts.cors);
      }
    }
    get _opts() {
      return this.opts;
    }
    serveClient(v) {
      if (!arguments.length)
        return this._serveClient;
      this._serveClient = v;
      return this;
    }
    _checkNamespace(name, auth, fn) {
      if (this.parentNsps.size === 0)
        return fn(false);
      const keysIterator = this.parentNsps.keys();
      const run = () => {
        const nextFn = keysIterator.next();
        if (nextFn.done) {
          return fn(false);
        }
        nextFn.value(name, auth, (err, allow) => {
          if (err || !allow) {
            return run();
          }
          if (this._nsps.has(name)) {
            debug("dynamic namespace %s already exists", name);
            return fn(this._nsps.get(name));
          }
          const namespace = this.parentNsps.get(nextFn.value).createChild(name);
          debug("dynamic namespace %s was created", name);
          fn(namespace);
        });
      };
      run();
    }
    path(v) {
      if (!arguments.length)
        return this._path;
      this._path = v.replace(/\/$/, "");
      return this;
    }
    connectTimeout(v) {
      if (v === undefined)
        return this._connectTimeout;
      this._connectTimeout = v;
      return this;
    }
    adapter(v) {
      if (!arguments.length)
        return this._adapter;
      this._adapter = v;
      for (const nsp of this._nsps.values()) {
        nsp._initAdapter();
      }
      return this;
    }
    listen(srv, opts = {}) {
      return this.attach(srv, opts);
    }
    attach(srv, opts = {}) {
      if (typeof srv == "function") {
        const msg = "You are trying to attach socket.io to an express " + "request handler function. Please pass a http.Server instance.";
        throw new Error(msg);
      }
      if (Number(srv) == srv) {
        srv = Number(srv);
      }
      if (typeof srv == "number") {
        debug("creating http server and binding to %d", srv);
        const port = srv;
        srv = (0, http_1.createServer)((_req, res) => {
          res.writeHead(404);
          res.end();
        });
        srv.listen(port);
      }
      Object.assign(opts, this.opts);
      opts.path = opts.path || this._path;
      this.initEngine(srv, opts);
      return this;
    }
    attachApp(app, opts = {}) {
      Object.assign(opts, this.opts);
      opts.path = opts.path || this._path;
      debug("creating uWebSockets.js-based engine with opts %j", opts);
      const engine = new engine_io_1.uServer(opts);
      engine.attach(app, opts);
      this.bind(engine);
      if (this._serveClient) {
        app.get(`${this._path}/*`, (res, req) => {
          const filename = this.extractFilename(req.getUrl());
          if (!CLIENT_FILES.has(filename)) {
            req.setYield(true);
            return;
          }
          const isMap = filename.endsWith(".map");
          const type = isMap ? "map" : "source";
          const expectedEtag = '"' + clientVersion + '"';
          const weakEtag = "W/" + expectedEtag;
          const etag = req.getHeader("if-none-match");
          if (etag) {
            if (expectedEtag === etag || weakEtag === etag) {
              debug("serve client %s 304", type);
              res.writeStatus("304 Not Modified");
              res.end();
              return;
            }
          }
          debug("serve client %s", type);
          res.writeHeader("cache-control", "public, max-age=0");
          res.writeHeader("content-type", "application/" + (isMap ? "json" : "javascript") + "; charset=utf-8");
          res.writeHeader("etag", expectedEtag);
          const filepath = path.join(__dirname, "../client-dist/", filename);
          (0, uws_1.serveFile)(res, filepath);
        });
      }
      (0, uws_1.patchAdapter)(app);
    }
    extractFilename(url) {
      return url.substring(this._path.length + 1).split("?")[0];
    }
    initEngine(srv, opts) {
      debug("creating engine.io instance with opts %j", opts);
      this.eio = (0, engine_io_1.attach)(srv, opts);
      if (this._serveClient)
        this.attachServe(srv);
      this.httpServer = srv;
      this.bind(this.eio);
    }
    attachServe(srv) {
      debug("attaching client serving req handler");
      const evs = srv.listeners("request").slice(0);
      srv.removeAllListeners("request");
      srv.on("request", (req, res) => {
        if (req.url.startsWith(this._path)) {
          const filename = this.extractFilename(req.url);
          if (CLIENT_FILES.has(filename)) {
            if (this._corsMiddleware) {
              this._corsMiddleware(req, res, () => {
                this.serve(filename, req, res);
              });
            } else {
              this.serve(filename, req, res);
            }
            return;
          }
        }
        for (let i = 0;i < evs.length; i++) {
          evs[i].call(srv, req, res);
        }
      });
    }
    serve(filename, req, res) {
      const isMap = filename.endsWith(".map");
      const type = isMap ? "map" : "source";
      const expectedEtag = '"' + clientVersion + '"';
      const weakEtag = "W/" + expectedEtag;
      const etag = req.headers["if-none-match"];
      if (etag) {
        if (expectedEtag === etag || weakEtag === etag) {
          debug("serve client %s 304", type);
          res.writeHead(304);
          res.end();
          return;
        }
      }
      debug("serve client %s", type);
      res.setHeader("Cache-Control", "public, max-age=0");
      res.setHeader("Content-Type", "application/" + (isMap ? "json" : "javascript") + "; charset=utf-8");
      res.setHeader("ETag", expectedEtag);
      Server.sendFile(filename, req, res);
    }
    static sendFile(filename, req, res) {
      const readStream = (0, fs_1.createReadStream)(path.join(__dirname, "../client-dist/", filename));
      const encoding = accepts(req).encodings(["br", "gzip", "deflate"]);
      const onError = (err) => {
        if (err) {
          res.end();
        }
      };
      switch (encoding) {
        case "br":
          res.writeHead(200, { "content-encoding": "br" });
          (0, stream_1.pipeline)(readStream, (0, zlib_1.createBrotliCompress)(), res, onError);
          break;
        case "gzip":
          res.writeHead(200, { "content-encoding": "gzip" });
          (0, stream_1.pipeline)(readStream, (0, zlib_1.createGzip)(), res, onError);
          break;
        case "deflate":
          res.writeHead(200, { "content-encoding": "deflate" });
          (0, stream_1.pipeline)(readStream, (0, zlib_1.createDeflate)(), res, onError);
          break;
        default:
          res.writeHead(200);
          (0, stream_1.pipeline)(readStream, res, onError);
      }
    }
    bind(engine) {
      this.engine = engine;
      this.engine.on("connection", this.onconnection.bind(this));
      return this;
    }
    onconnection(conn) {
      debug("incoming connection with id %s", conn.id);
      const client = new client_1.Client(this, conn);
      if (conn.protocol === 3) {
        client.connect("/");
      }
      return this;
    }
    of(name, fn) {
      if (typeof name === "function" || name instanceof RegExp) {
        if (name instanceof RegExp) {
          if (name.global || name.sticky) {
            throw new Error("stateful regular expressions are not supported");
          }
        }
        const parentNsp = new parent_namespace_1.ParentNamespace(this);
        debug("initializing parent namespace %s", parentNsp.name);
        if (typeof name === "function") {
          this.parentNsps.set(name, parentNsp);
        } else {
          this.parentNsps.set((nsp2, conn, next) => next(null, name.test(nsp2)), parentNsp);
          this.parentNamespacesFromRegExp.set(name, parentNsp);
        }
        if (fn) {
          parentNsp.on("connect", fn);
        }
        return parentNsp;
      }
      if (String(name)[0] !== "/")
        name = "/" + name;
      let nsp = this._nsps.get(name);
      if (!nsp) {
        for (const [regex, parentNamespace] of this.parentNamespacesFromRegExp) {
          if (regex.test(name)) {
            debug("attaching namespace %s to parent namespace %s", name, regex);
            return parentNamespace.createChild(name);
          }
        }
        debug("initializing namespace %s", name);
        nsp = new namespace_1.Namespace(this, name);
        this._nsps.set(name, nsp);
        if (name !== "/") {
          this.sockets.emitReserved("new_namespace", nsp);
        }
      }
      if (fn)
        nsp.on("connect", fn);
      return nsp;
    }
    async close(fn) {
      await Promise.allSettled([...this._nsps.values()].map(async (nsp) => {
        nsp.sockets.forEach((socket) => {
          socket._onclose("server shutting down");
        });
        await nsp.adapter.close();
      }));
      this.engine.close();
      (0, uws_1.restoreAdapter)();
      if (this.httpServer) {
        return new Promise((resolve) => {
          this.httpServer.close((err) => {
            fn && fn(err);
            if (err) {
              debug("server was not running");
            }
            resolve();
          });
        });
      } else {
        fn && fn();
      }
    }
    use(fn) {
      this.sockets.use(fn);
      return this;
    }
    to(room) {
      return this.sockets.to(room);
    }
    in(room) {
      return this.sockets.in(room);
    }
    except(room) {
      return this.sockets.except(room);
    }
    send(...args) {
      this.sockets.emit("message", ...args);
      return this;
    }
    write(...args) {
      this.sockets.emit("message", ...args);
      return this;
    }
    serverSideEmit(ev, ...args) {
      return this.sockets.serverSideEmit(ev, ...args);
    }
    serverSideEmitWithAck(ev, ...args) {
      return this.sockets.serverSideEmitWithAck(ev, ...args);
    }
    allSockets() {
      return this.sockets.allSockets();
    }
    compress(compress) {
      return this.sockets.compress(compress);
    }
    get volatile() {
      return this.sockets.volatile;
    }
    get local() {
      return this.sockets.local;
    }
    timeout(timeout) {
      return this.sockets.timeout(timeout);
    }
    fetchSockets() {
      return this.sockets.fetchSockets();
    }
    socketsJoin(room) {
      return this.sockets.socketsJoin(room);
    }
    socketsLeave(room) {
      return this.sockets.socketsLeave(room);
    }
    disconnectSockets(close = false) {
      return this.sockets.disconnectSockets(close);
    }
  }
  exports.Server = Server;
  var emitterMethods = Object.keys(events_1.EventEmitter.prototype).filter(function(key) {
    return typeof events_1.EventEmitter.prototype[key] === "function";
  });
  emitterMethods.forEach(function(fn) {
    Server.prototype[fn] = function() {
      return this.sockets[fn].apply(this.sockets, arguments);
    };
  });
  module.exports = (srv, opts) => new Server(srv, opts);
  module.exports.Server = Server;
  module.exports.Namespace = namespace_1.Namespace;
  module.exports.Socket = socket_1.Socket;
});

// mini-services/ironsight-room/index.ts
import { createServer } from "http";

// mini-services/ironsight-room/node_modules/socket.io/wrapper.mjs
var import_dist = __toESM(require_dist2(), 1);
var { Server, Namespace, Socket } = import_dist.default;

// mini-services/ironsight-room/index.ts
import { readFileSync, writeFileSync, renameSync, readdirSync, existsSync, statSync, createReadStream } from "fs";
import { join, resolve as pathResolve, extname, sep } from "path";
import { createHmac, timingSafeEqual, createHash } from "crypto";
var GAME_JS = (process.env.IRON_GAME || "/home/z/my-project/download/fps/js").replace(/\/$/, "");
var phys = await import(GAME_JS + "/physics.js");
var cfg = await import(GAME_JS + "/config.js");
var cos = await import(GAME_JS + "/cosmetics.js");
var mg = await import(GAME_JS + "/metagame.js");
var ops = await import(GAME_JS + "/operators.js");
var tk = await import(GAME_JS + "/tokens.js");
var { stepState } = phys;
var { CFG, WEAPONS, FRAG, FLASH, ABILITIES, GG_LADDER, SND_BOMB, XP_AWARD, xpForLevel, lvlFromXp, RANKED_MODES, RANKED_MIN_PLAYERS, RP_AWARD, rpDelta, tierOf, seasonOf, softReset, RP_TIERS, crDelta, statOwns, casePick, ECO_CLAIM, ECO_RARITY, ECO_DUPE_REFUND, ECO_CAPS, CLAN, Q_WIDEN, widenTiers, BP, BP_AWARD, RANK_REWARDS, bpOf } = cfg;
var CAREER_PATH = process.env.IRON_CAREER || import.meta.dir + "/career.json";
var CAREER = { v: 1, players: {} };
var CAREER_DIRTY = false;
try {
  const raw = JSON.parse(readFileSync(CAREER_PATH, "utf8"));
  if (raw && typeof raw === "object" && raw.v === 1 && raw.players && typeof raw.players === "object")
    CAREER = raw;
  else
    console.log("[career] malformed file \u2014 starting fresh");
} catch (e) {
  console.log("[career] fresh store (no file yet)");
}
function careerPersist() {
  if (!CAREER_DIRTY)
    return;
  try {
    const tmp = CAREER_PATH + ".tmp";
    writeFileSync(tmp, JSON.stringify(CAREER));
    renameSync(tmp, CAREER_PATH);
    CAREER_DIRTY = false;
  } catch (e) {
    console.log("[career] persist failed: " + (e && e.message));
  }
}
function careerRec(pid, name) {
  let r = CAREER.players[pid];
  if (!r) {
    r = CAREER.players[pid] = { n: name, k: 0, d: 0, m: 0, w: 0, xp: 0, lvl: 1, tally: {}, last: 0 };
  }
  return r;
}
function profileOf(pid) {
  const r = CAREER.players[pid];
  return r ? { xp: r.xp, lvl: r.lvl, m: r.m, k: r.k, d: r.d, w: r.w } : { xp: 0, lvl: 1, m: 0, k: 0, d: 0, w: 0 };
}
function rankedView(rec) {
  const rk = rec && rec.rk;
  return rk ? { s: rk.s, rp: rk.rp, tier: tierOf(rk.rp), pk: rk.pk, m: rk.m, w: rk.w } : { s: seasonOf(Date.now()).id, rp: 0, tier: tierOf(0), pk: 0, m: 0, w: 0 };
}
var PID_OK = (s) => typeof s === "string" && s.length >= 8 && s.length <= 64 && /^[0-9a-fA-F-]+$/.test(s);
var ACC_PATH = process.env.IRON_ACCOUNTS || import.meta.dir + "/accounts.json";
var ACC = { v: 1, users: {}, merged: {}, listings: [] };
try {
  const raw = JSON.parse(readFileSync(ACC_PATH, "utf8"));
  if (raw && typeof raw === "object" && raw.v === 1 && raw.users)
    ACC = raw;
  else
    console.log("[acc] malformed file \u2014 starting fresh");
} catch (e) {
  console.log("[acc] fresh store (no file yet)");
}
function accPersist() {
  try {
    const tmp = ACC_PATH + ".tmp";
    writeFileSync(tmp, JSON.stringify(ACC));
    renameSync(tmp, ACC_PATH);
  } catch (e) {
    console.log("[acc] persist failed: " + (e && e.message));
  }
}
var SOCIAL_PATH = process.env.IRON_SOCIAL || import.meta.dir + "/social.json";
var REPORT_REASONS = ["cheat", "tox", "team", "other"];
var REPORTS = [];
var SWEEP_METRICS = { joins: 0, joinsFlood: 0, joinsPow: 0, connFlood: 0, voiceFrames: 0, voiceDrops: 0, mapregs: 0, mapregsBad: 0, mapdataPulls: 0 };
var TK_CREDITS = { n: 0 };
var ipKey = (h) => {
  const xf = h && h.headers ? h.headers["x-forwarded-for"] : null;
  const s = typeof xf === "string" && xf.split(",")[0].trim() || h && h.address || "?";
  return String(s).slice(0, 45);
};
var FLOOD = { join: { cap: 10, win: 1e4 }, conn: { cap: 24, win: 1e4 } };
var IP_WIN = new Map;
function floodOk(kind, key) {
  const g = FLOOD[kind], now = Date.now();
  const k = kind + "|" + key;
  let e = IP_WIN.get(k);
  if (!e || now - e.w > g.win) {
    e = { n: 0, w: now };
    IP_WIN.set(k, e);
  }
  e.n++;
  return e.n <= g.cap;
}
var POW_NIB = Math.max(0, Math.min(14, Number(process.env.IRON_POW || 0) | 0));
var POW_CH = new Map;
function powIssue() {
  const salt = newTok().slice(0, 16);
  POW_CH.set(salt, { nib: POW_NIB, exp: Date.now() + 120000 });
  return { salt, nib: POW_NIB };
}
function powOk(s) {
  if (!POW_NIB)
    return true;
  if (typeof s !== "string")
    return false;
  const i = s.indexOf(":");
  if (i < 1)
    return false;
  const salt = s.slice(0, i), ch = POW_CH.get(salt);
  if (!ch || Date.now() > ch.exp)
    return false;
  POW_CH.delete(salt);
  const h = createHash("sha256").update(s).digest("hex");
  let z = 0;
  for (let j = 0;j < h.length && h[j] === "0"; j++)
    z++;
  return z >= ch.nib;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, e] of IP_WIN)
    if (now - e.w > 60000)
      IP_WIN.delete(k);
  for (const [k, c] of POW_CH)
    if (now > c.exp)
      POW_CH.delete(k);
}, 120000).unref();
var SOCIAL = { v: 1, friends: {}, reqs: {}, memberOf: {}, clans: {} };
try {
  const raw = JSON.parse(readFileSync(SOCIAL_PATH, "utf8"));
  if (raw && typeof raw === "object" && raw.v === 1 && raw.clans)
    SOCIAL = raw;
  else
    console.log("[social] malformed file \u2014 starting fresh");
} catch (e) {
  console.log("[social] fresh store (no file yet)");
}
function socialPersist() {
  try {
    const tmp = SOCIAL_PATH + ".tmp";
    writeFileSync(tmp, JSON.stringify(SOCIAL));
    renameSync(tmp, SOCIAL_PATH);
  } catch (e) {
    console.log("[social] persist failed: " + (e && e.message));
  }
}
var SESSIONS = new Map;
var SESSION_TTL = 2592000000;
function newTok() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function mergeCareer(dst, src) {
  dst.k += src.k || 0;
  dst.d += src.d || 0;
  dst.m += src.m || 0;
  dst.w += src.w || 0;
  dst.xp += src.xp || 0;
  dst.lvl = lvlFromXp(dst.xp);
  dst.bs = Math.max(dst.bs || 0, src.bs || 0);
  for (const k of Object.keys(src.tally || {})) {
    const a = dst.tally[k] || (dst.tally[k] = { m: 0, w: 0 });
    a.m += src.tally[k].m || 0;
    a.w += src.tally[k].w || 0;
  }
  if (src.rk) {
    if (!dst.rk || dst.rk.s !== src.rk.s)
      dst.rk = { ...src.rk };
    else
      dst.rk.rp = Math.max(dst.rk.rp, src.rk.rp), dst.rk.pk = Math.max(dst.rk.pk || 0, src.rk.pk || 0), dst.rk.m += src.rk.m || 0, dst.rk.w += src.rk.w || 0;
  }
}
function bpRec(rec) {
  rec.bp = mg.migrateBp(rec.bp, seasonOf(Date.now()).id);
  return rec.bp;
}
function srvOwns(rec, id) {
  if (!id)
    return false;
  const e2 = rec.eco;
  if (e2 && e2.own && e2.own[id] > 0)
    return true;
  return rec.bn && typeof rec.bn === "object" ? mg.bundleOwnedItems(rec.bn).has(id) : false;
}
function evsStoreView(rec) {
  const week = mg.weekMonOf(mg.evDayOf(Date.now()));
  return rec.evsStore && rec.evsStore.w === week ? { w: week, t: rec.evsStore.t } : { w: week, t: 0 };
}
function evsRec(rec) {
  const today = mg.evDayOf(Date.now());
  if (!rec.evs || rec.evs.v !== mg.EV_PERSIST_V)
    rec.evs = mg.evChPersistShape();
  if (mg.evsWindowRollover(rec.evs, today, mg.weekMonOf(today)))
    rec.evs = mg.evChPersistShape();
  return rec.evs;
}
function evsView(rec) {
  const s = evsRec(rec);
  return { v: s.v, d: s.d, w: s.w, claimed: s.claimed, stats: { ...s.stats }, ms: [...s.ms || []] };
}
function ecoRec(rec) {
  return rec.eco || (rec.eco = { cr: 0, own: {}, out: [], inbox: [], lastClaim: 0, tk: 0, tkhist: [] });
}
var ACC_LISTINGS = () => ACC.listings;
function marketNames() {
  const out = {};
  for (const l of ACC.listings)
    out[l.seller] = (CAREER.players[l.seller] || {}).n || l.sellerName || "PILOT";
  return out;
}
function ecoState(pid) {
  const rec = CAREER.players[pid];
  if (!rec)
    return null;
  const e = ecoRec(rec);
  return { cr: e.cr, tk: e.tk | 0, own: { ...e.own }, out: e.out.map((l) => ({ ...l })), inbox: e.inbox.map((o) => ({ ...o, n: (CAREER.players[o.from] || {}).n || o.fromName || "PILOT" })), market: ACC_LISTINGS().map((l) => ({ ...l })), names: marketNames(), bp: bpRec(rec), bn: { ...rec.bn && typeof rec.bn === "object" ? rec.bn : {} }, evsStore: evsStoreView(rec), evs: evsView(rec), tkhist: (e.tkhist || []).slice(-20) };
}
function pidByName(name) {
  if (typeof name !== "string")
    return null;
  const n = name.trim().toLowerCase();
  for (const [pid, r] of Object.entries(CAREER.players))
    if ((r.n || "").toLowerCase() === n)
      return pid;
  return null;
}
function presenceOf(pid) {
  if (pid) {
    for (const r of rooms.values())
      for (const q of r.players)
        if (q.pid === pid)
          return { on: true, room: r.id };
  }
  return { on: false };
}
function socialState(pid) {
  return {
    friends: (SOCIAL.friends[pid] || []).map((f) => ({ pid: f.pid, since: f.since, n: (CAREER.players[f.pid] || {}).n || f.n || "PILOT", ...presenceOf(f.pid) })),
    reqsIn: (SOCIAL.reqs[pid] || []).map((o) => ({ from: o.from, n: (CAREER.players[o.from] || {}).n || "PILOT" })),
    memberOf: SOCIAL.memberOf[pid] || null,
    clan: SOCIAL.memberOf[pid] ? { ...SOCIAL.clans[SOCIAL.memberOf[pid]] } : null
  };
}
function rebroadcastRoomsFor(pid) {
  if (!pid)
    return;
  for (const r of rooms.values()) {
    let hit = false;
    for (const q of r.players)
      if (q.pid === pid)
        hit = true;
    if (hit)
      broadcastRoster(r);
  }
}
var QUEUE = [];
var rkCounter = 0;
function tierIdx(rp) {
  let i = 0;
  for (let k = 0;k < RP_TIERS.length; k++)
    if (rp >= RP_TIERS[k].min)
      i = k;
  return i;
}
function bestLobbyOf() {
  let best = null;
  for (const r of rooms.values()) {
    if (r.priv)
      continue;
    if (r.match.state === "idle") {
      if (r.players.size < MAX_ROOM) {
        if (!best || r.players.size > best.players.size)
          best = r;
      }
    }
  }
  return best;
}
function queueTick() {
  const now = Date.now();
  for (const w of QUEUE) {
    if (w.op !== "rank")
      continue;
    const widen = widenTiers((now - w.t0) / 1000);
    const lo = Math.max(0, w.ti - widen), hi = Math.min(RP_TIERS.length - 1, w.ti + widen);
    const mates = QUEUE.filter((x) => x !== w && x.op === "rank" && x.mode === w.mode && x.ti >= lo && x.ti <= hi && w.pid && x.pid && x.pid !== w.pid);
    if (1 + mates.length < RANKED_MIN_PLAYERS)
      continue;
    const room = getRoom("RK" + ++rkCounter);
    room.priv = false;
    room.match.mode = w.mode;
    const team = [0, 0];
    const members = [w, ...mates].slice(0, MAX_ROOM);
    for (const x of members) {
      x.room = room.id;
      x.chain("queue", { op: "pop", room: room.id, mode: w.mode });
    }
    for (const x of QUEUE.slice())
      if (x.room)
        QUEUE.splice(QUEUE.indexOf(x), 1);
    console.log(`[room] ranked pop: ${members.length}p -> ${room.id} (${w.mode})`);
    break;
  }
}
setInterval(queueTick, 1000);
var MAP_PATH = process.env.IRON_MAP || GAME_JS.replace(/\/js$/, "") + "/maps/outpost.json";
var MAP = JSON.parse(await Bun.file(MAP_PATH).text());
var MAPS_DIR = GAME_JS.replace(/\/js$/, "") + "/maps";
var MAPS_REGISTRY = readdirSync(MAPS_DIR);
var BOOT_MAP_ID = typeof MAP.id === "string" && MAP.id || "outpost";
function loadMapData(id) {
  if (!MAPS_REGISTRY.includes(id))
    return null;
  try {
    return JSON.parse(readFileSync(MAPS_DIR + "/" + id + ".json", "utf8"));
  } catch (e) {
    return null;
  }
}
var MAP_DATA_BOOT = MAP;
function buildRoomWorld(room, mapId) {
  const d = loadMapData(mapId) || MAP_DATA_BOOT;
  room.mapId = d.id || mapId;
  room.DESTS = new Map;
  const destCols = [];
  for (const x of d.destructibles || []) {
    if (!x || !Array.isArray(x.p) || !Array.isArray(x.s) || x.p.length !== 3 || x.s.length !== 3 || !Number.isFinite(+x.hp))
      continue;
    const id = String(x.id || "dest" + destCols.length);
    const w2 = +x.s[0] / 2, hh = +x.s[1], d2 = +x.s[2] / 2;
    const box = { min: { x: +x.p[0] - w2, y: +x.p[1], z: +x.p[2] - d2 }, max: { x: +x.p[0] + w2, y: +x.p[1] + hh, z: +x.p[2] + d2 }, destId: id };
    destCols.push(box);
    room.DESTS.set(id, { hp: +x.hp, maxHp: +x.hp, box, center: { x: +x.p[0], y: +x.p[1] + hh / 2, z: +x.p[2] } });
  }
  room.WORLD = { colliders: [...d.colliders, ...destCols], jumpPads: d.jumpPads };
  room.POOLS = { ffa: d.spawnsFFA, a: d.spawnsA || [], b: d.spawnsB || [] };
  room.UNION = [...room.POOLS.ffa, ...room.POOLS.a, ...room.POOLS.b];
  room.flags = (d.flags || []).map((f) => ({ ...f, owner: -1, prog: 0 }));
  room.HILLS = d.hills || [];
  room.SITES = d.sites || [];
}
var CUSTOM_CAPS = { bytes: 262144, blocks: 320, colliders: 900, navNodes: 400, spawns: 32, flags: 3, sites: 2, pads: 24 };
var finNum = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
function validCustom(d) {
  if (!d || typeof d !== "object" || Array.isArray(d))
    return "shape";
  try {
    if (JSON.stringify(d).length > CUSTOM_CAPS.bytes)
      return "bytes";
  } catch (_) {
    return "shape";
  }
  if (typeof d.name !== "string" || d.name.length > 24)
    return "name";
  if (!Array.isArray(d.blocks) || d.blocks.length < 1 || d.blocks.length > CUSTOM_CAPS.blocks)
    return "blocks";
  for (const b of d.blocks) {
    if (!b || !finNum(b.x, -60, 60) || !finNum(b.z, -60, 60) || !finNum(b.y, 0, 30) || !finNum(b.w, 0.1, 40) || !finNum(b.h, 0.1, 30) || !finNum(b.d, 0.1, 40))
      return "block";
  }
  if (!Array.isArray(d.spawnsFFA) || d.spawnsFFA.length < 2 || d.spawnsFFA.length > CUSTOM_CAPS.spawns)
    return "spawns";
  for (const s of d.spawnsFFA) {
    if (!s || !finNum(s.x, -60, 60) || !finNum(s.z, -60, 60))
      return "spawn";
  }
  for (const k of ["spawnsA", "spawnsB"]) {
    const arr = d[k];
    if (arr !== undefined) {
      if (!Array.isArray(arr) || arr.length > CUSTOM_CAPS.spawns)
        return k;
      for (const s of arr) {
        if (!s || !finNum(s.x, -60, 60) || !finNum(s.z, -60, 60))
          return "spawn";
      }
    }
  }
  if (!Array.isArray(d.colliders) || d.colliders.length < 1 || d.colliders.length > CUSTOM_CAPS.colliders)
    return "colliders";
  for (const c of d.colliders) {
    if (!c || !c.min || !c.max || !finNum(c.min.x, -70, 70) || !finNum(c.min.y, 0, 40) || !finNum(c.min.z, -70, 70) || !finNum(c.max.x, -70, 70) || !finNum(c.max.y, 0, 40) || !finNum(c.max.z, -70, 70))
      return "collider";
  }
  if (!d.nav || !Array.isArray(d.nav.nodes) || d.nav.nodes.length < 4 || d.nav.nodes.length > CUSTOM_CAPS.navNodes)
    return "nav";
  for (const n of d.nav.nodes) {
    if (!n || !finNum(n.x, -60, 60) || !finNum(n.z, -60, 60))
      return "navnode";
  }
  if (d.flags !== undefined) {
    if (!Array.isArray(d.flags) || d.flags.length > CUSTOM_CAPS.flags)
      return "flags";
    for (const f of d.flags) {
      if (!f || !finNum(f.x, -60, 60) || !finNum(f.z, -60, 60))
        return "flag";
    }
  }
  if (d.sites !== undefined) {
    if (!Array.isArray(d.sites) || d.sites.length > CUSTOM_CAPS.sites)
      return "sites";
    for (const s of d.sites) {
      if (!s || !finNum(s.x, -60, 60) || !finNum(s.z, -60, 60))
        return "site";
    }
  }
  if (d.jumpPads !== undefined) {
    if (!Array.isArray(d.jumpPads) || d.jumpPads.length > CUSTOM_CAPS.pads)
      return "pads";
    for (const j of d.jumpPads) {
      if (!j || !finNum(j.x, -60, 60) || !finNum(j.z, -60, 60))
        return "pad";
    }
  }
  return null;
}
function buildCustomRoomWorld(room, cm) {
  const d = cm.data;
  room.mapId = "custom";
  room.DESTS = new Map;
  room.WORLD = { colliders: d.colliders.slice(), jumpPads: d.jumpPads || [] };
  room.POOLS = { ffa: d.spawnsFFA, a: d.spawnsA || [], b: d.spawnsB || [] };
  room.UNION = [...room.POOLS.ffa, ...room.POOLS.a, ...room.POOLS.b];
  room.flags = (d.flags || []).map((f) => ({ ...f, owner: -1, prog: 0 }));
  room.HILLS = [];
  room.SITES = d.sites || [];
}
var PORT = Number(process.env.IRON_PORT || 3010);
var DELAY = Number(process.env.IRON_DELAY || 0);
var JITTER = Number(process.env.IRON_JITTER || 0);
var DT = 0.016666666666666666;
var DT_MS = 16.666666666666668;
var SNAP_EVERY = 3;
var HIST = 32;
var FOLD = 3;
var FOLD_NET = 30; // [T151] THE RTT-BUFFER LAW — the input queue IS the latency buffer: a real-internet client (Render hub RTT 100-400ms) holds RTT×60 in-flight inputs (6-24 deep); FOLD=3 DROPPED most of them every RTT window (the server saw a fraction of the movement, the correction blend dragged the client back) while the starved-tick hold re-applied the last input at full tick rate (overshoot forward) — the drop+hold soup the user walked in as "movement doubles on online". 30 = half a second of buffer, far above any legit RTT, far below the flood plane (INPUT_CAP already rate-bounds; the seq guard keeps order) — beyond it a stalled/flooded client gets folded, never a live one.
var INPUT_CAP = 90;
var FIRE_CAP = 30;
var nearPoolR = (room, x, y, z, tol = 0.5) => (room.UNION || []).some((s) => Math.hypot(s.x - x, (s.y || 0) - y, s.z - z) <= tol);
var INTERP_DELAY = 100;
var RECONNECT_MS = 1e4;
var MAX_ROOM = 12;
var SPEC_MAX = 8;
var CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var CODE_LEN = 6;
var P = CFG.PHYS;
var H = CFG.HEALTH;
var FBIT = { CROUCH: 1, SLIDE: 2, GROUNDED: 4, SPRINT: 8 };
var NADE_GRAV = 18;
var NADE_DAMP = 0.82;
var NADE_RATE = 2;
var NADE_LIVE = 4;
var STIM = ABILITIES.find((a) => a.id === "stim");
var FLASH_RANGE = FLASH.radius * 2.2;
var KLIMIT = Number(process.env.IRON_KLIMIT || 0);
var RLIMIT = Number(process.env.IRON_RLIMIT || 0);
var RTIME = Number(process.env.IRON_RTIME || 0);
var BTIME = Number(process.env.IRON_BTIME || 0);
var PTIME = Number(process.env.IRON_PTIME || 0);
var DTIME = Number(process.env.IRON_DTIME || 0);
var GGLAD = Number(process.env.IRON_GGLAD || 0);
var HLEAD = Number(process.env.IRON_HLEAD || 0);
var HTIME = Number(process.env.IRON_HTIME || 0);
var TEAM_MODES = new Set(["tdm", "ct", "dom", "hp", "kc", "snd", "gf", "inf", "ctl"]);
var GG_TOTAL = (GGLAD || GG_LADDER.length) + 1;
var HEAD_HS = 0.19;
var BODY_BW = 0.42;
var heightOf = (crouch) => P.height + (P.crouchHeight - P.height) * crouch;
var CAP_ON = process.env.IRON_CAP === "1";
var capTicks = { n: 0, late: [], exec: [], lateMax: 0, execMax: 0, lateOver: 0, execOver: 0 };
var capPush = (a, v) => {
  a.push(v);
  if (a.length > 4096)
    a.shift();
};
var capProc = { cpuPct: 0, rssKB: 0 };
if (CAP_ON) {
  let lastCu = process.cpuUsage(), lastT = Date.now();
  setInterval(() => {
    const now = Date.now(), wall = Math.max(1, now - lastT);
    const d = process.cpuUsage(lastCu);
    lastCu = process.cpuUsage();
    lastT = now;
    capProc.cpuPct = +((d.user + d.system) / 1000 / wall * 100).toFixed(1);
    capProc.rssKB = Math.round(process.memoryUsage().rss / 1024);
  }, 1000);
}
function capMetrics() {
  const pct = (a, p) => {
    if (!a.length)
      return 0;
    const s = [...a].sort((x, y) => x - y);
    return s[Math.min(s.length - 1, Math.floor(p * s.length))];
  };
  return {
    capOn: CAP_ON,
    clockRunning,
    tickN,
    ticks: {
      n: capTicks.n,
      lateP50: pct(capTicks.late, 0.5),
      lateP95: pct(capTicks.late, 0.95),
      lateMax: capTicks.lateMax,
      lateOver5ms: capTicks.lateOver,
      execP50: pct(capTicks.exec, 0.5),
      execP95: pct(capTicks.exec, 0.95),
      execMax: capTicks.execMax,
      execOver4ms: capTicks.execOver
    },
    proc: capProc,
    rooms: [...rooms.values()].map((r) => {
      let qHi = 0;
      for (const p of r.players) {
        const s = p.__chain && p.__chain.stats;
        if (s && s.qHi > qHi)
          qHi = s.qHi;
      }
      return { id: r.id, size: r.players.size, tick: r.tick, snaps: r.cap.snaps, bytesAvg: r.cap.snaps ? Math.round(r.cap.bytes / r.cap.snaps) : 0, bytesMax: r.cap.bytesMax, qHi };
    }),
    players: [...rooms.values()].reduce((n, r) => n + r.players.size, 0)
  };
}
function rayBox(o, d, minx, miny, minz, maxx, maxy, maxz) {
  let tmin = 0, tmax = 1e9;
  const mins = [minx, miny, minz], maxs = [maxx, maxy, maxz], oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
  for (let a = 0;a < 3; a++) {
    if (Math.abs(dd[a]) < 0.000000001) {
      if (oo[a] < mins[a] || oo[a] > maxs[a])
        return -1;
      continue;
    }
    let t1 = (mins[a] - oo[a]) / dd[a], t2 = (maxs[a] - oo[a]) / dd[a];
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax)
      return -1;
  }
  return tmin;
}
function rayWorld(colliders, o, d, maxDist) {
  let bestT = maxDist;
  for (const b of colliders) {
    let tmin = 0, tmax = bestT, ok = true;
    for (let a = 0;a < 3; a++) {
      const ax = "xyz"[a], oi = o[ax], di = d[ax], mn = b.min[ax], mx = b.max[ax];
      if (Math.abs(di) < 0.000000001) {
        if (oi < mn || oi > mx) {
          ok = false;
          break;
        }
        continue;
      }
      let t1 = (mn - oi) / di, t2 = (mx - oi) / di;
      if (t1 > t2) {
        const t = t1;
        t1 = t2;
        t2 = t;
      }
      if (t1 > tmin)
        tmin = t1;
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) {
        ok = false;
        break;
      }
    }
    if (ok && tmin < bestT && tmin >= 0)
      bestT = tmin;
  }
  return bestT;
}
function rayWorldN(colliders, o, d, maxDist) {
  let bestT = maxDist, bAxis = -1, bSign = 0;
  for (const b of colliders) {
    let tmin = 0, tmax = bestT, nAxis = -1, nSign = 0, ok = true;
    for (let a = 0;a < 3; a++) {
      const ax = "xyz"[a], oi = o[ax], di = d[ax], mn = b.min[ax], mx = b.max[ax];
      if (Math.abs(di) < 0.000000001) {
        if (oi < mn || oi > mx) {
          ok = false;
          break;
        }
        continue;
      }
      let t1 = (mn - oi) / di, t2 = (mx - oi) / di, s = -1;
      if (t1 > t2) {
        const tt = t1;
        t1 = t2;
        t2 = tt;
        s = 1;
      }
      if (t1 > tmin) {
        tmin = t1;
        nAxis = a;
        nSign = di > 0 ? -1 : 1;
      }
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) {
        ok = false;
        break;
      }
    }
    if (ok && tmin < bestT && tmin >= 0) {
      bestT = tmin;
      bAxis = nAxis;
      bSign = nSign;
    }
  }
  if (bestT >= maxDist || bAxis < 0)
    return null;
  const n = { x: 0, y: 0, z: 0 };
  n["xyz"[bAxis]] = bSign;
  return { t: bestT, nx: n.x, ny: n.y, nz: n.z };
}
function segmentBlockedSrv(colliders, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.000001)
    return false;
  return rayWorld(colliders, a, { x: dx / len, y: dy / len, z: dz / len }, len) < len;
}
function rayDest(dests, o, d, maxDist) {
  let bestT = maxDist, id = null;
  for (const [k, ds] of dests) {
    const b = ds.box;
    const t = rayBox(o, d, b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z);
    if (t >= 0 && t < bestT) {
      bestT = t;
      id = k;
    }
  }
  return id ? { t: bestT, id } : null;
}
function fwdXZ(yaw) {
  return { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) };
}
function fwdFull(yaw, pitch) {
  const cp = Math.cos(pitch);
  return { x: -Math.sin(yaw) * cp, y: Math.sin(pitch), z: -Math.cos(yaw) * cp };
}
function makeChain(emit) {
  let lastDue = 0;
  const q = [];
  let draining = false;
  const ch = (msg, data) => {
    const draw = DELAY + (JITTER > 0 ? Math.random() * JITTER : 0);
    const now = Date.now();
    const due = Math.max(lastDue + 1, now + draw);
    lastDue = due;
    q.push({ due, msg, data });
    if (q.length > ch.stats.qHi)
      ch.stats.qHi = q.length;
    if (draining)
      return;
    draining = true;
    const flush = () => {
      const t = Date.now();
      while (q.length && q[0].due <= t) {
        const m = q.shift();
        ch.stats.sent++;
        emit(m.msg, m.data);
      }
      if (q.length)
        setTimeout(flush, Math.min(q[0].due - t, 50));
      else
        draining = false;
    };
    setTimeout(flush, Math.max(0, Math.min(q[0].due - Date.now(), 50)));
  };
  ch.stats = { qHi: 0, sent: 0 };
  return ch;
}
var joinCounter = 0;
var nadeCounter = 0;
function buildWdefs(ld) {
  const out = new Map;
  if (!ld || typeof ld !== "object")
    return out;
  const at = ld.at && typeof ld.at === "object" ? ld.at : {};
  for (const wid of [ld.w, ld.s]) {
    if (typeof wid !== "string")
      continue;
    const base = WEAPONS.find((w) => w.id === wid);
    if (!base)
      continue;
    const def = JSON.parse(JSON.stringify(base));
    const list = Array.isArray(at[wid]) ? at[wid].filter((a) => typeof a === "string" && !!ATTACHMENTS[a]).slice(0, 3) : [];
    for (const a of list)
      ATTACHMENTS[a].apply(def);
    def.attachIds = list;
    out.set(wid, def);
  }
  return out;
}
function initAmmo(pl) {
  const am = new Map;
  if (pl.wdefs)
    for (const [wid, def] of pl.wdefs)
      am.set(wid, { mag: def.mag, res: def.reserve, rl: 0 });
  return am;
}
function makeState(spawn) {
  return {
    pos: { x: spawn.x, y: spawn.y + 0.05, z: spawn.z },
    vel: { x: 0, y: 0, z: 0 },
    yaw: Math.atan2(-spawn.x, -spawn.z),
    pitch: 0,
    crouch: 0,
    grounded: true,
    groundedTime: 0,
    jumpBufT: 0,
    slide: { active: false, t: 0, dir: { x: 0, y: 0, z: 0 } },
    apexY: spawn.y,
    stimT: 0,
    sprinting: false
  };
}
function makePlayer(id, name, spawn) {
  return {
    id,
    name,
    token: null,
    roomId: null,
    team: 0,
    st: makeState(spawn),
    seq: 0,
    q: [],
    lastIn: null,
    lastAppliedSeq: 0,
    inTimes: [],
    fireTimes: [],
    hp: H.maxHP,
    shield: 0,
    shieldT: 0,
    alive: true,
    kills: 0,
    deaths: 0,
    score: 0,
    streak: 0,
    spawnProt: 0,
    lastDmgT: 0,
    lastKillerId: null,
    hist: [],
    joined: false,
    joinOrder: 0,
    nadeTimes: [],
    nadeLive: 0,
    wdefs: null,
    ammo: null,
    streakUsed: [false, false, false],
    abId: "dash",
    abCh: 2,
    abChMax: 2,
    abCd: 0,
    fin: "default",
    trl: "none",
    healT: 0,
    srvRtt: null,
    spingAt: 0
  };
}
function makeSpec(id, name) {
  return { id, name, spec: true, joined: false, roomId: null, __chain: null };
}
var rooms = new Map;
function genCode() {
  let c;
  do {
    c = "";
    for (let i = 0;i < CODE_LEN; i++)
      c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  } while (rooms.has(c));
  return c;
}
function getRoom(id) {
  let r = rooms.get(id);
  if (!r) {
    r = {
      id,
      players: new Set,
      specs: new Set,
      tick: 0,
      priv: false,
      code: null,
      match: {
        mode: "ffa",
        state: "idle",
        tLeft: 0,
        cd: 0,
        teamS: [0, 0, 0],
        domS: [0, 0],
        domT: 0,
        endT: 0,
        winner: null,
        draw: false,
        reason: "",
        objS: [0, 0],
        snd: null,
        ggt: 0
      },
      mapId: BOOT_MAP_ID,
      knobs: { sl: 0, tl: 0 },
      spawnIdx: 0,
      hill: { idx: -1, owner: -1, prog: 0, t: 0, tickT: 0 },
      tags: [],
      cap: { snaps: 0, bytes: 0, bytesMax: 0 },
      uavT: 0,
      strikes: [],
      bombs: [],
      crates: [],
      nades: []
    };
    buildRoomWorld(r, BOOT_MAP_ID);
    rooms.set(id, r);
  }
  return r;
}
var held = new Map;
function spawnPool(room, team) {
  if (TEAM_MODES.has(room.match.mode) && room.match.state !== "idle") {
    if (room.match.mode === "ct")
      return team === 2 ? room.POOLS.ffa : team === 1 ? room.POOLS.b : room.POOLS.a;
    return team === 1 ? room.POOLS.b : room.POOLS.a;
  }
  return room.POOLS.ffa;
}
function pickSpawn(room, team, self) {
  const pool = spawnPool(room, team);
  const enemies = [...room.players].filter((p) => p !== self && p.alive && p.team !== team);
  let best = pool[0], bestScore = -1;
  for (let i = 0;i < 5; i++) {
    const sp = pool[Math.floor(Math.random() * pool.length)];
    let score = 1e9;
    for (const e of enemies)
      score = Math.min(score, Math.hypot(sp.x - e.st.pos.x, sp.z - e.st.pos.z));
    if (score > bestScore) {
      bestScore = score;
      best = sp;
    }
  }
  return best;
}
var fireAudit = [];
function audit(entry) {
  fireAudit.push(entry);
  if (fireAudit.length > 32)
    fireAudit.shift();
}
var nadeAudit = [];
function naudit(entry) {
  nadeAudit.push(entry);
  if (nadeAudit.length > 32)
    nadeAudit.shift();
}
function applyDamage(room, victim, dmg, attacker, head, weaponName, fx) {
  if (!victim.alive || victim.spawnProt > 0)
    return { blocked: true };
  if (room.match.state === "countdown")
    return { blocked: true };
  const sAbs = Math.min(victim.shield, dmg);
  victim.shield -= sAbs;
  victim.hp -= dmg - sAbs;
  victim.lastDmgT = Date.now();
  const kill = victim.hp <= 0;
  if (kill && head && attacker)
    attacker.hs = (attacker.hs || 0) + 1;
  roomChain(room, "dmg", {
    a: attacker ? attacker.id : "GRAVITY",
    v: victim.id,
    dmg: Math.round(dmg),
    head: !!head,
    kill,
    vn: victim.name,
    fx: fx ? [+fx.x.toFixed(2), +fx.z.toFixed(2)] : null
  });
  if (kill)
    killPlayer(room, victim, attacker, head, weaponName);
  return { blocked: false, kill };
}
function killPlayer(room, victim, attacker, head, weaponName) {
  victim.alive = false;
  victim.hp = 0;
  victim.deaths++;
  victim.streak = 0;
  let kn = "GRAVITY", kid = "GRAVITY";
  if (attacker && attacker !== victim) {
    kn = attacker.name;
    kid = attacker.id;
    attacker.kills++;
    attacker.streak++;
    attacker.score += CFG.XP.kill + (head ? CFG.XP.headshot : 0);
    if (victim.lastKillerId === attacker.id)
      attacker.score += CFG.XP.revenge;
    victim.lastKillerId = attacker.id;
    if ((room.match.mode === "tdm" || room.match.mode === "ct") && room.match.state === "live")
      room.match.teamS[attacker.team]++;
    if (room.match.mode === "gg" && room.match.state === "live") {
      attacker.gg = (attacker.gg || 0) + 1;
      const wid = attacker.gg <= (GGLAD || GG_LADDER.length) ? GG_LADDER[attacker.gg - 1] : "melee";
      roomChain(room, "match", { ev: "tier", id: attacker.id, t: attacker.gg, wid });
    }
    CFG.STREAKS.forEach((s, i) => {
      if (attacker.streakUsed[i] && attacker.score >= s.cost)
        attacker.streakUsed[i] = false;
    });
  }
  if (room.match.mode === "kc" && room.match.state === "live") {
    const mk = CFG.MODES.kc;
    room.tags.push({ x: +victim.st.pos.x.toFixed(2), z: +victim.st.pos.z.toFixed(2), tm: victim.team, t: mk.tagTtl, byKiller: attacker && attacker !== victim ? attacker.id : null });
    while (room.tags.length > mk.tagCap)
      room.tags.shift();
  }
  if (room.match.mode === "inf" && room.match.state === "live" && room.match.inf && room.match.inf.started && victim.team === 0) {
    victim.team = 1;
    victim.infT = true;
    roomChain(room, "match", { ev: "mode", st: "infected", why: victim.name + " WAS INFECTED" });
  }
  if (room.match.mode === "ctl" && room.match.state === "live" && typeof victim.ctlLives === "number") {
    victim.ctlLives = Math.max(0, victim.ctlLives - 1);
    if (victim.ctlLives > 0)
      roomChain(room, "match", { ev: "mode", st: "life", why: victim.name + " DOWN \u2014 " + victim.ctlLives + " LIVES" });
  }
  roomChain(room, "kill", { k: kid, kn, v: victim.id, vn: victim.name, w: weaponName, h: !!head });
}
function applyAreaDamage(room, pos, radius, maxDmg, owner, label) {
  for (const v of room.players) {
    if (!v.alive || !v.joined)
      continue;
    const feetY = v.st.pos.y;
    const hd = Math.hypot(v.st.pos.x - pos.x, v.st.pos.z - pos.z);
    const topY = feetY + CFG.PHYS.height;
    const dy = pos.y > topY ? pos.y - topY : pos.y < feetY ? feetY - pos.y : 0;
    const d = Math.hypot(Math.max(0, hd - CFG.PHYS.playerRadius), dy);
    if (d > radius)
      continue;
    let dmg = maxDmg * (1 - d / radius);
    if (segmentBlockedSrv(room.WORLD.colliders, { x: pos.x, y: 0.5, z: pos.z }, { x: v.st.pos.x, y: feetY + CFG.PHYS.height * 0.5, z: v.st.pos.z }))
      dmg *= 0.35;
    if (dmg < 1)
      continue;
    applyDamage(room, v, dmg, owner, false, label, { x: v.st.pos.x, z: v.st.pos.z });
  }
}
function detonateNade(room, nd) {
  if (nd.kind === "flash")
    return detonateFlash(room, nd);
  roomChain(room, "boom", { x: +nd.x.toFixed(2), y: +nd.y.toFixed(2), z: +nd.z.toFixed(2), r: FRAG.radius });
  applyAreaDamage(room, { x: nd.x, y: nd.y, z: nd.z }, FRAG.radius, FRAG.dmg, nd.owner, "FRAG");
}
function detonateFlash(room, nd) {
  const v = [];
  for (const p of room.players) {
    if (!p.alive || !p.joined)
      continue;
    const eyeY = p.st.pos.y + P.eyeHeight + (P.eyeHeight - 0.55 - P.eyeHeight) * p.st.crouch;
    const eye = { x: p.st.pos.x, y: eyeY, z: p.st.pos.z };
    const d = Math.hypot(eye.x - nd.x, eye.y - nd.y, eye.z - nd.z);
    if (d >= FLASH_RANGE)
      continue;
    let tx = nd.x - eye.x, ty = nd.y - eye.y, tz = nd.z - eye.z;
    const tl = Math.hypot(tx, ty, tz);
    const fwd = fwdFull(p.st.yaw, p.st.pitch);
    const facing = tl < 0.000000001 ? 0 : tx / tl * fwd.x + ty / tl * fwd.y + tz / tl * fwd.z;
    if (facing <= -0.2)
      continue;
    if (segmentBlockedSrv(room.WORLD.colliders, { x: nd.x, y: nd.y + 0.1, z: nd.z }, eye))
      continue;
    const str = Math.max(0, Math.min(1, (1 - d / FLASH_RANGE) * (facing > 0.4 ? 1 : 0.45)));
    if (str > 0.001)
      v.push([p.id, +str.toFixed(3)]);
  }
  roomChain(room, "flash", { x: +nd.x.toFixed(2), y: +nd.y.toFixed(2), z: +nd.z.toFixed(2), v });
}
function domUpdate(room, dt) {
  const m = CFG.MODES.dom;
  const players = [...room.players];
  for (const f of room.flags) {
    const inR = (p) => p.alive && Math.hypot(p.st.pos.x - f.x, p.st.pos.z - f.z) < 3.6 && p.st.pos.y < 3;
    const t0 = players.filter((p) => p.team === 0 && inR(p));
    const t1 = players.filter((p) => p.team === 1 && inR(p));
    if (t0.length && !t1.length) {
      if (f.owner !== 0) {
        const speed = m.captureTime / (1 + m.extraCapper * (t0.length - 1));
        f.prog += dt / speed;
        if (f.prog >= 1) {
          f.owner = 0;
          f.prog = 0;
          for (const c of t0)
            c.score += CFG.XP.capture;
          roomChain(room, "match", { ev: "flag", id: f.id, owner: 0 });
        }
      } else
        f.prog = 0;
    } else if (t1.length && !t0.length) {
      if (f.owner !== 1) {
        const speed = m.captureTime / (1 + m.extraCapper * (t1.length - 1));
        f.prog += dt / speed;
        if (f.prog >= 1) {
          f.owner = 1;
          f.prog = 0;
          for (const c of t1)
            c.score += CFG.XP.capture;
          roomChain(room, "match", { ev: "flag", id: f.id, owner: 1 });
        }
      } else
        f.prog = 0;
    }
  }
  room.match.domT -= dt;
  if (room.match.domT <= 0) {
    room.match.domT = m.tickSec;
    for (const f of room.flags)
      if (f.owner === 0)
        room.match.domS[0]++;
    for (const f of room.flags)
      if (f.owner === 1)
        room.match.domS[1]++;
  }
}
function hpUpdate(room, dt) {
  const m = CFG.MODES.hp;
  const hill = room.hill;
  const players = [...room.players];
  if (hill.idx === -1) {
    hill.t -= dt;
    if (hill.t <= 0) {
      hill.idx = 0;
      hill.owner = -1;
      hill.prog = 0;
      hill.t = HTIME || m.hillTime;
      hill.tickT = 0;
      roomChain(room, "match", { ev: "hill", id: "A", idx: 0 });
    }
    return;
  }
  hill.t -= dt;
  if (hill.t <= 0) {
    hill.idx = (hill.idx + 1) % room.HILLS.length;
    hill.owner = -1;
    hill.prog = 0;
    hill.t = HTIME || m.hillTime;
    hill.tickT = 0;
    roomChain(room, "match", { ev: "hill", id: room.HILLS[hill.idx].id, idx: hill.idx });
  }
  const site = room.HILLS[hill.idx];
  const inR = (p) => p.alive && Math.hypot(p.st.pos.x - site.x, p.st.pos.z - site.z) < 3.6 && p.st.pos.y < 3;
  const t0 = players.filter((p) => p.team === 0 && inR(p));
  const t1 = players.filter((p) => p.team === 1 && inR(p));
  if (t0.length && !t1.length) {
    if (hill.owner !== 0) {
      const speed = m.captureTime / (1 + m.extraCapper * (t0.length - 1));
      hill.prog += dt / speed;
      if (hill.prog >= 1) {
        hill.owner = 0;
        hill.prog = 0;
        for (const c of t0)
          c.score += CFG.XP.capture;
        roomChain(room, "match", { ev: "flag", id: site.id, owner: 0 });
      }
    } else {
      hill.tickT -= dt;
      if (hill.tickT <= 0) {
        hill.tickT = m.tickSec;
        room.match.objS[0]++;
      }
    }
  } else if (t1.length && !t0.length) {
    if (hill.owner !== 1) {
      const speed = m.captureTime / (1 + m.extraCapper * (t1.length - 1));
      hill.prog += dt / speed;
      if (hill.prog >= 1) {
        hill.owner = 1;
        hill.prog = 0;
        for (const c of t1)
          c.score += CFG.XP.capture;
        roomChain(room, "match", { ev: "flag", id: site.id, owner: 1 });
      }
    } else {
      hill.tickT -= dt;
      if (hill.tickT <= 0) {
        hill.tickT = m.tickSec;
        room.match.objS[1]++;
      }
    }
  }
}
function kcUpdate(room, dt) {
  const mk = CFG.MODES.kc;
  for (let i = room.tags.length - 1;i >= 0; i--) {
    const tg = room.tags[i];
    tg.t -= dt;
    if (tg.t <= 0) {
      room.tags.splice(i, 1);
      continue;
    }
    for (const p of room.players) {
      if (!p.alive || !p.joined)
        continue;
      if (Math.hypot(p.st.pos.x - tg.x, p.st.pos.z - tg.z) < mk.tagRadius) {
        room.tags.splice(i, 1);
        if (p.team !== tg.tm) {
          room.match.objS[p.team]++;
          p.score += CFG.XP.confirm;
          if (tg.byKiller && tg.byKiller !== p.id) {
            const k = [...room.players].find((q) => q.id === tg.byKiller);
            if (k)
              k.score += CFG.XP.deny;
          }
        } else
          p.score += CFG.XP.deny;
        break;
      }
    }
  }
}
var SND_SITE = (room) => room.SITES;
function sndRoundSpawn(room) {
  const s = room.match.snd;
  for (const p of room.players) {
    if (!p.joined)
      continue;
    const pos = pickSpawn(room, p.team, p);
    p.st = makeState(pos);
    p.hp = H.maxHP;
    p.shield = 0;
    p.alive = true;
    p.spawnProt = H.spawnProtTime;
    p.lastDmgT = Date.now();
    p.hist.length = 0;
    p.q.length = 0;
    p.lastIn = null;
    if (p.__chain)
      p.__chain("match", { ev: "round", r: s.r, side: s.side, spawn: [+p.st.pos.x.toFixed(3), +p.st.pos.y.toFixed(3), +p.st.pos.z.toFixed(3)] });
  }
}
function sndStart(room) {
  room.match.snd = { r: 1, side: 0, ph: "pre", preT: CFG.MODES.snd.preRound, rt: 0, bt: -1, pp: 0, dp: 0, siteIdx: 0, bx: null, bz: null, swapped: false };
  sndRoundSpawn(room);
}
function trioRoundSpawn(room) {
  for (const p of room.players) {
    if (!p.joined)
      continue;
    const pos = pickSpawn(room, p.team, p);
    p.st = makeState(pos);
    p.hp = H.maxHP;
    p.shield = 0;
    p.alive = true;
    p.spawnProt = H.spawnProtTime;
    p.lastDmgT = Date.now();
    p.hist.length = 0;
    p.q.length = 0;
    p.lastIn = null;
    if (p.__chain)
      p.__chain("match", { ev: "round", spawn: [+p.st.pos.x.toFixed(3), +p.st.pos.y.toFixed(3), +p.st.pos.z.toFixed(3)] });
  }
}
function gfRoundStart(room) {
  const g = room.match.gf, cm = CFG.MODES.gf;
  g.kit = CFG.GF_KITS[(g.r - 1) % CFG.GF_KITS.length];
  roomChain(room, "match", { ev: "gfkit", kit: g.kit, r: g.r });
  trioRoundSpawn(room);
}
function gfUpdate(room, dt) {
  const g = room.match.gf, cm = CFG.MODES.gf;
  if (!g)
    return;
  if (g.ph === "pre") {
    g.preT -= dt;
    if (g.preT <= 0) {
      g.ph = "live";
      g.rt = cm.roundTime;
      roomChain(room, "match", { ev: "mode", st: "live", why: "GUNFIGHT \u2014 40s" });
    }
    return;
  }
  if (g.ph === "inter") {
    g.preT -= dt;
    if (g.preT <= 0) {
      if (g.r === cm.swapAfter && !g.swapped) {
        g.swapped = true;
        g.side = 1 - g.side;
      }
      const lim = RLIMIT || cm.roundLimit;
      if (room.match.objS[0] >= lim || room.match.objS[1] >= lim) {
        matchFinish(room, "limit");
        return;
      }
      g.r++;
      gfRoundStart(room);
      g.ph = "pre";
      g.preT = cm.preRound;
    }
    return;
  }
  g.rt -= dt;
  const ps = [...room.players].filter((p) => p.joined);
  if (g.rt <= 0) {
    const a0 = ps.filter((p) => p.alive && p.team === 0).length, a1 = ps.filter((p) => p.alive && p.team === 1).length;
    room.match.objS[a0 > a1 ? 0 : 1]++;
    roomChain(room, "match", { ev: "mode", st: "round", why: "TIME \u2014 MOST ALIVE" });
    g.ph = "inter";
    g.preT = cm.intermission;
    return;
  }
  if (!ps.some((p) => p.alive && p.team === 0)) {
    room.match.objS[1]++;
    roomChain(room, "match", { ev: "mode", st: "round", why: "SQUAD ELIMINATED" });
    g.ph = "inter";
    g.preT = cm.intermission;
    return;
  }
  if (!ps.some((p) => p.alive && p.team === 1)) {
    room.match.objS[0]++;
    roomChain(room, "match", { ev: "mode", st: "round", why: "SQUAD ELIMINATED" });
    g.ph = "inter";
    g.preT = cm.intermission;
    return;
  }
}
function infUpdate(room, dt) {
  const inf = room.match.inf, cm = CFG.MODES.inf;
  if (!inf)
    return;
  if (!inf.started) {
    inf.first -= dt;
    if (inf.first <= 0) {
      inf.started = true;
      const ps = [...room.players].filter((p) => p.joined);
      const pz = ps[Math.floor(Math.random() * ps.length)];
      if (pz) {
        pz.team = 1;
        pz.infT = true;
        inf.pz = pz.id;
      }
      roomChain(room, "match", { ev: "mode", st: "pz", why: (pz ? pz.name : "A COMBATANT") + " IS PATIENT ZERO" });
    }
    return;
  }
}
function ctlRoundStart(room) {
  const c = room.match.ctl, cm = CFG.MODES.ctl;
  c.caps = 0;
  c.extraUsed = false;
  c.sites = [0, 1];
  room.SITES.forEach((s) => {
    s.ctlProg = 0;
    s.ctlDone = false;
  });
  for (const p of room.players)
    p.ctlLives = cm.lives;
  trioRoundSpawn(room);
}
function ctlUpdate(room, dt) {
  const c = room.match.ctl, cm = CFG.MODES.ctl;
  if (!c)
    return;
  if (c.ph === "pre") {
    c.preT -= dt;
    if (c.preT <= 0) {
      c.ph = "live";
      c.rt = cm.roundTime;
      roomChain(room, "match", { ev: "mode", st: "live", why: c.side === 0 ? "CAPTURE A + B" : "DEFEND A + B" });
    }
    return;
  }
  if (c.ph === "inter") {
    c.preT -= dt;
    if (c.preT <= 0) {
      if (c.r === cm.roundLimit - 1 && !c.swapped) {
        c.swapped = true;
        c.side = 1 - c.side;
      }
      const lim = RLIMIT || cm.roundLimit;
      if (room.match.objS[0] >= lim || room.match.objS[1] >= lim) {
        matchFinish(room, "limit");
        return;
      }
      c.r++;
      ctlRoundStart(room);
      c.ph = "pre";
      c.preT = cm.preRound;
    }
    return;
  }
  const ps = [...room.players].filter((p) => p.joined);
  let capsNow = 0;
  for (const si of c.sites) {
    const site = room.SITES[si % room.SITES.length];
    const contest = (t) => ps.filter((p) => p.alive && p.team === t && Math.hypot(p.st.pos.x - site.x, p.st.pos.z - site.z) < cm.capRadius && p.st.pos.y < 3).length;
    if (c.side === 0) {
      if (contest(0) > 0 && contest(1) === 0) {
        const speed = cm.captureTime / (1 + cm.extraCapper * (contest(0) - 1));
        site.ctlProg = (site.ctlProg || 0) + dt / speed;
        if (site.ctlProg >= 1) {
          site.ctlProg = 0;
          site.ctlDone = true;
          c.caps++;
          c.rt += cm.captureBonus;
          c.extraUsed = true;
          roomChain(room, "match", { ev: "mode", st: "cap", why: "ZONE " + site.id + " CAPTURED +" + cm.captureBonus + "s" });
        }
      } else
        site.ctlProg = Math.max(0, (site.ctlProg || 0) - dt * 0.5);
    } else
      site.ctlDone = false;
    if (site.ctlDone)
      capsNow++;
  }
  if (capsNow >= c.sites.length) {
    room.match.objS[c.side]++;
    roomChain(room, "match", { ev: "mode", st: "round", why: "ALL ZONES CAPTURED" });
    c.ph = "inter";
    c.preT = cm.intermission;
    return;
  }
  c.rt -= dt;
  if (c.rt <= 0) {
    room.match.objS[1 - c.side]++;
    roomChain(room, "match", { ev: "mode", st: "round", why: "TIME \u2014 ZONES HELD" });
    c.ph = "inter";
    c.preT = cm.intermission;
    return;
  }
  const atk = ps.filter((p) => p.team === c.side);
  const atkAlive = atk.some((p) => p.alive);
  const atkLives = atk.reduce((s, p) => s + Math.max(0, (p.ctlLives ?? cm.lives) - (p.alive ? 0 : 1)), 0);
  if (!atkAlive && atkLives <= 0) {
    room.match.objS[1 - c.side]++;
    roomChain(room, "match", { ev: "mode", st: "round", why: "ATTACKERS OUT OF LIVES" });
    c.ph = "inter";
    c.preT = cm.intermission;
    return;
  }
}
function sndRoundEnd(room, winnerTeam, why) {
  const s = room.match.snd, m = CFG.MODES.snd;
  s.ph = "inter";
  s.preT = m.intermission;
  room.match.objS[winnerTeam]++;
  roomChain(room, "match", { ev: "bomb", st: why === "TARGET DESTROYED" ? "boom" : why === "BOMB DEFUSED" ? "defused" : "round", why });
}
function sndUpdate(room, dt) {
  const s = room.match.snd, m = CFG.MODES.snd;
  if (!s)
    return;
  if (s.ph === "pre") {
    s.preT -= dt;
    if (s.preT <= 0) {
      s.ph = "live";
      s.rt = RTIME || m.roundTime;
      roomChain(room, "match", { ev: "bomb", st: "round", why: "live" });
    }
    return;
  }
  if (s.ph === "inter") {
    s.preT -= dt;
    if (s.preT <= 0) {
      if (s.r >= m.swapAfter && !s.swapped) {
        s.swapped = true;
        s.side = 1 - s.side;
      }
      const lim = RLIMIT || m.roundLimit;
      if (room.match.objS[0] >= lim || room.match.objS[1] >= lim) {
        matchFinish(room, "limit");
        return;
      }
      s.r++;
      s.siteIdx = (s.r - 1) % 2;
      s.bt = -1;
      s.pp = 0;
      s.dp = 0;
      s.bx = null;
      s.bz = null;
      sndRoundSpawn(room);
      s.ph = "pre";
      s.preT = m.preRound;
    }
    return;
  }
  const atk = s.side;
  const site = SND_SITE(room)[s.siteIdx % room.SITES.length];
  const players = [...room.players].filter((p) => p.joined);
  if (s.bt < 0) {
    const planters = players.filter((p) => p.alive && p.team === atk && Math.hypot(p.st.pos.x - site.x, p.st.pos.z - site.z) < 3.6 && p.st.pos.y < 3);
    if (planters.length) {
      s.pp += dt / (PTIME || m.plantTime);
      if (s.pp >= 1) {
        s.bt = BTIME || m.bombTime;
        s.bx = site.x;
        s.bz = site.z;
        s.pp = 0;
        planters[0].score += CFG.XP.plant;
        roomChain(room, "match", { ev: "bomb", st: "planted", why: "site " + site.id });
      }
    } else
      s.pp = Math.max(0, s.pp - dt * 0.5);
    s.rt -= dt;
    if (s.rt <= 0) {
      sndRoundEnd(room, 1 - atk, "TIME \u2014 SITES HELD");
      return;
    }
  } else {
    s.bt -= dt;
    const defusers = players.filter((p) => p.alive && p.team !== atk && Math.hypot(p.st.pos.x - s.bx, p.st.pos.z - s.bz) < 3.6);
    if (defusers.length) {
      s.dp += dt / (DTIME || m.defuseTime);
      if (s.dp >= 1) {
        defusers[0].score += CFG.XP.defuse;
        sndRoundEnd(room, 1 - atk, "BOMB DEFUSED");
        return;
      }
    } else
      s.dp = Math.max(0, s.dp - dt * 0.5);
    if (s.bt <= 0) {
      applyAreaDamage(room, { x: s.bx, y: 0.5, z: s.bz }, SND_BOMB.radius, SND_BOMB.dmg, null, "BOMB");
      sndRoundEnd(room, atk, "TARGET DESTROYED");
      return;
    }
  }
  const atkAlive = players.some((p) => p.alive && p.team === atk);
  const defAlive = players.some((p) => p.alive && p.team !== atk);
  if (!defAlive) {
    sndRoundEnd(room, atk, "DEFENDERS ELIMINATED");
    return;
  }
  if (!atkAlive && s.bt < 0) {
    sndRoundEnd(room, 1 - atk, "ATTACKERS ELIMINATED");
    return;
  }
}
function matchStart(room, mode, by) {
  if (!CFG.MODES[mode])
    return false;
  const m = room.match;
  m.mode = mode;
  m.state = "countdown";
  m.cd = 3;
  m.tLeft = room.knobs.tl || CFG.MODES[mode].time || 0;
  m.teamS = [0, 0, 0];
  m.domS = [0, 0];
  m.domT = 0;
  m.winner = null;
  m.draw = false;
  m.reason = "";
  m.objS = [0, 0];
  m.snd = null;
  m.ggt = (GGLAD || GG_LADDER.length) + 1;
  m.gf = null;
  m.inf = null;
  m.ctl = null;
  room.hill = { idx: -1, owner: -1, prog: 0, t: HLEAD || CFG.MODES.hp.leadIn, tickT: 0 };
  room.tags = [];
  for (const f of room.flags) {
    f.owner = -1;
    f.prog = 0;
  }
  room.uavT = 0;
  room.strikes = [];
  room.bombs = [];
  room.crates = [];
  room.nades = [];
  const ps = [...room.players].sort((a, b) => a.joinOrder - b.joinOrder);
  ps.forEach((p, i) => {
    p.kills = 0;
    p.deaths = 0;
    p.score = 0;
    p.streak = 0;
    p.lastKillerId = null;
    p.streakUsed = [false, false, false];
    p.healT = 0;
    p.nadeLive = 0;
    p.nadeTimes = [];
    p.abCd = 0;
    p.abCh = p.abChMax;
    p.gg = 0;
    p.ctlLives = null;
    p.infT = false;
    if (mode === "inf")
      p.team = 0;
    else if (TEAM_MODES.has(mode)) {
      p.team = i % 2 === 0 ? 0 : 1;
    }
  });
  if (mode === "snd")
    sndStart(room);
  if (mode === "gf") {
    m.gf = { r: 1, side: 0, ph: "pre", preT: CFG.MODES.gf.preRound, rt: 0, kit: null, swapped: false };
    gfRoundStart(room);
  }
  if (mode === "inf") {
    m.inf = { started: false, first: CFG.MODES.inf.first, pz: null };
  }
  if (mode === "ctl") {
    m.ctl = { r: 1, side: 0, ph: "pre", preT: CFG.MODES.ctl.preRound, rt: 0, caps: 0, extraUsed: false, sites: [0, 1] };
    ctlRoundStart(room);
  }
  roomChain(room, "match", { ev: "start", md: mode, by: by ? by.name : null });
  broadcastRoster(room);
  return true;
}
function matchFinish(room, reason) {
  const m = room.match;
  m.state = "ended";
  m.reason = reason;
  m.endT = 6;
  const ps = [...room.players];
  if (m.mode === "ffa") {
    const sorted = ps.slice().sort((a, b) => b.kills - a.kills);
    m.winner = sorted[0] ? sorted[0].id : null;
    m.draw = sorted.length > 1 && sorted[0].kills === sorted[1].kills;
  } else if (m.mode === "tdm") {
    m.winner = m.teamS[0] > m.teamS[1] ? "TEAM-A" : m.teamS[1] > m.teamS[0] ? "TEAM-B" : null;
    m.draw = m.teamS[0] === m.teamS[1];
  } else if (m.mode === "ct") {
    const t = m.teamS, top = Math.max(t[0], t[1], t[2]);
    const leaders = [t[0], t[1], t[2]].map((v, i) => [v, i]).filter((x) => x[0] === top);
    m.winner = leaders.length > 1 ? null : ["TEAM-A", "TEAM-B", "TEAM-C"][leaders[0][1]];
    m.draw = leaders.length > 1;
  } else if (m.mode === "dom") {
    m.winner = m.domS[0] > m.domS[1] ? "TEAM-A" : m.domS[1] > m.domS[0] ? "TEAM-B" : null;
    m.draw = m.domS[0] === m.domS[1];
  } else if (m.mode === "hp" || m.mode === "kc" || m.mode === "snd" || m.mode === "gf" || m.mode === "ctl") {
    m.winner = m.objS[0] > m.objS[1] ? "TEAM-A" : m.objS[1] > m.objS[0] ? "TEAM-B" : null;
    m.draw = m.objS[0] === m.objS[1];
  } else if (m.mode === "inf") {
    const survivors = ps.some((p) => p.joined && p.alive && p.team === 0);
    m.winner = survivors ? "TEAM-A" : "TEAM-B";
    m.draw = false;
  } else if (m.mode === "gg") {
    const sorted = ps.slice().sort((a, b) => (b.gg || 0) - (a.gg || 0));
    m.winner = sorted[0] ? sorted[0].id : null;
    m.draw = false;
  } else
    m.winner = null;
  const board = ps.map((p) => ({ id: p.id, n: p.name, k: p.kills, de: p.deaths, s: p.score, team: p.team })).sort((a, b) => b.k - a.k);
  roomChain(room, "match", { ev: "end", md: m.mode, reason, winner: m.winner, draw: m.draw, board });
  const ranked = !room.priv && RANKED_MODES.includes(m.mode) && ps.length >= RANKED_MIN_PLAYERS;
  for (const p of ps) {
    if (!p.pid)
      continue;
    const wonTeam = m.winner === (p.team === 0 ? "TEAM-A" : "TEAM-B");
    const res = m.draw ? "draw" : m.winner == null ? "loss" : m.winner === p.id || wonTeam ? "win" : "loss";
    const gained = (res === "win" ? XP_AWARD.win : res === "draw" ? XP_AWARD.draw : XP_AWARD.loss) + p.kills * XP_AWARD.kill + (p.score || 0) * XP_AWARD.perScore;
    const rec = careerRec(p.pid, p.name);
    const lvlBefore = rec.lvl;
    rec.k += p.kills;
    rec.d += p.deaths;
    rec.m += 1;
    if (res === "win")
      rec.w += 1;
    rec.xp += gained;
    rec.lvl = lvlFromXp(rec.xp);
    rec.n = p.name;
    rec.last = Date.now();
    if ((rec.bs || 0) < (p.streak || 0))
      rec.bs = p.streak || 0;
    const eco = ecoRec(rec);
    const crG = crDelta(p.kills, res === "win");
    eco.cr += crG;
    const bp = bpRec(rec);
    const bpGain = BP_AWARD.match + (res === "win" ? BP_AWARD.win : 0);
    bp.x += bpGain;
    const es = evsRec(rec).stats;
    es.kills += p.kills || 0;
    es.wins += res === "win" ? 1 : 0;
    es.matches += 1;
    es.xp += bpGain;
    es.headshots += p.hs || 0;
    p.hs = 0;
    CAREER_DIRTY = true;
    const t = rec.tally[m.mode] || (rec.tally[m.mode] = { m: 0, w: 0 });
    t.m += 1;
    if (res === "win")
      t.w += 1;
    CAREER_DIRTY = true;
    p.__chain("career", { gained, total: rec.xp, lvl: rec.lvl, up: rec.lvl > lvlBefore, m: rec.m, k: rec.k, d: rec.d, w: rec.w, crG, cr: eco.cr });
    if (ranked) {
      const cur = seasonOf(Date.now()).id;
      if (!rec.rk || rec.rk.s !== cur) {
        if (rec.rk && rec.rk.pk) {
          const peak = tierOf(rec.rk.pk);
          if (RANK_REWARDS[peak]) {
            eco.cr += RANK_REWARDS[peak];
            p.__chain("ranked", { delta: 0, rp: rec.rk.rp, tier: peak, up: false, s: rec.rk.s, pk: rec.rk.pk, m: rec.rk.m, w: rec.rk.w, rw: RANK_REWARDS[peak] });
          }
        }
        rec.rk = { s: cur, rp: rec.rk ? softReset(rec.rk.rp) : 0, pk: rec.rk ? rec.rk.pk : 0, m: 0, w: 0 };
      }
      const tierBefore = tierOf(rec.rk.rp);
      const delta = rpDelta(res, p.kills);
      rec.rk.rp = Math.max(0, rec.rk.rp + delta);
      if (rec.rk.rp > rec.rk.pk)
        rec.rk.pk = rec.rk.rp;
      rec.rk.m += 1;
      if (res === "win")
        rec.rk.w += 1;
      CAREER_DIRTY = true;
      p.__chain("ranked", { delta, rp: rec.rk.rp, tier: tierOf(rec.rk.rp), up: tierOf(rec.rk.rp) !== tierBefore, s: rec.rk.s, pk: rec.rk.pk, m: rec.rk.m, w: rec.rk.w });
    }
  }
  careerPersist();
}
function matchUpdate(room, dt) {
  const m = room.match;
  if (m.state === "idle" || m.state === "ended") {
    if (m.state === "ended") {
      m.endT -= dt;
      if (m.endT <= 0) {
        m.state = "idle";
        roomChain(room, "match", { ev: "lobby" });
      }
    }
    return;
  }
  if (m.state === "countdown") {
    m.cd -= dt;
    if (m.cd <= 0) {
      m.state = "live";
      roomChain(room, "match", { ev: "live" });
    }
    return;
  }
  if (m.mode !== "practice" && m.mode !== "snd" && m.mode !== "gf" && m.mode !== "ctl") {
    m.tLeft -= dt;
    if (m.tLeft <= 0) {
      m.tLeft = 0;
      matchFinish(room, "time");
      return;
    }
  }
  if (m.mode === "dom")
    domUpdate(room, dt);
  if (m.mode === "hp")
    hpUpdate(room, dt);
  if (m.mode === "kc")
    kcUpdate(room, dt);
  if (m.mode === "snd")
    sndUpdate(room, dt);
  if (m.mode === "gf")
    gfUpdate(room, dt);
  if (m.mode === "inf")
    infUpdate(room, dt);
  if (m.mode === "ctl")
    ctlUpdate(room, dt);
  const cm = CFG.MODES[m.mode];
  if (m.mode === "ffa") {
    for (const p of room.players)
      if (p.kills >= (KLIMIT || room.knobs.sl || cm.killLimit)) {
        matchFinish(room, "limit");
        return;
      }
  } else if (m.mode === "tdm") {
    if (m.teamS[0] >= (KLIMIT || room.knobs.sl || cm.teamLimit) || m.teamS[1] >= (KLIMIT || room.knobs.sl || cm.teamLimit) || m.mode === "ct" && m.teamS[2] >= (KLIMIT || room.knobs.sl || cm.teamLimit)) {
      matchFinish(room, "limit");
      return;
    }
  } else if (m.mode === "dom") {
    if (m.domS[0] >= (KLIMIT || room.knobs.sl || cm.pointLimit) || m.domS[1] >= (KLIMIT || room.knobs.sl || cm.pointLimit)) {
      matchFinish(room, "limit");
      return;
    }
  } else if (m.mode === "hp") {
    if (m.objS[0] >= (KLIMIT || room.knobs.sl || cm.pointLimit) || m.objS[1] >= (KLIMIT || room.knobs.sl || cm.pointLimit)) {
      matchFinish(room, "limit");
      return;
    }
  } else if (m.mode === "kc") {
    if (m.objS[0] >= (KLIMIT || room.knobs.sl || cm.teamLimit) || m.objS[1] >= (KLIMIT || room.knobs.sl || cm.teamLimit)) {
      matchFinish(room, "limit");
      return;
    }
  } else if (m.mode === "gf" || m.mode === "ctl") {
    const lim = RLIMIT || cm.roundLimit;
    if (m.objS[0] >= lim || m.objS[1] >= lim) {
      matchFinish(room, "limit");
      return;
    }
  } else if (m.mode === "inf") {
    if (m.inf && m.inf.started && ![...room.players].some((p) => p.joined && p.alive && p.team === 0)) {
      matchFinish(room, "limit");
      return;
    }
  } else if (m.mode === "gg") {
    for (const p of room.players)
      if ((p.gg || 0) >= GG_TOTAL + 1) {
        matchFinish(room, "limit");
        return;
      }
  }
}
// ================= [T147] THE BOT-FILL LAW — MP bots were NEVER BUILT (the T146 audit: the hub
// bundle carries ZERO bot code; the user's "supposed to propagate 10s" was the reconnect-slot
// grace misread). Now it exists: an empty room is not a lobby. A human joining a room with open
// slots starts a grace clock (IRON_BOT_DELAY, default the 10s the user quoted); when it expires,
// the hub fills toward IRON_BOTS TOTAL seats (humans + bots) — bots are REAL room players (the
// same makePlayer shape, the same stepState physics, the same fire/applyDamage path, real
// killfeed/scoreboard/corpse legs through the EXISTING wire events), so every client sees them
// with zero client changes. Bots hold when no match is live, fight only at live, and drop when
// the last human has been gone 30s (the reconnect-grace window keeps them through a blip).
// Env: IRON_BOTS (total seats, default 8, 0 = fill OFF) · IRON_BOT_DELAY (ms, default 10000).
var BOT_FILL = (() => { const n = Number(process.env.IRON_BOTS); return Number.isFinite(n) && n >= 0 ? Math.min(11, Math.floor(n)) : 8; })();
var BOT_DELAY = (() => { const n = Number(process.env.IRON_BOT_DELAY); return Number.isFinite(n) && n >= 2000 ? Math.floor(n) : 10000; })();
var BOT_NAMES = ["IVAN", "KOVA", "JINX", "HALE", "RUIN", "VEGA", "ONYX", "PICO", "SABLE", "DRIFT", "NOVA", "ROOK"];
var BOT_LOADOUTS = ["vanguard", "raider", "hornet", "sabre", "wasp", "ripper"];
var BOT_SIGHT = 55;   // target-acquisition range (m)
var BOT_FIRE_MAX = 46; // max engage range (m) — honest falloff band
var BOT_SPREAD = 0.035; // aim jitter (rad) — beatable at range, lethal in the face
var BOT_TURN = 0.6;   // max yaw change per 10Hz think (rad) ≈ 6 rad/s — no snap-aim
var botSeq = 0;
function humansIn(room) {
  let n = 0;
  for (const p of room.players)
    if (!p.bot && p.joined)
      n++;
  return n;
}
function botsIn(room) {
  let n = 0;
  for (const p of room.players)
    if (p.bot)
      n++;
  return n;
}
function botEye(p) {
  return { x: p.st.pos.x, y: p.st.pos.y + P.eyeHeight + (P.eyeHeight - 0.55 - P.eyeHeight) * p.st.crouch, z: p.st.pos.z }; // the fire handler's own eye formula, verbatim
}
function turnToward(a, want, max) {
  let d = (want - a) % (Math.PI * 2);
  if (d > Math.PI)
    d -= Math.PI * 2;
  else if (d < -Math.PI)
    d += Math.PI * 2;
  return a + Math.max(-max, Math.min(max, d));
}
function addBot(room) {
  botSeq++;
  const team = TEAM_MODES.has(room.match.mode) && room.match.state !== "idle" ? room.match.mode === "ct" ? room.players.size % 3 : room.players.size % 2 : 0; // the join handler's own team law
  const spawn = pickSpawn(room, team, null);
  const b = makePlayer("B" + botSeq.toString(36) + Math.random().toString(36).slice(2, 6), "BOT " + BOT_NAMES[botSeq % BOT_NAMES.length], spawn);
  b.bot = true;
  b.team = team;
  b.joinOrder = joinCounter++;
  b.abId = "dash";
  b.abCh = 2;
  b.abChMax = 2;
  b.wid = BOT_LOADOUTS[botSeq % BOT_LOADOUTS.length];
  b.wdefs = buildWdefs({ w: b.wid });
  b.ammo = initAmmo(b);
  b.fin = "default";
  b.trl = "none";
  b.pid = null;
  b.__chain = null; // a bot owns no socket — roomChain skips it, snapshot/roster read its fields like any player's
  b.ai = { think: Math.random() * 0.1, in: { ix: 0, iz: 0, sprint: false, jumpEdge: false }, wp: null, wpAt: 0, target: null, reactAt: 0, fireAt: 0, burst: 0, strafe: 0, respawnAt: 0, lastX: b.st.pos.x, lastZ: b.st.pos.z, stuck: 0, wantFire: false };
  b.joined = true;
  room.players.add(b);
  return b;
}
function botAudit(room) { // the fill/trim/drop law — on join, on rejoin, on disconnect, once per sim second
  const humans = humansIn(room);
  if (humans === 0) {
    if (!room.botsOutAt)
      room.botsOutAt = Date.now();
    else if (Date.now() - room.botsOutAt > 30000) { // 30s > RECONNECT_MS(10s) — a transport blip never dissolves the lobby the player is rejoining
      let dropped = false;
      for (const p of [...room.players])
        if (p.bot) {
          room.players.delete(p);
          dropped = true;
        }
      room.botsOutAt = 0;
      room.botsAt = 0;
      if (dropped) {
        broadcastRoster(room);
        console.log(`[room] bot-drop: all bots out of ${room.id} (room empty)`);
      }
    }
    return;
  }
  room.botsOutAt = 0;
  if (!BOT_FILL)
    return;
  const want = Math.max(0, Math.min(BOT_FILL, MAX_ROOM - 1) - humans); // one seat always stays open for a joining human
  const have = botsIn(room);
  if (have === want) {
    room.botsAt = 0;
    return;
  }
  if (have < want) {
    if (!room.botsAt)
      room.botsAt = Date.now(); // the grace clock — the user's "propagate 10s"
    if (Date.now() - room.botsAt < BOT_DELAY)
      return;
    addBot(room);
    broadcastRoster(room);
    console.log(`[room] bot-fill: ${botsIn(room)}/${want} bots in ${room.id} (humans ${humans})`);
  } else {
    let over = have - want;
    for (const p of [...room.players]) {
      if (over <= 0)
        break;
      if (p.bot) {
        room.players.delete(p);
        over--;
      }
    }
    room.botsAt = 0;
    broadcastRoster(room);
  }
}
function botRespawnOk(room) { // the human respawn gate's shape (the snd/gf round law)
  const m = room.match;
  if (m.mode === "snd" && m.snd && m.snd.ph !== "inter")
    return false;
  if (m.mode === "gf" && m.gf && m.gf.ph !== "inter")
    return false;
  return true;
}
function doRespawn(room, p, pos) { // [T147] the respawn body EXTRACTED from the socket handler — one law for humans and bots
  p.st = makeState(pos || pickSpawn(room, p.team, p));
  p.hp = H.maxHP;
  p.shield = 0;
  p.alive = true;
  p.spawnProt = H.spawnProtTime;
  p.lastDmgT = Date.now();
  p.hist.length = 0;
  p.q.length = 0;
  p.lastIn = null;
  if (p.wdefs && p.wdefs.size) {
    p.ammo = initAmmo(p);
    if (p.__chain)
      for (const [wid, def] of p.wdefs)
        p.__chain("ammo", { w: wid, mag: def.mag, res: def.reserve });
  }
}
function botThink(room, b, live, now) { // 10Hz — target select, steering, fire intent
  const inq = b.ai.in;
  let best = null, bestD = 1e9;
  for (const q of room.players) {
    if (q === b || !q.joined || !q.alive)
      continue;
    if (TEAM_MODES.has(room.match.mode) && q.team === b.team)
      continue;
    const d = Math.hypot(q.st.pos.x - b.st.pos.x, q.st.pos.z - b.st.pos.z);
    if (d > BOT_SIGHT || d >= bestD)
      continue;
    if (segmentBlockedSrv(room.WORLD.colliders, botEye(b), botEye(q)))
      continue;
    best = q;
    bestD = d;
  }
  if (best && best !== b.ai.target)
    b.ai.reactAt = now + 380 + Math.random() * 320; // first-sight reaction — a bot never snaps on contact
  b.ai.target = best;
  if (best) {
    const want = Math.atan2(-(best.st.pos.x - b.st.pos.x), -(best.st.pos.z - b.st.pos.z)); // the makeState facing law
    b.st.yaw = turnToward(b.st.yaw, want, BOT_TURN);
    const fx = -Math.sin(b.st.yaw), fz = -Math.cos(b.st.yaw), rx = -fz, rz = fx; // physics.js:390 verbatim
    const dx = best.st.pos.x - b.st.pos.x, dz = best.st.pos.z - b.st.pos.z;
    if (bestD > 16) {
      inq.ix = Math.max(-1, Math.min(1, dx * rx + dz * rz));
      inq.iz = Math.max(-1, Math.min(1, dx * fx + dz * fz));
      inq.sprint = bestD > 26;
    } else {
      b.ai.strafe++;
      inq.ix = b.ai.strafe % 8 < 4 ? 0.8 : -0.8; // close-in jiggle — a strafing target, not a posting dummy
      inq.iz = 0.15;
      inq.sprint = false;
    }
  } else {
    if (!b.ai.wp || now > b.ai.wpAt || Math.hypot(b.ai.wp.x - b.st.pos.x, b.ai.wp.z - b.st.pos.z) < 2.2) {
      const pool = spawnPool(room, b.team);
      b.ai.wp = pool[Math.floor(Math.random() * pool.length)];
      b.ai.wpAt = now + 9000;
    }
    const want = Math.atan2(-(b.ai.wp.x - b.st.pos.x), -(b.ai.wp.z - b.st.pos.z));
    b.st.yaw = turnToward(b.st.yaw, want, BOT_TURN);
    const fx = -Math.sin(b.st.yaw), fz = -Math.cos(b.st.yaw), rx = -fz, rz = fx; // physics.js:390 verbatim
    const dx = b.ai.wp.x - b.st.pos.x, dz = b.ai.wp.z - b.st.pos.z;
    inq.ix = Math.max(-1, Math.min(1, dx * rx + dz * rz));
    inq.iz = Math.max(-1, Math.min(1, dx * fx + dz * fz));
    inq.sprint = true;
  }
  b.ai.wantFire = !!(best && live && bestD <= BOT_FIRE_MAX && now >= b.ai.reactAt && !segmentBlockedSrv(room.WORLD.colliders, botEye(b), botEye(best)));
}
function botFire(room, b, now) { // the human fire handler's shape — wall ray, box hitboxes, falloff, ammo+reload, the fired-reveal broadcast
  if (!b.ai.wantFire)
    return;
  const wdef = b.wdefs && b.wdefs.get(b.wid);
  if (!wdef)
    return;
  if (!b.ammo)
    b.ammo = initAmmo(b);
  let am = b.ammo.get(b.wid);
  if (!am) {
    am = { mag: wdef.mag, res: wdef.reserve, rl: 0 };
    b.ammo.set(b.wid, am);
  }
  if (am.mag <= 0) {
    if (!am.rl)
      am.rl = now + Math.round((wdef.reloadT || 2) * 1000);
    if (now < am.rl)
      return;
    am.mag = wdef.mag;
    am.res = Math.max(0, am.res - wdef.mag);
    if (am.res <= 0)
      am.res = wdef.reserve; // bots carry honest mags but never run dry — ammo poverty is not the fill's feature
    am.rl = 0;
  }
  const t = b.ai.target;
  if (!t || !t.alive) {
    b.ai.wantFire = false;
    return;
  }
  const eye = botEye(b), te = botEye(t);
  let dx = te.x - eye.x, dy = te.y - eye.y, dz = te.z - eye.z;
  const dl = Math.hypot(dx, dy, dz) || 1;
  dx = dx / dl + (Math.random() - 0.5) * BOT_SPREAD;
  dy = dy / dl + (Math.random() - 0.5) * BOT_SPREAD;
  dz = dz / dl + (Math.random() - 0.5) * BOT_SPREAD;
  const dl2 = Math.hypot(dx, dy, dz) || 1;
  const o = { x: eye.x, y: eye.y, z: eye.z }, d = { x: dx / dl2, y: dy / dl2, z: dz / dl2 };
  let bestT = rayWorld(room.WORLD.colliders, o, d, 300);
  let victim = null, hitHead = false, hitPoint = null;
  for (const q of room.players) { // present-tick hitboxes — a bot shoots NOW (no client rewind to honor)
    if (q === b || !q.joined || !q.alive)
      continue;
    if (TEAM_MODES.has(room.match.mode) && q.team === b.team)
      continue;
    const h = heightOf(q.st.crouch);
    const center = { x: q.st.pos.x, y: q.st.pos.y + h * 0.5, z: q.st.pos.z };
    const headC = { x: center.x, y: center.y + h * 0.3, z: center.z };
    const tHead = rayBox(o, d, headC.x - HEAD_HS, headC.y - HEAD_HS, headC.z - HEAD_HS, headC.x + HEAD_HS, headC.y + HEAD_HS, headC.z + HEAD_HS);
    const tBody = rayBox(o, d, center.x - BODY_BW, center.y - h * 0.5, center.z - BODY_BW, center.x + BODY_BW, center.y + h * 0.45, center.z + BODY_BW);
    let tHit = -1, head = false;
    if (tHead >= 0 && (tBody < 0 || tHead <= tBody)) {
      tHit = tHead;
      head = true;
    } else if (tBody >= 0)
      tHit = tBody;
    if (tHit >= 0 && tHit < bestT) {
      bestT = tHit;
      victim = q;
      hitHead = head;
      hitPoint = { x: o.x + d.x * tHit, y: o.y + d.y * tHit, z: o.z + d.z * tHit };
    }
  }
  am.mag--;
  if (!wdef.suppressed)
    for (const q of room.players)
      if (q.joined && q !== b && q.__chain)
        q.__chain("fired", { id: b.id }); // the minimap-reveal parity (the mp.js 'fired' mirror)
  if (victim && hitPoint) {
    const [near, far, minM] = wdef.falloff;
    let mult = 1;
    if (bestT > near)
      mult = 1 + (minM - 1) * Math.min(1, (bestT - near) / Math.max(0.1, far - near));
    const dmg = wdef.dmg * (hitHead ? wdef.hs : 1) * mult;
    applyDamage(room, victim, dmg, b, hitHead, wdef.name, hitPoint);
  }
  const interval = Math.max(60, Math.round(60000 / (wdef.rpm || 600)));
  b.ai.burst = b.ai.burst > 0 ? b.ai.burst - 1 : 2 + Math.floor(Math.random() * 4);
  b.ai.fireAt = now + (b.ai.burst > 0 ? interval : interval + 420 + Math.floor(Math.random() * 520)); // the human breath — bursts, then a pause
}
function stepBots(room, dt) { // the 60Hz driver — decisions at 10Hz, the SAME input wire shape humans emit
  if (botsIn(room) === 0)
    return;
  const live = room.match.state === "live";
  const now = Date.now();
  for (const b of room.players) {
    if (!b.bot || !b.joined)
      continue;
    if (!b.alive) {
      if (!b.ai.respawnAt)
        b.ai.respawnAt = now + 2600;
      else if (now >= b.ai.respawnAt && (live || room.match.state === "idle") && botRespawnOk(room))
        doRespawn(room, b, pickSpawn(room, b.team, b)), b.ai.respawnAt = 0;
      continue;
    }
    b.ai.think -= dt;
    if (b.ai.think <= 0) {
      b.ai.think = 0.1;
      botThink(room, b, live, now);
    }
    const inq = b.ai.in;
    b.seq++;
    b.q.push({ seq: b.seq, ix: inq.ix, iz: inq.iz, yaw: b.st.yaw, pitch: b.st.pitch, sprint: !!inq.sprint, ads: false, crouch: false, crouchEdge: false, jumpEdge: !!inq.jumpEdge, autoSprint: false });
    inq.jumpEdge = false;
    if (b.q.length > FOLD)
      b.q.shift();
    if (live && now >= b.ai.fireAt)
      botFire(room, b, now);
    const moved = Math.hypot(b.st.pos.x - b.ai.lastX, b.st.pos.z - b.ai.lastZ);
    if ((inq.ix || inq.iz) && moved < 0.012)
      b.ai.stuck += dt;
    else
      b.ai.stuck = 0;
    b.ai.lastX = b.st.pos.x;
    b.ai.lastZ = b.st.pos.z;
    if (b.ai.stuck > 0.7) { // wall/corner watch — hop once and pick a fresh waypoint
      inq.jumpEdge = true;
      b.ai.wp = null;
      b.ai.stuck = 0;
    }
  }
}
setInterval(() => { // [T147] THE EMPTY-ROOM GC — getRoom() only ever ADDED rooms (the T146 metrics leak: rooms:3 at players:0)
  const now = Date.now();
  for (const [id, r] of rooms) {
    if (r.players.size > 0 || (r.specs && r.specs.size > 0)) {
      r.gcAt = 0;
      continue;
    }
    if (r.match.state === "live" || r.match.state === "countdown") {
      r.match.state = "idle";
      r.match.tLeft = 0;
    }
    if (!r.gcAt)
      r.gcAt = now;
    else if (now - r.gcAt > 120000) {
      rooms.delete(id);
      console.log(`[room] gc: ${id} empty >2min`);
    }
  }
}, 30000).unref();
function stepRoom(room, dt) {
  room.tick++;
  matchUpdate(room, dt);
  if (room.tick % 60 === 0)
    botAudit(room); // [T147] the once-per-second fill/trim/drop sweep
  stepBots(room, dt); // [T147] bot inputs ride the SAME stepState path the humans consume below
  const now = Date.now();
  for (const p of room.players) {
    if (!p.joined)
      continue;
    let inp;
    if (p.q.length === 0) {
      // [T151] THE INPUT-TRUTH LAW — a starved tick applies NO input (the body coasts through
      // stepState's zero-input friction). The old hold re-applied p.lastIn EVERY starved tick,
      // which converted any client input-rate deficit (frame dips > the 50ms dt cap, background
      // throttle, the headless/low-end class) into server-side EXTRA movement: the server body
      // outran the prediction by (ticks - inputs)/inputs and the §8 correction blend dragged the
      // client along — measured 2× walk speed on the repro rig, ZERO while standing (ix=iz=0
      // holds apply nothing) — exactly the user's "something doubles with the movement, only when
      // I walk, only online". Each REAL input now applies EXACTLY ONCE on both sides (the client
      // replays the same unacked seqs), so prediction and server agree over ANY window and the
      // drift collapses to the latency constant. Bots are untouched: stepBots feeds one input per
      // tick BEFORE this loop, so a bot queue never starves and never reads this branch.
      inp = null;
    } else {
      while (p.q.length > (p.bot ? FOLD : FOLD_NET)) // [T151] humans buffer at FOLD_NET (the RTT law above); bots keep the tight FOLD (their feed is steady 60Hz)
        p.q.shift();
      inp = p.q.shift();
      p.lastAppliedSeq = inp.seq;
      p.lastIn = { ...inp };
    }
    if (inp) {
      if (Number.isFinite(inp.yaw))
        p.st.yaw = inp.yaw;
      if (Number.isFinite(inp.pitch))
        p.st.pitch = inp.pitch;
    }
    if (p.alive) {
      const ev = stepState(p.st, inp || { ix: 0, iz: 0, sprint: false, ads: false, crouch: false, crouchEdge: false, jumpEdge: false, autoSprint: false }, room.WORLD, dt);
      if (ev.land && ev.land.fall > P.fallDamageH) {
        const dmg = Math.min(P.fallDmgCap, (ev.land.fall - P.fallDamageH) * P.fallDmgPerM);
        applyDamage(room, p, dmg, null, false, "GRAVITY", { x: p.st.pos.x, z: p.st.pos.z });
      }
      if (p.alive && p.hp < H.maxHP && now - p.lastDmgT > H.regenDelay * 1000) {
        p.hp = Math.min(H.maxHP, p.hp + H.regenRate * dt);
      }
    }
    if (p.spawnProt > 0)
      p.spawnProt = Math.max(0, p.spawnProt - dt);
    if (p.healT > 0) {
      p.healT -= dt;
      if (p.alive)
        p.hp = Math.min(H.maxHP, p.hp + STIM.heal / STIM.healTime * dt);
    }
    if (p.shield > 0) {
      p.shieldT -= dt;
      if (p.shieldT <= 0)
        p.shield = Math.max(0, p.shield - H.shieldDecay * dt * 10);
    }
    if (now - p.spingAt > 1000) {
      p.spingAt = now;
      if (p.__chain)
        p.__chain("sping", { t: now });
    }
    p.hist.push({ tick: room.tick, x: p.st.pos.x, y: p.st.pos.y, z: p.st.pos.z, h: heightOf(p.st.crouch), alive: p.alive });
    if (p.hist.length > HIST)
      p.hist.shift();
  }
  for (let i = room.nades.length - 1;i >= 0; i--) {
    const nd = room.nades[i];
    nd.f -= dt;
    if (nd.f <= 0) {
      detonateNade(room, nd);
      room.nades.splice(i, 1);
      if (nd.owner)
        nd.owner.nadeLive = Math.max(0, nd.owner.nadeLive - 1);
      continue;
    }
    nd.vy -= NADE_GRAV * dt;
    const sx = nd.vx * dt, sy = nd.vy * dt, sz = nd.vz * dt;
    const len = Math.hypot(sx, sy, sz);
    if (len > 0.001) {
      const dir = { x: sx / len, y: sy / len, z: sz / len };
      const hit = rayWorldN(room.WORLD.colliders, nd, dir, len + 0.11);
      if (hit) {
        const t = Math.max(0, hit.t - 0.12);
        nd.x += dir.x * t;
        nd.y += dir.y * t;
        nd.z += dir.z * t;
        const vn = nd.vx * hit.nx + nd.vy * hit.ny + nd.vz * hit.nz;
        const kb = 1 + FRAG.bounce;
        nd.vx -= hit.nx * vn * kb;
        nd.vy -= hit.ny * vn * kb;
        nd.vz -= hit.nz * vn * kb;
        nd.vx *= NADE_DAMP;
        nd.vy *= NADE_DAMP;
        nd.vz *= NADE_DAMP;
      } else {
        nd.x += sx;
        nd.y += sy;
        nd.z += sz;
      }
    }
  }
  if (room.uavT > 0)
    room.uavT = Math.max(0, room.uavT - dt);
  for (let i = room.strikes.length - 1;i >= 0; i--) {
    const s = room.strikes[i];
    s.t -= dt;
    if (s.t <= 0) {
      const st2 = CFG.STREAKS[1];
      for (let b = 0;b < st2.bombs; b++) {
        room.bombs.push({ t: b * 0.13, x: s.target.x + s.dir.x * (b - (st2.bombs - 1) / 2) * 3.2, z: s.target.z + s.dir.z * (b - (st2.bombs - 1) / 2) * 3.2, owner: s.owner });
      }
      room.strikes.splice(i, 1);
    }
  }
  for (let i = room.bombs.length - 1;i >= 0; i--) {
    const b2 = room.bombs[i];
    b2.t -= dt;
    if (b2.t <= 0) {
      const st2 = CFG.STREAKS[1];
      roomChain(room, "boom", { x: +b2.x.toFixed(2), y: 0.4, z: +b2.z.toFixed(2), r: st2.radius });
      applyAreaDamage(room, { x: b2.x, y: 0.4, z: b2.z }, st2.radius, st2.dmg, b2.owner, "AIRSTRIKE");
      room.bombs.splice(i, 1);
    }
  }
  for (let i = room.crates.length - 1;i >= 0; i--) {
    const c = room.crates[i];
    c.y -= 9 * dt;
    if (c.y <= 0.45) {
      const o = c.owner;
      if (o) {
        o.shield = H.shieldMax;
        o.shieldT = CFG.STREAKS[2].shieldTime;
      }
      roomChain(room, "supply", { x: +c.x.toFixed(2), z: +c.z.toFixed(2), by: o ? o.id : null });
      room.crates.splice(i, 1);
    }
  }
  if (room.tick % SNAP_EVERY === 0)
    sendSnap(room);
}
function snapshot(room) {
  const ack = {};
  const pl = [];
  for (const p of room.players) {
    if (!p.joined)
      continue;
    ack[p.id] = p.lastAppliedSeq;
    const s2 = p.st, h = heightOf(s2.crouch);
    pl.push({
      id: p.id,
      n: p.name,
      x: +s2.pos.x.toFixed(3),
      y: +s2.pos.y.toFixed(3),
      z: +s2.pos.z.toFixed(3),
      vx: +s2.vel.x.toFixed(3),
      vy: +s2.vel.y.toFixed(3),
      vz: +s2.vel.z.toFixed(3),
      yaw: +s2.yaw.toFixed(3),
      pitch: +s2.pitch.toFixed(3),
      f: (s2.crouch > 0.5 ? FBIT.CROUCH : 0) | (s2.slide.active ? FBIT.SLIDE : 0) | (s2.grounded ? FBIT.GROUNDED : 0) | (s2.sprinting ? FBIT.SPRINT : 0),
      hp: Math.round(p.hp),
      sh: Math.round(p.shield),
      k: p.kills,
      de: p.deaths,
      s: p.score,
      al: p.alive ? 1 : 0,
      tm: p.team,
      st: p.streak,
      rt: p.srvRtt != null ? Math.round(p.srvRtt) : -1,
      g: room.match.mode === "gg" ? p.gg || 0 : undefined
    });
  }
  const m = room.match;
  const s = m.snd;
  return {
    tick: room.tick,
    ack,
    pl,
    m: {
      md: m.mode,
      st: m.state,
      tl: Math.ceil(m.tLeft),
      s0: m.mode === "dom" ? m.domS[0] : TEAM_MODES.has(m.mode) && m.mode !== "tdm" ? m.objS[0] : m.teamS[0],
      s1: m.mode === "dom" ? m.domS[1] : TEAM_MODES.has(m.mode) && m.mode !== "tdm" ? m.objS[1] : m.teamS[1],
      s2: m.mode === "ct" ? m.teamS[2] : undefined,
      fl: room.flags.map((f) => [f.owner, +f.prog.toFixed(2)]),
      uav: Math.max(0, Math.ceil(room.uavT)),
      hp: m.mode === "hp" ? [room.hill.idx, room.hill.owner, +room.hill.prog.toFixed(2), Math.max(0, Math.ceil(room.hill.t))] : null,
      tags: m.mode === "kc" ? room.tags.map((t) => [t.x, t.z, t.tm]) : null,
      snd: s ? { r: s.r, ph: s.ph, side: s.side, rt: Math.max(0, Math.ceil(s.rt)), bt: s.bt >= 0 ? Math.max(0, Math.ceil(s.bt)) : -1, pp: +s.pp.toFixed(2), dp: +s.dp.toFixed(2), bx: s.bx, bz: s.bz } : null,
      ggt: m.mode === "gg" ? m.ggt : null,
      gf: m.mode === "gf" && m.gf ? { r: m.gf.r, side: m.gf.side, ph: m.gf.ph, rt: Math.max(0, Math.ceil(m.gf.rt)), kit: m.gf.kit } : null,
      inf: m.mode === "inf" && m.inf ? { started: m.inf.started, first: Math.max(0, Math.ceil(m.inf.first)) } : null,
      ctl: m.mode === "ctl" && m.ctl ? { r: m.ctl.r, side: m.ctl.side, ph: m.ctl.ph, rt: Math.max(0, Math.ceil(m.ctl.rt)), caps: m.ctl.caps, sites: m.ctl.sites, zf: room.SITES.map((s2) => [s2.ctlDone ? 1 : 0, +s2.ctlProg.toFixed(2)]) } : null,
      lives: m.mode === "ctl" ? Object.fromEntries([...room.players].filter((p) => p.joined).map((p) => [p.id, p.ctlLives ?? 0])) : null
    }
  };
}
function sendSnap(room) {
  const s = snapshot(room);
  room.cap.snaps++;
  const bytes = JSON.stringify(s).length;
  room.cap.bytes += bytes;
  if (bytes > room.cap.bytesMax)
    room.cap.bytesMax = bytes;
  if (CAP_ON)
    s.et = Date.now();
  roomChain(room, "snap", s);
}
function roomChain(room, msg, data) {
  for (const p of room.players) {
    if (p.joined && p.__chain)
      p.__chain(msg, data);
  }
  if (room.specs)
    for (const s of room.specs) {
      if (s.__chain)
        s.__chain(msg, data);
    }
}
function hostOf(room) {
  let h = null;
  for (const q of room.players)
    if (!h || q.joinOrder < h.joinOrder)
      h = q;
  return h;
}
function broadcastRoster(room) {
  const h = hostOf(room);
  roomChain(room, "roster", { host: h ? h.id : null, hostN: h ? h.name : null, ps: [...room.players].map((q) => ({ id: q.id, n: q.name, tm: q.team, cf: q.fin && q.fin !== "default" ? q.fin : undefined, ct: q.trl && q.trl !== "none" ? q.trl : undefined, co: q.op || undefined, cl: q.pid && SOCIAL.memberOf[q.pid] ? SOCIAL.clans[SOCIAL.memberOf[q.pid]].tag : undefined })), specs: room.specs ? room.specs.size : 0, md: room.match.mode, map: room.mapId, knobs: room.knobs && (room.knobs.sl || room.knobs.tl) ? { sl: room.knobs.sl || undefined, tl: room.knobs.tl || undefined } : undefined, priv: room.priv || undefined, code: room.priv ? room.code : undefined });
}
var clockRunning = false;
var tickN = 0;
var tickStart = 0;
var clockTimer = null;
function kickClock() {
  if (clockRunning)
    return;
  clockRunning = true;
  tickN = 0;
  tickStart = Date.now();
  const loop = () => {
    tickN++;
    const anyActive = [...rooms.values()].some((r) => r.players.size > 0);
    if (!anyActive) {
      clockRunning = false;
      return;
    }
    const tEntry = Date.now();
    const late = tEntry - (tickStart + (tickN - 1) * DT_MS);
    for (const r of rooms.values())
      if (r.players.size > 0)
        stepRoom(r, DT);
    const exec = Date.now() - tEntry;
    capTicks.n++;
    capPush(capTicks.late, late);
    if (late > capTicks.lateMax)
      capTicks.lateMax = late;
    if (late > 5)
      capTicks.lateOver++;
    capPush(capTicks.exec, exec);
    if (exec > capTicks.execMax)
      capTicks.execMax = exec;
    if (exec > 4)
      capTicks.execOver++;
    const target = tickStart + tickN * DT_MS;
    clockTimer = setTimeout(loop, Math.max(0, target + DT_MS - Date.now()));
  };
  clockTimer = setTimeout(loop, 0);
}
var VIOL_WIN = 30000;
var VIOL_COOL = 50;
var MUTE_MS = 1e4;
var VIOL_KICK = 400;
var SWEEP = { n: 0, by: {} };
function swept(ev) {
  SWEEP.n++;
  SWEEP.by[ev] = (SWEEP.by[ev] || 0) + 1;
}
function bucketFor(buckets, ev, now, win) {
  let b = buckets.get(ev);
  if (!b) {
    b = [];
    buckets.set(ev, b);
  }
  while (b.length && now - b[0] > win)
    b.shift();
  return b;
}
function rateOk(buckets, ev, cap, win = 1000, sCap, sWin) {
  const now = Date.now();
  const vio = buckets.vio;
  if (vio && now < vio.mutedUntil) {
    vio.n++;
    vio.by[ev] = (vio.by[ev] || 0) + 1;
    swept(ev);
    return false;
  }
  const b = bucketFor(buckets, ev, now, win);
  const sb = sCap ? bucketFor(buckets, ev + ":s", now, sWin) : null;
  if (b.length >= cap || sb && sb.length >= sCap) {
    if (vio) {
      vio.n++;
      vio.by[ev] = (vio.by[ev] || 0) + 1;
      vio.w.push(now);
      while (vio.w.length && now - vio.w[0] > VIOL_WIN)
        vio.w.shift();
      if (vio.w.length >= VIOL_COOL)
        vio.mutedUntil = now + MUTE_MS;
      if (vio.n >= VIOL_KICK && buckets.kick)
        buckets.kick();
    } else
      swept(ev);
    return false;
  }
  if (sb)
    sb.push(now);
  b.push(now);
  return true;
}
var PING_SUST = [60, 1e4];
var STATUS_SUST = [15, 1e4];
var LB_SUST = [15, 1e4];
var SPONG_SUST = [20, 1e4];
var RELOAD_SUST = [12, 1e4];
var SETMODE_SUST = [12, 1e4];
var SETMAP_SUST = [12, 1e4];
var SETKNOB_SUST = [10, 1e4];
var VOICE_SUST = [600, 60000];
var MAPREG_SUST = [6, 60000];
var MAPDATA_SUST = [10, 60000];
var AUTH_SUST = [10, 1e4];
var ECO_SUST = [30, 1e4];
var TK_SECRET = process.env.IRONSIGHT_TK_SECRET || "ironsight-tk-dev-v1";
var TK_PENDING = new Map;
var LS_SECRET = process.env.IRON_LS_WEBHOOK_SECRET || "";
var LS_MAP = new Map((process.env.IRONSIGHT_LS_MAP || "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
  const i = s.indexOf(":");
  return i > 0 ? [s.slice(i + 1), s.slice(0, i)] : null;
}).filter(Boolean));
var LS_SEEN = new Map;
var LS_SEEN_CAP = 512;
function tkCredit(pid, packId, via) {
  TK_CREDITS.n++;
  const pack = tk.packById(packId);
  if (!pack)
    return null;
  const e = ecoRec(careerRec(pid, "PILOT"));
  e.tk = (e.tk | 0) + pack.tk;
  e.tkhist = e.tkhist || [];
  e.tkhist.push({ pack: pack.id, tk: pack.tk, usd: pack.usd, t: Date.now(), via });
  if (e.tkhist.length > tk.TK_HIST_CAP)
    e.tkhist = e.tkhist.slice(-tk.TK_HIST_CAP);
  CAREER_DIRTY = true;
  careerPersist();
  return { tk: e.tk, tkhist: e.tkhist.slice(-tk.TK_HIST_CAP) };
}
function lsWebhook(req, res) {
  const chunks = [];
  let n = 0;
  req.on("data", (c) => {
    n += c.length;
    if (n <= 262144)
      chunks.push(c);
  });
  req.on("end", () => {
    try {
      const raw = Buffer.concat(chunks).toString("utf8");
      const sig = String(req.headers["x-signature"] || "").trim();
      if (!LS_SECRET) {
        res.writeHead(503, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, err: "webhook-unarmed" }));
        return;
      }
      const want = createHmac("sha256", LS_SECRET).update(raw).digest("hex");
      const got = Buffer.from(sig, "utf8");
      const exp = Buffer.from(want, "utf8");
      if (!sig || got.length !== exp.length || !timingSafeEqual(got, exp)) {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, err: "signature" }));
        return;
      }
      const evt = JSON.parse(raw || "{}");
      const meta = evt.meta || {};
      const data = evt.data || {};
      const attrs = data.attributes || {};
      const key = `${data.id || ""}:${meta.event_name || ""}`;
      if (LS_SEEN.has(key)) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, dedup: true }));
        return;
      }
      const cd = meta.custom_data || {};
      let pid = typeof cd.pid === "string" ? cd.pid : null;
      let packId = typeof cd.pack === "string" ? cd.pack : null;
      if (!packId) {
        const lsId = String(attrs.variant_id || attrs.product_id || attrs.first_order_item && attrs.first_order_item.variant_id || "");
        packId = LS_MAP.get(lsId) || null;
      }
      if (!pid || !tk.packById(packId)) {
        console.log(`[webhook] ${meta.event_name || "?"} order=${data.id || "?"} UNBOUND pid=${pid ? "y" : "n"} pack=${packId || "?"}`);
        LS_SEEN.set(key, Date.now());
        if (LS_SEEN.size > LS_SEEN_CAP) {
          const k = LS_SEEN.keys().next().value;
          LS_SEEN.delete(k);
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, err: "unbound" }));
        return;
      }
      const r = tkCredit(pid, packId, "webhook");
      LS_SEEN.set(key, Date.now());
      if (LS_SEEN.size > LS_SEEN_CAP) {
        const k = LS_SEEN.keys().next().value;
        LS_SEEN.delete(k);
      }
      if (!r) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, err: "pack" }));
        return;
      }
      let pushed = 0;
      for (const s of io2.of("/").sockets.values())
        if (s.data && s.data.pid === pid) {
          s.emit("eco", { op: "state", ...ecoState(pid) });
          pushed++;
        }
      console.log(`[webhook] ${meta.event_name || "?"} order=${data.id || "?"} CREDITED pack=${packId} pid=${pid} tk=${r.tk} live-push=${pushed}`);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, tk: r.tk }));
    } catch (e) {
      console.error("[webhook] error:", e && e.message);
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, err: "error" }));
    }
  });
}
var SOC_SUST = [30, 1e4];
var Q_SUST = [20, 1e4];
var AC_KICKS = { n: 0 };
var httpServer = createServer();
var IRON_ORIGINS = (process.env.IRON_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
var io2 = new Server(httpServer, {
  path: "/",
  cors: { origin: IRON_ORIGINS.length ? IRON_ORIGINS : "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000
});
var eioReq = httpServer.listeners("request").slice();
httpServer.removeAllListeners("request");
var eioUpg = httpServer.listeners("upgrade").slice();
httpServer.removeAllListeners("upgrade");
httpServer.on("upgrade", (req, sock, head) => {
  if (/^\/room(\/|$|\?)/.test(req.url || ""))
    req.url = (req.url || "").replace(/^\/room/, "") || "/";
  for (const l of eioUpg)
    l.call(httpServer, req, sock, head);
});
var STATIC_ROOT = (process.env.IRON_STATIC || "").replace(/\/+$/, "");
var MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".md": "text/plain; charset=utf-8",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm"
};
httpServer.on("request", (req, res) => {
  if (/^\/room(\/|$|\?)/.test(req.url || ""))
    req.url = (req.url || "").replace(/^\/room/, "") || "/";
  const u = (req.url || "").split("?")[0];
  if (req.method === "POST" && u === "/hooks/ls")
    return lsWebhook(req, res);
  if (req.method === "GET" && u === "/healthz") {
    res.setHeader("access-control-allow-origin", req.headers.origin || "*"); // [T114] the cross-origin GO-LIVE probe — the static game page fetches this hub over CORS; the same-origin proxy era never needed it (live-caught by probe_hub_t114: acao absent → the panel face reads UNREACHABLE against a LIVE hub)
    let pn = 0;
    for (const r of rooms.values())
      pn += r.players.size + (r.specs ? r.specs.size : 0);
    res.writeHead(200, { "content-type": "text/plain", "x-iron-players": String(pn), "x-iron-rooms": String(rooms.size), "x-iron-ls-armed": LS_SECRET ? "1" : "0", "x-iron-pow": String(POW_NIB) });
    res.end("ironsight-room ok");
    return;
  }
  if (req.method === "GET" && u === "/metrics") {
    res.setHeader("access-control-allow-origin", req.headers.origin || "*"); // [T114] ops parity with /healthz
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    let pn = 0;
    for (const r of rooms.values())
      pn += r.players.size + (r.specs ? r.specs.size : 0);
    const L = [
      "ironsight_room 1",
      "version v2.9.36-t151",
      "uptime_s " + Math.round(process.uptime()),
      "players " + pn,
      "bots " + [...rooms.values()].reduce((a, r) => a + botsIn(r), 0),
      "rooms " + rooms.size,
      "joins_total " + SWEEP_METRICS.joins,
      "joins_flood_rejected " + SWEEP_METRICS.joinsFlood,
      "joins_pow_rejected " + SWEEP_METRICS.joinsPow,
      "conn_flood_dropped " + SWEEP_METRICS.connFlood,
      "ac_kicks_total " + AC_KICKS.n,
      "reports_total " + REPORTS.length,
      "voice_frames_relayed " + SWEEP_METRICS.voiceFrames,
      "voice_frames_dropped " + SWEEP_METRICS.voiceDrops,
      "mapregs_ok " + SWEEP_METRICS.mapregs,
      "mapregs_bad " + SWEEP_METRICS.mapregsBad,
      "mapdata_pulls " + SWEEP_METRICS.mapdataPulls,
      "tk_credits_total " + TK_CREDITS.n,
      "pow_nib " + POW_NIB,
      "ls_webhook_armed " + (LS_SECRET ? 1 : 0)
    ];
    res.end(L.join(`
`) + `
`);
    return;
  }
  if (STATIC_ROOT && (req.method === "GET" || req.method === "HEAD") && !u.startsWith("/socket.io")) {
    let rel = "/" + ((req.url || "/").split("?")[0] || "").replace(/^\/+/, "");
    try {
      rel = decodeURIComponent(rel);
    } catch {
      rel = "/";
    }
    const abs = pathResolve(join(STATIC_ROOT, "." + rel));
    const inside = abs === STATIC_ROOT || abs.startsWith(STATIC_ROOT + sep);
    let fp = inside ? abs : "";
    if (fp && existsSync(fp) && statSync(fp).isDirectory())
      fp = join(fp, "index.html");
    if (fp && existsSync(fp) && statSync(fp).isFile()) {
      const st = statSync(fp);
      res.writeHead(200, { "content-type": MIME[extname(fp).toLowerCase()] || "application/octet-stream", "cache-control": "no-cache", "content-length": String(st.size) });
      if (req.method === "HEAD")
        return res.end();
      return createReadStream(fp).pipe(res);
    }
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-cache" });
    return res.end("404 \u2014 not found");
  }
  for (const l of eioReq)
    l.call(httpServer, req, res);
});
io2.on("connection", (socket) => {
  if (!floodOk("conn", ipKey(socket.handshake))) {
    SWEEP_METRICS.connFlood++;
    console.log("[room] connect flood drop: " + ipKey(socket.handshake));
    socket.disconnect(true);
    return;
  }
  console.log(`[room] connected: ${socket.id}`);
  const chain = makeChain((m, d) => socket.emit(m, d));
  let p = null;
  const rl = new Map;
  rl.vio = { n: 0, by: {}, w: [], mutedUntil: 0, kicked: false };
  rl.kick = () => {
    const vio = rl.vio;
    if (vio.kicked)
      return;
    vio.kicked = true;
    console.log(`[room] AC kick: ${socket.id} n=${vio.n} by=${JSON.stringify(vio.by)}`);
    AC_KICKS.n++;
    if (p && p.pid) {
      const rec = careerRec(p.pid, p.name);
      rec.ac = { t: Date.now(), n: vio.n, by: { ...vio.by } };
      CAREER_DIRTY = true;
      careerPersist();
    }
    socket.disconnect(true);
  };
  socket.on("join", (d) => {
    try {
      if (p)
        return;
      d = d || {};
      if (typeof d.token === "string" && held.has(d.token)) {
        const h = held.get(d.token);
        clearTimeout(h.purgeTimer);
        held.delete(d.token);
        p = h.p;
        p.id = socket.id;
        const room2 = rooms.get(h.roomId) || getRoom(h.roomId);
        room2.players.add(p);
        p.__chain = chain;
        p.joined = true;
        chain("joined", { id: p.id, roomSize: room2.players.size, spawn: { x: p.st.pos.x, y: p.st.pos.y, z: p.st.pos.z }, token: p.token, room: room2.id, code: room2.priv ? room2.code : undefined, restored: true, ...p.pid ? { profile: profileOf(p.pid), ranked: rankedView(CAREER.players[p.pid]) } : {} });
        broadcastRoster(room2);
        console.log(`[room] rejoin: ${p.name} -> ${room2.id} (${room2.players.size})`);
        botAudit(room2); // [T147] the rejoin is a human arrival — the fill/trim law reads it
        kickClock();
        return;
      }
      if (!floodOk("join", ipKey(socket.handshake))) {
        SWEEP_METRICS.joinsFlood++;
        chain("joinErr", { why: "flood" });
        return;
      }
      if (!powOk(d.pow)) {
        SWEEP_METRICS.joinsPow++;
        chain("joinErr", { why: "pow", ...powIssue() });
        return;
      }
      SWEEP_METRICS.joins++;
      const name = typeof d.name === "string" && d.name.trim().length && d.name.length <= 16 ? d.name.trim() : "OP-" + socket.id.slice(0, 4);
      let room;
      if (d.priv === true) {
        const code = genCode();
        room = getRoom(code);
        room.priv = true;
        room.code = code;
        console.log(`[room] private create -> ${code}`);
      } else if (typeof d.code === "string" && d.code) {
        const norm = d.code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LEN);
        if (norm.length !== CODE_LEN) {
          chain("joinErr", { why: "code" });
          return;
        }
        room = rooms.get(norm);
        if (!room || !room.priv) {
          chain("joinErr", { why: "noRoom" });
          return;
        }
      } else {
        const roomName = typeof d.room === "string" && /^[a-zA-Z0-9]{1,8}$/.test(d.room) ? d.room.toUpperCase() : "A";
        room = getRoom(roomName);
        if (room.priv) {
          chain("joinErr", { why: "code" });
          return;
        }
      }
      if (d.spec === true) {
        if (room.specs.size >= SPEC_MAX) {
          chain("joinErr", { why: "specFull" });
          return;
        }
        p = makeSpec(socket.id, name);
        p.roomId = room.id;
        p.__chain = chain;
        const spawn2 = pickSpawn(room, 0, null);
        room.specs.add(p);
        chain("joined", { id: p.id, roomSize: room.players.size, spawn: { x: +spawn2.x.toFixed(3), y: 0.05, z: +spawn2.z.toFixed(3) }, room: room.id, code: room.priv ? room.code : undefined, spec: true });
        broadcastRoster(room);
        console.log(`[room] spectate: ${p.name} -> ${room.id} (${room.specs.size}/${SPEC_MAX} specs)`);
        kickClock();
        return;
      }
      if (room.players.size >= MAX_ROOM) {
        chain("joinErr", { why: "roomFull" });
        return;
      }
      const team = TEAM_MODES.has(room.match.mode) && room.match.state !== "idle" ? room.match.mode === "ct" ? room.players.size % 3 : room.players.size % 2 : 0;
      const spawn = pickSpawn(room, team, null);
      p = makePlayer(socket.id, name, spawn);
      p.token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      p.roomId = room.id;
      p.team = team;
      p.joinOrder = joinCounter++;
      const ab = ABILITIES.find((a) => a.id === d.ab) || ABILITIES[0];
      p.abId = ab.id;
      p.abCh = ab.charges || 1;
      p.abChMax = p.abCh;
      p.wdefs = buildWdefs(d.ld);
      p.ammo = initAmmo(p);
      p.fin = cos.FINISHES.some((f) => f.id === d.fin) ? d.fin : "default";
      p.trl = cos.TRAILS.some((t) => t.id === d.trl) ? d.trl : "none";
      p.op = ops.OPERATORS.some((o) => o.id === d.op) ? d.op : undefined;
      p.pid = PID_OK(d.pid) ? d.pid : null;
      p.__chain = chain;
      room.players.add(p);
      p.joined = true;
      chain("joined", { id: p.id, roomSize: room.players.size, live: room.match.state === "live" || room.match.state === "countdown", spawn: { x: +spawn.x.toFixed(3), y: 0.05, z: +spawn.z.toFixed(3) }, token: p.token, room: room.id, code: room.priv ? room.code : undefined, ...p.pid ? { profile: profileOf(p.pid), ranked: rankedView(CAREER.players[p.pid]) } : {} });
      broadcastRoster(room);
      console.log(`[room] join: ${p.name} -> ${room.id} (${room.players.size}) ab=${p.abId}`);
      botAudit(room); // [T147] the human arrival arms the bot-fill grace clock
      kickClock();
    } catch (e) {
      console.error("[room] join error", e);
    }
  });
  socket.on("input", (m) => {
    if (!p || !p.joined)
      return;
    if (!m || typeof m !== "object")
      return;
    const now = Date.now();
    p.inTimes.push(now);
    while (p.inTimes.length && now - p.inTimes[0] > 1000)
      p.inTimes.shift();
    if (p.inTimes.length > INPUT_CAP)
      return;
    if (!Number.isFinite(m.seq) || m.seq <= p.seq)
      return;
    p.seq = m.seq;
    const inp = {
      seq: m.seq,
      ix: Number.isFinite(m.ix) ? Math.max(-2, Math.min(2, m.ix)) : 0,
      iz: Number.isFinite(m.iz) ? Math.max(-2, Math.min(2, m.iz)) : 0,
      yaw: Number.isFinite(m.yaw) ? m.yaw : p.st.yaw,
      pitch: Number.isFinite(m.pitch) ? Math.max(-CFG.LOOK.pitchClamp, Math.min(CFG.LOOK.pitchClamp, m.pitch)) : p.st.pitch,
      sprint: !!m.sprint,
      ads: !!m.ads,
      crouch: !!m.crouch,
      crouchEdge: !!m.crouchEdge,
      jumpEdge: !!m.jumpEdge,
      autoSprint: !!m.autoSprint
    };
    if (p.q.length > 240)
      p.q.shift();
    p.q.push(inp);
  });
  socket.on("fire", (m) => {
    if (!p || !p.joined)
      return;
    const room = rooms.get(p.roomId);
    if (!room)
      return;
    const now = Date.now();
    p.fireTimes.push(now);
    while (p.fireTimes.length && now - p.fireTimes[0] > 1000)
      p.fireTimes.shift();
    const reject = (why) => audit({ t: now, id: p.id, reject: why });
    if (p.fireTimes.length > FIRE_CAP)
      return reject("rate");
    if (!p.alive)
      return reject("dead");
    if (!m || !Array.isArray(m.o) || !Array.isArray(m.d) || m.o.length !== 3 || m.d.length !== 3)
      return reject("shape");
    const o = { x: +m.o[0], y: +m.o[1], z: +m.o[2] }, d = { x: +m.d[0], y: +m.d[1], z: +m.d[2] };
    if (![o.x, o.y, o.z, d.x, d.y, d.z].every(Number.isFinite))
      return reject("nan");
    const wdef = p.wdefs && p.wdefs.get(m.w) || WEAPONS.find((w) => w.id === m.w);
    if (!wdef)
      return reject("weapon");
    const eyeY = p.st.pos.y + P.eyeHeight + (P.eyeHeight - 0.55 - P.eyeHeight) * p.st.crouch;
    const eye = { x: p.st.pos.x, y: eyeY, z: p.st.pos.z };
    if (Math.hypot(o.x - eye.x, o.y - eye.y, o.z - eye.z) > 2)
      return reject("origin");
    const dl = Math.hypot(d.x, d.y, d.z);
    if (dl < 0.2 || dl > 2)
      return reject("dir");
    d.x /= dl;
    d.y /= dl;
    d.z /= dl;
    const rtCli = Math.max(0, Math.min(600, Number(m.rt) || 0));
    const rt = p.srvRtt != null ? Math.max(0, p.srvRtt) : rtCli;
    const rtSrc = p.srvRtt != null ? "srv" : "cli";
    if (!p.ammo)
      p.ammo = new Map;
    let am = p.ammo.get(m.w);
    if (!am) {
      am = { mag: wdef.mag, res: wdef.reserve, rl: 0 };
      p.ammo.set(m.w, am);
    }
    if (now < am.rl) {
      chain("ammo", { w: m.w, mag: am.mag, res: am.res });
      return reject("reloading");
    }
    if (am.mag <= 0) {
      chain("ammo", { w: m.w, mag: am.mag, res: am.res });
      return reject("empty");
    }
    am.mag--;
    if (!wdef.suppressed) {
      for (const q of room.players)
        if (q.joined && q !== p && q.__chain)
          q.__chain("fired", { id: p.id });
    }
    const rewindMs = Math.min(rt / 2 + INTERP_DELAY, 250);
    const ticksBack = Math.max(0, Math.round(rewindMs / DT_MS));
    const targetTick = Math.max(1, room.tick - ticksBack);
    const hits = [];
    let bestT = rayWorld(room.WORLD.colliders, o, d, 300);
    const destHit = rayDest(room.DESTS, o, d, bestT);
    if (destHit)
      bestT = destHit.t;
    let victim = null, hitHead = false, hitPoint = null;
    for (const q of room.players) {
      if (q === p)
        continue;
      const entry = q.hist.find((h2) => h2.tick === targetTick) || q.hist[0];
      if (!entry || !entry.alive)
        continue;
      const center = { x: entry.x, y: entry.y + entry.h * 0.5, z: entry.z };
      const headC = { x: center.x, y: center.y + entry.h * 0.3, z: center.z };
      const bh = entry.h * 0.5;
      const tHead = rayBox(o, d, headC.x - HEAD_HS, headC.y - HEAD_HS, headC.z - HEAD_HS, headC.x + HEAD_HS, headC.y + HEAD_HS, headC.z + HEAD_HS);
      const tBody = rayBox(o, d, center.x - BODY_BW, center.y - bh, center.z - BODY_BW, center.x + BODY_BW, center.y + bh * 0.9, center.z + BODY_BW);
      let tHit = -1, head = false;
      if (tHead >= 0 && (tBody < 0 || tHead <= tBody)) {
        tHit = tHead;
        head = true;
      } else if (tBody >= 0)
        tHit = tBody;
      if (tHit >= 0 && tHit < bestT) {
        bestT = tHit;
        victim = q;
        hitHead = head;
        hitPoint = { x: o.x + d.x * tHit, y: o.y + d.y * tHit, z: o.z + d.z * tHit };
      }
    }
    if (victim && hitPoint) {
      const [near, far, minM] = wdef.falloff;
      let mult = 1;
      if (bestT > near)
        mult = 1 + (minM - 1) * Math.min(1, (bestT - near) / Math.max(0.1, far - near));
      const dmg = wdef.dmg * (hitHead ? wdef.hs : 1) * mult;
      const res = applyDamage(room, victim, dmg, p, hitHead, wdef.name, hitPoint);
      hits.push({ v: victim.id, dmg: Math.round(dmg), head: hitHead, kill: !!res.kill });
    } else if (destHit) {
      const ds = room.DESTS.get(destHit.id);
      if (ds) {
        const [near, far, minM] = wdef.falloff;
        let mult = 1;
        if (destHit.t > near)
          mult = 1 + (minM - 1) * Math.min(1, (destHit.t - near) / Math.max(0.1, far - near));
        ds.hp -= wdef.dmg * mult;
        const st = ds.hp <= 0 ? 2 : ds.hp / ds.maxHp <= 0.5 ? 1 : 0;
        if (st >= 2) {
          room.WORLD.colliders = room.WORLD.colliders.filter((c) => c.destId !== destHit.id);
          room.DESTS.delete(destHit.id);
          audit({ t: now, id: p.id, dest: destHit.id, destroyed: true });
        }
        roomChain(room, "dest", { id: destHit.id, hp: Math.max(0, Math.round(ds.hp)), st, by: p.id });
      }
    }
    audit({ t: now, id: p.id, tick: room.tick, rt, rtSrc, rewindMs: +rewindMs.toFixed(1), ticksBack, hit: hits.length > 0, hits });
  });
  socket.on("respawn", (m) => {
    if (!p || !p.joined)
      return;
    const room = rooms.get(p.roomId);
    if (!room)
      return;
    if (!rateOk(rl, "respawn", 2, 2000))
      return;
    if (room.match.mode === "snd" && room.match.snd && room.match.snd.ph !== "inter" || room.match.mode === "gf" && room.match.gf && room.match.gf.ph !== "inter") {
      chain("matchErr", { why: "sndNoRespawn" });
      return;
    }
    let pos = null;
    if (m && Array.isArray(m.pos) && m.pos.length === 3 && m.pos.every(Number.isFinite)) {
      const [x, y, z] = m.pos;
      if (nearPoolR(room, x, y, z))
        pos = { x, y, z };
    }
    if (!pos)
      pos = pickSpawn(room, p.team, p);
    doRespawn(room, p, pos); // [T147] the shared respawn body — the bots respawn through the SAME law
  });
  socket.on("reload", (m) => {
    if (!p || !p.joined)
      return;
    if (!m || typeof m.w !== "string")
      return;
    if (!rateOk(rl, "reload", 6, 1000, RELOAD_SUST[0], RELOAD_SUST[1]))
      return;
    const wdef = p.wdefs && p.wdefs.get(m.w) || WEAPONS.find((w) => w.id === m.w);
    if (!wdef)
      return;
    const now = Date.now();
    if (!p.ammo)
      p.ammo = new Map;
    let am = p.ammo.get(m.w);
    if (!am) {
      am = { mag: wdef.mag, res: wdef.reserve, rl: 0 };
      p.ammo.set(m.w, am);
    }
    if (now < am.rl) {
      chain("ammo", { w: m.w, mag: am.mag, res: am.res });
      return;
    }
    const full = wdef.mag;
    if (am.mag >= full || am.res <= 0) {
      chain("ammo", { w: m.w, mag: am.mag, res: am.res });
      return;
    }
    const durMs = Math.round((m.e ? wdef.reloadE : wdef.reloadT) * 1000);
    am.rl = now + (wdef.shellLoad ? durMs * (full - am.mag) : durMs);
    const take = Math.min(full - am.mag, am.res);
    am.mag += take;
    am.res -= take;
    chain("ammo", { w: m.w, mag: am.mag, res: am.res });
  });
  socket.on("startMatch", (m) => {
    if (!p || !p.joined)
      return;
    const room = rooms.get(p.roomId);
    if (!room)
      return;
    if (!rateOk(rl, "startMatch", 1))
      return;
    if ((room.match.state === "live" || room.match.state === "countdown") && hostOf(room) !== p) {
      chain("matchErr", { why: "notHost" });
      return;
    }
    const mode = m && typeof m.mode === "string" ? m.mode : room.match.mode;
    if (!matchStart(room, mode, p))
      chain("matchErr", { why: "mode" });
  });
  socket.on("setMode", (m) => {
    if (!p || !p.joined)
      return;
    const room = rooms.get(p.roomId);
    if (!room)
      return;
    if (!rateOk(rl, "setMode", 4, 1000, SETMODE_SUST[0], SETMODE_SUST[1]))
      return;
    if (room.match.state !== "idle") {
      chain("matchErr", { why: "live" });
      return;
    }
    if (hostOf(room) !== p) {
      chain("matchErr", { why: "notHost" });
      return;
    }
    const mode = m && typeof m.mode === "string" ? m.mode : null;
    if (!mode || !CFG.MODES[mode]) {
      chain("matchErr", { why: "mode" });
      return;
    }
    room.match.mode = mode;
    roomChain(room, "match", { ev: "lobbyMode", md: mode, by: p.name });
    broadcastRoster(room);
    console.log(`[room] lobby mode: ${mode} by ${p.name} in ${room.id}`);
  });
  socket.on("setMap", (m) => {
    if (!p || !p.joined)
      return;
    const room = rooms.get(p.roomId);
    if (!room)
      return;
    if (!rateOk(rl, "setMap", 4, 1000, SETMAP_SUST[0], SETMAP_SUST[1]))
      return;
    if (room.match.state !== "idle") {
      chain("matchErr", { why: "live" });
      return;
    }
    if (hostOf(room) !== p) {
      chain("matchErr", { why: "notHost" });
      return;
    }
    const mapId = m && typeof m.map === "string" ? m.map : null;
    if (mapId === "custom") {
      if (!room.customMap) {
        chain("matchErr", { why: "nomap" });
        return;
      }
      buildCustomRoomWorld(room, room.customMap);
    } else {
      if (!mapId || !MAPS_REGISTRY.includes(mapId) || !loadMapData(mapId)) {
        chain("matchErr", { why: "map" });
        return;
      }
      if (tk.TK_STAGES.some((s) => s.id === mapId)) {
        const hrec = p.pid ? CAREER.players[p.pid] : null;
        const hown = hrec ? ecoRec(hrec).own[mapId] | 0 : 0;
        if (hown <= 0) {
          chain("matchErr", { why: "mapLock" });
          return;
        }
      }
      buildRoomWorld(room, mapId);
    }
    room.uavT = 0;
    room.strikes = [];
    room.bombs = [];
    room.crates = [];
    room.nades = [];
    room.hill = { idx: -1, owner: -1, prog: 0, t: 0, tickT: 0 };
    room.tags = [];
    roomChain(room, "match", { ev: "lobbyMap", map: mapId, by: p.name });
    broadcastRoster(room);
    console.log(`[room] lobby map: ${mapId} by ${p.name} in ${room.id}`);
  });
  socket.on("setKnob", (m) => {
    if (!p || !p.joined)
      return;
    const room = rooms.get(p.roomId);
    if (!room)
      return;
    if (!rateOk(rl, "setKnob", 4, 1000, SETKNOB_SUST[0], SETKNOB_SUST[1]))
      return;
    if (room.match.state !== "idle") {
      chain("matchErr", { why: "live" });
      return;
    }
    if (hostOf(room) !== p) {
      chain("matchErr", { why: "notHost" });
      return;
    }
    m = m || {};
    const cl = (v, lo, hi) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null;
    const sl = m.sl === 0 ? 0 : cl(m.sl, 5, 500);
    const tl = m.tl === 0 ? 0 : cl(m.tl, 60, 3600);
    if (m.sl != null && sl === null || m.tl != null && tl === null || m.sl != null && m.sl !== 0 && sl !== m.sl || m.tl != null && m.tl !== 0 && tl !== m.tl) {
      chain("matchErr", { why: "knobs" });
      return;
    }
    if (m.sl != null)
      room.knobs.sl = sl;
    if (m.tl != null)
      room.knobs.tl = tl;
    roomChain(room, "match", { ev: "lobbyKnobs", knobs: { ...room.knobs }, by: p.name });
    broadcastRoster(room);
  });
  const AUTH_NAME_OK = /^[A-Za-z0-9_-]{3,16}$/;
  socket.on("auth", async (d) => {
    if (!rateOk(rl, "auth", 4, 1000, AUTH_SUST[0], AUTH_SUST[1]))
      return;
    d = d || {};
    const op = typeof d.op === "string" ? d.op : "";
    const fail = (err) => chain("auth", { op, err });
    if (op === "register" || op === "login") {
      const name = typeof d.name === "string" ? d.name.trim() : "";
      const pass = typeof d.pass === "string" ? d.pass : "";
      if (!AUTH_NAME_OK.test(name))
        return fail("name");
      if (pass.length < 8 || pass.length > 72)
        return fail("pass");
      const devPid = PID_OK(d.pid) ? d.pid : null;
      if (!devPid) {
        fail("pid");
        return;
      }
      if (op === "register") {
        if (ACC.users[name.toLowerCase()])
          return fail("taken");
        const ph2 = await Bun.password.hash(pass, { algorithm: "argon2id" });
        const acc2 = { name, pid: devPid, ph: ph2, made: Date.now() };
        ACC.users[name.toLowerCase()] = acc2;
        const rec2 = careerRec(devPid, name);
        rec2.n = name;
        CAREER_DIRTY = true;
        accPersist();
        careerPersist();
        const tok2 = newTok();
        SESSIONS.set(tok2, { pid: acc2.pid, name: acc2.name, exp: Date.now() + SESSION_TTL });
        socket.data.pid = acc2.pid;
        chain("auth", { op, name: acc2.name, tok: tok2, pid: acc2.pid });
        return;
      }
      const acc = ACC.users[name.toLowerCase()];
      const ph = acc ? acc.ph : "o$0m3h4shphfakesaltvalue000000000000000";
      const okP = await Bun.password.verify(pass, ph);
      if (!acc || !okP)
        return fail("bad");
      if (devPid && devPid !== acc.pid && !ACC.merged[devPid] && CAREER.players[devPid]) {
        mergeCareer(careerRec(acc.pid, acc.name), CAREER.players[devPid]);
        ACC.merged[devPid] = acc.pid;
        delete CAREER.players[devPid];
        CAREER_DIRTY = true;
      }
      const rec = careerRec(acc.pid, acc.name);
      rec.n = acc.name;
      CAREER_DIRTY = true;
      careerPersist();
      const tok = newTok();
      SESSIONS.set(tok, { pid: acc.pid, name: acc.name, exp: Date.now() + SESSION_TTL });
      socket.data.pid = acc.pid;
      chain("auth", { op, name: acc.name, tok, pid: acc.pid });
      return;
    }
    if (op === "logout") {
      if (typeof d.tok === "string")
        SESSIONS.delete(d.tok);
      chain("auth", { op, ok: true });
      return;
    }
    if (op === "me") {
      const acc = typeof d.tok === "string" ? SESSIONS.get(d.tok) : null;
      if (!acc || acc.exp < Date.now()) {
        if (acc)
          SESSIONS.delete(d.tok);
        return fail("anon");
      }
      const s = acc;
      s.exp = Date.now() + SESSION_TTL;
      const rec = CAREER.players[acc.pid];
      chain("auth", { op, name: acc.name, tok: d.tok, pid: acc.pid, profile: profileOf(acc.pid), ranked: rankedView(rec), eco: ecoState(acc.pid), social: socialState(acc.pid) });
      return;
    }
    fail("op");
  });
  socket.on("eco", (d) => {
    if (!rateOk(rl, "eco", 12, 1000, ECO_SUST[0], ECO_SUST[1]))
      return;
    d = d || {};
    const op = typeof d.op === "string" ? d.op : "";
    const fail = (err) => chain("eco", { op, err });
    const acc = SESSIONS.get(d.tok || "");
    const pid = acc ? acc.pid : PID_OK(d.pid) ? d.pid : null;
    if (!pid) {
      fail("pid");
      return;
    }
    const rec = careerRec(pid, "PILOT");
    const e = ecoRec(rec);
    if (op === "state") {
      chain("eco", { op, ...ecoState(pid) });
      return;
    }
    if (op === "tkco") {
      if (!acc)
        return fail("acc");
      const pack = tk.packById(d.pack);
      if (!pack)
        return fail("pack");
      const now = Date.now();
      for (const [k, v] of TK_PENDING)
        if (now - v.t > tk.TK_CO_TTL)
          TK_PENDING.delete(k);
      const co = createHmac("sha256", TK_SECRET).update(`${acc.pid}:${pack.id}:${now}`).digest("hex").slice(0, 32);
      TK_PENDING.set(co, { pid: acc.pid, pack: pack.id, t: now });
      chain("eco", { op, pack: pack.id, usd: pack.usd, tkp: pack.tk, co });
      return;
    }
    if (op === "tkpack") {
      if (!acc)
        return fail("acc");
      const pco = typeof d.co === "string" ? d.co : "";
      const pend = TK_PENDING.get(pco);
      if (!pend)
        return fail("co");
      if (Date.now() - pend.t > tk.TK_CO_TTL) {
        TK_PENDING.delete(pco);
        return fail("co");
      }
      if (pend.pid !== acc.pid)
        return fail("co");
      TK_PENDING.delete(pco);
      const r = tkCredit(acc.pid, pend.pack, "nonce");
      if (!r)
        return fail("pack");
      chain("eco", { op, tk: r.tk, tkhist: r.tkhist });
      return;
    }
    if (op === "tksku") {
      if (!acc)
        return fail("acc");
      const id = typeof d.id === "string" ? d.id : "";
      let price = 0, kind = "";
      const opRow = ops.OPERATORS.find((o) => o.id === id && o.tk > 0);
      const finRow = !opRow && cos.FINISHES.find((x) => x.id === id && x.tk > 0);
      const chRow = !opRow && !finRow && cos.CHARMS.find((x) => x.id === id && x.tk > 0);
      const trRow = !opRow && !finRow && !chRow && cos.TRAILS.find((x) => x.id === id && x.tk > 0);
      const stRow = !opRow && !finRow && !chRow && !trRow && tk.TK_STAGES.find((s) => s.id === id);
      if (opRow) {
        price = opRow.tk;
        kind = "op";
      } else if (finRow) {
        price = finRow.tk;
        kind = "finish";
      } else if (chRow) {
        price = chRow.tk;
        kind = "charm";
      } else if (trRow) {
        price = trRow.tk;
        kind = "trail";
      } else if (stRow && MAPS_REGISTRY.includes(id) && loadMapData(id)) {
        price = stRow.tk;
        kind = "stage";
      } else
        return fail("item");
      if (e.own[id] > 0)
        return fail("owned");
      if ((e.tk | 0) < price)
        return fail("tk");
      e.tk -= price;
      e.own[id] = (e.own[id] || 0) + 1;
      CAREER_DIRTY = true;
      careerPersist();
      chain("eco", { op, id, kind, tk: e.tk, own: { ...e.own } });
      return;
    }
    if (op === "buy") {
      const opRow = ops.OPERATORS.find((o) => o.id === d.id);
      if (opRow && opRow.price > 0) {
        if (e.own[opRow.id] > 0) {
          fail("owned");
          return;
        }
        if ((e.cr | 0) < opRow.price) {
          fail("cr");
          return;
        }
        e.cr -= opRow.price;
        e.own[opRow.id] = (e.own[opRow.id] || 0) + 1;
        CAREER_DIRTY = true;
        careerPersist();
        chain("eco", { op, id: opRow.id, cr: e.cr, own: { ...e.own } });
        return;
      }
      const item = cos.ecoItemById(d.id);
      if (!item)
        return fail("item");
      if (e.own[item.id] > 0) {
        fail("owned");
        return;
      }
      const price = (cfg.ECO_PRICE || {})[item.r];
      if (!price || (e.cr | 0) < price) {
        fail("cr");
        return;
      }
      e.cr -= price;
      e.own[item.id] = (e.own[item.id] || 0) + 1;
      CAREER_DIRTY = true;
      careerPersist();
      chain("eco", { op, id: item.id, cr: e.cr, own: { ...e.own } });
      return;
    }
    if (op === "case") {
      if ((e.cr | 0) < 100)
        return fail("cr");
      e.cr -= 100;
      const r = casePick(ECO_RARITY, crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296);
      const pool = cos.ECO_POOL.filter((x) => x.r === r);
      const item = pool[Math.floor(Math.random() * pool.length)];
      let dupe = false;
      if (e.own[item.id] > 0) {
        dupe = true;
        const refund = ECO_DUPE_REFUND;
        e.cr += refund;
      } else
        e.own[item.id] = 1;
      CAREER_DIRTY = true;
      careerPersist();
      chain("eco", { op, id: item.id, r, dupe, cr: e.cr, own: { ...e.own } });
      return;
    }
    if (op === "claim") {
      const now = Date.now();
      if ((rec.lvl | 0) < ECO_CLAIM.lvl)
        return fail("lvl");
      if ((rec.m | 0) < ECO_CLAIM.minMatches)
        return fail("m");
      if (now - (e.lastClaim || 0) < ECO_CLAIM.hours * 3600000)
        return fail("cd");
      e.lastClaim = now;
      e.cr += ECO_CLAIM.cr;
      CAREER_DIRTY = true;
      careerPersist();
      chain("eco", { op, cr: e.cr, lastClaim: e.lastClaim });
      return;
    }
    if (op === "list") {
      const item = cos.ecoItemById(d.id);
      const price = Math.max(1, d.price | 0);
      if (!item || !price)
        return fail("item");
      if (!(e.own[item.id] > 0))
        return fail("notOwned");
      if (e.out.length >= ECO_CAPS.listings)
        return fail("cap");
      if (ACC.listings.length >= 200)
        return fail("market");
      e.own[item.id] -= 1;
      if (e.own[item.id] <= 0)
        delete e.own[item.id];
      const l = { id: "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), seller: pid, sellerName: rec.n, itemId: item.id, r: item.r, price, t: Date.now() };
      e.out.push(l);
      ACC.listings.push(l);
      CAREER_DIRTY = true;
      accPersist();
      careerPersist();
      chain("eco", { op, cr: e.cr, own: { ...e.own }, out: e.out.map((x) => ({ ...x })) });
      return;
    }
    if (op === "unlist") {
      const li = e.out.findIndex((x) => x.id === d.lid);
      if (li < 0)
        return fail("noList");
      const l = e.out.splice(li, 1)[0];
      const mi = ACC.listings.findIndex((x) => x.id === l.id);
      if (mi >= 0)
        ACC.listings.splice(mi, 1);
      e.own[l.itemId] = (e.own[l.itemId] || 0) + 1;
      accPersist();
      careerPersist();
      chain("eco", { op, cr: e.cr, own: { ...e.own }, out: e.out.map((x) => ({ ...x })) });
      return;
    }
    if (op === "buyListing") {
      if (!acc)
        return fail("pid");
      const l = ACC.listings.find((x) => x.id === d.lid);
      if (!l)
        return fail("noList");
      if (l.seller === acc.pid) {
        fail("self");
        return;
      }
      if ((e.cr | 0) < l.price)
        return fail("cr");
      const sellerRec = CAREER.players[l.seller];
      if (!sellerRec) {
        fail("gone");
        return;
      }
      e.cr -= l.price;
      ecoRec(sellerRec).cr += l.price;
      const mi = ACC.listings.findIndex((x) => x.id === l.id);
      if (mi >= 0)
        ACC.listings.splice(mi, 1);
      const se = sellerRec.eco;
      if (se) {
        const oi = se.out.findIndex((x) => x.id === l.id);
        if (oi >= 0)
          se.out.splice(oi, 1);
      }
      e.own[l.itemId] = (e.own[l.itemId] || 0) + 1;
      CAREER_DIRTY = true;
      accPersist();
      careerPersist();
      chain("eco", { op, cr: e.cr, own: { ...e.own }, market: ACC_LISTINGS().map((x) => ({ ...x })) });
      return;
    }
    if (op === "offer") {
      const to = PID_OK(d.to) ? d.to : pidByName(d.toName);
      if (!to || to === pid)
        return fail("to");
      const give = Array.isArray(d.give) ? d.give.filter((x) => typeof x === "string") : [];
      const want = Array.isArray(d.want) ? d.want.filter((x) => typeof x === "string") : [];
      if (give.length > ECO_CAPS.tradePerSide || want.length > ECO_CAPS.tradePerSide)
        return fail("cap");
      if (!give.every((id) => cos.ecoItemById(id) && e.own[id] > 0)) {
        fail("give");
        return;
      }
      if (!want.every((id) => cos.ecoItemById(id)))
        return fail("want");
      const te = ecoRec(careerRec(to, "PILOT"));
      if (te.inbox.length >= ECO_CAPS.pendingTrades)
        return fail("inbox");
      const o = { id: "T" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), from: pid, fromName: rec.n, give, want, t: Date.now() };
      te.inbox.push(o);
      chain("eco", { op, to });
      return;
    }
    if (op === "respond") {
      const accept = d.accept === true;
      const oi = e.inbox.findIndex((x) => x.id === d.oid);
      if (oi < 0)
        return fail("noTrade");
      const o = e.inbox.splice(oi, 1)[0];
      const orec = CAREER.players[o.from];
      if (!orec) {
        fail("gone");
        return;
      }
      const fe = ecoRec(orec);
      if (accept) {
        const giveOk = o.give.every((id) => fe.own[id] > 0);
        const wantOk = o.want.every((id) => e.own[id] > 0);
        if (!giveOk || !wantOk) {
          fail("gone");
          return;
        }
        for (const id of o.give) {
          fe.own[id] -= 1;
          if (fe.own[id] <= 0)
            delete fe.own[id];
          e.own[id] = (e.own[id] || 0) + 1;
        }
        for (const id of o.want) {
          e.own[id] -= 1;
          if (e.own[id] <= 0)
            delete e.own[id];
          fe.own[id] = (fe.own[id] || 0) + 1;
        }
        CAREER_DIRTY = true;
        careerPersist();
      }
      chain("eco", { op, accept, cr: e.cr, own: { ...e.own } });
      return;
    }
    if (op === "bppass") {
      const res = mg.bpPassBuy(bpRec(rec), e.cr);
      if (!res)
        return fail("cr");
      rec.bp = res.bp;
      e.cr -= res.cost;
      CAREER_DIRTY = true;
      careerPersist();
      chain("eco", { op, cr: e.cr, bp: res.bp });
      return;
    }
    if (op === "bpclaim") {
      const bp = bpRec(rec);
      const lv = bpOf(bp.x).tier;
      let out = null, crC = 0, grant = null;
      if (d.ch) {
        const ch = Number(d.ch) | 0;
        const charmId = mg.BP_FREE_CHARMS[(ch - 1) % mg.BP_FREE_CHARMS.length];
        const res = mg.bpClaimFree(bp, ch, lv, srvOwns(rec, charmId));
        if (res) {
          out = res.bp;
          crC = (res.reward.cr || 0) + (res.reward.dupeRefund || 0);
          grant = res.reward.charm || null;
        }
      } else if (d.tr) {
        const tr = Number(d.tr) | 0;
        const row = mg.bpRewardFor(tr);
        const res = row ? mg.bpClaimPremium(bp, tr, lv, (id) => srvOwns(rec, id)) : null;
        if (res) {
          out = res.bp;
          crC = (res.reward.cr || 0) + (res.reward.dupeRefund || 0);
          grant = res.reward.id || null;
        }
      }
      if (!out)
        return fail("claim");
      rec.bp = out;
      if (crC)
        e.cr += crC;
      if (grant)
        e.own[grant] = (e.own[grant] || 0) + 1;
      CAREER_DIRTY = true;
      careerPersist();
      chain("eco", { op, cr: e.cr, own: { ...e.own }, bp: out });
      return;
    }
    if (op === "evsku") {
      const sku = mg.evStoreSkuById(typeof d.id === "string" ? d.id : "");
      if (!sku)
        return fail("sku");
      if ((e.cr | 0) < sku.cr)
        return fail("cr");
      const stv = evsStoreView(rec);
      const base = { v: mg.EV_PERSIST_V, d: "", w: stv.w, claimed: { daily: [], weekly: [] }, stats: {}, ms: [], store: { t: stv.t } };
      const res = mg.evStoreBuy(sku, base);
      if (!res)
        return fail("cap");
      rec.evsStore = { w: stv.w, t: res.state.store.t };
      e.cr -= sku.cr;
      const bp = bpRec(rec);
      bp.x += BP.per * res.tiers;
      CAREER_DIRTY = true;
      careerPersist();
      chain("eco", { op, cr: e.cr, bp, evsStore: rec.evsStore });
      return;
    }
    if (op === "bnbuy") {
      const wins = mg.bundlesFor(mg.evDayOf(Date.now()));
      const w = wins.find((x) => x && x.id === d.id);
      if (!w)
        return fail("window");
      if (rec.bn && rec.bn[w.id])
        return fail("owned");
      if ((e.cr | 0) < w.price)
        return fail("cr");
      e.cr -= w.price;
      for (const it of w.items)
        if (it && it.id)
          e.own[it.id] = (e.own[it.id] || 0) + 1;
      if (!rec.bn || typeof rec.bn !== "object")
        rec.bn = {};
      rec.bn[w.id] = true;
      CAREER_DIRTY = true;
      careerPersist();
      chain("eco", { op, cr: e.cr, own: { ...e.own }, bn: { ...rec.bn } });
      return;
    }
    if (op === "evclaim") {
      const evs = evsRec(rec);
      const ch = mg.evChallengeById(evs.d, d.id);
      if (!ch)
        return fail("claim");
      const out = mg.evsClaim(ch, evs.stats, evs);
      if (!out)
        return fail("claim");
      rec.evs = out.state;
      e.cr += out.reward.cr || 0;
      bpRec(rec).x += out.reward.bp || 0;
      CAREER_DIRTY = true;
      careerPersist();
      chain("eco", { op, cr: e.cr, bp: bpRec(rec), evs: evsView(rec) });
      return;
    }
    if (op === "msclaim") {
      const evs = evsRec(rec);
      const ms = mg.EV_MILESTONES.find((x) => x && x.id === d.id);
      if (!ms)
        return fail("claim");
      const out = mg.evMilestoneClaim(ms, evs.stats, evs);
      if (!out)
        return fail("claim");
      rec.evs = out.state;
      e.cr += out.reward.cr || 0;
      bpRec(rec).x += out.reward.bp || 0;
      CAREER_DIRTY = true;
      careerPersist();
      chain("eco", { op, cr: e.cr, bp: bpRec(rec), evs: evsView(rec) });
      return;
    }
    fail("op");
  });
  socket.on("soc", (d) => {
    if (!rateOk(rl, "soc", 12, 1000, SOC_SUST[0], SOC_SUST[1]))
      return;
    d = d || {};
    const op = typeof d.op === "string" ? d.op : "";
    const fail = (err) => chain("soc", { op, err });
    const acc = SESSIONS.get(d.tok || "");
    const pid = acc ? acc.pid : PID_OK(d.pid) ? d.pid : null;
    if (!pid) {
      fail("pid");
      return;
    }
    const myPid = pid;
    const myRec = CAREER.players[pid];
    SOCIAL.friends[pid] = SOCIAL.friends[pid] || [];
    SOCIAL.reqs[pid] = SOCIAL.reqs[pid] || [];
    if (op === "state") {
      chain("soc", { op, ...socialState(pid) });
      return;
    }
    if (op === "report") {
      if (!rateOk(rl, "report", 3, 60000, 10, 60000))
        return fail("rate");
      const name = typeof d.name === "string" ? d.name.trim() : "";
      const reason = REPORT_REASONS.includes(d.reason) ? d.reason : null;
      if (!name || !reason)
        return fail("arg");
      const target = pidByName(name);
      if (!target)
        return fail("name");
      if (target === myPid)
        return fail("target");
      if (REPORTS.some((r) => r.by === myPid && r.about === target)) {
        chain("soc", { op, ok: true, dup: true });
        return;
      }
      REPORTS.push({ by: myPid, about: target, r: reason, t: Date.now(), room: typeof d.room === "string" ? d.room.slice(0, 8) : null });
      if (REPORTS.length > 200)
        REPORTS.splice(0, REPORTS.length - 200);
      console.log("[room] report: " + myPid.slice(0, 6) + " \u2192 " + target.slice(0, 6) + " (" + reason + ")");
      chain("soc", { op, ok: true });
      return;
    }
    if (op === "friendReq") {
      const to = pidByName(d.name);
      if (!to || to === pid)
        return fail("to");
      SOCIAL.reqs[to] = SOCIAL.reqs[to] || [];
      if (SOCIAL.reqs[to].length >= 20)
        return fail("cap");
      if (SOCIAL.friends[pid].some((f) => f.pid === to))
        return fail("friends");
      if (SOCIAL.reqs[to].some((o) => o.from === pid))
        return fail("dup");
      SOCIAL.reqs[to].push({ from: pid, t: Date.now() });
      socialPersist();
      chain("soc", { op, ok: true });
      return;
    }
    if (op === "friendResp") {
      const li = (SOCIAL.reqs[pid] || []).findIndex((o2) => o2.from === d.from);
      if (li < 0)
        return fail("noReq");
      const o = SOCIAL.reqs[pid].splice(li, 1)[0];
      if (d.accept === true) {
        SOCIAL.friends[pid].push({ pid: o.from, since: Date.now() });
        SOCIAL.friends[o.from] = SOCIAL.friends[o.from] || [];
        SOCIAL.friends[d.from].push({ pid: myPid, since: Date.now() });
      }
      socialPersist();
      chain("soc", { op, accept: d.accept === true, ...socialState(pid) });
      return;
    }
    if (op === "friendRemove") {
      const i = (SOCIAL.friends[pid] || []).findIndex((f) => f.pid === d.pid);
      if (i >= 0)
        SOCIAL.friends[pid].splice(i, 1);
      const theirs = SOCIAL.friends[d.pid] || [];
      const j = theirs.findIndex((f) => f.pid === pid);
      if (j >= 0)
        theirs.splice(j, 1);
      socialPersist();
      chain("soc", { op, ...socialState(pid) });
      return;
    }
    if (op === "clanCreate") {
      const name = typeof d.name === "string" ? d.name.trim() : "";
      const tag = typeof d.tag === "string" ? d.tag.trim().toUpperCase() : "";
      if (name.length < CLAN.nameMin || name.length > CLAN.nameMax)
        return fail("name");
      if (tag.length < CLAN.tagMin || tag.length > CLAN.tagMax)
        return fail("tag");
      if (SOCIAL.memberOf[myPid]) {
        fail("member");
        return;
      }
      if (Object.values(SOCIAL.clans).some((c) => c.name.toLowerCase() === name.toLowerCase()))
        return fail("taken");
      const e = myRec ? ecoRec(myRec) : null;
      if (!e || (e.cr | 0) < CLAN.createCost)
        return fail("cr");
      e.cr -= CLAN.createCost;
      const cid = "C" + Date.now().toString(36);
      SOCIAL.clans[cid] = { id: cid, name, tag, owner: myPid, members: [myPid], made: Date.now() };
      SOCIAL.memberOf[myPid] = cid;
      CAREER_DIRTY = true;
      socialPersist();
      careerPersist();
      rebroadcastRoomsFor(myPid);
      chain("soc", { op, clan: { ...SOCIAL.clans[cid] }, cr: e.cr });
      return;
    }
    if (op === "clanJoinReq") {
      d.name = typeof d.name === "string" ? d.name : "";
      const cid = typeof d.cid === "string" && SOCIAL.clans[d.cid] ? d.cid : null;
      const clan = cid || Object.values(SOCIAL.clans).find((c) => c.name.toLowerCase() === d.name.trim().toLowerCase());
      if (!clan)
        return fail("noClan");
      if ((myRec.lvl | 0) < CLAN.joinLvl)
        return fail("lvl");
      if (SOCIAL.memberOf[myPid]) {
        fail("member");
        return;
      }
      clan.reqs = clan.reqs || [];
      if (clan.reqs.some((o) => o.from === myPid))
        return fail("dup");
      clan.reqs.push({ from: myPid, t: Date.now() });
      socialPersist();
      chain("soc", { op, ok: true });
      return;
    }
    if (op === "clanResp") {
      const clan = SOCIAL.memberOf[myPid] ? SOCIAL.clans[SOCIAL.memberOf[myPid]] : null;
      if (!clan || clan.owner !== myPid) {
        fail("owner");
        return;
      }
      const ri = (clan.reqs || []).findIndex((o2) => o2.from === d.from);
      if (ri < 0)
        return fail("noReq");
      const o = clan.reqs.splice(ri, 1)[0];
      if (d.accept === true && CAREER.players[o.from]) {
        if (SOCIAL.memberOf[o.from]) {
          chain("soc", { op, err: "member" });
          return;
        }
        SOCIAL.memberOf[o.from] = clan.id;
        clan.members.push(o.from);
        rebroadcastRoomsFor(o.from);
      }
      socialPersist();
      chain("soc", { op, accept: d.accept === true, clan: { ...clan } });
      return;
    }
    if (op === "clanLeave") {
      const cid = SOCIAL.memberOf[myPid];
      const clan = cid ? SOCIAL.clans[cid] : null;
      if (!clan)
        return fail("noClan");
      clan.members = clan.members.filter((m) => m !== myPid);
      delete SOCIAL.memberOf[myPid];
      if (!clan.members.length) {
        delete SOCIAL.clans[cid];
      } else if (clan.owner === myPid)
        clan.owner = clan.members[0];
      socialPersist();
      rebroadcastRoomsFor(myPid);
      chain("soc", { op, ok: true });
      return;
    }
    if (op === "clanKick") {
      const clan = SOCIAL.memberOf[myPid] ? SOCIAL.clans[SOCIAL.memberOf[myPid]] : null;
      if (!clan || clan.owner !== myPid) {
        fail("owner");
        return;
      }
      if (d.pid === myPid)
        return fail("self");
      const mi = clan.members.indexOf(d.pid);
      if (mi >= 0)
        clan.members.splice(mi, 1);
      delete SOCIAL.memberOf[d.pid];
      if (clan.owner === d.pid)
        clan.owner = clan.members[0];
      if (!clan.members.length) {
        delete SOCIAL.clans[clan.id];
      }
      socialPersist();
      rebroadcastRoomsFor(d.pid);
      chain("soc", { op, clan: SOCIAL.clans[SOCIAL.memberOf[myPid]] ? { ...SOCIAL.clans[SOCIAL.memberOf[myPid]] } : null });
      return;
    }
    fail("op");
  });
  socket.on("q", (d) => {
    if (!rateOk(rl, "q", 6, 1000, Q_SUST[0], Q_SUST[1]))
      return;
    d = d || {};
    const op = typeof d.op === "string" ? d.op : "";
    if (op === "leave") {
      for (let i = QUEUE.length - 1;i >= 0; i--)
        if (QUEUE[i].chain === chain)
          QUEUE.splice(i, 1);
      chain("queue", { op, ok: true });
      return;
    }
    if (op !== "quick" && op !== "rank") {
      chain("queue", { op, err: "op" });
      return;
    }
    const acc = SESSIONS.get(d.tok || "");
    const pid = acc ? acc.pid : PID_OK(d.pid) ? d.pid : null;
    if (!pid) {
      chain("queue", { op, err: "pid" });
      return;
    }
    const mode = typeof d.mode === "string" && CFG.MODES[d.mode] ? d.mode : "ffa";
    for (let i = QUEUE.length - 1;i >= 0; i--)
      if (QUEUE[i].chain === chain)
        QUEUE.splice(i, 1);
    if (op === "quick") {
      const bestLobby = bestLobbyOf();
      let best = null;
      for (const r of rooms.values())
        if (!r.priv && r.match.state === "idle" && r.players.size < MAX_ROOM) {
          if (!best || r.players.size > best.players.size)
            best = r;
        }
      const room = bestLobby || best || getRoom("Q" + ++rkCounter);
      if (room.match.state === "idle")
        room.match.mode = mode;
      chain("queue", { op, room: room.id, mode });
      return;
    }
    const rec = CAREER.players[pid];
    const rp = rec && rec.rk && seasonOf(Date.now()).id === rec.rk.s ? rec.rk.rp : 0;
    QUEUE.push({ op, pid, name: (rec || {}).n || "PILOT", ti: tierIdx(rp), mode, t0: Date.now(), chain });
    chain("queue", { op, ti: tierIdx(rp), mode, pos: QUEUE.length });
  });
  socket.on("spong", (d) => {
    if (!p || !d || !Number.isFinite(d.t))
      return;
    if (!rateOk(rl, "spong", 30, 1000, SPONG_SUST[0], SPONG_SUST[1]))
      return;
    const rtt = Math.max(0, Date.now() - d.t);
    p.srvRtt = p.srvRtt == null ? rtt : Math.round(p.srvRtt * 0.3 + rtt * 0.7);
  });
  socket.on("nade", (m) => {
    if (!p || !p.joined)
      return;
    const room = rooms.get(p.roomId);
    if (!room)
      return;
    const now = Date.now();
    const reject = (why) => naudit({ t: now, id: p.id, reject: why });
    p.nadeTimes.push(now);
    while (p.nadeTimes.length && now - p.nadeTimes[0] > 1000)
      p.nadeTimes.shift();
    if (p.nadeTimes.length > NADE_RATE)
      return reject("rate");
    if (p.nadeLive >= NADE_LIVE)
      return reject("live");
    if (!p.alive)
      return reject("dead");
    if (!m || !Array.isArray(m.o) || !Array.isArray(m.d) || m.o.length !== 3 || m.d.length !== 3)
      return reject("shape");
    const kind = m.kind === "flash" ? "flash" : "frag";
    const o = { x: +m.o[0], y: +m.o[1], z: +m.o[2] }, d = { x: +m.d[0], y: +m.d[1], z: +m.d[2] };
    if (![o.x, o.y, o.z, d.x, d.y, d.z].every(Number.isFinite))
      return reject("nan");
    const f = +m.f;
    if (!Number.isFinite(f) || f <= 0 || f > FRAG.fuse)
      return reject("fuse");
    const eyeY = p.st.pos.y + P.eyeHeight + (P.eyeHeight - 0.55 - P.eyeHeight) * p.st.crouch;
    const eye = { x: p.st.pos.x, y: eyeY, z: p.st.pos.z };
    if (Math.hypot(o.x - eye.x, o.y - eye.y, o.z - eye.z) > 2.5)
      return reject("origin");
    const dl = Math.hypot(d.x, d.y, d.z);
    if (dl < 0.05 || dl > 24)
      return reject("vel");
    naudit({ t: now, id: p.id, ok: true, kind, o: [+o.x.toFixed(2), +o.y.toFixed(2), +o.z.toFixed(2)], eyeD: +Math.hypot(o.x - eye.x, o.y - eye.y, o.z - eye.z).toFixed(2) });
    const id = "nd" + ++nadeCounter;
    room.nades.push({ id, x: o.x, y: o.y, z: o.z, vx: d.x, vy: d.y, vz: d.z, f, owner: p, kind });
    p.nadeLive++;
    roomChain(room, "nadeSpawn", { id, o: [o.x, o.y, o.z].map((v) => +v.toFixed(3)), d: [d.x, d.y, d.z].map((v) => +v.toFixed(3)), f: +f.toFixed(3), kind });
  });
  socket.on("streak", (m) => {
    if (!p || !p.joined)
      return;
    const room = rooms.get(p.roomId);
    if (!room)
      return;
    if (!rateOk(rl, "streak", 4))
      return;
    if (room.match.state !== "live")
      return;
    const i = m ? m.i | 0 : -1;
    if (!(i >= 0 && i <= 2))
      return;
    const s = CFG.STREAKS[i];
    if (p.streakUsed[i] || p.score < s.cost)
      return;
    p.streakUsed[i] = true;
    if (i === 0) {
      room.uavT = s.dur;
      roomChain(room, "streakEv", { i: 0, by: p.name });
    } else if (i === 1) {
      const eyeY = p.st.pos.y + P.eyeHeight + (P.eyeHeight - 0.55 - P.eyeHeight) * p.st.crouch;
      const eye = { x: p.st.pos.x, y: eyeY, z: p.st.pos.z };
      const f3 = fwdFull(p.st.yaw, p.st.pitch);
      const raw = rayWorld(room.WORLD.colliders, eye, f3, 120);
      const t = raw < 120 ? raw : 40;
      const dir = { x: Math.cos(Math.random() * Math.PI), z: Math.sin(Math.random() * Math.PI) };
      room.strikes.push({ t: s.delay, target: { x: eye.x + f3.x * t, z: eye.z + f3.z * t }, dir, owner: p });
      roomChain(room, "streakEv", { i: 1, by: p.name });
    } else {
      const f2 = fwdXZ(p.st.yaw);
      const cx = p.st.pos.x + f2.x * 7, cz = p.st.pos.z + f2.z * 7;
      room.crates.push({ x: cx, z: cz, y: 26, owner: p });
      roomChain(room, "crate", { x: +cx.toFixed(2), z: +cz.toFixed(2), by: p.name });
    }
  });
  socket.on("ability", (m) => {
    if (!p || !p.joined)
      return;
    const room = rooms.get(p.roomId);
    if (!room)
      return;
    if (!rateOk(rl, "ability", 6))
      return;
    if (room.match.state !== "live")
      return;
    if (p.abCd > 0 || p.abCh <= 0)
      return;
    const id = m && typeof m.id === "string" ? m.id : null;
    if (id !== p.abId)
      return;
    const ab = ABILITIES.find((a) => a.id === id);
    if (!ab)
      return;
    p.abCh--;
    if (p.abCd <= 0)
      p.abCd = ab.cd;
    if (id === "dash") {
      const f2 = fwdXZ(p.st.yaw);
      p.st.vel.x += f2.x * 15;
      p.st.vel.z += f2.z * 15;
      p.st.vel.y = Math.max(p.st.vel.y, 1.5);
    } else if (id === "stim") {
      p.healT = ab.healTime;
      p.st.stimT = ab.speedTime;
    } else if (id === "pulse") {
      let found = 0;
      for (const q of room.players) {
        if (q === p || !q.alive)
          continue;
        if (room.match.mode !== "ffa" && q.team === p.team)
          continue;
        if (Math.hypot(q.st.pos.x - p.st.pos.x, q.st.pos.z - p.st.pos.z) < ab.radius)
          found++;
      }
      if (p.__chain)
        p.__chain("pulseEv", { found });
    }
  });
  socket.on("emote", (m) => {
    if (!p || !p.joined)
      return;
    const room = rooms.get(p.roomId);
    if (!room)
      return;
    if (!rateOk(rl, "emote", 2, 2000))
      return;
    const id = m && typeof m.id === "string" ? m.id : null;
    const e = id ? cos.EMOTES.find((x) => x && x.id === id) : null;
    if (!e || e.id === "none")
      return;
    for (const q of room.players)
      if (q.joined && q !== p && q.__chain)
        q.__chain("emote", { id: e.id, n: p.name });
  });
  socket.on("ping", (d) => {
    if (!rateOk(rl, "ping", 20, 1000, PING_SUST[0], PING_SUST[1]))
      return;
    if (!d || typeof d !== "object" || Array.isArray(d) || !Number.isFinite(d.t) || Object.keys(d).length > 4)
      return;
    const j = JSON.stringify(d);
    if (j && j.length <= 128)
      chain("pong", d);
  });
  socket.on("voice", (d, bin) => {
    if (!p || !p.joined || !p.roomId)
      return;
    let pcm = null;
    if (bin instanceof ArrayBuffer)
      pcm = bin;
    else if (bin instanceof Uint8Array)
      pcm = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
    if (!pcm || pcm.byteLength < 80 || pcm.byteLength > 1600 || pcm.byteLength % 2 !== 0) {
      SWEEP_METRICS.voiceDrops++;
      return;
    }
    if (rl.vio.mutedUntil > Date.now()) {
      SWEEP_METRICS.voiceDrops++;
      return;
    }
    if (!rateOk(rl, "voice", 30, 1000, VOICE_SUST[0], VOICE_SUST[1])) {
      SWEEP_METRICS.voiceDrops++;
      return;
    }
    const room = rooms.get(p.roomId);
    if (!room)
      return;
    const pkt = { i: p.id, s: d && Number.isFinite(d.s) ? d.s | 0 : 0, a: pcm };
    for (const q of room.players)
      if (q !== p && q.joined && q.__chain)
        q.__chain("voice", pkt);
    if (room.specs) {
      for (const sp of room.specs)
        if (sp.__chain)
          sp.__chain("voice", pkt);
    }
    SWEEP_METRICS.voiceFrames++;
  });
  socket.on("mapreg", (d) => {
    if (!p || !p.joined)
      return;
    const room = rooms.get(p.roomId);
    if (!room)
      return;
    if (!rateOk(rl, "mapreg", 3, 1000, MAPREG_SUST[0], MAPREG_SUST[1]))
      return;
    if (room.match.state !== "idle") {
      chain("matchErr", { why: "live" });
      return;
    }
    if (hostOf(room) !== p) {
      chain("matchErr", { why: "notHost" });
      return;
    }
    const err = validCustom(d);
    if (err) {
      SWEEP_METRICS.mapregsBad++;
      chain("matchErr", { why: "mapBad", e: err });
      return;
    }
    room.customMap = { name: String(d.name || "CUSTOM").toUpperCase().slice(0, 12), by: p.name, data: d };
    SWEEP_METRICS.mapregs++;
    chain("mapreg", { ok: true });
    console.log(`[room] mapreg: ${room.customMap.name} (${JSON.stringify(d).length} B) by ${p.name} in ${room.id}`);
  });
  socket.on("mapdata", () => {
    if (!p || !p.joined)
      return;
    const room = rooms.get(p.roomId);
    if (!room || !room.customMap)
      return;
    if (!rateOk(rl, "mapdata", 2, 1000, MAPDATA_SUST[0], MAPDATA_SUST[1]))
      return;
    SWEEP_METRICS.mapdataPulls++;
    chain("mapdata", { name: room.customMap.name, by: room.customMap.by, data: room.customMap.data });
  });
  socket.on("lb", (d) => {
    try {
      if (!rateOk(rl, "lb", 4, 1000, LB_SUST[0], LB_SUST[1]))
        return;
      d = d || {};
      const cur = seasonOf(Date.now()).id;
      const ask = PID_OK(d.pid) ? d.pid : null;
      const sc = d.sc === "friends" || d.sc === "clan" ? d.sc : "rp";
      let scopePids = null;
      if (sc !== "rp") {
        const scopeErr = (err) => chain("lb", { s: cur, endsAt: seasonOf(Date.now()).endsAt, rows: [], self: null, sc, err, ts: Date.now() });
        if (!ask) {
          scopeErr("pid");
          return;
        }
        if (sc === "friends") {
          scopePids = new Set((SOCIAL.friends[ask] || []).map((f) => f.pid));
          scopePids.add(ask);
        } else {
          const tag = SOCIAL.memberOf[ask];
          if (!tag) {
            scopeErr("noclan");
            return;
          }
          scopePids = new Set(Object.entries(SOCIAL.memberOf).filter(([, t]) => t === tag).map(([p2]) => p2));
        }
      }
      const n = Math.min(Math.max(1, d.n | 0 || 25), 100);
      const all = Object.entries(CAREER.players).filter(([pid, r]) => !r.ac && r.rk && r.rk.s === cur && (!scopePids || scopePids.has(pid))).map(([pid, r]) => ({ pid, n: r.n, rp: r.rk.rp, tier: tierOf(r.rk.rp), pk: r.rk.pk, m: r.rk.m, w: r.rk.w })).sort((a, b) => b.rp - a.rp || b.pk - a.pk || (a.n < b.n ? -1 : a.n > b.n ? 1 : 0));
      const row = (r, rank) => ({ rank, n: r.n, tier: r.tier, rp: r.rp, pk: r.pk, m: r.m, w: r.w, ...ask && r.pid === ask ? { you: true } : {} });
      const rows = all.slice(0, n).map((r, i) => row(r, i + 1));
      let self = null;
      if (ask && !rows.some((r) => r.you)) {
        const i = all.findIndex((r) => r.pid === ask);
        if (i !== -1)
          self = row(all[i], i + 1);
      }
      chain("lb", { s: cur, endsAt: seasonOf(Date.now()).endsAt, rows, self, sc, ts: Date.now() });
    } catch (e) {
      console.error("[room] lb error:", e && e.message);
    }
  });
  socket.on("status", (cb) => {
    if (!rateOk(rl, "status", 4, 1000, STATUS_SUST[0], STATUS_SUST[1]))
      return;
    const s = {
      port: PORT,
      delay: DELAY,
      jitter: JITTER,
      hz: 60,
      snapEvery: SNAP_EVERY,
      rooms: [...rooms.values()].map((r) => ({
        id: r.id,
        size: r.players.size,
        tick: r.tick,
        match: { ...r.match },
        flags: r.flags.map((f) => ({ id: f.id, owner: f.owner, prog: +f.prog.toFixed(2) })),
        uav: +r.uavT.toFixed(1),
        nades: r.nades.length,
        strikes: r.strikes.length,
        bombs: r.bombs.length,
        crates: r.crates.length,
        hill: { ...r.hill },
        tags: r.tags.length,
        snd: r.match.snd ? { ...r.match.snd } : null
      })),
      players: [...rooms.values()].reduce((n, r) => n + r.players.size, 0),
      rtts: [...rooms.values()].flatMap((r) => [...r.players].filter((q) => q.srvRtt != null).map((q) => ({ n: q.name, srvRtt: q.srvRtt }))),
      nadeAudit: nadeAudit.slice(-20),
      audit: fireAudit.slice(-20)
    };
    if (CAP_ON)
      s.cap = capMetrics();
    if (CAP_ON)
      s.sweep = { n: SWEEP.n, by: { ...SWEEP.by } };
    if (CAP_ON)
      s.ac = { kicks: AC_KICKS.n, excl: Object.values(CAREER.players).filter((r) => r.ac).length };
    if (typeof cb === "function")
      cb(s);
  });
  socket.on("disconnect", () => {
    console.log(`[room] left: ${socket.id}`);
    if (!p)
      return;
    const room = rooms.get(p.roomId);
    if (room)
      room.players.delete(p);
    if (room && room.specs)
      room.specs.delete(p);
    p.joined = false;
    p.__chain = null;
    if (room)
      broadcastRoster(room);
    if (room)
      botAudit(room); // [T147] the departure read — botsOutAt grace, never an instant dissolve
    if (p.token && !rl.vio.kicked) {
      const purgeTimer = setTimeout(() => {
        held.delete(p.token);
        if (room) {
          room.players.delete(p);
          broadcastRoster(room);
        }
        console.log(`[room] held state dropped: ${p.name}`);
      }, RECONNECT_MS);
      held.set(p.token, { p, roomId: p.roomId, purgeTimer });
    }
    if (p.pid)
      careerPersist();
    for (let i = QUEUE.length - 1;i >= 0; i--)
      if (QUEUE[i].chain === chain)
        QUEUE.splice(i, 1);
  });
  socket.on("error", (e) => console.error(`[room] socket error (${socket.id}):`, e));
});
httpServer.listen(PORT, () => {
  console.log(`[room] ironsight-room (authoritative, MP-3.1 residuals) running on port ${PORT} (path '/' | sim 60Hz self-correcting | snap 1/${SNAP_EVERY} | fold ${FOLD}/net ${FOLD_NET} | [T151] input-truth: starved tick = coast, no lastIn re-apply | rewind ring ${HIST} | rooms+modes | nades+flash+streaks+abilities+srtt+host | fired-reveal | spectate \xA725 | private-lobbies \xA729 | ac \xA750 sustained+sanctions+origin | per-room worlds \xA751 | knobs \xA752 | accounts+eco+social+queue \xA753 | [T140] voice relay + custom-map MP + join flood/PoW + /metrics | [T147] bot-fill ${BOT_FILL} seats / ${BOT_DELAY}ms grace (IRON_BOTS · IRON_BOT_DELAY) + empty-room GC)`);
});
var ironFlush = () => {
  try {
    accPersist();
    socialPersist();
    careerPersist();
  } catch (_) {}
};
process.on("SIGTERM", () => {
  ironFlush();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
});
process.on("SIGINT", () => {
  ironFlush();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
});
setInterval(careerPersist, 30000).unref();
