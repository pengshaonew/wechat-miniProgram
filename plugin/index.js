module.exports = {
  sayHello() {
    console.log('Hello plugin!')
    console.log(this.answer);
  },
  login(){
    wx.login({
      provider: 'weixin',
      success:  loginRes => {
        console.log(loginRes.code);
        this.userCode = loginRes.code;
      }
    });
  },
  // 获取openID
  async getOpenid(){
    let params = {
      appid:'wx8bda0c57123111e7',
      secret: 'ccc431411276f087b41f680275e457a8',
      js_code: this.userCode,
      grant_type: 'authorization_code',
    }
    await wx.request({
      url: 'https://api.weixin.qq.com/sns/jscode2session',
      data: params,
      success: (res) => {
        console.log(res.data);
        this.openID = res.data.openid;
        console.log('openID:'+this.openID)
      }
    });
  },
  answer: 42
}
