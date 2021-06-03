const express = require('express')
const cors = require('cors')

const mysql = require('mysql2/promise')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const fs = require('fs')

let config
try {
  config = JSON.parse(fs.readFileSync('config.json').toString('utf-8'))
} catch(e) {
  console.error('Plz set config.json')
  process.exit(1)
}

const app = express()
app.use(express.json())
app.use(cors(config.cors.origin))

async function dbConnect() {
  const connection = await mysql.createConnection({
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    timezone: config.database.timezone || 'UTC'
  })
  return connection
}

function getSecret() {
  return config.jwt.secret
}

async function verifyToken(token) {
  const secret = getSecret()
  const decoded = await new Promise((resolve, reject) => {
    jwt.verify(token, secret, {}, (err, decoded) => {
      if(err) reject(err)
      resolve(decoded)
    })
  })
  return decoded
}

//register
app.post('/member', async function (req, res) {
  try {
    const id = req.body.id
    const password = req.body.password
    const nickname = req.body.nickname
    
    if(!id || !password || !nickname) {
      throw new Error()
    }
    
    const hash = await bcrypt.hash(password, 11)

    const connection = await dbConnect()
    const [rows, fields] = await connection.execute(
      'INSERT INTO member (id, password, nickname) VALUES (?, ?, ?);',
      [id, hash, nickname]
    )

    res.json({ success: true })
  } catch(e) {
    res.json({ success: false })    
  }
})

//login
app.post('/member/login', async function (req, res) {
  try {
    const id = req.body.id
    const password = req.body.password    

    if(!id || !password) {
      throw new Error()
    }

    const connection = await dbConnect()
    const [rows, fields] = await connection.execute(
      'SELECT password, nickname FROM member WHERE id = ?',
      [id]
    )

    const result = await bcrypt.compare(password, rows[0].password)
    if(!result) {
      throw new Error()
    }

    const payload = {
      id,
      nickname: rows[0].nickname
    }
    const secret = getSecret()
    const token = await new Promise((resolve, reject) => {
      jwt.sign(payload, secret, {expiresIn: "12h"}, (err, token) => {
        if(err) reject(err)
        resolve(token)
      })
    })

    res.json({ success: true, token })
  } catch(e) {
    res.json({ success: false })   
  }
})

//board text list
app.get('/board', async function(req, res) {
  try {
    const token = req.headers.token
    const decoded = await verifyToken(token)    

    const page = Number(req.query.page) || 1
    const startNo = (page - 1) * 10
    
    const connection = await dbConnect()
    const [rowsList, fieldsList] = await connection.execute(
      `SELECT no, member.nickname, title, wri_date 
      FROM board_text
      JOIN member
      ON member.id = board_text.id
      ORDER BY no DESC
      LIMIT ${startNo}, 10;`
    )
    
    const [rowsCnt, fieldsCnt] = await connection.execute(
      `SELECT count(no) AS cnt FROM board_text;`
    )

    res.json({ success: true, list: rowsList, cntText: rowsCnt[0].cnt })
  } catch(e) {
    res.json({ success: false })      
  }
})

//board text read
app.get('/board/:no', async function(req, res) {
  try {
    const token = req.headers.token
    const decoded = await verifyToken(token)    

    const no = req.params.no

    if(!no) {
      throw new Error()
    }

    const connection = await dbConnect()
    const [rows, fields] = await connection.execute(
      `SELECT member.nickname, title, body, wri_date 
      FROM board_text
      JOIN member
      ON member.id = board_text.id 
      WHERE no = ?;`,
      [no]
    )

    res.json({ success: true, contents: rows[0] })
  } catch(e) {
    res.json({ success: false })      
  }
})

//board text write
app.post('/board', async function(req, res) {
  try {
    const token = req.headers.token
    const decoded = await verifyToken(token)

    const title = req.body.title
    const body = req.body.body

    //파라미터 유효성 검사
    if(!title || !body) {
      throw new Error()      
    }

    const connection = await dbConnect()
    const [rows, fields] = await connection.execute(
      'INSERT INTO board_text (id, title, body) VALUES (?, ?, ?);',
      [decoded.id, title, body]
    )

    res.json({ success: true, no: rows.insertId })
  } catch(e) {
    res.json({ success: false })
  }
}) 

