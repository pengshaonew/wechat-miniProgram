// const _ = require('./utils')
// eslint-disable-next-line no-unused-vars
const pomelo = require('pomelo-weixin-client');
let mantis = {};
// chat
let mantisChat = {};

// save the paras passed in by URL
mantisChat = {};
// save the chat context: chatPageUrl, requestId, chatId, Agent
mantisChat.chat = {
    hasChat: false,
    hasConfig: false,
    welcomeMsgCount: 0,
    visitorMsgCount: 0,
    agentMsgCount: 0,
    count: 0
};
//collected the request info
mantisChat.request = {};
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

// 标识当前与服务器的对话状态
mantisChat.chat.connected = false;
// 标识是否正在连接
mantisChat.chat.isConnecting = false;
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

// 百度BCP搜索词欢迎语请求次数
let searchCount = 0;

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
    properties: {
        isShowMantisChat: {
            type: Boolean,
            value: false
        },
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
        inputValue: '',
        probeData: {}
    },
    observers: {
        'isShowMantisChat': function (isShowMantisChat){
            if(isShowMantisChat){
                if(!mantisChat.chat.hasChat){ //  如果没有发起会话再发请求
                    this.registerListener();
                    this.queryEntry();
                }
            }
        }
    },
    lifetimes: {
        attached() {
            this.initParams();
            this.loadProbeData();
        }
    },
    methods: {
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
            const {companyId} = this.data;
            mantisChat.uid = this.handleUid(this.mantisCreateGuid() + "@" + companyId);
        },
        queryEntry: function (callback) {
            let _this = this;
            let route = 'gateMini.gateMiniHandler.queryCustomerEntry';
            const {probeData} = this.data;
            pomelo.init({
                host,
                port
            }, () => {
                pomelo.request(route, {
                    uid: mantisChat.uid,
                    siteId: '',
                    companyId: probeData.companyId,
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
            const {probeData} = this.data;
            mantisChat.lp = currPage.route;
            let req = mantisChat.request;
            req.site_id = mantisChat.siteId;
            req.stag = mantisChat.stag;
            req.page_title = mantisChat.page_title;
            req.req_mode = mantisChat.mode;
            req.req_ele = mantisChat.ele || "";

            // set landing page url
            req.lp = mantisChat.lp;

            // set the request page url
            if (!mantisChat.chatPageUrl) {
                mantisChat.chatPageUrl = req.lp;
            }
            req.url = encodeURI(mantisChat.chatPageUrl);

            // landing page id， 将来用来补全referer字符串
            req.lp_id = mantisChat.lpId;
            req.vistor_id = mantisChat.uid;
            req.srv_gp_id = probeData.defaultSvgId;
            req.vistor_media = "mobile";
            req.company = probeData.companyId;
            req.buId = mantisChat.buId;
            req.trackId = mantisChat.trackId || trackId;
            req.assignedAgent = mantisChat.assignedAgent;
            req.browser = mantisChat.browser;
            //search word info
            req.cookieRefer = mantisChat.cookieRefer;
            try {
                if (!!req.cookieRefer) {
                    let parsed = JSON.parse(req.cookieRefer);
                    if (parsed) {
                        req.searchwdInPage = parsed.searchwd;
                    }
                }
            } catch (e) {

            }

            req.ipCheck = mantisChat.ipCheck;
            req.brand = mantisChat.brand;
            req.chat_page_url = '';
            req.ctag = mantisChat.ctag;
            req.mantisId = mantisChat.mantisId;
            req.probeId = mantisChat.uiPath;
            req.aifanfan = mantisChat.aifanfan;
            return req;
        },
        registerListener: function () {
            pomelo.on('onChat', function (data) {
                console.log('收到消息');

            })
            // 中断后的回调
            pomelo.on('disconnect', function (data) {
                console.log('中断后的回调');

            })

            pomelo.on('error', function (data) {
                console.log('error');

            })

            // 连接错误
            pomelo.on('ON_ERROR', function (data) {
                console.log('ON_ERROR');
                mantisChat.chat.hasChat = false;
            })

            // 咨询师离线
            pomelo.on('ON_AGENT_LEAVE', function (data) {
                console.log('咨询师离线');

            })

            // 未关闭对话的历史消息
            pomelo.on('ON_HIS_MSG', function (data) {
                console.log('未关闭对话的历史消息');

            })

            // 咨询师未匹配
            pomelo.on('ON_NO_AGENT_MATCH', function (data) {
                console.log('咨询师未匹配');

            })

            // 被 T
            pomelo.on('onKick', function (data) {
                console.log('被 T');
                mantisChat.chat.hasChat = false;
            })

            // 对话发起成功
            pomelo.on('ON_CHANNEL_OK', function (data) {
                console.log('对话发起成功');
                mantisChat.chat.hasChat = true;
            })

            // 收到对话转接请求
            pomelo.on('ON_TRANSFER', function (data) {
                console.log('收到对话转接请求');
                mantisChat.chat.hasChat = false;
            })
        },
        handleUid: function (passedInUid) {
            const {probeData} = this.data;
            let companyStr = "@" + probeData.companyId;

            // 传入的uid
            if (!!passedInUid && passedInUid !== "undefined") {
                // Cookies.set('mantis' + mantisChat.companyId, passedInUid, {expires: 1000});
                wx.setStorage({
                    key: "mantis" + probeData.companyId,
                    data: passedInUid
                });
                return passedInUid;
            }

            // //优先从cookie中获取
            // let id = Cookies.get('mantis' + mantisChat.companyId);
            let id = wx.getStorageSync('mantis' + probeData.companyId);
            if (!!id && id !== "undefined" && id.replace(/(^s*)|(s*$)/g, "").length > 0) {
                // 如果是当前公司的访客
                if (id.indexOf(companyStr) > 0) {
                    return id;
                }
            }

            // 需要生成uid
            let generateUid = this.mantisCreateGuid() + "@" + mantisChat.companyId;
            // Cookies.set('mantis' + mantisChat.companyId, generateUid, {expires: 1000});
            wx.setStorage({
                key: "mantis" + probeData.companyId,
                data: generateUid
            })
            return generateUid;
        },
        requestChatInner: function (host, port) {
            const _this = this;
            const {probeData} = this.data;
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
                    console.log(481, data);
                    if (data.serverTime) { // 获取系统时间，计算时差
                        mantisChat.mantisTtimeDifference = data.serverTime - Date.now();
                    }
                    // restore the request mode
                    if (mantisChat.mode === "TRANSFER") {
                        mantisChat.mode = "VISTOR";
                    }
                    mantisChat.chatId = data.chatId;
                    mantisChat.channelId = data.channelId;
                    mantisChat.sgId = data.sgId;
                    if (data.agentImg) {
                        mantisChat.agent_msg_icon = data.agentImg;
                        // $('.serviceHead>img').attr('src', data.agentImg);
                    }
                    if (data.msgType === 'ON_WEL_MSG') {
                        // welcomeMsg(data.msg, searchWordMessage);
                    } else if (data.msgType === 'ON_WEL_MSG_ALL') {
                        // welcomeMsgAll(data.msg, (data.historyMsgs || []));
                    }
                });
            });
        },
        mantisCreateGuid: function () {
            return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        sendMessage: function () {
            const {probeData, inputValue} = this.data;
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
                    mantisChat.chat.hasChat = false;
                }
            });
        },
        bindKeyInput: function (e) {
            this.setData({
                inputValue: e.detail.value
            })
        }
    },
    export() {
        return {mantisChat: {}}
    }
})
