// plugin/components/mantisChat.js
let startTime = 0;
const exportData = require('../index');
const pomelo = require('pomelo-weixin-client');

// ######### 参数定义 ###########################

// 提示咨询师输入定时器
let agentKeyInInterval = null;
// 页面停留时间
let enterDuration = 0;
// 咨询师是否在输入
let isKeyInShow = false;
// 咨询师输入提示步骤
let agentKeyInStep = 0;
// 输入状态维持的最大时间
let agentKeyInLimit = 0;

//最后输出时间的时间点, 用来控制日期显示
let lastOutputDate;
let today = new Date().getDay();
let LEAVE_TITLE = '在线留言';

//前端收到错误提示计数
let pomeloErrorCount = 0;

//前端收到错误提示计数达到限制，处理错误
let POMELO_ERROR_LIMIT = 20;

// 访客自动回复次数
let visitantAutoResponseCount = 0;

// 坐席自动回复次数
let counselorAutoResponseCount = 0;

// 预读联系方式断网存储
let contactWay = [];

/**
 * 自动弹起隐藏聊窗的timer
 * @type {boolean}
 */
let autoShowHideChatTimer;

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
// 未发送的消息
let resendMessages = [];
// 未发送的访客表单或退出挽留提交的消息
let resendSubmitMsg = [];
// 输入提醒定时任务
let reminderTmr;     //访客长时间不输入，自动发送提醒定时器
let agentTimedTimer; //咨询师不输入，自动回复定时器
let robotAutoMsgTmr; // 机器人自动发送消息
let robotAutoMsgCount = 0;
//移动端是否移除消息中的格式
let mbRemoveTag;
//init ttl time
let beginTime = new Date().getTime();
// 对话发起页面地址，回退使用的url
let page_url = null;
// 欢迎语剩余的消息
let welcomeMsgs = [];
// 欢迎语发送定时器
let welcomeMsgTmr;

// 聊窗内图片查看大图
let openMaxImg = false;
// 聊窗内图片关闭大图
let closeMaxImg = false;
// 访客未输入计时器
let cutOffTimer = null;

let iframeHideTmr = null;
let iframeShowTmr = null;

let firstShow = true;

// 评价选项提交按钮
let btnLoading;

//验证码timer
let mantisCodeTimer = null;

//退出挽留PC
let retainRemainTimer = null;  //持续停留时间timer

let ttlInterval = null;

