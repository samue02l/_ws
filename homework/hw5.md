# 博客程式解析


//以下是使用Chatgpt进行的对话和blog程式解析，使用的blog程式是老师提供的07-session/03-blogSignup

# app.js:
```javascript
import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import * as render from './render.js'
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { Session } from "https://deno.land/x/oak_sessions/mod.ts";

const db = new DB("blog.db");
db.query("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, title TEXT, body TEXT)");
db.query("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, email TEXT)");

const router = new Router();

router.get('/', list)
  .get('/signup', signupUi)
  .post('/signup', signup)
  .get('/login', loginUi)
  .post('/login', login)
  .get('/logout', logout)
  .get('/post/new', add)
  .get('/post/:id', show)
  .post('/post', create)

const app = new Application()
app.use(Session.initMiddleware())
app.use(router.routes());
app.use(router.allowedMethods());

function sqlcmd(sql, arg1) {
  console.log('sql:', sql)
  try {
    var results = db.query(sql, arg1)
    console.log('sqlcmd: results=', results)
    return results
  } catch (error) {
    console.log('sqlcmd error: ', error)
    throw error
  }
}

function postQuery(sql) {
  let list = []
  for (const [id, username, title, body] of sqlcmd(sql)) {
    list.push({id, username, title, body})
  }
  console.log('postQuery: list=', list)
  return list
}

function userQuery(sql) {
  let list = []
  for (const [id, username, password, email] of sqlcmd(sql)) {
    list.push({id, username, password, email})
  }
  console.log('userQuery: list=', list)
  return list
}

async function parseFormBody(body) {
  const pairs = await body.form()
  const obj = {}
  for (const [key, value] of pairs) {
    obj[key] = value
  }
  return obj
}

async function signupUi(ctx) {
  ctx.response.body = await render.signupUi();
}

async function signup(ctx) {
  const body = ctx.request.body
  if (body.type() === "form") {
    var user = await parseFormBody(body)
    console.log('user=', user)
    var dbUsers = userQuery(SELECT id, username, password, email FROM users WHERE username='${user.username}')
    console.log('dbUsers=', dbUsers)
    if (dbUsers.length === 0) {
      sqlcmd("INSERT INTO users (username, password, email) VALUES (?, ?, ?)", [user.username, user.password, user.email]);
      ctx.response.body = render.success()
    } else 
      ctx.response.body = render.fail()
  }
}

async function loginUi(ctx) {
  ctx.response.body = await render.loginUi();
}

async function login(ctx) {
  const body = ctx.request.body
  if (body.type() === "form") {
    var user = await parseFormBody(body)
    var dbUsers = userQuery(SELECT id, username, password, email FROM users WHERE username='${user.username}') // userMap[user.username]
    var dbUser = dbUsers[0]
    if (dbUser.password === user.password) {
      ctx.state.session.set('user', user)
      console.log('session.user=', await ctx.state.session.get('user'))
      ctx.response.redirect('/');
    } else {
      ctx.response.body = render.fail()
    }
  }
}

async function logout(ctx) {
   ctx.state.session.set('user', null)
   ctx.response.redirect('/')
}

async function list(ctx) {
  let posts = postQuery("SELECT id, username, title, body FROM posts")
  console.log('list:posts=', posts)
  ctx.response.body = await render.list(posts, await ctx.state.session.get('user'));
}

async function add(ctx) {
  var user = await ctx.state.session.get('user')
  if (user != null) {
    ctx.response.body = await render.newPost();
  } else {
    ctx.response.body = render.fail()
  }
}

async function show(ctx) {
  const pid = ctx.params.id;
  let posts = postQuery(SELECT id, username, title, body FROM posts WHERE id=${pid})
  let post = posts[0]
  console.log('show:post=', post)
  if (!post) ctx.throw(404, 'invalid post id');
  ctx.response.body = await render.show(post);
}

async function create(ctx) {
  const body = ctx.request.body
  if (body.type() === "form") {
    var post = await parseFormBody(body)
    console.log('create:post=', post)
    var user = await ctx.state.session.get('user')
    if (user != null) {
      console.log('user=', user)
      sqlcmd("INSERT INTO posts (username, title, body) VALUES (?, ?, ?)", [user.username, post.title, post.body]);  
    } else {
      ctx.throw(404, 'not login yet!');
    }
    ctx.response.redirect('/');
  }
}

console.log('Server run at http://127.0.0.1:8000')
await app.listen({ port: 8000 }); 

```
# render.js:
```javascript
  export function layout(title, content) {
  return 
  <html>
  <head>
    <title>${title}</title>
    <style>
      body {
        padding: 80px;
        font: 16px Helvetica, Arial;
      }
  
      h1 {
        font-size: 2em;
      }
  
      h2 {
        font-size: 1.2em;
      }
  
      #posts {
        margin: 0;
        padding: 0;
      }
  
      #posts li {
        margin: 40px 0;
        padding: 0;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
        list-style: none;
      }
  
      #posts li:last-child {
        border-bottom: none;
      }
  
      textarea {
        width: 500px;
        height: 300px;
      }
  
      input[type=text],input[type=password],
      textarea {
        border: 1px solid #eee;
        border-top-color: #ddd;
        border-left-color: #ddd;
        border-radius: 2px;
        padding: 15px;
        font-size: .8em;
      }
  
      input[type=text],input[type=password] {
        width: 500px;
      }
    </style>
  </head>
  <body>
    <section id="content">
      ${content}
    </section>
  </body>
  </html>
  
}

```javascript
export function loginUi() {
  return layout('Login', 
  <h1>Login</h1>
  <form action="/login" method="post">
    <p><input type="text" placeholder="username" name="username"></p>
    <p><input type="password" placeholder="password" name="password"></p>
    <p><input type="submit" value="Login"></p>
    <p>New user? <a href="/signup">Create an account</p>
  </form>
  )
}

