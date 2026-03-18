// 轻后端方案二：Node.js Express + SQLite3
// 搭配Gitee Pages使用
// 需要安装依赖: npm install express cors sqlite3 better-sqlite3

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 初始化数据库
const db = new Database('baoxiang.db');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '👤',
    age TEXT,
    gender TEXT,
    friends TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
  
  CREATE TABLE IF NOT EXISTS chats (
    user_id TEXT PRIMARY KEY,
    messages TEXT DEFAULT '[]',
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
`);

// 用户注册
app.post('/api/register', (req, res) =&gt; {
  try {
    const { id, name, password, avatar, age, gender } = req.body;
    
    if (!id || !password) {
      return res.status(400).json({ success: false, message: 'ID和密码不能为空' });
    }
    
    const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户ID已存在' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO users (id, name, password, avatar, age, gender, friends)
      VALUES (?, ?, ?, ?, ?, ?, '[]')
    `);
    
    stmt.run(id, name || '用户', password, avatar || '👤', age || '', gender || '');
    
    res.json({ 
      success: true, 
      user: { id, name: name || '用户', avatar: avatar || '👤' } 
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 用户登录
app.post('/api/login', (req, res) =&gt; {
  try {
    const { id, password } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: '密码错误' });
    }
    
    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        name: user.name, 
        avatar: user.avatar,
        age: user.age,
        gender: user.gender,
        friends: JSON.parse(user.friends || '[]')
      } 
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 获取用户信息
app.get('/api/user/:id', (req, res) =&gt; {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT id, name, avatar FROM users WHERE id = ?').get(id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 更新用户资料
app.put('/api/user/update', (req, res) =&gt; {
  try {
    const { id, name, avatar, age, gender } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    const stmt = db.prepare(`
      UPDATE users 
      SET name = COALESCE(?, name),
          avatar = COALESCE(?, avatar),
          age = COALESCE(?, age),
          gender = COALESCE(?, gender)
      WHERE id = ?
    `);
    
    stmt.run(name || null, avatar || null, age || null, gender || null, id);
    
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    
    res.json({ 
      success: true, 
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        age: updatedUser.age,
        gender: updatedUser.gender,
        friends: JSON.parse(updatedUser.friends || '[]')
      }
    });
  } catch (error) {
    console.error('更新用户资料错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 添加好友
app.post('/api/friends/add', (req, res) =&gt; {
  try {
    const { userId, friendId } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const friend = db.prepare('SELECT * FROM users WHERE id = ?').get(friendId);
    
    if (!user || !friend) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    const userFriends = JSON.parse(user.friends || '[]');
    if (userFriends.includes(friendId)) {
      return res.status(400).json({ success: false, message: '已经是好友' });
    }
    
    // 更新用户好友列表
    userFriends.push(friendId);
    db.prepare('UPDATE users SET friends = ? WHERE id = ?').run(JSON.stringify(userFriends), userId);
    
    // 更新好友的好友列表
    const friendFriends = JSON.parse(friend.friends || '[]');
    friendFriends.push(userId);
    db.prepare('UPDATE users SET friends = ? WHERE id = ?').run(JSON.stringify(friendFriends), friendId);
    
    res.json({ 
      success: true, 
      friend: { id: friend.id, name: friend.name, avatar: friend.avatar } 
    });
  } catch (error) {
    console.error('添加好友错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 获取好友列表
app.get('/api/friends/:userId', (req, res) =&gt; {
  try {
    const { userId } = req.params;
    const user = db.prepare('SELECT friends FROM users WHERE id = ?').get(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    const friendIds = JSON.parse(user.friends || '[]');
    const friends = [];
    
    for (const friendId of friendIds) {
      const friend = db.prepare('SELECT id, name, avatar FROM users WHERE id = ?').get(friendId);
      if (friend) {
        friends.push(friend);
      }
    }
    
    res.json({ success: true, friends });
  } catch (error) {
    console.error('获取好友列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 保存聊天消息
app.post('/api/chat/save', (req, res) =&gt; {
  try {
    const { userId, messages } = req.body;
    
    const existing = db.prepare('SELECT user_id FROM chats WHERE user_id = ?').get(userId);
    
    if (existing) {
      db.prepare('UPDATE chats SET messages = ?, updated_at = strftime(\'%s\', \'now\') WHERE user_id = ?').run(JSON.stringify(messages), userId);
    } else {
      db.prepare('INSERT INTO chats (user_id, messages) VALUES (?, ?)').run(userId, JSON.stringify(messages));
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('保存聊天消息错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 获取聊天消息
app.get('/api/chat/:userId', (req, res) =&gt; {
  try {
    const { userId } = req.params;
    const chat = db.prepare('SELECT messages FROM chats WHERE user_id = ?').get(userId);
    
    res.json({ 
      success: true, 
      messages: chat ? JSON.parse(chat.messages || '[]') : [] 
    });
  } catch (error) {
    console.error('获取聊天消息错误:', error);
    res.status(500).json({ success: false, message: '服务器错误', error: error.message });
  }
});

// 启动服务器
app.listen(PORT, () =&gt; {
  console.log(`轻后端服务运行在 http://localhost:${PORT}`);
  console.log('API文档:');
  console.log('  POST /api/register - 用户注册');
  console.log('  POST /api/login - 用户登录');
  console.log('  GET /api/user/:id - 获取用户信息');
  console.log('  PUT /api/user/update - 更新用户资料');
  console.log('  POST /api/friends/add - 添加好友');
  console.log('  GET /api/friends/:userId - 获取好友列表');
  console.log('  POST /api/chat/save - 保存聊天消息');
  console.log('  GET /api/chat/:userId - 获取聊天消息');
});
