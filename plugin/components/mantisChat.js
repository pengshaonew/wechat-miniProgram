// plugin/components/mantisChat.js

const pomelo = require('pomelo-weixin-client');

//窗口title
// 提示咨询师输入定时器
let agentKeyInInterval = null;
// 咨询师是否在输入
let isKeyInShow = false;
// 咨询师输入提示步骤
let agentKeyInStep = 0;
// 输入状态维持的最大时间
let agentKeyInLimit = 0;
/**
 * blink timer
 */
let titleBlinkTimer;
/**
 * visitor's last message time
 */
let lastVisitorMsgTime = new Date().getTime();
// 访客最后提醒时间
let lastVisitorReminderTime = new Date().getTime();
let lastCounselorMsgTime = new Date().getTime();
// 最大提醒次数，超过该次数后，会断开与坐席的连接
let MAX_REMINDER = 2;
// 默认的提醒间隔
let REMINDER_INTERVAL = 5; // 每5分钟提醒一次

//前端收到错误提示计数
let pomeloErrorCount = 0;

//前端收到错误提示计数达到限制，处理错误
let POMELO_ERROR_LIMIT = 20;

// 当前提醒次数
let reminderCount = 0;

// query entry重试控制
let queryEntryTime = 0;
let QUERY_ENTRY_RETRY_MAX_TIME = 10;
let queryEntryTimer;

//页面所有的消息，避免消息重复收取
let allMessages = {};

let allOnHisMsg = [];

/**
 * 消息预读timer
 */
let preSndTimer;
// 访客自动回复次数
let visitantAutoResponseCount = 0;

// 坐席自动回复次数
let counselorAutoResponseCount = 0;

// 预读联系方式断网存储
let contactWay = [];

// 未发送的消息
let resendMessages = [];
// 输入提醒定时任务
let reminderTmr;     //访客长时间不输入，自动发送提醒定时器
let agentTimedTimer; //咨询师不输入，自动回复定时器
let robotAutoMsgTmr; // 机器人自动发送消息
let robotAutoMsgCount = 0;
// 对于直达聊窗的，记录track
let trackId;
//init ttl time
let beginTime = new Date().getTime();
// 对话发起页面地址，回退使用的url
let page_url = null;
// 欢迎语剩余的消息
let welcomeMsgs = [];
// 欢迎语发送定时器
let welcomeMsgTmr;
// 搜索词欢迎语票房
let searchWelcomeFlag = false;
// 访客未输入计时器
let cutOffTimer = null;

// 默认配置
let defaultConfig = {
    "tip": {
        "pc": {
            "enable": true
        },
        "mobile": {
            "enable": true
        }
    },

    "welcome": {
        "group": false,
        "media": false,
        "bu": false,
        "project": true,
        "brand": false
    },

    "chat": {
        "remInterval": 3,
        "maxRemCount": 2,
        "multipleSites": false,
        "mbRemoveTag": true,
        "miniChatLoc": "center",
        "mode": "MINI",
        "showAgentName": false,
        "agent_img": "https://probe.bjmantis.net/chat/img/8888/10003/pc/img/default_counselor.jpg",
        "agent_msg_icon": "https://probe.bjmantis.net/chat/img/8888/10003/pc/img/default_counselor.jpg",
        "mini_chat_template": "t1/pc/mini_fm_tab0.html",
        "mini_chat_width": 638,
        "mini_chat_height": 590,
        "mini_resv_width": 350,
        "mini_resv_height": 320,
        "mb_chat_template": "t1/mobile/chat.html",
        "mb_chat_template_iframe": "t1/mobile/chat_iframe.html",
        "mbChatHeaderTitleImg": "https://probe.bjmantis.net/chat/img/8888/10003/pc/img/default_counselor.jpg",
        "mbChatHeaderTitleTxt": "咨询对话",
        "w_chat_template": "t1/pc/edu_chat_max.html"
    }
};

// const host = 'dev10.bjmantis.net';
// const port = 13121;

const host = 'test.bjmantis.net';
const port = 13001;

