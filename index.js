const express = require('express')
const app = express()
const { log } = require('node:console')
const mysql = require('mysql')
const bcrypt = require('bcrypt')

app.set('view engine', 'ejs')
app.use(express.urlencoded({extended: true}))

const connection = mysql.createConnection({
    host: 'localhost',
    port: '3306',
    database: 'user_profile',
    user: 'root',
    password: ''
})

connection.connect((err) => {
if (err) return console.error('Error connecting to MySQL database: ' + err.stack);

app.get('/users', (req,res) => {
    connection.query("select id, name from users", (err, results) => {
        res.render('index', {list: results})
    })
})

.post('/users', (req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    const {name, email, password} = req.body

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Hashing error:', err);
            return res.end('Hiba a hash-ben: ', err.stack)
        } else {
            console.log('Hashed Password:', hash);
            connection.query("insert into users (name, email, password) values (?,?,?) limit 1", [name, email, hash], function(err, results){
                if (err) return res.json("Már van ilyen email cím")
                return res.redirect("back")
            })
        }
    });
})

.get('/users/:id', (req, res) => {
    connection.query("select * from users where id = ? limit 1", [req.params.id], (err, results) => {
        res.render('userDetails', {list: results})
    })
})

.post("/users/:id", (request, response) => {
    const {name, email} = request.body
    connection.query("update users set name = ?, email = ? where id = ? limit 1", [name, email, request.params.id], (err, result) => {
        if (err) return response.json("Már van ilyen email cím")
            return response.json("sikeres frissítés")
    })
})

.post("/delete/:id", (req, response) => {
    connection.query("delete from users where id = ? limit 1", [req.params.id], (err, result) => {
        if (err) return result.json(err)
        return response.json("sikeres törlés")
    })
})

app.listen(3000, () => {
    console.log("started at: 3000");
})
});