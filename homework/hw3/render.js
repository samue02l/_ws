export function layout(title, content) {
    return `
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
  
        input[type=text], textarea {
          border: 1px solid #eee;
          border-top-color: #ddd;
          border-left-color: #ddd;
          border-radius: 2px;
          padding: 15px;
          font-size: .8em;
        }
  
        input[type=text] {
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
    `
  }
  
  export function userList(users) {
    let listHtml = []
    for (let user of users) {
      listHtml.push(`<li><a href="/${user[1]}/">${user[1]}</a></li>`)
    }
    return layout('User List', `<ul>${listHtml.join('\n')}</ul>`)
  }
  
  export function list(posts, user) {
    let list = []
    for (let post of posts) {
      list.push(`
      <li>
        <h2>${post.title}</h2>
        <p><a href="/${user}/post/${post.id}">Read post</a></p>
      </li>
      `)
    }
    let content = `
    <h1>${user}'s Posts</h1>
    <p>You have <strong>${posts.length}</strong> posts!</p>
    <p><a href="/${user}/post/new">Create a Post</a></p>
    <ul id="posts">
      ${list.join('\n')}
    </ul>
    `
    return layout(`${user}'s Posts`, content)
  }
  
  export function newPost(user) {
    return layout('New Post', `
    <h1>Create a New Post</h1>
    <form action="/${user}/post" method="post">
      <p><input type="text" placeholder="Title" name="title"></p>
      <p><textarea placeholder="Contents" name="body"></textarea></p>
      <p><input type="submit" value="Create"></p>
    </form>
    `)
  }
  
  export function show(post) {
    return layout(post.title, `
      <h1>${post.title}</h1>
      <p>${post.body}</p>
    `)
  }
