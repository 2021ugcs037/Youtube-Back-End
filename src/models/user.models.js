 import mongoose from 'mongoose'
 import jwt from 'jsonwebtoken' //it generates token // jwt works as bearer token : means jiske paas bhi ye token h usko data bhej deta h
 import bcrypt from "bcrypt" //it helps us to hash our password

 const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true //searching field database me enable krdeta h
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    fullname:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avatar:{
        type:String, //cloudinary url
        required:true
    },
    coverImage:{
        type:String, //cloudinary url
    },
    watchHistory:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"video"
        }
    ],
    password:{
        type:String,
        required:[true, 'password is required']   
    },
    refreshToken:{
        type:String,
    }
     
 }, {timestamps:true})

 // .pre file save hone ke just pehle functionality ko introduce krta h
userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();
    
    this.password = await bcrypt.hash(this.password,10)
    next()
})

//()=>{} ----> iss wale function me this. ka use ni kr skte isliye niche function() ka use kr rhe
userSchema.methods.isPasswordCorrect =async function(password){
    return await bcrypt.compare(password, this.password)
}
userSchema.methods.generateAccessToken = function (){
    return jwt.sign(
    {
        _id: this._id,
        email:this.email,
        username:this.username,
        fullname:this.fullname
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
)
}
userSchema.methods.generateRefreshToken = function (){
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

 export const User = mongoose.model("User", userSchema)