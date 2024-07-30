import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

 const app = express()

 app.use(cors())

 app.use(express.json({limit:'16kb'}))
 app.use(express.urlencoded({extended:true, limit:'16kb'}))
 app.use(express.static('public'))
 app.use(cookieParser()) 

 //routes import
 import userRouter from './routes/user.routes.js'
 import videoRouter from "./routes/video.routes.js"

 //routes declaration
 app.use("/api/v1/users",userRouter) // here middleware .use is used wrna app.get likhte agr same file me likhte to
// we will get route ---> http://localhost:8000/api/v1/users/register
 app.use("/api/v1/videos",videoRouter) 
 export {app}



 