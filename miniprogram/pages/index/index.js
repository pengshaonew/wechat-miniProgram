const plugin = requirePlugin('mantisChat')
Page({
    data: {
        params: {}
    },
    onLoad() {
        plugin.sayHello()
        // const world = plugin.answer
        this.setData({
            params: {miniProgramParams: 'sku=1077777&platform=1&gdt_vid=wx0ewinbalytptma00&weixinadinfo=20966864.wx0ewinbalytptma00.0.1'}
        })
    },
    onReady() {
        this.mantisChat = this.selectComponent('#mantisChat');
        this.messageAudio = wx.createAudioContext('message');
        this.messageAudio.setSrc('https://probe.bjmantis.net/chat/13203.mp3');
    },
    mantisRequestChat() {
        this.mantisChat._requestChat();
    },
    handleSubmit() {
        let obj = {
            phone: '13123123123',
            name: '张三',
            content:'备注内容',
            others: {
                area:'地域值',
                qq:'QQ',
                weChat:'微信',
                customerFieldMap:{  // 自定义字段,此对象中的字段如果和系统中自定义字段对应上就会显示在转客后对应字段的位置，如果对应不上会显示在转客后的备注里
                    "年龄":'24',
                    "兴趣":'运动'
                }
            }
        }
        this.mantisChat._sendPage(obj);
    }
})