Component({
    behaviors: ['wx://component-export'],
    properties: {
        serverUrl: {
            type: String,
            value: 'https://probe.bjmantis.net/'
        },
        companyId: {
            type: String,
            value: ''
        },
        probeId: {
            type: String,
            value: ''
        },
    },

    data: {
        isShowChat: false,
        inputValue: '',
        scrollTop: 0,
        hasHistoryMsg: false, //是否有历史消息
        hisMsgList: [],
        msgList: [],
        probeData: {},
        mantisChat: {
            chat: {
                hasChat: false,
                isConnecting: false,// 标识是否正在连接
                connected: false,// 标识当前与服务器的对话状态
                welcomeMsgCount: 0,
                visitorMsgCount: 0,
                agentMsgCount: 0,
                count: 0
            },
            request: {}
        }
    },

    lifetimes: {
        attached() {
            wx.getStorage({
                key: 'key',
                success (res) {
                    console.log(176, res.data)
                }
            })
            this.initParams();
            this.loadProbeData();
        }
    },

    methods: {
        _requestChat() {
            const {mantisChat} = this.data;
            if (!mantisChat.chat.connected) { //  如果没有发起会话再发请求
                this.registerListener();
                this.queryEntry();
            } else {
                this.showChat()
            }
        },
        loadProbeData() {
            const {serverUrl, companyId, probeId} = this.data;
            if (companyId) {
                wx.request({
                    url: serverUrl + companyId + '/' + probeId + '.json',
                    data: {},
                    method: 'GET',
                    success: res => {
                        this.setData({
                            probeData: res.data
                        })
                    },
                    fail: () => {
                        wx.showToast({
                            title: '网络错误',
                            icon: 'none'
                        });
                    }
                });
            }

        },
        showChat() {
            this.setData({
                isShowChat: true
            })
        },
        hideChat() {
            this.setData({
                isShowChat: false
            })
        },
        _showChat() {
            const myEventDetail = {} // detail对象，提供给事件监听函数
            const myEventOption = {} // 触发事件的选项
            this.triggerEvent('showChat', myEventDetail, myEventOption)
        },
        _hideChat() {
            const myEventDetail = {} // detail对象，提供给事件监听函数
            const myEventOption = {} // 触发事件的选项
            this.triggerEvent('hideChat', myEventDetail, myEventOption)
        },
        initParams: function () {
            const {companyId, mantisChat} = this.data;
            let mantisChatNew = mantisChat;
            mantisChatNew.uid = this.handleUid(this.mantisCreateGuid() + "@" + companyId);
            this.handleMantisChat(mantisChatNew);
        },
        queryEntry: function (callback) {
            let _this = this;
            let route = 'gateMini.gateMiniHandler.queryCustomerEntry';
            const {probeData, mantisChat, companyId} = this.data;
            pomelo.init({
                host,
                port
            }, () => {
                pomelo.request(route, {
                    uid: mantisChat.uid,
                    siteId: '',
                    companyId: companyId,
                    buId: probeData.buId,
                    stag: '',
                    // 如果采用指定客服分组的方式发起
                    sgId: probeData.defaultSvgId,
                    defaultSgId: probeData.defaultSvgId,
                    probeId: probeData.id, // 探头ID
                    areaRuleFlag: probeData.areaRuleFlag, //探头配置地域规则标识
                    assignedAgent: '',
                    projectId: probeData.projectId,
                    ocpcUrl: '',
                    reqInfo: this.getRequest(),
                    lpRequestDuration: 0,
                    welcome: {},
                    xst: '',
                    pageparam: undefined,
                    thirdAccount: undefined,
                    thirdUid: undefined,
                    promotionMsg: '',
                    searchWordMessage: 'searchWordMessage'
                }, data => {
                    pomelo.disconnect(); //断开连接与gate服务器的连接
                    if (data.code === 500) {
                        queryEntryTime++;
                        if (queryEntryTime <= QUERY_ENTRY_RETRY_MAX_TIME) {
                            setTimeout(function () {
                                _this.queryEntry();
                            }, 500);
                        }
                        return;
                    }
                    this.requestChatInner(data.host, data.port);//返回主机名和端口号给回调函数重新连接connector服务器
                })
            });
        },
        getRequest: function () {
            let pages = getCurrentPages();
            let currPage = null;
            if (pages.length) {
                currPage = pages[pages.length - 1];
            }
            const {probeData, mantisChat, companyId} = this.data;
            let mantisChatNew = mantisChat;
            mantisChatNew.lp = currPage && currPage.route || 'pages/index/index';
            let req = mantisChatNew.request;
            req.site_id = mantisChatNew.siteId;
            req.stag = mantisChatNew.stag;
            req.page_title = mantisChatNew.page_title;
            req.req_mode = mantisChatNew.mode;
            req.req_ele = mantisChatNew.ele || "";

            // set landing page url
            req.lp = mantisChatNew.lp;

            // set the request page url
            if (!mantisChatNew.chatPageUrl) {
                mantisChatNew.chatPageUrl = req.lp;
            }
            req.url = encodeURI(mantisChatNew.chatPageUrl);

            // landing page id， 将来用来补全referer字符串
            req.lp_id = mantisChatNew.lpId;
            req.vistor_id = mantisChatNew.uid;
            req.srv_gp_id = probeData.defaultSvgId;
            req.vistor_media = "mobile";
            req.company = companyId;
            req.buId = mantisChatNew.buId;
            req.trackId = mantisChatNew.trackId || trackId;
            req.assignedAgent = mantisChatNew.assignedAgent;
            req.browser = mantisChatNew.browser;
            //search word info
            req.cookieRefer = mantisChatNew.cookieRefer;
            try {
                if (!!req.cookieRefer) {
                    let parsed = JSON.parse(req.cookieRefer);
                    if (parsed) {
                        req.searchwdInPage = parsed.searchwd;
                    }
                }
            } catch (e) {

            }
            this.handleMantisChat(mantisChatNew);
            req.ipCheck = mantisChatNew.ipCheck;
            req.brand = mantisChatNew.brand;
            req.chat_page_url = '';
            req.ctag = mantisChatNew.ctag;
            req.mantisId = mantisChatNew.mantisId;
            req.probeId = mantisChatNew.uiPath;
            req.aifanfan = mantisChatNew.aifanfan;
            return req;
        },
        registerListener: function () {
            const {mantisChat, msgList} = this.data;
            pomelo.on('onChat', data => {
                // console.log('收到消息', data);
                const say_from = data.say_from;
                let msgListNew = [...this.data.msgList];
                msgListNew.push(data);
                if(say_from === 'A' || say_from === 'V'){
                    console.log(msgListNew);
                    this.setData({
                        msgList: msgListNew
                    })
                }
                if (data.from === mantisChat.uid) { //访客的消息

                } else { //  咨询师消息
                    this.responseMessage(data, "MESSAGE");
                }
            })
            // 中断后的回调
            pomelo.on('disconnect', function (data) {
                console.log('中断后的回调');

            })

            pomelo.on('error', function (data) {
                console.log('error');

            })

            // 连接错误
            pomelo.on('ON_ERROR', data => {
                console.log('ON_ERROR');
                let mantisChatNew = this.data.mantisChat;
                mantisChatNew.chat.hasChat = false;
                this.handleMantisChat(mantisChatNew);
            })

            // 咨询师离线
            pomelo.on('ON_AGENT_LEAVE', data => {
                console.log('咨询师离线');
            })

            // 未关闭对话的历史消息
            pomelo.on('ON_HIS_MSG', data => {
                console.log('未关闭对话的历史消息');
            })

            // 咨询师未匹配
            pomelo.on('ON_NO_AGENT_MATCH', data => {
                console.log('咨询师未匹配');
            })

            // 被 T
            pomelo.on('onKick', data => {
                console.log('被 T');
                let mantisChatNew = this.data.mantisChat;
                mantisChatNew.chat.hasChat = false;
                this.handleMantisChat(mantisChatNew);
            })

            // 对话发起成功
            pomelo.on('ON_CHANNEL_OK', data => {
                console.log('对话发起成功');
                let mantisChatNew = this.data.mantisChat;
                mantisChatNew.chat.connected = true;
                this.handleMantisChat(mantisChatNew);
            })

            // 收到对话转接请求
            pomelo.on('ON_TRANSFER', data => {
                console.log('收到对话转接请求');
                let mantisChatNew = this.data.mantisChat;
                mantisChatNew.chat.hasChat = false;
                this.handleMantisChat(mantisChatNew);
            })
        },
        handleUid: function (passedInUid) {
            const {companyId} = this.data;
            let companyStr = "@" + companyId;

            // 传入的uid
            if (!!passedInUid && passedInUid !== "undefined") {
                // Cookies.set('mantis' + mantisChat.companyId, passedInUid, {expires: 1000});
                wx.setStorage({
                    key: "mantis" + companyId,
                    data: passedInUid
                });
                return passedInUid;
            }

            // //优先从cookie中获取
            // let id = Cookies.get('mantis' + mantisChat.companyId);
            let id = wx.getStorageSync('mantis' + companyId);
            if (!!id && id !== "undefined" && id.replace(/(^s*)|(s*$)/g, "").length > 0) {
                // 如果是当前公司的访客
                if (id.indexOf(companyStr) > 0) {
                    return id;
                }
            }

            // 需要生成uid
            let generateUid = this.mantisCreateGuid() + "@" + companyId;
            // Cookies.set('mantis' + mantisChat.companyId, generateUid, {expires: 1000});
            wx.setStorage({
                key: "mantis" + companyId,
                data: generateUid
            })
            return generateUid;
        },
        requestChatInner: function (host, port) {
            const _this = this;
            const {probeData, mantisChat} = this.data;
            allMessages = [];
            // mantisChat.chat.isConnecting = true;

            let probe = probeData;
            let promotionMsg = null;
            promotionMsg = encodeURIComponent(probe.mbPromTxt || "");

            pomelo.init({
                host,
                port
            }, function () {
                // 发送搜索词欢迎语
                let searchWordMessage = null;
                if (probe.searchWordMessageFlag === 'Y') {
                    // let mwd = JSON.parse(mantisChat.cookieRefer).searchwd;
                    // if (probe.searchWordMessageMode === 'search_Word_Message_First' && mwd) {
                    //     searchWordMessage = probe.searchWordMessageContent.replace('#SEARCH_WORD#', mwd);
                    // } else if (probe.searchWordMessageMode === 'search_Word_Message_Delay') {
                    //     setTimeout(function () {
                    //         // getSearchWord();
                    //     }, (probe.searchWordMessageDelaySecond || 0) * 1000);
                    // }
                }
                let params = {
                    uid: mantisChat.uid,
                    siteId: mantisChat.siteId,
                    companyId: probe.companyId,
                    buId: probe.buId,
                    stag: probe.stag,
                    // 如果采用指定客服分组的方式发起
                    sgId: probe.defaultSvgId,
                    defaultSgId: probe.defaultSvgId,
                    probeId: probe.id, // 探头ID
                    areaRuleFlag: probe.areaRuleFlag, //探头配置地域规则标识
                    assignedAgent: probe.assignedAgent,
                    projectId: probe.projectId,
                    ocpcUrl: '',
                    reqInfo: _this.getRequest(),
                    lpRequestDuration: probe.enterDuration,
                    welcome: '',
                    xst: '',
                    pageparam: '',
                    thirdAccount: '',
                    thirdUid: '',
                    promotionMsg: '',
                    searchWordMessage: 'searchWordMessage'
                };
                pomelo.request("connectorMini.entryHandler.customerEnter", params, function (data) {
                    if (!data || data.error || !data.chatId) {
                        console.error("Fail to request" + JSON.stringify(data));
                        return;
                    }
                    let mantisChatNew = mantisChat;
                    mantisChatNew.chat.hasChat = false;
                    if (data.serverTime) { // 获取系统时间，计算时差
                        mantisChatNew.mantisTtimeDifference = data.serverTime - Date.now();
                    }
                    // restore the request mode
                    if (mantisChatNew.mode === "TRANSFER") {
                        mantisChatNew.mode = "VISTOR";
                    }
                    mantisChatNew.chatId = data.chatId;
                    mantisChatNew.channelId = data.channelId;
                    mantisChatNew.sgId = data.sgId;
                    if (data.agentImg) {
                        mantisChatNew.agent_msg_icon = data.agentImg;
                        // $('.serviceHead>img').attr('src', data.agentImg);
                    }
                    _this.handleMantisChat(mantisChatNew);
                    if (data.msgType === 'ON_WEL_MSG') {
                        // welcomeMsg(data.msg, searchWordMessage);
                    } else if (data.msgType === 'ON_WEL_MSG_ALL') {
                        // welcomeMsgAll(data.msg, (data.historyMsgs || []));
                    }
                    _this.showChat();
                });
            });
        },
        mantisCreateGuid: function () {
            return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        responseMessage: function (data, type) {    // 消息回执
            const {mantisChat} = this.data;
            let route = "chat.chatHandler.customerResponse";
            if (!!mantisChat.chatId) {
                pomelo.request(route, {
                    type: type,
                    chatId: mantisChat.chatId,
                    visitorId: mantisChat.uid,
                    msgId: data.msgId
                }, function (data) {
                    console.log('消息回执返回',data);
                });
            }
        },
        sendMessage: function () {
            const {probeData, inputValue, mantisChat} = this.data;
            const route = "chat.chatHandler.customerSend";
            pomelo.request(route, {
                //消息接口
                msgId: '',
                content: inputValue,
                sgId: '262',
                chatId: mantisChat.chatId,
                agentId: 'tantou@7011',
                target: "",
                type: "text",
                projectId: probeData.projectId,
                companyId: probeData.companyId,
                channelId: mantisChat.channelId,
                from: mantisChat.uid,
                msgType: ''
            }, data => {
                console.log(data);
                this.setData({
                    inputValue: ''
                })
                if (typeof data.error !== 'undefined' && data.error === 'CHAT HAS BEEN CLOSED') {
                    //处理关闭消息发送消息失败，重新发起，并重发消息
                    let mantisChatNew = mantisChat;
                    mantisChatNew.chat.hasChat = false;
                    this.handleMantisChat(mantisChatNew);
                }
            });
        },
        handleMantisChat: function (mantisChat) {
            this.setData({
                mantisChat
            })
        },
        bindKeyInput: function (e) {
            this.setData({
                inputValue: e.detail.value
            })
        },
        callPhone:function (){
            wx.makePhoneCall({
                phoneNumber: '1710250228'
            })
        }
    },
    export() {
        return this
    }
})
