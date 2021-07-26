const plugin = requirePlugin('mantisChat')
Page({
    data: {
        param: {
            phone: 13123123123,
            chatPageUrl: 'https://demo2.bjmantis.net/chat/t1/chat.html?mcid=3401&mpid=60f6335542e6827c32c4d8bb'
        }
    },
    onLoad() {
        plugin.sayHello()
        // const world = plugin.answer
    },
    onReady() {
        this.mantisChat = this.selectComponent('#mantisChat');
        // wx.setStorage({
        //     key:"mantisTel",
        //     data:"18234059274"
        // })
    },
    onPageScroll(e) {
        console.log('滚起来', wx.getSystemInfoSync().windowHeight);
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
