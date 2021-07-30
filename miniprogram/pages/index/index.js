const plugin = requirePlugin('mantisChat')
Page({
    data: {
        param: {}
    },
    onLoad() {
        plugin.sayHello()
        // const world = plugin.answer
    },
    onReady() {
        this.mantisChat = this.selectComponent('#mantisChat');
        this.messageAudio = wx.createAudioContext('message');
        this.messageAudio.setSrc('https://probe.bjmantis.net/chat/13203.mp3');
    },
    onPageScroll(e) {
        // console.log('滚起来', wx.getSystemInfoSync().windowHeight);
    },
    mantisRequestChat() {
        this.mantisChat._requestChat();
    },
    handleSubmit() {
        this.mantisChat._sendPage({
            phone: 13123123123
        });
    }
})
