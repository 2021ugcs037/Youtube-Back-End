// express-async-handler simplifies error handling for asynchronous operations 
// in Express.js, making your code cleaner and more readable by eliminating 
// the need for repetitive try/catch blocks in each async route handler.

const asyncHandler = (func) => {
    return (req,res,next) => {
        Promise.resolve(func(req,res,next)).catch((err) => next(err));

    }
}
export {asyncHandler}


// OR isko aise bhi kr skte h :--------
// const asyncHandler = (func) => async(req,res,next) =>{
//     try {
//         await func(req,res,next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success:false,
//             message:err.message || 'Internal Server Error'
//         })
//     }
// }
// export {asyncHandler}