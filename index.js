const express = require('express')
const app = express()
const { log } = require('node:console')
const mysql = require('mysql')
const bcrypt = require('bcrypt')
const session = require('express-session')
const flash = require('express-flash')
const {body, matchedData, validationResult} = require('express-validator');

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

app.use(function(req, res, next) {
    res.locals.getFieldError = function(validatorErrors, fieldName) {
        const errorResult = validatorErrors.filter(errObj => errObj.path === fieldName)
        console.log('validatorErrors:', validatorErrors)
        console.log('fieldName:', fieldName)
        if (errorResult.length > 0) {
            return errorResult[0].msg
        }
    }
    next()
})

connection.connect((err) => {
if (err) return console.error('Error connecting to MySQL database: ' + err.stack);

app.get('/users', (req,res) => {
    connection.query("select id, name from users", (err, results) => {
        res.render('index', {list: results, errors: req.flash('error'), email: req.flash('email'), success: req.flash('success'), 
        name: req.flash('name'), validatorErrors: req.flash('validatorErrors') })
    })
})

.post('/users', [body('name').notEmpty().withMessage('A név megadása kötelező'),
                body('email').isEmail().withMessage('Az email cím invalid'), 
                body('password').isLength({ min: 3 }).withMessage('A jelszónak legalább 3 karakter hosszúnak kell lennie')], (req, res) => {
    
    res.set('Content-Type', 'text/html; charset=utf-8')
    const {name, email, password} = req.body

    const errorResult = validationResult(req)
    console.log('errorResult:', errorResult)

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Hashing error:', err)
            return res.end('Hiba a hash-ben: ', err.stack)
        }
        else if (!errorResult.isEmpty()){
            req.flash('validatorErrors', errorResult.array())
            req.flash('email', email)
            req.flash('name', name)
            return res.redirect('back')
        }
        // else if (name.length < 2 || email.length < 2 || password.length < 2) {
        //     req.flash('error', 'A név, email cím és jelszó minimális hossza 2 karakter - The minimum length of name, email address and password is 2 characters')
        //     req.flash('name', name)
        //     req.flash('email', email)
        //     return res.redirect("back")
        // }
        else {
            connection.query("select email from users where email = ?" , [email], (err,result) => {
                if (err) {
                    console.error('Error during existing email query:', err)
                    return res.end('Error during existing email query:', err.stack)
                }
                else if (result.length > 0) {
                    req.flash('error', 'Az email cím már használatban van. Válasszon másik email címet. - The email address you provided is already in use. Please choose another email address.')
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
                        req.flash('success', 'Sikeres regisztráció - Successful registration')
                        return res.redirect("back")
                    })
                }
            })
        }
    })
})


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 
// .post('/users', (req, res) => {
//     res.set('Content-Type', 'text/html; charset=utf-8')
//     const {name, email, password} = req.body

// function createHash(password) {
//     return new Promise((resolve, reject) => {
//         bcrypt.hash(password, 10, (err, hash) => {
//             if (err) {
//                 reject(err)
//             } else {
//                 resolve(hash)
//             }
//         })
//     })
// }

// function validator (name, email, password){
// 	return new Promise ((resolve) => {
// 		if (name.length < 2 || email.length < 2 || password.length < 2) {
//             resolve({ tooShort: true })
//         } else {
//             resolve({ tooShort: false });
//         }
// 	})
// }


// function checkEmailExists (email){
// 	return new Promise ((resolve,reject) => {
// 		connection.query("select email from users where email = ?" , [email], (err, result) => {
// 			if (err) {
//                 reject(err)
// 			}
// 			else {
// 			    resolve (result.length > 0) 
// 			}
// 		})
// 	})
// }

// function createUser (name, email, hash){
//     return new Promise ((resolve,reject) => {
// 		connection.query("insert into users (name, email, password) values (?,?,?) limit 1", [name, email, hash], (err, results) => {
// 			if (err) {
//                 reject(err)
// 			}
// 			else {
// 			    resolve ()
// 			}
// 		})
// 	})
// }


// createHash(password)
//     .then(hash => {
//         if (!hash) {
//             throw new Error('Error while generating hash')
//         }
//         else {
//             return validator (name, email, password)
//         }
//     })
//     .then( validatorResult  => {
//         if (validatorResult && validatorResult.tooShort) {
//             throw new Error('The minimum length of name, email address and password is 2 characters - A név, email cím és jelszó minimális hossza 2 karakter')
//         }
//         else {
//             return checkEmailExists(email)
//         }
//     })
//     .then( emailExists => {
//         if (emailExists) {
//             throw new Error('The email address you provided is already in use. Please choose another email address. - Az email cím már használatban van. Válasszon másik email címet.');
//         } else {
//             // Call createUser function directly inside this then block
//             return createHash(password).then(hash => createUser(name, email, hash));
//         }
//     })
//     .then(() => {
//         req.flash('success', 'Successful registration - Sikeres regisztráció');
//         res.redirect('back')
//     })
//     .catch(error => {
//         req.flash('error', error.message)
//         res.redirect('back')
//     });
// })


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


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
            })
        })
    }

    getUserById(req.params.id)
    .then(user => {
        if (!user) {
            throw new Error('Nincs ilyen felhasználó - User not found')
        }
        return bcrypt.compare(password, user.password)
    })
    .then(compareResults => {
        if (!compareResults) {
            throw new Error('Helytelen jelszó - Incorrect password')
        }
        return checkEmailExists(email, req.params.id)
    })
    .then(emailExists => {
        if (emailExists) {
            throw new Error('Az email cím már használatban van. Válasszon másik email címet. - The email address you provided is already in use. Please choose another email address.')
        }
        return updateUserDetails(name, email, req.params.id)
    })
    .then(() => {
        req.flash('success', 'Sikeres módosítás - Successful update');
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
    console.log("started at: 3000")
})
})