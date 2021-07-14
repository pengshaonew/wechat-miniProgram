module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1626160675897, function(require, module, exports) {


var Pomelo = require('./Pomelo');

function wsCreator(_ref) {
    var url = _ref.url,
        onError = _ref.onError,
        onOpen = _ref.onOpen,
        onMessage = _ref.onMessage,
        onClose = _ref.onClose;

    var ws = wx.connectSocket({ url: url });
    ws.onError(onError);
    ws.onOpen(onOpen);
    ws.onMessage(onMessage);
    ws.onClose(onClose);
    return ws;
}

function wsCreatorWeb(_ref2) {
    var url = _ref2.url,
        onError = _ref2.onError,
        onOpen = _ref2.onOpen,
        onMessage = _ref2.onMessage,
        onClose = _ref2.onClose;

    if (false) {
        WebSocket = require('ws');
    }
    var ws = new WebSocket(url);
    ws.onerror = onError;
    ws.onopen = onOpen;
    ws.onmessage = onMessage;
    ws.onclose = onClose;
    return ws;
}

function urlGenerator(host, port) {
    var url = 'wss://' + host;
    if (port) {
        url += '/ws/' + port + '/';
    }
    return url;
}

module.exports = new Pomelo({
    wsCreator: wsCreator,
    wsCreatorWeb: wsCreatorWeb,
    urlGenerator: urlGenerator
});
}, function(modId) {var map = {"./Pomelo":1626160675898}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1626160675898, function(require, module, exports) {


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events');
var Message = require('./Message');
var Protocol = require('./Protocal');
var Package = require('./Package');

var DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

var JS_WS_CLIENT_TYPE = 'js-websocket';
var JS_WS_CLIENT_VERSION = '0.0.1';

var RES_OK = 200;
var RES_FAIL = 500;
var RES_OLD_CLIENT = 501;

function blobToBuffer(blob, cb) {
    if (false) {
        var toBuffer = require('blob-to-buffer');
        if (Buffer.isBuffer(blob)) {
            return cb(blob);
        }
        return toBuffer(blob, cb);
    }
    var fileReader = new FileReader();
    fileReader.onload = function (event) {
        var buffer = event.target.result;
        cb(buffer);
    };
    fileReader.readAsArrayBuffer(blob);
}

function defaultDecode(data) {
    var msg = Message.decode(data);
    msg.body = JSON.parse(Protocol.strdecode(msg.body));
    return msg;
}
function defaultEncode(reqId, route, msg) {
    var type = reqId ? Message.TYPE_REQUEST : Message.TYPE_NOTIFY;
    msg = Protocol.strencode(JSON.stringify(msg));
    var compressRoute = 0;
    return Message.encode(reqId, type, compressRoute, route, msg);
}
function defaultUrlGenerator(host, port) {
    var url = 'ws://' + host;
    if (port) {
        url += ':' + port;
    }
    return url;
}

module.exports = function (_EventEmitter) {
    _inherits(Pomelo, _EventEmitter);

    function Pomelo(args) {
        _classCallCheck(this, Pomelo);

        var _this = _possibleConstructorReturn(this, (Pomelo.__proto__ || Object.getPrototypeOf(Pomelo)).call(this, args));

        var wsCreator = args.wsCreator,
            wsCreatorWeb = args.wsCreatorWeb,
            _args$urlGenerator = args.urlGenerator,
            urlGenerator = _args$urlGenerator === undefined ? defaultUrlGenerator : _args$urlGenerator;

        _this.wsCreator = wsCreator;
        _this.wsCreatorWx = wsCreator;
        _this.wsCreatorWeb = wsCreatorWeb;
        _this.urlGenerator = urlGenerator;

        _this.reconnect = false;
        _this.reconncetTimer = null;
        _this.reconnectAttempts = 0;
        _this.reconnectionDelay = 5000;

        _this.handshakeBuffer = {
            'sys': {
                type: JS_WS_CLIENT_TYPE,
                version: JS_WS_CLIENT_VERSION,
                rsa: {}
            },
            'user': {}
        };

        _this.heartbeatInterval = 0;
        _this.heartbeatTimeout = 0;
        _this.nextHeartbeatTimeout = 0;
        _this.gapThreshold = 100; // heartbeat gap threashold
        _this.heartbeatId = null;
        _this.heartbeatTimeoutId = null;
        _this.handshakeCallback = null;

        _this.callbacks = {};
        _this.handlers = {};
        _this.handlers[Package.TYPE_HANDSHAKE] = _this.handshake.bind(_this);
        _this.handlers[Package.TYPE_HEARTBEAT] = _this.heartbeat.bind(_this);
        _this.handlers[Package.TYPE_DATA] = _this.onData.bind(_this);
        _this.handlers[Package.TYPE_KICK] = _this.onKick.bind(_this);

        _this.reqId = 0;
        return _this;
    }

    _createClass(Pomelo, [{
        key: 'handshake',
        value: function handshake(data) {
            data = JSON.parse(Protocol.strdecode(data));
            if (data.code === RES_OLD_CLIENT) {
                this.emit('error', 'client version not fullfill');
                return;
            }

            if (data.code !== RES_OK) {
                this.emit('error', 'handshake fail');
                return;
            }
            this.handshakeInit(data);

            var obj = Package.encode(Package.TYPE_HANDSHAKE_ACK);
            this.send(obj);
            this.initCallback && this.initCallback(this.socket);
        }
    }, {
        key: 'handshakeInit',
        value: function handshakeInit(data) {
            if (data.sys && data.sys.heartbeat) {
                this.heartbeatInterval = data.sys.heartbeat * 1000; // heartbeat interval
                this.heartbeatTimeout = this.heartbeatInterval * 2; // max heartbeat timeout
            } else {
                this.heartbeatInterval = 0;
                this.heartbeatTimeout = 0;
            }

            typeof this.handshakeCallback === 'function' && this.handshakeCallback(data.user);
        }
    }, {
        key: 'heartbeat',
        value: function heartbeat(data) {
            var _this2 = this;

            if (!this.heartbeatInterval) {
                return;
            }

            var obj = Package.encode(Package.TYPE_HEARTBEAT);
            if (this.heartbeatTimeoutId) {
                clearTimeout(this.heartbeatTimeoutId);
                this.heartbeatTimeoutId = null;
            }

            if (this.heartbeatId) {
                // already in a heartbeat interval
                return;
            }
            this.heartbeatId = setTimeout(function () {
                _this2.heartbeatId = null;
                _this2.send(obj);

                _this2.nextHeartbeatTimeout = Date.now() + _this2.heartbeatTimeout;
                _this2.heartbeatTimeoutId = setTimeout(function () {
                    return _this2.heartbeatTimeoutCb();
                }, _this2.heartbeatTimeout);
            }, this.heartbeatInterval);
        }
    }, {
        key: 'heartbeatTimeoutCb',
        value: function heartbeatTimeoutCb() {
            var _this3 = this;

            var gap = this.nextHeartbeatTimeout - Date.now();
            if (gap > this.gapThreshold) {
                this.heartbeatTimeoutId = setTimeout(function () {
                    return _this3.heartbeatTimeoutCb();
                }, gap);
            } else {
                console.error('server heartbeat timeout');
                this.emit('heartbeat timeout');
                this.disconnect();
            }
        }
    }, {
        key: 'reset',
        value: function reset() {
            this.reconnect = false;
            this.reconnectionDelay = 1000 * 5;
            this.reconnectAttempts = 0;
            clearTimeout(this.reconncetTimer);
        }
    }, {
        key: 'init',
        value: function init(params, cb) {
            this.initCallback = cb;

            this.params = params;
            var host = params.host,
                port = params.port,
                user = params.user,
                handshakeCallback = params.handshakeCallback,
                _params$encode = params.encode,
                encode = _params$encode === undefined ? defaultEncode : _params$encode,
                _params$decode = params.decode,
                decode = _params$decode === undefined ? defaultDecode : _params$decode,
                debugMode = params.debugMode,
                browserWS = params.browserWS;


            this.encode = encode;
            this.decode = decode;

            if (debugMode) {
                this.url = defaultUrlGenerator(host, port);
            } else {
                this.url = this.urlGenerator(host, port);
            }

            if (browserWS) {
                this.wsCreator = this.wsCreatorWeb;
                this.browserWS = browserWS;
            }

            this.handshakeBuffer.user = user;
            this.handshakeCallback = handshakeCallback;
            this.connect();
        }
    }, {
        key: 'connect',
        value: function connect() {
            var _this4 = this;

            var params = this.params;
            var maxReconnectAttempts = params.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS;
            var reconnectUrl = this.url;

            var onOpen = function onOpen(event) {
                if (!!_this4.reconnect) {
                    _this4.emit('reconnect');
                }
                _this4.reset();
                var obj = Package.encode(Package.TYPE_HANDSHAKE, Protocol.strencode(JSON.stringify(_this4.handshakeBuffer)));
                _this4.send(obj);
            };
            var onMessage = function onMessage(event) {
                if (_this4.browserWS) {
                    blobToBuffer(event.data, function (buffer) {
                        _this4.processPackage(Package.decode(buffer));
                        // new package arrived, update the heartbeat timeout
                        if (_this4.heartbeatTimeout) {
                            _this4.nextHeartbeatTimeout = Date.now() + _this4.heartbeatTimeout;
                        }
                    });
                } else {
                    _this4.processPackage(Package.decode(event.data));
                    // new package arrived, update the heartbeat timeout
                    if (_this4.heartbeatTimeout) {
                        _this4.nextHeartbeatTimeout = Date.now() + _this4.heartbeatTimeout;
                    }
                }
            };
            var onError = function onError(event) {
                _this4.emit('io-error', event);
                console.error('socket error: ', event);
            };
            var onClose = function onClose(event) {
                _this4.emit('close', event);
                _this4.emit('disconnect', event);
                if (!!params.reconnect && _this4.reconnectAttempts < maxReconnectAttempts) {
                    _this4.reconnect = true;
                    _this4.reconnectAttempts++;
                    _this4.reconncetTimer = setTimeout(function () {
                        return _this4.connect();
                    }, _this4.reconnectionDelay);
                    _this4.reconnectionDelay *= 2;
                }
            };

            // socket = wx.connectSocket({ url: reconnectUrl });
            this.socket = this.wsCreator({
                url: reconnectUrl,
                onError: onError,
                onOpen: onOpen,
                onMessage: onMessage,
                onClose: onClose
            });
        }
    }, {
        key: 'disconnect',
        value: function disconnect() {
            if (this.socket) {
                this.socket.close();
                this.socket = false;
            }

            if (this.heartbeatId) {
                clearTimeout(this.heartbeatId);
                this.heartbeatId = null;
            }
            if (this.heartbeatTimeoutId) {
                clearTimeout(this.heartbeatTimeoutId);
                this.heartbeatTimeoutId = null;
            }
        }
    }, {
        key: 'request',
        value: function request(route, msg, cb) {
            if (arguments.length === 2 && typeof msg === 'function') {
                cb = msg;
                msg = {};
            } else {
                msg = msg || {};
            }
            route = route || msg.route;
            if (!route) {
                return;
            }

            this.reqId++;
            this.sendMessage(this.reqId, route, msg);

            this.callbacks[this.reqId] = cb;
        }
    }, {
        key: 'notify',
        value: function notify(route, msg) {
            msg = msg || {};
            this.sendMessage(0, route, msg);
        }
    }, {
        key: 'sendMessage',
        value: function sendMessage(reqId, route, msg) {
            msg = this.encode(reqId, route, msg);

            var packet = Package.encode(Package.TYPE_DATA, msg);
            this.send(packet);
        }
    }, {
        key: 'send',
        value: function send(packet) {
            if (this.browserWS) {
                this.socket.send(packet.buffer);
            } else {
                this.socket.send({ data: packet.buffer });
            }
        }
    }, {
        key: 'onData',
        value: function onData(msg) {
            msg = this.decode(msg);
            this.processMessage(msg);
        }
    }, {
        key: 'onKick',
        value: function onKick(data) {
            data = JSON.parse(Protocol.strdecode(data));
            this.emit('onKick', data);
        }
    }, {
        key: 'processMessage',
        value: function processMessage(msg) {
            if (!msg.id) {
                this.emit('onMessage', msg.route, msg.body);
                this.emit(msg.route, msg.body);
                return;
            }

            //if have a id then find the callback function with the request
            var cb = this.callbacks[msg.id];

            delete this.callbacks[msg.id];
            typeof cb === 'function' && cb(msg.body);
        }
    }, {
        key: 'processPackage',
        value: function processPackage(msgs) {
            if (Array.isArray(msgs)) {
                for (var i = 0; i < msgs.length; i++) {
                    var msg = msgs[i];
                    this.handlers[msg.type](msg.body);
                }
            } else {
                this.handlers[msgs.type](msgs.body);
            }
        }
    }, {
        key: 'newInstance',
        value: function newInstance() {
            return new Pomelo({
                wsCreator: this.wsCreatorWx,
                wsCreatorWx: this.wsCreatorWx,
                wsCreatorWeb: this.wsCreatorWeb,
                urlGenerator: this.urlGenerator
            });
        }
    }]);

    return Pomelo;
}(EventEmitter);
}, function(modId) { var map = {"./Message":1626160675899,"./Protocal":1626160675900,"./Package":1626160675902}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1626160675899, function(require, module, exports) {


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Protocol = require('./Protocal');

var _require = require('./util'),
    copyArray = _require.copyArray;

var TYPE_REQUEST = 0;
var TYPE_NOTIFY = 1;
var TYPE_RESPONSE = 2;
var TYPE_PUSH = 3;

var MSG_FLAG_BYTES = 1;
var MSG_ROUTE_CODE_BYTES = 2;
var MSG_ID_MAX_BYTES = 5;
var MSG_ROUTE_LEN_BYTES = 1;

var MSG_ROUTE_CODE_MAX = 0xffff;

var MSG_COMPRESS_ROUTE_MASK = 0x1;
var MSG_TYPE_MASK = 0x7;

module.exports = function () {
    function Message() {
        _classCallCheck(this, Message);
    }

    _createClass(Message, null, [{
        key: 'encode',

        /**
         * Message protocol encode.
         *
         * @param  {Number} id            message id
         * @param  {Number} type          message type
         * @param  {Number} compressRoute whether compress route
         * @param  {Number|String} route  route code or route string
         * @param  {Buffer} msg           message body bytes
         * @return {Buffer}               encode result
         */
        value: function encode(id, type, compressRoute, route, msg) {
            // caculate message max length
            var idBytes = msgHasId(type) ? caculateMsgIdBytes(id) : 0;
            var msgLen = MSG_FLAG_BYTES + idBytes;

            if (msgHasRoute(type)) {
                if (compressRoute) {
                    if (typeof route !== 'number') {
                        throw new Error('error flag for number route!');
                    }
                    msgLen += MSG_ROUTE_CODE_BYTES;
                } else {
                    msgLen += MSG_ROUTE_LEN_BYTES;
                    if (route) {
                        route = Protocol.strencode(route);
                        if (route.length > 255) {
                            throw new Error('route maxlength is overflow');
                        }
                        msgLen += route.length;
                    }
                }
            }
            if (msg) {
                msgLen += msg.length;
            }

            var buffer = new Uint8Array(msgLen);
            var offset = 0;

            // add flag
            offset = encodeMsgFlag(type, compressRoute, buffer, offset);

            // add message id
            if (msgHasId(type)) {
                offset = encodeMsgId(id, buffer, offset);
            }

            // add route
            if (msgHasRoute(type)) {
                offset = encodeMsgRoute(compressRoute, route, buffer, offset);
            }

            // add body
            if (msg) {
                offset = encodeMsgBody(msg, buffer, offset);
            }

            return buffer;
        }

        /**
         * Message protocol decode.
         *
         * @param  {Buffer|Uint8Array} buffer message bytes
         * @return {Object}            message object
         */

    }, {
        key: 'decode',
        value: function decode(buffer) {
            var bytes = new Uint8Array(buffer);
            var bytesLen = bytes.length || bytes.byteLength;
            var offset = 0;
            var id = 0;
            var route = null;

            // parse flag
            var flag = bytes[offset++];
            var compressRoute = flag & MSG_COMPRESS_ROUTE_MASK;
            var type = flag >> 1 & MSG_TYPE_MASK;

            // parse id
            if (msgHasId(type)) {
                var m = parseInt(bytes[offset]);
                var i = 0;
                do {
                    var m = parseInt(bytes[offset]);
                    id = id + (m & 0x7f) * Math.pow(2, 7 * i);
                    offset++;
                    i++;
                } while (m >= 128);
            }

            // parse route
            if (msgHasRoute(type)) {
                if (compressRoute) {
                    route = bytes[offset++] << 8 | bytes[offset++];
                } else {
                    var routeLen = bytes[offset++];
                    if (routeLen) {
                        route = new Uint8Array(routeLen);
                        copyArray(route, 0, bytes, offset, routeLen);
                        route = Protocol.strdecode(route);
                    } else {
                        route = '';
                    }
                    offset += routeLen;
                }
            }

            // parse body
            var bodyLen = bytesLen - offset;
            var body = new Uint8Array(bodyLen);

            copyArray(body, 0, bytes, offset, bodyLen);

            return {
                'id': id, 'type': type, 'compressRoute': compressRoute,
                'route': route, 'body': body
            };
        }
    }, {
        key: 'TYPE_REQUEST',
        get: function get() {
            return TYPE_REQUEST;
        }
    }, {
        key: 'TYPE_NOTIFY',
        get: function get() {
            return TYPE_NOTIFY;
        }
    }, {
        key: 'TYPE_RESPONSE',
        get: function get() {
            return TYPE_RESPONSE;
        }
    }, {
        key: 'TYPE_PUSH',
        get: function get() {
            return TYPE_PUSH;
        }
    }]);

    return Message;
}();

var msgHasId = function msgHasId(type) {
    return type === TYPE_REQUEST || type === TYPE_RESPONSE;
};

var msgHasRoute = function msgHasRoute(type) {
    return type === TYPE_REQUEST || type === TYPE_NOTIFY || type === TYPE_PUSH;
};

var caculateMsgIdBytes = function caculateMsgIdBytes(id) {
    var len = 0;
    do {
        len += 1;
        id >>= 7;
    } while (id > 0);
    return len;
};

var encodeMsgFlag = function encodeMsgFlag(type, compressRoute, buffer, offset) {
    if (type !== TYPE_REQUEST && type !== TYPE_NOTIFY && type !== TYPE_RESPONSE && type !== TYPE_PUSH) {
        throw new Error('unkonw message type: ' + type);
    }

    buffer[offset] = type << 1 | (compressRoute ? 1 : 0);

    return offset + MSG_FLAG_BYTES;
};

var encodeMsgId = function encodeMsgId(id, buffer, offset) {
    do {
        var tmp = id % 128;
        var next = Math.floor(id / 128);

        if (next !== 0) {
            tmp = tmp + 128;
        }
        buffer[offset++] = tmp;

        id = next;
    } while (id !== 0);

    return offset;
};

var encodeMsgRoute = function encodeMsgRoute(compressRoute, route, buffer, offset) {
    if (compressRoute) {
        if (route > MSG_ROUTE_CODE_MAX) {
            throw new Error('route number is overflow');
        }

        buffer[offset++] = route >> 8 & 0xff;
        buffer[offset++] = route & 0xff;
    } else {
        if (route) {
            buffer[offset++] = route.length & 0xff;
            copyArray(buffer, offset, route, 0, route.length);
            offset += route.length;
        } else {
            buffer[offset++] = 0;
        }
    }

    return offset;
};

var encodeMsgBody = function encodeMsgBody(msg, buffer, offset) {
    copyArray(buffer, offset, msg, 0, msg.length);
    return offset + msg.length;
};
}, function(modId) { var map = {"./Protocal":1626160675900,"./util":1626160675901}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1626160675900, function(require, module, exports) {


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('./util'),
    copyArray = _require.copyArray;

module.exports = function () {
    function Protocol() {
        _classCallCheck(this, Protocol);
    }

    _createClass(Protocol, null, [{
        key: 'strencode',

        /**
         * pomele client encode
         * id message id;
         * route message route
         * msg message body
         * socketio current support string
         */
        value: function strencode(str) {
            var buffer = new Uint8Array(str.length * 3);
            var offset = 0;
            for (var i = 0; i < str.length; i++) {
                var charCode = str.charCodeAt(i);
                var codes = null;
                if (charCode <= 0x7f) {
                    codes = [charCode];
                } else if (charCode <= 0x7ff) {
                    codes = [0xc0 | charCode >> 6, 0x80 | charCode & 0x3f];
                } else {
                    codes = [0xe0 | charCode >> 12, 0x80 | (charCode & 0xfc0) >> 6, 0x80 | charCode & 0x3f];
                }
                for (var j = 0; j < codes.length; j++) {
                    buffer[offset] = codes[j];
                    ++offset;
                }
            }
            var _buffer = new Uint8Array(offset);
            copyArray(_buffer, 0, buffer, 0, offset);
            return _buffer;
        }
    }, {
        key: 'strdecode',


        /**
         * client decode
         * msg String data
         * return Message Object
         */
        value: function strdecode(buffer) {
            var bytes = new Uint8Array(buffer);
            var array = [];
            var offset = 0;
            var charCode = 0;
            var end = bytes.length;
            while (offset < end) {
                if (bytes[offset] < 128) {
                    charCode = bytes[offset];
                    offset += 1;
                } else if (bytes[offset] < 224) {
                    charCode = ((bytes[offset] & 0x3f) << 6) + (bytes[offset + 1] & 0x3f);
                    offset += 2;
                } else if (bytes[offset] < 240) {
                    charCode = ((bytes[offset] & 0x0f) << 12) + ((bytes[offset + 1] & 0x3f) << 6) + (bytes[offset + 2] & 0x3f);
                    offset += 3;
                } else if (bytes[offset] < 256) {
                    charCode = ((bytes[offset] & 0x07) << 18) + ((bytes[offset + 1] & 0x3f) << 12) + ((bytes[offset + 2] & 0x3f) << 6) + (bytes[offset + 3] & 0x3f);
                    offset += 4;
                }
                array.push(charCode);
            }
            // 分片处理避免无法解析过大的数据（原因暂未确认 #8）
            var charDecoder = String.fromCodePoint ? String.fromCodePoint : String.fromCharCode;
            var result = '';
            var chunk = 8 * 1024;
            var i;
            for (i = 0; i < array.length / chunk; i++) {
                result += charDecoder.apply(null, array.slice(i * chunk, (i + 1) * chunk));
            }
            result += charDecoder.apply(null, array.slice(i * chunk));
            return result;
        }
    }]);

    return Protocol;
}();
}, function(modId) { var map = {"./util":1626160675901}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1626160675901, function(require, module, exports) {


module.exports.copyArray = function (dest, doffset, src, soffset, length) {
    if ('function' === typeof src.copy) {
        // Buffer
        src.copy(dest, doffset, soffset, soffset + length);
    } else {
        // Uint8Array
        for (var index = 0; index < length; index++) {
            dest[doffset++] = src[soffset++];
        }
    }
};
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1626160675902, function(require, module, exports) {


var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require('./util'),
    copyArray = _require.copyArray;

var PKG_HEAD_BYTES = 4;
var TYPE_HANDSHAKE = 1;
var TYPE_HANDSHAKE_ACK = 2;
var TYPE_HEARTBEAT = 3;
var TYPE_DATA = 4;
var TYPE_KICK = 5;

module.exports = function () {
    function Package() {
        _classCallCheck(this, Package);
    }

    _createClass(Package, null, [{
        key: 'encode',

        /**
         * Package protocol encode.
         *
         * Pomelo package format:
         * +------+-------------+------------------+
         * | type | body length |       body       |
         * +------+-------------+------------------+
         *
         * Head: 4bytes
         *   0: package type,
         *      1 - handshake,
         *      2 - handshake ack,
         *      3 - heartbeat,
         *      4 - data
         *      5 - kick
         *   1 - 3: big-endian body length
         * Body: body length bytes
         *
         * @param  {Number}    type   package type
         * @param  {Uint8Array} body   body content in bytes
         * @return {Uint8Array}        new byte array that contains encode result
         */
        value: function encode(type, body) {
            var length = body ? body.length : 0;
            var buffer = new Uint8Array(PKG_HEAD_BYTES + length);
            var index = 0;
            buffer[index++] = type & 0xff;
            buffer[index++] = length >> 16 & 0xff;
            buffer[index++] = length >> 8 & 0xff;
            buffer[index++] = length & 0xff;
            if (body) {
                copyArray(buffer, index, body, 0, length);
            }
            // return String.fromCharCode.apply(null,buffer);
            return buffer;
        }

        /**
         * Package protocol decode.
         * See encode for package format.
         *
         * @param  {Uint8Array} buffer byte array containing package content
         * @return {Object}           {type: package type, buffer: body byte array}
         */

    }, {
        key: 'decode',
        value: function decode(buffer) {
            // buffer = toUTF8Array(str)
            var offset = 0;
            var bytes = new Uint8Array(buffer);
            var length = 0;
            var rs = [];
            while (offset < bytes.length) {
                var type = bytes[offset++];
                length = (bytes[offset++] << 16 | bytes[offset++] << 8 | bytes[offset++]) >>> 0;
                var body = length ? new Uint8Array(length) : null;
                copyArray(body, 0, bytes, offset, length);
                offset += length;
                rs.push({ 'type': type, 'body': body });
            }
            return rs.length === 1 ? rs[0] : rs;
        }
    }, {
        key: 'TYPE_HANDSHAKE',
        get: function get() {
            return TYPE_HANDSHAKE;
        }
    }, {
        key: 'TYPE_HANDSHAKE_ACK',
        get: function get() {
            return TYPE_HANDSHAKE_ACK;
        }
    }, {
        key: 'TYPE_HEARTBEAT',
        get: function get() {
            return TYPE_HEARTBEAT;
        }
    }, {
        key: 'TYPE_DATA',
        get: function get() {
            return TYPE_DATA;
        }
    }, {
        key: 'TYPE_KICK',
        get: function get() {
            return TYPE_KICK;
        }
    }]);

    return Package;
}();
}, function(modId) { var map = {"./util":1626160675901}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1626160675897);
})()
//miniprogram-npm-outsideDeps=["ws","events","blob-to-buffer"]
//# sourceMappingURL=index.js.map