const phoneRegExp = /(\b1[3-9]\d\s?\d{4}\s?\d{4}\b)|(\b0\d{2,3}[^\d]?\d{3,4}\s?\d{4}\b)|(\b400[^\d]?\d{3}[^\d]?\d{4}\b)/;
const wechatRegExp = /((微信号?\s*[:|：]?)|((v|wx)[:|：]))\s*([a-zA-Z1-9][-_a-zA-Z0-9]{5,19})/ig;

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
const port = 13001; // 13014
const ports = [13001, 13002];

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
        phone: {
            type: String,
            value: ''
        },
        uid: {
            type: String,
            value: ''
        },
        pageParam: {
            type: Object,
            value: {}
        }
    },
    data: {
        isShowChat: false,
        isShowLeave: false,
        isShowInvite: false,
        isShowMinimizeBox: false,
        isEvaluationModal: false,
        isShowRetain: false,
        tipMsg: null,
        parentParams: {},
        inputValue: '',
        retainPhone: '',
        promptText: '',
        codeSending: '',
        scrollTop: 0,
        disabledInput: true,
        hasHistoryMsg: false, //是否有历史消息
        isShowSubmitComplete: false,    // 退出挽留提交后显示提交成功
        hisMsgList: [],
        msgList: [],
        probeData: {},
        mantis: {},
        mantisChat: {
            chat: {
                hasConfig: false,
                hasChat: false,
                isConnecting: false,    // 标识是否正在连接
                connected: false,   // 标识当前与服务器的对话状态
                welcomeMsgCount: 0,
                visitorMsgCount: 0,
                agentMsgCount: 0,
                count: 0
            },
            unReadMsgNumber: 0, // 未读的咨询师消息数
            request: {},
            paras: {}
        },
        scrollBottomId: ''
    },
    observers: {
        'phone': function (phone) {
            if (phone) {
                if (mantisChat.chat.connected && phone) {
                    this.sendMessage(phone);
                }
            }
        }
    },

    lifetimes: {
        attached() {
            this.messageAudio = wx.createInnerAudioContext({
                useWebAudioImplement: true
            });
            this.messageAudio.src = 'https://probe.bjmantis.net/chat/13203.mp3';
            const {pageParam, companyId} = this.data;
            if (pageParam) {
                this.setData({
                    pageParam: {}
                })
            }
            wx.setStorage({
                key: 'companyId',
                data: companyId
            });
            this.initParams();
            this.loadProbeData();
        }
    },

    methods: {
        showChat(autoFlag, foreShowChat) {
            if (autoShowHideChatTimer) {
                clearTimeout(autoShowHideChatTimer);
                autoShowHideChatTimer = null;
            }
            const {companyId, isShowChat} = this.data;
            let mantisChatNew = {...this.data.mantisChat};
            // 发送显示聊窗的通知
            let route = "chat.chatHandler.hideIframe";
            if (mantisChatNew.chat.connected && !isShowChat) {
                pomelo.request(route, {
                    //消息接口
                    content: "聊窗打开",
                    chatId: mantisChatNew.chat.chatId,
                    target: "",
                    type: "N",
                    from: mantisChatNew.uid,
                    companyId,
                    channelId: mantisChatNew.chat.channelId
                }, function (data) {

                });
            }
            mantisChatNew.unReadMsgNumber = 0;
            this.hideInviteDiv();
            this.hideResvDiv(false, "");
            this.handleMantisChat(mantisChatNew);
            this.setData({
                isShowChat: true,
                tipMsg: null,
            })
        },
        hideChat() {
            const _this = this;
            const {companyId, isShowChat, probeData} = this.data;
            let mantisChat = this.data.mantisChat;
            // 发送隐藏聊窗的通知
            let route = "chat.chatHandler.hideIframe";
            if (mantisChat.chat.connected && isShowChat) {
                pomelo.request(route, {
                    //消息接口
                    content: "聊窗收起",
                    chatId: mantisChat.chat.chatId,
                    target: "",
                    type: "Y",
                    from: mantisChat.uid,
                    companyId,
                    channelId: mantisChat.chat.channelId
                }, function (data) {
                });

            }
            if (!!probeData.mbAutoShowHideChatDelay && !!mantisChat.chat.chatId) {
                autoShowHideChatTimer = setTimeout(function () {
                    _this.showChat('AUTO');
                    _this.scrollDown();
                }, probeData.mbAutoShowHideChatDelay * 1000)
            }
            this.setData({
                isShowChat: false
            })
        },
        // 隐藏邀请框
        showInviteDiv() {
            this.setData({
                isShowInvite: true
            })
        },
        // 隐藏邀请框
        hideInviteDiv() {
            this.setData({
                isShowInvite: false
            })
        },
        // 显示留言页
        showResvDiv(reason) {
            this.setData({
                isShowLeave: true
            });
            this.sendEntry(reason);
        },
        // 隐藏留言
        hideResvDiv() {
            this.setData({
                leavingMessage: false
            })
        },
        initParams: function () {
            const {pageParam, uid} = this.data;
            let mantisChatNew = {...this.data.mantisChat};
            mantisChatNew.uid = uid || this.handleUid(); // 获取uid
            mantisChatNew.chatPageUrl = pageParam.chatPageUrl + '&gdt_vid=' + (pageParam.gdt_vid || pageParam.qz_gdt);
            this.handleMantisChat(mantisChatNew);
        },
        _requestChat(params) {
            this.setData({
                parentParams: params
            })
            const {mantisChat} = this.data;
            if (!mantisChat.chat.connected) { //  如果没有发起会话再发请求
                this.queryEntry();
            } else {
                this.showChat()
            }
        },
        loadProbeData() {
            const {serverUrl, companyId, probeId, mantisChat} = this.data;
            if (companyId && probeId) {
                startTime = Date.now();
                console.log('探头请开始', startTime);
                wx.request({
                    url: serverUrl + companyId + '/' + probeId + '.json?' + Date.now(),
                    data: {},
                    method: 'GET',
                    success: res => {
                        console.log('探头请求时长：', Date.now() - startTime);
                        if (res && res.data) {
                            this.setData({
                                probeData: res.data,
                                isShowMinimizeBox: res.data.mbIsShowMinimize
                            }, () => {
                                this.mantisSendPageInfo();
                            });
                            res.data.stayConfig && this.retainRules(res.data.stayConfig);
                            /^\d*$/.test(res.data.mbAutoChatDelay) && this.autoChat(res.data.mbAutoChatDelay);
                            this.mantisSetupActiveTTl();
                        }
                        this.loadConfig();
                    },
                    fail: () => {
                        console.error("fail to load p, try to load & use default config");
                        this.loadConfig();
                    }
                });
            }

        },
        loadConfig() {
            const {companyId, probeData} = this.data;
            wx.request({
                url: "https://" + probeData.chatServer + "/chat/" + companyId + "/" + probeData.buId + "/config.json",
                method: 'GET',
                success: res => {
                    if (res.statusCode === 404) {
                        this.initConfig(defaultConfig);
                    } else {
                        let mantisChatNew = {...this.data.mantisChat};
                        mantisChatNew.chat.hasChat = false;
                        this.handleMantisChat(mantisChatNew);
                        this.initConfig(res);
                    }
                },
                fail: () => {
                    this.initConfig(defaultConfig);
                }
            });
        },
        initConfig(res) {
            if (!res) {
                console.error("no config found");
                return;
            }

            if (!!res.chat) {
                let chatConfig = res.chat;
                this.initChatConfig(chatConfig);
            }

            let mantisChatNew = {...this.data.mantisChat};
            if (!!res.welcome) {
                let welcome = res.welcome;
                mantisChatNew.chat.welcome = welcome || {};
            }

            if (!!res.msg) {
                let msg = res.msg;
                mantisChatNew.chat.msg = msg || {};
            }
            this.handleMantisChat(mantisChatNew);
            this.initChat();
        },
        initChat() {
            const {probeData, companyId} = this.data;
            let mantisChatNew = {...this.data.mantisChat};
            // chat server address
            let chat_host = probeData.chatServer;
            let chat_port = port;

            // track server address
            let track_host = probeData.chatServer;
            let track_port = 80;
            if (!!track_host) {
                track_host = "tk" + track_host;
            }
            mantisChatNew.paras.trackUrl = "https://" + track_host + "/u/1.gif";
            mantisChatNew.con = {host: chat_host, port: chat_port};
            mantisChatNew.paras.deviceInfo = this.getDeviceInfo();
            let result = mantisChatNew.paras.deviceInfo;
            let sgIdInCookie = wx.getStorageSync('mantis_sgid' + companyId);
            if (!!sgIdInCookie) {
                mantisChatNew.paras.serviceGroupId = sgIdInCookie;
            }

            // pomelo监听
            this.registerListener();

            this.handleMantisChat(mantisChatNew);
        },
        initChatConfig(chatConfig) {
            MAX_REMINDER = chatConfig.maxRemCount || MAX_REMINDER;
            REMINDER_INTERVAL = chatConfig.remInterval || REMINDER_INTERVAL;
            let mantisChatNew = {...this.data.mantisChat};

            // 移除移动端格式
            mbRemoveTag = chatConfig.mbRemoveTag || false;
            // 是否支持多站点
            mantisChatNew.multipleSites = chatConfig.multipleSites || mantisChatNew.multipleSites;
            // 客服栏消息
            mantisChatNew.chat.btnMsg = chatConfig.mini_btnMsg || "";
            mantisChatNew.chat.pcTitleTxt = mantisChatNew.chat.btnMsg;
            // 咨询师外部名称
            mantisChatNew.chat.showAgentName = chatConfig.showAgentName;
            // chat头像
            mantisChatNew.chat.logoUrl = chatConfig.agent_img;
            // 消息中的咨询师头像
            mantisChatNew.chat.agent_msg_icon = chatConfig.agent_msg_icon;

            // 留言的提示信息
            mantisChatNew.chat.mini_resv_func_show = chatConfig.mini_resv_func_show;
            mantisChatNew.chat.mini_resv_func_hide = chatConfig.mini_resv_func_hide;
            mantisChatNew.chat.resv_ok_msg = chatConfig.resv_ok_msg;
            mantisChatNew.chat.resv_error_msg = chatConfig.resv_error_msg;
            mantisChatNew.chat.chat_alloc_msg = chatConfig.chat_alloc_msg;
            // tab名称
            mantisChatNew.chat.mini_right_tab1 = chatConfig.mini_right_tab1;
            mantisChatNew.chat.mini_right_tab2 = chatConfig.mini_right_tab2;
            // tab内容
            mantisChatNew.chat.mini_right_tab1_content = chatConfig.mini_right_tab1_content;
            mantisChatNew.chat.mini_right_tab2_content = chatConfig.mini_right_tab2_content;
            // 是否提醒输入
            mantisChatNew.chat.offline_reminder = chatConfig.offline_reminder;
            // 提醒输入的内容
            mantisChatNew.chat.offline_reminder_msg = chatConfig.offline_reminder_msg;
            // prom
            mantisChatNew.chat.pcPromTxt = chatConfig.mini_pc_prom_div;
            //客户端是否显示上传图片按钮 true 隐藏  false显示
            mantisChatNew.chat.hideImgUploadBtn = chatConfig.hideImgUploadBtn;

            //客户端是否显示版权信息 true 隐藏  false或不配置显示
            mantisChatNew.chat.isHiddenCopyright = chatConfig.isHiddenCopyright;

            //添加客户自定义JS
            mantisChatNew.chat.customizableJS = chatConfig.customizableJS;

            this.handleMantisChat(mantisChatNew);
            this.mergeProbeSetting();
        },
        mergeProbeSetting() {
            const {probeData} = this.data;
            let mantisChatNew = {...this.data.mantisChat};
            // 聊窗风格
            mantisChatNew.chat.mbChatStyle = probeData.mbChatStyle;

            // 发送按钮颜色
            mantisChatNew.chat.mbSndBtnColor = probeData.mbSndBtnColor;
            // 窗口栏背景颜色
            mantisChatNew.chat.mbTitleColor = probeData.mbTitleColor;

            // 访客消息背景颜色
            mantisChatNew.chat.mbStudentMsgBg = probeData.mbStudentMsgBg;

            // mb 窗口栏logo
            let mbTitleLogoUrl = probeData.mbTitleLogoUrl;
            if (mbTitleLogoUrl) {
                mantisChatNew.chat.logoUrl = mbTitleLogoUrl;
            }
            // mb 窗口栏 文字
            let mbTitleTxt = probeData.mbTitleTxt;
            if (mbTitleTxt) {
                mantisChatNew.chat.mbTitleTxt = mbTitleTxt;
            }

            //开场图文
            let mbPromTxt = probeData.mbPromTxt;
            if (mbPromTxt) {
                mbPromTxt = mbPromTxt.replace(/^<p>\s*<\/p>\n*$/, "").replace(/^<p><br><\/p>\n*$/, "");
            }

            if (mbPromTxt) {
                mantisChatNew.chat.mbPromTxt = mbPromTxt;
            }

            // 消息中的咨询师头像
            let mbAgentIcon = probeData.mbAgentIcon;
            if (mbAgentIcon) {
                mantisChatNew.chat.agent_msg_icon = mbAgentIcon;
            }

            // 是否允许隐藏chat iframe, 如果是直达聊窗的方式，不允许隐藏
            if (mantisChatNew.isDirectMode) {
                mantisChatNew.chat.mbAllowClose = false;
            } else {
                let mbAllowClose = probeData.mbAllowClose;
                if (mbAllowClose) {
                    mantisChatNew.chat.mbAllowClose = mbAllowClose;
                }
            }

            // mb message box background color
            let mbBoxBgColor = probeData.mbBoxBgColor;
            if (mbBoxBgColor) {
                mantisChatNew.chat.mbBoxBgColor = mbBoxBgColor;
            }
            // mb message box font color
            let mbBoxFontColor = probeData.mbBoxFontColor;
            if (mbBoxFontColor) {
                mantisChatNew.chat.mbBoxFontColor = mbBoxFontColor;
            }

            // mb message notify method when chat iframe is hidden: sound, vibrate
            let mbMsgNotifyMethod = probeData.mbMsgNotifyMethod;
            if (mbMsgNotifyMethod) {
                mantisChatNew.chat.mbMsgNotifyMethod = mbMsgNotifyMethod;
            }

            // mb message action: tip or show chat iframe
            let mbMsgAction = probeData.mbMsgAction;
            if (!!mbMsgAction) {
                mantisChatNew.chat.mbMsgAction = mbMsgAction;
            }
            // 移动端消息显示设置
            mantisChatNew.chat.topShowMsg = probeData.topShowMsg;

            // 访客未回复超过时长
            mantisChatNew.chat.visitantExpireTime = probeData.visitantExpireTime || 60 * 60 * 240;
            // 访客未回复超过时长时自动回复语句
            mantisChatNew.chat.autoresponder1 = probeData.autoresponder1;
            // 访客未回复自动回复次数
            mantisChatNew.chat.visitantAutoResponseCount = probeData.visitantAutoResponseCount || 1;
            // 咨询师未回复超过时长
            mantisChatNew.chat.counselorExpireTime = probeData.counselorExpireTime || 60 * 60 * 240;
            // 咨询师未回复超过时长自动回复语句
            mantisChatNew.chat.autoresponder2 = probeData.autoresponder2;
            // 咨询师未回复自动回复次数
            mantisChatNew.chat.counselorAutoResponseCount = probeData.counselorAutoResponseCount || 1;
            // 隐藏聊窗自动弹出的时间（秒）
            mantisChatNew.chat.mbAutoShowHideChatDelay = probeData.mbAutoShowHideChatDelay;
            mantisChatNew.chat.mbAutoIframeHeight = probeData.mbAutoIframeHeight;
            this.handleMantisChat(mantisChatNew);
        },
        queryEntry: function (callback) {
            let _this = this;
            let route = 'gateMini.gateMiniHandler.queryCustomerEntry';
            const {probeData, mantisChat, companyId, pageParam} = this.data;
            let port = ports[this.handleRandom(0, 1)];
            pomelo.init({
                host: probeData.chatServer,
                port
            }, () => {
                pomelo.request(route, {
                    uid: mantisChat.uid,
                    siteId: '',
                    companyId: companyId,
                    buId: probeData.buId,
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
                    pageparam: pageParam.pageParam,
                    thirdAccount: pageParam.account,
                    thirdUid: pageParam.userId,
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
                        } else {
                            let errMsg = "fail_to_find_connector";
                            if (!!data) {
                                errMsg = data.message;
                            }
                            this.showResvDiv(errMsg);
                        }
                        return;
                    }
                    this.requestChatInner(data.host, data.port);//返回主机名和端口号给回调函数重新连接connector服务器
                })
            });
        },
        registerListener: function () {
            const {mantisChat, probeData} = this.data;

            pomelo.on('onChat', data => {
                const _this = this;
                let mantisChatNew = {...this.data.mantisChat};
                const say_from = data.say_from;
                const evaluationFlag = data.evaluationFlag;
                let msgListNew = [...this.data.msgList];

                // 如果访客说话，球到咨询师手里
                if (say_from === 'V') {
                    data.msg = decodeURIComponent(data.msg);
                    mantisChatNew.chat.ball = {who: 'A', lastTime: new Date().getTime()};
                    if (mantisChatNew.chat.isRobot === 'Y') {
                        this.clearRobotAutoMsgTmr();
                    }
                }

                let chatComplete = data.complete || "N";
                if (chatComplete === "Y") {
                    mantisChatNew.chat.isComplete = "Y";
                }
                // 如果咨询师说话，球到访客手里
                if (say_from === 'A') {
                    mantisChatNew.chat.ball = {who: 'V', lastTime: new Date().getTime()};
                    if (mantisChatNew.chat.isRobot === 'Y') {
                        this.setRobotAutoMsgTimer();
                    }
                    this.responseMessage(data, "MESSAGE");
                }

                if (say_from === 'R') {
                    // 收到客服发起评价通知
                    if (evaluationFlag === 'EVALUATE_TYPE') {
                        // 显示评价窗口
                        this.setData({
                            isEvaluationModal: true
                        })
                    }
                    if (evaluationFlag === 'EVALUATE_RESULT') {
                        msgListNew.push(data);
                        this.setData({
                            msgList: msgListNew
                        })
                    }
                }

                if (say_from !== 'V' && say_from !== 'A' || msgType === 'F_S') {
                    return;
                }

                // 排除自动发送的消息
                let msgType = data.msgType;
                // 如果是挽留提交的消息就不处理
                if (msgType === 'R_S') return;
                if (!!msgType && msgType !== 'A') {
                    // 咨询师或者学员任何一方说话，则取消欢迎语自动发送
                    this.clearWelcomeMsgTmr();
                }

                // 如果是访客消息，更新访客的最后消息时间, 消息已经显示过，所以不用再添加
                if (data.from === mantisChat.uid) {
                    mantisChatNew.chat.vistorSent = true;
                    lastVisitorMsgTime = new Date().getTime();
                    lastVisitorReminderTime = new Date().getTime();
                    reminderCount = 0;
                    if (!!reminderTmr) { //收到访客的消息，清除访客的计时器
                        clearInterval(reminderTmr);
                        reminderTmr = null;
                    }
                    this.setAgentTimedTimer(); //咨询师自动回复开始计时
                    if (!data.timeStr) {
                        data.timeStr = this.dateFormat(new Date(data.time), "yyyy-MM-dd hh:mm:ss");
                    }
                } else {
                    // 排除自动发送的消息msgType 手动发送消息 M  其他消息 A
                    if (!!msgType && msgType !== 'A') {
                        mantisChatNew.chat.agentSent = true;
                        this.setupRemindTimer();//访客未回复自动回复开始计时
                    }
                    if (say_from === 'A' && (msgType === 'M' || msgType === 'F')) {    // 收到咨询师的消息
                        const phoneReg = phoneRegExp;
                        const wechatReg = wechatRegExp;
                        let phoneFlag = phoneReg.exec(data.msg)
                        if (phoneFlag && !probeData.callPhoneNumberFlag) {
                            data.phone = phoneFlag[0];
                        }
                        let plainMsg = data.msg.replace(/<\/?[^>]*>/g, '').replace(/&nbsp;/ig, '');
                        let wechatFlag = wechatReg.exec(plainMsg);
                        if (wechatFlag && wechatFlag.length >= 6 && !probeData.copyWechatNumberFlag) {
                            data.copyWechatBtnText = '复制' + wechatFlag[1].replace(/[:：]/g, '');
                            data.wechatCode = wechatFlag[5];
                        }
                        lastCounselorMsgTime = new Date().getTime();
                        if (agentTimedTimer) { // 清除咨询师的计时器
                            clearInterval(agentTimedTimer);
                            agentTimedTimer = null;
                        }

                    }
                    this.cutOff();
                    // 如果收到新消息且对话没有切断，自动弹出
                    if (mantisChat.chat.connected) {
                        let msg = data.msg;
                        let dataTime = data.time;
                        let timeStr = new Date(dataTime);
                        if (say_from === 'A' && data.msgType === 'F') {   // 表单消息
                            data.formData = JSON.parse(msg);
                            msg = '收到新消息';
                        }
                        if (msg.indexOf("isChoiceMsg") !== -1) {  //选择性消息
                            data.choiceMsg = JSON.parse(msg);
                        }
                        if (!data.timeStr) {
                            data.timeStr = this.dateFormat(new Date(data.time), "yyyy-MM-dd hh:mm:ss");
                        }
                        _this.scrollDown();
                        _this.onMessageArrive(msg);
                    } else {
                        this._requestChat();
                    }
                    setTimeout(function () {
                        _this.stopAgentKeyIn();
                    }, 100);
                }
                msgListNew.push(data);
                this.setData({
                    msgList: msgListNew
                }, () => {
                    _this.scrollDown();
                });
            })
            // 中断后的回调
            pomelo.on('disconnect', () => {
                let mantisChatNew = {...this.data.mantisChat};
                mantisChatNew.chat.connected = false;
                mantisChatNew.chat.isConnecting = false;
                clearInterval(reminderTmr);
                clearInterval(agentTimedTimer);
                reminderTmr = null;
                agentTimedTimer = null;
                this.handleMantisChat(mantisChatNew);
            })

            pomelo.on('error', function (data) {
                console.log('error');

            })

            // 连接错误
            pomelo.on('ON_ERROR', data => {
                console.log('ON_ERROR');
                let mantisChatNew = {...this.data.mantisChat};
                pomeloErrorCount++;
                mantisChatNew.chat.connected = false;
                mantisChatNew.chat.isConnecting = false;
                pomelo.disconnect();
                clearInterval(reminderTmr);
                clearInterval(agentTimedTimer);
                reminderTmr = null;
                agentTimedTimer = null;
                this.clearRobotAutoMsgTmr();

                if (pomeloErrorCount >= POMELO_ERROR_LIMIT) {
                    this.showResvDiv("on_error");
                }
                this.handleMantisChat(mantisChatNew);
            })

            // 咨询师离线 没进来
            pomelo.on('ON_AGENT_LEAVE', data => {
                console.log('咨询师离线');
                const _this = this;
                setTimeout(function () {
                    let mantisChatNew = _this.data.mantisChat;
                    mantisChatNew.chat.connected = false;
                    _this.handleMantisChat(mantisChatNew);
                    _this._requestChat();
                }, 10000);
            })

            // 未关闭对话的历史消息
            pomelo.on('ON_HIS_MSG', data => {
                let mantisChatNew = {...this.data.mantisChat};
                let msgListNew = [...this.data.msgList];
                allMessages = [];
                let msgs = data.msg;
                if (!msgs || msgs.length === 0) {
                    return;
                }
                this.clearHisMsg();
                allOnHisMsg = msgs;
                if (data.serverTime && mantisChatNew.mantisTtimeDifference) {
                    mantisChatNew.mantisTtimeDifference = data.serverTime - Date.now();
                }
                let mms = msgs.reverse();
                let msgId = '';
                for (let i = 0; i < mms.length; i++) {
                    let f = mms[i];
                    if (f.autoFlag === 'V') {
                        //自动回复
                        visitantAutoResponseCount = visitantAutoResponseCount + 1
                    } else if (f.autoFlag === 'A') {
                        counselorAutoResponseCount = counselorAutoResponseCount + 1;
                    }
                    let say_from = f.say_from;

                    if (f.evaluationFlag === 'EVALUATE_RESULT') {
                        msgListNew.push(f);
                        this.setData({
                            msgList: msgListNew
                        })
                    }
                    if (say_from !== 'V' && say_from !== 'A') {
                        continue;
                    }

                    // 如果是挽留提交的消息就不处理
                    if (f.msgType === 'R_S' || f.msgType === 'F_S') continue;

                    let dataTime = new Date(f.time).getTime();
                    let time = new Date(dataTime);
                    let say_id = f.say_id;
                    if (say_from === 'V' && !say_id) {
                        say_id = mantisChatNew.uid;
                    }
                    if (say_from === 'A') {
                        const phoneReg = phoneRegExp;
                        const wechatReg = wechatRegExp;
                        let phoneFlag = phoneReg.exec(f.msg);
                        if (phoneFlag && !probeData.callPhoneNumberFlag) {
                            f.phone = phoneFlag[0];
                        }
                        let plainMsg = f.msg.replace(/<\/?[^>]*>/g, '').replace(/&nbsp;/ig, '');
                        let wechatFlag = wechatReg.exec(plainMsg);
                        if (wechatFlag && wechatFlag.length >= 6 && !probeData.copyWechatNumberFlag) {
                            f.copyWechatBtnText = '复制' + wechatFlag[1].replace(/[:：]/g, '');
                            f.wechatCode = wechatFlag[5];
                        }
                        if (f.msgType === 'F') {   // 表单消息
                            f.formData = JSON.parse(f.msg);
                        }
                    }
                    msgListNew.push(f);
                    if (f.isWelcome) {
                        mantisChatNew.chat.welcomeMsgCount++;
                    } else {
                        if (say_from === 'V') {
                            mantisChatNew.chat.visitorMsgCount++;
                            mantisChatNew.chat.vistorSent = true;
                            mantisChatNew.chat.ball = {who: 'A', lastTime: new Date().getTime()};
                            if (mantisChatNew.chat.isRobot === 'Y') {
                                this.clearRobotAutoMsgTmr();
                            }
                        }
                        if (say_from === 'A') {
                            mantisChatNew.chat.agentMsgCount++;
                            // 判断msgType  是不是咨询师手工发送的消息 msgType 手动发送消息 M  其他消息 A
                            if (data.msgType && data.msgType !== 'A') {
                                mantisChatNew.chat.agentSent = true;
                            }
                            mantisChatNew.chat.ball = {who: 'V', lastTime: new Date().getTime()};
                            if (mantisChatNew.chat.isRobot === 'Y') {
                                this.setRobotAutoMsgTimer();
                            }
                        }
                    }
                    msgId = f._id || f.msgId;
                }
                this.setData({
                    msgList: msgListNew
                }, () => {
                    this.scrollDown(null, msgId);
                })
                if (mms.length) {
                    let hisLastMsg = mms[mms.length - 1];
                    if (hisLastMsg.say_from === 'V') {
                        if (!!reminderTmr) { //收到访客的消息，清除访客的计时器
                            clearInterval(reminderTmr);
                            reminderTmr = null;
                        }
                        this.setAgentTimedTimer(); //咨询师自动回复开始计时
                    } else if (hisLastMsg.say_from === 'A') {
                        if (!!agentTimedTimer) { // 收到咨询师的消息，清除咨询师的计时器
                            clearInterval(agentTimedTimer);
                            agentTimedTimer = null;
                        }
                        mantisChatNew.chat.vistorSent && this.setupRemindTimer();
                        this.cutOff();
                    }
                }
                this.handleMantisChat(mantisChatNew);
                this.resendMsg();

            })

            // 收到历史消息
            pomelo.on('ON_HIS_CHAT_MSG', data => {
                console.log('收到历史消息', data);
                const {probeData} = this.data;
                let hisMsgListNew = [];
                if (probeData.notShowHistoryMessage) {
                    return;
                }
                let msgs = data.msg;
                if (!msgs || msgs.length === 0) {
                    return;
                }
                let mms = msgs;
                let msgId = '';
                for (let i = 0; i < mms.length; i++) {
                    let f = mms[i];
                    if (f.evaluationFlag === 'EVALUATE_RESULT') {
                        hisMsgListNew.push(f);
                        this.setData({
                            hisMsgList: hisMsgListNew
                        })
                    }
                    let say_from = f.say_from;
                    if (say_from !== 'V' && say_from !== 'A') {
                        continue;
                    }

                    // 如果是挽留提交的消息就不处理
                    if (f.msgType === 'R_S' || f.msgType === 'F_S') continue;
                    if (say_from === 'A') {
                        const phoneReg = phoneRegExp;
                        const wechatReg = wechatRegExp;
                        let phoneFlag = phoneReg.exec(f.msg);
                        if (phoneFlag && !probeData.callPhoneNumberFlag) {
                            f.phone = phoneFlag[0];
                        }
                        let plainMsg = f.msg.replace(/<\/?[^>]*>/g, '').replace(/&nbsp;/ig, '');
                        let wechatFlag = wechatReg.exec(plainMsg);
                        if (wechatFlag && wechatFlag.length >= 6 && !probeData.copyWechatNumberFlag) {
                            f.copyWechatBtnText = '复制' + wechatFlag[1].replace(/[:：]/g, '');
                            f.wechatCode = wechatFlag[5];
                        }
                        if (f.msgType === 'F') {   // 表单消息
                            f.formData = JSON.parse(f.msg);
                        }
                    }
                    hisMsgListNew.push(f);
                }
                this.setData({
                    hisMsgList: hisMsgListNew
                }, () => {
                    this.scrollDown(null, msgId);
                });
                this.resendMsg();
            })

            // 咨询师未匹配
            pomelo.on('ON_NO_AGENT_MATCH', data => {
                console.log('咨询师未匹配');
                let mantisChatNew = {...this.data.mantisChat};
                mantisChatNew.chat.connected = false;
                mantisChatNew.chat.isConnecting = false;
                this.handleMantisChat(mantisChatNew);
                console.warn("NO_AGENT_AVAILABLE");
                this.showResvDiv("no_agent");
                //清除用户输入提醒任务
                clearInterval(reminderTmr);
                clearInterval(agentTimedTimer);
                reminderTmr = null;
                agentTimedTimer = null;
                pomelo.disconnect();
            })

            // 被 T
            pomelo.on('onKick', data => {
                console.log('被 T');
                let mantisChatNew = {...this.data.mantisChat};
                mantisChatNew.chat.connected = false;
                mantisChatNew.chat.isConnecting = false;
                pomelo.disconnect();
                console.info("onKick" + JSON.stringify(data));
                this.handleMantisChat(mantisChatNew);
            })

            // 对话发起成功
            pomelo.on('ON_CHANNEL_OK', data => {

                const _this = this;
                const {parentParams} = this.data;
                let mantisChatNew = {...this.data.mantisChat};
                mantisChatNew.chat.connected = true;
                mantisChatNew.chat.isConnecting = false;
                mantisChatNew.chat.agent = data.msg.agent;
                mantisChatNew.chat.chatId = data.msg.chatId;
                mantisChatNew.chat.channelId = data.msg.channelId;
                mantisChatNew.chat.sgId = data.msg.sgId;
                mantisChatNew.chat.isRobot = data.msg.isRobot;
                let endTime = new Date().getTime();
                console.info("time:" + (endTime - beginTime) + "," + mantisChat.chat.chatId);
                // show chat window
                this.showChat(mantisChatNew.paras.mode, true);
                // 启用输入框
                this.enableInput();
                //clear reminder count
                reminderCount = 0;
                // 通知对话发起
                let obj = {type: "chat", hasChat: true, isTimedOut: false, chatId: mantisChatNew.chat.chatId};
                // mantisChatNew.messager.send(JSON.stringify(obj));

                // 如果咨询师配置头像，则最高优先级使用
                try {
                    let agentImg = data.msg.agent.img;
                    let agentPhone = data.msg.agent.agentPhone;
                    let agentName = data.msg.agent.display_name || '客服';
                    if (agentImg) {
                        mantisChatNew.chat.agent_msg_icon = agentImg;
                    }
                    if (agentName) {
                        mantisChatNew.chat.agentName = agentName;
                    }
                    if (agentPhone) {
                        mantisChatNew.chat.agentPhone = agentName;
                    }
                } catch (e) {

                }

                // 如果msgCon存在  直接发送
                if (parentParams && parentParams.msgCon) {
                    this.sendMessage(parentParams.msgCon);
                }

                // 提示咨询师消息
                setTimeout(function () {
                    _this.stopAgentKeyIn();
                }, 20);

                if (!!mantisChatNew.paras.mbtr) {
                    this.sendAiMsg(mantisChatNew.paras.mbtr);
                }
                this.cutOff();
                this.resendContact();
                this.handleMantisChat(mantisChatNew);
            })

            // 收到对话转接请求
            pomelo.on('ON_TRANSFER', data => {
                console.log('收到对话转接请求');
                const {companyId} = this.data;
                let mantisChatNew = {...this.data.mantisChat};
                console.info("chat transfer event:" + JSON.stringify(data));
                let newServiceGroupId = data.newServiceGroupId;
                let targetAgentId = data.agentId;
                if (!newServiceGroupId && !targetAgentId) {
                    console.error("new ServiceGroupId or newAgentId is undefined");
                    return;
                }
                this.clearHisMsg();
                //指定的客户分组
                if (!!newServiceGroupId) {
                    wx.setStorage({
                        key: "mantis_sgid" + companyId,
                        data: newServiceGroupId
                    });
                    mantisChat.paras.serviceGroupId = newServiceGroupId;
                }

                // 指定的客服
                if (!!targetAgentId) {
                    mantisChatNew.paras.assignedAgent = targetAgentId;
                }
                mantisChatNew.paras.mode = "TRANSFER";
                mantisChatNew.chat.isConnecting = false;
                mantisChatNew.chat.connected = false;
                mantisChatNew.chat.vistorSent = false;
                mantisChatNew.chat.agentSent = false;
                pomelo.disconnect();
                this._requestChat();

                this.handleMantisChat(mantisChatNew);
            });

            // 撤回消息
            pomelo.on('ON_MESSAGE_ROLLBACK', data => {
                let hisMsgListNew = this.data.hisMsgList;
                let msgListNew = this.data.msgList;
                hisMsgListNew = hisMsgListNew.filter(item => (item._id || item.msgId) !== data.messageId);
                msgListNew = msgListNew.filter(item => (item._id || item.msgId) !== data.messageId);
                this.setData({
                    hisMsgList: hisMsgListNew,
                    msgList: msgListNew
                })
            })
        },
        getRequest: function () {
            const {probeData, companyId, pageParam} = this.data;
            let mantisChatNew = {...this.data.mantisChat};
            mantisChatNew.lp = mantisChatNew.chatPageUrl;
            let req = mantisChatNew.request;
            req.page_title = mantisChatNew.page_title;
            req.req_mode = mantisChatNew.mode;
            req.req_ele = mantisChatNew.ele || "";

            // set landing page url
            req.lp = mantisChatNew.chatPageUrl;

            req.url = encodeURI(mantisChatNew.chatPageUrl);

            // landing page id， 将来用来补全referer字符串
            req.vistor_id = mantisChatNew.uid;
            req.srv_gp_id = probeData.defaultSvgId;
            req.vistor_media = "mobile";
            req.company = companyId;
            req.buId = mantisChatNew.buId;
            req.trackId = mantisChatNew.trackId;
            req.assignedAgent = mantisChatNew.assignedAgent;
            req.browser = this.getDeviceInfo();
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
            req.probeId = mantisChatNew.uiPath;
            req.aifanfan = mantisChatNew.aifanfan;
            return req;
        },
        handleUid: function (passedInUid) {
            const {companyId, uid} = this.data;
            let companyStr = "@" + companyId;
            if (uid) {
                wx.setStorage({
                    key: "mantis" + companyId,
                    data: uid
                });
                return uid;
            }
            // 传入的uid
            if (!!passedInUid && passedInUid !== "undefined") {
                wx.setStorage({
                    key: "mantis" + companyId,
                    data: passedInUid
                });
                return passedInUid;
            }

            // //优先从cookie中获取
            let id = wx.getStorageSync('mantis' + companyId);
            if (!!id && id !== "undefined" && id.replace(/(^s*)|(s*$)/g, "").length > 0) {
                // 如果是当前公司的访客
                if (id.indexOf(companyStr) > 0) {
                    return id;
                }
            }

            // 需要生成uid
            let generateUid = this.mantisCreateGuid() + "@" + companyId;
            wx.setStorage({
                key: "mantis" + companyId,
                data: generateUid
            })
            return generateUid;
        },
        requestChatInner: function (host, port) {
            const _this = this;
            const {probeData, mantisChat, companyId} = this.data;
            allMessages = [];
            // mantisChat.chat.isConnecting = true;

            let probe = probeData;
            let promotionMsg = null;
            promotionMsg = encodeURIComponent(probe.mbPromTxt || "");

            pomelo.init({
                host,
                port
            }, function () {
                let searchWordMessage = null;
                let params = {
                    uid: mantisChat.uid,
                    siteId: mantisChat.siteId,
                    companyId: probe.companyId,
                    buId: probe.buId,
                    // 如果采用指定客服分组的方式发起
                    sgId: probe.defaultSvgId,
                    defaultSgId: probe.defaultSvgId,
                    probeId: probe.id, // 探头ID
                    areaRuleFlag: probe.areaRuleFlag, //探头配置地域规则标识
                    assignedAgent: probe.assignedAgent,
                    projectId: probe.projectId,
                    ocpcUrl: '',
                    reqInfo: _this.getRequest(),
                    lpRequestDuration: enterDuration,
                    welcome: '',
                    xst: '',
                    pageparam: '',
                    thirdAccount: '',
                    thirdUid: '',
                    promotionMsg: '',
                    searchWordMessage
                };
                console.log(Date.now() - startTime);
                pomelo.request("connectorMini.entryHandler.customerEnter", params, function (data) {

                    if (!data || data.error || !data.chatId) {
                        console.error("Fail to request" + JSON.stringify(data));
                        return;
                    }
                    let mantisChatNew = {..._this.data.mantisChat};
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
                        _this.welcomeMsg(data.msg, searchWordMessage);
                    } else if (data.msgType === 'ON_WEL_MSG_ALL') {
                        _this.welcomeMsgAll(data.msg, (data.historyMsgs || []));
                    }
                });
            });
        },
        welcomeMsg(msgList) {
            let mantisChatNew = this.data.mantisChat;
            let msgListNew = [...this.data.msgList];
            this.clearHisMsg();
            welcomeMsgs = [];
            let isSent = false;
            if (!!msgList) {
                let msgListLen = msgList.length;
                for (let i = 0; i < msgListLen; i++) {
                    let m = msgList[i];
                    if (!!m) {
                        let mLen = m.length;
                        for (let j = 0; j < mLen; j++) {
                            let f = m[j];
                            let msg = f.msg;
                            if (!!msg) {
                                if (!isSent) {
                                    let dataTime = Date.now();
                                    if (mantisChatNew.mantisTtimeDifference) {
                                        dataTime = dataTime + mantisChatNew.mantisTtimeDifference;
                                    }
                                    let timeStr = new Date(dataTime);
                                    f.timeStr = this.dateFormat(timeStr, "yyyy-MM-dd hh:mm:ss");
                                    f.say_from = 'A';
                                    msgListNew.push(f);
                                    console.log(f);
                                    console.log(msgListNew);
                                    this.setData({msgList: msgListNew});
                                    isSent = true;
                                } else {
                                    welcomeMsgs.push(f);
                                }
                            }
                        }
                    }
                }
            }

            if (welcomeMsgs.length > 0) {
                welcomeMsgs.sort(function (a, b) {
                    if (!a || !b) {
                        return -1;
                    }

                    let seq1 = a.seq;
                    let seq2 = b.seq;

                    if (!!seq1 && !!seq2) {
                        return seq1 - seq2;
                    }

                    return a._id - b._id;
                });
                this.startWelcomeMsgTmr();
            }
            this.resendMsg();
        },
        welcomeMsgAll(msgs, historyMsgs) {
            let mms = historyMsgs.reverse();
            let welcomeMsgCount = 0;
            let visitorMsgCount = 0;
            let agentMsgCount = 0;
            for (let i = 0; i < mms.length; i++) {
                let f = mms[i];
                let say_from = f.say_from;
                if (say_from !== 'V' && say_from !== 'A') {
                    continue;
                }
                if (f.isWelcome) {
                    welcomeMsgCount++;
                } else {
                    if (say_from === 'V') {
                        visitorMsgCount++;
                    }

                    if (say_from === 'A') {
                        agentMsgCount++;
                    }
                }
            }
            welcomeMsgs = [];
            if (visitorMsgCount > 0) {
                return;
            }

            if (agentMsgCount > 0) {
                return;
            }

            if (!!msgs) {
                for (let i = 0; i < msgs.length; i++) {
                    let m = msgs[i];
                    if (!!m) {
                        for (let j = 0; j < m.length; j++) {
                            let f = m[j];
                            if (!!f.msg) {
                                if (!!f.msg) {
                                    welcomeMsgs.push(f);
                                }
                            }
                        }
                    }
                }
            }

            // 只处理第二条以后的欢迎语
            if (welcomeMsgs.length > 1) {
                welcomeMsgs.sort(function (a, b) {
                    if (!a || !b) {
                        return -1;
                    }

                    let seq1 = a.seq;
                    let seq2 = b.seq;

                    if (!!seq1 && !!seq2) {
                        return seq1 - seq2;
                    }

                    return a._id - b._id;
                });
                // 截取已经发送的
                welcomeMsgs = welcomeMsgs.slice(welcomeMsgCount);
                this.startWelcomeMsgTmr();
            }
        },
        startWelcomeMsgTmr() {
            const _this = this;
            const mantisChat = this.data.mantisChat;
            if (!welcomeMsgs || welcomeMsgs.length === 0) {
                return;
            }
            let time = 0;
            for (let i = 0; i < welcomeMsgs.length; i++) {
                let e = welcomeMsgs[i];
                let msg = e.msg;
                let gap = e.gap || 3;
                time = time + gap * 1000;
                (function (msg, time1, e) {
                    setTimeout(function () {
                        if (mantisChat.chat.vistorSent || mantisChat.chat.agentSent) {
                            return;
                        }
                        // 重复检测消息是否要发送欢迎语
                        if (mantisChat.chat.visitorMsgCount > 0) {
                            return;
                        }

                        if (mantisChat.chat.agentMsgCount > 0) {
                            return;
                        }

                        if (
                            e.wechatAssignId &&
                            (
                                msg.indexOf('#WECHAT_WORD#') !== -1 ||
                                msg.indexOf('#WECHAT_QRCODE#') !== -1 ||
                                msg.indexOf('#WECHAT_NICKNAME#') !== -1
                            )
                        ) {
                            _this.getWechatRule(e);
                        } else {
                            _this.sendSystemMsg(msg, {isWelcome: true});
                        }
                    }, time1);
                })(msg, time, e);
            }
        },
        getWechatRule(msgData) {
            let route = "chat.chatHandler.findWelcomeWeChatAssignEngine";
            pomelo.request(route, {
                companyId: mantisChat.paras.companyId,
                chatId: mantisChat.chat.chatId,
                wechatAssignId: msgData.wechatAssignId,
                uid: mantisChat.uid
            }, function (data) {
                mantisChat.chat.wechatRule = data.wechatInfo;
                this.replaceWechatCode(msgData)
            })
        },
        replaceWechatCode(msgData) {
            let wechatRule = mantisChat.chat.wechatRule;
            let msg = msgData.msg;
            if (msg.indexOf('#WECHAT_WORD#') !== -1) {
                msg = msg.replace(/#WECHAT_WORD#/g, wechatRule.weChat || '');
            }
            if (msg.indexOf('#WECHAT_QRCODE#') !== -1) {
                msg = msg.replace(/#WECHAT_QRCODE#/g, wechatRule.qrcode ? '<img class="mantisWechatQrCode" src="' + wechatRule.qrcode + '" alt=""/>' : '');
            }
            if (msg.indexOf('#WECHAT_NICKNAME#') !== -1) {
                msg = msg.replace(/#WECHAT_NICKNAME#/g, wechatRule.nickName || '');
            }
            this.sendSystemMsg(msg, {isWelcome: true, wechatRule: wechatRule});
        },
        mantisCreateGuid: function () {
            return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        sendAiMsg(content) {
            // 发送通知消息
            const mantisChat = this.data.mantisChat;
            let route = "chat.chatHandler.sendAIMsg";
            if (mantisChat.chat.connected) {
                pomelo.request(route, {
                    //消息接口
                    content,
                    chatId: mantisChat.chat.chatId,
                    target: ""
                }, function (data) {
                });
            }
        },
        // 会话链接后预读联系方式重发
        resendContact() {
            if (contactWay.length) {
                contactWay.forEach(function (item) {
                    pomelo.notify("chat.chatHandler.customerInputing", item);
                })
                contactWay = [];
            }
        },
        // 消息回执
        responseMessage: function (data, type) {
            const {mantisChat} = this.data;
            let route = "chat.chatHandler.customerResponse";
            if (!!mantisChat.chatId) {
                pomelo.request(route, {
                    type: type,
                    chatId: mantisChat.chatId,
                    visitorId: mantisChat.uid,
                    msgId: data.msgId
                }, function (data) {
                    console.log('消息回执返回', data);
                });
            }
        },
        scrollDown(time, id) {
            if (id) {
                this.setData({
                    scrollBottomId: 'id_' + id
                })
            } else {
                setTimeout(() => {
                    this.setData({
                        scrollTop: 999999
                    })
                }, time || 300);
            }
        },
        // 清理历史聊天信息
        clearHisMsg() {
            this.setData({
                hisMsgList: [],
                msgList: []
            })
        },
        //  记录进入留言表单
        sendEntry(reason) {
            const {mantis, mantisChat, probeData, companyId} = this.data;
            let entryInfo = {};
            entryInfo.uid = mantisChat.uid;
            entryInfo.buId = probeData.buId;
            entryInfo.ele = mantis.ele;
            entryInfo.companyId = companyId;
            entryInfo.pageUrl = mantisChat.chatPageUrl;
            entryInfo.projectId = probeData.projectId;
            entryInfo.reason = reason;
            let url = "https://" + probeData.chatServer + "/" + companyId + "/api-war/message/addEntryInfo.do";
            wx.request({
                url,
                data: entryInfo,
                method: 'POST',
                success: res => {

                },
                fail: () => {
                    console.error("fail to save the leave page info");
                }
            });
        },
        // 咨询师指定时长未回复时,给学员随机发送设置好的回复语句
        setAgentTimedTimer() {
            const _this = this;
            const {probeData} = this.data;
            lastCounselorMsgTime = new Date().getTime();
            // 自动回复次数
            if (!!agentTimedTimer) {
                clearInterval(agentTimedTimer);
                agentTimedTimer = null;
            }

            agentTimedTimer = setInterval(function () {
                let mantisChat = _this.data.mantisChat;
                if (!mantisChat.chat.chatId) {
                    return;
                }

                if (mantisChat.chat.isComplete === "Y") {
                    return;
                }

                let current = new Date().getTime();
                let gap = current - lastCounselorMsgTime;
                if (!!probeData.autoresponder2 && probeData.autoresponder2.length && (gap >= probeData.counselorExpireTime * 1000) && counselorAutoResponseCount < probeData.counselorAutoResponseCount) {
                    counselorAutoResponseCount++;
                    let randomNum = Math.round(Math.random() * (probeData.autoresponder2.length - 1));
                    _this.sendSystemMsg(probeData.autoresponder2[randomNum], {isWelcome: false, autoFlag: "A"});
                    lastCounselorMsgTime = new Date().getTime();
                }

            }, 5000);
        },
        // 访客指定时长未回复 提醒用户输入, 5分钟提醒一次, 共提醒2次，
        setupRemindTimer() {
            const _this = this;
            const {probeData} = this.data;
            lastVisitorMsgTime = new Date().getTime();
            lastVisitorReminderTime = new Date().getTime();

            // 自动回复次数
            // clear current interval first
            if (!!reminderTmr) {
                clearInterval(reminderTmr);
                reminderTmr = null;
            }
            reminderTmr = setInterval(function () {
                let mantisChat = _this.data.mantisChat;
                if (!mantisChat.chat.chatId) {
                    return;
                }

                if (mantisChat.chat.isComplete === "Y") {
                    return;
                }

                // 提醒访客输入
                let gap1 = new Date().getTime() - lastVisitorReminderTime;
                if (!!probeData.autoresponder1 && probeData.autoresponder1.length && gap1 >= probeData.visitantExpireTime * 1000 && visitantAutoResponseCount < probeData.visitantAutoResponseCount) {
                    visitantAutoResponseCount++;
                    let randomNum = Math.round(Math.random() * (probeData.autoresponder1.length - 1));
                    _this.sendSystemMsg(probeData.autoresponder1[randomNum], {isWelcome: false, autoFlag: "V"});
                    lastVisitorReminderTime = new Date().getTime();
                }

            }, 5000);
        },
        // 清除欢迎语
        clearWelcomeMsgTmr() {
            if (!!welcomeMsgTmr) {
                clearInterval(welcomeMsgTmr);
                welcomeMsgTmr = null;
            }
        },
        // 启动机器人自动追问定时器
        setRobotAutoMsgTimer() {
            const _this = this;
            let mantisChatNew = {...this.data.mantisChat};
            if (!!robotAutoMsgTmr) {
                clearInterval(robotAutoMsgTmr);
                robotAutoMsgTmr = null;
            }

            robotAutoMsgTmr = setInterval(function () {

                if (mantisChatNew.chat.isComplete === "Y") {
                    return;
                }

                if (!mantisChatNew.chat.ball) {
                    return;
                }

                if (!mantisChatNew.chat.ball.who) {
                    return;
                }

                if (!mantisChatNew.chat.vistorSent) {
                    return;
                }

                // 自动回复的次数限制
                if (robotAutoMsgCount > 30) {
                    return;
                }

                if (mantisChatNew.chat.ball.who === 'A') {
                    return;
                }

                let time = mantisChatNew.chat.ball.lastTime;
                if (!time || time === 0) {
                    return;
                }
                let gap = new Date().getTime() - time;
                if (gap > 10000) {
                    let inputGap = new Date().getTime() - (mantisChatNew.chat.lastInputtingTime || 0);
                    // 如果有未发出的内容，且最后输入时间不到60秒
                    if (_this.data.inputValue && inputGap < 60 * 1000) {
                        return;
                    }
                    robotAutoMsgCount = robotAutoMsgCount + 1;
                    _this.sendAutoReq();
                }
            }, 1500);
        },
        //  清除机器人追问定时器
        clearRobotAutoMsgTmr() {
            robotAutoMsgCount = 0;
            if (!!robotAutoMsgTmr) {
                clearInterval(robotAutoMsgTmr);
                robotAutoMsgTmr = null;
            }
        },
        // 机器人追问
        sendAutoReq() {
            let mantisChatNew = {...this.data.mantisChat};
            if (mantisChatNew.chat.ball) {
                mantisChatNew.chat.ball.lastTime = new Date().getTime();
            }

            let route = "chat.chatHandler.sendAutoReq";
            if (mantisChatNew.chat.connected) {
                pomelo.request(route, {
                    //消息接口
                    content: "1111",
                    chatId: mantisChatNew.chat.chatId,
                    target: ""
                }, function (data) {
                });
            }
        },
        // 访客输入超时，主动切断对话
        cutOff() {
            if (cutOffTimer) {
                clearInterval(cutOffTimer);
                cutOffTimer = null;
            }
            const _this = this;
            cutOffTimer = setInterval(function () {
                let mantisChatNew = _this.data.mantisChat;
                let gap = new Date().getTime() - lastVisitorMsgTime;
                if (gap > REMINDER_INTERVAL * MAX_REMINDER * 60 * 1000) {
                    if (!!mantisChatNew.chat.connected) {
                        pomelo.disconnect();
                        mantisChatNew.chat.connected = false;
                        mantisChatNew.chat.chatId = null;
                        reminderCount = 0;
                        _this.stopAgentKeyIn();
                        clearInterval(reminderTmr);
                        clearInterval(agentTimedTimer);
                        reminderTmr = null;
                        agentTimedTimer = null;

                    }
                }
            }, 5000)
        },
        // 咨询师正在输入
        showAgentKeyIn() {
            const _this = this;
            let promptStr = '对方正在输入.';
            this.stopAgentKeyIn();
            agentKeyInInterval = setInterval(function () {
                agentKeyInStep++;
                if (agentKeyInStep >= 3) {
                    agentKeyInStep = 0;
                    promptStr = '对方正在输入';
                }
                promptStr += '.';
                _this.setData({
                    promptText: promptStr
                });
            }, 1000);
            setTimeout(function () {
                _this.setData({
                    promptText: ''
                });
                _this.stopAgentKeyIn();
            }, 20 * 1000);
        },
        stopAgentKeyIn() {
            if (!!agentKeyInInterval) {
                clearInterval(agentKeyInInterval);
                agentKeyInInterval = null;
            }
        },
        // 收到咨询师消息后的处理逻辑
        onMessageArrive(msg) {
            const {mantisChat, isShowChat, probeData} = this.data;
            let notifyMethod = probeData.mbMsgNotifyMethod || "vibrate";
            if (notifyMethod === "vibrate") {
                this.vibrate();
            } else {
                this.playSound();
            }

            // 如果聊窗 已经未打开, 什么也不用做
            if (isShowChat) {
                return;
            }

            let action = mantisChat.chat.mbMsgAction || "tip";
            if (action === "tip") {
                this.notifyNewMsg(msg);
            } else {
                this.showChat('AUTO');
            }
        },
        // 网络恢复后消息重发
        resendMsg() {
            const mantisChat = this.data.mantisChat;
            if (!!mantisChat.chat.chatId) {
                // 消息去重
                let msgListNew = [];
                resendMessages.forEach(function (item) {
                    if (!msgListNew.some(function (itemN) {
                        return itemN === item
                    })) {
                        msgListNew.push(item);
                    }
                });
                resendMessages = [];
                let msgListLength = msgListNew.length;
                for (let i = 0; i < msgListLength; i++) {
                    let msg = msgListNew[i];
                    let displayMessage = msg;
                    if (msg.indexOf("isChoiceRes") !== -1) {
                        //选择性消息
                        let choiceMsg = JSON.parse(msg);
                        displayMessage = choiceMsg.displayMsg;
                    }
                    let dataTime = new Date().getTime();
                    if (mantisChat.mantisTtimeDifference) {
                        dataTime = dataTime + mantisChat.mantisTtimeDifference;
                    }
                    this.msgResend(msg);
                }
                if (resendSubmitMsg.length) {
                    let submitMsgListLen = resendSubmitMsg.length;
                    for (let n = 0; n < submitMsgListLen; n++) {
                        let msgItem = resendSubmitMsg[n];
                        this.msgResend(msgItem.msg, msgItem.msgType);
                    }
                    resendSubmitMsg = [];
                }
            }
        },
        msgResend(msg, msgType) {
            const {companyId, probeData} = this.data;
            pomelo.request("chat.chatHandler.customerSend", {
                //消息接口
                content: msg,
                sgId: mantisChat.chat.sgId,
                chatId: mantisChat.chat.chatId,
                agentId: mantisChat.chat.agent.agentId,
                target: "",
                type: "text",
                projectId: probeData.projectId,
                companyId,
                channelId: mantisChat.chat.channelId,
                msgType: msgType
            }, function (data) {
            });
        },
        // 消息浮层显示
        notifyNewMsg(msg) {
            let mantisChatNew = {...this.data.mantisChat};
            mantisChatNew.unReadMsgNumber += 1;
            this.setData({
                tipMsg: msg,
                mantisChat: mantisChatNew
            })
        },
        // 振动提醒
        vibrate() {
            wx.vibrateShort({type: 'medium'});
        },
        // 声音提醒
        playSound() {
            this.messageAudio.play();
        },
        btnSendMsg: function () {
            const {inputValue} = this.data;
            if (inputValue) {
                this.sendMessage(inputValue);
            }
        },
        // 发送系统消息
        sendSystemMsg(msg, opt) {
            const {companyId} = this.data;
            let mantisChat = this.data.mantisChat;
            if (!opt) {
                opt = {};
            }
            let msgParams = {
                //消息接口
                content: msg,
                isWelcome: opt.isWelcome || false,
                chatId: mantisChat.chat.chatId,
                uid: mantisChat.chat.agent.agentId,
                channelId: mantisChat.chat.channelId,
                autoFlag: opt.autoFlag || 'N',
                visitorId: mantisChat.uid,
                companyId,
                msgType: "A", // 系统发送
                target: "",
                type: "text"
            }
            if (opt.wechatRule) {
                opt.wechatRule.weChat && (msgParams.welcomeWechatCode = opt.wechatRule.weChat);
                opt.wechatRule.nickName && (msgParams.welcomeWechatName = opt.wechatRule.nickName);
                opt.wechatRule.qrcode && (msgParams.welcomeQrCode = opt.wechatRule.qrcode);
            }
            let route = "chat.chatHandler.agentSend";
            if (mantisChat.chat.connected) {
                pomelo.request(route, msgParams, function (data) {
                    // console.info("returned:", data);
                });
            }
        },
        sendMessage: function (msgContent, msgType) {
            const _this = this;
            const {probeData, mantisChat, companyId} = this.data;
            const route = "chat.chatHandler.customerSend";
            let msgId = '';
            if (msgContent.indexOf("isChoiceRes") !== -1) {
                //选择性消息
                let choiceMsg = JSON.parse(msgContent);
                msgId = choiceMsg.msgId;
            }
            pomelo.request(route, {
                //消息接口
                msgId,
                content: msgContent,
                sgId: probeData.defaultSvgId,
                chatId: mantisChat.chatId,
                agentId: 'tantou@7011',
                target: "",
                type: "text",
                projectId: probeData.projectId,
                companyId,
                channelId: mantisChat.channelId,
                from: mantisChat.uid,
                msgType: msgType || 'M'
            }, data => {
                this.setData({
                    inputValue: ''
                });
                setTimeout(function () {
                    _this.showAgentKeyIn();
                }, 600);
                if (typeof data.error !== 'undefined' && data.error === 'CHAT HAS BEEN CLOSED') {
                    //处理关闭消息发送消息失败，重新发起，并重发消息
                    let mantisChatNew = {...this.data.mantisChat};
                    mantisChatNew.chat.hasChat = false;
                    this.handleMantisChat(mantisChatNew);
                }
            });
        },
        sendChoiceMsg(e) {
            let {btnId, label, msgid} = e.target.dataset;
            let msgListNew = this.data.msgList.map(item => {
                if ((item._id || item.msgId) === msgid) {
                    item.choiceMsg.content = null;
                }
                return item;
            });
            this.setData({
                msgList: msgListNew
            })
            this.sendMessage(JSON.stringify({
                isChoiceRes: true,
                displayMsg: label,
                btnId,
                msgId: msgid
            }))
        },
        // 修改mantis
        handleMantis: function (mantis) {
            this.setData({
                mantis
            })
        },
        // 修改mantisChat
        handleMantisChat: function (mantisChat) {
            this.setData({
                mantisChat
            })
        },
        bindKeyInput: function (e) {
            const {companyId} = this.data;
            //取消消息提示
            if (!!preSndTimer) {
                clearTimeout(preSndTimer);
            }
            let mantisChatNew = {...this.data.mantisChat};

            // 最后触发键盘输入的时间
            mantisChatNew.chat.lastInputtingTime = new Date().getTime();
            let value = e.detail.value;
            if (!mantisChatNew.chat.connected || !value) {
                return;
            }
            value = value.replace(/"/g, "'").replace(/<[^>]+>/g, '');
            let phoneNumber = this.getMessagePhone(value);
            let information = null;
            if (!phoneNumber) {
                phoneNumber = this.getMessageTenPhone(value);
            }
            if (!!phoneNumber) {
                information = phoneNumber;
            } else {
                information = this.getMessageWeChat(value);
            }

            if (information) {
                let msg = {
                    content: value,
                    from: mantisChatNew.uid,
                    chatId: mantisChatNew.chat.chatId,
                    agentId: mantisChatNew.chat.agent.agentId,
                    companyId,
                    channelId: mantisChatNew.chat.channelId,
                    target: ""
                };
                if (!mantisChatNew.chat.connected) {
                    contactWay.push(msg);
                }
                pomelo.notify("chat.chatHandler.customerInputing", msg);
            } else {
                preSndTimer = setTimeout(function () {
                    if (!!value) {
                        let msg = {
                            content: value,
                            from: mantisChatNew.uid,
                            chatId: mantisChatNew.chat.chatId,
                            agentId: mantisChatNew.chat.agent.agentId,
                            companyId,
                            channelId: mantisChatNew.chat.channelId,
                            target: ""
                        };
                        pomelo.notify("chat.chatHandler.customerInputing", msg);
                    }
                }, 200);
            }

            this.handleMantisChat(mantisChatNew);
            this.setData({
                inputValue: value
            });
        },
        callPhone: function (e) {
            let phone = e.target.dataset.phone;
            wx.makePhoneCall({
                phoneNumber: phone
            })
        },
        chooseImage: function () {
            let tempFilePaths = [];
            wx.chooseImage({
                count: 1,
                sizeType: ['original', 'compressed'],
                sourceType: ['album', 'camera'],
                success: res => {
                    if (res.tempFilePaths.length > 0) {
                        tempFilePaths = tempFilePaths.concat(res.tempFilePaths);
                        tempFilePaths.map(item => {
                            this.uploadImg(item);
                        });
                    }
                }
            });
        },
        uploadImg: function (tempFilePath) {
            const {companyId, probeData, mantisChat} = this.data;
            let url = "https://" + probeData.chatServer + "/" + companyId + "/api-war/upload/uploadImg.do?vistorId=" + mantisChat.uid + "&companyId=" + companyId;
            wx.uploadFile({
                url,
                header: {
                    'content-type': 'multipart/form-data'
                },
                filePath: tempFilePath,
                name: 'file',
                success: res => {

                    let data = JSON.parse(res.data);
                    if (data.data) {
                        console.log(data.data);
                        this.sendMessage(`<img src="${data.data}" />`);
                    }
                },
                fail: res => {
                    wx.showToast({
                        title: '图片加载失败',
                        icon: 'none'
                    });
                }
            })
        },
        clickFloating() {
            let mantisChatNew = {...this.data.mantisChat};
            mantisChatNew.paras.req_mode = "VISTOR";
            this.handleMantisChat(mantisChatNew);
            this._requestChat();
            let ut = {};
            // save the click event
            ut.ele_name = "右下角客服栏";
            ut.e_id = mantisChatNew.paras.trackId;
            ut.type = "C";
            this.sendClick(ut);
            return false;
        },
        //发送点击信息
        sendClick(cInfo) {
            let {mantisChat} = this.data;
            if (!mantisChat.paras.trackId) {
                return;
            }
            wx.request({
                url: mantisChat.paras.trackUrl,
                data: cInfo,
                method: 'POST',
                success: res => {

                },
                fail: () => {
                    console.error("Post click information error-sendClick");
                }
            });
        },
        enableInput() {
            this.setData({
                disabledInput: false
            })
        },
        disableInput() {
            this.setData({
                disabledInput: true
            })
        },
        handleEvaluation(e) {
            // 发送评价结果
            if (!btnLoading) {
                let code = e.target.dataset.code;
                let {mantisChat, companyId} = this.data;
                btnLoading = true;
                let route = "chat.chatHandler.evaluationResult";
                this.setData({
                    isEvaluationModal: false
                })
                if (mantisChat.chat.connected) {
                    pomelo.request(route, {
                        //消息接口
                        code,
                        chatId: mantisChat.chat.chatId,
                        companyId,
                        channelId: mantisChat.chat.channelId
                    }, function (data) {
                        btnLoading = false;
                    });

                }
            }
        },
        //咨询师不在线留言数据提交
        formSubmit(e) {
            console.log('form发生了submit事件，携带数据为：', e.detail.value);
            const {probeData, mantisChat, companyId, probeId} = this.data;
            const url = "https://" + probeData.chatServer + "/" + companyId + "/api-war/message/insertMessageInfo2.do";
            let values = e.detail.value;
            let resvInfo = {};
            resvInfo.probeId = probeId;
            resvInfo.uid = mantisChat.uid;
            resvInfo.siteId = mantisChat.siteId;
            resvInfo.buId = probeData.buId;
            resvInfo.companyId = companyId;
            resvInfo.ele = mantisChat.ele;
            resvInfo.pageUrl = mantisChat.paras.pageUrl || 'pages/index/index';
            resvInfo.referer = mantisChat.paras.referer;
            resvInfo.lpUrl = mantisChat.paras.lpUrl || 'pages/index/index';
            resvInfo.projectId = probeData.projectId;
            resvInfo.reqVistorMedia = "mobile";
            resvInfo.thirdUserId = mantisChat.paras.thirdUserId;
            resvInfo.thirdAccount = mantisChat.paras.thirdAccount;

            let t = mantisChat.cookieRefer;
            try {
                if (!!t) {
                    let count = 0;
                    while (count < 4) {
                        let tmp = t + "";
                        t = decodeURI(t);
                        if (tmp == t) {
                            break;
                        }
                        count = count + 1;
                    }
                }
            } catch (error) {
            }

            resvInfo.messageType = "SOURCE_CHAT_MSG";
            resvInfo.phone1 = values.phone;
            resvInfo.name = values.name;
            resvInfo.content = values.content;

            wx.request({
                url,
                data: resvInfo,
                method: 'POST',
                success: res => {
                    if (res.data) {
                        if (res.data.flag === 1) {
                            this.setData({
                                completeText: '预约成功, 咨询顾问会很快联系您,请稍候...'
                            })
                        } else {
                            wx.showToast({
                                title: res.data.message,
                                icon: 'error'
                            })
                        }
                    }
                },
                fail: () => {
                    wx.showToast({
                        title: "预约失败",
                        icon: 'error'
                    })
                }
            });
        },
        // 访客表单消息数据提交
        formMsgSubmit(e) {
            console.log('form发生了submit事件，携带数据为：', e.detail.value);
            let msgListNew = [...this.data.msgList];
            let msgId = e.target.dataset.msgid;
            let formObj = e.detail.value;
            let msgCon = '';
            let keyArray = Object.keys(formObj);
            let errFlag = null;
            keyArray.forEach(item => {
                let val = formObj[item];
                switch (item) {
                    case '手机号':
                        if (!/^1[3-9]\d{9}$/.test(val)) {
                            errFlag = true;
                            wx.showToast({
                                title: '手机号不正确',
                                icon: 'error'
                            })
                        }
                        break;
                    case '微信号':
                        if (!/(^[a-zA-Z][-_a-zA-Z0-9]{5,19}$)|(^1[3-9]\d{9}$)/.test(val)) {
                            errFlag = true;
                            wx.showToast({
                                title: '微信号不正确',
                                icon: 'error'
                            })
                        }
                        break;
                    default:
                        if (!val) {
                            errFlag = true;
                            wx.showToast({
                                title: item + '不能为空',
                                icon: 'error'
                            })
                        }
                }
                msgCon += item + ':' + val + '<br>'
            })
            if (errFlag) return;
            this.updateFormMsg(msgId);
            this.sendMessage(msgCon, 'F_S');
            msgListNew = msgListNew.filter(item => (item._id || item.msgId) !== msgId);
            this.setData({
                msgList: msgListNew
            })
            wx.showToast({
                title: '提交成功'
            })
        },
        updateFormMsg(msgId) {
            const {mantisChat, companyId} = this.data;
            let route = "chat.chatHandler.submitForm";
            if (mantisChat.chat.connected) {
                pomelo.request(route, {
                    //消息接口
                    msgId,
                    chatId: mantisChat.chat.chatId,
                    companyId,
                    channelId: mantisChat.chat.channelId
                }, function (data) {

                })

            }
        },
        // 挽留规则
        retainRules(data) {
            const _this = this;
            let mantisNew = {...this.data.mantis};
            if (data.displayInterval) {
                // 存储默认显示间隔时长
                mantisNew.displayInterval = data.displayInterval;
            }
            mantisNew.displayIntervalFlag = true;
            mantisNew.displayCount = data.displayCount || 10000; //存储显示次数
            mantisNew.displayCountActual = 0; //初始化实际显示次数

            let triggerRemainTime = data.triggerRemainTime; //持续停留时长
            mantisNew.triggerPageScroll = data.triggerPageScroll; //页面滚动位置
            mantisNew.notDisplayExist = data.notDisplayExist === 'N'; // 提交过手机号 显示

            //是否开启
            mantisNew.deviceMobile = data.deviceMobile === 'Y';
            this.setData({
                mantis: mantisNew
            })
            if (mantisNew.deviceMobile) {
                if (triggerRemainTime) {
                    retainRemainTimer = setInterval(function () {
                        if (!mantisNew.notDisplayExist && wx.getStorageSync('mantisSendTelFlag')) {
                            retainRemainTimer && clearInterval(retainRemainTimer);
                            return;
                        }
                        if (
                            mantisNew.displayIntervalFlag &&
                            mantisNew.displayCountActual < mantisNew.displayCount &&
                            !_this.data.isShowChat &&
                            !_this.data.isShowLeave &&
                            !mantisNew.isShowRetain
                        ) {
                            _this.mantisShowRetain();
                        }
                    }, triggerRemainTime * 1000)
                }
                if (mantisNew.triggerPageScroll) {
                    // 滚动触发
                    // let scrollHeight = $(document).height() - $(window).height();
                    // let targetVal = (mantisNew.triggerPageScroll / 100 * scrollHeight).toFixed(0);
                    // if(scrollHeight > 200){
                    //     $(document).scroll(function () {
                    //         if((mantisNew.notDisplayExist && wx.getStorageSync('mantisSendTelFlag') === 'Y') || _this.data.isShowChat) return;
                    //         let pageScroll = $(document).scrollTop();
                    //         if (
                    //             mantisNew.displayIntervalFlag &&
                    //             mantisNew.displayCountActual < mantisNew.displayCount &&
                    //             !mantisNew.isShowRetain &&
                    //             pageScroll > targetVal
                    //         ) {
                    //             _this.mantisShowRetain();
                    //         }
                    //     })
                    // }
                }
            }
        },
        mantisShowRetain() {
            let mantisNew = {...this.data.mantis};
            mantisNew.displayCountActual += 1;
            this.setData({
                isShowRetain: true,
                mantis: mantisNew
            })
        },
        mantisHiedRetain() {
            const _this = this;
            const {probeData} = this.data;
            let mantisNew = {...this.data.mantis};
            if (mantisNew.displayInterval) {
                mantisNew.displayIntervalFlag = false;
                setTimeout(function () {
                    mantisNew.displayIntervalFlag = true;
                    _this.setData({
                        mantis: mantisNew
                    });
                }, mantisNew.displayInterval * 1000)
            }
            if (mantisNew.notDisplayExist && wx.getStorageSync('mantisSendTelFlag')) {  //如果提交过要显示挽留并且已经提交过手机号
                this.setData({
                    isShowSubmitComplete: false
                })
            }
            this.setData({
                isShowRetain: false,
                mantis: mantisNew
            });
        },
        // 自动发起
        autoChat(autoChatDelay) {
            const _this = this;
            let mantisChatNew = {...this.data.mantisChat};
            switch (autoChatDelay) {
                case 0:
                    mantisChatNew.paras.req_mode = "AUTO";
                    enterDuration = 0;
                    _this.handleMantisChat(mantisChatNew);
                    _this._requestChat();
                    break;
                default:
                    setTimeout(function () {
                        mantisChatNew.paras.req_mode = "AUTO";
                        enterDuration = autoChatDelay;
                        _this.handleMantisChat(mantisChatNew);
                        _this._requestChat();
                    }, autoChatDelay * 1000);
                    break;
            }
        },
        // 监听挽留手机号
        changeRetainPhone(e) {
            let value = e.detail.value;
            this.setData({
                retainPhone: value
            })
        },
        //  获取验证码
        sendCode() {
            const {retainPhone, probeData, companyId} = this.data;
            let url = 'https://' + probeData.chatServer + "/" + companyId + "/api-war/smsApi/sendVerificationCode.do";
            if (!/^1[3-9]\d{9}$/.test(retainPhone)) {
                wx.showToast({
                    title: '请输入正确的手机号',
                    icon: 'error'
                })
                return;
            }
            this.codeTiming();
            let params = {
                companyId,
                phone: retainPhone
            }
            wx.request({
                url,
                data: params,
                method: 'POST',
                success: res => {
                    if (res.data && res.data.flag === 1) {
                        wx.showToast({
                            title: '发送成功',
                        })
                    }
                },
                fail: () => {
                    // 提交失败
                    wx.showToast({
                        title: '发送失败',
                        icon: 'error'
                    })
                }
            });
        },
        codeTiming() {
            const _this = this;
            let count = 60;
            mantisCodeTimer = setInterval(function () {
                if (count < 1) {
                    mantisCodeTimer && clearInterval(mantisCodeTimer);
                    mantisCodeTimer = null;
                    _this.setData({
                        codeSending: ''
                    })
                    return;
                }
                count--;
                _this.setData({
                    codeSending: '重新获取(' + count + ')'
                });
            }, 1000);
        },
        // 退出挽留数据提交
        retainSubmit(e) {
            const {mantisChat, probeData, companyId} = this.data;
            let values = e.detail.value;
            console.log(values);
            let url = 'https://' + probeData.chatServer + "/" + companyId + "/api-war/chatapi/staySubmit.do";
            let phone = values.phone;
            let phoneCode = values.phoneCode;
            let stayId = e.target.dataset.stayid;
            if (!/^1[3-9]\d{9}$/.test(phone)) {
                wx.showToast({
                    title: '请输入正确的手机号',
                    icon: 'error'
                })
                return;
            }

            let params = {
                companyId,
                phone,
                stayId
            };
            if (phoneCode) {
                params.phoneCode = phoneCode;
            }

            wx.request({
                url,
                data: params,
                method: 'POST',
                success: res => {
                    if (res.data && res.data.flag === 1) {
                        wx.setStorage({
                            key: 'mantisSendTelFlag',
                            data: phone
                        });
                        this.setData({
                            isShowSubmitComplete: true
                        });
                        if (mantisChat.chat.connected) {
                            this.sendMessage(phone, 'R_S');
                        } else {
                            //  如果没有发起会话则数据进入留言查询
                            this._sendPage({
                                phone
                            }, () => {
                            });
                        }
                    }
                },
                fail: () => {
                    // 提交失败
                    wx.showToast({
                        title: '提交失败',
                        icon: 'error'
                    })
                }
            });
        },
        bindPickerChange: function (e) {
            console.log('picker发送选择改变，携带值为', e.detail.value)
            this.setData({
                index: e.detail.value
            })
        },
        // 表单留言
        _sendPage(values, callbackSuccess, callbackFail) {
            if (!values.phone) return;
            const {probeId, companyId, probeData, mantisChat} = this.data;
            let paras = {};
            const url = 'https://' + probeData.chatServer + "/" + companyId + "/api-war/message/insertMessageInfo2.do";
            let otherParams = values.others || {};
            delete values.isRetain;
            let site = mantisChat.siteId;
            if (!site) {
                site = 0;
            }

            if (otherParams.area) {
                otherParams.area = otherParams.area.replace(/\s+/g, '');
            }
            paras.uid = wx.getStorageSync('mantis' + companyId);
            paras.siteId = site;
            //页面地址
            paras.pageUrl = mantisChat.chatPageUrl;

            if (!!otherParams.csProjectId) {
                paras.projectId = otherParams.csProjectId;
            } else {
                paras.projectId = probeData.projectId;
            }

            // 广告信息
            paras.adInfo = mantisChat.parsedRefer || {};
            paras.reqVistorMedia = "mobile";

            let en = {
                'uid': paras.uid,
                'ele': '',
                'siteId': paras.siteId,
                'buId': probeData.buId,
                'probeId': probeId,
                'companyId': companyId,
                'pageUrl': paras.pageUrl,
                'projectId': paras.projectId,
                "referer": mantisChat.referer,
                "lpUrl": paras.pageUrl,
                "reqVistorMedia": "mobile",
                "reqSearchWd": '',
                "reqAd": '',
                "pageparam": values.pageparam,
                'messageType': 'SOURCE_PAGE_MSG',
                'phone1': values.phone,
                'name': values.name,
                'email': '',
                'content': values.content,
                'thirdAccount': values.thirdAccount,
                'thirdUserId': values.thirdUserId,

                /**
                 * 扩展信息区域，需要双方协定others的字段
                 */
                'registerType': values.registerType,
                'area': otherParams.area,
                'examType': otherParams.examType,
                'major': otherParams.major,
                'school': otherParams.school,
                'registerLevel': otherParams.registerLevel,
                'education': otherParams.education,
                'qq': otherParams.qq,
                'weChat': otherParams.weChat
            };

            if (otherParams.customerFieldMap) {
                en.customerFieldMap = otherParams.customerFieldMap || {};
            }
            wx.request({
                url,
                data: en,
                method: 'POST',
                success: res => {
                    if (res.data) {
                        if (res.data.flag === 1) {
                            if (callbackSuccess) {
                                callbackSuccess()
                            } else {
                                wx.showToast({
                                    title: '留言成功'
                                });
                            }
                        } else {
                            if (callbackFail) {
                                callbackFail();
                            } else {
                                wx.showToast({
                                    title: '留言失败',
                                    icon: 'error'
                                });
                            }
                        }
                    }
                },
                fail: () => {
                    if (callbackFail) {
                        callbackFail();
                    } else {
                        wx.showToast({
                            title: '留言失败',
                            icon: 'error'
                        });
                    }
                }
            });
        },
        // 轨迹
        mantisSendPageInfo() {
            const _this = this;
            const {mantisChat, probeData, probeId, companyId} = this.data;
            let mantisNew = {...this.data.mantis};
            if (!!mantisNew.e_id) {
                console.warn("repeat!!");
                return;
            }
            let isLpStr = "false";
            if (mantisNew.isLandingPage) {
                isLpStr = "true";
            }


            let en = {
                uid: mantisChat.uid,
                company: companyId,
                buId: probeData.buId,
                page_title: mantisNew.title || '',
                url: mantisNew.chatPageUrl,
                media: "mobile",
                browser: this.getDeviceInfo(),
                is_lp: isLpStr,
                lp: mantisChat.chatPageUrl,
                lp_calc: "REFER",
                projectId: probeData.projectId,
                pageparam: mantisNew.pageparam,
                thirdUserId: mantisNew.userId,
                thirdAccount: mantisNew.account,
                probeId,
                serviceGroupId: probeData.defaultSvgId
            };

            en.type = "E";
            wx.request({
                url: "https://tk" + probeData.chatServer + "/u/1.gif",
                data: en,
                method: 'GET',
                success: data => {
                    if (!data) {
                        mantisNew.e_id = null;
                        console.error("fail to save t, undefined!");
                        _this.handleMantis(mantisNew);
                        return;
                    }
                    //返回当前页面的轨迹的Id
                    if (data.error) {
                        mantisNew.e_id = null;
                        console.error("fail to save t, error!");
                        _this.handleMantis(mantisNew);
                        return;
                    }
                    mantisNew.trackRetry = 0;

                    //{trackId:r.insertedId, site_id:obj.siteId, ad:obj.referInfo.ad, plan:obj.plan, unit:obj.unit, subUnit:obj.subUnit, creative:obj.creative, url_mathced:true/false}
                    mantisNew.e_id = this.mantisGetTrackId(data.trackId);
                    // 访客_id
                    mantisNew.v_id = data.v_id;
                    _this.handleMantis(mantisNew);
                    // 如果返回url匹配到着陆页
                    if (data.lp_calc) {
                        if (data.lp_calc === "FIRST_VISIT") {
                            //set current page as landing page even its not from adv, 但是不保存cookie
                            mantisNew.isLandingPage = true;
                            mantisNew.lp_calc = data.lp_calc;
                            mantisNew.parsedRefer = {};
                            mantisNew.siteId = null;
                            _this.handleMantis(mantisNew);
                        }

                        // 当发现存在机器人的活跃对话，如果配置了自动发起，则忽略等待自动发起，否则6秒自动拉起对话
                        if (!!data.hasChat) {
                            let autoChatDelay = mantisNew.chat.autoChatDelay;
                            if (typeof (mantisNew.chat.autoChatDelay) === "undefined") {
                                autoChatDelay = -1;
                            }

                            if (isNaN(mantisNew.chat.autoChatDelay)) {
                                autoChatDelay = -1;
                            }

                            if (autoChatDelay === -1) {
                                setTimeout(function () {
                                    if (mantisNew.chat.hasChat) {
                                        return;
                                    }
                                    mantisNew.req_mode = "AUTO";
                                    _this.handleMantis(mantisNew);
                                    _this._requestChat();
                                }, 6000);
                            }
                        }
                    }
                },
                fail: () => {
                    // 如果发送失败重试3次
                    if (mantisNew.trackRetry < 3) {    // 如果发送失败重试3次
                        setTimeout(function () {
                            mantisNew.trackRetry++;
                            _this.handleMantis(mantisNew);
                            _this.mantisSendPageInfo();
                        }, 500)
                    } else {
                        console.error("fail to save t");
                    }
                }
            });
        },
        mantisGetTrackId(data) {
            if (!data) {
                return "";
            }

            if (data.trackId) {
                return data.trackId;
            }

            return data;
        },
        mantisSetupActiveTTl() {
            const _this = this;
            if (!!ttlInterval) {
                clearInterval(ttlInterval);
            }
            ttlInterval = setInterval(function () {
                _this.mantisSendAlive("focus_ttl");
            }, 15000);
        },
        // 发送ttl
        mantisSendAlive(why) {
            const {mantisChat, probeData, companyId} = this.data;
            let liveInfo = {};
            liveInfo.type = "L";
            liveInfo.e_id = mantisChat.e_id;

            if (!beginTime) {
                beginTime = new Date().getTime();
            }
            liveInfo.ttl = Math.floor((new Date().getTime() - beginTime) / 1000);
            if (liveInfo.ttl <= 0) {
                return;
            }
            beginTime = new Date().getTime();
            liveInfo.company = companyId;
            liveInfo.buId = probeData.buId;
            liveInfo.serviceGroupId = probeData.defaultSvgId;
            liveInfo.uid = mantisChat.uid;
            liveInfo.defaultSg = probeData.defaultSvgId;
            liveInfo.why = why;
            liveInfo.v_id = probeData.v_id;

            // 是否是聊天模式
            liveInfo.mode = "no";
            wx.request({
                url: "https://tk" + probeData.chatServer + "/u/1.gif",
                data: liveInfo,
                method: 'GET',
                success: data => {
                    if (!data) {
                        // console.debug("no response return");
                        return;
                    }

                    // 强聊
                    let hasForce = data["hasForce"];
                    if (!!hasForce) {
                        let forceInfo = data["force"];
                        // console.debug("forceInfo found:", forceInfo);
                        if (!!forceInfo) {
                            this._requestChat();
                            return;
                        }
                    }

                    // 邀请信息
                    let hasInvite = data["hasInvite"];
                    if (!!hasInvite) {
                        let inviteInfoStr = data["invite"];
                        try {
                            let inviteInfo = JSON.parse(inviteInfoStr);
                            // console.debug("invite found:", inviteInfo);
                            if (!!inviteInfo) {
                                this.showInviteDiv();
                            }

                        } catch (e) {
                            console.error("fail to parse the invite info", inviteInfoStr);
                        }
                    }

                    let latestMsg = data["latestMsg"];
                    try {
                        // if (latestMsg && onMantisMsgArrive) {
                        //     onMantisMsgArrive(latestMsg);
                        // }
                    } catch (e) {

                    }
                },
                fail: () => {
                    console.error("Post TTL information error-sendClick");
                }
            });
        },
        //获取设备信息
        getDeviceInfo() {
            const res = wx.getSystemInfoSync();
            let deviceInfo = '';
            deviceInfo = '设备品牌' + res.brand + ';设备型号：' + res.model + ';微信版本：' + res.version + ';系统版本：' + res.system;
            return deviceInfo
        },
        getMessagePhone(msgContent) {
            let tempPhone = '';
            if (!msgContent) {
                return tempPhone;
            }
            let plainMsg = msgContent.replace(/<\/?[^>]*>/g, '').replace(/&nbsp;/gi, '');
            if (/([\uFF00-\uFFFF])+/gi.test(plainMsg)) {
                plainMsg = CtoH(plainMsg);
            }
            //判断是否有11位数字
            if (/\d{10,11}/.test(plainMsg)) {
                //将非数字字符替换拆分
                let tempArr = plainMsg
                    .replace(/[^0-9]/gi, '@#@')
                    .replace(/(@#@)+/g, '@#@')
                    .split('@#@');
                let tempArrLen = tempArr.length;
                for (let i = 0; i < tempArrLen; i++) {
                    let temp = tempArr[i];
                    if (/^(\d{11})$/.test(temp)) {
                        let tempArray = plainMsg.match(/((14[1,4]0)\d{7})|(((13[0-9])|(14[5,6,7,8,9])|(15[0,1,2,3,5,6,,7,8,9])|(16[2,5,6,7])|(17[0,1,2,3,5,6,7,8])|(18[0-9])|(19[0,1,2,3,5,6,7,8,9]))\d{8})?/g);
                        let tempArrayLen = tempArray.length;
                        for (let j = 0; j < tempArrayLen; j++) {
                            let t = tempArray[j];
                            if (/^((14[1,4]0)\d{7})|(((13[0-9])|(14[5,6,7,8,9])|(15[0,1,2,3,5,6,,7,8,9])|(16[2,5,6,7])|(17[0,1,2,3,5,6,7,8])|(18[0-9])|(19[0,1,2,3,5,6,7,8,9]))\d{8})$/.test(t)) {
                                tempPhone = t;
                            }
                        }
                    }
                }
            }
            return tempPhone;
        },
        getMessageTenPhone(msgContent) {
            let tempPhone = '';
            if (!msgContent) {
                return tempPhone;
            }
            let plainMsg = msgContent.replace(/<\/?[^>]*>/g, '').replace(/&nbsp;/gi, '');
            if (/([\uFF00-\uFFFF])+/gi.test(plainMsg)) {
                plainMsg = CtoH(plainMsg);
            }
            //判断是否有11位数字
            if (/\d{10}/.test(plainMsg)) {
                //将非数字字符替换拆分
                let tempArr = plainMsg
                    .replace(/[^0-9]/gi, '@#@')
                    .replace(/(@#@)+/g, '@#@')
                    .split('@#@');
                let tempArrLen = tempArr.length;
                for (let i = 0; i < tempArr.length; i++) {
                    let temp = tempArr[i];
                    if (/^(\d{11})$/.test(temp)) {
                        let tempArray = plainMsg.match(/((14[1,4]0)\d{7})|(((13[0-9])|(14[5,6,7,8,9])|(15[0,1,2,3,5,6,,7,8,9])|(16[2,5,6,7])|(17[0,1,2,3,5,6,7,8])|(18[0-9])|(19[0,1,2,3,5,6,7,8,9]))\d{8})?/g);
                        let tempArrayLen = tempArray.length;
                        for (let j = 0; j < tempArrayLen; j++) {
                            let t = tempArray[j];
                            if (/^((14[1,4]0)\d{7})|(((13[0-9])|(14[5,6,7,8,9])|(15[0,1,2,3,5,6,,7,8,9])|(16[2,5,6,7])|(17[0,1,2,3,5,6,7,8])|(18[0-9])|(19[0,1,2,3,5,6,7,8,9]))\d{8})$/.test(t)) {
                                tempPhone = t;
                            }
                        }
                    }
                }
            }
            return tempPhone;
        },
        getMessageWeChat(msgContent) {
            let tempWeChat = '';
            if (!msgContent) {
                return tempWeChat;
            }
            let plainMsg = msgContent.replace(/<\/?[^>]*>/g, '').replace(/&nbsp;/gi, '');
            if (/([\uFF00-\uFFFF])+/gi.test(plainMsg)) {
                plainMsg = CtoH(plainMsg);
            }
            if (!/[-_a-zA-Z0-9]{6,20}/.test(plainMsg)) {
                return tempWeChat;
            }
            //1、判断是否包含字母数字等合理字符，不包含直接返回''
            if (!/\b(?!wxid_)[-_a-zA-Z0-9]{6,20}\b/.test(plainMsg)) {
                return tempWeChat;
            }

            let tempArray = plainMsg
                .replace(/[^-_a-zA-Z0-9]/gi, '@#@')
                .replace(/(@#@)+/g, '@#@')
                .split('@#@');
            //2、解析包含【微信：|微信:|V|v】开头的字符串，
            let tempOne = /(微信号?|v)(\s*)([:|：]?)(\s*)([a-zA-Z1]{1}[-_a-zA-Z0-9]{5,19})/gi.exec(plainMsg);
            if (tempOne) {
                let tempReturn = tempOne[5];
                let tempArrayLen = tempArray.length;
                for (let i = 0; i < tempArrayLen; i++) {
                    let temp = tempArray[i];
                    if (temp.length > 5 && temp.indexOf(tempReturn) !== -1 && !tempWeChat) {
                        tempWeChat = temp;
                    }
                }
            }
            if (tempWeChat) {
                return tempWeChat;
            }

            //3、满足/\b[a-zA-Z][-_a-zA-Z0-9]{5,20}\b/ig
            let tempTwo = /\b[a-zA-Z][-_a-zA-Z0-9]{5,19}\b/gi.exec(plainMsg);
            if (tempTwo) {
                let tempReturn = tempTwo[0];
                let tempArrayLen = tempArray.length;
                for (let i = 0; i < tempArrayLen; i++) {
                    let temp = tempArray[i];
                    if (temp.length > 5 && temp.indexOf(tempReturn) !== -1 && !tempWeChat) {
                        tempWeChat = temp;
                    }
                }
            }
            return tempWeChat;
        },
        dateFormat(date, format) {
            if (format === undefined) {
                format = date;
                date = new Date();
            }
            let map = {
                "M": date.getMonth() + 1, //月份
                "d": date.getDate(), //日
                "h": date.getHours(), //小时
                "m": date.getMinutes(), //分
                "s": date.getSeconds(), //秒
                "q": Math.floor((date.getMonth() + 3) / 3), //季度
                "S": date.getMilliseconds() //毫秒
            };
            format = format.replace(/([yMdhmsqS])+/g, function (all, t) {
                let v = map[t];
                if (v !== undefined) {
                    if (all.length > 1) {
                        v = '0' + v;
                        v = v.substr(v.length - 2);
                    }
                    return v;
                } else if (t === 'y') {
                    return (date.getFullYear() + '').substr(4 - all.length);
                }
                return all;
            });
            return format;
        },
        copy(e) {
            wx.setClipboardData({
                data: e.target.dataset.text,
                success: function (res) {
                    wx.getClipboardData({
                        success: function (res) {
                            wx.showToast({
                                title: '复制成功'
                            })
                        }
                    })
                }
            })
        },
        handleRandom(n, m) {
            return Math.round(Math.random() * (m - n) + n);
        }
    },
    export() {
        return this
    }
})
