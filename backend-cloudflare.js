// 轻后端方案一：Cloudflare Workers + KV存储
// 部署到Cloudflare Workers
// 需要先在Cloudflare创建一个KV命名空间，命名为BAOXIANG_DATA

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // 允许跨域请求
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // 用户注册
      if (path === '/api/register' &amp;&amp; method === 'POST') {
        const data = await request.json();
        const { id, name, password, avatar, age, gender } = data;
        
        if (!id || !password) {
          return new Response(JSON.stringify({ success: false, message: 'ID和密码不能为空' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const existingUser = await env.BAOXIANG_DATA.get(`user:${id}`);
        if (existingUser) {
          return new Response(JSON.stringify({ success: false, message: '用户ID已存在' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const userData = {
          id,
          name: name || '用户',
          password,
          avatar: avatar || '👤',
          age: age || '',
          gender: gender || '',
          friends: [],
          createdAt: Date.now()
        };
        
        await env.BAOXIANG_DATA.put(`user:${id}`, JSON.stringify(userData));
        
        return new Response(JSON.stringify({ success: true, user: { id, name: userData.name, avatar: userData.avatar } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // 用户登录
      if (path === '/api/login' &amp;&amp; method === 'POST') {
        const data = await request.json();
        const { id, password } = data;
        
        const userData = await env.BAOXIANG_DATA.get(`user:${id}`);
        if (!userData) {
          return new Response(JSON.stringify({ success: false, message: '用户不存在' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const user = JSON.parse(userData);
        if (user.password !== password) {
          return new Response(JSON.stringify({ success: false, message: '密码错误' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          user: { 
            id: user.id, 
            name: user.name, 
            avatar: user.avatar,
            age: user.age,
            gender: user.gender,
            friends: user.friends 
          } 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // 获取用户信息
      if (path.startsWith('/api/user/') &amp;&amp; method === 'GET') {
        const id = path.split('/api/user/')[1];
        const userData = await env.BAOXIANG_DATA.get(`user:${id}`);
        
        if (!userData) {
          return new Response(JSON.stringify({ success: false, message: '用户不存在' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const user = JSON.parse(userData);
        return new Response(JSON.stringify({ 
          success: true, 
          user: { 
            id: user.id, 
            name: user.name, 
            avatar: user.avatar 
          } 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // 更新用户资料
      if (path === '/api/user/update' &amp;&amp; method === 'PUT') {
        const data = await request.json();
        const { id, name, avatar, age, gender } = data;
        
        const userData = await env.BAOXIANG_DATA.get(`user:${id}`);
        if (!userData) {
          return new Response(JSON.stringify({ success: false, message: '用户不存在' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const user = JSON.parse(userData);
        if (name) user.name = name;
        if (avatar) user.avatar = avatar;
        if (age !== undefined) user.age = age;
        if (gender !== undefined) user.gender = gender;
        
        await env.BAOXIANG_DATA.put(`user:${id}`, JSON.stringify(user));
        
        return new Response(JSON.stringify({ success: true, user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // 添加好友
      if (path === '/api/friends/add' &amp;&amp; method === 'POST') {
        const data = await request.json();
        const { userId, friendId } = data;
        
        const userData = await env.BAOXIANG_DATA.get(`user:${userId}`);
        const friendData = await env.BAOXIANG_DATA.get(`user:${friendId}`);
        
        if (!userData || !friendData) {
          return new Response(JSON.stringify({ success: false, message: '用户不存在' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const user = JSON.parse(userData);
        const friend = JSON.parse(friendData);
        
        if (user.friends.includes(friendId)) {
          return new Response(JSON.stringify({ success: false, message: '已经是好友' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        user.friends.push(friendId);
        friend.friends.push(userId);
        
        await env.BAOXIANG_DATA.put(`user:${userId}`, JSON.stringify(user));
        await env.BAOXIANG_DATA.put(`user:${friendId}`, JSON.stringify(friend));
        
        return new Response(JSON.stringify({ 
          success: true, 
          friend: { id: friend.id, name: friend.name, avatar: friend.avatar } 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // 获取好友列表
      if (path.startsWith('/api/friends/') &amp;&amp; method === 'GET') {
        const userId = path.split('/api/friends/')[1];
        const userData = await env.BAOXIANG_DATA.get(`user:${userId}`);
        
        if (!userData) {
          return new Response(JSON.stringify({ success: false, message: '用户不存在' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const user = JSON.parse(userData);
        const friends = [];
        
        for (const friendId of user.friends) {
          const friendData = await env.BAOXIANG_DATA.get(`user:${friendId}`);
          if (friendData) {
            const friend = JSON.parse(friendData);
            friends.push({ id: friend.id, name: friend.name, avatar: friend.avatar });
          }
        }
        
        return new Response(JSON.stringify({ success: true, friends }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // 保存聊天消息
      if (path === '/api/chat/save' &amp;&amp; method === 'POST') {
        const data = await request.json();
        const { userId, messages } = data;
        
        await env.BAOXIANG_DATA.put(`chat:${userId}`, JSON.stringify(messages));
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // 获取聊天消息
      if (path.startsWith('/api/chat/') &amp;&amp; method === 'GET') {
        const userId = path.split('/api/chat/')[1];
        const messagesData = await env.BAOXIANG_DATA.get(`chat:${userId}`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          messages: messagesData ? JSON.parse(messagesData) : [] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ success: false, message: '接口不存在' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ success: false, message: '服务器错误', error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
