import { Client } from 'pg'
import express from 'express'

const app = express()
app.use(express.json())

const con = new Client({
    host: "localhost",
    user: "postgres",
    port: 5432,
    password: "7x!Lq$9Pm@2vZ#8T&wKb*Rn",
    database: "Rachel"
})

//COMANDO PA CORRER = node main.js
con.connect().then(()=> console.log("Conectado exitosamente 🙏"))

//POST
app.post('/postData',(req,res)=>{
    const {name, id} = req.body
    const insert_query = 'INSERT INTO demotable (name,id) VALUES ($1,$2)'
    con.query(insert_query,[name, id],(err,result)=>{
        if(err){
            res.send(err)
        } else {
            console.log(result)
            res.send("POSTED DATA")
        }
    })
})

//FETCH ALL DATA
app.get('/fetchData', (req,res)=>{
    const fetch_query="SELECT * FROM demotable"
    con.query(fetch_query,(err,result)=>{
        if(err){
            res.send(err)
        } else {
            res.send(result.rows)
        }
    })
})

//FETCH BY ID
app.get('/fetchById/:id', (req,res)=>{
    const id = req.params.id
    const fetch_query = "SELECT * FROM demotable WHERE id = $1"
    con.query(fetch_query,[id],(err,result)=>{
        if(err){
            res.send(err)
        } else {
            res.send(result.rows[0])
        }
    })
})

//UPDATE
app.put('/update/:id',(req,res)=>{
    const id = req.params.id
    const name = req.body.name
    const update_query = "UPDATE demotable SET name = $1 WHERE id = $2"
    con.query(update_query,[name,id],(err,result)=>{
        if(err){
            res.send(err)
        } else {
            res.send("UPDATED")
        }
    })
})

//DELETE
app.delete('/delete/:id',(req,res)=>{
    const id = req.params.id
    const delete_query = "DELETE FROM demotable WHERE id=$1"
    con.query(delete_query,[id],(err,result)=>{
        if(err){
            res.send(err)
        } else {
            res.send("DETELED")
        }
    })
})

app.listen(3000,()=>{
    console.log("server is running... ")
})