export function signupUi() {
  return layout('Signup', 
  <h1>Signup</h1>
  <form action="/signup" method="post">
    <p><input type="text" placeholder="username" name="username"></p>
    <p><input type="password" placeholder="password" name="password"></p>
    <p><input type="text" placeholder="email" name="email"></p>
    <p><input type="submit" value="Signup"></p>
  </form>
  )
}

export function success() {
  return layout('Success', 
  <h1>Success!</h1>
  You may <a href="/">read all Post</a> / <a href="/login">login</a> again !
  )
}

export function fail() {
  return layout('Fail', 
  <h1>Fail!</h1>
  You may <a href="/">read all Post</a> or <a href="JavaScript:window.history.back()">go back</a> !
  )
}

export function list(posts, user) {
  console.log('list: user=', user)
  let list = []
  for (let post of posts) {
    list.push(
    <li>
      <h2>${ post.title } -- by ${post.username}</h2>
      <p><a href="/post/${post.id}">Read post</a></p>
    </li>
    )
  }
  let content = 
  <h1>Posts</h1>
  <p>${(user==null)?'<a href="/login">Login</a> to Create a Post!':'Welcome '+user.username+', You may <a href="/post/new">Create a Post</a> or <a href="/logout">Logout</a> !'}</p>
  <p>There are <strong>${posts.length}</strong> posts!</p>
  <ul id="posts">
    ${list.join('\n')}
  </ul>
  
  return layout('Posts', content)
}

export function newPost() {
  return layout('New Post', 
  <h1>New Post</h1>
  <p>Create a new post.</p>
  <form action="/post" method="post">
    <p><input type="text" placeholder="Title" name="title"></p>
    <p><textarea placeholder="Contents" name="body"></textarea></p>
    <p><input type="submit" value="Create"></p>
  </form>
  )
}

export function show(post) {
  return layout(post.title, 
    <h1>${post.title} -- by ${post.username}</h1>
    <p>${post.body}</p>
  )
} 

```markdown
与Chatgpt的对话
我：将以上的app.js和render.js用ChatGPT 協助并讀懂一個 Blog 的程式範例，
Chatgpt:好的，讓我們詳細分析這個博客應用的 app.js 和 render.js 文件，並理解它們如何協同工作。

```
# app.js 檔案解析

## 1. 引入依賴和初始化數據庫
```javascript
import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import * as render from './render.js';
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { Session } from "https://deno.land/x/oak_sessions/mod.ts";

const db = new DB("blog.db");
db.query("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, title TEXT, body TEXT)");
db.query("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, email TEXT)");

*功能：引入 Oak 框架和 SQLite 數據庫模組，初始化數據庫，創建 posts 和 users 表。

```
## 2.路由設置
```javascript
const router = new Router();

router.get('/', list)
  .get('/signup', signupUi)
  .post('/signup', signup)
  .get('/login', loginUi)
  .post('/login', login)
  .get('/logout', logout)
  .get('/post/new', add)
  .get('/post/:id', show)
  .post('/post', create);

*功能：設定各種路由，對應的請求會被導向特定的處理函數，例如 /signup 對應 signupUi。

```
## 3.SQL 執行函數
```javascript
function sqlcmd(sql, arg1) {
  console.log('sql:', sql);
  try {
    var results = db.query(sql, arg1);
    console.log('sqlcmd: results=', results);
    return results;
  } catch (error) {
    console.log('sqlcmd error: ', error);
    throw error;
  }
}

*功能：執行 SQL 語句並處理可能的錯誤。

```
## 4.用戶註冊和登錄
signup 和 login 函數處理用戶的註冊和登錄邏輯，驗證用戶資料並建立會話。

##  5.文章管理
包括 list (列出所有文章)、add (顯示新增文章頁面)、show (顯示特定文章) 和 create (處理新增文章的邏輯)。

##  6.啟動伺服器
```javascript
const app = new Application();
app.use(Session.initMiddleware());
app.use(router.routes());
app.use(router.allowedMethods());

console.log('Server run at http://127.0.0.1:8000');
await app.listen({ port: 8000 });

//功能：初始化應用，設置中介軟體，啟動伺服器。

```
# render.js 檔案解析
```javascript

```
##  1.layout 函數
```javascript
export function layout(title, content) {
  return `...`;
}

//功能：生成一個基本的 HTML 頁面框架，接受標題和內容作為參數。

```
##  2.用戶界面渲染函數
loginUi、signupUi、success 和 fail 函數分別用於生成登錄、註冊、成功和失敗頁面的 HTML。

##  3.文章列表和顯示
```javascript
1.list(posts, user)：生成顯示所有文章的頁面，根據用戶是否登錄來顯示不同的信息。
2.newPost()：生成新的文章創建頁面。
3.show(post)：顯示特定文章的內容。

```
## 總結

### 1.應用架構：
app.js 負責後端邏輯，包括路由、數據庫交互和會話管理；render.js 則負責生成 HTML 頁面，將數據渲染到前端。

### 2.流程：
用戶訪問不同的路由，觸發相應的處理函數，這些函數從數據庫獲取數據，然後使用 render.js 中的函數生成 HTML 頁面並返回給用戶。