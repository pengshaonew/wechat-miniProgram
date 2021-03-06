// plugin/components/mantisChat.js
let startTime = 0;  // 探头请求时长
let reqStartTime = 0;  // 发起会话请求时长
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

// 发送消息按钮
let sendBtnLoading;

// 评价选项提交按钮
let btnLoading;

//验证码timer
let mantisCodeTimer = null;

//退出挽留PC
let retainRemainTimer = null;  //持续停留时间timer

let sendCodeLoading;

// 退出挽留提交按钮
let retainBtnLoading;

let ttlInterval = null;

// socket是否在连接中
let isConnecting = false;

let trackCount = 0;

let chatIdOld = null;
// props手机号发送标记
let propPhoneSendFlag = false;

const phoneRegExp = /(\b1[3-9]\d\s?\d{4}\s?\d{4}\b)|(\b0\d{2,3}[^\d]?\d{3,4}\s?\d{4}\b)|(\b400[^\d]?\d{3}[^\d]?\d{4}\b)/;
const wechatRegExp = /((微信号?\s*[:|：]?)|((v|wx)[:|：]))\s*([a-zA-Z1-9][-_a-zA-Z0-9]{5,19})/i;

// 未读消息列表id
let unreadAry = [];

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
        chatPageUrl: {
            type: String,
            value: ''
        },
        params: {
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
        isEmojiBox: false,
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
        scrollBottomId: 'scrollDown',
        visitorForm: {},
        emojiList: [
            'https://probe.bjmantis.net/chat/emoji/2020001.png',
            'https://probe.bjmantis.net/chat/emoji/2020002.png',
            'https://probe.bjmantis.net/chat/emoji/2020003.png',
            'https://probe.bjmantis.net/chat/emoji/2020004.png',
            'https://probe.bjmantis.net/chat/emoji/2020005.png',
            'https://probe.bjmantis.net/chat/emoji/2020006.png',
            'https://probe.bjmantis.net/chat/emoji/2020007.png',
            'https://probe.bjmantis.net/chat/emoji/2020008.png',
            'https://probe.bjmantis.net/chat/emoji/2020009.png',
            'https://probe.bjmantis.net/chat/emoji/2020010.png',
            'https://probe.bjmantis.net/chat/emoji/2020011.png',
            'https://probe.bjmantis.net/chat/emoji/2020012.png',
            'https://probe.bjmantis.net/chat/emoji/2020013.png',
            'https://probe.bjmantis.net/chat/emoji/2020014.png',
            'https://probe.bjmantis.net/chat/emoji/2020015.png',
            'https://probe.bjmantis.net/chat/emoji/2020016.png',
            'https://probe.bjmantis.net/chat/emoji/2020017.png',
            'https://probe.bjmantis.net/chat/emoji/2020018.png',
            'https://probe.bjmantis.net/chat/emoji/2020019.png',
            'https://probe.bjmantis.net/chat/emoji/2020020.png',
            'https://probe.bjmantis.net/chat/emoji/2020021.png',
            'https://probe.bjmantis.net/chat/emoji/2020022.png',
            'https://probe.bjmantis.net/chat/emoji/2020023.png',
            'https://probe.bjmantis.net/chat/emoji/2020024.png',
            'https://probe.bjmantis.net/chat/emoji/2020025.png',
            'https://probe.bjmantis.net/chat/emoji/2020026.png',
            'https://probe.bjmantis.net/chat/emoji/2020027.png',
            'https://probe.bjmantis.net/chat/emoji/2020028.png',
            'https://probe.bjmantis.net/chat/emoji/2020029.png',
            'https://probe.bjmantis.net/chat/emoji/2020030.png',
            'https://probe.bjmantis.net/chat/emoji/2020031.png',
            'https://probe.bjmantis.net/chat/emoji/2020032.png',
            'https://probe.bjmantis.net/chat/emoji/2020033.png',
            'https://probe.bjmantis.net/chat/emoji/2020034.png',
        ],
        ipInfo: {},
    },
    observers: {
        'phone': function (val) {
            const mantisChat = this.data.mantisChat;
            if (val && mantisChat.chat.connected) {
                this.sendMessage(val);
                propPhoneSendFlag = true;
            }
        },
        "params": function (val){
            const {chatPageUrl} = this.data;
            let miniProgramParams = val.miniProgramParams;
            let mantisChatNew = {...this.data.mantisChat};
            if (miniProgramParams) {
                mantisChatNew.chatPageUrl = chatPageUrl + miniProgramParams;
                mantisChatNew.ocpcUrl = chatPageUrl + miniProgramParams;
            }
            this.handleMantisChat(mantisChatNew);
        },
        'uid': function (val) {
            let mantisChatNew = {...this.data.mantisChat};
            if (!mantisChatNew.uid) {
                this.handleUid(val);
            }
        }
    },

    lifetimes: {
        attached() {
            this.messageAudio = wx.createInnerAudioContext({
                useWebAudioImplement: true
            });
            this.messageAudio.src = 'https://probe.bjmantis.net/chat/13203.mp3';
            const {params, companyId} = this.data;
            if (!params) {
                this.setData({
                    params: {}
                })
            }
            wx.setStorage({
                key: 'companyId',
                data: companyId
            });
            this.initParams();
            this.loadProbeData();
        },
        detached(){

        }
    },

    methods: {
        showChat(autoFlag) {
            if (autoShowHideChatTimer) {
                clearTimeout(autoShowHideChatTimer);
                autoShowHideChatTimer = null;
            }
            if(unreadAry.length){
                this.handleMsgRead(unreadAry);
                unreadAry = [];
            }
            const {probeData, isShowChat} = this.data;
            let mantisChatNew = {...this.data.mantisChat};
            // 发送显示聊窗的通知
            let route = "chat.chatHandler.hideIframe";
            if (mantisChatNew.chat.connected && !isShowChat) {
                pomelo.request(route, {
                    //消息接口
                    content: "聊窗打开",
                    chatId: mantisChatNew.chatId,
                    target: "",
                    type: "N",
                    from: mantisChatNew.uid,
                    companyId: probeData.companyId,
                    channelId: mantisChatNew.chat.channelId
                }, function (data) {

                });
            }
            mantisChatNew.unReadMsgNumber = 0;
            mantisChatNew.req_mode = autoFlag;
            this.hideInviteDiv();
            this.hideResvDiv();
            this.handleMantisChat(mantisChatNew, () => {
                this.setData({
                    isShowChat: true,
                    tipMsg: null,
                    isEmojiBox: false,
                    isShowRetain: false
                });
            });
        },
        hideChat() {
            const _this = this;
            const {probeData, isShowChat} = this.data;
            let mantisChat = this.data.mantisChat;
            // 发送隐藏聊窗的通知
            let route = "chat.chatHandler.hideIframe";
            if (mantisChat.chat.connected && isShowChat) {
                pomelo.request(route, {
                    //消息接口
                    content: "聊窗收起",
                    chatId: mantisChat.chatId,
                    target: "",
                    type: "Y",
                    from: mantisChat.uid,
                    companyId: probeData.companyId,
                    channelId: mantisChat.channelId
                }, function (data) {
                });

            }
            if (!!probeData.mbAutoShowHideChatDelay && !!mantisChat.chatId) {
                autoShowHideChatTimer = setTimeout(function () {
                    _this.showChat('AUTO');
                    _this.scrollDown();
                }, probeData.mbAutoShowHideChatDelay * 1000)
            }
            this.setData({
                isShowChat: false
            })
        },
        // 邀请
        initInvite(invite) {
            const {mantis, probeData} = this.data;
            let mantisNew = {...mantis};
            let inviteMobile = {
                enable: probeData.mbInviteEnable,
                delay: probeData.mbInviteDelay || 3,
                repeat: probeData.mbInviteRepeat || 15,
            };

            if (invite) {
                inviteMobile.showInvite = invite.mobile.showInvite;
            }

            mantisNew.invite = inviteMobile;
            this.handleMantis(mantisNew);
            if (inviteMobile.enable) {
                this.doInvite();
            }
        },
        doInvite(inviteInfo) {
            const _this = this;
            const {mantis, mantisChat, isShowChat} = this.data;
            const mantisChatNew = {...mantisChat};
            // 如果已经开始对话，则不需要再弹出邀请框
            if (mantisChatNew.chat.hasChat) {
                return;
            }

            // 如果有邀请信息，说明是咨询师发来的
            if (!!inviteInfo) {
                let agentId = inviteInfo.agentId;
                let used = inviteInfo.used;
                if (!!agentId && (!used || used === "N")) {
                    mantisChatNew.req_mode = "INVITE";
                    mantisChatNew.assignedAgent = agentId;
                    this.handleMantisChat(mantisChatNew);
                }
            }
            let setting = mantis.invite
            if (setting.enable) {
                let delay = setting.delay;
                let repeat = setting.repeat;

                setTimeout(function () {
                    if (!_this.data.isShowChat && !_this.data.isShowLeave) {
                        _this.showInviteDiv();
                    }
                }, delay * 1000);

                if (repeat > 0) {
                    setInterval(function () {
                        if (!_this.data.isShowChat && !_this.data.isShowLeave) {
                            _this.showInviteDiv();
                        }
                    }, repeat * 1000);
                }
            } else {
                _this.showInviteDiv();
            }

        },
        // 显示邀请框
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
                isShowLeave: true,
                isShowRetain: false,
                isShowChat: false
            });
            this.sendEntry(reason);
        },
        // 隐藏留言
        hideResvDiv() {
            this.setData({
                isShowLeave: false
            })
        },
        initParams: function () {
            const {params: {miniProgramParams}, uid, chatPageUrl} = this.data;
            let mantisChatNew = {...this.data.mantisChat};
            mantisChatNew.uid = uid || this.handleUid(); // 获取uid
            mantisChatNew.chatPageUrl = chatPageUrl;
            if (miniProgramParams) {
                mantisChatNew.chatPageUrl = chatPageUrl + miniProgramParams;
                mantisChatNew.ocpcUrl = chatPageUrl + miniProgramParams;
            }
            this.handleMantisChat(mantisChatNew);
        },
        _requestChat(params) {
            let mantisChatNew = {...this.data.mantisChat};
            if (isConnecting) {
                return;
            }
            this.setData({
                parentParams: params || {}
            })
            this.handleMantisChat(mantisChatNew, () => {
                if (!mantisChatNew.chat.connected) { //  如果没有发起会话再发请求
                    isConnecting = true;
                    this.queryEntry();
                } else {
                    this.showChat()
                }
            });
        },
        loadProbeData() {
            const {serverUrl, companyId, probeId} = this.data;
            if (companyId && probeId) {
                startTime = Date.now();
                wx.request({
                    url: serverUrl + companyId + '/' + probeId + '.json?' + Date.now(),
                    data: {},
                    method: 'GET',
                    success: res => {
                        if (res && res.data) {
                            if (res.data.mbPromTxt) {
                                res.data.mbPromTxt = this.msgReplaceImgWidth(res.data.mbPromTxt)
                            }
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
                        this.getIp();
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
                        this.handleMantisChat(mantisChatNew, () => {
                            this.initConfig(res.data);
                        });
                    }
                },
                fail: (e) => {
                    console.log(e);
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
            this.handleMantisChat(mantisChatNew, () => {
                this.initChat();
                this.initInvite(res.invite);
            });
        },
        initChat() {
            const {probeData, companyId} = this.data;
            let mantisChatNew = {...this.data.mantisChat};

            // track server address
            let track_host = probeData.chatServer;
            if (!!track_host) {
                track_host = "tk" + track_host;
            }
            mantisChatNew.trackUrl = "https://" + track_host + "/u/1.gif";
            mantisChatNew.serviceGroupId = wx.getStorageSync('mantis_sgid' + companyId);
            this.handleMantisChat(mantisChatNew, () => {
                // pomelo监听
                this.registerListener();
            });
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

            this.handleMantisChat(mantisChatNew, () => {
                this.mergeProbeSetting();
            });
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
        queryEntry: function () {
            let _this = this;
            let route = 'gateMini.gateMiniHandler.queryCustomerEntry';
            const {probeData, mantisChat, params} = this.data;
            let port = ports[this.handleRandom(0, 1)];
            reqStartTime = Date.now();
            pomelo.init({
                host: probeData.chatServer,
                port
            }, () => {
                pomelo.request(route, {
                    uid: mantisChat.uid,
                    siteId: '',
                    companyId: probeData.companyId,
                    buId: probeData.buId,
                    // 如果采用指定客服分组的方式发起
                    sgId: mantisChat.serviceGroupId,
                    defaultSgId: probeData.defaultSvgId,
                    probeId: probeData.id, // 探头ID
                    areaRuleFlag: probeData.areaRuleFlag, //探头配置地域规则标识
                    assignedAgent: mantisChat.assignedAgent,
                    projectId: probeData.projectId,
                    ocpcUrl: mantisChat.ocpcUrl,
                    reqInfo: this.getRequest(),
                    lpRequestDuration: 0,
                    welcome: {},
                    xst: '',
                    pageparam: params.pageParam,
                    thirdAccount: params.account,
                    thirdUid: params.userId,
                    promotionMsg: '',
                    searchWordMessage: ''
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
            pomelo.removeAllListeners();
            pomelo.on('onChat', data => {
                const _this = this;
                const probeData = this.data.probeData;
                let mantisChatNew = {...this.data.mantisChat};
                const say_from = data.say_from;
                const phoneReg = phoneRegExp;
                const wechatReg = wechatRegExp;
                const evaluationFlag = data.evaluationFlag;
                let msgListNew = [...this.data.msgList];
                let msgType = data.msgType;
                if(msgListNew.some(item => (item._id || item.msgId) === data.msgId && item.msg === data.msg)){
                    return;
                }

                // 如果访客说话，球到咨询师手里
                if (say_from === 'V') {
                    data.msg = decodeURIComponent(data.msg);
                    mantisChatNew.chat.ball = {who: 'A', lastTime: new Date().getTime()};
                    if (mantisChatNew.chat.isRobot === 'Y') {
                        this.clearRobotAutoMsgTmr();
                    }
                }
                if (data.type === 'IMG') {
                    let msgImg = data.msg.match(/src=['"]([^'"]+)['"]/);
                    if (msgImg && msgImg[1]) {
                        data.imgSrc = msgImg[1];
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
                    if (msgType === 'M' || (msgType === 'A' && /^(V|A)$/.test(data.autoFlag))) {
                        if (this.data.isShowChat) {
                            this.handleMsgRead([data.msgId]);
                        } else {
                            unreadAry.push(data.msgId);
                        }
                    }
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
                        }, () => {
                            this.scrollDown();
                        });
                    }
                }

                if (say_from !== 'V' && say_from !== 'A' || msgType === 'F_S') {
                    return;
                }

                // 如果是挽留提交的消息就不处理
                if (msgType === 'R_S') return;

                if (!!msgType && msgType !== 'A') {
                    // 咨询师或者学员任何一方说话，则取消欢迎语自动发送
                    this.clearWelcomeMsgTmr();
                }

                // 如果是访客消息，更新访客的最后消息时间, 消息已经显示过，所以不用再添加
                if (data.from === mantisChatNew.uid) {
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
                    if (data.wechatMatchType !== 'ENTERPRISE') {
                        data.msg = this.msgReplaceQrCode(data.msg);
                    }
                    // 排除自动发送的消息msgType 手动发送消息 M  其他消息 A
                    if (!!msgType && msgType !== 'A') {
                        mantisChatNew.chat.agentSent = true;
                        this.setupRemindTimer();//访客未回复自动回复开始计时
                    }
                    if (say_from === 'A' && (msgType === 'M' || msgType === 'F')) {    // 收到咨询师的消息
                        let phoneFlag = phoneReg.exec(data.msg)
                        if (phoneFlag && !probeData.callPhoneNumberFlag) {
                            data.phone = phoneFlag[0];
                        }
                        lastCounselorMsgTime = new Date().getTime();
                        if (agentTimedTimer) { // 清除咨询师的计时器
                            clearInterval(agentTimedTimer);
                            agentTimedTimer = null;
                        }

                    }
                    this.cutOff();
                    data.msg = this.msgReplaceImgWidth(data.msg);
                    // 如果收到新消息且对话没有切断，自动弹出
                    if (mantisChatNew.chat.connected) {
                        let msg = data.msg;
                        let dataTime = data.time;
                        let timeStr = new Date(dataTime);
                        if (say_from === 'A' && data.msgType === 'F') {   // 表单消息
                            data.formData = JSON.parse(msg);
                            this.savePickerRange(data);
                            msg = '收到新消息';
                        }
                        if (msg.indexOf("isChoiceMsg") !== -1) {  //选择性消息
                            data.choiceMsg = JSON.parse(msg);
                            msg = '收到新消息';
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

                let plainMsg = data.msg.replace(/<\/?[^>]*>/g, '').replace(/&nbsp;/ig, '');
                let wechatFlag = wechatReg.exec(plainMsg);
                if (wechatFlag && wechatFlag.length >= 6 && !probeData.copyWechatNumberFlag) {
                    data.copyWechatBtnText = '复制' + wechatFlag[1].replace(/[:：]/g, '');
                    data.wechatCode = wechatFlag[5];
                }
                if (!msgListNew.some(item => (item._id || item.msgId) === data.msgId && item.msg === data.msg)) {
                    msgListNew.push(data);
                }
                this.setData({
                    msgList: msgListNew
                }, () => {
                    _this.scrollDown();
                });
            })
            // 中断后的回调
            pomelo.on('disconnect', () => {
                console.log('disconnect');
                let mantisChatNew = {...this.data.mantisChat};
                mantisChatNew.chat.connected = false;
                clearInterval(reminderTmr);
                clearInterval(agentTimedTimer);
                reminderTmr = null;
                agentTimedTimer = null;
                this.handleMantisChat(mantisChatNew);
            })

            pomelo.on('error', function () {
                console.log('error');

            })

            // 连接错误
            pomelo.on('ON_ERROR', () => {
                console.log('ON_ERROR');
                let mantisChatNew = {...this.data.mantisChat};
                pomeloErrorCount++;
                mantisChatNew.chat.connected = false;
                isConnecting = false;
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

            // TODO 咨询师离线 没进来
            pomelo.on('ON_AGENT_LEAVE', () => {
                console.log('咨询师离线');
                const _this = this;
                setTimeout(function () {
                    let mantisChatNew = {..._this.data.mantisChat};
                    mantisChatNew.chat.connected = false;
                    _this.handleMantisChat(mantisChatNew);
                    _this._requestChat();
                }, 10000);
            })

            // 未关闭对话的历史消息
            pomelo.on('ON_HIS_MSG', data => {
                const probeData = this.data.probeData;
                let mantisChatNew = {...this.data.mantisChat};
                let msgListNew = [];
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
                        visitantAutoResponseCount = visitantAutoResponseCount + 1;
                        !f.is_read && this.handleMsgRead([f._id]);
                    } else if (f.autoFlag === 'A') {
                        counselorAutoResponseCount = counselorAutoResponseCount + 1;
                        !f.is_read && this.handleMsgRead([f._id]);
                    }
                    let say_from = f.say_from;

                    if (f.evaluationFlag === 'EVALUATE_RESULT') {
                        msgListNew.push(f);
                        this.setData({
                            msgList: msgListNew
                        }, () => {
                            this.scrollDown();
                        });
                    }
                    if (say_from !== 'V' && say_from !== 'A') {
                        continue;
                    }

                    if (f.type === 'IMG') {
                        let msgImg = f.msg.match(/src=['"]([^'"]+)['"]/);
                        if (msgImg && msgImg[1]) {
                            f.imgSrc = msgImg[1];
                        }
                    }

                    if (f.choice_msg_click === 'N') {
                        f.choiceMsg = JSON.parse(f.choice_msg);
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
                        if (f.wechatMatchType !== 'ENTERPRISE') {
                            f.msg = this.msgReplaceQrCode(f.msg);
                        }
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
                            this.savePickerRange(f);
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
                            if (f.msgType && f.msgType !== 'A') {
                                mantisChatNew.chat.agentSent = true;
                            }
                            mantisChatNew.chat.ball = {who: 'V', lastTime: new Date().getTime()};
                            if (mantisChatNew.chat.isRobot === 'Y') {
                                this.setRobotAutoMsgTimer();
                            }
                            if (f.msgType === 'M' && !f.is_read) {
                                this.handleMsgRead([f._id]);
                            }
                        }
                    }
                    f.msg = this.msgReplaceImgWidth(f.msg);
                    msgId = f._id || f.msgId;
                }
                this.setData({
                    msgList: msgListNew
                }, () => {
                    this.scrollDown(500);
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
                this.handleMantisChat(mantisChatNew, () => {
                    this.resendMsg();
                });

            })

            // 收到历史消息
            pomelo.on('ON_HIS_CHAT_MSG', data => {
                const {probeData} = this.data;
                let hisMsgListNew = [];
                if (probeData.notShowHistoryMessage) {
                    this.clearHisChatMsg();
                    return;
                }
                let msgs = data.msg;
                if (!msgs || msgs.length === 0) {
                    return;
                }
                let mms = msgs;
                for (let i = 0; i < mms.length; i++) {
                    let f = mms[i];
                    if (f.evaluationFlag === 'EVALUATE_RESULT') {
                        hisMsgListNew.push(f);
                        this.setData({
                            hisMsgList: hisMsgListNew
                        }, () => {
                            this.scrollDown(500);
                        })
                    }
                    let say_from = f.say_from;
                    if (say_from !== 'V' && say_from !== 'A') {
                        continue;
                    }

                    if (f.type === 'IMG') {
                        let msgImg = f.msg.match(/src=['"]([^'"]+)['"]/);
                        if (msgImg && msgImg[1]) {
                            f.imgSrc = msgImg[1];
                        }
                    }

                    if (f.choice_msg_click === 'N') {
                        f.choiceMsg = JSON.parse(f.choice_msg);
                    }

                    // 如果是挽留提交的消息就不处理
                    if (f.msgType === 'R_S' || f.msgType === 'F_S') continue;
                    if (say_from === 'A') {
                        const phoneReg = phoneRegExp;
                        const wechatReg = wechatRegExp;
                        if (f.wechatMatchType !== 'ENTERPRISE') {
                            f.msg = this.msgReplaceQrCode(f.msg);
                        }
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
                            this.savePickerRange(f);
                        }
                    }
                    f.msg = this.msgReplaceImgWidth(f.msg);
                    hisMsgListNew.push(f);
                }
                this.setData({
                    hisMsgList: hisMsgListNew
                }, () => {
                    this.scrollDown();
                });
                this.resendMsg();
            })

            // 咨询师未匹配
            pomelo.on('ON_NO_AGENT_MATCH', () => {
                console.log('咨询师未匹配');
                let mantisChatNew = {...this.data.mantisChat};
                mantisChatNew.chat.connected = false;
                isConnecting = false;
                this.handleMantisChat(mantisChatNew);
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
                isConnecting = false;
                pomelo.disconnect();
                console.info("onKick" + JSON.stringify(data));
                this.handleMantisChat(mantisChatNew);
            })

            // 对话发起成功
            pomelo.on('ON_CHANNEL_OK', data => {
                let mantisChatNew = {...this.data.mantisChat};
                const _this = this;
                const {parentParams, probeData, phone} = this.data;
                if (probeData.notShowHistoryMessage) {
                    this.clearHisChatMsg();
                }
                mantisChatNew.chat.connected = true;
                isConnecting = false;
                mantisChatNew.chat.agent = data.msg.agent || {};
                if(chatIdOld !== data.msg.chatId){
                    chatIdOld = data.chatId;
                    mantisChatNew.chat.vistorSent = false;
                    mantisChatNew.chat.agentSent = false;
                    mantisChatNew.chat.visitorMsgCount = 0;
                    mantisChatNew.chat.agentMsgCount = 0;
                }
                mantisChatNew.chatId = data.msg.chatId;
                mantisChatNew.chat.channelId = data.msg.channelId;
                mantisChatNew.sgId = data.msg.sgId;
                mantisChatNew.chat.isRobot = data.msg.isRobot;
                let endTime = new Date().getTime();
                console.info("time:" + (endTime - beginTime) + "," + mantisChatNew.chatId);
                lastVisitorMsgTime = new Date().getTime();
                // 启用输入框
                this.enableInput();
                //clear reminder count
                reminderCount = 0;
                // 通知对话发起
                mantisChatNew.chat.hasChat = true;

                // 挽留手机号发送
                let mantisRetainTel = wx.getStorageSync('mantisRetainTel');
                if (mantisRetainTel) {
                    wx.setStorage({
                        key: 'mantisRetainTel',
                        data: ''
                    });
                    setTimeout(() => {
                        this.sendMessage(mantisRetainTel, 'R_S');
                    }, 1000)
                }

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
                    if (agentPhone !== 'null' && agentPhone) {
                        mantisChatNew.chat.agentPhone = agentPhone;
                    }
                } catch (e) {

                }

                // 提示咨询师消息
                setTimeout(function () {
                    _this.stopAgentKeyIn();
                }, 20);

                this.cutOff();
                this.resendContact();
                this.handleMantisChat(mantisChatNew, () => {
                    // show chat window
                    this.showChat();
                    // 如果msgCon存在  直接发送
                    if (parentParams && parentParams.msgCon) {
                        this.sendMessage(parentParams.msgCon);
                    }
                    if(!propPhoneSendFlag && phone){
                        this.sendMessage(phone);
                        propPhoneSendFlag = true;
                    }
                });
            })

            // 收到对话转接请求
            pomelo.on('ON_TRANSFER', data => {
                console.log('收到对话转接请求');
                const {companyId} = this.data;
                let mantisChatNew = {...this.data.mantisChat};
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
                    mantisChatNew.serviceGroupId = newServiceGroupId;
                }

                // 指定的客服
                if (!!targetAgentId) {
                    mantisChatNew.assignedAgent = targetAgentId;
                }
                mantisChatNew.req_mode = "TRANSFER";
                isConnecting = false;
                mantisChatNew.chat.connected = false;
                mantisChatNew.chat.vistorSent = false;
                mantisChatNew.chat.agentSent = false;
                pomelo.disconnect();
                this.handleMantisChat(mantisChatNew, () => {
                    this._requestChat();
                });
            });

            // 撤回消息
            pomelo.on('ON_MESSAGE_ROLLBACK', data => {
                let hisMsgListNew = this.data.hisMsgList;
                let msgListNew = this.data.msgList;
                hisMsgListNew = hisMsgListNew.filter(item => (item._id || item.msgId) !== data.messageId);
                msgListNew = msgListNew.filter(item => (item._id || item.msgId) !== data.messageId);
                unreadAry = unreadAry.filter(function (item){
                    return item !== data.messageId;
                });
                this.setData({
                    hisMsgList: hisMsgListNew,
                    msgList: msgListNew
                })
            })
        },
        getRequest: function () {
            const {probeData, mantis, probeId, companyId, ipInfo} = this.data;
            let mantisChatNew = {...this.data.mantisChat};
            mantisChatNew.lp = mantisChatNew.chatPageUrl;
            this.handleMantisChat(mantisChatNew);

            let req = mantisChatNew.request;
            req.page_title = '';
            req.req_mode = mantisChatNew.req_mode;
            req.req_ele = mantisChatNew.ele || "";

            // set landing page url
            req.lp = mantisChatNew.chatPageUrl;

            req.url = encodeURI(mantisChatNew.chatPageUrl);

            req.vistor_id = mantisChatNew.uid;
            req.srv_gp_id = mantisChatNew.serviceGroupId;
            req.vistor_media = "mobile";
            req.company = probeData.companyId;
            req.buId = mantisChatNew.buId;
            req.trackId = mantis.trackId;
            req.assignedAgent = mantisChatNew.assignedAgent;
            req.browser = this.getDeviceInfo();
            req.ipCheck = mantisChatNew.ipCheck;
            req.brand = mantisChatNew.brand;
            req.chat_page_url = '';
            req.ctag = mantisChatNew.ctag;
            req.probeId = companyId + '/' + probeId;
            req.cookieRefer = JSON.stringify(mantis.trackInfo);
            req.ip = ipInfo.ip;
            req.country = ipInfo.country;
            req.ip_city = ipInfo.ip_city;
            req.ip_province = ipInfo.ip_province;
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
            const {probeData, mantisChat, params} = this.data;
            allMessages = [];

            let probe = probeData;
            let promotionMsg = null;
            promotionMsg = encodeURIComponent(probe.mbPromTxt || "");

            pomelo.init({
                host,
                port
            }, function () {
                let searchWordMessage = null;
                let param = {
                    uid: mantisChat.uid,
                    siteId: mantisChat.siteId,
                    companyId: probe.companyId,
                    buId: probe.buId,
                    // 如果采用指定客服分组的方式发起
                    sgId: mantisChat.serviceGroupId,
                    defaultSgId: probe.defaultSvgId,
                    probeId: probe.id, // 探头ID
                    areaRuleFlag: probe.areaRuleFlag, //探头配置地域规则标识
                    assignedAgent: mantisChat.assignedAgent,
                    projectId: probe.projectId,
                    ocpcUrl: mantisChat.ocpcUrl,
                    reqInfo: _this.getRequest(),
                    lpRequestDuration: enterDuration,
                    welcome: mantisChat.chat.welcome,
                    xst: '',
                    pageparam: params.pageParam,
                    thirdAccount: params.account,
                    thirdUid: params.userId,
                    promotionMsg,
                    searchWordMessage
                };
                pomelo.request("connectorMini.entryHandler.customerEnter", param, function (data) {

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
                    if (mantisChatNew.req_mode === "TRANSFER") {
                        mantisChatNew.req_mode = "VISTOR";
                    }
                    if(chatIdOld !== data.chatId){
                        chatIdOld = data.chatId;
                        mantisChatNew.chat.vistorSent = false;
                        mantisChatNew.chat.agentSent = false;
                        mantisChatNew.chat.visitorMsgCount = 0;
                        mantisChatNew.chat.agentMsgCount = 0;
                    }
                    mantisChatNew.chatId = data.chatId;
                    mantisChatNew.channelId = data.channelId;
                    mantisChatNew.sgId = data.sgId;
                    if (data.agentImg) {
                        mantisChatNew.agent_msg_icon = data.agentImg;
                    }
                    _this.handleMantisChat(mantisChatNew, () => {
                        if (data.msgType === 'ON_WEL_MSG') {
                            _this.welcomeMsg(data.msg, searchWordMessage);
                        } else if (data.msgType === 'ON_WEL_MSG_ALL') {
                            _this.welcomeMsgAll(data.msg, (data.historyMsgs || []));
                        }
                    });
                });
            });
        },
        welcomeMsg(msgList) {
            let mantisChatNew = this.data.mantisChat;
            this.clearHisMsg();
            welcomeMsgs = [];
            let isSent = false;
            const probeData = this.data.probeData;
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
                                if (f.wechatMatchType !== 'ENTERPRISE') {
                                    f.msg = this.msgReplaceQrCode(f.msg);
                                }
                                f.msg = this.msgReplaceImgWidth(f.msg);
                                if (msg.indexOf("isChoiceMsg") !== -1) {  //选择性消息
                                    f.choiceMsg = JSON.parse(f.msg);
                                }
                                if (!isSent) {
                                    let dataTime = Date.now();
                                    if (mantisChatNew.mantisTtimeDifference) {
                                        dataTime = dataTime + mantisChatNew.mantisTtimeDifference;
                                    }
                                    let timeStr = new Date(dataTime);
                                    let plainMsg = f.msg.replace(/<\/?[^>]*>/g, '').replace(/&nbsp;/ig, '');
                                    let wechatFlag = wechatRegExp.exec(plainMsg);
                                    if (wechatFlag && wechatFlag.length >= 6 && !probeData.copyWechatNumberFlag) {
                                        f.copyWechatBtnText = '复制' + wechatFlag[1].replace(/[:：]/g, '');
                                        f.wechatCode = wechatFlag[5];
                                    }
                                    f.timeStr = this.dateFormat(timeStr, "yyyy-MM-dd hh:mm:ss");
                                    f.say_from = 'A';
                                    this.setData({msgList: [f]}, () => {
                                        this.scrollDown();
                                    });
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

            const probeData = this.data.probeData;
            if (!!msgs) {
                for (let i = 0; i < msgs.length; i++) {
                    let m = msgs[i];
                    if (!!m) {
                        for (let j = 0; j < m.length; j++) {
                            let f = m[j];
                            if (!!f.msg) {
                                if(f.wechatMatchType !== 'ENTERPRISE'){
                                    f.msg = this.msgReplaceQrCode(f.msg);
                                }
                                f.msg = this.msgReplaceImgWidth(f.msg);
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
                        const mantisChat = _this.data.mantisChat;
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
                            msg.indexOf('#WECHAT_WORD#') !== -1 ||
                            msg.indexOf('#WECHAT_QRCODE#') !== -1 ||
                            msg.indexOf('#WECHAT_NICKNAME#') !== -1
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
            const {probeData, mantisChat} = this.data;
            let route = "chat.chatHandler.findWelcomeWeChatAssignEngine";
            pomelo.request(route, {
                companyId: probeData.companyId,
                chatId: mantisChat.chatId,
                wechatAssignId: msgData.wechatAssignId,
                wechatMatchType: msgData.wechatMatchType,
                uid: mantisChat.uid,
                agentWechatFlag: msgData.agentWechatFlag,
                agentId: mantisChat.chat.agent.agentId
            }, data=>{
                mantisChat.chat.wechatRule = data.wechatInfo;
                this.replaceWechatCode(msgData)
            })
        },
        replaceWechatCode(msgData) {
            const { mantisChat } = this.data;
            let wechatRule = mantisChat.chat.wechatRule;
            let msg = msgData.msg;
            if(!wechatRule) return;
            if (msg.indexOf('#WECHAT_WORD#') !== -1) {
                msg = msg.replace(/#WECHAT_WORD#/g, wechatRule.weChat || '');
            }
            if (msg.indexOf('#WECHAT_QRCODE#') !== -1) {
                msg = msg.replace(/#WECHAT_QRCODE#/g, wechatRule.qrcode ? '<img class="mantisWechatQrCode" src="' + wechatRule.qrcode + '" alt=""/>' : '');
            }
            if (msg.indexOf('#WECHAT_NICKNAME#') !== -1) {
                msg = msg.replace(/#WECHAT_NICKNAME#/g, wechatRule.nickName || '');
            }
            this.sendSystemMsg(msg, {isWelcome: true, wechatRule: wechatRule, wechatMatchType: msgData.wechatMatchType});
        },
        mantisCreateGuid: function () {
            return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        // 发送通知消息
        sendAiMsg(content) {
            const mantisChat = this.data.mantisChat;
            let route = "chat.chatHandler.sendAIMsg";
            if (mantisChat.chat.connected) {
                pomelo.request(route, {
                    //消息接口
                    content,
                    chatId: mantisChat.chatId,
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

                });
            }
        },
        scrollDown(time) {
            setTimeout(() => {
                this.setData({
                    scrollBottomId: 'scrollDown'
                })
            }, time || 200)
        },
        // 清理历史聊天信息
        clearHisMsg() {
            this.setData({
                msgList: []
            })
        },
        // 清理历史聊天信息
        clearHisChatMsg() {
            this.setData({
                hisMsgList: []
            })
        },
        //  记录进入留言表单
        sendEntry(reason) {
            const {mantis, mantisChat, probeData} = this.data;
            let entryInfo = {};
            entryInfo.uid = mantisChat.uid;
            entryInfo.buId = probeData.buId;
            entryInfo.ele = mantis.ele;
            entryInfo.companyId = probeData.companyId;
            entryInfo.pageUrl = mantisChat.chatPageUrl;
            entryInfo.projectId = probeData.projectId;
            entryInfo.reason = reason;
            let url = "https://" + probeData.chatServer + "/" + probeData.companyId + "/api-war/message/addEntryInfo.do";
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
                if (!mantisChat.chatId) {
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
                if (!mantisChat.chatId) {
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
            if (!!robotAutoMsgTmr) {
                clearInterval(robotAutoMsgTmr);
                robotAutoMsgTmr = null;
            }

            robotAutoMsgTmr = setInterval(function () {
                let mantisChat = {..._this.data.mantisChat};

                if (mantisChat.chat.isComplete === "Y") {
                    return;
                }

                if (!mantisChat.chat.ball) {
                    return;
                }

                if (!mantisChat.chat.ball.who) {
                    return;
                }

                if (!mantisChat.chat.vistorSent) {
                    return;
                }

                // 自动回复的次数限制
                if (robotAutoMsgCount > 30) {
                    return;
                }

                if (mantisChat.chat.ball.who === 'A') {
                    return;
                }

                let time = mantisChat.chat.ball.lastTime;
                if (!time || time === 0) {
                    return;
                }
                let gap = new Date().getTime() - time;
                if (gap > 10000) {
                    let inputGap = new Date().getTime() - (mantisChat.chat.lastInputtingTime || 0);
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
                    chatId: mantisChatNew.chatId,
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
                let mantisChatNew = {..._this.data.mantisChat};
                let gap = new Date().getTime() - lastVisitorMsgTime;
                if (gap > REMINDER_INTERVAL * MAX_REMINDER * 60 * 1000) {
                    if (!!mantisChatNew.chat.connected) {
                        pomelo.disconnect();
                        mantisChatNew.chat.connected = false;
                        mantisChatNew.chatId = null;
                        reminderCount = 0;
                        _this.stopAgentKeyIn();
                        clearInterval(reminderTmr);
                        clearInterval(agentTimedTimer);
                        reminderTmr = null;
                        agentTimedTimer = null;
                        _this.handleMantisChat(mantisChatNew);
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
            const {isShowChat, probeData} = this.data;
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

            let action = probeData.mbMsgAction || "tip";
            if (action === "tip") {
                this.notifyNewMsg(msg);
            }else if(action === 'notRemind'){
                this.notifyNewMsg();
            }
            else {
                this.showChat('AUTO');
            }
        },
        // 会话连接后消息重发
        resendMsg() {
            const mantisChat = this.data.mantisChat;
            if (!!mantisChat.chatId) {
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
            const {probeData, mantisChat} = this.data;
            pomelo.request("chat.chatHandler.customerSend", {
                //消息接口
                content: msg,
                sgId: mantisChat.sgId,
                chatId: mantisChat.chatId,
                agentId: mantisChat.chat.agent.agentId,
                target: "",
                type: "text",
                projectId: probeData.projectId,
                companyId: probeData.companyId,
                channelId: mantisChat.chat.channelId,
                msgType: msgType,
                uidClient: 'SDK_MINI_PROGRAM'
            }, function (data) {
            });
        },
        // 消息浮层显示
        notifyNewMsg(msg) {
            let mantisChatNew = {...this.data.mantisChat};
            mantisChatNew.unReadMsgNumber += 1;
            this.handleMantisChat(mantisChatNew);
            if(msg){
                this.setData({
                    tipMsg: msg
                })
            }
            this.setData({
                tipMsg: msg,
                mantisChat: mantisChatNew
            })
        },
        notifyNewMsgClose() {
            this.setData({
                tipMsg: null
            })
        },
        // 振动提醒
        vibrate() {
            wx.vibrateLong({
                type: 'medium'
            });
        },
        // 声音提醒
        playSound() {
            this.messageAudio.play();
        },
        btnSendMsg: function () {
            const {inputValue, mantisChat} = this.data;
            if (inputValue && !sendBtnLoading) {
                sendBtnLoading = true;
                if (mantisChat.chat.connected) {
                    this.sendMessage(inputValue);
                } else {
                    this._requestChat({msgCon: inputValue})
                }
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
                wechatMatchType: opt.wechatMatchType || null,
                chatId: mantisChat.chatId,
                uid: mantisChat.chat.agent.agentId,
                channelId: mantisChat.chat.channelId,
                autoFlag: opt.autoFlag || 'N',
                visitorId: mantisChat.uid,
                companyId: companyId * 1,
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
        sendMessage: function (msgContent, msgType, type) {
            const _this = this;
            const {probeData, mantisChat} = this.data;
            const route = "chat.chatHandler.customerSend";
            let msgId = '';
            if (msgContent.indexOf("isChoiceRes") !== -1) {
                //选择性消息
                let choiceMsg = JSON.parse(msgContent);
                msgId = choiceMsg.msgId;
            }
            if (/\b1[3-9]\d{9}\b/g.test(msgContent)) {
                wx.setStorage({
                    key: 'mantisSendTelFlag',
                    data: 'Y'
                });
            }
            pomelo.request(route, {
                //消息接口
                msgId,
                content: msgContent,
                sgId: mantisChat.sgId,
                chatId: mantisChat.chatId,
                agentId: mantisChat.chat.agent.agentId,
                target: "",
                type: type || "text",
                projectId: probeData.projectId,
                companyId: probeData.companyId,
                channelId: mantisChat.channelId,
                from: mantisChat.uid,
                msgType: msgType || 'M',
                uidClient: 'SDK_MINI_PROGRAM'
            }, data => {
                this.setData({
                    inputValue: ''
                })
                sendBtnLoading = false;
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
        // 发送选择性话术按钮消息
        sendChoiceMsg(e) {
            let {btnId, label, msgid} = e.target.dataset;
            let msgListNew = this.data.msgList.map(item => {
                if ((item._id || item.msgId) === msgid) {
                    item.choiceMsg.content = null;
                }
                return item;
            });
            let hisMsgListNew = this.data.hisMsgList.map(item => {
                if ((item._id || item.msgId) === msgid) {
                    item.choiceMsg.content = null;
                }
                return item;
            });
            this.setData({
                msgList: msgListNew,
                hisMsgList: hisMsgListNew
            }, () => {
                this.scrollDown();
            });
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
        handleMantisChat: function (mantisChat, cb) {
            this.setData({
                mantisChat
            }, () => {
                cb && cb()
            })
        },
        // 监听输入框input事件
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
            this.setData({
                inputValue: value
            });
            if (!value) {
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
                    chatId: mantisChatNew.chatId,
                    agentId: mantisChatNew.chat.agent.agentId,
                    companyId: companyId * 1,
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
                            chatId: mantisChatNew.chatId,
                            agentId: mantisChatNew.chat.agent.agentId,
                            companyId: companyId * 1,
                            channelId: mantisChatNew.chat.channelId,
                            target: ""
                        };
                        pomelo.notify("chat.chatHandler.customerInputing", msg);
                    }
                }, 200);
            }

            this.handleMantisChat(mantisChatNew);
        },
        callPhone: function (e) {
            let phone = e.target.dataset.phone;
            wx.makePhoneCall({
                phoneNumber: phone
            });
            this.sendAiMsg('该访客点击了"电话咨询"按钮')
        },
        handleEmojiBox() {
            let isEmojiBox = this.data.isEmojiBox;
            this.setData({
                isEmojiBox: !isEmojiBox
            })
        },
        sendEmoji(e) {
            let src = e.target.dataset.src;
            if (src) {
                this.sendMessage(`<img class="emojiImg" style="width:30px;height:30px;" src="${src}" />`);
            }
            this.handleEmojiBox();
        },
        chooseImage: function () {
            let tempFiles = [];
            wx.chooseImage({
                count: 1,
                sizeType: ['original', 'compressed'],
                sourceType: ['album', 'camera'],
                success: res => {
                    if (res.tempFiles.length > 0) {
                        tempFiles = tempFiles.concat(res.tempFiles);
                        tempFiles.forEach(item => {
                            if (item.size / 1024 / 1024 > 5) {
                                wx.showToast({
                                    title: '请选择大小在5M以内的文件',
                                    icon: 'none'
                                })
                            } else {
                                this.uploadImg(item.path);
                            }
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
                        this.sendMessage(`<img style="max-width: 100%" src="${data.data}" />`, null, 'IMG');
                    } else {
                        wx.showToast({
                            title: '图片发送失败',
                            icon: 'none'
                        });
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
        // 点击悬浮球、提示消息列表、邀请框
        clickFloating() {
            if (isConnecting) {
                return;
            }
            const {mantis} = this.data;
            let mantisChatNew = {...this.data.mantisChat};
            mantisChatNew.req_mode = "VISTOR";
            this.handleMantisChat(mantisChatNew, () => {
                this._requestChat();
                let ut = {};
                // save the click event
                ut.ele_name = "右下角客服栏";
                ut.e_id = mantis.e_id;
                ut.type = "C";
                this.sendClick(ut);
            });
            return false;
        },
        //发送点击信息
        sendClick(cInfo) {
            let {mantisChat, mantis} = this.data;
            if (!mantis.trackId) {
                return;
            }
            if (!mantisChat.trackUrl) {
                console.log("mantisChat.trackUrl invalid");
                return;
            }
            wx.request({
                url: mantisChat.trackUrl,
                data: cInfo,
                method: 'GET',
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
        // 发送评价结果
        handleEvaluation(e) {
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
                        chatId: mantisChat.chatId,
                        companyId: companyId * 1,
                        channelId: mantisChat.chat.channelId
                    }, function (data) {
                        btnLoading = false;
                    });

                }
            }
        },
        //咨询师不在线留言数据提交
        formSubmit(e) {
            const {probeData, mantisChat, companyId, probeId, params} = this.data;
            const url = "https://" + probeData.chatServer + "/" + companyId + "/api-war/message/insertMessageInfo2.do";
            let values = e.detail.value;
            if (!/^1[3-9]\d{9}$/.test(values.phone)) {
                wx.showToast({
                    title: '联系方式有误,请检查确认',
                    icon: 'none'
                });
                return;
            }
            if (values.content && values.content.length > 200) {
                wx.showToast({
                    title: '情况描述超过最大长度',
                    icon: 'none'
                })
                return;
            }
            let resvInfo = {};
            resvInfo.probeId = probeId;
            resvInfo.uid = mantisChat.uid;
            resvInfo.siteId = mantisChat.siteId;
            resvInfo.buId = probeData.buId;
            resvInfo.companyId = companyId * 1;
            resvInfo.ele = mantisChat.ele;
            resvInfo.pageUrl = mantisChat.chatPageUrl;
            resvInfo.lpUrl = mantisChat.chatPageUrl;
            resvInfo.projectId = probeData.projectId;
            resvInfo.reqVistorMedia = "mobile";
            resvInfo.thirdUserId = params.userId;
            resvInfo.thirdAccount = params.account;

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
            let formValues = e.detail.value;
            let msgCon = '';
            let keyArray = Object.keys(formValues);
            let errFlag = null;
            keyArray.forEach(item => {
                let val = formValues[item];
                if (val && this.data.visitorForm[msgId] && this.data.visitorForm[msgId][item]) {
                    val = this.data.visitorForm[msgId][item][val];
                }
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
            }, () => {
                this.scrollDown();
            });
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
                    chatId: mantisChat.chatId,
                    companyId: companyId * 1,
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
                        if (
                            !mantisNew.notDisplayExist && wx.getStorageSync('mantisSendTelFlag') === 'Y' ||
                            _this.data.mantis.displayCountActual >= _this.data.mantis.displayCount
                        ) {
                            retainRemainTimer && clearInterval(retainRemainTimer);
                            return;
                        }
                        if (
                            _this.data.mantis.displayIntervalFlag &&
                            !_this.data.isShowChat &&
                            !_this.data.isShowLeave &&
                            !_this.data.isShowRetain
                        ) {
                            _this.mantisShowRetain();
                        }
                    }, triggerRemainTime * 1000)
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
            if (mantisNew.notDisplayExist && wx.getStorageSync('mantisSendTelFlag') === 'Y') {  //如果提交过挽留后不显示 并且已经提交过手机号
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
            switch (autoChatDelay) {
                case 0:
                    let mantisChatNew = {..._this.data.mantisChat};
                    mantisChatNew.req_mode = "AUTO";
                    enterDuration = 0;
                    _this.handleMantisChat(mantisChatNew, () => {
                        _this._requestChat();
                    });

                    break;
                default:
                    setTimeout(() => {
                        let mantisChatNew = {..._this.data.mantisChat};
                        mantisChatNew.req_mode = "AUTO";
                        enterDuration = autoChatDelay;
                        _this.handleMantisChat(mantisChatNew, () => {
                            _this._requestChat();
                        });
                    }, autoChatDelay * 1000);
                    break;
            }
        },
        handleMsgRead(msgIds){
            const {mantisChat, companyId} = this.data;
            pomelo.request("chat.chatHandler.messageRead", {
                msgIds: msgIds,
                chatId: mantisChat.chatId,
                companyId,
                visitorId: mantisChat.uid
            }, function (res) {

            });
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
            if (sendCodeLoading) return;
            sendCodeLoading = true;
            const {retainPhone, probeData, companyId} = this.data;
            let url = 'https://' + probeData.chatServer + "/" + companyId + "/api-war/smsApi/sendVerificationCode.do";
            if (!/^1[3-9]\d{9}$/.test(retainPhone)) {
                wx.showToast({
                    title: '请输入正确的手机号',
                    icon: 'error'
                })
                sendCodeLoading = false;
                return;
            }
            this.codeTiming();
            let params = {
                companyId: companyId * 1,
                phone: retainPhone
            }
            wx.request({
                url,
                data: params,
                method: 'POST',
                success: res => {
                    sendCodeLoading = false;
                    if (res.data && res.data.flag === 1) {
                        wx.showToast({
                            title: '发送成功',
                        })
                    }
                },
                fail: () => {
                    sendCodeLoading = false;
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
            if (retainBtnLoading) return;
            retainBtnLoading = true;
            let url = 'https://' + probeData.chatServer + "/" + companyId + "/api-war/chatapi/staySubmit.do";
            let phone = values.phone;
            let phoneCode = values.phoneCode;
            let stayId = e.target.dataset.stayid;
            if (!/^1[3-9]\d{9}$/.test(phone)) {
                wx.showToast({
                    title: '请输入正确的手机号',
                    icon: 'none'
                })
                retainBtnLoading = false;
                return;
            }

            let params = {
                companyId: companyId * 1,
                phone,
                stayId,
                vistorId: mantisChat.uid
            };
            if (phoneCode) {
                params.phoneCode = phoneCode;
            }

            wx.request({
                url,
                data: params,
                method: 'POST',
                success: res => {
                    retainBtnLoading = false;
                    if (res.data && res.data.flag === 1) {
                        wx.setStorage({
                            key: 'mantisSendTelFlag',
                            data: 'Y'
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
                            wx.setStorage({
                                key: 'mantisRetainTel',
                                data: phone
                            });
                        }
                    } else {
                        let msg = '提交失败';
                        if (res && res.data && res.data.message) {
                            msg = res.data.message;
                        }
                        wx.showToast({
                            title: msg,
                            icon: 'none'
                        })
                    }
                },
                fail: () => {
                    retainBtnLoading = false;
                    // 提交失败
                    wx.showToast({
                        title: '提交失败',
                        icon: 'error'
                    })
                }
            });
        },
        savePickerRange(msgData) {
            if (msgData.is_submit !== 'Y') {
                msgData.formData.fieldList.forEach(item => {
                    if (item.fieldForm.fieldType === "OPTION") {
                        let msgId = msgData.msgId || msgData._id;
                        let pickerName = item.name;
                        let pickerList = item.fieldForm.option;
                        let visitorForm = {...this.data.visitorForm};
                        if (!visitorForm[msgId]) {
                            visitorForm[msgId] = {};
                        }
                        visitorForm[msgId][pickerName] = pickerList;
                        this.setData({
                            visitorForm
                        })
                    }
                });
            }
        },
        bindPickerChange: function (e) {
            console.log('picker发送选择改变，携带值为', e.detail.value);
            let {msgid, name} = e.target.dataset;
            let visitorForm = {...this.data.visitorForm};
            visitorForm[msgid][name + 'value'] = visitorForm[msgid][name][e.detail.value];
            this.setData({
                visitorForm
            })
        },
        imgLoadComplete() {
            this.setData({
                scrollBottomId: 'scrollDown'
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
                'companyId': probeData.companyId,
                'pageUrl': paras.pageUrl,
                'projectId': paras.projectId,
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
                                    title: '留言成功,请耐心等待通知',
                                    icon: 'none'
                                });
                            }
                        } else {
                            if (callbackFail) {
                                callbackFail();
                            } else {
                                wx.showToast({
                                    title: '留言出错，请咨询在线客服',
                                    icon: 'none'
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
            const {mantisChat, probeData, probeId, params} = this.data;
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
                company: probeData.companyId,
                buId: probeData.buId,
                page_title: '',
                url: mantisChat.chatPageUrl,
                media: "mobile",
                browser: this.getDeviceInfo(),
                is_lp: isLpStr,
                lp: mantisChat.chatPageUrl,
                lp_calc: "REFER",
                projectId: probeData.projectId,
                pageparam: params.pageparam,
                thirdUserId: params.userId,
                thirdAccount: params.account,
                probeId,
                serviceGroupId: probeData.defaultSvgId
            };
            en.type = "E";
            wx.request({
                url: "https://tk" + probeData.chatServer + "/u/1.gif",
                data: en,
                method: 'GET',
                success: res => {
                    if (!res) {
                        mantisNew.e_id = null;
                        console.error("fail to save t, undefined!");
                        wx.showToast({
                            title:'fail to save t, undefined!',
                            iocn:'none'
                        });
                        _this.handleMantis(mantisNew);
                        return;
                    }
                    //返回当前页面的轨迹的Id
                    if (res.error) {
                        mantisNew.e_id = null;
                        console.error("fail to save t, error!");
                        wx.showToast({
                            title:'fail to save t, undefined!',
                            iocn:'none'
                        });
                        _this.handleMantis(mantisNew);
                        return;
                    }
                    let data = res.data;
                    mantisNew.trackInfo = data;
                    mantisNew.trackRetry = 0;

                    //{trackId:r.insertedId, site_id:obj.siteId, ad:obj.referInfo.ad, plan:obj.plan, unit:obj.unit, subUnit:obj.subUnit, creative:obj.creative, url_mathced:true/false}
                    mantisNew.e_id = this.mantisGetTrackId(data.trackId);
                    mantisNew.trackId = data.trackId;
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
                            let autoChatDelay = probeData.mbAutoChatDelay;
                            if (typeof autoChatDelay === "undefined") {
                                autoChatDelay = -1;
                            }

                            if (isNaN(autoChatDelay)) {
                                autoChatDelay = -1;
                            }

                            if (autoChatDelay === -1 && !probeData.robotChatNotAuto) {
                                setTimeout(function () {
                                    if (mantisChat.chat.hasChat) {
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
                fail: (e) => {
                    console.log(e);
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
            const _this = this;
            const {mantis, mantisChat, probeData} = this.data;
            if(trackCount >= 50){
                return;
            }
            let liveInfo = {};
            liveInfo.type = "L";
            liveInfo.e_id = mantis.e_id;

            if (!beginTime) {
                beginTime = new Date().getTime();
            }
            liveInfo.ttl = Math.floor((new Date().getTime() - beginTime) / 1000);
            if (liveInfo.ttl <= 0) {
                return;
            }
            beginTime = new Date().getTime();
            liveInfo.company = probeData.companyId;
            liveInfo.buId = probeData.buId;
            liveInfo.serviceGroupId = mantisChat.serviceGroupId;
            liveInfo.uid = mantisChat.uid;
            liveInfo.defaultSg = probeData.defaultSvgId;
            liveInfo.why = why;
            liveInfo.v_id = mantis.v_id;

            // 是否是聊天模式
            liveInfo.mode = "no";
            trackCount++;
            wx.request({
                url: "https://tk" + probeData.chatServer + "/u/1.gif",
                data: liveInfo,
                method: 'GET',
                success: res => {
                    let data = res.data;
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
                            if (!!inviteInfo && !_this.data.isShowChat && !_this.data.isShowLeave) {
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
                fail: (e) => {
                    console.log(e);
                    console.error("Post TTL information error-sendClick");
                }
            });
        },
        msgReplaceQrCode(msg) {
            if (/mantisWechatQrCode/.test(msg)) {
                msg = msg.replace(/<img\s?class\s?=\s?'?"?mantisWechatQrCode'?"?[^>]*>/g, '')
            }
            return msg;
        },
        msgReplaceImgWidth(msg) {
            if (!/\/chat\/emoji/.test(msg)) {
                msg = msg.replace(/<img/g, "<img style='max-width:100%;'");
            } else {
                msg = msg.replace(/<img/g, '<img class="emojiImg" style="width:30px;height:30px"');
            }
            return msg;
        },
        //获取设备信息
        getDeviceInfo() {
            const res = wx.getSystemInfoSync();
            let deviceInfo = '';
            deviceInfo = '设备品牌：' + res.brand + ';设备型号：' + res.model + ';微信版本：' + res.version + ';系统版本：' + res.system;
            return {
                ua: deviceInfo,
                "type": "wechat-minProgram"
            }
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
            this.sendAiMsg('该访客复制了微信号');
            wx.setClipboardData({
                data: e.target.dataset.text,
                success: function (res) {
                    wx.getClipboardData({
                        success: function (res) {
                            wx.showToast({
                                title: '复制成功'
                            });
                        }
                    })
                }
            })
        },
        handleRandom(n, m) {
            return Math.round(Math.random() * (m - n) + n);
        },
        getIp() {
            const {mantisChat} = this.data;
            wx.request({
                url: 'https://ip-service-pb.bjmantis.net/outer/calcIp',
                method: 'POST',
                data: {
                    uid: mantisChat.uid
                },
                success: res => {
                    let ipInfo = {
                        ip: res.data.ip,
                        country: res.data.country,
                        ip_city: res.data.city,
                        ip_province: res.data.region,
                    }
                    this.setData({ipInfo});
                },
                fail(res) {
                    console.log(res);
                }
            })
        }
    },
    export() {
        return this
    }
})
