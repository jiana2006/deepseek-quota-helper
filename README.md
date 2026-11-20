# 🐾 Valesa 额度小助手

> 一只住在 DeepSeek 网页版右下角的萌宠，每次对话后提醒你还剩多少次使用机会。

![license](https://img.shields.io/badge/license-MIT-green) ![platform](https://img.shields.io/badge/platform-Tampermonkey-blue) ![browser](https://img.shields.io/badge/browser-Chrome%20%2F%20Edge%20%2F%20Firefox-orange)

## ✨ 功能

- 💬 **对话计数**：每次在 DeepSeek 发送消息后自动 +1，弹出气泡播报
- 📊 **进度条**：直观显示剩余额度比例
- 🐱 **Valesa 萌宠**：可爱头像 + 分级语气提醒（额度充足 / 偏少 / 快用完 / 用完）
- 🖱️ **可拖动**：按住头像拖到屏幕任意位置，松手固定（支持触屏）
- ⚙️ **自由配置**：总次数、已用次数均可手动设置和校正
- 💾 **本地存储**：计数保存在浏览器本地，不上传任何数据

## 📦 安装

### 前提

浏览器需安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展（Edge/Chrome/Firefox 商店搜 Tampermonkey 即可）。

### 方法一：从 Release 安装（推荐）

1. 前往 [Releases 页面](https://github.com/jiana2006/deepseek-quota-helper/releases) 下载最新的 `valesa_quota_helper.user.js`
2. 双击文件（或把文件拖进浏览器），Tampermonkey 会自动弹出安装页面
3. 点击「安装」

### 方法二：手动粘贴

1. 点击浏览器右上角 Tampermonkey 图标 → 「添加新脚本」
2. 清空模板，粘贴 `valesa_quota_helper.user.js` 的全部内容
3. `Ctrl + S` 保存

### 手机端

- **Android**：使用 [Kiwi Browser](https://github.com/kiwibrowser) 或 Firefox 安装 Tampermonkey 后，同上操作
- **iOS**：Safari 安装 Userscripts / Gear 扩展，导入脚本

## 🚀 使用

安装后打开 [chat.deepseek.com](https://chat.deepseek.com/)，右下角会出现 Valesa 头像。

| 操作 | 方式 |
|------|------|
| 设置总次数 | 点油猴图标 → 「设置总次数」（默认 50） |
| 额度重置 | 点油猴图标 → 「重置计数」 |
| 校正计数 | 点油猴图标 → 「手动校正已用次数」 |
| 开关气泡 | 单击 Valesa 头像 |
| 移动位置 | 按住头像拖动 |

每次发送消息约 1 秒后，Valesa 会播报当前进度：

```
主人，已用 3 / 50 次
还剩 47 次对话机会
今天状态不错，继续聊吧！
```

## ❓ 常见问题

**计数准吗？**
DeepSeek 网页版没有公开额度 API，脚本通过监听回车/发送按钮本地计数，属于估算。有偏差时用「手动校正已用次数」修正。

**换浏览器 / 清缓存后计数丢了？**
计数存于浏览器本地存储，换个环境需要重新设置总次数并校正已用次数。

**页面右下角看不到 Valesa？**
1. 确认 Tampermonkey 中脚本已启用
2. 确认当前页面是 `https://chat.deepseek.com/*`
3. 刷新页面

## 🛠️ 开发

```
src/valesa_quota_helper.user.js   源码模板（头像为占位符）
valesa_quota_helper.user.js       成品脚本（已内嵌头像 base64）
```

重新生成成品：

```bash
python -c "
import base64
b64 = base64.b64encode(open('avatar.jpg','rb').read()).decode()
src = open('src/valesa_quota_helper.user.js', encoding='utf-8').read()
open('valesa_quota_helper.user.js','w',encoding='utf-8').write(src.replace('__AVATAR_B64__', b64))
"
```

## 📄 协议

[MIT](LICENSE) · 头像图片仅供个人学习交流使用
