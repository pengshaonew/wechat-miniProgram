# 螳螂客服

### 引入插件代码包

> 使用插件前，使用者要在 app.json 中声明需要使用的插件，例如：

```json

{
    "plugins": {
        "mantisChat": {
            "version": "dev",
            "provider": "wxc6e2bf2f6fc2e53a"
        }
    }
}

```

> 需要使用的螳螂客服的页面的埋码：

- json文件配置

```json

{
    "usingComponents": {
        "mantisChat": "plugin://mantisChat/mantisChat"
    }
}
```

- wxml文件

```html

<button bindtap="mantisRequestChat">发起会话</button>
<mantisChat id="mantisChat"/>
```

- js文件

```javascript
{
    onReady(){
        this.mantisChat = this.selectComponent('#mantisChat');
    }
    mantisRequestChat(){
        this.mantisChat.requestChat();
    }
}

```




[comment]: <> (这个文件用于书写插件文档，引用图片时必须以**相对路径**引用 ***doc*** 目录下的本地图片，不能使用网络图片或非 ***doc*** 目录下的图片。以下是相对路径的引用示例：)

[comment]: <> (![链接]&#40;./example.jpeg&#41;)

[comment]: <> (使用编辑器下方的上传按钮可以上传插件文档，上传的内容包括 doc 目录下的 README.md 和图片。)




