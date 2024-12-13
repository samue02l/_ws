import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import * as render from './render.js';
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { Session } from "https://deno.land/x/oak_sessions/mod.ts";

// 创建数据库连接
const db = new DB("blog.db");
db.query("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, title TEXT, body TEXT)");
db.query("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, email TEXT)");

const router = new Router();

// 设置路由
router.get('/', list)                  // 显示所有文章
  .get('/signup', signupUi)            // 注册页面
  .post('/signup', signup)             // 注册提交
  .get('/login', loginUi)              // 登录页面
  .post('/login', login)               // 登录提交
  .get('/logout', logout)              // 注销
  .get('/post/new', add)               // 创建新文章页面
  .get('/post/:id', show)              // 显示文章
  .post('/post', create)               // 创建文章提交
  .get('/list/:user', listUserPosts);  // 显示特定用户的文章

// 创建应用程序
const app = new Application();
app.use(Session.initMiddleware());
app.use(router.routes());
app.use(router.allowedMethods());

// SQL 执行函数
function sqlcmd(sql, arg1) {
  try {
    var results = db.query(sql, arg1);
    return results;
  } catch (error) {
    throw error;
  }
}

// 查询所有帖子
function postQuery(sql) {
  let list = [];
  for (const [id, username, title, body] of sqlcmd(sql)) {
    list.push({ id, username, title, body });
  }
  return list;
}

// 查询用户
function userQuery(sql) {
  let list = [];
  for (const [id, username, password, email] of sqlcmd(sql)) {
    list.push({ id, username, password, email });
  }
  return list;
}

// 解析表单数据
async function parseFormBody(body) {
  const pairs = await body.form();
  const obj = {};
  for (const [key, value] of pairs) {
    obj[key] = value;
  }
  return obj;
}

// 注册页面渲染
async function signupUi(ctx) {
  ctx.response.body = await render.signupUi();
}

// 注册处理
async function signup(ctx) {
  const body = ctx.request.body;
  if (body.type() === "form") {
    var user = await parseFormBody(body);
    var dbUsers = userQuery(`SELECT id, username, password, email FROM users WHERE username='${user.username}'`);
    if (dbUsers.length === 0) {
      sqlcmd("INSERT INTO users (username, password, email) VALUES (?, ?, ?)", [user.username, user.password, user.email]);
      ctx.response.body = render.success();
    } else {
      ctx.response.body = render.fail();
    }
  }
}

// 登录页面渲染
async function loginUi(ctx) {
  ctx.response.body = await render.loginUi();
}

// 登录处理
async function login(ctx) {
  const body = ctx.request.body;
  if (body.type() === "form") {
    var user = await parseFormBody(body);
    var dbUsers = userQuery(`SELECT id, username, password, email FROM users WHERE username='${user.username}'`);
    var dbUser = dbUsers[0];
    if (dbUser && dbUser.password === user.password) {
      ctx.state.session.set('user', user);
      ctx.response.redirect('/');
    } else {
      ctx.response.body = render.fail();
    }
  }
}

// 注销处理
async function logout(ctx) {
  ctx.state.session.set('user', null);
  ctx.response.redirect('/');
}

// 显示所有文章
async function list(ctx) {
  let posts = postQuery("SELECT id, username, title, body FROM posts");
  ctx.response.body = await render.list(posts, await ctx.state.session.get('user'));
}

// 创建新文章页面
async function add(ctx) {
  var user = await ctx.state.session.get('user');
  if (user != null) {
    ctx.response.body = await render.newPost();
  } else {
    ctx.response.body = render.fail();
  }
}

// 显示单篇文章
async function show(ctx) {
  const pid = ctx.params.id;
  let posts = postQuery(`SELECT id, username, title, body FROM posts WHERE id=${pid}`);
  let post = posts[0];
  if (!post) ctx.throw(404, 'Invalid post id');
  ctx.response.body = await render.show(post);
}

// 创建文章处理
async function create(ctx) {
  const body = ctx.request.body;
  if (body.type() === "form") {
    var post = await parseFormBody(body);
    var user = await ctx.state.session.get('user');
    if (user != null) {
      sqlcmd("INSERT INTO posts (username, title, body) VALUES (?, ?, ?)", [user.username, post.title, post.body]);
    } else {
      ctx.throw(404, 'Not logged in!');
    }
    ctx.response.redirect('/');
  }
}

// 显示指定用户的文章
async function listUserPosts(ctx) {
  const username = ctx.params.user;
  let posts = postQuery(`SELECT id, username, title, body FROM posts WHERE username='${username}'`);
  ctx.response.body = await render.list(posts, await ctx.state.session.get('user'), username);
}

console.log('Server run at http://127.0.0.1:8000');
await app.listen({ port: 8000 });
