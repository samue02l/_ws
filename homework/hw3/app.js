// 使用了老师提供的sqlite blog 沒有分版的程式和blog 記憶體有分版的程式

import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import * as render from './render.js';
import { DB } from "https://deno.land/x/sqlite/mod.ts";

const db = new DB("blog.db");

// 创建表格，如果没有的话
db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL
  )
`);
db.query(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    body TEXT,
    user_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`);

const router = new Router();

router.get('/', userList)  // 展示所有用户
  .get('/:user', list)  // 展示某个用户的帖子
  .get('/:user/post/new', add)  // 创建新帖子页面
  .get('/:user/post/:id', show)  // 展示特定帖子
  .post('/:user/post', create);  // 提交新帖子

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

// 查询用户和他们的帖子
function query(sql, params = []) {
  let list = [];
  for (const row of db.query(sql, params)) {
    list.push(row);
  }
  return list;
}

// 显示所有用户列表
async function userList(ctx) {
  let users = query("SELECT id, username FROM users");
  ctx.response.body = await render.userList(users);
}

// 显示指定用户的帖子列表
async function list(ctx) {
  const user = ctx.params.user;  // 获取用户名
  let users = query("SELECT id, username FROM users WHERE username = ?", [user]);
  
  if (users.length === 0) {
    ctx.throw(404, 'User not found');
  }

  let userId = users[0][0];  // 获取用户ID
  let posts = query("SELECT id, title, body FROM posts WHERE user_id = ?", [userId]);

  ctx.response.body = await render.list(posts, user);
}

// 显示新帖子的表单
async function add(ctx) {
  const user = ctx.params.user;  // 获取用户名
  ctx.response.body = await render.newPost(user);
}

// 显示特定帖子的内容
async function show(ctx) {
  const user = ctx.params.user;  // 获取用户名
  const postId = ctx.params.id;  // 获取帖子ID
  let posts = query("SELECT id, title, body FROM posts WHERE id = ?", [postId]);

  if (posts.length === 0) {
    ctx.throw(404, 'Post not found');
  }

  ctx.response.body = await render.show(posts[0]);
}

// 创建新帖子
async function create(ctx) {
  const user = ctx.params.user;  // 获取用户名
  const body = ctx.request.body();
  
  if (body.type() === "form") {
    const pairs = await body.form();
    const post = {};

    for (const [key, value] of pairs) {
      post[key] = value;
    }

    let users = query("SELECT id FROM users WHERE username = ?", [user]);
    if (users.length === 0) {
      ctx.throw(404, 'User not found');
    }
    
    let userId = users[0][0];
    db.query("INSERT INTO posts (title, body, user_id) VALUES (?, ?, ?)", [post.title, post.body, userId]);

    ctx.response.redirect(`/${user}`);
  }
}

let port = parseInt(Deno.args[0]) || 8000;
console.log(`Server running at http://127.0.0.1:${port}`);
await app.listen({ port });
