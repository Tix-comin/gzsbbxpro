# 高中生涯百宝箱Pro - 部署指南

本项目提供两种轻后端部署方案，您可以根据需求选择合适的方案。

## 方案一：Cloudflare Pages + Workers + KV存储（推荐）

### 前置要求
- 一个Cloudflare账号（免费）
- 已安装Git

### 部署步骤

#### 1. 准备项目
```bash
cd 高中生百宝箱
```

#### 2. 创建Cloudflare KV命名空间
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **KV**
3. 点击 **Create namespace**
4. 命名为：`BAOXIANG_DATA`
5. 点击 **Add**

#### 3. 安装Wrangler CLI
```bash
npm install -g wrangler
```

#### 4. 登录Wrangler
```bash
wrangler login
```

#### 5. 创建wrangler.toml配置文件
在项目根目录创建 `wrangler.toml`：
```toml
name = "baoxiang-backend"
main = "backend-cloudflare.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "BAOXIANG_DATA"
id = "你的KV命名空间ID"  # 从Cloudflare Dashboard复制
```

#### 6. 部署Worker
```bash
wrangler deploy
```

#### 7. 部署前端到Cloudflare Pages
1. 在Cloudflare Dashboard进入 **Workers & Pages** → **Create application** → **Pages**
2. 选择 **Upload assets**
3. 上传项目文件夹（除了backend相关文件）
4. 等待部署完成

#### 8. 配置前端API地址
修改 `js/user.js` 和 `js/chat.js` 中的API_BASE_URL：
```javascript
const API_BASE_URL = 'https://你的worker-subdomain.workers.dev';
```

---

## 方案二：Gitee Pages + Node.js Express后端

### 前置要求
- 一个Gitee账号
- 一台可以运行Node.js的服务器（或本地开发）
- 已安装Node.js 16+

### 部署步骤

#### 1. 准备后端
```bash
cd 高中生百宝箱
npm install
```

#### 2. 本地测试后端
```bash
npm start
```
后端将运行在 `http://localhost:3000`

#### 3. 部署后端到服务器
1. 将项目上传到你的服务器
2. 在服务器上运行：
```bash
npm install
npm start
```

#### 4. 使用PM2守护进程（推荐）
```bash
npm install -g pm2
pm2 start backend-gitee.js --name baoxiang-backend
pm2 save
pm2 startup
```

#### 5. 配置Nginx反向代理（可选但推荐）
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        root /path/to/your/frontend;
        try_files $uri $uri/ /index.html;
    }
}
```

#### 6. 部署前端到Gitee Pages
1. 创建Gitee仓库
2. 上传前端文件（index.html, css/, js/, icons/, manifest.json）
3. 进入仓库的 **服务** → **Gitee Pages**
4. 选择分支，点击 **启动**

#### 7. 配置前端API地址
修改 `js/user.js` 和 `js/chat.js` 中的API_BASE_URL：
```javascript
const API_BASE_URL = 'http://your-server-ip:3000';
// 或使用域名
const API_BASE_URL = 'https://your-domain.com';
```

---

## DeepSeek API配置

在 `js/chat.js` 文件中设置您的DeepSeek API密钥：

```javascript
const Chat = {
    messages: [],
    isLoading: false,
    deepseekApiKey: 'sk-your-api-key-here', // 在这里添加您的API密钥
    
    // ... 其他代码
};
```

获取API密钥：
1. 访问 [DeepSeek开放平台](https://platform.deepseek.com/)
2. 注册/登录账号
3. 在API Keys页面创建新的API密钥
4. 将密钥复制到上面的位置

---

## API接口文档

### 用户注册
- **接口**: `POST /api/register`
- **参数**: 
  ```json
  {
    "id": "100001",
    "name": "用户名",
    "password": "123456",
    "avatar": "👤",
    "age": "16",
    "gender": "男"
  }
  ```

### 用户登录
- **接口**: `POST /api/login`
- **参数**:
  ```json
  {
    "id": "100001",
    "password": "123456"
  }
  ```

### 获取用户信息
- **接口**: `GET /api/user/:id`

### 更新用户资料
- **接口**: `PUT /api/user/update`
- **参数**:
  ```json
  {
    "id": "100001",
    "name": "新用户名",
    "avatar": "🧑‍🎓",
    "age": "17",
    "gender": "女"
  }
  ```

### 添加好友
- **接口**: `POST /api/friends/add`
- **参数**:
  ```json
  {
    "userId": "100001",
    "friendId": "100002"
  }
  ```

### 获取好友列表
- **接口**: `GET /api/friends/:userId`

### 保存聊天消息
- **接口**: `POST /api/chat/save`
- **参数**:
  ```json
  {
    "userId": "100001",
    "messages": [...]
  }
  ```

### 获取聊天消息
- **接口**: `GET /api/chat/:userId`

---

## 注意事项

1. **安全性**: 
   - 生产环境请使用HTTPS
   - 不要将API密钥提交到公开仓库
   - 建议对密码进行加密存储

2. **数据备份**:
   - Cloudflare KV会自动备份
   - SQLite数据库文件请定期备份

3. **扩展功能**:
   - 两种方案都可以轻松扩展更多功能
   - 建议先在本地测试后再部署

4. **成本**:
   - Cloudflare方案免费额度充足
   - Gitee Pages免费，但服务器可能需要成本

---

## 故障排除

### Cloudflare Worker部署失败
- 检查wrangler.toml中的KV ID是否正确
- 确保已登录Wrangler
- 查看Cloudflare Dashboard的日志

### 后端无法启动
- 检查Node.js版本是否≥16
- 运行 `npm install` 安装依赖
- 检查端口3000是否被占用

### 前端无法连接后端
- 检查API地址配置是否正确
- 检查CORS配置
- 查看浏览器控制台的网络请求

### 聊天功能不工作
- 确认DeepSeek API密钥已正确设置
- 检查API密钥是否有效且有额度
- 查看浏览器控制台的错误信息
