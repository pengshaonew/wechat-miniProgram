// const plugin = requirePlugin('hello-plugin')
Page({
    data: {
       
    },
    onLoad() {
        // plugin.sayHello()
        // const world = plugin.answer
    },
    onReady() {
        this.mantisChat = this.selectComponent('#mantisChat');
        wx.setStorage({
            key:"mantisTel",
            data:"18234059274"
        })
    },
    mantisRequestChat() {
        this.mantisChat._requestChat();
    }
})
