const express = require('express')
const app = express()
const { log } = require('node:console')
const mysql = require('mysql')
const bcrypt = require('bcrypt')
const session = require('express-session')
const flash = require('express-flash')

app.use(session({
    secret: 'titkos-kulcs-01234',
    resave: false,
    saveUninitialized: true,
  }))

app.use(flash())

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
        res.render('index', {list: results, errors: req.flash('error'), email: req.flash('email'), success: req.flash('success'), name: req.flash('name') })
    })
})

.post('/users', (req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    const {name, email, password} = req.body

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Hashing error:', err)
            return res.end('Hiba a hash-ben: ', err.stack)
        } 
        else if (name.length < 2 || email.length < 2 || password.length < 2) {
            req.flash('error', 'The minimum length of name, email address and password is 2 characters - A név, email cím és jelszó minimális hossza 2 karakter')
            req.flash('name', name)
            req.flash('email', email)
            return res.redirect("back")
        }
        else {
            connection.query("select email from users where email = ?" , [email], (err,result) => {
                if (err) {
                    console.error('Error during existing email query:', err)
                    return res.end('Error during existing email query:', err.stack)
                }
                else if (result.length > 0) {
                    req.flash('error', 'The email address you provided is already in use. Please choose another email address. - Az email cím már használatban van. Válasszon másik email címet.')
                    req.flash('email', email)
                    req.flash('name', name)
                    return res.redirect("back")
                }
                else {
                    connection.query("insert into users (name, email, password) values (?,?,?) limit 1", [name, email, hash], function(err, results){
                        if (err) {
                            console.error('Error during registration:', err)
                            return res.end('Error during registration:', err.stack)
                        }
                        else 
                        req.flash('success', 'Successful registration - Sikeres regisztráció')
                        return res.redirect("back")
                    })
                }
            })
        }
    })
})

.get('/users/:id', (req, res) => {
    connection.query("select * from users where id = ? limit 1", [req.params.id], (err, results) => {
        res.render('userDetails', { list: results, errors: req.flash('error'), success: req.flash('success') })
    })
})

.post("/users/:id", (req, res) => {

    const {name, email, password} = req.body
    const userId = req.params.id

    function getUserById(userId) {
        return new Promise((resolve, reject) => {
            connection.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(results[0])
                }
            })
        })
    }

    function checkEmailExists(email, userId) {
        return new Promise((resolve, reject) => {
            connection.query("select id from users where email = ? and id != ? ", [email, userId], (err, result) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(result.length > 0)
                }
            })
        })
    }

    function updateUserDetails(name, email, userId) {
        return new Promise((resolve, reject) => {
            connection.query('UPDATE users SET name = ?, email = ? WHERE id = ? LIMIT 1', [name, email, userId], (err, results) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            });
        });
    }

    getUserById(req.params.id)
    .then(user => {
        if (!user) {
            throw new Error('User not found')
        }
        return bcrypt.compare(password, user.password)
    })
    .then(compareResults => {
        if (!compareResults) {
            throw new Error('Incorrect password')
        }
        return checkEmailExists(email, req.params.id)
    })
    .then(emailExists => {
        if (emailExists) {
            throw new Error('Email address already in use')
        }
        return updateUserDetails(name, email, req.params.id)
    })
    .then(() => {
        req.flash('success', 'Successful update - Sikeres módosítás');
        res.redirect('back')
    })
    .catch(error => {
        req.flash('error', error.message)
        res.redirect('back')
    });
})

.post("/delete/:id", (req, res) => {
    connection.query("delete from users where id = ? limit 1", [req.params.id], (err, result) => {
        if (err) return result.json(err)
        req.flash('success', 'A felhasználó törölve lett - User has been deleted')
        return res.redirect("back")
    })
})

app.listen(3000, () => {
    console.log("started at: 3000");
})
});