//board modify
app.put('/board/:no', async function(req, res) {
  try {
    const token = req.headers.token
    const decoded = await verifyToken(token)

    const no = req.params.no
    const title = req.body.title
    const body = req.body.body

    if(!no || !title || !body) {
      throw new Error()
    }

    const connection = await dbConnect()

    const [rowsSelectId, fieldsSelectId] = await connection.execute(
      'SELECT id FROM board_text WHERE no = ?;',
      [no]
    )

    if(rowsSelectId[0].id !== decoded.id){
      throw new Error()
    }

    const [rowsUpdate, fieldsUpdate] = await connection.execute(
      'UPDATE board_text SET title = ?, body = ? WHERE no = ?;',
      [title, body, no]
    )

    res.json({ success: true })
  } catch(e) {
    res.json({ success: false })
  }
})

//board delete
app.delete('/board/:no', async function(req, res) {
  try {
    const token = req.headers.token
    const decoded = await verifyToken(token)

    const no = req.params.no

    if(!no) {
      throw new Error()
    }

    const connection = await dbConnect()

    const [rowsSelectId, fieldsSelectId] = await connection.execute(
      'SELECT id FROM board_text WHERE no = ?;',
      [no]
    )

    if(rowsSelectId[0].id !== decoded.id){
      throw new Error()
    }

    const [rowsDeleteReply, fieldsDeleteReply] = await connection.execute(
      'DELETE FROM board_reply WHERE text_no = ?;',
      [no]
    )

    const [rowsDelete, fieldsDelete] = await connection.execute(
      'DELETE FROM board_text WHERE no = ?;',
      [no]
    )

    res.json({ success: true })
  } catch(e) {
    res.json({ success: false })
  }
})

//board reply list
app.get('/board/:textNo/reply', async function(req, res) {
  try {
    const token = req.headers.token
    const decoded = await verifyToken(token)
    
    const textNo = req.params.textNo

    if(!textNo) {
      throw new Error()
    }

    const connection = await dbConnect()
    const [rows, fields] = await connection.execute(
      `SELECT no, member.nickname, reply, rep_date 
      FROM board_reply
      JOIN member
      ON member.id = board_reply.id
      WHERE text_no = ?
      ORDER BY no ASC;`,
      [textNo]
    )
    
    res.json({ success: true, list: rows })
  } catch(e) {
    res.json({ success: false })      
  }
})

//board reply write
app.post('/board/:textNo/reply', async function(req, res) {
  try {
    const token = req.headers.token
    const decoded = await verifyToken(token)

    const textNo = req.params.textNo
    const reply = req.body.reply

    //파라미터 유효성 검사
    if(!reply) {
      throw new Error()      
    }

    const connection = await dbConnect()
    const [rows, fields] = await connection.execute(
      'INSERT INTO board_reply (text_no, id, reply) VALUES (?, ?, ?);',
      [textNo, decoded.id, reply]
    )

    res.json({ success: true, no: rows.insertId })
  } catch(e) {
    res.json({ success: false })
  }
}) 

//reply modify
app.put('/board/:textNo/reply/:replyNo', async function(req, res) {
  try {
    const token = req.headers.token
    const decoded = await verifyToken(token)

    const replyNo = req.params.replyNo
    const reply = req.body.reply

    if(!replyNo || !reply) {
      throw new Error()
    }

    const connection = await dbConnect()

    const [rowsSelectId, fieldsSelectId] = await connection.execute(
      'SELECT id FROM board_reply WHERE no = ?;',
      [replyNo]
    )

    if(rowsSelectId[0].id !== decoded.id){
      throw new Error()
    }

    const [rowsUpdate, fieldsUpdate] = await connection.execute(
      'UPDATE board_reply SET reply = ? WHERE no = ?;',
      [reply, replyNo]
    )

    res.json({ success: true })
  } catch(e) {
    res.json({ success: false })
  }
})

//reply delete
app.delete('/board/:textNo/reply/:replyNo', async function(req, res) {
  try {
    const token = req.headers.token
    const decoded = await verifyToken(token)

    const replyNo = req.params.replyNo

    if(!replyNo) {
      throw new Error()
    }

    const connection = await dbConnect()

    const [rowsSelectId, fieldsSelectId] = await connection.execute(
      'SELECT id FROM board_reply WHERE no = ?;',
      [replyNo]
    )

    if(rowsSelectId[0].id !== decoded.id){
      throw new Error()
    }

    const [rowsUpdate, fieldsUpdate] = await connection.execute(
      'DELETE FROM board_reply WHERE no = ?;',
      [replyNo]
    )

    res.json({ success: true })
  } catch(e) {
    res.json({ success: false })
  }
})

app.listen(3031) 