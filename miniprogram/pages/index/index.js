Page({
    data: {
        companyId: 9989,
        array: ['初中及以下','高中', '大专', '本科及以上'],
        objectArray: [
            {
                id: 0,
                name: '初中及以下'
            },
            {
                id: 1,
                name: '高中'
            },
            {
                id: 2,
                name: '大专'
            },
            {
                id: 3,
                name: '本科及以上'
            }
        ],
        index: 0
        // region: ['北京市','北京市','东城区']
    },bindPickerChange: function(e) {
        this.setData({
            index: e.detail.value
        })
    },
    // bindRegionChange: function (e) {
    //   this.setData({
    //     region: e.detail.value
    //   })
    // },
    onReady() {
        this.mantisChat = this.selectComponent('#mantisChat');
    },
    // 发起会话时调用
    mantisRequestChat() {
        this.mantisChat._requestChat();
    },
    // 留言表单提交时调用
    handleSubmit(e) {
        let values = e.detail.value;
        if(values.content ==null){
            wx.showToast({
                title: '请选择您的学历',
                icon: 'none'
            });
            return false;
        }
        if(values.username==""){
            wx.showToast({
                title: '请输入您的姓名',
                icon: 'none'
            });
            return false;
        }else if(!/^([\u4e00-\u9fa5]{2,10})$/.test(values.username)){
            wx.showToast({
                title: '您的姓名有误,请检查确认',
                icon: 'none'
            });
            return false;
        }
        if (!/^1[3-9]\d{9}$/.test(values.phone)) {
            wx.showToast({
                title: '联系方式有误,请检查确认',
                icon: 'none'
            });
            return;
        }
        this.mantisChat._sendPage({
            phone: values.phone,
            name: values.username,
            content: this.data.objectArray[values.content].name
        });
    },
    onShareAppMessage: function () {
        return {
            title: '经济师报考介绍',
            path: '/pages/introduce/index.wxml'
        }
    },
    onShareTimeline: function () {
        return {
            title: '经济师报考介绍'
        }
    }
});