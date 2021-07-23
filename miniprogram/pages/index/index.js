const plugin = requirePlugin('mantisChat')
Page({
    data: {
       
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
    onPageScroll (e) {
        console.log('滚起来', wx.getSystemInfoSync().windowHeight);
    },
    mantisRequestChat() {
        this.mantisChat._requestChat();
    }
})
